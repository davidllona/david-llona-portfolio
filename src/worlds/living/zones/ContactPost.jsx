import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { contactPostCard } from "../../../content/contact";
import { Instances } from "../../../experience/Instances";
import { useInteractable } from "../../../experience/interact";
import { lambert } from "../../../experience/materials";
import { emit } from "../../../experience/state";
import { createPlantModels } from "../flora/plantModels";
import { limb, merge, piece } from "../kit/geometry";
import { ROCK, WOOD } from "../kit/palette";
import { CONTACT, height } from "../layout";
import { SignFace } from "../props/Signpost";
import { createRock } from "../props/rockModel";

// Donde estaba la casita de contacto (objetivo 27, bloque C): el contacto se ha
// ido a The Cosmic Lab, al final del recorrido. Queda un poste indicador de
// madera, «CONTACTO» y, debajo, una flecha «THE COSMIC LAB →». Con la E abre su
// cartel: ofrece el viaje y enseña el correo (y los perfiles) sin tener que ir.
// Alrededor, unas flores y piedras: el claro no se queda vacío.

const POST = CONTACT.post;
const BOARD = { width: 1.9, height: 0.62, y: 2.05 };
const ARROW = { width: 1.72, height: 0.52, y: 1.32, x: 0.12 };

function createPost() {
 return merge([
  piece(limb(0.1, 0.075, 2.55, 6), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.08 }),
  piece(new THREE.CylinderGeometry(0.2, 0.27, 0.22, 6), { bottom: ROCK.dark, top: ROCK.light, position: [0, 0.11, 0] }),
  piece(new THREE.ConeGeometry(0.11, 0.16, 6), { color: WOOD.dark, position: [0, 2.6, 0] }),
  // Tablón de arriba, con su marco.
  piece(new THREE.BoxGeometry(BOARD.width + 0.12, BOARD.height + 0.12, 0.08), { color: WOOD.dark, vary: 0.05, position: [0, BOARD.y, 0.07] }),
  // La flecha: tabla con la punta hacia la derecha (hacia donde queda la nave).
  piece(new THREE.BoxGeometry(ARROW.width, ARROW.height + 0.1, 0.07), { color: WOOD.dark, vary: 0.05, position: [ARROW.x, ARROW.y, 0.07] }),
  piece(new THREE.CylinderGeometry(0, (ARROW.height + 0.1) / 2 / Math.cos(Math.PI / 6), 0.07, 3), { color: WOOD.dark, position: [ARROW.x + ARROW.width / 2 + 0.16, ARROW.y, 0.07], rotation: [Math.PI / 2, 0, -Math.PI / 2] }),
 ]);
}

export function ContactPost() {
 const y = height(POST.x, POST.z);
 const models = useMemo(() => ({ post: createPost(), material: lambert(), flowers: lambert({ side: THREE.DoubleSide }), rocks: [createRock(0.37, { shape: "chunk", moss: 1 }), createRock(0.71, { shape: "slab", moss: 0 })], plants: createPlantModels() }), []);
 useEffect(
  () => () => {
   models.post.dispose();
   models.material.dispose();
   models.flowers.dispose();
   models.rocks.forEach((one) => one.dispose());
  },
  [models],
 );
 // Flores y piedras alrededor del poste, colocadas a mano.
 const items = useMemo(() => {
  const at = (dx, dz) => [POST.x + dx, height(POST.x + dx, POST.z + dz) + 0.02, POST.z + dz];
  return {
   daisy: [[-1.4, 0.5], [-1.0, 0.9], [-1.7, 1.1], [1.6, 0.8], [1.2, 1.2]].map(([dx, dz], i) => ({ position: at(dx, dz), rotation: [0, i * 1.7, 0], scale: 1.1 + (i % 3) * 0.15 })),
   lavender: [[-2.3, -0.4], [-2.6, 0.3], [2.4, -0.2], [2.8, 0.5]].map(([dx, dz], i) => ({ position: at(dx, dz), rotation: [0, i * 2.3, 0], scale: 1.2 + (i % 2) * 0.2 })),
   shrubs: [[-3.4, -1.6], [3.3, -1.3], [0.4, -2.4]].map(([dx, dz], i) => ({ position: at(dx, dz), rotation: [0, i * 1.3, 0], scale: 0.9 + i * 0.15 })),
   rocks: [
    [{ position: at(-0.9, -0.7), rotation: [0, 0.6, 0], scale: [0.5, 0.36, 0.42], color: "#ffffff" }],
    [{ position: at(1.0, -0.5), rotation: [0, 2.1, 0], scale: [0.62, 0.22, 0.5], color: "#e6eaf0" }],
   ],
  };
 }, []);
 useInteractable({
  position: { x: POST.x, z: POST.z + 1.3 },
  radius: 2.2,
  height: 2.9,
  hint: "Contacto: The Cosmic Lab",
  action: () => emit("open", { ...contactPostCard(), at: { x: POST.x, y: y + BOARD.y, z: POST.z, distance: 0.7 } }),
 });
 const plants = models.plants;
 return (
  <>
   <group name="poste de contacto" userData={{ rests: 0 }} position={[POST.x, y, POST.z]} rotation-y={POST.turn}>
    <mesh geometry={models.post} material={models.material} castShadow receiveShadow />
    <SignFace text="CONTACTO" icon="contact" width={BOARD.width} position={[0, BOARD.y, 0.115]} />
    <SignFace text="THE COSMIC LAB" icon="rocket" width={ARROW.width - 0.06} position={[ARROW.x, ARROW.y, 0.11]} />
   </group>
   <Instances geometry={plants.flowers.daisy} material={models.flowers} items={items.daisy} />
   <Instances geometry={plants.flowers.lavender} material={models.flowers} items={items.lavender} />
   <Instances geometry={plants.shrubs[0]} material={models.material} items={items.shrubs} castShadow />
   {models.rocks.map((rock, i) => (
    <Instances key={i} name="piedra del poste de contacto" geometry={rock} material={models.material} items={items.rocks[i]} colored castShadow receiveShadow />
   ))}
  </>
 );
}
