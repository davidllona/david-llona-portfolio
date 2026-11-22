// Concurso de triples sin barra y más difícil (objetivo 27, B2).
//  · Durante el concurso no sale la barra del tiro (fuera de él, sí: basket.mjs).
//  · La ventana del tiro bueno es más estrecha que la de siempre, y más en las
//    esquinas; aun soltando bien, a veces se sale; cuanto peor, más se falla.
//  · Lo que se decide al soltar es lo que pasa: cada balón «que entra» entra
//    por el aro y cada fallo se queda fuera (física de siempre), y los puntos
//    del marcador son los de esas canastas.
//  · Los números de la dificultad, simulados con la misma función del juego.
//  · Las reglas de Firestore aceptan la puntuación máxima del concurso.
//   node tests/e2e/concurso.mjs [etiqueta] [solo-captura]
import fs from "node:fs";
import { check, open, out, wait } from "./common.mjs";
import { TRIPLES_SIGN } from "../../src/worlds/living/layout.js";
// (Importado así: la captura del «antes» corre con el código anterior, que no tenía estas funciones.)
const { CONTEST_SHOT, TRIPLES, shotChance, shotWindow } = await import("../../src/game/triples.js");

const tag = process.argv[2] ?? "ahora";
const onlyShot = process.argv.includes("solo-captura");

if (!onlyShot) {
 // ── Los números (sin navegador) ────────────────────────────────────────────
 check(shotWindow(0) < shotWindow(2) && shotWindow(4) < shotWindow(2) && shotWindow(2) < 0.2, `ventana del tiro bueno: ±${shotWindow(2) * 400} ms en las alas y el centro, ±${shotWindow(0) * 400} ms en las esquinas (fuera del concurso, ±80)`);
 check(shotChance(0, 2) < 1 && shotChance(0, 2) > 0.7, `aun soltando en lo más alto, entra el ${(shotChance(0, 2) * 100).toFixed(0)} %`);
 const curve = [0, 0.15, 0.2, 0.3, 0.45, 0.6].map((t) => shotChance(t, 2));
 check(curve.every((p, i) => i === 0 || p <= curve[i - 1]) && curve.at(-1) === 0, `y cuanto peor se suelta, menos: ${[0, 60, 80, 120, 180, 240].map((ms, i) => `${ms} ms → ${(curve[i] * 100).toFixed(0)} %`).join(", ")}`);
 // Partidas simuladas: error típico al soltar (ms) → puntos.
 let seed = 7;
 const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
 const gauss = () => Math.sqrt(-2 * Math.log(random() || 1e-9)) * Math.cos(2 * Math.PI * random());
 const play = (sigma) => {
  let score = 0;
  for (let rack = 0; rack < TRIPLES.racks; rack++)
   for (let ball = 0; ball < TRIPLES.balls; ball++) if (random() < shotChance((gauss() * sigma) / 400, rack)) score += ball === TRIPLES.balls - 1 ? TRIPLES.money : 1;
  return score;
 };
 const table = [30, 45, 60, 80, 110].map((sigma) => {
  const games = Array.from({ length: 20000 }, () => play(sigma));
  return { sigma, mean: games.reduce((a, b) => a + b, 0) / games.length, full: games.filter((s) => s === TRIPLES.max).length / games.length, sniper: games.filter((s) => s >= TRIPLES.goal).length / games.length };
 });
 for (const row of table) console.log(`     error típico ${row.sigma} ms: ${row.mean.toFixed(1)} puntos de media; ≥ ${TRIPLES.goal}: ${(row.sniper * 100).toFixed(1)} %; ${TRIPLES.max}: ${(row.full * 100).toFixed(3)} %`);
 const good = table.filter((row) => row.sigma === 60 || row.sigma === 80);
 check(good.every((row) => row.mean >= TRIPLES.max * 0.5 && row.mean <= TRIPLES.max * 0.67), `una buena partida (60–80 ms de error) ronda la mitad o dos tercios del máximo: ${good.map((row) => row.mean.toFixed(1)).join(" y ")} de ${TRIPLES.max}`);
 check(table.every((row) => row.full < 0.005) && CONTEST_SHOT.inside ** 25 < 0.005, `el máximo es rarísimo: ${(CONTEST_SHOT.inside ** 25 * 100).toFixed(2)} % aun soltando siempre perfecto`);
 // Las reglas de Firestore (copia de las publicadas) aceptan el máximo del concurso.
 const rules = fs.readFileSync("firestore.rules", "utf8");
 const cap = Number(rules.match(/score\s*<=\s*(\d+)/)?.[1]);
 check(cap === TRIPLES.max, `el máximo real del concurso es ${TRIPLES.max} (5 carros × (4 + 2)) y las reglas de Firestore aceptan hasta ${cap}: no hay que tocarlas`);
}

