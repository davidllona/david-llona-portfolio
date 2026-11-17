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

// ── Invernadero: el mapa, la maleta y el farolillo de papel ─────────────────
// El mapa, desplegado sobre un cajón: papel con sus dobleces, manchas de tierra
// (sin fronteras ni nombres), chinchetas y un hilo que las une.
export function createMapTable() {
 const parts = [piece(box(1.5, 0.5, 1.0), { bottom: TIMBER.dark, top: TIMBER.mid, jitter: 0.012, position: [0, 0.25, 0] }), piece(box(1.56, 0.05, 1.06), { color: TIMBER.light, position: [0, 0.52, 0] })];
 // Tendido algo ladeado: se lee desde la cámara.
 const lay = (geometry, options, dx, dz, dy = 0) => {
  const made = piece(geometry, { ...options, position: [dx, dy, dz] });
  made.applyMatrix4(new THREE.Matrix4().makeRotationX(0.16)).applyMatrix4(new THREE.Matrix4().makeRotationY(-0.1)).translate(0, 0.6, -0.02);
  return made;
 };
 parts.push(lay(box(1.36, 0.012, 0.9), { color: PAPER }, 0, 0));
 for (const x of [-0.34, 0, 0.34]) parts.push(lay(box(0.012, 0.004, 0.9), { color: "#cbbf9f" }, x, 0, 0.009));
 parts.push(lay(box(1.36, 0.004, 0.012), { color: "#cbbf9f" }, 0, 0, 0.009));
 // Tierra: manchas de varios lados.
 for (const [x, z, r, squash, sides] of [[-0.42, -0.14, 0.2, 0.7, 7], [-0.3, 0.2, 0.13, 1.1, 6], [0.02, -0.1, 0.17, 0.8, 8], [0.12, 0.2, 0.12, 0.9, 6], [0.4, -0.16, 0.2, 0.75, 7], [0.5, 0.2, 0.1, 1.2, 5]]) {
  parts.push(lay(new THREE.CylinderGeometry(r, r, 0.006, sides), { color: "#8fae7c", vary: 0.1, seed: Math.round(x * 50 + 60), scale: [1, 1, squash] }, x, z, 0.011));
 }
 // Chinchetas (la del este, más grande: la primera de la lista) y el hilo entre ellas.
 const pins = [[-0.4, -0.12, 0.022, "#3fb6c8"], [0.02, -0.08, 0.022, "#e3bd62"], [0.5, -0.2, 0.036, "#e0445a"]];
 for (const [x, z, r, tone] of pins) parts.push(lay(new THREE.SphereGeometry(r, 6, 5), { color: tone }, x, z, 0.05), lay(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 4), { color: IRON }, x, z, 0.03));
 parts.push(lay(tube([[-0.4, 0.045, -0.12], [-0.18, 0.06, -0.14], [0.02, 0.045, -0.08], [0.26, 0.065, -0.18], [0.5, 0.05, -0.2]], () => 0.005, { sides: 3, segments: 10 }), { color: "#c2475a" }, 0, 0));
 return merge(parts);
}
// La maleta, a medio hacer: abierta, con ropa doblada asomando y una prenda colgando del borde.
export function createSuitcase() {
 return merge([
  piece(box(1.0, 0.26, 0.66), { bottom: "#5a3a26", top: "#8a5c38", jitter: 0.01, position: [0, 0.13, 0] }),
  piece(box(1.0, 0.1, 0.66), { bottom: "#6b4630", top: "#8a5c38", position: [0, 0.62, -0.37], rotation: [1.25, 0, 0] }),
  piece(box(0.06, 0.27, 0.68), { color: "#3a261a", position: [-0.3, 0.13, 0] }),
  piece(box(0.06, 0.27, 0.68), { color: "#3a261a", position: [0.3, 0.13, 0] }),
  piece(new THREE.TorusGeometry(0.09, 0.02, 4, 8, Math.PI), { color: "#3a261a", position: [0, 0.14, 0.34], rotation: [0, 0, 0] }),
  // Ropa.
  piece(box(0.4, 0.09, 0.28), { color: "#3f7f78", position: [-0.22, 0.3, 0.1], rotation: [0, 0.1, 0] }),
  piece(box(0.38, 0.08, 0.3), { color: "#e9dfc8", position: [-0.2, 0.38, 0.08], rotation: [0, -0.12, 0.03] }),
  piece(box(0.36, 0.1, 0.3), { color: "#7c5aa8", position: [0.24, 0.3, -0.08], rotation: [0, -0.2, 0] }),
  piece(box(0.3, 0.02, 0.5), { color: "#c2475a", position: [0.3, 0.26, 0.36], rotation: [0.5, 0.1, 0] }),
  piece(box(0.3, 0.02, 0.26), { color: "#c2475a", position: [0.31, 0.12, 0.5], rotation: [1.5, 0.1, 0] }),
 ]);
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
