import * as THREE from "three";
import { capsule, createBall, stepBall } from "../../../game/ballPhysics";
import { bulge, createPanel, stepPanel } from "../../../game/cloth";
import { emit } from "../../../experience/state";
import { PITCH, height as terrainHeight } from "../layout";

// El partido de fútbol: reglas y simulación, sin nada de dibujo (eso es
// Football.jsx). Aquí viven el balón físico, la portería con su red de tela,
// el portero, la barrera, las dianas, los cuatro modos y el marcador.
//
// El campo va de este a oeste: la portería está en el lado oeste y se chuta
// hacia −x. Todo lo que pasa con el balón sale de la física (game/ballPhysics
// y game/cloth): un gol es que el balón cruce entero la línea entre los postes
// y bajo el larguero; un poste es un choque real con el poste.

const cz = (PITCH.z0 + PITCH.z1) / 2;
export const GOAL = { x: PITCH.x0 + 2.3, z: cz, half: 2.4, height: 2.2, depth: 1.5, post: 0.07 };
export const BALL_RADIUS = 0.22;
export const TURF = 0.065; // altura de la superficie del campo
const GRAVITY = 14;
const SUBSTEP = 1 / 240;
const KEEPER_X = GOAL.x + 0.5;
const KEEPER_TALL = 1.7; // de los pies a los hombros; los brazos alargan el alcance
const WALL_DISTANCE = 4.6;
export const TARGET_PLANE = GOAL.x - 0.08; // las dianas cuelgan justo en la boca de la portería

export const MODES = {
 penaltis: { name: "Penaltis", shots: 5, keeper: 0.78, wall: false, goal: 100 },
 faltas: { name: "Tiros libres", shots: 5, keeper: 0.7, wall: true, goal: 150 },
 precision: { name: "Precisión", shots: 8, keeper: 0, wall: false, goal: 0, targets: true },
 contrarreloj: { name: "Contrarreloj", time: 45, keeper: 0.6, wall: false, goal: 100 },
};

// Desde dónde se chuta en cada modo (metros delante de la portería, desvío lateral).
const SPOTS = {
 penaltis: [[7.4, 0]],
 faltas: [[11.4, -2.6], [11.6, 2.9], [10.4, 0.6], [11.2, -1], [10.8, 3.6]],
 precision: [[8.4, 0], [8.4, -2.2], [8.4, 2.2], [9.6, 1.2], [9.6, -1.2]],
 contrarreloj: [[7.4, 0], [9.5, -3], [9.5, 3], [11.5, 1.5], [11.5, -1.5], [8.2, 2], [8.2, -2]],
};

const TARGETS = [
 { y: 1.72, z: -1.85, r: 0.42, points: 150 },
 { y: 1.72, z: 1.85, r: 0.42, points: 150 },
 { y: 0.5, z: -1.9, r: 0.42, points: 100 },
 { y: 0.5, z: 1.9, r: 0.42, points: 100 },
 { y: 1.15, z: 0, r: 0.5, points: 50 },
];

export const powerToSpeed = (power) => 6 + 22 * power;
const SWEET = 0.6; // potencia con la que el balón va justo a donde se apunta

const ground = (x, z) => (x > PITCH.x0 - 0.3 && x < PITCH.x1 + 0.3 && z > PITCH.z0 - 0.3 && z < PITCH.z1 + 0.3 ? TURF : Math.max(terrainHeight(x, z), -0.25));
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;
const v = new THREE.Vector3(), w = new THREE.Vector3();

