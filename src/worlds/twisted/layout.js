// Mundo 2 · The Twisted Moon. «Quién soy», convertido en un paseo: una isla de
// cuento gótico —acogedor, no de miedo— donde siempre es de noche. Forma de la
// isla, altura del terreno, dónde está cada cosa y con qué se choca: todo lo
// que se ve y todo lo que se pisa sale de este archivo. Metros; Y hacia arriba;
// «norte» es −Z (arriba en pantalla).
//
// La isla es pequeña y sube en terrazas hacia el fondo (norte): abajo, delante,
// la plataforma del cohete; arriba del todo, en el centro, la torre del reloj.
// Entre terraza y terraza, acantilados de roca que no se trepan: se sube por
// escaleras de piedra y se cruza de un pico a otro por puentes colgantes.

export const WATER_LEVEL = -3.0; // el mar, al pie del acantilado de la isla (3 m por debajo de lo más bajo que se pisa)
export const SEA_BED = -6.2;
const MAX_SLOPE = 1.15; // pendiente a partir de la cual es pared
export const STEP = 3.6; // lo que sube cada terraza
export const LEVELS = [0, STEP, STEP * 2, STEP * 3];

const smooth = (edge0, edge1, value) => {
 const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
 return t * t * (3 - 2 * t);
};
const TAU = Math.PI * 2;

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

// ── La isla y sus terrazas ──────────────────────────────────────────────────
// La plataforma del cohete está en el origen (es el eje del planeta en que se
// cierra el mundo al subir con la nave); la isla se extiende hacia el norte.
export const ISLAND = { x: 0, z: -17 };
export const shoreRadius = (angle) => 28.5 + 2.2 * Math.sin(3 * angle + 1.1) + 1.5 * Math.sin(5 * angle + 0.4);
// Cuánto se está dentro de la isla (m hasta su borde; negativo, en el mar).
export function islandEdge(x, z) {
 const dx = x - ISLAND.x, dz = z - ISLAND.z;
 return shoreRadius(Math.atan2(dz, dx)) - Math.hypot(dx, dz);
}
// Cada terraza es la unión de unos discos [x, z, radio], con el borde algo mordido.
const TERRACES = [
 // Primera: la mitad de atrás de la isla, en tres bloques.
 [[-13, -23, 9.5], [0, -29, 12.5], [13, -23, 9.5]],
 // Segunda: un pico a cada lado (observatorio y casa del árbol) y el macizo central.
 [[-16.5, -26.5, 5], [16.5, -27, 5], [0, -33, 6.8]],
 // Tercera: la cima, con la torre del reloj.
 [[0, -35, 4.3]],
];
// m hasta el borde de la terraza `level` (1 a 3); negativo, fuera.
export function terraceEdge(level, x, z) {
 let inside = -Infinity;
 for (const [cx, cz, r] of TERRACES[level - 1]) inside = Math.max(inside, r - Math.hypot(x - cx, z - cz));
 return inside + (noise2(x * 0.31 + 5.3, z * 0.31 - 2.7) - 0.5) * 1.0;
}

// ── Escaleras ───────────────────────────────────────────────────────────────
// Rampas con peldaños: cada una sigue sus puntos y sube de una altura a otra.
// Se pisa la rampa (lisa); los peldaños son solo lo que se ve.
export const STAIRS = [
 { id: "oeste", width: 2.4, from: LEVELS[0], to: LEVELS[1], through: [[-9.2, -11.8], [-11, -14.4], [-10, -17.6]] },
 { id: "este", width: 2.4, from: LEVELS[0], to: LEVELS[1], through: [[11.5, -9.2], [13.4, -12.6], [13, -16.2]] },
 { id: "macizo", width: 2.2, from: LEVELS[1], to: LEVELS[2], through: [[-3.4, -20.4], [-4.3, -24], [-2.6, -27.6]] },
 { id: "pico", width: 2.0, from: LEVELS[1], to: LEVELS[2], through: [[-11.2, -20.2], [-13.2, -23.2], [-15.2, -24.9]] },
 { id: "cima", width: 2.0, from: LEVELS[2], to: LEVELS[3], through: [[4.7, -29.4], [5.5, -32.8], [3.1, -35.4]] },
].map((stair) => {
 // (En curva suave, a tramos cortos: sin codos bruscos.)
 const through = curve(stair.through, 5);
 const lengths = [0];
 for (let i = 1; i < through.length; i++) lengths.push(lengths[i - 1] + Math.hypot(through[i][0] - through[i - 1][0], through[i][1] - through[i - 1][1]));
 return { ...stair, ends: [stair.through[0], stair.through[stair.through.length - 1]], through, lengths, length: lengths[lengths.length - 1] };
});
function toSegment(x, z, ax, az, bx, bz) {
 const dx = bx - ax, dz = bz - az;
 const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
 return { d: Math.hypot(x - (ax + dx * t), z - (az + dz * t)), t };
}
// Altura de la escalera en (x, z), o null si ahí no hay ninguna.
export function stairHeight(x, z) {
 for (const stair of STAIRS) {
  // Lo andado se mezcla entre los tramos que alcanzan el punto, cada uno con
  // más peso cuanto más cerca: en el codo de la escalera la altura no da saltos
  // (con «el tramo más cercano» sí los daba, y uno se quedaba clavado en el rincón).
  let weight = 0, along = 0;
  for (let i = 0; i < stair.through.length - 1; i++) {
   const [ax, az] = stair.through[i], [bx, bz] = stair.through[i + 1];
   if (Math.abs(x - (ax + bx) / 2) > 6 || Math.abs(z - (az + bz) / 2) > 6) continue;
   const { d, t } = toSegment(x, z, ax, az, bx, bz);
   if (d >= stair.width / 2) continue;
   const w = (stair.width / 2 - d) ** 2;
   weight += w;
   along += w * (stair.lengths[i] + (stair.lengths[i + 1] - stair.lengths[i]) * t);
  }
  if (weight > 0) return stair.from + (stair.to - stair.from) * (along / weight / stair.length);
 }
 return null;
}

