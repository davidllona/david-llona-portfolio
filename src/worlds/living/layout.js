// The Living World: el plano del primer planeta. De aquí salen el relieve, el
// agua, dónde está cada zona, dónde crece cada cosa y por dónde se puede andar.
// Unidades en metros. Y hacia arriba; "norte" es -Z (arriba en pantalla).
//
//                    ┌───────── MESETA (4 m) ─────────┐
//                    │  casa del árbol   observatorio  │
//          rampa ↗   └──────┬ cascada ┬───────────────┘
//   PROYECTOS            estanque ~~~~ río ~~~~╮
//   (cabañas)  ─────── COHETE ───── puente ────┼── CONTACTO
//                         │                    ╰~~~~ mar
//        FÚTBOL        BALONCESTO

export const WATER_LEVEL = -0.25;
const MAX_WADE = -0.85; // hasta dónde se mete el astronauta en el agua
const MAX_SLOPE = 1.25; // pendiente a partir de la cual es pared (≈ 51°)

const smooth = (edge0, edge1, value) => {
 const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
 return t * t * (3 - 2 * t);
};
const distance = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// Distancia a un segmento y posición (0–1) del punto más cercano sobre él.
function toSegment(x, z, ax, az, bx, bz) {
 const dx = bx - ax;
 const dz = bz - az;
 const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
 return { distance: Math.hypot(x - (ax + dx * t), z - (az + dz * t)), t };
}
function toPolyline(x, z, points) {
 let best = Infinity;
 for (let i = 0; i < points.length - 1; i++) {
  best = Math.min(best, toSegment(x, z, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]).distance);
 }
 return best;
}

// ── Relieve ─────────────────────────────────────────────────────────────────
// Orilla: un círculo con ondulaciones (Terrain.jsx no la repite: el agua usa
// la profundidad real del terreno).
export const shoreRadius = (angle) => 46 + 3.2 * Math.sin(3 * angle + 0.6) + 2.2 * Math.sin(5 * angle + 2) + 1.2 * Math.sin(2 * angle);

export const PLATEAU = { x: 8, z: -26.5, halfX: 17, halfZ: 9, corner: 6, height: 4.2 };
// Distancia con signo al borde de la meseta (negativa dentro).
function plateauDistance(x, z) {
 const qx = Math.abs(x - PLATEAU.x) - (PLATEAU.halfX - PLATEAU.corner);
 const qz = Math.abs(z - PLATEAU.z) - (PLATEAU.halfZ - PLATEAU.corner);
 return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - PLATEAU.corner;
}
// Rampa de subida, en el extremo oeste de la meseta.
export const RAMP = { from: [-14.5, -14], to: [-7.6, -22.5], width: 3.6 };

const HILLS = [
 { x: -31, z: -19, height: 1.9, radius: 9 },
 { x: -7, z: 37, height: 1.3, radius: 8 },
 { x: 31, z: 30, height: 1.7, radius: 9 },
 { x: -36, z: 10, height: 1.2, radius: 7 },
];

export const POND = { x: 8, z: -11.6, r: 4.8 };
// El río sale del estanque y llega al mar por el este.
export const RIVER = [
 [8, -11.6],
 [15, -9.2],
 [20.5, -4.5],
 [23.4, 2],
 [27, 8.5],
 [33, 12],
 [41, 13.5],
 [52, 14.5],
];
// Arroyo sobre la meseta, del manantial al borde de la cascada.
export const STREAM = [
 [15.5, -31],
 [12, -26.5],
 [9.2, -21.5],
 [8.2, -17.9],
];
export const WATERFALL = { x: 8.2, z: -17.3, top: PLATEAU.height, width: 2.6 };
const STREAM_DEPTH = 0.36; // lo que se hunde el cauce del arroyo en la meseta
export const STREAM_LEVEL = PLATEAU.height - 0.17; // altura de su agua

// Puente sobre el río, en el camino a Contacto. El tablero se pisa: su altura
// sustituye a la del cauce.
export const BRIDGES = [{ from: [19.3, -0.4], to: [26.9, 0.9], width: 2.8, rise: 0.75 }];

