import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Label } from "../../../experience/Label";
import { useInteractable } from "../../../experience/interact";
import { emit } from "../../../experience/state";
import { current, setTheme, theme } from "../../../experience/theme";
import { blob, limb, merge, piece } from "../kit/geometry";
import { CREAM, STONE, WOOD } from "../kit/palette";
import { OBSERVATORY, PLATEAU } from "../layout";
import { Glow } from "./Glow";

const BRASS = ["#a8782f", "#e6b85a"];
const PATINA = ["#3f9c8c", "#7fd0bd"];
const PATINA_DARK = ["#2f8577", "#5fb7a6"];
const CENTRE_Z = -1.4; // el edificio queda algo detrás del punto de la zona
const TOWER_RADIUS = 2.1;
const DOME_Y = 3.05;

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const tube = (radius, height, sides = 12) => new THREE.CylinderGeometry(radius, radius, height, sides);
// Coloca algo en el contorno de la torre mirando hacia fuera, a `angle` (0 = sur).
const around = (angle, radius, y) => ({ position: [Math.sin(angle) * radius, y, CENTRE_Z + Math.cos(angle) * radius], rotation: [0, angle, 0] });

// Todo lo que no se mueve, unido en una sola geometría.
function createBody() {
 const pieces = [
  // Plataforma de piedra en dos alturas y escalones hacia la puerta.
  piece(tube(3.0, 0.3, 14), { bottom: STONE.dark, top: STONE.light, jitter: 0.03, vary: 0.06, position: [0, 0.15, CENTRE_Z] }),
  piece(tube(3.35, 0.14, 14), { color: STONE.mid, jitter: 0.03, vary: 0.08, seed: 3, position: [0, 0.07, CENTRE_Z] }),
  piece(box(1.9, 0.14, 0.55), { color: STONE.light, vary: 0.05, position: [0, 0.07, CENTRE_Z + 3.45] }),
  piece(box(1.6, 0.14, 0.5), { color: STONE.light, vary: 0.05, position: [0, 0.2, CENTRE_Z + 3.0] }),
  // Torre: zócalo oscuro, muro claro que se estrecha y viga de madera arriba.
  piece(new THREE.CylinderGeometry(TOWER_RADIUS + 0.12, TOWER_RADIUS + 0.26, 0.6, 12), { bottom: STONE.dark, top: STONE.mid, jitter: 0.04, vary: 0.08, position: [0, 0.6, CENTRE_Z] }),
  piece(new THREE.CylinderGeometry(TOWER_RADIUS - 0.08, TOWER_RADIUS + 0.1, 2.2, 12), { bottom: "#d9cdb6", top: CREAM, jitter: 0.025, vary: 0.05, seed: 5, position: [0, 1.95, CENTRE_Z] }),
  piece(tube(TOWER_RADIUS + 0.12, 0.2), { color: WOOD.dark, vary: 0.08, position: [0, 2.9, CENTRE_Z] }),
  // Galería con su barandilla de latón.
  piece(tube(TOWER_RADIUS + 0.5, 0.1), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.08, position: [0, 3.02, CENTRE_Z] }),
  piece(new THREE.TorusGeometry(TOWER_RADIUS + 0.44, 0.035, 4, 14), { color: BRASS[1], rotation: [Math.PI / 2, 0, 0], position: [0, 3.5, CENTRE_Z] }),
  // Marco de la puerta, en arco.
  piece(box(1.24, 1.7, 0.2), { color: STONE.light, vary: 0.05, ...around(0, TOWER_RADIUS, 1.15) }),
  piece(tube(0.62, 0.2, 10), { color: STONE.light, vary: 0.05, position: [0, 2.0, CENTRE_Z + TOWER_RADIUS], rotation: [Math.PI / 2, 0, 0] }),
  piece(box(0.92, 1.6, 0.1), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.1, position: [0, 1.1, CENTRE_Z + TOWER_RADIUS + 0.09] }),
  piece(tube(0.46, 0.1, 10), { color: WOOD.mid, position: [0, 1.9, CENTRE_Z + TOWER_RADIUS + 0.09], rotation: [Math.PI / 2, 0, 0] }),
  piece(new THREE.OctahedronGeometry(0.05, 0), { color: BRASS[1], position: [0.28, 1.1, CENTRE_Z + TOWER_RADIUS + 0.17] }),
 ];
 // Contrafuertes y postes de la barandilla.
 for (let i = 0; i < 6; i++) {
  const angle = (i + 0.5) * (Math.PI / 3);
  pieces.push(piece(new THREE.CylinderGeometry(0.16, 0.34, 2.3, 4), { bottom: STONE.dark, top: STONE.light, vary: 0.06, seed: i, ...around(angle, TOWER_RADIUS + 0.18, 1.3) }));
 }
 for (let i = 0; i < 14; i++) pieces.push(piece(limb(0.03, 0.03, 0.46, 4), { color: BRASS[0], ...around((i / 14) * Math.PI * 2, TOWER_RADIUS + 0.44, 3.05) }));
 // Marcos de las ventanas redondas.
 for (const angle of [0.95, -0.95, 2.4, -2.4]) pieces.push(piece(tube(0.44, 0.12, 8), { color: WOOD.dark, ...around(angle, TOWER_RADIUS - 0.02, 1.95), rotation: [Math.PI / 2, 0, -angle] }));

 // Anexo: caseta de madera con tejado a un agua, chimenea y leñera.
 const shed = [-3.5, CENTRE_Z + 0.2];
 pieces.push(
  piece(box(1.9, 0.2, 1.7), { color: STONE.mid, vary: 0.06, position: [shed[0], 0.1, shed[1]] }),
  piece(box(1.7, 1.5, 1.5), { bottom: WOOD.mid, top: WOOD.light, vary: 0.1, jitter: 0.015, position: [shed[0], 0.95, shed[1]] }),
  piece(box(2.05, 0.14, 1.95), { bottom: PATINA_DARK[0], top: PATINA_DARK[1], vary: 0.08, position: [shed[0], 1.86, shed[1]], rotation: [0.24, 0, 0] }),
  piece(box(0.36, 1.1, 0.36), { bottom: STONE.dark, top: STONE.mid, vary: 0.08, position: [shed[0] - 0.5, 2.25, shed[1] - 0.35] }),
  piece(box(0.6, 1.1, 0.08), { color: WOOD.dark, position: [shed[0] + 0.3, 0.75, shed[1] + 0.78] }),
 );
 for (let i = 0; i < 5; i++) pieces.push(piece(tube(0.11, 0.7, 6), { bottom: WOOD.mid, top: WOOD.pale, vary: 0.12, seed: i, position: [shed[0] - 0.5 + (i % 3) * 0.24 + (i > 2 ? 0.12 : 0), 0.32 + (i > 2 ? 0.2 : 0), shed[1] + 1.0], rotation: [0, 0, Math.PI / 2] }));

 // Banco, a la derecha.
 const bench = [3.75, 0.7];
 pieces.push(
  piece(box(1.3, 0.08, 0.42), { bottom: WOOD.mid, top: WOOD.light, vary: 0.1, position: [bench[0], 0.46, bench[1]], rotation: [0, -0.5, 0] }),
  piece(box(1.3, 0.4, 0.07), { color: WOOD.mid, vary: 0.1, position: [bench[0] + 0.09, 0.72, bench[1] - 0.16], rotation: [0.15, -0.5, 0] }),
  ...[-0.5, 0.5].map((side) => piece(box(0.09, 0.46, 0.38), { color: WOOD.dark, position: [bench[0] + side * Math.cos(0.5), 0.23, bench[1] + side * Math.sin(0.5)], rotation: [0, -0.5, 0] })),
 );
 // Barriles y una caja junto al anexo.
 [[-2.5, 1.35, 0.42], [-2.95, 1.75, 0.36]].forEach(([x, z, r], i) => {
  pieces.push(piece(new THREE.CylinderGeometry(r * 0.85, r * 0.85, r * 2.3, 8), { bottom: WOOD.dark, top: WOOD.light, vary: 0.1, seed: i, position: [x, r * 1.15, z] }));
  pieces.push(piece(tube(r * 0.9, 0.07, 8), { color: "#5a5560", position: [x, r * 1.8, z] }), piece(tube(r * 0.9, 0.07, 8), { color: "#5a5560", position: [x, r * 0.5, z] }));
 });
 // Jardineras a los lados de la puerta, con sus matas.
 for (const side of [-1, 1]) {
  pieces.push(piece(box(0.75, 0.34, 0.42), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.1, position: [side * 1.25, 0.47, CENTRE_Z + 2.35] }));
  [-0.2, 0.05, 0.25].forEach((dx, i) => pieces.push(piece(blob(0), { bottom: "#3a8a47", top: "#86c95e", jitter: 0.15, seed: i + side, position: [side * 1.25 + dx, 0.72, CENTRE_Z + 2.35], scale: [0.2, 0.17, 0.18] })));
  [-0.15, 0.2].forEach((dx, i) => pieces.push(piece(new THREE.OctahedronGeometry(0.06, 0), { color: i ? "#ffd45a" : "#ff8fb5", position: [side * 1.25 + dx, 0.88, CENTRE_Z + 2.4] })));
 }
 // Hiedra trepando por el muro.
 for (let i = 0; i < 16; i++) {
  const angle = 1.5 + Math.sin(i * 2.3) * 0.45;
  const y = 0.5 + i * 0.15;
  pieces.push(piece(blob(0), { bottom: "#2f7d4c", top: "#6fbd57", jitter: 0.2, seed: i, ...around(angle + i * 0.012, TOWER_RADIUS + 0.12 - y * 0.03, y), scale: [0.2 + (i % 3) * 0.05, 0.16, 0.1] }));
 }
 // Reloj de sol.
 pieces.push(piece(tube(0.4, 0.5, 8), { bottom: STONE.dark, top: STONE.light, jitter: 0.03, position: [3.7, 0.25, -0.6] }), piece(new THREE.ConeGeometry(0.06, 0.4, 3), { color: BRASS[1], position: [3.7, 0.62, -0.6], rotation: [0.5, 0, 0] }));
 // Pedestal de la esfera armilar y poste del cartel.
 pieces.push(
  piece(new THREE.CylinderGeometry(0.2, 0.34, 0.9, 6), { bottom: STONE.dark, top: STONE.light, jitter: 0.03, position: [-4.4, 0.45, 1.0] }),
  piece(limb(0.06, 0.05, 1.5, 5), { color: WOOD.dark, position: [2.45, 0, 1.75] }),
  piece(box(1.0, 0.7, 0.07), { color: WOOD.dark, position: [2.45, 1.55, 1.76] }),
 );
 return merge(pieces);
}

