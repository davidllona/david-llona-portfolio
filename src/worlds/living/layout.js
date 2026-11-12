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

// Cajas que acotan dónde influye cada accidente del terreno: fuera de ellas
// no hace falta ni calcularlo. `groundHeight` se llama cientos de miles de
// veces al construir el mundo, así que cada cuenta que se evita se nota.
const boundsOf = (points, margin) => ({
 x0: Math.min(...points.map((p) => p[0])) - margin,
 x1: Math.max(...points.map((p) => p[0])) + margin,
 z0: Math.min(...points.map((p) => p[1])) - margin,
 z1: Math.max(...points.map((p) => p[1])) + margin,
});
const within = (x, z, box) => x > box.x0 && x < box.x1 && z > box.z0 && z < box.z1;
const SEA_FLOOR = -3.2;
let bounds = null; // se rellena la primera vez (las constantes de abajo aún no existen aquí)
function terrainBounds() {
 return (bounds ??= {
  hills: HILLS.map((hill) => ({ ...hill, reach2: (hill.radius * 2.1) ** 2 })),
  // Meseta (con su borde suavizado) y rampa.
  plateau: { x0: PLATEAU.x - PLATEAU.halfX - 2, x1: PLATEAU.x + PLATEAU.halfX + 2, z0: PLATEAU.z - PLATEAU.halfZ - 2, z1: PLATEAU.z + PLATEAU.halfZ + 2 },
  ramp: boundsOf([RAMP.from, RAMP.to], RAMP.width),
  river: boundsOf(RIVER, 3),
  pond: (POND.r + 0.5) ** 2,
 });
}

