// Particles, confetti, coins, shockwave rings and the hero sunburst.
import * as THREE from 'three';
import { canvasTex, softDotTex } from './util.js';
import { tween, E, rand } from './anim.js';

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export function buildVfx(scene, camera) {
  // ---- glow points -------------------------------------------------------
  const N = 700;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), aux = new Float32Array(N * 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aux', new THREE.BufferAttribute(aux, 2));
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { scale: { value: 600 } },
    vertexShader: 'attribute vec2 aux; attribute vec3 color; varying vec3 c; varying float a; uniform float scale; void main(){ c = color; a = aux.y; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aux.x * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 c; varying float a; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float core = smoothstep(0.55, 0.0, d); float halo = smoothstep(1.0, 0.2, d) * 0.55; gl_FragColor = vec4(c * (1.0 + core * 1.8), (halo + core) * a); }',
  }));
  points.frustumCulled = false; points.renderOrder = 20;
  scene.add(points);
  const parts = Array.from({ length: N }, () => ({ life: 0 }));
  let cursor = 0;
  function spark(p, v, color, o = {}) {
    const q = parts[cursor]; cursor = (cursor + 1) % N;
    q.x = p.x; q.y = p.y; q.z = p.z; q.vx = v.x; q.vy = v.y; q.vz = v.z;
    q.max = q.life = o.life ?? 0.8; q.size = o.size ?? 0.12; q.g = o.gravity ?? 2; q.drag = o.drag ?? 1.5;
    q.r = color.r; q.gg = color.g; q.b = color.b;
  }
  const c1 = new THREE.Color();
  function burst(p, color, n = 20, o = {}) {
    c1.set(color);
    const sp = o.speed ?? 2.2;
    for (let i = 0; i < n; i++) {
      const a = rand(6.283), b = Math.acos(rand(-1, 1)), s = sp * rand(0.35, 1);
      spark(p, { x: Math.sin(b) * Math.cos(a) * s, y: Math.cos(b) * s + (o.up ?? 0.6), z: Math.sin(b) * Math.sin(a) * s * (o.flat ?? 1) }, c1, { life: rand(0.4, 1) * (o.life ?? 0.9), size: rand(0.5, 1) * (o.size ?? 0.14), gravity: o.gravity ?? 2.5, drag: o.drag ?? 1.6 });
    }
  }
  function trail(p, color, size = 0.1) {
    c1.set(color);
    spark({ x: p.x + rand(-0.06, 0.06), y: p.y + rand(-0.06, 0.06), z: p.z + rand(-0.04, 0.04) }, { x: rand(-0.2, 0.2), y: rand(0, 0.5), z: rand(-0.1, 0.1) }, c1, { life: rand(0.3, 0.6), size: size * rand(0.6, 1.2), gravity: -0.3, drag: 2 });
  }

  // ---- confetti + coins --------------------------------------------------
  function pool(mesh, n) {
    mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < n; i++) { mesh.setMatrixAt(i, ZERO); mesh.setColorAt(i, c1.set(0xffffff)); }
    scene.add(mesh);
    return { mesh, n, items: Array.from({ length: n }, () => ({ life: 0 })), cur: 0 };
  }
  const conf = pool(new THREE.InstancedMesh(new THREE.PlaneGeometry(0.075, 0.12), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), 520), 520);
  const coins = pool(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.075, 0.018, 14), new THREE.MeshStandardMaterial({ color: 0xffc533, metalness: 1, roughness: 0.25, emissive: 0x7a4a00, emissiveIntensity: 0.6 }), 160), 160);
  const CONF_COLS = [0xff3d6e, 0xffd23f, 0x35e07a, 0x3aa0ff, 0xb45cff, 0xff8a3d, 0xffffff, 0x19c8c0];
  function emit(pl, p, v, o = {}) {
    const q = pl.items[pl.cur]; pl.cur = (pl.cur + 1) % pl.n;
    q.x = p.x; q.y = p.y; q.z = p.z; q.vx = v.x; q.vy = v.y; q.vz = v.z;
    q.rx = rand(6.28); q.ry = rand(6.28); q.rz = rand(6.28); q.wx = rand(-9, 9); q.wy = rand(-9, 9); q.wz = rand(-6, 6);
    q.life = q.max = o.life ?? 2.4; q.g = o.gravity ?? 5; q.drag = o.drag ?? 1.2; q.s = o.scale ?? 1; q.floor = o.floor ?? -1e9;
    if (o.color !== undefined) { pl.mesh.setColorAt(pl.cur === 0 ? pl.n - 1 : pl.cur - 1, c1.set(o.color)); pl.mesh.instanceColor.needsUpdate = true; }
  }
  function confetti(p, n = 60, o = {}) {
    const sp = o.speed ?? 4.5, cols = o.colors || CONF_COLS;
    for (let i = 0; i < n; i++) {
      const a = rand(6.283), s = sp * rand(0.3, 1), up = rand(0.4, 1) * (o.up ?? 5);
      emit(conf, { x: p.x + rand(-0.1, 0.1), y: p.y, z: p.z + rand(-0.1, 0.1) }, { x: Math.cos(a) * s * (o.wide ?? 1), y: up, z: Math.sin(a) * s * 0.6 + (o.forward ?? 0.5) }, { color: cols[i % cols.length], life: rand(1.6, 3), gravity: 4.2, drag: 1.5, scale: rand(0.8, 1.5) * (o.scale ?? 1) });
    }
  }
  function confettiRain(n = 120, w = 8, y = 9, z = 1.5) {
    for (let i = 0; i < n; i++) emit(conf, { x: rand(-w / 2, w / 2), y: y + rand(0, 4), z: z + rand(-1.5, 1.5) }, { x: rand(-0.6, 0.6), y: rand(-2, 0), z: rand(-0.3, 0.3) }, { color: CONF_COLS[i % CONF_COLS.length], life: rand(3, 5), gravity: 1.6, drag: 0.9, scale: rand(1, 1.8) });
  }
  function coinFountain(p, n = 40, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(6.283), s = rand(0.6, 2.4) * (o.speed ?? 1);
      emit(coins, p, { x: Math.cos(a) * s, y: rand(4, 8) * (o.up ?? 1), z: Math.sin(a) * s * 0.4 + 1.2 }, { life: rand(1.6, 2.6), gravity: 11, drag: 0.2, scale: rand(0.9, 1.4), floor: -0.02 });
    }
  }
  function stepPool(pl, dt, flutter) {
    let dirty = false;
    for (let i = 0; i < pl.n; i++) {
      const q = pl.items[i];
      if (q.life <= 0) continue;
      dirty = true;
      q.life -= dt;
      if (q.life <= 0) { pl.mesh.setMatrixAt(i, ZERO); continue; }
      const d = Math.exp(-q.drag * dt);
      q.vx *= d; q.vz *= d; q.vy = q.vy * (flutter ? d : 1) - q.g * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (flutter) q.x += Math.sin(q.life * 5 + q.rz) * dt * 0.5;
      if (q.y < q.floor) { q.y = q.floor; q.vy = Math.abs(q.vy) * 0.45; q.vx *= 0.7; q.vz *= 0.7; }
      q.rx += q.wx * dt; q.ry += q.wy * dt; q.rz += q.wz * dt;
      const k = Math.min(1, q.life * 3) * q.s;
      tmpM.compose(tmpP.set(q.x, q.y, q.z), tmpQ.setFromEuler(tmpE.set(q.rx, q.ry, q.rz)), tmpS.set(k, k, k));
      pl.mesh.setMatrixAt(i, tmpM);
    }
    if (dirty) pl.mesh.instanceMatrix.needsUpdate = true;
  }

  // ---- rings -------------------------------------------------------------
  const ringGeo = new THREE.RingGeometry(0.86, 1, 56);
  const rings = Array.from({ length: 8 }, () => {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    m.visible = false; m.renderOrder = 19; scene.add(m); return m;
  });
  let ri = 0;
  function ring(p, color, size = 1, dur = 0.5) {
    const m = rings[ri]; ri = (ri + 1) % rings.length;
    m.position.copy(p); m.quaternion.copy(camera.quaternion); m.material.color.set(color).multiplyScalar(1.6); m.visible = true;
    return tween(dur, (k) => { m.scale.setScalar(0.05 + k * size); m.material.opacity = (1 - k) * 0.9; }, E.out).then(() => { m.visible = false; });
  }

  // ---- hero sunburst -----------------------------------------------------
  const burstTex = canvasTex(512, 512, (g) => {
    g.translate(256, 256);
    for (let i = 0; i < 16; i++) {
      g.rotate(Math.PI / 8);
      const gr = g.createLinearGradient(0, 0, 0, -256); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(-32, -256); g.lineTo(32, -256); g.fill();
    }
  });
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: burstTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: softDotTex(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  sun.renderOrder = 30; sunGlow.renderOrder = 31; sun.visible = sunGlow.visible = false;
  scene.add(sun, sunGlow);
  const sunState = { on: 0 };
  function sunburst(p, color, size) {
    sun.position.copy(p); sunGlow.position.copy(p);
    sun.material.color.set(color).multiplyScalar(1.5); sunGlow.material.color.set(color).lerp(new THREE.Color(0xffffff), 0.5).multiplyScalar(1.3);
    sun.visible = sunGlow.visible = true; sunState.size = size;
    return tween(0.35, (k) => { sunState.on = k; }, E.outBack);
  }
  function sunburstOff() { return tween(0.3, (k) => { sunState.on = 1 - k; }).then(() => { sun.visible = sunGlow.visible = false; }); }

  function update(dt, t) {
    let any = false;
    for (let i = 0; i < N; i++) {
      const q = parts[i];
      if (q.life <= 0) { if (aux[i * 2 + 1] !== 0) { aux[i * 2 + 1] = 0; any = true; } continue; }
      any = true; q.life -= dt;
      const d = Math.exp(-q.drag * dt);
      q.vx *= d; q.vy = q.vy * d - q.g * dt; q.vz *= d;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      const k = Math.max(0, q.life / q.max);
      pos[i * 3] = q.x; pos[i * 3 + 1] = q.y; pos[i * 3 + 2] = q.z;
      col[i * 3] = q.r; col[i * 3 + 1] = q.gg; col[i * 3 + 2] = q.b;
      aux[i * 2] = q.size * (0.4 + 0.6 * k); aux[i * 2 + 1] = Math.min(1, k * 2.5);
    }
    if (any) { geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = geo.attributes.aux.needsUpdate = true; }
    stepPool(conf, dt, true); stepPool(coins, dt, false);
    if (sun.visible) {
      sun.quaternion.copy(camera.quaternion); sunGlow.quaternion.copy(camera.quaternion);
      sun.rotateZ(t * 0.7);
      const s = sunState.size * sunState.on * (1 + Math.sin(t * 5) * 0.04);
      sun.scale.setScalar(Math.max(0.001, s)); sunGlow.scale.setScalar(Math.max(0.001, s * 0.75));
      sun.material.opacity = 0.75 * sunState.on; sunGlow.material.opacity = 0.9 * sunState.on;
    }
  }
  function setPointScale(px) { points.material.uniforms.scale.value = px; }

  return { burst, trail, confetti, confettiRain, coinFountain, ring, sunburst, sunburstOff, update, setPointScale };
}
