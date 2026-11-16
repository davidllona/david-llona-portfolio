import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { attribute, float, mix, vec3 } from "three/tsl";
import { aboutCard } from "../../content/about";
import { withSeeThrough } from "../../experience/environment/seeThrough";
import { useInteractable } from "../../experience/interact";
import { addWarmSource } from "../../experience/lightSources";
import { lambert } from "../../experience/materials";
import { emit } from "../../experience/state";
import { clock, uniforms } from "../../experience/theme";
import { Smoke } from "./Details";
import { BUILDINGS, GREENHOUSE, HOUSE, STORY_DOOR, ground } from "./layout";
import { glass, pool, solid } from "./materials";
import { STONE, WARM, createGreenhouse } from "./models";
import { createTowerExtras } from "./plants";
import { merge, piece } from "../living/kit/geometry";

// Los edificios de la isla. Salen de modelos descargados (docs/CREDITOS.md),
// ya convertidos a una malla sin materiales ni texturas, con el color en los
// vértices: los de este mundo, con tools/assets/twisted.py; el observatorio y
// la casa del árbol son los mismos archivos del mundo 1. Aquí se les da la
// noche: el color se apaga y se lleva al morado, y lo que la conversión marcó
// como cristal (ventanas, la esfera del reloj) se enciende en cálido.
const url = (site) => (site.from === "living" ? `/models/living/buildings/${site.model}.glb` : `/models/twisted/${site.model}.glb`);
const GLASS_RGB = [1.0, 0.82, 0.5]; // (el color exacto con que la conversión pinta los cristales)
const GLASS = vec3(...GLASS_RGB);

// `veil`: cuánto se lleva el color original al morado de la noche (los que ya
// vienen pintados de noche —la torre, la casita—, nada); `saturation`: cuánto
// de su color propio conserva (el observatorio, rojo de origen, casi nada).
function createNightMaterial(veil = 1, saturation = 0.42) {
 const material = lambert({ side: THREE.DoubleSide });
 const tone = attribute("color", "vec3");
 const window = float(1).sub(tone.sub(GLASS).length().mul(30).clamp(0, 1)); // 1 solo en el color de los cristales
 // De día a noche de cuento: media saturación y un velo morado.
 const grey = tone.dot(vec3(0.3, 0.5, 0.2));
 const night = mix(tone, mix(vec3(grey), tone, saturation).mul(vec3(0.78, 0.6, 1.08)).mul(0.95), veil);
 material.colorNode = mix(night, vec3(0.05, 0.03, 0.02), window);
 material.emissiveNode = vec3(1.25, 0.82, 0.4).mul(window).mul(uniforms.uGlow);
 return withSeeThrough(material);
}

// Geometría de un modelo convertido (una malla, con el color en los vértices).
function useConverted(site) {
 const { scene } = useGLTF(url(site));
 const geometry = useMemo(() => {
  let source = null;
  scene.traverse((node) => node.isMesh && (source = node.geometry));
  const made = new THREE.BufferGeometry();
  made.setAttribute("position", source.attributes.position);
  made.setIndex(source.index);
  // (El color viene con cuatro componentes y normalizado: se queda en tres, en coma flotante.)
  const from = source.attributes.color;
  const colors = new Float32Array(from.count * 3);
  for (let i = 0; i < from.count; i++) colors.set([from.getX(i), from.getY(i), from.getZ(i)], i * 3);
  made.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  made.computeVertexNormals();
  made.computeBoundingSphere();
  return made;
 }, [scene]);
 useEffect(() => () => geometry.dispose(), [geometry]);
 return geometry;
}

function Building({ name, site, material, children }) {
 const geometry = useConverted(site);
 return (
  <group name={name} userData={{ rests: 0 }} position={[site.x, ground(site.x, site.z) - 0.05, site.z]} rotation-y={site.turn}>
   <mesh geometry={geometry} material={material} scale={site.size} castShadow receiveShadow />
   {children}
  </group>
 );
}

