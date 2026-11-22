import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { lights } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
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
import { aim, keepAbove } from "../characters/bones";
import { HAMMOCK, HAMMOCK_MID, HAMMOCK_TURN, bedHeight, createHammock, createKnots } from "./intro/hammock";
import { ISLET, TREE_LANTERNS, createFloater, createIslet, createLanternFrame, createTreeExtras, isletEdge } from "./intro/isletModels";
import { celestial, createClouds, createGlobe, createMoon, createStreak } from "./intro/skyModels";
import { sceneLights } from "./lightSources";
import { lambert } from "./materials";
import { WELCOME, emit, rig, welcomePose } from "./state";
import { createGlowTexture } from "./textures";

// Bienvenida: un islote flotando en el espacio, de noche, con el astronauta y
// Woody bajo un árbol con farolillos y una farola encendida. Es la portada del
// portfolio. Al entrar, la cámara desciende de aquí al planeta mientras
// amanece (ver `rig.intro` en state.js y la mezcla de cámara en Player.jsx).
//
// La luz: la luna, detrás a la izquierda, recorta las siluetas y da sombras (es
// la luz direccional de la escena; ver theme.js y Lights.jsx). La farola es una
// luz puntual con sombras de verdad; cada farolillo ilumina las hojas que tiene
// cerca; una luz azul desde abajo dibuja la roca. Todas estas luces puntuales
// son solo del islote: no están en la escena, sino en un conjunto de luces
// propio (`lightsNode`) que llevan los materiales de aquí. Los materiales del
// planeta ni las ven ni pagan por ellas. Nada supera el blanco salvo los
// cristales encendidos y las luciérnagas: solo ahí hay resplandor.
//
// En el cielo: la luna (grande, con cráteres, girando muy despacio), estrellas
// fugaces cada pocos segundos y, abajo, The Living World visto desde lejos,
// girando: es a donde se aterriza.

const DESCENT = 2.8; // segundos que dura el viaje al planeta
const TREE = { position: [-0.55, 0, -0.9], turn: 0.35, scale: 0.9 };
const LAMP = { position: [2.3, 0, 2.0], scale: 0.86 };
// Dónde aterriza el astronauta al bajarse de la hamaca y dónde duerme Woody
// (debajo de la hamaca, un poco hacia la cámara para que se le vea).
const ASTRONAUT = [0.3, 0, 1.15];
const DOG = [0.72, 0.03, 0.78]; // (sobre la hierba, como las plantas: la isla no es plana del todo)
const STAGE = 1.1; // los protagonistas, algo mayores que en el juego: son el centro de la portada
const ONLY_TREE = ["frondoso"];
const MOON_DEPTH = -44;
const MOON_SIZE = 5.0; // radio (antes 3,4)
const MOON_LIGHT = [-0.55, 0.6, 0.58];
// El planeta de destino: dónde cae en pantalla (−1…1 desde el centro), lo que
// mide (radio, en fracción de media altura) y a qué distancia de la cámara se
// pone. En horizontal va bajo el título, a la izquierda del islote; en vertical,
// abajo a la izquierda, asomando tras él.
const GLOBE = { wide: { at: [-0.3, -0.5], size: 0.21 }, tall: { at: [-0.66, -0.415], size: 0.085 }, depth: 70, light: [-0.45, 0.62, 0.64] };
// Estrellas fugaces: cada cuánto (s), cuánto duran y por dónde cruzan (en pantalla).
const SHOOTING = { every: [4, 8], lasts: 1.15, depth: 90 };
// Dónde queda un punto del árbol (a escala 1) dentro del islote.
const onTree = ([x, y, z]) => {
 const cos = Math.cos(TREE.turn), sin = Math.sin(TREE.turn);
 return [TREE.position[0] + (x * cos + z * sin) * TREE.scale, y * TREE.scale, TREE.position[2] + (-x * sin + z * cos) * TREE.scale];
};
const lampGlass = [LAMP.position[0] + LAMP_GLASS[0] * LAMP.scale, LAMP_GLASS[1] * LAMP.scale, LAMP.position[2]];
// El punto del árbol tras el que asoma la luna: arriba, a la izquierda de la copa.
const MOON_BEHIND = onTree([-3.7, 4.35, -0.6]);
const MOON_BEHIND_TALL = onTree([-1.75, 5.2, -0.6]);

