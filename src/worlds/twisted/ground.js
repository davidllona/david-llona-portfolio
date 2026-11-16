import * as THREE from "three";
import { ISLAND, WATER_LEVEL, createRandom, cragEdge, ground, islandEdge, noise2, pathEdge, stairHeight, waterBed } from "./layout";

// El suelo de The Twisted Moon.
//  · La malla: una rejilla fina sobre la isla, facetada, con un color por
//    triángulo: césped verde azulado oscuro en lo llano, roca morada en los
//    acantilados (todo lo empinado), piedra más azul en los cauces.
//  · Los caminos: no dependen de la malla. Se hornea en una textura la
//    distancia al borde del camino más cercano y el material del suelo los
//    pinta en cada píxel, con el borde nítido (la misma idea que en el primer mundo).

// La textura cubre SPAN × SPAN metros centrados en la isla: uv = (xz − centro) / SPAN + 0.5.
export const SPAN = 72;
export const CENTRE = [ISLAND.x, ISLAND.z];
const SIZE = 320; // unos 22 cm por texel
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
    const x = CENTRE[0] + ((column + 0.5) / SIZE - 0.5) * SPAN, z = CENTRE[1] + ((row + 0.5) / SIZE - 0.5) * SPAN;
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

const GRASS = ["#1f4750", "#26575a", "#1a3c48", "#2e6660"].map((c) => new THREE.Color(c));
const ROCK = ["#4a4466", "#585174", "#3c3756", "#676082", "#302c48"].map((c) => new THREE.Color(c));
const BED = new THREE.Color("#152a3c"), DEEP = new THREE.Color("#10122a");

// La malla de la isla. Un color por triángulo. Lleva además, por vértice,
// cuánto de llano tiene (1 = se pinta camino encima si lo hay; 0 = roca).
export function createGround() {
 const STEP = 0.5, HALF = 35;
 const CELLS = Math.ceil((HALF * 2) / STEP);
 const base = new THREE.PlaneGeometry(CELLS * STEP, CELLS * STEP, CELLS, CELLS).rotateX(-Math.PI / 2).translate(ISLAND.x, 0, ISLAND.z);
 const square = base.toNonIndexed();
 base.dispose();
 // Solo la isla y su falda: lo que queda mar adentro no se dibuja.
 const kept = [];
 const corners = square.attributes.position.array;
 for (let i = 0; i < corners.length; i += 9) {
  const x = (corners[i] + corners[i + 3] + corners[i + 6]) / 3, z = (corners[i + 2] + corners[i + 5] + corners[i + 8]) / 3;
  // (Y las agujas de roca que salen del mar junto a ella.)
  if (islandEdge(x, z) > -2.4 || cragEdge(x, z) < 0.6) kept.push(...corners.subarray(i, i + 9));
 }
 square.dispose();
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(kept, 3));
 const position = geometry.attributes.position;
 for (let i = 0; i < position.count; i++) position.setY(i, ground(position.getX(i), position.getZ(i)));

 const random = createRandom(20261121);
 const colors = new Float32Array(position.count * 3), flat = new Float32Array(position.count);
 const color = new THREE.Color(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3();
 for (let i = 0; i < position.count; i += 3) {
  a.fromBufferAttribute(position, i), b.fromBufferAttribute(position, i + 1), c.fromBufferAttribute(position, i + 2);
  normal.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
  const x = (a.x + b.x + c.x) / 3, y = (a.y + b.y + c.y) / 3, z = (a.z + b.z + c.z) / 3;
  const steep = Math.abs(normal.y) < 0.8;
  if (steep || stairHeight(x, z) !== null) {
   // Roca morada, a facetas: cada cara, un tono; más oscura hacia el pie.
   const tone = noise2(x * 0.42 + 3, z * 0.42 + y * 0.7);
   color.copy(ROCK[Math.max(0, Math.min(4, Math.floor(tone * 5 + random() * 1.4 - 0.4)))]);
   if (y < WATER_LEVEL + 0.5) color.lerp(DEEP, 0.55);
  } else if (y < WATER_LEVEL) color.copy(DEEP);
  else if (waterBed(x, z) > 0.5) color.copy(BED);
  else {
   // Césped verde azulado oscuro: manchas grandes y algún triángulo suelto más claro.
   const patch = noise2(x * 0.11 + 3.1, z * 0.11 - 1.7) * 0.7 + noise2(x * 0.36, z * 0.36 + 9) * 0.3;
   color.copy(GRASS[patch > 0.6 ? 1 : patch < 0.38 ? 2 : 0]);
   if (noise2(x * 1.9 + 5, z * 1.9) > 0.82) color.copy(GRASS[3]);
  }
  color.multiplyScalar(0.92 + random() * 0.16);
  for (let k = 0; k < 3; k++) {
   color.toArray(colors, (i + k) * 3);
   flat[i + k] = steep ? 0 : 1;
  }
 }
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 geometry.setAttribute("flat", new THREE.BufferAttribute(flat, 1));
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}
