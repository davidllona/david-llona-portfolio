import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../experience/Instances";
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
const WATER_SHADER = {
 vertexShader: /* glsl */ `
  varying vec2 vPos;
  void main() {
   vPos = position.xz;
   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,
 fragmentShader: /* glsl */ `
  uniform vec3 uWaterShallow;
  uniform vec3 uWaterDeep;
  uniform float uTime;
  uniform vec3 uLake; // x, z, radio
  uniform float uSpace;
  varying vec2 vPos;

  float shoreRadius(float a) {
   return 44.0 + 3.0 * sin(3.0 * a) + 2.0 * sin(5.0 * a + 1.0);
  }

  void main() {
   float r = length(vPos);
   float a = atan(vPos.y, vPos.x);
   // Distancia a la orilla, positiva dentro del agua (mar o lago).
   float sea = r - (shoreRadius(a) - 1.45);
   float lake = (uLake.z - 1.25) - distance(vPos, uLake.xy);
   float d = max(sea, lake);
   if (d < -0.6) discard;

   float depth = clamp(d / 10.0, 0.0, 1.0);
   vec3 color = mix(uWaterShallow, uWaterDeep, depth);

   // Líneas de espuma que se alejan de la orilla y se desvanecen.
   float wave = fract(d * 0.36 - uTime * 0.13 + 0.06 * sin(a * 9.0));
   float line = smoothstep(0.0, 0.05, wave) * (1.0 - smoothstep(0.05, 0.13, wave));
   float foam = line * (1.0 - smoothstep(0.6, 6.0, d));
   // Borde de espuma pegado a la orilla, que respira.
   foam = max(foam, 1.0 - smoothstep(0.0, 0.24, d + 0.07 * sin(uTime * 1.6 + a * 24.0)));

   color = mix(color, vec3(1.0), foam * 0.9);
   float alpha = max(mix(0.6, 0.93, depth), foam);
   // El mar se funde con el horizonte: desde lejos, el planeta parece redondo.
   alpha *= 1.0 - smoothstep(105.0, 170.0, r);
   // Desde la nave, el mar se recoge alrededor de la isla y deja ver el espacio.
   alpha *= 1.0 - uSpace * smoothstep(58.0, 92.0, r);
   gl_FragColor = vec4(color, alpha);
  }`,
};

function Water() {
 const geometry = useMemo(() => new THREE.CircleGeometry(175, 96).rotateX(-Math.PI / 2), []);
 const material = useMemo(
  () =>
   new THREE.ShaderMaterial({
    ...WATER_SHADER,
    transparent: true,
    depthWrite: false,
    uniforms: {
     uWaterShallow: uniforms.uWaterShallow,
     uWaterDeep: uniforms.uWaterDeep,
     uTime: uniforms.uTime,
     uSpace: uniforms.uSpace,
     uLake: { value: new THREE.Vector3(LAKE.x, LAKE.z, LAKE.r) },
    },
   }),
  [],
 );
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
