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
const MOSS = { deep: "#4f9146", mid: "#6fae4f", light: "#93c95c" };

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
 const points = [], crown = [];
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
    if (sy) crown.push(new THREE.Vector3(cx - sx * bevel, cy, cz - sz * bevel));
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
  // Musgo: un cojín bajo que cubre parte de la coronación, arrimado a un
  // lado, y rebosa por ese canto. No toda la roca: la piedra se sigue viendo.
  const centre = crown.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / crown.length);
  const toward = random() * Math.PI * 2;
  const shift = new THREE.Vector3(Math.cos(toward) * s.x, 0, Math.sin(toward) * s.z).multiplyScalar(0.24);
  const cushion = [];
  for (const p of crown) {
   const out = p.clone().sub(centre);
   const base = centre.clone().addScaledVector(out, 0.66 + random() * 0.2).add(shift);
   // Lo que sobresale del canto cuelga un poco por la cara.
   const over = Math.max(0, out.dot(shift) / (shift.length() * out.length() + 1e-6));
   base.y = p.y - over * 0.26 * moss;
   cushion.push(base.clone().setY(base.y - 0.05), base.clone().setY(base.y + 0.035), centre.clone().addScaledVector(out, 0.46).add(shift).setY(base.y + 0.08));
  }
  const cap = new ConvexGeometry(cushion);
  const capNormal = cap.attributes.normal, capColors = new Float32Array(cap.attributes.position.count * 3);
  for (let i = 0; i < cap.attributes.position.count; i += 3) {
   tone.copy(capNormal.getY(i) > 0.8 ? mossLight : capNormal.getY(i) > 0.2 ? mossMid : mossDeep).multiplyScalar(0.95 + random() * 0.1);
   for (let k = 0; k < 3; k++) tone.toArray(capColors, (i + k) * 3);
  }
  cap.deleteAttribute("normal");
  cap.setAttribute("color", new THREE.BufferAttribute(capColors, 3));
  whole = mergeGeometries([geometry, cap]);
  geometry.dispose();
  cap.dispose();
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
