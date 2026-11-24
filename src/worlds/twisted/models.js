import * as THREE from "three";
import { limb, merge, piece, randomFrom, tube } from "../living/kit/geometry";

// Modelos de The Twisted Moon, hechos a mano con el kit low-poly del proyecto.
// Cuento gótico: nada recto, nada a plomo. Troncos que se retuercen y acaban en
// rizo, postes doblados, hierros desiguales, tejados que se vencen. Paleta de
// negros azulados, morados, grises y blanco hueso; las rayas blancas y negras
// son el motivo que se repite (postes, chimenea, toldo).

export const INK = "#161422"; // negro azulado
export const IRON = "#1d1c2b";
export const BONE = "#e9e2d2"; // blanco hueso
export const BARK = { dark: "#191624", mid: "#2b2640", light: "#453d62" };
export const STONE = { dark: "#3a3752", mid: "#5a5674", light: "#807a9c" };
export const WALL = { dark: "#494462", mid: "#625c80", light: "#7e779c" };
export const ROOF = { a: "#22203a", b: "#423d63" };
export const WOOD = { dark: "#241d2e", mid: "#3a2e42" };
export const WARM = "#ffa64a"; // ventanas y faroles
export const ACID = "#b8ff4a"; // el verde ácido, con cuentagotas

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// Pinta las caras de una pieza ya hecha según su altura: `paint(y, cara)` da el color.
function paintBands(geometry, paint) {
 const points = geometry.attributes.position, colors = geometry.attributes.color;
 const colour = new THREE.Color();
 for (let i = 0; i < points.count; i += 3) {
  colour.set(paint((points.getY(i) + points.getY(i + 1) + points.getY(i + 2)) / 3, i / 3));
  for (let k = 0; k < 3; k++) colors.setXYZ(i + k, colour.r, colour.g, colour.b);
 }
 return geometry;
}
// A rayas blancas y negras entre dos alturas; fuera de ellas, `base`.
const striped = (geometry, { from = 0, to = Infinity, every = 0.26, base = IRON, a = BONE, b = INK }) => paintBands(geometry, (y) => (y < from || y > to ? base : Math.floor((y - from) / every) % 2 === 0 ? a : b));

// ── Árbol sin hojas, de ramas rizadas ───────────────────────────────────────
// Un tronco que sube retorciéndose y unas pocas ramas que salen, se alargan y
// acaban enroscadas sobre sí mismas. Tres formas (`kind`).
// Rama que sale de `from`, avanza hacia `heading` (ángulo en planta), sube
// `rise` y termina en un rizo de radio `curl` que da `turns` vueltas.
function curlPoints(from, heading, reach, rise, curl, turns, flip = 1) {
 const ux = Math.cos(heading), uz = Math.sin(heading);
 const points = [from, [from[0] + ux * reach * 0.45, from[1] + rise * 0.3, from[2] + uz * reach * 0.45], [from[0] + ux * reach * 0.85, from[1] + rise * 0.8, from[2] + uz * reach * 0.85]];
 // El rizo, en el plano vertical de la rama: arranca por abajo, sale, sube y vuelve hacia dentro.
 const cx = from[0] + ux * reach, cy = from[1] + rise + curl, cz = from[2] + uz * reach;
 const STEPS = Math.max(6, Math.round(turns * 9));
 for (let k = 0; k <= STEPS; k++) {
  const s = k / STEPS, angle = -Math.PI / 2 + s * turns * Math.PI * 2, radius = curl * (1 - 0.86 * s);
  points.push([cx + ux * Math.cos(angle) * radius * flip, cy + Math.sin(angle) * radius, cz + uz * Math.cos(angle) * radius * flip]);
 }
 return points;
}
const TREE_KINDS = [
 // Alto y flaco, vencido a un lado.
 { seed: 0.31, tall: 5.6, girth: 0.44, lean: 0.55, limbs: [[0.42, 0.4, 1.9, 0.9, 0.62, 1.5], [0.56, 2.7, 1.5, 1.1, 0.5, 1.6], [0.7, 4.4, 1.7, 0.8, 0.56, 1.4], [0.84, 1.4, 1.2, 0.9, 0.42, 1.7], [1, 3.4, 1.0, 0.7, 0.4, 1.9]] },
 // Achaparrado, con dos brazos largos.
 { seed: 0.58, tall: 4.2, girth: 0.52, lean: -0.4, limbs: [[0.38, 5.6, 2.3, 0.7, 0.7, 1.4], [0.5, 2.3, 2.5, 1.0, 0.74, 1.5], [0.72, 0.6, 1.4, 1.0, 0.46, 1.6], [0.88, 3.9, 1.2, 0.8, 0.4, 1.8], [1, 1.9, 0.9, 0.7, 0.34, 1.9]] },
 // Horquilla: el tronco se abre en dos.
 { seed: 0.77, tall: 5.0, girth: 0.48, lean: 0.25, limbs: [[0.34, 3.3, 1.6, 1.6, 0.6, 1.5], [0.46, 0.2, 2.0, 1.3, 0.66, 1.6], [0.66, 5.0, 1.5, 0.9, 0.5, 1.5], [0.8, 2.0, 1.3, 1.0, 0.44, 1.7], [0.92, 4.0, 1.0, 0.8, 0.36, 1.8], [1, 0.9, 0.9, 0.6, 0.32, 2.0]] },
];
export function createCurlyTree(kind = 0) {
 const { seed, tall, girth, lean, limbs } = TREE_KINDS[kind % TREE_KINDS.length];
 const random = randomFrom(seed);
 // El tronco: una S que sube.
 const spine = [0, 0.2, 0.42, 0.63, 0.82, 1].map((t, i) => [Math.sin(t * 4.4 + seed * 9) * 0.3 * (i ? 1 : 0) + lean * t * t, t * tall, Math.cos(t * 3.6 + seed * 5) * 0.22 * (i ? 1 : 0)]);
 const curve = new THREE.CatmullRomCurve3(spine.map((p) => new THREE.Vector3(...p)));
 const parts = [piece(tube(spine, (t) => girth * Math.pow(1 - t, 1.25) + 0.085, { sides: 7, segments: 12 }), { bottom: BARK.dark, top: BARK.mid, vary: 0.1, seed })];
 // Raíces que se agarran al suelo.
 for (let i = 0; i < 4; i++) {
  const angle = (i / 4) * Math.PI * 2 + seed * 7, reach = 0.75 + random() * 0.45;
  parts.push(piece(tube([[Math.cos(angle) * 0.12, 0.42, Math.sin(angle) * 0.12], [Math.cos(angle) * reach * 0.6, 0.2, Math.sin(angle) * reach * 0.6], [Math.cos(angle) * reach, -0.06, Math.sin(angle) * reach]], (t) => 0.2 * (1 - t) + 0.04, { sides: 5, segments: 4 }), { color: BARK.dark, vary: 0.1, seed: seed + i }));
 }
 // Ramas: [altura en el tronco (0–1), rumbo, alcance, subida, radio del rizo, vueltas].
 limbs.forEach(([at, heading, reach, rise, curl, turns], i) => {
  const from = curve.getPointAt(Math.min(0.999, at)).toArray();
  const thick = girth * Math.pow(1 - at * 0.92, 1.25) * 0.62 + 0.05;
  const points = curlPoints(from, heading, reach, rise, curl, turns, i % 2 ? -1 : 1);
  parts.push(piece(tube(points, (t) => thick * Math.pow(1 - t, 0.8) + 0.022, { sides: 5, segments: 20 }), { bottom: BARK.mid, top: BARK.light, vary: 0.1, seed: seed + i * 3 }));
  // Una ramita que sale de media rama y se riza por su cuenta.
  const mid = points[2];
  parts.push(piece(tube(curlPoints(mid, heading + (i % 2 ? 1.3 : -1.2), reach * 0.36, 0.32, curl * 0.5, 1.5), (t) => thick * 0.36 * (1 - t) + 0.018, { sides: 4, segments: 12 }), { color: BARK.light, vary: 0.1, seed: seed + i * 5 }));
 });
 return merge(parts);
}

