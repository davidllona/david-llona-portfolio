import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { blade, blob, merge, piece, randomFrom, tube } from "../living/kit/geometry";
import { BARK, IRON, ROOF, STONE, WALL, WARM } from "./models";

// Modelos de la tierra lejana (ver farland.js): los mismos motivos de la isla
// —sauce, copa ancha, árbol en espiral, casita de tejado puntiagudo,
// farolillo— reducidos a lo que se lee desde la órbita. Cien triángulos, no mil:
// se ven a más de cien metros y hay cientos de copias.
const FOLIAGE = { low: "#9d97ad", high: "#e6e1ef" };

// Une unas piezas apagadas con otras que emiten luz: estas llevan `lit` = 1.
function withLit(solid, lit) {
 const a = merge(solid), b = merge(lit);
 a.setAttribute("lit", new THREE.BufferAttribute(new Float32Array(a.attributes.position.count), 1));
 b.setAttribute("lit", new THREE.BufferAttribute(new Float32Array(b.attributes.position.count).fill(1), 1));
 const whole = mergeGeometries([a, b]);
 a.dispose();
 b.dispose();
 whole.computeBoundingSphere();
 return whole;
}

// Sauce: tronco torcido, una copa chata y una corona de tiras que cuelgan.
export function createFarWillow() {
 const random = randomFrom(0.731);
 const parts = [
  piece(tube([[0, 0, 0], [0.25, 1.4, 0.1], [-0.1, 2.9, 0], [0.05, 4.1, 0]], (t) => 0.36 * (1 - t) + 0.12, { sides: 5, segments: 4 }), { bottom: BARK.dark, top: BARK.mid }),
  piece(blob(0), { bottom: FOLIAGE.low, top: FOLIAGE.high, jitter: 0.1, vary: 0.12, seed: 3, position: [0, 4.5, 0], scale: [1.7, 0.6, 1.7] }),
 ];
 for (let i = 0; i < 11; i++) {
  const a = (i / 11) * Math.PI * 2 + random() * 0.2, r = 1.25 + random() * 0.35, long = 2.4 + random() * 1.3;
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  parts.push(piece(blade([[x, 4.5, z], [x * 1.16, 4.5 - long * 0.5, z * 1.16], [x * 1.2, 4.5 - long, z * 1.2]], 0.5, { facing: a + Math.PI / 2, tipWidth: 0.1 }), { bottom: "#ffffff", top: "#8f899f", vary: 0.12, seed: 20 + i }));
 }
 return merge(parts);
}

// Copa ancha: tronco y una seta de hojas, más oscura por debajo.
export function createFarBroad() {
 return merge([
  piece(tube([[0, 0, 0], [-0.2, 1.4, 0.1], [0.1, 3.0, 0], [0, 4.2, 0]], (t) => 0.4 * (1 - t) + 0.14, { sides: 5, segments: 4 }), { bottom: BARK.dark, top: BARK.mid }),
  piece(new THREE.CylinderGeometry(1.7, 2.3, 0.6, 8, 1), { bottom: FOLIAGE.low, top: FOLIAGE.high, jitter: 0.12, vary: 0.14, seed: 7, position: [0, 4.6, 0] }),
  piece(new THREE.ConeGeometry(2.1, 0.8, 8), { color: "#6f6880", vary: 0.1, seed: 11, position: [0, 4.0, 0], rotation: [Math.PI, 0, 0] }),
  piece(blob(0), { bottom: FOLIAGE.low, top: FOLIAGE.high, jitter: 0.1, vary: 0.12, seed: 14, position: [0, 5.1, 0], scale: [1.3, 0.45, 1.3] }),
 ]);
}

// Espiral: un tubo enroscado alrededor de un cono, acabado en rizo.
export function createFarSpiral() {
 const coil = [];
 for (let k = 0; k <= 16; k++) {
  const t = k / 16, angle = t * Math.PI * 2 * 2.3, r = 1.3 * (1 - t) + 0.14;
  coil.push([Math.cos(angle) * r, 1.3 + t * 4.2, Math.sin(angle) * r]);
 }
 const last = coil[coil.length - 1];
 coil.push([last[0] + 0.4, last[1] + 0.3, last[2]], [last[0] + 0.5, last[1] - 0.1, last[2]]);
 return merge([
  piece(tube([[0, 0, 0], [0.15, 0.8, 0.05], [-0.05, 1.5, 0]], (t) => 0.3 * (1 - t) + 0.14, { sides: 5, segments: 2 }), { bottom: BARK.dark, top: BARK.mid }),
  piece(tube(coil, (t) => 0.6 * (1 - t) ** 0.9 + 0.1, { sides: 5, segments: 20 }), { bottom: FOLIAGE.low, top: FOLIAGE.high, vary: 0.1 }),
  piece(new THREE.ConeGeometry(0.95, 4.0, 6).translate(0, 3.4, 0), { color: "#5d5672" }),
 ]);
}

// Casita: paredes de piedra, tejado de pizarra alto y vencido, chimenea y una
// ventana encendida en cada cara (desde la órbita siempre se ve alguna).
export function createFarHouse() {
 const window = (x, z, turn) => piece(new THREE.PlaneGeometry(0.62, 0.9), { color: WARM, position: [x, 1.25, z], rotation: [0, turn, 0] });
 return withLit(
  [
   piece(new THREE.BoxGeometry(2.6, 2.3, 2.3).translate(0, 1.15, 0), { bottom: WALL.dark, top: WALL.light, jitter: 0.05, vary: 0.1, seed: 2 }),
   piece(new THREE.ConeGeometry(2.3, 3.3, 4, 2).rotateY(Math.PI / 4), { bottom: ROOF.b, top: ROOF.a, jitter: 0.08, vary: 0.14, seed: 5, position: [0.1, 3.85, 0], rotation: [0, 0, -0.09], scale: [1, 1, 0.9] }),
   piece(new THREE.BoxGeometry(0.42, 1.5, 0.42), { bottom: STONE.dark, top: STONE.mid, position: [0.8, 3.3, 0.35] }),
  ],
  [window(-0.55, 1.16, 0), window(0.6, 1.16, 0), window(1.31, 0, Math.PI / 2), window(-1.31, 0, -Math.PI / 2), window(0, -1.16, Math.PI)],
 );
}

// Farolillo: un poste de hierro y su luz.
export function createFarLantern() {
 return withLit(
  [piece(new THREE.CylinderGeometry(0.05, 0.08, 1.9, 4).translate(0, 0.95, 0), { color: IRON }), piece(new THREE.ConeGeometry(0.3, 0.22, 4), { color: IRON, position: [0, 2.3, 0] })],
  [piece(new THREE.OctahedronGeometry(0.3, 0), { color: WARM, position: [0, 1.98, 0], scale: [1, 1.2, 1] })],
 );
}
