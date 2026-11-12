// El planeta: forma de la isla, altura del terreno, dónde está cada zona y con
// qué se choca. Todo lo que se ve y todo lo que se pisa sale de este archivo.
// Unidades en metros. Y hacia arriba; "norte" es -Z (arriba en pantalla).

export const SPAWN = { x: 0, z: 7 };
export const WATER_LEVEL = -0.22;
export const MAX_WADE = -0.78; // hasta dónde se puede meter uno en el agua
export const PLAYER_RADIUS = 0.42;

// ── Forma de la isla ────────────────────────────────────────────────────────
const ISLAND_RADIUS = 44;
// Radio de la orilla en cada dirección: un círculo con ondulaciones.
// (water.glsl repite esta misma fórmula para dibujar la espuma.)
export const shoreRadius = (angle) => ISLAND_RADIUS + 3 * Math.sin(3 * angle) + 2 * Math.sin(5 * angle + 1);
export const LAKE = { x: -21, z: -18, r: 8, depth: 0.62 };

const smooth = (edge0, edge1, value) => {
 const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
 return t * t * (3 - 2 * t);
};

// Altura del suelo. Llano en toda la isla; baja hacia el mar en la orilla y
// forma una charca poco profunda en el lago.
export function terrainHeight(x, z) {
 const shore = shoreRadius(Math.atan2(z, x));
 let height = -2.6 * smooth(shore - 3, shore + 6, Math.hypot(x, z));
 const fromLake = Math.hypot(x - LAKE.x, z - LAKE.z);
 height -= LAKE.depth * (1 - smooth(LAKE.r - 3, LAKE.r, fromLake));
 return height;
}

// ── Zonas ───────────────────────────────────────────────────────────────────
export const COLORS = {
 proyectos: "#ff4f3a",
 lab: "#19c3c9",
 "sobre-mi": "#9a6bff",
 contacto: "#5ed26a",
 nave: "#ffb238",
};

export const PLAZA = { x: 0, z: 5, r: 5.2 };
export const PROJECT_BOARDS = [-11.4, -3.8, 3.8, 11.4].map((x) => ({ x, z: -30 + Math.abs(x) * 0.12, width: 5.6 }));
export const LAB = {
 center: { x: 28, z: -2 },
 pedestals: [
  { x: 23.5, z: -4.5 },
  { x: 28, z: -7 },
  { x: 32.5, z: -4.5 },
 ],
};
export const ABOUT = {
 center: { x: 0.3, z: 29 },
 court: { x0: -7.4, x1: 8.2, z0: 24, z1: 34 },
 hoop: { x: 7.3, z: 29, rimHeight: 3.0 }, // tablero al este, mirando al oeste
 ballStand: { x: -1.6, z: 32.4 },
 dog: { x: -9.6, z: 27.6 },
 sign: { x: -4.2, z: 21.8 },
};
export const CONTACT = {
 center: { x: -28, z: 6 },
 antenna: { x: -31, z: 1.5 },
 terminals: [
  { x: -31.5, z: 8.5 },
  { x: -28, z: 10 },
  { x: -24.5, z: 8.5 },
 ],
};
export const SHIP = { x: 24, z: -25, padRadius: 4.2 };

// Caminos de losas entre la plaza y cada zona.
export const PATHS = [
 [[0, 0], [0, -23]],
 [[4.5, 3.5], [22, -1.5]],
 [[0, 10.5], [0, 22.5]],
 [[-4.5, 4.5], [-23, 6]],
 [[27.5, -9], [24.5, -20]],
];

// ── Generador aleatorio con semilla: el planeta sale igual en cada visita ────
function createRandom(seed) {
 let state = seed;
 return () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 };
}
const random = createRandom(20261111);

function distanceToSegment(x, z, [[ax, az], [bx, bz]]) {
 const dx = bx - ax;
 const dz = bz - az;
 const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
 return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

// Sitios donde no debe crecer nada: zonas, caminos y agua.
const CLEARINGS = [
 { ...PLAZA, r: 7 },
 { x: 0, z: -28, r: 15.5 },
 { ...LAB.center, r: 8.5 },
 { ...ABOUT.center, r: 12.5 },
 { ...CONTACT.center, r: 8.5 },
 { x: SHIP.x, z: SHIP.z, r: 7.5 },
 { x: LAKE.x, z: LAKE.z, r: LAKE.r + 0.6 },
];
function isClear(x, z, margin = 0) {
 if (CLEARINGS.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + margin)) return false;
 return !PATHS.some((path) => distanceToSegment(x, z, path) < 2.4 + margin);
}

// Reparte `count` puntos por la isla, lejos de los claros y separados entre sí.
function scatter(count, { margin = 0, spacing = 0, inset = 5, others = [] } = {}) {
 const points = [];
 for (let tries = 0; points.length < count && tries < count * 60; tries++) {
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(random()) * (shoreRadius(angle) - inset);
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  if (!isClear(x, z, margin)) continue;
  if (spacing && [...points, ...others].some((p) => Math.hypot(p.x - x, p.z - z) < spacing)) continue;
  points.push({ x, z, seed: random(), turn: random() * Math.PI * 2 });
 }
 return points;
}

