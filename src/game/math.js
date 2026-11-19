// Snackpot game math.
// All values are integer "units": 1 unit = 1/100 of the stake (0.01x).
//
// A round's result is decided up-front. Every paytable row (a win size and how
// often it comes up) owns a fixed list of pre-built "recipes" — sets of items,
// with oddly-priced values, that add up to roughly that win size. A round picks
// a row by weight and one of its recipes at random. Because the recipes are
// fixed, each row's average payout is known exactly, and the weight of the low
// rows is solved so the whole table returns exactly the configured RTP.

export const UNITS_PER_BET = 100;
export const DEFAULT_RTP = 0.96;

export const TIERS = [
  { id: 0, name: 'Common', color: '#9fb3d1' },
  { id: 1, name: 'Uncommon', color: '#2fd67b' },
  { id: 2, name: 'Rare', color: '#2f9bff' },
  { id: 3, name: 'Epic', color: '#b45cff' },
  { id: 4, name: 'Legendary', color: '#ffb81a' },
];

export const ITEMS = [
  { id: 'mints', name: 'Mints', units: 7, tier: 0 },
  { id: 'chips', name: 'Bag of Chips', units: 15, tier: 0 },
  { id: 'chocolate', name: 'Chocolate Bar', units: 24, tier: 0 },
  { id: 'soda', name: 'Soda', units: 33, tier: 0 },
  { id: 'gummy', name: 'Gummy Worms', units: 66, tier: 0 },
  { id: 'cards', name: 'Hockey Cards', units: 125, tier: 1 },
  { id: 'mask', name: 'Sleep Mask', units: 199, tier: 1 },
  { id: 'hat', name: 'Flat Hat', units: 299, tier: 1 },
  { id: 'pillow', name: 'Neck Pillow', units: 550, tier: 2 },
  { id: 'headphones', name: 'Headphones', units: 975, tier: 2, keep: true },
  { id: 'console', name: 'Game Console', units: 1450, tier: 2, keep: true },
  { id: 'phone', name: 'Smartphone', units: 2777, tier: 3, keep: true },
  { id: 'watch', name: 'Luxury Watch', units: 4999, tier: 3, keep: true },
  { id: 'keys', name: 'Sportscar Keys', units: 12500, tier: 4, keep: true },
  { id: 'goldbar', name: 'Gold Bar', units: 24000, tier: 4, keep: true },
  { id: 'diamond', name: 'Diamond', units: 50000, tier: 4, keep: true },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// A combo pays its bonus once per round when every listed item has dropped.
export const COMBOS = [
  { id: 'movie_night', name: 'Movie Night', items: ['chips', 'soda', 'chocolate'], bonus: 38 },
  { id: 'sugar_rush', name: 'Sugar Rush', items: ['mints', 'gummy', 'chocolate'], bonus: 53 },
  { id: 'game_day', name: 'Game Day', items: ['cards', 'hat', 'soda'], bonus: 93 },
  { id: 'long_flight', name: 'Long Flight', items: ['headphones', 'pillow', 'mask'], bonus: 776 },
  { id: 'tech_haul', name: 'Tech Haul', items: ['phone', 'headphones', 'console'], bonus: 2298 },
  { id: 'road_trip', name: 'Road Trip', items: ['keys', 'hat', 'gummy'], bonus: 2135 },
  { id: 'high_roller', name: 'High Roller', items: ['keys', 'watch', 'goldbar'], bonus: 8501 },
];
for (const c of COMBOS) c.base = c.items.reduce((s, id) => s + ITEM[id].units, 0);

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

// ---- recipes ------------------------------------------------------------------
const BY_VALUE_DESC = [...ITEMS].sort((a, b) => b.units - a.units);
const SMALLEST = BY_VALUE_DESC[BY_VALUE_DESC.length - 1].units;
const MAX_DROPS = 12;
export const RECIPES_PER_ROW = 64;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One set of items worth roughly `target` units (within a few percent).
function buildRecipe(target, rng) {
  const tolerance = Math.max(SMALLEST, Math.round(target * 0.04));
  const minDrops = target >= 40 ? 3 : target >= 14 ? 2 : 1;
  for (let attempt = 0; attempt < 400; attempt++) {
    const out = [];
    let remaining = target;
    const fitting = COMBOS.filter((c) => c.base + c.bonus <= target + tolerance);
    if (fitting.length && rng() < 0.4) {
      const c = fitting[Math.floor(rng() * fitting.length)];
      out.push(...c.items);
      remaining -= c.base + c.bonus;
    }
    while (remaining >= SMALLEST && out.length <= MAX_DROPS) {
      const fits = BY_VALUE_DESC.filter((i) => i.units <= remaining);
      const n = Math.min(4, fits.length), w = [4, 3, 2, 1];
      let r = rng() * w.slice(0, n).reduce((a, b) => a + b, 0), pick = fits[0];
      for (let k = 0; k < n; k++) { r -= w[k]; if (r < 0) { pick = fits[k]; break; } }
      out.push(pick.id);
      remaining -= pick.units;
    }
    // round the leftover up or down so recipes land on both sides of the target
    if (remaining > 0 && rng() < remaining / SMALLEST) out.push(BY_VALUE_DESC[BY_VALUE_DESC.length - 1].id);
    if (out.length < minDrops || out.length > MAX_DROPS) continue;
    const units = scoreDrops(out); // includes any combo that happened to form
    if (Math.abs(units - target) > tolerance) continue;
    return { ids: out, units };
  }
  // fallback: largest-first
  const out = [];
  let remaining = target;
  while (remaining >= SMALLEST) { const it = BY_VALUE_DESC.find((i) => i.units <= remaining); out.push(it.id); remaining -= it.units; }
  if (!out.length) out.push(BY_VALUE_DESC[BY_VALUE_DESC.length - 1].id);
  return { ids: out, units: scoreDrops(out) };
}

// ---- paytable ---------------------------------------------------------------
// [nominal multiplier, relative weight]. The low band is the filler: its total
// weight is solved so the table's expected payout equals the target RTP.
const LOW_BAND = [[0.1, 3], [0.15, 3], [0.2, 4], [0.25, 3], [0.3, 3], [0.4, 2], [0.5, 2]];
const WIN_BAND = [
  [0.6, 9000], [0.8, 8000], [1, 7000], [1.2, 5000], [1.5, 4200], [2, 3200], [2.5, 2000],
  [3, 1500], [4, 1000], [5, 800], [7.5, 420], [10, 300], [15, 150], [20, 90], [25, 70],
  [40, 30], [50, 22], [75, 10], [100, 7], [150, 3], [250, 1.5], [500, 0.5], [1000, 0.15],
];

export function createPaytable(rtp = DEFAULT_RTP) {
  const rng = mulberry32(0x5eac4b07); // fixed seed: the recipe book never changes
  const mk = ([mult, weight], low) => {
    const recipes = Array.from({ length: RECIPES_PER_ROW }, () => buildRecipe(Math.round(mult * UNITS_PER_BET), rng));
    const mean = recipes.reduce((s, r) => s + r.units, 0) / RECIPES_PER_ROW / UNITS_PER_BET; // exact average payout (x bet)
    return { mult, weight, low, recipes, mean };
  };
  const rows = [...LOW_BAND.map((r) => mk(r, true)), ...WIN_BAND.map((r) => mk(r, false))];
  const low = rows.filter((r) => r.low), win = rows.filter((r) => !r.low);
  const lowW = low.reduce((s, r) => s + r.weight, 0), lowMean = low.reduce((s, r) => s + r.mean * r.weight, 0) / lowW;
  const winW = win.reduce((s, r) => s + r.weight, 0), winEV = win.reduce((s, r) => s + r.mean * r.weight, 0);
  // (winEV + F*lowMean) / (winW + F) = rtp  ->  F = (winEV - rtp*winW) / (rtp - lowMean)
  const filler = (winEV - rtp * winW) / (rtp - lowMean);
  if (!(filler > 0)) throw new Error(`RTP ${rtp} is not reachable with this paytable`);
  for (const r of low) r.weight = (r.weight / lowW) * filler;
  const total = rows.reduce((s, r) => s + r.weight, 0);
  let acc = 0;
  for (const r of rows) { r.p = r.weight / total; acc += r.p; r.cum = acc; }
  rows[rows.length - 1].cum = 1;
  return { rtp, rows, ev: rows.reduce((s, r) => s + r.mean * r.p, 0) };
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
  const recipe = row.recipes[Math.min(RECIPES_PER_ROW - 1, Math.floor(rng() * RECIPES_PER_ROW))];
  const ids = orderDrops(recipe.ids, rng);
  const seen = new Set();
  const done = new Set();
  const drops = ids.map((id) => {
    seen.add(id);
    const combos = COMBOS.filter((c) => !done.has(c.id) && c.items.every((i) => seen.has(i)));
    combos.forEach((c) => done.add(c.id));
    return { id, units: ITEM[id].units, combos };
  });
  // `band` is the row's nominal size (used to pick the celebration); `units` is what is paid
  return { band: row.mult, mult: recipe.units / UNITS_PER_BET, units: recipe.units, drops };
}

export function secureRandom() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
}
