// Procedural item models. Every model faces +z, is centred on the origin and
// fits inside roughly 0.38 x 0.42 x 0.2 so it sits nicely in a vending slot.
import * as THREE from 'three';
import { std, gloss, glow, rbox, mesh, canvasTex, decal, text, rr, grad, pillowGeo, starTex } from './util.js';
import { ITEM, TIERS } from '../game/math.js';

const PI = Math.PI;
const B = {};

B.mints = () => {
  const g = new THREE.Group();
  const tin = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 40), std(0xeaf6f1, { r: 0.22, m: 0.75 }));
  tin.rotation.x = PI / 2;
  const rim = mesh(new THREE.TorusGeometry(0.168, 0.012, 10, 44), std(0xd5e2ea, { r: 0.18, m: 0.95 }), 0, 0, 0.03);
  const lid = decal(0.31, 0.31, canvasTex(256, 256, (c) => {
    c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fillStyle = grad(c, 0, 0, 0, 256, ['#7df0c3', '#19b98a']); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 9;
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(128, 128, 104, i * 1.047, i * 1.047 + 0.6); c.stroke(); }
    c.beginPath(); c.ellipse(128, 128, 96, 44, -0.12, 0, 7); c.fillStyle = '#fff'; c.fill();
    text(c, 'MINTS', 128, 131, 50, '#0f9b74');
    text(c, '✦ fresh ✦', 128, 196, 22, '#fff', { weight: 600 });
  }), { r: 0.3, m: 0.2 });
  lid.position.z = 0.0362;
  g.add(tin, rim, lid);
  const mm = std(0xffffff, { r: 0.35 });
  [[-0.12, -0.17, 0.05], [0.13, -0.16, 0.04], [0.02, -0.19, 0.07]].forEach(([x, y, z], i) => {
    const m = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.016, 16), mm, x, y, z);
    m.rotation.set(1.1 + i * 0.3, 0, i * 0.7); g.add(m);
  });
  return g;
};

function bag(w, h, d, tex, color) {
  const g = new THREE.Group();
  const plain = std(color, { r: 0.32, m: 0.25 });
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.25 });
  g.add(mesh(pillowGeo(w, h, d), [plain, plain, plain, plain, front, plain]));
  const seal = std(new THREE.Color(color).multiplyScalar(0.8), { r: 0.3, m: 0.4 });
  g.add(mesh(rbox(w, 0.035, 0.012, 0.005), seal, 0, h / 2 - 0.004, 0), mesh(rbox(w, 0.035, 0.012, 0.005), seal, 0, -h / 2 + 0.004, 0));
  return g;
}

B.chips = () => bag(0.3, 0.4, 0.13, canvasTex(256, 340, (c) => {
  c.fillStyle = grad(c, 0, 0, 0, 340, ['#ffd83a', '#ff9d1c']); c.fillRect(0, 0, 256, 340);
  c.fillStyle = '#ff4b3a'; c.beginPath(); c.moveTo(0, 70); c.quadraticCurveTo(128, 20, 256, 70); c.lineTo(256, 170); c.quadraticCurveTo(128, 120, 0, 170); c.fill();
  text(c, 'CHIPS', 128, 108, 62, '#fff', { stroke: '#b3201a' });
  for (const [x, y, r] of [[90, 230, 0.3], [160, 250, -0.4], [128, 205, 0.1]]) {
    c.save(); c.translate(x, y); c.rotate(r); c.beginPath(); c.ellipse(0, 0, 44, 30, 0, 0, 7);
    c.fillStyle = '#ffe9a3'; c.fill(); c.strokeStyle = '#e8a93a'; c.lineWidth = 4; c.stroke();
    c.beginPath(); c.ellipse(-8, -6, 22, 10, 0.2, 0, 7); c.fillStyle = 'rgba(255,255,255,.5)'; c.fill(); c.restore();
  }
  text(c, 'CRUNCHY!', 128, 305, 24, '#b34a00');
}), 0xffa91f);

