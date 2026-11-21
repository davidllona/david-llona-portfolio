import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { projectCard } from "../../../content/cards";
import { PROJECTS } from "../../../content/projects";
import { Instances } from "../../../experience/Instances";
import { useInteractable } from "../../../experience/interact";
import { lambert } from "../../../experience/materials";
import { emit, player } from "../../../experience/state";
import { Glow } from "../buildings/Glow";
import { createModelMaterial, preloadModel, useModel } from "../buildings/useModel";
import { SIGN_RATIO, SignFace } from "../props/Signpost";
import { withSeeThrough } from "../../../experience/environment/seeThrough";
import { blob, merge, piece, randomFrom } from "../kit/geometry";
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
PROJECT_CABINS.forEach((site) => preloadModel(site.model));

// Una casa de proyecto: el modelo de stdgaris (docs/CREDITOS.md) y, delante y a
// un lado, la pantalla con la captura real del proyecto bajo su rótulo.
function Project({ project, site, models }) {
 const { x, z, turn } = site;
 const house = useModel(site.model);
 const lamp = useRef(null);

 const open = () =>
  // (El cartel de madera del proyecto: ver content/cards.js y ui/Modal.jsx. La cámara se acerca a la casa antes de abrirla.)
  emit("open", { ...projectCard(project, PROJECTS.indexOf(project), PROJECTS.length), at: { x, y: 1.3, z: z - 1.0 } });
 const click = useInteractable({ position: { x, z: z + 2.4 }, radius: 3.6, hint: `Ver «${project.name}»`, anywhere: true, action: open });

 // Al acercarse, la luz de la pantalla se aviva.
 const near = useRef(0);
 useFrame((_, delta) => {
  const close = Math.hypot(player.position.x - x, player.position.z - (z + 2.4)) < 3.6 ? 1 : 0;
  near.current += (close - near.current) * Math.min(1, delta * 4);
  lamp.current.scale.setScalar(1 + near.current * 0.5);
 });

 return (
  <group name={`casa de «${project.name}»`} userData={{ rests: 0 }} position={[x, 0, z - 1.6]} rotation-y={turn} {...click}>
   <mesh geometry={house} material={models.house} scale={site.size} castShadow receiveShadow />
   {/* Farol junto a la puerta: da luz de noche. */}
   <Glow power={0.55} forward={1.0} drop={0.4} position={[site.window.x > 0 ? -1.2 : 1.2, 1.9, site.size * 0.5 + 0.1]}>
    <boxGeometry args={[0.16, 0.24, 0.16]} />
   </Glow>

   {/* Pantalla con la captura del proyecto y, encima, su rótulo. */}
   <group position={[site.window.x, 0, site.window.z]} rotation-y={site.window.turn}>
    <mesh geometry={models.showcaseBase} material={models.material} castShadow receiveShadow />
    <group position-y={SHOWCASE.base} rotation-x={SHOWCASE.tilt}>
     <mesh geometry={models.showcaseTop} material={models.material} castShadow />
     <group position={[0, 0.66, 0]}>
      <Suspense fallback={null}>
       <Picture url={project.images[0]} width={SHOWCASE.width - 0.24} height={1.12} />
      </Suspense>
     </group>
     <mesh position={[0, 1.66, 0.06]}>
      <boxGeometry args={[SHOWCASE.width + 0.3, (SHOWCASE.width + 0.22) / SIGN_RATIO + 0.08, 0.06]} />
      <meshLambertMaterial color={WOOD.dark} flatShading />
     </mesh>
     <SignFace text={project.name.toUpperCase()} icon="projects" width={SHOWCASE.width + 0.22} position={[0, 1.66, 0.094]} />
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

// Pozo de la plaza. Que se lea como pozo desde la cámara de juego: brocal de
// sillares en dos hiladas con su albardilla clara y el agua oscura dentro, dos
// postes, torno con manivela, cuerda y cubo colgando sobre la boca, y un
// tejadillo de madera a dos aguas con su caballete.
function createWell() {
 const roof = ["#7d4a30", "#a9683f"]; // teja de madera, no naranja vivo
 const parts = [];
 const RADIUS = 0.92, STONES = 9;
 // Brocal: dos hiladas de sillares a matajunta y, encima, la albardilla.
 for (let course = 0; course < 2; course++) {
  for (let i = 0; i < STONES; i++) {
   const angle = ((i + course * 0.5) / STONES) * Math.PI * 2;
   const tone = [STONE.mid, STONE.light, "#b9b5c2"][(i * 2 + course) % 3];
   parts.push(piece(box(0.6, 0.4, 0.3), { bottom: STONE.dark, top: tone, jitter: 0.03, vary: 0.1, seed: i + course * 9, position: [Math.cos(angle) * RADIUS, 0.2 + course * 0.4, Math.sin(angle) * RADIUS], rotation: [0, -angle + Math.PI / 2, 0] }));
  }
 }
 for (let i = 0; i < STONES; i++) {
  const angle = ((i + 0.25) / STONES) * Math.PI * 2;
  parts.push(piece(box(0.66, 0.12, 0.44), { bottom: STONE.light, top: "#e4e6ea", jitter: 0.02, vary: 0.07, seed: i + 30, position: [Math.cos(angle) * RADIUS, 0.86, Math.sin(angle) * RADIUS], rotation: [0, -angle + Math.PI / 2, 0] }));
 }
 // La boca: pared oscura por dentro y el agua al fondo.
 parts.push(piece(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 10, 1, true).scale(-1, 1, 1), { color: "#3b4350", position: [0, 0.6, 0] }));
 parts.push(piece(new THREE.CircleGeometry(0.8, 10).rotateX(-Math.PI / 2), { color: "#1f5d6b", position: [0, 0.42, 0] }));
 // Postes, con su zapata, y el torno entre ellos.
 for (const x of [-1.12, 1.12]) {
  parts.push(piece(box(0.16, 2.5, 0.16), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.08, position: [x, 1.25, 0] }));
  parts.push(piece(box(0.3, 0.14, 0.3), { color: STONE.dark, jitter: 0.02, position: [x, 0.07, 0] }));
  // Tornapuntas que sujetan el tejadillo.
  for (const z of [-1, 1]) parts.push(piece(box(0.08, 0.62, 0.08), { color: WOOD.dark, position: [x, 2.28, z * 0.24], rotation: [z * 0.75, 0, 0] }));
 }
 parts.push(piece(new THREE.CylinderGeometry(0.1, 0.1, 2.24, 7), { bottom: WOOD.mid, top: WOOD.light, vary: 0.1, position: [0, 1.72, 0], rotation: [0, 0, Math.PI / 2] }));
 // Manivela.
 parts.push(piece(box(0.06, 0.4, 0.06), { color: "#2a2622", position: [1.27, 1.56, 0] }));
 parts.push(piece(box(0.26, 0.06, 0.06), { color: "#2a2622", position: [1.38, 1.38, 0] }));
 // Cuerda (enrollada en el torno y bajando) y cubo con su asa y sus aros.
 parts.push(piece(new THREE.CylinderGeometry(0.135, 0.135, 0.36, 7), { color: "#cdb98c", vary: 0.12, position: [0.05, 1.72, 0], rotation: [0, 0, Math.PI / 2] }));
 parts.push(piece(box(0.035, 0.5, 0.035), { color: "#cdb98c", position: [0.05, 1.42, 0.1] }));
 parts.push(piece(new THREE.TorusGeometry(0.15, 0.014, 4, 8, Math.PI), { color: "#2a2622", position: [0.05, 1.12, 0.1] }));
 parts.push(piece(new THREE.CylinderGeometry(0.21, 0.16, 0.3, 8), { bottom: WOOD.dark, top: WOOD.light, vary: 0.1, position: [0.05, 0.98, 0.1] }));
 for (const y of [0.9, 1.07]) parts.push(piece(new THREE.CylinderGeometry(0.2 + (y - 0.9) * 0.12, 0.19 + (y - 0.9) * 0.12, 0.035, 8), { color: "#3a3531", position: [0.05, y, 0.1] }));
 // Tejadillo a dos aguas: dos faldones de tablas, caballete y testeros.
 for (const z of [-1, 1]) {
  for (let i = 0; i < 6; i++) parts.push(piece(box(0.44, 0.07, 1.16), { bottom: roof[0], top: roof[1], vary: 0.1, seed: i + (z + 1) * 5, position: [-1.14 + i * 0.456, 2.86, z * 0.44], rotation: [z * 0.62, 0, 0] }));
  parts.push(piece(box(2.56, 0.1, 0.09), { color: WOOD.dark, position: [0, 2.56, z * 0.86] })); // alero
 }
 parts.push(piece(box(2.86, 0.1, 0.16), { color: WOOD.dark, position: [0, 3.2, 0] })); // caballete
 return merge(parts);
}

