import { useEffect, useMemo, useRef } from "react";
import { Staged } from "../Staged";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { positionLocal, sin, uniform, vec3 } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { Instances } from "../../experience/Instances";
import { useInteractable } from "../../experience/interact";
import { addWarmSource } from "../../experience/lightSources";
import { lambert } from "../../experience/materials";
import { emit, events, game, player } from "../../experience/state";
import { createBasketballTexture, createGlowTexture } from "../../experience/textures";
import { registerGlow, uniforms } from "../../experience/theme";
import { PLAYER_RADIUS } from "../collision";
import { BASKET, COURT, COURT_FENCE, WATER_LEVEL, blockerCollider, height as terrainHeight } from "./layout";
import { fontReady } from "../../ui/fonts";
import { merge, piece } from "./kit/geometry";
import { Halos } from "./props/Halos";

// Pista de baloncesto. No es un minijuego con modos: se coge el balón, se
// acerca uno a la canasta, se mantiene pulsado para cargar fuerza y se suelta
// para tirar. Con poca fuerza el tiro se queda corto; con demasiada, se pasa.
// Delante del aro hay una barrera que salta y puede taponar. Una valla
// metálica rodea la pista: el balón rebota en ella y no se sale nunca.

const { hoop, ballStand, center } = BASKET;
const court = COURT;
const fence = COURT_FENCE;

// ── Medidas ─────────────────────────────────────────────────────────────────
const BALL_RADIUS = 0.2; // mayor que uno real: se ve desde arriba
const BALL_GRAVITY = 11;
const GRAB_DISTANCE = 2.3;
const MAX_DISTANCE = 15; // si te lo llevas más lejos, vuelve a su soporte
const IDLE_BEFORE_RETURN = 7; // s parado lejos de ti antes de volver solo
const RIM_RADIUS = 0.37; // aro generoso: el balón también es más grande de lo normal
const RIM = { x: hoop.x - 0.25 - RIM_RADIUS, y: hoop.rimHeight, z: hoop.z };
// El tablero y el poste, medidos sobre el modelo ya escalado (tools/assets/hoop.py).
const BOARD = { x: RIM.x + 0.69, y: RIM.y + 0.35, z: hoop.z, half: [0.045, 0.6, 0.85] };
const STAND_TOP = 0.95;
const HOME = [ballStand.x, STAND_TOP + BALL_RADIUS, ballStand.z];
// Cilindros con los que choca el balón: su soporte y el poste.
const PILLARS = [
 { x: ballStand.x, z: ballStand.z, r: 0.2, h: STAND_TOP - 0.06 },
 { x: RIM.x + 1.0, z: hoop.z, r: 0.13, h: RIM.y + 0.3 },
];
// Carga del tiro: sube de 0 a 1 en 1/RATE segundos y vuelve a bajar, en vaivén.
const CHARGE_RATE = 0.7;
const SHOOT_RANGE = 12.5; // m al aro desde los que se puede tirar
// La fuerza justa para encestar desde `distance` metros (0…1).
const idealCharge = (distance) => THREE.MathUtils.clamp(0.3 + distance * 0.05, 0.36, 0.9);
// Cuánto cambia la velocidad de salida por cada punto de carga de más o de menos.
const CHARGE_GAIN = 0.45;

// ── Barrera ─────────────────────────────────────────────────────────────────
// Un maniquí delante del aro. Se mueve de lado para ponerse en la línea del
// tiro y salta en cuanto sale el balón: los tiros flojos o tensos, los tapona.
const blocker = { x: RIM.x - 1.55, z: RIM.z, y: 0, vy: 0, wait: -1, power: 0, active: true };
const BLOCKER = { radius: 0.34, low: 0.3, high: 2.38 };

// Rebota contra una superficie de normal (nx, ny, nz). Devuelve la velocidad
// del impacto en m/s (0 si ya se estaba alejando).
function bounce(velocity, nx, ny, nz, restitution) {
 const along = velocity.x * nx + velocity.y * ny + velocity.z * nz;
 if (along >= 0) return 0;
 velocity.x -= (1 + restitution) * along * nx;
 velocity.y -= (1 + restitution) * along * ny;
 velocity.z -= (1 + restitution) * along * nz;
 return -along;
}

