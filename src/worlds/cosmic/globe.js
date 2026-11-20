// Geometría del planeta en que se cierra el mundo al subir con la nave (ver
// experience/environment/bend.js): 32 m de radio, con el eje en la plataforma.
// Lo que queda lejos del eje se define sobre la esfera —distancias de verdad,
// medidas sobre el planeta— y no sobre el plano, que allí se encoge al curvarse.
// (Sin dependencias: lo leen también las pruebas, sin navegador.)
export const RADIUS = 32;
export const REACH = Math.PI * RADIUS; // m del eje al antípoda, sobre el suelo
export const TAU = Math.PI * 2;

export const smooth = (edge0, edge1, value) => {
 const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
 return t * t * (3 - 2 * t);
};

// Punto del plano → punto de la esfera (centro en el origen, polo en +Y).
export function onSphere(x, z, out = [0, 0, 0]) {
 const flat = Math.hypot(x, z), d = Math.min(flat, REACH), a = d / RADIUS, s = flat > 1e-6 ? (Math.sin(a) * RADIUS) / flat : 0;
 out[0] = x * s;
 out[1] = Math.cos(a) * RADIUS;
 out[2] = z * s;
 return out;
}
// Cuánto hay que ensanchar algo a `d` metros del eje, de través, para que al curvarse el mundo
// (`curve` = 1 / radio de ese momento) conserve su ancho. Con tope: junto al antípoda se dispara.
export const stretch = (d, curve = 1 / RADIUS) => {
 const a = Math.min(d, REACH) * curve;
 return a < 1e-3 ? 1 : Math.min(5, a / Math.max(Math.sin(a), 0.02));
};

// Ruido suave y repetible, en tres dimensiones (sobre la esfera no hay costuras).
export function noise3(x, y, z) {
 const hash = (ix, iy, iz) => {
  const v = Math.sin(ix * 127.1 + iy * 311.7 + iz * 74.7) * 43758.5453;
  return v - Math.floor(v);
 };
 const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
 const tx = x - x0, ty = y - y0, tz = z - z0;
 const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), sz = tz * tz * (3 - 2 * tz);
 const row = (iy, iz) => hash(x0, iy, iz) * (1 - sx) + hash(x0 + 1, iy, iz) * sx;
 const face = (iz) => row(y0, iz) * (1 - sy) + row(y0 + 1, iz) * sy;
 return face(z0) * (1 - sz) + face(z0 + 1) * sz;
}
// El mismo ruido en un punto de la esfera, a la escala dada.
export const noiseAt = (p, scale, shift = 0) => noise3(p[0] * scale + shift, p[1] * scale - shift * 0.7, p[2] * scale + shift * 1.3);

// Generador aleatorio con semilla: el mundo sale igual en cada visita.
export function createRandom(seed) {
 let state = seed;
 return () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 };
}
