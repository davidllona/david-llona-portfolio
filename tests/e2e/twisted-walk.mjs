// The Twisted Moon, sin navegador: ¿se puede llegar andando a todas partes?
// Recorre la isla en una rejilla fina desde el punto de llegada, con las
// mismas reglas que los personajes (terreno vedado, acantilados, puentes que
// solo se toman por sus extremos y colisiones), y comprueba que se alcanza
// cada sitio: puertas, miradores, extremos de escaleras y puentes y todos los
// puntos por los que guía Woody. También que los acantilados no se trepan.
//   node tests/e2e/twisted-walk.mjs [mapa]     «mapa» dibuja la isla en texto
import twisted, { BRIDGES, BUILDINGS, FERNS, FLOWERS, HOUSE_DOOR, LEVELS, MUSHROOMS, STAIRS, STORY_DOOR, TUFTS, VIEWPOINTS, VINES, GREENHOUSE, bridgeDeck, ground, height, stairHeight } from "../../src/worlds/twisted/layout.js";
import { distanceTo } from "../../src/worlds/collision.js";

let failures = 0;
const check = (ok, text) => {
 if (!ok) failures += 1;
 console.log(`${ok ? "OK   " : "FALLO"} ${text}`);
};

const CELL = 0.25, HALF = 34, SIZE = Math.round((HALF * 2) / CELL), OFFSET_Z = -17;
const RADIUS = 0.42;
const at = (i, j) => [-HALF + (i + 0.5) * CELL, OFFSET_Z - HALF + (j + 0.5) * CELL];
const cell = (x, z) => [Math.floor((x + HALF) / CELL), Math.floor((z - OFFSET_Z + HALF) / CELL)];
// ¿Cabe un personaje en este punto? (Sin contar de dónde viene.)
const solid = new Uint8Array(SIZE * SIZE);
for (let j = 0; j < SIZE; j++) {
 for (let i = 0; i < SIZE; i++) {
  const [x, z] = at(i, j);
  if (twisted.colliders.some((c) => c.active !== false && c !== twisted.shipCollider && distanceTo(c, x, z) < c.r + RADIUS)) solid[j * SIZE + i] = 1;
 }
}
// Se anda de una casilla a la vecina si el destino no está vedado viniendo de esta altura.
const reached = new Float32Array(SIZE * SIZE).fill(NaN);
const [si, sj] = cell(twisted.spawn.x, twisted.spawn.z);
const queue = [[si, sj]];
reached[sj * SIZE + si] = height(...at(si, sj));
while (queue.length) {
 const [i, j] = queue.pop();
 const y = reached[j * SIZE + i];
 for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  const ni = i + di, nj = j + dj;
  if (ni < 0 || nj < 0 || ni >= SIZE || nj >= SIZE || !Number.isNaN(reached[nj * SIZE + ni]) || solid[nj * SIZE + ni]) continue;
  const [x, z] = at(ni, nj);
  if (twisted.blocked(x, z, y)) continue;
  const next = height(x, z);
  // (Un paso de 25 cm no salva más de medio metro: lo demás es caerse o trepar.)
  if (Math.abs(next - y) > 0.5) continue;
  reached[nj * SIZE + ni] = next;
  queue.push([ni, nj]);
 }
}
const got = (x, z, reach = 0.6) => {
 for (let dx = -reach; dx <= reach; dx += CELL) for (let dz = -reach; dz <= reach; dz += CELL) {
  const [i, j] = cell(x + dx, z + dz);
  if (!Number.isNaN(reached[j * SIZE + i])) return reached[j * SIZE + i];
 }
 return null;
};

