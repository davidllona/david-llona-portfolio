// Woody, tres minutos de recorrido por todas las zonas. El astronauta va con
// piloto automático (teclas de verdad) por caminos, cuestas, puente, pistas,
// entre casas, vadeando el río y saltando un cortado. Se graba a Woody 20
// veces por segundo y se cuenta cada fallo visto:
//   flota o se hunde · dentro de un obstáculo · salta de sitio a la vista ·
//   corre en el sitio · atascado · perdido · patina.
//   node tests/e2e/woody-tour.mjs [segundos]     (por defecto 180)
import { open, check, wait, out } from "./common.mjs";
import { living } from "../../src/worlds/living/layout.js";
import { distanceTo } from "../../src/worlds/collision.js";

const SECONDS = Number(process.argv[2] ?? 180);
// [x, z, correr, nota]
const TOUR = [
 [-5.2, 0.3, 0, "cruce oeste"], [-19, 0.4, 1, "plaza de proyectos"], [-22.3, -4.6, 0, "junto al pozo"], [-26.8, -4.8, 0, "rodeando el pozo"], [-24.5, -6.3, 0, "entre el pozo y el tablón"],
 [-18, -5.5, 0, "entre las casas"], [-17.5, 0.5, 0, "plaza"], [-24.5, 5, 0, "jardín del laboratorio"], [-21.8, 8.6, 0, "entre los tótems"], [-12, 2, 1, "hierba"],
 [-10.5, -9.5, 0, "senda norte"], [-14.5, -14, 0, "pie de la rampa"], [-7.6, -22.5, 0, "rampa arriba"], [-3, -25, 0, "meseta"], [1.5, -24.2, 0, "Sobre mí"], [4.6, -23.6, 0, "junto a la casa del árbol"],
 [10, -23.2, 1, "senda de la meseta"], [18.5, -21.6, 0, "observatorio"], [22.6, -22.6, 0, "rodeando el observatorio"], [12.5, -22.2, 1, "vuelta"], [3, -20.2, 0, "borde de la meseta (no se salta)"],
 [-3, -25, 0, "vuelta a la rampa"], [-7.6, -22.5, 0, "rampa, arriba"], [-14.5, -14, 0, "rampa abajo"], [-6, -9.5, 1, "hacia el estanque"], [4.5, -7.6, 0, "orilla del estanque"], [13.2, -7.4, 0, "rodeando el estanque"], [13.4, -13.4, 0, "orilla este"], [10.2, -14.3, 0, "contra la cascada, por el agua"], [13.6, -13.2, 0, "vuelta a la orilla"], [15.2, -11.2, 0, "rodeando"], [13.2, -7.4, 0, "vuelta"], [6, -6.2, 0, "orilla sur del estanque"],
 [5.4, 1, 0, "cruce este"], [17.5, 2.2, 1, "hacia el río"], [21.6, 4.6, 0, "orilla del río"], [27.6, 4.2, 0, "vadeando el río"], [33.5, 1.8, 0, "Contacto"], [36.2, 1.2, 0, "junto a los aparatos"],
 [27.6, 1.0, 0, "puente, lado este"], [18.6, -0.5, 0, "cruzando el puente"], [5, 8.6, 1, "CV"], [0, 18.3, 0, "pistas"], [3, 25, 1, "pista de baloncesto"], [-8, 24, 0, "entre las pistas"],
 [-17, 16.5, 0, "fútbol"], [-23, 23, 1, "campo de fútbol"], [-12, 12, 0, "senda sur"], [-9, 33, 1, "colina sur"], [-4, 40.2, 0, "playa"], [0, 19, 1, "vuelta"], [0, 7.5, 0, "cohete"],
];

// Aviso si algún tramo del recorrido cruza terreno vedado u obstáculos en línea recta
// (el piloto resbala por los obstáculos, pero no rodea paredes).
if (process.argv.includes("tramos")) {
 let from = [0, 7.5];
 for (const [x, z, , note] of TOUR) {
  const n = Math.ceil(Math.hypot(x - from[0], z - from[1]) / 0.3);
  let bad = null;
  for (let i = 1; i <= n && !bad; i++) {
   const px = from[0] + ((x - from[0]) * i) / n, pz = from[1] + ((z - from[1]) * i) / n;
   if (living.blocked(px, pz, 0)) bad = `terreno vedado en (${px.toFixed(1)}, ${pz.toFixed(1)}), altura ${living.height(px, pz).toFixed(2)}`;
   else if (living.colliders.some((c) => distanceTo(c, px, pz) < c.r + 0.2)) bad = `obstáculo en (${px.toFixed(1)}, ${pz.toFixed(1)})`;
  }
  if (bad) console.log(`tramo «${note}»: ${bad}`);
  from = [x, z];
 }
 process.exit(0);
}

const t = await open();
const { page } = t;
await t.enter();

