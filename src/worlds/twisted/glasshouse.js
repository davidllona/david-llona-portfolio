import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { merge, piece, randomFrom, tube } from "../living/kit/geometry";
import { IRON, STONE } from "./models";

// El invernadero de The Twisted Moon (objetivo 28; antes era una caja de
// cristal morado con bolas dentro). De cuento: murete de piedra, armazón de
// hierro con arquillos en cada paño, tejado a dos aguas con linterna y
// crestería, puerta de hierro y cristal entreabierta, y cristales casi
// transparentes —alguno empañado, alguno roto—. Dentro, dos bancales con
// plantas que parecen plantas (rosetas de hojas, helechos, varas con
// campanillas que brillan), un platanero al fondo, macetas, enredaderas por
// el armazón y cestas colgadas. Hecho a mano: el «Greenhouse» descargado
// (spacepixelcreative) es una caja opaca sin plantas (ver docs/RECURSOS.md).
// Ejes: fachada (la puerta) hacia +Z, metros.
// Devuelve: `frame` (piedra, hierro, madera, macetas), `glass` (los paños, con
// `tone` por vértice: 0 limpio … 1 empañado), `green` (lo que crece), `glow`
// (flores y brotes que brillan), `lamp` (el cristal del farol colgado) y
// `lampAt` (dónde cuelga).
export const GLASSHOUSE = { base: 0.55, eave: 2.05, ridge: 3.35 };
const LEAVES = ["#2f7466", "#3f8f78", "#58a88c", "#2a5f5c"];
const PLUM = ["#6a4f9a", "#8a5fb0"];
const TIMBER = { dark: "#2c2230", mid: "#4a3a4e", light: "#66526a" };
const POT = { dark: "#5c3836", light: "#8f5a4c" };
const VIOLET = "#9b5cff", AQUA = "#2fe9d6", CREAM = "#ffe2a8";

