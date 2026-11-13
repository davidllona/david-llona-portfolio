import * as THREE from "three";
import { blade, blob, merge, piece, randomFrom, tube } from "../../worlds/living/kit/geometry";
import { BARK, LEAF, ROCK, WOOD } from "../../worlds/living/kit/palette";

// Modelos del islote de la bienvenida: el islote, lo que se le añade al árbol,
// los farolillos, las rocas que flotan alrededor y la luna.

// Contorno del islote: irregular, algo más largo hacia el fondo que a lo ancho.
export const ISLET = { rx: 3.0, rz: 3.4, depth: 2.35 };
const lobes = (angle) => 1 + 0.13 * Math.sin(angle * 2 + 0.7) + 0.09 * Math.sin(angle * 3 + 2.2) + 0.05 * Math.sin(angle * 5 + 4.1) + 0.03 * Math.sin(angle * 9 + 1.3);
// Hasta dónde llega la hierba en una dirección (0–1 = dentro).
export const isletEdge = (x, z) => {
 const angle = Math.atan2(z / ISLET.rz, x / ISLET.rx);
 return Math.hypot(x / ISLET.rx, z / ISLET.rz) / lobes(angle);
};

const SIDES = 30;
// Un anillo del islote: `scale` respecto al contorno, a la altura `y`, con el
// centro desplazado y los puntos descolocados (`rough` en horizontal, `wave` en vertical).
function ring(scale, y, random, { rough = 0, wave = 0, shift = [0, 0] } = {}) {
 return Array.from({ length: SIDES }, (_, i) => {
  const angle = (i / SIDES) * Math.PI * 2;
  const r = lobes(angle) * scale * (1 + (random() - 0.5) * 2 * rough);
  return new THREE.Vector3(shift[0] + Math.cos(angle) * ISLET.rx * r, y + (random() - 0.5) * 2 * wave, shift[1] + Math.sin(angle) * ISLET.rz * r);
 });
}

// Triángulos sueltos (cada cara con su matiz) entre dos anillos, o de un anillo a un punto.
function builder() {
 const positions = [], colors = [];
 const a = new THREE.Color(), b = new THREE.Color(), c = new THREE.Color();
 const random = randomFrom(0.417);
 const face = (p, q, r, low, high, span, vary) => {
  const shade = 1 + (random() - 0.5) * 2 * vary;
  for (const point of [p, q, r]) {
   positions.push(point.x, point.y, point.z);
   c.copy(a.set(low)).lerp(b.set(high), THREE.MathUtils.clamp((point.y - span[0]) / (span[1] - span[0] || 1), 0, 1)).multiplyScalar(shade);
   colors.push(c.r, c.g, c.b);
  }
 };
 return {
  // `upper` queda arriba (o fuera): las caras miran hacia fuera.
  band(upper, lower, low, high, vary = 0.1) {
   const span = [Math.min(...lower.map((p) => p.y)), Math.max(...upper.map((p) => p.y))];
   for (let i = 0; i < SIDES; i++) {
    const j = (i + 1) % SIDES;
    face(upper[i], upper[j], lower[i], low, high, span, vary);
    face(upper[j], lower[j], lower[i], low, high, span, vary);
   }
  },
  fan(edge, centre, low, high, up, vary = 0.08) {
   const span = [centre.y, centre.y + 1e-3];
   for (let i = 0; i < SIDES; i++) {
    const j = (i + 1) % SIDES;
    if (up) face(edge[j], edge[i], centre, low, high, span, vary);
    else face(edge[i], edge[j], centre, low, high, span, vary);
   }
  },
  geometry() {
   const geometry = new THREE.BufferGeometry();
   geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
   geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
   return geometry;
  },
 };
}