B.chocolate = () => {
  const g = new THREE.Group();
  const choc = std(0x6b3a1e, { r: 0.45 });
  g.add(mesh(rbox(0.22, 0.2, 0.04, 0.012), choc, 0, 0.1, 0));
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.add(mesh(rbox(0.095, 0.08, 0.02, 0.012), std(0x7d4525, { r: 0.4 }), -0.052 + i * 0.104, 0.065 + j * 0.088, 0.022));
  g.add(mesh(rbox(0.245, 0.24, 0.058, 0.014), std(0x7a2bd6, { r: 0.3, m: 0.2 }), 0, -0.085, 0));
  g.add(mesh(rbox(0.25, 0.03, 0.062, 0.008), std(0xffd45a, { r: 0.2, m: 0.95 }), 0, 0.03, 0));
  const l = decal(0.235, 0.21, canvasTex(256, 228, (c) => {
    c.fillStyle = grad(c, 0, 0, 256, 228, ['#9a45ff', '#5a1bb5']); c.fillRect(0, 0, 256, 228);
    c.fillStyle = '#ffd45a'; rr(c, 22, 60, 212, 86, 43); c.fill();
    text(c, 'CHOCO', 128, 105, 60, '#5a2a12');
    text(c, 'milk chocolate', 128, 182, 24, '#f0dcff', { weight: 600 });
  }), { r: 0.3 });
  l.position.set(0, -0.09, 0.0296);
  g.add(l);
  return g;
};

B.soda = () => {
  const g = new THREE.Group();
  const r = 0.105, h = 0.38;
  const pts = [[0.001, -h / 2], [r * 0.8, -h / 2], [r, -h / 2 + 0.03], [r, h / 2 - 0.05], [r * 0.8, h / 2 - 0.005], [r * 0.8, h / 2]].map(([x, y]) => new THREE.Vector2(x, y));
  const tex = canvasTex(512, 256, (c) => {
    c.fillStyle = grad(c, 0, 0, 0, 256, ['#ff3b5c', '#d9123a']); c.fillRect(0, 0, 512, 256);
    c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(0, 180); for (let x = 0; x <= 512; x += 8) c.lineTo(x, 180 + Math.sin(x / 512 * PI * 4) * 16); c.lineTo(512, 205); c.lineTo(0, 205); c.fill();
    for (const x of [128, 384]) { text(c, 'SODA', x, 112, 78, '#fff', { stroke: '#8f0a25' }); text(c, 'POP', x, 228, 26, '#ffd5dc'); }
    c.fillStyle = 'rgba(255,255,255,.45)'; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc((i * 97) % 512, 20 + (i * 53) % 140, 3 + (i % 3) * 2, 0, 7); c.fill(); }
  });
  const body = mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22, metalness: 0.6 }));
  body.rotation.y = -PI / 2;
  const metal = std(0xdfe6ee, { r: 0.2, m: 1 });
  const top = mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.012, 32), metal, 0, h / 2 - 0.004, 0);
  const tab = mesh(new THREE.TorusGeometry(0.022, 0.008, 8, 16), metal, 0, h / 2 + 0.006, 0.03);
  tab.rotation.x = PI / 2; tab.scale.z = 0.6;
  g.add(body, top, tab, mesh(new THREE.TorusGeometry(r * 0.82, 0.008, 8, 32).rotateX(PI / 2), metal, 0, h / 2, 0));
  return g;
};

