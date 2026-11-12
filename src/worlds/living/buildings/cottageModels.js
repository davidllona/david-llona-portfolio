import * as THREE from "three";
import { blob, limb, merge, piece } from "../kit/geometry";
import { CREAM, STONE, WOOD } from "../kit/palette";

// Casas de la aldea. Cada una se arma con las mismas piezas de oficio —zócalo
// de piedra, muro, entramado de madera, tejado de dos faldones con alero,
// chimenea, porche— pero con proporciones y añadidos distintos, para que
// ninguna sea «la misma caja» que otra. El frente mira a +z.
//
// Devuelve la geometría (todo lo que no brilla, unido) y dónde van las piezas
// que se montan aparte: ventanas, farol y boca de la chimenea.

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const PLINTH = 0.45;

// Dos tonos de un color: el de abajo, más oscuro.
const tones = (color) => {
 const base = new THREE.Color(color);
 return [`#${base.clone().multiplyScalar(0.7).getHexString()}`, `#${base.clone().lerp(new THREE.Color("#ffffff"), 0.12).getHexString()}`];
};

// Tejado a dos aguas sobre un cuerpo de `width` × `depth`, con la cumbrera a lo
// largo de x. Faldones con grosor y alero, hastiales rellenos, cumbrera y
// tres hiladas de teja. `y` es la altura del arranque.
function gableRoof({ width, depth, rise, y, color, wall, overhang = 0.34, side = 0.28 }) {
 const [dark, light] = tones(color);
 const pitch = Math.atan(rise / (depth / 2));
 const slope = Math.hypot(depth / 2, rise) + overhang;
 const pieces = [];
 for (const front of [1, -1]) {
  const run = (depth / 2 + overhang * Math.cos(pitch)) / 2;
  const centre = [0, y + rise - Math.tan(pitch) * run + 0.05, front * run];
  pieces.push(piece(box(width + side * 2, 0.13, slope), { bottom: dark, top: light, vary: 0.07, seed: front + 3, position: centre, rotation: [front * pitch, 0, 0] }));
  // Hiladas de teja: listones algo más oscuros que sobresalen.
  for (let row = 1; row <= 3; row++) {
   const along = (row / 4) * slope - slope / 2;
   pieces.push(piece(box(width + side * 2 + 0.04, 0.05, 0.1), { color: dark, position: [0, centre[1] + 0.085 - Math.sin(pitch) * along, centre[2] + front * Math.cos(pitch) * along], rotation: [front * pitch, 0, 0] }));
  }
 }
 // Hastiales: el triángulo de muro bajo el tejado, a cada lado.
 const shape = new THREE.Shape();
 shape.moveTo(-depth / 2, 0);
 shape.lineTo(depth / 2, 0);
 shape.lineTo(0, rise);
 shape.closePath();
 pieces.push(piece(new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false }).translate(0, 0, -width / 2).rotateY(Math.PI / 2), { bottom: wall[0], top: wall[1], vary: 0.04, position: [0, y, 0] }));
 // Cumbrera y vigas de alero que asoman.
 pieces.push(piece(box(width + side * 2 + 0.1, 0.12, 0.16), { color: WOOD.dark, position: [0, y + rise + 0.1, 0] }));
 for (const x of [-width / 2 - side + 0.06, width / 2 + side - 0.06]) {
  for (const front of [1, -1]) {
   pieces.push(piece(box(0.1, 0.1, slope), { color: WOOD.dark, position: [x, y + rise - Math.tan(pitch) * ((depth / 2 + overhang * Math.cos(pitch)) / 2) - 0.04, front * ((depth / 2 + overhang * Math.cos(pitch)) / 2)], rotation: [front * pitch, 0, 0] }));
  }
 }
 return pieces;
}

