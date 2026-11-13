import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { ASTRONAUT_PALETTE, ASTRONAUT_SCALE, WOODY_PALETTE, WOODY_SCALE } from "../characters/looks";
import { Glow } from "../worlds/living/buildings/Glow";
import { createPlantModels } from "../worlds/living/flora/plantModels";
import { useFlora } from "../worlds/living/flora/useFlora";
import { randomFrom } from "../worlds/living/kit/geometry";
import { BARK, LEAF } from "../worlds/living/kit/palette";
import { createLamp, LAMP_GLASS } from "../worlds/living/props/lampModel";
import { WIND, withWind } from "./environment/wind";
import { Instances } from "./Instances";
import { ISLET, TREE_LANTERNS, createFloater, createIslet, createLanternFrame, createMoon, createTreeExtras, isletEdge } from "./intro/isletModels";
import { lambert } from "./materials";
import { WELCOME, emit, rig, welcomePose } from "./state";
import { createGlowTexture } from "./textures";

// Bienvenida: un islote flotando en el espacio, de noche, con el astronauta y
// Woody bajo un árbol con farolillos y una farola encendida. Es la portada del
// portfolio. Al entrar, la cámara desciende de aquí al planeta mientras
// amanece (ver `rig.intro` en state.js y la mezcla de cámara en Player.jsx).
//
// La luz: la luna, detrás a la izquierda, recorta las siluetas y da las sombras
// (es la luz direccional de la escena; ver theme.js y Lights.jsx); la farola da
// el tono cálido a los protagonistas, con alcance corto; una luz azul desde
// abajo dibuja la roca. Nada supera el blanco salvo los cristales encendidos y
// las luciérnagas: solo ahí hay resplandor.

const DESCENT = 2.8; // segundos que dura el viaje al planeta
const TREE = { position: [-1.15, 0, -1.0], turn: 0.35, scale: 0.84 };
const LAMP = { position: [2.3, 0, 2.05], scale: 0.86 };
const ASTRONAUT = [0.05, 0, 1.45];
const DOG = [1.12, 0, 1.95];
const STAGE = 1.1; // los protagonistas, algo mayores que en el juego: son el centro de la portada
const ONLY_TREE = ["frondoso"];
// Dónde queda un punto del árbol (a escala 1) dentro del islote.
const onTree = ([x, y, z]) => {
 const cos = Math.cos(TREE.turn), sin = Math.sin(TREE.turn);
 return [TREE.position[0] + (x * cos + z * sin) * TREE.scale, y * TREE.scale, TREE.position[2] + (-x * sin + z * cos) * TREE.scale];
};
const lampGlass = [LAMP.position[0] + LAMP_GLASS[0] * LAMP.scale, LAMP_GLASS[1] * LAMP.scale, LAMP.position[2]];

