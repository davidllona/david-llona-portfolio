import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { lambert } from "../../../experience/materials";
import { createSignTexture } from "../../../experience/textures";
import { registerGlow } from "../../../experience/theme";
import { limb, merge, piece } from "../kit/geometry";
import { ROCK, WOOD } from "../kit/palette";
import { SIGNPOSTS, SIGN_SPAN, height } from "../layout";
import { Halos } from "./Halos";

// Cartel indicador: dos postes de madera y un tablón grande y claro, inclinado
// hacia quien mira, con el icono de la zona y el nombre en letra oscura y
// gruesa (se lee desde lejos). Encima, un flexo de hierro que de noche lo
// alumbra: el tablón tiene entonces luz propia.
const BOARD = { width: 2.36, height: 0.8, y: 1.66, tilt: -0.3, depth: 0.08 };
const LAMP = [0, BOARD.y + BOARD.height / 2 + 0.2, 0.36]; // la lámpara, respecto al pie
const IRON = "#2c2f36";

function createFrame() {
 const tilted = (geometry, options, y, z = 0) => {
  // Coloca una pieza en el plano inclinado del tablón.
  const part = piece(geometry, { ...options, position: [options.position?.[0] ?? 0, y, z] });
  part.translate(0, -BOARD.y, 0).rotateX(BOARD.tilt).translate(0, BOARD.y, 0);
  return part;
 };
 return merge([
  ...[-1, 1].flatMap((side) => [
   piece(limb(0.085, 0.07, 2.18, 6), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.08, position: [side * SIGN_SPAN, 0, -0.05] }),
   piece(new THREE.CylinderGeometry(0.16, 0.22, 0.2, 6), { bottom: ROCK.dark, top: ROCK.light, position: [side * SIGN_SPAN, 0.1, -0.05] }),
  ]),
  // Tablón claro, marco oscuro arriba y abajo y dos tapajuntas.
  tilted(new THREE.BoxGeometry(BOARD.width, BOARD.height, BOARD.depth), { bottom: "#e9d3a6", top: "#f6e7c4", vary: 0.03 }, BOARD.y, 0.05),
  tilted(new THREE.BoxGeometry(BOARD.width + 0.2, 0.09, 0.2), { color: WOOD.dark }, BOARD.y + BOARD.height / 2 + 0.03, 0.05),
  tilted(new THREE.BoxGeometry(BOARD.width + 0.08, 0.06, 0.13), { color: WOOD.dark }, BOARD.y - BOARD.height / 2 - 0.02, 0.05),
  // Flexo: un brazo que sale del marco y la pantalla que mira al tablón.
  piece(new THREE.BoxGeometry(0.04, 0.04, 0.42), { color: IRON, position: [0, LAMP[1] + 0.06, LAMP[2] - 0.2], rotation: [0.25, 0, 0] }),
  piece(new THREE.ConeGeometry(0.12, 0.13, 6), { color: IRON, position: [LAMP[0], LAMP[1] + 0.03, LAMP[2]], rotation: [-0.5, 0, 0] }),
 ]);
}

function Sign({ text, icon, x, z, turn, glass }) {
 const texture = useMemo(() => createSignTexture(text, icon), [text, icon]);
 // La cara recibe la luz del día como el resto y, de noche, además se enciende.
 const material = useMemo(() => new THREE.MeshLambertMaterial({ map: texture, emissive: "#ffe2b0", emissiveMap: texture }), [texture]);
 useEffect(() => {
  const stop = registerGlow(material, 0.12, 0.62);
  return () => {
   stop();
   texture.dispose();
   material.dispose();
  };
 }, [texture, material]);
 return (
  <group position={[x, height(x, z), z]} rotation-y={turn}>
   <group position={[0, BOARD.y, 0]} rotation-x={BOARD.tilt}>
    <mesh position-z={0.05 + BOARD.depth / 2 + 0.004} material={material}>
     <planeGeometry args={[BOARD.width - 0.06, BOARD.height - 0.06]} />
    </mesh>
   </group>
   <mesh position={LAMP} material={glass}>
    <sphereGeometry args={[0.06, 6, 4]} />
   </mesh>
  </group>
 );
}

export function Signposts() {
 const frame = useMemo(createFrame, []);
 const material = useMemo(() => lambert(), []);
 const glass = useMemo(() => new THREE.MeshLambertMaterial({ color: "#000000", emissive: "#ffc878" }), []);
 useEffect(() => {
  const stop = registerGlow(glass, 0.5, 1.3);
  return () => {
   stop();
   frame.dispose();
   material.dispose();
   glass.dispose();
  };
 }, [frame, material, glass]);
 // Un halo en la lámpara de cada cartel.
 const lamps = useMemo(
  () =>
   SIGNPOSTS.map((sign) => {
    const at = new THREE.Vector3(...LAMP).applyAxisAngle(new THREE.Vector3(0, 1, 0), sign.turn);
    return [sign.x + at.x, height(sign.x, sign.z) + at.y, sign.z + at.z];
   }),
  [],
 );
 return (
  <>
   {SIGNPOSTS.map((sign) => (
    <group key={sign.text}>
     <mesh name={`poste de ${sign.text}`} userData={{ rests: 0 }} geometry={frame} material={material} position={[sign.x, height(sign.x, sign.z), sign.z]} rotation-y={sign.turn} castShadow />
     <Sign {...sign} glass={glass} />
    </group>
   ))}
   <Halos points={lamps} size={0.9} night={0.5} />
  </>
 );
}
