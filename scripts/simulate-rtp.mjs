// Checks the game math: node scripts/simulate-rtp.mjs [rounds] [rtp]
import { createPaytable, drawRound, scoreDrops, UNITS_PER_BET } from '../src/game/math.js';

const rounds = Number(process.argv[2] || 2_000_000);
const rtp = Number(process.argv[3] || 0.96);
const table = createPaytable(rtp);
console.log(`target RTP ${rtp}, exact paytable EV ${table.ev.toFixed(9)}`);

// every stored recipe must score to exactly what the table says it pays
let distinct = new Set();
for (const row of table.rows) for (const r of row.recipes) {
  if (scoreDrops(r.ids) !== r.units) throw new Error(`recipe mismatch in ${row.mult}x`);
  distinct.add(r.units);
}
console.log(`distinct win amounts  ${distinct.size}`);

let paid = 0, hits = 0, drops = 0, combos = 0, maxDrops = 0, mismatches = 0;
for (let i = 0; i < rounds; i++) {
  const r = drawRound(table);
  const stepped = r.drops.reduce((s, d) => s + d.units + d.combos.reduce((a, c) => a + c.bonus, 0), 0);
  if (stepped !== r.units) mismatches++;
  paid += r.units;
  if (r.units >= UNITS_PER_BET) hits++;
  drops += r.drops.length;
  maxDrops = Math.max(maxDrops, r.drops.length);
  if (r.drops.some((d) => d.combos.length)) combos++;
}
console.log(`rounds                ${rounds}`);
console.log(`simulated RTP         ${(paid / rounds / UNITS_PER_BET * 100).toFixed(3)}%`);
console.log(`win >= stake          ${(hits / rounds * 100).toFixed(2)}%`);
console.log(`rounds with combo     ${(combos / rounds * 100).toFixed(2)}%`);
console.log(`avg / max drops       ${(drops / rounds).toFixed(2)} / ${maxDrops}`);
console.log(`score mismatches      ${mismatches}`);
if (mismatches || Math.abs(table.ev - rtp) > 1e-9) process.exit(1);