const places = [
 ["la puerta de la casa sobre tronco", STORY_DOOR.x, STORY_DOOR.z, LEVELS[1]],
 ["la puerta de la casa del alquimista", HOUSE_DOOR.x, HOUSE_DOOR.z, LEVELS[1]],
 ["el pie de la torre del reloj", 0.2, -33.4, LEVELS[3]],
 ["el observatorio", BUILDINGS.observatorio.x + 2.4, BUILDINGS.observatorio.z + 2.6, LEVELS[2]],
 ["la casa del árbol", BUILDINGS["casa-arbol"].x - 2.2, BUILDINGS["casa-arbol"].z + 2, LEVELS[2]],
 ["la casita", BUILDINGS.casita.x + 2.6, BUILDINGS.casita.z + 2.6, LEVELS[0]],
 ["el invernadero", GREENHOUSE.x - 3, GREENHOUSE.z + 0.4, LEVELS[0]],
 ...VIEWPOINTS.map((spot) => [`el mirador «${spot.id}»`, spot.x, spot.z, null]),
 ...STAIRS.flatMap((stair) => [[`el pie de la escalera «${stair.id}»`, ...stair.through[0], stair.from], [`lo alto de la escalera «${stair.id}»`, ...stair.through[stair.through.length - 1], stair.to]]),
 ...BRIDGES.flatMap((bridge) => [[`un extremo del puente «${bridge.id}»`, ...bridge.from, bridge.y], [`el otro extremo del puente «${bridge.id}»`, ...bridge.to, bridge.y], [`el centro del puente «${bridge.id}»`, (bridge.from[0] + bridge.to[0]) / 2, (bridge.from[1] + bridge.to[1]) / 2, null]]),
 ...Object.entries(twisted.guide.nodes).map(([id, [x, z]]) => [`el punto de guía «${id}»`, x, z, null]),
];
const lost = [];
for (const [name, x, z, level] of places) {
 const y = got(x, z);
 if (y === null) lost.push(`${name} (${x.toFixed(1)}, ${z.toFixed(1)}): no se llega`);
 else if (level !== null && Math.abs(y - level) > 0.8) lost.push(`${name}: se llega a ${y.toFixed(1)} m, no a ${level.toFixed(1)}`);
}
check(lost.length === 0, `andando desde la llegada se alcanzan los ${places.length} sitios (puertas, miradores, escaleras, puentes y puntos de guía)${lost.length ? ":\n       " + lost.join("\n       ") : ""}`);

// Las cuatro alturas se pisan, y no hay más superficie andable que la esperada.
const area = LEVELS.map((level) => reached.reduce((sum, y) => sum + (Math.abs(y - level) < 0.6 ? 1 : 0), 0) * CELL * CELL);
check(area.every((one) => one > 12), `se pisan las cuatro alturas: ${area.map((one, i) => `${LEVELS[i].toFixed(1)} m → ${one.toFixed(0)} m²`).join(" · ")}`);

// Los acantilados no se trepan: de una terraza a otra solo se pasa por escalera o puente.
const climbs = [];
for (let j = 0; j < SIZE - 1; j++) {
 for (let i = 0; i < SIZE - 1; i++) {
  const a = reached[j * SIZE + i];
  for (const b of [reached[j * SIZE + i + 1], reached[(j + 1) * SIZE + i]]) {
   // (Bajo un puente colgante hay suelo, mucho más abajo: no es un escalón, es otro piso.)
   if (!Number.isNaN(a) && !Number.isNaN(b) && Math.abs(a - b) > 0.9 && Math.abs(a - b) < 2.6) climbs.push(`(${at(i, j).map((v) => v.toFixed(1)).join(", ")}) ${a.toFixed(1)} → ${b.toFixed(1)}`);
  }
 }
}
check(climbs.length === 0, `entre dos casillas vecinas alcanzadas nunca hay un escalón de más de 90 cm (el costado bajo de una escalera) (${climbs.length})${climbs.length ? ": " + climbs.slice(0, 5).join(" · ") : ""}`);
// En las escaleras la altura no da saltos (ni en los codos): se anda por todo su ancho sin rincones donde quedarse clavado.
{
 let jumps = 0, cells = 0;
 for (const stair of STAIRS) {
  const xs = stair.through.map((p) => p[0]), zs = stair.through.map((p) => p[1]);
  for (let x = Math.min(...xs) - 1.5; x < Math.max(...xs) + 1.5; x += 0.1) for (let z = Math.min(...zs) - 1.5; z < Math.max(...zs) + 1.5; z += 0.1) {
   const here = stairHeight(x, z);
   if (here === null) continue;
   cells += 1;
   for (const [dx, dz] of [[0.1, 0], [0, 0.1]]) {
    const next = stairHeight(x + dx, z + dz);
    if (next !== null && Math.abs(next - here) > 0.25) jumps += 1;
   }
  }
 }
 // (En el canto mismo del codo, donde no se pisa —es borde de acantilado—, puede quedar alguno suelto.)
 check(cells > 2000 && jumps <= 2, `en las ${STAIRS.length} escaleras la altura es continua, codos incluidos (${cells} puntos; ${jumps} saltos de más de 25 cm en 10 cm, en el canto)`);
}
// Nadie acaba en el mar.
const wet = reached.reduce((sum, y) => sum + (y < twisted.waterLevel + 0.5 ? 1 : 0), 0);
check(wet === 0, `ninguna casilla alcanzada está en el mar (${wet})`);
// Las rutas de Woody: cada tramo se puede andar en línea (casi) recta.
const hops = [];
for (const [from, to] of twisted.guide.links) {
 const [ax, az] = twisted.guide.nodes[from], [bx, bz] = twisted.guide.nodes[to];
 const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2);
 let y = height(ax, az), ok = true;
 for (let k = 1; k <= steps && ok; k++) {
  const x = ax + ((bx - ax) * k) / steps, z = az + ((bz - az) * k) / steps;
  if (twisted.blocked(x, z, y) || twisted.colliders.some((c) => c !== twisted.shipCollider && distanceTo(c, x, z) < c.r + 0.3)) ok = false;
  y = height(x, z);
 }
 if (!ok) hops.push(`${from} → ${to}`);
}
check(hops.length === 0, `los ${twisted.guide.links.length} tramos de la red de guía de Woody están despejados${hops.length ? ": cortados " + hops.join(", ") : ""}`);

