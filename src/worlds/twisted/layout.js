// Mundo 2 · The Twisted Moon. «Quién soy», convertido en un paseo: una isla de
// cuento gótico donde siempre es de noche. Forma de la isla, altura del
// terreno, dónde está cada cosa y con qué se choca: todo lo que se ve y todo lo
// que se pisa sale de este archivo. Metros; Y hacia arriba; «norte» es −Z
// (arriba en pantalla).

export const WATER_LEVEL = -0.3; // la laguna negra que rodea la isla
const MAX_WADE = -0.82; // hasta dónde se mete el astronauta
const MAX_SLOPE = 1.15; // pendiente a partir de la cual es pared

const smooth = (edge0, edge1, value) => {
 const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
 return t * t * (3 - 2 * t);
};
const TAU = Math.PI * 2;

// ── Relieve ─────────────────────────────────────────────────────────────────
// Radio de la orilla en cada dirección: un círculo con ondulaciones. Unos 46 m,
// como la isla del primer mundo: al subir con la nave se cierra igual en planeta.
export const shoreRadius = (angle) => 45.5 + 2.6 * Math.sin(3 * angle + 1.1) + 1.8 * Math.sin(5 * angle + 0.4) + 1.3 * Math.sin(2 * angle + 2.2);

// La colina en espiral, al fondo (norte): un cono al que le da vueltas una
// senda en rampa, como la concha de un caracol. La senda arranca al pie, por
// el sur, y sube en el sentido de las agujas del reloj hasta la cima.
export const HILL = { x: 2, z: -29.5, r: 12, height: 9.6, turns: 3.25 };
// Altura de la colina en (x, z) y, en `hill.path`, cuánto de senda hay ahí (1 en
// el centro de la rampa, 0 en el talud).
export const hill = { path: 0 };
function hillHeight(x, z) {
 const dx = x - HILL.x, dz = z - HILL.z;
 const r = Math.hypot(dx, dz);
 hill.path = 0;
 if (r >= HILL.r) return 0;
 // Vuelta alrededor de la colina, de −0,5 a 0,5, con el 0 mirando al sur.
 let turn = Math.atan2(dz, dx) / TAU - 0.25;
 turn -= Math.round(turn);
 // Coordenada de la espiral: vale un entero justo sobre el eje de la senda.
 const s = (1 - r / HILL.r) * HILL.turns - turn;
 const lap = Math.floor(s + 0.5), across = s - lap; // `across`: de −0,5 a 0,5 entre un talud y el siguiente
 // La senda es casi llana a lo ancho; entre vuelta y vuelta, un talud empinado.
 const step = 0.5 * Math.sign(across) * Math.pow(Math.abs(2 * across), 3.4);
 const edge = smooth(HILL.r, HILL.r - 2.4, r);
 hill.path = (1 - smooth(0.2, 0.36, Math.abs(across))) * edge;
 return Math.max(0, ((lap + step + turn) / HILL.turns) * HILL.height) * edge;
}

// ── Sitios ──────────────────────────────────────────────────────────────────
export const COLORS = { nave: "#ff9a3c" };
export const SPAWN = { x: 0, z: 7.5 };
export const PAD = { x: 0, z: 0, padRadius: 4.6, color: "#3b3856" }; // plataforma del cohete, en el centro (es el eje del planeta)
// Parada 1 · La casa torcida. `turn`: hacia dónde mira su fachada (0 = al sur, a la cámara).
export const HOUSE = { x: -13.6, z: -11.2, turn: 0.42, width: 5.2, depth: 4.6 };
// Delante de la puerta (donde se lee su historia).
const front = (site, away) => ({ x: site.x + Math.sin(site.turn) * away, z: site.z + Math.cos(site.turn) * away });
export const HOUSE_DOOR = front(HOUSE, HOUSE.depth / 2 + 1.5);

// Explanadas: alrededor de cada sitio el suelo se allana.
const FLATS = [
 { x: PAD.x, z: PAD.z, r: PAD.padRadius + 2.6 },
 { x: HOUSE.x, z: HOUSE.z, r: 5.4 },
];

