import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { boardCard, resultCard } from "../../content/triples";
import { useInteractable } from "../../experience/interact";
import { fitText } from "../../experience/fitText";
import { lambert } from "../../experience/materials";
import { emit, events, player, rig, ui, woody } from "../../experience/state";
import { createBasketballTexture } from "../../experience/textures";
import { noteResult, peekTop } from "../../game/scores";
import { TRIPLES, triples } from "../../game/triples";
import { fontReady } from "../../ui/fonts";
import { BALL_RADIUS, MONEY_COLOR, RIM, court, guard, marker, play, rim, stepBall } from "./courtPhysics";
import { merge, piece } from "./kit/geometry";
import { WOOD } from "./kit/palette";
import { TRIPLES_BOARD, TRIPLES_SIGN } from "./layout";

// Concurso de triples. Es opcional, como el reto de fútbol: se empieza con la E
// en su cartel, junto a la puerta de la pista. Los defensas se apartan, salen
// cinco carros de cinco balones alrededor de la línea de tres y hay 60 segundos.
// Cada canasta vale un punto; el último balón de cada carro (el azul), dos:
// 30 como mucho. Al acabar los balones de un carro, el astronauta va solo al
// siguiente. El tiro es el de siempre (Court.jsx): aquí solo se reparten los
// balones, se cuenta y se lleva el reloj. Al final, un cartel de madera con la
// puntuación deja guardarla con nombre; el tablón 3D de al lado enseña el top 10.

// ── La línea de tres y los carros ───────────────────────────────────────────
const ARC = 6.2; // radio de la línea de tres
const CORNER = 4.45; // en las esquinas, la línea va recta a esta distancia del eje de la pista
const BEND = Math.asin(CORNER / ARC); // ángulo al que el arco se hace recta
// Desde dónde se tira en cada carro (`angle`: grados desde el eje de la pista)
// y dónde está el carro: detrás del tirador; en las esquinas, a su lado.
const spot = (angle, far = ARC + 0.4) => {
 const a = (angle * Math.PI) / 180;
 const out = { x: -Math.cos(a), z: Math.sin(a) };
 const x = RIM.x + out.x * far, z = RIM.z + out.z * far;
 return { x, z, rack: { x: x + out.x * 1.05, z: z + out.z * 1.05, turn: Math.atan2(-out.x, -out.z) } };
};
const corner = (side) => {
 const x = RIM.x - 0.8, z = RIM.z + side * (CORNER + 0.35);
 return { x, z, rack: { x: x - 1.5, z, turn: 0 } };
};
const SPOTS = [corner(-1), spot(-38), spot(0), spot(38), corner(1)];
const RACK = { top: 0.92, gap: 0.37, ball: 0.85 }; // altura de la bandeja, separación y tamaño de sus balones
const SHOTS = 6; // balones que puede haber a la vez en el aire

function createRack() {
 const steel = "#59626e", dark = "#2f343c", orange = "#e8662a";
 const half = RACK.gap * 2 + 0.26;
 return merge([
  // Bandeja con dos barandillas.
  piece(new THREE.BoxGeometry(half * 2, 0.04, 0.3), { color: dark, position: [0, RACK.top - 0.16, 0] }),
  ...[-1, 1].map((side) => piece(new THREE.BoxGeometry(half * 2, 0.04, 0.04), { color: orange, position: [0, RACK.top - 0.05, side * 0.17] })),
  // Patas y ruedas.
  ...[-1, 1].flatMap((side) => [
   piece(new THREE.BoxGeometry(0.05, RACK.top - 0.2, 0.05), { bottom: dark, top: steel, position: [side * (half - 0.06), (RACK.top - 0.2) / 2 + 0.06, 0] }),
   piece(new THREE.BoxGeometry(0.06, 0.05, 0.5), { color: steel, position: [side * (half - 0.06), 0.11, 0] }),
   ...[-1, 1].map((end) => piece(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 8), { color: dark, position: [side * (half - 0.06), 0.055, end * 0.22], rotation: [0, 0, Math.PI / 2] })),
  ]),
 ]);
}

