// Mundo 3 · The Cosmic Lab. «Lo que experimento»: un laboratorio en un planeta
// alienígena de colores raros. Al llegar está apagado; cada máquina que se
// enciende manda un rayo de energía al núcleo, que está en el centro. Forma del
// terreno, dónde está cada cosa y con qué se choca: todo sale de este archivo.
// Metros; Y hacia arriba; «norte» es −Z (arriba en pantalla).
//
// Lo que se pisa es un llano redondeado de unos 30 m de radio, con la
// plataforma del cohete delante (es el eje del planeta) y el núcleo en medio.
// Lo cierra un reborde de lomas; más allá, el resto del planeta: lomas, lagos
// de líquido brillante, hongos gigantes y cristales, que no se pisan.
import { TAU, createRandom, noiseAt, onSphere, smooth } from "./globe.js";

export const LIQUID_LEVEL = -0.3; // el líquido brillante de las charcas y de los lagos
export const GRAVITY = 0.4; // de la de siempre: se salta más alto y se cae despacio

// Ruido suave y repetible, en el plano.
function noise2(x, z) {
 const hash = (ix, iz) => {
  const v = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
  return v - Math.floor(v);
 };
 const x0 = Math.floor(x), z0 = Math.floor(z);
 const tx = x - x0, tz = z - z0;
 const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
 const top = hash(x0, z0) * (1 - sx) + hash(x0 + 1, z0) * sx;
 const bottom = hash(x0, z0 + 1) * (1 - sx) + hash(x0 + 1, z0 + 1) * sx;
 return top * (1 - sz) + bottom * sz;
}

// ── El llano que se pisa ────────────────────────────────────────────────────
export const CENTRE = { x: 0, z: -14 };
const reach = (angle) => 30 + 2.4 * Math.sin(3 * angle + 0.7) + 1.6 * Math.sin(5 * angle + 2);
// m hasta el borde del llano (negativo, fuera).
export function edge(x, z) {
 const dx = x - CENTRE.x, dz = z - CENTRE.z;
 return reach(Math.atan2(dz, dx)) - Math.hypot(dx, dz);
}

// ── Sitios ──────────────────────────────────────────────────────────────────
export const COLORS = { nave: "#ff9a3c" };
export const SPAWN = { x: 0, z: 6.5 };
export const PAD = { x: 0, z: 0, padRadius: 4.6, color: "#e6dff0" }; // zona de aterrizaje
// El núcleo de energía, en el centro, sobre su tarima. `ball`: a qué altura está la esfera.
export const CORE = { x: 0, z: -15, r: 3.4, solid: 2.3, ball: 3.3 };
// Las máquinas, en corro alrededor del núcleo, mirándolo (ver content/cosmic.js
// y LabScene.jsx). Cada una es un aparato distinto del laboratorio —modelos
// convertidos de Envato, repintados a la paleta del mundo—: `model` (en
// public/models/cosmic) y `size`, su lado mayor en metros. La de los
// experimentos, sin contenido todavía, es la cápsula hecha a mano, apagada.
const MACHINE_SPOTS = { dosia: [-12.5, -18.5], epidos: [-9, -27.5], chuchometro: [9, -27.5], viajes: [12.5, -18.5], experimentos: [13, -7.5] };
export const MACHINE_KINDS = {
 dosia: { model: "escaner", size: 3.5 },
 epidos: { model: "consola", size: 3.2 },
 chuchometro: { model: "consola-doble", size: 3.6 },
 viajes: { model: "capsula", size: 1.9 },
 experimentos: { model: null },
};
// La punta de la antena de una máquina (de ahí sale su rayo), en sus ejes: a un lado y arriba.
export const MACHINE_TIP = [2.0, 4.6, -0.5];
// Dónde va la luz de estado de cada máquina, en sus ejes: delante, al otro lado.
export const MACHINE_LAMP = [-1.85, 1.05, 1.25];
export const MACHINES = Object.fromEntries(
 Object.entries(MACHINE_SPOTS).map(([id, [x, z]]) => {
  // (El frente del modelo es +Z: se gira hacia el núcleo.)
  const turn = Math.atan2(CORE.x - x, CORE.z - z), ux = Math.sin(turn), uz = Math.cos(turn);
  const [tx, ty, tz] = MACHINE_TIP;
  return [id, { id, x, z, turn, use: { x: x + ux * 2.5, z: z + uz * 2.5 }, tip: [x + tx * Math.cos(turn) + tz * Math.sin(turn), ty, z - tx * Math.sin(turn) + tz * Math.cos(turn)] }];
 }),
);
// La antena, al fondo, sobre una loma: se activa al final («Envía una señal»). Hoy, apagada.
export const ANTENNA = { x: 0, z: -35.5, solid: 1.1 };
// Charcas de líquido brillante: se vadean.
export const POOLS = [
 { x: -14.5, z: -5.5, r: 3.6 },
 { x: 16, z: -28, r: 3.0 },
];
// Tubos por el suelo, de cada máquina al núcleo: por ellos corre el líquido cuando la máquina se enciende.
export const TUBES = Object.fromEntries(
 Object.values(MACHINES).map((machine) => {
  const dx = CORE.x - machine.x, dz = CORE.z - machine.z, length = Math.hypot(dx, dz), ux = dx / length, uz = dz / length;
  // Sale por un lado de la máquina, hace una ese suave y entra en la tarima del núcleo.
  const from = [machine.x + ux * 1.3 - uz * 1.1, machine.z + uz * 1.3 + ux * 1.1], to = [CORE.x - ux * (CORE.r - 0.5), CORE.z - uz * (CORE.r - 0.5)];
  const mid = [(from[0] + to[0]) / 2 - uz * 1.0, (from[1] + to[1]) / 2 + ux * 1.0];
  return [machine.id, [from, mid, to]];
 }),
);
// Losas redondas de la plataforma al núcleo.
export const SLABS = Array.from({ length: 6 }, (_, i) => ({ x: (i % 2 ? 0.35 : -0.35) * (i % 3 ? 1 : 0.4), z: -5.6 - i * 1.15, r: 0.62 + (i % 3) * 0.08 }));