// Caminos que serpentean. Cada uno pasa por sus puntos en curva suave.
const TRAILS = [
 // De la plataforma a la casa torcida.
 { width: 1.7, through: [[-4.3, -1.5], [-6.6, -0.5], [-8.9, -1.7], [-9.6, -4.1], [-8.2, -5.9], [-8.7, -8.0], [HOUSE_DOOR.x + 0.5, HOUSE_DOOR.z + 0.3]] },
 // Al sur, hacia donde irán las demás paradas.
 { width: 1.7, through: [[0.2, 4.6], [1.1, 7.6], [-0.5, 10.6], [-1.6, 13.4], [-0.2, 16.4], [1.4, 18.6]] },
 // Al norte, hasta el pie de la colina en espiral.
 { width: 1.5, through: [[0.4, -4.6], [1.9, -7.2], [0.3, -10.0], [-0.4, -12.8], [1.2, -15.2], [HILL.x, HILL.z + HILL.r - 0.6]] },
];
// Curva de Catmull-Rom por los puntos dados, en tramos cortos.
function curve(points, steps = 7) {
 const out = [];
 const at = (i) => points[Math.min(points.length - 1, Math.max(0, i))];
 for (let i = 0; i < points.length - 1; i++) {
  const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
  for (let k = 0; k < steps; k++) {
   const t = k / steps, t2 = t * t, t3 = t2 * t;
   out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
  }
 }
 out.push(points[points.length - 1]);
 return out;
}
export const PATHS = TRAILS.map((trail) => ({ width: trail.width, points: curve(trail.through) }));
// Plazoletas de tierra pisada: alrededor de la plataforma y ante la puerta de la casa.
const YARDS = [
 { x: PAD.x, z: PAD.z, r: PAD.padRadius + 1.5 },
 { x: HOUSE_DOOR.x, z: HOUSE_DOOR.z, r: 1.7 },
];

function toSegment(x, z, ax, az, bx, bz) {
 const dx = bx - ax, dz = bz - az;
 const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
 return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}
// Distancia al borde del camino más cercano: negativa dentro, positiva fuera.
export function pathEdge(x, z) {
 let best = Infinity;
 for (const yard of YARDS) best = Math.min(best, Math.hypot(x - yard.x, z - yard.z) - yard.r);
 for (const path of PATHS) {
  const points = path.points;
  for (let i = 0; i < points.length - 1; i++) {
   // (Descarte rápido: los tramos son cortos.)
   if (Math.abs(x - points[i][0]) > best + 3 || Math.abs(z - points[i][1]) > best + 3) continue;
   best = Math.min(best, toSegment(x, z, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]) - path.width / 2);
  }
 }
 return best;
}

// Ruido suave y repetible.
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

// Altura del suelo: páramo de lomas suaves, la colina en espiral al norte y la
// orilla que baja a la laguna.
export function height(x, z) {
 const r = Math.hypot(x, z);
 const shore = shoreRadius(Math.atan2(z, x));
 let moor = 0.34 * Math.sin(x * 0.19 + 1.3) * Math.cos(z * 0.16 - 0.4) + 0.2 * Math.sin((x + z) * 0.31 + 0.7) + 0.12;
 for (const flat of FLATS) moor *= smooth(flat.r, flat.r + 3.5, Math.hypot(x - flat.x, z - flat.z));
 // (Al pie de la colina el páramo se allana: la senda arranca a ras.)
 moor *= smooth(HILL.r - 1, HILL.r + 3, Math.hypot(x - HILL.x, z - HILL.z));
 return moor + hillHeight(x, z) - 2.9 * smooth(shore - 3, shore + 6, r);
}

// ¿Está vedado este punto? Lo están el agua honda y los taludes: los de la
// colina no se trepan, se sube por su senda.
function blocked(x, z, _fromY, agent) {
 const here = height(x, z);
 if (here <= MAX_WADE) return true;
 if (agent?.prop) return false;
 const e = 0.25;
 const slope = Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
 return slope >= MAX_SLOPE;
}

// Qué se pisa en (x, z), para el sonido de los pasos y el color del suelo.
export function surface(x, z) {
 const here = height(x, z);
 if (here < WATER_LEVEL + 0.12) return "mud";
 if (Math.hypot(x - PAD.x, z - PAD.z) < PAD.padRadius) return "stone";
 if (pathEdge(x, z) < 0) return "path";
 hillHeight(x, z);
 if (hill.path > 0.5) return "path";
 return "moor";
}
const FOOTING = { mud: "sand", stone: "stone", path: "path", moor: "grass" };

// ── Generador aleatorio con semilla: el mundo sale igual en cada visita ──────
export function createRandom(seed) {
 let state = seed;
 return () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 };
}

