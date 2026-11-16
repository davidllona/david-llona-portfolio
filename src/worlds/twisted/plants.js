import * as THREE from "three";
import { blade, blob, merge, piece, randomFrom, tube } from "../living/kit/geometry";
import { BARK, BONE, INK, IRON, STONE } from "./models";

// Lo que crece en The Twisted Moon y los detalles sueltos, hechos a mano con el
// kit low-poly. Las copas van en gris claro: cada copia se tiñe en el juego
// con su color (instancias con color), así una sola malla sirve para un sauce
// morado y otro verde azulado.
const FOLIAGE = { low: "#9d97ad", high: "#e6e1ef" };

// Rizo al final de una rama: avanza, sube y se enrosca sobre sí misma.
function curl(from, heading, reach, rise, radius, turns, flip = 1) {
 const ux = Math.cos(heading), uz = Math.sin(heading);
 const points = [from, [from[0] + ux * reach * 0.5, from[1] + rise * 0.45, from[2] + uz * reach * 0.5]];
 const cx = from[0] + ux * reach, cy = from[1] + rise + radius, cz = from[2] + uz * reach;
 const steps = Math.max(6, Math.round(turns * 9));
 for (let k = 0; k <= steps; k++) {
  const s = k / steps, angle = -Math.PI / 2 + s * turns * Math.PI * 2, r = radius * (1 - 0.85 * s);
  points.push([cx + ux * Math.cos(angle) * r * flip, cy + Math.sin(angle) * r, cz + uz * Math.cos(angle) * r * flip]);
 }
 return points;
}

// ── Sauce llorón ────────────────────────────────────────────────────────────
// Tronco retorcido que se abre en tres brazos, una copa de masas aplastadas y,
// colgando de su borde, una cortina de tiras largas que casi tocan el suelo.
export function createWillow() {
 const random = randomFrom(0.917);
 const parts = [piece(tube([[0, 0, 0], [0.3, 1.1, 0.1], [-0.2, 2.3, -0.1], [0.15, 3.3, 0.05], [0.05, 4.0, 0]], (t) => 0.4 * (1 - t) ** 1.1 + 0.12, { sides: 7, segments: 10 }), { bottom: BARK.dark, top: BARK.mid, vary: 0.1 })];
 // Raíces.
 for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + 0.4;
  parts.push(piece(tube([[Math.cos(a) * 0.15, 0.4, Math.sin(a) * 0.15], [Math.cos(a) * 0.6, 0.12, Math.sin(a) * 0.6], [Math.cos(a) * 0.95, -0.08, Math.sin(a) * 0.95]], (t) => 0.18 * (1 - t) + 0.04, { sides: 5, segments: 4 }), { color: BARK.dark }));
 }
 // Brazos y masas de la copa.
 const crown = [];
 for (let i = 0; i < 3; i++) {
  const a = (i / 3) * Math.PI * 2 + 0.3, out = 1.3 + random() * 0.4;
  const end = [Math.cos(a) * out, 4.6 + random() * 0.4, Math.sin(a) * out];
  parts.push(piece(tube([[0.05, 3.4, 0], [Math.cos(a) * out * 0.5, 4.3, Math.sin(a) * out * 0.5], end], (t) => 0.2 * (1 - t) + 0.06, { sides: 5, segments: 6 }), { color: BARK.mid }));
  crown.push(end);
 }
 crown.push([0, 5.1, 0]);
 crown.forEach(([x, y, z], i) => parts.push(piece(blob(1), { bottom: FOLIAGE.low, top: FOLIAGE.high, jitter: 0.14, vary: 0.12, seed: 4 + i, position: [x, y, z], scale: [1.35, 0.6, 1.35] })));
 // Cortina: tiras que cuelgan del borde de la copa, de largos distintos.
 const STRANDS = 42;
 for (let i = 0; i < STRANDS; i++) {
  const a = (i / STRANDS) * Math.PI * 2 + random() * 0.12;
  const [cx, cy, cz] = crown[i % 3];
  const r = 1.0 + random() * 0.45, x0 = cx + Math.cos(a) * r, z0 = cz + Math.sin(a) * r, y0 = cy - 0.1;
  const long = 2.0 + random() * 1.6, ox = Math.cos(a), oz = Math.sin(a);
  const strand = blade([[x0, y0, z0], [x0 + ox * 0.2, y0 - long * 0.35, z0 + oz * 0.2], [x0 + ox * 0.28, y0 - long * 0.7, z0 + oz * 0.28], [x0 + ox * 0.22, y0 - long, z0 + oz * 0.22]], 0.38, { facing: a + Math.PI / 2, tipWidth: 0.06 });
  parts.push(piece(strand, { bottom: FOLIAGE.high, top: FOLIAGE.low, vary: 0.1, seed: 20 + i }));
 }
 return merge(parts);
}

