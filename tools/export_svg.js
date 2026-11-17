#!/usr/bin/env node
// Eksportuje sprite'y z js/sprites.js do assets/svg (ostre w każdej skali).
const fs = require('fs'), path = require('path');
global.window = { CONFIG: { skins: [] } };
require('../js/sprites.js');
const { maps, PAL } = window.Sprites;
function svg(rows, scale = 8) {
  let out = '';
  rows.forEach((row, y) => { let x = 0; while (x < row.length) { const ch = row[x]; if (ch === '.') { x++; continue; } let n = 1; while (row[x + n] === ch) n++; out += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${PAL[ch]}"/>`; x += n; } });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rows[0].length} ${rows.length}" width="${rows[0].length * scale}" height="${rows.length * scale}" shape-rendering="crispEdges">${out}</svg>\n`;
}
const names = { dollar: 'zbierajka_dolar', diamond: 'zbierajka_diament', prosecco: 'zbierajka_butelka', gossip: 'przeszkoda_plotka', smoke: 'przeszkoda_chmura_dymu_statyczna', girlA: 'player_frame_a', girlB: 'player_frame_b' };
for (const [k, f] of Object.entries(names)) {
  const w = maps[k][0].length; maps[k].forEach((r, i) => { if (r.length !== w) throw new Error(`${k} wiersz ${i}: ${r.length} != ${w}`); });
  fs.writeFileSync(path.join(__dirname, '../assets/svg', f + '.svg'), svg(maps[k]));
}
console.log('ok');
