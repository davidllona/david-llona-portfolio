import * as THREE from "three";
import { blade, merge, piece, randomFrom, tube } from "../living/kit/geometry";
import { BONE, INK, IRON, WOOD } from "./models";

// Lo que hay en cada parada de The Twisted Moon (objetivo 23, bloque D2): un
// detalle propio que cuenta de qué va, hecho a mano con el kit low-poly. Cada
// modelo va en sus ejes: apoyado en y = 0, mirando hacia +Z. Lo que brilla
// (pantalla, farolillo) va aparte.
const TIMBER = { dark: "#2a2130", mid: "#4a3a4e", light: "#6b566a" };
const PAPER = "#efe7d4";
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// ── Casa del alquimista: el tablón de notas y la mesa de bocetos ────────────
// El tablón: dos postes y un tablero de corcho con su marco. Las notas van
// aparte (una malla con instancias): empiezan revueltas y, al usar la parada,
// vuelan y se ordenan en columnas (`messy` → `tidy`).
export const BOARD = { width: 2.1, height: 1.35, lift: 1.05 }; // m; `lift`: del suelo al borde de abajo
export const NOTE = 0.24; // lado de una nota
export function createBoard() {
 const { width: w, height: h, lift } = BOARD;
 return merge([
  piece(box(0.12, lift + h + 0.3, 0.12), { bottom: TIMBER.dark, top: TIMBER.mid, position: [-w / 2 + 0.1, (lift + h + 0.3) / 2, -0.06], rotation: [0, 0, 0.03] }),
  piece(box(0.12, lift + h + 0.2, 0.12), { bottom: TIMBER.dark, top: TIMBER.mid, position: [w / 2 - 0.1, (lift + h + 0.2) / 2, -0.06], rotation: [0, 0, -0.04] }),
  piece(box(w, h, 0.07), { bottom: "#6a5340", top: "#8a6f52", vary: 0.06, position: [0, lift + h / 2, 0], rotation: [0, 0, 0.012] }),
  piece(box(w + 0.14, 0.09, 0.11), { color: TIMBER.dark, position: [0, lift + h + 0.02, 0], rotation: [0, 0, 0.012] }),
  piece(box(w + 0.14, 0.09, 0.11), { color: TIMBER.dark, position: [0, lift - 0.02, 0], rotation: [0, 0, 0.012] }),
  piece(box(0.09, h + 0.1, 0.11), { color: TIMBER.dark, position: [-w / 2 - 0.02, lift + h / 2, 0] }),
  piece(box(0.09, h + 0.1, 0.11), { color: TIMBER.dark, position: [w / 2 + 0.02, lift + h / 2, 0] }),
 ]);
}
const NOTE_TINTS = ["#f4e3a1", "#f1b7c8", "#a9dcd2", "#c9b6ee", "#f6d39a", "#efe7d4"];
// Las notas: dónde está cada una revuelta y dónde ordenada (x, y sobre el tablero, giro), y su color.
export function noteLayout() {
 const random = randomFrom(0.612);
 const { width: w, height: h, lift } = BOARD;
 const COLUMNS = 3, ROWS = 4;
 return Array.from({ length: COLUMNS * ROWS }, (_, i) => {
  const column = i % COLUMNS, row = Math.floor(i / COLUMNS);
  return {
   messy: [(random() - 0.5) * (w - 0.5), lift + 0.2 + random() * (h - 0.4), (random() - 0.5) * 1.5],
   // (Tres columnas: cada una, de un color.)
   tidy: [(column - 1) * 0.62, lift + h - 0.24 - row * 0.3, 0],
   tint: NOTE_TINTS[i % NOTE_TINTS.length],
   tidyTint: NOTE_TINTS[column],
  };
 });
}
export const createNote = () => piece(new THREE.PlaneGeometry(NOTE, NOTE), { color: "#ffffff" });
// La mesa: tablero, patas y, encima, tres bocetos de web (una cabecera, bloques y renglones), un lápiz y un tintero.
export function createSketchTable() {
 const parts = [piece(box(1.7, 0.09, 0.95), { bottom: TIMBER.mid, top: TIMBER.light, jitter: 0.012, position: [0, 0.82, 0], rotation: [0, 0, 0.015] })];
 for (const [x, z] of [[-0.74, -0.38], [0.74, -0.38], [-0.74, 0.38], [0.74, 0.38]]) parts.push(piece(box(0.09, 0.8, 0.09), { color: TIMBER.dark, position: [x, 0.4, z], rotation: [0, 0, x * 0.04] }));
 // Un boceto: papel y, a tinta, la retícula de una página.
 const sketch = (x, z, turn, kind) => {
  const at = (dx, dz, sx, sz, tone = INK) => {
   const line = piece(box(sx, 0.006, sz), { color: tone, position: [dx, 0.004, dz] });
   line.applyMatrix4(new THREE.Matrix4().makeRotationY(turn)).translate(x, 0.875, z);
   return line;
  };
  const sheet = piece(box(0.46, 0.008, 0.6), { color: PAPER });
  sheet.applyMatrix4(new THREE.Matrix4().makeRotationY(turn)).translate(x, 0.87, z);
  parts.push(sheet, at(0, -0.23, 0.38, 0.05)); // cabecera
  if (kind === 0) parts.push(at(-0.1, -0.08, 0.18, 0.16, "#7a6f8f"), at(0.11, -0.12, 0.16, 0.02), at(0.11, -0.07, 0.16, 0.02), at(0.11, -0.02, 0.12, 0.02), at(0, 0.12, 0.38, 0.02), at(0, 0.18, 0.3, 0.02));
  else if (kind === 1) for (let k = 0; k < 3; k++) parts.push(at(-0.13 + k * 0.13, -0.05, 0.1, 0.14, "#7a6f8f"), at(-0.13 + k * 0.13, 0.08, 0.1, 0.02));
  else parts.push(at(0, -0.1, 0.38, 0.14, "#7a6f8f"), at(-0.1, 0.06, 0.16, 0.02), at(-0.1, 0.11, 0.16, 0.02), at(0.12, 0.09, 0.12, 0.1, "#b98a3a"));
 };
 sketch(-0.5, 0.02, 0.14, 0);
 sketch(0.04, -0.06, -0.08, 1);
 sketch(0.55, 0.06, 0.22, 2);
 parts.push(
  piece(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 5).rotateZ(Math.PI / 2), { color: "#d9a441", position: [0.1, 0.89, 0.36], rotation: [0, 0.5, 0] }),
  piece(new THREE.CylinderGeometry(0.05, 0.06, 0.09, 6), { color: INK, position: [-0.7, 0.91, -0.33] }),
 );
 return merge(parts);
}