// ── Agua dulce ──────────────────────────────────────────────────────────────
// Nace en el macizo, cae a una poza en la primera terraza, corre hasta su
// borde, cae otra vez y baja en río, por delante, hasta saltar al mar por el oeste.
export const POND = { x: 2, z: -23, r: 2.7, level: 1 }; // poza de la primera terraza
export const POOL = { x: 2.7, z: -13.4, r: 2.3, level: 0 }; // poza al pie de la segunda cascada
export const STREAM = [[2, -21], [2.5, -17.2]]; // arroyo de la poza al borde de la terraza
// (El río serpentea: pasa bajo la pasarela de tablones y salta al mar por el oeste.)
export const RIVER = curve([[2.7, -12.4], [1.2, -10.2], [-1.8, -10.8], [-4.6, -8.6], [-7.85, -8.05], [-10.8, -6.2], [-13.2, -3.4], [-16.6, -3.6], [-19.6, -1.2], [-23.6, 0.6], [-26.6, 2.2]], 4);
const DEPTH = 0.42; // lo que se hunde el cauce
export const WATERFALLS = [
 { x: 1.9, z: -25.9, top: LEVELS[2], bottom: LEVELS[1], width: 2.4, turn: 0 }, // del macizo a la poza
 { x: 2.6, z: -15.9, top: LEVELS[1], bottom: LEVELS[0], width: 2.2, turn: 0 }, // de la terraza al río
 { x: -27.2, z: 2.6, top: LEVELS[0], bottom: WATER_LEVEL, width: 2.4, turn: -1.05 }, // del río al mar
];
function toLine(x, z, points) {
 let best = Infinity;
 for (let i = 0; i < points.length - 1; i++) best = Math.min(best, toSegment(x, z, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]).d);
 return best;
}
// Cuánto cauce hay en (x, z): 1 en el eje del agua, 0 fuera.
export function waterBed(x, z) {
 const river = 1 - smooth(0.55, 1.5, toLine(x, z, RIVER));
 const stream = 1 - smooth(0.4, 1.1, toLine(x, z, STREAM));
 const pond = 1 - smooth(POND.r - 0.9, POND.r, Math.hypot(x - POND.x, z - POND.z));
 const pool = 1 - smooth(POOL.r - 0.9, POOL.r, Math.hypot(x - POOL.x, z - POOL.z));
 return Math.max(river, stream, pond, pool);
}

// Peñascos: agujas de roca que salen del mar pegadas al cortado, detrás y a
// los lados de la isla. Su pie está en el agua: no quitan nada de lo que se
// pisa, y la silueta se vuelve abrupta, como en las imágenes.
// [rumbo desde el centro de la isla (rad; −π/2 = norte), radio, altura de la punta]
const CRAG_SPOTS = [
 [-1.9, 3.4, 15],
 [-1.28, 3.2, 13.5],
 [-2.55, 3.0, 11],
 [-0.62, 3.0, 12],
 [-3.12, 2.6, 7.5],
 [-0.04, 2.6, 8],
 [2.98, 2.1, 4.5],
 [0.5, 2.2, 5],
];
export const CRAGS = CRAG_SPOTS.map(([angle, r, top]) => {
 // (El centro, fuera de la orilla: la aguja entra en tierra solo 40 cm.)
 const away = shoreRadius(angle) + r - 0.4;
 return [ISLAND.x + Math.cos(angle) * away, ISLAND.z + Math.sin(angle) * away, r, top];
});
// Altura de la aguja en (x, z), o −Infinity si ahí no hay ninguna.
export function cragHeight(x, z) {
 let most = -Infinity;
 for (const [cx, cz, r, top] of CRAGS) {
  const d = Math.hypot(x - cx, z - cz);
  if (d >= r) continue;
  // Facetado: el radio tiembla con el rumbo; la caída es casi vertical.
  const angle = Math.atan2(z - cz, x - cx);
  const reach = r * (0.8 + 0.16 * Math.sin(angle * 5 + cx) + 0.1 * Math.sin(angle * 3 - cz));
  if (d >= reach) continue;
  const t = 1 - d / reach;
  most = Math.max(most, SEA_BED + (top - SEA_BED) * Math.min(1, Math.pow(t, 0.42) * 1.06));
 }
 return most;
}
// m hasta el pie de la aguja más cercana (negativo, dentro): para la espuma del mar.
export function cragEdge(x, z) {
 let best = Infinity;
 for (const [cx, cz, r] of CRAGS) best = Math.min(best, Math.hypot(x - cx, z - cz) - r * 0.85);
 return best;
}

// Islotes y rocas del mar abierto (objetivo 22): la isla solo ocupa la mitad
// norte del planeta en que se cierra el mundo; el resto es mar. Para que desde
// la órbita no sea media bola vacía, el mar lleva rocas e islotes repartidos
// por toda la esfera —menos tupidos cerca de la isla—, cada uno con su espuma.
// No se pisan (no hay cómo llegar). [x, z, radio del pie, altura de la punta, giro]
export const ISLETS = (() => {
 const random = createRandom(20261161);
 const spots = [];
 // (Hasta 96 m del eje: a 100 m está el antípoda, donde todo se recoge en un punto.)
 for (let tries = 0; spots.length < 26 && tries < 4000; tries++) {
  const angle = random() * TAU, away = 40 + Math.sqrt(random()) * 56;
  const x = Math.cos(angle) * away, z = Math.sin(angle) * away;
  const big = random() < 0.3, r = big ? 3.4 + random() * 2.4 : 1.4 + random() * 1.6;
  if (islandEdge(x, z) > -(10 + r) || spots.some(([sx, sz, sr]) => Math.hypot(x - sx, z - sz) < sr + r + 9)) continue;
  spots.push([x, z, r, big ? 3.2 + random() * 3.6 : 1.4 + random() * 2.6, random() * TAU]);
 }
 return spots;
})();

