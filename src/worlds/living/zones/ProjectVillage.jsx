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
import { blob, limb, merge, piece, randomFrom, tube } from "../kit/geometry";
import { STONE, WOOD } from "../kit/palette";
import { COLORS, PLAZA, PROJECT_CABINS, WELL } from "../layout";
import { LAMP_GLASS, createLamp } from "../props/lampModel";

// Aldea de proyectos. Una plaza empedrada con su pozo y, alrededor, una casa
// por proyecto: delante de cada una, un expositor con la captura real y un
// cartel de madera colgado con el nombre. Acercarse y pulsar E (o hacer clic)
// abre la ficha del proyecto.

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

function Picture({ url, width, height }) {
 const texture = useTexture(url);
 return (
  <mesh position-z={0.06}>
   <planeGeometry args={[width, height]} />
   <meshBasicMaterial map={texture} toneMapped={false} fog={false} />
  </mesh>
 );
}

// Expositor: caballete con tejadillo, la captura como «monitor» y una luz que la baña.
function createStand() {
 const roof = ["#6b4630", "#a8713f"];
 return merge([
  ...[-1.1, 1.1].map((x) => piece(limb(0.075, 0.065, 2.35, 5), { bottom: WOOD.dark, top: WOOD.mid, position: [x, 0, 0] })),
  piece(box(2.45, 0.1, 0.5), { bottom: roof[0], top: roof[1], vary: 0.08, position: [0, 2.42, 0.2], rotation: [0.5, 0, 0] }),
  piece(box(2.45, 0.1, 0.5), { bottom: roof[0], top: roof[1], vary: 0.08, position: [0, 2.42, -0.2], rotation: [-0.5, 0, 0] }),
  piece(box(2.5, 0.09, 0.1), { color: WOOD.dark, position: [0, 2.56, 0] }),
  // Jardinera al pie.
  piece(box(2.0, 0.26, 0.4), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.1, position: [0, 0.13, 0.12] }),
  ...[-0.7, -0.25, 0.2, 0.65].map((x, i) => piece(blob(0), { bottom: "#3a8a47", top: "#86c95e", jitter: 0.16, seed: i, position: [x, 0.36, 0.12], scale: [0.2, 0.15, 0.16] })),
  ...[-0.5, 0, 0.45].map((x, i) => piece(new THREE.OctahedronGeometry(0.055, 0), { color: ["#ffd45a", "#ff8fb5", "#ffffff"][i], position: [x, 0.5, 0.16] })),
 ]);
}

// Poste del cartel: sube, se curva y deja un brazo del que cuelga la tabla.
const createSignPost = () =>
 merge([
  piece(tube([[0, 0, 0], [0, 1.7, 0], [0.05, 2.6, 0], [0.4, 2.95, 0], [1.0, 3.0, 0]], (t) => 0.085 - t * 0.035, { sides: 6, segments: 8 }), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.08 }),
  piece(new THREE.CylinderGeometry(0.17, 0.22, 0.2, 6), { color: STONE.mid, position: [0, 0.1, 0] }),
 ]);

function Project({ project, site, index, models }) {
 const { x, z, turn, side } = site;
 const cottage = useMemo(() => createCottage(index, project.color), [index, project.color]);
 const label = useMemo(() => createLabelTexture(project.name.toUpperCase(), project.color, { plate: true }), [project]);
 const sign = useRef(null);
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
   eyebrow: `Proyecto · ${project.year}`,
   title: project.name,
   paragraphs: [project.tagline, project.description],
   tags: project.tags,
   image: project.images[0],
   link: project.link,
   linkLabel: "Ver proyecto",
  });
 const click = useInteractable({ position: { x: x + 0.4 * side, z: z + 2.6 }, radius: 3.4, hint: `Ver «${project.name}»`, anywhere: true, action: open });

 // Al acercarse, el cartel se mece más y la luz del expositor se aviva.
 const near = useRef(0);
 useFrame(({ clock }, delta) => {
  const close = Math.hypot(player.position.x - (x + 0.4 * side), player.position.z - (z + 2.6)) < 3.4 ? 1 : 0;
  near.current += (close - near.current) * Math.min(1, delta * 4);
  sign.current.rotation.z = Math.sin(clock.elapsedTime * 1.3 + index * 2) * (0.035 + near.current * 0.07);
  lamp.current.scale.setScalar(1 + near.current * 0.5);
 });

 return (
  <group position={[x, 0, z]} {...click}>
   {/* Casa. */}
   <group position={[-0.9 * side, 0, -1.6]} rotation-y={turn}>
    <mesh geometry={cottage.geometry} material={models.material} castShadow receiveShadow />
    {cottage.windows.map((window, i) => (
     <Glow key={i} light={i === 0} position={window.position}>
      {window.round ? <circleGeometry args={[window.round, 8]} /> : <planeGeometry args={window.size} />}
     </Glow>
    ))}
    <Glow power={0.6} forward={0.5} position={cottage.lantern}>
     <boxGeometry args={[0.16, 0.24, 0.16]} />
    </Glow>
    {cottage.smoke && <Smoke position={cottage.smoke} />}
   </group>

   {/* Expositor con la captura del proyecto. */}
   <group position={[1.75 * side, 0, 0.95]}>
    <mesh geometry={models.stand} material={models.material} castShadow />
    <group position={[0, 1.42, 0.02]} rotation-x={-0.26}>
     <mesh>
      <boxGeometry args={[2.3, 1.48, 0.1]} />
      <meshLambertMaterial color="#2a211b" flatShading />
     </mesh>
     <Suspense fallback={null}>
      <Picture url={project.images[0]} width={2.12} height={1.3} />
     </Suspense>
    </group>
    <group ref={lamp} position={[0, 2.28, 0.18]}>
     <Glow power={0.45} reach={6} forward={0.6} night={2.4}>
      <boxGeometry args={[1.5, 0.06, 0.08]} />
     </Glow>
    </group>
   </group>

   {/* Cartel de madera colgado, con el nombre. */}
   <group position={[-2.7 * side, 0, 0.7]} scale={[side, 1, 1]}>
    <mesh geometry={models.signPost} material={models.material} castShadow />
    <group ref={sign} position={[1.0, 2.96, 0]}>
     {[-0.7, 0.7].map((dx) => (
      <mesh key={dx} position={[dx * 0.7 + 0.2, -0.2, 0]}>
       <cylinderGeometry args={[0.012, 0.012, 0.4, 3]} />
       <meshBasicMaterial color="#2a2622" />
      </mesh>
     ))}
     {/* La tabla se deshace del espejo para que el texto no salga al revés. */}
     <group position={[0.2, -0.82, 0.1]} rotation-x={-0.5} scale={[side, 1, 1]}>
      <mesh castShadow>
       <boxGeometry args={[3.1, 0.86, 0.07]} />
       <meshLambertMaterial color={WOOD.dark} flatShading />
      </mesh>
      <mesh position-z={0.04}>
       <planeGeometry args={[3.0, 0.75]} />
       <meshBasicMaterial map={label} transparent toneMapped={false} fog={false} />
      </mesh>
     </group>
    </group>
   </group>
  </group>
 );
}

