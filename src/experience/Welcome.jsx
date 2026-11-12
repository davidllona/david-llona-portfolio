import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { ASTRONAUT_PALETTE, ASTRONAUT_SCALE, WOODY_PALETTE, WOODY_SCALE } from "../characters/looks";
import { Glow } from "../worlds/living/buildings/Glow";
import { createPlantModels } from "../worlds/living/flora/plantModels";
import { HERO_LANTERNS, hero } from "../worlds/living/flora/treeModels";
import { blade, blob, merge, piece, randomFrom } from "../worlds/living/kit/geometry";
import { ROCK } from "../worlds/living/kit/palette";
import { createLamp } from "../worlds/living/props/lampModel";
import { WIND, withWind } from "./environment/wind";
import { Instances } from "./Instances";
import { lambert } from "./materials";
import { WELCOME, emit, rig } from "./state";
import { createGlowTexture } from "./textures";

// Bienvenida: un islote flotando en el espacio, de noche, con el astronauta y
// Woody bajo un gran árbol y una farola encendida. Es la portada del
// portfolio. Al entrar, la cámara desciende de aquí al planeta mientras
// amanece (ver `rig.intro` en state.js y la mezcla de cámara en Player.jsx).

const DESCENT = 2.8; // segundos que dura el viaje al planeta
const RADIUS = 4.7; // del claro
const TREE = [-2.3, 0, -1.3];
const LAMP = [2.75, 0, -0.5];
const ASTRONAUT = [0.15, 0, 1.75];
const DOG = [1.55, 0, 2.15];

// El islote: claro de hierba, tierra, roca que se estrecha hacia abajo, piedras
// en el borde y raíces que cuelgan.
function createIslet() {
 const random = randomFrom(0.61);
 const strata = [ROCK.dark, ROCK.light];
 const pieces = [
  piece(new THREE.CylinderGeometry(RADIUS, RADIUS - 0.5, 0.6, 18), { bottom: "#356f3c", top: "#5aa24c", jitter: 0.1, vary: 0.05, position: [0, -0.3, 0] }),
  piece(new THREE.CylinderGeometry(RADIUS - 0.35, RADIUS - 0.9, 0.7, 16), { bottom: "#5b3f2b", top: "#7a5638", jitter: 0.12, vary: 0.08, seed: 2, position: [0, -0.85, 0] }),
  piece(new THREE.CylinderGeometry(RADIUS - 0.8, 2.9, 2.3, 11), { bottom: strata[0], top: strata[1], jitter: 0.3, vary: 0.1, seed: 3, position: [0.1, -2.2, 0] }),
  piece(new THREE.CylinderGeometry(2.8, 1.2, 2.4, 9), { bottom: "#5f5a55", top: strata[0], jitter: 0.28, vary: 0.1, seed: 4, position: [-0.2, -4.4, 0.1] }),
  piece(new THREE.ConeGeometry(1.25, 2.4, 7), { bottom: "#4f4b47", top: "#6f6a64", jitter: 0.2, vary: 0.1, seed: 5, position: [-0.3, -6.6, 0.1], rotation: [Math.PI, 0, 0] }),
 ];
 // Piedras que asoman por el borde.
 for (let i = 0; i < 9; i++) {
  const angle = (i / 9) * Math.PI * 2 + random() * 0.5;
  const size = 0.35 + random() * 0.45;
  pieces.push(piece(i % 2 ? blob(0) : new THREE.DodecahedronGeometry(1, 0), { bottom: strata[0], top: strata[1], jitter: 0.2, vary: 0.1, seed: i + 10, position: [Math.cos(angle) * (RADIUS - 0.15), -0.25 - random() * 0.5, Math.sin(angle) * (RADIUS - 0.15)], scale: [size, size * 0.7, size], rotation: [i, i * 2, i] }));
 }
 // Raíces y lianas colgando por debajo del borde.
 for (let i = 0; i < 14; i++) {
  const angle = (i / 14) * Math.PI * 2 + random() * 0.3;
  const x = Math.cos(angle) * (RADIUS - 0.25), z = Math.sin(angle) * (RADIUS - 0.25);
  const length = 0.8 + random() * 1.7;
  pieces.push(piece(blade([[x, -0.5, z], [x * 1.03, -0.5 - length * 0.5, z * 1.03], [x * 0.98, -0.5 - length, z * 0.98]], 0.12, { facing: angle + Math.PI / 2, tipWidth: 0.02 }), { bottom: "#7cc65c", top: "#3f8a45" }));
 }
 // Dos rocas dentro del claro.
 pieces.push(
  piece(new THREE.DodecahedronGeometry(1, 0), { bottom: strata[0], top: strata[1], jitter: 0.2, vary: 0.1, seed: 31, position: [-3.4, 0.2, 1.9], scale: [0.62, 0.42, 0.55] }),
  piece(blob(0), { bottom: strata[0], top: strata[1], jitter: 0.2, vary: 0.1, seed: 32, position: [3.5, 0.12, 2.0], scale: [0.4, 0.28, 0.36] }),
 );
 return merge(pieces);
}