// ── Casa del árbol: la estantería y la consola ──────────────────────────────
// La estantería lleva tres cosas que hablan de a qué juega, sin un solo nombre:
// un sombrero vaquero, una capucha blanca colgada de un clavo y una maceta con una hierba verde.
export function createShelf() {
 const parts = [];
 const W = 1.5, H = 1.9, D = 0.42;
 for (const x of [-W / 2, W / 2]) parts.push(piece(box(0.08, H, D), { bottom: TIMBER.dark, top: TIMBER.mid, position: [x, H / 2, 0], rotation: [0, 0, x * 0.02] }));
 for (const y of [0.12, 0.72, 1.3, H - 0.03]) parts.push(piece(box(W, 0.07, D), { bottom: TIMBER.mid, top: TIMBER.light, jitter: 0.008, position: [0, y, 0] }));
 parts.push(piece(box(W, H, 0.04), { color: TIMBER.dark, position: [0, H / 2, -D / 2 + 0.01] }));
 // Abajo: libros, de pie y tumbados (sin rótulos).
 [["#5a4f8f", 0.12, 0.44], ["#3f7f78", 0.1, 0.4], ["#8a5a6c", 0.14, 0.46], ["#6b6680", 0.09, 0.38], ["#b98a3a", 0.11, 0.42]].forEach(([tone, wide, tall], i) => parts.push(piece(box(wide, tall, 0.28), { color: tone, vary: 0.08, seed: 3 + i, position: [-0.56 + i * 0.15, 0.155 + tall / 2, 0.02], rotation: [0, 0, i === 4 ? -0.16 : 0] })));
 parts.push(piece(box(0.34, 0.07, 0.26), { color: "#7c5aa8", position: [0.42, 0.19, 0.02] }), piece(box(0.3, 0.06, 0.24), { color: "#3f7f78", position: [0.44, 0.255, 0.02], rotation: [0, 0.2, 0] }));
 // En medio: la maceta con su hierba verde.
 {
  const x = -0.38, y = 0.755;
  parts.push(piece(new THREE.CylinderGeometry(0.15, 0.11, 0.2, 7), { bottom: "#7a4a32", top: "#a8623e", position: [x, y + 0.1, 0.04] }), piece(new THREE.CylinderGeometry(0.165, 0.165, 0.04, 7), { color: "#8a5236", position: [x, y + 0.2, 0.04] }));
  for (let k = 0; k < 7; k++) {
   const a = (k / 7) * Math.PI * 2, tall = 0.26 + (k % 3) * 0.07, lean = 0.1 + (k % 2) * 0.07;
   parts.push(piece(blade([[x, y + 0.2, 0.04], [x + Math.cos(a) * lean * 0.6, y + 0.2 + tall * 0.6, 0.04 + Math.sin(a) * lean * 0.6], [x + Math.cos(a) * lean, y + 0.2 + tall, 0.04 + Math.sin(a) * lean]], 0.085, { facing: a + Math.PI / 2, tipWidth: 0.02 }), { bottom: "#2f7a3a", top: "#63c24f", vary: 0.1, seed: 9 + k }));
  }
 }
 // Arriba: el sombrero vaquero (copa hundida por el centro y ala ancha, vuelta por los lados).
 {
  const x = 0.2, y = 1.335;
  const brim = new THREE.CylinderGeometry(0.34, 0.36, 0.035, 12);
  const points = brim.attributes.position;
  for (let i = 0; i < points.count; i++) points.setY(i, points.getY(i) + Math.abs(points.getX(i)) ** 2 * 0.9);
  const crown = new THREE.CylinderGeometry(0.15, 0.19, 0.2, 10, 2);
  const top = crown.attributes.position;
  for (let i = 0; i < top.count; i++) if (top.getY(i) > 0.09 && Math.abs(top.getX(i)) < 0.08) top.setY(i, top.getY(i) - 0.05);
  parts.push(piece(brim, { bottom: "#6b4a2c", top: "#8f6a3f", position: [x, y + 0.02, 0.02], scale: [1, 1, 0.82] }), piece(crown, { bottom: "#7a5632", top: "#9a7446", position: [x, y + 0.13, 0.02], scale: [1, 1, 0.86] }), piece(new THREE.CylinderGeometry(0.194, 0.196, 0.04, 10), { color: "#2a1e1a", position: [x, y + 0.06, 0.02], scale: [1, 1, 0.86] }));
 }
 // Colgada de un clavo, al costado: la capucha blanca, con su pico.
 {
  const x = W / 2 + 0.24, y = 1.5;
  parts.push(piece(box(0.2, 0.03, 0.03), { color: IRON, position: [W / 2 + 0.08, y + 0.22, 0.1] }));
  const hood = new THREE.SphereGeometry(0.2, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.62);
  parts.push(
   piece(hood, { bottom: "#cfcad6", top: "#f7f4f0", position: [x, y, 0.1], scale: [1, 1.15, 1.05] }),
   // El pico de la capucha, hacia delante, y el hueco oscuro de la cara.
   piece(new THREE.ConeGeometry(0.1, 0.2, 4), { color: "#f1eee9", position: [x, y + 0.1, 0.27], rotation: [1.25, 0, 0] }),
   piece(new THREE.CircleGeometry(0.11, 7), { color: "#2a2633", position: [x, y - 0.04, 0.215], rotation: [-0.1, 0, 0] }),
   // La caída de la tela, hasta la punta.
   piece(new THREE.ConeGeometry(0.2, 0.78, 6, 2, true), { bottom: "#bdb7c6", top: "#ebe7e2", position: [x, y - 0.42, 0.08], rotation: [Math.PI, 0.3, 0.04] }),
  );
 }
 return merge(parts);
}
// La consola: una caja baja con su mando, sobre un cajón, y un televisor de tubo. La pantalla va aparte: está encendida.
export function createConsole() {
 const solid = merge([
  piece(box(1.0, 0.5, 0.7), { bottom: TIMBER.dark, top: TIMBER.mid, jitter: 0.01, position: [0, 0.25, 0], rotation: [0, 0.06, 0] }),
  piece(box(0.82, 0.62, 0.56), { bottom: "#2b2a3a", top: "#474560", position: [-0.04, 0.82, -0.04], rotation: [0, 0.06, 0] }),
  piece(box(0.07, 0.3, 0.02), { color: IRON, position: [0.2, 1.28, -0.08], rotation: [0, 0, -0.45] }),
  piece(box(0.07, 0.3, 0.02), { color: IRON, position: [-0.22, 1.28, -0.08], rotation: [0, 0, 0.4] }),
  // La consola y su mando, en el suelo, delante.
  piece(box(0.46, 0.09, 0.32), { bottom: "#2b2a3a", top: "#55526e", position: [0.86, 0.045, 0.3], rotation: [0, -0.3, 0] }),
  piece(box(0.1, 0.02, 0.1), { color: "#b9f24a", position: [0.95, 0.1, 0.3], rotation: [0, -0.3, 0] }),
  piece(box(0.26, 0.05, 0.13), { color: "#3d3b52", position: [0.42, 0.03, 0.72], rotation: [0, 0.5, 0] }),
  piece(new THREE.SphereGeometry(0.022, 5, 4), { color: "#e0568f", position: [0.48, 0.065, 0.7] }),
  piece(new THREE.SphereGeometry(0.022, 5, 4), { color: "#3fe0ff", position: [0.36, 0.065, 0.74] }),
  piece(tube([[0.7, 0.04, 0.34], [0.6, 0.02, 0.5], [0.5, 0.03, 0.66]], () => 0.012, { sides: 4, segments: 6 }), { color: INK }),
 ]);
 const screen = piece(new THREE.PlaneGeometry(0.62, 0.44), { position: [-0.04, 0.84, 0.245], rotation: [0, 0.06, 0] });
 return { solid, screen, glow: [-0.04, 0.84, 0.5] };
}

