import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { emit, player, woody } from "../experience/state";
import { reach } from "./bones";
import eventData from "./data/anim_events.json";
import clipData from "./data/astronauta_clips.json";
import { GAITS, createGaitClip, gaitEvents } from "./gait";
import { JUMP_SHOT, createJumpShotClip } from "./jumpShot";
import { ASTRONAUT_PALETTE, ASTRONAUT_SCALE } from "./looks";
import { useRiggedModel } from "./useRiggedModel";

const URL = "/models/characters/astronauta.glb";
const WALK_CLIP_SPEED = 0.55 * ASTRONAUT_SCALE; // m/s a los que avanza cada clip a velocidad 1
// El trote y la carrera se generan (gait.js): sus pies no patinan a ninguna velocidad.
const JOG_CLIP_SPEED = GAITS.jog.speed * ASTRONAUT_SCALE;
const RUN_CLIP_SPEED = GAITS.run.speed * ASTRONAUT_SCALE;
const JOG_FROM = 1.7; // m/s a partir de los cuales trota en vez de andar
const RUN_FROM = 4.9; // y a partir de los cuales corre
const GAIT_CLIPS = [createGaitClip(GAITS.jog), createGaitClip(GAITS.run), createJumpShotClip()];
// La caricia (objetivo 27, A3): el clip baja la mano derecha a una altura fija
// (unos 0,37 m del suelo, 0,4 m por delante) y se metía en Woody o por debajo.
// Encima del clip, la mano va a donde de verdad está su cabeza o su lomo
// (`woody.petAt`, según su pose) con cinemática inversa de dos huesos; de la
// animación se conserva el ir y volver y las palmaditas.
const PET = { clip: "Astro_PetWoody", reach: [0.05, 0.2], leave: [0.8, 0.95], restY: 0.385, palm: 0.04 };
const smooth = (from, to, x) => {
 const k = Math.min(1, Math.max(0, (x - from) / (to - from)));
 return k * k * (3 - 2 * k);
};
const petTarget = new THREE.Vector3(), wrist = new THREE.Vector3(), fingers = new THREE.Vector3(), start = new THREE.Vector3();
const GAIT_EVENTS = [...eventData.events.filter((event) => event.clip !== GAITS.run.name), ...gaitEvents(GAITS.jog), ...gaitEvents(GAITS.run)];


