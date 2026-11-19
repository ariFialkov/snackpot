// Scenery around the machine. Regenerated every round: theme colours, floor
// pattern, the organised rows of props at either side, and the backdrop skyline.
import * as THREE from 'three';
import { std, gloss, glow, rbox, mesh, canvasTex } from './util.js';
import { tween, wait, E, pick, shuffle, rand } from './anim.js';

const PI = Math.PI;
const C = (h) => new THREE.Color(h);

export const THEMES = [
  { name: 'Bubblegum', top: '#6fcfff', bottom: '#ffe6f3', floorA: '#ffb3d7', floorB: '#fff3fa', accent: '#ff3d9a', accent2: '#7a5cff', hills: ['#ff9fce', '#b9a4ff', '#8fdcff'] },
  { name: 'Lagoon', top: '#2fc4d6', bottom: '#eafff6', floorA: '#8fe6d3', floorB: '#f2fffb', accent: '#00d9c0', accent2: '#ff8a3d', hills: ['#6fe3c7', '#5cc8f0', '#ffd08a'] },
  { name: 'Sunset', top: '#ff9463', bottom: '#fff1cc', floorA: '#ffc588', floorB: '#fff7e6', accent: '#ffae00', accent2: '#ff4d6d', hills: ['#ffb37a', '#ff8fa3', '#ffe08a'] },
  { name: 'Grape', top: '#8f7dff', bottom: '#f3ecff', floorA: '#c6b6ff', floorB: '#faf7ff', accent: '#a64dff', accent2: '#1fd6a0', hills: ['#b9a4ff', '#ff9fe0', '#8fe8d0'] },
  { name: 'Meadow', top: '#57c7ff', bottom: '#f6ffdb', floorA: '#b6e87c', floorB: '#f8ffe9', accent: '#5fd400', accent2: '#ff5c8a', hills: ['#9be36a', '#6fd6c0', '#ffe07a'] },
  { name: 'Sky', top: '#3d9bff', bottom: '#eaf6ff', floorA: '#a8cffc', floorB: '#f5faff', accent: '#2f8dff', accent2: '#ffc93f', hills: ['#8fc0ff', '#a9a4ff', '#ffe29a'] },
];
const PATTERNS = ['checker', 'dots', 'stripes', 'tiles', 'diamond'];