// ── Casita de cuento: la cama de Woody, el hueco y su retrato ───────────────
// La cama, perfecta y sin estrenar: un rosco mullido con su cojín y un hueso de juguete.
export function createDogBed() {
 return merge([
  piece(new THREE.TorusGeometry(0.52, 0.17, 6, 12).rotateX(Math.PI / 2), { bottom: "#7a2f3c", top: "#c2475a", vary: 0.05, position: [0, 0.17, 0], scale: [1, 1, 0.82] }),
  piece(new THREE.SphereGeometry(0.46, 10, 5), { bottom: "#d9c9a8", top: "#f4ead2", position: [0, 0.13, 0], scale: [1, 0.26, 0.8] }),
  piece(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 5).rotateZ(Math.PI / 2), { color: BONE, position: [0.08, 0.27, 0.06], rotation: [0, 0.5, 0] }),
  piece(new THREE.SphereGeometry(0.045, 5, 4), { color: BONE, position: [0.17, 0.27, 0.01] }),
  piece(new THREE.SphereGeometry(0.045, 5, 4), { color: BONE, position: [-0.02, 0.27, 0.11] }),
 ]);
}
// El hueco: una hondonada de tierra pisada, con su borde de terrones (donde duerme de verdad).
export function createHollow() {
 const parts = [piece(new THREE.CircleGeometry(0.78, 12).rotateX(-Math.PI / 2), { color: "#1c1622", position: [0, 0.03, 0], scale: [1, 1, 0.8] }), piece(new THREE.RingGeometry(0.7, 0.98, 12).rotateX(-Math.PI / 2), { color: "#3a2c33", position: [0, 0.035, 0], scale: [1, 1, 0.8] })];
 const random = randomFrom(0.27);
 for (let k = 0; k < 9; k++) {
  const a = (k / 9) * Math.PI * 2 + random() * 0.4, r = 0.86 + random() * 0.12;
  parts.push(piece(new THREE.DodecahedronGeometry(0.07 + random() * 0.06, 0), { color: "#4a3a40", vary: 0.12, seed: 5 + k, position: [Math.cos(a) * r, 0.04, Math.sin(a) * r * 0.8], scale: [1, 0.6, 1] }));
 }
 return merge(parts);
}
// El retrato: un caballete con su marco. La foto va aparte (una textura).
export const PHOTO = { width: 0.56, height: 0.7, at: [0, 1.05, 0.05], tilt: -0.16 };
export function createPortraitStand() {
 const { width: w, height: h, at, tilt } = PHOTO;
 const frame = (geometry, options, dx, dy, dz = 0) => {
  const made = piece(geometry, { ...options, position: [dx, dy, dz] });
  made.applyMatrix4(new THREE.Matrix4().makeRotationX(tilt)).translate(...at);
  return made;
 };
 return merge([
  piece(box(0.06, 1.5, 0.06), { color: TIMBER.mid, position: [-0.26, 0.74, 0.02], rotation: [-0.16, 0, 0.1] }),
  piece(box(0.06, 1.5, 0.06), { color: TIMBER.mid, position: [0.26, 0.74, 0.02], rotation: [-0.16, 0, -0.1] }),
  piece(box(0.06, 1.45, 0.06), { color: TIMBER.dark, position: [0, 0.7, -0.3], rotation: [0.28, 0, 0] }),
  piece(box(0.7, 0.05, 0.12), { color: TIMBER.dark, position: [0, 0.66, 0.12] }),
  frame(box(w + 0.16, h + 0.16, 0.04), { color: "#b98a3a" }, 0, 0, -0.03),
  frame(box(w + 0.04, h + 0.04, 0.02), { color: "#2a2130" }, 0, 0, -0.008),
 ]);
}
// Sin foto: una silueta de perro (cabeza y orejas) sobre papel claro.
export function drawSilhouette(ctx, w, h) {
 ctx.fillStyle = "#e9dfc8";
 ctx.fillRect(0, 0, w, h);
 ctx.fillStyle = "#3a3340";
 ctx.beginPath();
 ctx.ellipse(w * 0.5, h * 0.52, w * 0.24, h * 0.22, 0, 0, Math.PI * 2);
 ctx.fill();
 ctx.beginPath();
 ctx.ellipse(w * 0.5, h * 0.66, w * 0.13, h * 0.12, 0, 0, Math.PI * 2);
 ctx.fill();
 for (const side of [-1, 1]) {
  ctx.beginPath();
  ctx.moveTo(w * (0.5 + side * 0.13), h * 0.36);
  ctx.lineTo(w * (0.5 + side * 0.33), h * 0.3);
  ctx.lineTo(w * (0.5 + side * 0.3), h * 0.56);
  ctx.closePath();
  ctx.fill();
 }
 ctx.beginPath();
 ctx.ellipse(w * 0.5, h * 0.95, w * 0.3, h * 0.2, 0, 0, Math.PI * 2);
 ctx.fill();
}

