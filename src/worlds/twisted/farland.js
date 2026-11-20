import { PLANET } from "../../experience/state";
import { ISLETS, SEA_BED, STEP, WATER_LEVEL, createRandom, islandEdge } from "./layout";

// La tierra lejana de The Twisted Moon (objetivo 24): lo que hay más allá de la
// isla. No se pisa: es decoración para que, desde la órbita, el planeta entero
// sea tierra —terrazas y picos de pizarra, bosques, lagunas, un río, casitas con
// las ventanas encendidas— y no una isla sobre una bola de mar. El mar que
// rodeaba la isla queda como un foso ancho (a pie sigue siendo «el mar»), del
// que salen dos ríos que unen las lagunas.
//
// Todo se define sobre la esfera en que se cierra el mundo (distancias de
// verdad, medidas sobre el planeta), no en el plano: lejos del eje el plano se
// encoge al curvarse, y una laguna redonda en el plano sería una raja en la órbita.

const R = PLANET.radius;
const REACH = Math.PI * R; // m del eje al antípoda, sobre el suelo
const TAU = Math.PI * 2;
const smooth = (edge0, edge1, value) => {
 const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
 return t * t * (3 - 2 * t);
};

// Punto del plano → punto de la esfera (centro en el origen, polo en +Y).
function onSphere(x, z, out = [0, 0, 0]) {
 const flat = Math.hypot(x, z), d = Math.min(flat, REACH), a = d / R, s = flat > 1e-6 ? (Math.sin(a) * R) / flat : 0;
 out[0] = x * s;
 out[1] = Math.cos(a) * R;
 out[2] = z * s;
 return out;
}
// Y al revés.
function toFlat([px, py, pz]) {
 const d = Math.acos(Math.min(1, Math.max(-1, py / R))) * R, h = Math.hypot(px, pz);
 return h > 1e-6 ? [(px / h) * d, (pz / h) * d] : [0, 0];
}
// Rumbo (grados; 0 = norte, 90 = este) y metros desde el eje → plano.
const polar = (bearing, d) => [Math.sin((bearing * Math.PI) / 180) * d, -Math.cos((bearing * Math.PI) / 180) * d];
// Cuánto hay que ensanchar algo a `d` metros del eje, de través, para que al curvarse el mundo
// (`curve` = 1 / radio de ese momento) conserve su ancho. Con tope: junto al antípoda se dispara.
export const stretch = (d, curve = 1 / R) => {
 const a = Math.min(d, REACH) * curve;
 return a < 1e-3 ? 1 : Math.min(5, a / Math.max(Math.sin(a), 0.02));
};

// Ruido suave y repetible, en tres dimensiones (sobre la esfera no hay costuras).
function noise3(x, y, z) {
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
const at = (p, scale, shift = 0) => noise3(p[0] * scale + shift, p[1] * scale - shift * 0.7, p[2] * scale + shift * 1.3);

// ── Agua ────────────────────────────────────────────────────────────────────
const MOAT = 13.5; // m de foso alrededor de la isla (± lo que diga el ruido)
// Lagunas: [rumbo, m desde el eje, radio]. La última está en el antípoda.
const LAGOONS = [
 [180, 50, 8],
 [238, 68, 9],
 [112, 72, 8],
 [20, 78, 7],
 [318, 80, 7],
 [0, REACH, 9],
].map(([bearing, d, r]) => ({ bearing, d, r, centre: onSphere(...polar(bearing, d)) }));
// Ríos: del foso a las lagunas y de laguna en laguna. [rumbo, m desde el eje].
const RIVERS = [
 [[180, 23], [171, 34], [185, 42], [180, 50], [200, 58], [222, 62], [238, 68], [262, 76], [290, 81], [318, 80]],
 [[68, 43], [82, 52], [96, 62], [112, 72], [120, 84], [140, 93], [150, REACH]],
 [[20, 78], [40, 88], [62, 95], [80, REACH]],
].map((points) => {
 // A tramos cortos sobre la esfera.
 const out = [];
 const spots = points.map(([bearing, d]) => onSphere(...polar(bearing, d)));
 for (let i = 0; i < spots.length - 1; i++) {
  const a = spots[i], b = spots[i + 1], steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 4));
  for (let k = 0; k < steps; k++) {
   const t = k / steps, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], length = Math.hypot(...p) / R;
   out.push(p.map((c) => c / length));
  }
 }
 out.push(spots[spots.length - 1]);
 return out;
});
// Mesetas junto a tres lagunas, del lado de fuera: de cada una cae una cascada a su laguna.
const MESAS = [0, 1, 3].map((index) => {
 const { bearing, d, r } = LAGOONS[index], reach = 6.5;
 const [x, z] = polar(bearing, d + r + 1.2);
 return { centre: onSphere(...polar(bearing, d + r + reach - 1.5)), r: reach, fall: { x, z, d: d + r + 1.2, top: STEP * 2, bottom: WATER_LEVEL, turn: Math.atan2(-x, -z) } };
});
// Las cascadas de la tierra lejana (misma forma que las de la isla; ver Terrain.jsx).
// (De través se ensanchan lo que el mundo las va a encoger al cerrarse.)
export const FAR_FALLS = MESAS.map(({ fall }) => ({ ...fall, width: 2.6 * stretch(fall.d) }));