function floorTex(pattern, a, b) {
  const t = canvasTex(256, 256, (g) => {
    g.fillStyle = b; g.fillRect(0, 0, 256, 256); g.fillStyle = a;
    if (pattern === 'checker') { g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128); }
    else if (pattern === 'dots') { for (const [x, y] of [[64, 64], [192, 192]]) { g.beginPath(); g.arc(x, y, 40, 0, 7); g.fill(); } }
    else if (pattern === 'stripes') { g.fillRect(0, 0, 256, 64); g.fillRect(0, 128, 256, 64); }
    else if (pattern === 'tiles') { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.roundRect(10 + i * 128, 10 + j * 128, 108, 108, 26); g.fill(); } }
    else { g.beginPath(); g.moveTo(128, 8); g.lineTo(248, 128); g.lineTo(128, 248); g.lineTo(8, 128); g.fill(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 26); t.anisotropy = 8;
  return t;
}

// ---- props (each ~1-3 units tall, origin on the floor) ------------------------
const P = {};
P.plant = (p) => {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.6, 24), gloss(0xffffff), 0, 0.3, 0), mesh(new THREE.TorusGeometry(0.41, 0.045, 8, 24).rotateX(PI / 2), gloss(p.a), 0, 0.56, 0));
  const greens = [0x2fbf71, 0x46d68a, 0x1fa863];
  [[0, 1.05, 0, 0.5], [-0.32, 0.92, 0.1, 0.36], [0.33, 0.95, -0.05, 0.38], [0.05, 1.5, 0.05, 0.36], [-0.2, 1.38, -0.15, 0.3], [0.24, 1.36, 0.14, 0.28]].forEach(([x, y, z, r], i) =>
    g.add(mesh(new THREE.IcosahedronGeometry(r, 2), std(greens[i % 3], { r: 0.7 }), x, y, z)));
  return g;
};
P.gumball = (p) => {
  const g = new THREE.Group();
  const red = gloss(p.a), chrome = std(0xe6ecf5, { r: 0.15, m: 1 });
  g.add(mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.12, 24), chrome, 0, 0.06, 0), mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 12), chrome, 0, 0.55, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.5, 24), red, 0, 1.2, 0), mesh(rbox(0.18, 0.2, 0.06, 0.03), chrome, 0, 1.2, 0.34));
  g.add(mesh(new THREE.SphereGeometry(0.46, 28, 20), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0, clearcoat: 1, depthWrite: false }), 0, 1.82, 0));
  const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 10, 8), std(0xffffff, { r: 0.25 }), 34);
  const m = new THREE.Matrix4(), cols = [0xff4d6d, 0xffd23f, 0x35e07a, 0x3aa0ff, 0xb45cff, 0xff8a3d];
  for (let i = 0; i < 34; i++) {
    const a = i * 2.4, r = 0.33 * Math.sqrt((i % 9) / 9 + 0.1), y = 1.5 + (i / 34) * 0.42;
    m.setPosition(Math.cos(a) * r * (1 - (y - 1.5) * 0.6), y, Math.sin(a) * r * (1 - (y - 1.5) * 0.6)); balls.setMatrixAt(i, m); balls.setColorAt(i, C(cols[i % 6]));
  }
  g.add(balls, mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.12, 20), red, 0, 2.28, 0), mesh(new THREE.SphereGeometry(0.07, 12, 8), chrome, 0, 2.38, 0));
  return g;
};
P.gifts = (p) => {
  const g = new THREE.Group();
  const cols = shuffle([p.a, p.b, 0xffffff]);
  let y = 0;
  [[1.0, 0.75], [0.74, 0.58], [0.5, 0.44]].forEach(([w, h], i) => {
    const b = new THREE.Group(), rib = gloss(i === 1 ? 0xffd23f : 0xffffff === cols[i] ? p.a : 0xffffff);
    b.add(mesh(rbox(w, h, w, 0.06), gloss(cols[i])), mesh(new THREE.BoxGeometry(w * 0.16, h + 0.012, w + 0.012), rib), mesh(new THREE.BoxGeometry(w + 0.012, h + 0.012, w * 0.16), rib));
    b.position.set((i % 2 ? 0.06 : -0.03), y + h / 2, 0); b.rotation.y = i * 0.35 - 0.2; g.add(b); y += h;
  });
  for (const s of [-1, 1]) { const bow = mesh(new THREE.TorusGeometry(0.1, 0.035, 8, 16), gloss(0xffffff), s * 0.09 - 0.03, y + 0.08, 0); bow.rotation.set(0.3, s * 0.6, s * 0.4); g.add(bow); }
  return g;
};
P.neon = (p) => {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.1, 24), gloss(0xffffff), 0, 0.05, 0), mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.7, 12), gloss(0xffffff), 0, 0.9, 0));
  g.add(mesh(new THREE.TorusGeometry(0.5, 0.05, 10, 40), glow(p.a, 1.7), 0, 2.25, 0));
  const star = mesh(new THREE.OctahedronGeometry(0.26, 0), glow(p.b, 1.5), 0, 2.25, 0); star.scale.set(1, 1.3, 0.5);
  star.userData.spin = 1.2; g.add(star);
  return g;
};
P.ropes = (p) => {
  const g = new THREE.Group();
  const gold = std(0xffc95a, { r: 0.2, m: 1 });
  for (const z of [-0.7, 0.7]) g.add(mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.07, 20), gold, 0, 0.035, z), mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 12), gold, 0, 0.6, z), mesh(new THREE.SphereGeometry(0.1, 14, 10), gold, 0, 1.2, z));
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 1.08, -0.7), new THREE.Vector3(0, 0.62, 0), new THREE.Vector3(0, 1.08, 0.7));
  g.add(mesh(new THREE.TubeGeometry(curve, 20, 0.05, 10), std(p.a, { r: 0.85 })));
  return g;
};
P.balloons = (p) => {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.36, 0.3, 0.36, 0.08), gloss(0xffffff), 0, 0.15, 0));
  const cols = [p.a, p.b, 0xffd23f, 0xffffff];
  [[-0.3, 2.3, 0.05], [0.28, 2.55, -0.1], [0.0, 2.95, 0.12], [-0.1, 2.0, -0.2]].forEach(([x, y, z], i) => {
    const b = new THREE.Group();
    const s = mesh(new THREE.SphereGeometry(0.34, 22, 16), gloss(cols[i], { r: 0.15 })); s.scale.y = 1.2;
    b.add(s, mesh(new THREE.ConeGeometry(0.06, 0.09, 8), gloss(cols[i]), 0, -0.44, 0));
    b.position.set(x, y, z); b.userData.bob = i * 1.7 + 1; g.add(b);
    const len = Math.hypot(x, y - 0.75, z), str = mesh(new THREE.CylinderGeometry(0.006, 0.006, len, 4), std(0xffffff), x / 2, (y - 0.45 + 0.3) / 2, z / 2);
    str.lookAt(x, y - 0.45, z); str.rotateX(PI / 2); g.add(str);
  });
  return g;
};
P.lollipop = (p) => {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.4, 20, 10, 0, PI * 2, 0, PI / 2), gloss(0xffffff), 0, 0, 0), mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 12), gloss(0xffffff), 0, 0.9, 0));
  const a = '#' + C(p.a).getHexString(), b = '#' + C(p.b).getHexString();
  const tex = canvasTex(256, 256, (c) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 256); c.translate(128, 128);
    for (let k = 0; k < 2; k++) { c.strokeStyle = k ? b : a; c.lineWidth = 20; c.lineCap = 'round'; c.beginPath(); for (let t = 0; t < 22; t += 0.1) { const r = t * 6; c.lineTo(Math.cos(t + k * PI) * r, Math.sin(t + k * PI) * r); } c.stroke(); }
  });
  const m = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.2, clearcoat: 1 });
  const disc = mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 40), [gloss(0xffffff), m, m], 0, 2.1, 0); disc.rotation.x = PI / 2;
  g.add(disc, mesh(new THREE.TorusGeometry(0.62, 0.08, 12, 40), gloss(0xffffff), 0, 2.1, 0));
  return g;
};
P.cup = (p) => {
  const g = new THREE.Group();
  const tex = canvasTex(256, 64, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#' + C(p.a).getHexString(); for (let i = 0; i < 8; i++) c.fillRect(i * 32, 0, 16, 64); });
  g.add(mesh(new THREE.CylinderGeometry(0.5, 0.36, 1.3, 32), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 1 }), 0, 0.65, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.08, 32), gloss(0xffffff), 0, 1.33, 0), mesh(new THREE.SphereGeometry(0.46, 24, 10, 0, PI * 2, 0, PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, roughness: 0.05 }), 0, 1.36, 0));
  const straw = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 10), gloss(p.b), 0.1, 1.9, 0); straw.rotation.z = -0.18;
  const tip = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 10), gloss(p.b), 0.36, 2.52, 0); tip.rotation.z = -1.2;
  g.add(straw, tip);
  return g;
};
P.arcade = (p) => {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.95, 1.1, 0.8, 0.07), gloss(p.b), 0, 0.55, 0), mesh(rbox(0.95, 1.05, 0.62, 0.07), gloss(p.b), 0, 1.6, -0.09), mesh(rbox(1.0, 0.3, 0.7, 0.07), gloss(0xffffff), 0, 2.2, -0.05));
  const scr = mesh(new THREE.PlaneGeometry(0.7, 0.56), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(128, 104, (c) => {
    c.fillStyle = '#16123a'; c.fillRect(0, 0, 128, 104); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(40, 52, 18, 0.5, 5.8); c.lineTo(40, 52); c.fill();
    c.fillStyle = '#fff'; for (const x of [72, 90, 108]) { c.beginPath(); c.arc(x, 52, 4, 0, 7); c.fill(); }
  }) }), 0, 1.62, 0.23); scr.rotation.x = -0.2;
  g.add(scr, mesh(rbox(0.95, 0.1, 0.36, 0.04), std(0x23263a, { r: 0.4 }), 0, 1.12, 0.3));
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), std(0xdddddd, { m: 1, r: 0.2 }), -0.2, 1.24, 0.3), mesh(new THREE.SphereGeometry(0.06, 12, 10), gloss(0xff3d6e), -0.2, 1.34, 0.3));
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14), gloss([0xffd23f, 0x35e07a, 0x3aa0ff][i]), 0.08 + i * 0.13, 1.19, 0.3));
  g.add(mesh(new THREE.PlaneGeometry(0.8, 0.18), glow(p.a, 1.5), 0, 2.2, 0.305));
  return g;
};
const PROP_IDS = Object.keys(P);
const SLOTS = [
  { x: 2.75, z: 0.55, s: 0.9 }, { x: 4.15, z: -0.75, s: 1.05 }, { x: 5.7, z: -2.2, s: 1.2 }, { x: 7.4, z: -3.8, s: 1.3 },
];

