import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { blade, merge, piece, randomFrom, tube } from "../living/kit/geometry";

// Modelos de The Cosmic Lab, hechos a mano con el kit low-poly del proyecto.
// Formas redondeadas y orgánicas —cúpulas, cápsulas, bulbos—, al revés que las
// torcidas de The Twisted Moon. Lo que emite luz lleva `lit` > 0 en sus
// vértices: el material decide cuánto brilla (ver materials.js).
export const SHELL = { dark: "#b3a6c9", mid: "#e4dcf0", light: "#fffaf2" }; // carcasas: crema lila
export const METAL = { dark: "#33285a", mid: "#55468a", light: "#7a69b8" }; // tinta violeta
export const MAGENTA = "#ff4fb0";
export const ENERGY = "#d8ff5c"; // amarillo lima: la energía del laboratorio
export const LIQUID = "#62f6e6"; // turquesa: el líquido que corre por los tubos
// Vegetación en gris claro: cada copia se tiñe con su color (instancias con color).
const PALE = { low: "#9c96ac", high: "#f1eef6" };

// Une unas piezas apagadas con otras que emiten luz (`lit` = cuánto, de 0 a 1).
function withLit(solid, lit, amount = 1) {
 const a = merge(solid), b = merge(lit);
 a.setAttribute("lit", new THREE.BufferAttribute(new Float32Array(a.attributes.position.count), 1));
 b.setAttribute("lit", new THREE.BufferAttribute(new Float32Array(b.attributes.position.count).fill(amount), 1));
 const whole = mergeGeometries([a, b]);
 a.dispose();
 b.dispose();
 whole.computeBoundingSphere();
 return whole;
}
const ball = (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail);
const drum = (top, bottom, tall, sides = 12) => new THREE.CylinderGeometry(top, bottom, tall, sides, 1).translate(0, tall / 2, 0);
const ring = (r, thick, sides = 14) => new THREE.TorusGeometry(r, thick, 5, sides).rotateX(Math.PI / 2);
// Media esfera: `up` = la de arriba (cúpula) o la de abajo (cuenco).
const half = (r, up = true, around = 12, rows = 5) => new THREE.SphereGeometry(r, around, rows, 0, Math.PI * 2, up ? 0 : Math.PI / 2, Math.PI / 2);