// Punto del espacio que cae en la posición de pantalla `at` (−1…1 desde el
// centro), a `depth` metros de la cámara de la bienvenida; y lo que mide ahí
// media altura de pantalla. Relativo al islote.
const basis = { forward: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), eye: new THREE.Vector3(), world: new THREE.Vector3(0, 1, 0) };
function onScreen(aspect, at, depth, target) {
 const pose = welcomePose(aspect);
 basis.eye.set(...pose.camera);
 basis.forward.set(...pose.look).sub(basis.eye).normalize();
 basis.right.crossVectors(basis.forward, basis.world).normalize();
 basis.up.crossVectors(basis.right, basis.forward);
 const half = Math.tan((WELCOME.fov * Math.PI) / 360) * depth;
 target.copy(basis.eye).addScaledVector(basis.forward, depth).addScaledVector(basis.right, at[0] * half * aspect).addScaledVector(basis.up, at[1] * half);
 return half;
}

// Las luces del islote (posiciones relativas a él). La de la farola da sombra.
// (Con una luz puntual con sombras, three r183 falla al dibujar dentro del
// posproceso; un foco abierto da el mismo charco de luz y sí funciona.)
const LIGHTS = [
 // La farola: cálida, justo bajo el farol. Deja un charco de luz en la hierba y
 // tiñe el lado derecho de los protagonistas. Respira un poco.
 // Es un foco muy abierto que mira hacia abajo y un poco hacia ellos, con sombras.
 { color: "#ffa24e", position: [lampGlass[0], lampGlass[1] - 0.24, lampGlass[2]], aim: [lampGlass[0] - 0.7, 0, lampGlass[2] - 0.25], power: 27, distance: 9, decay: 2, flicker: true, shadow: true },
 // Lo poco que el farol da hacia los lados y hacia arriba.
 { color: "#ffa24e", position: [lampGlass[0] - 0.1, lampGlass[1], lampGlass[2] + 0.3], power: 2.2, distance: 4, decay: 2, flicker: true },
 // Los farolillos: cada uno ilumina las hojas y las ramas que tiene cerca.
 ...TREE_LANTERNS.map(([x, y, z]) => ({ color: "#ffad55", position: onTree([x, y - 0.05, z]), power: 1.5, distance: 2.8, decay: 2 })),
 // Relleno azul desde abajo: dibuja los estratos de la roca.
 { color: "#7f9dff", position: [0.6, -3.2, 6.6], power: 20, distance: 18, decay: 1.5 },
 // Luz fría por delante a la izquierda, suave: el lado de la luna no queda negro.
 { color: "#86a8ff", position: [-5.5, 2.8, 5.5], power: 13, distance: 16, decay: 1.5 },
 // Un toque para la roca que flota arriba a la derecha, lejos de las demás luces.
 { color: "#8aa6ff", position: [3.6, 2.9, -1.6], power: 5, distance: 5.5, decay: 1.6 },
];
function createLights() {
 const [ox, oy, oz] = WELCOME.origin;
 const points = LIGHTS.map((spec) => {
  const light = spec.aim ? new THREE.SpotLight(spec.color, spec.power, spec.distance, 1.2, 0.85, spec.decay) : new THREE.PointLight(spec.color, spec.power, spec.distance, spec.decay);
  light.position.set(ox + spec.position[0], oy + spec.position[1], oz + spec.position[2]);
  light.updateMatrixWorld();
  if (spec.aim) {
   light.target.position.set(ox + spec.aim[0], oy + spec.aim[1], oz + spec.aim[2]);
   light.target.updateMatrixWorld();
  }
  if (spec.shadow) {
   light.castShadow = true;
   light.shadow.mapSize.set(1024, 1024);
   light.shadow.camera.near = 0.1;
   light.shadow.camera.far = spec.distance;
   light.shadow.bias = -0.002;
   light.shadow.normalBias = 0.02;
  }
  return light;
 });
 // Con las dos luces de la escena: el cielo y la luna (que también da sombra).
 const node = lights([sceneLights.hemisphere, sceneLights.sun, ...points]);
 return { points, node };
}