B.gummy = () => {
  const g = bag(0.3, 0.34, 0.11, canvasTex(256, 290, (c) => {
    c.fillStyle = grad(c, 0, 0, 256, 290, ['#53e0ff', '#3f7dff']); c.fillRect(0, 0, 256, 290);
    c.fillStyle = 'rgba(255,255,255,.28)'; rr(c, 30, 120, 196, 140, 30); c.fill();
    text(c, 'GUMMY', 128, 50, 50, '#fff', { stroke: '#1b3fb3' });
    text(c, 'WORMS', 128, 94, 36, '#ffe14a', { stroke: '#1b3fb3' });
  }), 0x3f8bff);
  g.position.y = 0.02;
  const wrap = new THREE.Group(); wrap.add(g);
  const cols = [[0xff3d6e, 0xffd23f], [0x35e07a, 0xff7a2f], [0xb45cff, 0x3fd0ff]];
  cols.forEach(([a, b], i) => {
    const mk = (t0, t1) => {
      const p = [];
      for (let k = 0; k <= 8; k++) { const t = t0 + (t1 - t0) * k / 8; p.push(new THREE.Vector3(-0.15 + t * 0.3, Math.sin(t * PI * 2.4 + i * 1.7) * 0.03, Math.cos(t * PI * 3 + i) * 0.012)); }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 16, 0.021, 8);
    };
    const w = new THREE.Group();
    const m1 = mesh(mk(0, 0.5), std(a, { r: 0.25, transparent: true, opacity: 0.93 })), m2 = mesh(mk(0.5, 1), std(b, { r: 0.25, transparent: true, opacity: 0.93 }));
    const e1 = mesh(new THREE.SphereGeometry(0.021, 10, 8), m1.material, -0.15, Math.sin(i * 1.7) * 0.03, Math.cos(i) * 0.012);
    const e2 = mesh(new THREE.SphereGeometry(0.021, 10, 8), m2.material, 0.15, Math.sin(PI * 2.4 + i * 1.7) * 0.03, Math.cos(PI * 3 + i) * 0.012);
    w.add(m1, m2, e1, e2);
    w.position.set(0, -0.03 - i * 0.055, 0.075 + i * 0.012);
    w.rotation.z = (i - 1) * 0.22;
    wrap.add(w);
  });
  return wrap;
};

B.cards = () => {
  const g = new THREE.Group();
  const art = (i) => canvasTex(200, 280, (c) => {
    const pal = [['#3aa0ff', '#1546c9'], ['#ff5c7a', '#b3123a'], ['#ffd23f', '#ff8a1c']][i];
    c.fillStyle = '#fff'; c.fillRect(0, 0, 200, 280);
    c.fillStyle = grad(c, 0, 0, 200, 280, pal); rr(c, 12, 12, 176, 256, 14); c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(100, 205, 62, 16, 0, 0, 7); c.fill();
    c.fillStyle = '#16233f';
    c.beginPath(); c.arc(96, 78, 22, 0, 7); c.fill();
    rr(c, 70, 100, 54, 74, 16); c.fill();
    c.fillRect(74, 168, 18, 36); c.fillRect(104, 168, 18, 36);
    c.strokeStyle = '#16233f'; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(120, 118); c.lineTo(160, 200); c.lineTo(182, 200); c.stroke();
    c.beginPath(); c.ellipse(148, 214, 12, 5, 0, 0, 7); c.fill();
    c.fillStyle = '#fff'; rr(c, 20, 226, 160, 34, 8); c.fill();
    text(c, ['ROOKIE', 'ALL-STAR', 'LEGEND'][i], 100, 244, 22, pal[1]);
    text(c, '★', 34, 36, 30, '#fff');
  });
  [-1, 0, 1].forEach((k, i) => {
    const card = new THREE.Group();
    card.add(mesh(rbox(0.2, 0.28, 0.01, 0.004), std(0xffffff, { r: 0.35 })));
    const d = decal(0.2, 0.28, art(i), { r: i === 1 ? 0.15 : 0.35, m: i === 1 ? 0.5 : 0 });
    d.position.z = 0.0056; card.add(d);
    card.position.set(k * 0.075, -Math.abs(k) * 0.02 + 0.01, (i === 1 ? 0.03 : 0) + i * 0.004);
    card.rotation.z = -k * 0.3;
    g.add(card);
  });
  return g;
};