// La cúpula: paneles alternos de cobre con pátina, nervios de latón, la ranura
// y el telescopio que asoma por ella.
function createDome() {
 const radius = TOWER_RADIUS + 0.06;
 const shell = new THREE.SphereGeometry(radius, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed();
 const pieces = [];
 // Cada gajo, de un tono.
 const points = shell.attributes.position;
 const colors = new Float32Array(points.count * 3);
 const tone = new THREE.Color();
 for (let i = 0; i < points.count; i += 3) {
  const x = (points.getX(i) + points.getX(i + 1) + points.getX(i + 2)) / 3;
  const z = (points.getZ(i) + points.getZ(i + 1) + points.getZ(i + 2)) / 3;
  const y = (points.getY(i) + points.getY(i + 1) + points.getY(i + 2)) / 3;
  const slice = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 12);
  const pair = slice % 2 ? PATINA : PATINA_DARK;
  tone.set(pair[0]).lerp(new THREE.Color(pair[1]), y / radius);
  for (let k = 0; k < 3; k++) tone.toArray(colors, (i + k) * 3);
 }
 shell.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 shell.deleteAttribute("uv");
 shell.deleteAttribute("normal");
 pieces.push(shell);
 // Nervios y aro de la base.
 for (let i = 0; i < 12; i++) pieces.push(piece(new THREE.TorusGeometry(radius + 0.015, 0.04, 3, 6, Math.PI / 2), { color: BRASS[1], rotation: [0, (i / 12) * Math.PI * 2, 0] }));
 pieces.push(piece(tube(radius + 0.1, 0.16, 12), { bottom: BRASS[0], top: BRASS[1], position: [0, 0.02, 0] }));
 // Ranura (mira al sur, +z) y remate.
 pieces.push(piece(box(0.72, 0.1, radius * 1.02), { color: "#151c2e", position: [0, radius * 0.72, radius * 0.5], rotation: [0.82, 0, 0] }));
 pieces.push(piece(new THREE.OctahedronGeometry(0.16, 0), { color: BRASS[1], position: [0, radius + 0.25, 0] }), piece(limb(0.03, 0.03, 0.3, 4), { color: BRASS[0], position: [0, radius - 0.05, 0] }));
 // Telescopio: tubo, boca, anillos y contrapeso.
 const aim = [-0.86, 0, 0]; // elevación: unos 50° sobre el horizonte, hacia el sur
 const at = (along) => [0, 0.55 + Math.cos(0.86) * along * 0 + Math.sin(Math.PI / 2 - 0.86) * along, Math.sin(0.86) * along];
 pieces.push(
  piece(new THREE.CylinderGeometry(0.3, 0.36, 2.9, 8), { bottom: BRASS[0], top: BRASS[1], vary: 0.06, position: at(1.25), rotation: [-aim[0], 0, 0] }),
  piece(tube(0.42, 0.22, 8), { color: WOOD.dark, position: at(2.75), rotation: [-aim[0], 0, 0] }),
  piece(tube(0.39, 0.1, 8), { color: BRASS[0], position: at(1.3), rotation: [-aim[0], 0, 0] }),
  piece(tube(0.4, 0.1, 8), { color: BRASS[0], position: at(0.3), rotation: [-aim[0], 0, 0] }),
  piece(limb(0.08, 0.07, 1.0, 6), { color: BRASS[1], position: [0.36, at(1.9)[1], at(1.9)[2]], rotation: [-aim[0], 0, 0] }),
 );
 return merge(pieces);
}

