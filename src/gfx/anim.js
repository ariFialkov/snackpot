// Tiny promise-based tween scheduler driven by the game clock, so the whole
// round can be fast-forwarded by changing clock.scale.
const active = new Set();
export const clock = { scale: 1, time: 0, real: 0 };

export const E = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  outCubic: (t) => 1 - (1 - t) ** 3,
  inCubic: (t) => t * t * t,
  outBack: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  inBack: (t) => 2.70158 * t * t * t - 1.70158 * t * t,
  outElastic: (t) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outBounce: (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

export function tween(dur, fn, ease = E.inOut) {
  return new Promise((res) => {
    if (dur <= 0) { fn(1, 1); res(); return; }
    active.add({ el: 0, dur, fn, ease, res });
  });
}
export const wait = (d) => tween(d, () => {}, E.linear);

export function updateTweens(realDt) {
  const dt = realDt * clock.scale;
  clock.time += dt;
  clock.real += realDt;
  for (const t of [...active]) {
    t.el += dt;
    const k = Math.min(1, t.el / t.dur);
    t.fn(t.ease(k), k);
    if (k >= 1) { active.delete(t); t.res(); }
  }
  return dt;
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
