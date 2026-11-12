import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { aboutText } from "../../content/about";
import { CONTACT_LINKS } from "../../content/contact";
import { CV, cvCard } from "../../content/cv";
import { LAB_PROJECTS } from "../../content/lab";
import { PROJECTS } from "../../content/projects";
import { Label } from "../../experience/Label";
import { useInteractable } from "../../experience/interact";
import { emit } from "../../experience/state";
import { createTextPanelTexture } from "../../experience/textures";
import { registerGlow, setTheme, theme } from "../../experience/theme";
import { COLORS, CONTACT, CV_KIOSK, LAB_TOTEMS, OBSERVATORY, PITCH, PLATEAU, PROJECT_CABINS, TREEHOUSE, WIND_CHIME, height } from "./layout";

const WOOD = "#c58a55";
const WOOD_DARK = "#7d5233";
const STONE = "#a9a6b3";
const CREAM = "#f6ead6";

const Flat = ({ color }) => <meshLambertMaterial color={color} flatShading />;

// Ventana que se enciende de noche.
function Window({ position, size = [0.5, 0.5] }) {
 const material = useMemo(() => new THREE.MeshLambertMaterial({ color: "#ffe2a6", emissive: "#ffb84d" }), []);
 useEffect(() => registerGlow(material, 0.15, 2.6), [material]);
 return (
  <mesh position={position} material={material}>
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

// Una cabaña por proyecto, con el tejado de su color, y su cartel al lado.
function ProjectCabin({ project, x, z }) {
 const open = () =>
  emit("open", {
   kind: "project",
   eyebrow: `Proyecto · ${project.year}`,
   title: project.name,
   paragraphs: [project.tagline, project.description],
   tags: project.tags,
   image: project.images[0],
   link: project.link,
   linkLabel: "Ver proyecto",
  });
 const click = useInteractable({ position: { x: x + 0.4, z: z + 2.6 }, radius: 3.4, hint: `Ver «${project.name}»`, anywhere: true, action: open });

 return (
  <group position={[x, 0, z]} {...click}>
   {/* Cabaña. */}
   <group position={[-0.9, 0, -1.2]}>
    <mesh position-y={0.12} receiveShadow>
     <boxGeometry args={[3.5, 0.24, 3]} />
     <Flat color={STONE} />
    </mesh>
    <mesh position-y={1.25} castShadow receiveShadow>
     <boxGeometry args={[3, 2.1, 2.5]} />
     <Flat color={WOOD} />
    </mesh>
    <Roof width={3} depth={2.5} rise={1.35} color={project.color} y={2.3} />
    <mesh position={[0.95, 3.2, -0.4]} castShadow>
     <boxGeometry args={[0.42, 1, 0.42]} />
     <Flat color={STONE} />
    </mesh>
    <mesh position={[-0.6, 0.95, 1.27]}>
     <boxGeometry args={[0.8, 1.5, 0.08]} />
     <Flat color={WOOD_DARK} />
    </mesh>
    <Window position={[0.75, 1.45, 1.27]} />
   </group>

   {/* Cartel con la captura del proyecto, inclinado hacia la cámara. */}
   <group position={[1.9, 0, 0.9]}>
    {[-1.05, 1.05].map((dx) => (
     <mesh key={dx} position={[dx, 0.6, -0.05]} castShadow>
      <boxGeometry args={[0.16, 1.2, 0.16]} />
      <Flat color={WOOD_DARK} />
     </mesh>
    ))}
    <group position-y={1.75} rotation-x={-0.24}>
     <mesh castShadow>
      <boxGeometry args={[2.7, 1.75, 0.14]} />
      <Flat color={WOOD_DARK} />
     </mesh>
     <Suspense fallback={null}>
      <Picture url={project.images[0]} width={2.46} height={1.5} />
     </Suspense>
    </group>
   </group>
   <Label text={project.name.toUpperCase()} color={project.color} width={5.4} position={[0.4, 0.17, 3.1]} plate flat />
  </group>
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
  action: () => emit("open", { kind: "lab", eyebrow: experiment.type, title: experiment.title, paragraphs: [experiment.description], link: experiment.url, linkLabel: "Abrir experimento" }),
 });
 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  shape.current.rotation.set(time * 0.5 + index, time * 0.8, 0);
  shape.current.position.y = 2.15 + Math.sin(time * 1.4 + index * 2) * 0.12;
 });
 return (
  <group position={[x, 0, z]} {...click}>
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
   <Label text={experiment.title.toUpperCase()} color={tint} width={3} position={[0, 0.17, 1.5]} plate flat />
  </group>
 );
}

