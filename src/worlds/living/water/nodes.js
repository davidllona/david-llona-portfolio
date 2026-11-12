import { Fn, dot, float, floor, fract, max, min, sin, sqrt, vec2 } from "three/tsl";

// Nodos TSL que comparten el agua, la cascada y el arroyo.

const hash2 = (p) => fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))).mul(43758.5453));

// Ruido celular (Voronoi). Devuelve en x la distancia al centro de celda más
// cercano y en y la distancia al borde entre celdas: con y se dibujan las
// líneas claras del agua de dibujo animado. `wobble` hace latir las celdas.
export const cells = Fn(([p, wobble]) => {
 const cell = floor(p);
 const inside = fract(p);
 const first = float(8).toVar();
 const second = float(8).toVar();
 for (let y = -1; y <= 1; y++) {
  for (let x = -1; x <= 1; x++) {
   const offset = vec2(x, y);
   const point = sin(hash2(cell.add(offset)).mul(6.2831).add(wobble)).mul(0.38).add(0.5);
   const toPoint = offset.add(point).sub(inside);
   const distance = dot(toPoint, toPoint);
   // Se guardan las dos distancias menores, sin ramas.
   second.assign(min(second, max(first, distance)));
   first.assign(min(first, distance));
  }
 }
 const nearest = sqrt(first);
 return vec2(nearest, sqrt(second).sub(nearest));
});
