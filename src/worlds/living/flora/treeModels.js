import * as THREE from "three";
import { blade, blob, limb, merge, piece, randomFrom } from "../kit/geometry";
import { BARK, LEAF } from "../kit/palette";

// Modelos de árbol. Cada función devuelve una geometría única (tronco y copa
// unidos, con colores de vértice), en metros y con el pie en el origen. De
// cada especie se generan varias variantes cambiando la semilla.

// Inclina una pieza vertical `tilt` radianes hacia la dirección `angle` del plano.
const lean = (angle, tilt) => [Math.sin(angle) * tilt, 0, -Math.cos(angle) * tilt];
const pick = (list, random) => list[Math.floor(random() * list.length)];

// Masas de hojas: [x, y, z, tamaño, achatado].
function canopy(masses, [bottom, top], random, { jitter = 0.17, detail = 1 } = {}) {
 return masses.map(([x, y, z, size, squash = 0.85]) =>
  piece(blob(detail), { bottom, top, jitter, vary: 0.07, seed: random() * 99, position: [x, y, z], rotation: [random() * 3, random() * 3, 0], scale: [size, size * squash, size] }),
 );
}

// Raíces que asoman al pie del tronco.
function roots(count, radius, length, [dark], random, lift = 0.12) {
 return Array.from({ length: count }, (_, i) => {
  const angle = (i / count) * Math.PI * 2 + random() * 0.6;
  return piece(limb(radius, radius * 0.25, length, 4), { color: dark, jitter: 0.02, seed: i, position: [Math.cos(angle) * radius * 0.6, lift, Math.sin(angle) * radius * 0.6], rotation: lean(angle, 1.22) });
 });
}

function oak(seed, palette = LEAF.oak) {
 const random = randomFrom(seed);
 const bark = BARK.oak;
 const turn = random() * 6;
 const pieces = [
  piece(limb(0.36, 0.2, 2.5, 7), { bottom: bark[0], top: bark[1], jitter: 0.035, seed, rotation: lean(turn, 0.06) }),
  ...roots(4, 0.2, 0.95, bark, random),
  // Dos ramas que se abren hacia las masas laterales.
  piece(limb(0.12, 0.06, 1.5, 5), { color: bark[1], position: [0, 1.75, 0], rotation: lean(turn + 0.6, 0.85) }),
  piece(limb(0.11, 0.05, 1.4, 5), { color: bark[1], position: [0, 1.95, 0], rotation: lean(turn + 3.5, 0.8) }),
 ];
 const masses = [[0, 3.5, 0, 1.55]];
 const count = 4 + Math.floor(random() * 2);
 for (let i = 0; i < count; i++) {
  const angle = turn + (i / count) * Math.PI * 2 + random() * 0.5;
  const reach = 1.1 + random() * 0.35;
  masses.push([Math.cos(angle) * reach, 2.75 + random() * 0.6, Math.sin(angle) * reach, 0.9 + random() * 0.35]);
 }
 masses.push([(random() - 0.5) * 0.7, 4.45, (random() - 0.5) * 0.7, 0.85]);
 pieces.push(...canopy(masses, pick(palette, random), random));
 return merge(pieces, { ground: 0.25, groundHeight: 2.6 });
}

function poplar(seed) {
 const random = randomFrom(seed);
 const bark = BARK.oak;
 const pieces = [piece(limb(0.2, 0.11, 1.7, 6), { bottom: bark[0], top: bark[1], jitter: 0.02, seed })];
 const sway = (random() - 0.5) * 0.25;
 pieces.push(
  ...canopy(
   [
    [0, 2.25, 0, 0.98, 1.3],
    [sway, 3.6, sway * 0.5, 0.86, 1.45],
    [sway * 1.6, 4.95, 0, 0.62, 1.3],
    [sway * 2, 5.95, 0, 0.34, 1.2],
   ],
   pick(LEAF.poplar, random),
   random,
   { jitter: 0.14 },
  ),
 );
 return merge(pieces, { ground: 0.25, groundHeight: 2.2 });
}