// ── Farola doblada ──────────────────────────────────────────────────────────
// Un poste de hierro que no se decide: sube en ese, se vence y acaba en cayado,
// con el farol colgando. La parte baja, a rayas. El cristal va aparte
// (LAMP_GLASS, respecto al pie) para encenderlo.
export const LAMP_GLASS = [1.34, 2.72, 0];
export const LAMP_GLASS_SIZE = [0.26, 0.36, 0.26];
export function createBentLamp() {
 const [gx, gy] = LAMP_GLASS;
 const post = piece(tube([[0, 0.2, 0], [0.14, 1.0, 0.02], [-0.12, 1.9, -0.02], [0.06, 2.8, 0], [0.42, 3.55, 0], [0.98, 3.78, 0], [1.36, 3.58, 0], [1.4, 3.26, 0], [1.3, 3.16, 0]], (t) => 0.1 - t * 0.066, { sides: 6, segments: 22 }), { color: IRON });
 striped(post, { from: 0.2, to: 2.3, every: 0.24 });
 return merge([
  piece(new THREE.CylinderGeometry(0.2, 0.3, 0.3, 6), { bottom: STONE.dark, top: STONE.mid, jitter: 0.02, position: [0, 0.14, 0] }),
  post,
  // Cadena y farol: sombrerete puntiagudo, seis montantes y remate.
  piece(box(0.024, 0.2, 0.024), { color: IRON, position: [gx, gy + 0.36, 0] }),
  piece(new THREE.ConeGeometry(0.27, 0.34, 6), { color: IRON, position: [gx, gy + 0.33, 0], rotation: [0, 0, 0.12] }),
  piece(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 6), { color: IRON, position: [gx, gy + 0.19, 0] }),
  ...Array.from({ length: 6 }, (_, i) => piece(box(0.022, 0.38, 0.022), { color: IRON, position: [gx + Math.cos((i / 6) * Math.PI * 2) * 0.165, gy, Math.sin((i / 6) * Math.PI * 2) * 0.165] })),
  piece(new THREE.CylinderGeometry(0.19, 0.12, 0.05, 6), { color: IRON, position: [gx, gy - 0.2, 0] }),
  piece(new THREE.ConeGeometry(0.05, 0.14, 4), { color: IRON, position: [gx, gy - 0.29, 0], rotation: [Math.PI, 0, 0] }),
 ]);
}

// ── Baliza ──────────────────────────────────────────────────────────────────
// Poste corto y torcido, a rayas, con una bola encendida en la punta: marcan
// la zona de aterrizaje. La bola va aparte (BEACON_TIP).
export const BEACON_TIP = [0.2, 1.62, 0];
export function createBeacon() {
 const pole = piece(tube([[0, 0, 0], [-0.07, 0.55, 0], [0.09, 1.1, 0], [0.2, 1.56, 0]], (t) => 0.075 - t * 0.03, { sides: 6, segments: 9 }), { color: IRON });
 striped(pole, { from: 0, to: 1.5, every: 0.2 });
 return merge([pole, piece(new THREE.CylinderGeometry(0.11, 0.16, 0.12, 6), { color: STONE.dark, position: [0, 0.05, 0] })]);
}

// ── Verja de hierro desigual ────────────────────────────────────────────────
// Barrotes de alturas distintas, ninguno derecho, acabados en punta de lanza;
// dos largueros que suben y bajan. `runs`: [{ from, to }] en metros del mundo;
// `heightAt(x, z)`: el suelo. Todo en una sola malla.
export function createFences(runs, heightAt) {
 const random = randomFrom(0.137);
 const parts = [];
 for (const { from, to } of runs) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const count = Math.max(3, Math.round(length / 0.34));
  const yaw = -Math.atan2(to[1] - from[1], to[0] - from[0]);
  let last = null;
  for (let i = 0; i <= count; i++) {
   const t = i / count, x = from[0] + (to[0] - from[0]) * t, z = from[1] + (to[1] - from[1]) * t;
   const ground = heightAt(x, z);
   const post = i % 4 === 0; // cada cuatro, un poste más recio
   const tall = post ? 1.45 + random() * 0.3 : 0.95 + random() * 0.42;
   const tilt = [(random() - 0.5) * 0.22, 0, (random() - 0.5) * 0.3];
   const thick = post ? 0.06 : 0.032;
   parts.push(piece(box(thick, tall, thick), { color: IRON, position: [x, ground + tall / 2 - 0.06, z], rotation: tilt }));
   // Punta de lanza (los postes, una bola).
   const tipX = x - Math.sin(tilt[2]) * tall, tipY = ground + Math.cos(tilt[2]) * tall - 0.04;
   parts.push(piece(post ? new THREE.OctahedronGeometry(0.09, 0) : new THREE.ConeGeometry(0.05, 0.2, 4), { color: post ? BONE : IRON, position: [tipX, tipY + (post ? 0.02 : 0.06), z + Math.sin(tilt[0]) * tall], rotation: tilt }));
   // Largueros hasta el barrote anterior: dos, a alturas que bailan.
   const rails = [ground + 0.26 + random() * 0.07, ground + 0.78 + random() * 0.1];
   if (last) {
    rails.forEach((y, k) => {
     const span = Math.hypot(x - last.x, z - last.z), slope = Math.atan2(y - last.rails[k], span);
     parts.push(piece(box(span + 0.03, 0.026, 0.026), { color: IRON, position: [(x + last.x) / 2, (y + last.rails[k]) / 2, (z + last.z) / 2], rotation: [0, yaw, slope] }));
    });
   }
   last = { x, z, rails };
  }
 }
 return merge(parts);
}

