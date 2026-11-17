#!/usr/bin/env node
// Weryfikacja wyniku po stronie serwera: odtwarza grę z raportu (seed + tapnięcia).
// Użycie:  node tools/verify.js raport.json     albo     echo '{...}' | node tools/verify.js
const Sim = require('../js/sim.js');
const fs = require('fs');
const src = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : fs.readFileSync(0, 'utf8');
const res = Sim.verify(JSON.parse(src));
console.log(JSON.stringify(res));
process.exit(res.ok ? 0 : 1);