export function createMatch() {
 const back = GOAL.x - GOAL.depth;
 const z0 = GOAL.z - GOAL.half, z1 = GOAL.z + GOAL.half, top = GOAL.height;
 const frame = { restitution: 0.3, friction: 0.4 };
 const match = {
  active: false,
  mode: "penaltis",
  wallOn: true,
  phase: "idle", // idle | aim | charge | strike | flight | result | over
  ball: createBall(BALL_RADIUS),
  spot: new THREE.Vector3(),
  toGoal: new THREE.Vector3(-1, 0, 0), // dirección horizontal del balón al centro de la portería
  aim: { y: 1, z: GOAL.z },
  power: 0,
  curl: 0,
  kick: null, // lo que se ha pedido chutar, hasta el impacto
  shot: null, // { time, tags, result, … } del tiro en curso
  stats: { attempts: 0, goals: 0, score: 0, time: 0, left: 0, streak: 0, last: "" },
  timer: 0,
  next: 0,
  noise: 1, // 0 en las pruebas: los tiros salen exactos
  // Marco: postes y larguero (los que cuentan como «palo») y el armazón de la red.
  statics: [
   capsule("post", [GOAL.x, 0, z0], [GOAL.x, top, z0], GOAL.post, { restitution: 0.62, friction: 0.25 }),
   capsule("post", [GOAL.x, 0, z1], [GOAL.x, top, z1], GOAL.post, { restitution: 0.62, friction: 0.25 }),
   capsule("crossbar", [GOAL.x, top, z0], [GOAL.x, top, z1], GOAL.post, { restitution: 0.62, friction: 0.25 }),
   capsule("frame", [back, 0, z0], [back, top, z0], 0.04, frame),
   capsule("frame", [back, 0, z1], [back, top, z1], 0.04, frame),
   capsule("frame", [back, top, z0], [back, top, z1], 0.04, frame),
   capsule("frame", [GOAL.x, top, z0], [back, top, z0], 0.04, frame),
   capsule("frame", [GOAL.x, top, z1], [back, top, z1], 0.04, frame),
  ],
  // Red: fondo, techo y dos costados, atados al marco por todo su borde.
  net: [
   createPanel([[back, 0, z0], [back, 0, z1], [back, top, z1], [back, top, z0]], 20, 9),
   createPanel([[GOAL.x, top, z0], [GOAL.x, top, z1], [back, top, z1], [back, top, z0]], 20, 6),
   createPanel([[GOAL.x, 0, z0], [back, 0, z0], [back, top, z0], [GOAL.x, top, z0]], 6, 9),
   createPanel([[GOAL.x, 0, z1], [back, 0, z1], [back, top, z1], [GOAL.x, top, z1]], 6, 9),
  ],
  keeper: {
   z: GOAL.z, y: 0, vy: 0, vz: 0, lean: 0, state: "ready", timer: 0, target: null, skill: 0.75, on: true,
   body: capsule("keeper", [KEEPER_X, 0.2, GOAL.z], [KEEPER_X, KEEPER_TALL, GOAL.z], 0.27, { restitution: 0.3, friction: 0.5 }),
   arms: capsule("keeper", [KEEPER_X, KEEPER_TALL, GOAL.z], [KEEPER_X, KEEPER_TALL + 0.6, GOAL.z], 0.15, { restitution: 0.25, friction: 0.5 }),
  },
  wall: Array.from({ length: 3 }, () => ({ x: 0, z: 0, y: 0, vy: 0, delay: 0, jumped: false, on: false, body: capsule("wall", [0, 0, 0], [0, 1.75, 0], 0.27, { restitution: 0.32, friction: 0.5 }) })),
  targets: TARGETS.map((target) => ({ ...target, z: GOAL.z + target.z, hit: false, flip: 0 })),
  sounded: {},
  clock: 0,
 };
 match.colliders = [...match.statics, match.keeper.body, match.keeper.arms, ...match.wall.map((one) => one.body)];
 placeKeeper(match.keeper, 0);
 return match;
}

// ── Sonidos y avisos ─────────────────────────────────────────────────────────
// Un mismo tipo de golpe no vuelve a sonar hasta pasado un instante: un balón
// que rueda o se queda apoyado en algo no repiquetea.
const SOUND = { grass: "ball-grass", post: "ball-woodwork", crossbar: "ball-crossbar", keeper: "ball-save", wall: "ball-wall", frame: "ball-woodwork", net: "ball-goalnet" };
function sound(match, tag, strength, gap = 0.16) {
 if ((match.sounded[tag] ?? -1) + gap > match.clock) return;
 match.sounded[tag] = match.clock;
 emit("sound", { id: SOUND[tag] ?? tag, x: match.ball.position.x, z: match.ball.position.z, strength: Math.min(1, strength) });
}
const notify = (match, type, detail = {}) => emit("football", { type, mode: match.mode, ...detail });
const publish = (match) => notify(match, "stats", { stats: match.stats, phase: match.phase, wallOn: match.wallOn });

