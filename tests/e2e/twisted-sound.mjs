// Sonido de The Twisted Moon: la música (elegible con ?musica=1, 2 o 3) y los
// grillos propios suenan de verdad (se mide la señal), los grillos del primer
// mundo callan, el mar y la cascada llegan según dónde se esté, usar algo da un
// destello, en los puentes suenan los pasos de madera, la torre da campanadas,
// el botón de silencio lo calla todo y, al irse a otro mundo, la música se funde.
// Abre directamente en ese mundo (?world=twisted, solo en desarrollo).
//   node tests/e2e/twisted-sound.mjs
import { open, check, wait } from "./common.mjs";
import { BELL, BRIDGES, STORY_DOOR, WATERFALLS } from "../../src/worlds/twisted/layout.js";

const f = (value) => value.toFixed(4);
// La señal de los bucles varía: se toma la media de un rato.
async function heard(t, seconds = 1.6) {
 const sum = { extra: {}, loops: {} };
 const n = Math.round(seconds / 0.1);
 for (let i = 0; i < n; i++) {
  const now = await t.evaluate(() => ({ extra: window.__world.audio.extraLoops(), loops: window.__world.audio.loops() }));
  for (const kind of ["extra", "loops"]) for (const [name, loop] of Object.entries(now[kind])) sum[kind][name] = (sum[kind][name] ?? 0) + loop.heard / n;
  await wait(100);
 }
 return sum;
}

// ── Por defecto, la pista 1 ─────────────────────────────────────────────────
let t = await open({ query: "?world=twisted" });
const requested = [];
t.page.on("request", (request) => /\/sounds\/twisted\//.test(request.url()) && requested.push(request.url().split("/").pop()));
await t.enter();
await t.page.waitForFunction(() => Object.keys(window.__world.audio.extraLoops?.() ?? {}).length >= 2, { timeout: 30000 }).catch(() => {});
await wait(5000); // (la música entra fundiéndose en 4,5 s)
let now = await heard(t, 2);
const music = Object.keys(now.extra).filter((name) => name.startsWith("musica"));
check(music.join() === "musica-1" && now.extra["musica-1"] > 0.004, `suena la música 1 por defecto, «Mysterious Fairy Tale Waltz» (señal ${f(now.extra["musica-1"] ?? 0)})`);
check(requested.filter((name) => name.startsWith("musica")).join() === "musica-1.mp3", `solo se descarga la pista elegida (${requested.filter((name) => name.startsWith("musica")).join(", ")})`);
check((now.extra["grillos-noche"] ?? 0) > 0.002, `suenan los grillos de este mundo (${f(now.extra["grillos-noche"] ?? 0)})`);
check((now.loops.grillos ?? 0) < 0.0005 && (now.loops.pajaros ?? 0) < 0.0005, `los grillos y pájaros del primer mundo callan (${f(now.loops.grillos ?? 0)}, ${f(now.loops.pajaros ?? 0)})`);

// El mar, en la orilla; la cascada, a su pie. (Son los bucles grabados del primer mundo: se espera a que lleguen.)
await t.page.waitForFunction(() => window.__world.audio.loops().mar && window.__world.audio.loops().cascada, { timeout: 30000 }).catch(() => {});
await t.put(-5, 9.6, { withWoody: false, settle: 1500 });
now = await heard(t, 1.6);
check((now.loops.mar ?? 0) > 0.002, `en la orilla se oye el mar (${f(now.loops.mar ?? 0)})`);
const fall = WATERFALLS[1];
await t.put(fall.x + 1.6, fall.z + 2.6, { withWoody: false, settle: 1500 });
now = await heard(t, 1.6);
check((now.loops.cascada ?? 0) > 0.002, `al pie de una cascada se oye su agua (${f(now.loops.cascada ?? 0)})`);

// Usar algo (E) da un destello.
await t.put(STORY_DOOR.x - 0.2, STORY_DOOR.z + 0.3, { settle: 1200 });
const sparkles = () => t.evaluate(() => Object.entries(window.__world.audio.sampled).filter(([name]) => name.startsWith("destello")).reduce((sum, [, n]) => sum + n, 0));
let before = await sparkles();
await t.page.keyboard.press("KeyE");
await wait(800);
check((await sparkles()) > before, `al usar la puerta con E suena un destello mágico`);
await t.page.keyboard.press("Escape");
await wait(600);

// Pasos de madera en un puente.
const bridge = BRIDGES.find((one) => one.id === "rio");
await t.put(bridge.from[0] - bridge.ux * 0.6, bridge.from[1] - bridge.uz * 0.6, { withWoody: false, settle: 600 });
const wood = () => t.evaluate(() => window.__world.audio.sampled["pasos-madera"] ?? 0);
before = await wood();
await t.hold("KeyW", 1800);
check((await wood()) > before + 1, `cruzando la pasarela suenan los pasos de madera (${(await wood()) - before})`);

// Campanadas: al acercarse a la torre, dos.
const chimes = () => t.evaluate(() => window.__world.audio.sampled.campanada ?? 0);
before = await chimes();
await t.put(BELL.x + 0.4, BELL.z + 3.6, { withWoody: false, settle: 5200 });
check((await chimes()) - before === 2, `al llegar junto a la torre suenan dos campanadas (${(await chimes()) - before})`);
// Y en cada hora en punto, tantas como la hora (se prueba el mismo toque que da el reloj).
before = await chimes();
await t.evaluate(() => window.__world.twistedSounds.strike(3));
await wait(6000);
check((await chimes()) - before === 3, `el toque de las tres da tres campanadas (${(await chimes()) - before})`);

// El botón de silencio lo calla todo.
await t.page.keyboard.press("KeyM");
await wait(900);
const level = await t.evaluate(() => window.__world.audio.master());
before = await sparkles();
await t.evaluate(() => window.__world.twistedSounds.strike(1));
await wait(400);
check(level === 0, `con el botón de silencio la salida queda a cero (${level})`);
await t.page.keyboard.press("KeyM");
await wait(600);

// Al irse a otro mundo, la música se funde.
await t.put(0, 5.6, { withWoody: false, settle: 900 });
await t.page.keyboard.press("KeyE");
await t.page.waitForFunction(() => window.__world.ship.flight.phase === "orbit", { timeout: 20000 });
await wait(600);
await t.page.keyboard.press("KeyV");
await wait(2600);
const left = await t.evaluate(() => Object.keys(window.__world.audio.extraLoops()));
check(left.length === 0, `al salir hacia otro mundo la música y los grillos se funden y se paran (quedan: ${left.join(", ") || "ninguno"})`);
await t.done();

// ── ?musica=2 y ?musica=3 ───────────────────────────────────────────────────
for (const track of [2, 3]) {
 t = await open({ query: `?world=twisted&musica=${track}` });
 await t.enter();
 await t.page.waitForFunction(() => Object.keys(window.__world.audio.extraLoops?.() ?? {}).some((name) => name.startsWith("musica")), { timeout: 30000 }).catch(() => {});
 await wait(5000);
 now = await heard(t, 1.6);
 const playing = Object.keys(now.extra).filter((name) => name.startsWith("musica"));
 check(playing.join() === `musica-${track}` && now.extra[`musica-${track}`] > 0.003, `con ?musica=${track} suena la pista ${track} (señal ${f(now.extra[`musica-${track}`] ?? 0)})`);
 await t.done();
}