// Atril con el currículum, junto al cohete.
function CvKiosk() {
 const { x, z } = CV_KIOSK;
 const click = useInteractable({ position: { x, z: z + 1 }, radius: 2.4, hint: "Ver el CV", anywhere: true, action: () => emit("open", cvCard()) });
 return (
  <group position={[x, 0, z]} {...click}>
   <mesh position-y={0.55} castShadow>
    <boxGeometry args={[0.22, 1.1, 0.22]} />
    <Flat color={WOOD_DARK} />
   </mesh>
   <mesh position={[0, 1.2, 0.05]} rotation-x={-0.6} castShadow>
    <boxGeometry args={[1.2, 0.08, 0.9]} />
    <Flat color={WOOD} />
   </mesh>
   {/* La hoja; con una franja naranja si ya hay PDF. */}
   <mesh position={[0, 1.27, 0.08]} rotation-x={-0.6}>
    <boxGeometry args={[0.72, 0.03, 0.62]} />
    <Flat color={CREAM} />
   </mesh>
   <mesh position={[0, 1.37, -0.08]} rotation-x={-0.6}>
    <boxGeometry args={[0.72, 0.035, 0.1]} />
    <Flat color={CV.file ? COLORS.cv : "#b9b4c4"} />
   </mesh>
   <Label text="CV" color={COLORS.cv} width={1.6} position={[0, 0.17, 1.3]} plate flat />
  </group>
 );
}

// Sobre mí: una casita en lo alto de un árbol, en la meseta, con su cartel.
function Treehouse() {
 const { x, z } = TREEHOUSE;
 const texture = useMemo(
  () => createTextPanelTexture({ eyebrow: aboutText.eyebrow, headline: aboutText.headline, paragraphs: aboutText.paragraphs, color: COLORS["sobre-mi"] }),
  [],
 );
 useEffect(() => () => texture.dispose(), [texture]);
 const click = useInteractable({
  position: { x: x + 2.6, z: z + 2.6 },
  radius: 3.2,
  hint: "Leer «Sobre mí»",
  anywhere: true,
  action: () => emit("open", { kind: "about", eyebrow: aboutText.eyebrow, title: aboutText.headline.join(" "), paragraphs: aboutText.paragraphs }),
 });
 return (
  <group position={[x, PLATEAU.height, z]}>
   {/* Tronco, plataforma y casita. */}
   <mesh position={[0, 2.1, -1.6]} rotation-z={0.05} castShadow>
    <cylinderGeometry args={[0.75, 1.15, 4.4, 7]} />
    <Flat color={WOOD_DARK} />
   </mesh>
   <mesh position={[0, 4.2, -1.6]} castShadow>
    <cylinderGeometry args={[2.5, 2.3, 0.26, 8]} />
    <Flat color={WOOD} />
   </mesh>
   <mesh position={[0, 5.3, -1.8]} castShadow>
    <boxGeometry args={[2.6, 1.9, 2.2]} />
    <Flat color="#d39a62" />
   </mesh>
   <group position={[0, 0, -1.8]}>
    <Roof width={2.6} depth={2.2} rise={1.2} color={COLORS["sobre-mi"]} y={6.25} />
   </group>
   <Window position={[0, 5.35, -0.67]} size={[0.7, 0.6]} />
   {/* Copa del árbol, detrás y a los lados de la casita. */}
   {[
    [-2.3, 6.3, -2.6, 1.9],
    [2.2, 6.6, -2.9, 1.8],
    [0, 7.6, -3.2, 2.2],
   ].map(([dx, y, dz, size]) => (
    <mesh key={dx} position={[dx, y, dz]} castShadow>
     <icosahedronGeometry args={[size, 1]} />
     <Flat color="#5fae4e" />
    </mesh>
   ))}
   {/* Escalera de mano. */}
   {Array.from({ length: 8 }, (_, i) => (
    <mesh key={i} position={[1.5, 0.45 + i * 0.5, 0.4 - i * 0.2]}>
     <boxGeometry args={[0.8, 0.07, 0.1]} />
     <Flat color={WOOD_DARK} />
    </mesh>
   ))}
   {/* Cartel con el texto de presentación. */}
   <group position={[2.6, 0, 1.2]} {...click}>
    {[-1.1, 1.1].map((dx) => (
     <mesh key={dx} position={[dx, 0.6, -0.05]} castShadow>
      <boxGeometry args={[0.16, 1.2, 0.16]} />
      <Flat color={WOOD_DARK} />
     </mesh>
    ))}
    <group position-y={2.2} rotation-x={-0.24}>
     <mesh castShadow>
      <boxGeometry args={[2.9, 2.9, 0.16]} />
      <Flat color={WOOD_DARK} />
     </mesh>
     <mesh position-z={0.09}>
      <planeGeometry args={[2.66, 2.66]} />
      <meshBasicMaterial map={texture} toneMapped={false} fog={false} />
     </mesh>
    </group>
   </group>
   <Label text="SOBRE MÍ" color={COLORS["sobre-mi"]} width={3.6} position={[1, 0.17, 3.6]} plate flat />
  </group>
 );
}