// ── Invernadero: el rincón del explorador (objetivo 28) ─────────────────────
// En el porche pegado al invernadero: una mesa de trabajo con el mapa
// desplegado —chinchetas en los destinos e hilo rojo de una a otra—, una
// brújula de latón, un globo terráqueo pequeño, libros y una lupa; al lado, la
// maleta abierta sobre un baúl, con sus pegatinas de viaje; y el farolillo de
// papel, apagado hasta que el visitante lo enciende.
const BRASS = { dark: "#8a6427", mid: "#c1933f", light: "#e3bd62" };
const RED_THREAD = "#d23a4c";

// La mesa: tablero sobre dos caballetes. A lo largo de X (1,8 m); se mira desde +Z.
export const EXPLORER_TABLE = { long: 1.8, deep: 0.9, top: 0.8 };
export function createMapTable() {
 const { long, deep, top } = EXPLORER_TABLE;
 const parts = [
  piece(box(long, 0.06, deep), { bottom: TIMBER.mid, top: TIMBER.light, vary: 0.08, jitter: 0.008, position: [0, top - 0.03, 0] }),
  piece(box(long - 0.5, 0.07, 0.07), { color: TIMBER.dark, position: [0, 0.3, 0] }),
 ];
 // (Tres tablas: dos juntas a la vista.)
 for (const z of [-deep / 6, deep / 6]) parts.push(piece(box(long, 0.004, 0.012), { color: TIMBER.dark, position: [0, top + 0.001, z] }));
 const strut = (from, to, thick = 0.07) => {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), made = piece(box(thick, a.distanceTo(b), thick), { bottom: TIMBER.dark, top: TIMBER.mid });
  made.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  made.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return made;
 };
 for (const x of [-long / 2 + 0.22, long / 2 - 0.22]) parts.push(strut([x, 0, -deep / 2 + 0.06], [x, top - 0.06, -0.1]), strut([x, 0, deep / 2 - 0.06], [x, top - 0.06, 0.1]), strut([x, 0.3, -0.3], [x, 0.3, 0.3], 0.05));
 const y = top + 0.004;
 // El mapa: papel con sus dobleces, tierras (sin fronteras ni nombres), una rosa de los vientos y los cantos algo levantados.
 const map = (geometry, options, x, z, lift = 0) => {
  const made = piece(geometry, { ...options, position: [x, lift, z] });
  made.rotateY(0.07).translate(-0.2, y, 0.02);
  return made;
 };
 parts.push(map(box(1.18, 0.012, 0.76), { color: PAPER, vary: 0.03 }, 0, 0));
 for (const x of [-0.295, 0, 0.295]) parts.push(map(box(0.01, 0.004, 0.76), { color: "#c9bc9a" }, x, 0, 0.008));
 parts.push(map(box(1.18, 0.004, 0.01), { color: "#c9bc9a" }, 0, 0, 0.008));
 parts.push(map(box(0.2, 0.012, 0.16), { color: "#f6efdf", rotation: [0.25, 0, 0.3] }, 0.52, -0.33, 0.02));
 for (const [x, z, r, squash, sides, tone] of [[-0.4, -0.12, 0.17, 0.7, 7, "#8fae7c"], [-0.3, 0.19, 0.11, 1.1, 6, "#a3b888"], [0.0, -0.1, 0.15, 0.8, 8, "#8fae7c"], [0.1, 0.2, 0.1, 0.9, 6, "#b7b07c"], [0.36, -0.15, 0.16, 0.75, 7, "#8fae7c"], [0.44, 0.2, 0.08, 1.2, 5, "#a3b888"]]) {
  parts.push(map(new THREE.CylinderGeometry(r, r, 0.005, sides), { color: tone, vary: 0.1, seed: Math.round(x * 50 + 60), scale: [1, 1, squash] }, x, z, 0.01));
 }
 for (const turn of [0, Math.PI / 4]) parts.push(map(box(0.16, 0.004, 0.022), { color: "#7a5a46", rotation: [0, turn, 0] }, -0.48, 0.27, 0.011), map(box(0.022, 0.004, 0.16), { color: "#7a5a46", rotation: [0, turn, 0] }, -0.48, 0.27, 0.011));
 // Chinchetas en los destinos (la del este, la mayor) e hilo rojo de una a otra, tenso y algo levantado del papel.
 const pins = [[-0.42, -0.1, 0.024, "#3fb6c8"], [-0.28, 0.2, 0.022, "#e3bd62"], [0.0, -0.08, 0.024, "#9b6cff"], [0.12, 0.2, 0.022, "#3fb6c8"], [0.4, -0.16, 0.038, "#e0445a"]];
 for (const [x, z, r, tone] of pins) parts.push(map(new THREE.SphereGeometry(r, 6, 5), { color: tone }, x, z, 0.062), map(new THREE.CylinderGeometry(0.005, 0.005, 0.06, 4), { color: IRON }, x, z, 0.035));
 for (let i = 0; i < pins.length - 1; i++) {
  const [ax, az] = pins[i], [bx, bz] = pins[i + 1];
  parts.push(map(tube([[ax, 0.052, az], [(ax + bx) / 2, 0.046, (az + bz) / 2], [bx, 0.052, bz]], () => 0.007, { sides: 3, segments: 3 }), { color: RED_THREAD }, 0, 0));
 }
 // La brújula: caja de latón con la tapa levantada, esfera clara y aguja roja y negra.
 {
  const x = 0.56, z = 0.26;
  parts.push(
   piece(new THREE.CylinderGeometry(0.095, 0.095, 0.04, 10), { bottom: BRASS.dark, top: BRASS.light, position: [x, y + 0.02, z] }),
   piece(new THREE.CylinderGeometry(0.078, 0.078, 0.006, 10), { color: "#f1ead6", position: [x, y + 0.043, z] }),
   piece(box(0.07, 0.006, 0.02), { color: "#d23a4c", position: [x + 0.03, y + 0.05, z - 0.012], rotation: [0, 0.4, 0] }),
   piece(box(0.07, 0.006, 0.02), { color: INK, position: [x - 0.03, y + 0.05, z + 0.012], rotation: [0, 0.4, 0] }),
   piece(new THREE.CylinderGeometry(0.095, 0.095, 0.012, 10), { bottom: BRASS.dark, top: BRASS.mid, position: [x, y + 0.1, z - 0.12], rotation: [1.15, 0, 0] }),
  );
 }
 // El globo terráqueo: peana, arco de latón y la bola, inclinada, con sus tierras.
 {
  const x = 0.66, z = -0.2, r = 0.155, cy = y + 0.27;
  parts.push(
   piece(new THREE.CylinderGeometry(0.1, 0.12, 0.035, 8), { bottom: TIMBER.dark, top: TIMBER.mid, position: [x, y + 0.018, z] }),
   piece(new THREE.CylinderGeometry(0.016, 0.022, 0.1, 5), { color: BRASS.mid, position: [x, y + 0.08, z] }),
   piece(new THREE.TorusGeometry(r + 0.022, 0.011, 4, 12, Math.PI * 1.15), { bottom: BRASS.dark, top: BRASS.light, position: [x, cy, z], rotation: [0, 0.5, -2.05] }),
   piece(new THREE.IcosahedronGeometry(r, 1), { bottom: "#2a6a94", top: "#49a2c4", vary: 0.07, seed: 4, position: [x, cy, z] }),
  );
  for (const [lat, lon, size] of [[0.5, 0.4, 0.075], [0.1, 1.2, 0.06], [-0.4, 0.9, 0.05], [0.6, 2.6, 0.065], [-0.2, 3.4, 0.07], [0.2, 4.6, 0.08], [-0.6, 5.3, 0.045], [0.95, 5.6, 0.05]]) {
   const at = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)), land = piece(new THREE.IcosahedronGeometry(size, 0), { color: lat > 0.9 ? "#e9e6da" : "#8fbf7c", vary: 0.12, seed: Math.round(lon * 10), scale: [1, 0.3, 1] });
   land.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), at)).translate(x + at.x * r * 0.97, cy + at.y * r * 0.97, z + at.z * r * 0.97);
   parts.push(land);
  }
 }
 // Libros, un mapa enrollado, la lupa y un lápiz.
 parts.push(
  piece(box(0.3, 0.055, 0.22), { bottom: "#4a2f5e", top: "#6b4a86", position: [-0.68, y + 0.028, -0.3], rotation: [0, 0.2, 0] }),
  piece(box(0.26, 0.045, 0.19), { bottom: "#1f5b5a", top: "#2f8580", position: [-0.67, y + 0.078, -0.3], rotation: [0, -0.15, 0] }),
  piece(box(0.24, 0.012, 0.17), { color: PAPER, position: [-0.665, y + 0.078, -0.295], rotation: [0, -0.15, 0], scale: [1.02, 2.6, 1.02] }),
  piece(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 7).rotateZ(Math.PI / 2), { bottom: "#d8ceb2", top: PAPER, position: [0.05, y + 0.04, -0.39], rotation: [0, 0.06, 0] }),
  piece(new THREE.TorusGeometry(0.03, 0.008, 3, 6).rotateY(Math.PI / 2), { color: RED_THREAD, position: [-0.1, y + 0.04, -0.39] }),
  piece(new THREE.TorusGeometry(0.062, 0.012, 4, 10).rotateX(Math.PI / 2), { bottom: BRASS.dark, top: BRASS.light, position: [0.28, y + 0.03, 0.31] }),
  piece(box(0.16, 0.022, 0.028), { color: TIMBER.dark, position: [0.4, y + 0.02, 0.37], rotation: [0, -0.5, 0] }),
  piece(box(0.17, 0.012, 0.012), { color: "#e0b040", position: [-0.72, y + 0.008, 0.3], rotation: [0, 0.7, 0] }),
 );
 return merge(parts);
}

