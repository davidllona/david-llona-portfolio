import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { randomFrom } from "../kit/geometry";

// Roca: un bloque de planos amplios con los cantos biselados. Sale de la
// envoltura convexa de una caja desigual a la que se le han matado las ocho
// esquinas (tres puntos por esquina): seis caras grandes, doce biseles y ocho
// chaflanes, nada de bolas arrugadas. Piedra gris azulada, más clara en los
// cantos (donde se gasta) y con musgo en lo que mira al cielo.
export const BLUESTONE = { dark: "#5f6a7a", mid: "#8793a3", light: "#aab5c3", edge: "#c3ccd8" };
export const WET_STONE = { dark: "#454d5a", mid: "#626c7a", light: "#7f8a98", edge: "#97a2b0" };
const MOSS = { deep: "#4d7f34", mid: "#6f9c3a", light: "#93b548" }; // más amarillo y apagado que la hierba: se distingue de ella

const SHAPES = {
 // medio ancho, medio fondo, alto sobre el suelo, cuánto se estrecha arriba
 chunk: { x: 0.9, z: 0.74, top: 0.86, taper: 0.8 },
 slab: { x: 1.0, z: 0.8, top: 0.5, taper: 0.88 },
 tall: { x: 0.68, z: 0.62, top: 1.22, taper: 0.7 },
 wedge: { x: 0.96, z: 0.66, top: 0.78, taper: 0.74, tilt: 0.3 },
};
export const ROCK_SHAPES = Object.keys(SHAPES);

const hex = (value) => new THREE.Color(value);

