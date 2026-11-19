// All sound is synthesised with WebAudio — no audio files to download.
let ctx = null, master = null, noiseBuf = null, muted = false, rumbleNode = null;

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 5;
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55;
  master.connect(comp).connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}
export function unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); }
export function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.02); }
document.addEventListener('visibilitychange', () => { if (ctx) (document.hidden ? ctx.suspend() : ctx.resume()); });

function tone(freq, at = 0, dur = 0.15, o = {}) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + at, osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const v = o.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (o.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t); osc.stop(t + dur + 0.02);
}
function noise(at = 0, dur = 0.2, o = {}) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; src.loop = true;
  f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.freq ?? 800, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  f.Q.value = o.q ?? 0.7;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.2, t + (o.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random()); src.stop(t + dur + 0.02);
}
const N = (semi) => 261.63 * 2 ** (semi / 12); // semitones from middle C
function arp(notes, step, o = {}) { notes.forEach((n, i) => tone(N(n), i * step, o.dur ?? 0.28, { type: o.type || 'triangle', gain: o.gain ?? 0.16 })); }

export const sfx = {
  coin() { tone(1320, 0, 0.09, { type: 'square', gain: 0.07 }); tone(1980, 0.07, 0.3, { type: 'triangle', gain: 0.16 }); tone(2640, 0.07, 0.25, { gain: 0.06 }); noise(0.16, 0.08, { freq: 3000, type: 'bandpass', gain: 0.08 }); },
  tick(i = 0) { tone(520 + (i % 12) * 55, 0, 0.05, { type: 'square', gain: 0.035 }); },
  settle() { tone(N(12), 0, 0.12, { type: 'triangle', gain: 0.1 }); tone(N(19), 0.05, 0.16, { type: 'triangle', gain: 0.08 }); },
  whoosh() { noise(0, 0.35, { freq: 400, to: 2600, type: 'bandpass', gain: 0.1, q: 1.2 }); },
  rumbleStart() {
    if (!ctx || muted || rumbleNode) return;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = 'lowpass'; f.frequency.value = 110;
    g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.25);
    src.connect(f).connect(g).connect(master); src.start();
    rumbleNode = { src, g, f };
  },
  rumbleLevel(l) {
    if (!rumbleNode) return;
    rumbleNode.g.gain.setTargetAtTime(0.3 + l * 0.75, ctx.currentTime, 0.12);
    rumbleNode.f.frequency.setTargetAtTime(95 + l * 190, ctx.currentTime, 0.12);
  },
  rumbleStop() {
    if (!rumbleNode) return;
    const { src, g } = rumbleNode; rumbleNode = null;
    g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08); src.stop(ctx.currentTime + 0.5);
  },
  whirr(dur = 0.3) { tone(90, 0, dur, { type: 'sawtooth', gain: 0.06, to: 150 }); noise(0, dur, { freq: 1800, type: 'bandpass', gain: 0.03, q: 3 }); },
  thunk(power = 0) {
    tone(150 - power * 12, 0, 0.16 + power * 0.05, { to: 48, gain: 0.3 + power * 0.06 });
    noise(0, 0.1 + power * 0.03, { freq: 900 + power * 300, gain: 0.16 + power * 0.04 });
  },
  tier(t) {
    if (t === 0) tone(N(12 + Math.floor(Math.random() * 3) * 2), 0, 0.12, { type: 'triangle', gain: 0.12 });
    else if (t === 1) arp([12, 16], 0.07);
    else if (t === 2) arp([12, 16, 19, 24], 0.065, { gain: 0.17 });
    else if (t === 3) { arp([12, 16, 19, 24, 28, 31], 0.06, { gain: 0.17 }); arp([24, 28, 31, 36], 0.09, { type: 'sine', gain: 0.08, dur: 0.5 }); }
    else { [0, 4, 7].forEach((n) => tone(N(n), 0, 0.9, { type: 'sawtooth', gain: 0.07 })); arp([12, 16, 19, 24, 19, 24, 28, 31, 36], 0.075, { gain: 0.18, dur: 0.4 }); [12, 16, 19, 24].forEach((n) => tone(N(n), 0.7, 1.2, { type: 'triangle', gain: 0.12 })); }
  },
  riser(dur = 0.9) { tone(180, 0, dur, { type: 'sawtooth', to: 1400, gain: 0.07, attack: dur * 0.7 }); noise(0, dur, { freq: 500, to: 7000, type: 'bandpass', gain: 0.1, attack: dur * 0.8, q: 1.5 }); },
  shimmer() { for (let i = 0; i < 9; i++) tone(N(24 + [0, 4, 7, 11, 12, 16][Math.floor(Math.random() * 6)]), i * 0.045, 0.3, { gain: 0.05 }); },
  combo() { arp([7, 12, 16, 19, 24], 0.07, { type: 'square', gain: 0.07 }); arp([19, 24, 28, 31, 36], 0.07, { gain: 0.15, dur: 0.4 }); },
  count(k = 0) { tone(880 + k * 660, 0, 0.04, { type: 'square', gain: 0.03 }); },
  win(level) {
    if (level <= 0) { tone(N(7), 0, 0.14, { type: 'triangle', gain: 0.1 }); tone(N(4), 0.1, 0.22, { type: 'triangle', gain: 0.08 }); return; }
    const base = [[12, 16, 19], [12, 16, 19, 24], [12, 16, 19, 24, 28, 31], [12, 16, 19, 24, 28, 31, 36, 40]][Math.min(3, level - 1)];
    arp(base, 0.085, { gain: 0.17, dur: 0.4 });
    const end = base.length * 0.085;
    [0, 4, 7, 12].forEach((n) => tone(N(n + 12), end, 0.9 + level * 0.2, { type: 'triangle', gain: 0.1 }));
    if (level >= 2) for (let i = 0; i < 10 * level; i++) tone(N(24 + [0, 4, 7, 12, 16, 19][i % 6]), end + i * 0.06, 0.2, { gain: 0.045 });
  },
  click() { tone(660, 0, 0.05, { type: 'triangle', gain: 0.08 }); },
};
