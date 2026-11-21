import * as THREE from "three";
import { ARM, TOE_HEIGHT, hipJoint, mirror, mix, rotX, smooth, solveLeg } from "./gait";

// Tiro en suspensión del astronauta, generado (como la carrera: ver gait.js).
// No es un clip que se reproduce a su aire: es una línea de poses y la pista
// (worlds/living/Court.jsx) dice en cuál va, porque el gesto sigue al salto de
// verdad —que dura lo que dure— y al momento en que el jugador suelta.
//
//   0     listo: el balón en las dos manos, delante del pecho
//   0,15  anticipación: se agacha y baja el balón
//   0,45  subida: piernas estiradas, puntas hacia abajo, el balón pasa por la frente
//   0,6   arriba: brazos en alto con los codos doblados y la muñeca armada
//   0,7   suelta: brazos estirados y golpe de muñeca
//   0,85  acompaña: la mano se queda «colgando» mientras cae
//   1     aterriza: rodillas blandas y brazos que bajan
export const JUMP_SHOT = { name: "Astro_JumpShot", duration: 1, ready: 0, dip: 0.15, rise: 0.45, set: 0.6, release: 0.7, follow: 0.85, land: 1 };

// Cada pose: altura de la cadera, inclinación del tronco, punta del pie (grados
// hacia abajo), lo que se recogen los pies, giro del brazo (rad; negativo =
// hacia delante y arriba), codo (0 = estirado, 1 = el doblez de la pose de base),
// muñeca (grados; positiva = la mano cae hacia delante) y cabeza (grados hacia arriba).
const KEYS = [
 { at: 0, hips: 0.396, lean: 3, toe: 0, tuck: 0, arm: -0.95, elbow: 1.25, wrist: -8, head: 0 },
 { at: 0.15, hips: 0.325, lean: 14, toe: 0, tuck: 0, arm: -0.62, elbow: 1.3, wrist: -5, head: 6 },
 { at: 0.45, hips: 0.404, lean: -2, toe: 34, tuck: 0.012, arm: -1.55, elbow: 1.05, wrist: -20, head: 10 },
 { at: 0.6, hips: 0.404, lean: -4, toe: 40, tuck: 0.03, arm: -2.25, elbow: 0.8, wrist: -35, head: 12 },
 { at: 0.7, hips: 0.404, lean: -1, toe: 40, tuck: 0.035, arm: -2.95, elbow: 0.08, wrist: 58, head: 10 },
 { at: 0.85, hips: 0.404, lean: 1, toe: 30, tuck: 0.02, arm: -2.8, elbow: 0.06, wrist: 72, head: 6 },
 { at: 1, hips: 0.34, lean: 10, toe: 0, tuck: 0, arm: -1.15, elbow: 0.85, wrist: 15, head: 0 },
];

const axis = new THREE.Vector3();
// Un giro, multiplicado: `amount` veces el ángulo de `q`.
function scaled(q, amount) {
 const from = new THREE.Quaternion(...q);
 const angle = 2 * Math.acos(Math.min(1, Math.abs(from.w))) * Math.sign(from.w || 1);
 const s = Math.hypot(from.x, from.y, from.z) || 1;
 return new THREE.Quaternion().setFromAxisAngle(axis.set(from.x / s, from.y / s, from.z / s), angle * amount);
}

function poseAt(at) {
 let i = 0;
 while (i < KEYS.length - 2 && at > KEYS[i + 1].at) i++;
 const a = KEYS[i], b = KEYS[i + 1];
 const k = smooth((at - a.at) / (b.at - a.at));
 const v = (name) => mix(a[name], b[name], k);
 const hipsAngle = 90 + v("lean");
 const joint = hipJoint(v("hips"), hipsAngle);
 const pose = { Hips: rotX(hipsAngle).toArray(), hipsPosition: [0, 0, v("hips")] };
 // En el aire, un pie algo más recogido y atrasado que el otro.
 for (const [side, back] of [["L", 0], ["R", 1]]) solveLeg(pose, side, joint, hipsAngle, { z: 0.012 - v("tuck") * (0.6 + back * 1.6), y: TOE_HEIGHT + v("tuck") * (1 + back * 0.8), pitch: v("toe") });
 pose.Spine = [0, 0, 0, 1];
 pose.Chest = rotX(v("lean") * 0.25).toArray();
 pose.Neck = [0, 0, 0, 1];
 pose.Head = rotX(-v("lean") * 0.6 - v("head")).toArray();
 pose.Backpack = [0, 0, 0, 1];
 for (const side of ["L", "R"]) {
  const flip = side === "R" ? mirror : (q) => q;
  const clavicle = new THREE.Quaternion(...flip(ARM.clavicle));
  pose[`Clavicle_${side}`] = clavicle.toArray();
  pose[`UpperArm_${side}`] = clavicle.clone().invert().multiply(new THREE.Quaternion().setFromAxisAngle(X, v("arm"))).multiply(clavicle).multiply(new THREE.Quaternion(...flip(ARM.upper))).toArray();
  pose[`Forearm_${side}`] = scaled(flip(ARM.forearm), v("elbow")).toArray();
  pose[`Hand_${side}`] = rotX(v("wrist")).toArray();
  pose[`Fingers_${side}`] = flip(ARM.fingers);
  pose[`Thumb_${side}`] = flip(ARM.thumb);
 }
 return pose;
}
const X = new THREE.Vector3(1, 0, 0);

export function createJumpShotClip(samples = 40) {
 const times = [], values = {}, hips = [];
 for (let i = 0; i <= samples; i++) {
  const t = (i / samples) * JUMP_SHOT.duration;
  const pose = poseAt(t);
  times.push(t);
  hips.push(...pose.hipsPosition);
  for (const [bone, q] of Object.entries(pose)) if (bone !== "hipsPosition") (values[bone] ??= []).push(...q);
 }
 // (Un giro y su opuesto son el mismo: se evita que la interpolación dé la vuelta larga.)
 for (const list of Object.values(values)) {
  for (let i = 4; i < list.length; i += 4) {
   if (list[i] * list[i - 4] + list[i + 1] * list[i - 3] + list[i + 2] * list[i - 2] + list[i + 3] * list[i - 1] < 0) for (let k = 0; k < 4; k++) list[i + k] = -list[i + k];
  }
 }
 return new THREE.AnimationClip(JUMP_SHOT.name, JUMP_SHOT.duration, [new THREE.VectorKeyframeTrack("Hips.position", times, hips), ...Object.entries(values).map(([bone, list]) => new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, list))]);
}
