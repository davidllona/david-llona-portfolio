import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { lambert } from "../../experience/materials";
import { rig } from "../../experience/state";
import { REACH, createRandom, noiseAt, onSphere } from "./globe";
import { LIQUID_LEVEL, NEAR, edge, ground } from "./layout";
import { liquid } from "./materials";

// El suelo de The Cosmic Lab: el planeta entero en una sola rejilla en anillos
// alrededor del eje (la plataforma), fina donde se pisa y más abierta lejos.
// Facetado, con un color por cara: magenta en el llano, con vetas turquesa; a
// bandas turquesa, magenta y lima en el resto del planeta —como se ve desde la
// órbita de los otros mundos—. Debajo, una lámina de líquido brillante que
// asoma donde el terreno baja: las charcas del llano y los lagos de lejos.
const COARSE = { coarse: true }; // (ya viene en triángulos cortos: no hay que partirlo para curvarlo)
const tones = (list) => list.map((c) => new THREE.Color(c));
const PLAIN = tones(["#b83a8d", "#c84b9b", "#a83181", "#d55ea9"]);
const VEIN = tones(["#27b8a8", "#34cdb8"]);
const TEAL = new THREE.Color("#16a394"), MAGENTA = new THREE.Color("#c13fa6"), LIME = new THREE.Color("#b7e84e"), INK = new THREE.Color("#4f2a86"), BED = new THREE.Color("#0f8a88");
const smooth = (a, b, x) => {
 const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
 return t * t * (3 - 2 * t);
};

function createLand() {
 const AROUND = 156, FINE = 52, WIDE = 27;
 const hash = (i, j) => {
  const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return v - Math.floor(v);
 };
 const rings = [0.01];
 for (let j = 1; j <= FINE; j++) rings.push(j);
 for (let j = 1; j <= WIDE; j++) rings.push(FINE + (j / WIDE) * (REACH - 1.2 - FINE));
 const nodes = rings.map((d, j) =>
  Array.from({ length: AROUND }, (_, i) => {
   // (Los nudos, algo descolocados: no se ve la rejilla.)
   const loose = j > 0 && j < rings.length - 1 ? 0.5 : 0;
   const angle = ((i + (hash(i, j) - 0.5) * loose) / AROUND) * Math.PI * 2, r = d + (hash(i + 31, j + 17) - 0.5) * loose * (rings[Math.min(rings.length - 1, j + 1)] - d);
   const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
   return [x, ground(x, z), z];
  }),
 );
 const near = [], far = [];
 for (let j = 0; j < rings.length - 1; j++) {
  for (let i = 0; i < AROUND; i++) {
   const a = nodes[j][i], b = nodes[j][(i + 1) % AROUND], c = nodes[j + 1][i], d = nodes[j + 1][(i + 1) % AROUND];
   const into = edge((a[0] + d[0]) / 2, (a[2] + d[2]) / 2) > -NEAR ? near : far;
   for (const tri of (i + j) % 2 ? [[a, c, b], [b, c, d]] : [[a, c, d], [a, d, b]]) for (const point of tri) into.push(point[0], point[1], point[2]);
  }
 }
 return { near: paint(near), far: paint(far) };
}
// Un color por cara.
function paint(triangles) {
 const geometry = new THREE.BufferGeometry();
 const position = new THREE.Float32BufferAttribute(triangles, 3);
 geometry.setAttribute("position", position);
 const random = createRandom(20261321);
 const colors = new Float32Array(position.count * 3);
 const color = new THREE.Color(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3(), p = [0, 0, 0];
 for (let i = 0; i < position.count; i += 3) {
  a.fromBufferAttribute(position, i), b.fromBufferAttribute(position, i + 1), c.fromBufferAttribute(position, i + 2);
  normal.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
  if (normal.y < 0) {
   position.setXYZ(i + 1, c.x, c.y, c.z);
   position.setXYZ(i + 2, b.x, b.y, b.z);
   normal.negate();
  }
  const x = (a.x + b.x + c.x) / 3, y = (a.y + b.y + c.y) / 3, z = (a.z + b.z + c.z) / 3;
  onSphere(x, z, p);
  const inside = smooth(-4, 1.5, edge(x, z));
  // El llano: magenta a manchas, con vetas turquesa.
  const patch = noiseAt(p, 0.16, 3) * 0.7 + noiseAt(p, 0.45, 9) * 0.3;
  color.copy(PLAIN[patch > 0.6 ? 1 : patch < 0.4 ? 2 : 0]);
  if (random() > 0.92) color.copy(PLAIN[3]);
  const vein = Math.abs(noiseAt(p, 0.11, 21) - 0.5);
  if (vein < 0.022) color.copy(VEIN[random() > 0.5 ? 1 : 0]);
  if (inside < 1) {
   // El resto del planeta: bandas anchas de turquesa y magenta, y calvas lima en lo alto.
   const band = noiseAt(p, 0.035, 40) * 2 - 1;
   const wild = TEAL.clone().lerp(MAGENTA, smooth(-0.1, 0.25, band)).lerp(LIME, smooth(2.2, 4.2, y) * smooth(0.1, -0.3, band));
   if (normal.y < 0.82) wild.lerp(INK, 0.5);
   color.lerp(wild, 1 - inside);
  }
  if (y < LIQUID_LEVEL + 0.15) color.lerp(BED, smooth(LIQUID_LEVEL + 0.15, LIQUID_LEVEL - 0.3, y));
  color.multiplyScalar(0.93 + random() * 0.14);
  for (let k = 0; k < 3; k++) color.toArray(colors, (i + k) * 3);
 }
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}

export function Terrain() {
 const land = useMemo(createLand, []);
 const soil = useMemo(() => lambert(), []);
 const pool = useMemo(() => new THREE.RingGeometry(0.3, REACH - 0.6, 96, 44).rotateX(-Math.PI / 2), []);
 const juice = useMemo(liquid, []);
 const far = useRef(null);
 useEffect(
  () => () => {
   for (const one of [land.near, land.far, soil, pool, juice]) one.dispose();
  },
  [land, soil, pool, juice],
 );
 // Lo que queda lejos del llano solo existe en vuelo.
 useFrame(() => {
  far.current.visible = rig.space > 0.004 || rig.bend > 0;
 });
 return (
  <>
   <mesh name="suelo" geometry={land.near} material={soil} receiveShadow frustumCulled={false} userData={COARSE} />
   <mesh ref={far} name="suelo, el resto del planeta" geometry={land.far} material={soil} frustumCulled={false} userData={COARSE} visible={false} />
   <mesh name="líquido" geometry={pool} material={juice} position-y={LIQUID_LEVEL} frustumCulled={false} userData={COARSE} />
  </>
 );
}