// Copia de un personaje riggeado, con su material facetado y sus clips en
// bucle. `clips`: [{ name, only?, except? }]; `only` y `except` eligen huesos
// (expresión regular), para sumar dos clips: sentado + la cola de otro.
function Poser({ url, palette, clips, position, rotation, scale, lightsNode, onPose }) {
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
     const material = new MeshLambertNodeMaterial({ color: spec.color ?? original.color, emissive: spec.emissive ?? "#000000", emissiveIntensity: spec.glow ?? 0, flatShading: true });
     material.lightsNode = lightsNode;
     materials.set(original.name, material);
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
  const bones = {};
  copy.traverse((node) => node.isBone && (bones[node.name] = node));
  return { copy, mixer, materials, bones };
 }, [scene, animations, palette, clips, lightsNode]);
 useEffect(
  () => () => {
   model.mixer.stopAllAction();
   model.materials.forEach((material) => material.dispose());
  },
  [model],
 );
 useFrame((_, delta) => {
  model.mixer.update(Math.min(delta, 0.05));
  if (onPose) {
   model.copy.updateMatrixWorld(true);
   onPose(model);
  }
 });
 return <primitive object={model.copy} position={position} rotation={rotation} scale={scale} />;
}
const ASTRONAUT_CLIPS = [{ name: "Astro_Idle_Breathe" }];
// Woody, durmiendo en el suelo.
const WOODY_CLIPS = [{ name: "Woody_Sleep" }];

// ── La hamaca (objetivo 27, A4) ─────────────────────────────────────────────
// Estado compartido: el balanceo y el salto al pulsar «Haz clic para aterrizar».
const hammock = { start: -1, hop: 0, swing: 0, lying: true, sleeping: true };
const HOP_ARC = 0.32; // altura del salto (m)
// Balanceo en el instante `time` (s): lento; al saltar, un empujón que se apaga.
function swingAt(time) {
 let swing = HAMMOCK.swing * Math.sin((time * Math.PI * 2) / HAMMOCK.period);
 if (hammock.start >= 0) {
  const since = (performance.now() - hammock.start) / 1000;
  swing += 0.09 * Math.exp(-since / 1.1) * Math.sin(since * 4.2);
 }
 return swing;
}
// Marco de la hamaca → isla.
const frame = { q: new THREE.Quaternion(), turn: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), HAMMOCK_TURN), roll: new THREE.Quaternion(), z: new THREE.Vector3(0, 0, 1) };
function hammockFrame(swing) {
 frame.roll.setFromAxisAngle(frame.z, swing);
 return frame.q.copy(frame.turn).multiply(frame.roll);
}
const toIslet = (local, target) => target.copy(local).applyQuaternion(frame.q).add(scratch.mid);
// El cuerpo tumbado, en el marco de la hamaca: la cabeza hacia el árbol y algo
// levantada, la cara arriba. Columnas de la base: x del modelo, y (hacia la
// cabeza), z (hacia donde mira).
const LYING = (() => {
 const up = new THREE.Vector3(0, 0.44, -0.9).normalize();
 const side = new THREE.Vector3(1, 0, 0);
 const face = new THREE.Vector3().crossVectors(side, up);
 return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, face));
})();
const STANDING = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.12);
// Piernas en el marco de la hamaca: la izquierda estirada en la tela; la
// derecha (la del lado de la cámara) por fuera del borde, colgando.
// Y las manos detrás de la cabeza: el brazo, hacia fuera y hacia la cabeza; el
// antebrazo, de vuelta por detrás de ella.
const LEGS = {
 Thigh_L: new THREE.Vector3(0.06, 0.2, 1),
 Shin_L: new THREE.Vector3(0.02, 0.06, 1),
 Thigh_R: new THREE.Vector3(-0.85, 0.05, 0.55),
 Shin_R: new THREE.Vector3(-0.12, -1, 0.08),
 UpperArm_L: new THREE.Vector3(0.75, 0.35, -0.55),
 Forearm_L: new THREE.Vector3(-0.7, 0.3, -0.45),
 UpperArm_R: new THREE.Vector3(-0.75, 0.35, -0.55),
 Forearm_R: new THREE.Vector3(0.7, 0.3, -0.45),
};
const LEG_CHILD = { Thigh_L: "Shin_L", Shin_L: "Foot_L", Thigh_R: "Shin_R", Shin_R: "Foot_R", UpperArm_L: "Forearm_L", Forearm_L: "Hand_L", UpperArm_R: "Forearm_R", Forearm_R: "Hand_R" };
const scratch = { mid: new THREE.Vector3(...HAMMOCK_MID), hips: new THREE.Vector3(), target: new THREE.Vector3(), lying: new THREE.Vector3(), dir: new THREE.Vector3(), q: new THREE.Quaternion(), origin: new THREE.Vector3(...WELCOME.origin) };
const ease = (x) => x * x * (3 - 2 * x);