// Altura del terreno, sin puentes.
export function ground(x, z) {
 return Math.max(island(x, z), cragHeight(x, z));
}
function island(x, z) {
 const edge = islandEdge(x, z);
 if (edge < -1.2) return SEA_BED;
 let h = stairHeight(x, z);
 if (h === null) {
  h = 0;
  for (let level = 1; level <= 3; level++) h += STEP * smooth(-0.5, 0.5, terraceEdge(level, x, z));
  h -= DEPTH * waterBed(x, z);
  // (Un poco de vida en lo llano: no llega a notarse al andar.)
  h += (noise2(x * 0.5 + 1.7, z * 0.5 + 8.2) - 0.5) * 0.12;
 }
 // El borde de la isla es un cortado que cae al mar.
 return SEA_BED + (h - SEA_BED) * smooth(-1.2, -0.1, edge);
}

// ── Puentes ─────────────────────────────────────────────────────────────────
// Colgantes, de cuerda y tablas, entre los picos; y pasarelas de tablones
// sobre el agua. `sag`: lo que se comba el colgante en el centro (negativo: se arquea).
export const BRIDGES = [
 { id: "observatorio", rope: true, from: [-12.4, -27.2], to: [-5.4, -29.7], y: LEVELS[2], width: 1.5, sag: 0.55 },
 { id: "casa-arbol", rope: true, from: [5.5, -29.9], to: [12.4, -27.8], y: LEVELS[2], width: 1.5, sag: 0.55 },
 { id: "rio", from: [-7.1, -5.9], to: [-8.6, -10.2], y: LEVELS[0], width: 1.9, sag: -0.42 },
 { id: "arroyo", from: [0.1, -19], to: [4.3, -19.1], y: LEVELS[1], width: 1.7, sag: -0.22 },
].map((bridge) => {
 const dx = bridge.to[0] - bridge.from[0], dz = bridge.to[1] - bridge.from[1], length = Math.hypot(dx, dz);
 return { ...bridge, length, ux: dx / length, uz: dz / length };
});
// Altura del tablero en lo que va de recorrido `t` (0 a 1).
export const bridgeDeck = (bridge, t) => bridge.y + 0.06 - Math.sin(Math.min(1, Math.max(0, t)) * Math.PI) * bridge.sag;
// El puente que hay en (x, z) y su altura ahí, o null.
export function bridgeAt(x, z) {
 for (const bridge of BRIDGES) {
  const px = x - bridge.from[0], pz = z - bridge.from[1];
  const along = px * bridge.ux + pz * bridge.uz, across = Math.abs(-px * bridge.uz + pz * bridge.ux);
  if (along < -0.25 || along > bridge.length + 0.25 || across > bridge.width / 2) continue;
  return { bridge, y: bridgeDeck(bridge, along / bridge.length) };
 }
 return null;
}

// Altura que pisan los personajes.
export function height(x, z) {
 return bridgeAt(x, z)?.y ?? ground(x, z);
}

// ¿Está vedado este punto? Lo están el mar, los acantilados (cualquier punto en
// pendiente fuerte, se llegue subiendo o bajando) y entrar a un puente si no
// es por sus extremos (quien anda por debajo no «sube» a él).
function blocked(x, z, fromY, agent) {
 const deck = bridgeAt(x, z);
 if (deck) return fromY !== undefined && Math.abs(fromY - deck.y) > 1;
 const here = ground(x, z);
 if (here < WATER_LEVEL + 0.5) return true;
 if (agent?.prop) return false;
 const e = 0.25;
 const slope = Math.hypot(ground(x + e, z) - ground(x - e, z), ground(x, z + e) - ground(x, z - e)) / (2 * e);
 return slope >= MAX_SLOPE;
}

// ── Sitios ──────────────────────────────────────────────────────────────────
export const COLORS = { nave: "#ff9a3c" };
export const SPAWN = { x: 0, z: 7.5 };
export const PAD = { x: 0, z: 0, padRadius: 4.6, color: "#6a6588" }; // plataforma circular de piedra, delante
// Edificios. `turn`: hacia dónde mira su fachada (0 = al sur, a la cámara);
// `size`: lado mayor en planta, en metros; `solid`: su huella (ancho y fondo)
// o su radio, para chocar.
export const BUILDINGS = {
 // La torre del reloj, en la cima: el icono de este mundo.
 torre: { own: true, painted: true, x: 0, z: -36, turn: 0, size: 4.1, solid: [3.9, 3.9] },
 // El observatorio, en el pico del oeste (el mismo modelo del mundo 1, repintado: piedra, cobre y latón; ver Buildings.jsx).
 observatorio: { model: "observatorio", from: "living", painted: true, x: -17.4, z: -27.4, turn: 0.5, size: 6.2, solid: 2.8 },
 // La casa del árbol, en el pico del este (el mismo modelo del mundo 1).
 "casa-arbol": { model: "casa-arbol", from: "living", saturation: 0.3, x: 17.2, z: -27.8, turn: -0.4, size: 7.6, solid: 1.6 },
 // La casa sobre tronco, en la primera terraza, al este: aquí se lee «Sobre mí».
 "casa-tronco": { model: "casa-tronco", saturation: 0.25, x: 16, z: -21.2, turn: -0.5, size: 9, solid: 2 },
 // Casita de cuento, abajo, al oeste, entre el río y el acantilado.
 casita: { model: "casita", painted: true, x: -17.6, z: -9.2, turn: 0.35, size: 5.2, solid: [4.8, 5] },
};
// La casa del alquimista (la casa torcida, hecha a mano), en la primera terraza, al oeste: luz morada.
export const HOUSE = { x: -18, z: -18.2, turn: 0.5, scale: 0.62, width: 5.2, depth: 4.6 };
// El invernadero de cristal, abajo, al este.
export const GREENHOUSE = { x: 14.2, z: -2.6, turn: -0.3, width: 3.6, depth: 5.2 };
const front = (site, away) => ({ x: site.x + Math.sin(site.turn) * away, z: site.z + Math.cos(site.turn) * away });
// Ante la puerta de la casa sobre tronco (donde se lee su historia).
export const STORY_DOOR = front(BUILDINGS["casa-tronco"], 3.5);
export const HOUSE_DOOR = front(HOUSE, (HOUSE.depth / 2) * HOUSE.scale + 1.3);

