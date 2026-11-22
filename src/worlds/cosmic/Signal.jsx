import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { uniform } from "three/tsl";
import { terminalCard } from "../../content/contact";
import { CONTACT_ICONS } from "../../experience/contactIcons";
import { useInteractable } from "../../experience/interact";
import { emit, ui } from "../../experience/state";
import { ANTENNA, TERMINALS, ground } from "./layout";
import { powered } from "./materials";
import { ENERGY, TERMINAL_SCREEN, createTerminal } from "./models";

// El contacto en The Cosmic Lab (objetivo 27, bloque C): la antena del
// laboratorio («Envía una señal», su E está en LabScene.jsx) y, delante de
// ella, tres terminales redondos —turquesa, magenta y lima— para LinkedIn,
// GitHub y el correo. Cada uno abre su carta de máquina, con su botón.
//
// Funciona SIEMPRE, con o sin las máquinas encendidas: el contacto nunca queda
// bloqueado. Encender todas las que hay montadas solo añade la animación: la
// antena se enciende, manda un haz al cielo y anillos de señal, y una onda de
// luz recorre el planeta desde ella (`level()`: de 0, apagada, a 1).

const RISE = 2.6; // s que tarda un anillo de señal en subir y apagarse
const WAVE = 4.5; // s que tarda la onda en cruzar el planeta

function Terminal({ spot, geometry, material }) {
 const y = ground(spot.x, spot.z);
 const texture = useMemo(() => CONTACT_ICONS[spot.id](), [spot.id]);
 useEffect(() => () => texture.dispose(), [texture]);
 useInteractable({
  position: spot.use,
  radius: 1.5,
  height: 2.0,
  hint: spot.id === "Email" ? "Escribirme un email" : `Abrir ${spot.id}`,
  enabled: () => !ui.open,
  action: () => {
   emit("sound", { id: "ui-open" });
   emit("open", { ...terminalCard(spot.id), at: { x: spot.x, y: y + TERMINAL_SCREEN.y, z: spot.z, distance: 0.6 } });
  },
 });
 return (
  <group name={`terminal de ${spot.id}`} position={[spot.x, y - 0.04, spot.z]} rotation-y={spot.turn}>
   <mesh geometry={geometry} material={material} castShadow receiveShadow />
   <mesh position={[0, TERMINAL_SCREEN.y, TERMINAL_SCREEN.z + 0.012]}>
    <circleGeometry args={[TERMINAL_SCREEN.r, 24]} />
    <meshBasicMaterial map={texture} toneMapped={false} />
   </mesh>
  </group>
 );
}

export function Signal({ level, top }) {
 const models = useMemo(() => Object.fromEntries(TERMINALS.map((spot) => [spot.id, createTerminal(spot.color)])), []);
 // (Encendidos siempre: el contacto funciona desde el primer momento.)
 const material = useMemo(() => powered(uniform(1), { gain: 2 }), []);
 const glow = useMemo(
  () => ({
   rings: [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: ENERGY, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })),
   beam: new THREE.MeshBasicMaterial({ color: ENERGY, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }),
   wave: new THREE.MeshBasicMaterial({ color: "#9ffbe9", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }),
  }),
  [],
 );
 const shapes = useMemo(() => ({ ring: new THREE.TorusGeometry(1, 0.05, 6, 32).rotateX(Math.PI / 2), beam: new THREE.CylinderGeometry(0.16, 0.42, 60, 10, 1, true).translate(0, 30, 0), wave: new THREE.RingGeometry(0.93, 1, 72).rotateX(-Math.PI / 2) }), []);
 useEffect(
  () => () => {
   Object.values(models).forEach((one) => one.dispose());
   material.dispose();
   [...glow.rings, glow.beam, glow.wave].forEach((one) => one.dispose());
   Object.values(shapes).forEach((one) => one.dispose());
  },
  [models, material, glow, shapes],
 );
 const rings = useRef([]);
 const beam = useRef(null);
 const wave = useRef(null);
 const memo = useRef({ was: 0, wave: -1 });
 useFrame(({ clock }, rawDelta) => {
  const delta = Math.min(rawDelta, 0.05);
  const on = level();
  const state = memo.current;
  // La onda sale una vez, al activarse la antena.
  if (on > 0.5 && state.was <= 0.5) state.wave = 0;
  state.was = on;
  if (state.wave >= 0) {
   state.wave += delta / WAVE;
   const k = Math.min(1, state.wave);
   wave.current.visible = k < 1;
   wave.current.scale.setScalar(1 + k * 70);
   glow.wave.opacity = 0.75 * (1 - k);
   if (k >= 1) state.wave = -1;
  } else wave.current.visible = false;
  // Anillos de señal que suben desde el plato, uno tras otro; y el haz al cielo.
  rings.current.forEach((mesh, i) => {
   if (!mesh) return;
   const phase = ((clock.elapsedTime + (i * RISE) / 3) % RISE) / RISE;
   mesh.visible = on > 0.01;
   mesh.position.y = top[1] + phase * 6;
   mesh.scale.setScalar(0.6 + phase * 2.6);
   mesh.material.opacity = on * 0.85 * (1 - phase);
  });
  beam.current.visible = on > 0.01;
  glow.beam.opacity = on * (0.32 + 0.08 * Math.sin(clock.elapsedTime * 3));
  if (import.meta.env.DEV) window.__world.signal = { level: on, rings: rings.current.filter((one) => one?.visible).length, beam: beam.current.visible, wave: state.wave }; // para las pruebas automáticas
 });
 return (
  <>
   {TERMINALS.map((spot) => (
    <Terminal key={spot.id} spot={spot} geometry={models[spot.id]} material={material} />
   ))}
   {[0, 1, 2].map((i) => (
    <mesh key={i} ref={(node) => (rings.current[i] = node)} name="anillo de señal" geometry={shapes.ring} material={glow.rings[i]} position={[top[0], top[1], top[2]]} visible={false} renderOrder={6} frustumCulled={false} />
   ))}
   <mesh ref={beam} name="haz de la antena" geometry={shapes.beam} material={glow.beam} position={top} visible={false} renderOrder={6} frustumCulled={false} />
   <mesh ref={wave} name="onda de luz" geometry={shapes.wave} material={glow.wave} position={[ANTENNA.x, 0.3, ANTENNA.z]} visible={false} renderOrder={6} frustumCulled={false} />
  </>
 );
}
