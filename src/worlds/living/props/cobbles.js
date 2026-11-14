import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { randomFrom } from "../kit/geometry";

// Adoquín: una piedra plana, pequeña y de contorno irregular. Con escalas y
// giros distintos en cada copia, ninguna se ve igual que la de al lado.
export function createCobble(seed = 0.31) {
 const random = randomFrom(seed);
 const sides = 7;
 const reach = Array.from({ length: sides }, () => 0.72 + random() * 0.42);
 const geometry = new THREE.CylinderGeometry(0.44, 0.5, 0.09, sides);
 const position = geometry.attributes.position;
 for (let i = 0; i < position.count; i++) {
  const x = position.getX(i), z = position.getZ(i);
  if (Math.hypot(x, z) < 0.01) continue; // los centros de las tapas
  const corner = Math.round(((Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2)) / ((Math.PI * 2) / sides)) % sides;
  position.setXYZ(i, x * reach[corner], position.getY(i), z * reach[corner]);
 }
 geometry.computeVertexNormals();
 return geometry;
}

export const COBBLE_TONES = ["#d3ccbe", "#c2b9a9", "#ddd6c8", "#b7ae9f", "#cabfab", "#bdb6ad"];

// Una piedra en (x, z) a la altura `y`, de radio aproximado `size`.
export function cobble(random, x, y, z, size) {
 const stretch = 0.8 + random() * 0.45;
 return { position: [x, y, z], rotation: [0, random() * Math.PI * 2, 0], scale: [size * 2 * stretch, 0.8 + random() * 0.5, (size * 2) / stretch], color: COBBLE_TONES[Math.floor(random() * COBBLE_TONES.length)] };
}

// Losa: un bloque de 1 × 1 con el canto de arriba matado. Se estira con la
// escala de cada copia (largo y ancho); el grosor es fijo y va casi entero
// enterrado: asoma centímetro y medio.
export const SLAB_THICKNESS = 0.1;
export function createSlab() {
 const points = [];
 const h = SLAB_THICKNESS / 2, bevel = 0.02;
 for (const sx of [-1, 1]) {
  for (const sz of [-1, 1]) {
   points.push(new THREE.Vector3(sx * 0.5, -h, sz * 0.5), new THREE.Vector3(sx * 0.5, h - bevel, sz * 0.5), new THREE.Vector3(sx * (0.5 - 0.035), h, sz * (0.5 - 0.035)));
  }
 }
 const geometry = new ConvexGeometry(points);
 // Los cantos, algo más oscuros que la cara: se lee la junta.
 const normal = geometry.attributes.normal;
 const colors = new Float32Array(normal.count * 3);
 for (let i = 0; i < normal.count; i++) colors.fill(normal.getY(i) > 0.9 ? 1 : 0.72, i * 3, i * 3 + 3);
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 return geometry;
}
