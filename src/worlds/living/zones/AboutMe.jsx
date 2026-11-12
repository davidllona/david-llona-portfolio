import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { aboutText, mainOrbit } from "../../../content/about";
import { WIND, withWind } from "../../../experience/environment/wind";
import { useInteractable } from "../../../experience/interact";
import { lambert } from "../../../experience/materials";
import { emit, player } from "../../../experience/state";
import { createLabelTexture } from "../../../experience/textures";
import { createCottage } from "../buildings/cottageModels";
import { Glow } from "../buildings/Glow";
import { hero } from "../flora/treeModels";
import { limb, merge, piece, tube } from "../kit/geometry";
import { STONE, WOOD } from "../kit/palette";
import { PLATEAU, TREEHOUSE } from "../layout";

// Sobre mí: una casita en un árbol, en la meseta. El árbol crece por detrás y
// la abraza con sus ramas; la casa se asoma hacia el sur sobre una plataforma
// con barandilla, a la que se sube por una escalera. La información en sí no
// está escrita en la escena: E (o clic) la abre en un panel legible.

const ROOF = "#8d7bc4"; // lila apagado
const DECK = 3.05; // altura de la plataforma
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// Plataforma, puntales, barandilla y escalera, en una sola pieza.
function createDeck() {
 const pieces = [
  piece(new THREE.CylinderGeometry(2.55, 2.4, 0.2, 10), { bottom: WOOD.dark, top: WOOD.light, vary: 0.1, jitter: 0.02, position: [0, DECK - 0.1, 0] }),
  // Vigas que la sujetan al tronco y dos pilotes delante.
  ...[-0.9, 0.9].map((x) => piece(limb(0.1, 0.08, 3.3, 5), { color: WOOD.dark, position: [x * 1.9, 0, 1.6], rotation: [0, 0, 0] })),
  ...[-1, 1].map((side) => piece(limb(0.09, 0.07, 2.6, 5), { color: WOOD.dark, position: [side * 0.5, DECK - 2.2, -1.9], rotation: [0.85, 0, side * -0.35] })),
 ];
 // Barandilla: postes y pasamanos por el frente y los lados (se abre a la izquierda, por donde llega la escalera).
 for (let i = 0; i < 10; i++) {
  const angle = -0.35 + (i / 9) * (Math.PI + 0.25);
  const x = Math.cos(angle) * 2.38, z = Math.sin(angle) * 2.38;
  pieces.push(piece(limb(0.045, 0.04, 0.72, 4), { color: WOOD.dark, position: [x, DECK, z] }));
  if (i < 9) {
   const next = -0.35 + ((i + 1) / 9) * (Math.PI + 0.25);
   const mx = (x + Math.cos(next) * 2.38) / 2, mz = (z + Math.sin(next) * 2.38) / 2;
   pieces.push(piece(box(0.84, 0.06, 0.06), { color: WOOD.mid, position: [mx, DECK + 0.72, mz], rotation: [0, -(angle + next) / 2 + Math.PI / 2, 0] }));
  }
 }
 // Escalera: sube desde el suelo, por la izquierda, hasta el borde de la plataforma.
 const steps = 9;
 for (let i = 0; i < steps; i++) {
  const t = (i + 0.5) / steps;
  pieces.push(piece(box(0.95, 0.07, 0.3), { bottom: WOOD.mid, top: WOOD.light, vary: 0.1, seed: i, position: [-5.3 + t * 2.9, t * DECK - 0.02, 0.9 - t * 0.5], rotation: [0, 0.17, 0] }));
 }
 for (const side of [-1, 1]) {
  pieces.push(piece(box(4.3, 0.1, 0.07), { color: WOOD.dark, position: [-3.85, DECK / 2 - 0.08, 0.65 + side * 0.48], rotation: [0, 0.17, Math.atan2(DECK, 2.9)] }));
  pieces.push(piece(limb(0.04, 0.04, 0.9, 4), { color: WOOD.dark, position: [-5.3, 0, 0.9 + side * 0.48] }));
 }
 // Detalles personales: un balón de baloncesto junto a la puerta y, abajo, el cuenco de Woody.
 pieces.push(piece(new THREE.IcosahedronGeometry(0.21, 1), { bottom: "#c9562a", top: "#f08a3d", position: [1.55, DECK + 0.21, 1.25] }));
 pieces.push(piece(new THREE.CylinderGeometry(0.26, 0.2, 0.14, 8), { bottom: "#3f7f78", top: "#5fa79c", position: [1.9, 0.07, 2.3] }));
 pieces.push(piece(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 8), { color: "#7a5638", position: [1.9, 0.14, 2.3] }));
 return merge(pieces);
}