function poseAstronaut({ copy, bones }) {
 const swing = hammock.swing;
 hammockFrame(swing);
 const e = ease(hammock.hop);
 // Orientación: de tumbado (con la hamaca) a de pie, de cara a la cámara.
 scratch.q.copy(frame.q).multiply(LYING).slerp(STANDING, e);
 copy.quaternion.copy(scratch.q);
 // Posición: las caderas, sobre la tela; de pie, los pies en el sitio de aterrizaje. Entre medias, un arco.
 copy.position.set(0, 0, 0);
 copy.updateMatrixWorld(true);
 bones.Hips.getWorldPosition(scratch.hips).sub(scratch.origin);
 toIslet(scratch.target.set(0, bedHeight(0, 0.12) + 0.13, 0.12), scratch.lying).sub(scratch.hips);
 copy.position.copy(scratch.lying).lerp(scratch.target.set(...ASTRONAUT), e);
 copy.position.y += 4 * hammock.hop * (1 - hammock.hop) * HOP_ARC;
 copy.updateMatrixWorld(true);
 // Las piernas, mientras está en la hamaca (y a medias durante el salto).
 const weight = 1 - ease(Math.min(1, hammock.hop * 1.6));
 // La mochila asomaría por debajo de la tela: tumbado, no se ve; vuelve al saltar.
 bones.Backpack.scale.setScalar(Math.max(0.001, 1 - weight));
 if (weight <= 0) return;
 for (const [name, dir] of Object.entries(LEGS)) aim(bones[name], bones[LEG_CHILD[name]], scratch.dir.copy(dir).applyQuaternion(frame.q), weight);
}
const WOODY_TAIL = ["tail1", "tail2", "tail3", "tail4", "tail5"];
function poseWoody({ bones }) {
 // Nada de la cola por debajo de la hierba (A2): si un tramo baja, se apoya encima.
 keepAbove(WOODY_TAIL.map((name) => bones[name]), WELCOME.origin[1] + 0.045);
}

function Hammock({ material }) {
 const swinging = useRef(null);
 const models = useMemo(() => ({ hammock: createHammock(), knots: createKnots() }), []);
 useEffect(() => () => Object.values(models).forEach((one) => one.dispose()), [models]);
 useEffect(() => {
  if (import.meta.env.DEV) window.__world.hammock = hammock; // para las pruebas automáticas
 }, []);
 useFrame(({ clock }) => {
  if (hammock.start >= 0) hammock.hop = Math.min(1, (performance.now() - hammock.start) / (HAMMOCK.hop * 1000));
  hammock.lying = hammock.start < 0;
  hammock.swing = swingAt(clock.elapsedTime);
  swinging.current.rotation.z = hammock.swing;
 });
 return (
  <>
   <group position={HAMMOCK_MID} rotation-y={HAMMOCK_TURN}>
    <mesh ref={swinging} geometry={models.hammock} material={material} castShadow receiveShadow />
   </group>
   <mesh geometry={models.knots} material={material} castShadow />
  </>
 );
}

// Sombra de contacto, muy suave, bajo cada protagonista. Las sombras de verdad
// son las de la farola y las de la luna.
function Shade({ position, size, turn = 0, opacity = 0.4, texture }) {
 return (
  <mesh position={position} rotation={[-Math.PI / 2, 0, turn]} scale={[size[0], size[1], 1]}>
   <planeGeometry />
   <meshBasicMaterial map={texture} color="#02040c" transparent opacity={opacity} depthWrite={false} />
  </mesh>
 );
}
// Escribe posición y tamaño de la copia `i` de una malla con instancias (sin giro).
function place(mesh, i, x, y, z, size) {
 const m = mesh.instanceMatrix.array, o = i * 16;
 m[o] = m[o + 5] = m[o + 10] = size;
 m[o + 12] = x;
 m[o + 13] = y;
 m[o + 14] = z;
 m[o + 15] = 1;
}