// Entramado visto en una fachada de `width` × `height`, a la profundidad `z`.
function timberFront({ width, height, z, y = PLINTH, braces = true }) {
 const beam = (w, h, position, rotation) => piece(box(w, h, 0.09), { color: WOOD.dark, vary: 0.08, position, rotation });
 const pieces = [
  beam(width + 0.1, 0.16, [0, y + 0.08, z]),
  beam(width + 0.1, 0.16, [0, y + height - 0.08, z]),
  beam(0.16, height, [-width / 2 + 0.04, y + height / 2, z]),
  beam(0.16, height, [width / 2 - 0.04, y + height / 2, z]),
 ];
 if (braces) {
  const reach = Math.min(0.95, height * 0.42);
  for (const side of [-1, 1]) pieces.push(beam(0.11, reach * 1.42, [side * (width / 2 - 0.12 - reach / 2), y + reach / 2 + 0.12, z], [0, 0, side * (Math.PI / 4)]));
 }
 return pieces;
}

// Puerta con marco, escalones y tejadillo de porche sobre dos postes.
function entrance({ x, z, porch = true }) {
 const pieces = [
  piece(box(0.98, 1.72, 0.1), { color: WOOD.dark, position: [x, PLINTH + 0.86, z] }),
  piece(box(0.76, 1.52, 0.08), { bottom: WOOD.mid, top: WOOD.light, vary: 0.1, position: [x, PLINTH + 0.78, z + 0.04] }),
  piece(new THREE.OctahedronGeometry(0.045, 0), { color: "#e6b85a", position: [x + 0.24, PLINTH + 0.74, z + 0.11] }),
  piece(box(1.3, 0.22, 0.5), { bottom: STONE.dark, top: STONE.light, vary: 0.06, position: [x, 0.33, z + 0.32] }),
  piece(box(1.55, 0.2, 0.5), { bottom: STONE.dark, top: STONE.mid, vary: 0.06, position: [x, 0.1, z + 0.72] }),
 ];
 if (porch) {
  for (const side of [-1, 1]) pieces.push(piece(limb(0.06, 0.055, 1.85, 5), { color: WOOD.dark, position: [x + side * 0.72, PLINTH, z + 0.78] }));
  pieces.push(piece(box(1.75, 0.09, 1.05), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.08, position: [x, PLINTH + 2.05, z + 0.42], rotation: [0.34, 0, 0] }));
 }
 return pieces;
}

// Marco de ventana con alféizar, contraventanas y, si se pide, jardinera.
function windowFrame({ x, y, z, w = 0.62, h = 0.7, box: flowerBox = false, seed = 1 }) {
 const pieces = [
  piece(box(w + 0.16, h + 0.16, 0.07), { color: WOOD.dark, position: [x, y, z] }),
  piece(box(w + 0.3, 0.08, 0.16), { color: WOOD.mid, position: [x, y - h / 2 - 0.1, z + 0.05] }),
  ...[-1, 1].map((side) => piece(box(0.2, h + 0.06, 0.05), { bottom: "#3f7f78", top: "#5fa79c", vary: 0.08, position: [x + side * (w / 2 + 0.19), y, z + 0.01] })),
 ];
 if (flowerBox) {
  pieces.push(piece(box(w + 0.2, 0.18, 0.22), { bottom: WOOD.dark, top: WOOD.mid, position: [x, y - h / 2 - 0.24, z + 0.14] }));
  [-0.22, 0, 0.22].forEach((dx, i) => {
   pieces.push(piece(blob(0), { bottom: "#3a8a47", top: "#86c95e", jitter: 0.15, seed: seed + i, position: [x + dx, y - h / 2 - 0.1, z + 0.15], scale: [0.14, 0.11, 0.1] }));
   pieces.push(piece(new THREE.OctahedronGeometry(0.045, 0), { color: ["#ff8fb5", "#ffd45a", "#ffffff"][(i + seed) % 3], position: [x + dx, y - h / 2 + 0.02, z + 0.17] }));
  });
 }
 return pieces;
}

function chimney({ x, y, z, height = 1.2 }) {
 return [
  piece(new THREE.CylinderGeometry(0.2, 0.27, height, 4), { bottom: STONE.dark, top: STONE.light, jitter: 0.02, vary: 0.1, position: [x, y + height / 2, z], rotation: [0, Math.PI / 4, 0] }),
  piece(box(0.46, 0.09, 0.46), { color: STONE.dark, position: [x, y + height + 0.03, z] }),
 ];
}

// Farol de fachada: brazo de hierro del que cuelga la caja de luz (que va aparte).
const bracket = (x, y, z) => [piece(box(0.05, 0.05, 0.34), { color: "#3b3836", position: [x, y + 0.22, z + 0.17] }), piece(box(0.2, 0.04, 0.2), { color: "#3b3836", position: [x, y + 0.17, z + 0.3] })];

