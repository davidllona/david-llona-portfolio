import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { lambert } from "../../../experience/materials";
import { createLabelTexture } from "../../../experience/textures";
import { limb, merge, piece } from "../kit/geometry";
import { CREAM, STONE, WOOD } from "../kit/palette";
import { SIGNPOSTS, height } from "../layout";

// Poste indicador: una estaca de madera con una tabla inclinada hacia quien
// mira, rotulada con la letra del título (crema sobre madera). Sustituye a los
// rótulos negros tumbados en el suelo.
const BOARD = { width: 1.62, height: 0.46, y: 1.34, tilt: -0.34 };

const createPost = () =>
 merge([
  piece(limb(0.075, 0.06, 1.62, 5), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.08 }),
  piece(new THREE.CylinderGeometry(0.15, 0.2, 0.16, 6), { color: STONE.mid, vary: 0.08, position: [0, 0.08, 0] }),
  // La tabla, con un extremo en punta, y el listón que la remata.
  piece(new THREE.BoxGeometry(BOARD.width, BOARD.height, 0.07), { bottom: WOOD.mid, top: WOOD.light, vary: 0.1, position: [0, BOARD.y, 0.09], rotation: [BOARD.tilt, 0, 0] }),
  piece(new THREE.BoxGeometry(BOARD.width + 0.12, 0.06, 0.12), { color: WOOD.dark, position: [0, BOARD.y + BOARD.height / 2 + 0.02, 0.02], rotation: [BOARD.tilt, 0, 0] }),
 ]);

function Sign({ text, x, z, turn }) {
 const texture = useMemo(() => createLabelTexture(text, CREAM, { title: true }), [text]);
 useEffect(() => () => texture.dispose(), [texture]);
 return (
  <group position={[x, height(x, z), z]} rotation-y={turn}>
   <group position={[0, BOARD.y, 0.09]} rotation-x={BOARD.tilt}>
    <mesh position-z={0.04}>
     <planeGeometry args={[BOARD.width - 0.1, (BOARD.width - 0.1) / 4]} />
     <meshBasicMaterial map={texture} transparent toneMapped={false} fog={false} />
    </mesh>
   </group>
  </group>
 );
}

export function Signposts() {
 const post = useMemo(createPost, []);
 const material = useMemo(() => lambert(), []);
 useEffect(
  () => () => {
   post.dispose();
   material.dispose();
  },
  [post, material],
 );
 return SIGNPOSTS.map((sign) => (
  <group key={sign.text}>
   <mesh geometry={post} material={material} position={[sign.x, height(sign.x, sign.z), sign.z]} rotation-y={sign.turn} castShadow />
   <Sign {...sign} />
  </group>
 ));
}