function pine(seed) {
 const random = randomFrom(seed);
 const bark = BARK.pine;
 const [bottom, top] = pick(LEAF.pine, random);
 const pieces = [piece(limb(0.22, 0.1, 2.2, 6), { bottom: bark[0], top: bark[1], jitter: 0.02, seed })];
 // Pisos que se estrechan; cada uno algo ladeado y con el borde irregular.
 const tiers = [
  [1.75, 1.5, 1.0],
  [1.42, 1.4, 1.95],
  [1.1, 1.3, 2.85],
  [0.78, 1.2, 3.7],
  [0.46, 1.05, 4.5],
 ];
 tiers.forEach(([radius, tall, y], i) => {
  const cone = new THREE.ConeGeometry(radius, tall, 8, 1).translate(0, tall / 2, 0);
  pieces.push(piece(cone, { bottom, top, jitter: 0.11, vary: 0.08, seed: seed * 9 + i, position: [(random() - 0.5) * 0.16, y, (random() - 0.5) * 0.16], rotation: [(random() - 0.5) * 0.14, random() * 3, (random() - 0.5) * 0.14] }));
 });
 return merge(pieces, { ground: 0.3, groundHeight: 2.4 });
}

function birch(seed) {
 const random = randomFrom(seed);
 const bark = BARK.birch;
 const turn = random() * 6;
 const bend = lean(turn, 0.13);
 const pieces = [
  piece(limb(0.13, 0.1, 2.0, 6), { bottom: bark[0], top: bark[1], seed }),
  piece(limb(0.1, 0.05, 2.0, 6), { color: bark[1], position: [0, 1.95, 0], rotation: bend }),
 ];
 // Marcas oscuras de la corteza.
 [0.5, 1.1, 1.55, 2.5].forEach((y, i) => pieces.push(piece(limb(0.135 - y * 0.012, 0.132 - y * 0.012, 0.07, 6), { color: "#3b3836", position: [0, y, 0], rotation: [0, i, 0] })));
 const topX = Math.sin(turn) * 0 - Math.cos(turn) * -0.25;
 const masses = [];
 for (let i = 0; i < 5; i++) {
  const angle = turn + i * 1.4;
  const reach = i ? 0.75 + random() * 0.3 : 0;
  masses.push([topX + Math.cos(angle) * reach, 3.25 + random() * 1.1, Math.sin(angle) * reach, 0.58 + random() * 0.25, 0.9]);
 }
 pieces.push(...canopy(masses, pick(LEAF.birch, random), random, { jitter: 0.13 }));
 return merge(pieces, { ground: 0.2, groundHeight: 2.6 });
}

function cherry(seed) {
 const random = randomFrom(seed);
 const bark = BARK.cherry;
 const turn = random() * 6;
 const pieces = [
  piece(limb(0.28, 0.18, 1.4, 6), { bottom: bark[0], top: bark[1], jitter: 0.03, seed, rotation: lean(turn, 0.2) }),
  ...roots(3, 0.16, 0.7, bark, random),
  piece(limb(0.16, 0.08, 1.6, 5), { color: bark[1], position: [Math.cos(turn) * 0.25, 1.3, Math.sin(turn) * 0.25], rotation: lean(turn + 0.4, 0.72) }),
  piece(limb(0.15, 0.07, 1.5, 5), { color: bark[1], position: [Math.cos(turn) * 0.25, 1.3, Math.sin(turn) * 0.25], rotation: lean(turn + 3.3, 0.66) }),
 ];
 // Copa en nubes anchas y bajas.
 const masses = [[0, 3.05, 0, 1.35, 0.66]];
 for (let i = 0; i < 5; i++) {
  const angle = turn + (i / 5) * Math.PI * 2;
  const reach = 1.35 + random() * 0.4;
  masses.push([Math.cos(angle) * reach, 2.5 + random() * 0.55, Math.sin(angle) * reach, 0.95 + random() * 0.35, 0.62]);
 }
 pieces.push(...canopy(masses, pick(LEAF.cherry, random), random, { jitter: 0.15 }));
 return merge(pieces, { ground: 0.2, groundHeight: 2.2 });
}

function willow(seed) {
 const random = randomFrom(seed);
 const bark = BARK.oak;
 const [bottom, top] = LEAF.willow[0];
 const turn = random() * 6;
 const pieces = [
  piece(limb(0.42, 0.26, 2.0, 7), { bottom: bark[0], top: bark[1], jitter: 0.04, seed, rotation: lean(turn, 0.1) }),
  ...roots(5, 0.22, 1.0, bark, random),
  ...[0.5, 2.6, 4.6].map((offset) => piece(limb(0.15, 0.07, 1.7, 5), { color: bark[1], position: [0, 1.8, 0], rotation: lean(turn + offset, 0.95) })),
  ...canopy(
   [
    [0, 3.5, 0, 1.5, 0.7],
    [1.0, 3.2, 0.5, 1.15, 0.65],
    [-0.9, 3.25, 0.7, 1.1, 0.65],
    [0.1, 3.2, -1.1, 1.15, 0.65],
   ],
   [bottom, top],
   random,
  ),
 ];
 // Cortinas de ramas que cuelgan hasta casi el suelo.
 for (let i = 0; i < 18; i++) {
  const angle = (i / 18) * Math.PI * 2 + random() * 0.25;
  const radius = 1.75 + random() * 0.55;
  const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
  const end = 0.55 + random() * 0.9;
  const strand = blade([[x * 0.92, 3.3, z * 0.92], [x * 1.04, 2.2 + random() * 0.3, z * 1.04], [x * 1.08, end, z * 1.08]], 0.4 + random() * 0.2, { facing: angle + Math.PI / 2, tipWidth: 0.06 });
  pieces.push(piece(strand, { bottom: top, top: bottom, vary: 0.08, seed: i }));
 }
 return merge(pieces, { ground: 0.2, groundHeight: 2 });
}

