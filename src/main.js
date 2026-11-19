import '@fontsource-variable/fredoka';
import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { ITEMS, ITEM, TIERS, UNITS_PER_BET, DEFAULT_RTP, createPaytable, drawRound, secureRandom } from './game/math.js';
import { clock, tween, wait, updateTweens, E, lerp, rand, pick } from './gfx/anim.js';
import { glow, mesh, FONT } from './gfx/util.js';
import { makeItem, disposeItem, updateTwinklers } from './gfx/models.js';
import { buildMachine, H as MACHINE_H, W as MACHINE_W, D as MACHINE_D, ITEM_SCALE as IS } from './gfx/machine.js';
import { buildEnvironment } from './gfx/environment.js';
import { buildVfx } from './gfx/vfx.js';
import { createTray } from './gfx/tray.js';
import { sfx, unlock, setMuted } from './audio.js';
import { createUI, fmt } from './ui.js';

const DEV = import.meta.env.DEV;
const params = new URLSearchParams(location.search);
const BETS = [100, 200, 500, 1000, 2000, 5000, 10000]; // cents; whole credits, so every 0.01x item value is a whole cent
const START_BALANCE = 100000;
const SAVE_KEY = 'snackpot.v1';
const TOUCH = matchMedia('(pointer: coarse)').matches;

// ---- persistence ---------------------------------------------------------------
const store = { balance: START_BALANCE, bet: 100, muted: false, collection: {}, stats: { rounds: 0, best: 0 }, rtp: DEFAULT_RTP };
try { Object.assign(store, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch { /* fresh start */ }
store.rtp = DEFAULT_RTP;
if (!BETS.includes(store.bet)) store.bet = 100;
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(store)); } catch { /* private mode */ } };
const paytable = createPaytable(store.rtp);

// ---- renderer --------------------------------------------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 220);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.42;

