import { useEffect, useMemo, useRef } from "react";
import { Staged } from "../Staged";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { positionLocal, sin, smoothstep, uniform, vec3 } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { Instances } from "../../experience/Instances";
import { useInteractable } from "../../experience/interact";
import { addWarmSource } from "../../experience/lightSources";
import { lambert } from "../../experience/materials";
import { emit, events, game, input, player, ui } from "../../experience/state";
import { createBasketballTexture, createGlowTexture } from "../../experience/textures";
import { registerGlow, uniforms } from "../../experience/theme";
import { PLAYER_RADIUS } from "../collision";
import { JUMP_SHOT } from "../../characters/jumpShot";
import { MONEY_COLOR, BALL_GRAVITY, BALL_RADIUS, BOARD, DEFENDER, DIP_TIME, GRAB_DISTANCE, GUARD_ASIDE, GUARD_X, HOME, IDLE_BEFORE_RETURN, MARK_ASIDE, MARK_BLOCK, MARK_GAP, MARK_HOME, MARK_LAG, MARK_SPEED, MAX_DISTANCE, PERFECT, PILLARS, RIM, RIM_RADIUS, SHOOT_RANGE, STAND_TOP, ballStand, center, court, fence, guard, marker, markerReacts, onCourt, play, rim, stepBall } from "./courtPhysics";
import { BASKET, COURT, COURT_FENCE, WATER_LEVEL, blockerCollider, markerCollider, height as terrainHeight } from "./layout";
import { fontReady } from "../../ui/fonts";
import { shotChance, shotWindow, triples } from "../../game/triples";
import { Triples } from "./Triples";
import { merge, piece } from "./kit/geometry";
import { Halos } from "./props/Halos";

// Pista de baloncesto. Se coge el balón, se acerca uno a la canasta y se tira
// en suspensión: al mantener pulsado el astronauta salta, y el balón sale al
// soltar. En lo más alto del salto, el tiro es perfecto; antes se queda corto y
// después se pasa. Hay dos defensas: uno delante del aro, que salta a taponar, y
// otro que marca al jugador. Una valla metálica rodea la pista: el balón rebota
// en ella y no se sale nunca.