const PLASTER = ["#e2d3b8", CREAM];
const PLANKS = [WOOD.mid, WOOD.light];

// Zócalo y cuerpo comunes.
function body({ width, depth, height, wall }) {
 return [
  piece(box(width + 0.36, PLINTH, depth + 0.36), { bottom: STONE.dark, top: STONE.light, jitter: 0.035, vary: 0.1 , position: [0, PLINTH / 2, 0] }),
  piece(box(width, height, depth), { bottom: wall[0], top: wall[1], vary: 0.045, position: [0, PLINTH + height / 2, 0] }),
 ];
}

// ── Las cuatro casas ────────────────────────────────────────────────────────
// Cada función devuelve { pieces, windows, lantern, smoke }.

// Taller: ancha y baja, con un cobertizo adosado y leña apilada.
function workshop(color) {
 const width = 3.5, depth = 2.6, height = 1.75, front = depth / 2 + 0.03;
 const pieces = [
  ...body({ width, depth, height, wall: PLASTER }),
  ...timberFront({ width, height, z: front }),
  ...gableRoof({ width, depth, rise: 1.25, y: PLINTH + height, color, wall: PLASTER }),
  ...entrance({ x: -0.75, z: front }),
  ...windowFrame({ x: 0.85, y: PLINTH + 1.05, z: front, box: true, seed: 1 }),
  ...chimney({ x: 1.05, y: PLINTH + height + 0.5, z: -0.45 }),
  ...bracket(-1.5, PLINTH + 1.35, front),
  // Cobertizo: un cuerpo más bajo a la derecha, con tejado a un agua.
  piece(box(1.45, 0.3, 2.0), { bottom: STONE.dark, top: STONE.mid, vary: 0.08, position: [width / 2 + 0.72, 0.15, 0.2] }),
  piece(box(1.3, 1.25, 1.8), { bottom: PLANKS[0], top: PLANKS[1], vary: 0.12, position: [width / 2 + 0.68, 0.92, 0.2] }),
  piece(box(1.7, 0.1, 2.3), { bottom: tones(color)[0], top: tones(color)[1], vary: 0.08, position: [width / 2 + 0.74, 1.72, 0.2], rotation: [0, 0, -0.26] }),
  piece(box(0.9, 1.0, 0.07), { color: WOOD.dark, position: [width / 2 + 0.68, 0.82, 1.12] }),
 ];
 // Leña apilada contra el cobertizo.
 for (let i = 0; i < 6; i++) pieces.push(piece(new THREE.CylinderGeometry(0.1, 0.1, 0.62, 6), { bottom: WOOD.mid, top: WOOD.pale, vary: 0.14, seed: i, position: [width / 2 + 1.62, 0.12 + Math.floor(i / 3) * 0.2, -0.35 + (i % 3) * 0.22 + (i > 2 ? 0.1 : 0)], rotation: [0, 0, Math.PI / 2] }));
 return { pieces, windows: [{ position: [0.85, PLINTH + 1.05, front + 0.02], size: [0.62, 0.7] }], lantern: [-1.5, PLINTH + 1.3, front + 0.3], smoke: [1.05, PLINTH + height + 1.8, -0.45] };
}

