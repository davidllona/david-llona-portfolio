import * as THREE from "three";
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
