import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { spinMesh } from "../../../game/ballPhysics";
import { panelLines } from "../../../game/cloth";
import { useInteractable } from "../../../experience/interact";
import { lambert } from "../../../experience/materials";
import { emit, events, player, releaseMovement, rig, woody } from "../../../experience/state";
import { createLabelTexture } from "../../../experience/textures";
import { Glow } from "../buildings/Glow";
import { merge, piece } from "../kit/geometry";
import { CREAM, STONE, WOOD } from "../kit/palette";
import { PITCH } from "../layout";
import { BALL_RADIUS, GOAL, MODES, TARGET_PLANE, TURF, createMatch, enter, leave, netBulge, release, setAim, setKeeper, startCharge, startMode, strike, toggleWall, update } from "./match";
import { football } from "./shared";

// Fútbol jugable: lo que se ve y se toca del partido que lleva match.js.
// Acercarse y pulsar E entra en el juego: el astronauta se coloca tras el
// balón, la cámara se pone a su espalda mirando a la portería, se apunta con
// el ratón (o el dedo), se carga manteniendo pulsado y se suelta para chutar.

const TROPHY = { x: PITCH.x0 + 6.2, z: PITCH.z0 - 1.9 };
const BOARD = { x: GOAL.x - 0.9, z: GOAL.z - 4.7 };
const KEEPER_X = GOAL.x + 0.5;

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const lathe = (points, sides = 10) => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), sides);

// Balón: blanco con parches oscuros repartidos, dibujado en un lienzo.
function createBallTexture() {
 const canvas = document.createElement("canvas");
 canvas.width = 256;
 canvas.height = 128;
 const ctx = canvas.getContext("2d");
 ctx.fillStyle = "#f7f3ea";
 ctx.fillRect(0, 0, 256, 128);
 ctx.fillStyle = "#2f2a2a";
 const patch = (x, y, r) => {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) ctx.lineTo(x + Math.cos((i / 5) * Math.PI * 2 - Math.PI / 2) * r * 1.6, y + Math.sin((i / 5) * Math.PI * 2 - Math.PI / 2) * r);
  ctx.fill();
 };
 for (let i = 0; i < 6; i++) patch(21 + i * 42.7, 64, 13);
 for (let i = 0; i < 5; i++) {
  patch(42 + i * 51.2, 26, 11);
  patch(16 + i * 51.2, 102, 11);
 }
 ctx.fillRect(0, 0, 256, 5);
 ctx.fillRect(0, 123, 256, 5);
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 return texture;
}

// Maniquí de entrenamiento: base, cuerpo torneado y cabeza; el portero lleva
// además los brazos en alto con guantes.
function createDummy({ shirt, arms = false }) {
 const dark = `#${new THREE.Color(shirt).multiplyScalar(0.7).getHexString()}`;
 const pieces = [
  piece(new THREE.CylinderGeometry(0.3, 0.36, 0.12, 10), { bottom: "#4a4541", top: "#6a635d", position: [0, 0.06, 0] }),
  piece(lathe([[0.13, 0.1], [0.17, 0.5], [0.24, 0.85], [0.29, 1.15], [0.3, 1.38], [0.22, 1.5], [0.1, 1.55]]), { bottom: dark, top: shirt, vary: 0.05 }),
  piece(new THREE.CylinderGeometry(0.31, 0.31, 0.1, 10), { color: CREAM, position: [0, 1.12, 0] }),
  piece(new THREE.IcosahedronGeometry(0.2, 1), { bottom: "#d9c9ae", top: CREAM, vary: 0.04, position: [0, 1.72, 0] }),
 ];
 if (arms) {
  for (const side of [-1, 1]) {
   pieces.push(piece(new THREE.CylinderGeometry(0.07, 0.09, 0.9, 7), { bottom: dark, top: shirt, position: [0, 1.82, side * 0.3], rotation: [side * 0.22, 0, 0] }));
   pieces.push(piece(new THREE.IcosahedronGeometry(0.13, 1), { bottom: "#e8e2d6", top: "#ffffff", position: [0, 2.3, side * 0.4] }));
  }
 }
 return merge(pieces);
}

