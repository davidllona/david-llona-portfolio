import { Suspense, useEffect, useMemo, useRef } from "react";
import { Staged } from "../Staged";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CONTACT_LINKS } from "../../content/contact";
import { CV, cvCard } from "../../content/cv";
import { LAB_PROJECTS } from "../../content/lab";
import { Label } from "../../experience/Label";
import { useInteractable } from "../../experience/interact";
import { emit } from "../../experience/state";
import { registerGlow } from "../../experience/theme";
import { addWarmSource } from "../../experience/lightSources";
import { Observatory } from "./buildings/Observatory";
import { Football } from "./football/Football";
import { AboutMe } from "./zones/AboutMe";
import { Contact } from "./zones/Contact";
import { ProjectVillage } from "./zones/ProjectVillage";
import { SignFace, Signposts } from "./props/Signpost";
import { COLORS, CONTACT, CV_KIOSK, LAB_TOTEMS, PITCH, PLATEAU, PROJECT_CABINS, TREEHOUSE, WIND_CHIME, height } from "./layout";

const WOOD = "#c58a55";
const WOOD_DARK = "#7d5233";
const STONE = "#a9a6b3";
const CREAM = "#f6ead6";

const Flat = ({ color }) => <meshLambertMaterial color={color} flatShading />;

// Ventana que se enciende de noche.
function Window({ position, size = [0.5, 0.5] }) {
 const mesh = useRef(null);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ color: "#ffe2a6", emissive: "#ffb84d" }), []);
 useEffect(() => {
  const stopGlow = registerGlow(material, 0.15, 2.6);
  // La ventana ilumina lo que tiene delante (hacia el sur, donde se abre).
  const at = mesh.current.getWorldPosition(new THREE.Vector3());
  const stopLight = addWarmSource({ x: at.x, y: at.y + 0.2, z: at.z + 0.9, power: 0.55, reach: 8, flicker: 0.02 });
  return () => {
   stopGlow();
   stopLight();
  };
 }, [material]);
 return (
  <mesh ref={mesh} position={position} material={material}>
   <boxGeometry args={[size[0], size[1], 0.06]} />
  </mesh>
 );
}

// Tejado a dos aguas: un prisma triangular tumbado.
function Roof({ width, depth, rise, color, y }) {
 const geometry = useMemo(() => {
  const shape = new THREE.Shape();
  shape.moveTo(-depth / 2 - 0.3, 0);
  shape.lineTo(depth / 2 + 0.3, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: width + 0.5, bevelEnabled: false }).translate(0, 0, -(width + 0.5) / 2).rotateY(Math.PI / 2);
 }, [width, depth, rise]);
 useEffect(() => () => geometry.dispose(), [geometry]);
 return (
  <mesh geometry={geometry} position-y={y} castShadow>
   <Flat color={color} />
  </mesh>
 );
}

function Picture({ url, width, height: tall }) {
 const texture = useTexture(url);
 return (
  <mesh position-z={0.09}>
   <planeGeometry args={[width, tall]} />
   <meshBasicMaterial map={texture} toneMapped={false} fog={false} />
  </mesh>
 );
}

const TOTEM_TINTS = ["#19b6c9", "#ff7ae6", "#ffcf4a"];
const TOTEM_SHAPES = [
 <icosahedronGeometry key="a" args={[0.5, 1]} />,
 <torusKnotGeometry key="b" args={[0.34, 0.12, 48, 6]} />,
 <octahedronGeometry key="c" args={[0.55, 0]} />,
];