scene.add(new THREE.HemisphereLight(0xffffff, 0xffe1f0, 0.42));
const sun = new THREE.DirectionalLight(0xfff6e8, 1.6);
sun.position.set(6.5, 10, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 9, bottom: -5, near: 1, far: 34 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5;
scene.add(sun);

const ledMat = glow(0xff3d9a, 1.7);
const panelMat = new THREE.MeshPhysicalMaterial({ color: 0x7a5cff, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2 });

let composer, bloom, quality = 2, ui, machine, env, vfx, tray;
const rig = { dist: 12, target: new THREE.Vector3(0, 2.95, 0), focus: 0, fTarget: new THREE.Vector3(), fDist: 7, trauma: 0, sway: 1, yaw0: 0.16, pitch0: -0.11, mix: 0, idle: null, play: null };

function resize() {
  const w = innerWidth, h = innerHeight, aspect = w / h;
  const pr = Math.min(devicePixelRatio || 1, quality >= 2 ? 2 : quality === 1 ? 1.5 : 1);
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  composer.setPixelRatio(pr); composer.setSize(w, h);
  camera.aspect = aspect;
  // Two camera poses, each solved so its subject fills the screen:
  //  - idle: a low three-quarter view of the whole machine
  //  - play: closer and nearly head-on, framing the prize rows and the trough,
  //    with room left at the top for the running total
  const portrait = w < h;
  camera.fov = portrait ? 56 : 44;
  camera.updateProjectionMatrix();
  const strip = -1 + (2 * Math.min(70, h * 0.1)) / h;
  const full = [], front = [];
  for (const x of [-1, 1]) for (const y of [0, MACHINE_H + 0.25]) for (const z of [-1, 1]) full.push(new THREE.Vector3((x * MACHINE_W) / 2, y, (z * MACHINE_D) / 2));
  for (const x of [-1.43, 1.43]) for (const y of [0.36, 4.92]) front.push(new THREE.Vector3(x, y, MACHINE_D / 2));
  rig.idle = solvePose(full, portrait ? 0.17 : 0.3, -0.12, strip, 0.985);
  rig.play = solvePose(front, portrait ? 0.05 : 0.09, -0.05, strip, 1 - (2 * Math.min(128, h * 0.17)) / h);
  blendPose();
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.updateProjectionMatrix();
  if (scene.fog) { scene.fog.near = rig.dist + 10; scene.fog.far = rig.dist + 75; }
  vfx?.setPointScale((h * pr) / (2 * t));
}

const shake = new THREE.Vector3(), camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), camRight = new THREE.Vector3(), camUp = new THREE.Vector3();
const tmpV = new THREE.Vector3();
function poseCamera(target, dist, yaw, pitch) {
  camPos.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(target);
  camera.position.copy(camPos); camera.lookAt(target); camera.updateMatrixWorld();
}
// Find the camera distance and aim at which `points` exactly fill the screen
// region between yLo and yHi (NDC) when viewed from the given angles.
function solvePose(points, yaw, pitch, yLo, yHi) {
  const target = new THREE.Vector3(0, 2.9, 0), xLim = 0.985, t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const measure = (dist) => {
    poseCamera(target, dist, yaw, pitch);
    const b = { x0: 9, x1: -9, y0: 9, y1: -9 };
    for (const p of points) { tmpV.copy(p).project(camera); b.x0 = Math.min(b.x0, tmpV.x); b.x1 = Math.max(b.x1, tmpV.x); b.y0 = Math.min(b.y0, tmpV.y); b.y1 = Math.max(b.y1, tmpV.y); }
    return b;
  };
  let dist = 10;
  for (let pass = 0; pass < 5; pass++) {
    let lo = 2, hi = 90;
    for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2, bb = measure(mid); if (bb.x1 - bb.x0 <= 2 * xLim && bb.y1 - bb.y0 <= yHi - yLo) hi = mid; else lo = mid; }
    dist = hi; const bb = measure(dist);
    camRight.setFromMatrixColumn(camera.matrixWorld, 0); camUp.setFromMatrixColumn(camera.matrixWorld, 1);
    target.addScaledVector(camRight, ((bb.x0 + bb.x1) / 2) * dist * t * camera.aspect).addScaledVector(camUp, ((bb.y0 + bb.y1) / 2 - (yLo + yHi) / 2) * dist * t);
  }
  return { target, dist, yaw, pitch };
}
function blendPose() {
  const a = rig.idle, b = rig.play, k = rig.mix;
  if (!a) return;
  rig.target.lerpVectors(a.target, b.target, k); rig.dist = lerp(a.dist, b.dist, k);
  rig.yaw0 = lerp(a.yaw, b.yaw, k); rig.pitch0 = lerp(a.pitch, b.pitch, k);
}
const setView = (to, dur) => { const from = rig.mix; return tween(dur, (k) => { rig.mix = lerp(from, to, k); }, E.inOut); };
function updateCamera(t, dt) {
  blendPose();
  const f = rig.focus;
  camTgt.lerpVectors(rig.target, rig.fTarget, f);
  const dist = lerp(rig.dist, rig.fDist, f);
  const yaw = rig.yaw0 * (1 - f * 0.5) + Math.sin(t * 0.33) * 0.05 * rig.sway * (1 - rig.mix * 0.6) * (1 - f * 0.7), pitch = rig.pitch0 * (1 - f * 0.4) + Math.sin(t * 0.21) * 0.01;
  camPos.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(camTgt);
  rig.trauma = Math.max(0, rig.trauma - dt * 1.8);
  const s = rig.trauma * rig.trauma * 0.22;
  shake.set(Math.sin(t * 71) + Math.sin(t * 113), Math.sin(t * 89) + Math.sin(t * 127), 0).multiplyScalar(s);
  camera.position.copy(camPos).add(shake);
  camera.lookAt(camTgt.x + shake.x * 0.6, camTgt.y + shake.y * 0.6, camTgt.z);
}
const focusCam = (target, dist, dur) => { const from = rig.focus; rig.fTarget.copy(target); rig.fDist = dist; return tween(dur, (k) => { rig.focus = lerp(from, 1, k); }); };
const unfocusCam = (dur) => { const from = rig.focus; return tween(dur, (k) => { rig.focus = lerp(from, 0, k); }); };
function toScreen(v) { tmpV.copy(v).project(camera); return { x: (tmpV.x * 0.5 + 0.5) * innerWidth, y: (-tmpV.y * 0.5 + 0.5) * innerHeight }; }