// Esfera armilar: tres aros que giran a distinto ritmo.
function Armillary({ position }) {
 const rings = useRef([]);
 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  rings.current.forEach((ring, i) => ring?.rotation.set(time * (0.25 + i * 0.12) + i, time * 0.2 * (i % 2 ? -1 : 1), i * 1.1));
 });
 return (
  <group position={position}>
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

// Carta estelar del cartel: puntos y líneas sobre azul noche.
function createStarChart() {
 const canvas = document.createElement("canvas");
 canvas.width = 256;
 canvas.height = 176;
 const ctx = canvas.getContext("2d");
 ctx.fillStyle = "#12224f";
 ctx.fillRect(0, 0, 256, 176);
 const stars = [[36, 120], [78, 84], [120, 104], [150, 58], [196, 74], [214, 126], [98, 40], [58, 44]];
 ctx.strokeStyle = "rgba(190,215,255,0.55)";
 ctx.lineWidth = 2;
 ctx.beginPath();
 [0, 1, 2, 3, 4, 5].forEach((index, i) => ctx[i ? "lineTo" : "moveTo"](...stars[index]));
 ctx.moveTo(...stars[1]);
 ctx.lineTo(...stars[7]);
 ctx.lineTo(...stars[6]);
 ctx.lineTo(...stars[3]);
 ctx.stroke();
 ctx.fillStyle = "#fff6d2";
 stars.forEach(([x, y], i) => {
  ctx.beginPath();
  ctx.arc(x, y, i % 3 ? 4 : 6, 0, Math.PI * 2);
  ctx.fill();
 });
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 return texture;
}

// Observatorio: mirar por el telescopio cambia entre el día y la noche.
export function Observatory() {
 const { x, z } = OBSERVATORY;
 const dome = useRef(null);
 const body = useMemo(createBody, []);
 const domeGeometry = useMemo(createDome, []);
 const chart = useMemo(createStarChart, []);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), []);
 useEffect(
  () => () => {
   body.dispose();
   domeGeometry.dispose();
   chart.dispose();
   material.dispose();
  },
  [body, domeGeometry, chart, material],
 );

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

 // De noche la cúpula gira despacio, siguiendo el cielo; de día descansa mirando al sur.
 useFrame(({ clock }, delta) => {
  const target = current.glow > 0.5 ? Math.sin(clock.elapsedTime * 0.07) * 0.9 : 0;
  dome.current.rotation.y += (target - dome.current.rotation.y) * Math.min(1, delta * 0.6);
 });

 return (
  <group position={[x, PLATEAU.height, z]} {...click}>
   <mesh geometry={body} material={material} castShadow receiveShadow />
   <group ref={dome} position={[0, DOME_Y, CENTRE_Z]}>
    <mesh geometry={domeGeometry} material={material} castShadow />
    {/* Lente del telescopio. */}
    <Glow color="#bfe9ff" emissive="#5fb7ff" day={0.25} night={1.6} light={false} position={[0, 0.55 + Math.sin(Math.PI / 2 - 0.86) * 2.87, Math.sin(0.86) * 2.87]} rotation={[0.86 - Math.PI / 2, 0, 0]}>
     <cylinderGeometry args={[0.33, 0.33, 0.04, 8]} />
    </Glow>
   </group>
   {/* Ventanas redondas: las dos de delante dan luz; las de detrás solo brillan. */}
   {[0.95, -0.95, 2.4, -2.4].map((angle) => (
    <Glow key={angle} light={Math.abs(angle) < 1} power={0.5} position={[Math.sin(angle) * (TOWER_RADIUS + 0.05), 1.95, CENTRE_Z + Math.cos(angle) * (TOWER_RADIUS + 0.05)]} rotation={[0, angle, 0]}>
     <circleGeometry args={[0.34, 8]} />
    </Glow>
   ))}
   {/* Ventanuco de la puerta y farol encima. */}
   <Glow light={false} position={[0, 1.55, CENTRE_Z + TOWER_RADIUS + 0.15]}>
    <circleGeometry args={[0.16, 6]} />
   </Glow>
   <Glow power={0.8} reach={9} forward={0.5} position={[0, 2.55, CENTRE_Z + TOWER_RADIUS + 0.28]}>
    <boxGeometry args={[0.22, 0.26, 0.22]} />
   </Glow>
   <Glow light={false} position={[-3.5 + 0.3, 1.2, CENTRE_Z + 0.2 + 0.83]}>
    <planeGeometry args={[0.3, 0.3]} />
   </Glow>
   <Armillary position={[-4.4, 1.42, 1.0]} />
   <mesh position={[2.45, 1.55, 1.8]}>
    <planeGeometry args={[0.88, 0.6]} />
    <meshBasicMaterial map={chart} toneMapped={false} />
   </mesh>
  </group>
 );
}
