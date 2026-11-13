// Colisiones: lo que se ve es lo que choca.
//
//   node tests/e2e/collisions.mjs           comprueba
//   node tests/e2e/collisions.mjs lista     además lista cada objeto atravesado
//   node tests/e2e/collisions.mjs hornear   rehace src/worlds/living/solids.js
//
// «hornear» saca la huella real de todo lo sólido de la escena a la altura del
// cuerpo (rayos verticales cada 15 cm por todo el mapa), la parte en manchas y
// escribe la envoltura de cada una: de ahí salen los obstáculos del planeta.
// Hay que rehacerlo cuando se mueve, se añade o se cambia algo sólido; la
// comprobación avisa si lo horneado ya no coincide con la escena.
//
// La comprobación recorre el mapa en otra rejilla y, en cada punto al que se
// llega andando, mira si la columna que ocupa el cuerpo toca algo sólido.
import fs from "node:fs";
import { open, check } from "./common.mjs";

// Lo que se pisa o se roza a propósito (plantas bajas, adoquines, agua, luz).
const SOFT = /^(adoquín|espiga|flor|trébol|helecho|arbusto|junco|seta|guijarro|nenúfar|Scene\/|\()/;
// Lo que se mueve (lleva su propio obstáculo o su propia física) o va a mano en layout.js.
const MOVING = /^(cohete|caja|barril|balón)/;
const BY_HAND = /^(puente)/;
const mode = process.argv[2];
const FILE = new URL("../../src/worlds/living/solids.js", import.meta.url);
const CELL = 0.15, EXTENT = 51, LOW = 0.25, HIGH = 1.4; // por debajo de 25 cm se pisa (losa de la nave, bordillos)

const t = await open();
await t.enter();
const meshes = await t.evaluate(() => window.__world.probe.meshes());
const solid = meshes.filter((m) => !SOFT.test(m.label) && !MOVING.test(m.label) && !m.skinned);
const baked = solid.filter((m) => !BY_HAND.test(m.label));

// ── Huella de todo el mapa, por franjas ──────────────────────────────────────
async function footprint() {
 const rows = [];
 const strip = 6;
 for (let z = -EXTENT; z < EXTENT; z += strip) {
  const part = await t.evaluate((ids, bounds, cell, low, high) => window.__world.probe.footprint(ids, { cell, low, high, margin: 0, bounds }), baked.map((m) => m.id), [-EXTENT, z, EXTENT, z + strip], CELL, LOW, HIGH);
  rows.push(...part.rows);
 }
 return rows;
}
// Envoltura convexa (los vértices, en el sentido que deja el interior a la izquierda en x→z).
function hull(points) {
 const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
 const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
 const half = (list) => {
  const out = [];
  for (const p of list) {
   while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
   out.push(p);
  }
  out.pop();
  return out;
 };
 return [...half(sorted), ...half(sorted.reverse())];
}
// Quita los vértices que apenas doblan (a menos de `slack` metros de la cuerda).
function simplify(poly, slack = 0.05) {
 let out = poly;
 for (let changed = true; changed && out.length > 3; ) {
  changed = false;
  for (let i = 0; i < out.length; i++) {
   const a = out[(i + out.length - 1) % out.length], b = out[i], c = out[(i + 1) % out.length];
   const length = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
   if (Math.abs((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / length < slack) {
    out = out.filter((_, j) => j !== i);
    changed = true;
    break;
   }
  }
 }
 return out;
}
// Una mancha con entrantes (una hilera de rocas que dobla una esquina, una casa
// en L) no se envuelve entera: su envoltura taparía suelo libre. Se parte por
// la mitad, a lo largo, hasta que cada trozo llena bien la suya.
function convexParts(cells) {
 if (cells.length < 14) return [cells];
 const outline = hull(cells);
 let area = 0, edge = 0;
 for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
  area += outline[j][0] * outline[i][1] - outline[i][0] * outline[j][1];
  edge += Math.hypot(outline[i][0] - outline[j][0], outline[i][1] - outline[j][1]);
 }
 // (Las celdas son puntos: a la envoltura se le suma media celda de borde.)
 const fill = (cells.length * CELL * CELL) / (Math.abs(area) / 2 + (edge * CELL) / 2 + CELL * CELL);
 if (fill > 0.78) return [cells];
 const xs = cells.map((c) => c[0]), zs = cells.map((c) => c[1]);
 const axis = Math.max(...xs) - Math.min(...xs) > Math.max(...zs) - Math.min(...zs) ? 0 : 1;
 const sorted = [...cells].sort((a, b) => a[axis] - b[axis]);
 const cut = sorted[sorted.length >> 1][axis];
 const low = cells.filter((c) => c[axis] < cut), high = cells.filter((c) => c[axis] >= cut);
 if (!low.length || !high.length) return [cells];
 return [...convexParts(low), ...convexParts(high)];
}
function shapes(rows) {
 const h = rows.length, wide = rows[0].length;
 const seen = new Uint8Array(h * wide);
 const list = [];
 const r2 = (v) => Math.round(v * 100) / 100;
 for (let j = 0; j < h; j++) {
  for (let i = 0; i < wide; i++) {
   if (rows[j][i] !== "#" || seen[j * wide + i]) continue;
   const cells = [], stack = [[i, j]];
   seen[j * wide + i] = 1;
   while (stack.length) {
    const [a, b] = stack.pop();
    cells.push([-EXTENT + a * CELL, -EXTENT + b * CELL]);
    // (Se unen también las celdas separadas por un hueco de una o dos: el tablón de
    // un cartel sale como una hilera de puntos, y es una sola pieza.)
    for (let da = -3; da <= 3; da++) for (let db = -3; db <= 3; db++) {
     const x = a + da, z = b + db;
     if (x < 0 || z < 0 || x >= wide || z >= h || rows[z][x] !== "#" || seen[z * wide + x]) continue;
     seen[z * wide + x] = 1;
     stack.push([x, z]);
    }
   }
   for (const part of convexParts(cells)) {
    const cx = part.reduce((s, c) => s + c[0], 0) / part.length, cz = part.reduce((s, c) => s + c[1], 0) / part.length;
    const reach = Math.max(...part.map((c) => Math.hypot(c[0] - cx, c[1] - cz)));
    // Lo pequeño y redondo es un círculo; lo demás, su envoltura.
    if (reach < 0.5 || part.length < 4) list.push({ x: r2(cx), z: r2(cz), r: r2(reach + 0.12) });
    else list.push({ poly: simplify(hull(part)).map(([x, z]) => [r2(x), r2(z)]), r: 0.1 });
   }
  }
 }
 return list;
}
const text = (list) => `// Obstáculos fijos de The Living World, horneados de la escena real por\n// \`node tests/e2e/collisions.mjs hornear\` (no editar a mano): la huella de todo\n// lo sólido a la altura del cuerpo. Círculos { x, z, r } y polígonos convexos\n// { poly, r }; ver src/worlds/collision.js.\nexport const SOLIDS = [\n${list.map((s) => ` ${JSON.stringify(s)},`).join("\n")}\n];\n`;

const rows = await footprint();
const fresh = text(shapes(rows));
if (mode === "hornear") {
 fs.writeFileSync(FILE, fresh);
 console.log(`escrito solids.js: ${fresh.split("\n").length - 7} obstáculos (${(fresh.length / 1024).toFixed(1)} kB) de ${baked.length} mallas sólidas`);
 await t.browser.close();
 process.exit(0);
}
{
 // Se compara forma a forma con holgura: algunas piezas se mueven (la antena gira).
 const { SOLIDS } = await import(FILE.href);
 const now = shapes(rows);
 const centre = (s) => (s.poly ? [s.poly.reduce((a, p) => a + p[0], 0) / s.poly.length, s.poly.reduce((a, p) => a + p[1], 0) / s.poly.length] : [s.x, s.z]);
 const size = (s, c = centre(s)) => (s.poly ? Math.max(...s.poly.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1]))) : s.r);
 const lost = (from, to) => from.filter((a) => !to.some((b) => Math.hypot(centre(a)[0] - centre(b)[0], centre(a)[1] - centre(b)[1]) < 0.3 && Math.abs(size(a) - size(b)) < 0.3));
 const missing = lost(now, SOLIDS), extra = lost(SOLIDS, now);
 const where = (list) => list.slice(0, 6).map((s) => `(${centre(s).map((v) => v.toFixed(1)).join(", ")})`).join(" ");
 check(missing.length === 0 && extra.length === 0, `los obstáculos horneados (solids.js) coinciden con la escena de ahora: ${SOLIDS.length} obstáculos de ${baked.length} mallas sólidas${missing.length ? ` — sin hornear: ${where(missing)}` : ""}${extra.length ? ` — sobran: ${where(extra)}` : ""}`);
}