// ---- thumbnails (rendered once from the real 3D models) --------------------------
function renderThumbs() {
  const out = {}, s = new THREE.Scene(), cam = new THREE.OrthographicCamera(-0.26, 0.26, 0.26, -0.26, 0.1, 5);
  s.environment = scene.environment;
  s.add(new THREE.HemisphereLight(0xffffff, 0xddddff, 1.6));
  const d = new THREE.DirectionalLight(0xffffff, 2); d.position.set(1, 2, 3); s.add(d);
  cam.position.set(0, 0, 2);
  renderer.setPixelRatio(1); renderer.setSize(144, 144, false); renderer.setClearColor(0x000000, 0);
  for (const it of ITEMS) {
    const m = makeItem(it.id); s.add(m);
    m.traverse((o) => { if (o.userData.tw) o.visible = false; });
    renderer.clear(); renderer.render(s, cam);
    out[it.id] = canvas.toDataURL('image/png');
    disposeItem(m);
  }
  return out;
}

// ---- slots -----------------------------------------------------------------------
const DISPLAY_WEIGHT = [10, 6, 4, 2.2, 1.2];
const displayBag = ITEMS.flatMap((i) => Array(Math.round(DISPLAY_WEIGHT[i.tier] * 5)).fill(i.id));
const randomDisplayId = () => pick(displayBag);
const tierColor = TIERS.map((t) => new THREE.Color(t.color));

function setSlotItem(slot, id) {
  if (slot.item) disposeItem(slot.item);
  slot.item = makeItem(id);
  slot.holder.add(slot.item);
  machine.styleSlot(slot, id);
  return slot.item;
}
let lastTick = 0;
async function spinSlot(slot, finalId, delay) {
  await wait(delay);
  slot.busy = true;
  const n = 4 + Math.floor(rand(3));
  for (let k = 0; k < n; k++) {
    const it = setSlotItem(slot, k === n - 1 ? finalId : randomDisplayId());
    if (clock.real - lastTick > 0.045) { lastTick = clock.real; sfx.tick(slot.index + k); }
    await tween(0.085, (e) => { it.rotation.y = (1 - e) * -1.5; it.scale.setScalar(0.65 + 0.35 * e); }, E.out);
  }
  const it = slot.item, base = slot.halo.material.opacity;
  await tween(0.3, (e, k) => { it.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.22); slot.halo.material.opacity = base + (1 - k) * 0.6; slot.halo.scale.setScalar(0.62 + (1 - k) * 0.3); }, E.out);
  slot.busy = false;
}
function shuffleSlots(ids) {
  const jobs = machine.slots.map((slot) => spinSlot(slot, ids[slot.index], (slot.col + (4 - slot.row)) * 0.075 + rand(0.03)));
  return Promise.all(jobs).then(() => sfx.settle());
}

// Decide which slot every drop comes from and what replaces it, working out the
// starting grid so the pre-drawn items are sitting there when their turn comes.
function planSlots(dropIds) {
  const cells = machine.slots.map(() => ({ id: randomDisplayId() }));
  const initial = [...cells];
  let last = -1;
  const steps = dropIds.map((id) => {
    const natural = cells.map((c, i) => (c.id === id && i !== last ? i : -1)).filter((i) => i >= 0);
    let s;
    if (natural.length && Math.random() < 0.75) s = pick(natural);
    else { do { s = Math.floor(Math.random() * cells.length); } while (s === last && cells.length > 1); cells[s].id = id; }
    const replacement = { id: randomDisplayId() };
    cells[s] = replacement; last = s;
    return { slot: s, replacement };
  });
  return { initial, steps };
}

// ---- tray ------------------------------------------------------------------------
function clearTray() {
  tray.clear().forEach((it) => tween(0.22, (k) => it.scale.setScalar(Math.max(0.001, IS * (1 - k))), E.inBack).then(() => disposeItem(it)));
}