B.mask = () => {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-0.19, 0.02); s.bezierCurveTo(-0.2, 0.12, -0.06, 0.125, 0, 0.075); s.bezierCurveTo(0.06, 0.125, 0.2, 0.12, 0.19, 0.02);
  s.bezierCurveTo(0.18, -0.085, 0.07, -0.1, 0.03, -0.03); s.quadraticCurveTo(0, -0.008, -0.03, -0.03); s.bezierCurveTo(-0.07, -0.1, -0.18, -0.085, -0.19, 0.02);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 4, curveSegments: 20 });
  geo.translate(0, 0, -0.015);
  g.add(mesh(geo, std(0x3b2a8f, { r: 0.42, m: 0.1 })));
  const lash = std(0xffc8ec, { r: 0.3, e: 0xff7fd0, ei: 0.25 });
  for (const sx of [-1, 1]) {
    const arc = mesh(new THREE.TorusGeometry(0.045, 0.007, 8, 18, PI), lash, sx * 0.095, 0.035, 0.031);
    arc.rotation.z = PI; g.add(arc);
    for (let i = -1; i <= 1; i++) {
      const l = mesh(new THREE.CapsuleGeometry(0.005, 0.02, 3, 6), lash, sx * 0.095 + i * 0.03, -0.018 + Math.abs(i) * 0.012, 0.031);
      l.rotation.z = i * 0.5; g.add(l);
    }
  }
  const strap = mesh(new THREE.TorusGeometry(0.185, 0.008, 6, 28, PI), std(0x1c1447, { r: 0.8 }), 0, 0.02, 0);
  strap.rotation.set(PI / 2, 0, PI);
  g.add(strap);
  g.position.y = -0.01;
  const w = new THREE.Group(); w.add(g); return w;
};

B.hat = () => {
  const g = new THREE.Group();
  const crownM = std(0x19b6a8, { r: 0.75 });
  const crown = mesh(new THREE.SphereGeometry(0.16, 32, 16, 0, PI * 2, 0, PI / 2), crownM);
  crown.scale.set(1, 0.82, 1.05);
  const band = mesh(new THREE.CylinderGeometry(0.161, 0.163, 0.03, 32, 1, true), crownM, 0, 0.012, 0); band.scale.z = 1.05;
  const brimM = std(0xff7a2f, { r: 0.6 });
  const brim = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.014, 36), brimM, 0, 0.004, 0.17); brim.scale.set(1, 1, 0.95);
  const under = mesh(new THREE.CylinderGeometry(0.146, 0.146, 0.004, 36), std(0x1f9e50, { r: 0.7 }), 0, -0.005, 0.17); under.scale.z = 0.95;
  const button = mesh(new THREE.SphereGeometry(0.018, 12, 8), brimM, 0, 0.133, 0); button.scale.y = 0.6;
  const sticker = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.003, 20), std(0xffd45a, { r: 0.15, m: 1 }), 0.07, 0.013, 0.22);
  const patch = decal(0.11, 0.08, canvasTex(128, 96, (c) => {
    c.fillStyle = '#fff'; rr(c, 4, 4, 120, 88, 22); c.fill(); c.strokeStyle = '#ff7a2f'; c.lineWidth = 7; c.stroke();
    text(c, '★', 64, 50, 62, '#ff7a2f');
  }), { r: 0.6 });
  patch.position.set(0, 0.066, 0.158); patch.rotation.x = -0.52;
  g.add(crown, band, brim, under, button, sticker, patch);
  g.rotation.set(0.5, -0.45, 0); g.position.set(0.0, -0.06, -0.03);
  const w = new THREE.Group(); w.add(g); return w;
};