// La maleta, abierta sobre un baúl: cuero, cantoneras de latón, correas, la ropa asomando y un sombrero;
// pegatinas de viaje por el frente y por dentro de la tapa (formas y colores: ni nombres ni marcas).
export function createSuitcase() {
 const TRUNK = 0.42, parts = [
  piece(box(1.02, TRUNK, 0.64), { bottom: TIMBER.dark, top: TIMBER.mid, vary: 0.1, jitter: 0.01, position: [0, TRUNK / 2, 0] }),
  piece(box(1.06, 0.05, 0.68), { color: TIMBER.light, position: [0, TRUNK, 0] }),
 ];
 for (const x of [-0.36, 0, 0.36]) parts.push(piece(box(0.07, TRUNK, 0.66), { color: "#201a26", position: [x, TRUNK / 2, 0] }));
 const y = TRUNK + 0.025, wide = 0.92, deep = 0.58, tall = 0.24;
 parts.push(
  piece(box(wide, tall, deep), { bottom: "#6b4128", top: "#9a683c", vary: 0.06, jitter: 0.008, position: [0, y + tall / 2, 0] }),
  piece(box(wide - 0.07, 0.02, deep - 0.07), { color: "#3a2c2e", position: [0, y + tall + 0.002, 0] }),
  piece(new THREE.TorusGeometry(0.085, 0.018, 4, 8, Math.PI), { color: "#3a261a", position: [0, y + tall * 0.55, deep / 2 + 0.005] }),
 );
 for (const x of [-0.27, 0.27]) parts.push(piece(box(0.065, tall + 0.012, deep + 0.012), { color: "#3a261a", position: [x, y + tall / 2, 0] }), piece(box(0.05, 0.05, 0.02), { color: BRASS.light, position: [x, y + tall * 0.62, deep / 2 + 0.012] }));
 for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(piece(box(0.075, 0.075, 0.075), { bottom: BRASS.dark, top: BRASS.light, position: [sx * (wide / 2 - 0.03), y + 0.04, sz * (deep / 2 - 0.03)] }));
 // La tapa, abierta hacia atrás (105°), con su forro. Lo que va en ella se coloca como si estuviera cerrada y gira con ella.
 const OPEN = -1.833, hinge = [0, y + tall, -deep / 2];
 const onLid = (geometry, options, u, v, under = 0) => {
  const made = piece(geometry, { ...options, position: [u, -under, v] });
  made.rotateX(OPEN).translate(...hinge);
  return made;
 };
 parts.push(onLid(box(wide, 0.1, deep), { bottom: "#6b4128", top: "#9a683c", vary: 0.06 }, 0, deep / 2, -0.05), onLid(box(wide - 0.08, 0.012, deep - 0.08), { color: "#c9b48c" }, 0, deep / 2, 0.006));
 for (const x of [-0.27, 0.27]) parts.push(onLid(box(0.065, 0.11, deep + 0.01), { color: "#3a261a" }, x, deep / 2, -0.05));
 // Pegatinas: dos capas (fondo y motivo). `kind`: redonda, rectangular o rombo.
 const sticker = (place, kind, size, back, motif, turn = 0) => {
  const shape = (s, thick) => (kind === "round" ? new THREE.CylinderGeometry(s, s, thick, 10) : new THREE.BoxGeometry(s * 2, thick, s * 1.4));
  const spin = kind === "diamond" ? Math.PI / 4 + turn : turn;
  return [place(shape(size, 0.006), { color: back, rotation: [0, spin, 0] }, 0), place(kind === "diamond" ? new THREE.BoxGeometry(size * 0.9, 0.006, size * 0.9) : shape(size * 0.55, 0.006), { color: motif, rotation: [0, spin, 0] }, 0.004)];
 };
 const lid = (u, v) => (geometry, options, lift) => onLid(geometry, options, u, v, 0.014 + lift);
 parts.push(
  ...sticker(lid(-0.28, 0.17), "round", 0.085, "#e0445a", "#f4ead2"),
  ...sticker(lid(-0.02, 0.36), "box", 0.1, "#2f9aa0", "#f4ead2", 0.2),
  ...sticker(lid(0.27, 0.2), "diamond", 0.09, "#e3b23c", "#3a2c2e"),
  ...sticker(lid(0.1, 0.13), "round", 0.055, "#8a5fd0", "#f4ead2"),
  ...sticker(lid(-0.26, 0.42), "box", 0.075, "#e8843a", "#3a2c2e", -0.25),
 );
 // Y por el frente de la maleta.
 const front = (u, v) => (geometry, options, lift) => {
  const made = piece(geometry, options);
  made.rotateX(Math.PI / 2).translate(u, y + v, deep / 2 + 0.006 + lift);
  return made;
 };
 parts.push(...sticker(front(-0.4, 0.13), "round", 0.06, "#2f9aa0", "#f4ead2"), ...sticker(front(0.4, 0.11), "box", 0.065, "#e0445a", "#f4ead2", 0.15), ...sticker(front(0.13, 0.07), "diamond", 0.05, "#8a5fd0", "#f4ead2"), ...sticker(front(-0.13, 0.16), "box", 0.05, "#e3b23c", "#3a2c2e", -0.2));
 // Dentro: ropa doblada, un mapa enrollado y el sombrero; una prenda cuelga del borde.
 const top = y + tall;
 parts.push(
  piece(box(0.36, 0.09, 0.28), { color: "#3f7f78", position: [-0.24, top + 0.03, 0.08], rotation: [0, 0.1, 0] }),
  piece(box(0.34, 0.08, 0.3), { color: "#e9dfc8", position: [-0.22, top + 0.1, 0.06], rotation: [0, -0.12, 0.03] }),
  piece(box(0.34, 0.1, 0.28), { color: "#7c5aa8", position: [0.24, top + 0.03, -0.08], rotation: [0, -0.2, 0] }),
  piece(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 6).rotateZ(Math.PI / 2), { bottom: "#d8ceb2", top: PAPER, position: [0.05, top + 0.05, -0.2], rotation: [0, 0.2, 0.12] }),
  piece(new THREE.CylinderGeometry(0.2, 0.21, 0.016, 10), { color: "#d9c9a0", position: [0.22, top + 0.1, 0.1], rotation: [0.08, 0, -0.06] }),
  piece(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 8), { bottom: "#c9b88e", top: "#e2d4ae", position: [0.22, top + 0.155, 0.1], rotation: [0.08, 0, -0.06] }),
  piece(new THREE.CylinderGeometry(0.122, 0.122, 0.025, 8), { color: "#a3413a", position: [0.22, top + 0.12, 0.1], rotation: [0.08, 0, -0.06] }),
  piece(box(0.2, 0.02, 0.24), { color: "#2f9aa0", position: [-0.3, top - 0.01, 0.34], rotation: [1.0, 0.1, 0] }),
 );
 return merge(parts);
}