function bridgeHeight(x, z) {
 for (const bridge of BRIDGES) {
  const hit = toSegment(x, z, ...bridge.from, ...bridge.to);
  if (hit.distance < bridge.width / 2 && hit.t > 0 && hit.t < 1) return 0.12 + Math.sin(hit.t * Math.PI) * bridge.rise;
 }
 return null;
}

// Altura del terreno sin contar el puente (la usa el agua, que pasa por debajo).
export function groundHeight(x, z) {
 const shore = shoreRadius(Math.atan2(z, x));
 const fromCentre = Math.hypot(x, z);
 // Llano que cae hacia el mar en la orilla.
 let height = -3.2 * smooth(shore - 5, shore + 6, fromCentre);
 for (const hill of HILLS) {
  const d = distance(x, z, hill.x, hill.z) / hill.radius;
  height += hill.height * Math.exp(-d * d * 2.2);
 }

 // Meseta con acantilado y su rampa.
 const edge = plateauDistance(x, z);
 const onPlateau = 1 - smooth(-1.5, 0.3, edge);
 const ramp = toSegment(x, z, ...RAMP.from, ...RAMP.to);
 const onRamp = 1 - smooth(RAMP.width / 2 - 0.5, RAMP.width / 2, ramp.distance);
 const rampHeight = height + (Math.max(height, PLATEAU.height * ramp.t) - height) * onRamp;
 height = Math.max(height + (PLATEAU.height - height) * onPlateau, rampHeight);

 // Cauce del arroyo y poza del manantial, tallados en la meseta.
 if (onPlateau > 0.5) {
  const channel = 1 - smooth(0.4, 1.3, toPolyline(x, z, STREAM));
  const spring = 1 - smooth(0.9, 2.1, distance(x, z, STREAM[0][0], STREAM[0][1]));
  height -= STREAM_DEPTH * Math.max(channel, spring) * onPlateau;
 }

 // Estanque y cauce del río, solo en tierra baja.
 if (edge > 0.3) {
  const pond = 1 - smooth(POND.r - 2.4, POND.r, distance(x, z, POND.x, POND.z));
  const river = 1 - smooth(0.9, 2.5, toPolyline(x, z, RIVER));
  const carve = Math.max(pond * 1.15, river);
  if (carve > 0) height = Math.min(height, height * (1 - carve) + (WATER_LEVEL - 0.55) * carve);
  // El estanque gana fondo hacia el centro: da volumen al agua.
  height -= 1.0 * (1 - smooth(0.6, POND.r - 1.6, distance(x, z, POND.x, POND.z)));
 }

 // Explanadas: la pista y el campo de fútbol se asientan sobre suelo llano.
 for (const rect of [COURT, PITCH]) {
  const outside = Math.max(rect.x0 - x, x - rect.x1, rect.z0 - z, z - rect.z1);
  if (outside < 3) height *= smooth(0.6, 3, outside);
 }
 return height;
}

// Altura que pisan los personajes.
export function height(x, z) {
 return bridgeHeight(x, z) ?? groundHeight(x, z);
}

// ¿Está vedado este punto? Lo están el agua profunda y las paredes: un punto en
// pendiente fuerte al que se llegaría subiendo. Bajar por un cortado sí se puede
// (el astronauta salta); Woody no baja ni se mete en agua honda.
function blocked(x, z, fromY, agent) {
 const here = height(x, z);
 if (here <= (agent?.dog ? -0.42 : MAX_WADE)) return true;
 if (agent?.prop) return here < MAX_WADE - 0.2;
 if (bridgeHeight(x, z) !== null) return false;
 const e = 0.25;
 const slope = Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
 if (slope < MAX_SLOPE) return false;
 return agent?.dog ? true : here > fromY + 0.05;
}

// ── Zonas ───────────────────────────────────────────────────────────────────
export const COLORS = {
 proyectos: "#ff6b2c",
 "sobre-mi": "#9a6bff",
 contacto: "#2bb673",
 cv: "#ffb238",
 lab: "#19b6c9",
 deporte: "#ff5d8f",
};