// ── La máquina (la de Dosia) ────────────────────────────────────────────────
// Una cápsula de cristal sobre su peana, con dos depósitos a un lado, una
// antena al otro —de su punta sale el rayo— y una consola delante. Dentro,
// tres placas que flotan. Mide unos 3,5 m; el frente es +Z.
//  · body: carcasa y luces; · glass: la cúpula (va aparte: es translúcida).
export function createMachine(tip) {
 const solid = [
  piece(drum(1.5, 1.68, 0.45, 14), { bottom: SHELL.dark, top: SHELL.mid, jitter: 0.03, vary: 0.06, seed: 2 }),
  piece(ring(1.5, 0.09), { color: METAL.mid, position: [0, 0.47, 0] }),
  piece(drum(0.95, 1.1, 0.55, 12), { bottom: METAL.dark, top: METAL.mid, position: [0, 0.45, 0] }),
  // El cuenco de la cápsula y su aro.
  piece(half(1.08, false), { bottom: SHELL.mid, top: SHELL.light, vary: 0.05, seed: 4, position: [0, 1.95, 0] }),
  piece(ring(1.1, 0.1), { color: MAGENTA, position: [0, 1.95, 0] }),
  // Remate de la cúpula.
  piece(drum(0.2, 0.3, 0.16, 8), { color: METAL.mid, position: [0, 3.62, 0] }),
  // Depósitos: dos bombonas con su armazón.
  ...[-0.42, 0.42].flatMap((z, i) => [
   piece(drum(0.36, 0.4, 0.22, 8), { color: METAL.mid, position: [-1.32, 0.42, z] }),
   piece(drum(0.3, 0.36, 0.2, 8), { color: METAL.mid, position: [-1.32, 1.72, z] }),
   piece(ball(0.2), { color: SHELL.mid, seed: 6 + i, position: [-1.32, 1.98, z], scale: [1, 0.7, 1] }),
  ]),
  // Antena: mástil que sube inclinado, con dos aros.
  piece(tube([[0.7, 0.9, -0.15], [1.0, 2.2, -0.2], [tip[0], tip[1] - 0.25, tip[2]]], (t) => 0.1 * (1 - t) + 0.04, { sides: 5, segments: 6 }), { bottom: METAL.dark, top: METAL.light }),
  piece(ring(0.2, 0.04, 8), { color: SHELL.mid, position: [tip[0] - 0.02, tip[1] - 0.75, tip[2]] }),
  piece(ring(0.14, 0.035, 8), { color: SHELL.mid, position: [tip[0], tip[1] - 0.45, tip[2]] }),
  // Consola, delante, sobre un pie.
  piece(drum(0.1, 0.16, 0.8, 6), { color: METAL.mid, position: [0, 0.3, 1.55] }),
  piece(new THREE.BoxGeometry(1.0, 0.14, 0.6), { bottom: SHELL.dark, top: SHELL.light, jitter: 0.015, seed: 9, position: [0, 1.14, 1.58], rotation: [0.55, 0, 0] }),
  // La toma del tubo que va al núcleo.
  piece(tube([[-0.8, 0.5, 0.8], [-1.0, 0.36, 1.1], [-1.1, 0.17, 1.3]], () => 0.17, { sides: 6, segments: 4 }), { color: METAL.mid }),
 ];
 const lit = [
  // Las tres placas que flotan dentro de la cúpula.
  ...[2.2, 2.55, 2.9].map((y, i) => piece(new THREE.BoxGeometry(0.86 - i * 0.14, 0.07, 0.56 - i * 0.08), { color: i === 1 ? LIQUID : ENERGY, position: [0, y, 0], rotation: [0, 0.5 + i * 0.7, 0] })),
  piece(drum(0.05, 0.05, 1.05, 5), { color: LIQUID, position: [0, 2.0, 0] }),
  // El líquido de los depósitos.
  ...[-0.42, 0.42].map((z) => piece(drum(0.3, 0.3, 1.08, 8), { bottom: "#1fc9bd", top: LIQUID, position: [-1.32, 0.64, z] })),
  // La punta de la antena y los botones de la consola.
  piece(ball(0.17), { color: ENERGY, position: tip }),
  ...[[-0.3, ENERGY], [0, MAGENTA], [0.3, LIQUID]].map(([x, color]) => piece(new THREE.BoxGeometry(0.16, 0.06, 0.16), { color, position: [x, 1.22, 1.55], rotation: [0.55, 0, 0] })),
  // Una franja de luz en la peana.
  piece(drum(1.7, 1.7, 0.07, 14), { color: LIQUID, position: [0, 0.16, 0] }),
 ];
 const glass = merge([piece(half(1.04, true, 12, 6), { color: "#ffffff", position: [0, 1.95, 0], scale: [1, 1.62, 1] })]);
 return { body: withLit(solid, lit), glass };
}

