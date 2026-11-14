import { ROCK_SHAPES, createRock } from "../props/rockModel";
import * as THREE from "three";
import { blade, limb, merge, piece, randomFrom } from "../kit/geometry";
import { GRASS } from "../kit/palette";

// Modelos de la vegetación baja y de las rocas. Cada uno es una geometría
// única con colores de vértice, en metros y con el pie en el origen.

const lean = (angle, tilt) => [Math.sin(angle) * tilt, 0, -Math.cos(angle) * tilt];

// Mata de hierba: briznas curvas que se abren desde un punto.
function tuft(seed, { blades, height, width, spread, heads = 0 }) {
 const random = randomFrom(seed);
 const pieces = [];
 for (let i = 0; i < blades; i++) {
  const angle = (i / blades) * Math.PI * 2 + random() * 0.9;
  const tall = height * (0.7 + random() * 0.5);
  const out = spread * (0.5 + random() * 0.8);
  const dx = Math.cos(angle), dz = Math.sin(angle);
  const foot = [dx * 0.04, 0, dz * 0.04];
  const strip = blade([foot, [dx * out * 0.45, tall * 0.6, dz * out * 0.45], [dx * out, tall, dz * out]], width, { facing: angle + Math.PI / 2 + (random() - 0.5), tipWidth: 0 });
  pieces.push(piece(strip, { bottom: GRASS.base, top: random() < 0.25 ? GRASS.dry : GRASS.tip, seed: i }));
 }
 // Espigas: un tallo fino con la cabeza dorada.
 for (let i = 0; i < heads; i++) {
  const angle = random() * 6;
  const tall = height * (1.15 + random() * 0.3);
  const x = Math.cos(angle) * spread * 0.4, z = Math.sin(angle) * spread * 0.4;
  pieces.push(piece(limb(0.008, 0.006, tall, 3), { color: GRASS.dry, position: [x * 0.3, 0, z * 0.3], rotation: lean(angle, 0.12) }));
  pieces.push(piece(new THREE.OctahedronGeometry(1, 0), { bottom: GRASS.dry, top: GRASS.seed, position: [x * 0.3 + Math.cos(angle) * tall * 0.12, tall, z * 0.3 + Math.sin(angle) * tall * 0.12], scale: [0.022, 0.07, 0.022] }));
 }
 return merge(pieces);
}

const STEM = "#4d9a48";
const stalk = (height, x = 0, z = 0, tilt = [0, 0, 0]) => piece(limb(0.011, 0.008, height, 3), { color: STEM, position: [x, 0, z], rotation: tilt });
const leaf = (angle, length, x = 0, z = 0) =>
 piece(blade([[x, 0, z], [x + Math.cos(angle) * length * 0.5, length * 0.55, z + Math.sin(angle) * length * 0.5], [x + Math.cos(angle) * length, length * 0.5, z + Math.sin(angle) * length]], 0.05, { facing: angle + Math.PI / 2 }), { bottom: "#3f8a45", top: "#7cc25c" });

