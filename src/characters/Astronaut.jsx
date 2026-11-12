import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { emit, player } from "../experience/state";
import eventData from "./data/anim_events.json";
import clipData from "./data/astronauta_clips.json";
import { useRiggedModel } from "./useRiggedModel";

const URL = "/models/characters/astronauta.glb";
// El modelo mide 1,25 m; en el juego, 1,75 m.
export const ASTRONAUT_SCALE = 1.4;
const WALK_CLIP_SPEED = 0.55 * ASTRONAUT_SCALE; // m/s a los que avanza cada clip a velocidad 1
const RUN_CLIP_SPEED = 2.08 * ASTRONAUT_SCALE;
const RUN_FROM = 1.7; // m/s a partir de los cuales corre en vez de andar

const PALETTE = {
 Astro_Visor: { color: "#15131f", emissive: "#2a2456", glow: 0.5 },
 Astro_Teal: { color: "#1fb3a4", emissive: "#1fb3a4", glow: 0.35 },
 Astro_Yellow: { color: "#ffb21f", emissive: "#ffb21f", glow: 0.3 },
};

// El astronauta riggeado. No decide a dónde va (eso es Player.jsx): mira el
// estado del jugador y elige el clip. Otros sistemas le piden gestos con
// `player.act("Astro_PetWoody")`, que devuelve una promesa.
export function Astronaut() {
 const group = useRef(null);
 const idleTimer = useRef(0);
 const wasGrounded = useRef(true);
 const landing = useRef(false);
 const { scene, controller, sockets } = useRiggedModel(URL, {
  palette: PALETTE,
  aliases: clipData.aliases,
  events: eventData.events,
  onEvent: (name) => emit("anim", { who: "astro", name }),
  sockets: ["RightHand_PropSocket", "LeftHand_PropSocket", "Head_LookSocket"],
 });

 useEffect(() => {
  controller.play("Astro_Idle_Breathe", { fade: 0 });
  // Un gesto pedido desde fuera manda (y detiene al jugador) hasta que termina.
  player.act = (name, options) => {
   player.gesture = true;
   return controller.once(name, options).then(() => {
    player.gesture = false;
   });
  };
  player.sockets = sockets;
  if (import.meta.env.DEV) window.__world.astroClip = () => controller.name; // para las pruebas automáticas
  return () => {
   player.act = null;
   player.sockets = null;
   player.gesture = false;
  };
 }, [controller, sockets]);

 useFrame((_, rawDelta) => {
  const delta = Math.min(rawDelta, 0.05);
  group.current.visible = !player.hidden;
  const speed = Math.hypot(player.velocity.x, player.velocity.z);
  if (landing.current && (!controller.busy || speed > 0.6 || !player.grounded)) landing.current = false;

  if (!player.gesture && !landing.current) {
   if (!player.grounded) {
    controller.play(player.velocity.y > 0 ? "Astro_JumpLoop" : "Astro_FallLoop", { fade: 0.12 });
   } else if (!wasGrounded.current && speed < 0.6) {
    // Acaba de aterrizar casi parado: se agacha para absorber la caída.
    landing.current = true;
    controller.play("Astro_Land", { fade: 0.06, loop: false });
   } else if (speed > RUN_FROM) {
    controller.play("Astro_Run", { fade: 0.18, speed: Math.min(speed / RUN_CLIP_SPEED, 1.9) });
   } else if (speed > 0.25) {
    controller.play("Astro_Walk", { fade: 0.18, speed: Math.min(Math.max(speed / WALK_CLIP_SPEED, 0.7), 2.2) });
   } else {
    // Parado: respira y, de vez en cuando, mira alrededor.
    idleTimer.current += delta;
    const looking = idleTimer.current > 7 && idleTimer.current < 12;
    if (idleTimer.current >= 12) idleTimer.current = 0;
    controller.play(looking ? "Astro_Idle_LookAround" : "Astro_Idle_Breathe", { fade: 0.3 });
   }
   if (speed > 0.25) idleTimer.current = 0;
  }
  wasGrounded.current = player.grounded;
  controller.update(delta);
 });

 // El frente del modelo es +Z; el del jugador, -Z.
 return (
  <group ref={group}>
   <primitive object={scene} scale={ASTRONAUT_SCALE} rotation-y={Math.PI} />
  </group>
 );
}

useGLTF.preload(URL);