export const SPAWN = { x: 0, z: 7.5 };
export const PAD = { x: 0, z: 0, padRadius: 4.6, color: "#8f8c99" }; // plataforma del cohete, en el centro
// Cuatro cabañas de proyecto a lo largo del camino del oeste, mirando al sur.
export const PROJECT_CABINS = [-13, -20.5, -28, -35.5].map((x, i) => ({ x, z: -5.4 - Math.abs(i - 1.5) * 0.5 }));
// Tres tótems de experimentos, al otro lado del mismo camino.
export const LAB_TOTEMS = [-17, -24.5, -32].map((x) => ({ x, z: 5.6 }));
export const CV_KIOSK = { x: 6.6, z: 6.4 };
export const TREEHOUSE = { x: 1.5, z: -27 }; // Sobre mí, en la meseta
export const OBSERVATORY = { x: 19, z: -25.5 };
export const CONTACT = { x: 34, z: -2.5, antenna: { x: 37.5, z: -6.5 }, terminals: [-2.6, 0, 2.6].map((dx) => ({ x: 34 + dx, z: -0.8 })) };
export const COURT = { x0: -5, x1: 11, z0: 20, z1: 30.4 }; // baloncesto
export const BASKET = {
 center: { x: (COURT.x0 + COURT.x1) / 2, z: (COURT.z0 + COURT.z1) / 2 },
 hoop: { x: COURT.x1 - 0.9, z: (COURT.z0 + COURT.z1) / 2, rimHeight: 3.0 }, // tablero al este
 ballStand: { x: COURT.x0 + 5.8, z: COURT.z1 - 1.8 },
};
export const PITCH = { x0: -33, x1: -14, z0: 17, z1: 29 }; // fútbol
export const WIND_CHIME = { x: -27.5, z: -22.5 }; // despierta al bosque
export const ANCIENT_TREES = [
 { x: -29.5, z: -25.5, scale: 1.25 },
 { x: 26.5, z: -31, scale: 1.05 },
 { x: 17, z: 33, scale: 1.1 },
];

// Caminos de tierra entre las zonas.
export const PATHS = [
 [[0, 5], [0, 19.5]],
 [[-4.6, 0], [-39, 0]],
 [[4.6, 0], [19.3, -0.4]],
 [[26.9, 0.9], [34, 1.6]],
 [[-3.3, -3.3], [-10.5, -9.5], [-14.5, -14]],
 [[-7.6, -22.5], [-3, -25], [1.5, -24.4]],
 [[1.5, -24.4], [10, -23.2], [19, -22.6]],
 [[-3.3, 3.6], [-12, 11], [-17, 16.5]],
 [[3.6, 3.4], [6.6, 5.4]],
];
function pathDistance(x, z) {
 let best = Infinity;
 for (const path of PATHS) best = Math.min(best, toPolyline(x, z, path));
 return best;
}

// Qué hay en cada punto del suelo; lo usa Terrain.jsx para colorearlo.
export function surface(x, z) {
 const h = groundHeight(x, z);
 if (h < WATER_LEVEL - 0.05) return "bed";
 // Playa: una franja junto al mar, y las orillas del río y del estanque.
 if (h < -0.04 || Math.hypot(x, z) > shoreRadius(Math.atan2(z, x)) - 5.5) return "sand";
 const e = 0.4;
 const slope = Math.hypot(groundHeight(x + e, z) - groundHeight(x - e, z), groundHeight(x, z + e) - groundHeight(x, z - e)) / (2 * e);
 if (slope > 0.95) return "rock";
 if (distance(x, z, PAD.x, PAD.z) < PAD.padRadius + 0.6) return "stone";
 // Bajo la pista y el campo no crece hierba.
 if ([COURT, PITCH].some((rect) => x > rect.x0 - 0.5 && x < rect.x1 + 0.5 && z > rect.z0 - 0.5 && z < rect.z1 + 0.5)) return "path";
 if (pathDistance(x, z) < 1.25) return "path";
 return "grass";
}

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
const random = createRandom(20261112);