B.pillow = () => {
  const g = new THREE.Group();
  const tex = canvasTex(128, 64, (c) => {
    c.fillStyle = '#5b8dff'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#7ba6ff';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(i * 16 + (j % 2) * 8 + 4, j * 16 + 8, 3.2, 0, 7); c.fill(); }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 2);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
  const R = 0.118, t = 0.064, arc = PI * 1.5;
  const tor = mesh(new THREE.TorusGeometry(R, t, 18, 40, arc), m);
  g.add(tor, mesh(new THREE.SphereGeometry(t, 18, 14), m, R, 0, 0), mesh(new THREE.SphereGeometry(t, 18, 14), m, R * Math.cos(arc), R * Math.sin(arc), 0));
  const pipe = mesh(new THREE.TorusGeometry(R, t + 0.003, 4, 40, arc), std(0xffffff, { r: 0.8 })); pipe.scale.z = 0.08; g.add(pipe);
  g.add(mesh(rbox(0.03, 0.045, 0.006, 0.003), std(0xffd23f, { r: 0.6 }), R - 0.02, -0.07, 0.03));
  g.rotation.z = -PI / 4; g.position.y = -0.01;
  const w = new THREE.Group(); w.add(g); w.rotation.x = -0.15; return w;
};

B.headphones = () => {
  const g = new THREE.Group();
  const dark = gloss(0x262a44), soft = std(0x15172a, { r: 0.9 }), neon = glow(0x35e6ff, 1.5), metal = std(0xcdd6e6, { r: 0.2, m: 1 });
  g.add(mesh(new THREE.TorusGeometry(0.15, 0.017, 10, 40, PI), dark, 0, 0.02, 0));
  const pad = mesh(new THREE.TorusGeometry(0.146, 0.026, 10, 20, PI / 2.2), soft, 0, 0.02, 0); pad.rotation.z = (PI - PI / 2.2) / 2; g.add(pad);
  for (const sx of [-1, 1]) {
    const cup = new THREE.Group();
    const shell = mesh(new THREE.CylinderGeometry(0.078, 0.07, 0.05, 32), dark); shell.rotation.z = PI / 2 * sx;
    const cushion = mesh(new THREE.TorusGeometry(0.056, 0.024, 12, 28), soft, -sx * 0.03, 0, 0); cushion.rotation.y = PI / 2;
    const ring = mesh(new THREE.TorusGeometry(0.052, 0.007, 8, 32), neon, sx * 0.027, 0, 0); ring.rotation.y = PI / 2;
    const cap = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.008, 24), metal, sx * 0.028, 0, 0); cap.rotation.z = PI / 2;
    cup.add(shell, cushion, ring, cap, mesh(rbox(0.02, 0.07, 0.03, 0.008), metal, 0, 0.07, 0));
    cup.position.set(sx * 0.155, -0.06, 0);
    cup.rotation.y = -sx * 0.25;
    g.add(cup);
  }
  g.rotation.y = 0.55; g.position.y = -0.03;
  const w = new THREE.Group(); w.add(g); return w;
};

B.console = () => {
  const g = new THREE.Group();
  g.add(mesh(rbox(0.25, 0.155, 0.03, 0.012), std(0x23263a, { r: 0.35 })));
  g.add(mesh(rbox(0.075, 0.165, 0.036, 0.03), gloss(0x19c8ff), -0.155, 0, 0), mesh(rbox(0.075, 0.165, 0.036, 0.03), gloss(0xff4466), 0.155, 0, 0));
  const scr = decal(0.225, 0.13, canvasTex(256, 148, (c) => {
    c.fillStyle = grad(c, 0, 0, 0, 148, ['#6fd6ff', '#c9f3ff']); c.fillRect(0, 0, 256, 148);
    c.fillStyle = '#fff'; for (const [x, y] of [[40, 30], [170, 22]]) { rr(c, x, y, 48, 14, 7); c.fill(); }
    c.fillStyle = '#4cc95a'; c.fillRect(0, 112, 256, 36); c.fillStyle = '#b5713c'; c.fillRect(0, 124, 256, 24);
    c.fillStyle = '#ffcf3a'; for (const x of [120, 146, 172]) { c.beginPath(); c.arc(x, 66, 8, 0, 7); c.fill(); }
    c.fillStyle = '#ff4466'; rr(c, 60, 82, 26, 30, 6); c.fill(); c.fillStyle = '#ffe0c2'; c.fillRect(64, 90, 18, 10);
    c.fillStyle = '#e8a23a'; rr(c, 196, 84, 28, 28, 4); c.fill(); text(c, '?', 210, 99, 22, '#fff');
  }), { lit: false });
  scr.position.z = 0.0155; g.add(scr);
  const btn = std(0x1b1d2e, { r: 0.4 });
  for (const sx of [-1, 1]) {
    const stick = mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.014, 16), btn, sx * 0.155, sx * -0.035 + 0.0, 0.022); stick.rotation.x = PI / 2; g.add(stick);
    for (let i = 0; i < 4; i++) {
      const a = i * PI / 2;
      const b = mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.008, 10), sx < 0 ? btn : std([0xffd23f, 0x35e07a, 0x3aa0ff, 0xffffff][i], { r: 0.3 }), sx * 0.155 + Math.cos(a) * 0.02, sx * 0.035 + Math.sin(a) * 0.02, 0.02);
      b.rotation.x = PI / 2; g.add(b);
    }
  }
  g.rotation.set(-0.12, 0.2, 0.08);
  const w = new THREE.Group(); w.add(g); return w;
};

