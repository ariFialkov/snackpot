// The vending machine: shell, shelves, coils, control panel, marquee, tray.
import * as THREE from 'three';
import { std, gloss, glow, rbox, mesh, canvasTex, decal, text, rr, grad, roundedRectPath, softDotTex, FONT } from './util.js';
import { ITEM, TIERS, UNITS_PER_BET } from '../game/math.js';

const PI = Math.PI;
export const W = 3.1, H = 5.8, D = 1.7;
export const COLS = 4, ROWS = 5;
const WIN = { x0: -1.33, x1: 1.33, y0: 1.5, y1: 4.8 };
const TRAY = { x0: -1.33, x1: 0.36, y0: 0.45, y1: 1.25 };
export const ITEM_SCALE = 1.3; // items are shown oversized so the prizes read clearly
const COLW = (WIN.x1 - WIN.x0) / COLS, ROWH = (WIN.y1 - WIN.y0) / ROWS;
const PX = 0.9; // control cluster centre x (bottom right, beside the tray)
const TCX = (TRAY.x0 + TRAY.x1) / 2;
const FZ = D / 2; // front face z

const tagCache = {};
function tagTex(id) {
  return (tagCache[id] ||= canvasTex(160, 56, (c) => {
    const it = ITEM[id], col = TIERS[it.tier].color;
    c.fillStyle = '#101327'; rr(c, 0, 0, 160, 56, 14); c.fill();
    c.fillStyle = col; rr(c, 5, 5, 150, 46, 10); c.fill();
    const v = it.units / UNITS_PER_BET;
    text(c, `×${v >= 1 ? v : v.toFixed(2).replace(/0$/, '')}`, 80, 30, 34, '#101327');
  }));
}