// ── Árbol de copa ancha ─────────────────────────────────────────────────────
// Tronco que se retuerce y se abre en tres; cada brazo acaba en una copa
// ancha y plana, como una seta de hojas, más oscura por debajo.
export function createBroadTree() {
 const random = randomFrom(0.533);
 const parts = [piece(tube([[0, 0, 0], [-0.25, 1.2, 0.1], [0.2, 2.4, -0.05], [-0.05, 3.3, 0]], (t) => 0.42 * (1 - t) + 0.16, { sides: 7, segments: 9 }), { bottom: BARK.dark, top: BARK.mid, vary: 0.1 })];
 const heads = [[0, 5.8, 0, 2.2], [1.7, 4.8, 0.6, 1.5], [-1.5, 4.5, -0.7, 1.4]];
 heads.forEach(([x, y, z, r], i) => {
  parts.push(piece(tube([[0, 3.1, 0], [x * 0.5, (3.1 + y) / 2 + 0.2, z * 0.5], [x, y - 0.2, z]], (t) => 0.2 * (1 - t) + 0.07, { sides: 5, segments: 6 }), { color: BARK.mid }));
  // La copa: un disco abombado y facetado, con el canto en dientes.
  const top = new THREE.CylinderGeometry(r * 0.75, r, 0.55, 9, 1);
  const points = top.attributes.position;
  for (let k = 0; k < points.count; k++) if (points.getY(k) < 0) points.setXYZ(k, points.getX(k) * (0.9 + random() * 0.25), points.getY(k) - random() * 0.25, points.getZ(k) * (0.9 + random() * 0.25));
  parts.push(piece(top, { bottom: FOLIAGE.low, top: FOLIAGE.high, jitter: 0.08, vary: 0.14, seed: 7 + i, position: [x, y, z], rotation: [random() * 0.2, random(), random() * 0.2] }));
  parts.push(piece(new THREE.ConeGeometry(r * 0.92, 0.7, 9), { color: "#6f6880", vary: 0.1, seed: 11 + i, position: [x, y - 0.55, z], rotation: [Math.PI, 0, 0] }));
  parts.push(piece(blob(1), { bottom: FOLIAGE.low, top: FOLIAGE.high, jitter: 0.1, vary: 0.12, seed: 14 + i, position: [x, y + 0.35, z], scale: [r * 0.6, 0.35, r * 0.6] }));
 });
 return merge(parts);
}

// ── Árbol en espiral ────────────────────────────────────────────────────────
// Una copa que es un tubo enroscado alrededor de un cono, de ancho a fino,
// acabado en un rizo. Tronco corto y torcido.
export function createSpiralTree() {
 const parts = [piece(tube([[0, 0, 0], [0.15, 0.8, 0.05], [-0.05, 1.5, 0]], (t) => 0.3 * (1 - t) + 0.14, { sides: 6, segments: 5 }), { bottom: BARK.dark, top: BARK.mid })];
 const coil = [];
 for (let k = 0; k <= 48; k++) {
  const t = k / 48, angle = t * Math.PI * 2 * 3.1, r = 1.45 * (1 - t) + 0.12;
  coil.push([Math.cos(angle) * r, 1.3 + t * 4.4, Math.sin(angle) * r]);
 }
 const last = coil[coil.length - 1];
 coil.push([last[0] + 0.25, last[1] + 0.35, last[2]], [last[0] + 0.5, last[1] + 0.2, last[2]], [last[0] + 0.42, last[1], last[2]]);
 parts.push(piece(tube(coil, (t) => 0.55 * (1 - t) ** 0.9 + 0.08, { sides: 6, segments: 70 }), { bottom: FOLIAGE.low, top: FOLIAGE.high, vary: 0.1 }));
 // Un núcleo oscuro dentro, para que no se vea el cielo entre vuelta y vuelta.
 parts.push(piece(new THREE.ConeGeometry(1.0, 4.2, 7).translate(0, 3.5, 0), { color: "#5d5672" }));
 return merge(parts);
}