B.phone = () => {
  const g = new THREE.Group();
  const frame = std(0xc9cfdd, { r: 0.22, m: 1 });
  g.add(mesh(rbox(0.19, 0.39, 0.022, 0.03, 5), frame));
  const scr = decal(0.176, 0.376, canvasTex(256, 548, (c) => {
    rr(c, 0, 0, 256, 548, 38); c.clip();
    c.fillStyle = grad(c, 0, 0, 256, 548, ['#ff5cc8', '#7a5cff', '#27d3ff']); c.fillRect(0, 0, 256, 548);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(200, 150, 150, 0, 7); c.fill(); c.beginPath(); c.arc(30, 420, 170, 0, 7); c.fill();
    c.fillStyle = '#0c0c16'; rr(c, 88, 16, 80, 24, 12); c.fill();
    text(c, '9:41', 128, 110, 66, '#fff', { weight: 600 });
    const cols = ['#ff4d6d', '#ffd23f', '#35e07a', '#3aa0ff', '#fff', '#ff8a3d', '#b45cff', '#19c8c0'];
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { c.fillStyle = cols[(r * 4 + k * 3) % 8]; rr(c, 22 + k * 56, 210 + r * 64, 44, 44, 13); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, 14, 452, 228, 76, 26); c.fill();
    for (let k = 0; k < 4; k++) { c.fillStyle = cols[k + 2]; rr(c, 22 + k * 56, 468, 44, 44, 13); c.fill(); }
  }), { lit: false });
  scr.position.z = 0.0116; g.add(scr);
  g.add(mesh(rbox(0.004, 0.05, 0.008, 0.002), frame, 0.096, 0.07, 0), mesh(rbox(0.004, 0.03, 0.008, 0.002), frame, -0.096, 0.1, 0));
  g.add(mesh(rbox(0.085, 0.085, 0.01, 0.02), std(0xb4bbcc, { r: 0.3, m: 0.9 }), 0.04, 0.135, -0.014));
  for (const [x, y] of [[0.02, 0.155], [0.06, 0.155], [0.04, 0.115]]) {
    const lens = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 16), std(0x11131f, { r: 0.1, m: 0.8 }), x, y, -0.02); lens.rotation.x = PI / 2; g.add(lens);
  }
  g.rotation.set(-0.05, 0.25, 0.06);
  const w = new THREE.Group(); w.add(g); return w;
};

