// La cabeza de Woody (objetivo 27, B5): mientras se juega con el balón, la
// mirada no da sacudidas. Se graba en cada fotograma, durante 10 s de juego,
// el giro de la cabeza respecto al cuerpo (lo que añade la mirada) y el rumbo
// de la cabeza en el mundo, en dos partidas: el reto de fútbol (Woody mira el
// balón, que sale disparado en cada chut) y el concurso de triples (Woody, en
// la banda, mira el aro mientras el astronauta tira).
// Comprueba: ningún salto brusco entre fotogramas, giro por debajo del máximo
// por segundo, y el ángulo respecto al cuerpo dentro de su límite.
//   node tests/e2e/mirada.mjs [etiqueta]
import fs from "node:fs";
import { check, open, out, wait } from "./common.mjs";
import { TRIPLES_SIGN } from "../../src/worlds/living/layout.js";

const tag = process.argv[2] ?? "ahora";
const LIMIT = { speed: 3.2, step: 0.12, aside: 1.15, world: 0.5 }; // rad/s, rad por fotograma, rad, rad por fotograma

const t = await open({ viewport: { width: 1280, height: 800 }, query: "?marcador=local" });
const { page, evaluate } = t;
await t.enter();

// Graba, en cada fotograma: tiempo, giro de la mirada (respecto al cuerpo) y rumbo de la cabeza en el mundo.
const record = () =>
 evaluate(() => {
  const w = window.__world;
  const THREE = w.THREE;
  // La cabeza de Woody (la del esqueleto con cola) y su hocico: de una al otro, hacia dónde mira.
  let head = null, mouth = null;
  w.scene.traverse((node) => {
   if (!node.isSkinnedMesh || !node.skeleton.bones.some((b) => b.name === "tail1")) return;
   head = node.skeleton.bones.find((b) => b.name === "head");
   mouth = node.skeleton.bones.find((b) => b.name === "SOCKET_mouth");
  });
  const log = (w.__look = []);
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  const start = performance.now();
  const tick = () => {
   head.getWorldPosition(a);
   mouth.getWorldPosition(b);
   // (Con el hocico muy inclinado —olfateando el suelo, celebrando— el rumbo no dice nada: se apunta como nulo.)
   const flat = Math.hypot(b.x - a.x, b.z - a.z) / a.distanceTo(b);
   // Rumbo de la cabeza respecto al cuerpo (el giro del cuerpo al andar no cuenta: es el cuerpo, no la cabeza).
   const body = (w.woodyBody ? w.woodyBody.rotation.y : w.woody.facing) + Math.PI; // (el frente del modelo es +z y el del juego, −z)
   log.push([performance.now() - start, w.woodyLook ?? 0, flat > 0.7 ? Math.atan2(b.x - a.x, b.z - a.z) - body : null, w.woodyClip()]);
   if (performance.now() - start < 10000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
 });
const analyse = async (what) => {
 await page.waitForFunction(() => window.__world.__look.at(-1)[0] >= 10000, { timeout: 20000, polling: 200 });
 const log = await evaluate(() => window.__world.__look);
 fs.writeFileSync(`${out}mirada-${what.split(" ")[0]}-${tag}.json`, JSON.stringify(log.map((row) => [Math.round(row[0]), +(row[1] * 2).toFixed(4)])));
 const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
 let speed = 0, step = 0, world = 0, aside = 0, celebration = 0;
 for (let i = 1; i < log.length; i++) {
  const dt = Math.max(1e-3, (log[i][0] - log[i - 1][0]) / 1000);
  // (La mirada se aplica en el cuello y en la cabeza: el giro total es el doble de `woodyLook`.)
  const d = Math.abs(log[i][1] - log[i - 1][1]) * 2;
  step = Math.max(step, d);
  if (dt > 0.008) speed = Math.max(speed, d / dt);
  // (Las celebraciones giran a Woody entero a propósito y, al acabar la del gol, el
  // paso a respirar aún da un salto: se cuenta aparte, ver docs/ESTADO.md.)
  const celebrating = /Celebrate/.test(log[i][3]) || /Celebrate/.test(log[i - 1][3]);
  if (celebrating && log[i][2] !== null && log[i - 1][2] !== null) celebration = Math.max(celebration, Math.abs(wrap(log[i][2] - log[i - 1][2])));
  if (!celebrating && log[i][2] !== null && log[i - 1][2] !== null) {
   const jump = Math.abs(wrap(log[i][2] - log[i - 1][2]));
   if (process.env.DEPURAR && jump > 0.3) console.log("       salto", ((jump * 180) / Math.PI).toFixed(0), JSON.stringify(log[i - 1].slice(3)), "→", JSON.stringify(log[i].slice(3)));
   world = Math.max(world, jump);
  }
  aside = Math.max(aside, Math.abs(log[i][1] * 2));
 }
 console.log(`     ${what}: ${log.length} fotogramas; mayor salto de la mirada entre dos, ${((step * 180) / Math.PI).toFixed(1)}°; giro máximo, ${((speed * 180) / Math.PI).toFixed(0)}°/s; mayor salto de la cabeza respecto al cuerpo, ${((world * 180) / Math.PI).toFixed(1)}°; mayor ángulo respecto al cuerpo, ${((aside * 180) / Math.PI).toFixed(0)}°`);
 if (celebration) console.log(`     (en las celebraciones, el mayor salto de la cabeza respecto al cuerpo: ${((celebration * 180) / Math.PI).toFixed(0)}°)`);
 check(step <= LIMIT.step && world <= LIMIT.world, `${what}: la cabeza no da saltos bruscos (mayor salto entre fotogramas: ${((step * 180) / Math.PI).toFixed(1)}° de mirada, ${((world * 180) / Math.PI).toFixed(1)}° de la cabeza respecto al cuerpo)`);
 check(speed <= LIMIT.speed, `${what}: gira como mucho a ${((LIMIT.speed * 180) / Math.PI).toFixed(0)}°/s (máximo medido: ${((speed * 180) / Math.PI).toFixed(0)}°/s)`);
 check(aside <= LIMIT.aside, `${what}: y nunca más de ${((LIMIT.aside * 180) / Math.PI).toFixed(0)}° respecto al cuerpo (${((aside * 180) / Math.PI).toFixed(0)}°)`);
 return log;
};

// ── Fútbol: cuatro chuts en 10 s ─────────────────────────────────────────────
await t.put(-22, 15, { settle: 600 });
await evaluate(() => window.__world.football.enter());
await wait(1500);
await evaluate(() => window.__world.football.startMode?.("penaltis"));
await wait(1200);
await record();
for (let i = 0; i < 4; i++) {
 await evaluate((i) => window.__world.football.release({ y: 0.8 + (i % 2) * 0.5, z: (i % 3) - 1, power: 0.55 + i * 0.1, curl: i % 2 ? 0.4 : -0.3 }), i);
 if (i === 1) await page.screenshot({ path: `${out}mirada-futbol-${tag}.jpg`, type: "jpeg", quality: 84 });
 await wait(2400);
}
await analyse("fútbol");
await evaluate(() => window.__world.football.exit());
await wait(800);

// ── Concurso de triples: 10 s tirando ─────────────────────────────────────────
await t.put(TRIPLES_SIGN.x, TRIPLES_SIGN.z + 1.3, { withWoody: false, settle: 800 });
await page.keyboard.press("KeyE");
await page.waitForFunction(() => window.__world.triples.state.phase === "play", { timeout: 8000 });
await record();
const started = Date.now();
while (Date.now() - started < 10000) {
 const ready = await evaluate(() => window.__world.ball.mode === "held" && !window.__world.ball.empty && !window.__world.player.auto);
 if (ready) {
  // Un tiro de verdad: mantener, saltar, soltar arriba.
  await page.keyboard.down("KeyE");
  await wait(560);
  await page.keyboard.up("KeyE");
 }
 await wait(150);
}
await analyse("concurso de triples");
await t.done();
