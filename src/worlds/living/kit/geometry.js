import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Kit de modelado low-poly. Todo lo que hay en el planeta sale de primitivas
// de three, pero ninguna se usa «a pelo»: cada pieza pasa por `piece`, que le
// descoloca los vértices (adiós esferas y cajas perfectas), la coloca y le
// pinta un degradado en los colores de vértice (base oscura, punta clara).
// Luego `merge` une las piezas de un modelo en una sola geometría.

// Generador aleatorio con semilla: el mismo modelo sale igual en cada visita.
export function randomFrom(seed) {
 let state = Math.floor(seed * 2147483647) || 1;
 return () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 };
}

// Número pseudoaleatorio estable para un punto: los vértices que comparten
// posición reciben el mismo desplazamiento, así que la malla no se abre.
function hash(x, y, z, seed) {
 const v = Math.sin(Math.round(x * 256) * 12.9898 + Math.round(y * 256) * 78.233 + Math.round(z * 256) * 37.719 + seed * 4.1414) * 43758.5453;
 return v - Math.floor(v);
}

const colorA = new THREE.Color();
const colorB = new THREE.Color();
const helper = new THREE.Object3D();

// Prepara una pieza de un modelo.
//  · color: tono único; o bottom/top para un degradado vertical dentro de la pieza.
//  · jitter: cuánto se descolocan los vértices (en unidades de la pieza).
//  · vary: variación de luminosidad por cara (0–1), para que no sea un color plano.
//  · position, rotation, scale: dónde va dentro del modelo.
export function piece(source, { color = "#ffffff", bottom, top, jitter = 0, vary = 0, seed = 1, position, rotation, scale } = {}) {
 const geometry = source.index ? source.toNonIndexed() : source.clone();
 source.dispose();
 // Solo posición y color: así todas las piezas se pueden unir. Las normales se
 // calculan al final, ya facetadas.
 geometry.deleteAttribute("uv");
 geometry.deleteAttribute("normal");
 const points = geometry.attributes.position;

 if (jitter) {
  for (let i = 0; i < points.count; i++) {
   const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
   points.setXYZ(i, x + (hash(x, y, z, seed) - 0.5) * 2 * jitter, y + (hash(y, z, x, seed + 1) - 0.5) * 2 * jitter, z + (hash(z, x, y, seed + 2) - 0.5) * 2 * jitter);
  }
 }

 // Degradado en el eje vertical de la pieza, antes de colocarla.
 geometry.computeBoundingBox();
 const { min, max } = geometry.boundingBox;
 const span = Math.max(max.y - min.y, 1e-4);
 colorA.set(bottom ?? color);
 colorB.set(top ?? color);
 const colors = new Float32Array(points.count * 3);
 const mixed = new THREE.Color();
 for (let i = 0; i < points.count; i += 3) {
  // Una cara, un matiz: se toma un valor por triángulo.
  const shade = vary ? 1 + (hash(points.getX(i), points.getY(i + 1), points.getZ(i + 2), seed + 7) - 0.5) * 2 * vary : 1;
  for (let k = 0; k < 3; k++) {
   mixed.copy(colorA).lerp(colorB, (points.getY(i + k) - min.y) / span).multiplyScalar(shade);
   mixed.toArray(colors, (i + k) * 3);
  }
 }
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

 if (position || rotation || scale) {
  helper.position.set(...(position ?? [0, 0, 0]));
  helper.rotation.set(...(rotation ?? [0, 0, 0]));
  if (Array.isArray(scale)) helper.scale.set(...scale);
  else helper.scale.setScalar(scale ?? 1);
  helper.updateMatrix();
  geometry.applyMatrix4(helper.matrix);
 }
 return geometry;
}

// Une las piezas de un modelo. `ground`: oscurece lo que queda cerca del suelo
// (y = 0), como si le llegara menos luz; 0 = nada.
export function merge(pieces, { ground = 0, groundHeight = 1 } = {}) {
 const geometry = mergeGeometries(pieces);
 pieces.forEach((part) => part.dispose());
 if (ground) {
  const points = geometry.attributes.position;
  const colors = geometry.attributes.color;
  for (let i = 0; i < points.count; i++) {
   const shade = 1 - ground * (1 - Math.min(1, Math.max(0, points.getY(i) / groundHeight)));
   colors.setXYZ(i, colors.getX(i) * shade, colors.getY(i) * shade, colors.getZ(i) * shade);
  }
 }
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}

// Tira estrecha que sigue una curva y se afina hacia la punta: briznas de
// hierba, frondas de helecho, ramas colgantes. `points`: [[x, y, z], …];
// `width`: ancho en la base. La tira mira hacia `facing` (ángulo en el plano).
export function blade(points, width, { facing = 0, tipWidth = 0 } = {}) {
 const positions = [];
 const sx = Math.cos(facing) * 0.5;
 const sz = Math.sin(facing) * 0.5;
 const last = points.length - 1;
 for (let i = 0; i < last; i++) {
  const a = points[i];
  const b = points[i + 1];
  const wa = width + (tipWidth - width) * (i / last);
  const wb = width + (tipWidth - width) * ((i + 1) / last);
  const a0 = [a[0] - sx * wa, a[1], a[2] - sz * wa];
  const a1 = [a[0] + sx * wa, a[1], a[2] + sz * wa];
  const b0 = [b[0] - sx * wb, b[1], b[2] - sz * wb];
  const b1 = [b[0] + sx * wb, b[1], b[2] + sz * wb];
  positions.push(...a0, ...a1, ...b0);
  if (wb > 1e-4) positions.push(...a1, ...b1, ...b0);
 }
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
 return geometry;
}

// Masa de hojas: un icosaedro descolocado y algo achatado.
export const blob = (detail = 1) => new THREE.IcosahedronGeometry(1, detail);
// Tronco o rama: cilindro que se afina, apoyado en su base.
export const limb = (bottomRadius, topRadius, length, sides = 6) => new THREE.CylinderGeometry(topRadius, bottomRadius, length, sides, 1).translate(0, length / 2, 0);