// ── Enredadera con rizos ────────────────────────────────────────────────────
// Tres zarcillos que salen del suelo y se enroscan en lo alto, con hojitas.
export function createVine() {
 const random = randomFrom(0.377);
 const parts = [];
 for (let i = 0; i < 3; i++) {
  const a = (i / 3) * Math.PI * 2 + random();
  const from = [Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12];
  const path = curl(from, a, 0.25 + random() * 0.2, 0.7 + random() * 0.6, 0.16 + random() * 0.06, 1.4, i % 2 ? 1 : -1);
  parts.push(piece(tube(path, (t) => 0.045 * (1 - t) + 0.012, { sides: 4, segments: 16 }), { bottom: "#7d8a8f", top: "#c9d3d8", vary: 0.08 }));
  for (let k = 1; k < 3; k++) {
   const [x, y, z] = path[k];
   parts.push(piece(new THREE.OctahedronGeometry(0.09, 0), { color: "#dfe6ea", position: [x + 0.05, y, z], scale: [1.4, 0.4, 0.9], rotation: [0, a, 0.5] }));
  }
 }
 return merge(parts);
}

// ── Seta que brilla ─────────────────────────────────────────────────────────
// El pie y el sombrero van aparte: el sombrero brilla (turquesa o violeta,
// según la copia) y el pie no.
export function createMushroom() {
 const stem = merge([piece(new THREE.CylinderGeometry(0.055, 0.09, 0.42, 6).translate(0, 0.21, 0), { bottom: "#8b84a6", top: "#d9d4e8" }), piece(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 6), { color: "#cfc8e2", position: [0, 0.3, 0] })]);
 const cap = new THREE.SphereGeometry(0.26, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(0, 0.38, 0);
 const under = new THREE.CircleGeometry(0.25, 9).rotateX(Math.PI / 2).translate(0, 0.385, 0);
 return { stem, cap: merge([piece(cap, { color: "#ffffff" }), piece(under, { color: "#8f8f8f" })]) };
}

// ── Flor violeta ────────────────────────────────────────────────────────────
// Cinco pétalos en estrella sobre un tallo fino, con el corazón claro.
export function createFlower() {
 const parts = [piece(new THREE.CylinderGeometry(0.01, 0.014, 0.26, 4).translate(0, 0.13, 0), { color: "#55606a" })];
 for (let i = 0; i < 5; i++) {
  const a = (i / 5) * Math.PI * 2;
  const petal = new THREE.BufferGeometry();
  petal.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, Math.cos(a - 0.4) * 0.07, 0.012, Math.sin(a - 0.4) * 0.07, Math.cos(a) * 0.11, 0.03, Math.sin(a) * 0.11, 0, 0, 0, Math.cos(a) * 0.11, 0.03, Math.sin(a) * 0.11, Math.cos(a + 0.4) * 0.07, 0.012, Math.sin(a + 0.4) * 0.07], 3));
  parts.push(piece(petal, { color: "#ffffff", position: [0, 0.26, 0] }));
 }
 parts.push(piece(new THREE.OctahedronGeometry(0.026, 0), { color: "#fff2c0", position: [0, 0.275, 0] }));
 return merge(parts);
}

// ── Calabaza sonriente ──────────────────────────────────────────────────────
// Gajos marcados, rabito curvado y, aparte, la cara encendida: dos ojos
// redondos y una sonrisa (amable, no de miedo). La cara mira hacia +Z.
export function createPumpkin() {
 const body = new THREE.SphereGeometry(0.42, 12, 7);
 const points = body.attributes.position;
 for (let i = 0; i < points.count; i++) {
  const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
  const rib = 1 + 0.09 * Math.cos(Math.atan2(z, x) * 8);
  points.setXYZ(i, x * rib, y * 0.74 + 0.31, z * rib);
 }
 const shell = merge([
  piece(body, { bottom: "#a8461c", top: "#e8782a", vary: 0.08 }),
  piece(tube([[0, 0.58, 0], [0.03, 0.72, 0], [0.1, 0.8, 0.02], [0.17, 0.78, 0.02]], (t) => 0.05 * (1 - t) + 0.02, { sides: 5, segments: 5 }), { color: "#3d4a2c" }),
 ]);
 const face = [];
 for (const side of [-1, 1]) face.push(piece(new THREE.CircleGeometry(0.07, 7), { color: "#ffffff", position: [side * 0.14, 0.42, 0.405], rotation: [-0.12, side * 0.3, 0] }));
 // La sonrisa: media corona, con las puntas hacia arriba.
 const smile = new THREE.RingGeometry(0.11, 0.17, 9, 1, Math.PI * 1.08, Math.PI * 0.84);
 face.push(piece(smile, { color: "#ffffff", position: [0, 0.36, 0.42], rotation: [-0.2, 0, 0] }));
 return { shell, face: merge(face) };
}