// El astronauta riggeado. No decide a dónde va (eso es Player.jsx): mira el
// estado del jugador y elige el clip. Otros sistemas le piden gestos con
// `player.act("Astro_PetWoody")`, que devuelve una promesa.
export function Astronaut() {
 const group = useRef(null);
 const idleTimer = useRef(0);
 const wasGrounded = useRef(true);
 const landing = useRef(false);
 const { scene, controller, sockets } = useRiggedModel(URL, {
  palette: ASTRONAUT_PALETTE,
  aliases: clipData.aliases,
  events: GAIT_EVENTS,
  clips: GAIT_CLIPS,
  onEvent: (name) => {
   emit("anim", { who: "astro", name });
   if (import.meta.env.DEV) window.__world.onAstroEvent?.(name); // para las pruebas automáticas
  },
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
  if (import.meta.env.DEV) {
   // Para las pruebas automáticas: el clip en curso y dónde están pies, manos, cadera y cabeza.
   window.__world.astroClip = () => controller.name;
   const at = new THREE.Vector3();
   const where = (name) => at.setFromMatrixPosition(scene.getObjectByName(name).matrixWorld).toArray();
   window.__world.astroFeet = () => ({ clip: controller.name, phase: controller.phase, L: where("Toe_L"), R: where("Toe_R"), handL: where("Hand_L"), handR: where("Hand_R"), hips: where("Hips"), head: where("Head") });
  }
  return () => {
   player.act = null;
   player.sockets = null;
   player.gesture = false;
  };
 }, [controller, sockets, scene]);

 useFrame((_, rawDelta) => {
  const delta = Math.min(rawDelta, 0.05);
  group.current.visible = !player.hidden;
  // (Pruebas: congela la carrera en un punto de su ciclo, para fotografiarla.)
  const frozenAt = import.meta.env.DEV ? window.__world.runFreeze : null;
  if (typeof frozenAt === "number") {
   // (El clip no avanza —velocidad 0— pero el reloj del mezclador sí: así el fundido desde el clip anterior termina.)
   controller.play(GAITS.run.name, { fade: 0.05, speed: 0 });
   controller.current.action.time = frozenAt * GAITS.run.duration;
   controller.update(delta);
   return;
  }
  // (Pruebas: cualquier clip, parado en un punto —0 a 1— de su duración. Ver tests/e2e/clips.mjs.)
  const pose = import.meta.env.DEV ? window.__world.clipFreeze : null;
  if (pose) {
   controller.play(pose.name, { fade: 0.05, speed: 0, loop: true });
   controller.current.action.time = pose.at * controller.current.action.getClip().duration;
   controller.update(delta);
   return;
  }
  // Tiro en suspensión: la pista dice en qué punto del gesto va (ver jumpShot.js).
  if (player.shot !== null && !player.gesture) {
   controller.play(JUMP_SHOT.name, { fade: 0.1, speed: 0 });
   controller.current.action.time = player.shot * JUMP_SHOT.duration;
   wasGrounded.current = player.grounded;
   controller.update(delta);
   return;
  }
  const speed = Math.hypot(player.velocity.x, player.velocity.z);
  if (landing.current && (!controller.busy || speed > 0.6 || !player.grounded)) landing.current = false;

  if (!player.gesture && !landing.current) {
   if (!player.grounded) {
    controller.play(player.velocity.y > 0 ? "Astro_JumpLoop" : "Astro_FallLoop", { fade: 0.12 });
   } else if (!wasGrounded.current && speed < 0.6) {
    // Acaba de aterrizar casi parado: se agacha para absorber la caída.
    landing.current = true;
    controller.play("Astro_Land", { fade: 0.06, loop: false });
   } else if (speed > JOG_FROM) {
    // Trote o carrera, al compás de lo que se avanza. Al pasar de uno a otro se conserva el pie.
    const run = speed > RUN_FROM;
    const moving = controller.name === GAITS.jog.name || controller.name === GAITS.run.name;
    controller.play(run ? GAITS.run.name : GAITS.jog.name, { fade: 0.16, speed: speed / (run ? RUN_CLIP_SPEED : JOG_CLIP_SPEED), phase: moving ? controller.phase : 0 });
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
  if (controller.name === PET.clip && woody.petAt) petHand();
 });

 // La mano de la caricia, sobre Woody.
 const arm = useRef(null);
 function petHand() {
  arm.current ??= Object.fromEntries(["UpperArm_R", "Forearm_R", "Hand_R", "Fingers_R"].map((name) => [name, scene.getObjectByName(name)]));
  const { UpperArm_R: upper, Forearm_R: lower, Hand_R: hand, Fingers_R: palm } = arm.current;
  const action = controller.current.action;
  const t = action.time / action.getClip().duration;
  const weight = smooth(...PET.reach, t) * (1 - smooth(...PET.leave, t));
  if (weight <= 0) return;
  palm.getWorldPosition(start);
  // Las palmaditas del clip: lo que sube la mano respecto a su altura media.
  hand.getWorldPosition(wrist);
  const pat = Math.max(0, Math.min(0.05, wrist.y - player.position.y - PET.restY));
  // La palma (no la muñeca) se lleva justo encima: la cadena es brazo → antebrazo → palma.
  petTarget.set(0, PET.palm + pat, 0).add(woody.petAt());
  reach(upper, lower, palm, start.lerp(petTarget, weight));
  if (import.meta.env.DEV) window.__world.petHand = { weight, target: petTarget.toArray(), palm: palm.getWorldPosition(fingers).toArray() };
 }

 // El frente del modelo es +Z; el del jugador, -Z.
 return (
  <group ref={group}>
   <primitive object={scene} scale={ASTRONAUT_SCALE} rotation-y={Math.PI} />
  </group>
 );
}

useGLTF.preload(URL);