// ── Lo plantado ─────────────────────────────────────────────────────────────
// Árboles sin hojas, de ramas rizadas. `kind`: cuál de las tres formas;
// `scale`: tamaño; `turn`: giro.
export const TREES = [
 { x: -19.6, z: -7.4, kind: 0, scale: 1.12, turn: 0.4 },
 { x: -8.2, z: -13.4, kind: 1, scale: 0.96, turn: 2.1 },
 { x: 6.9, z: -6.4, kind: 2, scale: 1.05, turn: 4.0 },
 { x: -5.6, z: 4.9, kind: 1, scale: 0.84, turn: 5.3 },
 // En la cima de la colina, recortado contra la luna.
 { x: HILL.x, z: HILL.z, kind: 0, scale: 1.35, turn: 1.2 },
];
// Farolas dobladas. `turn`: hacia dónde cuelga el farol.
export const LAMPS = [{ x: -7.3, z: -3.2, turn: 2.5 }];
// Verja de hierro desigual: tramos entre dos puntos.
export const FENCES = [
 { from: [-16.9, -5.9], to: [-12.6, -5.2] },
 { from: [-8.6, -10.4], to: [-7.6, -7.4] },
];

// ── Colisiones ──────────────────────────────────────────────────────────────
const turned = (site, px, pz) => [site.x + px * Math.cos(site.turn) + pz * Math.sin(site.turn), site.z - px * Math.sin(site.turn) + pz * Math.cos(site.turn)];
export const shipCollider = { x: PAD.x, z: PAD.z, r: 2.3, active: true };
export const colliders = [
 // La casa: su planta (algo menos que el alero) y el porche.
 { poly: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => turned(HOUSE, (sx * HOUSE.width) / 2, (sz * HOUSE.depth) / 2)), r: 0.12 },
 ...TREES.map((tree) => ({ x: tree.x, z: tree.z, r: 0.5 * tree.scale })),
 ...LAMPS.map((lamp) => ({ x: lamp.x, z: lamp.z, r: 0.22 })),
 ...FENCES.map((fence) => ({ x: fence.from[0], z: fence.from[1], bx: fence.to[0], bz: fence.to[1], r: 0.14 })),
 shipCollider,
];

// La noche de este mundo (ver experience/theme.js). No hay día ni atardecer:
// las tres franjas llevan la misma paleta. Luna fría, baja y al fondo (por el
// noroeste): recorta las siluetas y tiende sombras largas hacia la cámara; la
// luz cálida la ponen los faroles y las ventanas.
const NIGHT = {
 hemiSky: "#6b74d6",
 hemiGround: "#241a44",
 hemiPower: 1.05,
 sun: "#cfdcff",
 sunPower: 2.3,
 sunFrom: [-0.4, 0.42, -0.82],
 fog: "#2a2152",
 fogDensity: 0.0105,
 background: "#2a2152",
 skyTop: "#070a24",
 skyHorizon: "#51358a",
 waterShallow: "#3a2f6e",
 waterDeep: "#0d0b24",
 glow: 1,
 bloom: 0.95,
 shadow: 0.86,
};

// El mundo, con la interfaz que usan el jugador, Woody, la nave y los objetos.
const twisted = {
 id: "twisted",
 name: "The Twisted Moon",
 planet: true, // al subir con la nave, el mundo se cierra en esfera
 moment: "night", // siempre de noche
 ownMoon: true, // trae su propia luna, enorme (Sky.jsx no dibuja la suya)
 spawn: SPAWN,
 waterLevel: WATER_LEVEL,
 height,
 ground: height,
 blocked,
 surface: (x, z) => FOOTING[surface(x, z)] ?? "grass",
 soundSources: () => ({}),
 // Zonas de las que Woody dice algo la primera vez que se entra (content/woody.js).
 zones: [
  { id: "luna-nave", x: PAD.x, z: PAD.z, r: PAD.padRadius + 1.4 },
  { id: "casa-torcida", x: HOUSE_DOOR.x, z: HOUSE_DOOR.z, r: 4.2 },
  { id: "colina", x: HILL.x, z: HILL.z + HILL.r, r: 3.4 },
 ],
 areas: [],
 colliders,
 ship: PAD,
 shipCollider,
 props: [],
 // Red de caminos por la que Woody guía, y los sitios a los que sabe llevar.
 guide: {
  nodes: {
   cohete: [0, 6.6],
   "cruce-oeste": [-5.4, -0.6],
   "senda-casa-a": [-9.3, -2.6],
   "senda-casa-b": [-8.4, -6.6],
   "casa-torcida": [HOUSE_DOOR.x + 0.4, HOUSE_DOOR.z + 0.5],
  },
  links: [
   ["cohete", "cruce-oeste"],
   ["cruce-oeste", "senda-casa-a"],
   ["senda-casa-a", "senda-casa-b"],
   ["senda-casa-b", "casa-torcida"],
  ],
  places: [{ id: "casa-torcida" }, { id: "cohete" }],
 },
 themes: { day: NIGHT, dusk: NIGHT, night: NIGHT },
};
export default twisted;
