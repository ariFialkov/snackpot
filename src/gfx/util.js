import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const FONT = "'Fredoka Variable', 'Fredoka', system-ui, sans-serif";

export function std(color, o = {}) {
  const { r = 0.4, m = 0, e = 0x000000, ei = 1, ...rest } = o;
  return new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m, emissive: e, emissiveIntensity: ei, ...rest });
}
// glossy toy plastic
export function gloss(color, o = {}) {
  const { r = 0.28, m = 0, ...rest } = o;
  return new THREE.MeshPhysicalMaterial({ color, roughness: r, metalness: m, clearcoat: 1, clearcoatRoughness: 0.15, ...rest });
}
// unlit, HDR-bright (feeds the bloom pass)
export function glow(color, k = 1.6) {
  const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  m.color.multiplyScalar(k);
  return m;
}
export function rbox(w, h, d, r = 0.03, seg = 3) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.max(0.001, Math.min(r, Math.min(w, h, d) / 2 - 0.0005)));
}
export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// flat textured label sitting just above a surface
export function decal(w, h, tex, o = {}) {
  const { lit = true, r = 0.4, m = 0, ...rest } = o;
  const mat = lit
    ? new THREE.MeshStandardMaterial({ map: tex, roughness: r, metalness: m, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, ...rest })
    : new THREE.MeshBasicMaterial({ map: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, ...rest });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}
export function text(g, str, x, y, size, fill, o = {}) {
  g.font = `${o.weight || 700} ${size}px ${FONT}`;
  g.textAlign = o.align || 'center';
  g.textBaseline = 'middle';
  if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = o.lw || size * 0.18; g.strokeStyle = o.stroke; g.strokeText(str, x, y); }
  g.fillStyle = fill;
  g.fillText(str, x, y);
}
export function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
export function grad(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  return gr;
}
export function roundedRectPath(P, x, y, w, h, r) {
  P.moveTo(x + r, y);
  P.lineTo(x + w - r, y);
  P.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  P.lineTo(x + w, y + h - r);
  P.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  P.lineTo(x + r, y + h);
  P.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  P.lineTo(x, y + r);
  P.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return P;
}
// a box inflated into a sealed-bag "pillow"; the +z face keeps 0..1 UVs
export function pillowGeo(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d, 14, 14, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const fx = Math.max(0, 1 - (2 * x / w) ** 2), fy = Math.max(0, 1 - (2 * y / h) ** 2);
    p.setZ(i, Math.sign(z) * (d / 2) * Math.sqrt(fx) * fy ** 0.3);
  }
  geo.computeVertexNormals();
  return geo;
}
let _soft;
export function softDotTex() {
  return (_soft ||= canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.75)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }));
}
let _star;
export function starTex() {
  return (_star ||= canvasTex(128, 128, (g) => {
    g.translate(64, 64);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(-64, -64, 128, 128);
    g.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
      g.rotate(Math.PI / 2);
      g.beginPath(); g.moveTo(0, -5); g.quadraticCurveTo(8, -3, 62, 0); g.quadraticCurveTo(8, 3, 0, 5); g.fill();
    }
  }));
}