// Miradores: sitios donde la cámara se inclina hacia el horizonte y entran en
// cuadro el cielo, el planeta con anillos y el segundo sol.
export const VIEWPOINTS = [
 { id: "plataforma", x: PAD.x, z: PAD.z + 3, r: 5 },
 { id: "antena", x: ANTENNA.x, z: ANTENNA.z + 3.2, r: 2.6 },
];

// ── Relieve ─────────────────────────────────────────────────────────────────
function plain(x, z) {
 let h = (noise2(x * 0.18 + 3.3, z * 0.18 - 1.1) - 0.5) * 0.16;
 for (const pool of POOLS) h -= 0.85 * (1 - smooth(pool.r - 1.7, pool.r, Math.hypot(x - pool.x, z - pool.z)));
 // La loma de la antena.
 h += 0.9 * (1 - smooth(1.6, 5.2, Math.hypot(x - ANTENNA.x, z - ANTENNA.z)));
 // Llano del todo bajo la plataforma y bajo la tarima del núcleo.
 h *= smooth(PAD.padRadius + 0.3, PAD.padRadius + 2.4, Math.hypot(x - PAD.x, z - PAD.z));
 const core = Math.hypot(x - CORE.x, z - CORE.z);
 return h * smooth(CORE.r, CORE.r + 1.8, core);
}
// El resto del planeta: lomas redondas y, donde el ruido baja, lagos de líquido.
const P = [0, 0, 0];
function hills(x, z) {
 const p = onSphere(x, z, P);
 return Math.max(-1.5, (noiseAt(p, 0.045) * 0.6 + noiseAt(p, 0.11, 5) * 0.4 - 0.4) * 15);
}
// Altura del terreno.
export function ground(x, z) {
 const e = edge(x, z);
 if (e > 1.5) return plain(x, z);
 // El reborde: una loma seguida que cierra el llano; pasada ella, las lomas del planeta.
 const k = smooth(1.5, -5, e), rim = 2.1 * Math.exp(-(((e + 3.2) / 2.6) ** 2));
 return plain(x, z) * (1 - k) + hills(x, z) * k + rim;
}
// Qué se pisa en (x, z), para el sonido de los pasos.
function surface(x, z) {
 if (Math.hypot(x - PAD.x, z - PAD.z) < PAD.padRadius || Math.hypot(x - CORE.x, z - CORE.z) < CORE.r) return "stone";
 return "sand";
}

// ── Lo que crece ────────────────────────────────────────────────────────────
function toSegment(x, z, [ax, az], [bx, bz]) {
 const dx = bx - ax, dz = bz - az;
 const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
 return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}
