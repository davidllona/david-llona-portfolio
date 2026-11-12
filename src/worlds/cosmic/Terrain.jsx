import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../experience/Instances";
import { atan, float, fract, max, mix, positionWorld, sin, smoothstep, step, vec2, vec3 } from "three/tsl";
import { unlit } from "../../experience/materials";
import { uniforms } from "../../experience/theme";
import { LAKE, SCATTER, WATER_LEVEL, terrainHeight } from "./layout";

// Ruido de valores 2D, suave y determinista: manchas de color del terreno.
function noise(x, z) {
 const hash = (ix, iz) => {
  const v = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
  return v - Math.floor(v);
 };
 const x0 = Math.floor(x), z0 = Math.floor(z);
 const tx = x - x0, tz = z - z0;
 const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
 const top = hash(x0, z0) * (1 - sx) + hash(x0 + 1, z0) * sx;
 const bottom = hash(x0, z0 + 1) * (1 - sx) + hash(x0 + 1, z0 + 1) * sx;
 return top * (1 - sz) + bottom * sz;
}

const GROUND_RADIUS = 64;
const GROUND = {
 soil: ["#f29b55", "#e98548", "#f6ab62"],
 beach: "#ffd9a3",
 wet: "#d99a72",
 seabed: "#b27f78",
};

// El suelo: una malla facetada, con un color por triángulo según lo que hay ahí
// (tierra, playa, arena mojada o fondo).
function createGround() {
 const SIZE = 150;
 const base = new THREE.PlaneGeometry(SIZE, SIZE, 120, 120).rotateX(-Math.PI / 2);
 const square = base.toNonIndexed();
 base.dispose();
 // Se recorta en redondo: fuera de este radio solo hay mar, y desde la nave el
 // planeta debe verse como una isla redonda, no como un cuadrado.
 const kept = [];
 const corners = square.attributes.position.array;
 for (let i = 0; i < corners.length; i += 9) {
  const x = (corners[i] + corners[i + 3] + corners[i + 6]) / 3;
  const z = (corners[i + 2] + corners[i + 5] + corners[i + 8]) / 3;
  if (Math.hypot(x, z) < GROUND_RADIUS) kept.push(...corners.subarray(i, i + 9));
 }
 square.dispose();
 const flat = new THREE.BufferGeometry();
 flat.setAttribute("position", new THREE.Float32BufferAttribute(kept, 3));
 const position = flat.attributes.position;
 for (let i = 0; i < position.count; i++) {
  position.setY(i, terrainHeight(position.getX(i), position.getZ(i)));
 }

 const colors = new Float32Array(position.count * 3);
 const palette = Object.fromEntries(
  Object.entries(GROUND).map(([key, value]) => [key, Array.isArray(value) ? value.map((c) => new THREE.Color(c)) : new THREE.Color(value)]),
 );
 const color = new THREE.Color();
 for (let i = 0; i < position.count; i += 3) {
  const x = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
  const z = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
  const height = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3;
  if (height < WATER_LEVEL - 0.35) color.copy(palette.seabed);
  else if (height < WATER_LEVEL + 0.05) color.copy(palette.wet);
  else if (height < -0.02) color.copy(palette.beach);
  else {
   // Manchas grandes de dos tonos y algún triángulo suelto más claro.
   const patch = noise(x * 0.09, z * 0.09) * 0.7 + noise(x * 0.35 + 9, z * 0.35) * 0.3;
   color.copy(palette.soil[patch > 0.56 ? 1 : 0]);
   if (noise(x * 1.7, z * 1.7) > 0.86) color.copy(palette.soil[2]);
  }
  for (let k = 0; k < 3; k++) color.toArray(colors, (i + k) * 3);
 }
 flat.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 flat.computeVertexNormals();
 return flat;
}

// Agua estilizada: color según la distancia a la orilla, un borde de espuma y
// líneas que se alejan de la costa. La forma de la isla se repite aquí.
// Material del agua (nodos TSL): tono por distancia a la orilla, líneas de
// espuma que se alejan y borde que respira.
function createWaterMaterial() {
 const { uTime, uWaterShallow, uWaterDeep, uSpace } = uniforms;
 const pos = positionWorld.xz;
 const r = pos.length();
 const a = atan(pos.y, pos.x);
 const shore = sin(a.mul(3)).mul(3).add(sin(a.mul(5).add(1)).mul(2)).add(44);
 // Distancia a la orilla, positiva dentro del agua (mar o lago).
 const d = max(r.sub(shore.sub(1.45)), float(LAKE.r - 1.25).sub(pos.sub(vec2(LAKE.x, LAKE.z)).length()));
 const depth = d.div(10).clamp(0, 1);
 const wave = fract(d.mul(0.36).sub(uTime.mul(0.13)).add(sin(a.mul(9)).mul(0.06)));
 const line = smoothstep(0, 0.05, wave).mul(smoothstep(0.13, 0.05, wave));
 let foam = line.mul(smoothstep(6, 0.6, d));
 foam = max(foam, smoothstep(0.24, 0, d.add(sin(uTime.mul(1.6).add(a.mul(24))).mul(0.07))));
 const material = unlit({ transparent: true, depthWrite: false });
 material.colorNode = mix(mix(uWaterShallow, uWaterDeep, depth), vec3(1), foam.mul(0.9));
 material.opacityNode = max(mix(0.6, 0.93, depth), foam)
  .mul(smoothstep(170, 105, r))
  .mul(uSpace.mul(smoothstep(58, 92, r)).oneMinus())
  .mul(step(-0.6, d));
 return material;
}

function Water() {
 const geometry = useMemo(() => new THREE.CircleGeometry(175, 96).rotateX(-Math.PI / 2), []);
 const material = useMemo(createWaterMaterial, []);
 useEffect(
  () => () => {
   geometry.dispose();
   material.dispose();
  },
  [geometry, material],
 );
 return <mesh geometry={geometry} material={material} position-y={WATER_LEVEL} />;
}

// Losas de los caminos y rocas.
function Tiles() {
 const geometry = useMemo(() => new THREE.BoxGeometry(1.15, 0.1, 1.15), []);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ color: "#ffe3d6", flatShading: true }), []);
 const items = useMemo(
  () => SCATTER.tiles.map((t) => ({ position: [t.x, 0.03, t.z], rotation: [0, t.turn, 0], scale: [t.scale, 1, t.scale] })),
  [],
 );
 return <Instances geometry={geometry} material={material} items={items} receiveShadow />;
}

function Rocks() {
 const geometry = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true }), []);
 const items = useMemo(
  () =>
   SCATTER.rocks.map((r) => ({
    position: [r.x, r.scale * 0.32, r.z],
    rotation: [r.seed * 2, r.turn, r.seed],
    scale: [r.scale, r.scale * 0.72, r.scale * 0.9],
    color: r.seed > 0.5 ? "#9a86c0" : "#7f6aa8",
   })),
  [],
 );
 return <Instances geometry={geometry} material={material} items={items} colored castShadow receiveShadow />;
}

export function Terrain() {
 const ground = useMemo(createGround, []);
 useEffect(() => () => ground.dispose(), [ground]);

 return (
  <>
   <mesh geometry={ground} receiveShadow>
    <meshLambertMaterial vertexColors flatShading />
   </mesh>
   <Water />
   <Tiles />
   <Rocks />
  </>
 );
}