const inRect = (x, z, rect, margin) => x > rect.x0 - margin && x < rect.x1 + margin && z > rect.z0 - margin && z < rect.z1 + margin;
// Claros: sitios donde no crece nada alto.
const CLEARINGS = [
 { ...PAD, r: 8.5 },
 { ...CV_KIOSK, r: 2.6 },
 { ...TREEHOUSE, r: 5.2 },
 { ...OBSERVATORY, r: 5 },
 { x: CONTACT.x, z: CONTACT.z, r: 7.5 },
 { ...WIND_CHIME, r: 2.4 },
 { x: POND.x, z: POND.z, r: POND.r + 0.8 },
 { x: WATERFALL.x, z: WATERFALL.z - 1.5, r: 3 },
 ...PROJECT_CABINS.map((c) => ({ ...c, r: 4.2 })),
 ...LAB_TOTEMS.map((c) => ({ ...c, r: 2.4 })),
 ...ANCIENT_TREES.map((t) => ({ ...t, r: 4.5 })),
];
function isClear(x, z, margin) {
 if (CLEARINGS.some((c) => distance(x, z, c.x, c.z) < c.r + margin)) return false;
 if (inRect(x, z, COURT, 2 + margin) || inRect(x, z, PITCH, 2 + margin)) return false;
 if (pathDistance(x, z) < 2.2 + margin) return false;
 if (toPolyline(x, z, RIVER) < 3 + margin || toPolyline(x, z, STREAM) < 1.6 + margin) return false;
 return toSegment(x, z, ...RAMP.from, ...RAMP.to).distance > 3 + margin;
}

// Reparte `count` puntos por la isla. `accept(x, z)` filtra por terreno.
function scatter(count, { margin = 0, spacing = 0, others = [], accept, tries = 80 } = {}) {
 const points = [];
 for (let i = 0; points.length < count && i < count * tries; i++) {
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(random()) * (shoreRadius(angle) - 2);
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = groundHeight(x, z);
  if (margin > -50 && !isClear(x, z, margin)) continue;
  if (accept && !accept(x, z, y)) continue;
  if (spacing && [...points, ...others].some((p) => distance(p.x, p.z, x, z) < spacing)) continue;
  points.push({ x, y, z, seed: random(), turn: random() * Math.PI * 2 });
 }
 return points;
}

const flat = (x, z) => {
 const e = 0.6;
 return Math.hypot(groundHeight(x + e, z) - groundHeight(x - e, z), groundHeight(x, z + e) - groundHeight(x, z - e)) / (2 * e) < 0.45;
};
const dryLand = (x, z, y) => y > -0.02 && flat(x, z) && surface(x, z) !== "sand";

// La cámara mira desde el sur y desde arriba: un árbol justo al sur de algo lo
// tapa. Estos son los sitios desde los que se mira cada cosa.
const VIEWPOINTS = [
 { x: SPAWN.x, z: SPAWN.z + 2, r: 5.5 },
 { x: CV_KIOSK.x, z: CV_KIOSK.z + 3, r: 3 },
 { x: TREEHOUSE.x + 2, z: TREEHOUSE.z + 5.5, r: 4.5 },
 { x: OBSERVATORY.x, z: OBSERVATORY.z + 5.5, r: 4 },
 { x: CONTACT.x, z: CONTACT.z + 6.5, r: 5 },
 { x: POND.x, z: POND.z + 7, r: 4 },
 { x: WIND_CHIME.x, z: WIND_CHIME.z + 3.5, r: 3 },
 ...PROJECT_CABINS.map((c) => ({ x: c.x + 0.4, z: c.z + 5, r: 3.6 })),
 ...LAB_TOTEMS.map((c) => ({ x: c.x, z: c.z + 3.6, r: 2.8 })),
];
const treeSite = (x, z, y) =>
 dryLand(x, z, y) &&
 pathDistance(x, z) > 3.3 &&
 !VIEWPOINTS.some((v) => distance(x, z, v.x, v.z) < v.r) &&
 ![COURT, PITCH].some((rect) => x > rect.x0 - 3 && x < rect.x1 + 3 && z > rect.z0 - 2 && z < rect.z1 + 7);