// ── Puentes (objetivo 28) ───────────────────────────────────────────────────
// Ninguno atraviesa el terreno ni las escaleras: los colgantes solo se comban sobre
// el vacío, y donde hay tierra debajo el tablero va a ras de ella. Nada crece debajo
// ni pegado. Y se entra y se sale sin saltos de altura.
for (const bridge of BRIDGES) {
 const point = (d, side = 0) => [bridge.from[0] + bridge.ux * d - bridge.uz * side, bridge.from[1] + bridge.uz * d + bridge.ux * side];
 // Lo más que el suelo sube sobre el canto bajo de las tablas (12 cm bajo el tablero), en el eje y a los dos lados.
 let pierced = -Infinity, onStair = false;
 for (let d = 0; d <= bridge.length; d += 0.1) {
  for (const side of [-bridge.width / 2 - 0.1, 0, bridge.width / 2 + 0.1]) {
   const [x, z] = point(d, side);
   pierced = Math.max(pierced, ground(x, z) - (bridgeDeck(bridge, d / bridge.length) - 0.12));
   onStair ||= stairHeight(x, z) !== null;
  }
 }
 // (Sobre tierra firme las tablas del umbral se apoyan en el suelo: hasta 13 cm es estar posado, no atravesar.)
 check(pierced < 0.13 && !onStair, `el puente «${bridge.id}» no atraviesa el terreno ni pisa una escalera (el suelo sube como mucho ${(pierced * 100).toFixed(0)} cm sobre el canto bajo de las tablas)`);
 if (bridge.rope) {
  const [a, b] = bridge.span, low = Math.min(...Array.from({ length: 21 }, (_, k) => bridgeDeck(bridge, a + ((b - a) * k) / 20)));
  check(a > 0.05 && b < 0.95 && Math.abs(bridgeDeck(bridge, a) - bridge.y - 0.06) < 0.001 && bridge.y - low > 0.3, `«${bridge.id}» cuelga de poste a poste (del ${(a * 100).toFixed(0)} al ${(b * 100).toFixed(0)} % de su recorrido), con ${(bridge.y + 0.06 - low).toFixed(2)} m de comba, y va a ras de suelo sobre tierra firme`);
 }
 const under = [...FERNS, ...MUSHROOMS, ...FLOWERS, ...VINES, ...TUFTS].filter((one) => {
  const px = one.x - bridge.from[0], pz = one.z - bridge.from[1];
  const along = px * bridge.ux + pz * bridge.uz, across = Math.abs(-px * bridge.uz + pz * bridge.ux);
  return along > -0.9 && along < bridge.length + 0.9 && across < bridge.width / 2 + 1;
 });
 check(under.length === 0, `nada crece debajo de «${bridge.id}» ni pegado a él (${under.length} plantas)`);
 // Andando por su eje, desde 1,2 m antes hasta 1,2 m después: la altura no da saltos.
 let jump = 0, before = height(...point(-1.2));
 for (let d = -1.15; d <= bridge.length + 1.2; d += 0.05) {
  const y = height(...point(d));
  if (!(bridge.id === "casa-arbol" && d < 0)) jump = Math.max(jump, Math.abs(y - before));
  before = y;
 }
 check(jump < 0.11 && twisted.surface(...point(bridge.length / 2)) === "wood", `«${bridge.id}» se cruza sin saltos de altura (el mayor, ${(jump * 100).toFixed(0)} cm cada 5 cm andados) y se pisa madera`);
}

if (process.argv.includes("mapa")) {
 const STEP = 4;
 for (let j = 0; j < SIZE; j += STEP * 2) {
  let line = "";
  for (let i = 0; i < SIZE; i += STEP) {
   const y = reached[j * SIZE + i];
   const [x, z] = at(i, j);
   line += Number.isNaN(y) ? (solid[j * SIZE + i] ? "#" : height(x, z) < twisted.waterLevel ? " " : "·") : String(Math.max(0, Math.min(9, Math.round(y / 1.2))));
  }
  console.log(line);
 }
}
console.log(failures ? `${failures} fallos` : "sin fallos");
process.exitCode = failures ? 1 : 0;