// Avisa de un golpe para que suene, con su sitio y su fuerza (0–1).
function hit(id, at, strength) {
 if (strength > 0.06) emit("sound", { id, x: at.x, z: at.z, strength: Math.min(1, strength) });
}

// Un paso de física: gravedad, suelo, valla, tablero, aro, pilares y barrera.
// Apunta en `what` lo que ha pasado en este paso: scored, floor, rim, blocked.
function stepBall(p, v, dt, what) {
 const previousY = p.y;
 v.y -= BALL_GRAVITY * dt;
 p.addScaledVector(v, dt);

 const floor = Math.max(terrainHeight(p.x, p.z), WATER_LEVEL) + BALL_RADIUS;
 if (p.y < floor) {
  p.y = floor;
  if (v.y < -0.9) {
   hit("ball-floor", p, -v.y / 7);
   what.floor = true;
  }
  v.y = v.y < -0.9 ? -v.y * 0.72 : 0;
  const grip = Math.exp(-1.3 * dt); // rodadura
  v.x *= grip;
  v.z *= grip;
 }

 // Valla: cuatro planos que no deja pasar a ninguna altura (por encima de la
 // malla no hay nada, pero el balón tampoco se sale: se acabaría perdiendo).
 if (p.x < fence.x0 + BALL_RADIUS) (p.x = fence.x0 + BALL_RADIUS), hit("ball-fence", p, bounce(v, 1, 0, 0, 0.55) / 6);
 if (p.x > fence.x1 - BALL_RADIUS) (p.x = fence.x1 - BALL_RADIUS), hit("ball-fence", p, bounce(v, -1, 0, 0, 0.55) / 6);
 if (p.z < fence.z0 + BALL_RADIUS) (p.z = fence.z0 + BALL_RADIUS), hit("ball-fence", p, bounce(v, 0, 0, 1, 0.55) / 6);
 if (p.z > fence.z1 - BALL_RADIUS) (p.z = fence.z1 - BALL_RADIUS), hit("ball-fence", p, bounce(v, 0, 0, -1, 0.55) / 6);

 // Tablero: punto más cercano de la caja.
 const cx = Math.max(BOARD.x - BOARD.half[0], Math.min(p.x, BOARD.x + BOARD.half[0]));
 const cy = Math.max(BOARD.y - BOARD.half[1], Math.min(p.y, BOARD.y + BOARD.half[1]));
 const cz = Math.max(BOARD.z - BOARD.half[2], Math.min(p.z, BOARD.z + BOARD.half[2]));
 let ox = p.x - cx, oy = p.y - cy, oz = p.z - cz;
 let d = Math.hypot(ox, oy, oz);
 if (d < BALL_RADIUS && d > 1e-5) {
  p.set(cx + (ox / d) * BALL_RADIUS, cy + (oy / d) * BALL_RADIUS, cz + (oz / d) * BALL_RADIUS);
  hit("ball-board", p, bounce(v, ox / d, oy / d, oz / d, 0.6) / 6);
 }

 // Aro: punto más cercano de la circunferencia.
 const rx = p.x - RIM.x;
 const rz = p.z - RIM.z;
 const flat = Math.hypot(rx, rz) || 1e-5;
 const qx = RIM.x + (rx / flat) * RIM_RADIUS;
 const qz = RIM.z + (rz / flat) * RIM_RADIUS;
 ox = p.x - qx;
 oy = p.y - RIM.y;
 oz = p.z - qz;
 d = Math.hypot(ox, oy, oz);
 const reach = BALL_RADIUS + 0.02;
 if (d < reach && d > 1e-5) {
  p.set(qx + (ox / d) * reach, RIM.y + (oy / d) * reach, qz + (oz / d) * reach);
  const force = bounce(v, ox / d, oy / d, oz / d, 0.5) / 5;
  hit("ball-rim", p, force);
  if (force > 0.06) what.rim = true;
 }
 // Canasta: el centro cruza el plano del aro hacia abajo, por dentro.
 if (previousY > RIM.y && p.y <= RIM.y && v.y < 0 && flat < RIM_RADIUS - 0.03) what.scored = true;

 for (const pillar of PILLARS) {
  if (p.y - BALL_RADIUS > pillar.h) continue;
  const px = p.x - pillar.x;
  const pz = p.z - pillar.z;
  const distance = Math.hypot(px, pz);
  const limit = pillar.r + BALL_RADIUS;
  if (distance >= limit || distance < 1e-5) continue;
  p.x = pillar.x + (px / distance) * limit;
  p.z = pillar.z + (pz / distance) * limit;
  hit("ball-post", p, bounce(v, px / distance, 0, pz / distance, 0.55) / 5);
 }

 // Barrera: una cápsula vertical, de los pies a las manos en alto.
 if (blocker.active) {
  const by = Math.max(blocker.y + BLOCKER.low, Math.min(p.y, blocker.y + BLOCKER.high));
  ox = p.x - blocker.x;
  oy = p.y - by;
  oz = p.z - blocker.z;
  d = Math.hypot(ox, oy, oz);
  const limit = BLOCKER.radius + BALL_RADIUS;
  if (d < limit && d > 1e-5) {
   p.set(blocker.x + (ox / d) * limit, by + (oy / d) * limit, blocker.z + (oz / d) * limit);
   const force = bounce(v, ox / d, oy / d, oz / d, 0.45) / 5;
   hit("ball-block", p, force);
   if (force > 0.1) what.blocked = true;
  }
 }
}