// ── Portero ──────────────────────────────────────────────────────────────────
function placeKeeper(keeper, dt) {
 const dirY = Math.cos(keeper.lean), dirZ = Math.sin(keeper.lean);
 const set = (collider, from, to) => {
  v.set(KEEPER_X, keeper.y + dirY * from, keeper.z + dirZ * from);
  w.set(KEEPER_X, keeper.y + dirY * to, keeper.z + dirZ * to);
  if (dt > 0) collider.velocity.copy(v).add(w).multiplyScalar(0.5).sub(collider.from.clone().add(collider.to).multiplyScalar(0.5)).divideScalar(dt);
  else collider.velocity.set(0, 0, 0);
  collider.from.copy(v);
  collider.to.copy(w);
 };
 set(keeper.body, 0.25, KEEPER_TALL);
 set(keeper.arms, KEEPER_TALL, KEEPER_TALL + 0.62);
 keeper.body.active = keeper.arms.active = keeper.on;
}

// Dónde cruzará el balón la línea del portero, según va ahora (lo que «lee» el portero).
function predict(match) {
 const ghost = createBall(BALL_RADIUS);
 ghost.position.copy(match.ball.position);
 ghost.velocity.copy(match.ball.velocity);
 ghost.spin.copy(match.ball.spin);
 for (let i = 0; i < 480 && ghost.position.x > KEEPER_X + 0.1; i++) stepBall(ghost, 1 / 120, { gravity: GRAVITY, ground });
 return ghost.position.x > KEEPER_X + 1.5 ? null : { y: ghost.position.y, z: ghost.position.z };
}

function updateKeeper(match, dt) {
 const keeper = match.keeper;
 if (!keeper.on) return;
 keeper.timer += dt;
 let wantZ = GOAL.z + Math.sin(match.clock * 0.9) * 0.45, wantLean = 0, speed = 1.3;
 if (keeper.state === "react" && keeper.timer >= keeper.reaction) {
  // Se decide: lee el tiro con algo de error y se lanza.
  const read = predict(match);
  if (read) {
   const miss = (1 - keeper.skill) * 1.1;
   keeper.target = { y: Math.max(0.2, read.y + gauss() * miss * 0.5), z: read.z + gauss() * miss };
   keeper.state = "dive";
   keeper.timer = 0;
   const reach = keeper.target.z - keeper.z;
   if (keeper.target.y > 1.75 || Math.abs(reach) > 1.1) keeper.vy = 2.6 + Math.min(1.6, Math.abs(reach) * 0.5);
  } else keeper.state = "ready";
 }
 if (keeper.state === "dive") {
  const { y, z } = keeper.target;
  const reach = z - keeper.z;
  // Cerca, se queda de pie; lejos, se tumba hacia ese lado hasta llegar con las manos.
  wantLean = Math.abs(reach) < 0.42 ? 0 : THREE.MathUtils.clamp(Math.atan2(reach, Math.max(0.25, y - keeper.y)), -1.4, 1.4);
  wantZ = z - Math.sin(wantLean) * 1.5;
  speed = 2.6 + keeper.skill * 3.2;
  if (keeper.timer > 1.25) {
   keeper.state = "recover";
   keeper.timer = 0;
  }
 } else if (keeper.state === "recover") {
  wantZ = GOAL.z;
  speed = 2;
  if (keeper.timer > 1) keeper.state = "ready";
 }
 wantZ = THREE.MathUtils.clamp(wantZ, GOAL.z - GOAL.half + 0.2, GOAL.z + GOAL.half - 0.2);
 keeper.vz += (THREE.MathUtils.clamp((wantZ - keeper.z) * 9, -speed, speed) - keeper.vz) * Math.min(1, dt * 12);
 keeper.z += keeper.vz * dt;
 keeper.lean += THREE.MathUtils.clamp(wantLean - keeper.lean, -dt * (keeper.state === "dive" ? 4 + keeper.skill * 3 : 3), dt * 7);
 keeper.vy -= GRAVITY * dt;
 keeper.y = Math.max(0, keeper.y + keeper.vy * dt);
 if (keeper.y === 0) keeper.vy = Math.max(0, keeper.vy);
 placeKeeper(keeper, dt);
}

