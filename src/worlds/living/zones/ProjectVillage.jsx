import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { PROJECTS } from "../../../content/projects";
import { Instances } from "../../../experience/Instances";
import { useInteractable } from "../../../experience/interact";
import { lambert } from "../../../experience/materials";
import { emit, player } from "../../../experience/state";
import { createLabelTexture } from "../../../experience/textures";
import { createCottage } from "../buildings/cottageModels";
import { Glow } from "../buildings/Glow";
import { preloadBuilding, useBuilding } from "../buildings/useBuilding";
import { withSeeThrough } from "../../../experience/environment/seeThrough";
import { blob, limb, merge, piece, randomFrom } from "../kit/geometry";
import { CREAM, STONE, WOOD } from "../kit/palette";
import { BENCHES, PLAZA, PROJECT_CABINS, WELL } from "../layout";
import { COBBLE_TONES, SLAB_THICKNESS, createSlab } from "../props/cobbles";
import { LANTERN_GLASS, LANTERN_GLASS_SIZE, createLantern } from "../props/lampModel";

// Aldea de proyectos. Una plaza empedrada con su pozo y, alrededor, una casa
// por proyecto, cada una a su aire. La captura real del proyecto va en un
// escaparate adosado a la fachada, y encima, su único rótulo de madera con el
// nombre. Acercarse y pulsar E (o hacer clic) abre la ficha del proyecto.

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// Humo de chimenea: bocanadas que suben, crecen y se deshacen.
function Smoke({ position }) {
 const puffs = useRef([]);
 useFrame(({ clock }) => {
  puffs.current.forEach((puff, i) => {
   if (!puff) return;
   const t = (clock.elapsedTime * 0.22 + i / 5) % 1;
   puff.position.set(Math.sin(t * 5 + i) * 0.18 + t * 0.5, t * 2.3, Math.cos(t * 4 + i) * 0.12);
   puff.scale.setScalar(0.14 + t * 0.34);
   puff.material.opacity = Math.sin(t * Math.PI) * 0.5;
  });
 });
 return (
  <group position={position}>
   {Array.from({ length: 5 }, (_, i) => (
    <mesh key={i} ref={(node) => (puffs.current[i] = node)}>
     <icosahedronGeometry args={[1, 0]} />
     <meshLambertMaterial color="#f1ede6" transparent opacity={0} depthWrite={false} flatShading />
    </mesh>
   ))}
  </group>
 );
}

function Picture({ url, width, height, lift = 0.06 }) {
 const texture = useTexture(url);
 return (
  <mesh position-z={lift}>
   <planeGeometry args={[width, height]} />
   <meshBasicMaterial map={texture} toneMapped={false} fog={false} />
  </mesh>
 );
}

// Escaparate: un mueble de madera sobre zócalo de piedra, adosado a la casa. La
// parte de arriba (marco, captura y rótulo) va inclinada hacia quien mira.
const SHOWCASE = { width: 2.06, base: 0.4, tilt: -0.24 };
const createShowcaseBase = () =>
 merge([
  piece(box(SHOWCASE.width + 0.1, SHOWCASE.base, 0.62), { bottom: STONE.dark, top: STONE.light, jitter: 0.03, vary: 0.1, position: [0, SHOWCASE.base / 2, 0] }),
  // Jardinera al pie.
  piece(box(1.5, 0.2, 0.26), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.1, position: [0, 0.1, 0.44] }),
  ...[-0.5, -0.1, 0.35].map((x, i) => piece(blob(0), { bottom: "#3a8a47", top: "#86c95e", jitter: 0.16, seed: i, position: [x, 0.27, 0.44], scale: [0.2, 0.14, 0.14] })),
  ...[-0.35, 0.15, 0.55].map((x, i) => piece(new THREE.OctahedronGeometry(0.05, 0), { color: ["#ffd45a", "#ff8fb5", "#ffffff"][i], position: [x, 0.4, 0.46] })),
 ]);