// ── Balón ───────────────────────────────────────────────────────────────────
// Tiene tres estados claros, y solo uno a la vez:
//  · "stand": quieto en su soporte;
//  · "held": en las manos del astronauta (y, si se está cargando, `charging`);
//  · "free": suelto, con física.
function Ball() {
 const mesh = useRef(null);
 const shadow = useRef(null);
 const meter = useRef(null);
 const fill = useRef(null);
 const sweet = useRef(null);
 const texture = useMemo(() => createBasketballTexture(), []);
 useEffect(() => () => texture.dispose(), [texture]);

 const ball = useRef({
  mode: "stand",
  position: new THREE.Vector3(...HOME),
  velocity: new THREE.Vector3(),
  idle: 0,
  untouchable: 0, // s sin chocar con el jugador, tras tirar
  scoreLock: 0,
  charging: false,
  chargeTime: 0,
  charge: 0,
  live: false, // hay un tiro en el aire, aún sin resolver
  streak: 0,
 });
 // Teclas y botones que se están manteniendo: mientras haya alguno, se carga.
 const held = useRef({ key: false, pointer: false });
 const spin = useMemo(() => ({ axis: new THREE.Vector3(), turn: new THREE.Quaternion() }), []);
 const what = useMemo(() => ({ scored: false, floor: false, rim: false, blocked: false }), []);

 const toRim = () => Math.hypot(RIM.x - player.position.x, RIM.z - player.position.z);
 const inRange = () => {
  const feet = player.position;
  return feet.x > fence.x0 && feet.x < fence.x1 && feet.z > fence.z0 && feet.z < fence.z1 && toRim() < SHOOT_RANGE;
 };

 const toStand = () => {
  const b = ball.current;
  Object.assign(b, { mode: "stand", idle: 0, charging: false, live: false });
  b.position.set(...HOME);
  b.velocity.set(0, 0, 0);
 };

 const grab = () => {
  Object.assign(ball.current, { mode: "held", charging: false, live: false });
  emit("sound", { id: "ball-grab" });
 };

 // Se acabó la racha: el tiro no ha entrado.
 const miss = (text) => {
  const b = ball.current;
  b.live = false;
  if (text) emit("toast", { text, at: { x: RIM.x - 0.4, y: RIM.y + 2.2, z: RIM.z } });
  if (b.streak > 0) {
   b.streak = 0;
   emit("basket", { score: game.score, streak: 0 });
  }
 };

 const beginCharge = () => {
  const b = ball.current;
  if (b.mode !== "held") {
   emit("toast", { text: "Coge antes el balón", at: { x: ballStand.x, y: 2.6, z: ballStand.z } });
   return;
  }
  if (!inRange()) {
   emit("toast", { text: "Acércate a la canasta", at: { x: player.position.x, y: player.position.y + 2.6, z: player.position.z } });
   return;
  }
  if (b.charging) return;
  Object.assign(b, { charging: true, chargeTime: 0, charge: 0 });
 };

 // Tira con la fuerza `charge` (0…1). `exact`: sin la dispersión del pulso (pruebas).
 const shoot = (charge, exact = false) => {
  const b = ball.current;
  if (b.mode !== "held") return;
  const feet = player.position;
  // Sale de las manos, por encima de la cabeza, en parábola hacia el aro.
  b.position.set(feet.x, feet.y + 2, feet.z);
  const distance = toRim();
  // Cuanto más lejos, más se desvía.
  const spread = exact ? 0 : 0.02 + Math.max(0, distance - 4) * 0.03;
  const targetX = RIM.x + (Math.random() - 0.5) * 2 * spread;
  const targetZ = RIM.z + (Math.random() - 0.5) * 2 * spread;
  const time = THREE.MathUtils.clamp(0.6 + distance * 0.12, 0.85, 1.7);
  // La velocidad justa para caer en el aro, y más o menos según la carga.
  const power = 1 + (charge - idealCharge(distance)) * CHARGE_GAIN;
  b.velocity.set((targetX - b.position.x) / time, (RIM.y + 0.03 - b.position.y + 0.5 * BALL_GRAVITY * time * time) / time, (targetZ - b.position.z) / time).multiplyScalar(power);
  player.facing = Math.atan2(-(RIM.x - feet.x), -(RIM.z - feet.z));
  Object.assign(b, { mode: "free", untouchable: 0.5, idle: 0, charging: false, live: true, charge });
  // La barrera salta, con un respiro de reacción y más o menos impulso.
  blocker.wait = 0.1 + Math.random() * 0.12;
  blocker.power = 3.9 + Math.random() * 1.1;
  emit("sound", { id: "ball-throw" });
 };

 const grabClick = useInteractable({
  position: () => ball.current.position,
  radius: GRAB_DISTANCE,
  hint: "Coger el balón",
  enabled: () => ball.current.mode !== "held",
  action: grab,
 });
 // Con el balón en la mano, la acción es cargar el tiro: se mantiene y se suelta.
 useInteractable({
  position: () => player.position,
  radius: 1,
  priority: 1,
  hint: () => (inRange() ? "Mantén pulsado y suelta: tirar a canasta" : "Acércate a la canasta para tirar"),
  enabled: () => ball.current.mode === "held",
  action: beginCharge,
 });

 useEffect(() => {
  const b = ball.current;
  const keys = held.current;
  const onKeyDown = (event) => event.code === "KeyE" && (keys.key = true);
  const onKeyUp = (event) => event.code === "KeyE" && (keys.key = false);
  // Con el ratón o el dedo: pulsar sobre la escena carga; soltar, tira. (El
  // botón «Usar» de la pantalla táctil también cuenta como pulsación mantenida.)
  const onPointerDown = (event) => {
   keys.pointer = true;
   if (event.target instanceof HTMLCanvasElement && b.mode === "held" && inRange()) beginCharge();
  };
  const onPointerUp = () => (keys.pointer = false);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("blur", onPointerUp);
  if (import.meta.env.DEV) {
   // Para las pruebas automáticas.
   window.__world.ball = b;
   window.__world.court = { blocker, RIM, fence, idealCharge: () => idealCharge(toRim()), shoot: (charge) => shoot(charge, true), home: toStand, rate: CHARGE_RATE };
  }
  return () => {
   window.removeEventListener("keydown", onKeyDown);
   window.removeEventListener("keyup", onKeyUp);
   window.removeEventListener("pointerdown", onPointerDown);
   window.removeEventListener("pointerup", onPointerUp);
   window.removeEventListener("pointercancel", onPointerUp);
   window.removeEventListener("blur", onPointerUp);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 useFrame(({ clock, camera }, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  const b = ball.current;
  const p = b.position;
  const feet = player.position;
  b.untouchable = Math.max(0, b.untouchable - dt);
  b.scoreLock = Math.max(0, b.scoreLock - dt);

  if (b.mode === "held") {
   // En las manos, delante del cuerpo, con un pequeño bote; al cargar, arriba.
   const forwardX = -Math.sin(player.facing);
   const forwardZ = -Math.cos(player.facing);
   const lift = b.charging ? 1.55 + b.charge * 0.3 : 0.95 + Math.abs(Math.sin(clock.elapsedTime * 5)) * 0.12;
   p.set(feet.x + forwardX * (b.charging ? 0.3 : 0.55), feet.y + lift, feet.z + forwardZ * (b.charging ? 0.3 : 0.55));
   if (b.charging) {
    // Sube y baja en vaivén: hay que soltar en su punto.
    b.chargeTime += dt;
    const swing = (b.chargeTime * CHARGE_RATE) % 2;
    b.charge = swing < 1 ? swing : 2 - swing;
    player.facing = Math.atan2(-(RIM.x - feet.x), -(RIM.z - feet.z));
    if (!held.current.key && !held.current.pointer) shoot(b.charge);
    else if (b.chargeTime > 6 || !inRange()) b.charging = false;
   }
   // Si te lo llevas lejos o subes a la nave, vuelve a su sitio.
   if (player.hidden || Math.hypot(feet.x - center.x, feet.z - center.z) > MAX_DISTANCE) toStand();
  } else if (b.mode === "free") {
   // Pasos cortos para que no atraviese el aro.
   const steps = Math.ceil(dt / (1 / 120));
   for (let i = 0; i < steps; i++) {
    what.scored = what.floor = what.rim = what.blocked = false;
    stepBall(p, b.velocity, dt / steps, what);
    if (what.rim) emit("net", { amount: 0.3, x: b.velocity.x, z: b.velocity.z });
    if (what.scored && b.scoreLock <= 0) {
     b.scoreLock = 1;
     b.live = false;
     b.streak += 1;
     game.score += 1;
     game.streak = b.streak;
     emit("net", { amount: 1, x: b.velocity.x, z: b.velocity.z });
     emit("score", { score: game.score });
     emit("basket", { score: game.score, streak: b.streak });
     emit("toast", { text: b.streak > 1 ? `¡Canasta! ${game.score} · racha de ${b.streak}` : `¡Canasta! ${game.score}`, at: { x: RIM.x - 0.4, y: RIM.y + 2.2, z: RIM.z } });
    } else if (b.live && what.blocked) miss("¡Tapón!");
    else if (b.live && what.floor) miss(b.charge < idealCharge(Math.hypot(RIM.x - feet.x, RIM.z - feet.z)) ? "Corto: más fuerza" : "Largo: menos fuerza");
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
   if (b.idle > IDLE_BEFORE_RETURN && !nearPlayer) toStand();

   if (speed > 0.05) {
    spin.axis.set(b.velocity.z, 0, -b.velocity.x).normalize();
    spin.turn.setFromAxisAngle(spin.axis, (speed * dt) / BALL_RADIUS);
    mesh.current.quaternion.premultiply(spin.turn);
   }
  }

  mesh.current.position.copy(p);
  // Sombra de contacto: se encoge y aclara cuanto más alto está.
  const ground = Math.max(terrainHeight(p.x, p.z), WATER_LEVEL);
  const height = Math.max(0, p.y - BALL_RADIUS - ground);
  shadow.current.visible = b.mode === "free";
  shadow.current.position.set(p.x, ground + 0.075, p.z);
  shadow.current.scale.setScalar(1 + height * 0.3);
  shadow.current.material.opacity = 0.4 / (1 + height * 1.4);

  // Indicador de fuerza: una barra junto al astronauta, de cara a la cámara,
  // con la franja verde donde hay que soltar.
  meter.current.visible = b.charging;
  if (b.charging) {
   meter.current.position.set(feet.x + 0.95, feet.y + 1.25, feet.z);
   meter.current.quaternion.copy(camera.quaternion);
   fill.current.scale.y = Math.max(0.001, b.charge);
   fill.current.position.y = -METER.height / 2 + (b.charge * METER.height) / 2;
   const ideal = idealCharge(toRim());
   sweet.current.position.y = -METER.height / 2 + ideal * METER.height;
   // Dentro de la franja, la barra se pone verde.
   fill.current.material.color.set(Math.abs(b.charge - ideal) < METER.band / 2 ? "#5fe07a" : b.charge > ideal ? "#ff6a4a" : "#ffcf4a");
  }
 });

 return (
  <>
   <mesh ref={mesh} name="balón" castShadow>
    <sphereGeometry args={[BALL_RADIUS, 24, 16]} />
    <meshLambertMaterial map={texture} />
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
   <group ref={meter} visible={false} renderOrder={20}>
    <mesh>
     <planeGeometry args={[METER.width + 0.08, METER.height + 0.08]} />
     <meshBasicMaterial color="#1c1a22" transparent opacity={0.88} depthTest={false} toneMapped={false} fog={false} />
    </mesh>
    <mesh ref={sweet} position-z={0.002}>
     <planeGeometry args={[METER.width + 0.16, METER.height * METER.band]} />
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
// La barra de fuerza. `band`: ancho de la franja buena, en carga (0…1).
const METER = { width: 0.16, height: 1.3, band: 0.14 };

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
  const frame = lambert();
  // La red cuelga del aro: arriba no se mueve; abajo se va con el balón, se
  // estira y se sacude.
  const net = new MeshLambertNodeMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const hang = positionLocal.y.negate().div(NET_DEPTH).clamp(0, 1);
  const sway = hang.mul(hang).mul(swish.z);
  const shake = sin(uniforms.uTime.mul(21)).mul(0.5);
  net.positionNode = positionLocal.add(vec3(swish.x.add(shake).mul(sway).mul(0.75), positionLocal.y.mul(swish.z).mul(0.34), swish.y.add(shake.mul(0.6)).mul(sway).mul(0.75)));
  const rim = new THREE.MeshLambertMaterial({ color: "#ff5a2e", emissive: "#ff5a2e", emissiveIntensity: 0.4 });
  return { frame, net, rim };
 }, [swish]);

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
   <mesh position={[RIM.x, RIM.y + 0.01, RIM.z]} rotation-x={Math.PI / 2} material={material.rim}>
    <torusGeometry args={[RIM_RADIUS, 0.022, 6, 24]} />
   </mesh>
   {/* Marcador, sobre el tablero e inclinado hacia la cámara. */}
   <mesh position={[RIM.x + 0.75, RIM.y + 1.72, RIM.z]} rotation-x={-0.5}>
    <planeGeometry args={[3.0, 0.75]} />
    <meshBasicMaterial map={score.texture} toneMapped={false} fog={false} />
   </mesh>
  </group>
 );
}

// La barrera: un maniquí de entrenamiento con los brazos en alto.
function Blocker() {
 const group = useRef(null);
 useFrame((_, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  // Se pone en la línea entre el tirador y el aro, sin alejarse de él.
  const target = RIM.z + THREE.MathUtils.clamp((player.position.z - RIM.z) * 0.32, -1.1, 1.1);
  blocker.z += THREE.MathUtils.clamp(target - blocker.z, -dt * 1.6, dt * 1.6);
  if (blocker.wait >= 0) {
   blocker.wait -= dt;
   if (blocker.wait < 0 && blocker.y === 0) blocker.vy = blocker.power;
  }
  if (blocker.y > 0 || blocker.vy > 0) {
   blocker.vy -= BALL_GRAVITY * dt;
   blocker.y = Math.max(0, blocker.y + blocker.vy * dt);
   if (blocker.y === 0) blocker.vy = 0;
  }
  group.current.visible = blocker.active;
  blockerCollider.z = blocker.z;
  group.current.position.set(blocker.x, 0.06 + blocker.y, blocker.z);
  // Se encoge un poco antes de saltar y al caer.
  group.current.scale.y = blocker.wait >= 0 && blocker.y === 0 ? 0.93 : 1;
 });
 const body = <meshLambertMaterial color="#e8662a" flatShading />;
 const dark = <meshLambertMaterial color="#2c2f36" flatShading />;
 return (
  <group ref={group} name="barrera de la pista" rotation-y={-Math.PI / 2}>
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
   <Blocker />
   <BallStand />
   <Ball />
  </Staged>
 );
}