// Las paradas del juego del reloj (objetivo 23; ver ClockQuest.jsx). De cada una:
// dónde se pulsa la E (`x`, `z`: en el camino, ante su puerta), dónde flota su
// engranaje (`gear`), a qué mira la cámara al abrir su panel (`focus`: x,
// altura sobre el suelo, z) y a qué nudo de la red de Woody corresponde (`node`).
export const QUEST_STOPS = {
 alquimista: { x: HOUSE_DOOR.x + 0.5, z: HOUSE_DOOR.z + 0.1, gear: [HOUSE_DOOR.x - 0.5, HOUSE_DOOR.z + 0.9], focus: [HOUSE.x + 1, 2.4, HOUSE.z + 1], node: "luna-alquimista" },
 "casa-arbol": { x: 14.3, z: -26.2, gear: [15.5, -25.2], focus: [BUILDINGS["casa-arbol"].x, 3.4, BUILDINGS["casa-arbol"].z], node: "luna-casa-arbol", distance: 1.0 },
 casita: { x: -13.6, z: -9.3, gear: [-13.2, -7.6], focus: [BUILDINGS.casita.x + 1, 1.8, BUILDINGS.casita.z + 1], node: "luna-casita" },
 invernadero: { x: 11.8, z: -3.7, gear: [11.4, -1.9], focus: [GREENHOUSE.x, 1.5, GREENHOUSE.z], node: "luna-invernadero" },
};
// La puerta de la torre (donde se arranca el reloj) y el pie del telescopio (el final).
export const TOWER_DOOR = { x: 0.3, z: -33.3, focus: [BUILDINGS.torre.x, 5.4, BUILDINGS.torre.z] };
export const TELESCOPE = { x: -15.2, z: -25.0, focus: [BUILDINGS.observatorio.x, 3.2, BUILDINGS.observatorio.z], distance: 0.9 };

// Miradores: sitios donde la cámara se inclina hacia el horizonte y entran en
// cuadro la luna y el cielo. `r`: radio en que hace efecto del todo (y se va
// perdiendo en otro tanto).
export const VIEWPOINTS = [
 { id: "plataforma", x: PAD.x, z: PAD.z + 3, r: 5.5 },
 { id: "torre", x: 0.4, z: -32.6, r: 2.6 },
 { id: "observatorio", x: -15.4, z: -24.6, r: 2.4 },
];

// Caminos empedrados que serpentean. Cada uno pasa por sus puntos en curva suave.
const TRAILS = [
 // De la plataforma, hacia el norte, a la pasarela del río y a la escalera del oeste.
 { width: 1.7, through: [[-3.6, -2.9], [-5.6, -4.2], [-7.1, -5.9]] },
 { width: 1.7, through: [[-8.6, -10.2], [-9.2, -11.8]] },
 // A la casita.
 { width: 1.4, through: [[-9, -11.2], [-12, -10.6], [-14.6, -8.4]] },
 // De la plataforma al invernadero y a la escalera del este.
 { width: 1.7, through: [[4.4, -1.4], [7.4, -2.6], [9.6, -5.2], [11.4, -9]] },
 { width: 1.4, through: [[9, -4], [11.8, -3.6]] },
 // Al sur, hasta la punta de la isla.
 { width: 1.6, through: [[0.2, 4.6], [0.8, 7.2], [-0.2, 9.4]] },
 // Primera terraza: de la escalera del oeste a la casa del alquimista, a la escalera del pico y a la del macizo.
 { width: 1.5, through: [[-10, -17.8], [-12.6, -18.6], [-15.4, -17]] },
 { width: 1.5, through: [[-10, -17.8], [-10.8, -19.4], [-11.2, -20.2]] },
 { width: 1.6, through: [[-10, -17.8], [-6.6, -19], [-3.4, -20.2]] },
 // Y por la pasarela del arroyo hasta la casa sobre tronco y la escalera del este.
 { width: 1.6, through: [[-3.4, -20.2], [-1.4, -19.2], [0.1, -19]] },
 { width: 1.6, through: [[4.3, -19.1], [8, -18.2], [11, -17.8], [13, -16.4]] },
 { width: 1.5, through: [[11, -17.8], [13, -19], [STORY_DOOR.x, STORY_DOOR.z]] },
 // Arriba: de la escalera a los dos puentes y a la escalera de la cima.
 { width: 1.5, through: [[-2.6, -27.8], [-3.6, -29], [-5.4, -29.7]] },
 { width: 1.5, through: [[-2.6, -27.8], [1.4, -28.8], [4.6, -29.3]] },
 { width: 1.4, through: [[4.6, -29.3], [5.5, -29.9]] },
 // En los picos y en la cima.
 { width: 1.4, through: [[-12.4, -27.2], [-14.4, -26.2], [-15.2, -25]] },
 { width: 1.4, through: [[12.4, -27.8], [14.2, -26.2]] },
 { width: 1.5, through: [[3.1, -35.6], [1.6, -34.2], [0.2, -33.6]] },
];
// Curva de Catmull-Rom por los puntos dados, en tramos cortos.
function curve(points, steps = 6) {
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
// Plazoletas empedradas: alrededor de la plataforma y ante las puertas.
const YARDS = [
 { x: PAD.x, z: PAD.z, r: PAD.padRadius + 1.3 },
 { x: STORY_DOOR.x, z: STORY_DOOR.z, r: 1.6 },
 { x: HOUSE_DOOR.x, z: HOUSE_DOOR.z, r: 1.4 },
 { x: 0.2, z: -33.4, r: 1.7 },
];
// Distancia al borde del camino más cercano: negativa dentro, positiva fuera.
export function pathEdge(x, z) {
 let best = Infinity;
 for (const yard of YARDS) best = Math.min(best, Math.hypot(x - yard.x, z - yard.z) - yard.r);
 for (const path of PATHS) {
  const points = path.points;
  for (let i = 0; i < points.length - 1; i++) {
   if (Math.abs(x - points[i][0]) > best + 3 || Math.abs(z - points[i][1]) > best + 3) continue;
   best = Math.min(best, toSegment(x, z, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]).d - path.width / 2);
  }
 }
 return best;
}