const trees = scatter(78, { margin: 0.8, spacing: 3.2 }).map((p) => ({ ...p, scale: 0.78 + p.seed * 0.52 }));
const rocks = scatter(34, { spacing: 2.6, others: trees, inset: 2 }).map((p) => ({ ...p, scale: 0.45 + p.seed * 0.9 }));
const bushes = scatter(60, { spacing: 1.6, others: [...trees, ...rocks], inset: 4 }).map((p) => ({ ...p, scale: 0.5 + p.seed * 0.5 }));
const crystals = scatter(14, { margin: -0.6, spacing: 5, others: [...trees, ...rocks] });
// Hierba: matas de briznas alrededor de puntos repartidos.
const grass = scatter(330, { margin: -1.2, inset: 4.5 }).flatMap((tuft) =>
 Array.from({ length: 16 }, () => {
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(random()) * 1.5;
  return { x: tuft.x + Math.cos(angle) * radius, z: tuft.z + Math.sin(angle) * radius, seed: random(), turn: random() * Math.PI };
 }),
);

// Losas de los caminos y farolas a sus lados.
const tiles = [];
const lanterns = [];
for (const path of PATHS) {
 const [[ax, az], [bx, bz]] = path;
 const length = Math.hypot(bx - ax, bz - az);
 const steps = Math.floor(length / 1.7);
 for (let i = 0; i <= steps; i++) {
  const t = i / steps;
  tiles.push({
   x: ax + (bx - ax) * t + (random() - 0.5) * 0.5,
   z: az + (bz - az) * t + (random() - 0.5) * 0.5,
   turn: (random() - 0.5) * 0.7,
   scale: 0.85 + random() * 0.3,
  });
 }
 const nx = -(bz - az) / length;
 const nz = (bx - ax) / length;
 for (let d = 4, side = 1; d < length - 2; d += 8, side = -side) {
  lanterns.push({ x: ax + ((bx - ax) * d) / length + nx * 2.1 * side, z: az + ((bz - az) * d) / length + nz * 2.1 * side });
 }
}

export const SCATTER = { trees, rocks, bushes, crystals, grass, tiles, lanterns };

// ── Colisiones ──────────────────────────────────────────────────────────────
// Todo lo fijo es un círculo visto desde arriba. `active: false` lo desactiva
// (la nave, mientras está volando).
export const shipCollider = { x: SHIP.x, z: SHIP.z, r: 2.3, active: true };
export const colliders = [
 ...trees.map((t) => ({ x: t.x, z: t.z, r: 0.42 * t.scale })),
 ...rocks.map((r) => ({ x: r.x, z: r.z, r: 0.8 * r.scale })),
 ...crystals.map((c) => ({ x: c.x, z: c.z, r: 0.6 })),
 ...lanterns.map((l) => ({ x: l.x, z: l.z, r: 0.2 })),
 // Carteles de proyectos: una fila de círculos a lo ancho de cada uno.
 ...PROJECT_BOARDS.flatMap((b) => [-2.2, -1.1, 0, 1.1, 2.2].map((dx) => ({ x: b.x + dx, z: b.z, r: 0.55 }))),
 ...LAB.pedestals.map((p) => ({ ...p, r: 0.8 })),
 { x: ABOUT.hoop.x + 0.6, z: ABOUT.hoop.z, r: 0.35 },
 { ...ABOUT.ballStand, r: 0.24 },
 { ...ABOUT.dog, r: 0.8 },
 ...[-1.5, -0.5, 0.5, 1.5].map((dx) => ({ x: ABOUT.sign.x + dx, z: ABOUT.sign.z, r: 0.5 })),
 { ...CONTACT.antenna, r: 1.3 },
 ...CONTACT.terminals.map((t) => ({ ...t, r: 0.5 })),
 shipCollider,
];

// Cajas y barriles repartidos por el planeta.
const PROPS = [
 { type: "crate", x: 5.6, z: 10 },
 { type: "crate", x: 7, z: 10.6 },
 { type: "crate", x: 6.2, z: 11.7 },
 { type: "crate", x: 13.5, z: 4.6 },
 { type: "crate", x: 14.9, z: 5.2 },
 { type: "barrel", x: -9.5, z: -5.5 },
 { type: "barrel", x: -10.8, z: -4.6 },
 { type: "crate", x: -9.2, z: -3.9 },
 { type: "barrel", x: 18.4, z: -19 },
 { type: "barrel", x: 17.2, z: -17.6 },
 { type: "crate", x: 8.5, z: -11 },
 { type: "crate", x: -7.5, z: 14.5 },
];

// El mundo, con la interfaz que usan el jugador, Woody, la nave y los objetos.
export const cosmic = {
 id: "cosmic",
 name: "The Cosmic Lab",
 spawn: SPAWN,
 waterLevel: WATER_LEVEL,
 height: terrainHeight,
 // ¿Está vedado este punto? Aquí solo lo está el agua profunda (Woody se moja menos).
 blocked: (x, z, _fromY, agent) => terrainHeight(x, z) <= (agent?.dog ? -0.3 : MAX_WADE),
 colliders,
 ship: SHIP,
 shipCollider,
 props: PROPS,
 // Red de caminos por la que Woody guía, y los sitios a los que sabe llevar.
 guide: {
  nodes: {
   plaza: [0, 5],
   proyectos: [0, -22],
   lab: [22, -1],
   "sobre-mi": [0, 22],
   contacto: [-23, 7.5],
   nave: [24.5, -19.5],
  },
  links: [
   ["plaza", "proyectos"],
   ["plaza", "lab"],
   ["plaza", "sobre-mi"],
   ["plaza", "contacto"],
   ["lab", "nave"],
  ],
  places: [
   { id: "proyectos", ask: "Muéstrame proyectos", arrive: "Aquí están los proyectos" },
   { id: "nave", ask: "Llévame al cohete", arrive: "El cohete" },
   { id: "contacto", ask: "¿Dónde está Contacto?", arrive: "Contacto" },
   { id: "sobre-mi", ask: "Llévame a Sobre mí", arrive: "Sobre mí" },
  ],
 },
};