// Estudio: estrecha y alta, con el hastial al frente, ventana redonda arriba y balcón.
function studio(color) {
 const width = 2.6, depth = 2.9, height = 2.35, front = depth / 2 + 0.03;
 const roof = gableRoof({ width: depth, depth: width, rise: 1.75, y: PLINTH + height, color, wall: PLASTER, overhang: 0.3, side: 0.36 });
 roof.forEach((part) => part.rotateY(Math.PI / 2));
 const pieces = [
  ...body({ width, depth, height, wall: PLASTER }),
  ...timberFront({ width, height, z: front, braces: false }),
  piece(box(width + 0.1, 0.14, 0.09), { color: WOOD.dark, position: [0, PLINTH + 1.32, front] }),
  ...roof,
  ...entrance({ x: 0, z: front, porch: false }),
  // Balcón sobre la puerta.
  piece(box(1.7, 0.1, 0.62), { bottom: WOOD.dark, top: WOOD.mid, position: [0, PLINTH + 1.42, front + 0.3] }),
  ...[-0.8, -0.4, 0, 0.4, 0.8].map((x) => piece(box(0.05, 0.42, 0.05), { color: WOOD.dark, position: [x, PLINTH + 1.68, front + 0.58] })),
  piece(box(1.7, 0.06, 0.06), { color: WOOD.dark, position: [0, PLINTH + 1.9, front + 0.58] }),
  ...[-0.8, 0.8].map((x) => piece(box(0.07, 0.5, 0.5), { color: WOOD.dark, position: [x, PLINTH + 1.2, front + 0.28], rotation: [0.6, 0, 0] })),
  // Marco de la ventana redonda del hastial.
  piece(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 8), { color: WOOD.dark, position: [0, PLINTH + height + 0.72, front], rotation: [Math.PI / 2, 0, 0] }),
  ...windowFrame({ x: 0, y: PLINTH + 1.9, z: front, w: 0.6, h: 0.62 }),
  ...chimney({ x: -0.75, y: PLINTH + height + 0.7, z: -0.7, height: 1.5 }),
  ...bracket(0.95, PLINTH + 0.95, front),
 ];
 return {
  pieces,
  windows: [
   { position: [0, PLINTH + 1.9, front + 0.02], size: [0.6, 0.62] },
   { position: [0, PLINTH + height + 0.72, front + 0.06], round: 0.33 },
  ],
  lantern: [0.95, PLINTH + 0.9, front + 0.3],
  smoke: [-0.75, PLINTH + height + 2.3, -0.7],
 };
}

// Mirador: casa con un torreón redondo de tejado cónico y una estrella en lo alto.
function turret(color) {
 const width = 2.9, depth = 2.5, height = 1.85, front = depth / 2 + 0.03;
 const [dark, light] = tones(color);
 const tower = [-width / 2 - 0.35, 0.3];
 const pieces = [
  ...body({ width, depth, height, wall: PLASTER }),
  ...timberFront({ width, height, z: front }),
  ...gableRoof({ width, depth, rise: 1.35, y: PLINTH + height, color, wall: PLASTER }),
  ...entrance({ x: 0.55, z: front }),
  ...windowFrame({ x: -0.6, y: PLINTH + 1.1, z: front, w: 0.52, box: true, seed: 2 }),
  ...bracket(1.3, PLINTH + 1.35, front),
  // Torreón.
  piece(new THREE.CylinderGeometry(1.0, 1.1, 0.5, 9), { bottom: STONE.dark, top: STONE.light, jitter: 0.04, vary: 0.1, position: [tower[0], 0.25, tower[1]] }),
  piece(new THREE.CylinderGeometry(0.86, 0.92, 3.1, 9), { bottom: PLASTER[0], top: PLASTER[1], vary: 0.05, jitter: 0.015, position: [tower[0], 2.0, tower[1]] }),
  piece(new THREE.CylinderGeometry(0.96, 0.96, 0.14, 9), { color: WOOD.dark, position: [tower[0], 3.5, tower[1]] }),
  piece(new THREE.ConeGeometry(1.18, 1.7, 9), { bottom: dark, top: light, vary: 0.08, jitter: 0.02, position: [tower[0], 4.4, tower[1]] }),
  piece(limb(0.02, 0.02, 0.5, 4), { color: "#3b3836", position: [tower[0], 5.2, tower[1]] }),
  piece(new THREE.OctahedronGeometry(0.13, 0), { color: "#ffd45a", position: [tower[0], 5.8, tower[1]] }),
  piece(new THREE.CylinderGeometry(0.33, 0.33, 0.08, 8), { color: WOOD.dark, position: [tower[0], 2.75, tower[1] + 0.87], rotation: [Math.PI / 2, 0, 0] }),
 ];
 return {
  pieces,
  windows: [
   { position: [-0.6, PLINTH + 1.1, front + 0.02], size: [0.52, 0.7] },
   { position: [tower[0], 2.75, tower[1] + 0.93], round: 0.25 },
  ],
  lantern: [1.3, PLINTH + 1.3, front + 0.3],
  smoke: null,
 };
}