// ── El cartel y el tablón ───────────────────────────────────────────────────
const SIGN = { ...TRIPLES_SIGN, width: 1.9, height: 0.86, y: 1.42 };
const BOARD = { ...TRIPLES_BOARD, width: 2.7, height: 2.05, y: 1.62 };
const FONT = '"Bricolage Grotesque", system-ui, sans-serif';
function createPosts({ width, height, y }) {
 const span = width / 2 - 0.16;
 return merge([
  ...[-span, span].map((x) => piece(new THREE.CylinderGeometry(0.07, 0.09, y + height / 2 - 0.05, 6), { bottom: WOOD.dark, top: WOOD.mid, position: [x, (y + height / 2 - 0.05) / 2, -0.06] })),
  piece(new THREE.BoxGeometry(width, height, 0.14), { bottom: "#3a2619", top: "#4a3222", position: [0, y, 0] }),
  piece(new THREE.BoxGeometry(width + 0.16, 0.1, 0.2), { color: WOOD.dark, position: [0, y + height / 2 + 0.04, 0] }),
 ]);
}
function canvasFace(width, height, paint) {
 const canvas = document.createElement("canvas");
 canvas.width = width;
 canvas.height = height;
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 texture.anisotropy = 8;
 const draw = (...args) => {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#3a2619";
  ctx.fillRect(0, 0, width, height);
  // Vetas y juntas de los tablones.
  ctx.fillStyle = "rgba(20, 10, 4, 0.35)";
  for (let y = height / 4; y < height - 8; y += height / 4) ctx.fillRect(0, Math.round(y), width, 3);
  ctx.textBaseline = "middle";
  paint(ctx, ...args);
  texture.needsUpdate = true;
 };
 return { texture, draw };
}
const spaced = (ctx, px) => "letterSpacing" in ctx && (ctx.letterSpacing = `${px}px`);
function createSignFace() {
 return canvasFace(760, 344, (ctx) => {
  ctx.textAlign = "center";
  // (Margen fijo de 60 px a los lados: cada renglón se reduce si no cabe.)
  ctx.fillStyle = "#ffcf4a";
  spaced(ctx, 4);
  fitText(ctx, "CONCURSO", { width: 760 - 120, max: 92, min: 60, lines: 1, font: (px) => `800 ${px}px ${FONT}`, where: "cartel de triples" });
  ctx.fillText("CONCURSO", 380, 120);
  ctx.fillStyle = "#f4ead8";
  fitText(ctx, "DE TRIPLES", { width: 760 - 120, max: 78, min: 52, lines: 1, font: (px) => `800 ${px}px ${FONT}`, where: "cartel de triples" });
  ctx.fillText("DE TRIPLES", 380, 232);
 });
}
// El tablón: «TOP 10 · TRIPLES» y las diez mejores, en dos columnas. `top`: { rows, mode } o null (aún no se ha pedido).
function createBoardFace() {
 return canvasFace(1080, 820, (ctx, top) => {
  ctx.textAlign = "center";
  // El título, con margen fijo (70 px arriba y a los lados): antes iba pegado al
  // canto de arriba y la viga del tablón lo tapaba por arriba.
  ctx.fillStyle = "#ffcf4a";
  spaced(ctx, 4);
  const title = fitText(ctx, "TOP 10 · TRIPLES", { width: 1080 - 140, height: 96, max: 88, min: 64, lines: 1, font: (px) => `800 ${px}px ${FONT}`, where: "tablón de triples" });
  ctx.fillText("TOP 10 · TRIPLES", 540, 70 + title.size / 2);
  ctx.fillStyle = "rgba(255, 207, 74, 0.5)";
  ctx.fillRect(70, 184, 940, 5);
  spaced(ctx, 0);
  if (!top || !top.rows.length) {
   ctx.fillStyle = "#f4ead8";
   ctx.font = `700 56px ${FONT}`;
   const lines = top ? ["Aún no hay puntuaciones.", "¡Estrena el tablón!"] : ["Pulsa E para ver", "la clasificación"];
   lines.forEach((line, i) => ctx.fillText(line, 540, 400 + i * 84));
  } else {
   top.rows.forEach((row, i) => {
    const column = i < 5 ? 0 : 1, y = 262 + (i % 5) * 100, x = 50 + column * 510;
    ctx.textAlign = "left";
    ctx.fillStyle = i < 3 ? "#ffcf4a" : "#c9a66d";
    ctx.font = `800 54px ${FONT}`;
    ctx.fillText(String(i + 1), x, y);
    ctx.fillStyle = "#f4ead8";
    ctx.font = `700 50px ${FONT}`;
    ctx.fillText(row.name, x + 74, y, 300);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffcf4a";
    ctx.font = `800 58px ${FONT}`;
    ctx.fillText(String(row.score), x + 470, y);
   });
  }
  if (top?.mode === "local") {
   ctx.textAlign = "center";
   ctx.fillStyle = "#c9a66d";
   ctx.font = `700 38px ${FONT}`;
   ctx.fillText("Solo en este dispositivo", 540, 776);
  }
 });
}

