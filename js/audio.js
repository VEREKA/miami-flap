/* MIAMI FLAP — dźwięk generowany w WebAudio (zero plików audio).
   Muzyka: oryginalna pętla synthwave/outrun (pulsujący bas, arpeggio z delayem, bęben 4/4). */
(function () {
  'use strict';
  var ac = null, master, musicBus, sfxBus, delay, noiseBuf, arpFilter;
  var muted = false, playing = false, timer = null, nextTime = 0, stepIdx = 0, intense = false;
  try { muted = localStorage.getItem('mf_muted') === '1'; } catch (e) {}

  var BPM = 118, S16 = 60 / BPM / 4;
  // progresja 8 taktów (a-moll): Am Am F G | Am C F E
  var CH = [
    { r: 45, n: [57, 60, 64, 69] }, { r: 45, n: [57, 60, 64, 72] }, { r: 41, n: [53, 57, 60, 65] }, { r: 43, n: [55, 59, 62, 67] },
    { r: 45, n: [57, 60, 64, 69] }, { r: 48, n: [55, 60, 64, 67] }, { r: 41, n: [53, 57, 60, 65] }, { r: 40, n: [56, 59, 64, 68] }
  ];
  var ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2];
  // motyw prowadzący (takty 5–8): [krok 16-tkowy w takcie, nuta MIDI, długość w 16-tkach]
  var LEAD = [
    [[0, 76, 3], [4, 72, 2], [6, 74, 2], [8, 76, 4], [14, 79, 2]],
    [[0, 79, 4], [6, 76, 2], [8, 72, 6]],
    [[0, 77, 3], [4, 72, 2], [6, 74, 2], [8, 77, 4], [14, 76, 2]],
    [[0, 76, 4], [4, 71, 4], [8, 68, 8]]
  ];
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function init() {
    if (ac) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.9;
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 0.0; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    delay = ac.createDelay(1); delay.delayTime.value = S16 * 3;
    var fb = ac.createGain(); fb.gain.value = 0.36;
    var dl = ac.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2400;
    delay.connect(dl); dl.connect(fb); fb.connect(delay); dl.connect(musicBus);
    arpFilter = ac.createBiquadFilter(); arpFilter.type = 'lowpass'; arpFilter.frequency.value = 1500; arpFilter.Q.value = 4;
    var arpGain = ac.createGain(); arpGain.gain.value = 0.5;
    arpFilter.connect(arpGain); arpGain.connect(musicBus); arpGain.connect(delay);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function tone(dest, type, f, t0, dur, vol, f1, attack) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dest, t0, dur, vol, type, freq, q) {
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
  }

  // ───────── muzyka ─────────
  function schedule(i, t0) {
    var bar = Math.floor(i / 16) % 8, s = i % 16, ch = CH[bar];
    // stopa 4/4, werbel na 2 i 4, hi-hat na „i”
    if (s % 4 === 0) { tone(musicBus, 'sine', 150, t0, 0.22, 0.95, 42); }
    if (s === 4 || s === 12) { noise(musicBus, t0, 0.2, 0.42, 'bandpass', 1900, 0.7); tone(musicBus, 'triangle', 210, t0, 0.09, 0.3, 120); }
    if (s % 4 === 2) noise(musicBus, t0, 0.05, 0.16, 'highpass', 7500);
    if (intense && s % 2 === 1) noise(musicBus, t0, 0.03, 0.08, 'highpass', 9000);
    // bas: pulsujące szesnastki z oktawą
    var bn = ch.r - 12 + ((s % 4 === 2) ? 12 : 0);
    var o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = hz(bn);
    f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(intense ? 1300 : 800, t0); f.frequency.exponentialRampToValueAtTime(140, t0 + S16 * 0.9);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(s % 4 === 0 ? 0.20 : 0.34, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + S16 * 0.95);
    o.connect(f); f.connect(g); g.connect(musicBus); o.start(t0); o.stop(t0 + S16);
    // arpeggio
    var an = ch.n[ARP[s]] + 12;
    tone(arpFilter, 'square', hz(an), t0, S16 * 0.9, 0.12);
    // pad na początku taktu
    if (s === 0) for (var k = 0; k < 3; k++) tone(musicBus, 'sawtooth', hz(ch.n[k]) * (k === 1 ? 1.004 : 1), t0, S16 * 16, 0.028, null, 0.25);
    // melodia w drugiej połowie pętli
    if (bar >= 4) {
      var L = LEAD[bar - 4];
      for (var j = 0; j < L.length; j++) if (L[j][0] === s) {
        tone(arpFilter, 'sawtooth', hz(L[j][1]), t0, S16 * L[j][2], 0.16, null, 0.02);
        tone(arpFilter, 'sawtooth', hz(L[j][1]) * 1.006, t0, S16 * L[j][2], 0.10, null, 0.02);
      }
    }
  }
  function tick() {
    if (!playing || !ac) return;
    while (nextTime < ac.currentTime + 0.18) { schedule(stepIdx, nextTime); nextTime += S16; stepIdx++; }
  }

  var A = {
    get muted() { return muted; },
    unlock: function () { init(); if (ac && ac.state === 'suspended') ac.resume(); },
    setMuted: function (m) {
      muted = m;
      try { localStorage.setItem('mf_muted', m ? '1' : '0'); } catch (e) {}
      if (ac) master.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.03);
    },
    musicStart: function () {
      A.unlock();
      if (!ac || playing) return;
      playing = true; stepIdx = 0; nextTime = ac.currentTime + 0.08;
      musicBus.gain.cancelScheduledValues(ac.currentTime);
      musicBus.gain.setTargetAtTime(0.5, ac.currentTime, 0.4);
      timer = setInterval(tick, 40); tick();
    },
    musicStop: function () {
      if (!ac || !playing) return;
      playing = false; clearInterval(timer);
      musicBus.gain.setTargetAtTime(0.0, ac.currentTime, 0.15);
    },
    // przyciszenie w menu / pauzie
    musicDuck: function (on) { if (ac && playing) musicBus.gain.setTargetAtTime(on ? 0.22 : 0.5, ac.currentTime, 0.2); },
    setIntense: function (on) {
      intense = on;
      if (ac) arpFilter.frequency.setTargetAtTime(on ? 4200 : 1500, ac.currentTime, 0.15);
    },
    sfx: function (name) {
      if (!ac || muted) return;
      var t0 = ac.currentTime, d = sfxBus;
      if (name === 'flap') { tone(d, 'triangle', 380, t0, 0.09, 0.22, 620); }
      else if (name === 'dollar') { tone(d, 'square', 988, t0, 0.06, 0.13); tone(d, 'square', 1319, t0 + 0.06, 0.12, 0.13); }
      else if (name === 'diamond') { [1319, 1568, 1976, 2637].forEach(function (f, i) { tone(d, 'triangle', f, t0 + i * 0.045, 0.16, 0.2); }); }
      else if (name === 'prosecco') { tone(d, 'sine', 220, t0, 0.07, 0.5, 900); noise(d, t0 + 0.05, 0.3, 0.2, 'highpass', 5000); }
      else if (name === 'miami') { tone(d, 'sawtooth', 220, t0, 0.5, 0.2, 1760); [523, 659, 784, 1047].forEach(function (f, i) { tone(d, 'square', f, t0 + 0.3 + i * 0.07, 0.2, 0.14); }); }
      else if (name === 'shield') { noise(d, t0, 0.35, 0.45, 'bandpass', 900, 0.6); tone(d, 'square', 660, t0, 0.2, 0.15, 220); }
      else if (name === 'stage') { [659, 880, 1319].forEach(function (f, i) { tone(d, 'square', f, t0 + i * 0.09, 0.18, 0.13); }); }
      else if (name === 'dead') { noise(d, t0, 0.5, 0.6, 'lowpass', 700); tone(d, 'sawtooth', 330, t0, 0.55, 0.3, 55); }
      else if (name === 'ui') { tone(d, 'square', 660, t0, 0.05, 0.1); }
      else if (name === 'unlock') { [784, 988, 1175, 1568].forEach(function (f, i) { tone(d, 'triangle', f, t0 + i * 0.08, 0.25, 0.2); }); }
    }
  };
  window.GameAudio = A;
})();