B.watch = () => {
  const g = new THREE.Group();
  const gold = std(0xffc95a, { r: 0.18, m: 1 }), steel = std(0xe9edf5, { r: 0.2, m: 1 });
  const cas = mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.034, 40), gold); cas.rotation.x = PI / 2;
  const bezel = mesh(new THREE.TorusGeometry(0.086, 0.013, 12, 40), gold, 0, 0, 0.017);
  const dial = decal(0.16, 0.16, canvasTex(256, 256, (c) => {
    c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fillStyle = grad(c, 0, 0, 256, 256, ['#0f6b55', '#063a30']); c.fill();
    for (let i = 0; i < 12; i++) { c.save(); c.translate(128, 128); c.rotate(i * PI / 6); c.fillStyle = '#ffe9a8'; rr(c, -5, -116, 10, i % 3 ? 20 : 34, 4); c.fill(); c.restore(); }
    c.lineCap = 'round'; c.strokeStyle = '#fff'; c.lineWidth = 11; c.beginPath(); c.moveTo(128, 128); c.lineTo(170, 86); c.stroke();
    c.lineWidth = 7; c.beginPath(); c.moveTo(128, 128); c.lineTo(100, 46); c.stroke();
    c.strokeStyle = '#ff5c5c'; c.lineWidth = 3; c.beginPath(); c.moveTo(128, 128); c.lineTo(180, 170); c.stroke();
    c.beginPath(); c.arc(128, 128, 10, 0, 7); c.fillStyle = '#ffd45a'; c.fill();
  }), { r: 0.2, m: 0.3 });
  dial.position.z = 0.0176;
  const glass = mesh(new THREE.CircleGeometry(0.08, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0, metalness: 1 }), 0, 0, 0.02);
  const crown = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), gold, 0.1, 0, 0); crown.rotation.z = PI / 2;
  g.add(cas, bezel, dial, glass, crown);
  for (const sy of [-1, 1]) for (let i = 0; i < 3; i++) {
    const link = mesh(rbox(0.1 - i * 0.008, 0.042, 0.014, 0.006), i % 2 ? gold : steel, 0, sy * (0.108 + i * 0.044), -0.006 - i * i * 0.012);
    link.rotation.x = sy * (0.15 + i * 0.3); g.add(link);
  }
  g.rotation.set(-0.1, -0.3, 0.12);
  const w = new THREE.Group(); w.add(g); return w;
};

B.keys = () => {
  const g = new THREE.Group();
  const metal = std(0xdfe6f0, { r: 0.18, m: 1 }), black = gloss(0x16171f);
  g.add(mesh(rbox(0.13, 0.2, 0.042, 0.04, 5), black, -0.06, -0.08, 0));
  const emblem = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.006, 6), std(0xffc21a, { r: 0.2, m: 1, e: 0xff9a00, ei: 0.3 }), -0.06, -0.015, 0.022); emblem.rotation.x = PI / 2; g.add(emblem);
  [[0xdfe6f0, -0.07], [0xdfe6f0, -0.105], [0xff3b4e, -0.14]].forEach(([c, y]) => g.add(mesh(rbox(0.07, 0.024, 0.008, 0.01), std(c, { r: 0.4 }), -0.06, y, 0.021)));
  const ring = mesh(new THREE.TorusGeometry(0.06, 0.007, 8, 32), metal, 0, 0.1, 0); ring.rotation.y = 0.5; g.add(ring);
  g.add(mesh(rbox(0.03, 0.05, 0.01, 0.005), metal, -0.05, 0.04, 0));
  const blade = mesh(rbox(0.032, 0.16, 0.008, 0.004), metal, 0.035, -0.02, -0.02); blade.rotation.z = 0.35; g.add(blade);
  for (let i = 0; i < 4; i++) { const n = mesh(rbox(0.014, 0.014, 0.008, 0.002), metal, 0.062 + i * 0.008, -0.04 - i * 0.022, -0.02); n.rotation.z = 0.35; g.add(n); }
  // sportscar charm
  const car = new THREE.Group(), red = gloss(0xff2e3e);
  car.add(mesh(rbox(0.16, 0.034, 0.07, 0.016), red), mesh(rbox(0.075, 0.03, 0.058, 0.014), std(0x1c2233, { r: 0.1, m: 0.6 }), -0.01, 0.028, 0));
  car.add(mesh(rbox(0.012, 0.008, 0.074, 0.003), red, -0.076, 0.03, 0), mesh(rbox(0.01, 0.012, 0.05, 0.003), glow(0xfff2a8, 1.4), 0.079, 0.002, 0));
  for (const x of [-0.05, 0.05]) for (const z of [-0.036, 0.036]) { const wh = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.014, 14), std(0x15161c, { r: 0.7 }), x, -0.016, z); wh.rotation.x = PI / 2; car.add(wh); }
  car.position.set(0.1, 0.02, 0.03); car.rotation.set(0.25, -0.5, -0.35);
  const chain = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.07, 6), metal, 0.055, 0.07, 0.015); chain.rotation.z = 0.9;
  g.add(car, chain);
  g.position.set(-0.02, 0.01, 0);
  const w = new THREE.Group(); w.add(g); return w;
};