// ---- coin ------------------------------------------------------------------------
let coin;
function coinFly() {
  coin ||= mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 24), new THREE.MeshStandardMaterial({ color: 0xffc533, metalness: 1, roughness: 0.2, emissive: 0x8a5200, emissiveIntensity: 0.7 }));
  scene.add(coin);
  const from = camera.position.clone().lerp(machine.coinSlot, 0.45); from.y -= 1.6;
  const to = machine.coinSlot;
  const bz = (machine.button.userData.z ??= machine.button.position.z);
  tween(0.25, (e, k) => { machine.button.position.z = bz - Math.sin(k * Math.PI) * 0.035; });
  return tween(0.38, (e, k) => {
    coin.position.lerpVectors(from, to, e); coin.position.y += Math.sin(k * Math.PI) * 0.9;
    coin.rotation.set(Math.PI / 2 + k * 9, k * 5, 0); coin.scale.setScalar(1.6 - e * 0.9);
  }, E.inOut).then(() => { coin.removeFromParent(); vfx.burst(to, 0xffd23f, 14, { speed: 1.4, size: 0.1 }); vfx.ring(to, 0xffd23f, 0.5, 0.35); });
}

// ---- the round -------------------------------------------------------------------
let state = 'loading';
let forced = null;

// The machine shakes for the whole drop sequence, harder as the total climbs.
const hype = { level: 0, target: 0, sent: -1 };
function updateHype(real, t) {
  hype.level += (hype.target - hype.level) * Math.min(1, real * 3.5);
  const l = hype.level;
  if (l < 0.004) {
    if (hype.sent !== 0) { hype.sent = 0; machine.body.position.set(0, 0, 0); machine.body.rotation.z = 0; for (const s of machine.slots) if (s.item) s.item.rotation.z = 0; ui.setHype(0); }
    return;
  }
  const a = (0.006 + 0.034 * l * l + 0.012 * l) * (1 - rig.focus * 0.6);
  machine.body.position.set(rand(-a, a), rand(-a, a) * 0.5, 0); machine.body.rotation.z = rand(-a, a) * 0.22;
  for (const s of machine.slots) if (s.item && !s.busy) s.item.rotation.z = rand(-a, a) * 4;
  rig.trauma = Math.max(rig.trauma, l * 0.34);
  machine.state.chase = 2 + l * 6;
  // sparks shaken loose from the cabinet, more of them as it builds
  if (Math.random() < real * (2 + l * 40)) {
    const side = Math.random() < 0.5 ? -1 : 1, top = Math.random() < 0.4;
    tmpV.set(top ? rand(-1.4, 1.4) : side * 1.5, top ? 4.95 : rand(1.4, 4.9), 0.95);
    vfx.burst(tmpV, Math.random() < 0.5 ? 0xffd23f : 0xffffff, 3 + Math.round(l * 6), { speed: 1.2 + l * 2.4, size: 0.08 + l * 0.06, up: 1 + l, life: 0.7 });
  }
  if (Math.abs(l - hype.sent) > 0.02) { hype.sent = l; sfx.rumbleLevel(l); ui.setHype(l); }
}
async function rumble(dur) {
  sfx.rumbleStart(); machine.state.chase = 3; machine.setScreen('HERE WE GO', '• • •', '#ffd23f');
  hype.target = 0.22;
  await wait(dur);
}

function refill(slot, id) {
  return wait(0.16).then(async () => {
    slot.holder.position.copy(slot.home);
    const it = setSlotItem(slot, id); it.scale.setScalar(0.001);
    await tween(0.32, (e) => { it.scale.setScalar(Math.max(0.001, e)); it.rotation.y = (1 - e) * 2; slot.coil.rotation.z = -(1 - e) * 2; }, E.outBack);
    slot.busy = false;
  });
}