// Pozo con tejadillo, en la plaza.
function createWell() {
 const roof = ["#a8492f", "#d9703f"];
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
 const texture = useMemo(() => createLabelTexture("PROYECTOS", COLORS.proyectos), []);
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
  <group position={[PLAZA.x, 0, PLAZA.z - 7.2]}>
   <mesh geometry={geometry} material={material} castShadow />
   <mesh position={[0, 2.85, 0.09]} rotation-x={-0.42}>
    <planeGeometry args={[2.75, 0.7]} />
    <meshBasicMaterial map={texture} transparent toneMapped={false} fog={false} />
   </mesh>
  </group>
 );
}

export function ProjectVillage() {
 const models = useMemo(() => ({ material: lambert(), stand: createStand(), signPost: createSignPost(), well: createWell(), bench: createBench(), lamp: createLamp() }), []);
 const cobble = useMemo(() => new THREE.CylinderGeometry(0.42, 0.46, 0.07, 6), []);
 useEffect(
  () => () => {
   Object.values(models).forEach((one) => one.dispose());
   cobble.dispose();
  },
  [models, cobble],
 );
 // Adoquines en anillos, con hueco para que respire el suelo.
 const cobbles = useMemo(() => {
  const random = randomFrom(0.44);
  const list = [];
  for (let ring = 1; ring <= 5; ring++) {
   const count = ring * 7;
   for (let i = 0; i < count; i++) {
    if (random() < 0.16) continue;
    const angle = (i / count) * Math.PI * 2 + ring * 0.4;
    const radius = ring * 1.02 + (random() - 0.5) * 0.2;
    const size = 0.8 + random() * 0.4;
    list.push({ position: [PLAZA.x + Math.cos(angle) * radius, 0.035, PLAZA.z + Math.sin(angle) * radius], rotation: [0, random() * 3, 0], scale: [size, 1, size], color: ["#d9cdb6", "#c9bca3", "#e2d7c2", "#bfb29a"][Math.floor(random() * 4)] });
   }
  }
  return list;
 }, []);
 // Farolas que marcan las dos entradas de la plaza.
 const lamps = [
  [PLAZA.x + PLAZA.r + 0.6, 2.0, 0],
  [PLAZA.x - PLAZA.r - 0.6, 2.0, Math.PI],
 ];

 return (
  <>
   <Instances geometry={cobble} material={models.material} items={cobbles} colored receiveShadow />
   <mesh geometry={models.well} material={models.material} position={[WELL.x, 0, WELL.z]} castShadow receiveShadow />
   {[-3.4, 3.4].map((dx) => (
    <mesh key={dx} geometry={models.bench} material={models.material} position={[PLAZA.x + dx, 0, PLAZA.z + 4.3]} rotation-y={Math.PI + dx * 0.08} castShadow />
   ))}
   {lamps.map(([lx, lz, turn], i) => (
    <group key={i} position={[lx, 0, lz]} rotation-y={turn}>
     <mesh geometry={models.lamp} material={models.material} castShadow />
     <Glow power={0.9} reach={10} forward={0.2} night={3} position={LAMP_GLASS}>
      <boxGeometry args={[0.2, 0.34, 0.2]} />
     </Glow>
    </group>
   ))}
   <Board />
   {PROJECTS.map((project, i) => (
    <Project key={project.id} project={project} site={PROJECT_CABINS[i]} index={i} models={models} />
   ))}
  </>
 );
}