// ── La torre del reloj ──────────────────────────────────────────────────────
// La torre de Envato, de cuento: algo inclinada, con la aguja torcida, dos
// torrecillas vencidas, un balcón bajo la esfera y ventanas encendidas (ver
// `createTowerExtras`). Las agujas del reloj son propias y marcan la hora del
// visitante (la de su navegador; `?hora=` la fija, como en el primer mundo).
const LEAN = [-0.035, 0, 0.05];
function Tower({ site, material }) {
 const geometry = useConverted(site);
 const hands = useRef({ hour: null, minute: null });
 // Medidas de la torre, en metros: medio ancho y medio fondo a cada altura, alto y dónde está la esfera.
 const shape = useMemo(() => {
  const points = geometry.attributes.position, colors = geometry.attributes.color;
  const size = site.size, STEP = 0.25;
  const bands = new Map();
  const glass = { min: new THREE.Vector3(Infinity, Infinity, Infinity), max: new THREE.Vector3(-Infinity, -Infinity, -Infinity), sum: new THREE.Vector3(), n: 0 };
  let top = 0;
  const p = new THREE.Vector3();
  for (let i = 0; i < points.count; i++) {
   p.fromBufferAttribute(points, i).multiplyScalar(size);
   top = Math.max(top, p.y);
   const band = Math.round(p.y / STEP);
   const have = bands.get(band) ?? [0, 0];
   bands.set(band, [Math.max(have[0], Math.abs(p.x)), Math.max(have[1], Math.abs(p.z))]);
   if (Math.abs(colors.getX(i) - GLASS_RGB[0]) + Math.abs(colors.getY(i) - GLASS_RGB[1]) + Math.abs(colors.getZ(i) - GLASS_RGB[2]) < 0.04) {
    glass.min.min(p);
    glass.max.max(p);
    glass.sum.add(p);
    glass.n += 1;
   }
  }
  const measure = (y) => {
   for (let k = 0; k < 8; k++) for (const band of [Math.round(y / STEP) - k, Math.round(y / STEP) + k]) if (bands.has(band)) return bands.get(band);
   return [1.5, 1.5];
  };
  const centre = glass.sum.divideScalar(Math.max(1, glass.n));
  const face = { x: centre.x, y: (glass.min.y + glass.max.y) / 2, r: (glass.max.x - glass.min.x) / 2, front: centre.z >= 0 ? 1 : -1, z: centre.z >= 0 ? glass.max.z : glass.min.z };
  return { measure, top, face };
 }, [geometry, site.size]);
 const extras = useMemo(() => createTowerExtras(shape), [shape]);
 const lit = useMemo(() => glass(WARM), []);
 const handGeometry = useMemo(() => {
  const r = shape.face.r;
  const blade = (length, width) => new THREE.BoxGeometry(width, length, 0.05).translate(0, length / 2 - width, 0);
  return { hour: blade(r * 0.55, r * 0.09), minute: blade(r * 0.86, r * 0.06), pin: new THREE.CylinderGeometry(r * 0.08, r * 0.08, 0.08, 8).rotateX(Math.PI / 2) };
 }, [shape]);
 const handMaterial = useMemo(() => new THREE.MeshLambertMaterial({ color: "#1b1228" }), []);
 useEffect(
  () => () => {
   extras.body.dispose();
   extras.warm.dispose();
   lit.dispose();
   Object.values(handGeometry).forEach((one) => one.dispose());
   handMaterial.dispose();
  },
  [extras, lit, handGeometry, handMaterial],
 );
 useFrame(() => {
  // La hora del visitante: la aguja de las horas da una vuelta cada 12 h; la de los minutos, cada hora.
  const { hour } = clock();
  const minute = (hour % 1) * Math.PI * 2, hours = ((hour % 12) / 12) * Math.PI * 2;
  if (hands.current.hour) hands.current.hour.rotation.z = -hours;
  if (hands.current.minute) hands.current.minute.rotation.z = -minute;
  if (import.meta.env.DEV) window.__world.towerClock = { hour, hourAngle: hours, minuteAngle: minute }; // para las pruebas automáticas
 });
 const { face } = shape;
 return (
  <group name="torre" userData={{ rests: 0 }} position={[site.x, ground(site.x, site.z) - 0.05, site.z]} rotation-y={site.turn}>
   <group rotation={LEAN}>
    <mesh geometry={geometry} material={material} scale={site.size} castShadow receiveShadow />
    <mesh name="torre: aguja, torrecillas y balcón" geometry={extras.body} material={material} castShadow receiveShadow />
    <mesh geometry={extras.warm} material={lit.material} />
    {/* Agujas del reloj, sobre la esfera. */}
    <group position={[face.x, face.y, face.z + 0.06 * face.front]} rotation-y={face.front > 0 ? 0 : Math.PI}>
     <mesh ref={(node) => (hands.current.hour = node)} name="aguja de las horas" geometry={handGeometry.hour} material={handMaterial} position-z={0.02} />
     <mesh ref={(node) => (hands.current.minute = node)} name="aguja de los minutos" geometry={handGeometry.minute} material={handMaterial} position-z={0.05} />
     <mesh geometry={handGeometry.pin} material={handMaterial} position-z={0.06} />
    </group>
   </group>
  </group>
 );
}