// Almacén: granero con el hastial al frente, portón de dos hojas, polea y cajas.
function barn(color) {
 const width = 3.3, depth = 3.0, height = 2.0, front = depth / 2 + 0.03;
 const roof = gableRoof({ width: depth, depth: width, rise: 1.5, y: PLINTH + height, color, wall: PLANKS, overhang: 0.32, side: 0.4 });
 roof.forEach((part) => part.rotateY(Math.PI / 2));
 const pieces = [
  ...body({ width, depth, height, wall: PLANKS }),
  ...timberFront({ width, height, z: front, braces: false }),
  ...roof,
  // Portón de dos hojas con aspas.
  piece(box(2.0, 1.75, 0.09), { color: WOOD.dark, position: [0, PLINTH + 0.88, front] }),
  ...[-0.48, 0.48].flatMap((x) => [
   piece(box(0.9, 1.6, 0.08), { bottom: "#8f5a36", top: "#b9824f", vary: 0.1, seed: x, position: [x, PLINTH + 0.82, front + 0.04] }),
   piece(box(0.07, 1.75, 0.05), { color: WOOD.dark, position: [x, PLINTH + 0.82, front + 0.09], rotation: [0, 0, 0.5] }),
   piece(box(0.07, 1.75, 0.05), { color: WOOD.dark, position: [x, PLINTH + 0.82, front + 0.09], rotation: [0, 0, -0.5] }),
  ]),
  piece(box(2.4, 0.2, 0.7), { bottom: STONE.dark, top: STONE.mid, vary: 0.06, position: [0, 0.3, front + 0.4] }),
  // Viga de la polea y ventanuco del altillo.
  piece(box(0.12, 0.12, 0.95), { color: WOOD.dark, position: [0, PLINTH + height + 1.05, front + 0.35] }),
  piece(limb(0.012, 0.012, 0.55, 3), { color: "#2a2622", position: [0, PLINTH + height + 0.45, front + 0.72] }),
  piece(box(0.16, 0.12, 0.16), { color: "#5a5560", position: [0, PLINTH + height + 0.42, front + 0.72] }),
  piece(box(0.72, 0.6, 0.07), { color: WOOD.dark, position: [0, PLINTH + height + 0.5, front] }),
  ...bracket(-1.35, PLINTH + 1.3, front),
  // Cajas y un barril a la derecha.
  piece(box(0.7, 0.7, 0.7), { bottom: WOOD.mid, top: WOOD.pale, vary: 0.12, position: [2.2, 0.35, 0.9], rotation: [0, 0.3, 0] }),
  piece(box(0.55, 0.55, 0.55), { bottom: WOOD.mid, top: WOOD.pale, vary: 0.12, seed: 3, position: [2.25, 0.97, 0.85], rotation: [0, -0.2, 0] }),
  piece(new THREE.CylinderGeometry(0.34, 0.34, 0.85, 8), { bottom: WOOD.dark, top: WOOD.light, vary: 0.1, position: [2.2, 0.43, 1.8] }),
  piece(new THREE.CylinderGeometry(0.36, 0.36, 0.07, 8), { color: "#5a5560", position: [2.2, 0.68, 1.8] }),
 ];
 return { pieces, windows: [{ position: [0, PLINTH + height + 0.5, front + 0.04], size: [0.56, 0.44] }], lantern: [-1.35, PLINTH + 1.25, front + 0.3], smoke: null };
}