// Altura del terreno sin contar el puente (la usa el agua, que pasa por debajo).
export function groundHeight(x, z) {
 const fromCentre = Math.hypot(x, z);
 // Mar adentro el fondo es llano.
 if (fromCentre > 60) return SEA_FLOOR;
 const box = terrainBounds();
 const shore = shoreRadius(Math.atan2(z, x));
 // Llano que cae hacia el mar en la orilla.
 let height = SEA_FLOOR * smooth(shore - 5, shore + 6, fromCentre);
 for (const hill of box.hills) {
  const d2 = (x - hill.x) ** 2 + (z - hill.z) ** 2;
  if (d2 < hill.reach2) height += hill.height * Math.exp((-d2 / (hill.radius * hill.radius)) * 2.2);
 }

 // Meseta con acantilado y su rampa.
 let lowland = true;
 const nearPlateau = within(x, z, box.plateau);
 if (nearPlateau || within(x, z, box.ramp)) {
  const edge = plateauDistance(x, z);
  const onPlateau = 1 - smooth(-1.5, 0.3, edge);
  const ramp = toSegment(x, z, ...RAMP.from, ...RAMP.to);
  const onRamp = 1 - smooth(RAMP.width / 2 - 0.5, RAMP.width / 2, ramp.distance);
  const rampHeight = height + (Math.max(height, PLATEAU.height * ramp.t) - height) * onRamp;
  height = Math.max(height + (PLATEAU.height - height) * onPlateau, rampHeight);
  lowland = edge > 0.3;

  // Cauce del arroyo y poza del manantial, tallados en la meseta.
  if (onPlateau > 0.5) {
   const channel = 1 - smooth(0.4, 1.3, toPolyline(x, z, STREAM));
   const spring = 1 - smooth(0.9, 2.1, distance(x, z, STREAM[0][0], STREAM[0][1]));
   height -= STREAM_DEPTH * Math.max(channel, spring) * onPlateau;
  }
 }

 // Estanque y cauce del río, solo en tierra baja.
 if (lowland) {
  const toPond2 = (x - POND.x) ** 2 + (z - POND.z) ** 2;
  const nearPond = toPond2 < box.pond;
  const nearRiver = within(x, z, box.river);
  if (nearPond || nearRiver) {
   const toPond = Math.sqrt(toPond2);
   const pond = nearPond ? 1 - smooth(POND.r - 2.4, POND.r, toPond) : 0;
   const river = nearRiver ? 1 - smooth(0.9, 2.5, toPolyline(x, z, RIVER)) : 0;
   const carve = Math.max(pond * 1.15, river);
   if (carve > 0) height = Math.min(height, height * (1 - carve) + (WATER_LEVEL - 0.55) * carve);
   // El estanque gana fondo hacia el centro: da volumen al agua.
   if (nearPond) height -= 1.0 * (1 - smooth(0.6, POND.r - 1.6, toPond));
  }
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
// Aldea de proyectos: una plaza empedrada en el camino del oeste y cuatro casas
// en arco al norte, cada una con su expositor delante. (x, z) es el punto del
// expositor; la casa queda detrás, girada `turn` hacia la plaza.
export const PLAZA = { x: -24.5, z: -1.6, r: 5.5 };
export const WELL = { x: -24.5, z: -3.5 };
// Cada parcela está a una distancia y con un giro distintos, sin simetría. La
// captura del proyecto va en un escaparate adosado a la fachada: `window` dice
// dónde, en el sistema de la casa (x a lo ancho, z hacia el frente, giro propio).
export const PROJECT_CABINS = [
 { x: -14.2, z: -5.6, turn: -0.34, window: { x: 1.1, z: 2.2, turn: 0 } },
 { x: -20.6, z: -10.4, turn: -0.1, window: { x: 1.95, z: 1.25, turn: -0.42 } },
 { x: -28.2, z: -8.7, turn: 0.17, window: { x: -0.5, z: 1.72, turn: 0 } },
 { x: -34.7, z: -3.8, turn: 0.44, window: { x: -2.5, z: 1.2, turn: 0.38 } },
];
// Dónde cae cada pieza de una parcela (la casa, y su escaparate ya girado).
export const cabinParts = (c) => {
 const house = { x: c.x, z: c.z - 1.6 };
 const cos = Math.cos(c.turn), sin = Math.sin(c.turn);
 return { house, stand: { x: house.x + c.window.x * cos + c.window.z * sin, z: house.z - c.window.x * sin + c.window.z * cos } };
};
// Bancos de la plaza (x, z, giro).
export const BENCHES = [
 { x: PLAZA.x - 3.9, z: PLAZA.z + 4.0, turn: Math.PI - 0.42 },
 { x: PLAZA.x + 2.7, z: PLAZA.z + 4.7, turn: Math.PI + 0.2 },
];
// Jardín del laboratorio: tres pedestales al sur de la plaza, con su sendero.
export const LAB_TOTEMS = [
 { x: -19.2, z: 6.3 },
 { x: -24.5, z: 7.7 },
 { x: -29.8, z: 6.3 },
];
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
// Postes indicadores de madera, junto al camino que llega a cada sitio.
export const SIGNPOSTS = [
 { text: "NAVE", x: -3.7, z: 8.7, turn: 0.22 },
 { text: "CV", x: 8.4, z: 7.4, turn: -0.28 },
 { text: "BALONCESTO", x: -2.3, z: 18.5, turn: 0.18 },
 { text: "FÚTBOL", x: -14.6, z: 15.2, turn: -0.3 },
 { text: "OBSERVATORIO", x: 16.2, z: -21.8, turn: 0.2 },
];
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
 [[-24.5, 0], [-24.5, 5.6]],
 [[3.6, 3.4], [6.6, 5.4]],
];
function pathDistance(x, z) {
 let best = Infinity;
 for (const path of PATHS) best = Math.min(best, toPolyline(x, z, path));
 return best;
}

// Ruido de valores 2D, suave y determinista (0–1): manchas de pradera, bordes
// irregulares, tonos del suelo.
export function noise2(x, z) {
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
// Dónde la hierba crece alta y espesa (1) y dónde es césped corto (0).
export const meadow = (x, z) => noise2(x * 0.085 + 3.1, z * 0.085 - 1.7) * 0.7 + noise2(x * 0.27, z * 0.27 + 9) * 0.3;

// Pies de árbol: debajo, el suelo queda en sombra. Se rellena al repartir los árboles.
let shadeSpots = [];

// Qué hay en cada punto del suelo. Lo usan el color del terreno, el reparto de
// plantas y el sonido de los pasos.
//   bed · wetsand · sand · bank (orilla de río y estanque) · rock · stone ·
//   path · pathEdge · moss · shade · meadow · grass
export function surface(x, z) {
 const h = groundHeight(x, z);
 if (h < WATER_LEVEL - 0.05) return "bed";
 const fromCentre = Math.hypot(x, z);
 const shore = shoreRadius(Math.atan2(z, x));
 const rough = noise2(x * 0.33, z * 0.33) - 0.5; // rompe los bordes rectos
 const beach = fromCentre > shore - 5.5 + rough * 2.2;
 const seaside = fromCentre > shore - 10;
 // Franja mojada pegada al agua; más arriba, arena seca (mar) u orilla (río, estanque).
 if (h < WATER_LEVEL + 0.13) return seaside ? "wetsand" : "bank";
 if (beach) return "sand";
 if (h < -0.03) return seaside ? "sand" : "bank";
 // Roca: donde el terreno se empina. Solo puede pasar en el borde de la meseta,
 // así que la pendiente (cuatro alturas más) no se calcula en ningún otro sitio.
 if (within(x, z, terrainBounds().plateau) && Math.abs(plateauDistance(x, z) + 0.6) < 2.4) {
  const e = 0.4;
  const slope = Math.hypot(groundHeight(x + e, z) - groundHeight(x - e, z), groundHeight(x, z + e) - groundHeight(x, z - e)) / (2 * e);
  if (slope > 0.95) return "rock";
 }
 if (distance(x, z, PAD.x, PAD.z) < PAD.padRadius + 0.6) return "stone";
 if (distance(x, z, PLAZA.x, PLAZA.z) < PLAZA.r + rough * 0.5) return "plaza";
 // Bajo la pista y el campo no crece hierba.
 if ([COURT, PITCH].some((rect) => x > rect.x0 - 0.5 && x < rect.x1 + 0.5 && z > rect.z0 - 0.5 && z < rect.z1 + 0.5)) return "path";
 // Caminos de ancho irregular, con un borde de tierra más oscura.
 const toPath = pathDistance(x, z);
 const width = 1.2 + rough * 0.5;
 if (toPath < width - 0.32) return "path";
 if (toPath < width) return "pathEdge";
 // Orillas del arroyo de la meseta.
 if (h > 3 && h < PLATEAU.height - 0.07) return "bank";
 // Zonas húmedas: junto al estanque y el río, y al pie del acantilado.
 const damp = Math.min(distance(x, z, POND.x, POND.z) - POND.r, toPolyline(x, z, RIVER) - 2.2, h < 1.2 ? plateauDistance(x, z) + 0.6 : 9);
 if (damp < 2.4 + rough * 2.5) return "moss";
 if (shadeSpots.some((spot) => (spot.x - x) ** 2 + (spot.z - z) ** 2 < spot.r2)) return "shade";
 return meadow(x, z) > 0.56 ? "meadow" : "grass";
}
const GRASSY = new Set(["grass", "meadow", "shade", "moss"]);
export const isGrassy = (x, z) => GRASSY.has(surface(x, z));

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
 ...PROJECT_CABINS.map((c) => ({ ...c, r: 4.6 })),
 { ...PLAZA, r: PLAZA.r + 6.5 },
 { x: PLAZA.x, z: 7, r: 8.5 }, // jardín del laboratorio
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
const dryLand = (x, z, y) => y > -0.02 && flat(x, z) && !["sand", "wetsand", "bank", "bed"].includes(surface(x, z));

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
// Mapa de bosque: los árboles se juntan en bosquetes y dejan claros entre ellos.
export const forest = (x, z) => noise2(x * 0.072 + 11.3, z * 0.072 - 5.1) * 0.75 + noise2(x * 0.19 - 3, z * 0.19 + 8) * 0.25;
const treeSite = (x, z, y) =>
 dryLand(x, z, y) &&
 forest(x, z) > 0.44 &&
 // Lejos de los caminos: el corredor por el que se anda queda despejado.
 pathDistance(x, z) > 4.4 &&
 !VIEWPOINTS.some((v) => distance(x, z, v.x, v.z) < v.r) &&
 ![COURT, PITCH].some((rect) => x > rect.x0 - 3 && x < rect.x1 + 3 && z > rect.z0 - 2 && z < rect.z1 + 7);

// Árboles: de copa redonda, pinos (más en el norte y en la meseta) y cerezos.
const allTrees = scatter(118, { margin: 0.6, spacing: 3.1, accept: treeSite });
// Arboledas de cerezos (centro y radio).
const CHERRY_GROVES = [
 { x: -22, z: 10.5, r: 7 },
 { x: 15, z: 15, r: 7.5 },
 { x: -9, z: -13, r: 5 },
];
const trees = allTrees.map((tree) => {
 const roll = tree.seed;
 const { x, z, y } = tree;
 const toWater = Math.min(toPolyline(x, z, RIVER), Math.abs(distance(x, z, POND.x, POND.z) - POND.r));
 const north = z < -8 || y > 3;
 let kind;
 if (toWater < 5.5 && y < 1 && roll < 0.62) kind = "willow"; // sauces junto al río y el estanque
 else if (CHERRY_GROVES.some((grove) => distance(x, z, grove.x, grove.z) < grove.r) && roll < 0.8) kind = "cherry";
 else if (north) kind = roll < 0.46 ? "pine" : roll < 0.66 ? "birch" : roll < 0.78 ? "poplar" : "oak";
 else kind = roll < 0.09 ? "pine" : roll < 0.2 ? "birch" : roll < 0.3 ? "maple" : roll < 0.42 ? "poplar" : roll < 0.48 ? "cherry" : "oak";
 return { ...tree, kind, scale: 0.84 + ((roll * 7919) % 1) * 0.5 };
});
// Huellas de los edificios y carteles: dentro no crece nada.
const FOOTPRINTS = [
 ...PROJECT_CABINS.flatMap((c) => { const p = cabinParts(c); return [{ ...p.house, r: 3.1 }, { ...p.stand, r: 1.4 }]; }),
 ...LAB_TOTEMS.map((t) => ({ ...t, r: 0.8 })),
 { ...CV_KIOSK, r: 0.9 },
 { x: TREEHOUSE.x, z: TREEHOUSE.z - 1.6, r: 1.7 },
 { x: TREEHOUSE.x + 2.6, z: TREEHOUSE.z + 1.2, r: 1.6 },
 { x: OBSERVATORY.x, z: OBSERVATORY.z - 1.2, r: 4.6 },
 { x: CONTACT.x, z: CONTACT.z - 2.6, r: 2.6 },
 { ...CONTACT.antenna, r: 1.5 },
 ...CONTACT.terminals.map((t) => ({ ...t, r: 0.8 })),
 { ...WIND_CHIME, r: 0.5 },
 ...SIGNPOSTS.map((s) => ({ x: s.x, z: s.z, r: 0.7 })),
 // Rótulos tumbados en el suelo: la hierba no debe taparlos.
 ...LAB_TOTEMS.flatMap((t) => [-0.8, 0.8].map((dx) => ({ x: t.x + dx, z: t.z + 1.5, r: 0.8 }))),
 { x: TREEHOUSE.x, z: TREEHOUSE.z - 0.9, r: 3.0 },
 { x: TREEHOUSE.x - 3.9, z: TREEHOUSE.z - 0.2, r: 1.6 },
 { x: CONTACT.x, z: CONTACT.z + 0.4, r: 4.4 },
 ...CONTACT.terminals.map((t) => ({ x: t.x, z: t.z + 1.3, r: 0.9 })),
];
const built = (x, z) => FOOTPRINTS.some((f) => (f.x - x) ** 2 + (f.z - z) ** 2 < f.r * f.r);

// Cuánta hierba crece en un punto, de 0 (nada) a 1 (pradera alta). De aquí
// sale la máscara que lee el césped: densidad y altura a la vez.
const GRASS_AMOUNT = { meadow: 1, grass: 0.7, moss: 0.86, shade: 0.5, pathEdge: 0.3 };
const toRect = (x, z, rect) => Math.hypot(Math.max(rect.x0 - x, 0, x - rect.x1), Math.max(rect.z0 - z, 0, z - rect.z1));
// Distancia a lo construido más cercano (edificios, carteles, pistas, plataforma, plaza).
function toBuilt(x, z) {
 let best = Math.min(toRect(x, z, COURT), toRect(x, z, PITCH), distance(x, z, PAD.x, PAD.z) - PAD.padRadius, distance(x, z, PLAZA.x, PLAZA.z) - PLAZA.r);
 for (const f of FOOTPRINTS) {
  const dx = f.x - x, dz = f.z - z;
  if (Math.abs(dx) > f.r + 4 || Math.abs(dz) > f.r + 4) continue;
  best = Math.min(best, Math.hypot(dx, dz) - f.r);
 }
 return best;
}
// `kind`: tipo de suelo, si quien llama ya lo ha calculado.
export function grassAmount(x, z, kind = surface(x, z)) {
 const base = GRASS_AMOUNT[kind] ?? 0;
 if (base === 0 || built(x, z)) return 0;
 // Junto a los caminos y a lo construido, césped corto (una franja segada); la
 // hierba alta queda para las praderas.
 const verge = (0.36 + 0.64 * smooth(1.3, 4.6, pathDistance(x, z))) * (0.4 + 0.6 * smooth(0.2, 3.2, toBuilt(x, z)));
 // Dentro de cada zona, manchas algo más altas y más bajas.
 return base * (0.8 + meadow(x, z) * 0.4) * verge;
}
// ¿Queda a la sombra de un árbol?
export const inShade = (x, z) => shadeSpots.some((spot) => (spot.x - x) ** 2 + (spot.z - z) ** 2 < spot.r2);

shadeSpots = trees.map((t) => ({ x: t.x, z: t.z, r2: (t.kind === "willow" ? 2.3 : 1.7) ** 2 * t.scale ** 2 }));

const rocks = scatter(40, { margin: -0.4, spacing: 2.4, others: trees, accept: (x, z, y) => y > -0.2 && pathDistance(x, z) > 2.9 }).map((r) => ({ ...r, scale: 0.4 + r.seed * 0.85 }));
// Rocas al pie del acantilado, para que la pared no nazca del suelo a pelo.
const cliffRocks = scatter(60, { margin: -100, spacing: 1.7, accept: (x, z) => { const e = plateauDistance(x, z); return e > 0.6 && e < 2.2 && distance(x, z, WATERFALL.x, WATERFALL.z) > 3 && toSegment(x, z, ...RAMP.from, ...RAMP.to).distance > 3; } }).map((r) => ({ ...r, scale: 0.6 + r.seed * 0.9 }));
// Arbustos: en macizos al borde de los bosquetes, nunca en el corredor de los caminos.
const bushes = scatter(96, { margin: -0.5, spacing: 1.5, others: [...trees, ...rocks], accept: (x, z, y) => dryLand(x, z, y) && !built(x, z) && pathDistance(x, z) > 3.2 && forest(x, z) > 0.36 }).map((b) => ({ ...b, scale: 0.5 + b.seed * 0.5 }));
const mushrooms = scatter(50, { margin: -0.6, spacing: 1.4, accept: (x, z, y) => dryLand(x, z, y) && ["shade", "moss"].includes(surface(x, z)) });
// Espigas: acentos altos en las praderas (el césped en sí lo pinta
// flora/Grass.jsx en la GPU). Se recorre la isla en una rejilla descolocada.
const tufts = { seed: [] };
{
 const step = 1.25;
 for (let gx = -46; gx < 46; gx += step) {
  for (let gz = -46; gz < 46; gz += step) {
   const x = gx + (random() - 0.5) * step;
   const z = gz + (random() - 0.5) * step;
   const roll = random(), seed = random(), turn = random() * Math.PI * 2;
   if (roll > 0.55 || meadow(x, z) < 0.56 || Math.hypot(x, z) > shoreRadius(Math.atan2(z, x))) continue;
   if (surface(x, z) !== "meadow" || built(x, z)) continue;
   tufts.seed.push({ x, y: groundHeight(x, z), z, seed, turn });
  }
 }
}

// Flores: manchas de una sola especie; y un goteo a lo largo de los caminos.
const FLOWER_KINDS = ["daisy", "daisyPink", "tulipRed", "tulipYellow", "lavender", "bluebell"];
const flowersByKind = Object.fromEntries(FLOWER_KINDS.map((kind) => [kind, []]));
const patch = (centre, count, spread) =>
 Array.from({ length: count }, () => {
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(random()) * spread;
  const x = centre.x + Math.cos(angle) * radius;
  const z = centre.z + Math.sin(angle) * radius;
  return { x, y: groundHeight(x, z), z, seed: random(), turn: random() * Math.PI * 2 };
 }).filter((p) => isGrassy(p.x, p.z) && !built(p.x, p.z));
for (const centre of scatter(64, { margin: -1.2, spacing: 3.4, accept: dryLand })) {
 const kind = FLOWER_KINDS[Math.floor(centre.seed * FLOWER_KINDS.length)];
 flowersByKind[kind].push(...patch(centre, 6 + Math.floor(centre.seed * 37) % 7, 1.5));
}
for (const path of PATHS) {
 for (let i = 0; i < path.length - 1; i++) {
  const [ax, az] = path[i];
  const [bx, bz] = path[i + 1];
  const length = distance(ax, az, bx, bz);
  for (let d = 1.5; d < length; d += 2.6 + random() * 2.4) {
   const side = random() < 0.5 ? -1 : 1;
   const offset = (1.55 + random() * 0.7) * side;
   const centre = { x: ax + ((bx - ax) * d) / length - ((bz - az) / length) * offset, z: az + ((bz - az) * d) / length + ((bx - ax) / length) * offset };
   flowersByKind[random() < 0.6 ? "daisy" : "daisyPink"].push(...patch(centre, 3, 0.5));
  }
 }
}
// Para lo que solo necesita «dónde hay flores» (mariposas).

const clover = scatter(70, { margin: -1.4, spacing: 2.2, accept: (x, z, y) => dryLand(x, z, y) && !built(x, z) });
// Helechos: a la sombra de los árboles y en lo húmedo.
const ferns = scatter(170, { margin: -0.9, spacing: 1.0, accept: (x, z, y) => dryLand(x, z, y) && ["shade", "moss"].includes(surface(x, z)) && !built(x, z) });
// Juncos y espadañas en las orillas del estanque y del río.
const reeds = [];
for (let angle = 0; angle < Math.PI * 2; angle += 0.17) {
 const radius = POND.r - 0.25 + random() * 0.6;
 const x = POND.x + Math.cos(angle) * radius, z = POND.z + Math.sin(angle) * radius;
 // Se deja despejado el frente (sur), que es desde donde se mira, y la cascada.
 const keep = random() < 0.6 && !(Math.sin(angle) > 0.35 && Math.abs(Math.cos(angle)) < 0.8) && distance(x, z, WATERFALL.x, WATERFALL.z) > 2.6;
 if (keep) reeds.push({ x, y: groundHeight(x, z), z, seed: random(), turn: random() * 6 });
}
for (let i = 0; i < RIVER.length - 1; i++) {
 const [ax, az] = RIVER[i];
 const [bx, bz] = RIVER[i + 1];
 const length = distance(ax, az, bx, bz);
 for (let d = 1; d < length; d += 1.3) {
  for (const side of [-1, 1]) {
   const offset = (1.75 + random() * 0.6) * side;
   const x = ax + ((bx - ax) * d) / length - ((bz - az) / length) * offset;
   const z = az + ((bz - az) * d) / length + ((bx - ax) / length) * offset;
   const y = groundHeight(x, z);
   const nearBridge = BRIDGES.some((bridge) => toSegment(x, z, ...bridge.from, ...bridge.to).distance < 3.2);
   if (random() < 0.42 && !nearBridge && y > WATER_LEVEL - 0.3 && y < WATER_LEVEL + 0.3 && Math.hypot(x, z) < 41) reeds.push({ x, y, z, seed: random(), turn: random() * 6 });
  }
 }
}
// Rocas en el bajío del mar y alguna en el río: rompen el agua y hacen espuma.
const shoreRocks = [];
for (let i = 0; i < 300 && shoreRocks.length < 30; i++) {
 const angle = random() * Math.PI * 2;
 const radius = shoreRadius(angle) - 3.4 + random() * 4;
 const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
 const y = groundHeight(x, z);
 const seed = random();
 if (y < -0.3 && y > -1.5 && !shoreRocks.some((r) => distance(r.x, r.z, x, z) < 3.5)) shoreRocks.push({ x, y, z, seed, turn: random() * 6, scale: 0.5 + seed * 0.95 });
}
[[17.6, -6.6], [21.8, -1.6], [25.3, 5.6], [30.2, 10.2]].forEach(([x, z], i) => shoreRocks.push({ x, y: groundHeight(x, z), z, seed: 0.3 + i * 0.17, turn: i * 1.7, scale: 0.72 + (i % 2) * 0.2 }));
// Guijarros en arena, orillas y bordes de camino.
const pebbles = scatter(260, { margin: -100, spacing: 0.5, accept: (x, z) => ["sand", "wetsand", "bank", "pathEdge"].includes(surface(x, z)) }).map((p) => ({ ...p, scale: 0.07 + p.seed * 0.12 }));

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

// Las rocas del agua asoman siempre: se apoyan, como mucho, un poco bajo la superficie.
for (const rock of shoreRocks) rock.y = Math.max(rock.y, WATER_LEVEL - 0.28 * rock.scale);

// ── Asentado en el terreno ──────────────────────────────────────────────────
// Cada cosa repartida se coloca según el suelo que tiene bajo su apoyo, no solo
// bajo su centro: se apoya en el punto más bajo (así ningún lado flota) y, si el
// terreno ahí es demasiado quebrado para ella (más de `relief` de desnivel),
// se desliza cuesta abajo hasta `slide` metros buscando sitio, o se descarta.
// `centre`: para lo que va medio enterrado (una roca que asoma): se queda a la
// altura del suelo de su centro, y lo que no puede es quedar colgando: `relief`
// es entonces cuánto puede caer el terreno por su lado más bajo.
// Lo comprueba tests/e2e/terrain.mjs sobre la escena ya montada.
// El suelo bajo un apoyo de radio `reach`: punto más bajo, más alto y centro.
function support(x, z, reach) {
 let low = Infinity, high = -Infinity;
 for (const [dx, dz] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
  const h = groundHeight(x + dx * reach, z + dz * reach);
  low = Math.min(low, h);
  high = Math.max(high, h);
 }
 return { low, high, middle: groundHeight(x, z) };
}
export function settle(x, z, reach, { relief = 0.3, embed = 0.02, slide = 0, centre = false } = {}) {
 let px = x, pz = z;
 for (let moved = 0; moved <= slide + 1e-6; moved += 0.25) {
  const { low, high, middle } = support(px, pz, reach);
  if (centre ? middle - low <= relief : high - low <= relief) return { x: px, z: pz, y: (centre ? middle : low) - embed };
  const e = 0.3;
  const gx = groundHeight(px + e, pz) - groundHeight(px - e, pz), gz = groundHeight(px, pz + e) - groundHeight(px, pz - e);
  const steep = Math.hypot(gx, gz) || 1;
  px -= (gx / steep) * 0.25;
  pz -= (gz / steep) * 0.25;
 }
 return null;
}
// Asienta una lista entera. `reach(item)`: radio de apoyo; `relief(item)`: desnivel que tolera.
// `keep`: lo que no encuentra sitio se queda donde estaba en vez de descartarse.
// `sink`: lo que no encuentra sitio llano se planta igualmente en el punto más
// bajo de su apoyo (así no flota por ningún lado) siempre que con eso su centro
// no quede enterrado más de `sink` metros; solo se descarta lo que cae en un
// terreno de verdad quebrado (un talud, el cauce).
const seat = (list, reach, relief, { keep = false, sink = 0, ...options } = {}) =>
 list.flatMap((item) => {
  const spot = settle(item.x, item.z, reach(item), { relief: relief(item), ...options });
  if (spot) return [{ ...item, ...spot }];
  if (keep) return [item];
  const { low, middle } = support(item.x, item.z, reach(item));
  return sink && middle - low <= sink ? [{ ...item, y: low - (options.embed ?? 0.02) }] : [];
 });
// Una planta tolera poco desnivel: la mitad de lo que mide, como mucho.
const plantFoot = (size, relief = size * 0.5) => [() => size, () => relief];

const seated = {
 // Rocas: pueden deslizarse un poco para no quedar colgadas ni enterradas.
 // (Las rocas asoman del suelo: van enterradas hasta la mitad a propósito. El
 // desnivel que toleran es lo que pueden hundirse de más por un lado.)
 // (El apoyo que se mira es el del centro de la roca, no toda su anchura; lo
 // que puede caer el suelo a su lado es lo que la roca baja bajo su centro:
 // algo más de la mitad de su tamaño, y más las altas del pie del acantilado.)
 rocks: seat(rocks, (r) => Math.min(0.5 * r.scale, 0.45), (r) => 0.5 * r.scale, { slide: 2, centre: true, embed: 0 }),
 cliffRocks: seat(cliffRocks, (r) => Math.min(0.6 * r.scale, 0.45), (r) => 0.9 * r.scale, { slide: 3, centre: true, embed: 0 }),
 shoreRocks: seat(shoreRocks, (r) => Math.min(0.5 * r.scale, 0.45), (r) => 0.68 * r.scale, { centre: true, embed: 0, keep: true }), // en la orilla y en el río no se mueven: asoman del agua donde están
 pebbles: seat(pebbles, (p) => p.scale * 0.8, () => 0.09, { embed: 0, sink: 0.04 }),
 bushes: seat(bushes, (b) => 0.4 * b.scale, () => 0.2, { sink: 0.2 }),
 ferns: seat(ferns, ...plantFoot(0.42), { sink: 0.18 }),
 mushrooms: seat(mushrooms, ...plantFoot(0.16), { sink: 0.06 }),
 clover: seat(clover, ...plantFoot(0.55, 0.08), { sink: 0.05 }),
 reeds: seat(reeds, ...plantFoot(0.22, 0.35), { sink: 0.25 }), // nacen en el talud de la orilla, con el pie en el agua
 tufts: { seed: seat(tufts.seed, ...plantFoot(0.2), { sink: 0.1 }) },
 flowersByKind: Object.fromEntries(Object.entries(flowersByKind).map(([kind, list]) => [kind, seat(list, ...plantFoot(0.18), { sink: 0.1 })])),
};
// Las rocas que tienen el pie en el agua asoman siempre: asentadas en el fondo
// quedarían sumergidas (y su espuma, sola en mitad del mar). Se apoyan, como
// mucho, un poco bajo la superficie; lo que les falta hasta el fondo queda bajo
// el agua y no se ve. Lo vigila también tests/e2e/terrain.mjs.
const peek = (list) => list.map((rock) => (groundHeight(rock.x, rock.z) < WATER_LEVEL ? { ...rock, y: Math.max(rock.y, WATER_LEVEL - 0.28 * rock.scale) } : rock));
for (const key of ["rocks", "cliffRocks", "shoreRocks"]) seated[key] = peek(seated[key]);
export const SCATTER = { trees, ...seated, flowers: Object.values(seated.flowersByKind).flat(), lilies, lanterns };

// ── Colisiones ──────────────────────────────────────────────────────────────
const shipCollider = { x: PAD.x, z: PAD.z, r: 2.3, active: true };
const colliders = [
 ...trees.map((t) => ({ x: t.x, z: t.z, r: (t.kind === "willow" ? 0.55 : 0.42) * t.scale })),
 ...ANCIENT_TREES.map((t) => ({ x: t.x, z: t.z, r: 1.35 * t.scale })),
 ...seated.rocks.filter((r) => r.scale > 0.75).map((r) => ({ x: r.x, z: r.z, r: 0.8 * r.scale })),
 ...seated.cliffRocks.map((r) => ({ x: r.x, z: r.z, r: 0.75 * r.scale })),
 ...lanterns.map((l) => ({ x: l.x, z: l.z, r: 0.2 })),
 // Cabañas: tres círculos a lo ancho de cada una.
 // Casas de la aldea (tres círculos a lo ancho), su expositor y su cartel.
 ...PROJECT_CABINS.flatMap((c) => { const p = cabinParts(c); return [...[-1.4, 0, 1.4].map((dx) => ({ x: p.house.x + dx, z: p.house.z, r: 1.5 })), { ...p.stand, r: 0.85 }]; }),
 { ...WELL, r: 1.0 },
 ...BENCHES.map((b) => ({ x: b.x, z: b.z, r: 0.65 })),
 { x: PLAZA.x, z: PLAZA.z - 7.2, r: 0.5 },
 ...LAB_TOTEMS.map((t) => ({ ...t, r: 0.7 })),
 { ...CV_KIOSK, r: 0.85 },
 { x: TREEHOUSE.x + 0.3, z: TREEHOUSE.z - 3.3, r: 1.3 },
 { x: TREEHOUSE.x - 1.7, z: TREEHOUSE.z + 0.7, r: 0.3 },
 { x: TREEHOUSE.x + 1.7, z: TREEHOUSE.z + 0.7, r: 0.3 },
 { x: TREEHOUSE.x - 4.6, z: TREEHOUSE.z - 0.1, r: 0.7 },
 { x: TREEHOUSE.x - 3.4, z: TREEHOUSE.z - 0.3, r: 0.7 },
 { x: TREEHOUSE.x + 4.2, z: TREEHOUSE.z + 1.4, r: 0.22 },
 // Observatorio: su plataforma circular, el anexo y el atrezo de los lados.
 { x: OBSERVATORY.x, z: OBSERVATORY.z - 1.4, r: 3.05 },
 { x: OBSERVATORY.x - 3.5, z: OBSERVATORY.z - 1.2, r: 1.2 },
 { x: OBSERVATORY.x - 4.4, z: OBSERVATORY.z + 1.0, r: 0.55 },
 { x: OBSERVATORY.x + 3.75, z: OBSERVATORY.z + 0.7, r: 0.7 },
 { x: CONTACT.x, z: CONTACT.z - 2.6, r: 2 },
 { ...CONTACT.antenna, r: 1.2 },
 ...CONTACT.terminals.map((t) => ({ ...t, r: 0.5 })),
 { ...WIND_CHIME, r: 0.35 },
 ...SIGNPOSTS.map((s) => ({ x: s.x, z: s.z, r: 0.22 })),
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
const FOOTING = { plaza: "stone", rock: "stone", bed: "stone", stone: "stone", path: "path", pathEdge: "path", sand: "sand", wetsand: "sand", bank: "sand" };
// Qué se pisa en (x, z), para el sonido de los pasos.
function footing(x, z) {
 if (bridgeHeight(x, z) !== null) return "wood";
 if (inRect(x, z, COURT, 0) || distance(x, z, PAD.x, PAD.z) < PAD.padRadius) return "stone";
 return FOOTING[surface(x, z)] ?? "grass";
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
 ground: groundHeight, // el terreno, sin contar el puente (lo que pisan los personajes es `height`)
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
 // Zonas de las que Woody dice algo la primera vez que se entra (content/woody.js).
 zones: [
  { id: "proyectos", x: PLAZA.x, z: PLAZA.z, r: 8 },
  { id: "sobre-mi", x: TREEHOUSE.x + 1.5, z: TREEHOUSE.z + 3, r: 5.5 },
  { id: "contacto", x: CONTACT.x, z: CONTACT.z + 1, r: 6 },
  { id: "cv", x: CV_KIOSK.x, z: CV_KIOSK.z + 0.8, r: 2.8 },
  { id: "observatorio", x: OBSERVATORY.x, z: OBSERVATORY.z + 2.5, r: 5 },
  { id: "pistas", x: (COURT.x0 + COURT.x1) / 2, z: (COURT.z0 + COURT.z1) / 2, r: 8 },
  { id: "pistas", x: (PITCH.x0 + PITCH.x1) / 2, z: (PITCH.z0 + PITCH.z1) / 2, r: 9 },
  { id: "nave", x: PAD.x, z: PAD.z, r: PAD.padRadius + 1.4 },
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
   "senda-meseta-a": [-3, -25],
   "sobre-mi": [1.5, -24.4],
   "senda-meseta-b": [10, -23.2],
   observatorio: [19, -22.6],
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
   ["alto-rampa", "senda-meseta-a"],
   ["senda-meseta-a", "sobre-mi"],
   ["sobre-mi", "senda-meseta-b"],
   ["senda-meseta-b", "observatorio"],
  ],
  // (Lo que Woody dice al pedírselo y al llegar está en content/woody.js.)
  places: [{ id: "proyectos" }, { id: "cohete" }, { id: "contacto" }, { id: "sobre-mi" }, { id: "cv" }],
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