// ── Barrera ──────────────────────────────────────────────────────────────────
function placeWall(match) {
 const on = match.active && MODES[match.mode].wall && match.wallOn;
 // En línea, cruzada al tiro, a unos pasos del balón y tapando el centro de la portería.
 const side = new THREE.Vector3(-match.toGoal.z, 0, match.toGoal.x);
 match.wall.forEach((one, i) => {
  one.on = on;
  one.x = match.spot.x + match.toGoal.x * WALL_DISTANCE + side.x * (i - 1) * 0.62;
  one.z = match.spot.z + match.toGoal.z * WALL_DISTANCE + side.z * (i - 1) * 0.62;
  one.y = one.vy = 0;
  one.jumped = false;
  one.body.active = on;
  one.body.from.set(one.x, 0.2, one.z);
  one.body.to.set(one.x, 1.75, one.z);
  one.body.velocity.set(0, 0, 0);
 });
}

function updateWall(match, dt) {
 for (const one of match.wall) {
  if (!one.on) continue;
  // Cada maniquí salta por su cuenta, un instante distinto tras el golpeo.
  if (match.shot && !one.jumped && match.shot.time >= one.delay) {
   one.jumped = true;
   one.vy = 3.4 + Math.random() * 1.6;
  }
  one.vy -= GRAVITY * dt;
  one.y = Math.max(0, one.y + one.vy * dt);
  if (one.y === 0) one.vy = Math.max(0, one.vy);
  one.body.from.set(one.x, one.y + 0.2, one.z);
  one.body.to.set(one.x, one.y + 1.75, one.z);
  one.body.velocity.set(0, one.y > 0 ? one.vy : 0, 0);
 }
}

// ── Rondas ───────────────────────────────────────────────────────────────────
export function placeBall(match, index = match.stats.attempts) {
 const spots = SPOTS[match.mode];
 const [ahead, aside] = match.mode === "contrarreloj" ? spots[Math.floor(Math.random() * spots.length)] : spots[index % spots.length];
 match.spot.set(GOAL.x + ahead, TURF + BALL_RADIUS, GOAL.z + aside);
 match.toGoal.set(GOAL.x - match.spot.x, 0, GOAL.z - match.spot.z).normalize();
 match.ball.position.copy(match.spot);
 match.ball.velocity.set(0, 0, 0);
 match.ball.spin.set(0, 0, 0);
 match.power = match.curl = 0;
 match.kick = match.shot = null;
 match.phase = "aim";
 const keeper = match.keeper;
 Object.assign(keeper, { state: "ready", timer: 0, target: null, lean: 0, y: 0, vy: 0, skill: MODES[match.mode].keeper, on: MODES[match.mode].keeper > 0 });
 placeKeeper(keeper, 0);
 placeWall(match);
 notify(match, "ball", { x: match.spot.x, z: match.spot.z });
 publish(match);
}

export function startMode(match, mode = match.mode) {
 match.mode = mode;
 const rules = MODES[mode];
 match.stats = { attempts: 0, goals: 0, score: 0, time: rules.time ?? 0, left: rules.shots ?? 0, streak: 0, last: "" };
 match.targets.forEach((target) => Object.assign(target, { hit: false, flip: 0 }));
 match.timer = 0;
 placeBall(match, 0);
}

export function enter(match, mode = match.mode) {
 match.active = true;
 startMode(match, mode);
}