// Claros: donde no nace nada.
const CLEAR = [
 { ...PAD, r: PAD.padRadius + 2.2 },
 { ...SPAWN, r: 2.6 },
 // (Y delante de la llegada, entre la cámara y el astronauta.)
 { x: SPAWN.x, z: SPAWN.z + 3.4, r: 4.2 },
 { ...CORE, r: CORE.r + 2.4 },
 { ...ANTENNA, r: 3.2 },
 ...Object.values(MACHINES).flatMap((machine) => [{ x: machine.x, z: machine.z, r: 3.1 }, { ...machine.use, r: 2.2 }]),
 ...POOLS.map((pool) => ({ ...pool, r: pool.r + 0.3 })),
];
const LANES = [[[0, -4.6], [0, -12]], ...Object.values(TUBES).flatMap(([a, b, c]) => [[a, b], [b, c]])];
function open(x, z, margin = 0) {
 if (edge(x, z) < 2.4 + margin) return false;
 if (CLEAR.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + margin)) return false;
 return !LANES.some(([a, b]) => toSegment(x, z, a, b) < 1.1 + margin);
}
// Reparte `count` cosas por el llano, separadas entre sí y de `others`.
function scatter(seed, count, { margin = 0, spacing = 0, others = [], pick } = {}) {
 const random = createRandom(seed), out = [];
 for (let tries = 0; out.length < count && tries < count * 80; tries++) {
  const angle = random() * TAU, radius = Math.sqrt(random()) * 31;
  const x = CENTRE.x + Math.cos(angle) * radius, z = CENTRE.z + Math.sin(angle) * radius;
  if (!open(x, z, margin)) continue;
  if (spacing && [...out, ...others].some((one) => Math.hypot(one.x - x, one.z - z) < spacing)) continue;
  out.push({ x, z, turn: random() * TAU, scale: 0.75 + random() * 0.5, ...pick?.(random) });
 }
 return out;
}
const from = (list) => (random) => ({ tint: list[Math.floor(random() * list.length)] });
const CAPS = ["#2fe0cc", "#ff66c4", "#d2f55a"], GEMS = ["#6ff7ea", "#dcff72", "#ff93dc"], LEAVES = ["#25c2b2", "#7d55d6", "#38d6a4"];
// Hongos gigantes: pocos y grandes. (Lejos del camino de la plataforma al núcleo: no tapan la cámara.)
// Tampoco delante de un sitio de uso —entre él y la cámara, que mira desde el sur—: lo taparían.
const USED = [...Object.values(MACHINES).map((machine) => machine.use), { x: CORE.x, z: CORE.z + CORE.r }, { x: ANTENNA.x, z: ANTENNA.z + 3 }, { x: 0, z: -6 }];
const hides = (one) => USED.some((spot) => Math.abs(one.x - spot.x) < 6.5 && one.z > spot.z - 4.5 && one.z < spot.z + 15);
export const MUSHROOMS = scatter(20261301, 26, { margin: 1.4, spacing: 7, pick: (random) => ({ scale: 1 + random() * 0.9, tint: CAPS[Math.floor(random() * CAPS.length)] }) }).filter((one) => !hides(one)).slice(0, 9);
// Racimos de cristales.
export const CRYSTALS = scatter(20261302, 12, { margin: 0.6, spacing: 5, others: MUSHROOMS, pick: from(GEMS) });
// Corales: plantas alienígenas ramificadas.
export const CORALS = scatter(20261308, 11, { margin: 0.7, spacing: 5.5, others: [...MUSHROOMS, ...CRYSTALS], pick: from(["#ff7ccf", "#3fe0cc", "#d2f55a", "#b48cf5"]) }).filter((one) => !hides(one));
// Piedras redondas.
export const STONES = scatter(20261303, 16, { margin: 0.4, spacing: 3, others: [...MUSHROOMS, ...CRYSTALS, ...CORALS] });
const SOLID = [...MUSHROOMS, ...CRYSTALS, ...CORALS, ...STONES];
// Bulbos que laten, tentáculos que se mecen y brotes menudos.
export const BULBS = scatter(20261304, 44, { spacing: 1.5, others: SOLID, pick: from(["#dcff72", "#6ff7ea", "#ff93dc"]) });
export const TENTACLES = scatter(20261305, 30, { spacing: 2, others: SOLID, pick: from(LEAVES) });
export const SPROUTS = scatter(20261306, 170, { margin: -0.5, pick: from(["#2ad0bd", "#8a5fe0", "#c9f25a", "#ff7ccf"]) });
// Rocas que flotan: `lift`, a cuántos metros del suelo.
export const FLOATERS = (() => {
 const random = createRandom(20261307), out = [];
 for (let tries = 0; out.length < 13 && tries < 900; tries++) {
  const angle = random() * TAU, radius = 9 + Math.sqrt(random()) * 26;
  const x = CENTRE.x + Math.cos(angle) * radius, z = CENTRE.z + Math.sin(angle) * radius;
  // (Ni sobre la plataforma ni delante de ella: por ahí baja la nave y mira la cámara.)
  if (Math.hypot(x, z) < 9 || (Math.abs(x) < 7 && z > -9) || out.some((one) => Math.hypot(one.x - x, one.z - z) < 6)) continue;
  out.push({ x, z, turn: random() * TAU, scale: 0.7 + random() * 1.1, lift: 3.4 + random() * 3.6, phase: random() * TAU });
 }
 return out;
})();

