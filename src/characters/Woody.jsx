import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useInteractable } from "../experience/interact";
import { emit, events, player, woody } from "../experience/state";
import { world } from "../worlds";
import clipData from "./data/woody_clips.json";
import { createBrain, startGuide, startPet, stopGuide, updateBrain } from "./WoodyBrain";
import { useRiggedModel } from "./useRiggedModel";

const URL = "/models/characters/woody.glb";
// El modelo mide 0,82 m hasta la cabeza; en el juego, algo más de 1 m.
const SCALE = 1.25;
const CLIP_SPEED = { walk: 0.56 * SCALE, trot: 1.42 * SCALE, run: 3.5 * SCALE };

// En el modelo el pelo es negro puro: aquí se aclara un punto para que las
// facetas se lean con la luz del juego. La mancha del pecho es blanca.
const PALETTE = {
 Woody_Fur: { color: "#3a3943" },
 Woody_FurSoft: { color: "#4b4a56" },
 Woody_Chest: { color: "#f2efe6" },
 Woody_Nose: { color: "#0d0d10" },
 Woody_Eye: { color: "#6b4a26", emissive: "#6b4a26", glow: 0.5 },
};

// Woody: te sigue, descansa cuando te paras, te guía si se lo pides y se deja
// acariciar. Su comportamiento está en WoodyBrain.js; aquí se elige el clip.
export function Woody({ active }) {
 const group = useRef(null);
 const brain = useMemo(createBrain, []);
 const idle = useRef({ timer: 0, next: 6 });
 const { scene, controller } = useRiggedModel(URL, {
  palette: PALETTE,
  aliases: clipData.aliases,
  onEvent: (name) => emit("anim", { who: "woody", name }),
 });

 // Colocarlo junto al jugador al entrar en un mundo.
 useEffect(() => {
  const place = () => {
   woody.position.set(player.position.x + 1.6, 0, player.position.z + 0.6);
   woody.position.y = world.height(woody.position.x, woody.position.z);
   Object.assign(brain, createBrain());
  };
  place();
  controller.play("Woody_Idle_Breathe", { fade: 0 });
  events.addEventListener("world", place);
  if (import.meta.env.DEV) Object.assign(window.__world, { woodyBrain: brain, woodyClip: () => controller.name }); // para las pruebas automáticas
  return () => events.removeEventListener("world", place);
 }, [brain, controller]);

 // Peticiones desde el menú de Woody.
 useEffect(() => {
  const onGuide = (event) => {
   const to = event.detail?.to;
   if (!to) {
    stopGuide(brain);
    woody.guideTo = null;
    emit("woody");
    return;
   }
   if (startGuide(brain, world, woody, to)) {
    woody.guideTo = to;
    brain.posture = "stand";
    controller.play("Woody_BarkSoft", { loop: false, fade: 0.1 });
    emit("toast", { text: "Woody: ¡sígueme!" });
    emit("woody");
   }
  };
  events.addEventListener("guide", onGuide);
  return () => events.removeEventListener("guide", onGuide);
 }, [brain, controller]);

 const pet = () => {
  if (player.gesture || brain.mode === "pet") return;
  // Woody se coloca delante del astronauta, que se gira hacia él.
  const dx = woody.position.x - player.position.x;
  const dz = woody.position.z - player.position.z;
  const length = Math.hypot(dx, dz) || 1;
  player.facing = Math.atan2(-dx, -dz);
  startPet(brain, { x: player.position.x + (dx / length) * 0.95, z: player.position.z + (dz / length) * 0.95 });
  brain.posture = "stand";
  player.gesture = true; // el astronauta espera quieto a que llegue
 };

 const click = useInteractable({
  position: () => woody.position,
  radius: 2.1,
  priority: -1, // cualquier otra cosa cercana tiene preferencia
  hint: "Acariciar a Woody",
  enabled: () => !player.hidden && brain.mode !== "pet" && !player.gesture,
  action: pet,
 });

 useFrame((_, rawDelta) => {
  const delta = Math.min(rawDelta, 0.05);
  const busy = controller.busy;
  const out = updateBrain(brain, active ? delta : 0, { world, player, woody, busy });
  group.current.visible = !brain.hidden;

  if (out.petReady) {
   woody.facing = Math.atan2(-(player.position.x - woody.position.x), -(player.position.z - woody.position.z));
   controller.play("Woody_PetReact", { loop: false, fade: 0.15 });
   player.act?.("Astro_PetWoody", { fade: 0.15 });
   emit("pet");
  }
  if (out.arrived) {
   woody.guideTo = null;
   controller.play("Woody_AlertSecret", { loop: false, fade: 0.2, hold: false });
   emit("toast", { text: `Woody: ${out.arrived.arrive}` });
   emit("woody");
  }

  if (!controller.busy) {
   const speed = brain.speed;
   if (brain.wantsUp) {
    // Se levanta antes de echar a andar.
    const from = brain.posture;
    brain.posture = "stand";
    brain.rest = 0;
    controller.play(from === "lie" ? "Woody_WakeUp" : "Woody_StandUp", { loop: false, fade: 0.15, speed: 1.5 });
   } else if (brain.posture === "sit") {
    if (brain.wantsLie) {
     brain.posture = "lie";
     controller.play("Woody_LieDown", { loop: false, fade: 0.25 });
    } else controller.play("Woody_SitIdle", { fade: 0.25 });
   } else if (brain.posture === "lie") {
    controller.play("Woody_Sleep", { fade: 0.4 });
   } else if (speed > 0.3) {
    idle.current.timer = 0;
    if (speed > 4.2) controller.play("Woody_Run", { fade: 0.15, speed: Math.min(Math.max(speed / CLIP_SPEED.run, 0.8), 1.9) });
    else if (speed > 1.25) controller.play("Woody_Trot", { fade: 0.15, speed: Math.min(Math.max(speed / CLIP_SPEED.trot, 0.7), 2.2) });
    else controller.play("Woody_Walk", { fade: 0.15, speed: Math.min(Math.max(speed / CLIP_SPEED.walk, 0.7), 2) });
   } else if (brain.mode === "guide" && brain.waiting) {
    controller.play("Woody_GuideWait", { fade: 0.25 });
   } else if (brain.wantsSit) {
    brain.posture = "sit";
    controller.play("Woody_SitDown", { loop: false, fade: 0.2 });
   } else {
    // De pie y quieto: respira, y cada pocos segundos hace algo de perro.
    const state = idle.current;
    state.timer += delta;
    if (state.timer > state.next) {
     state.timer = 0;
     state.next = 5 + Math.random() * 5;
     const gestures = ["Woody_Idle_LookAround", "Woody_HeadTiltLeft", "Woody_HeadTiltRight", "Woody_SniffGround", "Woody_TailWag_Slow"];
     controller.play(gestures[Math.floor(Math.random() * gestures.length)], { loop: false, fade: 0.25, hold: false });
    } else controller.play("Woody_Idle_Breathe", { fade: 0.3 });
   }
  }
  controller.update(delta);

  group.current.position.copy(woody.position);
  let turn = woody.facing - group.current.rotation.y;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  group.current.rotation.y += turn * Math.min(1, delta * 10);
 });

 return (
  <group ref={group} {...click}>
   {/* El frente del modelo es +Z; el del juego, -Z. */}
   <primitive object={scene} scale={SCALE} rotation-y={Math.PI} />
   {/* Zona de clic algo mayor que el perro. */}
   <mesh position-y={0.6}>
    <cylinderGeometry args={[0.75, 0.75, 1.3, 8]} />
    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
   </mesh>
  </group>
 );
}

useGLTF.preload(URL);