// Pendiente del terreno en (x, z).
export function slopeAt(x, z, e = 0.3) {
 return Math.hypot(ground(x + e, z) - ground(x - e, z), ground(x, z + e) - ground(x, z - e)) / (2 * e);
}
// Qué se pisa en (x, z), para el sonido de los pasos.
export function surface(x, z) {
 if (bridgeAt(x, z)) return "wood";
 if (stairHeight(x, z) !== null || Math.hypot(x - PAD.x, z - PAD.z) < PAD.padRadius) return "stone";
 if (waterBed(x, z) > 0.6) return "water";
 if (pathEdge(x, z) < 0) return "path";
 return "grass";
}
const FOOTING = { wood: "wood", stone: "stone", water: "sand", path: "path", grass: "grass" };

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
// Árboles sin hojas, de ramas rizadas. `kind`: cuál de las tres formas.
export const TREES = [
 { x: -5.6, z: 5.4, kind: 1, scale: 0.8, turn: 5.3 },
 { x: 7.4, z: 4.4, kind: 2, scale: 0.86, turn: 4.0 },
 { x: -21.5, z: -5.2, kind: 0, scale: 0.95, turn: 0.4 },
 { x: 19.6, z: -8.4, kind: 2, scale: 0.9, turn: 1.4 },
 { x: 8.2, z: -24.4, kind: 0, scale: 0.84, turn: 3.2 },
 { x: -20.4, z: -24.2, kind: 2, scale: 0.7, turn: 1.2 },
 { x: -3.4, z: -37.2, kind: 0, scale: 0.72, turn: 4.4 },
];
// Farolas dobladas. `turn`: hacia dónde cuelga el farol.
export const LAMPS = [
 { x: -3.0, z: -6.2, turn: 0.4 },
 { x: 8.6, z: -6.6, turn: 2.6 },
 { x: -8.2, z: -19.6, turn: 4.4 },
 { x: 9.4, z: -16.6, turn: 1.2 },
 { x: 1.8, z: -30.6, turn: 5.2 },
];
// Verja de hierro desigual: tramos entre dos puntos.
export const FENCES = [
 { from: [-21.4, -15.4], to: [-18.4, -14.2] },
 { from: [-20.6, -11.6], to: [-17.4, -12.4] },
 // Al borde de la primera terraza, sobre el cortado del este y detrás de la torre.
 { from: [15.8, -15.6], to: [19.4, -16.6] },
 { from: [-4.2, -40.2], to: [-0.8, -40.6] },
];
// Árboles grandes, de copa: `kind` dice la forma —sauce llorón, copa ancha,
// espiral— y `tint`, el color de su copa (cada copia lleva el suyo).
export const BIG_TREES = [
 // (Objetivo 22: todos en los bordes de acantilado y al fondo, detrás de las
 // terrazas; delante de la cámara y junto a los caminos no queda ninguno.)
 { kind: "willow", x: -24.2, z: -17.0, scale: 1.15, turn: 0.6, tint: "#d6c9f0" },
 { kind: "willow", x: 26.2, z: -22.6, scale: 1.2, turn: 2.4, tint: "#a9ddd2" },
 { kind: "willow", x: -26.0, z: -11.5, scale: 1.0, turn: 4.1, tint: "#dcb9d0" },
 { kind: "willow", x: -21.8, z: -32.8, scale: 1.35, turn: 1.3, tint: "#a9ddd2" },
 { kind: "willow", x: 17.0, z: -35.9, scale: 1.35, turn: 5.2, tint: "#d6c9f0" },
 { kind: "broad", x: -21, z: -21.5, scale: 1.0, turn: 0.3, tint: "#c9b6e6" },
 { kind: "broad", x: 29.2, z: -17, scale: 1.1, turn: 2.0, tint: "#9cd0c8" },
 { kind: "broad", x: -14.8, z: -42.6, scale: 1.35, turn: 4.4, tint: "#b9a8dc" },
 { kind: "broad", x: 13.1, z: -39.7, scale: 1.3, turn: 3.3, tint: "#c9b6e6" },
 { kind: "broad", x: -26.1, z: -5.4, scale: 0.95, turn: 1.1, tint: "#9cd0c8" },
 { kind: "spiral", x: 26.6, z: -5.1, scale: 1.0, turn: 0.4, tint: "#b7a6da" },
 { kind: "spiral", x: -8.7, z: -43.9, scale: 1.25, turn: 2.6, tint: "#a3cbd2" },
 { kind: "spiral", x: 8.1, z: -42.0, scale: 1.25, turn: 4.9, tint: "#b7a6da" },
 { kind: "spiral", x: 21.4, z: -1.4, scale: 0.9, turn: 1.7, tint: "#a3cbd2" },
];
// Radio del tronco de cada forma (para chocar), a escala 1.
export const TRUNK = { willow: 0.5, broad: 0.55, spiral: 0.42 };
// Balizas de la zona de aterrizaje: postes a rayas con una bola encendida, entre camino y camino.
export const BEACONS = [0.6, 2.5, 4.55, 5.25].map((angle, i) => ({ x: PAD.x + Math.cos(angle) * (PAD.padRadius + 1.7), z: PAD.z + Math.sin(angle) * (PAD.padRadius + 1.7), turn: angle + 1.2 + i }));
// Lascas de piedra, al pie de los cortados y sueltas.
export const SHARDS = [
 { x: -3.6, z: -13.6, scale: 1.1, turn: 0.4 },
 { x: 7.2, z: -13.4, scale: 0.9, turn: 2.2 },
 { x: -15.6, z: -13.2, scale: 1.0, turn: 4.1 },
 { x: 17.6, z: -13.2, scale: 1.1, turn: 1.3 },
 { x: -8.4, z: -26.2, scale: 1.25, turn: 5.2 },
 { x: 9.2, z: -27.4, scale: 0.85, turn: 3.0 },
 { x: 9.4, z: 3.4, scale: 0.7, turn: 0.9 },
];
// ¿Queda libre este punto para plantar algo menudo? Llano, seco, fuera de caminos y de todo.
function open(x, z, margin = 0.5) {
 if (islandEdge(x, z) < 1.4 || slopeAt(x, z) > 0.3 || stairHeight(x, z) !== null || bridgeAt(x, z)) return false;
 if (waterBed(x, z) > 0 || pathEdge(x, z) < margin) return false;
 for (const site of Object.values(BUILDINGS)) if (Math.hypot(x - site.x, z - site.z) < site.size * 0.56) return false;
 if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < 3.4 || Math.hypot(x - GREENHOUSE.x, z - GREENHOUSE.z) < 3.8) return false;
 if (cragHeight(x, z) > -Infinity) return false;
 if (BIG_TREES.some((one) => Math.hypot(x - one.x, z - one.z) < 1.3 * one.scale)) return false;
 return ![...TREES, ...SHARDS].some((one) => Math.hypot(x - one.x, z - one.z) < 1.1);
}
// Busca, alrededor de (x, z), el sitio libre más cercano (para poner algo junto a una puerta o un camino).
function near(x, z, margin = 0.3) {
 for (let r = 0; r < 3; r += 0.25) {
  for (let k = 0; k < 12; k++) {
   const px = x + Math.cos((k / 12) * TAU) * r, pz = z + Math.sin((k / 12) * TAU) * r;
   if (open(px, pz, margin)) return [px, pz];
   if (r === 0) break;
  }
 }
 return null;
}
// Reparte `count` corros de `size` cosas por la isla: `spread`, lo que se abre cada corro.
function clusters(seed, count, size, spread, margin, pick) {
 const random = createRandom(seed);
 const out = [];
 for (let tries = 0; out.length < count * size && tries < count * 60; tries++) {
  const angle = random() * TAU, radius = Math.sqrt(random()) * 27;
  const cx = ISLAND.x + Math.cos(angle) * radius, cz = ISLAND.z + Math.sin(angle) * radius;
  if (!open(cx, cz, margin)) continue;
  for (let k = 0; k < size; k++) {
   const x = cx + (random() - 0.5) * spread, z = cz + (random() - 0.5) * spread;
   if (open(x, z, margin)) out.push({ x, z, scale: 0.7 + random() * 0.6, turn: random() * TAU, ...pick?.(random) });
  }
 }
 return out;
}
const VIOLETS = ["#b98cff", "#9a6cff", "#d6a8ff", "#7f8cff"];
// Lo menudo: helechos (a corros, y una corona alrededor de la plataforma),
// setas que brillan, flores violetas y enredaderas con rizos.
export const FERNS = [
 ...Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * TAU + 0.13, r = PAD.padRadius + 2.5 + (i % 3) * 0.55;
  return { x: PAD.x + Math.cos(angle) * r, z: PAD.z + Math.sin(angle) * r, scale: 0.85 + (i % 4) * 0.12, turn: angle * 3, tint: i % 5 === 2 ? "#a24a6c" : "#4fa092" };
 }).filter((one) => open(one.x, one.z, 0.3)),
 ...clusters(20261131, 18, 4, 2.6, 0.35, (random) => ({ tint: random() < 0.22 ? "#a24a6c" : random() < 0.5 ? "#4fa092" : "#3f8a7e" })),
];
export const MUSHROOMS = clusters(20261132, 34, 5, 1.4, 0.25, (random) => ({ scale: 0.5 + random() * 0.9, tint: random() < 0.5 ? "#18c8ff" : "#9a4dff" }));
export const FLOWERS = clusters(20261133, 46, 6, 1.8, 0.2, (random) => ({ scale: 0.7 + random() * 0.6, tint: VIOLETS[Math.floor(random() * VIOLETS.length)] }));
export const VINES = clusters(20261134, 26, 3, 1.2, 0.3, (random) => ({ scale: 0.7 + random() * 0.8, tint: random() < 0.5 ? "#3b7c74" : "#5a4f8f" }));
// Calabazas sonrientes: pocas, junto a las puertas y los caminos.
export const PUMPKINS = [
 [STORY_DOOR.x + 1.3, STORY_DOOR.z + 0.4],
 [STORY_DOOR.x - 1.4, STORY_DOOR.z + 0.9],
 [HOUSE_DOOR.x + 1.2, HOUSE_DOOR.z + 0.3],
 [-14.2, -7.4],
 [3.6, 4.8],
 [-3.4, 4.6],
 [1.9, -32.2],
 [10.6, -5.6],
]
 .map(([x, z]) => near(x, z, 0.15))
 .filter(Boolean)
 .map(([x, z], i) => ({ x, z, scale: 0.8 + (i % 3) * 0.15, turn: i % 2 ? 0.4 : -0.3 }));