// Luciérnagas: rondan el claro en curvas lentas y se encienden y apagan. Una
// sola malla con instancias.
function Fireflies({ count = 34 }) {
 const mesh = useRef(null);
 const flies = useMemo(() => {
  const random = randomFrom(0.27);
  return Array.from({ length: count }, (_, i) => {
   // Dos de cada tres, en el claro; el resto, más abiertas: alrededor y por debajo del islote.
   const wide = i % 3 === 2;
   return { x: (random() - 0.5) * (wide ? 11 : 6.2), y: wide ? -1.6 + random() * 6.4 : 0.5 + random() * 3.2, z: (random() - 0.2) * (wide ? 6.5 : 4.2), phase: random() * 20, speed: 0.16 + random() * 0.2, reach: 0.5 + random() * 0.7, size: 0.75 + random() * 0.5 };
  });
 }, [count]);
 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  flies.forEach((f, i) => {
   const t = time * f.speed + f.phase;
   // Dos senos de distinto ritmo por eje: una curva que no se repite a la vista.
   place(
    mesh.current,
    i,
    f.x + (Math.sin(t) + Math.sin(t * 0.43 + 1.7) * 0.6) * f.reach,
    f.y + (Math.sin(t * 0.71 + 2.1) + Math.sin(t * 1.9) * 0.25) * 0.3,
    f.z + (Math.cos(t * 0.83) + Math.sin(t * 0.37 + 0.6) * 0.6) * f.reach,
    f.size * Math.max(0.05, 0.55 + 0.45 * Math.sin(time * 1.3 + f.phase * 3)),
   );
  });
  mesh.current.instanceMatrix.needsUpdate = true;
 });
 return (
  <instancedMesh ref={mesh} args={[null, null, count]} frustumCulled={false}>
   <octahedronGeometry args={[0.04, 0]} />
   <meshBasicMaterial color={[2.4, 2.1, 0.7]} toneMapped={false} fog={false} />
  </instancedMesh>
 );
}

// Polvo luminoso: motas diminutas que suben muy despacio por todo el islote,
// meciéndose, y titilan. Más densas bajo la farola y en la copa.
function Dust({ count = 130 }) {
 const mesh = useRef(null);
 const motes = useMemo(() => {
  const random = randomFrom(0.44);
  return Array.from({ length: count }, (_, i) => {
   const near = i % 4 === 0; // una de cada cuatro, en la luz de la farola
   return {
    x: near ? LAMP.position[0] - 0.4 + (random() - 0.5) * 2.6 : (random() - 0.5) * 12,
    z: near ? LAMP.position[2] + (random() - 0.5) * 2.2 : -3 + random() * 7.5,
    from: near ? 0.1 : -3.2,
    rise: near ? 3.2 : 9.2,
    speed: 0.035 + random() * 0.05,
    phase: random(),
    sway: 0.12 + random() * 0.3,
    blink: 0.7 + random() * 1.6,
    size: 0.35 + random() * 0.65,
   };
  });
 }, [count]);
 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  motes.forEach((d, i) => {
   const t = (time * d.speed + d.phase) % 1; // 0–1: sube y vuelve a empezar
   const fade = Math.min(1, t * 6, (1 - t) * 6);
   place(mesh.current, i, d.x + Math.sin(time * 0.4 + d.phase * 30) * d.sway, d.from + t * d.rise, d.z + Math.cos(time * 0.31 + d.phase * 17) * d.sway, d.size * fade * (0.55 + 0.45 * Math.sin(time * d.blink + d.phase * 40)));
  });
  mesh.current.instanceMatrix.needsUpdate = true;
 });
 return (
  <instancedMesh ref={mesh} args={[null, null, count]} frustumCulled={false}>
   <octahedronGeometry args={[0.022, 0]} />
   <meshBasicMaterial color={[1.9, 1.75, 1.25]} toneMapped={false} fog={false} />
  </instancedMesh>
 );
}

// Hojas que se sueltan de la copa de vez en cuando y caen meciéndose.
function FallingLeaves({ count = 7, lightsNode }) {
 const group = useRef(null);
 const leaves = useMemo(() => {
  const random = randomFrom(0.52);
  return Array.from({ length: count }, (_, i) => {
   const [x, y, z] = onTree([-2.4 + random() * 3.6, 3.0 + random() * 0.8, -0.6 + random() * 1.3]);
   return { x, y, z, every: 9 + random() * 8, offset: (i / count) * 13 + random() * 3, fall: 4.2 + random() * 1.6, sway: 0.25 + random() * 0.3, spin: 1 + random() * 2 };
  });
 }, [count]);
 const materials = useMemo(
  () =>
   ["#a3d86a", "#8fcf62", "#d6c35a"].map((color) => {
    const material = new MeshLambertNodeMaterial({ color, side: THREE.DoubleSide });
    material.lightsNode = lightsNode;
    return material;
   }),
  [lightsNode],
 );
 useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
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
   {leaves.map((_, i) => (
    <mesh key={i} visible={false}>
     <planeGeometry args={[0.13, 0.08]} />
     <primitive object={materials[i % materials.length]} attach="material" />
    </mesh>
   ))}
  </group>
 );
}