const HERO = new THREE.Vector3(0, 3.2, 2.6);
async function heroMoment(item, id, tier, cents) {
  const legendary = tier === 4, color = TIERS[tier].color, S = legendary ? 4.2 : 3.5;
  ui.vignette(true); machine.state.beacon = 1; machine.state.chase = 4;
  sfx.riser(legendary ? 1.0 : 0.6);
  const start = item.position.clone();
  focusCam(start, rig.dist * 0.7, 0.4);
  await tween(legendary ? 1.0 : 0.6, (e, k) => {
    item.position.set(start.x + Math.sin(k * 70) * 0.014 * k, start.y + Math.cos(k * 83) * 0.01 * k, start.z);
    item.scale.setScalar(IS * (1 + 0.2 * k)); if (Math.random() < 0.6) vfx.trail(item.position, color, 0.12);
    rig.trauma = Math.max(rig.trauma, 0.15 + k * 0.2);
  }, E.linear);
  ui.flash(); sfx.tier(tier); rig.trauma = 0.7;
  vfx.burst(start, color, 36, { speed: 3 }); vfx.ring(start, color, 1.6, 0.5);
  focusCam(HERO, Math.min(rig.dist * 0.75, legendary ? 7 : 7.6), 0.5);
  const r0 = item.rotation.clone();
  await tween(0.55, (e) => {
    item.position.lerpVectors(start, HERO, e); item.scale.setScalar(lerp(IS * 1.2, S, e));
    item.rotation.set(r0.x * (1 - e), e * Math.PI * 4, r0.z * (1 - e));
  }, E.outCubic);
  vfx.sunburst(HERO.clone().setZ(HERO.z - 0.7), color, S * 2.3);
  vfx.burst(HERO, 0xffffff, 40, { speed: 3.5, size: 0.16 });
  vfx.confetti(HERO.clone().setY(HERO.y - 0.6), legendary ? 160 : 70, { up: 6.5, speed: 5 });
  ui.callout(id, cents, legendary ? 2.2 : 1.5, true);
  ui.banner({ kicker: ITEM[id].name, title: legendary ? 'LEGENDARY!' : 'EPIC!', color, hold: legendary ? 1.7 : 1.0, small: true, low: true });
  sfx.shimmer();
  if (legendary) { wait(0.5).then(() => { vfx.coinFountain(new THREE.Vector3(-0.2, 0.6, 1.2), 50); vfx.confettiRain(120); sfx.shimmer(); }); }
  await tween(legendary ? 2.0 : 1.15, (e, k) => {
    item.rotation.y = k * Math.PI * (legendary ? 4 : 2); item.position.y = HERO.y + Math.sin(k * Math.PI * 3) * 0.06;
    item.scale.setScalar(S * (1 + Math.sin(k * Math.PI * 6) * 0.025));
    if (Math.random() < 0.5) vfx.trail(tmpV.set(HERO.x + rand(-0.9, 0.9), HERO.y + rand(-0.9, 0.9), HERO.z + 0.2), Math.random() < 0.5 ? color : 0xffffff, 0.16);
  }, E.linear);
  vfx.sunburstOff(); ui.vignette(false); unfocusCam(0.5);
  machine.state.beacon = 0; machine.state.chase = 3;
  return S;
}

