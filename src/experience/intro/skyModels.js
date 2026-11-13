import * as THREE from "three";
import { attribute, normalWorld, vec3 } from "three/tsl";
import { randomFrom } from "../../worlds/living/kit/geometry";
import { unlit } from "../materials";

// Lo que se ve en el cielo de la bienvenida: la luna, el planeta al que se va a
// aterrizar (The Living World, visto desde lejos), sus nubes y el trazo de las
// estrellas fugaces.

// Ruido suave y repetible sobre la esfera (sumas de senos), de −1 a 1.
const wobble = (p, scale, seed = 0) => {
 const x = p.x * scale + seed, y = p.y * scale + seed * 1.7, z = p.z * scale - seed;
 return (Math.sin(x * 1.3 + y * 0.7) + Math.sin(y * 1.9 - z * 1.1 + 1.3) + Math.sin(z * 1.6 + x * 0.9 + 2.1) + Math.sin((x + y + z) * 0.8)) / 4;
};
const smooth = (a, b, x) => {
 const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
 return t * t * (3 - 2 * t);
};

// Material de un astro: su color (por vértice) con la luz de un sol fijo en el
// mundo. La luz se calcula al dibujar, no va pintada en el modelo: así el astro
// puede girar y su lado iluminado se queda donde está.
//  · light: de dónde viene la luz; ambient: lo que se ve del lado en sombra;
//    contrast: por encima de 1, las caras inclinadas se oscurecen antes (hace
//    que el relieve se lea también de cara a la luz).
export function celestial(light, { ambient = 0.2, strength = 0.85, contrast = 1 } = {}) {
 const material = unlit({ transparent: true, fog: false, toneMapped: false });
 const towards = new THREE.Vector3(...light).normalize();
 const facing = normalWorld.dot(vec3(towards.x, towards.y, towards.z)).max(0);
 const lit = contrast === 1 ? facing : facing.pow(contrast);
 material.colorNode = attribute("color", "vec3").mul(lit.mul(strength).add(ambient));
 return material;
}

// Pinta cada cara de un color (función del centro de la cara) y deja normales planas.
function paintFaces(geometry, colourOf) {
 const points = geometry.attributes.position;
 const colors = new Float32Array(points.count * 3);
 const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), centre = new THREE.Vector3();
 const colour = new THREE.Color();
 for (let i = 0; i < points.count; i += 3) {
  a.fromBufferAttribute(points, i);
  b.fromBufferAttribute(points, i + 1);
  c.fromBufferAttribute(points, i + 2);
  centre.copy(a).add(b).add(c).divideScalar(3);
  colourOf(centre, colour, i / 3);
  for (let k = 0; k < 3; k++) colour.toArray(colors, (i + k) * 3);
 }
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 geometry.deleteAttribute("uv");
 geometry.computeVertexNormals(); // sin índices: una normal por cara
 return geometry;
}

// La luna: facetada, con mares oscuros y dos docenas de cráteres de tamaños
// distintos (fondo llano y hundido, pared empinada, labio que sobresale y
// brilla). El relieve es hondo a propósito: de cara a la luz solo se lee lo
// que inclina mucho las caras.
export function createMoon() {
 const random = randomFrom(0.61);
 const geometry = new THREE.IcosahedronGeometry(1, 18);
 const points = geometry.attributes.position;
 // Repartidos por igual por toda la esfera (gira despacio y no debe quedar
 // ninguna cara lisa): espiral de Fibonacci con algo de desorden. Tres
 // grandes, una docena de medianos y el resto pequeños, pero ninguno tan
 // pequeño que no quepa en las caras.
 const COUNT = 38;
 const craters = Array.from({ length: COUNT }, (_, i) => {
  const z = 1 - ((i + 0.5) / COUNT) * 2 + (random() - 0.5) * 0.05, angle = i * 2.39996 + (random() - 0.5) * 0.5, ring = Math.sqrt(1 - z * z);
  const r = i % 13 === 6 ? 0.25 + random() * 0.06 : i % 3 === 0 ? 0.15 + random() * 0.06 : 0.085 + random() * 0.04;
  // Hondura en radios de luna: la mitad de su radio, con tope (antes, 0,095 el mayor).
  return { centre: new THREE.Vector3(Math.cos(angle) * ring, z, Math.sin(angle) * ring), r, depth: Math.min(0.12, r * 0.5) };
 });
 const point = new THREE.Vector3();
 // Perfil de un cráter a una distancia d (en radios del cráter): fondo llano,
 // pared empinada y, fuera, un labio que sobresale. De 1 (fondo) a −0,5 (labio).
 const profile = (d) => (d < 1 ? 1 - smooth(0.42, 1, d) * 1.5 : -0.5 * (1 - smooth(1, 1.4, d)));
 // Cuánto hunde (positivo) o levanta (negativo) el relieve en un punto, y
 // cuánto de cráter hay ahí (para el color), de 1 a −0,5.
 const dentAt = (p, out) => {
  let dent = 0, shape = 0, nearest = Infinity;
  for (const crater of craters) {
   const d = p.distanceTo(crater.centre) / crater.r;
   if (d >= 1.4 || d >= nearest) continue;
   nearest = d;
   shape = profile(d);
   dent = shape * crater.depth;
  }
  if (out) out.shape = shape;
  return dent;
 };
 for (let i = 0; i < points.count; i++) {
  point.fromBufferAttribute(points, i).normalize();
  const relief = wobble(point, 3.1, 2) * 0.014 + wobble(point, 9.5, 5) * 0.006;
  point.multiplyScalar(1 - dentAt(point) + relief);
  points.setXYZ(i, point.x, point.y, point.z);
 }
 // El llano no llega al blanco: así el labio de los cráteres destaca también
 // en la cara iluminada.
 const high = new THREE.Color("#ced5ea"), mare = new THREE.Color("#8792b8"), floor = new THREE.Color("#5b668f"), lip = new THREE.Color("#ffffff");
 const unit = new THREE.Vector3(), at = { shape: 0 };
 return paintFaces(geometry, (centre, colour) => {
  unit.copy(centre).normalize();
  dentAt(unit, at);
  colour.copy(high).lerp(mare, smooth(0.0, 0.3, wobble(unit, 1.5, 7) + wobble(unit, 3.4, 3) * 0.35));
  if (at.shape > 0) colour.lerp(floor, Math.min(1, at.shape * 0.85));
  else if (at.shape < 0) colour.lerp(lip, Math.min(1, -at.shape * 2));
  colour.multiplyScalar(0.94 + random() * 0.12);
 });
}

