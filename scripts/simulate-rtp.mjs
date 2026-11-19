// Monte-Carlo check of the game math: node scripts/simulate-rtp.mjs [rounds] [rtp]
import { createPaytable, drawRound, scoreDrops, composeDrops, UNITS_PER_BET } from '../src/game/math.js';

const rounds = Number(process.argv[2] || 2_000_000);
const rtp = Number(process.argv[3] || 0.96);
const table = createPaytable(rtp);
console.log(`target RTP ${rtp}, paytable EV ${table.ev.toFixed(6)}`);

// every paytable total must be composable exactly, including the greedy fallback
for (const row of table.rows) {
  for (let i = 0; i < 2000; i++) {
    const d = composeDrops(row.units);
    if (scoreDrops(d) !== row.units) throw new Error(`bad compose for ${row.mult}x`);
  }
  if (scoreDrops(composeDrops(row.units, () => 0.999999)) !== row.units) throw new Error('bad fallback');
}

let paid = 0, hits = 0, drops = 0, combos = 0, maxDrops = 0, mismatches = 0;
for (let i = 0; i < rounds; i++) {
  const r = drawRound(table);
  const scored = scoreDrops(r.drops.map((d) => d.id));
  const stepped = r.drops.reduce((s, d) => s + d.units + d.combos.reduce((a, c) => a + c.bonus, 0), 0);
  if (scored !== r.units || stepped !== r.units) mismatches++;
  paid += r.units;
  if (r.units >= UNITS_PER_BET) hits++;
  drops += r.drops.length;
  maxDrops = Math.max(maxDrops, r.drops.length);
  if (r.drops.some((d) => d.combos.length)) combos++;
}
console.log(`rounds            ${rounds}`);
console.log(`simulated RTP     ${(paid / rounds / UNITS_PER_BET * 100).toFixed(3)}%`);
console.log(`win >= stake      ${(hits / rounds * 100).toFixed(2)}%`);
console.log(`rounds with combo ${(combos / rounds * 100).toFixed(2)}%`);
console.log(`avg / max drops   ${(drops / rounds).toFixed(2)} / ${maxDrops}`);
console.log(`score mismatches  ${mismatches}`);
if (mismatches) process.exit(1);
