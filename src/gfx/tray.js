// Lightweight rigid-body-ish tumbling for dropped items: each prize is a sphere
// proxy that free-falls, bounces off the trough and the other prizes, spins
// freely in the air and settles leaning at a random angle.
import * as THREE from 'three';
import { rand } from './anim.js';

const G = 17, STEP = 1 / 120;
const dq = new THREE.Quaternion(), axis = new THREE.Vector3();

export function createTray(box) {
  // box: { x0, x1, floor, top, zBack, zFront } in world units (limits for body centres)
  const bodies = [];

  function add(obj, r, vel, onLand) {
    const b = {
      o: obj, r, v: new THREE.Vector3(vel.x, vel.y, vel.z),
      w: new THREE.Vector3(rand(-1, 1), rand(-0.4, 0.4), rand(-1, 1)).normalize().multiplyScalar(rand(7, 12)),
      rest: new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(-1.0, -0.45), rand(-0.9, 0.9), rand(-0.7, 0.7))),
      onLand, landed: false, grounded: 0, sleep: 0,
    };
    bodies.push(b);
    return b;
  }
  function land(b, speed) {
    if (b.landed) return;
    b.landed = true; b.onLand?.(speed);
  }

  function step(dt) {
    for (const b of bodies) {
      if (b.sleep > 0.6) continue;
      const p = b.o.position, inTray = p.y < box.top + 0.1;
      b.v.y -= G * dt;
      if (inTray) b.v.z += 2.2 * dt; // the trough slopes toward the front
      p.addScaledVector(b.v, dt);
      b.grounded = Math.max(0, b.grounded - dt);
      // floor
      const fy = box.floor + b.r * 0.8;
      if (p.y < fy) {
        p.y = fy;
        const hit = -b.v.y;
        if (hit > 0.9) { b.v.y = hit * 0.36; b.w.multiplyScalar(0.55).add(axis.set(rand(-3, 3), 0, rand(-3, 3))); } else b.v.y = 0;
        b.v.x *= 0.86; b.v.z *= 0.86; b.grounded = 0.12;
        land(b, hit);
      }
      // walls
      if (inTray) {
        if (p.x < box.x0 + b.r) { p.x = box.x0 + b.r; b.v.x = Math.abs(b.v.x) * 0.4; }
        if (p.x > box.x1 - b.r) { p.x = box.x1 - b.r; b.v.x = -Math.abs(b.v.x) * 0.4; }
        if (p.z < box.zBack) { p.z = box.zBack; b.v.z = Math.abs(b.v.z) * 0.3; }
      }
      if (p.z > box.zFront) { p.z = box.zFront; b.v.z = -Math.abs(b.v.z) * 0.3; }
    }
    // prize vs prize
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      if (a.sleep > 0.6 && b.sleep > 0.6) continue;
      const d = axis.subVectors(b.o.position, a.o.position), min = (a.r + b.r) * 0.82, len = d.length();
      if (len >= min || len < 1e-5) continue;
      d.multiplyScalar(1 / len);
      const push = (min - len) / 2;
      a.o.position.addScaledVector(d, -push); b.o.position.addScaledVector(d, push);
      const rel = (b.v.x - a.v.x) * d.x + (b.v.y - a.v.y) * d.y + (b.v.z - a.v.z) * d.z;
      if (rel < 0) {
        const jn = -rel * 0.62;
        a.v.addScaledVector(d, -jn); b.v.addScaledVector(d, jn);
        a.sleep = b.sleep = 0;
        if (-rel > 0.9) { land(a, -rel); land(b, -rel); }
      }
      if (d.y > 0.35) b.grounded = 0.12; else if (d.y < -0.35) a.grounded = 0.12;
    }
    // spin, settle, sleep
    for (const b of bodies) {
      if (b.sleep > 0.6) continue;
      const ws = b.w.length();
      if (ws > 1e-3) { dq.setFromAxisAngle(axis.copy(b.w).multiplyScalar(1 / ws), ws * dt); b.o.quaternion.premultiply(dq); }
      if (b.grounded > 0) {
        b.w.multiplyScalar(Math.exp(-7 * dt));
        b.o.quaternion.slerp(b.rest, 1 - Math.exp(-5 * dt));
        b.v.x *= Math.exp(-4 * dt); b.v.z *= Math.exp(-4 * dt);
        b.sleep = b.v.lengthSq() < 0.02 ? b.sleep + dt : 0;
      } else b.sleep = 0;
    }
  }

  function update(dt) {
    let left = Math.min(dt, 0.25);
    while (left > 1e-5) { const h = Math.min(STEP, left); step(h); left -= h; }
  }
  function kick(filter, up = 4) {
    for (const b of bodies) if (filter(b.o)) { b.v.y = up; b.v.x += rand(-0.6, 0.6); b.w.set(rand(-6, 6), rand(-6, 6), rand(-6, 6)); b.sleep = 0; }
  }
  function clear() { return bodies.splice(0).map((b) => b.o); }

  return { add, update, kick, clear, bodies, box };
}