// Copia de un personaje riggeado, con su material facetado y un clip en bucle.
function Poser({ url, palette, clip, position, rotation, scale }) {
 const { scene, animations } = useGLTF(url);
 const model = useMemo(() => {
  const copy = cloneSkinned(scene);
  const materials = new Map();
  copy.traverse((node) => {
   if (!node.isMesh) return;
   node.frustumCulled = false;
   const convert = (original) => {
    if (!materials.has(original.name)) {
     const spec = palette[original.name] ?? {};
     materials.set(original.name, new THREE.MeshLambertMaterial({ color: spec.color ?? original.color, emissive: spec.emissive ?? "#000000", emissiveIntensity: spec.glow ?? 0, flatShading: true }));
    }
    return materials.get(original.name);
   };
   node.material = Array.isArray(node.material) ? node.material.map(convert) : convert(node.material);
  });
  const mixer = new THREE.AnimationMixer(copy);
  const found = animations.find((animation) => animation.name === clip);
  if (found) mixer.clipAction(found).play();
  return { copy, mixer, materials };
 }, [scene, animations, palette, clip]);
 useEffect(
  () => () => {
   model.mixer.stopAllAction();
   model.materials.forEach((material) => material.dispose());
  },
  [model],
 );
 useFrame((_, delta) => model.mixer.update(Math.min(delta, 0.05)));
 return <primitive object={model.copy} position={position} rotation={rotation} scale={scale} />;
}

// Sombra de contacto: el mapa de sombras sigue al jugador y no llega hasta aquí.
function Contact({ position, size, opacity = 0.42, texture }) {
 return (
  <mesh position={position} rotation-x={-Math.PI / 2} scale={size}>
   <planeGeometry />
   <meshBasicMaterial map={texture} color="#02040c" transparent opacity={opacity} depthWrite={false} />
  </mesh>
 );
}

// Luciérnagas que rondan el claro.
function Fireflies({ count = 16 }) {
 const group = useRef(null);
 const flies = useMemo(() => {
  const random = randomFrom(0.27);
  return Array.from({ length: count }, () => ({ x: (random() - 0.5) * 9, y: 0.6 + random() * 4.2, z: (random() - 0.5) * 6, phase: random() * 20, speed: 0.4 + random() * 0.5 }));
 }, [count]);
 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  group.current.children.forEach((fly, i) => {
   const f = flies[i];
   fly.position.set(f.x + Math.sin(time * f.speed + f.phase) * 0.8, f.y + Math.sin(time * f.speed * 1.7 + f.phase) * 0.4, f.z + Math.cos(time * f.speed * 0.8 + f.phase) * 0.8);
   fly.scale.setScalar(0.6 + 0.4 * Math.sin(time * 2.4 + f.phase * 3));
  });
 });
 return (
  <group ref={group}>
   {flies.map((_, i) => (
    <mesh key={i}>
     <octahedronGeometry args={[0.045, 0]} />
     <meshBasicMaterial color={[2.8, 2.4, 0.8]} toneMapped={false} fog={false} />
    </mesh>
   ))}
  </group>
 );
}