const arc = (p, c) => Math.acos(Math.min(1, Math.max(-1, (p[0] * c[0] + p[1] * c[1] + p[2] * c[2]) / (R * R)))) * R;
function toRivers(p) {
 let best = Infinity;
 for (const river of RIVERS) {
  for (let i = 0; i < river.length - 1; i++) {
   const a = river[i], b = river[i + 1];
   if (Math.abs(p[0] - a[0]) > best + 5 || Math.abs(p[1] - a[1]) > best + 5 || Math.abs(p[2] - a[2]) > best + 5) continue;
   const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
   const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy + (p[2] - a[2]) * dz) / (dx * dx + dy * dy + dz * dz || 1)));
   best = Math.min(best, Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t, p[2] - a[2] - dz * t));
  }
 }
 return best;
}

// Altura de la tierra lejana en (x, z) del plano. En la isla, en su foso, en las
// lagunas y en los ríos devuelve el fondo del mar: ahí manda lo que ya había.
const P = [0, 0, 0];
export function farGround(x, z) {
 const out = -islandEdge(x, z); // m mar adentro desde la costa de la isla
 if (out < MOAT - 5) return SEA_BED;
 const p = onSphere(x, z, P);
 const beyond = out - (MOAT + (at(p, 0.08, 11) - 0.5) * 7);
 let bank = smooth(0, 1.6, beyond);
 if (bank <= 0) return SEA_BED;
 const ragged = (at(p, 0.25, 3) - 0.5) * 2.4;
 for (const lagoon of LAGOONS) bank = Math.min(bank, smooth(0, 1.5, arc(p, lagoon.centre) - lagoon.r + ragged));
 if (bank <= 0) return SEA_BED;
 bank = Math.min(bank, smooth(0, 1.3, toRivers(p) - 1.8 + ragged * 0.3));
 if (bank <= 0) return SEA_BED;
 // Terrazas, como las de la isla: el ruido dice cuántas alturas sube cada sitio.
 // Junto al foso se quedan bajas: no encierran la isla tras un muro.
 const t = at(p, 0.045, 0) * 0.62 + at(p, 0.1, 5) * 0.38 - 0.2 * (1 - smooth(0, 16, beyond));
 let h = 0.5 + (at(p, 0.3, 7) - 0.5) * 0.5;
 for (const edge of [0.52, 0.62, 0.71]) h += STEP * smooth(edge - 0.014, edge + 0.014, t);
 for (const mesa of MESAS) h = Math.max(h, STEP * 2 * smooth(-0.7, 0.7, mesa.r - arc(p, mesa.centre) + ragged * 0.6));
 return SEA_BED + (h - SEA_BED) * bank;
}
// Lo que se ve de ella andando por la isla: hasta estos metros de su costa. El
// resto solo se dibuja en vuelo (ver FarScene.jsx).
export const NEAR = 30;
export const isNear = (x, z) => -islandEdge(x, z) < NEAR;