// Copia de un personaje riggeado, con su material facetado y sus clips en
// bucle. `clips`: [{ name, only?, except? }]; `only` y `except` eligen huesos
// (expresión regular), para sumar dos clips: sentado + la cola de otro.
function Poser({ url, palette, clips, position, rotation, scale }) {
 const { scene, animations } = useGLTF(url);
 const model = useMemo(() => {
  const copy = cloneSkinned(scene);
  const materials = new Map();
  copy.traverse((node) => {
   if (!node.isMesh) return;
   node.frustumCulled = false;
   node.castShadow = true;
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
  for (const { name, only, except } of clips) {
   const found = animations.find((animation) => animation.name === name);
   if (!found) continue;
   const clip = only || except ? new THREE.AnimationClip(`${name}-parte`, found.duration, found.tracks.filter((track) => (only ? only.test(track.name) : !except.test(track.name)))) : found;
   mixer.clipAction(clip).play();
  }
  return { copy, mixer, materials };
 }, [scene, animations, palette, clips]);
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
const ASTRONAUT_CLIPS = [{ name: "Astro_Idle_Breathe" }];
// Woody, sentado y moviendo la cola.
const WOODY_CLIPS = [{ name: "Woody_SitIdle", except: /tail/i }, { name: "Woody_TailWag_Slow", only: /tail/i }];

// Sombra suave en el suelo: la que da la farola (alargada, hacia el lado
// contrario) y la de contacto. Las sombras nítidas son las de la luna.
function Shade({ position, size, turn = 0, opacity = 0.4, texture }) {
 return (
  <mesh position={position} rotation={[-Math.PI / 2, 0, turn]} scale={[size[0], size[1], 1]}>
   <planeGeometry />
   <meshBasicMaterial map={texture} color="#02040c" transparent opacity={opacity} depthWrite={false} />
  </mesh>
 );
}
// Sombra de la farola para algo que está en `at`: se aleja de ella.
const lampShade = (at, length) => {
 const dx = at[0] - lampGlass[0], dz = at[2] - lampGlass[2];
 const reach = Math.hypot(dx, dz);
 return { position: [at[0] + (dx / reach) * length * 0.42, 0.045, at[2] + (dz / reach) * length * 0.42], turn: -Math.atan2(dz, dx) };
};

// Luciérnagas: rondan el claro en curvas lentas y se encienden y apagan.
function Fireflies({ count = 14 }) {
 const group = useRef(null);
 const flies = useMemo(() => {
  const random = randomFrom(0.27);
  return Array.from({ length: count }, () => ({ x: (random() - 0.5) * 6.2, y: 0.5 + random() * 3.2, z: (random() - 0.2) * 4.2, phase: random() * 20, speed: 0.16 + random() * 0.2, reach: 0.5 + random() * 0.7 }));
 }, [count]);
 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  group.current.children.forEach((fly, i) => {
   const f = flies[i];
   const t = time * f.speed + f.phase;
   // Dos senos de distinto ritmo por eje: una curva que no se repite a la vista.
   fly.position.set(f.x + (Math.sin(t) + Math.sin(t * 0.43 + 1.7) * 0.6) * f.reach, f.y + (Math.sin(t * 0.71 + 2.1) + Math.sin(t * 1.9) * 0.25) * 0.3, f.z + (Math.cos(t * 0.83) + Math.sin(t * 0.37 + 0.6) * 0.6) * f.reach);
   fly.scale.setScalar(Math.max(0.05, 0.55 + 0.45 * Math.sin(time * 1.3 + f.phase * 3)));
  });
 });
 return (
  <group ref={group}>
   {flies.map((_, i) => (
    <mesh key={i}>
     <octahedronGeometry args={[0.04, 0]} />
     <meshBasicMaterial color={[2.4, 2.1, 0.7]} toneMapped={false} fog={false} />
    </mesh>
   ))}
  </group>
 );
}

// Hojas que se sueltan de la copa de vez en cuando y caen meciéndose.
function FallingLeaves({ count = 7 }) {
 const group = useRef(null);
 const leaves = useMemo(() => {
  const random = randomFrom(0.52);
  return Array.from({ length: count }, (_, i) => {
   const [x, y, z] = onTree([-2.4 + random() * 3.6, 3.0 + random() * 0.8, -0.6 + random() * 1.3]);
   return { x, y, z, every: 9 + random() * 8, offset: (i / count) * 13 + random() * 3, fall: 4.2 + random() * 1.6, sway: 0.25 + random() * 0.3, spin: 1 + random() * 2, color: ["#a3d86a", "#8fcf62", "#d6c35a"][i % 3] };
  });
 }, [count]);
 useFrame(({ clock }) => {
  group.current.children.forEach((leaf, i) => {
   const l = leaves[i];
   const t = ((clock.elapsedTime + l.offset) % l.every) / l.fall; // 0–1 mientras cae; después espera
   if (t >= 1) return void (leaf.visible = false);
   leaf.visible = true;
   leaf.position.set(l.x + Math.sin(t * 7 + i) * l.sway + t * 0.5, l.y * (1 - t) + 0.06, l.z + Math.cos(t * 5.3 + i) * l.sway * 0.7);
   leaf.rotation.set(t * 6 * l.spin, t * 4, Math.sin(t * 9) * 1.2);
   leaf.scale.setScalar(Math.min(1, t * 8, (1 - t) * 6));
  });
 });
 return (
  <group ref={group}>
   {leaves.map((leaf, i) => (
    <mesh key={i} visible={false}>
     <planeGeometry args={[0.13, 0.08]} />
     <meshLambertMaterial color={leaf.color} side={THREE.DoubleSide} />
    </mesh>
   ))}
  </group>
 );
}

// Estrella fugaz: de tarde en tarde, un trazo cruza el cielo detrás del islote.
function ShootingStar() {
 const mesh = useRef(null);
 const state = useRef({ next: 3.5, from: [0, 0], to: [0, 0], start: -1 });
 useFrame(({ clock }) => {
  const s = state.current;
  const time = clock.elapsedTime;
  if (s.start < 0 && time > s.next) {
   const x = -16 + Math.random() * 26, y = 9 + Math.random() * 7;
   const way = Math.random() < 0.5 ? -1 : 1;
   s.from = [x, y];
   s.to = [x + way * (9 + Math.random() * 5), y - 3.5 - Math.random() * 3];
   s.start = time;
  }
  const t = s.start < 0 ? 2 : (time - s.start) / 0.85;
  if (t > 1) {
   mesh.current.visible = false;
   if (s.start >= 0) {
    s.start = -1;
    s.next = time + 6 + Math.random() * 7;
   }
   return;
  }
  mesh.current.visible = rig.intro === 1;
  mesh.current.position.set(s.from[0] + (s.to[0] - s.from[0]) * t, s.from[1] + (s.to[1] - s.from[1]) * t, -52);
  mesh.current.rotation.z = Math.atan2(s.to[1] - s.from[1], s.to[0] - s.from[0]);
  mesh.current.material.opacity = Math.sin(t * Math.PI) * 0.85;
 });
 return (
  <mesh ref={mesh} visible={false}>
   <planeGeometry args={[3.4, 0.05]} />
   <meshBasicMaterial color="#dfe8ff" transparent opacity={0} depthWrite={false} fog={false} toneMapped={false} />
  </mesh>
 );
}

// Rocas que flotan alrededor, a distintas distancias; suben y bajan despacio.
const FLOATERS = [[-3.05, -1.55, 1.3, 0.5, 0.4], [3.45, 3.35, -3.4, 0.58, 1.9], [2.45, -2.75, 0.9, 0.36, 3.1], [-2.6, -3.0, -1.6, 0.28, 4.4], [3.3, -0.9, -4.6, 0.44, 5.2]];
function Floaters({ material }) {
 const group = useRef(null);
 const models = useMemo(() => [createFloater(0.31), createFloater(0.74)], []);
 useEffect(() => () => models.forEach((geometry) => geometry.dispose()), [models]);
 useFrame(({ clock }) => {
  group.current.children.forEach((rock, i) => {
   const [, y, , , phase] = FLOATERS[i];
   rock.position.y = y + Math.sin(clock.elapsedTime * 0.35 + phase) * 0.12;
   rock.rotation.y = phase + clock.elapsedTime * 0.04;
  });
 });
 return (
  <group ref={group}>
   {FLOATERS.map(([x, y, z, size], i) => (
    <mesh key={i} geometry={models[i % 2]} material={material} position={[x, y, z]} scale={size} rotation-z={(i - 2) * 0.09} />
   ))}
  </group>
 );
}

function Islet({ onMounted }) {
 // Si esto se monta, los modelos de los personajes ya se han descargado.
 useEffect(() => onMounted?.(), [onMounted]);
 const moon = useRef(null);
 const halo = useRef(null);
 const glow = useMemo(() => createGlowTexture(), []);
 const paint = useFlora(ONLY_TREE);
 const models = useMemo(() => ({ islet: createIslet(), extras: createTreeExtras(), lamp: createLamp(), lanterns: TREE_LANTERNS.map(([, , , thread]) => createLanternFrame(thread)), moon: createMoon(), plants: createPlantModels() }), []);
 const tree = useMemo(() => paint("frondoso", { bark: BARK.old, leaf: LEAF.oak[1], vary: 0.18 }), [paint]);
 useEffect(() => () => tree.dispose(), [tree]);
 const material = useMemo(
  () => ({
   still: lambert(),
   tree: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.tree, power: 2, cap: 7 }),
   blades: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.grass, cap: 0.9 }),
   flowers: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.flower, cap: 0.45 }),
   moon: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, fog: false, toneMapped: false }),
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
 // pisa, flores en macizos, helechos y setas al pie del árbol.
 const items = useMemo(() => {
  const random = randomFrom(0.83);
  const [tx, , tz] = TREE.position;
  // Nada alto delante de los protagonistas ni tapando las raíces del árbol.
  const stage = (x, z) => x > ASTRONAUT[0] - 0.75 && x < DOG[0] + 0.75 && z > ASTRONAUT[2] - 0.35;
  const clear = (x, z) => !stage(x, z) && Math.hypot(x - tx, z - tz) > 1.25 && Math.hypot(x - LAMP.position[0], z - LAMP.position[2]) > 0.35;
  const scatter = (count, radius, centre = [0, 0], scale = [0.9, 0.6]) => {
   const list = [];
   for (let i = 0; i < count * 5 && list.length < count; i++) {
    const angle = random() * Math.PI * 2, r = Math.sqrt(random()) * radius;
    const x = centre[0] + Math.cos(angle) * r, z = centre[1] + Math.sin(angle) * r;
    if (isletEdge(x, z) < 0.93 && clear(x, z)) list.push({ position: [x, 0.03, z], rotation: [0, random() * 6, 0], scale: scale[0] + random() * scale[1], color: ["#ffffff", "#f2ffe6", "#e6f6ea"][list.length % 3] });
   }
   return list;
  };
  const all = Math.max(ISLET.rx, ISLET.rz) * 1.1;
  return {
   tall: scatter(16, all),
   short: scatter(90, all, [0, 0], [1.0, 0.6]),
   seed: scatter(6, 1.0, [-2.2, 0.9]),
   daisy: scatter(10, 0.9, [-0.9, 2.3], [1.1, 0.4]),
   lavender: scatter(7, 0.7, [2.4, 1.5], [1.1, 0.4]),
   bluebell: scatter(6, 0.8, [1.3, -1.9], [1.1, 0.4]),
   tulip: scatter(5, 0.6, [-2.3, -0.3], [1.1, 0.3]),
   ferns: scatter(5, 1.9, [tx - 0.3, tz - 0.4], [0.9, 0.5]),
   mushrooms: scatter(3, 0.5, [tx + 0.9, tz + 1.5], [1.2, 0.5]),
   // Césped corto donde están los protagonistas: se les ven los pies.
   lawn: Array.from({ length: 26 }, (_, i) => ({ position: [ASTRONAUT[0] - 0.6 + ((i * 0.37) % 1) * (DOG[0] - ASTRONAUT[0] + 1.2), 0.03, ASTRONAUT[2] - 0.2 + ((i * 0.61) % 1) * 1.5], rotation: [0, i * 2.1, 0], scale: [0.9, 0.42, 0.9], color: "#f2ffe6" })).filter((item) => isletEdge(item.position[0], item.position[2]) < 0.93),
   clover: scatter(5, all * 0.7),
  };
 }, []);

 useFrame(({ size }) => {
  // La luna se apaga al marcharse.
  const shown = Math.min(1, rig.intro * 1.6);
  material.moon.opacity = shown;
  halo.current.material.opacity = shown * 0.34;
  // En vertical el título ocupa la parte alta: la luna baja y asoma tras la copa.
  const [x, y] = size.width < size.height ? [-4.6, 6.6] : [-5.4, 9.7];
  moon.current.position.set(x, y, -44);
  halo.current.position.set(x, y, -45);
 });

 const plants = models.plants;
 const shade = { astronaut: lampShade(ASTRONAUT, 1.5), dog: lampShade(DOG, 1.0) };
 return (
  <group position={WELCOME.origin}>
   <mesh geometry={models.islet} material={material.still} castShadow receiveShadow />
   <Floaters material={material.still} />
   <group position={TREE.position} rotation-y={TREE.turn} scale={TREE.scale}>
    <mesh geometry={tree} material={material.tree} castShadow receiveShadow />
    <mesh geometry={models.extras} material={material.tree} castShadow receiveShadow />
    {/* Farolillos colgados de la copa: armazón y cristal encendido. */}
    {TREE_LANTERNS.map(([x, y, z], i) => (
     <group key={i} position={[x, y, z]}>
      <mesh geometry={models.lanterns[i]} material={material.still} />
      <Glow light={false} night={2.6} color="#ffe2a6" emissive="#ffa63d">
       <boxGeometry args={[0.11, 0.2, 0.11]} />
      </Glow>
     </group>
    ))}
   </group>
   <group position={LAMP.position} scale={LAMP.scale}>
    <mesh geometry={models.lamp} material={material.still} castShadow />
    {/* Farol encendido (su luz y las demás del islote, en IsletLights). */}
    <Glow light={false} night={3.2} position={LAMP_GLASS}>
     <boxGeometry args={[0.2, 0.34, 0.2]} />
    </Glow>
   </group>
   <Instances geometry={plants.tufts.tall} material={material.blades} items={items.tall} colored receiveShadow />
   <Instances geometry={plants.tufts.short} material={material.blades} items={items.short} colored receiveShadow />
   <Instances geometry={plants.tufts.short} material={material.blades} items={items.lawn} colored receiveShadow />
   <Instances geometry={plants.tufts.seed} material={material.blades} items={items.seed} colored />
   <Instances geometry={plants.flowers.daisy} material={material.flowers} items={items.daisy} />
   <Instances geometry={plants.flowers.lavender} material={material.flowers} items={items.lavender} />
   <Instances geometry={plants.flowers.bluebell} material={material.flowers} items={items.bluebell} />
   <Instances geometry={plants.flowers.tulipYellow} material={material.flowers} items={items.tulip} />
   <Instances geometry={plants.ferns[0]} material={material.blades} items={items.ferns} />
   <Instances geometry={plants.mushrooms[0]} material={material.still} items={items.mushrooms} />
   <Instances geometry={plants.clover} material={material.still} items={items.clover} />

   <Poser url="/models/characters/astronauta.glb" palette={ASTRONAUT_PALETTE} clips={ASTRONAUT_CLIPS} position={ASTRONAUT} rotation={[0, -0.12, 0]} scale={ASTRONAUT_SCALE * STAGE} />
   <Poser url="/models/characters/woody.glb" palette={WOODY_PALETTE} clips={WOODY_CLIPS} position={DOG} rotation={[0, -0.95, 0]} scale={WOODY_SCALE * STAGE} />
   <Shade texture={glow} position={[ASTRONAUT[0], 0.04, ASTRONAUT[2]]} size={[1.0, 1.0]} opacity={0.36} />
   <Shade texture={glow} position={[DOG[0], 0.04, DOG[2]]} size={[1.0, 1.0]} opacity={0.36} />
   <Shade texture={glow} {...shade.astronaut} size={[1.9, 0.75]} opacity={0.3} />
   <Shade texture={glow} {...shade.dog} size={[1.4, 0.7]} opacity={0.3} />
   {/* Charco de luz cálida de la farola sobre la hierba. */}
   <mesh position={[lampGlass[0] - 0.95, 0.06, lampGlass[2] - 0.45]} rotation-x={-Math.PI / 2} scale={3.7}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#ff9c45" transparent opacity={0.26} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
   </mesh>
   <Fireflies />
   <FallingLeaves />
   <ShootingStar />

   {/* Luna detrás del árbol, a la izquierda: de ahí viene la luz que recorta las siluetas. */}
   <mesh ref={moon} geometry={models.moon} material={material.moon} position={[-6.2, 9.4, -44]} scale={3.3} />
   <mesh ref={halo} position={[-6.2, 9.4, -45]} scale={17}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#5672d6" transparent opacity={0.34} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
   </mesh>
  </group>
 );
}