// Árboles: de copa redonda, pinos (más en el norte y en la meseta) y cerezos.
const allTrees = scatter(118, { margin: 0.6, spacing: 3.1, accept: treeSite });
const trees = allTrees.map((tree) => {
 const roll = tree.seed;
 const north = tree.z < -8 || tree.y > 3;
 const kind = roll < (north ? 0.5 : 0.14) ? "pine" : roll > 0.86 ? "cherry" : "round";
 return { ...tree, kind, scale: 0.82 + ((roll * 7919) % 1) * 0.55 };
});
const rocks = scatter(46, { margin: -0.4, spacing: 2.4, others: trees, accept: (x, z, y) => y > -0.2 }).map((r) => ({ ...r, scale: 0.4 + r.seed * 0.85 }));
// Rocas al pie del acantilado, para que la pared no nazca del suelo a pelo.
const cliffRocks = scatter(60, { margin: -100, spacing: 1.7, accept: (x, z) => { const e = plateauDistance(x, z); return e > 0.6 && e < 2.2 && distance(x, z, WATERFALL.x, WATERFALL.z) > 3 && toSegment(x, z, ...RAMP.from, ...RAMP.to).distance > 3; } }).map((r) => ({ ...r, scale: 0.6 + r.seed * 0.9 }));
const bushes = scatter(130, { margin: -0.5, spacing: 1.5, others: [...trees, ...rocks], accept: dryLand }).map((b) => ({ ...b, scale: 0.45 + b.seed * 0.5 }));
const ferns = scatter(150, { margin: -0.9, spacing: 1.1, others: trees, accept: dryLand });
const mushrooms = scatter(46, { margin: -0.6, spacing: 1.4, accept: dryLand });
// Flores y hierba: matas alrededor de puntos repartidos; llegan hasta el borde de los caminos.
const cluster = (centres, perCentre, spread) =>
 centres.flatMap((centre) =>
  Array.from({ length: perCentre }, () => {
   const angle = random() * Math.PI * 2;
   const radius = Math.sqrt(random()) * spread;
   const x = centre.x + Math.cos(angle) * radius;
   const z = centre.z + Math.sin(angle) * radius;
   return { x, y: groundHeight(x, z), z, seed: random(), turn: random() * Math.PI, tint: centre.seed };
  }),
 ).filter((p) => surface(p.x, p.z) === "grass");
const flowers = cluster(scatter(70, { margin: -1.4, accept: dryLand }), 9, 1.3);
const grass = cluster(scatter(520, { margin: -1.5, accept: dryLand }), 14, 1.6);
// Nenúfares en el estanque y juncos en sus orillas.
const lilies = Array.from({ length: 9 }, () => {
 const angle = random() * Math.PI * 2;
 const radius = 0.8 + random() * (POND.r - 2.6);
 return { x: POND.x + Math.cos(angle) * radius, z: POND.z + Math.sin(angle) * radius, seed: random(), turn: random() * 6 };
}).filter((lily) => distance(lily.x, lily.z, WATERFALL.x, WATERFALL.z + 2.4) > 1.8);

// Farolas a lo largo de los caminos.
const lanterns = [];
for (const path of PATHS) {
 for (let i = 0; i < path.length - 1; i++) {
  const [ax, az] = path[i];
  const [bx, bz] = path[i + 1];
  const length = distance(ax, az, bx, bz);
  for (let d = 4.5, side = i % 2 ? -1 : 1; d < length - 2; d += 9, side = -side) {
   const x = ax + ((bx - ax) * d) / length + (-(bz - az) / length) * 1.9 * side;
   const z = az + ((bz - az) * d) / length + ((bx - ax) / length) * 1.9 * side;
   if (!CLEARINGS.some((c) => distance(x, z, c.x, c.z) < c.r - 1.5)) lanterns.push({ x, y: groundHeight(x, z), z });
  }
 }
}

export const SCATTER = { trees, rocks, cliffRocks, bushes, ferns, mushrooms, flowers, grass, lilies, lanterns };