export function leave(match) {
 match.active = false;
 match.phase = "idle";
 match.kick = match.shot = null;
 match.wall.forEach((one) => (one.on = one.body.active = false));
 // El balón se queda en el punto de penalti, para quien pase por allí.
 match.ball.position.set(GOAL.x + 7.4, TURF + BALL_RADIUS, GOAL.z);
 match.ball.velocity.set(0, 0, 0);
 match.ball.spin.set(0, 0, 0);
 Object.assign(match.keeper, { state: "ready", lean: 0, y: 0, vy: 0, on: true });
 publish(match);
}

export function toggleWall(match) {
 match.wallOn = !match.wallOn;
 if (match.phase !== "flight" && match.phase !== "strike") placeWall(match);
 publish(match);
}

// ── Chutar ───────────────────────────────────────────────────────────────────
export function setAim(match, y, z) {
 match.aim.y = THREE.MathUtils.clamp(y, 0.15, 3.6);
 match.aim.z = THREE.MathUtils.clamp(z, GOAL.z - 4.2, GOAL.z + 4.2);
}

export function startCharge(match) {
 if (!match.active) return false;
 if (match.phase === "over") {
  startMode(match);
  return false;
 }
 if (match.phase !== "aim") return false;
 match.phase = "charge";
 match.power = 0;
 return true;
}

// Suelta la carga: queda pedido el chut, que sale en el impacto de la pierna.
export function release(match, shot = {}) {
 if (match.phase !== "charge" && !(match.phase === "aim" && shot.power !== undefined)) return false;
 match.kick = { power: THREE.MathUtils.clamp(shot.power ?? match.power, 0.03, 1), curl: THREE.MathUtils.clamp(shot.curl ?? match.curl, -1, 1), y: shot.y ?? match.aim.y, z: shot.z ?? match.aim.z };
 match.phase = "strike";
 match.timer = 0;
 notify(match, "strike", { power: match.kick.power });
 return true;
}

// El pie toca el balón: aquí nace el tiro. Con la potencia justa va a donde se
// apunta; con menos se queda corto y con más sale alto y menos preciso.
export function strike(match) {
 if (match.phase !== "strike" || !match.kick) return;
 const { power, curl, y, z } = match.kick;
 const { ball } = match;
 const dx = GOAL.x - ball.position.x, dz = z - ball.position.z;
 const distance = Math.hypot(dx, dz);
 const speed = powerToSpeed(power), reference = powerToSpeed(SWEET);
 const rise = y - ball.position.y;
 const root = reference ** 4 - GRAVITY * (GRAVITY * distance * distance + 2 * rise * reference * reference);
 let angle = root > 0 ? Math.atan((reference * reference - Math.sqrt(root)) / (GRAVITY * distance)) : Math.PI / 4;
 angle += 0.0019 * distance; // lo que le quita el aire
 const wild = match.noise * (0.006 + Math.max(0, power - SWEET) * 0.045);
 angle += Math.max(0, power - 0.8) * 0.6 + gauss() * wild;
 const yaw = Math.atan2(dz, dx) + gauss() * wild;
 ball.velocity.set(Math.cos(yaw) * Math.cos(angle) * speed, Math.sin(angle) * speed, Math.sin(yaw) * Math.cos(angle) * speed);
 // Efecto: giro sobre la vertical (curva hacia el lado pedido) y algo de giro hacia atrás.
 ball.spin.set(0, -curl * 34, 0).addScaledVector(v.set(-Math.sin(yaw), 0, Math.cos(yaw)), -speed * 0.35);
 match.shot = { time: 0, tags: new Set(), result: null, still: 0, crossed: null, nearest: Infinity, net: false, free: MODES[match.mode].wall, impacts: [] };
 match.wall.forEach((one) => (one.delay = 0.03 + Math.random() * 0.36));
 const keeper = match.keeper;
 if (keeper.on) Object.assign(keeper, { state: "react", timer: 0, reaction: 0.3 - keeper.skill * 0.14 + Math.random() * 0.08 });
 match.phase = "flight";
 match.stats.attempts += 1;
 if (match.stats.left) match.stats.left -= 1;
 emit("sound", { id: "ball-kick", x: ball.position.x, z: ball.position.z, strength: 0.4 + power * 0.6 });
 notify(match, "kick", { power, speed });
 publish(match);
}