// Lo que comparten las máquinas del laboratorio (el aparato de encima es un
// modelo convertido; ver LabScene.jsx): una peana redonda con su franja de luz,
// la antena —un mástil a un lado; de su punta sale el rayo— y la toma del tubo
// que va al núcleo.
export function createMachineBase(tip) {
 return withLit(
  [
   piece(drum(2.3, 2.5, 0.2, 16), { bottom: SHELL.dark, top: SHELL.mid, jitter: 0.03, vary: 0.06, seed: 61 }),
   piece(drum(0.34, 0.46, 0.5, 8), { bottom: METAL.dark, top: METAL.mid, position: [tip[0], 0.15, tip[2]] }),
   piece(tube([[tip[0], 0.5, tip[2]], [tip[0] - 0.12, 2.4, tip[2]], [tip[0], tip[1] - 0.25, tip[2]]], (t) => 0.11 * (1 - t) + 0.04, { sides: 5, segments: 6 }), { bottom: METAL.dark, top: METAL.light }),
   piece(ring(0.2, 0.04, 8), { color: SHELL.mid, position: [tip[0] - 0.04, tip[1] - 0.8, tip[2]] }),
   piece(ring(0.14, 0.035, 8), { color: SHELL.mid, position: [tip[0], tip[1] - 0.46, tip[2]] }),
   piece(tube([[-0.9, 0.3, 1.0], [-1.0, 0.24, 1.15], [-1.1, 0.17, 1.3]], () => 0.17, { sides: 6, segments: 3 }), { color: METAL.mid }),
  ],
  [piece(drum(2.52, 2.52, 0.07, 16), { color: LIQUID, position: [0, 0.07, 0] }), piece(ball(0.17), { color: ENERGY, position: tip })],
 );
}
// La luz de estado de una máquina: un poste corto y su bombilla (va aparte: siempre encendida, de su color).
export const createStatusPost = () => merge([piece(drum(0.05, 0.09, 0.9, 6), { color: METAL.mid }), piece(ring(0.13, 0.035, 8), { color: SHELL.mid, position: [0, 0.9, 0] })]);

// Sitio reservado de una máquina que aún no está: su peana y la cápsula cerrada, dormida.
export function createPod() {
 return merge([
  piece(drum(1.15, 1.3, 0.35, 12), { bottom: SHELL.dark, top: SHELL.mid, jitter: 0.03, vary: 0.06, seed: 12 }),
  piece(ring(1.14, 0.07), { color: METAL.mid, position: [0, 0.37, 0] }),
  piece(drum(0.55, 0.7, 0.4, 10), { color: METAL.mid, position: [0, 0.35, 0] }),
  piece(ball(0.88, 2), { bottom: SHELL.dark, top: SHELL.light, vary: 0.05, seed: 14, position: [0, 1.62, 0], scale: [1, 1.22, 1] }),
  piece(ring(0.9, 0.07), { color: METAL.light, position: [0, 1.62, 0] }),
  piece(drum(0.12, 0.2, 0.14, 6), { color: METAL.mid, position: [0, 2.66, 0] }),
 ]);
}

// ── El núcleo ───────────────────────────────────────────────────────────────
// Una tarima redonda, cuatro garras que suben y sostienen la esfera, y dos aros
// que giran a su alrededor cuando hay energía. La esfera y los aros van aparte.
export function createCore({ r, ball: lift }) {
 const solid = [
  piece(drum(r, r + 0.22, 0.3, 20), { bottom: SHELL.dark, top: SHELL.mid, jitter: 0.03, vary: 0.05, seed: 21 }),
  piece(drum(2.25, 2.4, 0.14, 16), { color: METAL.mid, position: [0, 0.3, 0] }),
  piece(drum(0.5, 0.95, 1.5, 10), { bottom: METAL.dark, top: METAL.light, position: [0, 0.4, 0] }),
  piece(half(0.72, false, 10, 4), { color: SHELL.mid, position: [0, 2.2, 0] }),
 ];
 for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
  solid.push(piece(tube([[c * 2.0, 0.35, s * 2.0], [c * 2.7, 1.7, s * 2.7], [c * 2.5, 3.2, s * 2.5], [c * 1.75, 4.2, s * 1.75], [c * 1.3, 4.3, s * 1.3]], (t) => 0.3 * (1 - t) + 0.09, { sides: 6, segments: 9 }), { bottom: SHELL.dark, top: SHELL.light, vary: 0.05, seed: 23 + i }));
 }
 const lit = [piece(drum(r + 0.24, r + 0.24, 0.06, 20), { color: ENERGY, position: [0, 0.1, 0] })];
 return {
  frame: withLit(solid, lit),
  ball: merge([piece(ball(1.3, 1), { color: "#ffffff", jitter: 0.05, vary: 0.16, seed: 31, position: [0, lift, 0] })]),
  ring: merge([piece(new THREE.TorusGeometry(1.85, 0.07, 5, 28), { color: SHELL.light })]),
 };
}
// Testigo de una máquina en la tarima del núcleo: un poste corto y su luz.
export function createCoreLamp() {
 return withLit([piece(drum(0.09, 0.14, 0.5, 6), { color: METAL.mid }), piece(ring(0.17, 0.04, 8), { color: SHELL.mid, position: [0, 0.5, 0] })], [piece(ball(0.2), { color: ENERGY, position: [0, 0.68, 0] })]);
}