// Farolillos: al principio y al final de cada puente y, cada nueve metros, a un lado de los caminos.
export const LANTERNS = (() => {
 const spots = [];
 const keep = (x, z, turn) => {
  const free = near(x, z, 0.15);
  if (!free || [...spots, ...LAMPS].some((one) => Math.hypot(one.x - free[0], one.z - free[1]) < 3)) return;
  spots.push({ x: free[0], z: free[1], turn });
 };
 for (const bridge of BRIDGES) {
  for (const [end, away] of [[bridge.from, -1], [bridge.to, 1]]) {
   const side = bridge.width / 2 + 0.45;
   keep(end[0] + bridge.ux * away * 0.9 - bridge.uz * side, end[1] + bridge.uz * away * 0.9 + bridge.ux * side, Math.atan2(bridge.ux, bridge.uz));
  }
 }
 for (const path of PATHS) {
  let walked = 4, side = 1;
  for (let i = 0; i < path.points.length - 1; i++) {
   const [ax, az] = path.points[i], [bx, bz] = path.points[i + 1], step = Math.hypot(bx - ax, bz - az);
   walked += step;
   if (walked < 9) continue;
   walked = 0;
   side = -side;
   const nx = -(bz - az) / step, nz = (bx - ax) / step;
   keep(ax + nx * side * (path.width / 2 + 0.55), az + nz * side * (path.width / 2 + 0.55), Math.atan2(-nx * side, -nz * side));
  }
 }
 return spots;
})();
// Matojos: a corros, por toda la isla.
export const TUFTS = (() => {
 const random = createRandom(20261120);
 const tufts = [];
 for (let tries = 0; tufts.length < 700 && tries < 9000; tries++) {
  const angle = random() * TAU, radius = Math.sqrt(random()) * 29;
  const cx = ISLAND.x + Math.cos(angle) * radius, cz = ISLAND.z + Math.sin(angle) * radius;
  // Donde el ruido dice «claro» no nace nada: quedan calvas.
  if (noise2(cx * 0.14 + 7, cz * 0.14) < 0.4) continue;
  for (let k = 0; k < 4; k++) {
   const x = cx + (random() - 0.5) * 2.2, z = cz + (random() - 0.5) * 2.2;
   if (open(x, z, 0.25)) tufts.push({ x, z, scale: 0.7 + random() * 0.9, turn: random() * TAU });
  }
 }
 return tufts;
})();

