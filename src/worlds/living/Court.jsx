import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { clickable, useInteractable } from "../../experience/interact";
import { emit, events, game, player } from "../../experience/state";
import { createBackboardTexture, createBasketballTexture } from "../../experience/textures";
import { PLAYER_RADIUS } from "../collision";
import { BASKET, COLORS, COURT, WATER_LEVEL, height as terrainHeight } from "./layout";

// Pista de baloncesto: un balón que se coge y se tira a canasta, con marcador.
// (El minijuego completo —apuntado, triples, defensores— llega en su fase.)

const COLOR = COLORS.deporte;
const { hoop, ballStand, center } = BASKET;
const court = COURT;

// ── Balón ───────────────────────────────────────────────────────────────────
const BALL_RADIUS = 0.2; // mayor que uno real: se ve desde arriba
const BALL_GRAVITY = 11;
const GRAB_DISTANCE = 2.3;
const MAX_DISTANCE = 15; // si se aleja más de la pista, vuelve a su soporte
const IDLE_BEFORE_RETURN = 7; // s parado antes de volver solo
const RIM_RADIUS = 0.37; // aro generoso: el balón también es más grande de lo normal
const RIM = { x: hoop.x - 0.25 - RIM_RADIUS, y: hoop.rimHeight, z: hoop.z };
const BOARD = { x: hoop.x, y: hoop.rimHeight + 0.5, z: hoop.z, half: [0.04, 0.65, 1.05] };
const STAND_TOP = 0.95;
const HOME = [ballStand.x, STAND_TOP + BALL_RADIUS, ballStand.z];
// Cilindros con los que choca el balón: su soporte y el poste.
const PILLARS = [
 { x: ballStand.x, z: ballStand.z, r: 0.2, h: STAND_TOP - 0.06 },
 { x: hoop.x + 0.6, z: hoop.z, r: 0.14, h: 4.4 },
];

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
 if (strength > 0.06) emit("sound", { id, x: at.x, z: at.z, strength });
}

// Un paso de física: gravedad, suelo, tablero, aro y pilares. Devuelve true si
// en este paso el balón ha entrado por el aro.
function stepBall(p, v, dt) {
 const previousY = p.y;
 let scored = false;
 v.y -= BALL_GRAVITY * dt;
 p.addScaledVector(v, dt);

 const floor = Math.max(terrainHeight(p.x, p.z), WATER_LEVEL) + BALL_RADIUS;
 if (p.y < floor) {
  p.y = floor;
  if (v.y < -0.9) hit("ball-floor", p, -v.y / 7);
  v.y = v.y < -0.9 ? -v.y * 0.72 : 0;
  const grip = Math.exp(-1.3 * dt); // rodadura
  v.x *= grip;
  v.z *= grip;
 }

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
  hit("ball-rim", p, bounce(v, ox / d, oy / d, oz / d, 0.5) / 5);
 }
 // Canasta: el centro cruza el plano del aro hacia abajo, por dentro.
 if (previousY > RIM.y && p.y <= RIM.y && v.y < 0 && flat < RIM_RADIUS - 0.03) scored = true;

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
 return scored;
}