// ── Colisiones ──────────────────────────────────────────────────────────────
const shipCollider = { x: PAD.x, z: PAD.z, r: 2.3, active: true };
const colliders = [
 ...trees.map((t) => ({ x: t.x, z: t.z, r: (t.kind === "pine" ? 0.5 : 0.42) * t.scale })),
 ...ANCIENT_TREES.map((t) => ({ x: t.x, z: t.z, r: 1.5 * t.scale })),
 ...rocks.filter((r) => r.scale > 0.75).map((r) => ({ x: r.x, z: r.z, r: 0.8 * r.scale })),
 ...cliffRocks.map((r) => ({ x: r.x, z: r.z, r: 0.75 * r.scale })),
 ...lanterns.map((l) => ({ x: l.x, z: l.z, r: 0.2 })),
 // Cabañas: tres círculos a lo ancho de cada una.
 ...PROJECT_CABINS.flatMap((c) => [-1.5, 0, 1.5].map((dx) => ({ x: c.x + dx, z: c.z - 1.2, r: 1.45 }))),
 ...LAB_TOTEMS.map((t) => ({ ...t, r: 0.7 })),
 { ...CV_KIOSK, r: 0.85 },
 { x: TREEHOUSE.x, z: TREEHOUSE.z - 1.6, r: 1.5 },
 ...[-1.6, 0, 1.6].map((dx) => ({ x: OBSERVATORY.x + dx, z: OBSERVATORY.z - 1.4, r: 1.7 })),
 { x: CONTACT.x, z: CONTACT.z - 2.6, r: 2 },
 { ...CONTACT.antenna, r: 1.2 },
 ...CONTACT.terminals.map((t) => ({ ...t, r: 0.5 })),
 { ...WIND_CHIME, r: 0.35 },
 { x: BASKET.hoop.x + 0.6, z: BASKET.hoop.z, r: 0.35 },
 { ...BASKET.ballStand, r: 0.24 },
 // Barandillas del puente: solo se cruza por el tablero.
 ...BRIDGES.flatMap((bridge) => {
  const [ax, az] = bridge.from;
  const [bx, bz] = bridge.to;
  const length = distance(ax, az, bx, bz);
  const nx = -(bz - az) / length;
  const nz = (bx - ax) / length;
  return [-1, 1].flatMap((side) =>
   Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return { x: ax + (bx - ax) * t + nx * side * (bridge.width / 2 + 0.2), z: az + (bz - az) * t + nz * side * (bridge.width / 2 + 0.2), r: 0.42 };
   }),
  );
 }),
 shipCollider,
];

// Cajas y barriles para jugar, lejos de las zonas de contenido.
const PROPS = [
 { type: "crate", x: -8.5, z: 12.5 },
 { type: "crate", x: -7.2, z: 13.4 },
 { type: "crate", x: -8.1, z: 14.3 },
 { type: "barrel", x: 13.5, z: 9.5 },
 { type: "barrel", x: 14.9, z: 10.6 },
 { type: "crate", x: 12.9, z: 11.2 },
 { type: "crate", x: -22, z: -13.5 },
 { type: "barrel", x: -23.6, z: -14.4 },
];

// El mundo, con la interfaz que usan el jugador, Woody, la nave y los objetos.
// Qué se pisa en (x, z), para el sonido de los pasos.
function footing(x, z) {
 if (bridgeHeight(x, z) !== null) return "wood";
 if (inRect(x, z, COURT, 0) || distance(x, z, PAD.x, PAD.z) < PAD.padRadius) return "stone";
 const kind = surface(x, z);
 return kind === "rock" || kind === "bed" ? "stone" : kind;
}
// Cuánto se oye el agua en (x, z), de 0 a 1: la cascada llega lejos; el río y el mar, menos.
function waterNear(x, z) {
 const fall = 1 / (1 + (distance(x, z, WATERFALL.x, WATERFALL.z + 1.5) / 7) ** 2);
 const river = 0.45 / (1 + (toPolyline(x, z, RIVER) / 4) ** 2);
 const sea = 0.5 * smooth(-9, -1, Math.hypot(x, z) - shoreRadius(Math.atan2(z, x)));
 return Math.min(1, Math.max(fall, river, sea));
}

