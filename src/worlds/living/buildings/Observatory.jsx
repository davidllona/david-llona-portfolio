import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Label } from "../../../experience/Label";
import { useInteractable } from "../../../experience/interact";
import { emit } from "../../../experience/state";
import { setTheme, theme } from "../../../experience/theme";
import { CREAM, STONE, WOOD } from "../kit/palette";
import { OBSERVATORY, PLATEAU } from "../layout";
import { Glow } from "./Glow";
import { createModelMaterial, preloadModel, useModel } from "./useModel";

const BRASS = ["#a8782f", "#e6b85a"];
const PATINA = ["#3f9c8c", "#7fd0bd"];
const PATINA_DARK = ["#2f8577", "#5fb7a6"];
const CENTRE_Z = -1.4; // el edificio queda algo detrás del punto de la zona
const TOWER_RADIUS = 2.1;
const DOME_Y = 3.05;




// Esfera armilar: tres aros que giran a distinto ritmo.
function Armillary({ position }) {
 const rings = useRef([]);
 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  rings.current.forEach((ring, i) => ring?.rotation.set(time * (0.25 + i * 0.12) + i, time * 0.2 * (i % 2 ? -1 : 1), i * 1.1));
 });
 return (
  <group name="esfera armilar" position={position}>
   {[0.42, 0.36, 0.3].map((radius, i) => (
    <mesh key={radius} ref={(node) => (rings.current[i] = node)} castShadow>
     <torusGeometry args={[radius, 0.025, 4, 14]} />
     <meshLambertMaterial color={i === 1 ? BRASS[0] : BRASS[1]} flatShading />
    </mesh>
   ))}
   <mesh>
    <icosahedronGeometry args={[0.11, 0]} />
    <meshLambertMaterial color="#5fb7e6" emissive="#2f7fd0" emissiveIntensity={0.5} flatShading />
   </mesh>
  </group>
 );
}


// Observatorio: mirar por el telescopio cambia entre el día y la noche.
// El edificio es el modelo «Small observatory with telescope dome»
// (docs/CREDITOS.md); se conservan la esfera armilar de fuera y el telescopio
// como interruptor del día y la noche.
const OBSERVATORY_SIZE = 6.4; // m de diámetro
preloadModel("observatorio");

export function Observatory() {
 const { x, z } = OBSERVATORY;
 const building = useModel("observatorio");
 const material = useMemo(() => createModelMaterial({ seeThrough: false }), []);
 useEffect(() => () => material.dispose(), [material]);

 const click = useInteractable({
  position: { x, z: z + 2.5 },
  radius: 3,
  hint: () => (theme.name === "night" ? "Telescopio: volver al día" : "Telescopio: ver las estrellas"),
  anywhere: true,
  action: () => {
   setTheme(theme.name === "night" ? "day" : "night");
   emit("theme");
  },
 });

 return (
  <group name="observatorio" userData={{ rests: 0, foot: 3 }} position={[x, PLATEAU.height, z]} {...click}>
   <mesh geometry={building} material={material} position={[0, 0, CENTRE_Z]} scale={OBSERVATORY_SIZE} castShadow receiveShadow />
   {/* Farol sobre la puerta. */}
   <Glow power={0.8} reach={9} forward={0.6} position={[0, 2.7, CENTRE_Z + OBSERVATORY_SIZE * 0.5 + 0.05]}>
    <boxGeometry args={[0.22, 0.26, 0.22]} />
   </Glow>
   <Armillary position={[-4.4, 1.42, 1.0]} />
  </group>
 );
}
