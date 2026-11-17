/* MIAMI FLAP — pętla gry, wejście, UI, kontrola uczciwości rozgrywki. */
(function () {
  'use strict';
  var C = Sim.C, STEP_MS = 1000 / C.STEP_HZ;
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);

  // ───────── zapis lokalny (bez danych osobowych) ─────────
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('mf_' + k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('mf_' + k, String(v)); } catch (e) {} }
  };
  var best = +store.get('best', 0) || 0, maxStage = +store.get('maxStage', 1) || 1, skin = store.get('skin', 'classic');
  if (!CONFIG.skins.some(function (s) { return s.id === skin && s.stage <= maxStage; })) skin = 'classic';

  // ───────── stan ─────────
  var state = 'menu', sim = null, prevY = 0, tapQueued = false, last = 0, acc = 0, countdown = 0, dieTimer = 0, lastRun = null;
  var integ = null;

  function newIntegrity() {
    return { pauses: 0, stalls: 0, flags: {}, realMs: 0, lostMs: 0, winReal: 0, winSteps: 0, slowStreak: 0, perf0: performance.now(), date0: Date.now() };
  }
  function show(id) {
    ['scr-start', 'scr-skins', 'scr-pause', 'scr-over', 'scr-form'].forEach(function (s) { $(s).hidden = s !== id; });
    $('btn-pause').hidden = !(state === 'playing' || state === 'countdown');
    var el = id && $(id);
    if (el) { el.scrollTop = 0; var f = el.querySelector('.btn-primary'); if (f && state !== 'playing') f.focus({ preventScroll: true }); }
  }

  // ───────── przebieg gry ─────────
  function toReady() {
    state = 'ready'; sim = null; tapQueued = false;
    Render.reset(); show(null);
    GameAudio.musicStart(); GameAudio.musicDuck(false); GameAudio.setIntense(false);
  }
  function startRun() {
    var seed = params.has('seed') ? (+params.get('seed') >>> 0) : (crypto.getRandomValues(new Uint32Array(1))[0]);
    sim = Sim.create(seed);
    integ = newIntegrity();
    acc = 0; state = 'playing'; tapQueued = true; prevY = sim.y;
    show(null);
  }
  function stepOnce() {
    prevY = sim.y;
    Sim.step(sim, tapQueued);
    tapQueued = false;
    for (var i = 0; i < sim.events.length; i++) {
      var e = sim.events[i];
      Render.onEvent(e, sim);
      if (e.t === 'flap') GameAudio.sfx('flap');
      else if (e.t === 'pickup') GameAudio.sfx(e.type);
      else if (e.t === 'miamiStart') { GameAudio.sfx('miami'); GameAudio.setIntense(true); }
      else if (e.t === 'miamiEnd') GameAudio.setIntense(false);
      else if (e.t === 'shield') GameAudio.sfx('shield');
      else if (e.t === 'stage') GameAudio.sfx('stage');
      else if (e.t === 'dead') { GameAudio.sfx('dead'); GameAudio.setIntense(false); GameAudio.musicDuck(true); state = 'dying'; dieTimer = 900; $('btn-pause').hidden = true; }
    }
    sim.events.length = 0;
  }
  function pause(reason) {
    if (state !== 'playing' && state !== 'countdown') return;
    state = 'paused'; integ.pauses++;
    $('pause-msg').textContent = reason === 'slow'
      ? 'Gra działa zbyt wolno na tym urządzeniu. Zamknij inne karty i spróbuj ponownie.'
      : 'Po powrocie masz 3 sekundy na przygotowanie.';
    GameAudio.musicDuck(true);
    show('scr-pause');
  }
  function resume() {
    if (state !== 'paused') return;
    state = 'countdown'; countdown = 3000; acc = 0; tapQueued = false;
    GameAudio.unlock(); GameAudio.musicDuck(false);
    show(null);
  }
  function finishRun() {
    state = 'over';
    var rep = Sim.report(sim), flags = integ.flags;
    var simMs = sim.step * STEP_MS;
    // 1) gra szła wolniej niż czas rzeczywisty (dławienie CPU / spowalniacze)
    if (integ.realMs > 3000 && simMs / integ.realMs < 0.9) flags.slow = 1;
    // 2) zegary się rozjechały (manipulacja czasem)
    var dPerf = performance.now() - integ.perf0, dDate = Date.now() - integ.date0;
    if (Math.abs(dPerf - dDate) > Math.max(1500, dPerf * 0.05)) flags.clock = 1;
    // 3) zbyt wiele pauz
    if (integ.pauses > 3) flags.pauses = 1;
    // 4) autokontrola: odtworzenie przebiegu musi dać ten sam wynik
    if (!Sim.verify(rep).ok) flags.replay = 1;
    var verified = Object.keys(flags).length === 0;
    var integrity = { verified: verified, flags: Object.keys(flags), pauses: integ.pauses, stalls: integ.stalls, speedRatio: +(simMs / Math.max(1, integ.realMs)).toFixed(3), durationMs: Math.round(integ.realMs) };
    lastRun = { report: rep, integrity: integrity };

    var isRecord = verified && sim.score > best && sim.score > 0;
    if (isRecord) { best = sim.score; store.set('best', best); }
    var unlocked = [];
    if (verified && sim.stage > maxStage) {
      CONFIG.skins.forEach(function (s) { if (s.stage > maxStage && s.stage <= sim.stage) unlocked.push(s.name); });
      maxStage = sim.stage; store.set('maxStage', maxStage);
    }
    $('over-score').textContent = sim.score;
    $('over-record').hidden = !isRecord;
    $('over-meta').textContent = 'Rekord: ' + best + ' · Etap ' + sim.stage + ' · Bramki: ' + sim.gatesPassed;
    $('over-unlock').hidden = !unlocked.length;
    if (unlocked.length) { $('over-unlock').textContent = 'Nowy skin: ' + unlocked.join(', ') + '!'; GameAudio.sfx('unlock'); }
    $('over-integrity').hidden = verified;
    if (!verified) $('over-integrity').textContent = 'Wynik niezweryfikowany (' + (flags.slow ? 'gra była spowolniona' : flags.pauses ? 'zbyt wiele pauz' : 'nieprawidłowy przebieg') + ') — nie liczy się do rekordu ani konkursu.';
    $('btn-entry').disabled = !verified || sim.score === 0;
    $('btn-entry').style.opacity = $('btn-entry').disabled ? 0.45 : 1;
    show('scr-over');
    post({ type: 'miamiflap:gameover', score: sim.score, report: rep, integrity: integrity });
  }
  function post(msg) { try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch (e) {} }

  // ───────── pętla ─────────
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = now - last; last = now;
    if (dt < 0) dt = 0;
    if (state === 'playing') {
      if (dt > 250) { integ.stalls++; pause('stall'); }
      else {
        integ.realMs += dt; acc += dt;
        var n = 0;
        while (acc >= STEP_MS && n < 4 && state === 'playing') { stepOnce(); acc -= STEP_MS; n++; }
        if (acc >= STEP_MS) { integ.lostMs += acc; acc = 0; }     // urządzenie nie nadąża — tych kroków nie „dogonimy”
        integ.winReal += dt; integ.winSteps += n;
        if (integ.winReal >= 2000) {
          var expected = integ.winReal / STEP_MS;
          integ.slowStreak = integ.winSteps < expected * 0.8 ? integ.slowStreak + 1 : 0;
          integ.winReal = 0; integ.winSteps = 0;
          if (integ.slowStreak >= 2 && state === 'playing') { integ.flags.slow = 1; integ.slowStreak = 0; pause('slow'); }
        }
      }
    } else if (state === 'countdown') {
      countdown -= Math.min(dt, 100);
      if (countdown <= 0) { state = 'playing'; acc = 0; }
    } else if (state === 'dying') {
      dieTimer -= dt;
      if (dieTimer <= 0) finishRun();
    }
    Render.draw(sim, {
      alpha: state === 'playing' ? Math.min(1, acc / STEP_MS) : 1,
      prevY: sim ? prevY : undefined,
      skin: skin,
      showPlayer: state === 'menu' || state === 'ready',
      ready: state === 'ready',
      hud: state === 'playing' || state === 'countdown' || state === 'paused' || state === 'dying',
      countdown: state === 'countdown' ? Math.ceil(countdown / 1000) : 0
    }, dt);
  }

  // ───────── wejście ─────────
  function tap() {
    GameAudio.unlock();
    if (state === 'ready') startRun();
    else if (state === 'playing') tapQueued = true;
  }
  $('game').addEventListener('pointerdown', function (e) { e.preventDefault(); tap(); });
  window.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      if (state === 'ready' || state === 'playing' || state === 'countdown') { e.preventDefault(); if (!e.repeat) tap(); }
    } else if (e.code === 'Escape' || e.code === 'KeyP') {
      if (state === 'playing' || state === 'countdown') pause('user'); else if (state === 'paused') resume();
    }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause('hidden'); });
  window.addEventListener('blur', function () { pause('blur'); });
  document.addEventListener('contextmenu', function (e) { if (e.target.tagName !== 'INPUT') e.preventDefault(); });

  function click(id, fn) { $(id).addEventListener('click', function (e) { GameAudio.unlock(); GameAudio.sfx('ui'); fn(e); }); }
  click('btn-play', toReady);
  click('btn-again', toReady);
  click('btn-menu', function () { state = 'menu'; sim = null; Render.reset(); GameAudio.musicDuck(true); show('scr-start'); });
  click('btn-pause', function () { pause('user'); });
  click('btn-resume', resume);
  click('btn-skins', function () { buildSkins(); show('scr-skins'); });
  click('btn-skins-back', function () { show('scr-start'); });
  click('btn-entry', function () {
    $('form-score').textContent = lastRun ? lastRun.report.score : 0;
    $('entry-form').hidden = false; $('form-done').hidden = true; $('form-error').hidden = true;
    show('scr-form'); $('f-name').focus();
  });
  click('btn-form-back', function () { show('scr-over'); });
  $('btn-sound').addEventListener('click', function () {
    GameAudio.unlock(); GameAudio.setMuted(!GameAudio.muted); syncSound();
  });
  function syncSound() {
    $('btn-sound').classList.toggle('off', GameAudio.muted);
    $('btn-sound').setAttribute('aria-label', GameAudio.muted ? 'Włącz dźwięk' : 'Wyłącz dźwięk');
  }

  // ───────── formularz ─────────
  $('entry-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('f-name').value.trim(), email = $('f-email').value.trim(), err = '';
    if (name.length < 2) err = 'Podaj imię (min. 2 znaki).';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) err = 'Podaj poprawny adres e-mail, np. ania@example.com.';
    else if (!$('f-consent').checked) err = 'Zaznacz zgodę, żeby wysłać zgłoszenie.';
    $('form-error').hidden = !err; $('form-error').textContent = err;
    if (err || !lastRun) return;
    var payload = { type: 'miamiflap:entry', name: name, email: email, consent: true, report: lastRun.report, integrity: lastRun.integrity };
    post(payload);
    var done = function (msg) { $('entry-form').hidden = true; $('form-done').hidden = false; $('form-done-msg').textContent = msg; $('entry-form').reset(); };
    if (CONFIG.entryEndpoint) {
      fetch(CONFIG.entryEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); done('Zgłoszenie przyjęte. Wynik: ' + lastRun.report.score + '.'); })
        .catch(function () { $('form-error').hidden = false; $('form-error').textContent = 'Nie udało się wysłać zgłoszenia. Sprawdź połączenie i spróbuj ponownie.'; });
    } else {
      done('Wersja testowa: zgłoszenie nie zostało jeszcze nigdzie zapisane. Formularz zacznie działać po podłączeniu do strony konkursu.');
    }
  });

  // ───────── skiny ─────────
  function buildSkins() {
    var grid = $('skin-grid');
    grid.textContent = '';
    CONFIG.skins.forEach(function (s) {
      var locked = s.stage > maxStage, b = document.createElement('button');
      b.className = 'skin'; b.type = 'button'; b.disabled = locked;
      b.setAttribute('aria-pressed', String(s.id === skin));
      var img = document.createElement('img');
      img.src = Sprites.dataUrl(Sprites.skins[s.id].frames[0], 4); img.alt = '';
      var nm = document.createElement('span'); nm.textContent = s.name;
      var sm = document.createElement('small'); sm.textContent = locked ? 'Dotrzyj do etapu ' + s.stage : (s.id === skin ? 'Wybrany' : 'Wybierz');
      b.append(img, nm, sm);
      b.addEventListener('click', function () { skin = s.id; store.set('skin', skin); GameAudio.sfx('ui'); buildSkins(); });
      grid.appendChild(b);
    });
  }

  // ───────── start ─────────
  Sprites.init();
  Render.init($('game'));
  function fit() {
    var px = $('stage').clientWidth * (window.devicePixelRatio || 1);
    Render.setScale(Math.max(2, Math.min(6, Math.ceil(px / C.W))));
  }
  fit(); window.addEventListener('resize', fit);
  $('ico-dollar').src = Sprites.dataUrl(Sprites.dollar, 4);
  $('ico-prosecco').src = Sprites.dataUrl(Sprites.prosecco, 4);
  $('ico-diamond').src = Sprites.dataUrl(Sprites.diamond, 4);
  $('tagline').textContent = ''; CONFIG.tagline.forEach(function (l, i) { if (i) $('tagline').appendChild(document.createElement('br')); $('tagline').appendChild(document.createTextNode(l)); });
  $('bottle-name').textContent = CONFIG.bottleName;
  $('prize-main').textContent = CONFIG.prizes.main;
  $('prize-side').textContent = CONFIG.prizes.side.join(', ').toLowerCase();
  $('over-prize').textContent = CONFIG.prizes.mainCta;
  $('qr-link').href = CONFIG.landingUrl; $('qr-label').textContent = CONFIG.landingLabel.toLowerCase();
  document.title = CONFIG.title;
  (function drawQr() {
    var c = $('qr-canvas'), q = CONFIG.qr, x = c.getContext('2d');
    c.width = c.height = q.length + 4;
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#000';
    for (var r = 0; r < q.length; r++) for (var k = 0; k < q.length; k++) if (q[r][k] === '1') x.fillRect(k + 2, r + 2, 1, 1);
  })();
  syncSound();
  show('scr-start');
  if (params.has('debug')) window.__mf = { get sim() { return sim; }, get state() { return state; }, get lastRun() { return lastRun; }, tap: tap, setStage: function (n) { maxStage = n; } };
  requestAnimationFrame(function (now) { last = now; requestAnimationFrame(frame); });
})();