// Estación de comunicaciones: casa baja con porche, ventana redonda y un
// mástil de radio con su parábola en el tejado. `smoke` no hay; `mast` es la
// punta del mástil (donde va la baliza).
function station(color) {
 const width = 3.4, depth = 2.6, height = 1.9, front = depth / 2 + 0.03;
 const mast = [1.05, PLINTH + height + 0.75, -0.35];
 const pieces = [
  ...body({ width, depth, height, wall: PLASTER }),
  ...timberFront({ width, height, z: front }),
  ...gableRoof({ width, depth, rise: 1.2, y: PLINTH + height, color, wall: PLASTER }),
  ...entrance({ x: -0.7, z: front }),
  ...bracket(-1.5, PLINTH + 1.35, front),
  piece(new THREE.CylinderGeometry(0.44, 0.44, 0.08, 10), { color: WOOD.dark, position: [0.85, PLINTH + 1.1, front], rotation: [Math.PI / 2, 0, 0] }),
  // Mástil de celosía: tres patas que se juntan, con dos aros.
  ...[0, 2.1, 4.2].map((angle) => piece(limb(0.035, 0.02, 2.5, 4), { color: "#5a5560", position: [mast[0] + Math.cos(angle) * 0.22, mast[1], mast[2] + Math.sin(angle) * 0.22], rotation: [Math.sin(angle) * -0.085, 0, Math.cos(angle) * 0.085] })),
  ...[0.8, 1.6].map((y) => piece(new THREE.TorusGeometry(0.2 - y * 0.06, 0.02, 3, 6), { color: "#5a5560", position: [mast[0], mast[1] + y, mast[2]], rotation: [Math.PI / 2, 0, 0] })),
  // Parábola pequeña, mirando al sur y arriba.
  piece(new THREE.ConeGeometry(0.5, 0.24, 10, 1, true), { bottom: "#cfc8ba", top: CREAM, position: [mast[0] - 0.05, mast[1] + 1.25, mast[2] + 0.3], rotation: [-0.9, 0, 0] }),
  piece(limb(0.015, 0.015, 0.4, 3), { color: "#5a5560", position: [mast[0] - 0.05, mast[1] + 1.25, mast[2] + 0.3], rotation: [0.65, 0, 0] }),
  // Banco bajo la ventana.
  piece(box(1.1, 0.07, 0.36), { bottom: WOOD.mid, top: WOOD.light, position: [0.85, 0.62, front + 0.34] }),
  ...[-0.45, 0.45].map((x) => piece(box(0.08, 0.36, 0.3), { color: WOOD.dark, position: [0.85 + x, 0.4, front + 0.34] })),
 ];
 return { pieces, windows: [{ position: [0.85, PLINTH + 1.1, front + 0.06], round: 0.34 }], lantern: [-1.5, PLINTH + 1.3, front + 0.3], smoke: null, mast: [mast[0], mast[1] + 2.55, mast[2]] };
}

// Casita del árbol: pequeña, de tablas, con el hastial al frente y un balcón corrido.
function nest(color) {
 const width = 2.3, depth = 2.0, height = 1.55, front = depth / 2 + 0.03;
 const roof = gableRoof({ width: depth, depth: width, rise: 1.25, y: height, color, wall: PLANKS, overhang: 0.3, side: 0.34 });
 roof.forEach((part) => part.rotateY(Math.PI / 2));
 const lift = (part) => part.translate(0, -PLINTH, 0); // sin zócalo: se apoya en la plataforma
 const pieces = [
  piece(box(width, height, depth), { bottom: PLANKS[0], top: PLANKS[1], vary: 0.1, position: [0, height / 2, 0] }),
  ...timberFront({ width, height, z: front, braces: false }).map(lift),
  ...roof,
  piece(box(0.74, 1.3, 0.09), { color: WOOD.dark, position: [-0.5, 0.65, front] }),
  piece(box(0.58, 1.14, 0.07), { bottom: "#8f5a36", top: "#b9824f", vary: 0.1, position: [-0.5, 0.6, front + 0.04] }),
  piece(new THREE.CylinderGeometry(0.33, 0.33, 0.08, 8), { color: WOOD.dark, position: [0.55, 0.9, front], rotation: [Math.PI / 2, 0, 0] }),
  piece(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 8), { color: WOOD.dark, position: [0, height + 0.55, front], rotation: [Math.PI / 2, 0, 0] }),
 ];
 return {
  pieces,
  windows: [
   { position: [0.55, 0.9, front + 0.06], round: 0.25 },
   { position: [0, height + 0.55, front + 0.06], round: 0.19 },
  ],
  lantern: [-1.02, 1.25, front + 0.3],
  smoke: null,
 };
}

const BUILDERS = [workshop, studio, turret, barn, station, nest];

// Casa número `index` (0–3) con el tejado del color dado.
export function createCottage(index, color) {
 const { pieces, ...rest } = BUILDERS[index % BUILDERS.length](color);
 return { geometry: merge(pieces, { ground: 0.12, groundHeight: 0.6 }), ...rest };
}
