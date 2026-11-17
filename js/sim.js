/*
 * MIAMI FLAP — deterministyczny rdzeń gry (bez DOM, bez canvas, bez czasu systemowego).
 *
 * Ten sam plik działa w przeglądarce (window.Sim) i w Node (require) — dzięki temu
 * serwer może odtworzyć przebieg gry z samego ziarna (seed) i listy tapnięć
 * i sprawdzić, czy zgłoszony wynik jest prawdziwy (tools/verify.js).
 *
 * Zasady determinizmu: stały krok 60 Hz, własny RNG na liczbach całkowitych,
 * tylko + - * / i sqrt (bez Math.sin/pow/random, które mogą się różnić między silnikami).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Sim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var C = {
    VERSION: 1,
    W: 216, H: 384, GROUND_Y: 344, STEP_HZ: 60,

    PLAYER_X: 56, PLAYER_R: 7, START_Y: 170,
    GRAVITY: 0.19, FLAP: -3.45, MAX_FALL: 5, CEILING: 8,

    GATE_SPACING: 132, GATE_HALF_W: 14, GAP: 118, GAP_MARGIN: 34, GAP_MAX_DELTA: 90,
    FIRST_GATE_X: 330,

    SPEED0: 1.5, SPEED_PER_STAGE: 0.18, SPEED_MAX: 2.7,
    GATES_PER_STAGE: 12,

    PTS: { dollar: 1, prosecco: 3, diamond: 5 },
    PICK_R: { dollar: 9, prosecco: 10, diamond: 8 },

    COMBO_WINDOW: 120, COMBO_X2: 4, COMBO_X3: 10,

    PROSECCO_FOR_MIAMI: 3, MIAMI_STEPS: 360, MAGNET_R: 64, MAGNET_PULL: 2.4, INVULN_STEPS: 60,

    BUBBLE_FROM_GATE: 8, BUBBLE_HW: 11, BUBBLE_HH: 7, BUBBLE_AMP: 18, BUBBLE_PERIOD: 120,
    BUBBLE_OFFSET: 72, PROSECCO_OFFSET: 42
  };

  // mulberry32 — operacje wyłącznie na uint32, identyczne w każdym silniku JS
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function create(seed) {
    var s = {
      seed: seed >>> 0,
      rng: makeRng(seed),
      step: 0, alive: true,
      y: C.START_Y, vy: 0,
      speed: C.SPEED0, dist: 0,
      gatesSpawned: 0, gatesPassed: 0, stage: 1,
      score: 0, combo: 0, comboTimer: 0,
      prosecco: 0, miami: 0, shield: false, invuln: 0,
      gates: [], items: [], bubbles: [],
      taps: [], events: [],
      stats: { dollar: 0, prosecco: 0, diamond: 0, miamiModes: 0, shieldsUsed: 0 },
      cause: null
    };
    spawnAhead(s);
    return s;
  }

  function comboMult(s) { return s.combo >= C.COMBO_X3 ? 3 : s.combo >= C.COMBO_X2 ? 2 : 1; }
  function multiplier(s) { return comboMult(s) * (s.miami > 0 ? 2 : 1); }

  function spawnAhead(s) {
    while (true) {
      var last = s.gates.length ? s.gates[s.gates.length - 1] : null;
      var x = last ? last.x + C.GATE_SPACING : C.FIRST_GATE_X;
      if (x > C.W + C.GATE_SPACING + 40) break;
      spawnGate(s, x, last);
    }
  }

  function spawnGate(s, x, prev) {
    var r = s.rng;
    var lo = C.GAP / 2 + C.GAP_MARGIN, hi = C.GROUND_Y - C.GAP / 2 - C.GAP_MARGIN;
    var gapY = lo + r() * (hi - lo);
    if (prev) gapY = clamp(gapY, prev.gapY - C.GAP_MAX_DELTA, prev.gapY + C.GAP_MAX_DELTA);
    gapY = Math.round(gapY);
    var idx = s.gatesSpawned++;
    var gate = { i: idx, x: x, gapY: gapY, passed: false, dead: false };
    s.gates.push(gate);

    // odcinek między poprzednią bramką a tą: dolary po torze lotu, prosecco z boku, plotka po drugiej stronie
    var ax = prev ? prev.x : x - C.GATE_SPACING, ay = prev ? prev.gapY : C.START_Y;
    var stage = 1 + Math.floor(idx / C.GATES_PER_STAGE);
    var midX = (ax + x) / 2, midY = (ay + gapY) / 2;

    if (r() < 0.82) {
      var n = 3 + Math.floor(r() * 3);
      for (var k = 0; k < n; k++) {
        var t = (k + 1) / (n + 1);
        var e = t * t * (3 - 2 * t);
        s.items.push({ type: 'dollar', x: ax + (x - ax) * t, y: Math.round(ay + (gapY - ay) * e), taken: false });
      }
    }
    var side = r() < 0.5 ? -1 : 1;
    if (r() < 0.25) {
      // diament: tuż przy krawędzi dymu, w samej bramce
      s.items.push({ type: 'diamond', x: x, y: gapY + side * (C.GAP / 2 - 12), taken: false });
    }
    var pSide = r() < 0.5 ? -1 : 1;
    var hasProsecco = r() < 0.30;
    if (hasProsecco) {
      s.items.push({ type: 'prosecco', x: midX, y: clamp(Math.round(midY + pSide * C.PROSECCO_OFFSET), 22, C.GROUND_Y - 22), taken: false });
    }
    var bubbleChance = Math.min(0.35 + 0.08 * (stage - 1), 0.65);
    var rollBubble = r();
    if (idx >= C.BUBBLE_FROM_GATE && rollBubble < bubbleChance) {
      var bSide = -pSide;
      var by = midY + bSide * C.BUBBLE_OFFSET;
      var bLo = 30 + C.BUBBLE_AMP, bHi = C.GROUND_Y - 30 - C.BUBBLE_AMP;
      if (by < bLo || by > bHi) {
        // nie mieści się po tej stronie — przenieś na drugą (wtedy bez prosecco w tym miejscu nie koliduje z torem)
        var alt = midY - bSide * C.BUBBLE_OFFSET;
        by = (alt >= bLo && alt <= bHi) ? alt : clamp(by, bLo, bHi);
      }
      s.bubbles.push({ x: midX, baseY: Math.round(by), y: Math.round(by), phase: Math.floor(r() * C.BUBBLE_PERIOD), dead: false });
    }
  }

  // fala trójkątna -1..1 (zamiast sin — w pełni deterministyczna)
  function tri(phase, period) {
    var p = (phase % period) / period;
    return p < 0.25 ? p * 4 : p < 0.75 ? 2 - p * 4 : p * 4 - 4;
  }

  function circleRect(cx, cy, r, rx0, ry0, rx1, ry1) {
    var nx = clamp(cx, rx0, rx1), ny = clamp(cy, ry0, ry1);
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  function hit(s, kind, obstacle) {
    if (s.shield) {
      s.shield = false;
      s.invuln = C.INVULN_STEPS;
      s.stats.shieldsUsed++;
      if (obstacle) obstacle.dead = true;
      if (kind === 'ground') { s.y = C.GROUND_Y - C.PLAYER_R - 1; s.vy = C.FLAP; }
      s.events.push({ t: 'shield', kind: kind, x: obstacle ? obstacle.x : C.PLAYER_X, y: s.y });
      return;
    }
    s.alive = false;
    s.cause = kind;
    s.events.push({ t: 'dead', kind: kind });
  }

  function step(s, tap) {
    if (!s.alive) return;
    s.step++;

    if (tap) { s.vy = C.FLAP; s.taps.push(s.step); s.events.push({ t: 'flap' }); }
    s.vy = Math.min(s.vy + C.GRAVITY, C.MAX_FALL);
    s.y += s.vy;
    if (s.y < C.CEILING) { s.y = C.CEILING; s.vy = 0; }

    var v = s.speed, i;
    s.dist += v;
    for (i = 0; i < s.gates.length; i++) s.gates[i].x -= v;
    for (i = 0; i < s.items.length; i++) s.items[i].x -= v;
    for (i = 0; i < s.bubbles.length; i++) {
      var b = s.bubbles[i];
      b.x -= v; b.phase++;
      b.y = b.baseY + C.BUBBLE_AMP * tri(b.phase, C.BUBBLE_PERIOD);
    }
    while (s.gates.length && s.gates[0].x < -40) s.gates.shift();
    while (s.items.length && s.items[0].x < -80) s.items.shift();
    while (s.bubbles.length && s.bubbles[0].x < -40) s.bubbles.shift();
    spawnAhead(s);

    if (s.comboTimer > 0 && --s.comboTimer === 0) { s.combo = 0; }
    if (s.invuln > 0) s.invuln--;
    if (s.miami > 0 && --s.miami === 0) { s.shield = false; s.events.push({ t: 'miamiEnd' }); }

    var px = C.PLAYER_X, py = s.y, R = C.PLAYER_R;

    // zbierajki (+ magnes w Miami Mode)
    for (i = 0; i < s.items.length; i++) {
      var it = s.items[i];
      if (it.taken) continue;
      var dx = px - it.x, dy = py - it.y, d2 = dx * dx + dy * dy;
      if (s.miami > 0 && d2 < C.MAGNET_R * C.MAGNET_R && d2 > 1) {
        var d = Math.sqrt(d2), pull = Math.min(C.MAGNET_PULL, d);
        it.x += dx / d * pull; it.y += dy / d * pull;
        dx = px - it.x; dy = py - it.y; d2 = dx * dx + dy * dy;
      }
      var pr = C.PICK_R[it.type] + R;
      if (d2 < pr * pr) {
        it.taken = true;
        s.combo++; s.comboTimer = C.COMBO_WINDOW;
        var mult = multiplier(s), pts = C.PTS[it.type] * mult;
        s.score += pts;
        s.stats[it.type]++;
        s.events.push({ t: 'pickup', type: it.type, pts: pts, mult: mult, x: it.x, y: it.y });
        if (it.type === 'prosecco') {
          s.prosecco++;
          if (s.prosecco >= C.PROSECCO_FOR_MIAMI) {
            s.prosecco = 0;
            s.miami = C.MIAMI_STEPS; s.shield = true;
            s.stats.miamiModes++;
            s.events.push({ t: 'miamiStart' });
          }
        }
      }
    }

    // bramki: zaliczenie + etapy
    for (i = 0; i < s.gates.length; i++) {
      var g = s.gates[i];
      if (!g.passed && g.x + C.GATE_HALF_W < px - R) {
        g.passed = true;
        s.gatesPassed++;
        var st = 1 + Math.floor(s.gatesPassed / C.GATES_PER_STAGE);
        if (st !== s.stage) {
          s.stage = st;
          s.speed = Math.min(C.SPEED0 + C.SPEED_PER_STAGE * (st - 1), C.SPEED_MAX);
          s.events.push({ t: 'stage', stage: st });
        }
      }
    }

    // kolizje
    if (s.invuln === 0) {
      for (i = 0; i < s.gates.length && s.alive; i++) {
        var q = s.gates[i];
        if (q.dead) continue;
        var x0 = q.x - C.GATE_HALF_W, x1 = q.x + C.GATE_HALF_W;
        if (x1 < px - R || x0 > px + R) continue;
        var top = q.gapY - C.GAP / 2, bot = q.gapY + C.GAP / 2;
        if (circleRect(px, py, R, x0, -1000, x1, top) || circleRect(px, py, R, x0, bot, x1, 2000)) {
          hit(s, 'smoke', q);
          if (s.invuln > 0) break;
        }
      }
      if (s.alive && s.invuln === 0) {
        for (i = 0; i < s.bubbles.length; i++) {
          var u = s.bubbles[i];
          if (u.dead) continue;
          if (circleRect(px, py, R, u.x - C.BUBBLE_HW, u.y - C.BUBBLE_HH, u.x + C.BUBBLE_HW, u.y + C.BUBBLE_HH)) {
            hit(s, 'gossip', u);
            break;
          }
        }
      }
    }
    // ziemia kończy lot zawsze (chyba że tarcza)
    if (s.alive && s.y + R >= C.GROUND_Y) {
      if (s.shield) hit(s, 'ground', null);
      else if (s.invuln > 0) { s.y = C.GROUND_Y - R - 1; s.vy = C.FLAP * 0.6; }
      else hit(s, 'ground', null);
    }
  }

  // Raport z rozgrywki: wszystko, czego serwer potrzebuje, żeby odtworzyć grę.
  function report(s) {
    var deltas = [], prev = 0;
    for (var i = 0; i < s.taps.length; i++) { deltas.push(s.taps[i] - prev); prev = s.taps[i]; }
    return { v: C.VERSION, seed: s.seed, steps: s.step, taps: deltas, score: s.score, gates: s.gatesPassed, stage: s.stage };
  }

  // Odtwarza grę z raportu. Zwraca {ok, reason, score}.
  function verify(rep) {
    if (!rep || rep.v !== C.VERSION) return { ok: false, reason: 'version' };
    if (!Array.isArray(rep.taps) || !(rep.steps > 0) || rep.steps > 60 * 60 * 60 * 3) return { ok: false, reason: 'format' };
    var s = create(rep.seed), ti = 0, next = rep.taps.length ? rep.taps[0] : -1, acc = next;
    for (var n = 1; n <= rep.steps; n++) {
      var tap = false;
      if (ti < rep.taps.length && n === acc) { tap = true; ti++; if (ti < rep.taps.length) { if (!(rep.taps[ti] > 0)) return { ok: false, reason: 'format' }; acc += rep.taps[ti]; } }
      step(s, tap);
      s.events.length = 0;
      if (!s.alive && n < rep.steps) return { ok: false, reason: 'died-early', score: s.score };
    }
    if (ti !== rep.taps.length) return { ok: false, reason: 'taps-after-end', score: s.score };
    if (s.alive) return { ok: false, reason: 'not-finished', score: s.score };
    if (s.score !== rep.score) return { ok: false, reason: 'score-mismatch', score: s.score };
    return { ok: true, score: s.score, gates: s.gatesPassed, stage: s.stage };
  }

  return { C: C, create: create, step: step, report: report, verify: verify, multiplier: multiplier, comboMult: comboMult, makeRng: makeRng };
});