// ── Matojo seco y roca en lasca ─────────────────────────────────────────────
// Unas briznas pálidas y tiesas, y una lasca de piedra clavada de canto.
export function createDryTuft() {
 const random = randomFrom(0.41);
 const blades = [];
 for (let i = 0; i < 7; i++) {
  const angle = (i / 7) * Math.PI * 2 + random(), lean = 0.15 + random() * 0.4, tall = 0.26 + random() * 0.34;
  const blade = new THREE.ConeGeometry(0.03, tall, 3).translate(0, tall / 2, 0);
  blades.push(piece(blade, { bottom: "#34315a", top: "#8f88b4", position: [Math.cos(angle) * 0.07, 0, Math.sin(angle) * 0.07], rotation: [Math.sin(angle) * lean, 0, -Math.cos(angle) * lean] }));
 }
 return merge(blades);
}
export function createShard() {
 // Roca suelta: tres bultos facetados de pizarra y una lasca clavada de canto,
 // con una costra de musgo arriba y unas setas pequeñas.
 const lump = (r, position, scale, seed) => piece(new THREE.IcosahedronGeometry(r, 1), { bottom: STONE.dark, top: STONE.mid, jitter: r * 0.17, vary: 0.16, seed, position, scale });
 const moss = (r, position, seed) => piece(new THREE.IcosahedronGeometry(r, 1), { bottom: "#22473c", top: "#427c64", jitter: r * 0.12, vary: 0.12, seed, position, scale: [1, 0.3, 0.92] });
 const parts = [
  lump(0.64, [0, 0.4, 0], [1, 0.86, 0.9], 3),
  lump(0.44, [0.6, 0.24, 0.22], [1.1, 0.74, 1], 8),
  lump(0.3, [-0.52, 0.16, 0.34], [1, 0.7, 1.1], 5),
  piece(new THREE.CylinderGeometry(0.1, 0.34, 1.35, 6, 3).translate(0, 0.62, 0), { bottom: STONE.dark, top: STONE.light, jitter: 0.07, vary: 0.14, seed: 11, position: [-0.2, 0.1, -0.38], rotation: [-0.18, 0.4, 0.2] }),
  moss(0.4, [0.02, 0.88, 0.02], 21),
  moss(0.26, [0.62, 0.52, 0.24], 22),
 ];
 for (const [x, y, z, size, tint] of [[0.2, 0.96, 0.12, 1, "#bfe6ea"], [-0.12, 0.95, -0.1, 0.7, "#cdb9ee"], [0.7, 0.58, 0.3, 0.8, "#bfe6ea"]]) {
  parts.push(piece(new THREE.CylinderGeometry(0.018 * size, 0.026 * size, 0.14 * size, 5).translate(0, 0.07 * size, 0), { color: "#d9d4e8", position: [x, y, z] }));
  parts.push(piece(new THREE.SphereGeometry(0.075 * size, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), { color: tint, position: [x, y + 0.12 * size, z], scale: [1, 0.75, 1] }));
 }
 return merge(parts);
}

// Roca del mar abierto: una aguja facetada, ancha de pie, con un hombro a media
// altura y una costra de musgo en la punta. Mide 1 de radio y 1 de alto: cada
// copia se estira a su tamaño.
export function createSeaRock() {
 return merge([
  piece(new THREE.CylinderGeometry(0.2, 1, 1, 8, 4).translate(0, 0.5, 0), { bottom: "#22203a", top: STONE.mid, jitter: 0.07, vary: 0.16, seed: 31 }),
  piece(new THREE.CylinderGeometry(0.16, 0.55, 0.6, 6, 2).translate(0, 0.3, 0), { bottom: "#22203a", top: STONE.mid, jitter: 0.05, vary: 0.16, seed: 37, position: [0.52, 0, 0.3], rotation: [0.1, 0.5, -0.22] }),
  piece(new THREE.IcosahedronGeometry(0.34, 1), { bottom: STONE.dark, top: STONE.mid, jitter: 0.05, vary: 0.14, seed: 41, position: [-0.6, 0.12, -0.25], scale: [1, 0.5, 1] }),
  piece(new THREE.IcosahedronGeometry(0.2, 1), { bottom: "#22473c", top: "#427c64", jitter: 0.02, vary: 0.1, seed: 43, position: [0.02, 0.99, 0], scale: [1, 0.22, 1] }),
 ]);
}

// Engranaje de latón (radio 1, de cara a +Z): disco, dientes y cubo. Es el que
// se recoge en cada parada y el que encaja en la fachada de la torre.
export function createGear(teeth = 9) {
 const parts = [
  piece(new THREE.CylinderGeometry(1, 1, 0.26, teeth * 2).rotateX(Math.PI / 2), { bottom: "#8a6427", top: "#e3bd62", vary: 0.06 }),
  piece(new THREE.CylinderGeometry(0.34, 0.34, 0.4, 8).rotateX(Math.PI / 2), { color: "#7a5820" }),
 ];
 for (let k = 0; k < teeth; k++) {
  const angle = (k / teeth) * Math.PI * 2;
  parts.push(piece(new THREE.BoxGeometry(0.32, 0.34, 0.26), { color: "#c1933f", position: [Math.sin(angle) * 1.1, Math.cos(angle) * 1.1, 0], rotation: [0, 0, -angle] }));
 }
 return merge(parts);
}

// ── La casa torcida ─────────────────────────────────────────────────────────
// Alta, estrecha y vencida: un zócalo de piedra, una planta baja que se abre
// hacia arriba, un piso que vuela sobre ella y se inclina al otro lado, y un
// tejado de aguja, empinadísimo, a franjas, que se retuerce y acaba doblando
// la punta. Chimenea en zigzag con el remate a rayas, torreón en la esquina,
// ventanas que no hay dos iguales, puerta en ojiva con su toldo a rayas.
//
// Se construye por «pisos»: secciones rectangulares a distintas alturas, cada
// una con su ancho, fondo, desplazamiento y giro; entre una y otra van las
// paredes. De esas mismas secciones sale dónde cae cada ventana (`anchor`).
// Ejes de la casa: fachada hacia +Z, altura en Y.