// La antena del final: mástil, plato y su emisor. Hoy, apagada.
export function createAntenna() {
 const dish = new THREE.CylinderGeometry(1.75, 0.5, 0.62, 12, 1).translate(0, 0.31, 0);
 return withLit(
  [
   piece(drum(0.9, 1.1, 0.4, 10), { bottom: SHELL.dark, top: SHELL.mid, seed: 41 }),
   piece(tube([[0, 0.3, 0], [0.1, 2.4, 0], [0, 4.6, 0]], (t) => 0.26 * (1 - t) + 0.12, { sides: 6, segments: 6 }), { bottom: SHELL.dark, top: SHELL.light, vary: 0.05 }),
   piece(ring(0.32, 0.06, 8), { color: METAL.mid, position: [0.06, 1.6, 0] }),
   piece(ring(0.26, 0.05, 8), { color: MAGENTA, position: [0.06, 3.1, 0] }),
   // El plato: un cuenco macizo, vuelto hacia arriba y hacia quien llega.
   piece(dish, { bottom: SHELL.dark, top: SHELL.light, vary: 0.06, seed: 43, position: [0, 4.45, 0], rotation: [0.6, 0, 0.1] }),
   piece(drum(1.5, 1.5, 0.06, 12), { color: METAL.light, position: [0, 4.99, 0.36], rotation: [0.6, 0, 0.1] }),
   piece(drum(0.04, 0.07, 1.2, 5), { color: METAL.mid, position: [0, 4.95, 0.34], rotation: [0.6, 0, 0.1] }),
  ],
  [piece(ball(0.17), { color: MAGENTA, position: [-0.1, 5.98, 1.05] })],
 );
}

// ── Tubos y rayo ────────────────────────────────────────────────────────────
// Tubo tendido por el suelo siguiendo unos puntos [[x, z], …]. Lleva en `along`
// los metros recorridos: con eso el material hace correr el líquido.
export function createPipe(points, heightAt, radius = 0.17) {
 const dense = [];
 const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
 const steps = Math.ceil(curve.getLength() / 0.7);
 for (let i = 0; i <= steps; i++) {
  const p = curve.getPointAt(i / steps);
  dense.push([p.x, heightAt(p.x, p.z) + radius * 0.75, p.z]);
 }
 const geometry = tube(dense, () => radius, { sides: 6, segments: steps });
 const position = geometry.attributes.position, along = new Float32Array(position.count);
 for (let i = 0; i < position.count; i++) {
  let best = Infinity;
  for (let k = 0; k < dense.length; k++) {
   const d = Math.hypot(position.getX(i) - dense[k][0], position.getZ(i) - dense[k][2]);
   if (d < best) (best = d), (along[i] = k * 0.7);
  }
 }
 geometry.setAttribute("along", new THREE.BufferAttribute(along, 1));
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}
// Losa redonda del camino.
export const createSlab = () => merge([piece(drum(1, 1.08, 0.1, 9), { bottom: SHELL.dark, top: SHELL.mid, jitter: 0.03, vary: 0.08, seed: 51 })]);