export function Triples() {
 const racks = useRef(null);
 const rackBalls = useRef([]);
 const flying = useRef([]);
 const memo = useRef({ move: false, moving: 0, over: 0, count: 0 });
 const shots = useMemo(() => Array.from({ length: SHOTS }, () => ({ live: false, position: new THREE.Vector3(), velocity: new THREE.Vector3(), value: 1, age: 0, scored: false, resolved: true })), []);
 const what = useMemo(() => ({ scored: false, floor: false, rim: 0, blocked: false }), []);
 const turn = useMemo(() => ({ axis: new THREE.Vector3(), q: new THREE.Quaternion() }), []);
 const focus = useMemo(() => ({ x: 0, y: 1, z: 0 }), []);
 const models = useMemo(() => {
  const plain = new THREE.MeshLambertMaterial({ map: createBasketballTexture() });
  const money = new THREE.MeshLambertMaterial({ map: createBasketballTexture(MONEY_COLOR) });
  const sign = createSignFace(), board = createBoardFace();
  return { rack: createRack(), ball: new THREE.SphereGeometry(BALL_RADIUS, 16, 12), plain, money, wood: lambert(), signPosts: createPosts(SIGN), boardPosts: createPosts(BOARD), sign, board, line: new THREE.MeshBasicMaterial({ color: "#fff6e8" }) };
 }, []);

 const api = useMemo(() => {
  const state = memo.current;
  // Fuera de concurso: todo como estaba.
  const leave = () => {
   if (triples.phase === "idle") return;
   triples.phase = "idle";
   Object.assign(play, { contest: false, launch: null });
   guard.active = marker.active = true;
   Object.assign(player, { pinned: false, auto: null });
   play.toStand?.();
   woody.post = null;
   if (rig.focus === focus) Object.assign(rig, { focus: null, distance: 1 });
   for (const shot of shots) shot.live = false;
   emit("triples", { type: "exit" });
  };
  // El balón soltado: pasa a ser uno de los que vuelan, con su valor.
  const launch = (position, velocity, timing, money) => {
   const shot = shots.find((one) => !one.live) ?? shots.reduce((old, one) => (one.age > old.age ? one : old));
   shot.position.copy(position);
   shot.velocity.copy(velocity);
   Object.assign(shot, { live: true, value: money ? TRIPLES.money : 1, age: 0, scored: false, resolved: false });
   triples.ball += 1;
   if (triples.ball >= TRIPLES.balls) state.move = true;
   emit("triples", { type: "shot", rack: triples.rack, ball: triples.ball });
  };
  const start = () => {
   if (triples.phase !== "idle" || player.hidden || !play.ball) return;
   play.toStand();
   Object.assign(play.ball, { mode: "held", empty: true, money: false });
   Object.assign(play, { contest: true, launch, holding: false });
   guard.active = marker.active = false;
   Object.assign(triples, { phase: "count", time: TRIPLES.countdown, score: 0, rack: 0, ball: 0, game: triples.game + 1 });
   Object.assign(state, { move: false, moving: 0, over: 0, count: TRIPLES.countdown + 1 });
   Object.assign(player, { pinned: true, auto: { x: SPOTS[0].x, z: SPOTS[0].z } });
   // Woody mira desde fuera de la línea.
   woody.post = { x: RIM.x - ARC - 2.4, z: RIM.z + 3.4, look: RIM };
   focus.x = player.position.x;
   focus.z = player.position.z;
   Object.assign(rig, { focus, distance: 1.06 });
   emit("triples", { type: "enter" });
  };
  // Se acabó (el tiempo o los balones): bocina, y a esperar a los balones que aún vuelan.
  const finish = () => {
   if (triples.phase !== "play" && triples.phase !== "count") return;
   Object.assign(triples, { phase: "over", time: 0 });
   state.over = 0;
   if (play.ball) play.ball.empty = true;
   emit("sound", { id: "triples-horn" });
   emit("triples", { type: "over" });
  };
  const conclude = () => {
   const score = triples.score, game = triples.game;
   noteResult(score);
   emit("triples", { type: "end", score });
   leave();
   if (score > 0) emit("woody-cheer");
   // (La cámara se acerca a la canasta mientras se abre el cartel.)
   emit("open", { ...resultCard(score, game), at: { x: RIM.x - 2.4, y: 1.4, z: RIM.z, distance: 0.8 } });
  };
  return { start, leave, finish, conclude };
 }, [shots, focus]);

 useInteractable({
  position: { x: SIGN.x, z: SIGN.z + 1.2 },
  radius: 2.1,
  sign: { x: SIGN.x, y: SIGN.y + 0.9, z: SIGN.z },
  hint: "Concurso de triples",
  enabled: () => triples.phase === "idle" && !player.hidden,
  action: api.start,
 });
 useInteractable({
  position: { x: BOARD.x, z: BOARD.z + 1.3 },
  radius: 2.2,
  sign: { x: BOARD.x, y: BOARD.y + BOARD.height / 2 + 0.5, z: BOARD.z },
  hint: "Ver el top 10",
  enabled: () => triples.phase === "idle" && !player.hidden,
  action: () => emit("open", { ...boardCard(), at: { x: BOARD.x, y: BOARD.y, z: BOARD.z, distance: 0.7 } }),
 });

 useEffect(() => {
  // El tablón enseña lo que se sepa del top: al montarse (en modo local, lo del
  // navegador; en remoto, nada hasta que se abra) y cada vez que se lea o se guarde.
  const paint = () => models.board.draw(peekTop());
  models.sign.draw();
  paint();
  fontReady(`800 96px ${FONT}`).then(() => {
   models.sign.draw();
   paint();
  });
  const onTriples = (event) => ["top", "saved"].includes(event.detail?.type) && paint();
  const onCommand = (event) => event.detail?.command === "exit" && api.leave();
  // Esc sale del concurso, no pausa todo el portfolio. (En captura: antes que la pausa de App.jsx.)
  const onKey = (event) => {
   if (event.key !== "Escape" || ui.open || triples.phase === "idle") return;
   event.stopImmediatePropagation();
   api.leave();
  };
  events.addEventListener("triples", onTriples);
  events.addEventListener("triples-command", onCommand);
  window.addEventListener("keydown", onKey, true);
  // Para las pruebas automáticas.
  if (import.meta.env.DEV) window.__world.triples = { state: triples, rules: TRIPLES, spots: SPOTS, shots, start: api.start, leave: api.leave, finish: api.finish, board: BOARD, sign: SIGN };
  return () => {
   api.leave();
   events.removeEventListener("triples", onTriples);
   events.removeEventListener("triples-command", onCommand);
   window.removeEventListener("keydown", onKey, true);
   for (const one of [models.rack, models.ball, models.plain.map, models.plain, models.money.map, models.money, models.wood, models.signPosts, models.boardPosts, models.sign.texture, models.board.texture, models.line]) one.dispose();
  };
 }, [api, models, shots]);

 useFrame((_, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  const state = memo.current;
  const b = play.ball;
  const on = triples.phase !== "idle";
  racks.current.visible = on;
  if (on && b) {
   const feet = player.position;
   const clock = ui.open ? 0 : dt; // (con una carta abierta, el reloj espera)
   const here = SPOTS[triples.rack];
   // Si algo le impide llegar al carro, no se queda la partida colgada.
   state.moving = player.auto ? state.moving + dt : 0;
   if (state.moving > 3.5) {
    feet.set(here.x, feet.y, here.z);
    player.auto = null;
   }
   if (!player.auto && !b.shot) player.facing = Math.atan2(-(RIM.x - feet.x), -(RIM.z - feet.z));
   // La cámara, entre el tirador y la canasta: se ven los dos.
   focus.x = feet.x + (RIM.x - feet.x) * 0.34;
   focus.z = feet.z + (RIM.z - feet.z) * 0.34;
   focus.y = 1 + feet.y * 0.4;

   if (triples.phase === "count") {
    triples.time -= clock;
    const second = Math.ceil(triples.time);
    if (second !== state.count && second > 0) emit("sound", { id: "triples-count" });
    state.count = second;
    if (triples.time <= 0) {
     Object.assign(triples, { phase: "play", time: TRIPLES.seconds });
     emit("sound", { id: "triples-go" });
     emit("triples", { type: "go" });
    }
   } else if (triples.phase === "play") {
    triples.time -= clock;
    if (state.move && !b.shot) {
     // Carro vacío: al siguiente (o, si era el último, se acabó).
     state.move = false;
     if (triples.rack + 1 >= TRIPLES.racks) api.finish();
     else {
      triples.rack += 1;
      triples.ball = 0;
      player.auto = { x: SPOTS[triples.rack].x, z: SPOTS[triples.rack].z };
      emit("triples", { type: "rack", rack: triples.rack });
     }
    } else if (b.empty && !b.shot && !player.auto && triples.ball < TRIPLES.balls) {
     // Coge el siguiente balón del carro: el último, el de color.
     Object.assign(b, { empty: false, money: triples.ball === TRIPLES.balls - 1 });
     emit("sound", { id: "ball-grab" });
    }
    if (triples.phase === "play" && triples.time <= 0) api.finish();
   } else if (triples.phase === "over") {
    state.over += dt;
    if ((state.over > 0.9 && shots.every((shot) => !shot.live || shot.resolved)) || state.over > 3.5) api.conclude();
   }
  }

  // Los balones del carro: los que quedan (el que está en las manos ya no está).
  const taken = triples.ball + (b && !b.empty ? 1 : 0);
  rackBalls.current.forEach((mesh, i) => {
   const rack = Math.floor(i / TRIPLES.balls), index = i % TRIPLES.balls;
   if (mesh) mesh.visible = on && (rack > triples.rack || (rack === triples.rack && index >= taken));
  });

  // Los que vuelan: la misma física que el balón de siempre.
  shots.forEach((shot, i) => {
   const mesh = flying.current[i];
   if (!mesh) return;
   mesh.visible = shot.live;
   if (!shot.live) return;
   shot.age += dt;
   const steps = Math.ceil(dt / (1 / 120));
   for (let k = 0; k < steps; k++) {
    what.scored = what.floor = what.blocked = false;
    what.rim = 0;
    stepBall(shot.position, shot.velocity, dt / steps, what);
    if (what.rim > 0) {
     emit("net", { amount: 0.3, x: shot.velocity.x, z: shot.velocity.z });
     rim.speed += Math.min(1, what.rim) * 2.6;
    }
    if (what.scored && !shot.scored) {
     Object.assign(shot, { scored: true, resolved: true });
     rim.speed += 0.7;
     emit("net", { amount: 1, x: shot.velocity.x, z: shot.velocity.z });
     emit("sound", { id: "ball-net", x: RIM.x, z: RIM.z });
     if (triples.phase !== "idle") {
      triples.score = Math.min(TRIPLES.max, triples.score + shot.value);
      emit("triples", { type: "score", score: triples.score, value: shot.value });
      emit("toast", { text: `+${shot.value}`, at: { x: RIM.x - 0.4, y: RIM.y + 1.9, z: RIM.z } });
      if (shot.value > 1) emit("woody-cheer");
     }
    }
    if (what.floor) shot.resolved = true;
   }
   if (shot.age > 3.4) shot.live = false;
   mesh.position.copy(shot.position);
   mesh.material = shot.value > 1 ? models.money : models.plain;
   const speed = shot.velocity.length();
   if (speed > 0.05) {
    turn.axis.set(shot.velocity.z, 0, -shot.velocity.x).normalize();
    turn.q.setFromAxisAngle(turn.axis, (speed * dt) / BALL_RADIUS);
    mesh.quaternion.premultiply(turn.q);
   }
  });
 });

 const edge = RIM.x - Math.sqrt(ARC * ARC - CORNER * CORNER); // donde el arco se hace recta
 const baseline = court.x1 - 0.3;
 return (
  <>
   {/* La línea de tres: el arco y sus dos rectas de las esquinas. */}
   <group name="línea de tres" position-y={0.071}>
    <mesh position={[RIM.x, 0, RIM.z]} rotation-x={-Math.PI / 2} material={models.line}>
     <ringGeometry args={[ARC - 0.05, ARC + 0.05, 56, 1, Math.PI - BEND, BEND * 2]} />
    </mesh>
    {[-1, 1].map((side) => (
     <mesh key={side} position={[(edge + baseline) / 2, 0, RIM.z + side * CORNER]} rotation-x={-Math.PI / 2} material={models.line}>
      <planeGeometry args={[baseline - edge, 0.1]} />
     </mesh>
    ))}
   </group>

   {/* Los cinco carros, solo durante el concurso. */}
   <group ref={racks} name="carros de triples" visible={false}>
    {SPOTS.map((one, r) => (
     <group key={r} position={[one.rack.x, 0.06, one.rack.z]} rotation-y={one.rack.turn}>
      <mesh geometry={models.rack} material={models.wood} castShadow />
      {Array.from({ length: TRIPLES.balls }, (_, i) => (
       <mesh key={i} ref={(node) => (rackBalls.current[r * TRIPLES.balls + i] = node)} name={i === TRIPLES.balls - 1 ? "balón de color del carro" : "balón del carro"} geometry={models.ball} material={i === TRIPLES.balls - 1 ? models.money : models.plain} position={[(i - (TRIPLES.balls - 1) / 2) * RACK.gap, RACK.top + BALL_RADIUS * RACK.ball - 0.12, 0]} scale={RACK.ball} visible={false} />
      ))}
     </group>
    ))}
   </group>
   {shots.map((_, i) => (
    <mesh key={i} ref={(node) => (flying.current[i] = node)} name="balón del concurso" geometry={models.ball} material={models.plain} visible={false} castShadow />
   ))}

   {/* El cartel que empieza el concurso y el tablón del top 10, junto a la puerta. */}
   <group name="cartel del concurso de triples" userData={{ rests: 0 }} position={[SIGN.x, 0.06, SIGN.z]}>
    <mesh geometry={models.signPosts} material={models.wood} castShadow />
    <mesh position={[0, SIGN.y, 0.075]}>
     <planeGeometry args={[SIGN.width - 0.1, SIGN.height - 0.08]} />
     <meshBasicMaterial map={models.sign.texture} toneMapped={false} fog={false} />
    </mesh>
   </group>
   <group name="tablón de triples" userData={{ rests: 0 }} position={[BOARD.x, 0.06, BOARD.z]}>
    <mesh geometry={models.boardPosts} material={models.wood} castShadow />
    <mesh name="cara del tablón de triples" position={[0, BOARD.y, 0.075]}>
     <planeGeometry args={[BOARD.width - 0.1, BOARD.height - 0.08]} />
     <meshBasicMaterial map={models.board.texture} toneMapped={false} fog={false} />
    </mesh>
   </group>
  </>
 );
}