function createGoalFrame() {
 const white = { bottom: "#e9e6de", top: "#ffffff" };
 const grey = { color: "#8b8d93" };
 const back = -GOAL.depth, h = GOAL.height, half = GOAL.half;
 const tube = (r, length, sides = 10) => new THREE.CylinderGeometry(r, r, length, sides);
 return merge([
  ...[-half, half].map((z) => piece(tube(GOAL.post, h), { ...white, position: [0, h / 2, z] })),
  piece(tube(GOAL.post, half * 2 + GOAL.post * 2), { ...white, position: [0, h, 0], rotation: [Math.PI / 2, 0, 0] }),
  ...[-half, half].flatMap((z) => [piece(tube(0.04, h, 6), { ...grey, position: [back, h / 2, z] }), piece(tube(0.04, GOAL.depth, 6), { ...grey, position: [back / 2, h, z], rotation: [0, 0, Math.PI / 2] })]),
  piece(tube(0.04, half * 2, 6), { ...grey, position: [back, h, 0], rotation: [Math.PI / 2, 0, 0] }),
 ]);
}

// Trofeo propio: copa facetada sobre una columna en espiral, coronada por una
// estrella. No copia ningún trofeo real.
function createTrophy() {
 const gold = { bottom: "#b8802a", top: "#ffd76a", vary: 0.08 };
 const pieces = [
  piece(new THREE.CylinderGeometry(0.2, 0.24, 0.08, 6), { bottom: "#2f6f55", top: "#49a07a", position: [0, 0.04, 0] }),
  piece(new THREE.CylinderGeometry(0.15, 0.19, 0.07, 6), { bottom: "#2f6f55", top: "#49a07a", position: [0, 0.115, 0], rotation: [0, Math.PI / 6, 0] }),
  piece(lathe([[0.1, 0.15], [0.05, 0.22], [0.045, 0.36], [0.08, 0.43], [0.19, 0.55], [0.21, 0.68], [0.17, 0.72], [0.0, 0.7]], 8), gold),
 ];
 // Columna en espiral: tres cintas que suben girando alrededor del fuste.
 for (let i = 0; i < 9; i++) {
  const t = i / 8, angle = t * Math.PI * 1.6;
  for (let k = 0; k < 3; k++) pieces.push(piece(new THREE.IcosahedronGeometry(0.024, 0), { ...gold, position: [Math.cos(angle + (k * Math.PI * 2) / 3) * 0.062, 0.2 + t * 0.2, Math.sin(angle + (k * Math.PI * 2) / 3) * 0.062] }));
 }
 // Estrella de cinco puntas, de pie sobre la copa.
 const star = new THREE.Shape();
 for (let i = 0; i < 10; i++) {
  const r = i % 2 ? 0.045 : 0.11, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
  star[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
 }
 pieces.push(piece(new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02), { bottom: "#e0a23c", top: "#fff0b0", position: [0, 0.84, 0] }));
 return merge(pieces);
}

// Vitrina: peana de piedra, zócalo de madera, cuatro montantes y tejadillo.
function createShowcase() {
 return merge(
  [
   piece(box(1.5, 0.3, 1.1), { bottom: STONE.dark, top: STONE.light, jitter: 0.02, vary: 0.08, position: [0, 0.15, 0] }),
   piece(box(1.3, 0.62, 0.92), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.08, position: [0, 0.61, 0] }),
   piece(box(1.36, 0.08, 0.98), { bottom: WOOD.mid, top: WOOD.pale, position: [0, 0.96, 0] }),
   ...[-0.6, 0.6].flatMap((x) => [-0.4, 0.4].map((z) => piece(box(0.07, 1.25, 0.07), { color: WOOD.dark, position: [x, 1.62, z] }))),
   piece(box(1.5, 0.1, 1.12), { bottom: WOOD.dark, top: WOOD.mid, position: [0, 2.29, 0] }),
   piece(new THREE.ConeGeometry(0.98, 0.42, 4), { bottom: "#7d4a30", top: "#a9683f", vary: 0.06, position: [0, 2.54, 0], rotation: [0, Math.PI / 4, 0], scale: [1, 1, 0.74] }),
   // Cojín sobre el que descansa el trofeo.
   piece(box(0.6, 0.07, 0.5), { bottom: "#7a2f3a", top: "#b8475a", position: [0, 1.035, 0] }),
  ],
  { ground: 0.1, groundHeight: 0.5 },
 );
}