// Luciérnagas: corros que rondan por toda la isla, a poca altura (cada una se
// mueve alrededor de su sitio; el movimiento lo calcula el sombreador).
export const FIREFLIES = clusters(20261141, 30, 4, 3.2, 0, (random) => ({ lift: 0.5 + random() * 1.8, phase: random() * 100 }));
// Dónde suena la campana: en lo alto de la torre.
export const BELL = { x: 0, z: -36, y: LEVELS[3] + 12 };

// De dónde viene el sonido del agua para quien está en (x, z): el mar (la orilla
// que queda enfrente) y la cascada más cercana. Usa los mismos bucles grabados
// del primer mundo (ver audio/engine.js).
function soundSources(x, z) {
 const dx = x - ISLAND.x, dz = z - ISLAND.z, angle = Math.atan2(dz, dx), shore = shoreRadius(angle), r = Math.hypot(dx, dz);
 let fall = null;
 for (const one of WATERFALLS) {
  const d = Math.hypot(x - one.x, z - one.z);
  if (!fall || d < fall.d) fall = { d, dx: one.x - x, dz: one.z - z };
 }
 return {
  mar: { d: Math.max(0, shore - 1.5 - r), dx: ISLAND.x + Math.cos(angle) * shore - x, dz: ISLAND.z + Math.sin(angle) * shore - z, reach: 6, far: 26 },
  cascada: { ...fall, reach: 5, far: 26, gain: 0.8 },
 };
}

// ── Colisiones ──────────────────────────────────────────────────────────────
const turned = (site, px, pz) => [site.x + px * Math.cos(site.turn) + pz * Math.sin(site.turn), site.z - px * Math.sin(site.turn) + pz * Math.cos(site.turn)];
const box = (site, width, depth) => ({ poly: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => turned(site, (sx * width) / 2, (sz * depth) / 2)), r: 0.12 });
export const shipCollider = { x: PAD.x, z: PAD.z, r: 2.3, active: true };
export const colliders = [
 ...Object.values(BUILDINGS).map((site) => (Array.isArray(site.solid) ? box(site, site.solid[0], site.solid[1]) : { x: site.x, z: site.z, r: site.solid })),
 box(HOUSE, HOUSE.width * HOUSE.scale, HOUSE.depth * HOUSE.scale),
 box(GREENHOUSE, GREENHOUSE.width, GREENHOUSE.depth),
 ...TREES.map((tree) => ({ x: tree.x, z: tree.z, r: 0.5 * tree.scale })),
 ...BIG_TREES.map((tree) => ({ x: tree.x, z: tree.z, r: TRUNK[tree.kind] * tree.scale })),
 ...PUMPKINS.map((one) => ({ x: one.x, z: one.z, r: 0.3 * one.scale })),
 ...LANTERNS.map((one) => ({ x: one.x, z: one.z, r: 0.12 })),
 ...LAMPS.map((lamp) => ({ x: lamp.x, z: lamp.z, r: 0.22 })),
 ...BEACONS.map((beacon) => ({ x: beacon.x, z: beacon.z, r: 0.16 })),
 ...SHARDS.map((shard) => ({ x: shard.x + 0.05 * shard.scale, z: shard.z + 0.05 * shard.scale, r: 0.62 * shard.scale })),
 ...FENCES.map((fence) => ({ x: fence.from[0], z: fence.from[1], bx: fence.to[0], bz: fence.to[1], r: 0.14 })),
 // Barandillas de los puentes: por los lados no se sale.
 ...BRIDGES.flatMap((bridge) =>
  [-1, 1].map((side) => {
   const ox = -bridge.uz * side * (bridge.width / 2 + 0.12), oz = bridge.ux * side * (bridge.width / 2 + 0.12);
   // (Algo más cortas que el tablero: en los extremos se entra y se sale en diagonal sin tropezar.)
   const inset = 0.45;
   return { x: bridge.from[0] + ox + bridge.ux * inset, z: bridge.from[1] + oz + bridge.uz * inset, bx: bridge.to[0] + ox - bridge.ux * inset, bz: bridge.to[1] + oz - bridge.uz * inset, r: 0.1 };
  }),
 ),
 shipCollider,
];

// La noche de este mundo (ver experience/theme.js). No hay día ni atardecer:
// las tres franjas llevan la misma paleta. Luna fría al fondo, a la derecha de
// la torre: recorta las siluetas y tiende sombras largas hacia la cámara.
// Paleta contenida (objetivo 22): cielo azul marino, roca de pizarra, sombras
// casi negras azuladas; el color vivo lo ponen las ventanas, los faroles y el agua que brilla.
const NIGHT = {
 hemiSky: "#7f86c2",
 hemiGround: "#2a2440",
 hemiPower: 1.0,
 // (Luna baja, a 19° sobre el horizonte, casi de frente: sombras largas que vienen hacia la cámara.)
 sun: "#bcd2ff",
 sunPower: 3.2,
 sunFrom: [0.3, 0.33, -0.9],
 fog: "#1d2447",
 fogDensity: 0.0085,
 background: "#1d2447",
 skyTop: "#060b1f",
 skyHorizon: "#283463",
 waterShallow: "#15465c",
 waterDeep: "#0a1130",
 glow: 1,
 bloom: 0.95,
 // (Sombras de verdad: lo que cae en ellas queda casi negro azulado, y los charcos de luz cálida destacan.)
 shadow: 0.93,
};

