import { moveAgent } from "../worlds/collision";

// El comportamiento de Woody, sin nada de dibujo: decide a dónde va y en qué
// postura está. Woody.jsx lo ejecuta en cada fotograma y elige los clips.
//
//  · follow: te sigue a un par de metros; si te paras, acaba sentándose y luego
//    tumbándose.
//  · guide: recorre una ruta por la red de caminos del mundo, y te espera si
//    te quedas atrás.
//  · pet: se coloca delante de ti para que lo acaricies.

export const WOODY_RADIUS = 0.36;
const AGENT = { dog: true };

const FOLLOW_GAP = 2.1; // distancia a la que se queda de ti
const GUIDE_SPEED = 4.1; // algo más rápido que tu paso, para ir delante
const GUIDE_LEAD = 8.5; // si te alejas más de esto, te espera…
const GUIDE_RESUME = 4.6; // …hasta que vuelves a estar así de cerca
const MAX_SPEED = 8.4;
const SIT_AFTER = 5; // s quietos hasta sentarse
const LIE_AFTER = 18; // s quietos hasta tumbarse
const LOST_DISTANCE = 30; // tan lejos, reaparece cerca de ti (fuera de la vista)

export function createBrain() {
 return {
  mode: "follow",
  posture: "stand", // stand | sit | lie
  speed: 0, // velocidad real, para elegir el paso
  velocity: { x: 0, z: 0 },
  moving: false,
  waiting: false, // en modo guía, esperándote
  rest: 0,
  stuck: 0,
  sidestep: 0,
  sideSign: 1,
  route: null,
  routeIndex: 0,
  place: null,
  petSpot: null,
  hidden: false,
 };
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// Camino más corto por la red de nodos desde `from` hasta el nodo `goal`.
export function findRoute(guide, from, goal) {
 const nodes = Object.fromEntries(Object.entries(guide.nodes).map(([id, [x, z]]) => [id, { x, z }]));
 const neighbours = Object.fromEntries(Object.keys(nodes).map((id) => [id, []]));
 for (const [a, b] of guide.links) {
  neighbours[a].push(b);
  neighbours[b].push(a);
 }
 // Se entra a la red por el nodo más cercano.
 const start = Object.keys(nodes).reduce((best, id) => (distance(nodes[id], from) < distance(nodes[best], from) ? id : best));
 const cost = { [start]: 0 };
 const previous = {};
 const open = new Set([start]);
 while (open.size) {
  const current = [...open].reduce((best, id) => (cost[id] < cost[best] ? id : best));
  open.delete(current);
  if (current === goal) break;
  for (const next of neighbours[current]) {
   const candidate = cost[current] + distance(nodes[current], nodes[next]);
   if (candidate < (cost[next] ?? Infinity)) {
    cost[next] = candidate;
    previous[next] = current;
    open.add(next);
   }
  }
 }
 if (cost[goal] === undefined) return null;
 const path = [];
 for (let id = goal; id !== undefined; id = previous[id]) path.unshift(nodes[id]);
 // Si ya está más cerca del segundo punto que del primero, se salta el primero.
 if (path.length > 1 && distance(from, path[1]) < distance(path[0], path[1])) path.shift();
 return path;
}

// Un sitio libre cerca del jugador pero fuera de la pantalla, para reaparecer.
function findSpotNear(world, player) {
 const candidates = [[-7, 10], [7, 10], [0, 12], [-12, 2], [12, 2], [0, -14]];
 for (const [dx, dz] of candidates) {
  const spot = { x: player.x + dx, y: 0, z: player.z + dz };
  if (world.blocked(spot.x, spot.z, 0, AGENT)) continue;
  if (world.colliders.some((c) => c.active !== false && Math.hypot(c.x - spot.x, c.z - spot.z) < c.r + WOODY_RADIUS + 0.2)) continue;
  return spot;
 }
 return null;
}

// Avanza un fotograma. `busy`: está reproduciendo un gesto y no debe moverse.
// Devuelve los avisos de este fotograma: { arrived, petReady }.
export function updateBrain(brain, dt, { world, player, woody, busy }) {
 const out = {};
 const position = woody.position;
 const feet = player.position;

 // Dentro de la nave va contigo; al bajar, aparece a tu lado.
 if (player.hidden) {
  brain.hidden = true;
  brain.speed = 0;
  return out;
 }
 if (brain.hidden) {
  brain.hidden = false;
  position.set(feet.x + 1.3, 0, feet.z + 0.5);
  brain.posture = "stand";
  brain.rest = 0;
 }

 const toPlayer = distance(position, feet);
 let target = feet;
 let gap = FOLLOW_GAP;
 let wantedSpeed = 0;

 if (brain.mode === "guide" && brain.route) {
  target = brain.route[brain.routeIndex];
  gap = 0.7;
  // Te espera si te quedas atrás.
  if (brain.waiting ? toPlayer < GUIDE_RESUME : toPlayer > GUIDE_LEAD) brain.waiting = !brain.waiting;
  if (distance(position, target) < gap + 0.2) {
   if (brain.routeIndex < brain.route.length - 1) {
    brain.routeIndex += 1;
    target = brain.route[brain.routeIndex];
   } else if (toPlayer < 6) {
    out.arrived = brain.place;
    brain.mode = "follow";
    brain.route = null;
   } else {
    brain.waiting = true;
   }
  }
  wantedSpeed = brain.waiting ? 0 : GUIDE_SPEED;
 } else if (brain.mode === "pet" && brain.petSpot) {
  target = brain.petSpot;
  gap = 0.25;
  brain.petTimer += dt;
  const there = distance(position, target) < gap + 0.1;
  if (there || brain.petTimer > 1.6) {
   out.petReady = true;
   brain.mode = "follow";
   brain.petSpot = null;
  } else {
   wantedSpeed = 2.2;
  }
 }

 const toTarget = distance(position, target);
 if (brain.mode === "follow") {
  // Histéresis: echa a andar cuando te alejas un poco más de lo que para.
  const start = gap + (brain.moving ? 0.1 : 1.1);
  if (toTarget > start) wantedSpeed = Math.min(MAX_SPEED, Math.max(1.1, (toTarget - gap) * 1.9));
 }
 if (busy) wantedSpeed = 0;

 // Sentado o tumbado no se mueve: Woody.jsx lo levanta primero.
 brain.wantsUp = wantedSpeed > 0 && brain.posture !== "stand";
 if (brain.posture !== "stand") wantedSpeed = 0;

 // Dirección: hacia el objetivo, con un paso lateral si se ha quedado atascado.
 let dirX = 0;
 let dirZ = 0;
 if (wantedSpeed > 0 && toTarget > 1e-3) {
  dirX = (target.x - position.x) / toTarget;
  dirZ = (target.z - position.z) / toTarget;
  if (brain.sidestep > 0) {
   brain.sidestep -= dt;
   const sx = -dirZ * brain.sideSign;
   const sz = dirX * brain.sideSign;
   dirX = dirX * 0.35 + sx;
   dirZ = dirZ * 0.35 + sz;
   const length = Math.hypot(dirX, dirZ);
   dirX /= length;
   dirZ /= length;
  }
 }

 const blend = 1 - Math.exp(-9 * dt);
 brain.velocity.x += (dirX * wantedSpeed - brain.velocity.x) * blend;
 brain.velocity.z += (dirZ * wantedSpeed - brain.velocity.z) * blend;

 const fromX = position.x;
 const fromZ = position.z;
 moveAgent(world, position, brain.velocity.x * dt, brain.velocity.z * dt, WOODY_RADIUS, AGENT);
 const travelled = Math.hypot(position.x - fromX, position.z - fromZ);
 brain.speed = dt > 0 ? travelled / dt : 0;
 brain.moving = wantedSpeed > 0.2;
 position.y += (world.height(position.x, position.z) - position.y) * Math.min(1, dt * 14);

 // ¿Atascado? Primero prueba a rodear; si no hay manera, reaparece cerca.
 if (brain.moving && brain.speed < wantedSpeed * 0.3) brain.stuck += dt;
 else brain.stuck = Math.max(0, brain.stuck - dt * 2);
 if (brain.stuck > 0.6 && brain.sidestep <= 0) {
  brain.sidestep = 0.9;
  brain.sideSign = -brain.sideSign;
 }
 if (brain.stuck > 4.5 || toPlayer > LOST_DISTANCE) {
  const spot = brain.mode === "guide" ? null : findSpotNear(world, feet);
  if (spot) {
   position.set(spot.x, world.height(spot.x, spot.z), spot.z);
   brain.velocity.x = brain.velocity.z = 0;
  }
  brain.stuck = 0;
 }

 // Hacia dónde mira: hacia donde anda; parado, hacia ti.
 if (brain.speed > 0.4) woody.facing = Math.atan2(-brain.velocity.x, -brain.velocity.z);
 else if (!busy && brain.posture === "stand" && toPlayer > 0.5) {
  const look = Math.atan2(-(feet.x - position.x), -(feet.z - position.z));
  let turn = look - woody.facing;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  woody.facing += turn * Math.min(1, dt * 3);
 }

 // Descanso: quietos los dos un rato → se sienta; más rato → se tumba.
 const playerStill = Math.hypot(player.velocity.x, player.velocity.z) < 0.3;
 if (!brain.moving && playerStill && brain.mode === "follow" && !busy) brain.rest += dt;
 else if (brain.moving) brain.rest = 0;
 brain.wantsSit = brain.posture === "stand" && brain.rest > SIT_AFTER;
 brain.wantsLie = brain.posture === "sit" && brain.rest > LIE_AFTER;

 woody.mode = brain.mode;
 return out;
}

export function startGuide(brain, world, woody, placeId) {
 const place = world.guide?.places.find((entry) => entry.id === placeId);
 const route = place && findRoute(world.guide, woody.position, placeId);
 if (!route) return false;
 Object.assign(brain, { mode: "guide", route, routeIndex: 0, place, waiting: false, rest: 0 });
 return true;
}

export function stopGuide(brain) {
 Object.assign(brain, { mode: "follow", route: null, place: null, waiting: false });
}

export function startPet(brain, spot) {
 Object.assign(brain, { mode: "pet", petSpot: spot, petTimer: 0, route: null, waiting: false, rest: 0 });
}
