import * as THREE from "three";
import { merge, piece, tube } from "../../worlds/living/kit/geometry";
import { CREAM, WOOD } from "../../worlds/living/kit/palette";

// La hamaca de la isla de bienvenida (objetivo 27, A4): colgada entre el tronco
// del árbol y la farola, con el astronauta tumbado y una pierna colgando, y
// Woody durmiendo debajo, en el suelo (es su manía: duerme en el suelo aunque
// tenga cama). Al entrar, el astronauta se baja de un salto antes del descenso.
//
// Marco de la hamaca: origen en el punto medio entre los dos anclajes, eje z a
// lo largo (del árbol, z < 0, a la farola, z > 0), y hacia arriba, x de lado
// (−x mira a la cámara). Se balancea girando sobre ese eje z.

export const HAMMOCK = {
 tree: [-0.52, 1.35, -0.92], // anclaje en el tronco (medido en la copa «frondoso» a esa altura)
 lamp: [2.334, 1.35, 2.0], // anclaje en el poste de la farola
 bedHalf: 1.0, // media longitud de la tela
 width: 0.86,
 drop: 0.46, // lo que bajan las cuerdas hasta los extremos de la tela
 sag: 0.27, // lo que se hunde la tela en el centro, además
 swing: 0.035, // balanceo (rad) y su periodo (s): muy despacio
 period: 5.2,
 hop: 0.42, // lo que dura el salto al bajarse (s)
};
const [ax, ay, az] = HAMMOCK.tree, [bx, , bz] = HAMMOCK.lamp;
export const HAMMOCK_MID = [(ax + bx) / 2, ay, (az + bz) / 2];
export const HAMMOCK_TURN = Math.atan2(bx - ax, bz - az); // giro en y que lleva el eje z del marco a lo largo
const span = Math.hypot(bx - ax, bz - az) / 2;

// Altura de la tela (marco de la hamaca) en (x, z): cae en catenaria suave y
// sube por los bordes, como una tela colgada.
export function bedHeight(x, z) {
 const u = z / HAMMOCK.bedHalf, v = x / (HAMMOCK.width / 2);
 return -HAMMOCK.drop - HAMMOCK.sag * (1 - u * u) + 0.3 * v * v * (1 - 0.45 * u * u);
}

// Tela a rayas, facetada, vista por los dos lados.
function bed() {
 const stripes = ["#e8743b", CREAM, "#e8743b", "#3f8a8a", CREAM, "#3f8a8a", "#e8743b", CREAM, "#e8743b"];
 const across = 5, along = 3; // segmentos de cada raya
 const parts = stripes.map((color, s) => {
  const z0 = -HAMMOCK.bedHalf + (2 * HAMMOCK.bedHalf * s) / stripes.length, z1 = -HAMMOCK.bedHalf + (2 * HAMMOCK.bedHalf * (s + 1)) / stripes.length;
  const positions = [];
  const vertex = (i, j) => {
   const x = -HAMMOCK.width / 2 + (HAMMOCK.width * i) / across, z = z0 + ((z1 - z0) * j) / along;
   return [x, bedHeight(x, z), z];
  };
  for (let i = 0; i < across; i++)
   for (let j = 0; j < along; j++) {
    const a = vertex(i, j), b = vertex(i + 1, j), c = vertex(i + 1, j + 1), d = vertex(i, j + 1);
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
   }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return piece(geometry, { color, vary: 0.06, seed: s + 3 });
 });
 return parts;
}

// Lo que se balancea: tela, barras de madera en los extremos y cuerdas (de los
// extremos de la tela a los anclajes, que están en el eje).
export function createHammock() {
 const end = HAMMOCK.bedHalf, endY = bedHeight(0, end);
 const rope = (from, to) => piece(tube([from, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - 0.025, (from[2] + to[2]) / 2], to], () => 0.011, { sides: 4, segments: 3 }), { color: "#d9c39a", vary: 0.05 });
 const ropes = [];
 for (const side of [-1, 1]) {
  const tip = [0, 0, side * span];
  for (const x of [-0.36, -0.12, 0.12, 0.36]) ropes.push(rope(tip, [x, bedHeight(x, side * end) + 0.02, side * end]));
 }
 return merge([
  ...bed(),
  ...[-1, 1].map((side) => piece(new THREE.BoxGeometry(HAMMOCK.width + 0.08, 0.035, 0.05), { color: WOOD.mid, vary: 0.06, position: [0, endY + 0.02, side * end] })),
  ...ropes,
 ]);
}

// Las vueltas de cuerda en el tronco y en el poste (no se balancean).
export function createKnots() {
 const ring = (radius, at) => piece(new THREE.TorusGeometry(radius, 0.016, 4, 9), { color: "#cdb48a", vary: 0.06, position: at, rotation: [Math.PI / 2, 0, 0] });
 return merge([ring(0.215, HAMMOCK.tree), ring(0.215, [HAMMOCK.tree[0], HAMMOCK.tree[1] - 0.05, HAMMOCK.tree[2]]), ring(0.085, HAMMOCK.lamp), ring(0.085, [HAMMOCK.lamp[0], HAMMOCK.lamp[1] - 0.05, HAMMOCK.lamp[2]])]);
}
