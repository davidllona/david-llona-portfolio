import { useEffect, useMemo } from "react";
import { Staged } from "../Staged";
import * as THREE from "three";
import { attribute, color, mix, positionLocal, smoothstep, texture } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { Instances } from "../../experience/Instances";
import { groundColor } from "./groundColor";
import { randomFrom } from "./kit/geometry";
import { BRIDGES, PAD, PATHS, PLAZA, bridgeArc, bridgeSlope, groundHeight, noise2, settle, surface } from "./layout";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SPAN, terrainTextures } from "./terrainData";
import { noiseTexture } from "../../experience/environment/noise";
import { Water } from "./water/Water";
import { Waterfall } from "./water/Waterfall";

const GROUND_RADIUS = 64;

// El suelo: una malla facetada, coloreada según lo que hay en cada punto.
function createGround() {
 const SEGMENTS = 150, SIZE = 132;
 const side = SEGMENTS + 1;
 // Altura y tipo de suelo de cada vértice de la rejilla, una sola vez.
 const xs = new Float32Array(side), heights = new Float32Array(side * side), kinds = new Array(side * side);
 for (let i = 0; i < side; i++) xs[i] = (i / SEGMENTS - 0.5) * SIZE;
 for (let row = 0; row < side; row++) {
  for (let column = 0; column < side; column++) {
   if (Math.hypot(xs[column], xs[row]) > GROUND_RADIUS + 1.5) continue; // fuera solo hay mar
   const i = row * side + column;
   heights[i] = groundHeight(xs[column], xs[row]);
   // (Sin los caminos: esos los pinta el material, con borde nítido.)
   kinds[i] = surface(xs[column], xs[row], false);
  }
 }
 // Dos triángulos por casilla, sin compartir vértices (para el facetado y el
 // color por cara). Se recorta en redondo: desde la nave debe verse una isla.
 const positions = [], colors = [];
 const tone = new THREE.Color();
 const triangle = (a, b, c) => {
  const cx = (xs[a[0]] + xs[b[0]] + xs[c[0]]) / 3, cz = (xs[a[1]] + xs[b[1]] + xs[c[1]]) / 3;
  if (Math.hypot(cx, cz) >= GROUND_RADIUS) return;
  // El tono (mancha grande, y algún triángulo suelto distinto) es uno por
  // cara; el tipo de suelo es el de cada esquina: así el borde entre hierba,
  // camino y arena se funde dentro del triángulo en vez de hacer dientes.
  const odd = noise2(cx * 2.1, cz * 2.1) > 0.84;
  for (const [column, row] of [a, b, c]) {
   const i = row * side + column;
   positions.push(xs[column], heights[i], xs[row]);
   groundColor(tone, xs[column], xs[row], { at: [cx, cz], odd, kind: kinds[i], height: heights[i] });
   colors.push(tone.r, tone.g, tone.b);
  }
 };
 for (let row = 0; row < SEGMENTS; row++) {
  for (let column = 0; column < SEGMENTS; column++) {
   triangle([column, row], [column, row + 1], [column + 1, row]);
   triangle([column, row + 1], [column + 1, row + 1], [column + 1, row]);
  }
 }
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
 geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
 geometry.computeVertexNormals();
 return geometry;
}