function createBoardFrame() {
 return merge([
  ...[-1.05, 1.05].map((x) => piece(new THREE.CylinderGeometry(0.07, 0.09, 2.5, 6), { bottom: WOOD.dark, top: WOOD.mid, position: [x, 1.25, 0] })),
  piece(box(2.5, 1.5, 0.1), { bottom: "#3a2619", top: "#4a3222", position: [0, 2.1, 0] }),
  piece(box(2.66, 0.1, 0.2), { color: WOOD.dark, position: [0, 2.9, 0] }),
 ]);
}

const FONT = '"Bricolage Grotesque", system-ui, sans-serif';
function createScoreboard() {
 const canvas = document.createElement("canvas");
 canvas.width = 768;
 canvas.height = 448;
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 texture.anisotropy = 8;
 let last = null;
 const draw = (mode, stats) => {
  last = [mode, stats];
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#3a2619";
  ctx.fillRect(0, 0, 768, 448);
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcf4a";
  ctx.font = `800 62px ${FONT}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
  ctx.fillText(MODES[mode].name.toUpperCase(), 384, 62);
  const cells = [["INTENTOS", stats.attempts], ["GOLES", stats.goals], ["PUNTOS", stats.score], [MODES[mode].time ? "TIEMPO" : "QUEDAN", MODES[mode].time ? `${Math.ceil(stats.time)}s` : MODES[mode].shots ? stats.left : "—"]];
  cells.forEach(([label, value], i) => {
   const x = 96 + i * 192;
   ctx.fillStyle = "#e3c9a3";
   ctx.font = `700 30px ${FONT}`;
   if ("letterSpacing" in ctx) ctx.letterSpacing = "3px";
   ctx.fillText(label, x, 170);
   ctx.fillStyle = "#fff6e0";
   ctx.font = `800 104px ${FONT}`;
   if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
   ctx.fillText(String(value), x, 262, 176);
  });
  ctx.fillStyle = "#ffb26a";
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText(stats.last ? `Último: ${stats.last}` : "Apunta, carga y suelta", 384, 384);
  texture.needsUpdate = true;
 };
 document.fonts?.load(`800 104px ${FONT}`).then(() => last && draw(...last), () => {});
 return { texture, draw };
}

const RESULT_TEXT = { "sin diana": "Sin diana", gol: "¡GOOOL!", poste: "¡Al poste!", larguero: "¡Al larguero!", parada: "¡Paradón!", barrera: "A la barrera", alto: "Por encima", fuera: "Fuera", corto: "No llega", diana: "¡Diana!" };
const CONFETTI = 90;
const CONFETTI_COLORS = ["#ff5a4a", "#ffd24a", "#ffffff", "#ff8fb5", "#8fd6ff"];

export function Football() {
 const camera = useThree((state) => state.camera);
 const canvas = useThree((state) => state.gl.domElement);
 const match = useMemo(createMatch, []);
 const ball = useRef(null), shadow = useRef(null), keeper = useRef(null), reticle = useRef(null), netLines = useRef(null), confetti = useRef(null), trophy = useRef(null);
 const wall = useRef([]), targets = useRef([]);
 const focus = useMemo(() => new THREE.Vector3(), []);
 const memo = useRef({ party: 0, pointer: null, charging: false, startX: 0, celebrate: 0 });
 const bits = useMemo(() => Array.from({ length: CONFETTI }, () => ({ x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, turn: 0 })), []);

 const models = useMemo(
  () => ({
   material: lambert(),
   frame: createGoalFrame(),
   keeper: createDummy({ shirt: "#f2a23a", arms: true }),
   dummy: createDummy({ shirt: "#5b8cff" }),
   trophy: createTrophy(),
   showcase: createShowcase(),
   board: createBoardFrame(),
   ballTexture: createBallTexture(),
   gold: lambert({ emissive: new THREE.Color("#ffb24a"), emissiveIntensity: 0 }),
   label: createLabelTexture("ESPAÑA · 2010", CREAM, { title: true }),
  }),
  [],
 );
 const score = useMemo(createScoreboard, []);
 // Red: los cuatro paños en una sola malla de líneas.
 const net = useMemo(() => {
  const total = match.net.reduce((sum, panel) => sum + panel.count, 0);
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(total * 3), 3);
  position.setUsage(THREE.DynamicDrawUsage);
  const index = [];
  let offset = 0;
  for (const panel of match.net) {
   position.array.set(panel.now, offset * 3);
   index.push(...panelLines(panel, offset));
   offset += panel.count;
  }
  geometry.setAttribute("position", position);
  geometry.setIndex(index);
  return { geometry, position };
 }, [match]);

 useEffect(() => {
  football.match = match;
  score.draw(match.mode, match.stats);
  if (import.meta.env.DEV) window.__world.football = { match, enter: () => enterGame(), exit: () => exitGame(), release: (shot) => kick(shot), startMode: (mode) => startMode(match, mode), toggleWall: () => toggleWall(match), setKeeper: (on, skill) => setKeeper(match, on, skill), netBulge: () => netBulge(match), GOAL }; // para las pruebas automáticas
  return () => {
   football.match = null;
   for (const one of Object.values(models)) one.dispose();
   net.geometry.dispose();
   score.texture.dispose();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // ── Entrar, salir y colocar ────────────────────────────────────────────────
 const placePlayer = () => {
  const { spot, toGoal } = match;
  // Un paso por detrás del balón y algo a la izquierda: chuta con la derecha.
  player.position.set(spot.x - toGoal.x * 0.85 + toGoal.z * 0.28, TURF, spot.z - toGoal.z * 0.85 - toGoal.x * 0.28);
  player.velocity.set(0, 0, 0);
  player.facing = Math.atan2(-toGoal.x, -toGoal.z);
  // Woody, a un lado y por detrás: fuera de la trayectoria, mirando el balón.
  woody.post = { x: spot.x - toGoal.x * 2.2 - toGoal.z * 2.4, z: spot.z - toGoal.z * 2.2 + toGoal.x * 2.4, look: match.ball.position };
 };
 const enterGame = (mode) => {
  if (match.active || player.hidden) return;
  releaseMovement();
  player.frozen = true;
  enter(match, mode);
  placePlayer();
  player.act?.("Astro_Football_Prepare", { fade: 0.15 });
  emit("sound", { id: "ui-open" });
  emit("football", { type: "enter", mode: match.mode });
 };
 const exitGame = () => {
  if (!match.active) return;
  leave(match);
  memo.current.charging = false;
  player.frozen = false;
  woody.post = null;
  Object.assign(rig, { focus: null, distance: 1, yaw: 0, lift: 1 });
  emit("sound", { id: "ui-close" });
  emit("football", { type: "exit" });
 };
 // Suelta el chut: el astronauta golpea y el balón sale en el impacto de su pierna.
 const kick = (shot) => {
  if (!release(match, shot)) return false;
  memo.current.charging = false;
  player.act?.("Astro_Football_KickRight", { fade: 0.08 });
  return true;
 };

 useInteractable({ position: { x: GOAL.x + 8, z: GOAL.z }, radius: 7, sign: { x: GOAL.x + 7.4, y: 1.5, z: GOAL.z }, hint: "Jugar al fútbol", enabled: () => !match.active && !player.hidden, action: () => enterGame() });
 useInteractable({ position: () => player.position, radius: 1, priority: 3, height: 2.6, hint: "Salir del fútbol", enabled: () => match.active, action: exitGame });
 const trophyClick = useInteractable({
  position: { x: TROPHY.x, z: TROPHY.z + 1.2 },
  radius: 2.3,
  sign: { x: TROPHY.x, y: 3.1, z: TROPHY.z },
  hint: "Ver el trofeo",
  enabled: () => !match.active,
  action: () => {
   memo.current.party = 4.5;
   // Confeti: sale de lo alto de la vitrina y cae revoloteando.
   for (const bit of bits) Object.assign(bit, { x: TROPHY.x + (Math.random() - 0.5) * 0.8, y: 2.6 + Math.random() * 0.4, z: TROPHY.z + (Math.random() - 0.5) * 0.6, vx: (Math.random() - 0.5) * 3.2, vy: 2.5 + Math.random() * 3.5, vz: (Math.random() - 0.5) * 3.2 + 0.8, spin: (Math.random() - 0.5) * 12, turn: Math.random() * 6 });
   emit("sound", { id: "football-trophy", x: TROPHY.x, z: TROPHY.z });
   emit("toast", { text: "ESPAÑA · 2010", at: { x: TROPHY.x, y: 3.4, z: TROPHY.z } });
   emit("football", { type: "trophy" });
  },
 });

 // ── Controles del juego ────────────────────────────────────────────────────
 useEffect(() => {
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -GOAL.x);
  const hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  // Lleva el puntero al plano de la portería: ahí se apunta.
  const aimAt = (event) => {
   const rect = canvas.getBoundingClientRect();
   ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
   raycaster.setFromCamera(ndc, camera);
   if (raycaster.ray.intersectPlane(plane, hit)) setAim(match, hit.y, hit.z);
  };
  const onScene = (event) => event.target === canvas;
  const state = memo.current;
  const onMove = (event) => {
   if (!match.active) return;
   // Mientras se carga, mover de lado da efecto; si no, se apunta.
   if (state.charging) match.curl = THREE.MathUtils.clamp((event.clientX - state.startX) / 150, -1, 1);
   else if (onScene(event) && (match.phase === "aim" || match.phase === "result")) aimAt(event);
  };
  const onDown = (event) => {
   if (!match.active || !onScene(event) || (event.pointerType === "mouse" && event.button !== 0)) return;
   aimAt(event);
   if (startCharge(match)) {
    state.charging = true;
    state.startX = event.clientX;
    match.curl = 0;
   } else if (match.phase === "aim") placePlayer();
  };
  const onUp = () => {
   if (match.active && state.charging) kick();
  };
  const onKeyDown = (event) => {
   if (!match.active) return;
   if (event.code === "Escape") {
    // Esc sale del minijuego, no pausa todo el portfolio.
    event.stopImmediatePropagation();
    exitGame();
   } else if (event.code === "Space" && !event.repeat) {
    if (startCharge(match)) {
     state.charging = true;
     state.keyboard = true;
     match.curl = 0;
    } else if (match.phase === "aim") placePlayer();
   } else if (state.charging && (event.code === "KeyA" || event.code === "ArrowLeft")) match.curl = Math.max(-1, match.curl - 0.25);
   else if (state.charging && (event.code === "KeyD" || event.code === "ArrowRight")) match.curl = Math.min(1, match.curl + 0.25);
   else if (!state.charging && /^Digit[1-4]$/.test(event.code)) changeMode(Object.keys(MODES)[Number(event.code.slice(5)) - 1]);
   else if (!state.charging && event.code === "KeyB") toggleWall(match);
   else if (!state.charging && event.code === "KeyR") changeMode(match.mode);
  };
  const onKeyUp = (event) => {
   if (match.active && event.code === "Space" && state.charging && state.keyboard) {
    state.keyboard = false;
    kick();
   }
  };
  const changeMode = (mode) => {
   if (match.phase === "flight" || match.phase === "strike") return;
   startMode(match, mode);
   placePlayer();
  };
  // El impacto de la pierna (marca del clip de animación) es el que lanza el balón.
  const onAnim = (event) => event.detail?.who === "astro" && event.detail.name === "kick_impact" && strike(match);
  // Lo que pide la interfaz (botones del modo, barrera, reiniciar, salir).
  const onCommand = (event) => {
   const { command, mode } = event.detail ?? {};
   if (command === "mode") changeMode(mode);
   else if (command === "wall") toggleWall(match);
   else if (command === "restart") changeMode(match.mode);
   else if (command === "exit") exitGame();
  };
  const onMatch = (event) => {
   const detail = event.detail;
   if (detail.type === "stats") score.draw(match.mode, detail.stats);
   else if (detail.type === "ball") placePlayer();
   else if (detail.type === "result") {
    emit("toast", { text: detail.result === "gol" && match.mode === "faltas" ? "¡GOLAZO de falta!" : (RESULT_TEXT[detail.result] ?? detail.result), at: { x: GOAL.x + 3.2, y: 1.5, z: GOAL.z } });
    if (detail.goal || detail.result === "diana") {
     player.act?.(detail.goal ? "Astro_Football_GoalCelebrate" : "Astro_CelebrateSmall", { fade: 0.15 });
     emit("woody-cheer");
    } else if (match.mode !== "contrarreloj") player.act?.("Astro_Football_MissReact", { fade: 0.2 });
   } else if (detail.type === "over") {
    const { goals, attempts, score: points } = detail.stats;
    emit("toast", { text: MODES[match.mode].targets ? `Fin: ${points} puntos` : `Fin: ${goals} de ${attempts} · ${points} puntos`, at: { x: match.spot.x - 2, y: 3, z: match.spot.z } });
   }
  };
  // Si el jugador se sube a la nave o se pausa todo, el partido se deja.
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp);
  events.addEventListener("anim", onAnim);
  events.addEventListener("football-command", onCommand);
  events.addEventListener("football", onMatch);
  return () => {
   window.removeEventListener("pointermove", onMove);
   window.removeEventListener("pointerdown", onDown);
   window.removeEventListener("pointerup", onUp);
   window.removeEventListener("pointercancel", onUp);
   window.removeEventListener("keydown", onKeyDown, true);
   window.removeEventListener("keyup", onKeyUp);
   events.removeEventListener("anim", onAnim);
   events.removeEventListener("football-command", onCommand);
   events.removeEventListener("football", onMatch);
   if (match.active) exitGame();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [camera, canvas, match]);

 useFrame((_, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  update(match, dt);
  const b = match.ball;

  // Balón y su sombra de contacto.
  ball.current.position.copy(b.position);
  spinMesh(ball.current.quaternion, b.spin, dt);
  const high = Math.max(0, b.position.y - BALL_RADIUS - TURF);
  shadow.current.position.set(b.position.x, TURF + 0.012, b.position.z);
  shadow.current.scale.setScalar(1 + high * 0.25);
  shadow.current.material.opacity = 0.36 / (1 + high * 1.2);

  // Portero y barrera.
  keeper.current.visible = match.keeper.on;
  keeper.current.position.set(KEEPER_X, match.keeper.y, match.keeper.z);
  keeper.current.rotation.x = match.keeper.lean;
  match.wall.forEach((one, i) => {
   const mesh = wall.current[i];
   mesh.visible = one.on;
   mesh.position.set(one.x, one.y + TURF, one.z);
  });
  match.targets.forEach((target, i) => {
   const mesh = targets.current[i];
   mesh.visible = match.active && Boolean(MODES[match.mode].targets) && target.flip < 0.98;
   mesh.rotation.y = target.flip * Math.PI * 0.5;
   mesh.scale.setScalar(1 - target.flip * 0.4);
  });

  // Red: solo se sube a la GPU mientras se mueve.
  if (match.net.some((panel) => panel.awake > 0)) {
   let offset = 0;
   for (const panel of match.net) {
    net.position.array.set(panel.now, offset * 3);
    offset += panel.count;
   }
   net.position.needsUpdate = true;
  }

  // Mirilla sobre el plano de la portería.
  const aiming = match.active && (match.phase === "aim" || match.phase === "charge");
  reticle.current.visible = aiming;
  if (aiming) {
   reticle.current.position.set(GOAL.x + 0.12, match.aim.y, match.aim.z);
   reticle.current.scale.setScalar(1 + Math.sin(match.clock * 6) * 0.06 + match.power * 0.25);
  }

  // Cámara de lanzamiento: a la espalda del balón, mirando a la portería; en
  // el vuelo acompaña al balón sin perder la portería.
  if (match.active) {
   const { spot, toGoal } = match;
   const distance = Math.hypot(GOAL.x - spot.x, GOAL.z - spot.z);
   const follow = match.phase === "flight" || match.phase === "result" ? 0.5 : 0;
   focus.set(spot.x + toGoal.x * distance * 0.3, 1.25, spot.z + toGoal.z * distance * 0.3);
   focus.x += (THREE.MathUtils.clamp(b.position.x, GOAL.x - 1, spot.x) - focus.x) * follow;
   focus.z += (THREE.MathUtils.clamp(b.position.z, GOAL.z - 5, GOAL.z + 5) - focus.z) * follow * 0.6;
   focus.y += (Math.min(b.position.y, 3) - focus.y) * follow * 0.5;
   rig.focus = focus;
   // Unos cinco metros por detrás del balón, sea cual sea la distancia del tiro.
   rig.distance = (4.9 + distance * 0.3) / 10.4;
   // Algo ladeada, para que el astronauta no tape el balón.
   rig.yaw = Math.atan2(-toGoal.x, -toGoal.z) + 0.27;
   rig.lift = 0.6;
   rig.tilt = 0;
   // Si algo esconde al jugador (la nave), se acabó el partido.
   if (player.hidden) exitGame();
  }

  // Vitrina: luces y confeti al celebrarlo.
  const state = memo.current;
  state.party = Math.max(0, state.party - dt);
  const glow = Math.min(1, state.party) * (0.75 + Math.sin(match.clock * 9) * 0.25);
  models.gold.emissiveIntensity = glow * 0.9;
  trophy.current.rotation.y += dt * (0.4 + Math.min(1, state.party) * 3.5);
  if (state.party > 0 || bits[0].y > -5) {
   const helper = confettiHelper;
   bits.forEach((bit, i) => {
    bit.vy -= 5.5 * dt;
    bit.vx *= Math.exp(-1.2 * dt);
    bit.vz *= Math.exp(-1.2 * dt);
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    bit.z += bit.vz * dt;
    bit.turn += bit.spin * dt;
    if (bit.y < 0.05) Object.assign(bit, { y: state.party > 0 ? 0.05 : -9, vx: 0, vy: 0, vz: 0, spin: 0 });
    helper.position.set(bit.x, bit.y, bit.z);
    helper.rotation.set(bit.turn, bit.turn * 0.7, bit.turn * 1.3);
    helper.scale.setScalar(bit.y < -5 ? 0 : 1);
    helper.updateMatrix();
    confetti.current.setMatrixAt(i, helper.matrix);
   });
   confetti.current.instanceMatrix.needsUpdate = true;
  }
 });

 useEffect(() => {
  const color = new THREE.Color();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < CONFETTI; i++) {
   confetti.current.setMatrixAt(i, zero);
   confetti.current.setColorAt(i, color.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]));
  }
  confetti.current.instanceMatrix.needsUpdate = true;
  confetti.current.instanceColor.needsUpdate = true;
 }, []);

 return (
  <>
   {/* Portería y red. */}
   <mesh name="portería" userData={{ rests: TURF }} geometry={models.frame} material={models.material} position={[GOAL.x, TURF, GOAL.z]} castShadow />
   <lineSegments ref={netLines} geometry={net.geometry} frustumCulled={false}>
    <lineBasicMaterial color="#ffffff" transparent opacity={0.75} />
   </lineSegments>

   {/* Balón. */}
   <mesh ref={ball} castShadow>
    <sphereGeometry args={[BALL_RADIUS, 20, 14]} />
    <meshLambertMaterial map={models.ballTexture} />
   </mesh>
   <mesh ref={shadow} rotation-x={-Math.PI / 2}>
    <circleGeometry args={[BALL_RADIUS * 1.15, 18]} />
    <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} />
   </mesh>

   {/* Portero y barrera: maniquíes. */}
   <group ref={keeper} position={[KEEPER_X, 0, GOAL.z]}>
    <mesh geometry={models.keeper} material={models.material} position-y={TURF} castShadow />
   </group>
   {match.wall.map((_, i) => (
    <mesh key={i} ref={(node) => (wall.current[i] = node)} geometry={models.dummy} material={models.material} visible={false} castShadow />
   ))}

   {/* Dianas del modo de precisión. */}
   {match.targets.map((target, i) => (
    <group key={i} ref={(node) => (targets.current[i] = node)} position={[TARGET_PLANE, target.y, target.z]} visible={false}>
     {[[target.r, "#ff5a4a"], [target.r * 0.66, "#fff6e8"], [target.r * 0.33, "#ff5a4a"]].map(([radius, color], ring) => (
      <mesh key={ring} position-x={0.01 + ring * 0.012} rotation-y={Math.PI / 2}>
       <circleGeometry args={[radius, 20]} />
       <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
     ))}
    </group>
   ))}

   {/* Mirilla: dónde se apunta. */}
   <group ref={reticle} visible={false}>
    <mesh rotation-y={Math.PI / 2} renderOrder={20}>
     <ringGeometry args={[0.2, 0.26, 24]} />
     <meshBasicMaterial color="#ffcf4a" transparent opacity={0.95} depthTest={false} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
    <mesh rotation-y={Math.PI / 2} renderOrder={20}>
     <circleGeometry args={[0.045, 12]} />
     <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthTest={false} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
   </group>

   {/* Marcador, junto a la portería. */}
   <group name="marcador de fútbol" userData={{ rests: 0, foot: 0.4 }} position={[BOARD.x, 0, BOARD.z]} rotation-y={Math.PI / 2 - 0.35}>
    <mesh geometry={models.board} material={models.material} castShadow />
    <mesh position={[0, 2.1, 0.06]}>
     <planeGeometry args={[2.36, 1.38]} />
     <meshBasicMaterial map={score.texture} toneMapped={false} fog={false} />
    </mesh>
   </group>

   {/* Vitrina del trofeo. */}
   <group name="vitrina del trofeo" userData={{ rests: 0 }} position={[TROPHY.x, 0, TROPHY.z]} {...trophyClick}>
    <mesh geometry={models.showcase} material={models.material} castShadow receiveShadow />
    <mesh ref={trophy} geometry={models.trophy} material={models.gold} position={[0, 1.07, 0]} scale={1.15} castShadow />
    <mesh position={[0, 0.62, 0.47]}>
     <planeGeometry args={[1.16, 0.29]} />
     <meshBasicMaterial map={models.label} transparent toneMapped={false} fog={false} />
    </mesh>
    <Glow power={0.5} reach={6} forward={0.9} drop={0.2} position={[0, 2.2, 0]} rotation-x={Math.PI / 2}>
     <boxGeometry args={[0.5, 0.3, 0.06]} />
    </Glow>
   </group>
   <instancedMesh ref={confetti} args={[undefined, undefined, CONFETTI]} frustumCulled={false}>
    <planeGeometry args={[0.1, 0.06]} />
    <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />
   </instancedMesh>
  </>
 );
}

const confettiHelper = new THREE.Object3D();