export function buildMachine(ledMat, panelMat) {
  const root = new THREE.Group();
  const body = new THREE.Group(); // shaken during rumble
  root.add(body);
  const white = gloss(0xeef0f8, { r: 0.3 });
  const dark = std(0x1a1838, { r: 0.6 });
  const chrome = std(0xe6ecf5, { r: 0.15, m: 1 });

  // --- shell -------------------------------------------------------------
  const outer = () => roundedRectPath(new THREE.Shape(), -W / 2, 0, W, H, 0.24);
  const hole = (b, r = 0.1) => roundedRectPath(new THREE.Path(), b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, r);
  const front = outer(); front.holes.push(hole(WIN), hole(TRAY));
  const frontGeo = new THREE.ExtrudeGeometry(front, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 4, curveSegments: 16 });
  const frontMesh = mesh(frontGeo, white, 0, 0, FZ - 0.255);
  const mid = outer(); mid.holes.push(hole({ x0: WIN.x0 - 0.04, x1: WIN.x1 + 0.04, y0: 0.42, y1: 4.88 }, 0.05));
  const midMesh = mesh(new THREE.ExtrudeGeometry(mid, { depth: 1.34, bevelEnabled: false, curveSegments: 16 }), white, 0, 0, -0.75);
  const backMesh = mesh(new THREE.ExtrudeGeometry(outer(), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 16 }), white, 0, 0, -0.87);
  for (const m of [frontMesh, midMesh, backMesh]) { m.castShadow = true; body.add(m); }

  // interior liner + back wall art
  const cx = (WIN.x0 + WIN.x1) / 2, cw = WIN.x1 - WIN.x0 + 0.07;
  const liner = mesh(new THREE.BoxGeometry(cw, 4.45, 1.33), std(0x231a52, { r: 0.85, side: THREE.BackSide }), cx, 2.65, -0.085);
  body.add(liner);
  const backArt = mesh(new THREE.PlaneGeometry(cw, 4.45), new THREE.MeshStandardMaterial({
    roughness: 0.8,
    map: canvasTex(256, 512, (c) => {
      c.fillStyle = grad(c, 0, 0, 0, 512, ['#3a2a8a', '#1d1647']); c.fillRect(0, 0, 256, 512);
      c.fillStyle = 'rgba(255,255,255,.05)';
      for (let i = 0; i < 9; i++) for (let j = 0; j < 17; j++) { c.beginPath(); c.arc(i * 32 + (j % 2) * 16, j * 32, 6, 0, 7); c.fill(); }
    }),
  }), cx, 2.65, -0.74);
  body.add(backArt);

  // --- shelves, coils, slots ----------------------------------------------
  const shelfMat = std(0xf2f4fb, { r: 0.35, m: 0.3 });
  const helix = (() => {
    const p = [], turns = 5.5, len = 0.72;
    for (let i = 0; i <= 110; i++) { const t = i / 110, a = t * turns * PI * 2; p.push(new THREE.Vector3(Math.cos(a) * 0.13, Math.sin(a) * 0.13, -len + t * len)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 150, 0.011, 6);
  })();
  const haloMap = softDotTex();
  const slots = [];
  for (let r = 0; r < ROWS; r++) {
    const sy = WIN.y0 + r * ROWH;
    body.add(mesh(rbox(cw - 0.02, 0.04, 1.0, 0.012), shelfMat, cx, sy + 0.01, -0.22));
    body.add(mesh(new THREE.BoxGeometry(cw - 0.02, 0.06, 0.012), ledMat, cx, sy + 0.035, 0.287));
    for (let c = 0; c < COLS; c++) {
      const x = WIN.x0 + (c + 0.5) * COLW;
      const coil = mesh(helix, chrome, x, sy + 0.165, 0.06);
      const tagMat = new THREE.MeshBasicMaterial({ map: null, toneMapped: false });
      const tag = mesh(new THREE.PlaneGeometry(0.29, 0.1), tagMat, x, sy + 0.05, 0.296);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloMap, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.position.set(x, sy + 0.33, -0.1); halo.scale.setScalar(0.8);
      const holder = new THREE.Group(); holder.position.set(x, sy + 0.325, 0.17); holder.scale.setScalar(ITEM_SCALE);
      body.add(coil, tag, halo, holder);
      slots.push({ index: slots.length, row: r, col: c, coil, tag, tagMat, halo, holder, item: null, itemId: null, home: holder.position.clone() });
    }
  }
  // interior light bars
  for (const sx of [WIN.x0 + 0.005, WIN.x1 - 0.005]) body.add(mesh(new THREE.BoxGeometry(0.025, WIN.y1 - WIN.y0 - 0.1, 0.03), glow(0xffffff, 1.0), sx, (WIN.y0 + WIN.y1) / 2, 0.52));
  const inLight = new THREE.PointLight(0xfff4ff, 1.4, 6, 1.5); inLight.position.set(cx, 3.2, 0.52); body.add(inLight);
  const inLight2 = new THREE.PointLight(0xfff4ff, 1.1, 5, 1.5); inLight2.position.set(cx, 1.9, 0.52); body.add(inLight2);

  // glass
  const glass = mesh(new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), new THREE.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.05, depthWrite: false }), cx, (WIN.y0 + WIN.y1) / 2, 0.6);
  glass.renderOrder = 5;
  const streak = mesh(new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false, opacity: 0.3,
    map: canvasTex(128, 256, (c) => {
      c.translate(64, 128); c.rotate(-0.5); c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(-200, -70, 400, 26); c.fillRect(-200, -32, 400, 9);
      c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(-200, 60, 400, 40);
    }),
  }), cx, (WIN.y0 + WIN.y1) / 2, 0.605);
  streak.renderOrder = 6;
  body.add(glass, streak);

  // window LED trim
  const trim = roundedRectPath(new THREE.Shape(), WIN.x0 - 0.075, WIN.y0 - 0.075, WIN.x1 - WIN.x0 + 0.15, WIN.y1 - WIN.y0 + 0.15, 0.16);
  trim.holes.push(hole({ x0: WIN.x0 - 0.03, x1: WIN.x1 + 0.03, y0: WIN.y0 - 0.03, y1: WIN.y1 + 0.03 }, 0.12));
  body.add(mesh(new THREE.ExtrudeGeometry(trim, { depth: 0.02, bevelEnabled: false, curveSegments: 12 }), ledMat, 0, 0, FZ + 0.02));

  // --- tray --------------------------------------------------------------
  body.add(mesh(rbox(cw, 0.08, 1.3, 0.02), std(0x2c2466, { r: 0.7 }), cx, 0.46, -0.08));
  const trayTrim = roundedRectPath(new THREE.Shape(), TRAY.x0 - 0.07, TRAY.y0 - 0.07, TRAY.x1 - TRAY.x0 + 0.14, TRAY.y1 - TRAY.y0 + 0.14, 0.15);
  trayTrim.holes.push(hole({ x0: TRAY.x0 - 0.025, x1: TRAY.x1 + 0.025, y0: TRAY.y0 - 0.025, y1: TRAY.y1 + 0.025 }, 0.115));
  body.add(mesh(new THREE.ExtrudeGeometry(trayTrim, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 12 }), chrome, 0, 0, FZ + 0.02));
  body.add(mesh(new THREE.BoxGeometry(TRAY.x1 - TRAY.x0 - 0.06, 0.03, 0.03), ledMat, TCX, TRAY.y1 + 0.02, 0.5));
  const trayLight = new THREE.PointLight(0xffffff, 2.2, 3, 1.5); trayLight.position.set(TCX, 1.05, 0.75); body.add(trayLight);
  const fascia = decal(1.5, 0.15, canvasTex(512, 52, (c) => { text(c, '▼   GRAB YOUR SNACKS   ▼', 256, 28, 30, '#b9bfd6', { weight: 600 }); }));
  fascia.position.set(TCX, 1.375, FZ + 0.037); body.add(fascia);

  // --- marquee -----------------------------------------------------------
  body.add(mesh(rbox(2.72, 0.66, 0.08, 0.1), dark, 0, 5.3, FZ + 0.03));
  const signTex = canvasTex(1024, 232, (c) => {
    c.fillStyle = grad(c, 0, 0, 0, 232, ['#2b1c70', '#150d3d']); c.fillRect(0, 0, 1024, 232);
    c.font = `700 168px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 26; c.strokeStyle = '#ff3d8b'; c.strokeText('SNACKPOT', 512, 124);
    c.lineWidth = 10; c.strokeStyle = '#fff'; c.strokeText('SNACKPOT', 512, 124);
    c.fillStyle = grad(c, 0, 50, 0, 200, ['#fff7b0', '#ffc21a']); c.fillText('SNACKPOT', 512, 124);
  });
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }); signMat.color.setScalar(1.15);
  body.add(mesh(new THREE.PlaneGeometry(2.56, 0.52), signMat, 0, 5.3, FZ + 0.075));
  const bulbPos = [];
  const bw = 2.72, bh = 0.66, nx = 17, ny = 3;
  for (let i = 0; i <= nx; i++) bulbPos.push([-bw / 2 + (i / nx) * bw, 5.3 + bh / 2]);
  for (let i = 1; i <= ny; i++) bulbPos.push([bw / 2, 5.3 + bh / 2 - (i / (ny + 1)) * bh]);
  for (let i = nx; i >= 0; i--) bulbPos.push([-bw / 2 + (i / nx) * bw, 5.3 - bh / 2]);
  for (let i = ny; i >= 1; i--) bulbPos.push([-bw / 2, 5.3 + bh / 2 - (i / (ny + 1)) * bh]);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.036, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), bulbPos.length);
  const mtx = new THREE.Matrix4();
  bulbPos.forEach(([x, y], i) => { mtx.setPosition(x, y, FZ + 0.075); bulbs.setMatrixAt(i, mtx); bulbs.setColorAt(i, new THREE.Color(1, 1, 1)); });
  body.add(bulbs);

  // beacon
  const beacon = new THREE.Group();
  beacon.add(mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.1, 24), chrome, 0, 0.05, 0));
  const domeMat = new THREE.MeshBasicMaterial({ color: 0x661420, toneMapped: false, transparent: true, opacity: 0.92 });
  const dome = mesh(new THREE.SphereGeometry(0.14, 20, 12, 0, PI * 2, 0, PI / 2), domeMat, 0, 0.1, 0); dome.scale.y = 1.25;
  beacon.add(dome); beacon.position.set(-1.05, H, 0.1); body.add(beacon);

  // --- control cluster (bottom right) ---------------------------------------
  const pz = FZ + 0.035;
  body.add(mesh(rbox(0.86, 0.86, 0.03, 0.1), panelMat, PX, 0.85, pz - 0.012));
  body.add(mesh(rbox(0.72, 0.36, 0.05, 0.05), dark, PX, 1.05, pz));
  const scrCanvas = document.createElement('canvas'); scrCanvas.width = 320; scrCanvas.height = 144;
  const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace;
  body.add(mesh(new THREE.PlaneGeometry(0.64, 0.288), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }), PX, 1.05, pz + 0.027));
  function setScreen(top, big, color = '#7dffb0') {
    const c = scrCanvas.getContext('2d');
    c.fillStyle = '#07140f'; c.fillRect(0, 0, 320, 144);
    c.fillStyle = 'rgba(255,255,255,.04)'; for (let y = 0; y < 144; y += 4) c.fillRect(0, y, 320, 1);
    text(c, top, 160, 36, 28, color, { weight: 600 });
    let size = 62; c.font = `700 ${size}px ${FONT}`;
    while (c.measureText(big).width > 296 && size > 20) { size -= 4; c.font = `700 ${size}px ${FONT}`; }
    text(c, big, 160, 96, size, '#fff');
    scrTex.needsUpdate = true;
  }
  // coin slot
  const CX = PX - 0.2, BX = PX + 0.17, CY = 0.64;
  body.add(mesh(rbox(0.26, 0.36, 0.035, 0.06), chrome, CX, CY, pz + 0.005));
  body.add(mesh(rbox(0.032, 0.18, 0.02, 0.012), std(0x05050a, { r: 0.9 }), CX, CY, pz + 0.018));
  const coinRing = mesh(new THREE.TorusGeometry(0.11, 0.011, 8, 32), ledMat, CX, CY, pz + 0.024); coinRing.scale.set(0.75, 1.15, 1); body.add(coinRing);
  // play button
  const btnBase = mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.05, 32), chrome, BX, CY, pz + 0.02); btnBase.rotation.x = PI / 2;
  const btnMat = new THREE.MeshBasicMaterial({ color: 0xff3d6e, toneMapped: false });
  const button = mesh(new THREE.CylinderGeometry(0.145, 0.15, 0.07, 32), btnMat, BX, CY, pz + 0.06); button.rotation.x = PI / 2;
  const btnLabel = decal(0.2, 0.2, canvasTex(128, 128, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(46, 34); c.lineTo(98, 64); c.lineTo(46, 94); c.closePath(); c.fill(); }), { lit: false });
  btnLabel.position.set(BX, CY, pz + 0.097);
  body.add(btnBase, button, btnLabel);

  // kick plate + feet
  body.add(mesh(rbox(W - 0.5, 0.2, 0.03, 0.05), std(0xdfe3f0, { r: 0.4, m: 0.4 }), 0, 0.22, FZ + 0.03));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const f = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 16), dark, sx * 1.2, -0.04, sz * 0.6); f.castShadow = true; root.add(f); }

  // --- behaviour ---------------------------------------------------------
  const col = new THREE.Color();
  const state = { beacon: 0, chase: 1, flash: 0 };
  function update(t, dt) {
    // marquee chase lights
    const n = bulbPos.length, speed = 6 * state.chase;
    for (let i = 0; i < n; i++) {
      const on = state.flash > 0 ? Math.sin(t * 22) > 0 : (i + Math.floor(t * speed)) % 3 === 0;
      if (on) col.setRGB(1.9, 1.5, 0.6); else col.setRGB(0.45, 0.28, 0.1);
      bulbs.setColorAt(i, col);
    }
    bulbs.instanceColor.needsUpdate = true;
    state.flash = Math.max(0, state.flash - dt);
    const p = 0.75 + 0.25 * Math.sin(t * 3.2);
    btnMat.color.setRGB(1.5 * p + 0.3, 0.3 * p, 0.55 * p);
    const b = state.beacon * (0.55 + 0.45 * Math.sin(t * 16));
    domeMat.color.setRGB(0.4 + b * 3.2, 0.08 + b * 0.5, 0.12 + b * 0.3);
  }
  const tierCol = TIERS.map((x) => new THREE.Color(x.color));
  function styleSlot(slot, id) {
    slot.itemId = id;
    const tier = ITEM[id].tier;
    slot.tagMat.map = tagTex(id); slot.tagMat.needsUpdate = true;
    slot.halo.material.color.copy(tierCol[tier]);
    slot.halo.material.opacity = [0.1, 0.22, 0.4, 0.6, 0.85][tier];
  }

  return {
    root, body, slots, setScreen, update, state, styleSlot, button,
    coinSlot: new THREE.Vector3(CX, CY, pz + 0.05),
    trayBox: { x0: TRAY.x0 + 0.12, x1: TRAY.x1 - 0.12, y: 0.79, z: 0.4 },
    dropZ: 0.44,
    center: new THREE.Vector3(0, H / 2, 0),
  };
}
