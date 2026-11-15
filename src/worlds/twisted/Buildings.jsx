import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { attribute, float, mix, vec3 } from "three/tsl";
import { aboutCard } from "../../content/about";
import { withSeeThrough } from "../../experience/environment/seeThrough";
import { useInteractable } from "../../experience/interact";
import { addWarmSource } from "../../experience/lightSources";
import { lambert } from "../../experience/materials";
import { emit } from "../../experience/state";
import { uniforms } from "../../experience/theme";
import { BUILDINGS, GREENHOUSE, STORY_DOOR, ground } from "./layout";
import { solid } from "./materials";
import { createGreenhouse } from "./models";

// Los edificios de la isla. Salen de modelos descargados (docs/CREDITOS.md),
// ya convertidos a una malla sin materiales ni texturas, con el color en los
// vértices: los de este mundo, con tools/assets/twisted.py; el observatorio y
// la casa del árbol son los mismos archivos del mundo 1. Aquí se les da la
// noche: el color se apaga y se lleva al morado, y lo que la conversión marcó
// como cristal (ventanas, la esfera del reloj) se enciende en cálido.
const url = (site) => (site.from === "living" ? `/models/living/buildings/${site.model}.glb` : `/models/twisted/${site.model}.glb`);
const GLASS = vec3(1.0, 0.82, 0.5); // (el color exacto con que la conversión pinta los cristales)

// `veil`: cuánto se lleva el color original al morado de la noche (los que ya
// vienen pintados de noche —la torre—, nada).
function createNightMaterial(veil = 1) {
 const material = lambert({ side: THREE.DoubleSide });
 const tone = attribute("color", "vec3");
 const window = float(1).sub(tone.sub(GLASS).length().mul(30).clamp(0, 1)); // 1 solo en el color de los cristales
 // De día a noche de cuento: media saturación y un velo morado.
 const grey = tone.dot(vec3(0.3, 0.5, 0.2));
 const night = mix(tone, mix(vec3(grey), tone, 0.42).mul(vec3(0.78, 0.6, 1.08)).mul(0.95), veil);
 material.colorNode = mix(night, vec3(0.05, 0.03, 0.02), window);
 material.emissiveNode = vec3(1.25, 0.82, 0.4).mul(window).mul(uniforms.uGlow);
 return withSeeThrough(material);
}

function Building({ name, site, material }) {
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
 return <mesh name={name} userData={{ rests: 0 }} geometry={geometry} material={material} position={[site.x, ground(site.x, site.z) - 0.05, site.z]} rotation-y={site.turn} scale={site.size} castShadow receiveShadow />;
}

// El invernadero: armazón de hierro y cristal, con un resplandor violeta dentro.
function Greenhouse() {
 const model = useMemo(() => createGreenhouse(GREENHOUSE), []);
 const material = useMemo(
  () => ({
   frame: solid(),
   glass: new THREE.MeshBasicMaterial({ color: "#8e7bff", transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }),
   glow: new THREE.MeshBasicMaterial({ color: [0.9, 0.5, 1.6], transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }),
  }),
  [],
 );
 const y = ground(GREENHOUSE.x, GREENHOUSE.z);
 useEffect(() => {
  const stop = addWarmSource({ x: GREENHOUSE.x, y: y + 1.4, z: GREENHOUSE.z, power: 0.9, reach: 8, flicker: 0.03, color: "#a070ff" });
  return () => {
   stop();
   model.frame.dispose();
   model.glass.dispose();
   Object.values(material).forEach((one) => one.dispose());
  };
 }, [model, material, y]);
 return (
  <group name="invernadero" userData={{ rests: 0 }} position={[GREENHOUSE.x, y - 0.04, GREENHOUSE.z]} rotation-y={GREENHOUSE.turn}>
   <mesh geometry={model.frame} material={material.frame} castShadow receiveShadow />
   <mesh geometry={model.glass} material={material.glass} renderOrder={2} />
   {/* Lo que brilla dentro (las plantas llegarán en el bloque C2). */}
   {[-1.4, 0, 1.4].map((z) => (
    <mesh key={z} position={[z * 0.3, 0.8, z]} material={material.glow} scale={[0.5, 0.7, 0.5]}>
     <icosahedronGeometry args={[1, 0]} />
    </mesh>
   ))}
  </group>
 );
}

export function Buildings() {
 const material = useMemo(() => ({ veiled: createNightMaterial(1), plain: createNightMaterial(0) }), []);
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
 return (
  <>
   {Object.entries(BUILDINGS).map(([name, site]) => (
    <Building key={name} name={name} site={site} material={site.painted ? material.plain : material.veiled} />
   ))}
   <Greenhouse />
  </>
 );
}
