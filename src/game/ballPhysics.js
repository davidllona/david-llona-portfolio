import * as THREE from "three";

// Física del balón, propia (el proyecto no usa ningún motor externo). Un sólido
// esférico con velocidad y giro, integrado a pasos cortos:
//  · gravedad, resistencia del aire y efecto Magnus (el giro curva el vuelo);
//  · suelo con bote y rozamiento: el deslizamiento se convierte en rodadura
//    (y la rodadura pierde velocidad poco a poco en la hierba);
//  · choques contra cápsulas (postes, larguero, maniquíes) fijas o en
//    movimiento, con restitución y rozamiento que también cambian el giro.
// Nada sigue una trayectoria escrita: todo sale de estas fuerzas y choques.

const INERTIA = 2 / 3; // esfera hueca: I = 2/3 · m · r²
const AIR_DRAG = 0.011; // 1/m
const MAGNUS = 0.0062; // aceleración lateral por (rad/s · m/s)
const SPIN_DECAY = 0.55; // 1/s
const ROLL_RESISTANCE = 1.25; // 1/s sobre hierba

const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
const normal = new THREE.Vector3(), slip = new THREE.Vector3(), arm = new THREE.Vector3(), surface = new THREE.Vector3();

export function createBall(radius = 0.22) {
 return { position: new THREE.Vector3(), velocity: new THREE.Vector3(), spin: new THREE.Vector3(), radius, resting: false };
}

// Cápsula: segmento de `from` a `to` con radio. `velocity`: la de la propia
// cápsula si se mueve (portero, barrera). `tag`: qué es, para sonidos y reglas.
export function capsule(tag, from, to, radius, { restitution = 0.55, friction = 0.35 } = {}) {
 return { tag, from: new THREE.Vector3(...from), to: new THREE.Vector3(...to), radius, restitution, friction, velocity: new THREE.Vector3(), active: true };
}

// Resuelve un contacto: el balón está tocando una superficie de normal `n`
// (hacia el balón) que se mueve a `speed`. Rebota y aplica el rozamiento, que
// cambia a la vez la velocidad y el giro. Devuelve la velocidad de impacto.
function resolve(ball, n, restitution, friction, speed, minBounce = 0.5) {
 const v = ball.velocity;
 a.copy(v).sub(speed);
 const along = a.dot(n);
 if (along >= 0) return 0;
 const bounce = -along > minBounce ? restitution : 0;
 const push = -(1 + bounce) * along; // impulso normal por unidad de masa
 v.addScaledVector(n, push);
 // Velocidad del punto de contacto respecto a la superficie, en el plano tangente.
 arm.copy(n).multiplyScalar(-ball.radius);
 slip.copy(v).sub(speed).add(b.copy(ball.spin).cross(arm));
 slip.addScaledVector(n, -slip.dot(n));
 const sliding = slip.length();
 if (sliding > 1e-4) {
  // Impulso que anularía el deslizamiento, limitado por el rozamiento de Coulomb.
  const needed = sliding / (1 + 1 / INERTIA);
  const impulse = Math.min(needed, friction * push);
  c.copy(slip).multiplyScalar(-impulse / sliding);
  v.add(c);
  ball.spin.add(b.copy(arm).cross(c).multiplyScalar(1 / (INERTIA * ball.radius * ball.radius)));
 }
 return -along;
}

// Un paso. `ground(x, z)`: altura del suelo. `colliders`: cápsulas. `report`:
// (tag, velocidad de impacto, cápsula) en cada choque. `dt` corto (≤ 1/200 s).
export function stepBall(ball, dt, { gravity = 14, ground, colliders = [], report }) {
 const { position: p, velocity: v, spin: w, radius } = ball;
 const speed = v.length();
 // Aire: frena con el cuadrado de la velocidad; el giro curva la trayectoria.
 v.addScaledVector(v, -AIR_DRAG * speed * dt);
 v.addScaledVector(a.copy(w).cross(v), MAGNUS * dt);
 v.y -= gravity * dt;
 w.multiplyScalar(Math.exp(-SPIN_DECAY * dt));
 p.addScaledVector(v, dt);

 // Suelo.
 const floor = ground(p.x, p.z) + radius;
 if (p.y < floor) {
  p.y = floor;
  normal.set(0, 1, 0);
  const impact = resolve(ball, normal, 0.56, 0.5, surface.set(0, 0, 0), 0.9);
  if (impact > 0.9) report?.("grass", impact, null);
  // Peso apoyado: rozamiento continuo (lo lleva a rodar) y resistencia a la rodadura.
  arm.set(0, -radius, 0);
  slip.copy(v).add(b.copy(w).cross(arm));
  slip.y = 0;
  const sliding = slip.length();
  if (sliding > 1e-4) {
   const impulse = Math.min(sliding / (1 + 1 / INERTIA), 0.5 * gravity * dt);
   c.copy(slip).multiplyScalar(-impulse / sliding);
   v.add(c);
   w.add(b.copy(arm).cross(c).multiplyScalar(1 / (INERTIA * radius * radius)));
  }
  const keep = Math.exp(-ROLL_RESISTANCE * dt);
  v.x *= keep;
  v.z *= keep;
  w.multiplyScalar(keep);
 }

 // Cápsulas.
 for (const one of colliders) {
  if (!one.active) continue;
  a.copy(one.to).sub(one.from);
  const length2 = a.lengthSq();
  const t = length2 > 1e-8 ? THREE.MathUtils.clamp(b.copy(p).sub(one.from).dot(a) / length2, 0, 1) : 0;
  b.copy(one.from).addScaledVector(a, t); // punto más cercano del eje
  normal.copy(p).sub(b);
  const distance = normal.length();
  const reach = radius + one.radius;
  if (distance >= reach || distance < 1e-6) continue;
  normal.multiplyScalar(1 / distance);
  p.copy(b).addScaledVector(normal, reach);
  const impact = resolve(ball, normal, one.restitution, one.friction, one.velocity);
  if (impact > 0.4) report?.(one.tag, impact, one);
 }
}

// Giro acumulado del balón, para dibujarlo: avanza un cuaternión con su velocidad angular.
const turn = new THREE.Quaternion();
export function spinMesh(quaternion, spin, dt) {
 const rate = spin.length();
 if (rate < 1e-4) return;
 turn.setFromAxisAngle(a.copy(spin).multiplyScalar(1 / rate), rate * dt);
 quaternion.premultiply(turn);
}