// Sección a la altura `y`, interpolando entre las dadas.
function frame(sections, y) {
 let i = 0;
 while (i < sections.length - 2 && y > sections[i + 1].y) i++;
 const a = sections[i], b = sections[i + 1];
 const t = Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y || 1)));
 const lerp = (key) => (a[key] ?? 0) + ((b[key] ?? 0) - (a[key] ?? 0)) * t;
 return { y, w: lerp("w"), d: lerp("d"), x: lerp("x"), z: lerp("z"), turn: lerp("turn") };
}
// Las cuatro esquinas de una sección.
function corners(s) {
 const cos = Math.cos(s.turn ?? 0), sin = Math.sin(s.turn ?? 0);
 return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([sx, sz]) => {
  const px = (sx * s.w) / 2, pz = (sz * s.d) / 2;
  return [(s.x ?? 0) + px * cos + pz * sin, s.y, (s.z ?? 0) - px * sin + pz * cos];
 });
}
// Paredes entre secciones consecutivas. `paint(tramo, cara)` da el color;
// `vary`: cuánto cambia de una cara a otra. `cap`: color de la tapa de arriba.
function loft(sections, paint, { vary = 0.07, seed = 0.5, cap = null } = {}) {
 const random = randomFrom(seed);
 const positions = [], colors = [];
 const colour = new THREE.Color(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
 const face = (p, q, r, out, tone) => {
  // Cara hacia fuera: si la normal mira hacia dentro, se le da la vuelta.
  a.set(...p), b.set(...q), c.set(...r);
  n.copy(b).sub(a).cross(c.clone().sub(a));
  const order = n.dot(out) >= 0 ? [p, q, r] : [p, r, q];
  for (const point of order) {
   positions.push(...point);
   colors.push(tone.r, tone.g, tone.b);
  }
 };
 const out = new THREE.Vector3();
 for (let i = 0; i < sections.length - 1; i++) {
  const low = corners(sections[i]), high = corners(sections[i + 1]);
  const cx = ((sections[i].x ?? 0) + (sections[i + 1].x ?? 0)) / 2, cz = ((sections[i].z ?? 0) + (sections[i + 1].z ?? 0)) / 2;
  for (let side = 0; side < 4; side++) {
   const next = (side + 1) % 4;
   out.set((low[side][0] + low[next][0]) / 2 - cx, 0.001, (low[side][2] + low[next][2]) / 2 - cz);
   colour.set(paint(i, side)).multiplyScalar(1 + (random() - 0.5) * 2 * vary);
   face(low[side], low[next], high[next], out, colour);
   face(low[side], high[next], high[side], out, colour);
  }
 }
 if (cap) {
  const top = corners(sections[sections.length - 1]);
  colour.set(cap);
  out.set(0, 1, 0);
  face(top[0], top[1], top[2], out, colour);
  face(top[0], top[2], top[3], out, colour);
 }
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
 geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
 return geometry;
}
// Reparte tramos iguales entre dos secciones (tablas, hiladas, franjas de teja).
function between(a, b, steps) {
 return Array.from({ length: steps + 1 }, (_, i) => {
  const t = i / steps;
  return Object.fromEntries(["y", "w", "d", "x", "z", "turn"].map((key) => [key, (a[key] ?? 0) + ((b[key] ?? 0) - (a[key] ?? 0)) * t]));
 });
}
// Un punto de una fachada: `side` (front, right, back, left), `u` de −1 a 1 a
// lo ancho, a la altura `y`, separado `out` metros de la pared. Devuelve la
// posición y el giro que encara una pieza hacia fuera.
function anchor(sections, side, u, y, out = 0) {
 const s = frame(sections, y);
 const local = { front: [(u * s.w) / 2, s.d / 2 + out, 0], back: [(-u * s.w) / 2, -s.d / 2 - out, Math.PI], right: [s.w / 2 + out, (-u * s.d) / 2, Math.PI / 2], left: [-s.w / 2 - out, (u * s.d) / 2, -Math.PI / 2] }[side];
 const [px, pz, face] = local;
 const cos = Math.cos(s.turn), sin = Math.sin(s.turn);
 return { position: [s.x + px * cos + pz * sin, y, s.z - px * sin + pz * cos], yaw: s.turn + face };
}

// Ventana: cristal en trapecio (más estrecho arriba o abajo), marco de cuatro
// listones, cruceta y alféizar. `lean`: cuánto se ladea.
function windowParts({ position, yaw }, { w = 0.9, h = 1.3, taper = 0.2, lean = 0, sill = true, shutter = 0 }) {
 const place = (geometry, options, at = [0, 0, 0], spin = 0) => {
  // Primero se coloca dentro de la ventana y luego la ventana en la fachada.
  const inner = piece(geometry, { ...options, position: at, rotation: [0, 0, spin] });
  inner.applyMatrix4(new THREE.Matrix4().makeRotationZ(lean));
  inner.applyMatrix4(new THREE.Matrix4().makeRotationY(yaw));
  inner.translate(...position);
  return inner;
 };
 const top = w * (1 - taper), slant = Math.atan2((w - top) / 2, h);
 const glass = new THREE.PlaneGeometry(w, h);
 const points = glass.attributes.position;
 for (let i = 0; i < points.count; i++) if (points.getY(i) > 0) points.setX(i, points.getX(i) * (top / w));
 const frameParts = [
  place(box(w + 0.16, 0.09, 0.1), { color: INK }, [0, -h / 2, 0.04]),
  place(box(top + 0.16, 0.09, 0.1), { color: INK }, [0, h / 2, 0.04]),
  place(box(0.09, h + 0.1, 0.1), { color: INK }, [-(w + top) / 4, 0, 0.04], -slant),
  place(box(0.09, h + 0.1, 0.1), { color: INK }, [(w + top) / 4, 0, 0.04], slant),
  place(box(0.045, h, 0.05), { color: INK }, [0.02, 0, 0.03], 0.05),
  place(box((w + top) / 2, 0.045, 0.05), { color: INK }, [0, 0.06, 0.03], -0.04),
 ];
 if (sill) frameParts.push(place(box(w + 0.42, 0.08, 0.26), { color: BONE }, [0, -h / 2 - 0.08, 0.1], 0.03));
 // Contraventana descolgada, a un lado.
 if (shutter) frameParts.push(place(box(w * 0.46, h * 0.98, 0.05), { bottom: WOOD.dark, top: WOOD.mid }, [shutter * (w / 2 + w * 0.3), -0.05, 0.07], shutter * 0.2));
 return { frame: frameParts, glass: [place(glass, {}, [0, 0, 0.025])] };
}

export function createHouse() {
 const frames = [], warm = [], acid = [], lights = [];
 // ── Volúmenes ──
 const BASE = [{ y: 0, w: 5.7, d: 5.1 }, { y: 0.34, w: 5.56, d: 4.96, x: 0.02 }, { y: 0.62, w: 5.36, d: 4.78, x: 0.02 }];
 const LOW = between({ y: 0.62, w: 5.0, d: 4.4, x: 0.02, turn: 0 }, { y: 3.1, w: 5.34, d: 4.74, x: 0.2, turn: 0.05 }, 6);
 const JETTY = [{ y: 3.1, w: 5.66, d: 5.06, x: 0.2, turn: 0.05 }, { y: 3.34, w: 5.74, d: 5.14, x: 0.19, turn: 0.055 }];
 const HIGH = between({ y: 3.34, w: 5.5, d: 4.9, x: 0.19, turn: 0.055 }, { y: 5.72, w: 5.96, d: 5.3, x: -0.26, turn: 0.17 }, 6);
 const EAVE = [{ y: 5.72, w: 6.6, d: 5.94, x: -0.27, turn: 0.17 }, { y: 5.94, w: 6.7, d: 6.04, x: -0.28, turn: 0.18 }];
 // Tejado de aguja: se estrecha deprisa, se retuerce y la punta se vence hacia el este.
 const SPIRE = [
  { y: 5.94, w: 6.7, d: 6.04, x: -0.28, turn: 0.18 },
  { y: 6.7, w: 5.3, d: 4.8, x: -0.34, turn: 0.22 },
  { y: 7.6, w: 3.9, d: 3.55, x: -0.34, turn: 0.28 },
  { y: 8.5, w: 2.8, d: 2.55, x: -0.22, turn: 0.36 },
  { y: 9.4, w: 1.95, d: 1.8, x: 0.02, turn: 0.46 },
  { y: 10.2, w: 1.3, d: 1.2, x: 0.38, turn: 0.58 },
  { y: 10.9, w: 0.8, d: 0.74, x: 0.84, turn: 0.72 },
  { y: 11.4, w: 0.44, d: 0.4, x: 1.32, turn: 0.86 },
 ];
 const spire = [];
 for (let i = 0; i < SPIRE.length - 1; i++) spire.push(...between(SPIRE[i], SPIRE[i + 1], 2).slice(i ? 1 : 0));
 const body = [
  loft(BASE, (i) => (i ? STONE.mid : STONE.dark), { vary: 0.12, seed: 0.21 }),
  loft(LOW, (i) => (i % 2 ? WALL.mid : WALL.dark), { seed: 0.33 }),
  loft(JETTY, () => WOOD.dark, { cap: WOOD.dark, seed: 0.4 }),
  loft(HIGH, (i) => (i % 2 ? WALL.light : WALL.mid), { seed: 0.47 }),
  loft(EAVE, () => INK, { seed: 0.5 }),
  // Tejas a franjas, clara y oscura.
  loft(spire, (i) => (i % 2 ? ROOF.b : ROOF.a), { vary: 0.09, seed: 0.62 }),
  // La punta, doblada como un gorro.
  piece(tube([[1.32, 11.36, 0], [1.66, 11.72, 0.04], [2.1, 11.74, 0.1], [2.34, 11.46, 0.14], [2.22, 11.22, 0.14]], (t) => 0.2 * (1 - t) + 0.03, { sides: 5, segments: 10 }), { color: ROOF.a, vary: 0.08 }),
  piece(new THREE.OctahedronGeometry(0.13, 0), { color: BONE, position: [2.2, 11.1, 0.14] }),
 ];
 // Entramado: postes en las esquinas del piso alto y dos aspas.
 for (const [side, u] of [["front", -0.97], ["front", 0.97], ["right", 0.97], ["left", -0.97]]) {
  const low = anchor(HIGH, side, u, 3.5, 0.03), high = anchor(HIGH, side, u, 5.6, 0.03);
  const dx = high.position[0] - low.position[0], dz = high.position[2] - low.position[2], tall = Math.hypot(dx, 2.1, dz);
  body.push(piece(box(0.16, tall, 0.16), { color: WOOD.dark, position: [(low.position[0] + high.position[0]) / 2, 4.55, (low.position[2] + high.position[2]) / 2], rotation: [Math.atan2(dz, 2.1), low.yaw, -Math.atan2(dx, 2.1)] }));
 }
 for (const spin of [0.8, -0.8]) {
  const at = anchor(HIGH, "front", 0.7, 4.5, 0.035);
  body.push(piece(box(0.1, 1.9, 0.06), { color: WOOD.dark, position: at.position, rotation: [0, at.yaw, spin] }));
 }

 // ── Chimenea en zigzag, con el remate a rayas ──
 const STACK = [
  { y: 6.3, w: 0.86, d: 0.86, x: -2.0, z: -1.0, turn: 0.2 },
  { y: 7.3, w: 0.8, d: 0.8, x: -2.34, z: -1.06, turn: 0.26 },
  { y: 8.2, w: 0.74, d: 0.74, x: -1.94, z: -0.98, turn: 0.16 },
  { y: 8.9, w: 0.7, d: 0.7, x: -2.24, z: -1.04, turn: 0.3 },
 ];
 const BANDS = between({ ...STACK[3] }, { y: 9.86, w: 0.64, d: 0.64, x: -2.02, z: -1.0, turn: 0.2 }, 4);
 const CROWN = [{ y: 9.86, w: 0.9, d: 0.9, x: -2.02, z: -1.0, turn: 0.2 }, { y: 10.06, w: 0.98, d: 0.98, x: -2.0, z: -1.0, turn: 0.2 }];
 body.push(
  loft(STACK, () => STONE.mid, { vary: 0.14, seed: 0.71 }),
  loft(BANDS, (i) => (i % 2 ? INK : BONE), { vary: 0.03, seed: 0.72 }),
  loft(CROWN, () => INK, { cap: INK, seed: 0.73 }),
  piece(new THREE.CylinderGeometry(0.2, 0.26, 0.42, 6), { color: STONE.dark, position: [-2.0, 10.26, -1.0], rotation: [0, 0, -0.14] }),
 );

 // ── Torreón en la esquina, con su gorro vencido ──
 const TOWER = { x: -2.72, z: 2.16 };
 body.push(
  piece(new THREE.CylinderGeometry(0.98, 0.7, 2.5, 7, 3), { bottom: WALL.dark, top: WALL.light, vary: 0.08, seed: 12, position: [TOWER.x, 4.45, TOWER.z], rotation: [0.03, 0.3, 0.08] }),
  piece(new THREE.ConeGeometry(0.72, 0.9, 7), { color: WOOD.dark, position: [TOWER.x + 0.06, 2.9, TOWER.z], rotation: [Math.PI, 0.3, 0] }),
  piece(new THREE.CylinderGeometry(1.14, 1.14, 0.14, 7), { color: INK, position: [TOWER.x - 0.1, 5.74, TOWER.z], rotation: [0.03, 0.3, 0.08] }),
 );
 // Gorro: un cono en cuatro tramos, cada uno más ladeado que el anterior, a franjas.
 [[1.12, 0.8, 5.8, -0.1, 0.1], [0.8, 0.5, 6.62, -0.2, 0.2], [0.5, 0.26, 7.34, -0.4, 0.36], [0.26, 0.04, 7.92, -0.74, 0.6]].forEach(([low, high, y, dx, tilt], i) => {
  body.push(piece(new THREE.CylinderGeometry(high, low, 0.86, 7).translate(0, 0.43, 0), { color: i % 2 ? ROOF.b : ROOF.a, vary: 0.08, seed: 20 + i, position: [TOWER.x + dx, y, TOWER.z], rotation: [0, 0.3, tilt] }));
 });

 // ── Ventanas ──
 const add = (at, options, glass = warm) => {
  const made = windowParts(at, options);
  frames.push(...made.frame);
  glass.push(...made.glass);
  return at;
 };
 // Planta baja: una alta junto a la puerta y otra en el costado.
 lights.push({ at: add(anchor(LOW, "front", 0.52, 1.95, 0.02), { w: 1.0, h: 1.5, taper: 0.24, lean: 0.07, shutter: 1 }), power: 0.9 });
 add(anchor(LOW, "right", 0.1, 1.9, 0.02), { w: 0.9, h: 1.3, taper: -0.2, lean: -0.06 });
 add(anchor(LOW, "left", -0.2, 1.9, 0.02), { w: 0.8, h: 1.2, taper: 0.18, lean: 0.05 });
 // Piso alto: dos en la fachada, distintas, y una a cada lado.
 lights.push({ at: add(anchor(HIGH, "front", -0.3, 4.5, 0.02), { w: 0.95, h: 1.25, taper: -0.22, lean: -0.09 }), power: 0.6 });
 add(anchor(HIGH, "front", 0.2, 4.66, 0.02), { w: 0.62, h: 0.92, taper: 0.3, lean: 0.12, sill: false });
 add(anchor(HIGH, "right", -0.2, 4.5, 0.02), { w: 0.9, h: 1.2, taper: 0.25, lean: 0.08, shutter: -1 });
 add(anchor(HIGH, "left", 0.3, 4.55, 0.02), { w: 0.7, h: 1.0, taper: 0.2, lean: -0.1 });
 // Torreón: una ventanita.
 add({ position: [TOWER.x + 0.2, 4.6, TOWER.z + 0.9], yaw: 0.16 }, { w: 0.5, h: 0.8, taper: 0.3, lean: 0.06, sill: false });
 // Buhardilla redonda, en verde ácido: el ojo de la casa.
 {
  const at = anchor(spire, "front", 0.04, 7.05, 0.2);
  const tilt = new THREE.Matrix4().makeRotationX(-0.52), turn = new THREE.Matrix4().makeRotationY(at.yaw);
  const put = (geometry, options) => {
   const made = piece(geometry, options);
   made.applyMatrix4(tilt).applyMatrix4(turn).translate(...at.position);
   return made;
  };
  frames.push(put(new THREE.TorusGeometry(0.46, 0.08, 5, 9), { color: INK }), put(box(0.92, 0.05, 0.06), { color: INK, rotation: [0, 0, 0.5] }), put(box(0.92, 0.05, 0.06), { color: INK, rotation: [0, 0, -1.07] }));
  // Tejadillo de la buhardilla.
  frames.push(put(box(1.3, 0.1, 0.5), { color: ROOF.a, position: [-0.34, 0.5, 0.16], rotation: [0, 0, 0.72] }), put(box(1.3, 0.1, 0.5), { color: ROOF.b, position: [0.34, 0.5, 0.16], rotation: [0, 0, -0.72] }));
  acid.push(put(new THREE.CircleGeometry(0.44, 9), { position: [0, 0, -0.02] }));
 }

 // ── Puerta en ojiva, escalones, toldo a rayas y farol ──
 const door = anchor(LOW, "front", -0.34, 0.62, 0.02);
 const onDoor = (geometry, options) => {
  const made = piece(geometry, options);
  made.applyMatrix4(new THREE.Matrix4().makeRotationY(door.yaw)).translate(...door.position);
  return made;
 };
 const arch = (w, h, peak, depth) => {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2 + 0.05, h);
  shape.quadraticCurveTo(w / 2 - 0.02, h + peak * 0.7, 0.07, h + peak);
  shape.quadraticCurveTo(-w / 2 + 0.06, h + peak * 0.6, -w / 2 - 0.03, h);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 });
 };
 frames.push(
  onDoor(arch(1.36, 1.86, 0.86, 0.1), { color: BONE, position: [0, 0, 0], rotation: [0, 0, 0.03] }),
  onDoor(arch(1.08, 1.74, 0.74, 0.14), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.1, position: [0.01, 0, 0.02], rotation: [0, 0, 0.03] }),
  // Tablas y herrajes.
  onDoor(box(0.03, 1.9, 0.02), { color: INK, position: [-0.17, 1.0, 0.17], rotation: [0, 0, 0.03] }),
  onDoor(box(0.03, 2.1, 0.02), { color: INK, position: [0.19, 1.08, 0.17], rotation: [0, 0, 0.03] }),
  onDoor(box(0.9, 0.07, 0.03), { color: IRON, position: [0, 0.5, 0.18], rotation: [0, 0, 0.05] }),
  onDoor(box(0.86, 0.07, 0.03), { color: IRON, position: [0.02, 1.56, 0.18], rotation: [0, 0, 0.0] }),
  onDoor(new THREE.SphereGeometry(0.075, 6, 5), { color: WARM, position: [0.36, 1.0, 0.2] }),
  // Escalones de piedra, cada uno a su aire.
  onDoor(box(2.1, 0.22, 0.86), { bottom: STONE.dark, top: STONE.light, jitter: 0.025, position: [0.02, -0.5, 0.56], rotation: [0, 0.05, 0.015] }),
  onDoor(box(1.74, 0.22, 0.6), { bottom: STONE.dark, top: STONE.light, jitter: 0.025, seed: 4, position: [-0.04, -0.3, 0.38], rotation: [0, -0.04, -0.02] }),
  onDoor(box(1.5, 0.2, 0.4), { bottom: STONE.mid, top: STONE.light, jitter: 0.02, seed: 6, position: [0.03, -0.1, 0.22], rotation: [0, 0.03, 0.02] }),
 );
 // Toldo: ocho tiras, blanca y negra, colgando torcido sobre la puerta.
 for (let i = 0; i < 8; i++) {
  frames.push(onDoor(box(0.25, 0.06, 1.0), { color: i % 2 ? INK : BONE, position: [-0.875 + i * 0.25, 2.98 - i * 0.022, 0.5], rotation: [0.5, 0, -0.085] }));
  frames.push(onDoor(new THREE.ConeGeometry(0.125, 0.2, 3), { color: i % 2 ? INK : BONE, position: [-0.875 + i * 0.25, 2.66 - i * 0.022, 0.96], rotation: [Math.PI + 0.1, 0.52, 0] }));
 }
 for (const x of [-0.98, 0.98]) frames.push(onDoor(box(0.05, 0.9, 0.05), { color: IRON, position: [x, 2.52 - (x > 0 ? 0.16 : 0), 0.5], rotation: [0.86, 0, 0] }));
 // Farol de la puerta: un brazo torcido y el cristal, que va con los encendidos.
 const lampAt = [1.12, 2.02, 0.42];
 frames.push(
  onDoor(tube([[0.94, 2.5, 0.02], [1.04, 2.62, 0.2], [1.12, 2.52, 0.4], [1.12, 2.32, 0.42]], () => 0.026, { sides: 4, segments: 6 }), { color: IRON }),
  onDoor(new THREE.ConeGeometry(0.19, 0.22, 5), { color: IRON, position: [lampAt[0], lampAt[1] + 0.24, lampAt[2]], rotation: [0, 0, 0.1] }),
  onDoor(new THREE.CylinderGeometry(0.13, 0.08, 0.05, 5), { color: IRON, position: [lampAt[0], lampAt[1] - 0.16, lampAt[2]] }),
 );
 // (El farol, cálido; las ventanas, violetas: va aparte.)
 const lantern = [onDoor(box(0.2, 0.28, 0.2), { position: lampAt })];
 const lamp = new THREE.Vector3(...lampAt).applyAxisAngle(new THREE.Vector3(0, 1, 0), door.yaw).add(new THREE.Vector3(...door.position));

 return {
  body: merge([...body, ...frames]),
  // Los cristales, aparte: se encienden.
  warm: merge(warm),
  acid: merge(acid),
  lantern: merge(lantern),
  // Dónde alumbra, en los ejes de la casa: el farol de la puerta y las ventanas de la fachada.
  lamp: lamp.toArray(),
  door: door.position,
  windows: lights.map(({ at, power }) => ({ position: at.position, yaw: at.yaw, power })),
  smoke: [-2.0, 10.5, -1.0],
 };
}