function Islet() {
 const light = useRef(null);
 const moon = useRef(null);
 const glow = useMemo(() => createGlowTexture(), []);
 const models = useMemo(() => ({ islet: createIslet(), tree: hero(0.37), lamp: createLamp(), plants: createPlantModels() }), []);
 const material = useMemo(
  () => ({
   still: lambert(),
   tree: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.tree, power: 2, cap: 7 }),
   blades: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.grass, cap: 0.9 }),
   flowers: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.flower, cap: 0.45 }),
  }),
  [],
 );
 useEffect(
  () => () => {
   const dispose = (value) => (value.isBufferGeometry ? value.dispose() : Object.values(value).forEach(dispose));
   dispose(models);
   Object.values(material).forEach((one) => one.dispose());
   glow.dispose();
  },
  [models, material, glow],
 );

 // Plantas, colocadas con intención: hierba en todo el claro salvo donde se
 // pisa, flores en tres macizos, helechos y setas al pie del árbol.
 const items = useMemo(() => {
  const random = randomFrom(0.83);
  const clear = (x, z) => [ASTRONAUT, DOG].every(([px, , pz]) => Math.hypot(x - px, z - pz) > 0.75) && Math.hypot(x - TREE[0], z - TREE[2]) > 1.0 && Math.hypot(x - LAMP[0], z - LAMP[2]) > 0.4;
  const scatter = (count, radius, centre = [0, 0], scale = [0.9, 0.6]) => {
   const list = [];
   for (let i = 0; i < count * 4 && list.length < count; i++) {
    const angle = random() * Math.PI * 2, r = Math.sqrt(random()) * radius;
    const x = centre[0] + Math.cos(angle) * r, z = centre[1] + Math.sin(angle) * r;
    if (Math.hypot(x, z) < RADIUS - 0.35 && clear(x, z)) list.push({ position: [x, 0, z], rotation: [0, random() * 6, 0], scale: scale[0] + random() * scale[1], color: ["#ffffff", "#f2ffe6", "#e6f6ea"][list.length % 3] });
   }
   return list;
  };
  return {
   tall: scatter(24, RADIUS),
   short: scatter(110, RADIUS, [0, 0], [1.1, 0.6]),
   seed: scatter(8, 1.4, [-3.3, 0.6]),
   daisy: scatter(11, 1.0, [-1.9, 2.9], [1.1, 0.4]),
   lavender: scatter(8, 0.8, [3.4, 0.9], [1.1, 0.4]),
   bluebell: scatter(7, 0.9, [2.2, -2.6], [1.1, 0.4]),
   tulip: scatter(5, 0.6, [-3.6, -0.8], [1.1, 0.3]),
   ferns: scatter(6, 1.5, [TREE[0], TREE[2]], [1.0, 0.5]),
   mushrooms: scatter(3, 1.3, [TREE[0] + 0.4, TREE[2] + 1.2], [1.2, 0.5]),
   clover: scatter(5, RADIUS - 1),
  };
 }, []);

 useFrame(({ clock }) => {
  // La farola respira un poco; la luna y todo lo demás se apagan al marcharse.
  const time = clock.elapsedTime;
  light.current.intensity = 34 * (1 + 0.05 * Math.sin(time * 7.3) + 0.04 * Math.sin(time * 13.1));
  moon.current.material.opacity = Math.min(1, rig.intro * 1.6);
 });

 const plants = models.plants;
 return (
  <group position={WELCOME.origin}>
   <mesh geometry={models.islet} material={material.still} />
   <mesh geometry={models.tree} material={material.tree} position={TREE} rotation-y={0.25} scale={0.88} />
   <mesh geometry={models.lamp} material={material.still} position={LAMP} />
   <Instances geometry={plants.tufts.tall} material={material.blades} items={items.tall} colored />
   <Instances geometry={plants.tufts.short} material={material.blades} items={items.short} colored />
   <Instances geometry={plants.tufts.seed} material={material.blades} items={items.seed} colored />
   <Instances geometry={plants.flowers.daisy} material={material.flowers} items={items.daisy} />
   <Instances geometry={plants.flowers.lavender} material={material.flowers} items={items.lavender} />
   <Instances geometry={plants.flowers.bluebell} material={material.flowers} items={items.bluebell} />
   <Instances geometry={plants.flowers.tulipYellow} material={material.flowers} items={items.tulip} />
   <Instances geometry={plants.ferns[0]} material={material.blades} items={items.ferns} />
   <Instances geometry={plants.mushrooms[0]} material={material.still} items={items.mushrooms} />
   <Instances geometry={plants.clover} material={material.still} items={items.clover} />

   {/* Farol encendido y su luz, que es la que da el tono cálido a la escena. */}
   <Glow light={false} night={3.2} position={[LAMP[0] - 0.62, 2.82, LAMP[2]]}>
    <boxGeometry args={[0.2, 0.34, 0.2]} />
   </Glow>
   <pointLight ref={light} color="#ffb060" position={[LAMP[0] - 0.75, 2.75, LAMP[2] + 0.5]} distance={17} decay={1.5} />
   {/* Farolillos colgados del árbol. */}
   {HERO_LANTERNS.map(([x, y, z], i) => (
    <group key={i} position={[TREE[0] + (x * Math.cos(0.25) + z * Math.sin(0.25)) * 0.88, y * 0.88, TREE[2] + (-x * Math.sin(0.25) + z * Math.cos(0.25)) * 0.88]}>
     <mesh position-y={0.32}>
      <cylinderGeometry args={[0.008, 0.008, 0.6, 3]} />
      <meshBasicMaterial color="#2a2622" />
     </mesh>
     <Glow light={false} night={2.6} color="#ffe2a6" emissive="#ffa63d">
      <octahedronGeometry args={[0.13, 0]} />
     </Glow>
    </group>
   ))}
   <pointLight color="#ff9a4a" position={[TREE[0] + 1.6, 4.0, TREE[2] + 1.4]} intensity={9} distance={9} decay={1.6} />
   {/* Luz de relleno por delante: sin ella los protagonistas quedan a contraluz de la luna. */}
   <pointLight color="#ffd9a8" position={[0.4, 2.6, 6.2]} intensity={30} distance={13} decay={1.4} />
   <pointLight color="#8fb4ff" position={[-5.5, 3.5, 3.5]} intensity={10} distance={12} decay={1.5} />

   <Poser url="/models/characters/astronauta.glb" palette={ASTRONAUT_PALETTE} clip="Astro_Idle_Breathe" position={ASTRONAUT} rotation={[0, 0.32, 0]} scale={ASTRONAUT_SCALE} />
   <Poser url="/models/characters/woody.glb" palette={WOODY_PALETTE} clip="Woody_SitIdle" position={DOG} rotation={[0, -0.45, 0]} scale={WOODY_SCALE} />
   <Contact texture={glow} position={[ASTRONAUT[0], 0.03, ASTRONAUT[2]]} size={1.5} />
   <Contact texture={glow} position={[DOG[0], 0.03, DOG[2]]} size={1.5} />
   <Contact texture={glow} position={[TREE[0], 0.02, TREE[2]]} size={5.5} opacity={0.5} />
   <Contact texture={glow} position={[LAMP[0], 0.03, LAMP[2]]} size={0.9} />
   <Fireflies />

   {/* Luna grande detrás del árbol, para recortar su silueta. */}
   <mesh ref={moon} position={[-9.5, 9.5, -46]}>
    <circleGeometry args={[7.5, 40]} />
    <meshBasicMaterial color={[1.25, 1.34, 1.6]} transparent toneMapped={false} fog={false} depthWrite={false} />
   </mesh>
   <mesh position={[-9.5, 9.5, -46.5]} scale={34}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#5a78d8" transparent opacity={0.4} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
   </mesh>
   {/* Islotes menores a lo lejos. */}
   {[[-12, -4.5, -15, 1.3], [12.5, 5.5, -24, 1.7], [9.5, -4.5, -9, 0.8]].map(([x, y, z, size], i) => (
    <mesh key={i} position={[x, y, z]} scale={[size, size * 1.3, size]} rotation={[0.2, i, 0.1]} material={material.still}>
     <dodecahedronGeometry args={[1, 0]} />
    </mesh>
   ))}
  </group>
 );
}

// Monta el islote mientras dura la bienvenida y conduce el descenso.
export function Welcome() {
 const [mounted, setMounted] = useState(rig.intro > 0);
 const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
 useFrame((_, delta) => {
  if (rig.intro === rig.introTarget) return;
  // Con «reducir movimiento» no hay viaje: se llega enseguida.
  const step = Math.min(delta, 0.05) / (reduced ? 0.35 : DESCENT);
  rig.intro = Math.max(rig.introTarget, rig.intro - step);
  if (rig.intro === 0) {
   setMounted(false);
   emit("arrived"); // la interfaz de juego aparece al llegar
  }
 });
 return mounted ? <Islet /> : null;
}