// Tótem de experimento: un poste de madera con una figura flotando encima.
function LabTotem({ experiment, index, x, z }) {
 const shape = useRef(null);
 const tint = TOTEM_TINTS[index];
 const click = useInteractable({
  position: { x, z: z + 1.4 },
  radius: 2.6,
  hint: `Ver «${experiment.title}»`,
  anywhere: true,
  action: () => emit("open", { kind: "lab", at: { x, y: 1.6, z, distance: 0.55 }, eyebrow: experiment.type, title: experiment.title, paragraphs: [experiment.description], link: experiment.url, linkLabel: "Abrir experimento" }),
 });
 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  shape.current.rotation.set(time * 0.5 + index, time * 0.8, 0);
  shape.current.position.y = 2.15 + Math.sin(time * 1.4 + index * 2) * 0.12;
 });
 return (
  <group name={`tótem de «${experiment.title}»`} userData={{ rests: 0 }} position={[x, 0, z]} {...click}>
   <mesh position-y={0.7} castShadow>
    <cylinderGeometry args={[0.36, 0.5, 1.4, 6]} />
    <Flat color={WOOD} />
   </mesh>
   <mesh position-y={1.44}>
    <cylinderGeometry args={[0.46, 0.46, 0.1, 6]} />
    <meshLambertMaterial color={tint} emissive={tint} emissiveIntensity={0.6} flatShading />
   </mesh>
   <mesh ref={shape} position-y={2.15} castShadow>
    {TOTEM_SHAPES[index]}
    <meshLambertMaterial color={tint} emissive={tint} emissiveIntensity={0.45} flatShading />
   </mesh>
   {/* Placa inclinada al pie, como la de un jardín botánico. */}
   <group position={[0, 0, 1.05]}>
    <mesh position-y={0.28} castShadow>
     <boxGeometry args={[0.1, 0.56, 0.1]} />
     <Flat color={WOOD_DARK} />
    </mesh>
    <group position-y={0.62} rotation-x={-0.95}>
     <mesh>
      <boxGeometry args={[2.3, 0.8, 0.06]} />
      <Flat color={WOOD_DARK} />
     </mesh>
     <SignFace text={experiment.title.toUpperCase()} icon="lab" width={2.24} position={[0, 0, 0.034]} />
    </group>
   </group>
  </group>
 );
}

// Atril con el currículum, junto al cohete.
function CvKiosk() {
 const { x, z } = CV_KIOSK;
 const click = useInteractable({ position: { x, z: z + 1 }, radius: 2.4, hint: "Ver el CV", anywhere: true, action: () => emit("open", { ...cvCard(), at: { x, y: 1.1, z, distance: 0.5 } }) });
 return (
  <group name="atril del CV" userData={{ rests: 0 }} position={[x, 0, z]} {...click}>
   <mesh position-y={0.55} castShadow>
    <boxGeometry args={[0.22, 1.1, 0.22]} />
    <Flat color={WOOD_DARK} />
   </mesh>
   <mesh position={[0, 1.2, 0.05]} rotation-x={-0.6} castShadow>
    <boxGeometry args={[1.2, 0.08, 0.9]} />
    <Flat color={WOOD} />
   </mesh>
   {/* Placa al frente, como las de los carteles. */}
   <group position={[0, 0.66, 0.115]}>
    <mesh>
     <boxGeometry args={[0.98, 0.36, 0.03]} />
     <Flat color={WOOD_DARK} />
    </mesh>
    <SignFace text="CV" icon="cv" width={0.94} position-z={0.018} />
   </group>
   {/* La hoja; con una franja naranja si ya hay PDF. */}
   <mesh position={[0, 1.27, 0.08]} rotation-x={-0.6}>
    <boxGeometry args={[0.72, 0.03, 0.62]} />
    <Flat color={CREAM} />
   </mesh>
   <mesh position={[0, 1.37, -0.08]} rotation-x={-0.6}>
    <boxGeometry args={[0.72, 0.035, 0.1]} />
    <Flat color={CV.file ? COLORS.cv : "#b9b4c4"} />
   </mesh>
  </group>
 );
}

// Carillón de viento: tocarlo despierta al bosque (ver Fauna.jsx).
function WindChime() {
 const tubes = useRef([]);
 const { x, z } = WIND_CHIME;
 const y = height(x, z);
 const click = useInteractable({ position: { x, z: z + 0.8 }, radius: 2.4, hint: "Tocar el carillón", anywhere: true, action: () => emit("gust", { x, z }) });
 useFrame(({ clock }) => {
  tubes.current.forEach((tube, i) => {
   if (tube) tube.rotation.z = Math.sin(clock.elapsedTime * 1.6 + i * 1.3) * 0.16;
  });
 });
 return (
  <group name="carillón" userData={{ rests: 0, foot: 0.3 }} position={[x, y, z]} {...click}>
   <mesh position-y={1.5} castShadow>
    <boxGeometry args={[0.16, 3, 0.16]} />
    <Flat color={WOOD_DARK} />
   </mesh>
   <mesh position={[0.5, 2.9, 0]}>
    <boxGeometry args={[1.2, 0.12, 0.12]} />
    <Flat color={WOOD_DARK} />
   </mesh>
   {[0.25, 0.55, 0.85].map((dx, i) => (
    <group key={dx} ref={(node) => (tubes.current[i] = node)} position={[dx, 2.85, 0]}>
     <mesh position-y={-0.45 - i * 0.08}>
      <cylinderGeometry args={[0.05, 0.05, 0.7 + i * 0.16, 6]} />
      <meshLambertMaterial color="#ffd98a" emissive="#ffb84d" emissiveIntensity={0.35} flatShading />
     </mesh>
    </group>
   ))}
   {/* Zona de clic. */}
   <mesh position-y={1.6}>
    <cylinderGeometry args={[0.8, 0.8, 3.2, 6]} />
    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
   </mesh>
  </group>
 );
}