// ── Lo que crece ────────────────────────────────────────────────────────────
// Hongo gigante: pie que se tuerce, sombrero ancho con lunares que brillan y un collar a media altura.
export function createGiantMushroom() {
 const random = randomFrom(0.377);
 const solid = [
  piece(tube([[0, 0, 0], [0.25, 1.1, 0.05], [-0.1, 2.2, 0], [0.1, 3.0, 0]], (t) => 0.4 * (1 - t) + 0.24, { sides: 7, segments: 6 }), { bottom: "#b9a6d6", top: "#efe6f7", vary: 0.06 }),
  piece(half(1.7, true, 11, 4), { bottom: PALE.low, top: PALE.high, jitter: 0.05, vary: 0.1, seed: 3, position: [0.1, 2.85, 0], scale: [1, 0.62, 1] }),
  piece(new THREE.ConeGeometry(1.62, 0.5, 11), { color: "#77708a", position: [0.1, 2.72, 0], rotation: [Math.PI, 0, 0] }),
  piece(half(0.62, true, 8, 3), { bottom: PALE.low, top: PALE.high, seed: 5, position: [0.08, 1.5, 0.02], scale: [1, 0.4, 1] }),
 ];
 const lit = [];
 for (let i = 0; i < 7; i++) {
  const a = (i / 7) * Math.PI * 2 + random(), out = 0.5 + random() * 0.8, y = 2.85 + Math.sqrt(Math.max(0, 1.7 * 1.7 - out * out)) * 0.62;
  lit.push(piece(ball(0.2 + random() * 0.12, 0), { color: "#ffffff", position: [0.1 + Math.cos(a) * out, y - 0.02, Math.sin(a) * out], scale: [1, 0.4, 1] }));
 }
 return withLit(solid, lit, 0.7);
}
// Racimo de cristales hecho a mano (ya no se usa en el juego: los cristales son el modelo convertido; se conserva por si hiciera falta).
export function createCrystals() {
 const random = randomFrom(0.613);
 const shards = [];
 for (let i = 0; i < 5; i++) {
  const a = (i / 5) * Math.PI * 2 + random(), tall = i ? 0.7 + random() * 0.9 : 1.9, r = i ? 0.16 + random() * 0.12 : 0.3, out = i ? 0.35 + random() * 0.25 : 0;
  const shard = new THREE.CylinderGeometry(r * 0.55, r, tall, 5, 1).translate(0, tall / 2, 0);
  const point = new THREE.ConeGeometry(r * 0.55, r * 1.3, 5).translate(0, tall + r * 0.65, 0);
  for (const part of [shard, point]) shards.push(piece(part, { bottom: "#b9b3c8", top: "#ffffff", vary: 0.14, seed: 3 + i, position: [Math.cos(a) * out, -0.05, Math.sin(a) * out], rotation: [Math.sin(a) * out * 0.9, random(), -Math.cos(a) * out * 0.9] }));
 }
 return withLit([piece(ball(0.4, 0), { color: "#8d86a0", position: [0, -0.1, 0], scale: [1.3, 0.4, 1.3] })], shards, 0.42);
}
// Bulbo que late: un tallo, dos hojas y arriba la bolsa, que se hincha y brilla al compás (lo mueve el material).
export function createBulb() {
 return withLit(
  [
   piece(tube([[0, 0, 0], [0.06, 0.3, 0.02], [0, 0.6, 0]], (t) => 0.06 * (1 - t) + 0.035, { sides: 5, segments: 3 }), { bottom: "#7d7790", top: "#c9c4d6" }),
   piece(blade([[0, 0.05, 0], [0.22, 0.26, 0], [0.42, 0.2, 0]], 0.2, { facing: Math.PI / 2, tipWidth: 0.02 }), { bottom: "#8c86a0", top: "#d8d4e2" }),
   piece(blade([[0, 0.05, 0], [-0.2, 0.22, 0.1], [-0.38, 0.14, 0.18]], 0.18, { facing: Math.PI / 2 + 0.5, tipWidth: 0.02 }), { bottom: "#8c86a0", top: "#d8d4e2" }),
  ],
  [piece(ball(0.24, 1), { bottom: "#cfcfcf", top: "#ffffff", seed: 7, position: [0, 0.78, 0], scale: [1, 1.15, 1] })],
 );
}
// Tentáculos: cinco brazos que salen del suelo, se abren y enroscan la punta, con una perla en cada una.
export function createTentacles() {
 const random = randomFrom(0.829);
 const solid = [], lit = [];
 for (let i = 0; i < 5; i++) {
  const a = (i / 5) * Math.PI * 2 + random() * 0.6, tall = 1.0 + random() * 0.7, out = 0.3 + random() * 0.3, c = Math.cos(a), s = Math.sin(a);
  const path = [[c * 0.1, 0, s * 0.1], [c * out * 0.5, tall * 0.45, s * out * 0.5], [c * out, tall * 0.85, s * out], [c * (out + 0.16), tall, s * (out + 0.16)], [c * (out + 0.26), tall - 0.14, s * (out + 0.26)]];
  solid.push(piece(tube(path, (t) => 0.085 * (1 - t) + 0.03, { sides: 4, segments: 7 }), { bottom: "#77718c", top: PALE.high, vary: 0.08, seed: 3 + i }));
  lit.push(piece(ball(0.06, 0), { color: "#ffffff", position: path[4] }));
 }
 return withLit(solid, lit, 0.8);
}
// Brote menudo: tres rizos y una bolita.
export function createSprout() {
 const parts = [];
 for (let i = 0; i < 3; i++) {
  const a = (i / 3) * Math.PI * 2 + 0.4, c = Math.cos(a), s = Math.sin(a);
  parts.push(piece(blade([[0, 0, 0], [c * 0.1, 0.16, s * 0.1], [c * 0.2, 0.2, s * 0.2]], 0.07, { facing: a + Math.PI / 2, tipWidth: 0.01 }), { bottom: "#8b859e", top: "#ffffff" }));
 }
 parts.push(piece(ball(0.05, 0), { color: "#ffffff", position: [0, 0.1, 0] }));
 return merge(parts);
}
// Piedra redonda, lisa, con una hermana pequeña.
export function createStone() {
 return merge([
  piece(ball(0.62, 1), { bottom: "#3f2a70", top: "#8762c4", jitter: 0.05, vary: 0.12, seed: 3, position: [0, 0.3, 0], scale: [1.1, 0.72, 0.95] }),
  piece(ball(0.3, 1), { bottom: "#3f2a70", top: "#9a76d2", jitter: 0.03, vary: 0.1, seed: 5, position: [0.6, 0.14, 0.22], scale: [1, 0.7, 1] }),
 ]);
}
// Roca que flota: un bulto redondeado con la panza en punta, musgo magenta por arriba y un par de cristales.
export function createFloater() {
 return withLit(
  [
   piece(ball(1, 1), { bottom: "#3a2668", top: "#7a56b8", jitter: 0.08, vary: 0.14, seed: 3, scale: [1.15, 0.7, 1] }),
   piece(new THREE.ConeGeometry(0.78, 1.5, 7), { bottom: "#2c1c54", top: "#4a3382", jitter: 0.05, vary: 0.12, seed: 5, position: [0.05, -0.95, 0], rotation: [Math.PI, 0, 0] }),
   piece(ball(0.8, 1), { bottom: "#d0408f", top: "#ff7cc6", jitter: 0.05, vary: 0.1, seed: 7, position: [0, 0.42, 0], scale: [1.2, 0.3, 1.05] }),
   piece(ball(0.36, 1), { bottom: "#3a2668", top: "#7a56b8", jitter: 0.04, seed: 9, position: [1.25, -0.2, 0.3], scale: [1, 0.75, 1] }),
  ],
  [
   piece(new THREE.ConeGeometry(0.13, 0.7, 5), { color: LIQUID, position: [0.3, 0.9, 0.1], rotation: [0.1, 0, -0.2] }),
   piece(new THREE.ConeGeometry(0.09, 0.45, 5), { color: ENERGY, position: [-0.35, 0.78, -0.2], rotation: [-0.2, 0, 0.25] }),
  ],
  0.6,
 );
}
// Cúpula de cristal a lo lejos: un puesto del laboratorio. La base (con su suelo encendido) y el cristal, aparte.
export function createDome() {
 return {
  base: withLit([piece(drum(2.0, 2.2, 0.5, 12), { bottom: SHELL.dark, top: SHELL.mid, vary: 0.06, seed: 3 }), piece(drum(0.3, 0.4, 1.2, 6), { color: METAL.mid, position: [0, 0.5, 0] }), piece(ball(0.36, 1), { color: SHELL.light, position: [0, 1.9, 0] })], [piece(drum(1.7, 1.7, 0.06, 12), { color: ENERGY, position: [0, 0.5, 0] })], 0.8),
  glass: merge([piece(half(1.9, true, 12, 5), { color: "#ffffff", position: [0, 0.5, 0] })]),
 };
}