// The Living World desde lejos: mar de dos azules, costa de arena, prados,
// bosque y alguna loma, con el relieve levantado sobre el mar.
export function createGlobe() {
 const random = randomFrom(0.37);
 const geometry = new THREE.IcosahedronGeometry(1, 11);
 const points = geometry.attributes.position;
 const heightAt = (p) => wobble(p, 1.35, 5) + wobble(p, 2.9, 1) * 0.45 + wobble(p, 6.2, 8) * 0.16 - 0.06;
 const point = new THREE.Vector3();
 for (let i = 0; i < points.count; i++) {
  point.fromBufferAttribute(points, i).normalize();
  point.multiplyScalar(1 + Math.max(0, heightAt(point)) * 0.07);
  points.setXYZ(i, point.x, point.y, point.z);
 }
 const deep = new THREE.Color("#1f5aa6"), shallow = new THREE.Color("#3fa0cf"), sand = new THREE.Color("#ecd9a0");
 const meadow = new THREE.Color("#63b858"), forest = new THREE.Color("#3a8d4b"), hill = new THREE.Color("#9db564");
 const unit = new THREE.Vector3();
 return paintFaces(geometry, (centre, colour) => {
  unit.copy(centre).normalize();
  const h = heightAt(unit);
  if (h < 0) colour.copy(deep).lerp(shallow, smooth(-0.22, 0, h));
  else if (h < 0.035) colour.copy(sand);
  else {
   colour.copy(meadow).lerp(forest, smooth(0, 0.5, wobble(unit, 4.3, 12) + 0.15));
   colour.lerp(hill, smooth(0.3, 0.55, h));
  }
  colour.multiplyScalar(0.93 + random() * 0.14);
 });
}

// Nubes del planeta: los trozos de una esfera algo mayor donde «hay nube».
export function createClouds() {
 const source = new THREE.IcosahedronGeometry(1.07, 9);
 const points = source.attributes.position;
 const kept = [];
 const centre = new THREE.Vector3(), corner = new THREE.Vector3();
 for (let i = 0; i < points.count; i += 3) {
  centre.set(0, 0, 0);
  for (let k = 0; k < 3; k++) centre.add(corner.fromBufferAttribute(points, i + k));
  centre.divideScalar(3).normalize();
  // Bandas alargadas de este a oeste, no manchas redondas.
  const cover = wobble(new THREE.Vector3(centre.x * 0.7, centre.y * 2.6, centre.z * 0.7), 2.1, 4) + wobble(centre, 5.5, 9) * 0.3;
  if (cover > 0.4) for (let k = 0; k < 3; k++) kept.push(points.getX(i + k), points.getY(i + k), points.getZ(i + k));
 }
 source.dispose();
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(kept, 3));
 return paintFaces(geometry, (_, colour) => colour.set("#ffffff"));
}

// Trazo de estrella fugaz: una punta de flecha muy larga a lo largo de −X, con
// la cabeza en el origen. El color va de blanco en la cabeza a negro en la cola
// (se dibuja sumando luz: el negro no se ve).
export function createStreak() {
 const geometry = new THREE.BufferGeometry();
 //            cabeza     hombros (un poco atrás)        cola
 const xs = [0.25, -0.6, -0.6, -6, -6, -17];
 const ys = [0, 0.34, -0.34, 0.2, -0.2, 0];
 const shade = [1, 1, 1, 0.42, 0.42, 0];
 const positions = [], colors = [];
 const tint = new THREE.Color();
 for (let i = 0; i < xs.length; i++) {
  positions.push(xs[i], ys[i], 0);
  // Blanco en la cabeza, azulado al apagarse.
  tint.set("#bcd2ff").lerp(new THREE.Color("#ffffff"), shade[i]).multiplyScalar(shade[i]);
  colors.push(tint.r, tint.g, tint.b);
 }
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
 geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
 geometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4]);
 return geometry;
}