// Origen en la bisagra (el borde de arriba del zócalo).
const createShowcaseTop = () =>
 merge([
  // Fondo oscuro del cristal y marco.
  piece(box(SHOWCASE.width - 0.08, 1.24, 0.08), { color: "#2a211b", position: [0, 0.66, 0] }),
  ...[-1, 1].map((side) => piece(box(0.11, 1.32, 0.16), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.08, position: [(side * (SHOWCASE.width - 0.03)) / 2, 0.66, 0.02] })),
  piece(box(SHOWCASE.width + 0.08, 0.1, 0.18), { color: WOOD.dark, position: [0, 0.05, 0.02] }),
  // El rótulo: una tabla clara encima del cristal.
  piece(box(SHOWCASE.width + 0.2, 0.62, 0.1), { bottom: WOOD.mid, top: WOOD.light, vary: 0.1, position: [0, 1.63, 0.03] }),
  piece(box(SHOWCASE.width + 0.3, 0.07, 0.16), { color: WOOD.dark, position: [0, 1.97, 0.03] }),
 ]);

// Edificio modelado en Blender (uno por proyecto, con identidad propia). La
// captura va dentro de su escaparate y el único rótulo, sobre la fachada. Al
// acercarse responde: se aviva la luz del escaparate y el rótulo da un bote.
const REBUILT = { 0: "taller" };
Object.values(REBUILT).forEach(preloadBuilding);

function Building({ project, site, name, models }) {
 const { x, z, turn } = site;
 const { geometry, anchors } = useBuilding(name);
 const label = useMemo(() => createLabelTexture(project.name.toUpperCase(), CREAM, { title: true }), [project]);
 useEffect(() => () => label.dispose(), [label]);
 const sign = useRef(null);
 const lamp = useRef(null);
 // Un punto del modelo (en sus ejes) llevado al mundo.
 const toWorld = ([px, py, pz]) => ({ x: x + px * Math.cos(turn) + pz * Math.sin(turn), y: py, z: z - 1.6 - px * Math.sin(turn) + pz * Math.cos(turn) });

 const open = () =>
  emit("open", {
   kind: "project",
   at: { ...toWorld(anchors.screen.position), distance: 0.42 }, // la cámara se acerca al escaparate antes de abrir la ficha
   eyebrow: `Proyecto · ${project.year}`,
   title: project.name,
   paragraphs: [project.tagline, project.description],
   tags: project.tags,
   image: project.images[0],
   link: project.link,
   linkLabel: "Ver proyecto",
  });
 const click = useInteractable({ position: { x, z: z + 2.4 }, radius: 3.4, hint: `Ver «${project.name}»`, anywhere: true, action: open });

 const state = useRef({ near: 0, wasNear: false, bounce: 1 });
 useFrame((_, rawDelta) => {
  const delta = Math.min(rawDelta, 0.05);
  const memo = state.current;
  const close = !player.hidden && Math.hypot(player.position.x - x, player.position.z - (z + 2.4)) < 3.4;
  memo.near += ((close ? 1 : 0) - memo.near) * Math.min(1, delta * 4);
  if (close && !memo.wasNear) memo.bounce = 0;
  memo.wasNear = close;
  memo.bounce = Math.min(1, memo.bounce + delta / 0.7);
  // Rebote elástico del rótulo, sobre su borde de arriba (de donde cuelga).
  const t = memo.bounce;
  const spring = t >= 1 ? 0 : Math.pow(2, -7 * t) * Math.sin(t * 15);
  sign.current.rotation.x = anchors.sign.rotation[0] + spring * 0.22;
  sign.current.scale.setScalar(1 + spring * 0.05);
  lamp.current.scale.set(1, 1 + memo.near * 0.6, 1);
 });

 const screen = anchors.screen;
 return (
  <group name={`casa de «${project.name}»`} userData={{ rests: 0, foot: 2.2 }} position={[x, 0, z - 1.6]} rotation-y={turn} {...click}>
   <mesh geometry={geometry} material={models.material} castShadow receiveShadow />
   {/* Cristales con luz cálida. */}
   {Object.entries(anchors)
    .filter(([key]) => key.startsWith("glow"))
    .map(([key, anchor], i) => (
     <Glow key={key} light={i === 0} position={anchor.position} rotation={anchor.rotation}>
      {key.includes("round") ? <circleGeometry args={[anchor.size[0], 12]} /> : <planeGeometry args={[anchor.size[0], anchor.size[1]]} />}
     </Glow>
    ))}
   <Glow power={0.6} forward={0.9} drop={0.5} position={anchors.lantern.position}>
    <boxGeometry args={anchors.lantern.size} />
   </Glow>
   {anchors.smoke && <Smoke position={anchors.smoke.position} />}
   {/* La captura del proyecto, dentro del escaparate. */}
   <group position={screen.position} rotation={screen.rotation}>
    <Suspense fallback={null}>
     <Picture url={project.images[0]} width={screen.size[0]} height={screen.size[1]} lift={0.012} />
    </Suspense>
    {/* Luz del escaparate: una regleta bajo el dintel, que se aviva al acercarse. */}
    <group ref={lamp} position={[0, screen.size[1] / 2 + 0.02, 0.1]}>
     <Glow power={0.35} reach={6} forward={1.2} drop={0.5} night={1.4}>
      <boxGeometry args={[screen.size[0] * 0.9, 0.04, 0.05]} />
     </Glow>
    </group>
   </group>
   {/* El rótulo: el nombre del proyecto sobre su tabla. */}
   <group ref={sign} position={anchors.sign.position} rotation={anchors.sign.rotation}>
    <mesh>
     <planeGeometry args={[anchors.sign.size[0], anchors.sign.size[1]]} />
     <meshBasicMaterial map={label} transparent toneMapped={false} fog={false} />
    </mesh>
   </group>
  </group>
 );
}