// Las luces del islote. Viven fuera de él y no se desmontan nunca: al llegar al
// planeta se quedan apagadas. Si salieran de la escena cambiaría el conjunto de
// luces y el renderer recompilaría todos los materiales iluminados justo al
// aterrizar (un tirón de ~280 ms). Es lo mismo que hace WarmLights de día.
const ISLET_LIGHTS = [
 // La farola: cálida y de alcance corto; ilumina el suelo y a los dos
 // protagonistas. Va algo por debajo y por delante del farol, para no quemar
 // su armazón, y respira un poco.
 { color: "#ffab5c", position: [lampGlass[0] - 0.3, lampGlass[1] - 0.5, lampGlass[2] + 0.45], power: 17, distance: 7.5, decay: 1.8, flicker: true },
 // Los farolillos del árbol: una luz tenue bajo la copa.
 { color: "#ff9a4a", position: onTree([-0.6, 2.2, 1.6]), power: 3.2, distance: 5.5, decay: 1.6 },
 // Relleno azul desde abajo: dibuja los estratos de la roca.
 { color: "#7f9dff", position: [0.8, -3.6, 7.2], power: 21, distance: 16, decay: 1.5 },
 // Un punto de luz fría por delante, muy suave: las caras a contraluz no quedan negras.
 { color: "#a9bdff", position: [-2.2, 2.4, 7.5], power: 12, distance: 14, decay: 1.5 },
];