// Estrellas fugaces: cada pocos segundos una cruza el cielo, con la cabeza
// brillante y una cola que se alarga y se apaga. Hay dos trazos por si una
// sale antes de que termine la anterior.
function ShootingStars({ glow }) {
 const group = useRef(null);
 const streak = useMemo(createStreak, []);
 useEffect(() => () => streak.dispose(), [streak]);
 const state = useRef({ next: 1.2, live: [{ start: -1 }, { start: -1 }], count: 0 });
 const from = useMemo(() => new THREE.Vector3(), []);
 const to = useMemo(() => new THREE.Vector3(), []);
 useEffect(() => {
  if (import.meta.env.DEV) window.__world.shooting = state.current; // para las pruebas automáticas
 }, []);
 useFrame(({ clock, size }) => {
  const s = state.current;
  const time = clock.elapsedTime;
  const aspect = size.width / size.height;
  if (time > s.next) {
   const free = s.live.find((one) => one.start < 0);
   if (free) {
    // Sale de lo alto del cielo y cae en diagonal. En horizontal, por la
    // izquierda (sobre el título): en el centro está la luna y a la derecha el
    // árbol. En vertical, por cualquier parte de arriba.
    const tall = aspect < 1;
    const x = tall ? -0.8 + Math.random() * 1.5 : -0.95 + Math.random() * 0.55;
    const y = (tall ? 0.6 : 0.5) + Math.random() * 0.4;
    const way = tall ? (x > 0 ? -1 : 1) : x < -0.7 ? 1 : -1;
    const run = 0.34 + Math.random() * 0.16;
    const half = onScreen(aspect, [x, y], SHOOTING.depth, from);
    onScreen(aspect, [x + (way * run) / aspect, y - run * (0.6 + Math.random() * 0.3)], SHOOTING.depth, to);
    Object.assign(free, { start: time, from: from.clone(), to: to.clone(), size: half * (0.02 + Math.random() * 0.006) });
    s.count += 1;
   }
   s.next = time + SHOOTING.every[0] + Math.random() * (SHOOTING.every[1] - SHOOTING.every[0]);
  }
  s.active = 0;
  s.live.forEach((one, i) => {
   const star = group.current.children[i];
   const t = one.start < 0 ? 2 : (time - one.start) / SHOOTING.lasts;
   if (t > 1) {
    star.visible = false;
    one.start = -1;
    return;
   }
   s.active += 1;
   star.visible = true;
   // Arranca deprisa y se frena un poco; la cola crece al principio y se recoge al final.
   const travelled = t * (1.35 - 0.35 * t);
   star.position.lerpVectors(one.from, one.to, travelled);
   star.rotation.z = Math.atan2(one.to.y - one.from.y, one.to.x - one.from.x);
   const bright = Math.min(1, t * 10) * Math.min(1, (1 - t) * 3) * Math.min(1, rig.intro * 1.6);
   const [trail, head] = star.children;
   trail.scale.set(one.size * Math.min(1, 0.15 + t * 2.2) * Math.min(1, (1 - t) * 2.4 + 0.2), one.size, 1);
   trail.material.color.setScalar(bright * 3.6);
   head.scale.setScalar(one.size * 3.2);
   head.material.opacity = bright;
  });
 });
 return (
  <group ref={group}>
   {[0, 1].map((i) => (
    <group key={i} visible={false}>
     <mesh geometry={streak} frustumCulled={false}>
      <meshBasicMaterial vertexColors transparent depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
     </mesh>
     <mesh frustumCulled={false}>
      <planeGeometry />
      <meshBasicMaterial map={glow} color="#dfe9ff" transparent opacity={0} depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} />
     </mesh>
    </group>
   ))}
  </group>
 );
}

