import * as THREE from "three";
import { emit, player } from "../../experience/state";
import { BASKET, COURT, COURT_FENCE, WATER_LEVEL, height as terrainHeight } from "./layout";

// La pista de baloncesto, sin dibujar nada: medidas, la física del balón y el
// estado que comparten el balón, los defensas y el concurso de triples
// (Court.jsx y Triples.jsx).

// Lo que comparten. `holding`: el jugador lleva el balón; `contest`: hay
// concurso en marcha (los defensas se apartan y la pista no avisa de cada
// tiro: lo hace el concurso); `launch`: si está, el balón soltado se lo queda
// quien lo puso (el concurso), que le da su física y su valor. `ball`, `grab`,
// `toStand` y `release` los pone el balón al montarse.
export const play = { holding: false, contest: false, launch: null, ball: null, grab: null, toStand: null, release: null };

export const { hoop, ballStand, center } = BASKET;
export const court = COURT;
export const fence = COURT_FENCE;

// ── Medidas ─────────────────────────────────────────────────────────────────
export const BALL_RADIUS = 0.2; // mayor que uno real: se ve desde arriba
export const BALL_GRAVITY = 11;
export const MONEY_COLOR = "#2f8fe0"; // el balón de color del concurso de triples
export const GRAB_DISTANCE = 2.3;
export const MAX_DISTANCE = 15; // si te lo llevas más lejos, vuelve a su soporte
export const IDLE_BEFORE_RETURN = 7; // s parado lejos de ti antes de volver solo
export const RIM_RADIUS = 0.37; // aro generoso: el balón también es más grande de lo normal
export const RIM = { x: hoop.x - 0.25 - RIM_RADIUS, y: hoop.rimHeight, z: hoop.z };
// El tablero y el poste, medidos sobre el modelo ya escalado (tools/assets/hoop.py).
export const BOARD = { x: RIM.x + 0.69, y: RIM.y + 0.35, z: hoop.z, half: [0.045, 0.6, 0.85] };
export const STAND_TOP = 0.95;
export const HOME = [ballStand.x, STAND_TOP + BALL_RADIUS, ballStand.z];
// Cilindros con los que choca el balón: su soporte y el poste.
export const PILLARS = [
 { x: ballStand.x, z: ballStand.z, r: 0.2, h: STAND_TOP - 0.06 },
 { x: RIM.x + 1.0, z: hoop.z, r: 0.13, h: RIM.y + 0.3 },
];
// Tiro en suspensión. El momento de soltar se mide con la velocidad vertical
// del salto: −1 al despegar, 0 en lo más alto, +1 al volver al suelo.
export const DIP_TIME = 0.16; // s que se agacha antes de saltar
export const PERFECT = 0.2; // margen, en esa medida, del tiro perfecto (unos 160 ms)
export const SHOOT_RANGE = 12.5; // m al aro desde los que se puede tirar

// ── Defensas ──────────────────────────────────────────────────────────────────
// Dos maniquíes. `guard`: delante del aro; se mueve de lado para ponerse en la
// línea del tiro y salta en cuanto sale el balón. `marker`: marca al jugador
// que lleva el balón (ver Defenders).
export const DEFENDER = { radius: 0.34, low: 0.3, high: 2.38 };
export const GUARD_X = RIM.x - 1.55;
export const MARK_HOME = { x: RIM.x - 4.4, z: RIM.z + 2.6 }; // donde espera, junto a la zona
export const MARK_GAP = 1.45; // m por delante del jugador
export const MARK_LAG = 0.3; // s de retraso con que le sigue
export const MARK_SPEED = 3.0; // m/s (el jugador anda a 3,6 y corre a 6,2)
export const MARK_BLOCK = 2.1; // salta a taponar si el tiro sale a menos de esto
// A la banda, durante el concurso de triples.
export const GUARD_ASIDE = { x: court.x1 - 0.7, z: court.z0 + 0.8 };
export const MARK_ASIDE = { x: court.x1 - 0.7, z: court.z0 + 1.9 };
export const guard = { x: GUARD_X, z: RIM.z, y: 0, vy: 0, wait: -1, power: 0, active: true };
export const marker = { x: MARK_HOME.x, z: MARK_HOME.z, aimX: MARK_HOME.x, aimZ: MARK_HOME.z, y: 0, vy: 0, wait: -1, power: 0, active: true };
export const defenders = [guard, marker];
// El aro cede cuando le da el balón y vuelve temblando: ángulo (rad) y velocidad.
export const rim = { angle: 0, speed: 0 };
export const onCourt = () => {
 const feet = player.position;
 return !player.hidden && feet.x > fence.x0 && feet.x < fence.x1 && feet.z > fence.z0 && feet.z < fence.z1;
};
// El que marca salta a taponar si el tirador despega pegado a él: tarda en
// reaccionar, así que soltando a tiempo el balón le pasa por encima.
export function markerReacts() {
 if (play.contest || marker.y > 0 || Math.hypot(marker.x - player.position.x, marker.z - player.position.z) > MARK_BLOCK) return;
 marker.wait = 0.2 + Math.random() * 0.14;
 marker.power = 4.4 + Math.random() * 0.8;
}

// Rebota contra una superficie de normal (nx, ny, nz). Devuelve la velocidad
// del impacto en m/s (0 si ya se estaba alejando).
export function bounce(velocity, nx, ny, nz, restitution) {
 const along = velocity.x * nx + velocity.y * ny + velocity.z * nz;
 if (along >= 0) return 0;
 velocity.x -= (1 + restitution) * along * nx;
 velocity.y -= (1 + restitution) * along * ny;
 velocity.z -= (1 + restitution) * along * nz;
 return -along;
}

