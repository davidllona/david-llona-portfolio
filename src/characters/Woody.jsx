import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { GUIDE, WELCOME, ZONE_LINES } from "../content/woody";
import { useInteractable } from "../experience/interact";
import { hasSaid, isSpeaking, say } from "../experience/speech";
import { emit, events, game, player, rig, woody } from "../experience/state";
import { world } from "../worlds";
import clipData from "./data/woody_clips.json";
import { createBrain, startGuide, startPet, stopGuide, updateBrain } from "./WoodyBrain";
import { WOODY_PALETTE, WOODY_SCALE } from "./looks";
import { useRiggedModel } from "./useRiggedModel";

const URL = "/models/characters/woody.glb";
// El modelo mide 0,82 m hasta la cabeza; en el juego, algo más de 1 m.
const SCALE = WOODY_SCALE;
// A qué velocidad avanza cada paso tal como está animado. El clip se reproduce
// a (velocidad real / esta): así las patas no patinan.
const CLIP_SPEED = { walk: 0.56 * SCALE, trot: 1.42 * SCALE, run: 3.5 * SCALE };
const GAIT_CLIP = { walk: "Woody_Walk", trot: "Woody_Trot", run: "Woody_Run" };
// Límites entre pasos (m/s), con holgura para no ir cambiando en la frontera.
// El paso de andar del astronauta (3,6 m/s) cae en el trote: «Walk» solo avanza
// 0,7 m/s y a esa velocidad patinaría. Cuando él corre, Woody corre.
const TROT_FROM = 1.25, RUN_FROM = 4.5, HOLD = 0.35;

// Lo que hace de pie y quieto antes de sentarse: algo corto de perro.
const IDLE_GESTURES = ["Woody_SniffGround", "Woody_HeadTiltLeft", "Woody_HeadTiltRight", "Woody_TailWag_Slow", "Woody_SniffObject"];

const UP = new THREE.Vector3(0, 1, 0);
const point = new THREE.Vector3();
const parentTurn = new THREE.Quaternion();
const turnBy = new THREE.Quaternion();

