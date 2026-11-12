// Trozos de GLSL que comparten el agua, la cascada y el arroyo.

// Ruido celular (Voronoi). Devuelve en x la distancia al centro de celda más
// cercano y en y la distancia al borde entre celdas: con y se dibujan las
// líneas claras del agua de dibujo animado. `wobble` hace latir las celdas.
export const CELLS = /* glsl */ `
 vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
 }
 vec2 cells(vec2 p, float wobble) {
  vec2 cell = floor(p);
  vec2 inside = fract(p);
  float first = 8.0;
  float second = 8.0;
  for (int y = -1; y <= 1; y++) {
   for (int x = -1; x <= 1; x++) {
    vec2 offset = vec2(float(x), float(y));
    vec2 point = 0.5 + 0.38 * sin(wobble + 6.2831 * hash2(cell + offset));
    vec2 toPoint = offset + point - inside;
    float d = dot(toPoint, toPoint);
    if (d < first) {
     second = first;
     first = d;
    } else if (d < second) {
     second = d;
    }
   }
  }
  first = sqrt(first);
  return vec2(first, sqrt(second) - first);
 }
`;