// Árbol viejo: tronco grueso que se retuerce, raíces como contrafuertes, un
// hueco oscuro, tres ramas maestras, copa enorme y lianas.
export function ancient(seed) {
 const random = randomFrom(seed);
 const bark = BARK.old;
 const pieces = [];
 // Tronco por tramos: cada uno arranca donde acaba el anterior, algo girado.
 const at = new THREE.Vector3();
 const up = new THREE.Vector3();
 let radius = 1.25;
 for (let i = 0; i < 5; i++) {
  const angle = 0.6 + i * 1.5;
  const tilt = 0.1 + random() * 0.14;
  const next = radius * 0.82;
  const rotation = lean(angle, tilt);
  pieces.push(piece(limb(radius, next, 1.45, 8), { bottom: bark[0], top: bark[1], jitter: 0.07, vary: 0.06, seed: seed + i, position: at.toArray(), rotation }));
  up.set(0, 1.38, 0).applyEuler(new THREE.Euler(...rotation));
  at.add(up);
  radius = next;
 }
 pieces.push(...roots(7, 0.5, 2.5, bark, random, 0.3));
 // Hueco, mirando al sur.
 pieces.push(piece(blob(0), { color: "#1d1411", position: [0.1, 1.15, 1.02], scale: [0.42, 0.7, 0.22] }));
 const top = at.clone();
 const masses = [[top.x, top.y + 2.6, top.z, 3.1, 0.8]];
 [0.5, 2.5, 4.4].forEach((offset, i) => {
  const reach = 2.6 + random() * 0.6;
  pieces.push(piece(limb(0.46, 0.2, 3.1, 6), { bottom: bark[0], top: bark[1], jitter: 0.04, seed: i, position: [top.x, top.y - 0.4, top.z], rotation: lean(offset, 0.95) }));
  masses.push([top.x + Math.cos(offset) * reach, top.y + 1.5 + random() * 0.6, top.z + Math.sin(offset) * reach, 2.2 + random() * 0.5, 0.8]);
 });
 for (let i = 0; i < 5; i++) {
  const angle = i * 1.26 + 0.9;
  const reach = 2.4 + random() * 1.2;
  masses.push([top.x + Math.cos(angle) * reach, top.y + 1.9 + random() * 1.5, top.z + Math.sin(angle) * reach, 1.6 + random() * 0.7, 0.82]);
 }
 pieces.push(...canopy(masses, LEAF.oak[2], random, { jitter: 0.19 }));
 // Lianas.
 for (let i = 0; i < 11; i++) {
  const angle = i * 2.4;
  const radius2 = 1.8 + (i % 3) * 1.0;
  const x = top.x + Math.cos(angle) * radius2, z = top.z + Math.sin(angle) * radius2;
  const length = 1.8 + random() * 2.6;
  pieces.push(piece(blade([[x, top.y + 1.2, z], [x + 0.1, top.y + 1.2 - length * 0.5, z], [x, top.y + 1.2 - length, z + 0.1]], 0.12, { facing: angle, tipWidth: 0.03 }), { bottom: "#8fce63", top: "#3f8f4a" }));
 }
 return merge(pieces, { ground: 0.3, groundHeight: 3 });
}

const BUILDERS = { oak, maple: (seed) => oak(seed, LEAF.maple), poplar, pine, birch, cherry, willow };
const VARIANTS = 3;

// Todas las variantes de cada especie: { oak: [geometría, …], … }.
export function createTreeModels() {
 return Object.fromEntries(Object.entries(BUILDERS).map(([kind, build], k) => [kind, Array.from({ length: VARIANTS }, (_, i) => build(0.137 + k * 0.071 + i * 0.213))]));
}