// ── La malla ────────────────────────────────────────────────────────────────
// Rejilla en anillos alrededor del eje, con los nudos algo descolocados. Devuelve
// los triángulos (posiciones, sin índice) de lo que asoma del agua, separados en
// «cerca» y «lejos».
export function farMesh() {
 const AROUND = 168, RINGS = 64, FROM = 12, TO = REACH - 1.2;
 const hash = (i, j) => {
  const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return v - Math.floor(v);
 };
 const nodes = [];
 for (let j = 0; j <= RINGS; j++) {
  for (let i = 0; i < AROUND; i++) {
   const loose = j > 0 && j < RINGS ? 0.56 : 0;
   const angle = ((i + (hash(i, j) - 0.5) * loose) / AROUND) * TAU, d = FROM + ((j + (hash(i + 31, j + 17) - 0.5) * loose) / RINGS) * (TO - FROM);
   const x = Math.cos(angle) * d, z = Math.sin(angle) * d;
   nodes.push([x, farGround(x, z), z]);
  }
 }
 const near = [], far = [];
 const node = (i, j) => nodes[j * AROUND + (i % AROUND)];
 for (let j = 0; j < RINGS; j++) {
  for (let i = 0; i < AROUND; i++) {
   const a = node(i, j), b = node(i + 1, j), c = node(i, j + 1), d = node(i + 1, j + 1);
   // (La diagonal, alternada: sin dirección dominante.)
   for (const tri of (i + j) % 2 ? [[a, c, b], [b, c, d]] : [[a, c, d], [a, d, b]]) {
    if (Math.max(tri[0][1], tri[1][1], tri[2][1]) <= SEA_BED + 0.01) continue;
    const into = isNear((tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][2] + tri[1][2] + tri[2][2]) / 3) ? near : far;
    for (const point of tri) into.push(point[0], point[1], point[2]);
   }
  }
 }
 return { near, far };
}
// Para pintar el suelo: manchas grandes, sin costuras.
export const farPatch = (x, z) => {
 const p = onSphere(x, z, P);
 return at(p, 0.09, 31) * 0.7 + at(p, 0.3, 9) * 0.3;
};

// ── Lo plantado ─────────────────────────────────────────────────────────────
// Reparte cosas por toda la esfera, por igual (no por igual en el plano, donde
// el antípoda es un círculo enorme). `take(spot)` dice si el sitio vale.
function slopeAt(x, z, d) {
 const e = 0.7, k = stretch(d), ux = x / (d || 1), uz = z / (d || 1);
 const along = farGround(x + ux * e, z + uz * e) - farGround(x - ux * e, z - uz * e);
 const across = farGround(x - uz * e * k, z + ux * e * k) - farGround(x + uz * e * k, z - ux * e * k);
 return Math.hypot(along, across) / (2 * e);
}
// ¿Tierra firme y llana? Devuelve su altura, o null.
function dry(x, z, d, margin = 1.2) {
 const y = farGround(x, z);
 if (y < 0.2) return null; // (el fondo, la orilla y su talud)
 if (slopeAt(x, z, d) > 0.3) return null;
 // Ni al borde de un cortado o del agua.
 const k = stretch(d), ux = x / (d || 1), uz = z / (d || 1);
 for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (Math.abs(farGround(x + (ux * du - uz * dv * k) * margin, z + (uz * du + ux * dv * k) * margin) - y) > 0.8) return null;
 return y;
}
const apart = (a, b) => Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]);
function scatter(seed, count, take, tries = count * 40) {
 const random = createRandom(seed), out = [];
 for (let n = 0; out.length < count && n < tries; n++) {
  const a = Math.acos(1 - random() * 1.97), angle = random() * TAU, d = a * R;
  const x = Math.cos(angle) * d, z = Math.sin(angle) * d;
  if (-islandEdge(x, z) < MOAT - 4) continue;
  const spot = { x, z, d, p: onSphere(x, z), random };
  const found = take(spot, out);
  if (found) out.push({ x, z, d, p: spot.p, turn: random() * TAU, ...found });
 }
 return out;
}
// Un punto a `along` m hacia fuera y `across` m de través (medidos sobre el planeta) de otro.
function offset(spot, along, across) {
 const ux = spot.x / spot.d, uz = spot.z / spot.d, k = stretch(spot.d);
 const x = spot.x + ux * along - uz * across * k, z = spot.z + uz * along + ux * across * k;
 return { x, z, d: Math.hypot(x, z), p: onSphere(x, z) };
}

const WILLOW = ["#d6c9f0", "#a9ddd2", "#dcb9d0"], BROAD = ["#c9b6e6", "#9cd0c8", "#b9a8dc"], SPIRAL = ["#b7a6da", "#a3cbd2"];
const pickFrom = (list, random) => list[Math.floor(random() * list.length)];