// Campo de fútbol: el césped y sus líneas. El partido es football/Football.jsx.
function Pitch() {
 const width = PITCH.x1 - PITCH.x0;
 const depth = PITCH.z1 - PITCH.z0;
 const cx = (PITCH.x0 + PITCH.x1) / 2;
 const cz = (PITCH.z0 + PITCH.z1) / 2;
 const line = <meshBasicMaterial color="#f4f8ee" />;
 const goalX = PITCH.x0 + 2.3; // la portería, separada del borde
 return (
  <group name="campo de fútbol" userData={{ rests: 0 }}>
   <mesh position={[cx, 0.03, cz]} receiveShadow>
    <boxGeometry args={[width, 0.06, depth]} />
    <Flat color="#4f9f4c" />
   </mesh>
   {/* Bordillo de madera alrededor. */}
   {[
    [cx, PITCH.z0 - 0.14, width + 0.56, 0.28],
    [cx, PITCH.z1 + 0.14, width + 0.56, 0.28],
    [PITCH.x0 - 0.14, cz, 0.28, depth],
    [PITCH.x1 + 0.14, cz, 0.28, depth],
   ].map(([x, z, w, d], i) => (
    <mesh key={i} position={[x, 0.08, z]} castShadow receiveShadow>
     <boxGeometry args={[w, 0.16, d]} />
     <Flat color={i % 2 ? WOOD : "#b37a48"} />
    </mesh>
   ))}
   {/* Franjas de siega. */}
   {Array.from({ length: 5 }, (_, i) => (
    <mesh key={i} position={[PITCH.x0 + (width / 9) * (i * 2 + 0.5), 0.062, cz]} receiveShadow>
     <boxGeometry args={[width / 9, 0.005, depth]} />
     <Flat color="#5aad55" />
    </mesh>
   ))}
   <group position-y={0.07}>
    {[PITCH.z0 + 0.15, PITCH.z1 - 0.15].map((z) => (
     <mesh key={z} position={[cx, 0, z]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[width - 0.3, 0.1]} />
      {line}
     </mesh>
    ))}
    {[PITCH.x0 + 0.15, PITCH.x1 - 0.15].map((x) => (
     <mesh key={x} position={[x, 0, cz]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[0.1, depth - 0.3]} />
      {line}
     </mesh>
    ))}
    {/* Área y punto de penalti. */}
    <mesh position={[goalX + 2.7, 0, cz - 3.6]} rotation-x={-Math.PI / 2}><planeGeometry args={[5.4, 0.1]} />{line}</mesh>
    <mesh position={[goalX + 2.7, 0, cz + 3.6]} rotation-x={-Math.PI / 2}><planeGeometry args={[5.4, 0.1]} />{line}</mesh>
    <mesh position={[goalX + 5.4, 0, cz]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.1, 7.3]} />{line}</mesh>
    <mesh position={[goalX, 0, cz]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.1, 7.3]} />{line}</mesh>
    <mesh position={[goalX + 7.4, 0, cz]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.16, 12]} />{line}</mesh>
   </group>
   {/* (La portería, la red, el balón y el juego los pone football/Football.jsx.) */}
  </group>
 );
}

export function Zones() {
 return (
  <Staged>
   <ProjectVillage />
   {LAB_PROJECTS.slice(0, 3).map((experiment, i) => (
    <LabTotem key={experiment.id} experiment={experiment} index={i} {...LAB_TOTEMS[i]} />
   ))}
   <CvKiosk />
   <AboutMe />
   <Observatory />
   <Contact />
   <WindChime />
   <Pitch />
   <Football />
   <Signposts />
  </Staged>
 );
}