// ── La casita ───────────────────────────────────────────────────────────────
// Lleva una chimenea de piedra (el modelo no trae) y, encima, humo.
const CASITA_CHIMNEY = [0.27, 0.46, -0.16]; // respecto a la casita, en veces su tamaño (x, base, z)
function chimneyTop(site) {
 const [cx, base, cz] = CASITA_CHIMNEY.map((v) => v * site.size);
 const tall = site.size * 0.42;
 const x = site.x + cx * Math.cos(site.turn) + cz * Math.sin(site.turn), z = site.z - cx * Math.sin(site.turn) + cz * Math.cos(site.turn);
 return [x, ground(site.x, site.z) - 0.05 + base + tall + 0.1, z];
}
function Chimney({ site, material }) {
 const model = useMemo(() => {
  const [cx, base, cz] = CASITA_CHIMNEY.map((v) => v * site.size), tall = site.size * 0.42;
  return merge([
   piece(new THREE.BoxGeometry(0.62, tall, 0.62), { bottom: STONE.dark, top: STONE.light, jitter: 0.03, vary: 0.12, position: [cx, base + tall / 2, cz], rotation: [0.04, 0.2, -0.06] }),
   piece(new THREE.BoxGeometry(0.8, 0.14, 0.8), { color: STONE.dark, position: [cx - 0.04, base + tall, cz], rotation: [0, 0.2, -0.06] }),
  ]);
 }, [site]);
 useEffect(() => () => model.dispose(), [model]);
 return <mesh name="chimenea de la casita" geometry={model} material={material} castShadow />;
}

// ── El invernadero ──────────────────────────────────────────────────────────
// Armazón de hierro y cristal violeta; dentro, dos bancales con plantas que
// brillan en violeta y turquesa, y el resplandor que sale y cae al suelo.
function Greenhouse() {
 const model = useMemo(() => createGreenhouse(GREENHOUSE), []);
 const plants = useMemo(() => {
  const parts = [];
  const d = GREENHOUSE.depth / 2 - 0.5;
  for (const side of [-1, 1]) {
   for (let i = 0; i < 5; i++) {
    const z = -d + (i / 4) * d * 2, x = side * (GREENHOUSE.width / 2 - 0.65), tall = 0.5 + ((i * 7 + side * 3) % 5) * 0.12;
    // (Una de cada tres, turquesa en vez de violeta.)
    parts.push(piece(new THREE.IcosahedronGeometry(0.2 + tall * 0.18, 0), { color: i % 3 === 1 ? "#3fe0ff" : i % 2 ? "#ffffff" : "#e3c8ff", position: [x, 0.95 + tall, z], scale: [1, 1.3, 1] }));
    parts.push(piece(new THREE.ConeGeometry(0.06, tall, 4).translate(0, tall / 2, 0), { color: "#ffffff", position: [x, 0.9, z] }));
   }
  }
  return merge(parts);
 }, []);
 const benches = useMemo(() => {
  const parts = [];
  for (const side of [-1, 1]) parts.push(piece(new THREE.BoxGeometry(0.9, 0.5, GREENHOUSE.depth - 0.7), { bottom: "#2a1f33", top: "#4a3a52", position: [side * (GREENHOUSE.width / 2 - 0.65), 0.65, 0] }));
  return merge(parts);
 }, []);
 const material = useMemo(
  () => ({
   frame: solid(),
   glass: new THREE.MeshBasicMaterial({ color: "#8f6cff", transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }),
   // Las plantas, por encima del umbral del resplandor: brillan.
   glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.62, 0.26, 1.3), vertexColors: true, toneMapped: false }),
   spill: pool("#a873ff", 0.45),
  }),
  [],
 );
 const y = ground(GREENHOUSE.x, GREENHOUSE.z);
 const plane = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
 useEffect(() => {
  const stop = addWarmSource({ x: GREENHOUSE.x, y: y + 1.4, z: GREENHOUSE.z, power: 1.0, reach: 8, flicker: 0.03, color: "#a070ff" });
  return () => {
   stop();
   [model.frame, model.glass, plants, benches, plane].forEach((one) => one.dispose());
   material.frame.dispose();
   material.glass.dispose();
   material.glow.dispose();
   material.spill.dispose();
  };
 }, [model, plants, benches, plane, material, y]);
 return (
  <>
   <group name="invernadero" userData={{ rests: 0 }} position={[GREENHOUSE.x, y - 0.04, GREENHOUSE.z]} rotation-y={GREENHOUSE.turn}>
    <mesh geometry={model.frame} material={material.frame} castShadow receiveShadow />
    <mesh geometry={benches} material={material.frame} receiveShadow />
    <mesh name="plantas del invernadero" geometry={plants} material={material.glow} />
    <mesh geometry={model.glass} material={material.glass} renderOrder={2} />
   </group>
   <mesh geometry={plane} material={material.spill.material} position={[GREENHOUSE.x, y + 0.06, GREENHOUSE.z]} scale={[GREENHOUSE.width + 4, 1, GREENHOUSE.depth + 4]} rotation-y={GREENHOUSE.turn} renderOrder={2} />
  </>
 );
}