function plant() {
 // Casitas: en llano, separadas, alguna cerca de la isla (se ven desde ella, a lo lejos).
 const houses = scatter(20261201, 46, (spot, list) => {
  const y = dry(spot.x, spot.z, spot.d, 2.2);
  if (y === null || list.some((one) => apart(one, spot) < 10)) return null;
  return { y, scale: 0.95 + spot.random() * 0.4 };
 });
 // Picos de pizarra: agujas que salen de la tierra, sueltas o en grupos de dos o tres.
 const peaks = scatter(20261202, 34, (spot, list) => {
  const y = farGround(spot.x, spot.z);
  if (y < 0.2 || houses.some((one) => apart(one, spot) < 5.5) || list.some((one) => apart(one, spot) < 4.5)) return null;
  // (En las zonas que el ruido marca como sierra, casi siempre; fuera, alguno suelto.)
  if (at(spot.p, 0.06, 50) < 0.52 && spot.random() > 0.12) return null;
  const big = spot.random() < 0.35;
  return { y, r: big ? 2.0 + spot.random() * 1.0 : 1.1 + spot.random() * 0.8, top: big ? 6.5 + spot.random() * 4 : 3 + spot.random() * 3 };
 }, 9000);
 // Bosques: tupidos donde el ruido dice bosque, con claros entre uno y otro.
 const trees = scatter(20261203, 430, (spot, list) => {
  const wood = at(spot.p, 0.07, 20);
  if (wood < 0.47 && spot.random() > 0.1) return null;
  const y = dry(spot.x, spot.z, spot.d, 0.9);
  if (y === null || houses.some((one) => apart(one, spot) < 3.4) || peaks.some((one) => apart(one, spot) < one.r + 0.8)) return null;
  for (let i = list.length - 1; i >= 0; i--) if (apart(list[i], spot) < 2.5) return null;
  const kind = at(spot.p, 0.05, 40) + (spot.random() - 0.5) * 0.16;
  return kind < 0.47 ? { y, kind: "willow", tint: pickFrom(WILLOW, spot.random), scale: 0.7 + spot.random() * 0.45 } : kind < 0.56 ? { y, kind: "broad", tint: pickFrom(BROAD, spot.random), scale: 0.65 + spot.random() * 0.4 } : { y, kind: "spiral", tint: pickFrom(SPIRAL, spot.random), scale: 0.65 + spot.random() * 0.45 };
 }, 60000);
 // Farolillos: uno o dos junto a cada casita y a lo largo de los ríos.
 const lanterns = [];
 const light = (spot) => {
  const y = dry(spot.x, spot.z, spot.d, 0.6);
  if (y === null || lanterns.some((one) => apart(one, spot) < 3.5)) return;
  lanterns.push({ ...spot, y, turn: 0, scale: 1 });
 };
 houses.forEach((house, i) => {
  light(offset(house, 2.6, 1.8));
  if (i % 2) light(offset(house, -2.4, -2.6));
 });
 for (const river of RIVERS) {
  for (let i = 2, side = 1; i < river.length - 2; i += 3, side = -side) {
   const a = river[i - 1], b = river[i + 1], p = river[i];
   // De través al río, sobre la esfera: tangente × radio.
   const t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], n = [t[1] * p[2] - t[2] * p[1], t[2] * p[0] - t[0] * p[2], t[0] * p[1] - t[1] * p[0]], length = Math.hypot(...n) || 1;
   const q = p.map((c, k) => c + (n[k] / length) * 4.4 * side), scale = R / Math.hypot(...q);
   const [x, z] = toFlat(q.map((c) => c * scale));
   light({ x, z, d: Math.hypot(x, z), p: onSphere(x, z) });
  }
 }
 // Charcos de luz cálida: ante cada casita y bajo cada farolillo.
 const pools = [...houses.map((house) => ({ ...house, scale: 3.4 * house.scale })), ...lanterns.map((one, i) => ({ ...one, scale: 2.4 + (i % 3) * 0.5 }))];
 // (Lo que se ve desde la isla, primero: andando solo se dibuja eso.)
 const sorted = (list) => {
  const near = list.filter((one) => isNear(one.x, one.z));
  return { items: [...near, ...list.filter((one) => !isNear(one.x, one.z))], near: near.length };
 };
 return { houses: sorted(houses), peaks: sorted(peaks), lanterns: sorted(lanterns), pools: sorted(pools), willow: sorted(trees.filter((one) => one.kind === "willow")), broad: sorted(trees.filter((one) => one.kind === "broad")), spiral: sorted(trees.filter((one) => one.kind === "spiral")) };
}
let planted = null;
export const farScatter = () => (planted ??= plant());

// Las rocas del mar abierto (objetivo 22) que siguen en el agua: las del foso y las de alguna laguna.
export const SEA_ROCKS = ISLETS.filter(([x, z, r]) => {
 for (let k = 0; k < 8; k++) if (farGround(x + Math.cos((k / 8) * TAU) * (r + 3), z + Math.sin((k / 8) * TAU) * (r + 3)) > SEA_BED) return false;
 return farGround(x, z) <= SEA_BED;
});