// ── En el juego ────────────────────────────────────────────────────────────
const t = await open({ viewport: { width: 1440, height: 900 }, query: "?marcador=local" });
const { page } = t;
await t.enter();
const until = (test, ms = 8000) =>
 t.evaluate(
  (test, ms) =>
   new Promise((resolve) => {
    const fn = new Function("w", `return ${test}`);
    const started = performance.now();
    const look = () => (fn(window.__world) ? resolve(true) : performance.now() - started > ms ? resolve(false) : requestAnimationFrame(look));
    look();
   }),
  test,
  ms,
 );
await t.put(TRIPLES_SIGN.x, TRIPLES_SIGN.z + 1.3, { withWoody: false, settle: 5200 });
await page.keyboard.press("KeyE");
await until("w.triples.state.phase === 'play'", 6000);
await until("w.ball.mode === 'held' && !w.ball.empty && !w.player.auto", 6000);
await wait(300);
// Un tiro de verdad, con la tecla: se mantiene, salta, y en lo más alto se fotografía.
await page.keyboard.down("KeyE");
await until("w.ball.shot && w.ball.shot.stage === 'air' && w.ball.timing > -0.08", 3000);
const meter = await t.evaluate(() => {
 let seen = false;
 window.__world.scene.traverse((o) => o.name === "medidor de tiro" && (seen = o.visible));
 return seen;
});
await page.screenshot({ path: `${out}concurso-salto-${tag}.jpg`, type: "jpeg", quality: 88 });
await page.keyboard.up("KeyE");
if (!onlyShot) check(!meter, "en el concurso no sale la barra del tiro: se suelta mirando el salto");
await wait(400);

if (!onlyShot) {
 // El resto de la partida, soltando siempre en lo más alto pero con la suerte de verdad.
 for (let i = 0; i < 30; i++) {
  if (!(await until("(w.ball.mode === 'held' && !w.ball.empty && !w.player.auto && w.triples.state.phase === 'play') || w.triples.state.phase !== 'play'", 8000))) break;
  if ((await t.evaluate(() => window.__world.triples.state.phase)) !== "play") break;
  await t.evaluate(() => window.__world.court.shootLive(0));
  await wait(350);
 }
 await until("w.triples.state.phase === 'idle'", 12000);
 const result = await t.evaluate(() => ({ shots: window.__world.contestShots ?? [], score: window.__world.triples.state.score }));
 const decided = result.shots.reduce((sum, shot) => sum + (shot.makes ? (shot.money ? TRIPLES.money : 1) : 0), 0);
 const made = result.shots.filter((shot) => shot.makes).length;
 check(result.shots.length >= 20, `se han tirado ${result.shots.length} balones con la suerte del concurso (el primero, con la tecla)`);
 check(result.score === decided, `lo decidido al soltar es lo que pasa: ${made} de ${result.shots.length} entran y el marcador da ${result.score} puntos (decididos: ${decided})`);
 check(made < result.shots.length, `aun soltando siempre en lo más alto, alguno se sale (${result.shots.length - made})`);
}
await t.done();
