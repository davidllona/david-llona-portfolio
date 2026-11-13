import { distanceTo, moveAgent } from "../worlds/collision";

// El comportamiento de Woody, sin nada de dibujo: decide a dónde va y en qué
// postura está. Woody.jsx lo ejecuta en cada fotograma y elige los clips.
//
//  · follow: te sigue a un par de metros, a tu paso; si te paras, olfatea, se
//    sienta a los ~3 s y se tumba a los ~10 s. Si se queda atascado, rodea por
//    la red de caminos; solo reaparece (fuera de la vista) si no hay otra.
//  · guide: recorre una ruta por la red de caminos del mundo, y te espera si
//    te quedas atrás o te paras.
//  · pet: se coloca delante de ti para que lo acaricies.

export const WOODY_RADIUS = 0.36;
const AGENT = { dog: true };

const FOLLOW_GAP = 2.1; // distancia a la que se queda de ti
const GUIDE_SPEED = 4.1; // algo más rápido que tu paso, para ir delante
const GUIDE_LEAD = 6.5; // si te alejas más de esto, te espera…
const GUIDE_RESUME = 3.8; // …hasta que vuelves a estar así de cerca
const GUIDE_PAUSE = 3.6; // …y también si te paras estando ya a esta distancia
const MAX_SPEED = 8.4;
const SIT_AFTER = 3; // s quietos hasta sentarse
const LIE_AFTER = 10; // s quietos hasta tumbarse
const LOST_DISTANCE = 16; // m; más lejos que esto y fuera de cámara, se recoloca cerca de ti sin que se vea
const SWIM_DEPTH = 0.45; // m que se hunde, como mucho, bajo la superficie del agua
const CRUMB_STEP = 0.7; // m entre migas del rastro del astronauta
const CRUMBS = 70;
const PAWS = 0.42; // m del centro a las patas delanteras y a las traseras
const CLIMB = 7; // m/s que puede subir o bajar el cuerpo: sigue cualquier cuesta sin retraso

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
  pitch: 0, // cabeceo del cuerpo según la pendiente (positivo: morro arriba)
  playerIdle: 0, // s que lleva parado el astronauta
  detour: null, // rodeo por la red de caminos cuando se atasca
  detourIndex: 0,
  detourTime: 0,
  trail: [], // por dónde ha pasado el astronauta: si no puede ir recto, sigue sus pasos
  sight: { timer: 0, clear: true, crumb: -1 },
  jumps: 0, // veces que se ha recolocado (para las pruebas)
  noWay: 0, // s sin camino hacia ti (ni recto ni por tus pasos)
  detourFor: null, // dónde estabas cuando probó el último rodeo
  pace: { x: 0, z: 0, speed: 0 }, // velocidad neta suavizada: la que decide el paso (no la de cada fotograma)
 };
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// El nodo de la red más cercano a un punto.
export function nearestNode(guide, from) {
 return Object.keys(guide.nodes).reduce((best, id) => (Math.hypot(guide.nodes[id][0] - from.x, guide.nodes[id][1] - from.z) < Math.hypot(guide.nodes[best][0] - from.x, guide.nodes[best][1] - from.z) ? id : best));
}

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

// ¿Puede Woody ir en línea recta de `a` a `b`? Ni terreno vedado para él (un
// cortado, agua honda) ni obstáculos por medio.
function clearLine(world, a, b) {
 const length = Math.hypot(b.x - a.x, b.z - a.z);
 const steps = Math.max(1, Math.ceil(length / 0.35));
 let y = world.height(a.x, a.z);
 for (let i = 1; i <= steps; i++) {
  const x = a.x + ((b.x - a.x) * i) / steps, z = a.z + ((b.z - a.z) * i) / steps;
  if (world.blocked(x, z, y, AGENT)) return false;
  for (const c of world.colliders) {
   if (c.active !== false && distanceTo(c, x, z) < c.r + WOODY_RADIUS * 0.8) return false;
  }
  y = world.height(x, z);
 }
 return true;
}