// ── El resto del planeta ────────────────────────────────────────────────────
// Lo que se ve desde la órbita y, a lo lejos, tras el reborde. Repartido por
// igual sobre la esfera. `near`: lo que puede asomar andando (lo demás solo se dibuja en vuelo).
export const NEAR = 24; // m más allá del borde del llano
function beyond(seed, count, take) {
 const random = createRandom(seed), out = [];
 for (let n = 0; out.length < count && n < count * 60; n++) {
  const a = Math.acos(1 - random() * 1.97), angle = random() * TAU, d = a * 32;
  const x = Math.cos(angle) * d, z = Math.sin(angle) * d;
  if (edge(x, z) > -7.5) continue;
  const y = ground(x, z), p = onSphere(x, z);
  const spot = { x, z, d, y, p, random };
  const found = take(spot, out);
  if (found) out.push({ x, z, d, y, p, turn: random() * TAU, ...found });
 }
 const near = out.filter((one) => edge(one.x, one.z) > -NEAR);
 return { items: [...near, ...out.filter((one) => edge(one.x, one.z) <= -NEAR)], near: near.length };
}
const apart = (a, b) => Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]);
const dryLand = (spot) => spot.y > LIQUID_LEVEL + 0.5;
export const FAR = (() => {
 const domes = beyond(20261311, 12, (spot, list) => (dryLand(spot) && spot.y < 3.5 && !list.some((one) => apart(one, spot) < 16) ? { scale: 1.1 + spot.random() * 0.8 } : null));
 const mushrooms = beyond(20261312, 80, (spot, list) => (dryLand(spot) && !domes.items.some((one) => apart(one, spot) < 5) && !list.some((one) => apart(one, spot) < 4.2) ? { scale: 1.1 + spot.random() * 1.5, tint: CAPS[Math.floor(spot.random() * CAPS.length)] } : null));
 const crystals = beyond(20261313, 70, (spot, list) => (dryLand(spot) && !domes.items.some((one) => apart(one, spot) < 4) && !list.some((one) => apart(one, spot) < 4) ? { scale: 1.2 + spot.random() * 1.6, tint: GEMS[Math.floor(spot.random() * GEMS.length)] } : null));
 const corals = beyond(20261316, 46, (spot, list) => (dryLand(spot) && !domes.items.some((one) => apart(one, spot) < 4) && !list.some((one) => apart(one, spot) < 5) ? { scale: 1.1 + spot.random() * 1.2, tint: ["#ff7ccf", "#3fe0cc", "#d2f55a", "#b48cf5"][Math.floor(spot.random() * 4)] } : null));
 const tentacles = beyond(20261314, 110, (spot, list) => (dryLand(spot) && !list.some((one) => apart(one, spot) < 2.6) ? { scale: 1.3 + spot.random() * 1.2, tint: LEAVES[Math.floor(spot.random() * LEAVES.length)] } : null));
 // (Las que flotan, también sobre los lagos.)
 const floaters = beyond(20261315, 34, (spot, list) => (!list.some((one) => apart(one, spot) < 9) ? { scale: 1 + spot.random() * 1.6, lift: 4 + spot.random() * 5, phase: spot.random() * TAU } : null));
 return { domes, mushrooms, crystals, corals, tentacles, floaters };
})();

// ── Colisiones ──────────────────────────────────────────────────────────────
export const shipCollider = { x: PAD.x, z: PAD.z, r: 2.3, active: true };
export const colliders = [
 { x: CORE.x, z: CORE.z, r: CORE.solid },
 ...Object.values(MACHINES).map((machine) => ({ x: machine.x, z: machine.z, r: 1.95 })),
 { x: ANTENNA.x, z: ANTENNA.z, r: ANTENNA.solid },
 ...MUSHROOMS.map((one) => ({ x: one.x, z: one.z, r: 0.42 * one.scale })),
 ...CRYSTALS.map((one) => ({ x: one.x, z: one.z, r: 0.6 * one.scale })),
 ...CORALS.map((one) => ({ x: one.x, z: one.z, r: 0.55 * one.scale })),
 ...STONES.map((one) => ({ x: one.x, z: one.z, r: 0.55 * one.scale })),
 shipCollider,
];