// El islote: césped con un borde que cuelga sobre la roca, una franja de tierra
// y roca en estratos que se estrechan hasta una punta, con repisas entre ellos.
export function createIslet() {
 const random = randomFrom(0.61);
 const build = builder();
 // Césped: centro, anillo interior algo abombado y borde.
 const inner = ring(0.55, 0.07, random, { rough: 0.05, wave: 0.03 });
 const edge = ring(1, 0, random, { rough: 0.03, wave: 0.03 });
 build.fan(inner, new THREE.Vector3(0.1, 0.1, 0.1), "#4f9d49", "#58a64d", true);
 build.band(inner, edge, "#3f8c44", "#55a34b", 0.07);
 // El borde de hierba cae de forma desigual y vuelve hacia dentro por debajo.
 const drip = ring(1.035, -0.36, random, { rough: 0.02, wave: 0.16 });
 const under = ring(0.95, -0.3, random, { rough: 0.02, wave: 0.04 });
 build.band(edge, drip, "#3d8a45", "#52a04b", 0.09);
 build.band(drip, under, "#2a5c38", "#35763f", 0.06);
 // Tierra.
 const soil = ring(0.9, -0.72, random, { rough: 0.05, wave: 0.06 });
 build.band(under, soil, "#8a5f3e", "#b98852", 0.1);
 // Estratos de roca: [arriba, abajo, y de abajo, color bajo, color alto, desplazamiento].
 let last = soil;
 let y = -0.72;
 for (const [top, bottom, fall, low, high, shift] of [
  [0.96, 0.84, 0.52, ROCK.mid, ROCK.light, [0.05, 0]],
  [0.76, 0.58, 0.5, ROCK.dark, ROCK.mid, [-0.1, 0.1]],
  [0.5, 0.26, 0.4, "#5f5a58", ROCK.dark, [-0.25, 0.05]],
 ]) {
  // Repisa: el estrato arranca más ancho o más estrecho que donde acabó el anterior.
  const start = ring(top, y - 0.04, random, { rough: 0.07, wave: 0.08, shift });
  build.band(last, start, low, high, 0.12);
  y -= fall;
  const end = ring(bottom, y, random, { rough: 0.09, wave: 0.12, shift });
  build.band(start, end, low, high, 0.14);
  last = end;
 }
 build.fan(last, new THREE.Vector3(-0.45, -ISLET.depth, 0.15), "#4d4947", "#66615e", false, 0.12);

 const pieces = [build.geometry()];
 // Piedras que asoman por el borde y dos dentro del claro.
 for (let i = 0; i < 7; i++) {
  const angle = (i / 7) * Math.PI * 2 + random() * 0.6 + 0.4;
  const size = 0.22 + random() * 0.3;
  const r = lobes(angle) * 0.97;
  pieces.push(piece(i % 2 ? blob(0) : new THREE.DodecahedronGeometry(1, 0), { bottom: ROCK.dark, top: ROCK.light, jitter: 0.2, vary: 0.1, seed: i + 10, position: [Math.cos(angle) * ISLET.rx * r, -0.12 - random() * 0.35, Math.sin(angle) * ISLET.rz * r], scale: [size, size * 0.7, size], rotation: [i, i * 2, i] }));
 }
 pieces.push(
  piece(new THREE.DodecahedronGeometry(1, 0), { bottom: ROCK.dark, top: ROCK.light, jitter: 0.2, vary: 0.1, seed: 31, position: [-2.2, 0.12, 1.7], scale: [0.42, 0.3, 0.38] }),
  piece(blob(0), { bottom: ROCK.dark, top: ROCK.light, jitter: 0.2, vary: 0.1, seed: 32, position: [2.25, 0.08, 1.9], scale: [0.26, 0.19, 0.24] }),
 );
 // Lianas que cuelgan del borde.
 for (let i = 0; i < 11; i++) {
  const angle = (i / 11) * Math.PI * 2 + random() * 0.4;
  const r = lobes(angle) * 1.0;
  const x = Math.cos(angle) * ISLET.rx * r, z = Math.sin(angle) * ISLET.rz * r;
  const length = 0.4 + random() * 0.9;
  pieces.push(piece(blade([[x, -0.3, z], [x * 1.03, -0.3 - length * 0.5, z * 1.03], [x * 0.97, -0.3 - length, z * 0.97]], 0.09, { facing: angle + Math.PI / 2, tipWidth: 0.015 }), { bottom: "#7cc65c", top: "#3f8a45" }));
 }
 // Raíces que salen de la roca por debajo y se retuercen.
 for (let i = 0; i < 6; i++) {
  const angle = i * 1.13 + 0.5;
  const r = 0.62 - (i % 3) * 0.12;
  const top = -0.85 - (i % 3) * 0.42;
  const x = Math.cos(angle) * ISLET.rx * r, z = Math.sin(angle) * ISLET.rz * r;
  const length = 0.45 + random() * 0.5;
  pieces.push(piece(tube([[x * 0.85, top + 0.15, z * 0.85], [x * 1.08, top - length * 0.35, z * 1.08], [x * 0.98 + 0.1, top - length * 0.75, z * 0.98], [x * 1.05, top - length, z * 1.05 + 0.1]], (t) => 0.06 - t * 0.045, { sides: 5, segments: 6 }), { bottom: WOOD.mid, top: BARK.old[0], vary: 0.08, seed: i }));
 }
 return merge(pieces);
}

// Roca flotante: un pedrusco que se afila hacia abajo con un copete de hierba.
export function createFloater(seed) {
 const random = randomFrom(seed);
 return merge([
  piece(new THREE.DodecahedronGeometry(1, 0), { bottom: "#5f5a58", top: ROCK.light, jitter: 0.22, vary: 0.12, seed: seed * 9, scale: [1, 0.72, 0.92] }),
  piece(new THREE.ConeGeometry(0.62, 1.0, 6), { bottom: "#55504e", top: ROCK.dark, jitter: 0.14, vary: 0.12, seed: seed * 5, position: [0.1, -0.85, 0], rotation: [Math.PI, random() * 3, 0] }),
  piece(new THREE.CylinderGeometry(0.72, 0.86, 0.2, 7), { bottom: "#3a8444", top: "#58a64d", jitter: 0.08, vary: 0.07, seed: seed * 3, position: [0, 0.62, 0] }),
 ]);
}