// ── Farolillo de camino ─────────────────────────────────────────────────────
// Un palo de hierro torcido, a rayas abajo, con un farolillo colgado de su
// gancho. El cristal va aparte (`LANTERN_POST_GLASS`, respecto al pie).
export const LANTERN_POST_GLASS = [0.34, 1.16, 0];
export function createLanternPost() {
 const [gx, gy] = LANTERN_POST_GLASS;
 const pole = piece(tube([[0, 0, 0], [-0.04, 0.6, 0], [0.04, 1.2, 0], [0.18, 1.52, 0], [0.34, 1.5, 0], [0.36, 1.4, 0]], (t) => 0.045 - t * 0.02, { sides: 5, segments: 10 }), { color: IRON });
 const colors = pole.attributes.color, at = pole.attributes.position;
 const a = new THREE.Color(BONE), b = new THREE.Color(INK);
 for (let i = 0; i < at.count; i += 3) {
  const y = (at.getY(i) + at.getY(i + 1) + at.getY(i + 2)) / 3;
  if (y < 0.9) for (let k = 0; k < 3; k++) (Math.floor(y / 0.16) % 2 ? b : a).toArray(colors.array, (i + k) * 3);
 }
 return merge([
  piece(new THREE.CylinderGeometry(0.1, 0.14, 0.12, 6), { color: STONE.dark, position: [0, 0.05, 0] }),
  pole,
  piece(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4), { color: IRON, position: [gx, gy + 0.19, 0] }),
  piece(new THREE.ConeGeometry(0.11, 0.12, 5), { color: IRON, position: [gx, gy + 0.13, 0] }),
  piece(new THREE.CylinderGeometry(0.08, 0.06, 0.03, 5), { color: IRON, position: [gx, gy - 0.1, 0] }),
 ]);
}