// ── Escaleras de piedra ─────────────────────────────────────────────────────
// Peldaños a lo largo de cada rampa: losas gruesas, cada una algo descolocada,
// que bajan hasta el suelo (donde la escalera va exenta hacen de macizo), y un
// bordillo a cada lado. `stairs`: las de layout.js. Todo en una sola malla.
export function createStairs(stairs) {
 const random = randomFrom(0.271);
 const parts = [];
 for (const stair of stairs) {
  const TREAD = 0.46, count = Math.round(stair.length / TREAD);
  for (let i = 0; i < count; i++) {
   const s = ((i + 0.5) / count) * stair.length;
   // Dónde cae ese tramo de la rampa y hacia dónde sube.
   let k = 0;
   while (k < stair.lengths.length - 2 && s > stair.lengths[k + 1]) k++;
   const t = (s - stair.lengths[k]) / (stair.lengths[k + 1] - stair.lengths[k]);
   const [ax, az] = stair.through[k], [bx, bz] = stair.through[k + 1];
   const x = ax + (bx - ax) * t, z = az + (bz - az) * t, yaw = Math.atan2(bx - ax, bz - az);
   // (El peldaño queda a ras de la rampa por su canto alto: se pisa la rampa, no el escalón.)
   const top = stair.from + (stair.to - stair.from) * ((i + 1) / count) - 0.02;
   const tall = 2.4;
   parts.push(piece(box(stair.width + 0.1, tall, stair.length / count + 0.05), { bottom: STONE.dark, top: i % 2 ? STONE.light : STONE.mid, jitter: 0.02, vary: 0.1, seed: i + 1, position: [x, top - tall / 2, z], rotation: [0, yaw + (random() - 0.5) * 0.05, (random() - 0.5) * 0.02] }));
   // Bordillos: un sillar a cada lado cada dos peldaños.
   if (i % 2 === 0) {
    for (const side of [-1, 1]) {
     const ox = Math.cos(yaw) * side * (stair.width / 2 + 0.16), oz = -Math.sin(yaw) * side * (stair.width / 2 + 0.16);
     parts.push(piece(box(0.3, tall + 0.34, (stair.length / count) * 2 + 0.06), { bottom: STONE.dark, top: STONE.mid, jitter: 0.03, vary: 0.12, seed: i + 40, position: [x + ox, top - tall / 2 + 0.2, z + oz], rotation: [0, yaw, 0] }));
    }
   }
  }
 }
 return merge(parts);
}

