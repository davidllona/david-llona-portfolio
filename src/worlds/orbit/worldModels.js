import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { randomFrom, tube } from "../living/kit/geometry";

// Los mundos del porfolio vistos de lejos, desde la órbita de otro: astros
// pequeños, facetados, con su carácter. (The Living World ya tenía el suyo:
// `createGlobe`, en experience/intro/skyModels.js.)

const wobble = (p, scale, seed = 0) => {
 const x = p.x * scale + seed, y = p.y * scale + seed * 1.7, z = p.z * scale - seed;
 return (Math.sin(x * 1.3 + y * 0.7) + Math.sin(y * 1.9 - z * 1.1 + 1.3) + Math.sin(z * 1.6 + x * 0.9 + 2.1) + Math.sin((x + y + z) * 0.8)) / 4;
};
const smooth = (a, b, x) => {
 const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
 return t * t * (3 - 2 * t);
};

// Pinta cada cara con `paint(centro, color)` y deja normales planas.
function faceted(geometry, paint) {
 const points = geometry.attributes.position;
 const colors = new Float32Array(points.count * 3);
 const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), centre = new THREE.Vector3(), colour = new THREE.Color();
 for (let i = 0; i < points.count; i += 3) {
  centre.copy(a.fromBufferAttribute(points, i)).add(b.fromBufferAttribute(points, i + 1)).add(c.fromBufferAttribute(points, i + 2)).divideScalar(3);
  paint(centre, colour);
  for (let k = 0; k < 3; k++) colour.toArray(colors, (i + k) * 3);
 }
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 geometry.deleteAttribute("uv");
 geometry.computeVertexNormals();
 return geometry;
}

// The Twisted Moon: oscuro y retorcido, de cuento gótico. Morados y grises,
// crestas en espiral y tres colinas enroscadas.
export function createTwistedWorld() {
 const random = randomFrom(0.52);
 const geometry = new THREE.IcosahedronGeometry(1, 9);
 const points = geometry.attributes.position;
 const point = new THREE.Vector3();
 const ridge = (p) => Math.sin(Math.atan2(p.z, p.x) * 3 + Math.asin(Math.min(1, Math.max(-1, p.y))) * 8);
 for (let i = 0; i < points.count; i++) {
  point.fromBufferAttribute(points, i).normalize();
  point.multiplyScalar(1 + ridge(point) * 0.045 + wobble(point, 3.2, 2) * 0.03);
  points.setXYZ(i, point.x, point.y, point.z);
 }
 const deep = new THREE.Color("#2a1f40"), violet = new THREE.Color("#6a4c9c"), ash = new THREE.Color("#9c97ab"), bone = new THREE.Color("#d9d3e6");
 const unit = new THREE.Vector3();
 const body = faceted(geometry, (centre, colour) => {
  unit.copy(centre).normalize();
  const r = ridge(unit);
  colour.copy(deep).lerp(violet, smooth(-0.6, 0.5, r)).lerp(ash, smooth(0.55, 0.95, r));
  if (wobble(unit, 7, 4) > 0.62) colour.lerp(bone, 0.7); // alguna luz pálida
  colour.multiplyScalar(0.9 + random() * 0.2);
 });
 // Colinas enroscadas: un tubo que sube, se dobla y se enrosca sobre sí mismo.
 const hook = (turn, tilt, size) => {
  const curl = tube([[0, 0.9, 0], [0.04, 1.2, 0], [0.16, 1.44, 0], [0.36, 1.56, 0], [0.54, 1.47, 0], [0.56, 1.3, 0], [0.45, 1.24, 0], [0.4, 1.32, 0]], (t) => 0.2 * (1 - t) ** 1.2 + 0.018, { sides: 6, segments: 16 });
  curl.scale(size, size, size).rotateZ(tilt).rotateY(turn);
  return faceted(curl, (centre, colour) => colour.copy(deep).lerp(violet, smooth(0.9, 1.5, centre.length())).multiplyScalar(0.9 + random() * 0.2));
 };
 const whole = mergeGeometries([body, hook(0.4, 0.25, 1), hook(2.7, -1.1, 0.72), hook(4.6, 1.9, 0.55)]);
 whole.computeBoundingSphere();
 return whole;
}

// The Cosmic Lab: alienígena. Colores que no son de aquí, bultos, vainas que
// brillan y zarcillos.
export function createAlienWorld() {
 const random = randomFrom(0.83);
 const geometry = new THREE.IcosahedronGeometry(1, 9);
 const points = geometry.attributes.position;
 const point = new THREE.Vector3();
 const lumps = (p) => wobble(p, 2.1, 9) * 0.11 + wobble(p, 5.3, 3) * 0.035;
 for (let i = 0; i < points.count; i++) {
  point.fromBufferAttribute(points, i).normalize();
  point.multiplyScalar(1 + lumps(point));
  points.setXYZ(i, point.x, point.y, point.z);
 }
 const teal = new THREE.Color("#12a89a"), magenta = new THREE.Color("#c13fd0"), acid = new THREE.Color("#b9f24a"), ink = new THREE.Color("#2b1d5e");
 const unit = new THREE.Vector3();
 const body = faceted(geometry, (centre, colour) => {
  unit.copy(centre).normalize();
  const band = wobble(unit, 2.6, 6), vein = Math.abs(wobble(unit, 6.5, 1));
  colour.copy(teal).lerp(magenta, smooth(-0.05, 0.4, band)).lerp(acid, smooth(0.3, 0.62, -band));
  if (vein < 0.06) colour.lerp(ink, 0.75); // venas oscuras
  colour.multiplyScalar(0.9 + random() * 0.2);
 });
 const parts = [body];
 // Vainas: medio hundidas, repartidas por toda la esfera.
 const PODS = 9;
 for (let i = 0; i < PODS; i++) {
  const y = 1 - ((i + 0.5) / PODS) * 2, angle = i * 2.39996, ring = Math.sqrt(1 - y * y);
  const size = 0.1 + random() * 0.09;
  const pod = new THREE.IcosahedronGeometry(size, 1);
  pod.translate(Math.cos(angle) * ring * 1.02, y * 1.02, Math.sin(angle) * ring * 1.02);
  parts.push(faceted(pod, (_, colour) => colour.set(i % 3 ? "#ffb347" : "#fff27a").multiplyScalar(0.9 + random() * 0.2)));
 }
 // Zarcillos que salen y se enroscan.
 [[0.6, 0.5], [3.4, -0.9], [5.0, 2.3]].forEach(([turn, tilt], i) => {
  const arm = tube([[0, 0.95, 0], [0.1, 1.2, 0.05], [0.3, 1.36, 0.02], [0.44, 1.3, -0.1], [0.42, 1.18, -0.2], [0.33, 1.16, -0.12]], (t) => 0.09 * (1 - t) + 0.012, { sides: 5, segments: 12 });
  arm.scale(1 - i * 0.15, 1 - i * 0.15, 1 - i * 0.15).rotateZ(tilt).rotateY(turn);
  parts.push(faceted(arm, (_, colour) => colour.copy(magenta).lerp(ink, 0.45).multiplyScalar(0.9 + random() * 0.2)));
 });
 const whole = mergeGeometries(parts);
 whole.computeBoundingSphere();
 return whole;
}
