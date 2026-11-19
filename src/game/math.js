// Snackpot game math.
// All values are integer "units": 1 unit = 1/20 of the stake (0.05x).
// A round's result is decided up-front: we draw a total multiplier from a
// paytable whose expected value equals the configured RTP, then build a list
// of dropped items (and combos) that pays exactly that total.

export const UNITS_PER_BET = 20;
export const DEFAULT_RTP = 0.96;

export const TIERS = [
  { id: 0, name: 'Common', color: '#9fb3d1' },
  { id: 1, name: 'Uncommon', color: '#2fd67b' },
  { id: 2, name: 'Rare', color: '#2f9bff' },
  { id: 3, name: 'Epic', color: '#b45cff' },
  { id: 4, name: 'Legendary', color: '#ffb81a' },
];

export const ITEMS = [
  { id: 'mints', name: 'Mints', units: 1, tier: 0 },
  { id: 'chips', name: 'Bag of Chips', units: 2, tier: 0 },
  { id: 'chocolate', name: 'Chocolate Bar', units: 4, tier: 0 },
  { id: 'soda', name: 'Soda', units: 6, tier: 0 },
  { id: 'gummy', name: 'Gummy Worms', units: 10, tier: 0 },
  { id: 'cards', name: 'Hockey Cards', units: 20, tier: 1 },
  { id: 'mask', name: 'Sleep Mask', units: 40, tier: 1 },
  { id: 'hat', name: 'Flat Hat', units: 60, tier: 1 },
  { id: 'pillow', name: 'Neck Pillow', units: 100, tier: 2 },
  { id: 'headphones', name: 'Headphones', units: 200, tier: 2, keep: true },
  { id: 'console', name: 'Game Console', units: 300, tier: 2, keep: true },
  { id: 'phone', name: 'Smartphone', units: 500, tier: 3, keep: true },
  { id: 'watch', name: 'Luxury Watch', units: 1000, tier: 3, keep: true },
  { id: 'keys', name: 'Sportscar Keys', units: 2000, tier: 4, keep: true },
  { id: 'goldbar', name: 'Gold Bar', units: 5000, tier: 4, keep: true },
  { id: 'diamond', name: 'Diamond', units: 10000, tier: 4, keep: true },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// A combo pays its bonus once per round when every listed item has dropped.
export const COMBOS = [
  { id: 'movie_night', name: 'Movie Night', items: ['chips', 'soda', 'chocolate'], bonus: 8 },
  { id: 'sugar_rush', name: 'Sugar Rush', items: ['mints', 'gummy', 'chocolate'], bonus: 15 },
  { id: 'game_day', name: 'Game Day', items: ['cards', 'hat', 'soda'], bonus: 14 },
  { id: 'long_flight', name: 'Long Flight', items: ['headphones', 'pillow', 'mask'], bonus: 160 },
  { id: 'tech_haul', name: 'Tech Haul', items: ['phone', 'headphones', 'console'], bonus: 500 },
  { id: 'road_trip', name: 'Road Trip', items: ['keys', 'hat', 'gummy'], bonus: 430 },
  { id: 'high_roller', name: 'High Roller', items: ['keys', 'watch', 'goldbar'], bonus: 2000 },
];
for (const c of COMBOS) c.base = c.items.reduce((s, id) => s + ITEM[id].units, 0);

// ---- paytable ---------------------------------------------------------------
// [multiplier, relative weight]. The "low" band is the filler: its total weight
// is solved so that the whole table's expected value equals the target RTP.
const LOW_BAND = [[0.1, 3], [0.15, 3], [0.2, 4], [0.25, 3], [0.3, 3], [0.4, 2], [0.5, 2]];
const WIN_BAND = [
  [0.6, 9000], [0.8, 8000], [1, 7000], [1.2, 5000], [1.5, 4200], [2, 3200], [2.5, 2000],
  [3, 1500], [4, 1000], [5, 800], [7.5, 420], [10, 300], [15, 150], [20, 90], [25, 70],
  [40, 30], [50, 22], [75, 10], [100, 7], [150, 3], [250, 1.5], [500, 0.5], [1000, 0.15],
];

export function createPaytable(rtp = DEFAULT_RTP) {
  const lowW = LOW_BAND.reduce((s, [, w]) => s + w, 0);
  const lowMean = LOW_BAND.reduce((s, [m, w]) => s + m * w, 0) / lowW;
  const winW = WIN_BAND.reduce((s, [, w]) => s + w, 0);
  const winEV = WIN_BAND.reduce((s, [m, w]) => s + m * w, 0);
  // (winEV + F*lowMean) / (winW + F) = rtp  ->  F = (winEV - rtp*winW) / (rtp - lowMean)
  const filler = (winEV - rtp * winW) / (rtp - lowMean);
  if (!(filler > 0)) throw new Error(`RTP ${rtp} is not reachable with this paytable`);
  const rows = [
    ...LOW_BAND.map(([m, w]) => ({ mult: m, weight: (w / lowW) * filler })),
    ...WIN_BAND.map(([m, w]) => ({ mult: m, weight: w })),
  ];
  const total = rows.reduce((s, r) => s + r.weight, 0);
  let acc = 0;
  for (const r of rows) {
    r.units = Math.round(r.mult * UNITS_PER_BET);
    r.p = r.weight / total;
    acc += r.p;
    r.cum = acc;
  }
  rows[rows.length - 1].cum = 1;
  return { rtp, rows, ev: rows.reduce((s, r) => s + r.mult * r.p, 0) };
}

// ---- scoring (single source of truth) ---------------------------------------
export function combosIn(ids) {
  const have = new Set(ids);
  return COMBOS.filter((c) => c.items.every((i) => have.has(i)));
}
export function scoreDrops(ids) {
  let s = 0;
  for (const id of ids) s += ITEM[id].units;
  for (const c of combosIn(ids)) s += c.bonus;
  return s;
}

// ---- composing a round ------------------------------------------------------
const BY_VALUE_DESC = [...ITEMS].sort((a, b) => b.units - a.units);
const MAX_DROPS = 12;

function fill(remaining, out, rng, greedy) {
  while (remaining > 0) {
    const fits = BY_VALUE_DESC.filter((i) => i.units <= remaining);
    let pick = fits[0];
    if (!greedy) {
      const n = Math.min(4, fits.length);
      const w = [4, 3, 2, 1];
      let r = rng() * w.slice(0, n).reduce((a, b) => a + b, 0);
      for (let k = 0; k < n; k++) { r -= w[k]; if (r < 0) { pick = fits[k]; break; } }
    }
    out.push(pick.id);
    remaining -= pick.units;
  }
  return out;
}

export function composeDrops(units, rng = Math.random) {
  const minDrops = units >= 5 ? 3 : units >= 2 ? 2 : 1;
  for (let attempt = 0; attempt < 300; attempt++) {
    const out = [];
    let remaining = units;
    const fitting = COMBOS.filter((c) => c.base + c.bonus <= units);
    if (fitting.length && rng() < 0.4) {
      const c = fitting[Math.floor(rng() * fitting.length)];
      out.push(...c.items);
      remaining -= c.base + c.bonus;
    }
    fill(remaining, out, rng, false);
    if (out.length < minDrops || out.length > MAX_DROPS) continue;
    if (scoreDrops(out) !== units) continue; // an unplanned combo slipped in
    return out;
  }
  const out = fill(units, [], rng, true);
  if (scoreDrops(out) !== units) throw new Error(`cannot compose ${units} units`);
  return out;
}

function orderDrops(ids, rng) {
  // Cheap stuff first, the good stuff late — with a little noise.
  return ids
    .map((id) => ({ id, k: ITEM[id].tier + rng() * 1.6 }))
    .sort((a, b) => a.k - b.k)
    .map((o) => o.id);
}

export function drawRound(paytable, rng = Math.random, forceMult = null) {
  let row;
  if (forceMult != null) row = paytable.rows.find((r) => r.mult === forceMult);
  if (!row) {
    const r = rng();
    row = paytable.rows.find((x) => r < x.cum) || paytable.rows[paytable.rows.length - 1];
  }
  const ids = orderDrops(composeDrops(row.units, rng), rng);
  const seen = new Set();
  const done = new Set();
  const drops = ids.map((id) => {
    seen.add(id);
    const combos = COMBOS.filter((c) => !done.has(c.id) && c.items.every((i) => seen.has(i)));
    combos.forEach((c) => done.add(c.id));
    return { id, units: ITEM[id].units, combos };
  });
  return { mult: row.mult, units: row.units, drops };
}

export function secureRandom() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
}