// Observatorio: mirar por el telescopio cambia entre el día y la noche.
function Observatory() {
 const { x, z } = OBSERVATORY;
 const click = useInteractable({
  position: { x, z: z + 1.8 },
  radius: 3,
  hint: () => (theme.name === "night" ? "Telescopio: volver al día" : "Telescopio: ver las estrellas"),
  anywhere: true,
  action: () => {
   setTheme(theme.name === "night" ? "day" : "night");
   emit("theme");
  },
 });
 return (
  <group position={[x, PLATEAU.height, z]} {...click}>
   <mesh position={[0, 1.1, -1.4]} castShadow receiveShadow>
    <cylinderGeometry args={[2.3, 2.5, 2.2, 10]} />
    <Flat color={CREAM} />
   </mesh>
   <mesh position={[0, 2.2, -1.4]} castShadow>
    <sphereGeometry args={[2.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
    <Flat color="#c9c4d6" />
   </mesh>
   <mesh position={[0, 2.26, -1.4]}>
    <cylinderGeometry args={[2.36, 2.36, 0.2, 10]} />
    <Flat color={COLORS.lab} />
   </mesh>
   {/* Telescopio asomando por la cúpula. */}
   <group position={[0.5, 3.7, -0.6]} rotation={[-0.75, 0.3, 0]}>
    <mesh castShadow>
     <cylinderGeometry args={[0.34, 0.42, 2.4, 8]} />
     <Flat color="#b9824f" />
    </mesh>
    <mesh position-y={1.25}>
     <cylinderGeometry args={[0.44, 0.44, 0.2, 8]} />
     <Flat color={WOOD_DARK} />
    </mesh>
   </group>
   <mesh position={[0, 0.9, 0.93]}>
    <boxGeometry args={[0.8, 1.5, 0.1]} />
    <Flat color={WOOD_DARK} />
   </mesh>
   <Window position={[1.5, 1.4, 0.42]} size={[0.5, 0.5]} />
   <Label text="OBSERVATORIO" color={COLORS.lab} width={4} position={[0, 0.17, 2.6]} plate flat />
  </group>
 );
}

function openLink(href) {
 if (href.startsWith("mailto:")) window.location.href = href;
 else window.open(href, "_blank", "noopener,noreferrer");
}

function Terminal({ link, x, z }) {
 const click = useInteractable({ position: { x, z: z + 1.2 }, radius: 2.3, hint: `Abrir ${link.label}`, anywhere: true, action: () => openLink(link.href) });
 return (
  <group position={[x, 0, z]} {...click}>
   <mesh position-y={0.55} castShadow>
    <boxGeometry args={[0.7, 1.1, 0.5]} />
    <Flat color={WOOD} />
   </mesh>
   <mesh position={[0, 1.36, 0.05]} rotation-x={-0.4} castShadow>
    <boxGeometry args={[1.3, 0.85, 0.12]} />
    <Flat color={WOOD_DARK} />
   </mesh>
   <mesh position={[0, 1.38, 0.12]} rotation-x={-0.4}>
    <planeGeometry args={[1.1, 0.66]} />
    <meshBasicMaterial color={COLORS.contacto} toneMapped={false} />
   </mesh>
   <Label text={link.label.toUpperCase()} color={COLORS.contacto} width={2.3} position={[0, 0.17, 1.3]} plate flat />
  </group>
 );
}

// Contacto: caseta de comunicaciones con una antena que gira y un terminal por enlace.
function ContactStation() {
 const dish = useRef(null);
 const beacon = useMemo(() => new THREE.MeshLambertMaterial({ color: COLORS.contacto, emissive: COLORS.contacto }), []);
 useEffect(() => registerGlow(beacon, 0.8, 3), [beacon]);
 useFrame(({ clock }) => {
  dish.current.rotation.y = clock.elapsedTime * 0.35;
 });
 return (
  <>
   <group position={[CONTACT.x, 0, CONTACT.z - 2.6]}>
    <mesh position-y={1.1} castShadow receiveShadow>
     <boxGeometry args={[3.2, 2.2, 2.4]} />
     <Flat color={CREAM} />
    </mesh>
    <Roof width={3.2} depth={2.4} rise={1.1} color={COLORS.contacto} y={2.2} />
    <mesh position={[0, 0.85, 1.22]}>
     <boxGeometry args={[0.8, 1.5, 0.08]} />
     <Flat color={WOOD_DARK} />
    </mesh>
    <Window position={[1.05, 1.4, 1.22]} />
    <Window position={[-1.05, 1.4, 1.22]} />
   </group>
   <group position={[CONTACT.antenna.x, 0, CONTACT.antenna.z]}>
    <mesh position-y={0.3} castShadow>
     <cylinderGeometry args={[0.9, 1.2, 0.6, 8]} />
     <Flat color={STONE} />
    </mesh>
    <mesh position-y={2.2} castShadow>
     <cylinderGeometry args={[0.14, 0.2, 3.4, 6]} />
     <Flat color={CREAM} />
    </mesh>
    <group ref={dish} position-y={4.1}>
     <mesh rotation-x={-0.9} castShadow>
      <coneGeometry args={[1.7, 0.8, 12, 1, true]} />
      <meshLambertMaterial color={CREAM} flatShading side={THREE.DoubleSide} />
     </mesh>
     <mesh position={[0, 0.88, 1.12]} material={beacon}>
      <sphereGeometry args={[0.13, 8, 6]} />
     </mesh>
    </group>
   </group>
   {CONTACT_LINKS.map((link, i) => (
    <Terminal key={link.label} link={link} {...CONTACT.terminals[i]} />
   ))}
   <Label text="CONTACTO" color={COLORS.contacto} width={4} position={[CONTACT.x, 0.17, CONTACT.z + 5.4]} plate flat />
  </>
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
  <group position={[x, y, z]} {...click}>
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

// Campo de fútbol. De momento es solo el campo y la portería; el juego llega
// en su propia fase.
function Pitch() {
 const width = PITCH.x1 - PITCH.x0;
 const depth = PITCH.z1 - PITCH.z0;
 const cx = (PITCH.x0 + PITCH.x1) / 2;
 const cz = (PITCH.z0 + PITCH.z1) / 2;
 const line = <meshBasicMaterial color="#f4f8ee" />;
 const goalX = PITCH.x0 + 0.6;
 return (
  <group>
   <mesh position={[cx, 0.03, cz]} receiveShadow>
    <boxGeometry args={[width, 0.06, depth]} />
    <Flat color="#4f9f4c" />
   </mesh>
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
    <mesh position={[goalX + 7.4, 0, cz]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.16, 12]} />{line}</mesh>
   </group>
   {/* Portería: dos postes y el larguero. */}
   {[-2.4, 2.4].map((dz) => (
    <mesh key={dz} position={[goalX, 1.1, cz + dz]} castShadow>
     <cylinderGeometry args={[0.07, 0.07, 2.2, 8]} />
     <Flat color="#ffffff" />
    </mesh>
   ))}
   <mesh position={[goalX, 2.2, cz]} rotation-x={Math.PI / 2} castShadow>
    <cylinderGeometry args={[0.07, 0.07, 4.94, 8]} />
    <Flat color="#ffffff" />
   </mesh>
   <mesh position={[goalX - 0.75, 1.1, cz]}>
    <boxGeometry args={[1.5, 2.2, 4.8]} />
    <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.35} />
   </mesh>
   <Label text="FÚTBOL" color={COLORS.deporte} width={3.4} position={[cx, 0.17, PITCH.z1 + 1.5]} plate flat />
  </group>
 );
}

export function Zones() {
 return (
  <>
   {PROJECTS.map((project, i) => (
    <ProjectCabin key={project.id} project={project} {...PROJECT_CABINS[i]} />
   ))}
   <Label text="PROYECTOS" color={COLORS.proyectos} width={6} position={[-9.5, 0.17, 1.9]} flat />
   {LAB_PROJECTS.slice(0, 3).map((experiment, i) => (
    <LabTotem key={experiment.id} experiment={experiment} index={i} {...LAB_TOTEMS[i]} />
   ))}
   <CvKiosk />
   <Treehouse />
   <Observatory />
   <ContactStation />
   <WindChime />
   <Pitch />
  </>
 );
}