// ── Puentes ─────────────────────────────────────────────────────────────────
// Los colgantes: tablas sueltas sobre dos maromas, pasamanos de cuerda que se
// comban y cuatro postes gruesos, cada uno con su pie de piedra, clavados en
// el borde del cortado (donde el tablero deja la tierra: `bridge.span`); el
// puente cuelga de poste a poste y, antes de ellos, dos tablones hacen de umbral. Las pasarelas: tablones sobre dos vigas,
// con una baranda baja. `deck(bridge, t)`: la altura del tablero (layout.js).
const ROPE = "#b9a27a";
export function createBridges(bridges, deck) {
 const random = randomFrom(0.613);
 const parts = [];
 for (const bridge of bridges) {
  const yaw = Math.atan2(bridge.ux, bridge.uz);
  const at = (t, side = 0, lift = 0) => [bridge.from[0] + bridge.ux * bridge.length * t - bridge.uz * side, deck(bridge, t) + lift, bridge.from[1] + bridge.uz * bridge.length * t + bridge.ux * side];
  const planks = Math.round(bridge.length / (bridge.rope ? 0.36 : 0.42));
  const [hangs, lands] = bridge.span, threshold = 0.75 / bridge.length;
  for (let i = 0; i < planks; i++) {
   const t = (i + 0.5) / planks, [x, y, z] = at(t);
   // (Sobre tierra firme no hay tablas: se pisa el camino. Solo el umbral, ante los postes.)
   if (bridge.rope && (t < hangs - threshold || t > lands + threshold)) continue;
   const slope = Math.atan2(deck(bridge, t + 0.02) - deck(bridge, t - 0.02), bridge.length * 0.04);
   parts.push(piece(box(bridge.width + (bridge.rope ? 0.1 : 0.3), bridge.rope ? 0.06 : 0.1, bridge.rope ? 0.27 : 0.36), { color: i % 3 ? WOOD.mid : "#4a3b50", vary: 0.14, seed: i + 3, position: [x, y - 0.05, z], rotation: [-slope + (random() - 0.5) * 0.05, yaw + (random() - 0.5) * (bridge.rope ? 0.1 : 0.04), (random() - 0.5) * (bridge.rope ? 0.07 : 0.02)] }));
  }
  const half = bridge.width / 2 + 0.06;
  for (const side of [-half, half]) {
   // (De poste a poste en los colgantes; de extremo a extremo en las pasarelas.)
   const line = (lift, sag) => Array.from({ length: 9 }, (_, k) => {
    const [x, y, z] = at(hangs + (lands - hangs) * (k / 8), side, lift);
    return [x, y - Math.sin((k / 8) * Math.PI) * sag, z];
   });
   if (bridge.rope) {
    // Maroma bajo las tablas y pasamanos de cuerda, que se comba más que el tablero.
    parts.push(piece(tube(line(-0.1, 0), () => 0.035, { sides: 4, segments: 10 }), { color: ROPE }));
    parts.push(piece(tube(line(1.02, 0.34), () => 0.028, { sides: 4, segments: 10 }), { color: ROPE }));
    // Tirantes del pasamanos al tablero.
    for (let k = 1; k < 8; k++) {
     const [x, y, z] = at(hangs + (lands - hangs) * (k / 8), side), high = 1.02 - Math.sin((k / 8) * Math.PI) * 0.34;
     parts.push(piece(box(0.018, high, 0.018), { color: ROPE, position: [x, y + high / 2, z] }));
    }
    // Postes en el borde del cortado, cada uno algo vencido: tronco grueso hincado un metro,
    // pie de piedra, y la maroma atada con dos vueltas.
    for (const end of [hangs, lands]) {
     const [x, , z] = at(end, side * 1.06), y = bridge.y + 0.04;
     const lean = [(random() - 0.5) * 0.12, (random() - 0.5) * 0.12];
     parts.push(
      piece(tube([[0, -1.0, 0], [lean[0] * 0.4, 0.5, lean[1] * 0.4], [lean[0], 1.5, lean[1]]], (t) => 0.13 - t * 0.035, { sides: 6, segments: 4 }), { bottom: WOOD.dark, top: "#5a4658", vary: 0.1, position: [x, y, z] }),
      piece(new THREE.CylinderGeometry(0.11, 0.13, 0.07, 6), { color: WOOD.dark, position: [x + lean[0], y + 1.53, z + lean[1]] }),
      piece(new THREE.TorusGeometry(0.115, 0.03, 4, 7).rotateX(Math.PI / 2), { color: ROPE, position: [x + lean[0] * 0.7, y + 1.04, z + lean[1] * 0.7] }),
      piece(new THREE.TorusGeometry(0.12, 0.03, 4, 7).rotateX(Math.PI / 2), { color: ROPE, position: [x + lean[0] * 0.65, y + 0.96, z + lean[1] * 0.65] }),
      piece(new THREE.DodecahedronGeometry(0.3, 0), { bottom: STONE.dark, top: STONE.light, jitter: 0.03, vary: 0.12, seed: 7, position: [x, y - 0.06, z], scale: [1, 0.55, 1] }),
     );
    }
   } else {
    // Viga bajo los tablones y baranda baja sobre montantes.
    parts.push(piece(tube(line(-0.16, 0), () => 0.07, { sides: 4, segments: 6 }), { color: WOOD.dark }));
    parts.push(piece(tube(line(0.62, 0), () => 0.035, { sides: 4, segments: 6 }), { color: WOOD.mid }));
    for (let k = 0; k <= 3; k++) {
     const [x, y, z] = at(k / 3, side);
     parts.push(piece(box(0.09, 0.82, 0.09), { bottom: WOOD.dark, top: WOOD.mid, position: [x, y + 0.26, z], rotation: [(random() - 0.5) * 0.12, yaw, (random() - 0.5) * 0.12] }));
    }
   }
  }
 }
 return merge(parts);
}