function IsletLights() {
 const lights = useRef([]);
 useFrame(({ clock }) => {
  const on = rig.intro > 0;
  const time = clock.elapsedTime;
  ISLET_LIGHTS.forEach((spec, i) => {
   const breath = spec.flicker ? 1 + 0.05 * Math.sin(time * 7.3) + 0.04 * Math.sin(time * 13.1) : 1;
   lights.current[i].intensity = on ? spec.power * breath : 0;
  });
 });
 return (
  <group position={WELCOME.origin}>
   {ISLET_LIGHTS.map((spec, i) => (
    <pointLight key={i} ref={(node) => (lights.current[i] = node)} color={spec.color} position={spec.position} intensity={spec.power} distance={spec.distance} decay={spec.decay} />
   ))}
  </group>
 );
}

// Monta el islote mientras dura la bienvenida y conduce el descenso.
export function Welcome({ onMounted }) {
 const [mounted, setMounted] = useState(rig.intro > 0);
 const point = useMemo(() => new THREE.Vector3(), []);
 const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
 useFrame(({ camera, size }, delta) => {
  // Mientras no existe el jugador (el planeta aún se está montando), la cámara
  // de la bienvenida se coloca desde aquí; después la lleva Player.jsx.
  if (rig.intro === 1) {
   const pose = welcomePose(size.width / size.height);
   const [ox, oy, oz] = WELCOME.origin;
   camera.position.set(ox + pose.camera[0], oy + pose.camera[1], oz + pose.camera[2]);
   camera.lookAt(point.set(ox + pose.look[0], oy + pose.look[1], oz + pose.look[2]));
  }
  if (rig.intro === rig.introTarget) return;
  // Con «reducir movimiento» no hay viaje: se llega enseguida.
  const step = Math.min(delta, 0.05) / (reduced ? 0.35 : DESCENT);
  rig.intro = Math.max(rig.introTarget, rig.intro - step);
  if (rig.intro === 0) {
   setMounted(false);
   emit("arrived"); // la interfaz de juego aparece al llegar
  }
 });
 return (
  <>
   <IsletLights />
   {mounted && <Islet onMounted={onMounted} />}
  </>
 );
}