// Margaritas: disco de pétalos con el centro amarillo. Dos por modelo.
function daisy(petals) {
 const pieces = [];
 [[0, 0, 0.36], [0.09, 0.06, 0.26]].forEach(([x, z, height], i) => {
  pieces.push(stalk(height, x, z));
  pieces.push(piece(new THREE.CylinderGeometry(0.075, 0.06, 0.014, 7), { color: petals, position: [x, height, z], rotation: [0.25 - i * 0.4, 0, 0.2] }));
  pieces.push(piece(new THREE.OctahedronGeometry(0.028, 0), { color: "#ffcf3f", position: [x, height + 0.015, z] }));
 });
 pieces.push(leaf(2.2, 0.16));
 return merge(pieces);
}
// Tulipanes: copa cerrada sobre un tallo recto, con dos hojas.
function tulip(cup, cupTop) {
 const pieces = [];
 [[0, 0, 0.34], [-0.08, 0.07, 0.27]].forEach(([x, z, height], i) => {
  pieces.push(stalk(height, x, z));
  pieces.push(piece(new THREE.CylinderGeometry(0.05, 0.028, 0.095, 5), { bottom: cup, top: cupTop, position: [x, height + 0.045, z], rotation: [0, i, 0] }));
  pieces.push(leaf(i * 3 + 0.4, 0.2, x, z));
 });
 return merge(pieces);
}
// Lavanda: espigas con cuentas moradas.
function lavender() {
 const random = randomFrom(0.77);
 const pieces = [];
 for (let i = 0; i < 4; i++) {
  const angle = i * 1.6 + 0.3;
  const height = 0.3 + random() * 0.14;
  const tilt = lean(angle, 0.22);
  pieces.push(stalk(height, 0, 0, tilt));
  for (let k = 0; k < 3; k++) {
   const along = height * (0.72 + k * 0.14);
   pieces.push(piece(new THREE.OctahedronGeometry(0.026, 0), { color: k ? "#a987f0" : "#8a63dc", position: [Math.cos(angle) * along * 0.21, along * 0.975, Math.sin(angle) * along * 0.21] }));
  }
 }
 return merge(pieces);
}
// Campanillas: tallo arqueado del que cuelgan tres flores azules.
function bluebell() {
 const pieces = [piece(blade([[0, 0, 0], [0.03, 0.26, 0], [0.13, 0.36, 0]], 0.018, { facing: Math.PI / 2, tipWidth: 0.01 }), { color: STEM })];
 [[0.05, 0.27], [0.1, 0.31], [0.14, 0.32]].forEach(([x, y]) => pieces.push(piece(new THREE.ConeGeometry(0.03, 0.06, 5), { bottom: "#7fb2ff", top: "#4f7fe6", position: [x, y - 0.03, 0] })));
 pieces.push(leaf(3.4, 0.2), leaf(5.2, 0.17));
 return merge(pieces);
}

// Trébol: hojitas a ras de suelo con alguna flor blanca.
function clover() {
 const random = randomFrom(0.31);
 const pieces = [];
 for (let i = 0; i < 9; i++) {
  const angle = random() * 6, radius = Math.sqrt(random()) * 0.42;
  pieces.push(piece(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 5), { color: i % 2 ? "#4f9f4b" : "#5fae52", position: [Math.cos(angle) * radius, 0.025 + random() * 0.03, Math.sin(angle) * radius], rotation: [0, random() * 3, 0] }));
 }
 for (let i = 0; i < 3; i++) pieces.push(piece(new THREE.OctahedronGeometry(0.03, 0), { color: "#f7f3ea", position: [(random() - 0.5) * 0.6, 0.09, (random() - 0.5) * 0.6] }));
 return merge(pieces);
}

// Helecho: frondas que se arquean hacia fuera y caen en la punta.
function fern(seed) {
 const random = randomFrom(seed);
 const pieces = [];
 const count = 7 + Math.floor(random() * 2);
 for (let i = 0; i < count; i++) {
  const angle = (i / count) * Math.PI * 2 + random() * 0.4;
  const reach = 0.6 + random() * 0.3;
  const dx = Math.cos(angle), dz = Math.sin(angle);
  const frond = blade([[0, 0.02, 0], [dx * reach * 0.38, 0.32, dz * reach * 0.38], [dx * reach * 0.75, 0.4, dz * reach * 0.75], [dx * reach, 0.26, dz * reach]], 0.2, { facing: angle + Math.PI / 2, tipWidth: 0.02 });
  pieces.push(piece(frond, { bottom: "#2f7d4c", top: "#63b45a", vary: 0.1, seed: i }));
 }
 return merge(pieces);
}