// ── Puente y adoquines ──────────────────────────────────────────────────────────
function Bridges() {
 const plank = useMemo(() => new THREE.BoxGeometry(1, 0.12, 1), []);
 const wood = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true }), []);
 const items = useMemo(() => {
  const list = [];
  for (const bridge of BRIDGES) {
   if (bridge.model) continue; // (el del jardín es un modelo)
   const [ax, az] = bridge.from;
   const [bx, bz] = bridge.to;
   const length = Math.hypot(bx - ax, bz - az);
   const yaw = Math.atan2(-(bz - az), bx - ax);
   const count = Math.round(length / 0.62);
   for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const y = bridgeArc(bridge, t);
    const slope = Math.atan(bridgeSlope(bridge, t) / length);
    // Tablones a lo ancho, siguiendo el arco.
    list.push({ position: [ax + (bx - ax) * t, y - 0.07, az + (bz - az) * t], rotation: [0, yaw, slope], scale: [0.54, 1, bridge.width + 0.5], color: i % 2 ? "#b9824f" : "#a87343" });
    // Postes de la barandilla, uno de cada dos tablones.
    if (i % 2 === 0) {
     for (const side of [-1, 1]) {
      const nx = (-(bz - az) / length) * side * (bridge.width / 2 + 0.2);
      const nz = ((bx - ax) / length) * side * (bridge.width / 2 + 0.2);
      list.push({ position: [ax + (bx - ax) * t + nx, y + 0.45, az + (bz - az) * t + nz], rotation: [0, yaw, 0], scale: [0.16, 9, 0.16], color: "#7d5233" });
     }
    }
   }
   // Pasamanos: dos largueros que siguen el arco por tramos.
   for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
     const t = (i + 0.5) / 6;
     const nx = (-(bz - az) / length) * side * (bridge.width / 2 + 0.2);
     const nz = ((bx - ax) / length) * side * (bridge.width / 2 + 0.2);
     const slope = Math.atan(bridgeSlope(bridge, t) / length);
     list.push({ position: [ax + (bx - ax) * t + nx, bridgeArc(bridge, t) + 0.95, az + (bz - az) * t + nz], rotation: [0, yaw, slope], scale: [length / 6 + 0.06, 1, 0.14], color: "#7d5233" });
    }
   }
  }
  return list;
 }, []);
 return <Instances name="puente" geometry={plank} material={wood} items={items} colored castShadow receiveShadow />; // (sigue el arco del puente, no el terreno)
}

// Piedras encajadas en la tierra a la salida de la plataforma del cohete: los
// primeros metros de cada camino que nace de ella. No son baldosas: cada una
// tiene su contorno (las celdas de un reparto de puntos descolocados), casan
// unas con otras con una junta fina y van a ras de suelo (asoman dos
// centímetros). Hacia fuera faltan cada vez más. En el resto de los caminos, tierra.
const STONE_TONES = ["#b9c0cb", "#a9b1bd", "#c6ccd5", "#9fa8b5", "#b2b7c0", "#bdb8b0"];
function createPadStones() {
 const random = randomFrom(0.713);
 const parts = [];
 const tone = new THREE.Color();
 for (const path of PATHS) {
  // Solo los caminos que arrancan junto a la plataforma.
  const [ax, az] = path[0];
  const [bx, bz] = path[1];
  if (Math.hypot(ax - PAD.x, az - PAD.z) > PAD.padRadius + 1.5) continue;
  const length = Math.hypot(bx - ax, bz - az);
  const dx = (bx - ax) / length, dz = (bz - az) / length;
  const REACH = 3.7, HALF = 0.98, STEP = 0.52, JOINT = 0.022;
  // Empieza donde acaba la losa de la plataforma, sea donde sea que arranque el camino.
  const start = PAD.padRadius + 0.05 - Math.hypot(ax - PAD.x, az - PAD.z);
  // Puntos descolocados: u a lo largo del camino, v a su través. Los de fuera
  // del camino no se dibujan, pero dan su contorno a los del borde.
  const seeds = [];
  for (let u = -STEP; u < REACH + STEP * 1.5; u += STEP) {
   for (let v = -HALF - STEP; v < HALF + STEP * 1.5; v += STEP) {
    const su = u + (random() - 0.5) * 0.4, sv = v + (random() - 0.5) * 0.4;
    const fade = su / REACH;
    seeds.push({ u: su, v: sv, real: su > 0.12 && su < REACH && Math.abs(sv) < HALF && random() > Math.max(0, fade - 0.5) * 1.7 });
   }
  }
  for (const seed of seeds) {
   if (!seed.real) continue;
   // Su celda: lo que queda más cerca de este punto que de ningún otro.
   let cell = [[seed.u - 1, seed.v - 1], [seed.u + 1, seed.v - 1], [seed.u + 1, seed.v + 1], [seed.u - 1, seed.v + 1]];
   for (const other of seeds) {
    if (other === seed || Math.hypot(other.u - seed.u, other.v - seed.v) > 1.6) continue;
    const nu = other.u - seed.u, nv = other.v - seed.v;
    const mu = (other.u + seed.u) / 2, mv = (other.v + seed.v) / 2;
    const side = ([u, v]) => (u - mu) * nu + (v - mv) * nv;
    const cut = [];
    cell.forEach((point, i) => {
     const next = cell[(i + 1) % cell.length];
     const a = side(point), b = side(next);
     if (a <= 0) cut.push(point);
     if (a * b < 0) cut.push([point[0] + ((next[0] - point[0]) * a) / (a - b), point[1] + ((next[1] - point[1]) * a) / (a - b)]);
    });
    cell = cut;
    if (cell.length < 3) break;
   }
   if (cell.length < 3) continue;
   const cu = cell.reduce((sum, p) => sum + p[0], 0) / cell.length, cv = cell.reduce((sum, p) => sum + p[1], 0) / cell.length;
   const toWorld = (u, v) => [ax + dx * (start + u) - dz * v, az + dz * (start + u) + dx * v];
   const [wx, wz] = toWorld(cu, cv);
   const spot = settle(wx, wz, 0.3, { relief: 0.07, embed: 0 });
   if (!spot) continue;
   const top = spot.y + 0.02 + random() * 0.012;
   const points = [];
   for (const [u, v] of cell) {
    // Encogida lo que mide la junta; la cara de arriba, un poco más (canto matado).
    const away = Math.hypot(u - cu, v - cv) || 1;
    const edge = (inset) => toWorld(cu + (u - cu) * (1 - inset / away), cv + (v - cv) * (1 - inset / away));
    const [x0, z0] = edge(JOINT), [x1, z1] = edge(JOINT + 0.035);
    points.push(new THREE.Vector3(x0, top - 0.1, z0), new THREE.Vector3(x0, top - 0.02, z0), new THREE.Vector3(x1, top, z1));
   }
   const stone = new ConvexGeometry(points);
   const normal = stone.attributes.normal;
   const colors = new Float32Array(normal.count * 3);
   tone.set(STONE_TONES[Math.floor(random() * STONE_TONES.length)]).multiplyScalar(0.94 + random() * 0.1);
   for (let i = 0; i < normal.count; i++) colors.set([tone.r, tone.g, tone.b].map((c) => c * (normal.getY(i) > 0.9 ? 1 : 0.7)), i * 3);
   stone.setAttribute("color", new THREE.BufferAttribute(colors, 3));
   parts.push(stone);
  }
 }
 const geometry = mergeGeometries(parts);
 parts.forEach((part) => part.dispose());
 return geometry;
}
function PadSlabs() {
 const geometry = useMemo(createPadStones, []);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true, vertexColors: true }), []);
 useEffect(
  () => () => {
   geometry.dispose();
   material.dispose();
  },
  [geometry, material],
 );
 return <mesh name="adoquín de la plataforma" geometry={geometry} material={material} receiveShadow />;
}