function Project({ project, site, index, models }) {
 const { x, z, turn } = site;
 const cottage = useMemo(() => createCottage(index, project.color), [index, project.color]);
 const label = useMemo(() => createLabelTexture(project.name.toUpperCase(), CREAM, { title: true }), [project]);
 const lamp = useRef(null);
 useEffect(
  () => () => {
   cottage.geometry.dispose();
   label.dispose();
  },
  [cottage, label],
 );

 const open = () =>
  emit("open", {
   kind: "project",
   at: { x, y: 1.3, z: z - 1.0 }, // la cámara se acerca a la casa antes de abrir la ficha
   eyebrow: `Proyecto · ${project.year}`,
   title: project.name,
   paragraphs: [project.tagline, project.description],
   tags: project.tags,
   image: project.images[0],
   link: project.link,
   linkLabel: "Ver proyecto",
  });
 const click = useInteractable({ position: { x, z: z + 2.4 }, radius: 3.4, hint: `Ver «${project.name}»`, anywhere: true, action: open });

 // Al acercarse, la luz del escaparate se aviva.
 const near = useRef(0);
 useFrame((_, delta) => {
  const close = Math.hypot(player.position.x - x, player.position.z - (z + 2.4)) < 3.4 ? 1 : 0;
  near.current += (close - near.current) * Math.min(1, delta * 4);
  lamp.current.scale.setScalar(1 + near.current * 0.5);
 });

 return (
  <group name={`casa de «${project.name}»`} userData={{ rests: 0 }} position={[x, 0, z - 1.6]} rotation-y={turn} {...click}>
   {/* Casa. */}
   <mesh geometry={cottage.geometry} material={models.material} castShadow receiveShadow />
   {cottage.windows.map((window, i) => (
    <Glow key={i} light={i === 0} position={window.position}>
     {window.round ? <circleGeometry args={[window.round, 8]} /> : <planeGeometry args={window.size} />}
    </Glow>
   ))}
   <Glow power={0.5} forward={1.0} drop={0.4} position={cottage.lantern}>
    <boxGeometry args={[0.16, 0.24, 0.16]} />
   </Glow>
   {cottage.smoke && <Smoke position={cottage.smoke} />}

   {/* Escaparate con la captura del proyecto y, encima, su rótulo. */}
   <group position={[site.window.x, 0, site.window.z]} rotation-y={site.window.turn}>
    <mesh geometry={models.showcaseBase} material={models.material} castShadow receiveShadow />
    <group position-y={SHOWCASE.base} rotation-x={SHOWCASE.tilt}>
     <mesh geometry={models.showcaseTop} material={models.material} castShadow />
     <group position={[0, 0.66, 0]}>
      <Suspense fallback={null}>
       <Picture url={project.images[0]} width={SHOWCASE.width - 0.24} height={1.12} />
      </Suspense>
     </group>
     <mesh position={[0, 1.62, 0.09]}>
      <planeGeometry args={[SHOWCASE.width + 0.1, (SHOWCASE.width + 0.1) / 4]} />
      <meshBasicMaterial map={label} transparent toneMapped={false} fog={false} />
     </mesh>
     <group ref={lamp} position={[0, 1.28, 0.12]}>
      <Glow power={0.3} reach={6} forward={1.3} drop={0.5} night={1.2}>
       <boxGeometry args={[1.3, 0.05, 0.06]} />
      </Glow>
     </group>
    </group>
   </group>
  </group>
 );
}

