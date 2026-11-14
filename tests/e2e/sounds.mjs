// Sonido, uno por uno: que cada muestra grabada se descarga después de entrar,
// suena cuando y donde debe (se mide la señal real que sale de cada bucle y de
// la salida general, no solo que «se pidió») y que el botón de sonido lo calla
// todo. Graba además el recorrido entero en un archivo para poder escucharlo:
//   node tests/e2e/sounds.mjs        → <capturas>/recorrido-sonido.webm
import fs from "node:fs";
import { open, check, wait, out } from "./common.mjs";
import { PAD, PITCH, POND, STREAM, WATERFALL, shoreRadius } from "../../src/worlds/living/layout.js";

const t = await open();
const { page } = t;

// ── Nada de sonido antes de entrar ───────────────────────────────────────────
const requested = [];
page.on("request", (request) => /\/sounds\//.test(request.url()) && requested.push(request.url().split("/").pop()));
await wait(600);
check(requested.length === 0, `en la bienvenida no se ha pedido ningún archivo de sonido (${requested.length})`);

await t.enter();
const audio = (fn, ...args) => t.evaluate(fn, ...args);
await page.waitForFunction(() => Object.keys(window.__world.audio.loaded?.() ?? {}).length >= 14, { timeout: 30000 }).catch(() => {});
const loaded = await audio(() => window.__world.audio.loaded());
check(Object.keys(loaded).length === 14 && requested.length === 14, `después de entrar llegan las 14 muestras (${Object.keys(loaded).length} decodificadas, ${requested.length} pedidas): ${Object.entries(loaded).map(([name, s]) => `${name} ${s} s`).join(", ")}`);
check((await audio(() => window.__world.audio.state())) === "running", "el contexto de audio está en marcha");

// Graba la salida general mientras dura la prueba.
await audio(() => {
 const w = window.__world;
 w.recorder = new MediaRecorder(w.audio.tap(), { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 96000 });
 w.chunks = [];
 w.recorder.ondataavailable = (event) => w.chunks.push(event.data);
 w.recorder.start(500);
 w.recordedAt = performance.now();
});
const marks = [];
const mark = async (text) => marks.push(`${((await audio(() => performance.now() - window.__world.recordedAt)) / 1000).toFixed(0).padStart(3)} s  ${text}`);

const loops = () => audio(() => window.__world.audio.loops());
// La señal de un bucle varía (un trino, una ola): se toma la media de un rato.
async function heard(seconds = 1.6) {
 const sum = {};
 const n = Math.round(seconds / 0.08);
 let last;
 for (let i = 0; i < n; i++) {
  last = await loops();
  for (const [name, loop] of Object.entries(last)) sum[name] = (sum[name] ?? 0) + loop.heard / n;
  await wait(80);
 }
 return Object.fromEntries(Object.entries(last).map(([name, loop]) => [name, { ...loop, heard: sum[name] }]));
}
const f = (value) => value.toFixed(4);
const sampled = () => audio(() => ({ ...window.__world.audio.sampled }));

// ── Ambiente de día: pájaros sí, grillos no ──────────────────────────────────
await mark("aterrizaje, de día: pájaros");
await wait(2500);
let now = await heard(2.4);
check(now.pajaros.heard > 0.004 && now.grillos.heard < 0.0005, `de día suenan los pájaros (señal ${f(now.pajaros.heard)}) y no los grillos (${f(now.grillos.heard)})`);
check(now.cascada.heard < 0.002 && now.mar.heard < 0.002, `junto al cohete no llega la cascada (${f(now.cascada.heard)}) ni el mar (${f(now.mar.heard)})`);

// ── Pasos sobre hierba ───────────────────────────────────────────────────────
// Un prado despejado: se busca un tramo de 9 m de hierba hacia el sur.
const meadow = await audio(() => {
 const world = window.__world.world();
 for (let x = -14; x <= 14; x += 1) for (let z = 9; z <= 16; z += 1) {
  let ok = true;
  for (let k = 0; k <= 9 && ok; k += 0.5) ok = world.surface(x, z + k) === "grass" && !world.blocked?.(x, z + k, 0.4);
  if (ok) return [x, z];
 }
 return null;
});
check(Boolean(meadow), `hay un prado para andar (${meadow})`);
await t.put(meadow[0], meadow[1], { settle: 900 });
let before = await sampled();
await mark("andando sobre hierba");
await t.hold("KeyS", 2600);
let after = await sampled();
const walked = (after["pasos-hierba"] ?? 0) - (before["pasos-hierba"] ?? 0);
// (El trote da 4,3 pisadas por segundo: unas 11 en 2,6 s.)
check(walked >= 9 && walked <= 13, `al andar por la hierba suena un paso grabado por pisada (${walked} en 2,6 s)`);
await t.put(meadow[0], meadow[1], { settle: 600 });
await mark("corriendo sobre hierba");
await page.keyboard.down("ShiftLeft");
await t.hold("KeyS", 1500);
await page.keyboard.up("ShiftLeft");
const ran = ((await sampled())["pasos-hierba"] ?? 0) - (after["pasos-hierba"] ?? 0);
const kinds = Object.keys(await audio(() => ({ ...window.__world.audio.steps }))).length;
check(ran >= 4 && ran <= 9 && ran / 1.5 > walked / 2.6, `al correr, más seguidos (${ran} en 1,5 s)`);
check(kinds >= 7, `y van cambiando de muestra (${kinds} de las 16 distintas en ${walked + ran} pasos)`);

// ── Cascada: fuerte al pie, floja a media distancia, nada lejos; y del lado que toca ──
await t.put(POND.x - POND.r - 0.4, POND.z - 1, { settle: 500 });
await mark("junto a la cascada (a su izquierda)");
const near = await heard(2);
await t.put(POND.x - 14, POND.z + 3, { settle: 500 });
await mark("a 15 m de la cascada");
const mid = await heard(2);
await t.put(POND.x + POND.r + 0.4, POND.z - 1, { settle: 500 });
const other = await heard(1);
check(near.cascada.heard > 0.012 && mid.cascada.heard < near.cascada.heard * 0.4 && mid.cascada.heard > 0.0008, `la cascada se atenúa con la distancia: señal ${f(near.cascada.heard)} a ${Math.hypot(POND.r + 0.4 - (WATERFALL.x - POND.x), WATERFALL.z + 1.2 - POND.z + 1).toFixed(0)} m, ${f(mid.cascada.heard)} a 15 m, ${f(now.cascada.heard)} junto al cohete`);
check(near.cascada.side > 0.15 && other.cascada.side < -0.15, `y se oye del lado en que queda: a la derecha desde el oeste (${near.cascada.side}) y a la izquierda desde el este (${other.cascada.side})`);

// ── Arroyo: el de la meseta y el río ─────────────────────────────────────────
await t.put(STREAM[1][0] + 0.9, STREAM[1][1], { settle: 500 });
await mark("junto al arroyo de la meseta");
const brook = await heard(2);
await t.put(27.8, 9.4, { settle: 500 });
await mark("junto al río");
const river = await heard(2);
check(brook.arroyo.heard > 0.01 && river.arroyo.heard > 0.01 && now.arroyo.heard < 0.002, `el arroyo suena en la meseta (${f(brook.arroyo.heard)}) y junto al río (${f(river.arroyo.heard)}), no junto al cohete (${f(now.arroyo.heard)})`);

// ── Mar en la orilla, y chapuzón al entrar ───────────────────────────────────
const shore = shoreRadius(Math.PI / 2);
await t.put(0, shore - 3, { withWoody: false, settle: 500 });
await mark("en la orilla del sur");
const coast = await heard(2.6);
check(coast.mar.heard > 0.008 && coast.mar.heard > now.mar.heard * 8, `el mar suena en la orilla (${f(coast.mar.heard)}) y no tierra adentro (${f(now.mar.heard)})`);
before = await sampled();
await mark("entrando en el mar: chapuzón");
await t.hold("KeyS", 2600);
after = await sampled();
const y = (await t.pos()).y;
check((after.chapuzon ?? 0) > (before.chapuzon ?? 0), `al entrar en el agua suena el chapuzón (${(after.chapuzon ?? 0) - (before.chapuzon ?? 0)} vez; el astronauta está a y ${y})`);

// ── Interfaz: «pop» ──────────────────────────────────────────────────────────
await t.put(PAD.x + 2, PAD.z + 7.5, { settle: 600 });
before = await sampled();
await mark("interfaz: menú de Woody (abrir y cerrar)");
await page.click(".woody-menu__button");
await wait(500);
await page.click(".woody-menu__button");
await wait(500);
after = await sampled();
check((after.pop ?? 0) - (before.pop ?? 0) === 2, `cada botón de la interfaz hace «pop» (${(after.pop ?? 0) - (before.pop ?? 0)} en dos clics)`);

// ── De noche: grillos; fundido con los pájaros ───────────────────────────────
await mark("anochece: los pájaros se funden con los grillos");
await page.keyboard.press("KeyN");
const fadeLevels = [];
for (let i = 0; i < 6; i++) {
 await wait(450);
 const l = await loops();
 fadeLevels.push(`${l.pajaros.set.toFixed(2)}/${l.grillos.set.toFixed(2)}`);
}
await wait(3500);
const night = await heard(2.4);
check(night.grillos.heard > 0.004 && night.pajaros.heard < 0.0006, `de noche suenan los grillos (${f(night.grillos.heard)}) y callan los pájaros (${f(night.pajaros.heard)})`);
console.log(`     fundido pájaros/grillos cada 0,45 s: ${fadeLevels.join(" → ")}`);
{
 const steps = fadeLevels.map((pair) => pair.split("/").map(Number));
 check(steps.some(([birds, crickets]) => birds > 0.05 && crickets > 0.05), "el cambio es un fundido: hay un tramo en que suenan los dos");
}

// ── El botón de sonido lo calla todo ─────────────────────────────────────────
await mark("silencio (botón de sonido)");
await page.click(".sound-toggle");
await wait(700);
const muted = await audio(() => ({ master: window.__world.audio.master(), level: window.__world.audio.level(), pressed: document.querySelector(".sound-toggle").getAttribute("aria-pressed") }));
before = await sampled();
await t.hold("KeyD", 900);
const silentSteps = ((await sampled())["pasos-hierba"] ?? 0) - (before["pasos-hierba"] ?? 0);
const mutedLater = await audio(() => window.__world.audio.level());
check(muted.master < 0.001 && muted.level < 0.0005 && mutedLater < 0.0005 && muted.pressed === "false", `silenciado: salida a cero (volumen ${muted.master.toFixed(3)}, señal ${f(muted.level)} y ${f(mutedLater)} andando) con los bucles aún en marcha`);
check(silentSteps === 0, `y no se disparan golpes nuevos (${silentSteps} pasos)`);
await page.click(".sound-toggle");
await wait(900);
const back = await audio(() => ({ master: window.__world.audio.master(), level: window.__world.audio.level() }));
check(back.master > 0.5 && back.level > 0.001, `al activarlo vuelve todo (volumen ${back.master.toFixed(2)}, señal ${f(back.level)})`);
await mark("sonido de vuelta");
await page.keyboard.press("KeyN"); // otra vez de día
await wait(1500);

// ── Fútbol: poste y red ──────────────────────────────────────────────────────
const cz = (PITCH.z0 + PITCH.z1) / 2;
await t.put(PITCH.x0 + 2.3 + 9.5, cz + 1.2, { settle: 1300 });
await page.keyboard.press("KeyE");
await wait(2300);
async function shoot(shot) {
 await page.waitForFunction(() => window.__world.football.match.phase === "aim", { timeout: 9000 });
 await t.evaluate((shot) => {
  const { football } = window.__world;
  football.setKeeper(false, 0.7);
  football.match.noise = 0;
  football.release(shot);
 }, shot);
 await page.waitForFunction(() => window.__world.football.match.shot?.result, { timeout: 12000 });
 const result = await t.evaluate(() => window.__world.football.match.shot.result);
 await wait(1200);
 return result;
}
before = await sampled();
await mark("fútbol: tiro al poste");
const post = await shoot({ y: 1.1, z: cz + 2.46, power: 0.6, curl: 0 });
after = await sampled();
check(post === "poste" && (after.poste ?? 0) > (before.poste ?? 0), `balón al poste: suena el golpe grabado (resultado «${post}», ${(after.poste ?? 0) - (before.poste ?? 0)} vez)`);
await mark("fútbol: gol, balón a la red");
const goal = await shoot({ y: 1.0, z: cz + 1.3, power: 0.6, curl: 0 });
const nets = (s) => (s["red-1"] ?? 0) + (s["red-2"] ?? 0) + (s["red-3"] ?? 0);
const net = nets(await sampled()) - nets(after);
check(goal === "gol" && net >= 1, `gol: suena el balón en la red (resultado «${goal}», ${net} vez)`);
await page.keyboard.press("Escape");
await wait(1200);

// ── Cohete: rugido desde el encendido y silbido al levantarse ────────────────
await t.put(PAD.x, PAD.z + PAD.padRadius + 1.2, { settle: 1200 });
before = await sampled();
await mark("cohete: encendido (rugido)");
await page.keyboard.press("KeyE");
await wait(1000);
const ignition = { ...(await sampled()), phase: await audio(() => window.__world.ship.flight.phase), level: await audio(() => window.__world.audio.level()) };
check(ignition.phase === "igniting" && (ignition["cohete-rugido"] ?? 0) > (before["cohete-rugido"] ?? 0) && ignition.level > 0.01, `en el encendido ya ruge (fase ${ignition.phase}, señal de salida ${f(ignition.level)})`);
await wait(1100);
await mark("cohete: despegue (silbido)");
const liftoff = { phase: await audio(() => window.__world.ship.flight.phase), level: await audio(() => window.__world.audio.level()), ...(await sampled()) };
check(liftoff.phase === "ascending" && (liftoff["cohete-silbido"] ?? 0) > (before["cohete-silbido"] ?? 0), `al levantarse entra el silbido (fase ${liftoff.phase}, señal ${f(liftoff.level)})`);
await page.waitForFunction(() => window.__world.ship.flight.phase === "orbit", { timeout: 12000 });
await wait(5200);
const orbit = await heard(1);
check(orbit.cascada.set === 0 && orbit.mar.set === 0, `en órbita el agua del planeta no se oye (cascada ${orbit.cascada.set}, mar ${orbit.mar.set})`);
before = await sampled();
await mark("cohete: aterrizaje");
await page.keyboard.press("KeyE");
await wait(1200);
check(((await sampled())["cohete-rugido"] ?? 0) > (before["cohete-rugido"] ?? 0), "al aterrizar vuelve el rugido");
await page.waitForFunction(() => window.__world.ship.flight.phase === "idle", { timeout: 12000 });
await wait(1500);
await mark("fin");

// ── La grabación ─────────────────────────────────────────────────────────────
const base64 = await audio(
 () =>
  new Promise((resolve) => {
   const w = window.__world;
   w.recorder.onstop = async () => {
    const bytes = new Uint8Array(await new Blob(w.chunks).arrayBuffer());
    let text = "";
    for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768));
    resolve(btoa(text));
   };
   w.recorder.stop();
  }),
);
fs.writeFileSync(`${out}recorrido-sonido.webm`, Buffer.from(base64, "base64"));
fs.writeFileSync(`${out}recorrido-sonido.txt`, marks.join("\n") + "\n");
console.log(`\nGrabación: ${out}recorrido-sonido.webm (${(Buffer.from(base64, "base64").length / 1000).toFixed(0)} kB). Qué suena en cada momento:\n${marks.join("\n")}`);

await t.done();