// El suelo se pinta con el color de cada vértice, salvo los caminos: esos se
// calculan en cada píxel a partir de la distancia a su borde (horneada en la
// textura del terreno), así que el borde sale nítido por grande que sea la
// malla. Tierra clara, más pisada en el centro, y un reborde oscuro y fino.
function createGroundMaterial() {
 const { color: map } = terrainTextures();
 const material = new MeshLambertNodeMaterial({ flatShading: true }) // (el color de vértice entra por `colorNode`: con `vertexColors` se multiplicaría dos veces);
 const at = positionLocal.xz;
 const lane = texture(map, at.div(SPAN).add(0.5)).a.sub(0.5).mul(4); // metros al borde; negativo = dentro
 // El borde tiembla un poco más de cerca de lo que da la textura.
 const edge = lane.add(texture(noiseTexture, at.mul(0.41)).r.sub(0.5).mul(0.14));
 const blotch = texture(noiseTexture, at.mul(0.06)).g;
 const earth = mix(color("#e2c692"), color("#f0dcae"), smoothstep(-0.25, -0.8, edge).mul(0.7).add(blotch.mul(0.3)));
 const rim = color("#b99a68");
 const inside = smoothstep(0.02, -0.02, edge);
 const border = smoothstep(0.02, -0.02, edge.sub(0.07)).mul(smoothstep(-0.16, -0.05, edge));
 material.colorNode = mix(attribute("color", "vec3"), mix(earth, rim, border), inside.max(border));
 return material;
}

export function Terrain() {
 const ground = useMemo(createGround, []);
 const soil = useMemo(createGroundMaterial, []);
 useEffect(
  () => () => {
   ground.dispose();
   soil.dispose();
  },
  [ground, soil],
 );
 return (
  <Staged>
   <mesh geometry={ground} material={soil} receiveShadow castShadow />
   <Water />
   <Waterfall />
   <Bridges />
   <PadSlabs />
  </Staged>
 );
}