// ── Recorrido del mapa ──────────────────────────────────────────────────────
for (const [who, agent, radius] of [["el astronauta", undefined, 0.42], ["Woody", { dog: true }, 0.36]]) {
 const { cells, hits } = await t.evaluate((ids, agent, radius, low, high) => window.__world.probe.sweep({ ids, start: [0, 7.5], agent, radius, low, high }), solid.map((m) => m.id), agent, radius, LOW + 0.05, HIGH);
 const groups = new Map();
 for (const hit of hits) {
  const key = `${hit.label}#${hit.id}#${hit.instance}`;
  const g = groups.get(key) ?? { label: hit.label, n: 0, x: 0, z: 0 };
  g.n += 1; g.x += hit.x; g.z += hit.z;
  groups.set(key, g);
 }
 const byLabel = new Map();
 for (const g of groups.values()) byLabel.set(g.label, [...(byLabel.get(g.label) ?? []), g]);
 check(hits.length === 0, `${who} no atraviesa nada: ${cells} puntos alcanzables del mapa (rejilla de 0,3 m, cinco rayos por punto), ${hits.length} dentro de algo sólido (${groups.size} objetos)`);
 if (mode === "lista" || hits.length) for (const [name, list] of byLabel) console.log(`     ${name}: ${list.length} objeto(s), ${list.reduce((s, g) => s + g.n, 0)} celdas · ${list.slice(0, 8).map((g) => `(${(g.x / g.n).toFixed(1)}, ${(g.z / g.n).toFixed(1)})×${g.n}`).join(" ")}`);
}
await t.done();