// Devuelve la geometría del bloque con posición y color (sin normales: las
// pone `merge` o quien la use, ya facetadas). El suelo queda en y = 0 y el
// bloque baja un tercio por debajo, para ir medio enterrado.
//  · moss: 0 (pelada) … 1 (toda la coronación verde).
export function createBlock(seed, { shape = "chunk", moss = 1, stone = BLUESTONE, position, rotation, scale } = {}) {
 const random = randomFrom(seed);
 const s = SHAPES[shape];
 const bottom = -0.62; // va hondo: en una cuesta, el lado de abajo no queda al aire
 const tiltX = (random() - 0.5) * 0.3 + (s.tilt ?? 0), tiltZ = (random() - 0.5) * 0.24;
 const points = [], tops = [], feet = [];
 for (const sy of [0, 1]) {
  for (const sx of [-1, 1]) {
   for (const sz of [-1, 1]) {
    // Cada esquina, con su propio desplazamiento: ningún lado queda paralelo a otro.
    const narrow = sy ? s.taper * (0.9 + random() * 0.2) : 1;
    const cx = sx * s.x * narrow * (0.86 + random() * 0.24);
    const cz = sz * s.z * narrow * (0.86 + random() * 0.24);
    const cy = sy ? s.top * (0.88 + random() * 0.2) + cx * tiltX + cz * tiltZ : bottom;
    const bevel = (sy ? 0.16 : 0.1) + random() * 0.12;
    points.push(new THREE.Vector3(cx - sx * bevel, cy, cz), new THREE.Vector3(cx, cy, cz - sz * bevel), new THREE.Vector3(cx, cy + (sy ? -bevel : bevel) * 0.9, cz));
    (sy ? tops : feet).push(new THREE.Vector3(cx, cy, cz));
   }
  }
 }
 const geometry = new ConvexGeometry(points);
 const place = geometry.attributes.position, normal = geometry.attributes.normal;
 const colors = new Float32Array(place.count * 3);
 const dark = hex(stone.dark), mid = hex(stone.mid), light = hex(stone.light), edge = hex(stone.edge);
 const mossDeep = hex(MOSS.deep), mossMid = hex(MOSS.mid), mossLight = hex(MOSS.light);
 const tone = new THREE.Color();
 for (let i = 0; i < place.count; i += 3) {
  const nx = normal.getX(i), ny = normal.getY(i), nz = normal.getZ(i);
  // Cara grande (mira casi de lleno a un eje) o bisel.
  const broad = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz)) > 0.9;
  const vary = 0.94 + random() * 0.12;
  for (let k = 0; k < 3; k++) {
   const y = place.getY(i + k);
   const up = Math.min(1, Math.max(0, (y - bottom) / (s.top - bottom)));
   if (ny > 0.72) tone.copy(light).lerp(edge, 0.35);
   else if (!broad && ny > -0.2) tone.copy(light).lerp(edge, 0.3 + up * 0.5); // canto gastado, más claro
   else tone.copy(dark).lerp(mid, up * 0.9 + 0.1);
   tone.multiplyScalar(vary);
   tone.toArray(colors, (i + k) * 3);
  }
 }
 geometry.deleteAttribute("normal");
 geometry.deleteAttribute("uv");
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 let whole = geometry;
 if (moss > 0) {
  // Musgo: una capa de polígonos pequeños que tapa la coronación —abombada, no
  // un plano— y cae por los cuatro lados en un fleco desigual. Se hace con una
  // rejilla sobre la cara de arriba: cada vértice sube lo suyo, una esquina se
  // queda en piedra y, por el borde, cada tramo baja un trecho distinto pegado
  // a la pared. Va un dedo por fuera de la piedra.
  const N = 5;
  const lerp4 = (c, u, v) => c[0].clone().lerp(c[2], u).lerp(c[1].clone().lerp(c[3], u), v);
  const centre = lerp4(tops, 0.5, 0.5);
  const bare = [random() < 0.5 ? 0 : N, random() < 0.5 ? 0 : N]; // la esquina pelada
  const reach = 1.5 + random() * 1.1; // hasta dónde llega la calva, en celdas
  const grid = [];
  for (let j = 0; j <= N; j++) {
   for (let i = 0; i <= N; i++) {
    const rim = i === 0 || i === N || j === 0 || j === N;
    // Por dentro los vértices se descolocan; en el borde solo resbalan a lo largo de él.
    const u = (i + (i > 0 && i < N ? (random() - 0.5) * 0.5 : 0)) / N, v = (j + (j > 0 && j < N ? (random() - 0.5) * 0.5 : 0)) / N;
    const p = lerp4(tops, u, v);
    p.y += 0.04 + (rim ? random() * 0.03 : 0.05 + random() * 0.11); // abombado: más alto por dentro
    if (rim) p.addScaledVector(new THREE.Vector3(p.x - centre.x, 0, p.z - centre.z).normalize(), 0.05);
    grid.push({ p, u, v, gone: Math.hypot(i - bare[0], j - bare[1]) < reach });
   }
  }
  const at = (i, j) => grid[j * (N + 1) + i];
  const place3 = [], tones = [];
  const up = new THREE.Vector3(0, 1, 0), ab = new THREE.Vector3(), ac = new THREE.Vector3(), face = new THREE.Vector3();
  // Un triángulo, mirando hacia `towards`, con su matiz.
  const add = (a, b, c, towards, colour) => {
   face.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
   const order = face.dot(towards) < 0 ? [a, c, b] : [a, b, c];
   const vary = 0.9 + random() * 0.2;
   for (const p of order) {
    place3.push(p.x, p.y, p.z);
    tones.push(colour.r * vary, colour.g * vary, colour.b * vary);
   }
  };
  for (let j = 0; j < N; j++) {
   for (let i = 0; i < N; i++) {
    const q = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
    if (q.filter((one) => one.gone).length > 1) continue; // la calva
    const pick = random();
    const colour = tone.copy(pick < 0.45 ? mossLight : pick < 0.85 ? mossMid : mossDeep).clone();
    // La diagonal, a un lado o al otro: que no se lea la rejilla.
    if ((i + j) % 2) (add(q[0].p, q[1].p, q[2].p, up, colour), add(q[0].p, q[2].p, q[3].p, up, colour.clone().lerp(mossMid, 0.4)));
    else (add(q[0].p, q[1].p, q[3].p, up, colour), add(q[1].p, q[2].p, q[3].p, up, colour.clone().lerp(mossMid, 0.4)));
   }
  }
  // El fleco: por cada lado, lo que cae de cada vértice del borde.
  const sides = [
   Array.from({ length: N + 1 }, (_, i) => at(i, 0)),
   Array.from({ length: N + 1 }, (_, i) => at(N, i)),
   Array.from({ length: N + 1 }, (_, i) => at(N - i, N)),
   Array.from({ length: N + 1 }, (_, i) => at(0, N - i)),
  ];
  for (const side of sides) {
   const long = 0.5 + random() * 0.9; // hay lados por los que cae más
   const hem = side.map((one) => {
    const foot = lerp4(feet, one.u, one.v);
    const out = new THREE.Vector3(one.p.x - centre.x, 0, one.p.z - centre.z).normalize();
    const drop = one.gone ? 0 : (0.05 + random() * 0.24 * long) * moss;
    return { out, low: lerp4(tops, one.u, one.v).lerp(foot, drop).addScaledVector(out, 0.055) };
   });
   for (let i = 0; i < N; i++) {
    const a = side[i], b = side[i + 1];
    if (a.gone || b.gone) continue;
    const colour = tone.copy(mossMid).lerp(mossDeep, 0.3 + random() * 0.5).clone();
    add(a.p, b.p, hem[i].low, hem[i].out, colour);
    add(b.p, hem[i + 1].low, hem[i].low, hem[i].out, colour.clone().lerp(mossDeep, 0.35));
   }
  }
  const layer = new THREE.BufferGeometry();
  layer.setAttribute("position", new THREE.Float32BufferAttribute(place3, 3));
  layer.setAttribute("color", new THREE.Float32BufferAttribute(tones, 3));
  whole = mergeGeometries([geometry, layer]);
  geometry.dispose();
  layer.dispose();
 }
 if (position || rotation || scale) {
  const helper = new THREE.Object3D();
  helper.position.set(...(position ?? [0, 0, 0]));
  helper.rotation.set(...(rotation ?? [0, 0, 0]));
  if (Array.isArray(scale)) helper.scale.set(...scale);
  else helper.scale.setScalar(scale ?? 1);
  helper.updateMatrix();
  whole.applyMatrix4(helper.matrix);
 }
 return whole;
}

// Un bloque listo para dibujar (con sus normales).
export function createRock(seed, options) {
 const geometry = createBlock(seed, options);
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}