// ---- backdrop skyline ----------------------------------------------------------
const SKY_SEQ = [[2, 3, 4, 3], [4, 2, 4, 2], [2, 2, 4], [2, 3, 4, 5, 4, 3], [5, 3, 2, 3], [3, 4, 3, 5]];
const SKY_SHAPES = ['capsule', 'arch', 'tree', 'cone'];

export function buildEnvironment(scene, ledMat, panelMat) {
  const root = new THREE.Group(); scene.add(root);
  const u = { top: { value: C('#6fcfff') }, bottom: { value: C('#ffe6f3') } };
  const sky = mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 d; void main(){ float t = smoothstep(-0.02, 0.55, normalize(d).y); gl_FragColor = vec4(mix(bottom, top, t), 1.0); }',
  }));
  root.add(sky);
  scene.fog = new THREE.Fog(0xffffff, 22, 60);

  const mkFloor = (y) => { const f = mesh(new THREE.CircleGeometry(70, 48), new THREE.MeshStandardMaterial({ roughness: 0.55, transparent: true }), 0, y, 0); f.rotation.x = -PI / 2; f.receiveShadow = true; root.add(f); return f; };
  const floors = [mkFloor(-0.1), mkFloor(-0.096)];
  floors[1].material.opacity = 0;

  // stage under the machine
  const stage = mesh(new THREE.CylinderGeometry(2.7, 2.8, 0.1, 64), gloss(0xe9ebf5, { r: 0.35 }), 0, -0.05, 0); stage.receiveShadow = true;
  root.add(stage, mesh(new THREE.TorusGeometry(2.76, 0.035, 8, 80).rotateX(PI / 2), ledMat, 0, -0.03, 0));

  // clouds
  const cloudM = std(0xffffff, { r: 1, fog: false });
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) c.add(mesh(new THREE.SphereGeometry(1, 14, 10), cloudM, (k - 2) * 1.1, Math.sin(k * 1.9) * 0.3, 0)).scale.setScalar(0.9 + Math.sin(k * 2.3 + i) * 0.35);
    c.scale.set(1.5, 1, 0.7).multiplyScalar(0.9 + (i % 3) * 0.35);
    c.position.set(-30 + i * 10 + (i % 2) * 3, 9 + (i * 3.7) % 9, -30 - (i % 3) * 5);
    c.userData.v = 0.25 + (i % 3) * 0.12; clouds.push(c); root.add(c);
  }

  const props = [];
  const skyline = new THREE.Group(); root.add(skyline);
  let hills = [];
  const anims = []; // {obj, kind}
  let theme = null;

  function makeProp(id, pal, slot, side) {
    const g = P[id](pal);
    g.traverse((o) => { if (o.isMesh && !o.material.transparent) o.castShadow = true; if (o.userData.bob || o.userData.spin) anims.push(o); });
    g.position.set(slot.x * side, -0.1, slot.z);
    g.rotation.y = -side * 0.35;
    g.userData.s = slot.s;
    root.add(g);
    return g;
  }
  function makeSkyline(th) {
    const out = [];
    const seq = pick(SKY_SEQ), shapes = shuffle([...SKY_SHAPES]).slice(0, 2 + (Math.random() < 0.5 ? 1 : 0));
    const n = 15;
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - 0.5) * 1.9, R = 17 + (i % 2) * 2.2;
      const h = seq[i % seq.length] * 1.45, shape = shapes[i % shapes.length];
      const m = std(th.hills[i % th.hills.length], { r: 0.9 });
      const g = new THREE.Group(), w = 1.25;
      if (shape === 'capsule') g.add(mesh(new THREE.CapsuleGeometry(w, h, 6, 20), m, 0, h / 2, 0));
      else if (shape === 'arch') { g.add(mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.4, h, 14), m, -w * 0.8, h / 2, 0), mesh(new THREE.CylinderGeometry(w * 0.4, w * 0.4, h, 14), m, w * 0.8, h / 2, 0), mesh(new THREE.TorusGeometry(w * 0.8, w * 0.4, 12, 20, PI), m, 0, h, 0)); }
      else if (shape === 'tree') g.add(mesh(new THREE.CylinderGeometry(0.22, 0.28, h, 10), std(0xffffff, { r: 0.9 }), 0, h / 2, 0), mesh(new THREE.SphereGeometry(w * 1.25, 20, 14), m, 0, h + w * 0.6, 0));
      else g.add(mesh(new THREE.ConeGeometry(w * 1.25, h + 1.6, 22), m, 0, (h + 1.6) / 2, 0));
      g.position.set(Math.sin(a) * R, -0.1, -Math.cos(a) * R + 4);
      skyline.add(g); out.push(g);
    }
    return out;
  }

  async function regenerate(animate = true) {
    const prev = theme;
    theme = pick(THEMES.filter((t) => t !== prev));
    const pattern = pick(PATTERNS);
    const pal = { a: C(theme.accent).getHex(), b: C(theme.accent2).getHex() };
    const dur = animate ? 0.9 : 0;

    // colours
    const from = { top: u.top.value.clone(), bottom: u.bottom.value.clone(), led: ledMat.color.clone(), panel: panelMat.color.clone() };
    const to = { top: C(theme.top), bottom: C(theme.bottom), led: C(theme.accent).multiplyScalar(1.7), panel: C(theme.accent2) };
    const newTex = floorTex(pattern, theme.floorA, theme.floorB);
    const [base, over] = floors;
    over.material.map = newTex; over.material.needsUpdate = true;
    const colorJob = tween(dur, (k) => {
      u.top.value.lerpColors(from.top, to.top, k); u.bottom.value.lerpColors(from.bottom, to.bottom, k);
      ledMat.color.lerpColors(from.led, to.led, k); panelMat.color.lerpColors(from.panel, to.panel, k);
      scene.fog.color.copy(u.bottom.value);
      over.material.opacity = k;
    }).then(() => {
      base.material.map?.dispose(); base.material.map = newTex; base.material.needsUpdate = true;
      over.material.opacity = 0; over.material.map = null;
    });

    // props: an ordered set of three or four, mirrored or offset left/right
    const ids = shuffle([...PROP_IDS]).slice(0, SLOTS.length);
    const mirrored = Math.random() < 0.6;
    const old = props.splice(0);
    old.forEach((g, i) => tween(animate ? 0.28 : 0, (k) => g.scale.setScalar(g.userData.s * (1 - k)), E.inBack).then(() => { g.removeFromParent(); }));
    for (let i = anims.length - 1; i >= 0; i--) anims.splice(i, 1);
    const jobs = [colorJob];
    SLOTS.forEach((slot, i) => {
      for (const side of [-1, 1]) {
        const id = side < 0 || mirrored ? ids[i] : ids[(i + 1) % ids.length];
        const g = makeProp(id, pal, slot, side); g.scale.setScalar(0.0001); props.push(g);
        jobs.push(wait(animate ? 0.3 + i * 0.09 + (side > 0 ? 0.04 : 0) : 0).then(() => tween(animate ? 0.5 : 0, (k) => g.scale.setScalar(Math.max(0.0001, slot.s * k)), E.outBack)));
      }
    });
    // skyline
    const oldHills = hills; hills = makeSkyline(theme);
    oldHills.forEach((g) => tween(animate ? 0.35 : 0, (k) => g.scale.set(1, Math.max(0.0001, 1 - k), 1), E.in).then(() => g.removeFromParent()));
    hills.forEach((g, i) => { g.scale.set(1, 0.0001, 1); jobs.push(wait(animate ? 0.35 + i * 0.03 : 0).then(() => tween(animate ? 0.6 : 0, (k) => g.scale.set(1, Math.max(0.0001, k), 1), E.outBack))); });
    await Promise.all(jobs);
    return theme;
  }

  function update(t, dt) {
    for (const c of clouds) { c.position.x += c.userData.v * dt; if (c.position.x > 42) c.position.x = -42; }
    for (const o of anims) {
      if (o.userData.bob) { o.position.y += Math.sin(t * 1.3 + o.userData.bob) * 0.0016; o.rotation.z = Math.sin(t * 0.9 + o.userData.bob) * 0.05; }
      if (o.userData.spin) o.rotation.y = t * o.userData.spin;
    }
  }
  return { regenerate, update, get theme() { return theme; } };
}
