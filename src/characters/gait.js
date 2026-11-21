import * as THREE from "three";

// Carrera del astronauta, generada. Los clips de correr del GLB avanzaban 2,9 m/s
// a velocidad 1 y el astronauta corre a 6,2: se reproducían al tope y los pies
// patinaban. Aquí el ciclo se construye al revés: primero se decide por dónde
// va cada pie (apoyado, la planta no se mueve respecto al suelo; en el aire,
// vuelve por arriba) y de ahí salen cadera, rodilla y tobillo por cinemática
// inversa. Así lo que avanza el pie apoyado es exactamente lo que avanza el
// personaje, a cualquier velocidad a la que se reproduzca el clip.
//
// Cada zancada tiene sus tres tiempos: contacto (el pie llega por delante, con
// la punta algo levantada), paso (el cuerpo pasa por encima, la cadera baja y la
// rodilla cede) y vuelo (los dos pies en el aire, la cadera en lo más alto).
// Los brazos van en oposición a las piernas, el tronco inclinado y el pecho
// gira contra la cadera.
//
// Medidas del modelo (m, sin escalar): frente +Z, arriba +Y. Todos los huesos de
// la pierna giran sobre su eje X; los ángulos son los del hueso en el plano
// del perfil (270° = hacia abajo; menos = hacia delante).
const THIGH = 0.131, SHIN = 0.17, FOOT = 0.099; // largo de muslo, espinilla y pie (tobillo → arranque de los dedos)
const HIP_DROP = 0.02; // lo que baja la articulación de la cadera respecto al hueso Hips
export const TOE_HEIGHT = 0.03; // altura del arranque de los dedos con la planta en el suelo
const FLAT = 225; // ángulo del pie con la planta en el suelo
const TOE_REST = -41.5;
const DEG = Math.PI / 180;

// Brazo: la pose de base (colgando, con el codo doblado hacia delante) y sus
// fijos, tomados del modelo. El derecho es el espejo del izquierdo.
export const ARM = {
 clavicle: [-0.543, -0.498, -0.498, 0.457],
 upper: new THREE.Quaternion(-0.329, -0.131, 0.543, 0.761).slerp(new THREE.Quaternion(-0.65, -0.564, -0.028, 0.509), 0.5).toArray(),
 forearm: [-0.546, 0, -0.341, 0.765],
 fingers: [-0.141, 0, 0.226, 0.964],
 thumb: [-0.276, 0.136, 0.046, 0.95],
};
export const mirror = ([x, y, z, w]) => [x, -y, -z, w];
export const smooth = (t) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
export const mix = (a, b, t) => a + (b - a) * t;
export const rotX = (degrees) => new THREE.Quaternion().setFromAxisAngle(X, degrees * DEG);
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);

// Los dos pasos del astronauta. `speed`: m/s del modelo sin escalar a los que
// avanza el clip a velocidad 1; `stance`: parte del ciclo que cada pie pasa
// apoyado (menos de 0,5: hay vuelo).
export const GAITS = {
 // Trote: el paso normal (3,6 m/s en el juego).
 jog: { name: "Astro_Jog", duration: 0.46, speed: 3.6 / 1.4, stance: 0.27, hips: 0.388, bounce: 0.013, lean: 8, swing: 0.1, kick: 62, arm: 0.5, twist: 0.13, sway: 0.006 },
 // Carrera: con Shift (6,2 m/s).
 run: { name: "Astro_Run", duration: 0.4, speed: 6.2 / 1.4, stance: 0.2, hips: 0.384, bounce: 0.021, lean: 15, swing: 0.16, kick: 82, arm: 0.82, twist: 0.2, sway: 0.008 },
};

// Dónde va un pie en la fase `p` (0 = contacto): el arranque de los dedos
// (avance respecto a la cadera y altura) y la inclinación de la planta
// (grados; positiva = punta hacia abajo, talón arriba).
function footAt(gait, p) {
 const stride = gait.speed * gait.duration * gait.stance; // lo que recorre el suelo bajo el pie apoyado
 if (p < gait.stance) {
  const u = p / gait.stance;
  // Llega con la punta algo levantada, asienta, y despega sobre los dedos.
  const pitch = u < 0.22 ? -13 * (1 - u / 0.22) : u > 0.52 ? 56 * smooth((u - 0.52) / 0.48) : 0;
  return { z: stride * (0.5 - u), y: TOE_HEIGHT + Math.max(0, -pitch) * DEG * 0.07, pitch };
 }
 const v = (p - gait.stance) / (1 - gait.stance);
 // Vuelta por el aire: primero el talón sube hacia atrás, luego la rodilla lo trae delante.
 const pitch = v < 0.28 ? mix(56, gait.kick, smooth(v / 0.28)) : mix(gait.kick, -13, smooth((v - 0.28) / 0.72));
 // (Sube y baja deprisa: no va rozando el suelo ni antes de pisar ni después de despegar.)
 return { z: stride * (-0.5 + smooth(v)), y: TOE_HEIGHT + gait.swing * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.85)), 0.55), pitch };
}