// Pozo con tejadillo, en la plaza.
function createWell() {
 const roof = ["#7d4a30", "#a9683f"]; // teja de madera, no naranja vivo
 return merge([
  piece(new THREE.CylinderGeometry(0.95, 1.02, 0.85, 10), { bottom: STONE.dark, top: STONE.light, jitter: 0.045, vary: 0.12, position: [0, 0.42, 0] }),
  piece(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 10), { color: "#2f7f86", position: [0, 0.72, 0] }),
  ...[-0.82, 0.82].map((x) => piece(limb(0.07, 0.06, 2.0, 5), { color: WOOD.dark, position: [x, 0.7, 0] })),
  piece(box(2.0, 0.09, 0.9), { bottom: roof[0], top: roof[1], vary: 0.08, position: [0, 2.78, 0.33], rotation: [0.62, 0, 0] }),
  piece(box(2.0, 0.09, 0.9), { bottom: roof[0], top: roof[1], vary: 0.08, position: [0, 2.78, -0.33], rotation: [-0.62, 0, 0] }),
  piece(new THREE.CylinderGeometry(0.07, 0.07, 1.7, 6), { color: WOOD.mid, position: [0, 2.25, 0], rotation: [0, 0, Math.PI / 2] }),
  piece(limb(0.012, 0.012, 0.9, 3), { color: "#2a2622", position: [0.1, 1.35, 0] }),
  piece(new THREE.CylinderGeometry(0.16, 0.13, 0.24, 7), { bottom: WOOD.dark, top: WOOD.light, position: [0.1, 1.28, 0] }),
 ]);
}

// Banco de madera.
const createBench = () =>
 merge([
  piece(box(1.5, 0.08, 0.45), { bottom: WOOD.mid, top: WOOD.light, vary: 0.1, position: [0, 0.46, 0] }),
  piece(box(1.5, 0.42, 0.07), { color: WOOD.mid, vary: 0.1, position: [0, 0.74, 0.19], rotation: [-0.16, 0, 0] }),
  ...[-0.6, 0.6].map((x) => piece(box(0.1, 0.46, 0.4), { color: WOOD.dark, position: [x, 0.23, 0] })),
 ]);

// Tablón «PROYECTOS» al fondo de la plaza.
function Board() {
 const texture = useMemo(() => createLabelTexture("PROYECTOS", "#f6ead6"), []);
 useEffect(() => () => texture.dispose(), [texture]);
 const geometry = useMemo(
  () =>
   merge([
    ...[-1.2, 1.2].map((x) => piece(limb(0.09, 0.075, 3.3, 5), { bottom: WOOD.dark, top: WOOD.mid, position: [x, 0, 0] })),
    piece(box(2.9, 0.86, 0.1), { bottom: WOOD.mid, top: WOOD.light, vary: 0.1, position: [0, 2.85, 0.02], rotation: [-0.42, 0, 0] }),
    piece(box(3.2, 0.1, 0.5), { color: WOOD.dark, position: [0, 3.36, -0.08], rotation: [0.3, 0, 0] }),
   ]),
  [],
 );
 const material = useMemo(() => lambert(), []);
 useEffect(
  () => () => {
   geometry.dispose();
   material.dispose();
  },
  [geometry, material],
 );
 return (
  <group name="tablón de proyectos" userData={{ rests: 0 }} position={[PLAZA.x, 0, PLAZA.z - 7.2]}>
   <mesh geometry={geometry} material={material} castShadow />
   <mesh position={[0, 2.85, 0.09]} rotation-x={-0.42}>
    <planeGeometry args={[2.75, 0.7]} />
    <meshBasicMaterial map={texture} transparent toneMapped={false} fog={false} />
   </mesh>
  </group>
 );
}