// Lo que se le añade al árbol (modelo «frondoso», a escala 1): raíces que se
// agarran al suelo, más masas pequeñas en la copa y lianas colgando.
export function createTreeExtras() {
 const random = randomFrom(0.37);
 const bark = BARK.old;
 const pieces = [];
 for (let i = 0; i < 6; i++) {
  const angle = (i / 6) * Math.PI * 2 + 0.3 + random() * 0.5;
  const reach = 1.15 + random() * 0.6;
  const dx = Math.cos(angle), dz = Math.sin(angle);
  pieces.push(piece(tube([[dx * 0.05, 0.85, dz * 0.05], [dx * reach * 0.4, 0.34, dz * reach * 0.4], [dx * reach * 0.8, 0.1, dz * reach * 0.8], [dx * reach, -0.14, dz * reach]], (t) => 0.27 - t * 0.21, { sides: 5, segments: 6 }), { bottom: bark[0], top: bark[1], jitter: 0.02, vary: 0.08, seed: i }));
 }
 // Masas pequeñas: rellenan los huecos de la copa y rompen su contorno.
 const tones = [LEAF.poplar[1], LEAF.oak[1], LEAF.poplar[0], LEAF.birch[0]];
 [
  [-2.9, 3.1, -0.1, 0.5], [-2.6, 4.3, -0.9, 0.58], [-1.2, 5.1, -0.9, 0.55], [0.15, 4.85, -0.9, 0.6], [1.75, 4.25, -0.2, 0.52], [1.95, 3.3, -0.8, 0.55],
  [0.9, 3.1, 0.35, 0.46], [-0.95, 3.75, 0.85, 0.52], [-3.1, 3.8, 0.3, 0.42], [0.3, 4.4, 0.65, 0.46], [-1.6, 4.6, 0.6, 0.44], [1.1, 4.75, -0.75, 0.42],
  [2.3, 3.75, 0.1, 0.4], [-2.0, 3.0, 0.7, 0.42], [-0.2, 3.25, 0.95, 0.4], [1.5, 3.7, 0.6, 0.4],
 ].forEach(([x, y, z, size], i) => {
  const [bottom, top] = tones[i % tones.length];
  pieces.push(piece(blob(1), { bottom, top, jitter: 0.16, vary: 0.08, seed: i * 7 + 1, position: [x, y, z], rotation: [random() * 3, random() * 3, 0], scale: [size, size * 0.8, size] }));
 });
 // Lianas.
 [[0.84, 3.15, -0.3], [-2.03, 2.95, -0.4], [-0.39, 2.85, 0.3], [-1.7, 3.5, 0.6], [0.2, 3.05, -0.75], [-1.45, 2.85, -0.4], [1.4, 3.05, -0.8], [-2.6, 2.85, 0.0], [0.75, 2.85, 0.3]].forEach(([x, y, z], i) => {
  const length = 0.5 + random() * 1.0;
  pieces.push(piece(blade([[x, y + 0.1, z], [x + 0.05, y - length * 0.5, z], [x, y - length, z + 0.05]], 0.085, { facing: i * 1.3, tipWidth: 0.015 }), { bottom: "#9bd765", top: "#3f8f4a" }));
 });
 return merge(pieces);
}
// De dónde cuelgan los farolillos (en el árbol a escala 1): [x, y del farol, z, largo del hilo].
export const TREE_LANTERNS = [[0.95, 2.72, -0.1, 0.55], [-2.05, 2.5, -0.2, 0.5], [-0.45, 2.38, 0.5, 0.45], [-1.55, 3.0, 0.85, 0.5]];

// Armazón de un farolillo (sin el cristal): hilo, tapa, base y cuatro varillas.
export function createLanternFrame(thread = 0.5) {
 const dark = "#2e2620";
 return merge([
  piece(new THREE.CylinderGeometry(0.006, 0.006, thread, 3), { color: dark, position: [0, 0.2 + thread / 2, 0] }),
  piece(new THREE.ConeGeometry(0.12, 0.1, 4), { color: WOOD.dark, position: [0, 0.16, 0], rotation: [0, Math.PI / 4, 0] }),
  piece(new THREE.BoxGeometry(0.15, 0.025, 0.15), { color: WOOD.dark, position: [0, -0.115, 0] }),
  ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => piece(new THREE.BoxGeometry(0.016, 0.22, 0.016), { color: dark, position: [x * 0.066, 0, z * 0.066] })),
 ]);
}