// Avisa de un golpe para que suene, con su sitio y su fuerza (0–1).
export function hit(id, at, strength) {
 if (strength > 0.06) emit("sound", { id, x: at.x, z: at.z, strength: Math.min(1, strength) });
}

// Un paso de física: gravedad, suelo, valla, tablero, aro, pilares y defensas.
// Apunta en `what` lo que ha pasado en este paso: scored, floor, rim (con qué fuerza), blocked.
export function stepBall(p, v, dt, what) {
 const previousY = p.y;
 v.y -= BALL_GRAVITY * dt;
 p.addScaledVector(v, dt);

 const floor = Math.max(terrainHeight(p.x, p.z), WATER_LEVEL) + BALL_RADIUS;
 if (p.y < floor) {
  p.y = floor;
  if (v.y < -0.9) {
   hit("ball-floor", p, -v.y / 7);
   what.floor = true;
  }
  v.y = v.y < -0.9 ? -v.y * 0.72 : 0;
  const grip = Math.exp(-1.3 * dt); // rodadura
  v.x *= grip;
  v.z *= grip;
 }

 // Valla: cuatro planos que no deja pasar a ninguna altura (por encima de la
 // malla no hay nada, pero el balón tampoco se sale: se acabaría perdiendo).
 if (p.x < fence.x0 + BALL_RADIUS) (p.x = fence.x0 + BALL_RADIUS), hit("ball-fence", p, bounce(v, 1, 0, 0, 0.55) / 6);
 if (p.x > fence.x1 - BALL_RADIUS) (p.x = fence.x1 - BALL_RADIUS), hit("ball-fence", p, bounce(v, -1, 0, 0, 0.55) / 6);
 if (p.z < fence.z0 + BALL_RADIUS) (p.z = fence.z0 + BALL_RADIUS), hit("ball-fence", p, bounce(v, 0, 0, 1, 0.55) / 6);
 if (p.z > fence.z1 - BALL_RADIUS) (p.z = fence.z1 - BALL_RADIUS), hit("ball-fence", p, bounce(v, 0, 0, -1, 0.55) / 6);

 // Tablero: punto más cercano de la caja.
 const cx = Math.max(BOARD.x - BOARD.half[0], Math.min(p.x, BOARD.x + BOARD.half[0]));
 const cy = Math.max(BOARD.y - BOARD.half[1], Math.min(p.y, BOARD.y + BOARD.half[1]));
 const cz = Math.max(BOARD.z - BOARD.half[2], Math.min(p.z, BOARD.z + BOARD.half[2]));
 let ox = p.x - cx, oy = p.y - cy, oz = p.z - cz;
 let d = Math.hypot(ox, oy, oz);
 if (d < BALL_RADIUS && d > 1e-5) {
  p.set(cx + (ox / d) * BALL_RADIUS, cy + (oy / d) * BALL_RADIUS, cz + (oz / d) * BALL_RADIUS);
  hit("ball-board", p, bounce(v, ox / d, oy / d, oz / d, 0.6) / 6);
 }

 // Aro: punto más cercano de la circunferencia.
 const rx = p.x - RIM.x;
 const rz = p.z - RIM.z;
 const flat = Math.hypot(rx, rz) || 1e-5;
 const qx = RIM.x + (rx / flat) * RIM_RADIUS;
 const qz = RIM.z + (rz / flat) * RIM_RADIUS;
 ox = p.x - qx;
 oy = p.y - RIM.y;
 oz = p.z - qz;
 d = Math.hypot(ox, oy, oz);
 const reach = BALL_RADIUS + 0.02;
 if (d < reach && d > 1e-5) {
  p.set(qx + (ox / d) * reach, RIM.y + (oy / d) * reach, qz + (oz / d) * reach);
  const force = bounce(v, ox / d, oy / d, oz / d, 0.5) / 5;
  hit("ball-rim", p, force);
  if (force > 0.06) what.rim = force;
 }
 // Canasta: el centro cruza el plano del aro hacia abajo, por dentro.
 if (previousY > RIM.y && p.y <= RIM.y && v.y < 0 && flat < RIM_RADIUS - 0.03) what.scored = true;

 for (const pillar of PILLARS) {
  if (p.y - BALL_RADIUS > pillar.h) continue;
  const px = p.x - pillar.x;
  const pz = p.z - pillar.z;
  const distance = Math.hypot(px, pz);
  const limit = pillar.r + BALL_RADIUS;
  if (distance >= limit || distance < 1e-5) continue;
  p.x = pillar.x + (px / distance) * limit;
  p.z = pillar.z + (pz / distance) * limit;
  hit("ball-post", p, bounce(v, px / distance, 0, pz / distance, 0.55) / 5);
 }

 // Defensas: cada uno, una cápsula vertical, de los pies a las manos en alto.
 for (const one of defenders) {
  if (!one.active) continue;
  const by = Math.max(one.y + DEFENDER.low, Math.min(p.y, one.y + DEFENDER.high));
  ox = p.x - one.x;
  oy = p.y - by;
  oz = p.z - one.z;
  d = Math.hypot(ox, oy, oz);
  const limit = DEFENDER.radius + BALL_RADIUS;
  if (d < limit && d > 1e-5) {
   p.set(one.x + (ox / d) * limit, by + (oy / d) * limit, one.z + (oz / d) * limit);
   const force = bounce(v, ox / d, oy / d, oz / d, 0.45) / 5;
   hit("ball-block", p, force);
   if (force > 0.1) what.blocked = true;
  }
 }
}