export function ProjectVillage() {
 // Las casas comparten material; la que tape al astronauta se vuelve translúcida.
 const models = useMemo(() => ({ material: withSeeThrough(lambert()), showcaseBase: createShowcaseBase(), showcaseTop: createShowcaseTop(), well: createWell(), bench: createBench(), lamp: createLantern() }), []);
 const stone = useMemo(createSlab, []);
 useEffect(
  () => () => {
   Object.values(models).forEach((one) => one.dispose());
   stone.dispose();
  },
  [models, stone],
 );
 // Losas encajadas en anillos alrededor del centro de la plaza: apretadas, con
 // junta fina y a ras de suelo (asoman centímetro y medio). Hacia el borde
 // falta alguna, y ahí asoma la tierra.
 const cobbles = useMemo(() => {
  const random = randomFrom(0.44);
  const list = [];
  const DEPTH = 0.58, JOINT = 0.04;
  for (let radius = DEPTH * 0.5, ring = 0; radius < PLAZA.r - 0.25; radius += DEPTH, ring++) {
   const count = Math.max(5, Math.round((Math.PI * 2 * radius) / (0.62 + random() * 0.14)));
   const offset = random() * Math.PI * 2;
   const fade = Math.max(0, (radius - (PLAZA.r - 1.5)) / 1.5);
   for (let i = 0; i < count; i++) {
    if (random() < fade * 0.55) continue;
    const angle = offset + (i / count) * Math.PI * 2;
    const x = PLAZA.x + Math.cos(angle) * radius, z = PLAZA.z + Math.sin(angle) * radius;
    if (Math.hypot(x - WELL.x, z - WELL.z) < 1.05) continue; // bajo el brocal del pozo
    const tone = COBBLE_TONES[Math.floor(random() * COBBLE_TONES.length)];
    list.push({ position: [x, 0.015 - SLAB_THICKNESS / 2, z], rotation: [0, -angle + (random() - 0.5) * 0.04, 0], scale: [DEPTH - JOINT, 1, (Math.PI * 2 * radius) / count - JOINT], color: tone });
   }
  }
  return list;
 }, []);
 // Farolas que marcan las dos entradas de la plaza.
 const lamps = [
  [PLAZA.x + PLAZA.r + 0.9, 2.2, 0],
  [PLAZA.x - PLAZA.r - 0.2, 1.7, Math.PI],
 ];

 return (
  <>
   <Instances name="adoquín de plaza" geometry={stone} material={models.material} items={cobbles} colored receiveShadow />
   <mesh name="pozo" userData={{ rests: 0 }} geometry={models.well} material={models.material} position={[WELL.x, 0, WELL.z]} castShadow receiveShadow />
   {BENCHES.map((bench) => (
    <mesh key={bench.x} name="banco" userData={{ rests: 0 }} geometry={models.bench} material={models.material} position={[bench.x, 0, bench.z]} rotation-y={bench.turn} castShadow />
   ))}
   {lamps.map(([lx, lz, turn], i) => (
    <group key={i} position={[lx, 0, lz]} rotation-y={turn}>
     <mesh name="farola de la plaza" userData={{ rests: 0 }} geometry={models.lamp} material={models.material} castShadow />
     <Glow power={0.9} reach={10} forward={0.7} drop={0.9} night={3} position={LANTERN_GLASS}>
      <boxGeometry args={LANTERN_GLASS_SIZE} />
     </Glow>
    </group>
   ))}
   <Board />
   {PROJECTS.map((project, i) =>
    REBUILT[i] ? (
     <Building key={project.id} project={project} site={PROJECT_CABINS[i]} name={REBUILT[i]} models={models} />
    ) : (
     <Project key={project.id} project={project} site={PROJECT_CABINS[i]} index={i} models={models} />
    ),
   )}
  </>
 );
}