function finish(match, result) {
 const { shot, stats } = match;
 if (!shot || shot.result) return;
 shot.result = result;
 const rules = MODES[match.mode];
 const goal = result === "gol";
 if (result === "diana") stats.goals += 1;
 if (goal) {
  stats.goals += 1;
  stats.streak += 1;
  stats.score += rules.goal + (shot.free && match.wallOn ? 50 : 0) + (match.mode === "contrarreloj" ? (stats.streak - 1) * 25 : 0);
  emit("sound", { id: "football-goal", x: GOAL.x, z: GOAL.z });
 } else stats.streak = 0;
 stats.last = result;
 match.phase = "result";
 match.next = match.mode === "contrarreloj" ? 1.1 : goal ? 2.6 : 2.1;
 notify(match, "result", { result, goal, free: shot.free, woodwork: shot.tags.has("post") || shot.tags.has("crossbar") });
 publish(match);
}

function report(match, tag, impact, collider) {
 const { shot } = match;
 sound(match, tag, impact / 14);
 if (!shot) return;
 if (tag !== "grass") {
  shot.tags.add(tag);
  shot.impacts.push({ tag, impact: +impact.toFixed(1), time: +shot.time.toFixed(2) });
 }
 // Al palo: un golpe de verdad contra poste o larguero.
 if ((tag === "post" || tag === "crossbar") && impact > 2.5) notify(match, "woodwork", { part: tag, impact });
 void collider;
}

function stepFlight(match, dt) {
 const { ball, shot } = match;
 const before = ball.position.x;
 const beforeY = ball.position.y, beforeZ = ball.position.z;
 stepBall(ball, dt, { gravity: GRAVITY, ground, colliders: match.colliders, report: (tag, impact, collider) => report(match, tag, impact, collider) });
 // Red: solo se calcula si el balón anda cerca o si aún se está moviendo.
 const near = ball.position.x < GOAL.x + 0.6 && ball.position.x > GOAL.x - GOAL.depth - 0.8 && Math.abs(ball.position.z - GOAL.z) < GOAL.half + 0.8 && ball.position.y < GOAL.height + 0.8;
 let touched = 0;
 for (const panel of match.net) if (near || panel.awake > 0) touched += stepPanel(panel, dt, near ? ball : null);
 if (touched && shot) {
  if (!shot.net) sound(match, "net", ball.velocity.length() / 12, 1);
  shot.net = true;
 }
 if (!shot || shot.result) return;
 shot.nearest = Math.min(shot.nearest, ball.position.x - GOAL.x);
 const x = ball.position.x;
 // Dianas: el balón atraviesa su plano por dentro del disco.
 if (MODES[match.mode].targets && before > TARGET_PLANE && x <= TARGET_PLANE) {
  const k = (before - TARGET_PLANE) / (before - x || 1);
  const y = beforeY + (ball.position.y - beforeY) * k, z = beforeZ + (ball.position.z - beforeZ) * k;
  for (const target of match.targets) {
   if (target.hit || Math.hypot(y - target.y, z - target.z) > target.r + BALL_RADIUS * 0.5) continue;
   target.hit = true;
   match.stats.score += target.points;
   shot.target = target.points;
   emit("sound", { id: "football-target", x: GOAL.x, z: target.z });
   notify(match, "target", { points: target.points, cleared: match.targets.every((one) => one.hit) });
  }
 }
 // Gol: el balón entero ha cruzado la línea, entre los postes y bajo el larguero.
 const line = GOAL.x - BALL_RADIUS;
 if (before > line && x <= line) {
  const k = (before - line) / (before - x || 1);
  const y = beforeY + (ball.position.y - beforeY) * k, z = beforeZ + (ball.position.z - beforeZ) * k;
  const inside = Math.abs(z - GOAL.z) < GOAL.half - GOAL.post && y < GOAL.height - GOAL.post;
  shot.cross = { y, z };
  // (En precisión no hay goles: cuenta la diana, o nada.)
  if (inside) finish(match, MODES[match.mode].targets ? (shot.target ? "diana" : "sin diana") : "gol");
  else shot.crossed = y >= GOAL.height - GOAL.post && Math.abs(z - GOAL.z) < GOAL.half + 0.4 ? "alto" : "fuera";
 }
}