// El balón tiene tres estados claros, y solo uno a la vez:
//  · "stand": quieto en su soporte;
//  · "held": en las manos del astronauta;
//  · "free": suelto, con física.
function Ball() {
 const mesh = useRef(null);
 const shadow = useRef(null);
 const texture = useMemo(() => createBasketballTexture(), []);
 useEffect(() => () => texture.dispose(), [texture]);

 const ball = useRef({
  mode: "stand",
  position: new THREE.Vector3(...HOME),
  velocity: new THREE.Vector3(),
  idle: 0,
  untouchable: 0, // s sin chocar con el jugador, tras tirar
  scoreLock: 0,
 });
 const spin = useMemo(() => ({ axis: new THREE.Vector3(), turn: new THREE.Quaternion() }), []);

 const toStand = () => {
  const b = ball.current;
  b.mode = "stand";
  b.position.set(...HOME);
  b.velocity.set(0, 0, 0);
  b.idle = 0;
 };

 const grab = () => {
  ball.current.mode = "held";
  emit("sound", { id: "ball-grab" });
 };

 const shoot = () => {
  const b = ball.current;
  if (b.mode !== "held") {
   emit("toast", { text: "Coge antes el balón" });
   return;
  }
  const feet = player.position;
  // Sale de las manos, por encima de la cabeza, en parábola hacia el aro.
  b.position.set(feet.x, feet.y + 2, feet.z);
  const distance = Math.hypot(RIM.x - feet.x, RIM.z - feet.z);
  // Cuanto más lejos, más se desvía.
  const spread = 0.02 + Math.max(0, distance - 4) * 0.045;
  const targetX = RIM.x + (Math.random() - 0.5) * 2 * spread;
  const targetZ = RIM.z + (Math.random() - 0.5) * 2 * spread;
  const time = THREE.MathUtils.clamp(0.6 + distance * 0.12, 0.85, 1.7);
  b.velocity.set(
   (targetX - b.position.x) / time,
   (RIM.y + 0.03 - b.position.y + 0.5 * BALL_GRAVITY * time * time) / time,
   (targetZ - b.position.z) / time,
  );
  player.facing = Math.atan2(-(RIM.x - feet.x), -(RIM.z - feet.z));
  b.mode = "free";
  b.untouchable = 0.5;
  b.idle = 0;
  emit("sound", { id: "ball-throw" });
 };

 const grabClick = useInteractable({
  position: () => ball.current.position,
  radius: GRAB_DISTANCE,
  hint: "Coger el balón",
  enabled: () => ball.current.mode !== "held",
  action: grab,
 });
 // Con el balón en la mano, la acción es tirar, estés donde estés.
 useInteractable({
  position: () => player.position,
  radius: 1,
  priority: 1,
  hint: "Tirar a canasta",
  enabled: () => ball.current.mode === "held",
  action: shoot,
 });

 useEffect(() => {
  if (import.meta.env.DEV) window.__world.ball = ball.current; // para las pruebas automáticas
  // Clic en la canasta: pide un tiro.
  events.addEventListener("shoot", shoot);
  return () => events.removeEventListener("shoot", shoot);
 }, []);

 useFrame(({ clock }, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  const b = ball.current;
  const p = b.position;
  const feet = player.position;
  b.untouchable = Math.max(0, b.untouchable - dt);
  b.scoreLock = Math.max(0, b.scoreLock - dt);

  if (b.mode === "held") {
   // En las manos, delante del cuerpo, con un pequeño bote.
   const forwardX = -Math.sin(player.facing);
   const forwardZ = -Math.cos(player.facing);
   p.set(feet.x + forwardX * 0.55, feet.y + 0.95 + Math.abs(Math.sin(clock.elapsedTime * 5)) * 0.12, feet.z + forwardZ * 0.55);
   // Si te lo llevas lejos o subes a la nave, vuelve a su sitio.
   if (player.hidden || Math.hypot(feet.x - center.x, feet.z - center.z) > MAX_DISTANCE) toStand();
  } else if (b.mode === "free") {
   // Pasos cortos para que no atraviese el aro.
   const steps = Math.ceil(dt / (1 / 120));
   for (let i = 0; i < steps; i++) {
    if (stepBall(p, b.velocity, dt / steps) && b.scoreLock <= 0) {
     b.scoreLock = 1;
     game.score += 1;
     emit("score", { score: game.score });
    }
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

   const speed = b.velocity.length();
   b.idle = speed < 0.3 ? b.idle + dt : 0;
   const away = Math.hypot(p.x - center.x, p.z - center.z);
   const nearPlayer = Math.hypot(p.x - feet.x, p.z - feet.z) < GRAB_DISTANCE + 1;
   if (away > MAX_DISTANCE || (b.idle > IDLE_BEFORE_RETURN && !nearPlayer)) toStand();

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
  shadow.current.position.set(p.x, ground + 0.04, p.z);
  shadow.current.scale.setScalar(1 + height * 0.3);
  shadow.current.material.opacity = 0.4 / (1 + height * 1.4);
 });

 return (
  <>
   <mesh ref={mesh} castShadow>
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
  </>
 );
}

// ── Canasta ─────────────────────────────────────────────────────────────────
function createScoreTexture() {
 const canvas = document.createElement("canvas");
 canvas.width = 512;
 canvas.height = 160;
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 const draw = (score) => {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#3a2619";
  ctx.fillRect(0, 0, 512, 160);
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e3c9a3";
  ctx.font = '700 34px "Bricolage Grotesque", sans-serif';
  if ("letterSpacing" in ctx) ctx.letterSpacing = "8px";
  ctx.fillText("CANASTAS", 36, 84);
  ctx.fillStyle = "#ffcf4a";
  ctx.font = '800 112px "Bricolage Grotesque", sans-serif';
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  ctx.textAlign = "right";
  ctx.fillText(String(score).padStart(2, "0"), 478, 88);
  ctx.textAlign = "left";
  texture.needsUpdate = true;
 };
 draw(game.score);
 document.fonts?.load('800 112px "Bricolage Grotesque"').then(() => draw(game.score), () => {});
 return { texture, draw };
}

function Hoop() {
 const net = useRef(null);
 const flash = useRef(0);
 const board = useMemo(() => createBackboardTexture("#ff4f3a"), []);
 const score = useMemo(createScoreTexture, []);
 const rim = useMemo(() => new THREE.MeshLambertMaterial({ color: "#ff5a2e", emissive: "#ff5a2e", emissiveIntensity: 0.4 }), []);

 useEffect(() => {
  const onScore = (event) => {
   score.draw(event.detail.score);
   flash.current = 1;
  };
  events.addEventListener("score", onScore);
  return () => {
   events.removeEventListener("score", onScore);
   board.dispose();
   score.texture.dispose();
   rim.dispose();
  };
 }, [board, score, rim]);

 useFrame((_, delta) => {
  // Al encestar, la red da un tirón y el aro destella.
  flash.current = Math.max(0, flash.current - delta * 1.8);
  const pulse = Math.sin(flash.current * Math.PI);
  net.current.scale.set(1 - pulse * 0.18, 1 + pulse * 0.4, 1 - pulse * 0.18);
  rim.emissiveIntensity = 0.4 + flash.current * 3;
 });

 const dark = <meshLambertMaterial color="#5a3b28" flatShading />;
 const poleX = hoop.x + 0.6;
 return (
  <group>
   <mesh position={[poleX, 2.15, hoop.z]} castShadow>
    <boxGeometry args={[0.2, 4.3, 0.2]} />
    {dark}
   </mesh>
   <mesh position={[hoop.x + 0.3, BOARD.y, hoop.z]}>
    <boxGeometry args={[0.6, 0.14, 0.14]} />
    {dark}
   </mesh>
   <mesh position={[poleX, 0.1, hoop.z]} castShadow>
    <cylinderGeometry args={[0.5, 0.62, 0.2, 8]} />
    {dark}
   </mesh>
   <mesh position={[BOARD.x, BOARD.y, BOARD.z]} rotation-y={-Math.PI / 2} castShadow>
    <boxGeometry args={[BOARD.half[2] * 2, BOARD.half[1] * 2, BOARD.half[0] * 2]} />
    <meshLambertMaterial map={board} />
   </mesh>
   <mesh position={[RIM.x, RIM.y, RIM.z]} rotation-x={Math.PI / 2} material={rim}>
    <torusGeometry args={[RIM_RADIUS, 0.025, 6, 24]} />
   </mesh>
   <group position={[RIM.x, RIM.y, RIM.z]}>
    <mesh ref={net} position-y={-0.26}>
     <cylinderGeometry args={[RIM_RADIUS, RIM_RADIUS * 0.6, 0.52, 12, 3, true]} />
     <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.8} />
    </mesh>
   </group>
   {/* Marcador, inclinado hacia la cámara. */}
   <mesh position={[BOARD.x + 0.2, BOARD.y + 1.35, BOARD.z]} rotation-x={-0.55}>
    <planeGeometry args={[2.6, 0.81]} />
    <meshBasicMaterial map={score.texture} toneMapped={false} fog={false} />
   </mesh>
   {/* Zona de clic generosa alrededor del tablero y el aro: pide un tiro. */}
   <mesh position={[BOARD.x - 0.35, BOARD.y - 0.1, BOARD.z]} {...clickable(() => emit("shoot"))}>
    <boxGeometry args={[1.7, 2.6, 2.8]} />
    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
   </mesh>
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
  <group>
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
  <group position={[ballStand.x, 0, ballStand.z]}>
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

export function Court() {
 return (
  <>
   <CourtFloor />
   <Hoop />
   <BallStand />
   <Ball />
  </>
 );
}