async function dropOne(step, drop, index, betCents) {
  const slot = machine.slots[step.slot], item = slot.item, id = drop.id, tier = ITEM[id].tier, color = TIERS[tier].color;
  const cents = (drop.units * betCents) / UNITS_PER_BET;
  slot.busy = true;
  // push out of the coil
  const pushDur = [0.24, 0.3, 0.45, 0.5, 0.6][tier];
  sfx.whirr(pushDur);
  const haloBase = slot.halo.material.opacity;
  if (tier >= 1) vfx.ring(slot.home, color, 0.5 + tier * 0.12, 0.4);
  await tween(pushDur, (e, k) => {
    slot.coil.rotation.z = -e * Math.PI * 2;
    slot.holder.position.z = lerp(slot.home.z, machine.dropZ, e);
    item.rotation.y = Math.sin(k * Math.PI * 4) * 0.12 * (1 + tier);
    slot.halo.material.opacity = haloBase + Math.sin(k * Math.PI) * 0.7;
  }, E.inOut);
  slot.halo.material.opacity = haloBase;
  scene.attach(item); slot.item = null;
  refill(slot, step.replacement.id);

  let s0 = IS;
  if (tier >= 3) s0 = await heroMoment(item, id, tier, cents);

  // tumble into the trough
  const box = tray.box, R = 0.21;
  const tx = THREE.MathUtils.clamp(item.position.x + rand(-0.2, 0.2), box.x0 + R + 0.04, box.x1 - R - 0.04);
  let vel;
  if (tier >= 3) {
    sfx.whoosh();
    const from = item.position.clone(), inside = new THREE.Vector3(tx, 1.0, 0.36), q0 = item.quaternion.clone();
    await tween(0.45, (e, k) => {
      item.position.lerpVectors(from, inside, e); item.position.y -= Math.sin(k * Math.PI) * 0.45;
      item.scale.setScalar(lerp(s0, IS, e)); item.quaternion.copy(q0); item.rotateY(e * Math.PI * 3);
      vfx.trail(item.position, color, 0.14);
    }, E.in);
    vel = { x: 0, y: -3, z: -1.2 };
  } else {
    const T = Math.sqrt((2 * Math.max(0.2, item.position.y - box.top)) / 17);
    vel = { x: (tx - item.position.x) / T, y: 0, z: 0 };
    if (tier >= 1) item.userData.trail = { color, size: 0.07 + tier * 0.03, rate: 0.3 + tier * 0.25 };
  }
  await new Promise((res) => tray.add(item, R, vel, res));
  // first impact
  const to = item.position.clone();
  item.userData.trail = null;
  sfx.thunk(tier); sfx.tier(tier < 3 ? tier : 0);
  rig.trauma = Math.min(1, rig.trauma + 0.2 + tier * 0.17);
  vfx.burst(to, tier ? color : 0xffffff, 8 + tier * 10, { speed: 1.6 + tier * 0.5, size: 0.1 + tier * 0.02, up: 1.2 });
  if (tier >= 2) vfx.ring(to, color, 0.8 + tier * 0.3, 0.45);
  if (tier >= 3) { vfx.confetti(to, 50 + tier * 20, { up: 5 }); ui.flash(); }
  tween(0.3, (e, k) => { item.scale.set(IS * (1 + (1 - k) * 0.16), IS * (1 - (1 - k) * 0.2), IS * (1 + (1 - k) * 0.16)); }, E.out);

  // score it
  const p = toScreen(tmpV.set(to.x, to.y + 0.35, to.z + 0.3));
  ui.popup(p.x, p.y, cents, color, tier);
  ui.addWin(cents, color); ui.symbolPop(p.x, p.y + 20, id);
  if (tier === 2) ui.callout(id, cents, 1.1);
  if (ITEM[id].keep) { store.collection[id] = (store.collection[id] || 0) + 1; newKeeps++; ui.setBag(newKeeps); }
  machine.setScreen('WIN', fmt(running += cents), '#7dffb0');

  for (const combo of drop.combos) {
    await wait(0.3);
    const bonus = (combo.bonus * betCents) / UNITS_PER_BET;
    const big = combo.bonus >= 160;
    sfx.combo();
    ui.banner({ kicker: 'COMBO', title: combo.name.toUpperCase(), amount: bonus, color: '#ffd23f', hold: 1.25, icons: combo.items, small: true });
    tray.kick((o) => combo.items.includes(o.userData.itemId), 4.2);
    for (const b of tray.bodies) if (combo.items.includes(b.o.userData.itemId)) vfx.burst(b.o.position, 0xffd23f, 14, { speed: 2 });
    vfx.confetti(new THREE.Vector3(-0.3, 1.3, 1), big ? 140 : 70, { up: 6 });
    if (big) { vfx.coinFountain(new THREE.Vector3(-0.2, 0.6, 1.2), 40); ui.flash(); }
    machine.state.flash = 1; rig.trauma = Math.min(1, rig.trauma + 0.4);
    ui.addWin(bonus, '#ffd23f');
    machine.setScreen('COMBO!', fmt(running += bonus), '#ffd23f');
    await wait(1.25);
  }
  await wait([0.06, 0.1, 0.25, 0.25, 0.35][tier]);
}