// La luz de este mundo (ver experience/theme.js). Siempre es de día: no hay
// atardecer ni noche, las tres franjas llevan la misma paleta. Clara y de
// color: cielo turquesa que se vuelve lima en el horizonte, sombras magenta.
const ALIEN = {
 hemiSky: "#c9f7ee",
 hemiGround: "#a0388a",
 hemiPower: 1.0,
 sun: "#fff1cf",
 sunPower: 2.3,
 fog: "#bfe9b4",
 fogDensity: 0.005,
 background: "#bfe9b4",
 skyTop: "#0e8696",
 skyHorizon: "#d9f48e",
 waterShallow: "#5ff5e6",
 waterDeep: "#12b5ae",
 glow: 0.5,
 bloom: 0.7,
 shadow: 0.82,
};

// El mundo, con la interfaz que usan el jugador, Woody, la nave y los objetos.
const cosmic = {
 id: "cosmic",
 name: "The Cosmic Lab",
 planet: true, // al subir con la nave, el mundo se cierra en esfera
 moment: "day", // siempre con sus dos soles
 ownMoon: true, // trae su propio cielo (Sky.jsx no dibuja su sol)
 gravity: GRAVITY, // gravedad baja (Player.jsx; Woody salta con el astronauta)
 spawn: SPAWN,
 waterLevel: LIQUID_LEVEL,
 height: ground,
 ground,
 // ¿Está vedado este punto? Lo está todo lo que queda más allá del reborde.
 blocked: (x, z) => edge(x, z) < 0.7,
 surface,
 ownAmbience: true, // aquí no cantan los grillos ni los pájaros del primer mundo
 lookout: (x, z) => {
  let most = 0;
  for (const spot of VIEWPOINTS) most = Math.max(most, 1 - smooth(spot.r, spot.r * 2, Math.hypot(x - spot.x, z - spot.z)));
  return most;
 },
 // Zonas de las que Woody dice algo la primera vez que se entra (content/woody.js).
 zones: [
  { id: "lab-nave", x: PAD.x, z: PAD.z, r: PAD.padRadius + 1.4 },
  { id: "lab-nucleo", x: CORE.x, z: CORE.z, r: CORE.r + 2.2 },
 ],
 areas: [],
 colliders,
 ship: PAD,
 shipCollider,
 props: [],
 // Red de caminos por la que Woody guía, y los sitios a los que sabe llevar.
 guide: {
  nodes: {
   cohete: [0, 6],
   // (Rodeando el cohete por el oeste.)
   "lab-rodeo-sur": [-4.2, 2.6],
   "lab-rodeo-norte": [-3.6, -3.6],
   "lab-camino": [0, -6.2],
   "lab-nucleo": [0, -10.4],
   // (Alrededor del núcleo, para ir de una máquina a otra sin atravesarlo.)
   "lab-oeste": [-6.5, -15],
   "lab-este": [6.5, -15],
   "lab-norte": [0, -21.5],
   ...Object.fromEntries(Object.values(MACHINES).map((machine) => [`lab-${machine.id}`, [machine.use.x, machine.use.z]])),
  },
  links: [
   ["cohete", "lab-rodeo-sur"],
   ["lab-rodeo-sur", "lab-rodeo-norte"],
   ["lab-rodeo-norte", "lab-camino"],
   ["lab-camino", "lab-nucleo"],
   ["lab-nucleo", "lab-oeste"],
   ["lab-nucleo", "lab-este"],
   ["lab-oeste", "lab-norte"],
   ["lab-este", "lab-norte"],
   ["lab-oeste", "lab-dosia"],
   ["lab-oeste", "lab-epidos"],
   ["lab-norte", "lab-epidos"],
   ["lab-norte", "lab-chuchometro"],
   ["lab-este", "lab-chuchometro"],
   ["lab-este", "lab-viajes"],
   ["lab-este", "lab-experimentos"],
  ],
  places: [{ id: "cohete" }, { id: "lab-nucleo" }, { id: "lab-dosia" }, { id: "lab-epidos" }, { id: "lab-chuchometro" }, { id: "lab-viajes" }],
 },
 themes: { day: ALIEN, dusk: ALIEN, night: ALIEN },
};
export default cosmic;
