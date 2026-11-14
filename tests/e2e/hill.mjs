// Cuestas: subir y bajar la rampa de la meseta, las colinas y el puente,
// andando y corriendo, grabando cada fotograma del juego. Comprueba que los
// pies van pegados al suelo, que no hay tirones ni atascos y saca la secuencia.
//   node tests/e2e/hill.mjs            comprueba
//   node tests/e2e/hill.mjs capturas   además guarda los fotogramas de la rampa
import { open, check, wait, out } from "./common.mjs";

const shots = process.argv.includes("capturas");
const t = await open();
const { page } = t;
await t.enter();

// Graba cada fotograma: posición, suelo bajo los pies, si pisa y velocidad.
const record = () => t.evaluate(() => {
 const w = window.__world;
 w.tape = [];
 const tick = () => {
  if (!w.tape) return;
  const p = w.player.position, v = w.player.velocity;
  w.tape.push({ t: performance.now(), x: p.x, y: p.y, z: p.z, ground: w.world().height(p.x, p.z), grounded: w.player.grounded, speed: Math.hypot(v.x, v.z), feet: w.astroFeet?.() ?? null, wy: w.woody.position.y, wx: w.woody.position.x, wz: w.woody.position.z });
  requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
});
const stop = () => t.evaluate(() => { const tape = window.__world.tape; window.__world.tape = null; return tape; });

async function walk(name, from, keys, ms, { run = false, frames = 0 } = {}) {
 await t.put(from[0], from[1], { settle: 700 });
 await record();
 if (run) await page.keyboard.down("ShiftLeft");
 for (const key of keys) await page.keyboard.down(key);
 const started = Date.now();
 for (let i = 0; i < frames; i++) {
  await wait(Math.max(0, started + ((i + 0.5) * ms) / frames - Date.now()));
  await page.screenshot({ path: `${out}${name}-${String(i + 1).padStart(2, "0")}.jpg`, type: "jpeg", quality: 80 });
 }
 await wait(Math.max(0, started + ms - Date.now()));
 for (const key of keys) await page.keyboard.up(key);
 if (run) await page.keyboard.up("ShiftLeft");
 await wait(500);
 const tape = await stop();
 // Solo el tramo en que se mueve.
 const moving = tape.filter((f) => f.speed > 0.5);
 const gap = Math.max(...moving.map((f) => Math.abs(f.y - f.ground)));
 const air = moving.filter((f) => !f.grounded).length;
 const wanted = run ? 6.2 : 3.6;
 // Atasco: fotogramas, pasado el arranque, en que va a menos de la mitad de su velocidad.
 const t0 = tape[0].t;
 const cruising = tape.filter((f) => f.t > t0 + 600 && f.t < t0 + ms - 80);
 const slow = cruising.filter((f) => f.speed < wanted * 0.5).length;
 // Tirón: cambio brusco de la velocidad vertical entre fotogramas seguidos (m/s por fotograma).
 // La velocidad vertical se saca de la pendiente del tramo recorrido por la
 // velocidad del jugador, no de la hora del fotograma: el reloj de esta
 // grabación no es el del juego y, si un fotograma llega tarde, lo andado y el
 // tiempo no casan (daba tirones de 3 a 5 m/s bajando una pendiente constante).
 const rise = (from, to) => { const run = Math.hypot(to.x - from.x, to.z - from.z); return run > 1e-4 ? ((to.y - from.y) / run) * to.speed : 0; };
 let jerk = 0, at = null;
 for (let i = 2; i < cruising.length; i++) {
  const a = cruising[i - 2], b = cruising[i - 1], c = cruising[i];
  const v1 = rise(a, b), v2 = rise(b, c);
  if (Math.abs(v2 - v1) > jerk) (jerk = Math.abs(v2 - v1), at = b);
 }
 const climb = tape[tape.length - 1].y - tape[0].y;
 return { name, gap, air, slow, jerk, at, climb, frames: moving.length, tape };
}

const routes = [
 ["rampa-subir", [-14.9, -13.5], ["KeyW", "KeyD"], 4600, { frames: shots ? 12 : 0 }, 3.5],
 ["rampa-bajar", [-7.4, -22.8], ["KeyS", "KeyA"], 4600, { frames: shots ? 12 : 0 }, -3.5],
 ["rampa-subir-corriendo", [-14.9, -13.5], ["KeyW", "KeyD"], 2700, { run: true }, 3.5],
 ["rampa-bajar-corriendo", [-7.4, -22.8], ["KeyS", "KeyA"], 2700, { run: true }, -3.5],
 ["colina-oeste", [-38, -19], ["KeyD"], 4200, {}, null],
 ["colina-oeste-corriendo", [-24, -19], ["KeyA"], 2400, { run: true }, null],
 ["colina-sur", [-3.5, 40.5], ["KeyW"], 3000, {}, null],
 ["puente", [18.2, -0.6], ["KeyD"], 3000, {}, null],
];
for (const [name, from, keys, ms, options, climb] of routes) {
 const r = await walk(name, from, keys, ms, options);
 check(r.gap < 0.02, `${name}: pies pegados al suelo (separación máxima ${(r.gap * 100).toFixed(1)} cm en ${r.frames} fotogramas; ${r.air} en el aire)`);
 check(r.slow === 0, `${name}: sin atascos (${r.slow} fotogramas a menos de media velocidad)`);
 check(r.jerk < 2, `${name}: sin tirones (mayor cambio de velocidad vertical entre fotogramas: ${r.jerk.toFixed(2)} m/s${r.at ? `, en (${r.at.x.toFixed(1)}, ${r.at.z.toFixed(1)})` : ""})`);
 if (climb) check(Math.sign(r.climb) === Math.sign(climb) && Math.abs(r.climb) > Math.abs(climb), `${name}: ${climb > 0 ? "sube" : "baja"} ${Math.abs(r.climb).toFixed(1)} m`);
}
await t.done();