// ── La escafandra de Woody ──────────────────────────────────────────────────
// Un aro al cuello con una antenita, y la burbuja (aparte: es translúcida).
export function createHelmet() {
 return {
  collar: withLit([piece(ring(0.25, 0.045, 10), { color: SHELL.light }), piece(drum(0.012, 0.016, 0.22, 4), { color: METAL.mid, position: [0.2, 0.28, 0] })], [piece(ball(0.035, 0), { color: MAGENTA, position: [0.2, 0.52, 0] })]),
  bubble: new THREE.IcosahedronGeometry(0.34, 2),
 };
}

// ── El cielo ────────────────────────────────────────────────────────────────
// El planeta con anillos: una esfera facetada a bandas y su anillo, de radio 1.
export function createRingedPlanet() {
 const random = randomFrom(0.271);
 const body = new THREE.IcosahedronGeometry(1, 4);
 const points = body.attributes.position, colors = new Float32Array(points.count * 3), color = new THREE.Color();
 const bands = ["#ffd9a8", "#ff9fce", "#c98ae6", "#ffe9c4", "#8fe6d8", "#ffb3d6"].map((c) => new THREE.Color(c));
 for (let i = 0; i < points.count; i += 3) {
  const y = (points.getY(i) + points.getY(i + 1) + points.getY(i + 2)) / 3;
  color.copy(bands[Math.floor(((y + 1) / 2) * 5.99 + Math.sin(points.getX(i) * 3) * 0.25 + 0.25) % bands.length]).multiplyScalar(0.92 + random() * 0.16);
  for (let k = 0; k < 3; k++) color.toArray(colors, (i + k) * 3);
 }
 body.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 body.deleteAttribute("uv");
 const rings = new THREE.RingGeometry(1.35, 2.25, 48, 3).rotateX(-Math.PI / 2).toNonIndexed();
 const at = rings.attributes.position, tones = new Float32Array(at.count * 3);
 for (let i = 0; i < at.count; i += 3) {
  const r = Math.hypot((at.getX(i) + at.getX(i + 1) + at.getX(i + 2)) / 3, (at.getZ(i) + at.getZ(i + 1) + at.getZ(i + 2)) / 3);
  color.set(r < 1.65 ? "#fff0cf" : r < 1.95 ? "#ffa8d6" : "#bfa0f0");
  for (let k = 0; k < 3; k++) color.toArray(tones, (i + k) * 3);
 }
 rings.setAttribute("color", new THREE.BufferAttribute(tones, 3));
 rings.deleteAttribute("uv");
 rings.computeVertexNormals();
 return { body, rings };
}
