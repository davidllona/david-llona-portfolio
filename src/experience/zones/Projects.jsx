import { Suspense } from "react";
import { useTexture } from "@react-three/drei";
import { PROJECTS } from "../../content/projects";
import { Label } from "../Label";
import { useInteractable } from "../interact";
import { emit } from "../state";
import { COLORS, PROJECT_BOARDS } from "../world";

const BOARD = { width: 5.6, height: 3.3, y: 3.05, tilt: -0.2 };

function Picture({ url }) {
 const texture = useTexture(url);
 return (
  <mesh position-z={0.15}>
   <planeGeometry args={[BOARD.width - 0.4, BOARD.height - 0.4]} />
   <meshBasicMaterial map={texture} toneMapped={false} fog={false} />
  </mesh>
 );
}

// Un cartel por proyecto, inclinado hacia la cámara. Al pulsarlo (o con E
// delante) se abre su ficha.
function Board({ project, x, z }) {
 const open = () =>
  emit("open", {
   eyebrow: `Proyecto · ${project.year}`,
   title: project.name,
   paragraphs: [project.tagline, project.description],
   tags: project.tags,
   image: project.images[0],
   link: project.link,
   linkLabel: "Ver proyecto",
  });
 const click = useInteractable({
  position: { x, z: z + 2.2 },
  radius: 3.3,
  hint: `Ver «${project.name}»`,
  anywhere: true,
  action: open,
 });

 return (
  <group position={[x, 0, z]} rotation-y={-x * 0.014} {...click}>
   {[-1, 1].map((side) => (
    <mesh key={side} position={[side * (BOARD.width / 2 - 0.5), 0.9, -0.1]} castShadow>
     <boxGeometry args={[0.24, 1.8, 0.24]} />
     <meshLambertMaterial color="#3b2a5c" flatShading />
    </mesh>
   ))}
   <group position-y={BOARD.y} rotation-x={BOARD.tilt}>
    <mesh castShadow>
     <boxGeometry args={[BOARD.width, BOARD.height, 0.26]} />
     <meshLambertMaterial color="#241a4d" flatShading />
    </mesh>
    {/* Franja superior con el color del proyecto. */}
    <mesh position-y={BOARD.height / 2 + 0.1}>
     <boxGeometry args={[BOARD.width, 0.2, 0.3]} />
     <meshLambertMaterial color={project.color} emissive={project.color} emissiveIntensity={0.5} />
    </mesh>
    <Suspense fallback={null}>
     <Picture url={project.images[0]} />
    </Suspense>
   </group>
   <Label text={project.name.toUpperCase()} color={project.color} width={4.4} position={[0, 0.17, 2.3]} plate flat />
  </group>
 );
}

export function Projects() {
 return (
  <>
   <Label text="PROYECTOS" color={COLORS.proyectos} width={7} position={[-6.2, 0.17, -24.2]} flat />
   {PROJECTS.map((project, i) => (
    <Board key={project.id} project={project} {...PROJECT_BOARDS[i]} />
   ))}
  </>
 );
}