// Una pierna por cinemática inversa: de dónde está el arranque de los dedos
// (`foot`: avance z y altura y respecto al suelo bajo la cadera, e inclinación
// de la planta) salen muslo, espinilla, pie y dedos. `joint`: la articulación
// de la cadera; `hipsAngle`: el giro del hueso Hips. Lo usan la carrera y el
// tiro en suspensión (jumpShot.js).
export function solveLeg(pose, side, joint, hipsAngle, foot) {
 const footAngle = FLAT + foot.pitch;
 // El tobillo, a partir del arranque de los dedos (que es lo que no se mueve en el apoyo).
 const ankle = { z: foot.z + FOOT * Math.cos(footAngle * DEG), y: foot.y - FOOT * Math.sin(footAngle * DEG) };
 const dz = ankle.z - joint.z, dy = ankle.y - joint.y;
 const reach = Math.min(Math.max(Math.hypot(dz, dy), 0.06), THIGH + SHIN - 0.002);
 const knee = Math.PI - Math.acos((THIGH * THIGH + SHIN * SHIN - reach * reach) / (2 * THIGH * SHIN));
 let towards = Math.atan2(dy, -dz) / DEG;
 if (towards < 90) towards += 360;
 const thighAngle = towards - Math.atan2(SHIN * Math.sin(knee), THIGH + SHIN * Math.cos(knee)) / DEG;
 const shinAngle = thighAngle + knee / DEG;
 pose[`Thigh_${side}`] = rotX(thighAngle - hipsAngle).toArray();
 pose[`Shin_${side}`] = rotX(knee / DEG).toArray();
 pose[`Foot_${side}`] = rotX(footAngle - shinAngle).toArray();
 // Al despegar sobre los dedos, estos se quedan planos en el suelo.
 pose[`Toe_${side}`] = rotX(TOE_REST - Math.max(0, Math.min(foot.pitch, 50)) * (foot.y < TOE_HEIGHT + 0.01 ? 1 : 0.35)).toArray();
}
export const hipJoint = (hipsY, hipsAngle) => ({ z: HIP_DROP * Math.cos(hipsAngle * DEG), y: hipsY - HIP_DROP * Math.sin(hipsAngle * DEG) });

// La pose entera en el instante `t` (s). Devuelve el giro (cuaternión, como
// lista) de cada hueso y la posición de la cadera.
function poseAt(gait, t) {
 const T = gait.duration;
 const cycle = (2 * Math.PI * t) / T;
 const mid = (gait.stance / 2) * 2 * Math.PI; // el centro del apoyo del pie izquierdo
 // La cadera baja en el centro de cada apoyo y sube en el vuelo: dos veces por ciclo.
 const hipsY = gait.hips - gait.bounce * Math.cos(2 * (cycle - mid));
 const lean = gait.lean + 1.5 * Math.sin(2 * (cycle - mid));
 const hipsAngle = 90 + lean;
 const joint = { z: HIP_DROP * Math.cos(hipsAngle * DEG), y: hipsY - HIP_DROP * Math.sin(hipsAngle * DEG) };
 const pose = { Hips: rotX(hipsAngle).toArray(), hipsPosition: [gait.sway * Math.sin(cycle - mid), 0, hipsY] };

 for (const [side, offset] of [["L", 0], ["R", 0.5]]) solveLeg(pose, side, joint, hipsAngle, footAt(gait, (((t / T + offset) % 1) + 1) % 1));

 // Tronco: el pecho gira contra la cadera (con el pie izquierdo delante va
 // delante el hombro derecho) y la cabeza lo compensa para seguir mirando al frente.
 // Brazos y pecho van con las piernas, no con el contacto: el pie izquierdo va
 // por delante del derecho desde media vuelta por el aire hasta medio apoyo.
 const stride = cycle - 2 * Math.PI * (0.75 + gait.stance / 2);
 const twist = gait.twist * Math.cos(stride);
 pose.Spine = [0, 0, 0, 1];
 pose.Chest = rotX(gait.lean * 0.3).multiply(new THREE.Quaternion().setFromAxisAngle(Y, twist)).toArray();
 pose.Neck = [0, 0, 0, 1];
 pose.Head = rotX(-gait.lean * 0.75).multiply(new THREE.Quaternion().setFromAxisAngle(Y, -twist * 0.75)).toArray();
 pose.Backpack = rotX(1.6 * Math.cos(2 * (cycle - mid))).toArray();

 // Brazos en oposición: con el pie izquierdo delante, el brazo derecho delante.
 // (El giro es lateral, en el espacio del pecho: negativo = hacia delante.)
 for (const [side, sign] of [["L", 1], ["R", -1]]) {
  const flip = side === "R" ? mirror : (q) => q;
  const clavicle = new THREE.Quaternion(...flip(ARM.clavicle));
  const angle = sign * gait.arm * Math.cos(stride) + 0.08;
  pose[`Clavicle_${side}`] = clavicle.toArray();
  pose[`UpperArm_${side}`] = clavicle.clone().invert().multiply(new THREE.Quaternion().setFromAxisAngle(X, angle)).multiply(clavicle).multiply(new THREE.Quaternion(...flip(ARM.upper))).toArray();
  pose[`Forearm_${side}`] = flip(ARM.forearm);
  pose[`Hand_${side}`] = [0, 0, 0, 1];
  pose[`Fingers_${side}`] = flip(ARM.fingers);
  pose[`Thumb_${side}`] = flip(ARM.thumb);
 }
 return pose;
}

// El clip, listo para el mezclador. Empieza en el contacto del pie izquierdo;
// el del derecho cae a mitad de ciclo (ahí van las marcas de pisada).
export function createGaitClip(gait, samples = 32) {
 const times = [], values = {}, hips = [];
 for (let i = 0; i <= samples; i++) {
  const t = (i / samples) * gait.duration;
  const pose = poseAt(gait, i === samples ? 0 : t); // la última clave es la primera: el bucle cierra exacto
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
 const tracks = [new THREE.VectorKeyframeTrack("Hips.position", times, hips), ...Object.entries(values).map(([bone, list]) => new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, list))];
 return new THREE.AnimationClip(gait.name, gait.duration, tracks);
}

// Marcas de pisada de un clip generado, en el formato de anim_events.json.
export const gaitEvents = (gait) => [
 { clip: gait.name, time_s: 0, event: "footstep_left" },
 { clip: gait.name, time_s: gait.duration / 2, event: "footstep_right" },
];
