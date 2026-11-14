import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { lambert } from "../../../experience/materials";
import { Glow } from "../buildings/Glow";
import { createModelMaterial, preloadModel, useModel } from "../buildings/useModel";
import { blob, merge, piece } from "../kit/geometry";
import { STONE, WOOD } from "../kit/palette";
import { PLATEAU, TREEHOUSE } from "../layout";

// La casa del árbol, en la meseta: un rincón del planeta para pararse, sin
// contenido. («Sobre mí» vivía aquí; irá en el mundo 2 cuando exista y, hasta
// entonces, se lee desde el botón «Sobre mí» del menú superior.)
//
// El árbol, la cabaña y la escalera son el modelo «Cartoon treehouse with
// ladder access» (docs/CREDITOS.md), en una sola malla. Alrededor, hecho a
// mano: un banco mirando al sur, un tocón que hace de mesa con un farol
// encima, un arriate de flores con su bordillo de piedra y una pila de leña.
const TREEHOUSE_SIZE = 8.2; // m de copa a copa
preloadModel("casa-arbol");

// Dónde va cada cosa, respecto al pie del árbol (x al este, z al sur).
const BENCH = { x: 3.5, z: 0.9, turn: Math.PI - 0.28 };
const STUMP = { x: 2.2, z: 1.9 };
const BED = { x: -3.7, z: -0.1, r: 1.25 };
const LOGS = { x: -1.7, z: 0.5, turn: 0.5 }; // (más al sur pisa el camino por el que guía Woody)
const LANTERN_ON_STUMP = [STUMP.x, 0.78, STUMP.z];

