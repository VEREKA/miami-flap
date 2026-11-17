#!/usr/bin/env node
// Bot testowy: gra N partii, sprawdza balans i to, że każdy raport da się odtworzyć 1:1.
const Sim = require('../js/sim.js');
const C = Sim.C;
function play(seed, skill, maxSteps) {
  const s = Sim.create(seed), noise = Sim.makeRng(seed ^ 0x9e3779b9);
  let wobble = 0;
  while (s.alive && s.step < maxSteps) {
    const g = s.gates.find(g => g.x + C.GATE_HALF_W > C.PLAYER_X - C.PLAYER_R);
    let target = g ? g.gapY : C.START_Y;
    const dxg = g ? g.x - C.PLAYER_X : 999;
    if (skill.greedy && dxg > 30) {
      // leć po najbliższą zbierajkę, jeśli jest blisko toru
      let best = null;
      for (const it of s.items) { if (it.taken) continue; const dx = it.x - C.PLAYER_X; if (dx < 4 || dx > 60) continue; if (it.type === 'dollar') continue; if (!best || dx < best.x - C.PLAYER_X) best = it; }
      if (best) target = best.y;
    }
    for (const b of s.bubbles) { if (b.dead) continue; const dx = b.x - C.PLAYER_X; if (dx > -20 && dx < 40 && Math.abs(b.y - target) < 26) target += (target > b.y ? 24 : -24); }
    if (s.step % 20 === 0) wobble = (noise() - 0.5) * skill.error;
    const tap = s.y + s.vy * 4 > target + 6 + wobble;
    Sim.step(s, tap);
    s.events.length = 0;
  }
  return s;
}
const N = +process.argv[2] || 300;
for (const [name, skill] of Object.entries({ perfect: { error: 0, greedy: false }, greedy: { error: 0, greedy: true }, human: { error: 55, greedy: true }, sloppy: { error: 95, greedy: false } })) {
  let sum = 0, gates = 0, max = 0, steps = 0, bad = 0, causes = {}, stages = {}, mm = 0, perGate = 0;
  for (let i = 0; i < N; i++) {
    const s = play(1000 + i * 7919, skill, 60 * 60 * 6);
    if (s.alive) { s.alive = false; }       // limit czasu
    else { const v = Sim.verify(Sim.report(s)); if (!v.ok) bad++; }
    sum += s.score; gates += s.gatesPassed; steps += s.step; max = Math.max(max, s.score); mm += s.stats.miamiModes;
    causes[s.cause || 'timeout'] = (causes[s.cause || 'timeout'] || 0) + 1; stages[s.stage] = (stages[s.stage] || 0) + 1;
  }
  console.log(name.padEnd(8), 'avgScore', (sum / N).toFixed(1), 'max', max, 'avgGates', (gates / N).toFixed(1), 'avgSec', (steps / N / 60).toFixed(1), 'pts/gate', (sum / Math.max(gates, 1)).toFixed(2), 'miami/run', (mm / N).toFixed(2), 'verifyFail', bad, JSON.stringify(causes), JSON.stringify(stages));
}
// test odporności: zmieniony wynik / dopisane tapnięcie muszą zostać odrzucone
const s = play(42, { error: 55, greedy: true }, 1e6), rep = Sim.report(s);
console.log('ok:', Sim.verify(rep).ok, '| podbity wynik:', Sim.verify({ ...rep, score: rep.score + 50 }).reason, '| dłuższa gra:', Sim.verify({ ...rep, steps: rep.steps + 300 }).reason, '| rozmiar raportu:', JSON.stringify(rep).length, 'B');
