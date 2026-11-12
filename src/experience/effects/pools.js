import * as THREE from "three";
import { uniforms } from "../theme";

// Datos de los efectos breves (polvo, gotas y aros) y las funciones que los
// lanzan. Los dibuja effects/Bursts.jsx; ver allí cómo funcionan.

export const POOLS = { dust: 72, drop: 72, ring: 28 };

// origin: xyz donde nace · motion: xyz de impulso (m/s) · life: nacimiento, duración, tamaño, semilla.
function createPool(count) {
 const pool = {
  count,
  next: 0,
  origin: new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3),
  motion: new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3),
  life: new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4),
 };
 for (let i = 0; i < count; i++) pool.life.setXYZW(i, -1e4, 1, 0, 0); // todas apagadas
 return pool;
}
export const pools = { dust: createPool(POOLS.dust), drop: createPool(POOLS.drop), ring: createPool(POOLS.ring) };

function emitOne(pool, x, y, z, vx, vy, vz, duration, size) {
 const i = pool.next++ % pool.count;
 pool.origin.setXYZ(i, x, y, z);
 pool.motion.setXYZ(i, vx, vy, vz);
 pool.life.setXYZW(i, uniforms.uTime.value, duration, size, Math.random());
 pool.origin.needsUpdate = pool.motion.needsUpdate = pool.life.needsUpdate = true;
}

// Polvo: `count` bocanadas que salen hacia fuera (o hacia atrás, con `back`).
export function dust(x, y, z, { count = 1, speed = 0.7, size = 0.26, duration = 0.65, back = null } = {}) {
 for (let i = 0; i < count; i++) {
  const angle = Math.random() * Math.PI * 2;
  const k = speed * (0.5 + Math.random() * 0.7);
  const vx = back ? back.x * k + (Math.random() - 0.5) * 0.5 : Math.cos(angle) * k;
  const vz = back ? back.z * k + (Math.random() - 0.5) * 0.5 : Math.sin(angle) * k;
  emitOne(pools.dust, x + (Math.random() - 0.5) * 0.2, y + 0.06, z + (Math.random() - 0.5) * 0.2, vx, 0.35 + Math.random() * 0.45, vz, duration * (0.75 + Math.random() * 0.5), size * (0.7 + Math.random() * 0.6));
 }
}

// Aro que se abre sobre el agua.
export function ring(x, y, z, { size = 0.7, duration = 1.1 } = {}) {
 emitOne(pools.ring, x, y + 0.02, z, 0, 0, 0, duration, size);
}

export const GRAVITY = 9.8;

// Salpicadura: gotas que saltan y caen, y un aro.
export function splash(x, y, z, { count = 10, speed = 2.3, size = 0.07 } = {}) {
 for (let i = 0; i < count; i++) {
  const angle = Math.random() * Math.PI * 2;
  const out = speed * (0.25 + Math.random() * 0.55);
  const up = speed * (0.7 + Math.random() * 0.7);
  // Duración: lo que tarda en volver a la altura de la que salió.
  emitOne(pools.drop, x + Math.cos(angle) * 0.15, y + 0.03, z + Math.sin(angle) * 0.15, Math.cos(angle) * out, up, Math.sin(angle) * out, (2 * up) / GRAVITY, size * (0.6 + Math.random() * 0.8));
 }
 ring(x, y, z, { size: 0.5 + count * 0.035 });
}