export const living = {
 id: "living",
 name: "The Living World",
 spawn: SPAWN,
 waterLevel: WATER_LEVEL,
 height,
 blocked,
 surface: footing,
 waterNear,
 // Zonas que cuentan para el logro «Explorador».
 areas: [
  { id: "proyectos", x: -24, z: -1, r: 9 },
  { id: "contacto", x: CONTACT.x, z: CONTACT.z + 1, r: 6 },
  { id: "sobre-mi", x: TREEHOUSE.x + 1.5, z: TREEHOUSE.z + 3, r: 5.5 },
  { id: "observatorio", x: OBSERVATORY.x, z: OBSERVATORY.z + 2.5, r: 5 },
  { id: "cascada", x: POND.x, z: POND.z + 1, r: 7 },
  { id: "deportes", x: (COURT.x0 + COURT.x1) / 2, z: (COURT.z0 + COURT.z1) / 2, r: 7 },
 ],
 colliders,
 ship: PAD,
 shipCollider,
 props: PROPS,
 // Red de caminos por la que Woody guía, y los sitios a los que sabe llevar.
 guide: {
  nodes: {
   cohete: [0, 6.6],
   "cruce-oeste": [-5.2, 0.3],
   proyectos: [-20, 0.2],
   "senda-norte-a": [-4.4, -4.3],
   "senda-norte-b": [-10.5, -9.5],
   "senda-sur-a": [-4.4, 4.5],
   "senda-sur-b": [-12, 11],
   "cruce-este": [5.4, 1],
   puenteO: [19.3, -0.4],
   puenteE: [26.9, 0.9],
   contacto: [33.5, 1.8],
   cv: [6.2, 8.2],
   "pie-rampa": [-14.5, -14],
   "alto-rampa": [-7.6, -22.5],
   "sobre-mi": [1.5, -23.6],
   observatorio: [19, -22],
   deportes: [0, 18.5],
   futbol: [-17, 16.5],
  },
  links: [
   ["cohete", "cruce-oeste"],
   ["cohete", "cruce-este"],
   ["cohete", "cv"],
   ["cohete", "deportes"],
   ["cruce-oeste", "proyectos"],
   ["cruce-oeste", "senda-norte-a"],
   ["senda-norte-a", "senda-norte-b"],
   ["senda-norte-b", "pie-rampa"],
   ["cruce-oeste", "senda-sur-a"],
   ["senda-sur-a", "senda-sur-b"],
   ["senda-sur-b", "futbol"],
   ["cruce-este", "puenteO"],
   ["puenteO", "puenteE"],
   ["puenteE", "contacto"],
   ["pie-rampa", "alto-rampa"],
   ["alto-rampa", "sobre-mi"],
   ["sobre-mi", "observatorio"],
  ],
  places: [
   { id: "proyectos", ask: "Muéstrame proyectos", arrive: "Aquí están los proyectos" },
   { id: "cohete", ask: "Llévame al cohete", arrive: "El cohete" },
   { id: "contacto", ask: "¿Dónde está Contacto?", arrive: "Contacto, al otro lado del río" },
   { id: "sobre-mi", ask: "Llévame a Sobre mí", arrive: "Sobre mí, en la casa del árbol" },
   { id: "cv", ask: "¿Dónde está el CV?", arrive: "Aquí tienes el CV" },
  ],
 },
 // Colores de día y de noche de este planeta (ver experience/theme.js).
 themes: {
  day: {
   hemiSky: "#fff4d6",
   hemiGround: "#6f9f58",
   hemiPower: 1.0,
   sun: "#ffe7bd",
   sunPower: 2.9,
   fog: "#c6e6dc",
   fogDensity: 0.0062,
   background: "#c6e6dc",
   skyTop: "#5fa8e6",
   skyHorizon: "#d9efe2",
   waterShallow: "#63dccb",
   waterDeep: "#1b8fb8",
   glow: 0,
   bloom: 0.45,
   shadow: 1,
  },
  // Noche azul y profunda: la luna recorta las siluetas desde el fondo y la
  // luz cálida la ponen las farolas y las ventanas.
  night: {
   hemiSky: "#4a66d8",
   hemiGround: "#152a52",
   hemiPower: 1.2,
   sun: "#a9c2ff",
   sunPower: 1.55,
   fog: "#0f2350",
   fogDensity: 0.0125,
   background: "#0f2350",
   skyTop: "#050b24",
   skyHorizon: "#1b3a7a",
   waterShallow: "#2a74bd",
   waterDeep: "#0a1d58",
   glow: 1,
   bloom: 0.95,
   shadow: 0.7,
  },
 },
};
