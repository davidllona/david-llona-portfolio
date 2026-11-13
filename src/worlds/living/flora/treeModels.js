import * as THREE from "three";
import { blade, blob, limb, merge, piece, randomFrom, tube } from "../kit/geometry";
import { BARK, LEAF } from "../kit/palette";

// Árboles singulares hechos por código: el árbol viejo y el protagonista (la
// bienvenida y la casa del árbol). Cada función devuelve una geometría única
// (tronco y copa unidos, con colores de vértice), en metros y con el pie en el
// origen. Los árboles del bosque son modelos: ver species.js y useFlora.js.

// Inclina una pieza vertical `tilt` radianes hacia la dirección `angle` del plano.
const lean = (angle, tilt) => [Math.sin(angle) * tilt, 0, -Math.cos(angle) * tilt];

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

// Árbol protagonista: tronco que se tuerce en S, raíces que se agarran al
// suelo, ramas maestras que se abren y copa en racimos a distintas alturas.
// Mide unos 8 m. `HERO_LANTERNS` son los puntos de los que cuelgan farolillos.
export const HERO_LANTERNS = [[2.2, 4.15, 0.9], [-2.6, 4.7, 0.5], [0.5, 5.1, 1.5]];
export function hero(seed = 0.5, palette = LEAF.oak[1]) {
 const random = randomFrom(seed);
 const bark = BARK.old;
 const wood = (points, from, to, sides = 7) => piece(tube(points, (t) => from + (to - from) * t, { sides, segments: 8 }), { bottom: bark[0], top: bark[1], jitter: 0.03, vary: 0.07, seed: random() * 50 });
 const pieces = [
  // Tronco.
  wood([[0, -0.2, 0], [0.55, 1.5, 0.1], [0.25, 3.0, -0.15], [-0.75, 4.3, 0], [-1.15, 5.4, 0.1]], 0.78, 0.26, 8),
  // Ramas maestras.
  wood([[0.4, 2.6, 0], [1.4, 3.6, 0.3], [2.6, 4.6, 0.6], [3.0, 5.3, 0.7]], 0.36, 0.1, 6),
  wood([[-0.5, 3.9, 0], [-1.9, 4.6, 0.2], [-3.0, 5.6, 0.3]], 0.3, 0.09, 6),
  wood([[-0.9, 4.9, 0], [-0.2, 5.9, -0.8], [0.7, 6.9, -1.3]], 0.26, 0.08, 6),
  wood([[0.2, 3.2, -0.1], [0.5, 4.2, 0.9], [0.5, 5.0, 1.5]], 0.2, 0.06, 5),
 ];
 // Raíces que se agarran al suelo.
 for (let i = 0; i < 6; i++) {
  const angle = (i / 6) * Math.PI * 2 + 0.3;
  const reach = 1.5 + random() * 0.7;
  const dx = Math.cos(angle), dz = Math.sin(angle);
  pieces.push(wood([[dx * 0.3, 0.75, dz * 0.3], [dx * reach * 0.55, 0.3, dz * reach * 0.55], [dx * reach, -0.12, dz * reach]], 0.3, 0.07, 5));
 }
 // Copa: un racimo en cada rama y otro en lo alto.
 const masses = [];
 const cluster = (x, y, z, size, count) => {
  masses.push([x, y, z, size, 0.84]);
  for (let i = 0; i < count; i++) {
   const angle = (i / count) * Math.PI * 2 + random() * 0.8;
   const reach = size * (0.72 + random() * 0.25);
   masses.push([x + Math.cos(angle) * reach, y + (random() - 0.4) * size * 0.55, z + Math.sin(angle) * reach, size * (0.55 + random() * 0.2), 0.84]);
  }
 };
 cluster(3.1, 5.9, 0.7, 1.55, 4);
 cluster(-3.1, 6.2, 0.3, 1.5, 4);
 cluster(0.7, 7.5, -1.2, 1.75, 4);
 cluster(-1.1, 6.6, 0.3, 1.9, 5);
 cluster(0.5, 5.7, 1.5, 1.05, 3);
 pieces.push(...masses.map(([x, y, z, size, squash]) => piece(blob(1), { bottom: palette[0], top: palette[1], jitter: 0.18, vary: 0.07, seed: random() * 99, position: [x, y, z], rotation: [random() * 3, random() * 3, 0], scale: [size, size * squash, size] })));
 // Lianas que cuelgan de la copa.
 for (let i = 0; i < 8; i++) {
  const [x, y, z] = [[2.6, 5.0, 1.3], [3.6, 5.2, 0.2], [-2.4, 5.4, 1.0], [-3.7, 5.5, 0.2], [0.2, 5.0, 2.1], [1.2, 6.4, -0.2], [-1.6, 5.6, 1.4], [0.9, 4.9, 1.9]][i];
  const length = 0.9 + random() * 1.3;
  pieces.push(piece(blade([[x, y, z], [x + 0.06, y - length * 0.5, z], [x, y - length, z + 0.06]], 0.1, { facing: i, tipWidth: 0.02 }), { bottom: "#9bd765", top: "#3f8f4a" }));
 }
 return merge(pieces, { ground: 0.25, groundHeight: 2.5 });
}