// Juncos y espadañas.
function reeds(seed) {
 const random = randomFrom(seed);
 const pieces = [];
 for (let i = 0; i < 7; i++) {
  const angle = random() * 6;
  const tall = 0.8 + random() * 0.6;
  const x = (random() - 0.5) * 0.36, z = (random() - 0.5) * 0.36;
  const dx = Math.cos(angle) * 0.2, dz = Math.sin(angle) * 0.2;
  pieces.push(piece(blade([[x, 0, z], [x + dx * 0.4, tall * 0.6, z + dz * 0.4], [x + dx, tall, z + dz]], 0.055, { facing: angle + 1.2 }), { bottom: "#3f8046", top: "#9ccc64" }));
 }
 for (let i = 0; i < 2; i++) {
  const x = (random() - 0.5) * 0.3, z = (random() - 0.5) * 0.3, tall = 1.0 + random() * 0.35;
  pieces.push(piece(limb(0.012, 0.01, tall, 3), { color: "#7c9a4c", position: [x, 0, z] }));
  pieces.push(piece(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 5), { color: "#6b4630", position: [x, tall - 0.04, z] }));
 }
 return merge(pieces);
}

// Setas: grupo de tres, con lunares.
function mushrooms(cap, capTop) {
 const pieces = [];
 [[0, 0, 1], [0.16, 0.08, 0.62], [-0.1, 0.14, 0.45]].forEach(([x, z, size], i) => {
  pieces.push(piece(limb(0.045 * size, 0.035 * size, 0.2 * size, 5), { color: "#f1e6cf", position: [x, 0, z] }));
  pieces.push(piece(new THREE.SphereGeometry(0.14 * size, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), { bottom: cap, top: capTop, position: [x, 0.19 * size, z], scale: [1, 0.72, 1], rotation: [0.12 * i, i, 0] }));
  if (i === 0) [[0.06, 0.07, 0.02], [-0.05, 0.075, 0.04], [0.0, 0.06, -0.08]].forEach(([dx, dy, dz]) => pieces.push(piece(new THREE.OctahedronGeometry(0.018, 0), { color: "#fbf5e8", position: [x + dx, 0.19 + dy, z + dz] })));
 });
 return merge(pieces);
}

// Roca: poliedro descolocado y achatado; con `moss`, una capa verde encima.
// Nenúfar: hoja con su muesca; con `flower`, una flor abierta.
function lily(flower) {
 const pieces = [piece(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 9, 1, false, 0.5, Math.PI * 1.75), { color: "#4fae63", vary: 0.08 })];
 if (flower) {
  for (let i = 0; i < 6; i++) pieces.push(piece(new THREE.ConeGeometry(0.05, 0.16, 4), { bottom: "#ff9fc4", top: "#ffe3ee", position: [Math.cos(i * 1.05) * 0.06, 0.09, Math.sin(i * 1.05) * 0.06], rotation: lean(i * 1.05, 0.6) }));
  pieces.push(piece(new THREE.OctahedronGeometry(0.03, 0), { color: "#ffd24a", position: [0, 0.1, 0] }));
 }
 return merge(pieces);
}

export function createPlantModels() {
 return {
  tufts: {
   short: tuft(0.21, { blades: 8, height: 0.24, width: 0.075, spread: 0.2 }),
   tall: tuft(0.47, { blades: 6, height: 0.6, width: 0.085, spread: 0.3 }),
   seed: tuft(0.83, { blades: 5, height: 0.66, width: 0.08, spread: 0.28, heads: 3 }),
  },
  flowers: {
   daisy: daisy("#fbf7ee"),
   daisyPink: daisy("#ff9ec4"),
   tulipRed: tulip("#d8402f", "#ff7a52"),
   tulipYellow: tulip("#f0a92c", "#ffe07a"),
   lavender: lavender(),
   bluebell: bluebell(),
  },
  clover: clover(),
  ferns: [fern(0.15), fern(0.6)],
  reeds: [reeds(0.3), reeds(0.7)],
  mushrooms: [mushrooms("#c9412f", "#f0603f"), mushrooms("#b9824f", "#e3bc85")],
  // Rocas: cuatro bloques distintos, pelados (en el agua) y con musgo (ver props/rockModel.js).
  rocks: ROCK_SHAPES.map((shape, i) => createRock(0.21 + i * 0.17, { shape, moss: 0 })),
  mossy: ROCK_SHAPES.map((shape, i) => createRock(0.37 + i * 0.13, { shape, moss: 1 })),
  pebble: createRock(0.58, { shape: "slab", moss: 0, scale: [1, 0.9, 0.85] }),
  lilies: [lily(false), lily(true)],
 };
}