function createCorner() {
 const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
 const parts = [];
 const placed = (list, at) => {
  const helper = new THREE.Object3D();
  helper.position.set(at.x, 0, at.z);
  helper.rotation.y = at.turn ?? 0;
  helper.updateMatrix();
  for (const part of list) parts.push(part.applyMatrix4(helper.matrix));
 };
 // Banco con respaldo y reposabrazos.
 placed(
  [
   piece(box(1.7, 0.08, 0.5), { bottom: WOOD.mid, top: WOOD.light, vary: 0.1, position: [0, 0.46, 0] }),
   piece(box(1.7, 0.46, 0.07), { bottom: WOOD.mid, top: WOOD.pale, vary: 0.1, position: [0, 0.8, 0.22], rotation: [-0.16, 0, 0] }),
   ...[-0.72, 0.72].flatMap((x) => [piece(box(0.1, 0.46, 0.46), { color: WOOD.dark, position: [x, 0.23, 0] }), piece(box(0.1, 0.07, 0.56), { color: WOOD.dark, position: [x, 0.7, 0.0] }), piece(box(0.08, 0.26, 0.08), { color: WOOD.dark, position: [x, 0.58, -0.2] })]),
  ],
  BENCH,
 );
 // Tocón-mesa con sus anillos y el armazón del farol (el cristal va aparte: se enciende).
 placed(
  [
   piece(new THREE.CylinderGeometry(0.42, 0.52, 0.56, 9), { bottom: WOOD.dark, top: WOOD.mid, jitter: 0.03, vary: 0.1, position: [0, 0.28, 0] }),
   piece(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 9), { color: WOOD.pale, position: [0, 0.575, 0] }),
   piece(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 9), { color: WOOD.light, position: [0, 0.593, 0] }),
   piece(box(0.2, 0.04, 0.2), { color: "#2a2622", position: [0, 0.62, 0] }),
   ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z]) => piece(box(0.02, 0.3, 0.02), { color: "#2a2622", position: [x * 0.085, 0.78, z * 0.085] })),
   piece(new THREE.ConeGeometry(0.17, 0.12, 4).rotateY(Math.PI / 4), { color: "#2a2622", position: [0, 0.99, 0] }),
   // Una taza olvidada.
   piece(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 7), { color: "#e8e2d4", position: [0.24, 0.64, 0.12] }),
  ],
  STUMP,
 );
 // Arriate: bordillo de piedras, tierra, matas y flores.
 const bed = [piece(new THREE.CylinderGeometry(BED.r - 0.08, BED.r - 0.08, 0.1, 12), { color: "#6d4a33", vary: 0.08, position: [0, 0.05, 0] })];
 for (let i = 0; i < 11; i++) {
  const angle = (i / 11) * Math.PI * 2;
  bed.push(piece(box(0.56, 0.24, 0.3), { bottom: STONE.dark, top: i % 3 ? STONE.light : STONE.mid, jitter: 0.035, vary: 0.1, seed: i, position: [Math.cos(angle) * BED.r, 0.1, Math.sin(angle) * BED.r], rotation: [0, -angle + Math.PI / 2, 0] }));
 }
 const FLOWERS = ["#ff8fb5", "#ffd45a", "#ffffff", "#c79bff", "#ff9a5a"];
 for (let i = 0; i < 16; i++) {
  const angle = i * 2.4, radius = 0.2 + ((i * 0.37) % 1) * (BED.r - 0.5);
  const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius, tall = 0.24 + ((i * 0.61) % 1) * 0.26;
  bed.push(piece(box(0.025, tall, 0.025), { color: "#3f8a45", position: [x, 0.1 + tall / 2, z] }));
  bed.push(piece(new THREE.OctahedronGeometry(0.075, 0), { color: FLOWERS[i % FLOWERS.length], position: [x, 0.12 + tall, z], scale: [1, 0.7, 1] }));
 }
 for (let i = 0; i < 5; i++) bed.push(piece(blob(0), { bottom: "#3a8a47", top: "#86c95e", jitter: 0.16, seed: i, position: [Math.cos(i * 1.9 + 0.6) * 0.62, 0.22, Math.sin(i * 1.9 + 0.6) * 0.62], scale: [0.26, 0.2, 0.26] }));
 placed(bed, BED);
 // Leña apilada: tres troncos abajo y dos encima.
 placed(
  [[-0.24, 0.12], [0, 0.12], [0.24, 0.12], [-0.12, 0.33], [0.12, 0.33]].flatMap(([x, y], i) => [
   piece(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 7).rotateX(Math.PI / 2), { color: i % 2 ? WOOD.dark : "#7a5238", vary: 0.1, seed: i, position: [x, y, 0] }),
   piece(new THREE.CircleGeometry(0.105, 7), { color: WOOD.pale, position: [x, y, 0.452] }),
  ]),
  LOGS,
 );
 return merge(parts, { ground: 0.18, groundHeight: 0.5 });
}

export function Treehouse() {
 const { x, z } = TREEHOUSE;
 const tree = useModel("casa-arbol");
 const corner = useMemo(createCorner, []);
 const material = useMemo(() => ({ tree: createModelMaterial(), corner: lambert() }), []);
 useEffect(
  () => () => {
   corner.dispose();
   Object.values(material).forEach((one) => one.dispose());
  },
  [corner, material],
 );

 return (
  <group position={[x, PLATEAU.height, z]}>
   <mesh name="casa del árbol" userData={{ rests: 0, foot: 2.4 }} geometry={tree} material={material.tree} position={[0.2, -0.05, -1.2]} scale={TREEHOUSE_SIZE} castShadow receiveShadow />
   <mesh name="rincón de la casa del árbol" userData={{ rests: 0 }} geometry={corner} material={material.corner} castShadow receiveShadow />
   {/* Luz de la cabaña y del farol del tocón, de noche. */}
   <Glow power={0.6} forward={1.2} drop={0.3} night={2.2} position={[0.9, 3.9, 0.4]}>
    <boxGeometry args={[0.15, 0.22, 0.15]} />
   </Glow>
   <Glow power={0.7} reach={7} forward={0} drop={0} night={2.4} position={LANTERN_ON_STUMP}>
    <boxGeometry args={[0.15, 0.26, 0.15]} />
   </Glow>
  </group>
 );
}