// El mundo, con la interfaz que usan el jugador, Woody, la nave y los objetos.
const twisted = {
 id: "twisted",
 name: "The Twisted Moon",
 planet: true, // al subir con la nave, el mundo se cierra en esfera
 moment: "night", // siempre de noche
 ownMoon: true, // trae su propia luna, enorme (Sky.jsx no dibuja la suya)
 woodyStaysUp: true, // Woody descansa sentado, no tumbado: echado, y negro, desde arriba era una mancha
 spawn: SPAWN,
 waterLevel: WATER_LEVEL,
 height,
 ground,
 blocked,
 surface: (x, z) => FOOTING[surface(x, z)] ?? "grass",
 soundSources,
 ownAmbience: true, // trae su propio ambiente (grillos, música): los grillos del primer mundo callan
 // Miradores: cuánto se inclina ahí la cámara hacia el horizonte (0 = nada, 1 = del todo).
 lookout: (x, z) => {
  let most = 0;
  for (const spot of VIEWPOINTS) most = Math.max(most, 1 - smooth(spot.r, spot.r * 2, Math.hypot(x - spot.x, z - spot.z)));
  return most;
 },
 // Zonas de las que Woody dice algo la primera vez que se entra (content/woody.js).
 zones: [
  { id: "luna-nave", x: PAD.x, z: PAD.z, r: PAD.padRadius + 1.4 },
  { id: "casa-tronco", x: STORY_DOOR.x, z: STORY_DOOR.z, r: 3.4 },
  { id: "torre", x: 0.2, z: -33.2, r: 3 },
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
   "cruce-oeste": [-4.4, -3.4],
   "pasarela-sur": [-7.1, -5.6],
   "pasarela-norte": [-8.85, -10.9],
   "escalera-oeste-pie": [-9.3, -12],
   "escalera-oeste-medio": [-11, -14.4],
   "escalera-oeste-alto": [-10, -18],
   "terraza-centro": [-3.6, -20],
   "arroyo-oeste": [0, -19],
   "arroyo-este": [4.4, -19.1],
   "terraza-este": [11, -17.8],
   "casa-tronco": [STORY_DOOR.x, STORY_DOOR.z],
   "cruce-este": [5.2, -1.8],
   invernadero: [9.4, -4.8],
   "escalera-este-pie": [11.5, -8.9],
   "escalera-este-medio": [13.4, -12.6],
   "escalera-este-alto": [13, -16.5],
   "macizo-medio": [-4.3, -24],
   "macizo-alto": [-2.6, -27.9],
   "cima-pie": [4.7, -29.2],
   "cima-medio": [5.5, -32.8],
   torre: [2.4, -34.8],
   // Las paradas del juego del reloj y los tramos que llevan a ellas (objetivo 23).
   "terraza-oeste": [-12.6, -18.6],
   "luna-alquimista": [QUEST_STOPS.alquimista.x, QUEST_STOPS.alquimista.z],
   "senda-casita": [-12, -10.6],
   "luna-casita": [QUEST_STOPS.casita.x, QUEST_STOPS.casita.z],
   "luna-invernadero": [QUEST_STOPS.invernadero.x, QUEST_STOPS.invernadero.z],
   "puente-oeste-a": [-5.4, -29.7],
   "puente-oeste-b": [-12.4, -27.2],
   "luna-observatorio": [TELESCOPE.x, TELESCOPE.z],
   "puente-este-a": [5.5, -29.9],
   "puente-este-b": [12.4, -27.8],
   "luna-casa-arbol": [QUEST_STOPS["casa-arbol"].x, QUEST_STOPS["casa-arbol"].z],
  },
  links: [
   ["cohete", "cruce-oeste"],
   ["cruce-oeste", "pasarela-sur"],
   ["pasarela-sur", "pasarela-norte"],
   ["pasarela-norte", "escalera-oeste-pie"],
   ["escalera-oeste-pie", "escalera-oeste-medio"],
   ["escalera-oeste-medio", "escalera-oeste-alto"],
   ["escalera-oeste-alto", "terraza-centro"],
   ["terraza-centro", "arroyo-oeste"],
   ["arroyo-oeste", "arroyo-este"],
   ["arroyo-este", "terraza-este"],
   ["terraza-este", "casa-tronco"],
   ["cohete", "cruce-este"],
   ["cruce-este", "invernadero"],
   ["invernadero", "escalera-este-pie"],
   ["escalera-este-pie", "escalera-este-medio"],
   ["escalera-este-medio", "escalera-este-alto"],
   ["escalera-este-alto", "terraza-este"],
   ["terraza-centro", "macizo-medio"],
   ["macizo-medio", "macizo-alto"],
   ["macizo-alto", "cima-pie"],
   ["cima-pie", "cima-medio"],
   ["cima-medio", "torre"],
   ["escalera-oeste-alto", "terraza-oeste"],
   ["terraza-oeste", "luna-alquimista"],
   ["pasarela-norte", "senda-casita"],
   ["senda-casita", "luna-casita"],
   ["invernadero", "luna-invernadero"],
   ["macizo-alto", "puente-oeste-a"],
   ["puente-oeste-a", "puente-oeste-b"],
   ["puente-oeste-b", "luna-observatorio"],
   ["cima-pie", "puente-este-a"],
   ["puente-este-a", "puente-este-b"],
   ["puente-este-b", "luna-casa-arbol"],
  ],
  places: [{ id: "casa-tronco" }, { id: "torre" }, { id: "cohete" }, { id: "luna-alquimista" }, { id: "luna-casa-arbol" }, { id: "luna-casita" }, { id: "luna-invernadero" }, { id: "luna-observatorio" }],
 },
 themes: { day: NIGHT, dusk: NIGHT, night: NIGHT },
};
export default twisted;