// ── Balón ───────────────────────────────────────────────────────────────────
// Tiene tres estados claros, y solo uno a la vez:
//  · "stand": quieto en su soporte;
//  · "held": en las manos del astronauta (y, si está tirando, `shot`);
//  · "free": suelto, con física.
// El tiro (`shot`) pasa por: "dip" (se agacha), "jump" (pide el salto), "air"
// (sube con el balón: aquí se suelta), "released" (acompaña el tiro mientras
// cae) y "landing".
function Ball() {
 const mesh = useRef(null);
 const shadow = useRef(null);
 const meter = useRef(null);
 const fill = useRef(null);
 const texture = useMemo(() => createBasketballTexture(), []);
 // El último balón de cada carro del concurso de triples, de otro color.
 const skins = useMemo(() => ({ plain: new THREE.MeshLambertMaterial({ map: texture }), money: new THREE.MeshLambertMaterial({ map: createBasketballTexture(MONEY_COLOR) }) }), [texture]);
 useEffect(
  () => () => {
   texture.dispose();
   skins.money.map.dispose();
   skins.plain.dispose();
   skins.money.dispose();
  },
  [texture, skins],
 );

 const ball = useRef({
  mode: "stand",
  position: new THREE.Vector3(...HOME),
  velocity: new THREE.Vector3(),
  idle: 0,
  untouchable: 0, // s sin chocar con el jugador, tras tirar
  scoreLock: 0,
  shot: null, // { stage, t, takeoff }
  timing: 0, // cuándo se soltó: −1 al despegar, 0 arriba del todo, +1 al caer
  live: false, // hay un tiro en el aire, aún sin resolver
  cheer: false, // el tiro en vuelo salió de un salto: si entra, se celebra
  empty: false, // concurso de triples: manos vacías (entre balón y balón)
  money: false, // concurso: el balón que lleva es el de color
  streak: 0,
 });
 // Teclas y botones que se están manteniendo: el balón sale cuando se sueltan.
 const held = useRef({ key: false, pointer: false });
 const spin = useMemo(() => ({ axis: new THREE.Vector3(), turn: new THREE.Quaternion() }), []);
 const what = useMemo(() => ({ scored: false, floor: false, rim: 0, blocked: false }), []);
 const hands = useMemo(() => [new THREE.Vector3(), new THREE.Vector3()], []);

 const toRim = () => Math.hypot(RIM.x - player.position.x, RIM.z - player.position.z);
 const inRange = () => onCourt() && toRim() < SHOOT_RANGE;
 const faceRim = () => (player.facing = Math.atan2(-(RIM.x - player.position.x), -(RIM.z - player.position.z)));

 const endShot = () => {
  ball.current.shot = null;
  player.shot = null;
 };
 const toStand = () => {
  const b = ball.current;
  Object.assign(b, { mode: "stand", idle: 0, live: false, empty: false, money: false });
  endShot();
  play.holding = false;
  b.position.set(...HOME);
  b.velocity.set(0, 0, 0);
 };

 const grab = () => {
  Object.assign(ball.current, { mode: "held", live: false });
  endShot();
  play.holding = true;
  emit("sound", { id: "ball-grab" });
 };

 // Se acabó la racha: el tiro no ha entrado.
 const miss = (text) => {
  const b = ball.current;
  b.live = false;
  b.cheer = false;
  if (text) emit("toast", { text, at: { x: RIM.x - 0.4, y: RIM.y + 2.2, z: RIM.z } });
  if (b.streak > 0) {
   b.streak = 0;
   emit("basket", { score: game.score, streak: 0 });
  }
 };

 // Empieza el tiro: se agacha y salta (o, si ya iba por el aire, tira desde ahí).
 const beginShot = () => {
  const b = ball.current;
  if (b.mode !== "held") {
   emit("toast", { text: "Coge antes el balón", at: { x: ballStand.x, y: 2.6, z: ballStand.z } });
   return;
  }
  if (!inRange()) {
   emit("toast", { text: "Acércate a la canasta", at: { x: player.position.x, y: player.position.y + 2.6, z: player.position.z } });
   return;
  }
  if (b.shot || b.empty || player.gesture) return;
  b.shot = { stage: player.grounded ? "dip" : "air", t: 0, takeoff: Math.max(1, Math.abs(player.velocity.y)) };
  b.timing = -1;
  player.shot = JUMP_SHOT.ready;
  if (!player.grounded) markerReacts();
 };

 // Suelta el balón. `timing`: −1 (nada más despegar) … 0 (en lo más alto: tiro
 // perfecto) … +1 (ya cayendo). Pronto se queda corto; tarde, se pasa; y cuanto
 // peor, más se desvía. `exact`: sin dispersión ni aviso (pruebas).
 const release = (timing, exact = false) => {
  const b = ball.current;
  if (b.mode !== "held" || b.empty) return;
  const feet = player.position;
  // (Sin gesto —pruebas—, sale de encima de la cabeza.)
  if (!b.shot) b.position.set(feet.x, feet.y + 2.05, feet.z);
  const distance = Math.hypot(RIM.x - b.position.x, RIM.z - b.position.z);
  // En el concurso, la ventana es más estrecha (y aún más en las esquinas).
  const allowed = play.contest ? shotWindow(triples.rack) : PERFECT;
  const off = Math.max(0, Math.abs(timing) - allowed) / (1 - allowed); // 0 = perfecto … 1 = lo peor
  let spread = exact || off === 0 ? 0 : (0.04 + off * 0.3) * (0.4 + distance * 0.09);
  let targetX = RIM.x + (Math.random() - 0.5) * 2 * spread;
  let targetZ = RIM.z + (Math.random() - 0.5) * 2 * spread;
  let power = off === 0 ? 1 : 1 + Math.sign(timing) * (0.03 + off * 0.2);
  if (play.contest) {
   // Concurso: entra o no según la probabilidad de soltar en ese punto del salto
   // (game/triples.js). Si entra, va limpio al aro; si no, al hierro o fuera
   // (a 34–50 cm del centro, hacia donde lleve el error: corto si fue pronto).
   // (Pruebas —exact—: entra si está dentro de la ventana, sin azar.)
   const makes = exact ? off === 0 : Math.random() < shotChance(timing, triples.rack);
   if (import.meta.env.DEV) (window.__world.contestShots ??= []).push({ timing, rack: triples.rack, makes, money: b.money }); // para las pruebas automáticas
   spread = 0;
   power = 1;
   targetX = RIM.x;
   targetZ = RIM.z;
   if (!makes) {
    const toRimX = (RIM.x - b.position.x) / distance, toRimZ = (RIM.z - b.position.z) / distance;
    const along = timing < 0 ? -1 : timing > 0 ? 1 : Math.sign(Math.random() - 0.5); // pronto, corto; tarde, largo
    const side = (Math.random() - 0.5) * 1.4;
    const miss = 0.34 + Math.random() * 0.16;
    const length = Math.hypot(along, side);
    targetX += ((toRimX * along - toRimZ * side) / length) * miss;
    targetZ += ((toRimZ * along + toRimX * side) / length) * miss;
   }
  }
  // Parábola alta: cuanto más lejos, más tiempo en el aire.
  const time = THREE.MathUtils.clamp(0.62 + distance * 0.115, 0.85, 1.7);
  b.velocity.set((targetX - b.position.x) / time, (RIM.y + 0.03 - b.position.y + 0.5 * BALL_GRAVITY * time * time) / time, (targetZ - b.position.z) / time).multiplyScalar(power);
  faceRim();
  if (play.launch) {
   // Concurso de triples: el balón soltado se lo queda el concurso (puede haber varios
   // en el aire) y las manos quedan vacías hasta que dé el siguiente.
   play.launch(b.position, b.velocity, timing, b.money);
   Object.assign(b, { empty: true, timing });
   if (b.shot) Object.assign(b.shot, { stage: "released", t: 0 });
   emit("sound", { id: "ball-throw" });
   return;
  }
  Object.assign(b, { mode: "free", untouchable: 0.5, idle: 0, live: true, timing, cheer: Boolean(b.shot) });
  play.holding = false;
  if (b.shot) Object.assign(b.shot, { stage: "released", t: 0 });
  // El defensa del aro salta, con un respiro de reacción y más o menos impulso.
  guard.wait = 0.1 + Math.random() * 0.12;
  guard.power = 3.9 + Math.random() * 1.1;
  emit("sound", { id: "ball-throw" });
  emit("shot", { timing, perfect: off === 0 });
  if (!exact && !play.contest) emit("toast", { text: off === 0 ? "¡Perfecto!" : timing < 0 ? "Pronto" : "Tarde", at: { x: feet.x, y: feet.y + 2.9, z: feet.z } });
 };

 const grabClick = useInteractable({
  position: () => ball.current.position,
  radius: GRAB_DISTANCE,
  hint: "Coger el balón",
  enabled: () => ball.current.mode !== "held" && !play.contest,
  action: grab,
 });
 // Con el balón en la mano, la acción es tirar: se mantiene y se suelta.
 useInteractable({
  position: () => player.position,
  radius: 1,
  priority: 1,
  hint: () => (inRange() ? "Tirar a canasta: mantén pulsado y suelta en lo más alto del salto" : "Acércate a la canasta para tirar"),
  enabled: () => ball.current.mode === "held" && !ball.current.shot, // (tirando, el letrero no tapa el medidor)
  action: beginShot,
 });

 useEffect(() => {
  const b = ball.current;
  const keys = held.current;
  const onKeyDown = (event) => event.code === "KeyE" && (keys.key = true);
  const onKeyUp = (event) => event.code === "KeyE" && (keys.key = false);
  // Con el ratón o el dedo: pulsar sobre la escena salta; soltar, tira. (El
  // botón «Usar» de la pantalla táctil también cuenta como pulsación mantenida.)
  const onPointerDown = (event) => {
   keys.pointer = true;
   if (event.target instanceof HTMLCanvasElement && b.mode === "held" && inRange()) beginShot();
  };
  const onPointerUp = () => (keys.pointer = false);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("blur", onPointerUp);
  // Lo que la pista ofrece a quien la dirige desde fuera (el concurso de triples).
  Object.assign(play, { ball: b, grab, toStand, release });
  if (import.meta.env.DEV) {
   // Para las pruebas automáticas.
   window.__world.ball = b;
   window.__world.court = { blocker: guard, marker, rim, play, RIM, fence, perfect: PERFECT, shoot: (timing = 0) => release(timing, true), shootLive: (timing = 0) => release(timing), home: toStand };
  }
  return () => {
   window.removeEventListener("keydown", onKeyDown);
   window.removeEventListener("keyup", onKeyUp);
   window.removeEventListener("pointerdown", onPointerDown);
   window.removeEventListener("pointerup", onPointerUp);
   window.removeEventListener("pointercancel", onPointerUp);
   window.removeEventListener("blur", onPointerUp);
   player.shot = null;
   Object.assign(play, { ball: null, holding: false });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 useFrame(({ clock, camera }, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  const b = ball.current;
  const p = b.position;
  const feet = player.position;
  const shot = b.shot;
  b.untouchable = Math.max(0, b.untouchable - dt);
  b.scoreLock = Math.max(0, b.scoreLock - dt);

  if (b.mode === "held") {
   if (shot) {
    shot.t += dt;
    faceRim();
    if (shot.stage === "dip") {
     // Anticipación: se agacha un instante y pide el salto de siempre.
     player.shot = JUMP_SHOT.dip * Math.min(1, shot.t / DIP_TIME);
     if (shot.t >= DIP_TIME) {
      Object.assign(shot, { stage: "jump", t: 0 });
      input.jumpQueued = true;
     }
    } else if (shot.stage === "jump") {
     if (!player.grounded) {
      Object.assign(shot, { stage: "air", t: 0, takeoff: Math.max(1, player.velocity.y) });
      markerReacts();
     } else if (shot.t > 0.25) endShot(); // (no ha podido saltar: hay una carta abierta, un gesto…)
    }
    if (shot.stage === "air") {
     // Sube con el balón: los brazos van arriba según se acerca a lo más alto.
     b.timing = THREE.MathUtils.clamp(-player.velocity.y / shot.takeoff, -1, 1);
     const up = THREE.MathUtils.smoothstep(b.timing, -1, 0);
     player.shot = JUMP_SHOT.dip + (JUMP_SHOT.set - JUMP_SHOT.dip) * up;
     // Sale al soltar; y si se llega al suelo sin soltar, tarde y mal.
     if (player.grounded) release(1);
     else if (!held.current.key && !held.current.pointer) release(b.timing);
    }
   }
   if (b.mode === "held") {
    const forwardX = -Math.sin(player.facing);
    const forwardZ = -Math.cos(player.facing);
    const sockets = player.sockets;
    if (b.shot && sockets?.RightHand_PropSocket && sockets.LeftHand_PropSocket) {
     // Tirando: entre las dos manos (que lleva la animación), algo por delante.
     sockets.RightHand_PropSocket.getWorldPosition(hands[0]);
     sockets.LeftHand_PropSocket.getWorldPosition(hands[1]);
     p.copy(hands[0]).add(hands[1]).multiplyScalar(0.5);
     p.x += forwardX * 0.14;
     p.y += 0.12;
     p.z += forwardZ * 0.14;
    } else {
     // En las manos, delante del cuerpo, con un pequeño bote.
     p.set(feet.x + forwardX * 0.55, feet.y + 0.95 + Math.abs(Math.sin(clock.elapsedTime * 5)) * 0.12, feet.z + forwardZ * 0.55);
    }
    // Si te lo llevas lejos o subes a la nave, vuelve a su sitio.
    if (player.hidden || Math.hypot(feet.x - center.x, feet.z - center.z) > MAX_DISTANCE) toStand();
   }
  } else if (b.mode === "free") {
   // Pasos cortos para que no atraviese el aro.
   const steps = Math.ceil(dt / (1 / 120));
   for (let i = 0; i < steps; i++) {
    what.scored = what.floor = what.blocked = false;
    what.rim = 0;
    stepBall(p, b.velocity, dt / steps, what);
    if (what.rim > 0) {
     emit("net", { amount: 0.3, x: b.velocity.x, z: b.velocity.z });
     rim.speed += Math.min(1, what.rim) * 2.6; // el aro cede con el golpe
    }
    if (what.scored && b.scoreLock <= 0) {
     b.scoreLock = 1;
     b.live = false;
     b.streak += 1;
     game.score += 1;
     game.streak = b.streak;
     rim.speed += 0.7;
     emit("net", { amount: 1, x: b.velocity.x, z: b.velocity.z });
     emit("score", { score: game.score });
     emit("basket", { score: game.score, streak: b.streak, timing: b.timing });
     if (!play.contest) emit("toast", { text: b.streak > 1 ? `¡Canasta! ${game.score} · racha de ${b.streak}` : `¡Canasta! ${game.score}`, at: { x: RIM.x - 0.4, y: RIM.y + 2.2, z: RIM.z } });
     // Una celebración pequeña, si está quieto y con los pies en el suelo.
     if (b.cheer && !play.contest && player.grounded && !player.gesture && !ui.open && Math.hypot(player.velocity.x, player.velocity.z) < 1.5) {
      endShot();
      player.act?.("Astro_CelebrateSmall", { fade: 0.15 });
     }
     b.cheer = false;
    } else if (b.live && what.blocked) miss(play.contest ? null : "¡Tapón!");
    else if (b.live && what.floor) miss(play.contest ? null : b.timing < -PERFECT ? "Corto: has soltado pronto" : b.timing > PERFECT ? "Largo: has soltado tarde" : "¡Casi!");
   }

   // El astronauta lo empuja al chocar: solo le da velocidad, sin recolocarlo
   // de golpe (eso lo hacía temblar cuando quedaba entre el jugador y algo fijo).
   if (b.untouchable <= 0 && !player.hidden) {
    const dx = p.x - feet.x;
    const dz = p.z - feet.z;
    const d = Math.hypot(dx, dz);
    const reach = PLAYER_RADIUS + BALL_RADIUS;
    if (d < reach && d > 1e-4 && p.y - feet.y < 1.5) {
     const nx = dx / d;
     const nz = dz / d;
     const push = Math.max(0, player.velocity.x * nx + player.velocity.z * nz) * 1.2 + 1.2;
     const along = b.velocity.x * nx + b.velocity.z * nz;
     if (along < push) {
      b.velocity.x += (push - along) * nx;
      b.velocity.z += (push - along) * nz;
     }
    }
   }

   // Si se queda parado lejos de ti, vuelve solo a su soporte.
   const speed = b.velocity.length();
   b.idle = speed < 0.3 ? b.idle + dt : 0;
   const nearPlayer = Math.hypot(p.x - feet.x, p.z - feet.z) < GRAB_DISTANCE + 1;
   if (b.idle > IDLE_BEFORE_RETURN && !nearPlayer && !play.contest) toStand();

   if (speed > 0.05) {
    spin.axis.set(b.velocity.z, 0, -b.velocity.x).normalize();
    spin.turn.setFromAxisAngle(spin.axis, (speed * dt) / BALL_RADIUS);
    mesh.current.quaternion.premultiply(spin.turn);
   }
  }

  // El gesto sigue después de soltar: golpe de muñeca, acompaña mientras cae y aterriza.
  if (b.shot && (b.shot.stage === "released" || b.shot.stage === "landing")) {
   const now = b.shot;
   now.t += dt;
   if (now.stage === "released") {
    player.shot = Math.min(JUMP_SHOT.follow, player.shot + dt * (player.shot < JUMP_SHOT.set ? 3.2 : 1.5));
    if (player.grounded) Object.assign(now, { stage: "landing", t: 0 });
   } else {
    player.shot = Math.min(JUMP_SHOT.land, player.shot + dt * 1.3);
    if (now.t > 0.3 || Math.hypot(player.velocity.x, player.velocity.z) > 1) endShot();
   }
  }

  mesh.current.position.copy(p);
  mesh.current.visible = !b.empty;
  mesh.current.material = b.money ? skins.money : skins.plain;
  // Sombra de contacto: se encoge y aclara cuanto más alto está.
  const ground = Math.max(terrainHeight(p.x, p.z), WATER_LEVEL);
  const height = Math.max(0, p.y - BALL_RADIUS - ground);
  shadow.current.visible = b.mode === "free";
  shadow.current.position.set(p.x, ground + 0.075, p.z);
  shadow.current.scale.setScalar(1 + height * 0.3);
  shadow.current.material.opacity = 0.4 / (1 + height * 1.4);

  // Medidor de tiro: una barra junto al astronauta, de cara a la cámara. Sube
  // con el salto; la franja verde del centro es lo más alto: ahí hay que soltar.
  // (En el concurso de triples no hay barra: se juzga solo por el salto.)
  const aiming = b.mode === "held" && !b.empty && Boolean(b.shot) && !play.contest;
  meter.current.visible = aiming;
  if (aiming) {
   const level = b.shot.stage === "air" ? (b.timing + 1) / 2 : 0;
   meter.current.position.set(feet.x + 0.95, feet.y + 1.25, feet.z);
   meter.current.quaternion.copy(camera.quaternion);
   fill.current.scale.y = Math.max(0.001, level);
   fill.current.position.y = -METER.height / 2 + (level * METER.height) / 2;
   fill.current.material.color.set(Math.abs(b.timing) <= PERFECT ? "#5fe07a" : b.timing > 0 ? "#ff6a4a" : "#ffcf4a");
  }
 });

 return (
  <>
   <mesh ref={mesh} name="balón" material={skins.plain} castShadow>
    <sphereGeometry args={[BALL_RADIUS, 24, 16]} />
    {/* Zona de clic bastante mayor que el balón: en pantalla es pequeño. */}
    <mesh {...grabClick}>
     <sphereGeometry args={[0.6, 10, 8]} />
     <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
   </mesh>
   <mesh ref={shadow} rotation-x={-Math.PI / 2} visible={false}>
    <circleGeometry args={[BALL_RADIUS * 1.2, 20]} />
    <meshBasicMaterial color="#000000" transparent opacity={0.35} depthWrite={false} />
   </mesh>
   <group ref={meter} name="medidor de tiro" visible={false} renderOrder={20}>
    <mesh>
     <planeGeometry args={[METER.width + 0.08, METER.height + 0.08]} />
     <meshBasicMaterial color="#1c1a22" transparent opacity={0.88} depthTest={false} toneMapped={false} fog={false} />
    </mesh>
    <mesh position-z={0.002}>
     <planeGeometry args={[METER.width + 0.16, METER.height * PERFECT]} />
     <meshBasicMaterial color="#5fe07a" transparent opacity={0.55} depthTest={false} toneMapped={false} fog={false} />
    </mesh>
    <mesh ref={fill} position-z={0.004}>
     <planeGeometry args={[METER.width, METER.height]} />
     <meshBasicMaterial color="#ffcf4a" transparent depthTest={false} toneMapped={false} fog={false} />
    </mesh>
   </group>
  </>
 );
}
// La barra del medidor.
const METER = { width: 0.16, height: 1.3 };

// ── Canasta ─────────────────────────────────────────────────────────────────
function createScoreTexture() {
 const canvas = document.createElement("canvas");
 canvas.width = 640;
 canvas.height = 160;
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 const draw = (score, streak) => {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#22201f";
  ctx.fillRect(0, 0, 640, 160);
  ctx.fillStyle = "#3a3632";
  ctx.fillRect(344, 16, 4, 128);
  ctx.textBaseline = "middle";
  const cell = (label, value, x, color) => {
   ctx.fillStyle = "#e3c9a3";
   ctx.font = '700 26px "Bricolage Grotesque", sans-serif';
   if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
   ctx.textAlign = "left";
   ctx.fillText(label, x, 38);
   ctx.fillStyle = color;
   ctx.font = '800 100px "Bricolage Grotesque", sans-serif';
   if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
   ctx.fillText(String(value).padStart(2, "0"), x - 4, 104);
  };
  cell("CANASTAS", score, 34, "#ffcf4a");
  cell("RACHA", streak, 380, streak > 1 ? "#5fe07a" : "#f4ead8");
  texture.needsUpdate = true;
 };
 draw(game.score, 0);
 fontReady('800 100px "Bricolage Grotesque"').then(() => draw(game.score, game.streak ?? 0));
 return { texture, draw };
}

const HOOP_URL = "/models/living/court/canasta.glb";
useGLTF.preload(HOOP_URL);
const NET_DEPTH = 1.64; // lo que cuelga la red, en radios de aro

// La canasta es el modelo «Basketball 3D Icons» (docs/CREDITOS.md), reducido:
// poste, tablero y aro en una malla y la red en otra, que se mueve al entrar el
// balón (y tiembla un poco cuando da en el aro).
function Hoop() {
 const { scene } = useGLTF(HOOP_URL);
 const flash = useRef(0);
 const score = useMemo(createScoreTexture, []);
 const swish = useMemo(() => uniform(new THREE.Vector3()), []); // hacia dónde (x, z) y cuánto
 const tilt = useMemo(() => uniform(0), []); // lo que cede el aro (rad)
 const hinge = useRef(null);
 const parts = useMemo(() => {
  const found = {};
  scene.traverse((node) => {
   if (!node.isMesh) return;
   const geometry = node.geometry.clone();
   geometry.computeVertexNormals();
   found[node.name] = geometry;
  });
  return found;
 }, [scene]);
 const material = useMemo(() => {
  // El aro cede por su bisagra (el lado del tablero): lo demás del modelo no se mueve.
  // (En el modelo el aro es de radio 1, centrado, con el tablero hacia −x.)
  const lever = positionLocal.x.add(1).max(0);
  const onRim = smoothstep(1.2, 1.35, positionLocal.xz.length()).oneMinus().mul(smoothstep(0.15, 0.3, positionLocal.y.abs()).oneMinus());
  const frame = lambert();
  frame.positionNode = positionLocal.sub(vec3(0, tilt.mul(lever).mul(onRim), 0));
  // La red cuelga del aro: arriba no se mueve; abajo se va con el balón, se
  // estira y se sacude.
  const net = new MeshLambertNodeMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const hang = positionLocal.y.negate().div(NET_DEPTH).clamp(0, 1);
  const sway = hang.mul(hang).mul(swish.z);
  const shake = sin(uniforms.uTime.mul(21)).mul(0.5);
  net.positionNode = positionLocal.add(vec3(swish.x.add(shake).mul(sway).mul(0.75), positionLocal.y.mul(swish.z).mul(0.34).sub(tilt.mul(lever)), swish.y.add(shake.mul(0.6)).mul(sway).mul(0.75)));
  const rim = new THREE.MeshLambertMaterial({ color: "#ff5a2e", emissive: "#ff5a2e", emissiveIntensity: 0.4 });
  return { frame, net, rim };
 }, [swish, tilt]);

 useEffect(() => {
  const onBasket = (event) => {
   score.draw(event.detail.score, event.detail.streak);
   if (event.detail.streak > 0) flash.current = 1;
  };
  // La red se va hacia donde lleva el balón (el modelo mira al revés: gira media vuelta).
  const onNet = (event) => {
   const { amount, x, z } = event.detail;
   const speed = Math.hypot(x, z) || 1;
   if (amount >= swish.value.z) swish.value.set((-x / speed) * 0.6, (-z / speed) * 0.6, amount);
  };
  events.addEventListener("basket", onBasket);
  events.addEventListener("net", onNet);
  return () => {
   events.removeEventListener("basket", onBasket);
   events.removeEventListener("net", onNet);
   score.texture.dispose();
   Object.values(parts).forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  };
 }, [score, parts, material, swish]);

 useFrame((_, delta) => {
  // La sacudida de la red se apaga sola; al encestar, el aro destella.
  swish.value.z *= Math.exp(-delta * 2.4);
  // El aro: un muelle con freno (cede, rebota un par de veces y se queda quieto).
  const dt = Math.min(delta, 0.05);
  rim.speed += (-520 * rim.angle - 9 * rim.speed) * dt;
  rim.angle = THREE.MathUtils.clamp(rim.angle + rim.speed * dt, -0.06, 0.2);
  tilt.value = rim.angle;
  hinge.current.rotation.z = rim.angle;
  flash.current = Math.max(0, flash.current - delta * 1.8);
  material.rim.emissiveIntensity = 0.4 + flash.current * 3;
 });

 return (
  <group name="canasta" userData={{ rests: 0 }}>
   <group position={[RIM.x, RIM.y, RIM.z]} rotation-y={Math.PI} scale={RIM_RADIUS}>
    <mesh geometry={parts.aro} material={material.frame} castShadow />
    <mesh name="red de la canasta" geometry={parts.red} material={material.net} />
   </group>
   {/* Un filo naranja sobre el aro del modelo: es lo que destella al encestar. */}
   <group ref={hinge} position={[RIM.x + RIM_RADIUS, RIM.y, RIM.z]}>
    <mesh name="filo del aro" position={[-RIM_RADIUS, 0.01, 0]} rotation-x={Math.PI / 2} material={material.rim}>
     <torusGeometry args={[RIM_RADIUS, 0.022, 6, 24]} />
    </mesh>
   </group>
   {/* Marcador, sobre el tablero e inclinado hacia la cámara. */}
   <mesh position={[RIM.x + 0.75, RIM.y + 1.72, RIM.z]} rotation-x={-0.5}>
    <planeGeometry args={[3.0, 0.75]} />
    <meshBasicMaterial map={score.texture} toneMapped={false} fog={false} />
   </mesh>
  </group>
 );
}

// Un maniquí de entrenamiento con los brazos en alto. Los dos defensas son el
// mismo, cada uno con su color.
function Mannequin({ color, groupRef, ...props }) {
 const body = <meshLambertMaterial color={color} flatShading />;
 const dark = <meshLambertMaterial color="#2c2f36" flatShading />;
 return (
  <group ref={groupRef} {...props}>
   <mesh position-y={0.06}>
    <cylinderGeometry args={[0.3, 0.36, 0.12, 8]} />
    {dark}
   </mesh>
   <mesh position-y={0.55}>
    <cylinderGeometry args={[0.07, 0.07, 0.9, 6]} />
    {dark}
   </mesh>
   <mesh position-y={1.36} castShadow>
    <boxGeometry args={[0.62, 0.86, 0.28]} />
    {body}
   </mesh>
   <mesh position-y={1.98} castShadow>
    <sphereGeometry args={[0.2, 8, 6]} />
    {body}
   </mesh>
   {[-1, 1].map((side) => (
    <group key={side} position={[side * 0.36, 1.74, 0]} rotation-z={-side * 0.16}>
     <mesh position-y={0.4} castShadow>
      <boxGeometry args={[0.13, 0.8, 0.13]} />
      {body}
     </mesh>
     <mesh position-y={0.86}>
      <boxGeometry args={[0.2, 0.2, 0.08]} />
      {dark}
     </mesh>
    </group>
   ))}
  </group>
 );
}

// El salto de un defensa: espera su tiempo de reacción y sube.
function hop(one, dt) {
 if (one.wait >= 0) {
  one.wait -= dt;
  if (one.wait < 0 && one.y === 0) one.vy = one.power;
 }
 if (one.y > 0 || one.vy > 0) {
  one.vy -= BALL_GRAVITY * dt;
  one.y = Math.max(0, one.y + one.vy * dt);
  if (one.y === 0) one.vy = 0;
 }
}

// Los dos defensas. El del aro se mueve de lado para tapar la línea de tiro. El
// que marca se pone entre el jugador con balón y la canasta y va con él, pero
// tarde (persigue el sitio donde el jugador estaba hace un momento) y más
// despacio de lo que el jugador anda: un cambio de dirección lo deja atrás. Ni
// se pisan entre ellos ni se echan encima del jugador. En el concurso de
// triples se apartan los dos a la banda.
function Defenders() {
 const guardGroup = useRef(null);
 const markerGroup = useRef(null);
 useFrame((_, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  const feet = player.position;
  const away = play.contest;

  // El del aro: en la línea entre el tirador y el aro, sin alejarse de él.
  const line = away ? GUARD_ASIDE.z : RIM.z + THREE.MathUtils.clamp((feet.z - RIM.z) * 0.32, -1.1, 1.1);
  const post = away ? GUARD_ASIDE.x : GUARD_X;
  if (guard.y === 0) {
   guard.z += THREE.MathUtils.clamp(line - guard.z, -dt * (away ? 3 : 1.6), dt * (away ? 3 : 1.6));
   guard.x += THREE.MathUtils.clamp(post - guard.x, -dt * 3, dt * 3);
  }
  hop(guard, dt);

  // El que marca.
  let tx = MARK_HOME.x, tz = MARK_HOME.z;
  if (away) (tx = MARK_ASIDE.x), (tz = MARK_ASIDE.z);
  else if (play.holding && onCourt()) {
   const dx = RIM.x - feet.x, dz = RIM.z - feet.z;
   const d = Math.hypot(dx, dz) || 1;
   // A un paso largo por delante; cerca del aro, se queda pegado (ahí ya está el otro).
   const gap = THREE.MathUtils.clamp(d - 2.5, 0.95, MARK_GAP);
   tx = feet.x + (dx / d) * gap;
   tz = feet.z + (dz / d) * gap;
  }
  // Va hacia donde el jugador estaba hace un momento…
  const lag = 1 - Math.exp(-dt / MARK_LAG);
  marker.aimX += (tx - marker.aimX) * lag;
  marker.aimZ += (tz - marker.aimZ) * lag;
  if (marker.y === 0) {
   // …y a su paso.
   const mx = marker.aimX - marker.x, mz = marker.aimZ - marker.z;
   const far = Math.hypot(mx, mz);
   const step = Math.min(far, MARK_SPEED * dt);
   if (far > 1e-4) (marker.x += (mx / far) * step), (marker.z += (mz / far) * step);
   // No se pisan: se separa del otro defensa y del jugador.
   for (const [ox, oz, room] of [[guard.x, guard.z, 0.95], [feet.x, feet.z, PLAYER_RADIUS + DEFENDER.radius + 0.12]]) {
    const sx = marker.x - ox, sz = marker.z - oz;
    const s = Math.hypot(sx, sz);
    if (s < room) {
     const nx = s > 1e-4 ? sx / s : -1, nz = s > 1e-4 ? sz / s : 0;
     marker.x = ox + nx * room;
     marker.z = oz + nz * room;
    }
   }
   marker.x = THREE.MathUtils.clamp(marker.x, court.x0 + 0.5, court.x1 - 0.5);
   marker.z = THREE.MathUtils.clamp(marker.z, court.z0 + 0.5, court.z1 - 0.5);
  }
  hop(marker, dt);

  blockerCollider.x = guard.x;
  blockerCollider.z = guard.z;
  markerCollider.x = marker.x;
  markerCollider.z = marker.z;
  guardGroup.current.position.set(guard.x, 0.06 + guard.y, guard.z);
  markerGroup.current.position.set(marker.x, 0.06 + marker.y, marker.z);
  // Se encogen un poco antes de saltar.
  guardGroup.current.scale.y = guard.wait >= 0 && guard.y === 0 ? 0.93 : 1;
  markerGroup.current.scale.y = marker.wait >= 0 && marker.y === 0 ? 0.93 : 1;
  // El que marca mira al jugador.
  let turn = Math.atan2(feet.x - marker.x, feet.z - marker.z) - markerGroup.current.rotation.y;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  markerGroup.current.rotation.y += turn * Math.min(1, dt * 8);
 });
 return (
  <>
   <Mannequin groupRef={guardGroup} name="barrera de la pista" color="#e8662a" rotation-y={-Math.PI / 2} />
   <Mannequin groupRef={markerGroup} name="defensa que marca" color="#3f7fd0" rotation-y={-Math.PI / 2} />
  </>
 );
}

// ── Valla ───────────────────────────────────────────────────────────────────
// Malla metálica: un rombo que se repite (lo demás, transparente).
function createMeshTexture() {
 const canvas = document.createElement("canvas");
 canvas.width = canvas.height = 64;
 const ctx = canvas.getContext("2d");
 ctx.strokeStyle = "#ffffff";
 ctx.lineWidth = 5;
 ctx.beginPath();
 for (const [x0, y0, x1, y1] of [[32, -4, 68, 32], [-4, 32, 32, 68], [-4, 32, 32, -4], [32, 68, 68, 32]]) (ctx.moveTo(x0, y0), ctx.lineTo(x1, y1));
 ctx.stroke();
 const texture = new THREE.CanvasTexture(canvas);
 texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
 texture.colorSpace = THREE.SRGBColorSpace;
 texture.anisotropy = 8;
 return texture;
}
const STEEL = "#77818d";
const CELL = 0.3; // m de cada rombo

// Valla alta alrededor de toda la pista, hecha a mano: postes de tubo cada
// pocos metros, tres largueros y paños de malla. En el lado norte, la puerta:
// se abre hacia fuera al acercarse y se cierra sola. (El balón no pasa ni con
// la puerta abierta.)
function Fence() {
 const door = useRef(null);
 const swing = useRef(0);
 const { x0, x1, z0, z1, height, gate } = fence;
 const gateFrom = gate.x - gate.width / 2, gateTo = gate.x + gate.width / 2;
 // Tramos de valla: [x, z, x, z], con el hueco de la puerta en el norte.
 const runs = useMemo(() => [[x0, z0, gateFrom, z0], [gateTo, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]], [x0, x1, z0, z1, gateFrom, gateTo]);
 const geometry = useMemo(() => ({ post: new THREE.CylinderGeometry(0.055, 0.055, 1, 6).translate(0, 0.5, 0), rail: new THREE.BoxGeometry(1, 0.05, 0.05), panel: new THREE.PlaneGeometry(1, 1) }), []);
 const texture = useMemo(createMeshTexture, []);
 const material = useMemo(
  () => ({
   steel: new THREE.MeshLambertMaterial({ color: STEEL, flatShading: true }),
   // Cada paño repite la malla según su tamaño (ver `uvScale`).
   mesh: (wide, tall) => {
    const map = texture.clone();
    map.repeat.set(wide / CELL, tall / CELL);
    map.needsUpdate = true;
    return new THREE.MeshBasicMaterial({ map, color: "#c9d1db", transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false });
   },
  }),
  [texture],
 );
 const built = useMemo(() => {
  const posts = [], rails = [], panels = [];
  for (const [ax, az, bx, bz] of runs) {
   const length = Math.hypot(bx - ax, bz - az);
   const yaw = Math.atan2(-(bz - az), bx - ax);
   const count = Math.max(1, Math.round(length / 2.7));
   for (let i = 0; i <= count; i++) posts.push({ position: [ax + ((bx - ax) * i) / count, 0.02, az + ((bz - az) * i) / count], scale: [1, height, 1] });
   for (const y of [0.16, height * 0.52, height - 0.03]) rails.push({ position: [(ax + bx) / 2, y, (az + bz) / 2], rotation: [0, yaw, 0], scale: [length, 1, 1] });
   panels.push({ position: [(ax + bx) / 2, 0.16 + (height - 0.19) / 2, (az + bz) / 2], yaw, wide: length, tall: height - 0.19, material: material.mesh(length, height - 0.19) });
  }
  // Dintel sobre la puerta.
  rails.push({ position: [gate.x, height - 0.03, z0], scale: [gate.width, 1, 1] }, { position: [gate.x, 2.3, z0], scale: [gate.width, 1, 1] });
  panels.push({ position: [gate.x, 2.3 + (height - 2.33) / 2, z0], yaw: 0, wide: gate.width, tall: height - 2.33, material: material.mesh(gate.width, height - 2.33) });
  return { posts, rails, panels, door: material.mesh(gate.width - 0.1, 2.16) };
 }, [runs, height, gate, z0, material]);
 useEffect(
  () => () => {
   Object.values(geometry).forEach((one) => one.dispose());
   material.steel.dispose();
   for (const panel of [...built.panels, { material: built.door }]) (panel.material.map.dispose(), panel.material.dispose());
   texture.dispose();
  },
  [geometry, material, built, texture],
 );

 useFrame((_, delta) => {
  // La puerta se abre cuando el astronauta está delante (por dentro o por fuera).
  const near = !player.hidden && Math.abs(player.position.x - gate.x) < 2.2 && Math.abs(player.position.z - z0) < 2.6;
  swing.current += ((near ? 1 : 0) - swing.current) * Math.min(1, delta * 5);
  door.current.rotation.y = swing.current * 1.75;
 });

 return (
  <group name="valla de la pista">
   <Instances name="valla de la pista" geometry={geometry.post} material={material.steel} items={built.posts} castShadow />
   <Instances name="valla de la pista" geometry={geometry.rail} material={material.steel} items={built.rails} />
   {built.panels.map((panel, i) => (
    <mesh key={i} name="valla de la pista" geometry={geometry.panel} material={panel.material} position={panel.position} rotation-y={panel.yaw} scale={[panel.wide, panel.tall, 1]} />
   ))}
   {/* La puerta: gira sobre su poste del oeste, hacia fuera. */}
   <group ref={door} name="puerta de la pista" position={[gateFrom, 0, z0]}>
    <mesh geometry={geometry.post} material={material.steel} position={[gate.width - 0.06, 0.04, 0]} scale={[0.8, 2.22, 0.8]} />
    {[0.1, 1.15, 2.24].map((y) => (
     <mesh key={y} geometry={geometry.rail} material={material.steel} position={[gate.width / 2, y, 0]} scale={[gate.width - 0.08, 1, 1]} />
    ))}
    <mesh geometry={geometry.panel} material={built.door} position={[gate.width / 2, 1.17, 0]} scale={[gate.width - 0.1, 2.16, 1]} />
   </group>
  </group>
 );
}

// La pista y sus líneas.
function CourtFloor() {
 const width = court.x1 - court.x0;
 const depth = court.z1 - court.z0;
 const cx = (court.x0 + court.x1) / 2;
 const cz = (court.z0 + court.z1) / 2;
 const freeThrowX = RIM.x - 4.4;
 const keyLength = court.x1 - 0.3 - freeThrowX;
 const line = <meshBasicMaterial color="#fff6e8" />;
 return (
  <group name="pista de baloncesto" userData={{ rests: 0 }}>
   <mesh position={[cx, 0.03, cz]} receiveShadow>
    <boxGeometry args={[width, 0.06, depth]} />
    <meshLambertMaterial color="#4c9a8c" flatShading />
   </mesh>
   <mesh position={[freeThrowX + keyLength / 2, 0.062, cz]} receiveShadow>
    <boxGeometry args={[keyLength, 0.005, 3.7]} />
    <meshLambertMaterial color="#c8643c" flatShading />
   </mesh>
   {/* Bordillo de piedra alrededor. */}
   {[
    [cx, court.z0 - 0.16, width + 0.64, 0.32],
    [cx, court.z1 + 0.16, width + 0.64, 0.32],
    [court.x0 - 0.16, cz, 0.32, depth],
    [court.x1 + 0.16, cz, 0.32, depth],
   ].map(([x, z, w, d], i) => (
    <mesh key={i} position={[x, 0.07, z]} castShadow receiveShadow>
     <boxGeometry args={[w, 0.14, d]} />
     <meshLambertMaterial color={i % 2 ? "#b9b4ab" : "#c6c1b7"} flatShading />
    </mesh>
   ))}
   <group position-y={0.07}>
    {/* Borde de la pista. */}
    {[court.z0 + 0.1, court.z1 - 0.1].map((z) => (
     <mesh key={z} position={[cx, 0, z]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[width - 0.2, 0.1]} />
      {line}
     </mesh>
    ))}
    {[court.x0 + 0.1, court.x1 - 0.1].map((x) => (
     <mesh key={x} position={[x, 0, cz]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[0.1, depth - 0.2]} />
      {line}
     </mesh>
    ))}
    {/* Línea y semicírculo de tiro libre. */}
    <mesh position={[freeThrowX, 0, cz]} rotation-x={-Math.PI / 2}>
     <planeGeometry args={[0.1, 3.7]} />
     {line}
    </mesh>
    <mesh position={[freeThrowX, 0, cz]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
     <ringGeometry args={[1.8, 1.9, 40, 1, 0, Math.PI]} />
     {line}
    </mesh>
   </group>
  </group>
 );
}

function BallStand() {
 return (
  <group name="soporte del balón" userData={{ rests: 0 }} position={[ballStand.x, 0, ballStand.z]}>
   <mesh position-y={STAND_TOP / 2} castShadow>
    <cylinderGeometry args={[0.08, 0.2, STAND_TOP - 0.06, 8]} />
    <meshLambertMaterial color="#5a3b28" flatShading />
   </mesh>
   <mesh position-y={STAND_TOP - 0.03} rotation-x={Math.PI / 2}>
    <torusGeometry args={[0.13, 0.03, 6, 16]} />
    <meshBasicMaterial color="#ff7a2f" toneMapped={false} />
   </mesh>
  </group>
 );
}

// Focos de la pista: dos postes altos por fuera de la valla norte, cada uno con
// su brazo y su proyector vuelto hacia la pista. De noche se encienden: lente
// con halo, luz de verdad (de las cálidas que se reparten por cercanía) y una
// mancha de claridad sobre el suelo, que está siempre aunque esas luces anden
// ocupadas en otro sitio.
const FLOOD = { height: 5.6, reach: 1.5, xs: [court.x0 + 1.1, court.x1 - 1.1], z: fence.z0 - 0.42 };
function createFloodlight() {
 const steel = "#59626e", dark = "#2f343c";
 return merge([
  piece(new THREE.CylinderGeometry(0.2, 0.26, 0.3, 8), { color: dark, position: [0, 0.15, 0] }),
  piece(new THREE.CylinderGeometry(0.07, 0.1, FLOOD.height, 7), { bottom: dark, top: steel, position: [0, FLOOD.height / 2, 0] }),
  // Brazo hacia la pista y su tirante.
  piece(new THREE.BoxGeometry(0.09, 0.09, FLOOD.reach), { color: steel, position: [0, FLOOD.height - 0.1, FLOOD.reach / 2] }),
  piece(new THREE.BoxGeometry(0.05, 0.05, 1.3), { color: dark, position: [0, FLOOD.height - 0.62, 0.52], rotation: [-0.82, 0, 0] }),
  // Proyector: caja con visera, inclinada hacia abajo.
  piece(new THREE.BoxGeometry(0.92, 0.26, 0.5), { bottom: dark, top: steel, position: [0, FLOOD.height - 0.2, FLOOD.reach], rotation: [0.5, 0, 0] }),
  piece(new THREE.BoxGeometry(1.0, 0.05, 0.3), { color: dark, position: [0, FLOOD.height - 0.02, FLOOD.reach + 0.3], rotation: [0.5, 0, 0] }),
 ]);
}
function Floodlights() {
 const geometry = useMemo(createFloodlight, []);
 const material = useMemo(() => ({ steel: lambert(), lens: new THREE.MeshLambertMaterial({ color: "#3a3f47", emissive: "#fff0cf" }), pool: new THREE.MeshBasicMaterial({ map: createGlowTexture(), color: "#ffe2b0", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }) }), []);
 const lenses = useMemo(() => FLOOD.xs.map((x) => [x, FLOOD.height - 0.36, FLOOD.z + FLOOD.reach + 0.08]), []);
 useEffect(() => {
  const stop = [
   registerGlow(material.lens, 0.1, 1.3),
   registerGlow(material.pool, 0, 0.34, "opacity"),
   ...FLOOD.xs.map((x) => addWarmSource({ x, y: FLOOD.height - 1.1, z: court.z0 + 3.4, color: "#ffdcae", reach: 17, power: 1.7, flicker: 0 })),
  ];
  return () => {
   stop.forEach((off) => off());
   geometry.dispose();
   material.pool.map.dispose();
   Object.values(material).forEach((one) => one.dispose());
  };
 }, [geometry, material]);
 return (
  <>
   {FLOOD.xs.map((x, i) => (
    <group key={i} position={[x, 0, FLOOD.z]}>
     <mesh name="foco de la pista" userData={{ rests: 0 }} geometry={geometry} material={material.steel} castShadow />
     <mesh position={[0, FLOOD.height - 0.34, FLOOD.reach + 0.07]} rotation-x={0.5} material={material.lens}>
      <boxGeometry args={[0.8, 0.04, 0.4]} />
     </mesh>
     {/* La claridad que deja en la pista. */}
     <mesh position={[(court.x0 + court.x1) / 2 - x > 0 ? 3.1 : -3.1, 0.09, court.z0 - FLOOD.z + 4.6]} rotation-x={-Math.PI / 2} material={material.pool} renderOrder={1}>
      <planeGeometry args={[13, 12]} />
     </mesh>
    </group>
   ))}
   <Halos points={lenses} size={2.4} color="#ffe6b8" night={0.7} />
  </>
 );
}

export function Court() {
 return (
  <Staged>
   <CourtFloor />
   <Fence />
   <Floodlights />
   <Hoop />
   <Defenders />
   <Triples />
   <BallStand />
   <Ball />
  </Staged>
 );
}