// El porche: tarima de tablas, dos pies derechos con sus vigas hasta el alero del invernadero (una pérgola
// abierta: desde arriba no tapa la mesa), banderines, la alfombra, y unas cajas con mapas enrollados y una maceta.
// En los ejes del invernadero (`porch`: de dónde a dónde llega; `deck`: alto de la tarima; `eave`: alto del alero).
export function createExplorerPorch(porch, deck, eave) {
 const [x0, x1] = porch.x, [z0, z1] = porch.z, random = randomFrom(0.377);
 const parts = [];
 const beam = (from, to, thick, tones = [TIMBER.dark, TIMBER.mid]) => {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), made = piece(box(thick, a.distanceTo(b), thick), { bottom: tones[0], top: tones[1], vary: 0.08 });
  made.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  made.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return made;
 };
 // Tarima: tablas a lo ancho, cada una de su tono, sobre un marco.
 const BOARDS = 12, deep = (z1 - z0) / BOARDS;
 for (let i = 0; i < BOARDS; i++) parts.push(piece(box(x1 - x0 - 0.04, deck, deep - 0.025), { bottom: TIMBER.dark, top: i % 3 === 1 ? "#5a4860" : i % 3 ? TIMBER.mid : "#514056", vary: 0.1, jitter: 0.006, seed: i + 2, position: [(x0 + x1) / 2 + (random() - 0.5) * 0.03, deck / 2, z0 + deep * (i + 0.5)] }));
 parts.push(piece(box(0.1, deck + 0.02, z1 - z0 + 0.1), { color: TIMBER.dark, position: [x0 - 0.03, deck / 2, (z0 + z1) / 2] }), piece(box(x1 - x0 + 0.1, deck + 0.02, 0.1), { color: TIMBER.dark, position: [(x0 + x1) / 2, deck / 2, z1 + 0.03] }), piece(box(x1 - x0 + 0.1, deck + 0.02, 0.1), { color: TIMBER.dark, position: [(x0 + x1) / 2, deck / 2, z0 - 0.03] }));
 // Pérgola: dos pies derechos fuera, vigas hasta el alero y tres pares finos.
 const high = eave + 0.02, px = x0 + 0.08;
 for (const z of [z0 + 0.08, z1 - 0.08]) {
  parts.push(beam([px, 0, z], [px + (random() - 0.5) * 0.06, high, z], 0.13), beam([px - 0.2, high, z], [x1, high, z], 0.1), beam([px, high - 0.55, z], [px + 0.5, high, z], 0.06));
  parts.push(piece(new THREE.DodecahedronGeometry(0.2, 0), { bottom: "#3a3752", top: "#807a9c", jitter: 0.02, vary: 0.12, position: [px, deck + 0.02, z], scale: [1, 0.5, 1] }));
 }
 parts.push(beam([px, high + 0.09, z0 - 0.15], [px, high + 0.09, z1 + 0.15], 0.1));
 for (const z of [z0 + 0.95, (z0 + z1) / 2, z1 - 0.95]) parts.push(beam([px - 0.15, high + 0.16, z], [x1, high + 0.16, z], 0.055));
 // Banderines en la viga de delante.
 {
  const z = z1 - 0.08, FLAGS = 9, tones = ["#2f9aa0", "#f4ead2", "#e0445a", "#8a5fd0", "#e8843a"];
  const at = (t) => [px + 0.1 + (x1 - px - 0.2) * t, high - 0.1 - Math.sin(t * Math.PI) * 0.22, z + 0.07];
  parts.push(piece(tube(Array.from({ length: 7 }, (_, k) => at(k / 6)), () => 0.01, { sides: 3, segments: 12 }), { color: "#b9a27a" }));
  for (let k = 0; k < FLAGS; k++) {
   const [x, y, zz] = at((k + 0.5) / FLAGS), flag = new THREE.BufferGeometry();
   // (Por las dos caras.)
   flag.setAttribute("position", new THREE.Float32BufferAttribute([x - 0.075, y, zz, x + 0.075, y, zz, x, y - 0.16, zz + 0.02, x + 0.075, y, zz, x - 0.075, y, zz, x, y - 0.16, zz + 0.02], 3));
   parts.push(piece(flag, { color: tones[k % tones.length] }));
  }
 }
 // Alfombra bajo la mesa: fondo granate, cenefa clara y dos franjas.
 {
  const cx = -3.1, cz = 1.15, y = deck + 0.006;
  parts.push(piece(box(2.5, 0.012, 1.7), { color: "#54283e", vary: 0.05, position: [cx, y, cz] }), piece(box(2.3, 0.004, 1.5), { color: "#d9c79c", position: [cx, y + 0.007, cz] }), piece(box(2.16, 0.004, 1.36), { color: "#643048", vary: 0.06, position: [cx, y + 0.01, cz] }));
  for (const dz of [-0.45, 0.45]) parts.push(piece(box(2.16, 0.004, 0.07), { color: "#2f9aa0", position: [cx, y + 0.013, cz + dz] }));
 }
 // Junto al cristal: dos cajas, mapas enrollados asomando y una maceta con su helecho.
 {
  const cx = -2.35, cz = -0.2, y = deck;
  parts.push(
   piece(box(0.66, 0.5, 0.6), { bottom: TIMBER.dark, top: TIMBER.mid, vary: 0.12, jitter: 0.01, position: [cx, y + 0.25, cz], rotation: [0, 0.12, 0] }),
   piece(box(0.7, 0.05, 0.08), { color: TIMBER.light, position: [cx, y + 0.42, cz + 0.3], rotation: [0, 0.12, 0] }),
   piece(box(0.46, 0.36, 0.42), { bottom: "#3a2c3c", top: "#5e4a62", vary: 0.12, jitter: 0.01, position: [cx + 0.05, y + 0.68, cz - 0.03], rotation: [0, -0.3, 0] }),
  );
  for (const [dx, dz, lean, tall] of [[-0.06, 0.04, 0.22, 0.62], [0.1, -0.06, -0.18, 0.7], [0.14, 0.1, 0.1, 0.55]]) parts.push(piece(new THREE.CylinderGeometry(0.04, 0.04, tall, 6), { bottom: "#cfc4a6", top: PAPER, position: [cx + 0.05 + dx, y + 0.86 + tall / 2 - 0.2, cz - 0.03 + dz], rotation: [lean, 0, lean * 0.7] }));
  const px2 = cx + 0.1, pz2 = cz + 0.95;
  parts.push(piece(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 7), { bottom: "#5c3836", top: "#8f5a4c", vary: 0.1, position: [px2, y + 0.15, pz2] }));
  for (let k = 0; k < 7; k++) {
   const a = (k / 7) * Math.PI * 2 + 0.3, reach = 0.42 + (k % 3) * 0.08;
   parts.push(piece(tube([[px2, y + 0.3, pz2], [px2 + Math.cos(a) * reach * 0.5, y + 0.62, pz2 + Math.sin(a) * reach * 0.5], [px2 + Math.cos(a) * reach, y + 0.45, pz2 + Math.sin(a) * reach]], (t) => 0.05 * (1 - t) + 0.006, { sides: 3, segments: 5 }), { bottom: "#2a5f5c", top: k % 3 ? "#3f8f78" : "#58a88c", scale: [1, 1, 1] }));
  }
 }
 return merge(parts);
}
// El farolillo de papel: un poste con su gancho y, colgando, el farol (aparte: se enciende).
export const PAPER_LANTERN = [0.42, 1.52, 0];
export function createPaperLantern() {
 const [lx, ly] = PAPER_LANTERN;
 const post = merge([
  piece(tube([[0, 0, 0], [-0.03, 0.9, 0], [0.03, 1.7, 0], [0.2, 2.02, 0], [0.42, 1.98, 0]], (t) => 0.045 - t * 0.02, { sides: 5, segments: 10 }), { bottom: WOOD.dark, top: WOOD.mid }),
  piece(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 4), { color: IRON, position: [lx, ly + 0.34, 0] }),
  piece(new THREE.CylinderGeometry(0.07, 0.09, 0.05, 8), { color: INK, position: [lx, ly + 0.24, 0] }),
  piece(new THREE.CylinderGeometry(0.09, 0.07, 0.05, 8), { color: INK, position: [lx, ly - 0.24, 0] }),
  piece(tube([[lx, ly - 0.26, 0], [lx + 0.01, ly - 0.36, 0], [lx - 0.01, ly - 0.46, 0]], () => 0.008, { sides: 3, segments: 4 }), { color: "#c2475a" }),
 ]);
 // El papel: una esfera achatada, a gajos (las varillas se marcan en el tono).
 const paper = new THREE.SphereGeometry(0.24, 12, 6);
 const shade = piece(paper, { bottom: "#b9b2a2", top: "#ffffff", vary: 0.12, position: [lx, ly, 0], scale: [1, 0.92, 1] });
 return { post, shade };
}

// ── Observatorio: lo que se ve por el telescopio ────────────────────────────
// Estrellas de fondo, repartidas en un disco de radio 1 (x, y, tamaño).
export function scopeStars(count = 46) {
 const random = randomFrom(0.905);
 return Array.from({ length: count }, () => {
  const a = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.98;
  return [Math.cos(a) * r, Math.sin(a) * r, 0.006 + random() * 0.012];
 });
}