export function createGreenhouse({ width, depth }) {
 const random = randomFrom(0.731);
 const { base, eave, ridge } = GLASSHOUSE;
 const w = width / 2, d = depth / 2;
 const frame = [], panes = [], green = [], glow = [], lamp = [];
 const pick = (list) => list[Math.floor(random() * list.length)];

 // ── Utilidades ──
 const bar = (from, to, thick = 0.07, color = IRON) => {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), length = a.distanceTo(b);
  const made = piece(new THREE.BoxGeometry(thick, length, thick), { color });
  made.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  made.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return made;
 };
 // Un paño de cristal: tres o cuatro esquinas. `tone`: cuánto de empañado.
 const pane = (corners, tone = 0) => {
  const [a, b, c, e] = corners;
  const positions = e ? [...a, ...b, ...c, ...a, ...c, ...e] : [...a, ...b, ...c];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("tone", new THREE.Float32BufferAttribute(new Float32Array(positions.length / 3).fill(tone), 1));
  panes.push(geometry);
 };
 // Un paño que puede estar limpio, empañado o roto (queda un pico de cristal en una esquina).
 let count = 0;
 const BROKEN = new Set([5, 19, 30]), FOGGED = new Set([2, 9, 12, 16, 23, 27, 33, 38, 41]);
 const fickle = (corners) => {
  const k = count++;
  if (BROKEN.has(k)) {
   const [a, b, c, e] = corners, mix = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);
   pane([a, mix(a, b, 0.55), mix(a, e, 0.4)], 0.25);
   pane([c, mix(c, b, 0.35), mix(c, e, 0.5)], 0.25);
   return;
  }
  pane(corners, FOGGED.has(k) ? 0.55 + random() * 0.35 : random() < 0.3 ? 0.12 : 0);
 };

 // ── Murete de piedra: sillares desiguales, con su albardilla, y el hueco de la puerta ──
 const DOOR = 0.58; // medio ancho del hueco
 const wallRun = (from, to, yaw, at) => {
  let left = from;
  while (left < to - 0.02) {
   let wide = 0.42 + random() * 0.5;
   if (to - (left + wide) < 0.3) wide = to - left;
   const [x, z] = at(left + wide / 2);
   frame.push(piece(new THREE.BoxGeometry(wide - 0.04, base, 0.3), { bottom: STONE.dark, top: pick([STONE.mid, STONE.light, STONE.mid]), jitter: 0.016, vary: 0.12, seed: 1 + Math.floor(random() * 900), position: [x, base / 2, z], rotation: [0, yaw, 0] }));
   left += wide;
  }
 };
 wallRun(-d, d, Math.PI / 2, (t) => [-w, t]);
 wallRun(-d, d, Math.PI / 2, (t) => [w, t]);
 wallRun(-w, w, 0, (t) => [t, -d]);
 wallRun(-w, -DOOR, 0, (t) => [t, d]);
 wallRun(DOOR, w, 0, (t) => [t, d]);
 for (const [x, z, sx, sz] of [[-w, 0, 0.4, depth + 0.4], [w, 0, 0.4, depth + 0.4], [0, -d, width + 0.4, 0.4], [-(w + DOOR) / 2, d, w - DOOR + 0.2, 0.4], [(w + DOOR) / 2, d, w - DOOR + 0.2, 0.4]]) {
  frame.push(piece(new THREE.BoxGeometry(sx, 0.08, sz), { bottom: STONE.mid, top: STONE.light, jitter: 0.01, position: [x, base + 0.03, z] }));
 }
 // Suelo de losas, dentro, y el escalón de la puerta.
 frame.push(piece(new THREE.BoxGeometry(width - 0.3, 0.06, depth - 0.3), { bottom: STONE.dark, top: "#3d3a54", vary: 0.06, position: [0, 0.04, 0] }));
 frame.push(piece(new THREE.BoxGeometry(1.5, 0.14, 0.6), { bottom: STONE.dark, top: STONE.light, jitter: 0.02, position: [0, 0.07, d + 0.36] }));

 // ── Armazón de hierro ──
 const BAYS = 8, bay = depth / BAYS, mid = (base + eave) / 2 + 0.1;
 const slope = (x) => eave + (ridge - eave) * (1 - Math.abs(x) / w); // altura del tejado a esa distancia del eje
 // Linterna: el cuerpo elevado sobre la cumbrera, con su tejadillo.
 const LANTERN = { half: 0.46, from: -d * 0.56, to: d * 0.56, lift: 0.32, peak: 0.34 };
 const lanternFoot = slope(LANTERN.half), lanternEave = lanternFoot + LANTERN.lift, lanternRidge = lanternEave + LANTERN.peak;
 for (let i = 0; i <= BAYS; i++) {
  const z = -d + bay * i, thick = i === 0 || i === BAYS ? 0.1 : 0.055;
  for (const side of [-1, 1]) {
   frame.push(bar([side * w, base, z], [side * w, eave, z], thick));
   const inLantern = z > LANTERN.from - 0.01 && z < LANTERN.to + 0.01;
   frame.push(bar([side * w, eave, z], inLantern ? [side * LANTERN.half, lanternFoot, z] : [0, ridge, z], thick * 0.9));
   // Arquillo bajo el alero, en cada paño.
   if (i < BAYS) {
    const arch = piece(new THREE.TorusGeometry(bay / 2 - 0.03, 0.02, 4, 7, Math.PI), { color: IRON });
    arch.rotateY(Math.PI / 2).translate(side * w, eave - bay / 2 - 0.02, z + bay / 2);
    frame.push(arch);
    // Los paños de la pared: el de abajo y el de arriba.
    const x = side * w, z0 = side < 0 ? z : z + bay, z1 = side < 0 ? z + bay : z;
    fickle([[x, base + 0.07, z0], [x, base + 0.07, z1], [x, mid, z1], [x, mid, z0]]);
    fickle([[x, mid, z0], [x, mid, z1], [x, eave, z1], [x, eave, z0]]);
   }
  }
 }
 for (const side of [-1, 1]) {
  frame.push(bar([side * w, eave, -d], [side * w, eave, d], 0.1), bar([side * w, mid, -d], [side * w, mid, d], 0.045));
  frame.push(bar([side * w * 0.56, slope(w * 0.56), -d], [side * w * 0.56, slope(w * 0.56), d], 0.045));
  // El tejado: dos paños por agua y por tramo (de dos en dos tramos: cristales grandes).
  for (let i = 0; i < BAYS; i += 2) {
   const z0 = -d + bay * i, z1 = z0 + bay * 2, xm = side * w * 0.56, ym = slope(w * 0.56);
   const inLantern = (z0 + z1) / 2 > LANTERN.from && (z0 + z1) / 2 < LANTERN.to;
   const top = inLantern ? [side * LANTERN.half, lanternFoot] : [0, ridge];
   const order = (a, b, c, e) => (side < 0 ? [a, b, c, e] : [b, a, e, c]);
   fickle(order([side * w, eave, z0], [side * w, eave, z1], [xm, ym, z1], [xm, ym, z0]));
   fickle(order([xm, ym, z0], [xm, ym, z1], [top[0], top[1], z1], [top[0], top[1], z0]));
  }
 }
 // Cumbrera (por tramos, a los lados de la linterna) y la linterna.
 frame.push(bar([0, ridge, -d], [0, ridge, LANTERN.from], 0.09), bar([0, ridge, LANTERN.to], [0, ridge, d], 0.09));
 for (const side of [-1, 1]) {
  const x = side * LANTERN.half;
  frame.push(bar([x, lanternFoot, LANTERN.from], [x, lanternFoot, LANTERN.to], 0.08), bar([x, lanternEave, LANTERN.from], [x, lanternEave, LANTERN.to], 0.07));
  for (let k = 0; k <= 6; k++) {
   const z = LANTERN.from + ((LANTERN.to - LANTERN.from) * k) / 6;
   frame.push(bar([x, lanternFoot, z], [x, lanternEave, z], 0.045), bar([x, lanternEave, z], [0, lanternRidge, z], 0.04));
  }
  pane([[x, lanternFoot, LANTERN.from], [x, lanternFoot, LANTERN.to], [x, lanternEave, LANTERN.to], [x, lanternEave, LANTERN.from]], 0.1);
  pane([[x, lanternEave, LANTERN.from], [x, lanternEave, LANTERN.to], [0, lanternRidge, LANTERN.to], [0, lanternRidge, LANTERN.from]], side < 0 ? 0.5 : 0.05);
 }
 for (const z of [LANTERN.from, LANTERN.to]) {
  frame.push(bar([-LANTERN.half, lanternEave, z], [LANTERN.half, lanternEave, z], 0.05), bar([-LANTERN.half, lanternFoot, z], [0, ridge, z], 0.05), bar([LANTERN.half, lanternFoot, z], [0, ridge, z], 0.05));
  pane([[-LANTERN.half, lanternFoot, z], [LANTERN.half, lanternFoot, z], [LANTERN.half, lanternEave, z], [-LANTERN.half, lanternEave, z]], 0.15);
  pane([[-LANTERN.half, lanternEave, z], [LANTERN.half, lanternEave, z], [0, lanternRidge, z]], 0.15);
 }
 frame.push(bar([0, lanternRidge, LANTERN.from - 0.08], [0, lanternRidge, LANTERN.to + 0.08], 0.07));
 // Crestería: púas a lo largo de la linterna y un rizo en cada punta.
 for (let k = 0; k <= 9; k++) frame.push(piece(new THREE.ConeGeometry(0.03, 0.17, 4), { color: IRON, position: [0, lanternRidge + 0.1, LANTERN.from + ((LANTERN.to - LANTERN.from) * k) / 9] }));
 for (const end of [-1, 1]) {
  const z = end < 0 ? -d : d;
  frame.push(piece(tube([[0, ridge, z], [0, ridge + 0.3, z + end * 0.1], [0, ridge + 0.5, z - end * 0.1], [0, ridge + 0.4, z - end * 0.26], [0, ridge + 0.28, z - end * 0.16]], (t) => 0.035 - t * 0.02, { sides: 4, segments: 8 }), { color: IRON }));
 }

 // ── Testeros ──
 // El de atrás: travesaños y parteluces.
 frame.push(bar([-w, eave, -d], [w, eave, -d], 0.08), bar([-w, mid, -d], [w, mid, -d], 0.045), bar([0, base, -d], [0, ridge, -d], 0.055));
 for (const x of [-w / 2, w / 2]) frame.push(bar([x, base, -d], [x, slope(x), -d], 0.045));
 for (const [x0, x1] of [[-w, -w / 2], [-w / 2, 0], [0, w / 2], [w / 2, w]]) {
  fickle([[x1, base + 0.07, -d], [x0, base + 0.07, -d], [x0, mid, -d], [x1, mid, -d]]);
  fickle([[x1, mid, -d], [x0, mid, -d], [x0, eave, -d], [x1, eave, -d]]);
  pane([[x1, eave, -d], [x0, eave, -d], [x0, slope(x0), -d], [x1, slope(x1), -d]], 0.1);
 }
 // El de delante: la puerta en arco, y a sus lados y encima, cristal.
 const ARCH = 2.0; // arranque del arco de la puerta
 frame.push(bar([-DOOR, 0.12, d], [-DOOR, ARCH, d], 0.09), bar([DOOR, 0.12, d], [DOOR, ARCH, d], 0.09), bar([-w, eave, d], [-DOOR, eave, d], 0.08), bar([DOOR, eave, d], [w, eave, d], 0.08), bar([-w, mid, d], [-DOOR, mid, d], 0.045), bar([DOOR, mid, d], [w, mid, d], 0.045));
 {
  const arch = piece(new THREE.TorusGeometry(DOOR, 0.045, 4, 9, Math.PI), { color: IRON });
  arch.translate(0, ARCH, d);
  frame.push(arch);
  // Rayos del arco a la cumbrera.
  for (const angle of [0.5, Math.PI / 2, Math.PI - 0.5]) {
   const x = Math.cos(angle) * DOOR, y = ARCH + Math.sin(angle) * DOOR, far = Math.cos(angle) * 1.25;
   frame.push(bar([x, y, d], [far, slope(far) - 0.03, d], 0.04));
  }
 }
 for (const side of [-1, 1]) {
  const x0 = side * w, x1 = side * DOOR, order = (list) => (side < 0 ? list : [list[1], list[0], list[3], list[2]]);
  fickle(order([[x0, base + 0.07, d], [x1, base + 0.07, d], [x1, mid, d], [x0, mid, d]]));
  fickle(order([[x0, mid, d], [x1, mid, d], [x1, eave, d], [x0, eave, d]]));
  pane(order([[x0, eave, d], [x1, eave, d], [x1, slope(x1), d], [x0, slope(x0), d]]), 0.08);
 }
 pane([[-DOOR, ARCH + 0.5, d], [DOOR, ARCH + 0.5, d], [DOOR, slope(DOOR), d], [-DOOR, slope(DOOR), d]], 0.06);
 pane([[-DOOR, slope(DOOR), d], [DOOR, slope(DOOR), d], [0, ridge, d]], 0.06);
 // La hoja de la puerta, entreabierta hacia fuera: bastidor de hierro, zócalo de chapa y cristales.
 {
  const SWING = 1.15, hinge = [-DOOR, d + 0.02], wide = DOOR * 2 - 0.06;
  const on = (u, y) => [hinge[0] + Math.cos(SWING) * u, y, hinge[1] + Math.sin(SWING) * u];
  for (const u of [0, wide / 2, wide]) frame.push(bar(on(u, 0.16), on(u, ARCH - 0.02), u === wide / 2 ? 0.04 : 0.065));
  for (const y of [0.16, 0.78, 1.4, ARCH - 0.02]) frame.push(bar(on(0, y), on(wide, y), 0.055));
  const plate = piece(new THREE.BoxGeometry(wide, 0.6, 0.03), { bottom: "#232130", top: "#34314a", vary: 0.06 });
  plate.rotateY(-SWING).translate(...on(wide / 2, 0.47));
  frame.push(plate, piece(new THREE.SphereGeometry(0.045, 6, 5), { color: "#c1933f", position: on(wide - 0.1, 1.05).map((v, i) => v + (i === 0 ? 0.04 : i === 2 ? -0.02 : 0)) }));
  for (const [u0, u1] of [[0, wide / 2], [wide / 2, wide]]) for (const [y0, y1] of [[0.78, 1.4], [1.4, ARCH - 0.02]]) pane([on(u0, y0), on(u1, y0), on(u1, y1), on(u0, y1)], 0.1);
 }
 // Cristales rotos en el suelo, al pie del lado este.
 for (const [x, z, r, turn] of [[w + 0.45, -0.7, 0.16, 0.4], [w + 0.7, -0.3, 0.1, 1.9], [w + 0.35, 0.1, 0.12, 3.3]]) {
  const at = (k) => [x + Math.cos(turn + k * 2.2) * r * (0.7 + k * 0.2), 0.05, z + Math.sin(turn + k * 2.2) * r];
  pane([at(0), at(1), at(2)], 0.3);
 }

 // ── Lo que crece ──
 // Una hoja: una tira que sigue su nervio (sube y se vence) y se ensancha y afila según `shape`.
 const leaf = (from, heading, length, wide, { rise = 0.5, droop = 0.55, tone, shape = [0.3, 0.85, 1, 0.62, 0], seed = 1 } = {}) => {
  const positions = [], last = shape.length - 1;
  const spine = shape.map((_, k) => {
   const t = k / last, out = length * t;
   return [from[0] + Math.cos(heading) * out, from[1] + length * (rise * Math.sin(t * Math.PI * 0.5) - droop * t * t), from[2] + Math.sin(heading) * out];
  });
  const sx = -Math.sin(heading) * wide * 0.5, sz = Math.cos(heading) * wide * 0.5;
  for (let k = 0; k < last; k++) {
   const a = spine[k], b = spine[k + 1], wa = shape[k], wb = shape[k + 1];
   const a0 = [a[0] - sx * wa, a[1], a[2] - sz * wa], a1 = [a[0] + sx * wa, a[1], a[2] + sz * wa], b0 = [b[0] - sx * wb, b[1], b[2] - sz * wb], b1 = [b[0] + sx * wb, b[1], b[2] + sz * wb];
   positions.push(...a0, ...a1, ...b0);
   if (wb > 1e-4) positions.push(...a1, ...b1, ...b0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const color = new THREE.Color(tone);
  green.push(piece(geometry, { bottom: `#${color.clone().multiplyScalar(0.62).getHexString()}`, top: tone, vary: 0.14, seed }));
  return spine[last];
 };
 const bud = (at, tone, r = 0.05) => glow.push(piece(new THREE.OctahedronGeometry(r, 0), { color: tone, position: at, rotation: [random() * 3, random() * 3, 0], scale: [1, 1.25, 1] }));
 const SERRATED = [0.25, 1, 0.5, 0.92, 0.45, 0.75, 0.32, 0.5, 0];
 // Roseta de hojas anchas.
 const rosette = (x, y, z, s, tone) => {
  const n = 6 + Math.floor(random() * 3), turn = random() * 6;
  for (let k = 0; k < n; k++) leaf([x, y, z], turn + (k / n) * Math.PI * 2 + (random() - 0.5) * 0.3, s * (0.38 + random() * 0.2), s * 0.2, { rise: 0.75 + random() * 0.4, droop: 0.5 + random() * 0.3, tone: tone ?? pick(LEAVES), seed: k + 2 });
 };
 // Helecho: frondas largas y dentadas.
 const fern = (x, y, z, s) => {
  const n = 7, turn = random() * 6;
  for (let k = 0; k < n; k++) leaf([x, y, z], turn + (k / n) * Math.PI * 2 + (random() - 0.5) * 0.25, s * (0.55 + random() * 0.25), s * 0.2, { rise: 0.85, droop: 0.85, tone: k % 4 === 3 ? LEAVES[2] : LEAVES[1], shape: SERRATED, seed: k + 11 });
 };
 // Varas con campanillas que brillan.
 const bells = (x, y, z, s, tone) => {
  for (let k = 0; k < 3 + Math.floor(random() * 2); k++) {
   const lean = random() * 6, tall = s * (0.5 + random() * 0.4), tip = [x + Math.cos(lean) * tall * 0.3, y + tall, z + Math.sin(lean) * tall * 0.3];
   green.push(piece(tube([[x, y, z], [x + Math.cos(lean) * tall * 0.1, y + tall * 0.55, z + Math.sin(lean) * tall * 0.1], tip], () => 0.012, { sides: 3, segments: 4 }), { color: LEAVES[3] }));
   glow.push(piece(new THREE.ConeGeometry(0.05, 0.1, 5).rotateX(Math.PI), { color: tone, position: [tip[0] + Math.cos(lean) * 0.03, tip[1] - 0.03, tip[2] + Math.sin(lean) * 0.03], rotation: [0.3, lean, 0.3] }));
   if (k % 2 === 0) bud([x + Math.cos(lean) * tall * 0.2, y + tall * 0.72, z + Math.sin(lean) * tall * 0.2], tone, 0.032);
  }
  for (let k = 0; k < 4; k++) leaf([x, y, z], random() * 6, s * 0.26, s * 0.12, { tone: pick(LEAVES), seed: k + 21 });
 };
 // Mata redonda con brotes.
 const bush = (x, y, z, s, tone) => {
  green.push(piece(new THREE.IcosahedronGeometry(s * 0.24, 0), { bottom: LEAVES[3], top: pick(PLUM), jitter: s * 0.04, vary: 0.16, seed: 31, position: [x, y + s * 0.2, z], scale: [1.15, 0.85, 1.15] }));
  for (let k = 0; k < 5; k++) {
   const a = random() * 6, up = 0.3 + random() * 0.6;
   bud([x + Math.cos(a) * s * 0.25 * (1 - up * 0.5), y + s * 0.2 + s * 0.2 * up, z + Math.sin(a) * s * 0.25 * (1 - up * 0.5)], tone, 0.036);
  }
 };
 const pot = (x, y, z, r, tall = r * 1.5) => frame.push(piece(new THREE.CylinderGeometry(r, r * 0.72, tall, 7), { bottom: POT.dark, top: POT.light, vary: 0.1, seed: Math.floor(random() * 90), position: [x, y + tall / 2, z] }), piece(new THREE.CylinderGeometry(r * 1.1, r * 1.1, tall * 0.16, 7), { color: POT.light, position: [x, y + tall * 0.94, z] }));

 // Bancales: un cajón de madera a cada lado, con su tierra.
 const BED = { x: w - 0.62, wide: 0.82, tall: 0.6, from: -d + 0.35, to: d - 0.55 };
 for (const side of [-1, 1]) {
  const x = side * BED.x, long = BED.to - BED.from, z = (BED.from + BED.to) / 2;
  frame.push(
   piece(new THREE.BoxGeometry(BED.wide, BED.tall, long), { bottom: TIMBER.dark, top: TIMBER.mid, vary: 0.1, jitter: 0.01, position: [x, BED.tall / 2 + 0.05, z] }),
   piece(new THREE.BoxGeometry(BED.wide + 0.08, 0.07, long + 0.08), { color: TIMBER.light, position: [x, BED.tall + 0.03, z] }),
   piece(new THREE.BoxGeometry(BED.wide - 0.1, 0.05, long - 0.1), { color: "#1b1820", position: [x, BED.tall + 0.07, z] }),
  );
  for (const zz of [BED.from + 0.3, z, BED.to - 0.3]) frame.push(piece(new THREE.BoxGeometry(BED.wide + 0.1, BED.tall, 0.08), { color: TIMBER.dark, position: [x, BED.tall / 2 + 0.05, zz] }));
  // Lo plantado: de atrás adelante, alternando.
  const top = BED.tall + 0.1, kinds = side < 0 ? ["fern", "bells", "rosette", "bush", "bells", "fern", "rosette"] : ["rosette", "bush", "fern", "bells", "rosette", "bells", "fern"];
  kinds.forEach((kind, i) => {
   const zz = BED.from + 0.35 + ((long - 0.7) * i) / (kinds.length - 1), xx = x + (random() - 0.5) * 0.2, tone = (i + (side < 0 ? 0 : 1)) % 2 ? AQUA : VIOLET, s = 0.9 + random() * 0.35;
   if (kind === "fern") fern(xx, top, zz, s);
   else if (kind === "bells") bells(xx, top, zz, s * 1.1, tone);
   else if (kind === "rosette") (rosette(xx, top, zz, s * 1.05, i % 3 === 0 ? pick(PLUM) : undefined), bud([xx, top + 0.2, zz], tone, 0.045));
   else bush(xx, top, zz, s * 1.2, tone);
  });
 }
 // Al fondo, un platanero en su macetón: hojas grandes, hasta el tejado.
 {
  const z = -d + 0.62;
  pot(0, 0.06, z, 0.36, 0.5);
  green.push(piece(tube([[0, 0.5, z], [0.04, 1.1, z + 0.02], [-0.02, 1.7, z]], (t) => 0.09 - t * 0.04, { sides: 5, segments: 4 }), { bottom: LEAVES[3], top: LEAVES[0] }));
  for (let k = 0; k < 7; k++) leaf([0, 1.55 + (k % 3) * 0.12, z], 0.5 + (k / 7) * Math.PI * 2, 0.95 + (k % 2) * 0.3, 0.42, { rise: 0.8, droop: 0.75, tone: LEAVES[k % 3], shape: [0.3, 0.9, 1, 0.9, 0.6, 0], seed: k + 41 });
  bud([0, 1.72, z + 0.05], CREAM, 0.07);
 }
 // Macetas sueltas: junto a la puerta y en el pasillo.
 for (const [x, z, r, kind] of [[-0.42, d - 0.5, 0.2, "fern"], [0.5, d - 0.75, 0.16, "bells"], [0.36, -0.4, 0.17, "rosette"], [-0.4, -1.3, 0.15, "bush"]]) {
  pot(x, 0.06, z, r);
  const top = 0.06 + r * 1.5;
  if (kind === "fern") fern(x, top, z, 0.7);
  else if (kind === "bells") bells(x, top, z, 0.8, VIOLET);
  else if (kind === "rosette") rosette(x, top, z, 0.75);
  else bush(x, top, z, 0.8, AQUA);
 }
 // Enredaderas: suben por un pie derecho, siguen el alero y cruzan bajo la cumbrera; hojitas y flores.
 const vine = (points, tone) => {
  green.push(piece(tube(points, () => 0.02, { sides: 4, segments: points.length * 4 }), { color: LEAVES[3] }));
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const steps = Math.round(curve.getLength() / 0.2);
  for (let k = 1; k < steps; k++) {
   const p = curve.getPointAt(k / steps);
   leaf([p.x, p.y, p.z], random() * 6, 0.16 + random() * 0.08, 0.11, { rise: 0.1, droop: 0.9, tone: pick(LEAVES), seed: k });
   if (k % 3 === 0) bud([p.x + (random() - 0.5) * 0.08, p.y - 0.06, p.z + (random() - 0.5) * 0.08], tone, 0.036);
  }
 };
 vine([[-w + 0.08, base, -d + bay * 3], [-w + 0.1, 1.3, -d + bay * 3 + 0.05], [-w + 0.1, eave - 0.05, -d + bay * 3], [-w * 0.6, slope(w * 0.6) - 0.1, -d + bay * 3.5], [-0.2, ridge - 0.25, -d + bay * 4.2], [0.5, slope(0.5) - 0.2, -d + bay * 5]], VIOLET);
 vine([[w - 0.08, base, d - bay * 2], [w - 0.1, 1.2, d - bay * 2 - 0.05], [w - 0.1, eave - 0.06, d - bay * 2.2], [w - 0.12, eave - 0.1, d - bay * 4], [w * 0.55, slope(w * 0.55) - 0.12, d - bay * 4.6]], AQUA);
 vine([[-DOOR - 0.12, base, d - 0.06], [-DOOR - 0.14, 1.5, d - 0.08], [-DOOR + 0.05, ARCH + 0.42, d - 0.08], [0.2, ARCH + 0.66, d - 0.08], [DOOR + 0.15, ARCH + 0.3, d - 0.08]], VIOLET);
 // Cestas colgadas de la cumbrera, con sus guías.
 for (const [z, tone] of [[-0.9, AQUA], [1.2, VIOLET]]) {
  const y = 2.35;
  frame.push(piece(new THREE.SphereGeometry(0.2, 7, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { bottom: TIMBER.dark, top: TIMBER.light, vary: 0.1, position: [0, y, z] }));
  for (const a of [0, 2.1, 4.2]) frame.push(bar([Math.cos(a) * 0.18, y, z + Math.sin(a) * 0.18], [0, slope(0) - 0.12, z], 0.012));
  for (let k = 0; k < 5; k++) {
   const a = (k / 5) * Math.PI * 2 + z, drop = 0.35 + random() * 0.4, end = [Math.cos(a) * 0.32, y - drop, z + Math.sin(a) * 0.32];
   green.push(piece(tube([[Math.cos(a) * 0.1, y, z + Math.sin(a) * 0.1], [Math.cos(a) * 0.28, y - drop * 0.3, z + Math.sin(a) * 0.28], end], () => 0.012, { sides: 3, segments: 4 }), { color: LEAVES[1] }));
   leaf([Math.cos(a) * 0.25, y - drop * 0.25, z + Math.sin(a) * 0.25], a, 0.16, 0.1, { rise: 0, droop: 0.8, tone: pick(LEAVES), seed: k + 51 });
   bud(end, tone, 0.04);
  }
  rosette(0, y, z, 0.6);
 }
 // El farol que cuelga en el centro: sombrerete y jaula de hierro; el cristal, aparte.
 const lampAt = [0, 2.42, 0.25];
 frame.push(bar([0, slope(0) - 0.1, lampAt[2]], [0, lampAt[1] + 0.2, lampAt[2]], 0.014), piece(new THREE.ConeGeometry(0.14, 0.12, 5), { color: IRON, position: [lampAt[0], lampAt[1] + 0.16, lampAt[2]] }), piece(new THREE.CylinderGeometry(0.09, 0.07, 0.04, 5), { color: IRON, position: [lampAt[0], lampAt[1] - 0.13, lampAt[2]] }));
 lamp.push(piece(new THREE.CylinderGeometry(0.085, 0.07, 0.2, 5), { position: lampAt }));

 const glass = mergeGeometries(panes);
 panes.forEach((one) => one.dispose());
 glass.computeVertexNormals();
 return { frame: merge(frame), glass, green: merge(green), glow: merge(glow), lamp: merge(lamp), lampAt };
}
