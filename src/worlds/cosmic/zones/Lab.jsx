import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { LAB_PROJECTS } from "../../../content/lab";
import { Label } from "../../../experience/Label";
import { useInteractable } from "../../../experience/interact";
import { emit } from "../../../experience/state";
import { COLORS, LAB } from "../layout";

const TINTS = ["#19c3c9", "#ff7ae6", "#ffcf4a"];
// Una figura distinta flotando sobre cada pedestal.
const SHAPES = [
 <icosahedronGeometry key="a" args={[0.62, 1]} />,
 <torusKnotGeometry key="b" args={[0.42, 0.14, 64, 8]} />,
 <octahedronGeometry key="c" args={[0.68, 0]} />,
];

function Pedestal({ experiment, index, x, z }) {
 const shape = useRef(null);
 const tint = TINTS[index];
 const click = useInteractable({
  position: { x, z: z + 1.6 },
  radius: 2.8,
  hint: `Ver «${experiment.title}»`,
  anywhere: true,
  action: () =>
   emit("open", {
    eyebrow: experiment.type,
    title: experiment.title,
    paragraphs: [experiment.description],
    link: experiment.url,
    linkLabel: "Abrir experimento",
   }),
 });

 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  shape.current.rotation.set(time * 0.5 + index, time * 0.8, 0);
  shape.current.position.y = 2.25 + Math.sin(time * 1.4 + index * 2) * 0.14;
 });

 return (
  <group position={[x, 0, z]} {...click}>
   <mesh position-y={0.55} castShadow>
    <cylinderGeometry args={[0.6, 0.78, 1.1, 8]} />
    <meshLambertMaterial color="#3b2a5c" flatShading />
   </mesh>
   <mesh position-y={1.13}>
    <cylinderGeometry args={[0.66, 0.66, 0.08, 8]} />
    <meshLambertMaterial color={tint} emissive={tint} emissiveIntensity={0.8} />
   </mesh>
   <mesh ref={shape} position-y={2.25} castShadow>
    {SHAPES[index]}
    <meshLambertMaterial color={tint} emissive={tint} emissiveIntensity={0.55} flatShading />
   </mesh>
   {/* Haz de luz bajo la figura. */}
   <mesh position-y={1.7}>
    <cylinderGeometry args={[0.5, 0.62, 1.1, 12, 1, true]} />
    <meshBasicMaterial color={tint} transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
   </mesh>
   <Label text={experiment.title.toUpperCase()} color={tint} width={3.2} position={[0, 0.17, 1.7]} plate flat />
  </group>
 );
}

export function Lab() {
 return (
  <>
   <Label text="LAB" color={COLORS.lab} width={5} position={[LAB.center.x, 0.17, LAB.center.z + 3.6]} flat />
   {LAB_PROJECTS.slice(0, 3).map((experiment, i) => (
    <Pedestal key={experiment.id} experiment={experiment} index={i} {...LAB.pedestals[i]} />
   ))}
  </>
 );
}
