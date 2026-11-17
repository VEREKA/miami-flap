/* MIAMI FLAP — renderer (canvas 216×384). Czysto kosmetyczny: nie wpływa na symulację. */
(function () {
  'use strict';
  var C = Sim.C, W = C.W, H = C.H, GY = C.GROUND_Y;
  var HORIZON = 262, SAND_Y = 306;
  var ctx, t = 0, scroll = 0, lastDist = 0, lastSim = null;
  var particles = [], popups = [], banner = null, shake = 0, flash = 0;
  var rnd = Sim.makeRng(20261117);

  // ───────── motywy etapów ─────────
  var THEMES = [
    { sky: ['#2BB8F0', '#8FE3F7', '#FFD3EA'], sun: '#FFF27A', sunLow: '#FFB86B', ocean: ['#18B7CE', '#6FE6EE'], sand: ['#FFE7B8', '#F5CF94'],
      bldg: ['#FF9EC7', '#7FE0D0', '#FFE08A', '#B9A7F5', '#FFFFFF'], win: '#FFFFFF', trunk: '#9A6A48', palm: '#1F8A6A', palmHi: '#4CC79A',
      ground: ['#FF8FC2', '#FFB3D6'], curb: '#3FF0FF', stars: 0, cloud: 1 },
    { sky: ['#4B1E8C', '#F0509B', '#FFB45E'], sun: '#FFE45E', sunLow: '#FF5FA2', ocean: ['#A2368E', '#FF9A8A'], sand: ['#C8627A', '#A84A70'],
      bldg: ['#5A2380', '#6B2A8F', '#4A1C70', '#5A2380', '#7A3299'], win: '#FFD86B', trunk: '#2A0F3D', palm: '#2A0F3D', palmHi: '#5A2378',
      ground: ['#7A2C9E', '#9440B8'], curb: '#FF5FD2', stars: 0.25, cloud: 0.5 },
    { sky: ['#070420', '#1E0B52', '#6A1B9A'], sun: '#F4F0FF', sunLow: '#C9B8FF', ocean: ['#12104A', '#4B38C2'], sand: ['#241452', '#1A0E3F'],
      bldg: ['#120A33', '#1A0E45', '#0E0828', '#160C3C', '#1F1050'], win: '#3FF0FF', trunk: '#05020F', palm: '#05020F', palmHi: '#35189A',
      ground: ['#160B3A', '#22104F'], curb: '#3FF0FF', stars: 1, cloud: 0 },
    { sky: ['#241A7A', '#E85AA8', '#FFD27A'], sun: '#FFF1B0', sunLow: '#FF8FC2', ocean: ['#5B5FD0', '#FFB8D0'], sand: ['#F2B6A0', '#DB9488'],
      bldg: ['#3B2A8C', '#51349E', '#2E2170', '#46309A', '#5C3CB0'], win: '#FFE9A8', trunk: '#1B1250', palm: '#1B1250', palmHi: '#4A36A0',
      ground: ['#C0569E', '#D878B4'], curb: '#FFE45E', stars: 0.35, cloud: 0.6 }
  ];
  function rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mixC(a, b, k) { return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * k) + ',' + Math.round(a[1] + (b[1] - a[1]) * k) + ',' + Math.round(a[2] + (b[2] - a[2]) * k) + ')'; }
  var PARSED = THEMES.map(function (th) {
    var o = {};
    Object.keys(th).forEach(function (k) {
      var v = th[k];
      o[k] = typeof v === 'number' ? v : Array.isArray(v) ? v.map(rgb) : rgb(v);
    });
    return o;
  });
  var themeFrom = 0, themeTo = 0, themeK = 1, pal = null;
  function buildPal() {
    var a = PARSED[themeFrom], b = PARSED[themeTo], k = themeK, o = {};
    Object.keys(a).forEach(function (key) {
      var va = a[key], vb = b[key];
      if (typeof va === 'number') o[key] = va + (vb - va) * k;
      else if (Array.isArray(va[0])) o[key] = va.map(function (c, i) { return mixC(c, vb[i], k); });
      else o[key] = mixC(va, vb, k);
    });
    o.skyRaw = a.sky.map(function (c, i) { return [c[0] + (b.sky[i][0] - c[0]) * k, c[1] + (b.sky[i][1] - c[1]) * k, c[2] + (b.sky[i][2] - c[2]) * k]; });
    pal = o;
  }
  function setTheme(idx, instant) {
    idx = ((idx % THEMES.length) + THEMES.length) % THEMES.length;
    if (idx === themeTo && !instant) return;
    if (instant) { themeFrom = themeTo = idx; themeK = 1; } else { themeFrom = themeTo; themeTo = idx; themeK = 0; }
    buildPal();
  }

  // ───────── elementy tła generowane raz ─────────
  var stars = [], skyline = [], SKY_TILE = 432, clouds = [];
  var mid = [], midNext = 40, sloganIdx = 0, palmsSinceBoard = 0;

  function genStatic() {
    var i;
    for (i = 0; i < 46; i++) stars.push({ x: Math.floor(rnd() * W), y: Math.floor(rnd() * 200), p: rnd() * 6.28, big: rnd() < 0.15 });
    var x = 0;
    while (x < SKY_TILE - 8) {
      var w = 10 + Math.floor(rnd() * 18), h = 12 + Math.floor(rnd() * rnd() * 70), wins = [];
      if (x + w > SKY_TILE) w = SKY_TILE - x;
      for (var wy = 4; wy < h - 3; wy += 4) for (var wx = 2; wx < w - 2; wx += 3) if (rnd() < 0.55) wins.push([wx, wy]);
      skyline.push({ x: x, w: w, h: h, c: Math.floor(rnd() * 5), step: rnd() < 0.6 ? 2 + Math.floor(rnd() * 3) : 0, spire: rnd() < 0.3 ? 4 + Math.floor(rnd() * 8) : 0, wins: wins });
      x += w + (rnd() < 0.3 ? 2 + Math.floor(rnd() * 5) : 0);
    }
    for (i = 0; i < 4; i++) clouds.push({ x: rnd() * 300, y: 24 + rnd() * 90, w: 22 + Math.floor(rnd() * 22) });
  }

  // palma: lista prostokątów [x, y, w, h, odcień]  (0 pień, 1 liść, 2 połysk)
  function makePalm(h, lean) {
    var px = [], i;
    for (i = 0; i < h; i++) {
      var k = i / h, x = Math.round(lean * k * k), w = k < 0.35 ? 3 : 2;
      px.push([x - 1, -i, w, 1, 0]);
      if (i % 4 === 0) px.push([x - 1, -i, 1, 1, 2]);
    }
    var cx = Math.round(lean), cy = -h;
    var fr = [[-1, 0.95, -0.55, 21], [-1, 0.75, -0.95, 17], [-1, 1.0, -0.1, 18], [1, 0.95, -0.55, 21], [1, 0.75, -0.95, 17], [1, 1.0, -0.1, 18], [-1, 0.25, -1.2, 12], [1, 0.3, -1.15, 12]];
    fr.forEach(function (f) {
      for (var s = 0; s < f[3]; s++) {
        var fx = Math.round(cx + f[0] * f[1] * s), fy = Math.round(cy + f[2] * s + 0.045 * s * s);
        var thick = s < f[3] * 0.65 ? 2 : 1;
        px.push([fx, fy, 1, thick, 1]);
        if (s > 1 && s % 2 === 0 && s < f[3] - 2) px.push([fx, fy + thick, 1, s < f[3] * 0.5 ? 3 : 2, 1]);
        if (s > 0 && s < f[3] * 0.7) px.push([fx, fy - 0, 1, 1, 2]);
      }
    });
    px.push([cx - 2, cy + 1, 2, 2, 0], [cx + 1, cy + 2, 2, 2, 0]);
    return px;
  }

  var BOARD = { w: 126, h: 62, top: 236 };
  var BOARD_STYLES = [
    { bg: '#FFF36B', fg: '#D4147A', bar: '#D4147A', barFg: '#FFF36B' },
    { bg: '#FFFFFF', fg: '#1A1033', bar: '#FF2E88', barFg: '#FFFFFF' },
    { bg: '#FF2E88', fg: '#FFFFFF', bar: '#1A1033', barFg: '#3FF0FF' },
    { bg: '#3FF0FF', fg: '#1A1033', bar: '#1A1033', barFg: '#FFF36B' }
  ];
  function genMid(limit) {
    while (midNext < limit) {
      if (palmsSinceBoard >= 5) {
        var list = CONFIG.billboards;
        mid.push({ kind: 'board', x: midNext, text: list[sloganIdx % list.length], style: BOARD_STYLES[sloganIdx % BOARD_STYLES.length], lines: null });
        sloganIdx++; palmsSinceBoard = 0;
        midNext += BOARD.w + 26 + Math.floor(rnd() * 20);
      } else {
        var h = 38 + Math.floor(rnd() * 26);
        mid.push({ kind: 'palm', x: midNext, base: 338 + Math.floor(rnd() * 5), px: makePalm(h, Math.round((rnd() - 0.5) * 22)) });
        palmsSinceBoard++;
        midNext += 44 + Math.floor(rnd() * 46);
      }
    }
  }

  // ───────── rysowanie tła ─────────
  function drawSky() {
    var s = pal.skyRaw, bands = 26, bh = Math.ceil(HORIZON / bands);
    for (var i = 0; i < bands; i++) {
      var k = i / (bands - 1), a, b, kk;
      if (k < 0.55) { a = s[0]; b = s[1]; kk = k / 0.55; } else { a = s[1]; b = s[2]; kk = (k - 0.55) / 0.45; }
      ctx.fillStyle = mixC(a, b, kk);
      ctx.fillRect(0, i * bh, W, bh);
    }
    if (pal.stars > 0.02) {
      for (i = 0; i < stars.length; i++) {
        var st = stars[i], tw = 0.55 + 0.45 * Math.sin(t * 0.05 + st.p);
        ctx.globalAlpha = pal.stars * tw * (1 - st.y / 260);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(st.x, st.y, 1, 1);
        if (st.big) { ctx.fillRect(st.x - 1, st.y, 3, 1); ctx.fillRect(st.x, st.y - 1, 1, 3); }
      }
      ctx.globalAlpha = 1;
    }
    // słońce w paski
    var cx = 150, cy = 196, r = 40;
    for (var y = -r; y <= r; y++) {
      if (y > 2 && (y % 7) < 1 + Math.floor(y / 12)) continue;
      var hw = Math.round(Math.sqrt(r * r - y * y));
      ctx.fillStyle = y > 6 ? pal.sunLow : pal.sun;
      ctx.fillRect(cx - hw, cy + y, hw * 2, 1);
    }
    if (pal.cloud > 0.02) {
      ctx.globalAlpha = 0.85 * pal.cloud; ctx.fillStyle = '#FFFFFF';
      for (i = 0; i < clouds.length; i++) {
        var c = clouds[i], x = Math.round(((c.x - scroll * 0.04) % 320 + 320) % 320) - 50, yy = Math.round(c.y);
        ctx.fillRect(x, yy, c.w, 4); ctx.fillRect(x + 4, yy - 3, c.w - 12, 3); ctx.fillRect(x + 9, yy - 5, c.w - 24, 2); ctx.fillRect(x + 3, yy + 4, c.w - 8, 1);
      }
      ctx.globalAlpha = 1;
    }
  }
  function drawSkyline() {
    var off = Math.floor(scroll * 0.12) % SKY_TILE;
    for (var rep = 0; rep < 2; rep++) {
      for (var i = 0; i < skyline.length; i++) {
        var b = skyline[i], x = b.x - off + rep * SKY_TILE;
        if (x + b.w < 0 || x > W) continue;
        ctx.fillStyle = pal.bldg[b.c];
        ctx.fillRect(x, HORIZON - b.h, b.w, b.h);
        if (b.step && b.w > 8) ctx.fillRect(x + b.step, HORIZON - b.h - 3, b.w - b.step * 2, 3);
        if (b.spire) ctx.fillRect(x + (b.w >> 1), HORIZON - b.h - 3 - b.spire, 1, b.spire);
        ctx.fillStyle = pal.win;
        ctx.globalAlpha = 0.35 + 0.65 * Math.min(1, pal.stars * 2 + 0.15);
        for (var w = 0; w < b.wins.length; w++) ctx.fillRect(x + b.wins[w][0], HORIZON - b.h + b.wins[w][1], 1, 2);
        ctx.globalAlpha = 1;
      }
    }
  }
  function drawOcean() {
    ctx.fillStyle = pal.ocean[0];
    ctx.fillRect(0, HORIZON, W, SAND_Y - HORIZON);
    ctx.fillStyle = pal.ocean[1];
    for (var row = 0; row < 8; row++) {
      var y = HORIZON + 2 + row * 5 + (row > 3 ? row - 3 : 0), len = 6 + row * 2, gap = 14 + row * 5;
      var off = Math.floor(scroll * (0.14 + row * 0.03) + row * 37 + Math.sin(t * 0.03 + row) * 2) % (len + gap);
      ctx.globalAlpha = 0.35 + row * 0.07;
      for (var x = -off; x < W; x += len + gap) ctx.fillRect(x, y, len, 1);
    }
    // odbicie słońca
    ctx.fillStyle = pal.sun; ctx.globalAlpha = 0.55;
    for (row = 0; row < 9; row++) { var hw = 16 - row + Math.round(Math.sin(t * 0.06 + row * 1.7) * 2); ctx.fillRect(150 - hw, HORIZON + 2 + row * 4, hw * 2, 1); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.sand[0]; ctx.fillRect(0, SAND_Y, W, GY - SAND_Y);
    ctx.fillStyle = pal.sand[1];
    ctx.fillRect(0, SAND_Y, W, 1);
    var so = Math.floor(scroll * 0.45) % 23;
    for (var sx = -so; sx < W; sx += 23) { ctx.fillRect(sx, SAND_Y + 9, 7, 1); ctx.fillRect(sx + 11, SAND_Y + 21, 5, 1); ctx.fillRect(sx + 4, SAND_Y + 31, 9, 1); }
  }
  function drawBoard(o, x) {
    var st = o.style, bw = BOARD.w, bh = BOARD.h, top = BOARD.top, i;
    ctx.fillStyle = '#1A1033';
    ctx.fillRect(x + 16, top + bh, 4, 340 - top - bh); ctx.fillRect(x + bw - 20, top + bh, 4, 340 - top - bh);
    ctx.fillRect(x + 16, top + bh + 10, bw - 32, 2);
    ctx.fillRect(x - 2, top - 2, bw + 4, bh + 4);
    ctx.fillStyle = st.bg; ctx.fillRect(x, top, bw, bh);
    ctx.fillStyle = st.bar; ctx.fillRect(x, top + bh - 12, bw, 12);
    // żarówki
    for (i = 0; i < 16; i++) {
      ctx.fillStyle = ((i + Math.floor(t / 14)) % 2) ? '#FFF36B' : '#FF5FD2';
      ctx.fillRect(x + 2 + i * 8, top - 2, 2, 2);
    }
    if (!o.lines) o.lines = Font.wrap(o.text, bw - 27 - 12);
    var n = o.lines.length, y0 = top + 5 + Math.max(0, Math.floor((4 - n) * Font.LINE / 2));
    for (i = 0; i < n; i++) Font.draw(ctx, o.lines[i], x + 5, y0 + i * Font.LINE, st.fg);
    Font.draw(ctx, CONFIG.landingLabel, x + 5, top + bh - 9, st.barFg);
    Font.draw(ctx, '>', x + 7 + Font.measure(CONFIG.landingLabel), top + bh - 9, st.barFg);
    // kod QR (1 px = 1 moduł, biały margines 2 px)
    var q = CONFIG.qr, qs = q.length, qx = x + bw - qs - 6, qy = top + 5;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(qx - 2, qy - 2, qs + 4, qs + 4);
    ctx.fillStyle = '#000000';
    for (var r = 0; r < qs; r++) { var row = q[r], k = 0; while (k < qs) { if (row[k] === '1') { var e = k; while (e < qs && row[e] === '1') e++; ctx.fillRect(qx + k, qy + r, e - k, 1); k = e; } else k++; } }
  }
  function drawMid() {
    var off = scroll * 0.45;
    genMid(off + W + 200);
    while (mid.length && mid[0].x - off < -220) mid.shift();
    for (var i = 0; i < mid.length; i++) {
      var o = mid[i], x = Math.round(o.x - off);
      if (x > W + 40) break;
      if (o.kind === 'board') drawBoard(o, x);
      else {
        var cols = [pal.trunk, pal.palm, pal.palmHi];
        for (var p = 0; p < o.px.length; p++) { var q = o.px[p]; ctx.fillStyle = cols[q[4]]; ctx.fillRect(x + q[0], o.base + q[1], q[2], q[3]); }
      }
    }
  }
  function drawGround() {
    ctx.fillStyle = pal.ground[0]; ctx.fillRect(0, GY, W, H - GY);
    var off = Math.floor(scroll) % 24;
    ctx.fillStyle = pal.ground[1];
    for (var x = -off - 24; x < W + 24; x += 24) {
      ctx.fillRect(x, GY + 5, 12, 6); ctx.fillRect(x + 12, GY + 11, 12, 6); ctx.fillRect(x, GY + 17, 12, 6); ctx.fillRect(x + 12, GY + 23, 12, 6); ctx.fillRect(x, GY + 29, 12, 6); ctx.fillRect(x + 12, GY + 35, 12, 6);
    }
    ctx.fillStyle = '#1A1033'; ctx.fillRect(0, GY, W, 1);
    ctx.fillStyle = pal.curb; ctx.fillRect(0, GY + 1, W, 2);
    ctx.globalAlpha = 0.35; ctx.fillRect(0, GY + 3, W, 1); ctx.globalAlpha = 1;
  }

  // ───────── obiekty gry ─────────
  var OFFS = [3, -4, 2, -3, 4, -2];
  function drawGate(g) {
    var gx = Math.round(g.x), top = g.gapY - C.GAP / 2, bot = g.gapY + C.GAP / 2, k, y, xo, n;
    if (g.dead) ctx.globalAlpha = 0.22;
    n = Math.ceil((top + 20) / 14);
    for (k = n; k >= 1; k--) {
      y = top + 3 - 20 - k * 14;
      xo = OFFS[(k + g.i) % 6] + Math.round(Math.sin(t * 0.045 + k * 1.3 + g.i) * 1.6);
      ctx.drawImage(Sprites.puff, gx - 16 + xo, y);
    }
    ctx.drawImage(Sprites.smoke, gx - 16 + Math.round(Math.sin(t * 0.05 + g.i) * 1), top + 3 - 20);
    n = Math.ceil((GY - bot) / 14) + 1;
    for (k = n; k >= 1; k--) {
      y = bot - 3 + k * 14;
      xo = OFFS[(k + g.i + 3) % 6] + Math.round(Math.sin(t * 0.045 + k * 1.7 + g.i * 2) * 1.6);
      ctx.drawImage(Sprites.puff, gx - 16 + xo, y);
    }
    ctx.drawImage(Sprites.smoke, gx - 16 + Math.round(Math.sin(t * 0.05 + g.i + 2) * 1), bot - 3);
    ctx.globalAlpha = 1;
  }
  function drawItem(it) {
    var sp = Sprites[it.type], bob = Math.round(Math.sin(t * 0.1 + it.x * 0.05) * 2);
    var x = Math.round(it.x - sp.width / 2), y = Math.round(it.y - sp.height / 2) + bob;
    ctx.drawImage(sp, x, y);
    if (it.type !== 'dollar' && ((t + Math.floor(it.x)) % 40) < 8) {
      ctx.fillStyle = '#FFFFFF';
      var sx = x + (it.type === 'diamond' ? 3 : 2), sy = y + 2;
      ctx.fillRect(sx - 2, sy, 5, 1); ctx.fillRect(sx, sy - 2, 1, 5);
    }
  }
  function drawPlayer(y, vy, view, sim) {
    var sk = Sprites.skins[view.skin] || Sprites.skins.classic;
    var fr = (vy < -0.5 || (Math.floor(t / 9) % 2)) ? 1 : 0;
    var ang = Math.max(-0.3, Math.min(0.6, vy * 0.11));
    var miami = sim && sim.miami > 0, inv = sim && sim.invuln > 0;
    if (inv && Math.floor(t / 3) % 2) return;
    ctx.save();
    ctx.translate(C.PLAYER_X, Math.round(y));
    ctx.rotate(ang);
    if (miami) {
      var ga = Math.floor(t / 6) % 2 ? sk.glowA[fr] : sk.glowB[fr], gb = Math.floor(t / 6) % 2 ? sk.glowB[fr] : sk.glowA[fr];
      if (sim.miami > 90 || Math.floor(t / 5) % 2) {
        ctx.drawImage(ga, -13, -12); ctx.drawImage(ga, -11, -12); ctx.drawImage(gb, -12, -13); ctx.drawImage(gb, -12, -11);
      }
    }
    ctx.drawImage(sk.frames[fr], -12, -12);
    ctx.restore();
    if (sim && sim.shield) {
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * 6.283 + t * 0.06;
        ctx.fillStyle = i % 2 ? '#3FF0FF' : '#FFFFFF';
        ctx.fillRect(Math.round(C.PLAYER_X + Math.cos(a) * 17), Math.round(y + Math.sin(a) * 17), 2, 2);
      }
    }
  }
  function drawParticles() {
    var i, p;
    for (i = particles.length - 1; i >= 0; i--) {
      p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life / 12);
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    ctx.globalAlpha = 1;
    for (i = popups.length - 1; i >= 0; i--) {
      p = popups[i];
      p.y -= 0.5; p.life--;
      if (p.life <= 0) { popups.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life / 10);
      Font.draw(ctx, p.text, p.x, p.y, p.c, { align: 0.5, outline: '#1A1033', scale: p.scale || 1 });
    }
    ctx.globalAlpha = 1;
  }
  function burst(x, y, n, cols, speed, g, size) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, v = speed * (0.4 + Math.random() * 0.8);
      particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: g, life: 18 + Math.random() * 18, c: cols[i % cols.length], s: size || 1 });
    }
  }

  // ───────── HUD ─────────
  function drawHud(sim, view) {
    var mult = Sim.multiplier(sim), i;
    Font.draw(ctx, String(sim.score), W / 2, 16, '#FFFFFF', { scale: 3, align: 0.5, outline: '#1A1033' });
    if (mult > 1) Font.draw(ctx, 'x' + mult, W / 2, 44, sim.miami > 0 ? '#3FF0FF' : '#FFF36B', { scale: 2, align: 0.5, outline: '#1A1033' });
    for (i = 0; i < C.PROSECCO_FOR_MIAMI; i++) ctx.drawImage(i < sim.prosecco ? Sprites.bottleMini : Sprites.bottleEmpty, 6 + i * 8, 8);
    Font.draw(ctx, 'ETAP ' + sim.stage, 6, 25, '#FFFFFF', { outline: '#1A1033' });
    if (sim.miami > 0) {
      var k = sim.miami / C.MIAMI_STEPS, bw = 80;
      ctx.fillStyle = '#1A1033'; ctx.fillRect(W / 2 - bw / 2 - 1, 66, bw + 2, 5);
      ctx.fillStyle = Math.floor(t / 6) % 2 ? '#FF5FD2' : '#3FF0FF'; ctx.fillRect(W / 2 - bw / 2, 67, Math.round(bw * k), 3);
      Font.draw(ctx, 'MIAMI MODE', W / 2, 76, Math.floor(t / 6) % 2 ? '#3FF0FF' : '#FF5FD2', { align: 0.5, outline: '#1A1033' });
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 0.3);
      ctx.fillStyle = Math.floor(t / 6) % 2 ? '#FF5FD2' : '#3FF0FF';
      ctx.fillRect(0, 0, W, 2); ctx.fillRect(0, H - 2, W, 2); ctx.fillRect(0, 0, 2, H); ctx.fillRect(W - 2, 0, 2, H);
      ctx.globalAlpha = 1;
    }
    if (banner) {
      banner.life--;
      var a = Math.min(1, banner.life / 20, (banner.max - banner.life) / 10);
      ctx.globalAlpha = Math.max(0, a);
      // komunikaty na pasie promenady — nie zasłaniają pola gry
      ctx.fillStyle = 'rgba(26,16,51,0.88)'; ctx.fillRect(0, GY + 3, W, H - GY - 3);
      Font.draw(ctx, banner.a, W / 2, GY + 7, '#FFF36B', { align: 0.5, scale: 2 });
      Font.draw(ctx, banner.b, W / 2, GY + 27, '#FFFFFF', { align: 0.5 });
      ctx.globalAlpha = 1;
      if (banner.life <= 0) banner = null;
    }
  }

  // ───────── API ─────────
  var POP = { dollar: '#8BFFA9', diamond: '#BFF4FA', prosecco: '#FFD447' };
  var R = {
    init: function (canvas) {
      ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      genStatic(); setTheme(0, true);
    },
    reset: function () { particles.length = 0; popups.length = 0; banner = null; shake = 0; flash = 0; setTheme(0, false); },
    // zdarzenia z symulacji → efekty
    onEvent: function (e, sim) {
      if (e.t === 'pickup') {
        burst(e.x, e.y, e.type === 'dollar' ? 5 : 10, [POP[e.type], '#FFFFFF'], 1.6, 0.04);
        popups.push({ x: e.x, y: e.y - 8, text: '+' + e.pts, c: e.mult > 1 ? '#FFF36B' : '#FFFFFF', life: 36, scale: e.type === 'diamond' ? 2 : 1 });
      } else if (e.t === 'miamiStart') {
        banner = { a: 'MIAMI MODE', b: 'MAGNES · PUNKTY x2 · TARCZA', life: 100, max: 100 }; flash = 6;
        burst(C.PLAYER_X, sim.y, 30, ['#FF5FD2', '#3FF0FF', '#FFF36B'], 3, 0.02, 2);
      } else if (e.t === 'shield') {
        burst(e.x, e.y, 26, ['#B9B2CC', '#8E86A6', '#D9D4E6', '#3FF0FF'], 2.6, 0.01, 2); shake = 8;
        popups.push({ x: C.PLAYER_X + 10, y: sim.y - 18, text: 'TARCZA!', c: '#3FF0FF', life: 50 });
      } else if (e.t === 'stage') {
        setTheme(e.stage - 1, false);
        var names = CONFIG.stages;
        banner = { a: 'ETAP ' + e.stage, b: names[(e.stage - 1) % names.length], life: 130, max: 130 };
      } else if (e.t === 'dead') {
        burst(C.PLAYER_X, sim.y, 34, ['#F7D56A', '#FF74B4', '#FFFFFF', '#8E86A6'], 3.2, 0.09, 2); shake = 14; flash = 5;
      }
    },
    draw: function (sim, view) {
      t++;
      if (sim) { if (sim !== lastSim) { lastSim = sim; lastDist = sim.dist; } scroll += sim.dist - lastDist; lastDist = sim.dist; }
      else scroll += 0.5;
      if (themeK < 1) { themeK = Math.min(1, themeK + 1 / 150); buildPal(); }
      ctx.save();
      if (shake > 0) { ctx.translate(Math.round((Math.random() - 0.5) * shake * 0.6), Math.round((Math.random() - 0.5) * shake * 0.6)); shake--; }
      drawSky(); drawSkyline(); drawOcean(); drawMid();
      var i;
      if (sim) {
        for (i = 0; i < sim.gates.length; i++) drawGate(sim.gates[i]);
        for (i = 0; i < sim.bubbles.length; i++) { var b = sim.bubbles[i]; if (b.dead) ctx.globalAlpha = 0.2; ctx.drawImage(Sprites.gossip, Math.round(b.x) - 14, Math.round(b.y) - 8); ctx.globalAlpha = 1; }
        for (i = 0; i < sim.items.length; i++) if (!sim.items[i].taken) drawItem(sim.items[i]);
      }
      drawGround();
      if (sim) { if (sim.alive) drawPlayer(sim.y, sim.vy, view, sim); }
      else if (view.showPlayer) drawPlayer(C.START_Y + Math.round(Math.sin(t * 0.08) * 5), 0, view, null);
      drawParticles();
      ctx.restore();
      if (sim && view.hud) drawHud(sim, view);
      if (view.ready) {
        Font.draw(ctx, 'TAPNIJ, ŻEBY LECIEĆ', W / 2, 232, '#FFFFFF', { align: 0.5, outline: '#1A1033' });
        if (Math.floor(t / 20) % 2) Font.draw(ctx, 'SPACJA / KLIK / DOTYK', W / 2, 246, '#FFF36B', { align: 0.5, outline: '#1A1033' });
      }
      if (view.countdown) Font.draw(ctx, String(view.countdown), W / 2, 150, '#FFF36B', { align: 0.5, scale: 5, outline: '#1A1033' });
      if (flash > 0) { ctx.globalAlpha = flash / 8; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; flash--; }
    }
  };
  window.Render = R;
})();
