import * as THREE from "three";
import { HILL, WATER_LEVEL, createRandom, height, hill, noise2, pathEdge } from "./layout";

// El suelo de The Twisted Moon.
//  · La malla: una rejilla recortada en redondo, facetada, con un color por
//    triángulo: páramo de morados y negros azulados, barro en la orilla, y en
//    la colina en espiral la senda clara y los taludes oscuros.
//  · Los caminos: no dependen de la malla. Se hornea en una textura la
//    distancia al borde del camino más cercano y el material del suelo los
//    pinta en cada píxel, con el borde nítido (la misma idea que en el primer mundo).

// La textura cubre SPAN × SPAN metros centrados en el origen: uv = xz / SPAN + 0.5.
export const SPAN = 112;
const SIZE = 384; // unos 29 cm por texel
export const EDGE_RANGE = 4; // el valor guardado cubre ±4 m en torno al borde (0,5 = el borde)

let baked = null;
// Hornea por filas, en tramos cortos, cediendo el turno entre uno y otro.
export async function prepareGround(breathe) {
 if (baked) return baked;
 const data = new Uint8Array(SIZE * SIZE * 4);
 let row = 0;
 while (row < SIZE) {
  const started = performance.now();
  for (; row < SIZE && performance.now() - started < 10; row++) {
   for (let column = 0; column < SIZE; column++) {
    const x = ((column + 0.5) / SIZE - 0.5) * SPAN, z = ((row + 0.5) / SIZE - 0.5) * SPAN;
    const i = (row * SIZE + column) * 4;
    data[i] = Math.min(255, Math.max(0, (pathEdge(x, z) / (EDGE_RANGE * 2) + 0.5) * 255));
    data[i + 3] = 255;
   }
  }
  await breathe();
 }
 const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
 texture.magFilter = texture.minFilter = THREE.LinearFilter;
 texture.needsUpdate = true;
 baked = { paths: texture };
 return baked;
}
export const groundData = () => baked;

const MOOR = ["#3d3852", "#494262", "#322d46", "#585070"].map((c) => new THREE.Color(c));
const MUD = new THREE.Color("#1c1a34"), BED = new THREE.Color("#121126");
const HILL_PATH = new THREE.Color("#a59fc6"), HILL_SLOPE = new THREE.Color("#62588e"), HILL_STRIPE = new THREE.Color("#463d6e");

export const GROUND_RADIUS = 60;

// La colina en espiral, con su propia malla: anillos y radios alrededor de su
// eje. La senda da la vuelta casi a lo largo de los anillos, así que su borde
// sale limpio, sin los dientes que le haría una rejilla cuadrada. La senda,
// clara; el talud, oscuro y a franjas, como una piruleta.
export function createHill() {
 const RINGS = 46, SECTORS = 112, REACH = HILL.r + 1.2;
 const random = createRandom(20261117);
 const at = (ring, sector) => {
  const r = (ring / RINGS) * REACH, angle = (sector / SECTORS) * Math.PI * 2;
  const x = HILL.x + Math.cos(angle) * r, z = HILL.z + Math.sin(angle) * r;
  // (El último tramo, ya fuera de la colina, se mete unos centímetros bajo la rejilla del páramo: no se pisan.)
  return [x, height(x, z) - 0.05 * Math.min(1, Math.max(0, (r - HILL.r + 0.9) / 0.9)), z];
 };
 const positions = [], colors = [];
 const color = new THREE.Color();
 const face = (a, b, c) => {
  const x = (a[0] + b[0] + c[0]) / 3, y = (a[1] + b[1] + c[1]) / 3, z = (a[2] + b[2] + c[2]) / 3;
  height(x, z);
  if (Math.hypot(x - HILL.x, z - HILL.z) > HILL.r - 0.15) {
   // El pie, del color del páramo.
   const patch = noise2(x * 0.085 + 3.1, z * 0.085 - 1.7) * 0.7 + noise2(x * 0.3, z * 0.3 + 9) * 0.3;
   color.copy(MOOR[patch > 0.6 ? 1 : patch < 0.36 ? 2 : 0]);
  } else if (hill.path > 0.5) color.copy(HILL_PATH);
  else color.copy(Math.floor(y / 0.62) % 2 === 0 ? HILL_SLOPE : HILL_STRIPE);
  color.multiplyScalar(0.93 + random() * 0.14);
  for (const point of [a, b, c]) {
   positions.push(...point);
   colors.push(color.r, color.g, color.b);
  }
 };
 for (let ring = 0; ring < RINGS; ring++) {
  for (let sector = 0; sector < SECTORS; sector++) {
   const a = at(ring, sector), b = at(ring, sector + 1), c = at(ring + 1, sector + 1), d = at(ring + 1, sector);
   // (Visto desde arriba, en este orden las caras miran hacia arriba.)
   if (ring > 0) face(a, b, c);
   face(a, c, d);
  }
 }
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
 geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}
// La malla del suelo. Un color por triángulo.
export function createGround() {
 const STEP = 0.8, CELLS = Math.ceil((GROUND_RADIUS * 2) / STEP);
 const base = new THREE.PlaneGeometry(CELLS * STEP, CELLS * STEP, CELLS, CELLS).rotateX(-Math.PI / 2);
 const square = base.toNonIndexed();
 base.dispose();
 // Se recorta en redondo: fuera de este radio solo hay laguna.
 const kept = [];
 const corners = square.attributes.position.array;
 for (let i = 0; i < corners.length; i += 9) {
  const x = (corners[i] + corners[i + 3] + corners[i + 6]) / 3, z = (corners[i + 2] + corners[i + 5] + corners[i + 8]) / 3;
  // (La colina lleva su propia malla, en anillos: ver `createHill`.)
  if (Math.hypot(x, z) < GROUND_RADIUS && Math.hypot(x - HILL.x, z - HILL.z) > HILL.r + 0.25) kept.push(...corners.subarray(i, i + 9));
 }
 square.dispose();
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(kept, 3));
 const position = geometry.attributes.position;
 for (let i = 0; i < position.count; i++) position.setY(i, height(position.getX(i), position.getZ(i)));

 const random = createRandom(20261115);
 const colors = new Float32Array(position.count * 3);
 const color = new THREE.Color();
 for (let i = 0; i < position.count; i += 3) {
  const x = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
  const z = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
  const y = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3;
  if (y < WATER_LEVEL - 0.5) color.copy(BED);
  else if (y < WATER_LEVEL + 0.14) color.copy(MUD);
  else {
   // Páramo: manchas grandes de dos tonos y algún triángulo suelto más claro.
   const patch = noise2(x * 0.085 + 3.1, z * 0.085 - 1.7) * 0.7 + noise2(x * 0.3, z * 0.3 + 9) * 0.3;
   color.copy(MOOR[patch > 0.6 ? 1 : patch < 0.36 ? 2 : 0]);
   if (noise2(x * 1.7 + 5, z * 1.7) > 0.84) color.copy(MOOR[3]);
  }
  color.multiplyScalar(0.92 + random() * 0.16);
  for (let k = 0; k < 3; k++) color.toArray(colors, (i + k) * 3);
 }
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}