// ── Piedras del agua ────────────────────────────────────────────────────────
// Las que cercan el manantial del macizo (menos por donde sale el reguero) y
// las dos que flanquean el labio de cada cascada: el agua rebosa entre ellas.
export function createWaterStones(spring, run, falls, heightAt) {
 const random = randomFrom(0.512);
 const parts = [];
 const stone = (x, z, r, sink = 0.35) => parts.push(piece(new THREE.DodecahedronGeometry(r, 0), { bottom: STONE.dark, top: STONE.light, jitter: r * 0.12, vary: 0.14, seed: 1 + Math.floor(random() * 90), position: [x, heightAt(x, z) + r * (0.62 - sink), z], rotation: [random() * 3, random() * 3, random() * 3], scale: [1, 0.62 + random() * 0.2, 1] }));
 const outlet = Math.atan2(run[1][1] - run[0][1], run[1][0] - run[0][0]);
 for (let k = 0; k < 11; k++) {
  const angle = (k / 11) * Math.PI * 2 + 0.2;
  // (Por donde sale el agua no hay piedra.)
  if (Math.abs(Math.atan2(Math.sin(angle - outlet), Math.cos(angle - outlet))) < 0.75) continue;
  const away = spring.r + 0.12 + random() * 0.18;
  stone(spring.x + Math.cos(angle) * away, spring.z + Math.sin(angle) * away, 0.24 + random() * 0.2);
 }
 for (const fall of falls) {
  const side = [Math.cos(fall.turn), -Math.sin(fall.turn)], out = [Math.sin(fall.turn), Math.cos(fall.turn)];
  for (const s of [-1, 1]) {
   const away = fall.width / 2 + 0.3;
   stone(fall.lip[0] + side[0] * away * s - out[0] * 0.35, fall.lip[1] + side[1] * away * s - out[1] * 0.35, 0.3 + random() * 0.14, 0.2);
  }
 }
 return merge(parts);
}

// ── Farolillo de Woody ──────────────────────────────────────────────────────
// Pequeño, colgado del cuello: un sombrerete, cuatro montantes y la base. El cristal va aparte.
export function createCollarLantern() {
 return merge([
  piece(new THREE.ConeGeometry(0.075, 0.07, 5), { color: IRON, position: [0, 0.075, 0] }),
  piece(new THREE.TorusGeometry(0.03, 0.008, 4, 6), { color: IRON, position: [0, 0.13, 0] }),
  ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => piece(limb(0.007, 0.007, 0.1, 4), { color: IRON, position: [x * 0.045, -0.06, z * 0.045] })),
  piece(new THREE.CylinderGeometry(0.068, 0.05, 0.022, 5), { color: IRON, position: [0, -0.07, 0] }),
 ]);
}