B.goldbar = () => {
  const g = new THREE.Group();
  const gold = std(0xffc02e, { r: 0.2, m: 1, e: 0x8a4a00, ei: 0.25 });
  const bar = () => {
    const s = new THREE.Shape(); s.moveTo(-0.085, -0.045); s.lineTo(0.085, -0.045); s.lineTo(0.062, 0.045); s.lineTo(-0.062, 0.045); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
    geo.translate(0, 0, -0.15); geo.rotateY(PI / 2);
    const b = new THREE.Group(); b.add(mesh(geo, gold));
    const st = decal(0.2, 0.09, canvasTex(256, 116, (c) => {
      c.strokeStyle = 'rgba(120,60,0,.55)'; c.lineWidth = 5; rr(c, 8, 8, 240, 100, 12); c.stroke();
      text(c, 'FINE GOLD', 128, 42, 34, 'rgba(120,60,0,.7)'); text(c, '999.9', 128, 82, 30, 'rgba(120,60,0,.7)');
    }), { r: 0.25, m: 1 });
    st.rotation.x = -PI / 2; st.position.y = 0.0535; b.add(st);
    return b;
  };
  const b1 = bar(); b1.position.set(0, -0.05, 0);
  const b2 = bar(); b2.position.set(0.01, 0.05, 0); b2.rotation.y = 0.5;
  g.add(b1, b2);
  g.rotation.x = 0.55; g.position.y = -0.02;
  const w = new THREE.Group(); w.add(g); return w;
};

B.diamond = () => {
  const g = new THREE.Group();
  const m = new THREE.MeshPhysicalMaterial({ color: 0xbff4ff, roughness: 0.03, metalness: 0.85, flatShading: true, emissive: 0x39c9ff, emissiveIntensity: 0.45, envMapIntensity: 2.2 });
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.175, 0.075, 8), m, 0, 0.075, 0));
  const pav = mesh(new THREE.ConeGeometry(0.175, 0.23, 8), m, 0, -0.078, 0); pav.rotation.x = PI; g.add(pav);
  g.rotation.set(0.35, 0.2, 0); g.position.y = 0.0;
  const w = new THREE.Group(); w.add(g); return w;
};

// ---- public API ---------------------------------------------------------------
const protos = {};
export const twinklers = new Set();

function sparkle(color, x, y, z, s) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.position.set(x, y, z); sp.userData = { tw: true, s, ph: Math.random() * 6.28, sp: 2 + Math.random() * 2 };
  return sp;
}

/** Returns a fresh instance (shared geometry/materials) of an item model. */
export function makeItem(id) {
  if (!protos[id]) {
    const model = B[id]();
    model.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    protos[id] = model;
  }
  const root = new THREE.Group();
  root.add(protos[id].clone(true));
  const tier = ITEM[id].tier;
  if (tier >= 2) {
    const col = new THREE.Color(TIERS[tier].color).lerp(new THREE.Color(0xffffff), 0.45);
    const n = tier - 1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + 0.8;
      const sp = sparkle(col, Math.cos(a) * 0.15, Math.sin(a) * 0.15 + 0.02, 0.12, 0.09 + tier * 0.02);
      root.add(sp); twinklers.add(sp);
    }
  }
  root.userData.itemId = id;
  return root;
}
export function disposeItem(root) {
  root.traverse((o) => { if (o.userData.tw) { twinklers.delete(o); o.material.dispose(); } });
  root.removeFromParent();
}
export function updateTwinklers(t) {
  for (const s of twinklers) {
    const u = s.userData, k = Math.max(0, Math.sin(t * u.sp + u.ph));
    s.scale.setScalar(u.s * (0.2 + k * k));
    s.material.rotation = t * 0.6 + u.ph;
  }
}
