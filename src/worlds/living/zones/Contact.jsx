import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CONTACT_LINKS, EMAIL, contactCard } from "../../../content/contact";
import { useInteractable } from "../../../experience/interact";
import { lambert } from "../../../experience/materials";
import { emit, player } from "../../../experience/state";
import { createCottage } from "../buildings/cottageModels";
import { Glow } from "../buildings/Glow";
import { blob, limb, merge, piece } from "../kit/geometry";
import { STONE, WOOD } from "../kit/palette";
import { CONTACT } from "../layout";
import { SignFace } from "../props/Signpost";
import { LANTERN_GLASS, LANTERN_GLASS_SIZE, createLantern } from "../props/lampModel";

// Contacto: la estación de comunicaciones del bosque. Una casa con su mástil
// de radio, una antena que gira y, delante, un aparato distinto por cada vía
// de contacto: un terminal para LinkedIn, un ordenador para GitHub y un buzón
// para el correo. Al acercarse se encienden; E (o clic) abre el enlace real.

const ROOF = "#3f8f84"; // verde suave apagado
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// Iconos dibujados aquí mismo, reconocibles pero propios.
function icon(draw, background) {
 const canvas = document.createElement("canvas");
 canvas.width = canvas.height = 256;
 const ctx = canvas.getContext("2d");
 ctx.fillStyle = background;
 ctx.fillRect(0, 0, 256, 256);
 draw(ctx);
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 return texture;
}
const ICONS = {
 LinkedIn: () =>
  icon((ctx) => {
   ctx.fillStyle = "#ffffff";
   ctx.fillRect(58, 104, 30, 98);
   ctx.beginPath();
   ctx.arc(73, 68, 19, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillRect(112, 104, 30, 98);
   ctx.beginPath();
   ctx.moveTo(142, 148);
   ctx.quadraticCurveTo(142, 124, 164, 124);
   ctx.quadraticCurveTo(176, 124, 176, 146);
   ctx.lineTo(176, 202);
   ctx.lineTo(206, 202);
   ctx.lineTo(206, 140);
   ctx.quadraticCurveTo(206, 98, 170, 98);
   ctx.quadraticCurveTo(150, 98, 142, 112);
   ctx.closePath();
   ctx.fill();
  }, "#2867b2"),
 GitHub: () =>
  icon((ctx) => {
   // Cabeza de gato con sus orejas: la silueta que todo el mundo reconoce.
   ctx.fillStyle = "#f4f1ea";
   ctx.beginPath();
   ctx.arc(128, 132, 74, 0, Math.PI * 2);
   ctx.fill();
   ctx.beginPath();
   ctx.moveTo(66, 100);
   ctx.lineTo(62, 46);
   ctx.lineTo(108, 70);
   ctx.closePath();
   ctx.fill();
   ctx.beginPath();
   ctx.moveTo(190, 100);
   ctx.lineTo(194, 46);
   ctx.lineTo(148, 70);
   ctx.closePath();
   ctx.fill();
   ctx.fillStyle = "#1c1b22";
   ctx.beginPath();
   ctx.ellipse(128, 142, 46, 38, 0, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = "#f4f1ea";
   for (const x of [108, 148]) {
    ctx.beginPath();
    ctx.ellipse(x, 140, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
   }
  }, "#1c1b22"),
 Email: () =>
  icon((ctx) => {
   ctx.fillStyle = "#fff6e6";
   ctx.fillRect(40, 72, 176, 116);
   ctx.strokeStyle = "#c2542b";
   ctx.lineWidth = 12;
   ctx.lineJoin = "round";
   ctx.beginPath();
   ctx.moveTo(44, 78);
   ctx.lineTo(128, 142);
   ctx.lineTo(212, 78);
   ctx.stroke();
  }, "#ff7a3d"),
};

// Los tres aparatos. Cada geometría deja su pantalla en `screen` (posición,
// giro y tamaño), que es lo que se enciende.
const DEVICES = {
 // Terminal: columna con pantalla inclinada y visera.
 LinkedIn: () => ({
  geometry: merge([
   piece(new THREE.CylinderGeometry(0.34, 0.42, 0.16, 8), { bottom: STONE.dark, top: STONE.light, jitter: 0.02, position: [0, 0.08, 0] }),
   piece(new THREE.CylinderGeometry(0.13, 0.19, 1.05, 6), { bottom: WOOD.dark, top: WOOD.mid, position: [0, 0.66, 0] }),
   piece(box(1.0, 0.82, 0.14), { bottom: "#3a3f4d", top: "#565c6d", position: [0, 1.5, 0.02], rotation: [-0.42, 0, 0] }),
   piece(box(1.08, 0.07, 0.3), { color: "#2a2e39", position: [0, 1.94, -0.1], rotation: [-0.42, 0, 0] }),
   ...[-0.3, 0, 0.3].map((x) => piece(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 6), { color: "#8fd0ff", position: [x, 1.1, 0.25], rotation: [1.15, 0, 0] })),
  ]),
  screen: { position: [0, 1.52, 0.095], rotation: [-0.42, 0, 0], size: [0.78, 0.6] },
 }),
 // Ordenador: mesa de tablas, monitor grueso de los de antes y teclado.
 GitHub: () => ({
  geometry: merge([
   piece(box(1.3, 0.08, 0.72), { bottom: WOOD.mid, top: WOOD.light, vary: 0.1, position: [0, 0.78, 0] }),
   ...[[-0.56, -0.28], [0.56, -0.28], [-0.56, 0.28], [0.56, 0.28]].map(([x, z]) => piece(limb(0.045, 0.04, 0.76, 4), { color: WOOD.dark, position: [x, 0, z] })),
   piece(box(0.82, 0.66, 0.5), { bottom: "#cfc6b4", top: "#ece4d2", jitter: 0.012, vary: 0.04, position: [0, 1.2, -0.08] }),
   piece(box(0.3, 0.1, 0.3), { color: "#b8ae9b", position: [0, 0.86, -0.08] }),
   piece(box(0.7, 0.05, 0.22), { bottom: "#b8ae9b", top: "#ddd4c1", position: [0, 0.85, 0.24], rotation: [0.12, 0, 0] }),
   piece(box(0.1, 0.04, 0.14), { color: "#ddd4c1", position: [0.5, 0.84, 0.24] }),
  ]),
  screen: { position: [0, 1.22, 0.18], rotation: [0, 0, 0], size: [0.62, 0.48] },
 }),
 // Buzón: poste, cuerpo abombado, bandera y un sobre luminoso en la puerta.
 Email: () => ({
  geometry: merge([
   piece(limb(0.07, 0.06, 1.05, 5), { bottom: WOOD.dark, top: WOOD.mid, position: [0, 0, 0] }),
   piece(new THREE.CylinderGeometry(0.34, 0.34, 0.9, 10, 1, false, 0, Math.PI), { bottom: "#c2542b", top: "#f08a52", vary: 0.06, position: [0, 1.28, 0], rotation: [Math.PI / 2, Math.PI / 2, 0] }),
   piece(box(0.68, 0.24, 0.9), { bottom: "#a8452a", top: "#c2542b", position: [0, 1.16, 0] }),
   piece(box(0.72, 0.05, 0.96), { color: WOOD.dark, position: [0, 1.03, 0] }),
   piece(blob(0), { bottom: "#3a8a47", top: "#86c95e", jitter: 0.16, position: [0.3, 0.14, 0.2], scale: [0.3, 0.22, 0.26] }),
  ]),
  screen: { position: [0, 1.3, 0.46], rotation: [0, 0, 0], size: [0.46, 0.4] },
  flag: [0.37, 1.3, 0.1],
 }),
};

function Device({ link, x, z, models }) {
 const device = useMemo(() => DEVICES[link.label](), [link.label]);
 const texture = useMemo(() => ICONS[link.label](), [link.label]);
 const screen = useRef(null);
 const lift = useRef(null);
 const flag = useRef(null);
 const near = useRef(0);
 useEffect(
  () => () => {
   device.geometry.dispose();
   texture.dispose();
  },
  [device, texture],
 );

 const isMail = link.href.startsWith("mailto:");
 const open = () => {
  if (isMail) {
   // El correo se abre y, además, se copia: no todo el mundo tiene cliente configurado.
   navigator.clipboard?.writeText(EMAIL).then(
    () => emit("toast", { text: `Correo copiado: ${EMAIL}`, at: { x, y: 2.9, z } }),
    () => emit("toast", { text: EMAIL, at: { x, y: 2.9, z } }),
   );
   window.location.href = link.href;
  } else {
   window.open(link.href, "_blank", "noopener,noreferrer");
   emit("toast", { text: `Abriendo ${link.label}`, at: { x, y: 2.9, z } });
  }
  emit("sound", { id: "ui-open" });
 };
 const click = useInteractable({ position: { x, z: z + 1.2 }, radius: 2.3, hint: isMail ? "Escribirme un email" : `Abrir ${link.label}`, anywhere: true, action: open });

 // Al acercarse: la pantalla se enciende y el aparato da un pequeño respingo.
 useFrame(({ clock }, delta) => {
  const close = Math.hypot(player.position.x - x, player.position.z - (z + 1.2)) < 2.3 ? 1 : 0;
  near.current += (close - near.current) * Math.min(1, delta * 5);
  const pulse = 0.5 + near.current * (0.55 + Math.sin(clock.elapsedTime * 4) * 0.08);
  screen.current.material.color.setScalar(pulse);
  lift.current.position.y = near.current * 0.05;
  if (flag.current) flag.current.rotation.z = -near.current * 1.35;
 });

 return (
  <group name={`aparato de ${link.label}`} userData={{ rests: 0 }} position={[x, 0, z]} {...click}>
   <group ref={lift}>
    <mesh geometry={device.geometry} material={models.material} castShadow />
    <mesh ref={screen} position={device.screen.position} rotation={device.screen.rotation}>
     <planeGeometry args={device.screen.size} />
     <meshBasicMaterial map={texture} toneMapped={false} fog={false} />
    </mesh>
    {device.flag && (
     <group ref={flag} position={device.flag}>
      <mesh position={[0.02, 0.2, 0]}>
       <boxGeometry args={[0.04, 0.44, 0.04]} />
       <meshLambertMaterial color="#5a5560" flatShading />
      </mesh>
      <mesh position={[0.02, 0.36, 0.1]}>
       <boxGeometry args={[0.04, 0.16, 0.24]} />
       <meshLambertMaterial color="#ffcf4a" flatShading />
      </mesh>
     </group>
    )}
   </group>
   {/* Plaquita de madera con el nombre, al pie, sobre dos patas: de pie y algo
       inclinada hacia atrás, para que se lea. (Antes iba casi tumbada, con el canto
       de abajo metido en la plataforma.) */}
   {[-0.62, 0.62].map((side) => (
    <mesh key={side} position={[side, 0.27, 0.92]} rotation-x={-0.18} castShadow>
     <boxGeometry args={[0.07, 0.56, 0.07]} />
     <meshLambertMaterial color={WOOD.dark} flatShading />
    </mesh>
   ))}
   <group position={[0, 0.62, 0.86]} rotation-x={-0.5}>
    <mesh castShadow>
     <boxGeometry args={[1.5, 0.52, 0.05]} />
     <meshLambertMaterial color={WOOD.dark} flatShading />
    </mesh>
    <SignFace text={link.label.toUpperCase()} icon="contact" width={1.44} position-z={0.03} />
   </group>
  </group>
 );
}

// Antena: base de piedra, torre de celosía y parábola que gira despacio.
const createTower = () =>
 merge([
  piece(new THREE.CylinderGeometry(0.95, 1.15, 0.5, 9), { bottom: STONE.dark, top: STONE.light, jitter: 0.04, vary: 0.1, position: [0, 0.25, 0] }),
  ...[0, 1, 2, 3].map((i) => {
   const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
   return piece(limb(0.06, 0.035, 4.2, 4), { bottom: "#4f4a55", top: "#7b7684", position: [Math.cos(angle) * 0.55, 0.45, Math.sin(angle) * 0.55], rotation: [Math.sin(angle) * -0.1, 0, Math.cos(angle) * 0.1] });
  }),
  ...[1.2, 2.2, 3.2, 4.0].map((y) => piece(new THREE.TorusGeometry(0.62 - y * 0.1, 0.028, 3, 4), { color: "#5a5560", position: [0, 0.45 + y, 0], rotation: [Math.PI / 2, 0, Math.PI / 4] })),
  piece(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 8), { color: "#5a5560", position: [0, 4.7, 0] }),
 ]);
const createDish = () =>
 merge([
  piece(new THREE.ConeGeometry(1.5, 0.62, 12, 2, true), { bottom: "#cfc8ba", top: "#f6ead6", vary: 0.05, position: [0, 0.2, 0.55], rotation: [-1.0, 0, 0] }),
  piece(new THREE.TorusGeometry(1.5, 0.04, 4, 12), { color: "#a8a39a", position: [0, 0.46, 0.39], rotation: [0.57, 0, 0] }),
  piece(limb(0.03, 0.02, 1.25, 4), { color: "#5a5560", position: [0, 0.1, 0.7], rotation: [0.57, 0, 0] }),
  piece(limb(0.07, 0.06, 0.5, 5), { color: "#5a5560", position: [0, -0.3, 0] }),
 ]);

export function Contact() {
 const station = useMemo(() => createCottage(4, ROOF), []);
 const models = useMemo(() => ({ material: lambert({ side: THREE.DoubleSide }), tower: createTower(), dish: createDish(), lamp: createLantern() }), []);
 const dish = useRef(null);
 const beacon = useRef(null);
 const deck = useMemo(
  () =>
   merge([
    piece(new THREE.CylinderGeometry(4.6, 4.75, 0.14, 12), { bottom: STONE.dark, top: STONE.light, jitter: 0.04, vary: 0.09, scale: [1, 1, 0.72], position: [0, 0.07, 0] }),
    ...Array.from({ length: 9 }, (_, i) => piece(box(0.72, 0.05, 4.2 - Math.abs(i - 4) * 0.36), { bottom: WOOD.mid, top: WOOD.light, vary: 0.12, seed: i, position: [(i - 4) * 0.78, 0.165, 0.5] })),
   ]),
  [],
 );
 useEffect(
  () => () => {
   station.geometry.dispose();
   Object.values(models).forEach((one) => one.dispose());
   deck.dispose();
  },
  [station, models, deck],
 );
 // Al pie de la antena, el cartel de Contacto: las tres vías juntas, para leerlas sin ir aparato por aparato.
 useInteractable({
  position: { x: CONTACT.antenna.x, z: CONTACT.antenna.z + 1.7 },
  radius: 2.1,
  height: 3,
  hint: "Contacto",
  action: () => emit("open", { ...contactCard(), at: { x: CONTACT.antenna.x, y: 2.4, z: CONTACT.antenna.z, distance: 0.7 } }),
 });
 useFrame(({ clock }) => {
  dish.current.rotation.y = clock.elapsedTime * 0.3;
  // Baliza: un destello corto cada par de segundos.
  beacon.current.scale.setScalar(clock.elapsedTime % 2.2 < 0.25 ? 1.5 : 0.7);
 });
 const { x, z } = CONTACT;

 return (
  <>
   <mesh name="tarima de contacto" userData={{ rests: 0 }} geometry={deck} material={models.material} position={[x, 0, z + 0.4]} receiveShadow />
   {/* La estación. */}
   <group name="estación de contacto" userData={{ rests: 0 }} position={[x, 0.1, z - 2.6]}>
    <mesh geometry={station.geometry} material={models.material} castShadow receiveShadow />
    {station.windows.map((window, i) => (
     <Glow key={i} position={window.position} night={2.1}>
      <circleGeometry args={[window.round, 10]} />
     </Glow>
    ))}
    <Glow power={0.5} forward={1.0} drop={0.4} night={2.3} position={station.lantern}>
     <boxGeometry args={[0.16, 0.24, 0.16]} />
    </Glow>
    <group ref={beacon} position={station.mast}>
     <Glow light={false} color="#ffb199" emissive="#ff5a3d" day={1.4} night={3}>
      <octahedronGeometry args={[0.07, 0]} />
     </Glow>
    </group>
   </group>
   {/* Antena grande. */}
   <group name="antena" userData={{ rests: 0 }} position={[CONTACT.antenna.x, 0, CONTACT.antenna.z]}>
    <mesh geometry={models.tower} material={models.material} castShadow />
    <group ref={dish} position-y={5.15}>
     <mesh geometry={models.dish} material={models.material} castShadow />
    </group>
   </group>
   {CONTACT_LINKS.map((link, i) => (
    <Device key={link.label} link={link} {...CONTACT.terminals[i]} models={models} />
   ))}
   {/* Farola de la zona (el cartel es uno de los de layout.js). */}
   <group name="farola de contacto" userData={{ rests: 0 }} position={[x - 4.3, 0, z + 2.6]} rotation-y={Math.PI}>
    <mesh geometry={models.lamp} material={models.material} castShadow />
    <Glow power={0.9} reach={10} forward={0.7} drop={0.9} night={2.6} position={LANTERN_GLASS}>
     <boxGeometry args={LANTERN_GLASS_SIZE} />
    </Glow>
   </group>
  </>
 );
}