// La chimenea de la casa del alquimista (la casa torcida, a su escala; ver House.jsx y `createHouse`).
const ALCHEMIST_SMOKE = [-2.0, 10.3, -1.0];
function alchemistChimney() {
 const [lx, ly, lz] = ALCHEMIST_SMOKE.map((v) => v * HOUSE.scale);
 return [HOUSE.x + lx * Math.cos(HOUSE.turn) + lz * Math.sin(HOUSE.turn), ground(HOUSE.x, HOUSE.z) + ly, HOUSE.z - lx * Math.sin(HOUSE.turn) + lz * Math.cos(HOUSE.turn)];
}

export function Buildings() {
 // Un material por grado de color (los edificios que comparten grado comparten material).
 const material = useMemo(() => {
  const all = { plain: createNightMaterial(0) };
  for (const site of Object.values(BUILDINGS)) {
   const key = `velo ${site.saturation ?? 0.42}`;
   all[key] ??= createNightMaterial(1, site.saturation ?? 0.42);
  }
  return all;
 }, []);
 useEffect(() => () => Object.values(material).forEach((one) => one.dispose()), [material]);
 // La casa sobre tronco es la parada 1: ante su puerta, con E, se lee «Sobre mí» (el texto real).
 const story = BUILDINGS["casa-tronco"];
 useInteractable({
  position: STORY_DOOR,
  radius: 2.6,
  height: 2.6,
  hint: "Leer mi historia",
  action: () => emit("open", { ...aboutCard(), at: { x: story.x, y: ground(story.x, story.z) + 3, z: story.z + 1, distance: 0.9 } }),
 });
 useEffect(() => {
  const y = ground(STORY_DOOR.x, STORY_DOOR.z);
  // Luz de la puerta de la casa sobre tronco.
  const stop = [addWarmSource({ x: STORY_DOOR.x, y: y + 1.6, z: STORY_DOOR.z, power: 1.0, reach: 8, flicker: 0.05, color: "#ffa552" })];
  return () => stop.forEach((off) => off());
 }, []);
 const chimneys = useMemo(() => [chimneyTop(BUILDINGS.casita), alchemistChimney()], []);
 return (
  <>
   {Object.entries(BUILDINGS).map(([name, site]) =>
    name === "torre" ? (
     <Tower key={name} site={site} material={material.plain} />
    ) : (
     <Building key={name} name={name} site={site} material={site.painted ? material.plain : material[`velo ${site.saturation ?? 0.42}`]} />
    ),
   )}
   <Chimney site={BUILDINGS.casita} material={material.plain} />
   <Greenhouse />
   <Smoke sources={chimneys} />
  </>
 );
}