// Un sitio libre cerca del jugador pero fuera de la pantalla, para reaparecer.
// `visible(x, z)` lo dice la cámara de verdad; sin ella no se reaparece.
function findSpotNear(world, player, visible) {
 if (!visible) return null;
 for (const radius of [9, 12, 15]) {
  for (let i = 0; i < 12; i++) {
   // Se empieza por detrás de la cámara (al sur) y se va abriendo.
   const angle = Math.PI / 2 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 6);
   const spot = { x: player.x + Math.cos(angle) * radius, y: 0, z: player.z + Math.sin(angle) * radius };
   if (visible(spot.x, spot.z)) continue;
   if (world.blocked(spot.x, spot.z, world.height(spot.x, spot.z), AGENT)) continue;
   if (world.colliders.some((c) => c.active !== false && distanceTo(c, spot.x, spot.z) < c.r + WOODY_RADIUS + 0.2)) continue;
   // Tiene que poder llegar desde allí: si no, se recolocaría una y otra vez.
   if (!clearLine(world, spot, player)) continue;
   return spot;
  }
 }
 return null;
}

// Avanza un fotograma. `busy`: está reproduciendo un gesto y no debe moverse;
// `attend`: está hablando y mira al astronauta; `visible(x, z)`: si ese punto
// del suelo se ve en pantalla. Devuelve los avisos de este fotograma:
// { arrived, petReady, waited }.
export function updateBrain(brain, dt, { world, player, woody, busy, attend = false, visible = null }) {
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
  position.set(feet.x + 1.3, world.height(feet.x + 1.3, feet.z + 0.5), feet.z + 0.5);
  brain.posture = "stand";
  brain.rest = 0;
 }

 const toPlayer = distance(position, feet);
 const playerSpeed = Math.hypot(player.velocity.x, player.velocity.z);
 brain.playerIdle = playerSpeed < 0.3 ? brain.playerIdle + dt : 0;
 let target = feet;
 let gap = FOLLOW_GAP;
 // Se le ha pedido esperar en un sitio (junto al campo de fútbol): va allí y se queda.
 if (woody.post && brain.mode === "follow") {
  target = woody.post;
  gap = 0.4;
 }
 let wantedSpeed = 0;

 if (brain.mode === "guide" && brain.route) {
  target = brain.route[brain.routeIndex];
  gap = 0.7;
  // Comprueba que le sigues: te espera si te quedas atrás o si te paras, y
  // sigue en cuanto vuelves a acercarte.
  if (brain.waiting) {
   if (toPlayer < GUIDE_RESUME || (playerSpeed > 0.5 && toPlayer < GUIDE_LEAD - 1)) brain.waiting = false;
  } else if (toPlayer > GUIDE_LEAD || (brain.playerIdle > 1.2 && toPlayer > GUIDE_PAUSE)) {
   brain.waiting = true;
   out.waited = true;
  }
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
  brain.trail.length = 0;
 } else if (brain.mode === "follow" && brain.detour) {
  // Rodeo por la red de caminos: hasta que te tenga cerca o se acabe la ruta.
  brain.detourTime += dt;
  target = brain.detour[brain.detourIndex];
  gap = 0.6;
  if (distance(position, target) < gap + 0.3) brain.detourIndex += 1;
  if (brain.detourIndex >= brain.detour.length || toPlayer < FOLLOW_GAP + 1.2 || brain.detourTime > 20) {
   brain.trail.length = 0;
   brain.sight.timer = 0;
   brain.detour = null;
   target = feet;
   gap = FOLLOW_GAP;
  } else {
   target = brain.detour[brain.detourIndex];
   wantedSpeed = 5;
  }
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

 // Rastro del astronauta: una miga cada pocos pasos, mientras pisa suelo.
 const trail = brain.trail;
 const lastCrumb = trail[trail.length - 1];
 if (player.grounded && (!lastCrumb || distance(lastCrumb, feet) > CRUMB_STEP)) {
  trail.push({ x: feet.x, z: feet.z });
  if (trail.length > CRUMBS) trail.shift();
 }
 let following = false; // va tras una miga, no recto hacia ti
 let waitHere = false; // no hay por dónde ir: espera
 const tracking = brain.mode === "follow" && !woody.post;
 if (tracking) {
  // Si puede ir recto hacia ti, va recto. Si no (un cortado, la barandilla, una
  // casa por medio), sigue tus pasos: va a la miga más cercana a ti a la que
  // llega en línea recta.
  const sight = brain.sight;
  sight.timer -= dt;
  if (sight.timer <= 0) {
   sight.timer = 0.12;
   sight.clear = toPlayer < FOLLOW_GAP || clearLine(world, position, feet);
   sight.crumb = -1;
   if (!sight.clear) {
    for (let i = trail.length - 1; i >= 0; i--) {
     if (clearLine(world, position, trail[i])) {
      sight.crumb = i;
      break;
     }
    }
   }
  }
  if (sight.clear) {
   trail.length = 0;
   brain.noWay = 0;
   brain.detourFor = null;
   // (Con el camino libre, el rodeo sobra.)
   if (brain.detour && toPlayer < 9) {
    brain.detour = null;
    target = feet;
    gap = FOLLOW_GAP;
    wantedSpeed = 0;
   }
  } else if (brain.detour) {
   // Sigue su rodeo.
  } else if (sight.crumb < 0) {
   // Ni recto ni por tus pasos (has vadeado agua honda, o lo han dejado al
   // otro lado de algo): rodea por la red de caminos, una vez; si tampoco así
   // llega, te espera quieto en vez de empujar contra lo que le corta el paso.
   brain.noWay += dt;
   if (brain.detourFor && distance(brain.detourFor, feet) > 6) brain.detourFor = null;
   const route = !brain.detourFor && world.guide ? findRoute(world.guide, position, nearestNode(world.guide, feet)) : null;
   if (route?.length) {
    Object.assign(brain, { detour: route, detourIndex: 0, detourTime: 0, stuck: 0, detourFor: { x: feet.x, z: feet.z } });
    target = route[0];
    gap = 0.6;
    wantedSpeed = 5;
   } else waitHere = true;
  } else {
   brain.noWay = 0;
   let index = Math.min(sight.crumb, trail.length - 1);
   // Las migas ya alcanzadas se sueltan.
   while (index < trail.length - 1 && distance(position, trail[index]) < 0.45) index += 1;
   if (index > 0) {
    trail.splice(0, index);
    sight.crumb = Math.max(-1, sight.crumb - index);
    index = 0;
   }
   target = trail[index];
   gap = 0.2;
   following = true;
  }
 }
 if (waitHere) wantedSpeed = 0;

 const toTarget = distance(position, target);
 if (brain.mode === "follow" && !brain.detour && !waitHere) {
  if (target === feet || following) {
   // A tu paso: tu velocidad, más lo que haga falta para recuperar la distancia.
   // Histéresis: echa a andar cuando te alejas un poco más de lo que para.
   const start = FOLLOW_GAP + (brain.moving ? 0.1 : 1.1);
   if (toPlayer > start || (following && brain.moving)) wantedSpeed = Math.min(MAX_SPEED, Math.max(1.1, playerSpeed * 0.9 + (toPlayer - FOLLOW_GAP) * 1.2));
   if (following && toPlayer > start) wantedSpeed = Math.max(wantedSpeed, 2.2);
  } else {
   // Hacia su puesto (junto al campo de fútbol).
   const start = gap + (brain.moving ? 0.1 : 1.1);
   if (toTarget > start) wantedSpeed = Math.min(MAX_SPEED, Math.max(1.1, (toTarget - gap) * 1.9));
  }
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
 // Velocidad neta de los últimos ~0,2 s: si rebota contra algo sin avanzar,
 // se anula, y Woody no «corre en el sitio».
 if (dt > 0) {
  const k = 1 - Math.exp(-dt / 0.18), pace = brain.pace;
  pace.x += ((position.x - fromX) / dt - pace.x) * k;
  pace.z += ((position.z - fromZ) / dt - pace.z) * k;
  pace.speed = Math.hypot(pace.x, pace.z);
 }
 brain.moving = wantedSpeed > 0.2;

 // Pegado al terreno: se mira el suelo bajo las patas delanteras y traseras.
 // La altura es la media de ambas (o la del centro, en una cresta) y el cuerpo
 // cabecea según la pendiente. Sin retraso: ni se hunde al subir ni flota al bajar.
 const aheadX = -Math.sin(woody.facing), aheadZ = -Math.cos(woody.facing);
 const front = world.height(position.x + aheadX * PAWS, position.z + aheadZ * PAWS);
 const rear = world.height(position.x - aheadX * PAWS, position.z - aheadZ * PAWS);
 // (Donde no hace pie, nada: va a flote, con el lomo fuera.)
 const ground = Math.max((front + rear) / 2, world.height(position.x, position.z), world.waterLevel - SWIM_DEPTH);
 position.y += Math.max(-CLIMB * dt, Math.min(CLIMB * dt, ground - position.y));
 const slope = Math.max(-0.55, Math.min(0.55, Math.atan2(front - rear, PAWS * 2)));
 brain.pitch += (slope - brain.pitch) * (1 - Math.exp(-10 * dt));

 // ¿Atascado? Primero prueba a rodear de lado; si sigue, da el rodeo por la
 // red de caminos; y solo si nada funciona y nadie lo ve, reaparece cerca.
 if (brain.moving && brain.speed < wantedSpeed * 0.3) brain.stuck += dt;
 else brain.stuck = Math.max(0, brain.stuck - dt * 2);
 if (brain.stuck > 0.6 && brain.sidestep <= 0) {
  brain.sidestep = 0.9;
  brain.sideSign = -brain.sideSign;
 }
 if (brain.mode === "follow" && brain.detour && brain.stuck > 1.6) {
  // Ni el rodeo sale: lo deja y espera.
  brain.detour = null;
  brain.stuck = 0;
 } else if (tracking && !brain.detour && !brain.detourFor && brain.stuck > 1.4 && world.guide) {
  const route = findRoute(world.guide, position, nearestNode(world.guide, feet));
  if (route?.length) Object.assign(brain, { detour: route, detourIndex: 0, detourTime: 0, stuck: 0, detourFor: { x: feet.x, z: feet.z } });
 }
 // Recolocación: si se ha quedado lejos, o lleva un rato sin poder llegar, y
 // ni él ni el sitio nuevo se ven, aparece cerca de ti (entrará andando en pantalla).
 if (brain.mode !== "guide" && !woody.post && (brain.stuck > 6 || brain.noWay > 3 || toPlayer > LOST_DISTANCE)) {
  const unseen = visible && !visible(position.x, position.z);
  const spot = unseen ? findSpotNear(world, feet, visible) : null;
  if (spot) {
   position.set(spot.x, world.height(spot.x, spot.z), spot.z);
   brain.velocity.x = brain.velocity.z = 0;
   brain.detour = null;
   brain.trail.length = 0;
   brain.sight.timer = 0;
   brain.stuck = 0;
   brain.noWay = 0;
   brain.detourFor = null;
   brain.jumps += 1;
  }
  brain.stuck = Math.min(brain.stuck, 4);
 }

 // Hacia dónde mira: hacia donde anda; parado, hacia ti.
 if (brain.speed > 0.4) woody.facing = Math.atan2(-brain.velocity.x, -brain.velocity.z);
 else if (!busy && (brain.posture === "stand" || attend) && toPlayer > 0.5) {
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
 Object.assign(brain, { mode: "guide", route, routeIndex: 0, place, waiting: false, rest: 0, detour: null });
 return true;
}

export function stopGuide(brain) {
 Object.assign(brain, { mode: "follow", route: null, place: null, waiting: false, detour: null });
}

export function startPet(brain, spot) {
 Object.assign(brain, { mode: "pet", petSpot: spot, petTimer: 0, route: null, waiting: false, rest: 0 });
}