let running = 0, newKeeps = 0;
async function finale(round, betCents) {
  const cents = (round.units * betCents) / UNITS_PER_BET, m = round.band;
  const level = m >= 250 ? 4 : m >= 50 ? 3 : m >= 10 ? 2 : round.mult >= 1 ? 1 : 0;
  hype.target = 0; sfx.rumbleStop();
  store.balance += cents; store.stats.rounds++; store.stats.best = Math.max(store.stats.best, cents); save();
  ui.setBalance(store.balance);
  sfx.win(level);
  const front = new THREE.Vector3(-0.2, 0.6, 1.2);
  if (level >= 1) {
    const title = ['', 'NICE!', 'BIG WIN!', 'MEGA WIN!', 'SNACKPOT!'][level];
    const color = ['', '#2fd67b', '#2f9bff', '#b45cff', '#ffb81a'][level];
    ui.banner({ title, amount: cents, color, hold: [0, 1.1, 2.2, 3.3, 4.8][level], kicker: level >= 2 ? `${+round.mult.toFixed(2)}× YOUR BET` : null, small: level === 1 });
    vfx.confetti(front, 40 + level * 50, { up: 5 + level, speed: 4 + level });
    machine.state.flash = 0.6 + level * 0.8;
  }
  if (level >= 2) {
    machine.state.beacon = 1; ui.flash(); rig.trauma = 0.8;
    const waves = [0, 0, 3, 6, 10][level];
    for (let i = 0; i < waves; i++) {
      wait(i * 0.42).then(() => {
        vfx.coinFountain(front, 26 + level * 6, { speed: 1 + level * 0.15 }); vfx.confettiRain(50 + level * 20);
        vfx.confetti(new THREE.Vector3(rand(-2.5, 2.5), rand(1, 4), 1.2), 40);
        if (level >= 3) { machine.state.flash = 1; rig.trauma = Math.max(rig.trauma, 0.45); sfx.shimmer(); }
      });
    }
  }
  machine.setScreen(level ? 'YOU WON' : 'PAID', fmt(cents), level ? '#ffd23f' : '#7dffb0');
  await wait([0.45, 1.1, 2.4, 3.6, 5][level]);
  machine.state.beacon = 0; machine.state.chase = 1;
}

async function playRound() {
  if (state !== 'idle') return;
  if (store.balance < store.bet) {
    const affordable = BETS.filter((b) => b <= store.balance);
    if (affordable.length) { store.bet = affordable[affordable.length - 1]; ui.setBet(store.bet); }
    else { store.balance = START_BALANCE; ui.setBalance(store.balance); ui.banner({ kicker: 'ON THE HOUSE', title: 'FREE REFILL', amount: START_BALANCE, color: '#2fd67b', hold: 1.4, small: true }); sfx.win(1); save(); return; }
  }
  state = 'playing'; clock.scale = 1; running = 0;
  const betCents = store.bet;
  store.balance -= betCents; save();
  ui.setBalance(store.balance); ui.roundStart(); rig.sway = 0.5;
  const round = drawRound(paytable, secureRandom, DEV ? forced : null);
  machine.setScreen('GOOD LUCK', fmt(betCents), '#7dffb0');
  sfx.coin(); coinFly(); clearTray(); setView(1, 1.1);
  const plan = planSlots(round.drops.map((d) => d.id));
  await wait(0.25);
  sfx.whoosh();
  await Promise.all([env.regenerate(true), shuffleSlots(plan.initial.map((c) => c.id))]);
  await rumble(0.75);
  for (let i = 0; i < round.drops.length; i++) {
    // builds with every drop and with the size of the running total
    hype.target = Math.min(1, 0.22 + (0.45 * (i + 1)) / round.drops.length + 0.4 * Math.min(1, Math.log10(1 + running / betCents) / 2));
    await dropOne(plan.steps[i], round.drops[i], i, betCents);
  }
  await wait(0.2);
  await finale(round, betCents);
  clock.scale = 1; rig.sway = 1; setView(0, 1.4);
  ui.roundEnd(); ui.showPrompt(`${TOUCH ? 'Tap' : 'Click'} anywhere to play again`);
  state = 'idle';
}