// Woody: te sigue a tu paso, descansa cuando te paras, te habla, te guía si se
// lo pides y se deja acariciar. Su comportamiento está en WoodyBrain.js; aquí
// se elige el clip, se le pega al terreno y se decide qué dice.
export function Woody({ active }) {
 const group = useRef(null);
 const brain = useMemo(createBrain, []);
 const idle = useRef({ timer: 0, next: 1 });
 const state = useRef({ gait: "walk", attend: 0, zoneTimer: 0 });
 const { scene, controller } = useRiggedModel(URL, {
  palette: WOODY_PALETTE,
  aliases: clipData.aliases,
  onEvent: (name) => emit("anim", { who: "woody", name }),
 });
 const bones = useMemo(() => ({ neck: scene.getObjectByName("neck"), head: scene.getObjectByName("head") }), [scene]);

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
  if (import.meta.env.DEV) Object.assign(window.__world, { woodyBrain: brain, woodyClip: () => controller.name, woodyRate: () => controller.current?.action.timeScale ?? 0 }); // para las pruebas automáticas
  return () => events.removeEventListener("world", place);
 }, [brain, controller]);

 // Al aterrizar por primera vez, da la bienvenida y explica cómo va esto.
 useEffect(() => {
  const onArrived = () => {
   if (say(WELCOME, { once: "bienvenida", tip: true })) controller.play("Woody_Greet", { loop: false, fade: 0.2, hold: false });
  };
  events.addEventListener("arrived", onArrived);
  return () => events.removeEventListener("arrived", onArrived);
 }, [controller]);

 // Celebra los goles.
 useEffect(() => {
  const onCheer = () => {
   brain.posture = "stand";
   controller.play("Woody_CelebrateGoal", { loop: false, fade: 0.15, hold: false });
   emit("sound", { id: "bark", x: woody.position.x, z: woody.position.z });
  };
  events.addEventListener("woody-cheer", onCheer);
  return () => events.removeEventListener("woody-cheer", onCheer);
 }, [brain, controller]);

 // Peticiones de guía: desde su menú o desde el menú superior.
 useEffect(() => {
  const onGuide = (event) => {
   const to = event.detail?.to;
   if (!to) {
    const wasGuiding = brain.mode === "guide";
    stopGuide(brain);
    woody.guideTo = null;
    if (wasGuiding) say(GUIDE.stop, { now: true });
    emit("woody");
    return;
   }
   if (startGuide(brain, world, woody, to)) {
    woody.guideTo = to;
    brain.posture = "stand";
    controller.play("Woody_BarkSoft", { loop: false, fade: 0.1 });
    say(GUIDE.start, { now: true });
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
  height: 1.3, // justo encima de Woody
  priority: -1, // cualquier otra cosa cercana tiene preferencia
  hint: "Acariciar a Woody",
  // Mientras habla, la E pasa su bocadillo en vez de acariciarlo.
  enabled: () => !player.hidden && brain.mode !== "pet" && !player.gesture && !isSpeaking(),
  action: pet,
 });

 useFrame(({ camera }, rawDelta) => {
  const delta = Math.min(rawDelta, 0.05);
  const memo = state.current;
  const speaking = isSpeaking();
  // Los gestos de espera (olfatear, ladear la cabeza…) se cortan si hay que moverse.
  const idling = IDLE_GESTURES.includes(controller.name);
  const busy = controller.busy && !idling;
  // ¿Se ve en pantalla ese punto del suelo? (Para no reaparecer a la vista.)
  const visible = (x, z) => {
   point.set(x, world.height(x, z) + 0.5, z).project(camera);
   return point.z < 1 && Math.abs(point.x) < 1.08 && Math.abs(point.y) < 1.08;
  };
  const out = updateBrain(brain, active ? delta : 0, { world, player, woody, busy, attend: speaking, visible });
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
   say(GUIDE.arrive[out.arrived.id] ?? "Ya estamos.", { now: true });
   emit("woody");
  }
  if (out.waited) say(GUIDE.waiting); // si aún está diciendo otra cosa, lo dice después

  // Una frase la primera vez que se entra en cada zona.
  memo.zoneTimer -= delta;
  if (memo.zoneTimer <= 0 && active && rig.intro === 0 && !player.hidden && !game.minigame && !speaking && brain.mode !== "guide") {
   memo.zoneTimer = 0.3;
   const { x, z } = player.position;
   const zone = world.zones?.find((one) => Math.hypot(x - one.x, z - one.z) < one.r && ZONE_LINES[one.id] && !hasSaid(`zona:${one.id}`));
   if (zone) say(ZONE_LINES[zone.id], { once: `zona:${zone.id}`, tip: true });
  }

  if (!controller.busy || (idling && (brain.moving || brain.wantsUp))) {
   // El paso lo decide la velocidad neta (suavizada), no la de un fotograma.
   const speed = Math.min(brain.speed, brain.pace.speed * 1.15);
   if (brain.wantsUp) {
    // Se levanta antes de echar a andar.
    const from = brain.posture;
    brain.posture = "stand";
    brain.rest = 0;
    controller.play(from === "lie" ? "Woody_WakeUp" : "Woody_StandUp", { loop: false, fade: 0.2, speed: from === "lie" ? 1.9 : 1.5 });
   } else if (brain.posture === "sit") {
    if (brain.wantsLie && (!world.woodyStaysUp || woody.post?.lie)) {
     brain.posture = "lie";
     controller.play("Woody_LieDown", { loop: false, fade: 0.25 });
    } else controller.play("Woody_SitIdle", { fade: 0.25 });
   } else if (brain.posture === "lie") {
    controller.play("Woody_Sleep", { fade: 0.4 });
   } else if (speed > 0.3) {
    idle.current.timer = 0;
    idle.current.next = 0.8 + Math.random() * 0.5;
    // Corre si corre el astronauta (o si se ha quedado atrás); trota a su
    // paso; anda en los acercamientos cortos.
    const hold = (limit, above) => limit + (above ? -HOLD : HOLD);
    const gait = speed > hold(RUN_FROM, memo.gait === "run") ? "run" : speed > hold(TROT_FROM, memo.gait !== "walk") ? "trot" : "walk";
    memo.gait = gait;
    controller.play(GAIT_CLIP[gait], { fade: 0.18, speed: Math.min(Math.max(speed / CLIP_SPEED[gait], 0.55), 2.6) });
   } else if (brain.mode === "guide" && brain.waiting) {
    controller.play("Woody_GuideWait", { fade: 0.25 });
   } else if (brain.wantsSit) {
    brain.posture = "sit";
    controller.play("Woody_SitDown", { loop: false, fade: 0.2 });
   } else {
    // De pie y quieto: respira y, antes de sentarse, olfatea o mira alrededor.
    const pause = idle.current;
    pause.timer += delta;
    if (pause.timer > pause.next && !speaking) {
     pause.timer = 0;
     pause.next = 4 + Math.random() * 4;
     controller.play(IDLE_GESTURES[Math.floor(Math.random() * IDLE_GESTURES.length)], { loop: false, fade: 0.25, hold: false });
    } else controller.play("Woody_Idle_Breathe", { fade: 0.3 });
   }
  }
  controller.update(delta);

  // Pegado al terreno: posición, rumbo y cabeceo según la pendiente.
  group.current.position.copy(woody.position);
  let turn = woody.facing - group.current.rotation.y;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  group.current.rotation.y += turn * Math.min(1, delta * 10);
  group.current.rotation.x = brain.posture === "stand" ? brain.pitch : brain.pitch * 0.5;

  // Cuando habla, mira al astronauta: gira el cuello y la cabeza hacia él.
  // (En el fútbol sigue el balón con la cabeza.)
  const watched = woody.post?.look ?? player.position;
  memo.attend += (((speaking || woody.post) && !brain.moving ? 1 : 0) - memo.attend) * Math.min(1, delta * 5);
  if (memo.attend > 0.02 && bones.neck && bones.head) {
   const toward = Math.atan2(-(watched.x - woody.position.x), -(watched.z - woody.position.z));
   let aside = toward - group.current.rotation.y;
   aside = Math.max(-1.1, Math.min(1.1, Math.atan2(Math.sin(aside), Math.cos(aside)))) * memo.attend * 0.5;
   if (import.meta.env.DEV) window.__world.woodyLook = aside; // para las pruebas automáticas
   for (const bone of [bones.neck, bones.head]) {
    // Giro alrededor de la vertical del mundo, expresado en el hueso.
    bone.parent.getWorldQuaternion(parentTurn);
    turnBy.setFromAxisAngle(UP, aside);
    bone.quaternion.premultiply(parentTurn.clone().invert().multiply(turnBy).multiply(parentTurn));
   }
  }
 });

 // Lo que lleva puesto en este mundo (en The Twisted Moon, un farolillo al cuello).
 const Wears = world.woodyWears;
 return (
  <>
   <group ref={group} rotation-order="YXZ" {...click}>
    {/* El frente del modelo es +Z; el del juego, -Z. */}
    <primitive object={scene} scale={SCALE} rotation-y={Math.PI} />
    {/* Zona de clic algo mayor que el perro. */}
    <mesh position-y={0.6}>
     <cylinderGeometry args={[0.75, 0.75, 1.3, 8]} />
     <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
   </group>
   {Wears && <Wears neck={bones.neck} />}
  </>
 );
}

useGLTF.preload(URL);