// Cómo acabó un tiro que no fue gol.
function verdict(shot) {
 if (shot.target) return "diana";
 if (shot.tags.has("keeper")) return "parada";
 if (shot.tags.has("crossbar")) return "larguero";
 if (shot.tags.has("post")) return "poste";
 if (shot.tags.has("wall")) return "barrera";
 if (shot.crossed) return shot.crossed;
 return shot.nearest > 1 ? "corto" : "fuera";
}

// Avanza el partido. Se llama en cada fotograma, esté o no jugándose (el balón
// suelto y la red siguen teniendo física).
export function update(match, delta) {
 const steps = Math.max(1, Math.ceil(delta / SUBSTEP));
 const dt = delta / steps;
 match.clock += delta;
 const { stats, ball } = match;
 const rules = MODES[match.mode];

 if (match.active) {
  if (match.phase === "charge") match.power = Math.min(1, match.power + delta / 1.35);
  if (match.phase === "strike") {
   // Por si la animación no llegara a avisar del impacto.
   match.timer += delta;
   if (match.timer > 0.6) strike(match);
  }
  // Contrarreloj: el tiempo corre desde el primer chut.
  if (rules.time && stats.attempts > 0 && match.phase !== "over") {
   const previous = Math.ceil(stats.time);
   stats.time = Math.max(0, stats.time - delta);
   if (Math.ceil(stats.time) !== previous) publish(match);
   if (stats.time === 0 && match.phase !== "flight") endRound(match);
  }
 }

 for (let i = 0; i < steps; i++) {
  updateKeeper(match, dt);
  updateWall(match, dt);
  if (match.shot) match.shot.time += dt;
  stepFlight(match, dt);
 }
 for (const target of match.targets) target.flip += ((target.hit ? 1 : 0) - target.flip) * Math.min(1, delta * 9);

 const { shot } = match;
 if (match.phase === "flight" && shot && !shot.result) {
  // El tiro se acaba cuando el balón se para, se va lejos o pasa demasiado tiempo.
  const speed = ball.velocity.length();
  shot.still = speed < 0.6 ? shot.still + delta : 0;
  const out = ball.position.x < GOAL.x - GOAL.depth - 3 || ball.position.x > PITCH.x1 + 4 || Math.abs(ball.position.z - GOAL.z) > 11;
  const dead = shot.crossed && shot.time > 1.2;
  if (shot.still > 0.45 || out || dead || shot.time > 6 || (shot.tags.has("keeper") && shot.time > 1.6 && ball.velocity.x > -1)) finish(match, verdict(shot));
 } else if (match.phase === "result") {
  match.next -= delta;
  if (match.next <= 0) {
   const cleared = rules.targets && match.targets.every((target) => target.hit);
   if ((rules.shots && stats.left <= 0) || (rules.time && stats.time === 0) || cleared) endRound(match);
   else placeBall(match);
  }
 }
}

function endRound(match) {
 match.phase = "over";
 match.kick = match.shot = null;
 notify(match, "over", { stats: match.stats });
 publish(match);
}

// Cuánto se embolsa la red ahora mismo (metros): para dibujarla y para las pruebas.
export const netBulge = (match) => Math.max(...match.net.map(bulge));

// Pone o quita al portero (lo usan las pruebas para tiros sin oposición).
export function setKeeper(match, on, skill = match.keeper.skill) {
 match.keeper.on = on;
 match.keeper.skill = skill;
 placeKeeper(match.keeper, 0);
}