// ── Lo que se le añade a la torre del reloj ─────────────────────────────────
// La torre de Envato es un campanario recto, de juguete: aquí se le pone el
// aire de cuento. `measure(y)` da su medio ancho y medio fondo a esa altura;
// `top`, su altura; `face`, dónde está la esfera ({ y, r, front }). Devuelve
// lo macizo (`body`) y lo encendido (`warm`), en metros, con la torre derecha
// (la inclinación se le da entera, a todo junto).
export function createTowerExtras({ measure, top, face }) {
 const random = randomFrom(0.731);
 const body = [], warm = [];
 const PURPLE = { stone: "#a497cc", dark: "#5a4d86", roof: "#2b2348", roof2: "#4b3d7c", gold: "#d6aa52" };
 // ── Aguja torcida, encima del tejado: sube, se vence y acaba en rizo con su bola dorada.
 const spire = [[0, 0, 0], [0.04, 0.9, 0.02], [0.22, 1.9, 0.06], [0.62, 2.7, 0.1], [1.05, 3.0, 0.12], [1.32, 2.78, 0.1], [1.26, 2.5, 0.08]];
 body.push(piece(tube(spire, (t) => 0.42 * (1 - t) ** 1.25 + 0.03, { sides: 4, segments: 18 }), { bottom: PURPLE.roof, top: PURPLE.roof2, vary: 0.08, position: [0, top - 0.55, 0] }));
 body.push(piece(new THREE.OctahedronGeometry(0.13, 0), { color: PURPLE.gold, position: [1.26, top - 0.55 + 2.42, 0.08] }));
 // ── Dos torrecillas en esquinas opuestas, cada una vencida hacia fuera, con su gorro torcido y una ventana encendida.
 const turret = (corner, height, lean) => {
  const [hx, hz] = measure(height);
  const x = corner[0] * (hx + 0.32), z = corner[1] * (hz + 0.32);
  const out = Math.atan2(corner[1], corner[0]);
  const tilt = [corner[1] * lean, 0, -corner[0] * lean];
  const at = (dy) => [x + corner[0] * Math.sin(lean) * dy, height + dy, z + corner[1] * Math.sin(lean) * dy];
  body.push(piece(new THREE.ConeGeometry(0.62, 1.1, 7), { color: PURPLE.dark, position: at(-0.55), rotation: [Math.PI + tilt[0], 0, tilt[2]] }));
  body.push(piece(new THREE.CylinderGeometry(0.56, 0.6, 2.2, 7, 2), { bottom: PURPLE.dark, top: PURPLE.stone, jitter: 0.03, vary: 0.08, position: at(1.1), rotation: tilt }));
  body.push(piece(new THREE.CylinderGeometry(0.74, 0.74, 0.14, 7), { color: PURPLE.roof, position: at(2.25), rotation: tilt }));
  // Gorro en tres tramos, cada uno más ladeado.
  [[0.72, 0.46, 0.9], [0.46, 0.22, 0.75], [0.22, 0.02, 0.7]].forEach(([low, high, tall], i) => {
   const lift = 2.3 + i * 0.72, bend = (i + 1) * 0.18 * corner[0];
   body.push(piece(new THREE.CylinderGeometry(high, low, tall, 7).translate(0, tall / 2, 0), { color: i % 2 ? PURPLE.roof2 : PURPLE.roof, vary: 0.08, seed: 30 + i, position: [at(lift)[0] + bend * 0.5, at(lift)[1], at(lift)[2]], rotation: [tilt[0], 0, tilt[2] - bend] }));
  });
  // La ventana, mirando hacia fuera de la torre (y a la cámara, si queda delante).
  const facing = Math.abs(corner[1]) > 0 ? (corner[1] > 0 ? 0 : Math.PI) : out;
  const [wx, wy, wz] = at(1.2);
  warm.push(piece(new THREE.PlaneGeometry(0.32, 0.5), { position: [wx + Math.sin(facing) * 0.6, wy, wz + Math.cos(facing) * 0.6], rotation: [0, facing, 0] }));
  body.push(piece(new THREE.BoxGeometry(0.44, 0.08, 0.14), { color: INK, position: [wx + Math.sin(facing) * 0.62, wy - 0.28, wz + Math.cos(facing) * 0.62], rotation: [0, facing, 0] }));
 };
 turret([1, 1], top * 0.56, 0.2);
 turret([-1, -1], top * 0.44, 0.24);
 // ── Balcón torcido bajo la esfera: losa, ménsulas y una baranda de barrotes desiguales.
 {
  const y = face.y - face.r - 0.55;
  const [hx, hz] = measure(y);
  const z = (hz + 0.42) * face.front;
  body.push(piece(new THREE.BoxGeometry(hx * 1.5, 0.14, 0.95), { bottom: PURPLE.dark, top: PURPLE.stone, jitter: 0.02, position: [0, y, z], rotation: [0, 0, 0.04] }));
  for (const side of [-1, 1]) body.push(piece(new THREE.ConeGeometry(0.16, 0.6, 4), { color: PURPLE.dark, position: [side * hx * 0.55, y - 0.36, z - 0.1 * face.front], rotation: [Math.PI, 0, 0] }));
  const posts = 7;
  for (let i = 0; i < posts; i++) {
   const x = -hx * 0.72 + (hx * 1.44 * i) / (posts - 1), tall = 0.62 + random() * 0.18;
   body.push(piece(new THREE.BoxGeometry(0.05, tall, 0.05), { color: INK, position: [x, y + tall / 2, z + 0.42 * face.front], rotation: [(random() - 0.5) * 0.2, 0, (random() - 0.5) * 0.25] }));
  }
  body.push(piece(new THREE.BoxGeometry(hx * 1.55, 0.05, 0.06), { color: INK, position: [0, y + 0.7, z + 0.42 * face.front], rotation: [0, 0, 0.06] }));
  // Puerta del balcón, encendida.
  warm.push(piece(new THREE.PlaneGeometry(0.5, 0.8), { position: [0.05, y + 0.48, hz * face.front + 0.03 * face.front], rotation: [0, face.front > 0 ? 0 : Math.PI, 0.03] }));
 }
 // ── Ventanas encendidas en el fuste: dos en la fachada y una a cada lado, cada una a su altura y algo ladeada.
 for (const [side, u, height, lean] of [["front", -0.18, 0.24, 0.05], ["front", 0.22, 0.36, -0.07], ["right", 0.1, 0.3, 0.06], ["left", -0.05, 0.4, -0.05]]) {
  const y = top * height;
  const [hx, hz] = measure(y);
  const position = side === "front" ? [u * hx * 2, y, (hz + 0.03) * face.front] : [(side === "right" ? 1 : -1) * (hx + 0.03), y, u * hz * 2];
  const yaw = side === "front" ? (face.front > 0 ? 0 : Math.PI) : side === "right" ? Math.PI / 2 : -Math.PI / 2;
  warm.push(piece(new THREE.PlaneGeometry(0.42, 0.72), { position, rotation: [0, yaw, lean] }));
  body.push(piece(new THREE.BoxGeometry(0.56, 0.09, 0.12), { color: INK, position: [position[0], y - 0.4, position[2]], rotation: [0, yaw, lean] }));
 }
 return { body: merge(body), warm: merge(warm) };
}