// The Living World, a lo lejos: el planeta al que se va a aterrizar. Gira
// despacio sobre un eje inclinado, con sus nubes un poco más deprisa y un halo
// de atmósfera. Se apaga al emprender el descenso (el de verdad queda debajo).
function Destination({ glow }) {
 const group = useRef(null);
 const globe = useRef(null);
 const clouds = useRef(null);
 const air = useRef(null);
 const models = useMemo(() => ({ globe: createGlobe(), clouds: createClouds() }), []);
 const material = useMemo(() => ({ globe: celestial(GLOBE.light, { ambient: 0.13, strength: 1.0 }), clouds: celestial(GLOBE.light, { ambient: 0.16, strength: 1.05 }) }), []);
 useEffect(
  () => () => {
   Object.values(models).forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  },
  [models, material],
 );
 useEffect(() => {
  if (import.meta.env.DEV) window.__world.destination = { globe: globe.current, group: group.current }; // para las pruebas automáticas
 }, []);
 useFrame(({ clock, size }) => {
  const aspect = size.width / size.height;
  const spot = aspect < 1 ? GLOBE.tall : GLOBE.wide;
  const half = onScreen(aspect, spot.at, GLOBE.depth, group.current.position);
  group.current.scale.setScalar(half * spot.size);
  const time = clock.elapsedTime;
  globe.current.rotation.y = time * 0.06;
  clouds.current.rotation.y = time * 0.085;
  const shown = Math.min(1, rig.intro * 1.6);
  material.globe.opacity = shown;
  material.clouds.opacity = shown * 0.92;
  air.current.material.opacity = shown * 0.5;
 });
 return (
  <group ref={group}>
   {/* Eje inclinado, como un planeta de verdad. */}
   <group rotation={[0.32, 0, -0.38]}>
    <mesh ref={globe} geometry={models.globe} material={material.globe} />
    <mesh ref={clouds} geometry={models.clouds} material={material.clouds} />
   </group>
   <mesh ref={air} scale={3.3} position={[0, 0, -1.2]}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#4fa8ff" transparent opacity={0.5} depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} />
   </mesh>
  </group>
 );
}