// ---- input -----------------------------------------------------------------------
function onPress(e) {
  unlock();
  if (e.target.closest?.('[data-ui]') || ui.sheetOpen) return;
  if (state === 'idle') playRound();
  else if (state === 'playing' && clock.scale === 1) { clock.scale = 3; ui.setFast(true); }
}
function changeBet(dir) {
  if (state !== 'idle') return;
  const i = BETS.indexOf(store.bet), n = Math.max(0, Math.min(BETS.length - 1, i + dir));
  store.bet = BETS[n]; ui.setBet(store.bet); sfx.click(); save();
  machine.setScreen('BET', fmt(store.bet), '#7dffb0');
}

// ---- boot ------------------------------------------------------------------------
async function boot() {
  await Promise.race([document.fonts.load(`700 40px ${FONT.split(',')[0]}`), new Promise((r) => setTimeout(r, 2500))]);
  const thumbs = renderThumbs();
  ui = createUI(thumbs);

  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.24, 0.45, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  machine = buildMachine(ledMat, panelMat);
  scene.add(machine.root);
  env = buildEnvironment(scene, ledMat, panelMat);
  vfx = buildVfx(scene, camera);
  tray = createTray(machine.trayBox);
  await env.regenerate(false);
  for (const slot of machine.slots) setSlotItem(slot, randomDisplayId());
  machine.setScreen('INSERT COIN', fmt(store.bet), '#7dffb0');

  ui.setBalance(store.balance, true); ui.setBet(store.bet); ui.setSound(!store.muted); setMuted(store.muted);
  resize();
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 200));

  document.addEventListener('pointerdown', onPress);
  addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); unlock(); if (ui.sheetOpen) ui.closeSheet(); else onPress({ target: document.body }); } else if (e.code === 'Escape') ui.closeSheet(); });
  document.getElementById('bet-up').addEventListener('click', () => changeBet(1));
  document.getElementById('bet-down').addEventListener('click', () => changeBet(-1));
  document.getElementById('btn-sound').addEventListener('click', () => { store.muted = !store.muted; setMuted(store.muted); ui.setSound(!store.muted); save(); sfx.click(); });
  document.getElementById('btn-info').addEventListener('click', () => { newKeeps = 0; ui.setBag(0); ui.openSheet(store); sfx.click(); });
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
  canvas.addEventListener('webglcontextrestored', () => location.reload());

  // main loop with a simple quality governor for slower phones
  let last = performance.now(), frames = 0, acc = 0;
  const unclamped = DEV && params.has('unclamped');
  renderer.setAnimationLoop((now) => {
    const real = Math.min((now - last) / 1000, unclamped ? 0.5 : 0.05); last = now;
    const dt = updateTweens(real), t = clock.real;
    machine.update(t, real); env.update(t, real); vfx.update(dt, t); tray.update(dt); updateTwinklers(t);
    for (const b of tray.bodies) { const tr = b.o.userData.trail; if (tr && Math.random() < tr.rate) vfx.trail(b.o.position, tr.color, tr.size); } ui.update(real);
    for (const s of machine.slots) if (s.item && !s.busy) { s.item.rotation.y = Math.sin(t * 0.7 + s.index * 1.3) * 0.65; s.item.rotation.x = -0.06; s.item.position.y = Math.sin(t * 1.4 + s.index) * 0.008; }
    updateHype(real, t);
    updateCamera(t, real);
    composer.render();
    if (!document.hidden && !params.has('hq') && quality > 0 && ++frames > 30) {
      acc += now - (boot.prev ?? now);
      if (frames === 150) { if (acc / 120 > 30) { quality--; bloom.enabled = quality > 0; if (!quality) renderer.shadowMap.enabled = false; resize(); } frames = 0; acc = 0; }
    }
    boot.prev = now;
  });

  requestAnimationFrame(() => {
    document.getElementById('loader').classList.add('done');
    setTimeout(() => document.getElementById('loader').remove(), 600);
    ui.showPrompt(`${TOUCH ? 'Tap' : 'Click'} anywhere to place bet & play`);
    state = 'idle';
  });

  if (DEV) window.__snackpot = { store, clock, rig, play: playRound, force: (m) => { forced = m; }, get state() { return state; }, machine, vfx, scene, get bloom() { return bloom; } };
}
boot();

if ('serviceWorker' in navigator && !DEV) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