// Grabadora dentro de la página.
await t.evaluate(() => {
 const w = window.__world;
 w.tape = [];
 let n = 0;
 const mul = (m, v) => [0, 1, 2, 3].map((r) => m[r] * v[0] + m[r + 4] * v[1] + m[r + 8] * v[2] + m[r + 12] * v[3]);
 const tick = () => {
  if (!w.tape) return;
  if (n++ % 3 === 0) {
   const p = w.woody.position, f = w.player.position, b = w.woodyBrain, height = w.world().height;
   const ax = -Math.sin(w.woody.facing) * 0.42, az = -Math.cos(w.woody.facing) * 0.42;
   const ground = Math.max((height(p.x + ax, p.z + az) + height(p.x - ax, p.z - az)) / 2, height(p.x, p.z));
   const c = w.camera;
   const v = mul(c.projectionMatrix.elements, mul(c.matrixWorldInverse.elements, [p.x, p.y + 0.5, p.z, 1]));
   const seen = v[3] > 0 && Math.abs(v[0] / v[3]) < 1 && Math.abs(v[1] / v[3]) < 1;
   w.tape.push({ t: performance.now(), x: p.x, y: p.y, z: p.z, ground, px: f.x, py: f.y, pz: f.z, clip: w.woodyClip(), rate: w.woodyRate(), speed: b.speed, moving: b.moving, mode: b.mode, posture: b.posture, jumps: b.jumps, seen, hidden: w.player.hidden, trail: b.trail.length, detour: !!b.detour });
  }
  requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
});

// Piloto automático: pulsa hacia el punto, en ocho direcciones.
const held = new Set();
const press = async (want) => {
 for (const key of [...held]) if (!want.has(key)) (await page.keyboard.up(key), held.delete(key));
 for (const key of want) if (!held.has(key)) (await page.keyboard.down(key), held.add(key));
};
const started = Date.now();
const elapsed = () => (Date.now() - started) / 1000;
const legs = [];
let shot = 0;
const snap = async (label) => {
 const name = `woody-tour-${String(++shot).padStart(2, "0")}`;
 await page.screenshot({ path: `${out}${name}.jpg`, type: "jpeg", quality: 72 });
 return `${name} (${elapsed().toFixed(0)} s, ${label})`;
};
const frames = [];
let nextShot = 3;
tour: for (let lap = 0; ; lap++) {
 for (const [x, z, run, note] of TOUR) {
  const from = elapsed();
  let arrived = false;
  while (elapsed() - from < 16) {
   if (elapsed() > SECONDS) break tour;
   const p = await t.evaluate(() => [window.__world.player.position.x, window.__world.player.position.z]);
   const dx = x - p[0], dz = z - p[1], d = Math.hypot(dx, dz);
   if (d < 0.9) { arrived = true; break; }
   const want = new Set();
   if (dz < -d * 0.38) want.add("KeyW"); else if (dz > d * 0.38) want.add("KeyS");
   if (dx < -d * 0.38) want.add("KeyA"); else if (dx > d * 0.38) want.add("KeyD");
   if (run) want.add("ShiftLeft");
   await press(want);
   if (elapsed() > nextShot) { frames.push(await snap(note)); nextShot += 6; }
   await wait(70);
  }
  legs.push({ note, arrived, seconds: elapsed() - from, at: arrived ? null : (await t.evaluate(() => [window.__world.player.position.x, window.__world.player.position.z])).map((v) => v.toFixed(1)).join(", ") });
  if (!arrived) {
   // El astronauta no llegó: se anota y se le coloca allí (Woody tendrá que buscarlo).
   await press(new Set());
   await t.put(x, z, { withWoody: false, settle: 300 });
  }
 }
}
await press(new Set());
const tape = await t.evaluate(() => { const tape = window.__world.tape; window.__world.tape = null; return tape; });

// ── Fallos ───────────────────────────────────────────────────────────────────
const t0 = tape[0].t;
const at = (f) => `${((f.t - t0) / 1000).toFixed(1)} s en (${f.x.toFixed(1)}, ${f.z.toFixed(1)})`;
const NATURAL = { Woody_Walk: 0.7, Woody_Trot: 1.775, Woody_Run: 4.375 };
const faults = { "flota o se hunde": [], "dentro de un obstáculo": [], "salta de sitio a la vista": [], "corre en el sitio": [], atascado: [], perdido: [], patina: [] };
// Agrupa fotogramas seguidos que cumplen `bad` en episodios de al menos `min` s.
const episodes = (bad, min, describe) => {
 const list = [];
 let from = null;
 for (let i = 0; i <= tape.length; i++) {
  const now = i < tape.length && bad(tape[i], i);
  if (now && from === null) from = i;
  if (!now && from !== null) {
   if ((tape[i - 1].t - tape[from].t) / 1000 >= min) list.push(describe(tape.slice(from, i)));
   from = null;
  }
 }
 return list;
};
const seconds = (part) => ((part[part.length - 1].t - part[0].t) / 1000).toFixed(1);
// (En el agua nada: va a flote, 45 cm bajo la superficie como mucho.)
const floor = (f) => Math.max(f.ground, living.waterLevel - 0.45);
faults["flota o se hunde"] = episodes((f) => !f.hidden && Math.abs(f.y - floor(f)) > 0.1, 0.1, (part) => `${at(part[0])}: ${(Math.max(...part.map((f) => Math.abs(f.y - floor(f)))) * 100).toFixed(0)} cm durante ${seconds(part)} s`);
faults["dentro de un obstáculo"] = episodes((f) => !f.hidden && living.colliders.some((c) => c !== living.shipCollider && distanceTo(c, f.x, f.z) < c.r + 0.36 - 0.15), 0.1, (part) => `${at(part[0])} durante ${seconds(part)} s`);
let relocations = 0;
const moves = [];
for (let i = 1; i < tape.length; i++) {
 const a = tape[i - 1], b = tape[i];
 if (a.hidden || b.hidden) continue;
 const jump = Math.hypot(b.x - a.x, b.z - a.z);
 if (jump > 2.5) {
  // (Un salto que lo causa la propia prueba al colocar al astronauta no cuenta: Woody no se mueve con él.)
  relocations += 1;
  moves.push(`${at(a)} → (${b.x.toFixed(1)}, ${b.z.toFixed(1)}), astronauta en (${b.px.toFixed(1)}, ${b.pz.toFixed(1)}) a ${Math.hypot(a.x - a.px, a.z - a.pz).toFixed(1)} m`);
  if (a.seen || b.seen) faults["salta de sitio a la vista"].push(`${at(b)}: ${jump.toFixed(1)} m, ${a.seen ? "estaba" : "no estaba"} en pantalla y ${b.seen ? "aparece" : "no aparece"} en ella`);
 }
}
// Corre en el sitio: clip de andar, trotar o correr sin avanzar.
for (let i = 0; i + 12 < tape.length; i++) {
 const part = tape.slice(i, i + 12); // 0,6 s
 if (!part.every((f) => NATURAL[f.clip] && !f.hidden)) continue;
 const moved = Math.hypot(part[11].x - part[0].x, part[11].z - part[0].z);
 const meant = part.reduce((s, f) => s + NATURAL[f.clip] * f.rate, 0) / 12 * ((part[11].t - part[0].t) / 1000);
 if (moved < meant * 0.3 && meant > 0.3) { faults["corre en el sitio"].push(`${at(part[0])}: ${part[0].clip} durante 0,6 s avanzando ${moved.toFixed(2)} m (el clip pide ${meant.toFixed(2)} m)`); i += 12; }
}
faults.atascado = episodes((f, i) => !f.hidden && f.moving && i > 20 && Math.hypot(f.x - tape[i - 20].x, f.z - tape[i - 20].z) < 0.25, 1, (part) => `${at(part[0])} durante ${seconds(part)} s (modo ${part[0].mode}${part[0].detour ? ", en rodeo" : ""})`);
faults.perdido = episodes((f) => !f.hidden && Math.hypot(f.x - f.px, f.z - f.pz) > 16, 4, (part) => `${at(part[0])} durante ${seconds(part)} s, hasta a ${Math.max(...part.map((f) => Math.hypot(f.x - f.px, f.z - f.pz))).toFixed(0)} m`);
faults.patina = episodes((f) => !f.hidden && NATURAL[f.clip] && f.speed > 0.6 && Math.abs(f.speed - NATURAL[f.clip] * f.rate) / f.speed > 0.35, 1, (part) => `${at(part[0])} durante ${seconds(part)} s (${part[0].clip})`);

const total = (tape[tape.length - 1].t - t0) / 1000;
const far = Math.max(...tape.map((f) => Math.hypot(f.x - f.px, f.z - f.pz)));
console.log(`     recorrido: ${total.toFixed(0)} s, ${legs.length} tramos, ${tape.length} muestras de Woody; distancia máxima al astronauta ${far.toFixed(1)} m; recolocaciones fuera de cámara: ${relocations}`);
for (const one of moves) console.log(`       · recolocación: ${one}`);
const missed = legs.filter((leg) => !leg.arrived);
check(missed.length === 0, `el astronauta llega a los ${legs.length} puntos del recorrido${missed.length ? ` — no llegó a: ${missed.map((leg) => `${leg.note} (parado en ${leg.at})`).join("; ")}` : ""}`);
for (const [name, list] of Object.entries(faults)) {
 check(list.length === 0, `Woody, «${name}»: ${list.length} ${list.length === 1 ? "vez" : "veces"}`);
 for (const one of list.slice(0, 12)) console.log(`       · ${one}`);
}
console.log(`     capturas: ${frames.length} (una cada 6 s) en ${out}woody-tour-NN.jpg`);
await t.done();