// Banco de madera.
const createBench = () =>
 merge([
  piece(box(1.5, 0.08, 0.45), { bottom: WOOD.mid, top: WOOD.light, vary: 0.1, position: [0, 0.46, 0] }),
  piece(box(1.5, 0.42, 0.07), { color: WOOD.mid, vary: 0.1, position: [0, 0.74, 0.19], rotation: [-0.16, 0, 0] }),
  ...[-0.6, 0.6].map((x) => piece(box(0.1, 0.46, 0.4), { color: WOOD.dark, position: [x, 0.23, 0] })),
 ]);

export function ProjectVillage() {
 // Las casas comparten material; la que tape al astronauta se vuelve translúcida.
 const models = useMemo(() => ({ house: createModelMaterial(), material: withSeeThrough(lambert()), ground: lambert(), showcaseBase: createShowcaseBase(), showcaseTop: createShowcaseTop(), well: createWell(), bench: createBench(), lamp: createLantern() }), []);
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
   <Instances name="adoquín de plaza" geometry={stone} material={models.ground} items={cobbles} colored receiveShadow />
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
   {PROJECTS.map((project, i) => PROJECT_CABINS[i] && <Project key={project.id} project={project} site={PROJECT_CABINS[i]} models={models} />)}
  </>
 );
}