// Rocas que flotan alrededor, a distintas distancias; suben y bajan despacio.
const FLOATERS = [[-3.1, -1.25, 1.3, 0.44, 0.4], [3.0, 4.3, -3.6, 0.5, 1.9], [2.6, -1.75, 1.0, 0.32, 3.1], [-2.4, -1.9, -1.6, 0.26, 4.4], [3.3, -0.9, -4.6, 0.4, 5.2]];
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
 const corona = useRef(null);
 const glow = useMemo(() => createGlowTexture(), []);
 const paint = useFlora(ONLY_TREE);
 const models = useMemo(() => ({ islet: createIslet(), extras: createTreeExtras(), lamp: createLamp(), lanterns: TREE_LANTERNS.map(([, , , thread]) => createLanternFrame(thread)), moon: createMoon(), plants: createPlantModels() }), []);
 const tree = useMemo(() => paint("frondoso", { bark: BARK.old, leaf: ["#5fae52", "#bfe680"], vary: 0.2 }), [paint]);
 useEffect(() => () => tree.dispose(), [tree]);
 const lighting = useMemo(createLights, []);
 const material = useMemo(() => {
  const lit = {
   still: lambert(),
   cloth: lambert({ side: THREE.DoubleSide }),
   tree: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.tree, power: 2, cap: 7 }),
   blades: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.grass, cap: 0.9 }),
   flowers: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.flower, cap: 0.45 }),
  };
  Object.values(lit).forEach((one) => (one.lightsNode = lighting.node));
  return { ...lit, moon: celestial(MOON_LIGHT, { ambient: 0.22, strength: 0.84, contrast: 1.9 }) };
 }, [lighting]);
 useEffect(() => () => lighting.points.forEach((light) => light.dispose()), [lighting]);
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
  const stage = (x, z) => (x > ASTRONAUT[0] - 0.75 && x < DOG[0] + 0.75 && z > ASTRONAUT[2] - 0.35) || Math.hypot(x - DOG[0], z - DOG[2]) < 0.85 || Math.hypot(x - HAMMOCK_MID[0], z - HAMMOCK_MID[2]) < 0.9;
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
   mushrooms: scatter(3, 0.5, [tx - 0.6, tz + 1.5], [1.2, 0.5]), // (al otro lado del tronco: bajo la hamaca duerme Woody)
   // Césped corto donde están los protagonistas: se les ven los pies.
   lawn: Array.from({ length: 22 }, (_, i) => ({ position: [ASTRONAUT[0] - 0.6 + ((i * 0.37) % 1) * (DOG[0] - ASTRONAUT[0] + 0.5), 0.03, ASTRONAUT[2] - 0.2 + ((i * 0.61) % 1) * 1.5], rotation: [0, i * 2.1, 0], scale: [0.9, 0.42, 0.9], color: "#f2ffe6" })).filter((item) => isletEdge(item.position[0], item.position[2]) < 0.93),
   clover: scatter(5, all * 0.7),
  };
 }, []);

 useFrame(({ size, clock }) => {
  // La luna y las luces del islote se apagan al marcharse.
  const shown = Math.min(1, rig.intro * 1.6);
  material.moon.opacity = shown;
  // El halo respira muy despacio.
  const breathing = 1 + 0.05 * Math.sin(clock.elapsedTime * 0.7);
  halo.current.material.opacity = shown * 0.34 * breathing;
  corona.current.material.opacity = shown * 0.5 * breathing;
  const time = clock.elapsedTime;
  lighting.points.forEach((light, i) => {
   const breath = LIGHTS[i].flicker ? 1 + 0.05 * Math.sin(time * 7.3) + 0.04 * Math.sin(time * 13.1) : 1;
   light.intensity = LIGHTS[i].power * breath * shown;
  });
  // La luna queda siempre detrás de la copa, asomando por encima a la
  // izquierda: se pone en la línea que va de la cámara a ese punto del árbol.
  // (En vertical, más centrada: a la izquierda se saldría de la pantalla.)
  const aspect = size.width / size.height;
  const { camera } = welcomePose(aspect);
  const behind = aspect < 1 ? MOON_BEHIND_TALL : MOON_BEHIND;
  const far = (MOON_DEPTH - camera[2]) / (behind[2] - camera[2]);
  const x = camera[0] + (behind[0] - camera[0]) * far, y = camera[1] + (behind[1] - camera[1]) * far;
  moon.current.position.set(x, y, MOON_DEPTH);
  // Gira muy despacio sobre un eje algo inclinado (su luz no gira con ella).
  moon.current.rotation.set(0.18, time * 0.022, 0.1);
  halo.current.position.set(x, y, MOON_DEPTH - 1);
  corona.current.position.set(x, y, MOON_DEPTH - 0.6);
 });
 useEffect(() => {
  if (import.meta.env.DEV) Object.assign(window.__world, { moon: moon.current, THREE, welcomeOrigin: WELCOME.origin }); // para las pruebas automáticas
 }, []);

 const plants = models.plants;
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

   <Hammock material={material.cloth} />
   <Poser url="/models/characters/astronauta.glb" palette={ASTRONAUT_PALETTE} clips={ASTRONAUT_CLIPS} scale={ASTRONAUT_SCALE * STAGE} lightsNode={lighting.node} onPose={poseAstronaut} />
   <Poser url="/models/characters/woody.glb" palette={WOODY_PALETTE} clips={WOODY_CLIPS} position={DOG} rotation={[0, -1.1, 0]} scale={WOODY_SCALE * STAGE} lightsNode={lighting.node} onPose={poseWoody} />
   <Shade texture={glow} position={[HAMMOCK_MID[0], 0.04, HAMMOCK_MID[2]]} size={[0.9, 2.4]} turn={HAMMOCK_TURN} opacity={0.26} />
   <Shade texture={glow} position={[DOG[0], 0.04, DOG[2]]} size={[1.0, 1.0]} opacity={0.3} />
   <Fireflies />
   <Dust />
   <FallingLeaves lightsNode={lighting.node} />
   <ShootingStars glow={glow} />
   <Destination glow={glow} />

   {/* Luna detrás de la copa: de ahí viene la luz que recorta las siluetas.
       Dos halos: uno ceñido y claro, otro amplio y azul. */}
   <mesh ref={moon} geometry={models.moon} material={material.moon} scale={MOON_SIZE} />
   <mesh ref={corona} scale={MOON_SIZE * 3.1}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#a9bcff" transparent opacity={0.5} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
   </mesh>
   <mesh ref={halo} scale={MOON_SIZE * 6.4}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#5672d6" transparent opacity={0.34} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
   </mesh>
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
  // Antes de bajar, el astronauta salta de la hamaca (como mucho medio segundo;
  // con «reducir movimiento», nada: se pone de pie y se va).
  if (rig.intro === 1) {
   if (hammock.start < 0) hammock.start = performance.now() - (reduced ? HAMMOCK.hop * 1000 : 0);
   if (performance.now() - hammock.start < HAMMOCK.hop * 1000) return;
  }
  // Con «reducir movimiento» no hay viaje: se llega enseguida.
  const step = Math.min(delta, 0.05) / (reduced ? 0.35 : DESCENT);
  rig.intro = Math.max(rig.introTarget, rig.intro - step);
  if (rig.intro === 0) {
   setMounted(false);
   emit("arrived"); // la interfaz de juego aparece al llegar
  }
 });
 return (
  mounted && <Islet onMounted={onMounted} />
 );
}