const createSignPost = () =>
 merge([
  piece(tube([[0, 0, 0], [0, 1.7, 0], [0.05, 2.6, 0], [0.4, 2.95, 0], [1.0, 3.0, 0]], (t) => 0.085 - t * 0.035, { sides: 6, segments: 8 }), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.08 }),
  piece(new THREE.CylinderGeometry(0.17, 0.22, 0.2, 6), { color: STONE.mid, position: [0, 0.1, 0] }),
 ]);

export function AboutMe() {
 const { x, z } = TREEHOUSE;
 const house = useMemo(() => createCottage(5, ROOF), []);
 const models = useMemo(
  () => ({
   material: lambert({ side: THREE.DoubleSide }),
   tree: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.tree, power: 2, cap: 8 }),
   treeGeometry: hero(0.71),
   deck: createDeck(),
   sign: createSignPost(),
  }),
  [],
 );
 const label = useMemo(() => createLabelTexture("SOBRE MÍ", "#f6ead6"), []);
 const sign = useRef(null);
 useEffect(
  () => () => {
   house.geometry.dispose();
   Object.values(models).forEach((one) => one.dispose());
   label.dispose();
  },
  [house, models, label],
 );

 const click = useInteractable({
  position: { x: x + 2.6, z: z + 2.6 },
  radius: 3.4,
  hint: "Leer «Sobre mí»",
  anywhere: true,
  action: () =>
   emit("open", {
    kind: "about",
    at: { x, y: 2.6, z: z + 0.6, distance: 0.8 },
    eyebrow: aboutText.eyebrow,
    title: aboutText.headline.join(" "),
    paragraphs: aboutText.paragraphs,
    // Las áreas en las que trabajo, tal como están en el contenido del portfolio.
    tags: mainOrbit.nodes.map((node) => node.label),
   }),
 });
 useFrame(({ clock }) => {
  const close = Math.hypot(player.position.x - (x + 2.6), player.position.z - (z + 2.6)) < 3.4;
  sign.current.rotation.z = Math.sin(clock.elapsedTime * 1.2) * (close ? 0.1 : 0.035);
 });

 return (
  <group position={[x, PLATEAU.height, z]} {...click}>
   {/* El árbol, por detrás; la casa queda delante de su copa, a la vista. */}
   <mesh geometry={models.treeGeometry} material={models.tree} position={[0.3, 0, -3.3]} rotation-y={2.6} scale={1.3} castShadow receiveShadow />
   <group position={[0, 0, -0.9]}>
    <mesh geometry={models.deck} material={models.material} castShadow receiveShadow />
    <group position={[0.1, DECK, -0.35]}>
     <mesh geometry={house.geometry} material={models.material} castShadow receiveShadow />
     {house.windows.map((window, i) => (
      <Glow key={i} light={i === 0} power={0.5} night={2.1} position={window.position}>
       <circleGeometry args={[window.round, 10]} />
      </Glow>
     ))}
     <Glow power={0.5} forward={1.0} drop={0.4} night={2.3} position={house.lantern}>
      <boxGeometry args={[0.15, 0.22, 0.15]} />
     </Glow>
    </group>
   </group>
   {/* Cartel colgado, junto a donde se lee. */}
   <group position={[4.2, 0, 1.4]} scale={[-1, 1, 1]}>
    <mesh geometry={models.sign} material={models.material} castShadow />
    <group ref={sign} position={[1.0, 2.96, 0]}>
     <group position={[0.2, -0.82, 0.1]} rotation-x={-0.5} scale={[-1, 1, 1]}>
      <mesh castShadow>
       <boxGeometry args={[2.7, 0.8, 0.07]} />
       <meshLambertMaterial color={WOOD.dark} flatShading />
      </mesh>
      <mesh position-z={0.04}>
       <planeGeometry args={[2.6, 0.68]} />
       <meshBasicMaterial map={label} transparent toneMapped={false} fog={false} />
      </mesh>
     </group>
    </group>
   </group>
  </group>
 );
}
