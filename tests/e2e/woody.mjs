// Woody guía: bocadillos (bienvenida, zonas), ritmo según el astronauta,
// descanso, cuestas y una ruta guiada completa. Saca las series de capturas.
import { open, check, wait } from "./common.mjs";
import { GUIDE, WELCOME, ZONE_LINES } from "../../src/content/woody.js";
import { living } from "../../src/worlds/living/layout.js";
import { distanceTo } from "../../src/worlds/collision.js";

const t = await open({ tips: true });
const { page } = t;
const dog = () => t.evaluate(() => window.__world.woodyClip?.() ?? null);
const box = () => t.evaluate(() => window.__world.ui3d.speech?.screen ?? null);
const clear = (b) => b && !(b.astronaut[0] > b.left && b.astronaut[0] < b.right && b.astronaut[1] + 0.12 > b.bottom && b.astronaut[1] - 0.1 < b.top);

// ── Aterrizaje: bienvenida en cuatro bocadillos ──────────────────────────────
await t.enter();
await wait(900);
check((await t.speech()) === WELCOME[0], `al aterrizar, Woody saluda: "${await t.speech()}"`);
check(clear(await box()), "el bocadillo no tapa al astronauta");
await t.shot("aterrizaje-1");
// No bloquea el movimiento.
const start = await t.pos();
await t.hold("KeyS", 500);
check((await t.pos()).z > start.z + 0.8 && (await t.speech()) !== null, "con el bocadillo a la vista se puede andar");
// Se pasa con E.
for (let i = 1; i < WELCOME.length; i++) {
 await page.keyboard.press("KeyE");
 await wait(700);
 check((await t.speech()) === WELCOME[i], `E pasa al bocadillo ${i + 1}: "${await t.speech()}"`);
 check(clear(await box()), `y el ${i + 1} tampoco tapa al astronauta`);
 await t.shot(`aterrizaje-${i + 1}`);
}
// …y con un clic en el propio bocadillo.
{
 const b = await box();
 await page.mouse.click(((b.left + b.right) / 2 * 0.5 + 0.5) * 1440, (1 - ((b.bottom + b.top) / 2 * 0.5 + 0.5)) * 900);
 await wait(500);
 check((await t.speech()) === null, "un clic en el último bocadillo lo cierra, y Woody calla");
}
// Woody al sur del astronauta (más cerca de la cámara): el bocadillo se aparta.
await t.evaluate(() => {
 const w = window.__world;
 w.woody.position.set(w.player.position.x, w.player.position.y, w.player.position.z + 1.9);
});
await t.evaluate(() => window.__world.ui3d.speech = { text: "Prueba: este bocadillo es largo a propósito para ver si tapa.", age: 0, life: 5 });
await wait(900);
check(clear(await box()), "con Woody delante del astronauta, el bocadillo se aparta a un lado");
await t.shot("bocadillo-apartado");
await wait(4600);

// ── Una frase por zona, una sola vez ────────────────────────────────────────
const plaza = living.zones.find((zone) => zone.id === "proyectos");
await t.put(plaza.x + 2, plaza.z + 3, { settle: 1200 });
check((await t.speech()) === ZONE_LINES.proyectos, `al entrar en Proyectos: "${await t.speech()}"`);
await t.shot("zona-proyectos");
await page.keyboard.press("KeyE");
await t.put(0, 12, { settle: 1200 });
await t.put(plaza.x + 2, plaza.z + 3, { settle: 1500 });
check((await t.speech()) === null, "al volver a entrar no lo repite");

// ── Ritmo: trota a tu paso, corre si corres ─────────────────────────────────
const stride = async () => {
 const { speed, rate, clip } = await t.evaluate(() => ({ speed: window.__world.woodyBrain.speed, rate: window.__world.woodyRate(), clip: window.__world.woodyClip() }));
 const natural = { Woody_Walk: 0.7, Woody_Trot: 1.775, Woody_Run: 4.375 }[clip];
 return { speed, clip, slide: natural ? Math.abs(speed - natural * rate) / Math.max(speed, 0.1) : 1 };
};
await t.put(-6, 0.2, { settle: 600 });
await page.keyboard.down("KeyA");
await wait(4200); // (si estaba sentado, primero se levanta y corre a alcanzarte)
let s = await stride();
check(s.clip === "Woody_Trot" && s.speed > 2.6 && s.speed < 4.6, `andando: Woody va al trote a ${s.speed.toFixed(1)} m/s`);
check(s.slide < 0.12, `y sin patinar: el clip avanza lo que avanza él (desfase ${(s.slide * 100).toFixed(0)} %)`);
await page.keyboard.up("KeyA");
await t.put(-6, 0.2, { settle: 500 });
await page.keyboard.down("ShiftLeft");
await page.keyboard.down("KeyA");
await wait(2600);
s = await stride();
await t.shot("woody-corriendo");
check(s.clip === "Woody_Run" && s.speed > 4.6, `corriendo: Woody corre a ${s.speed.toFixed(1)} m/s`);
check(s.slide < 0.12, `también sin patinar (desfase ${(s.slide * 100).toFixed(0)} %)`);
await page.keyboard.up("KeyA");
await page.keyboard.up("ShiftLeft");

// ── Descanso: se sienta a los ~3 s y se tumba a los ~10 s ───────────────────
await wait(1200); // llega a tu lado y para
const stopped = Date.now();
let sat = null, lay = null;
while (Date.now() - stopped < 14000 && !lay) {
 const w = await t.woody();
 const seconds = (Date.now() - stopped) / 1000;
 if (!sat && w.posture === "sit") (sat = seconds, await wait(900), await t.shot("woody-sentado"));
 if (!lay && w.posture === "lie") lay = seconds;
 await wait(150);
}
check(sat !== null && sat < 5.5, `parado, se sienta a los ${sat?.toFixed(1)} s`);
check(lay !== null && lay > 7 && lay < 12.5, `y se tumba a los ${lay?.toFixed(1)} s`);
await wait(1600);
check(/Sleep|LieDown/.test(await dog()), `tumbado: ${await dog()}`);
await t.shot("woody-tumbado");
await t.hold("KeyD", 1500);
await wait(700);
let p;
let w = await t.woody();
check(w.posture === "stand" && /Trot|Walk|Run|StandUp|WakeUp|Idle/.test(await dog()), `en cuanto te mueves se levanta (${w.posture}, ${await dog()})`);

// ── Cuestas: pegado al terreno al subir y bajar la rampa ────────────────────
const sample = () =>
 t.evaluate(() => {
  const { woody, woodyBrain, world } = window.__world;
  const p = woody.position, height = world().height;
  const ax = -Math.sin(woody.facing) * 0.42, az = -Math.cos(woody.facing) * 0.42;
  const ground = Math.max((height(p.x + ax, p.z + az) + height(p.x - ax, p.z - az)) / 2, height(p.x, p.z));
  return { y: p.y, error: Math.abs(p.y - ground), pitch: woodyBrain.pitch, speed: woodyBrain.speed };
 });
const climb = async (keys, ms, shot) => {
 const samples = [];
 for (const key of keys) await page.keyboard.down(key);
 const from = Date.now();
 while (Date.now() - from < ms) {
  samples.push(await sample());
  if (shot && samples.length === 18) await t.shot(shot);
  await wait(70);
 }
 for (const key of keys) await page.keyboard.up(key);
 return samples;
};
await t.put(-14.5, -14, { settle: 900 });
const up = await climb(["KeyW", "KeyD"], 4200, "woody-cuesta-subiendo");
await wait(1500);
w = await t.woody();
check(w.y > 3.5, `Woody sube la rampa hasta la meseta (y=${w.y})`);
const worst = (list, key) => Math.max(...list.map((one) => Math.abs(one[key])));
check(worst(up, "error") < 0.08, `subiendo no se hunde ni flota: error máximo ${(worst(up, "error") * 100).toFixed(1)} cm`);
check(Math.max(...up.map((one) => one.pitch)) > 0.15, `y el cuerpo se inclina con la cuesta (${Math.max(...up.map((one) => one.pitch)).toFixed(2)} rad)`);
const jerks = (list) => Math.max(...list.slice(1).map((one, i) => Math.abs(one.y - list[i].y)));
check(jerks(up) < 0.45, `sin tirones: el mayor salto de altura entre muestras es ${(jerks(up) * 100).toFixed(0)} cm`);
const down = await climb(["KeyS", "KeyA"], 4200, "woody-cuesta-bajando");
await wait(1500);
w = await t.woody();
p = await t.pos();
check(w.y < 1.5 && Math.abs(w.y - p.y) < 0.8, `y la baja contigo (Woody y=${w.y}, tú y=${p.y})`);
check(worst(down, "error") < 0.08 && Math.min(...down.map((one) => one.pitch)) < -0.15, `bajando tampoco: error ${(worst(down, "error") * 100).toFixed(1)} cm, cabeceo ${Math.min(...down.map((one) => one.pitch)).toFixed(2)} rad`);
// El puente (tablero en arco) y la orilla.
await t.put(18.2, -0.6, { settle: 700 });
const bridge = await climb(["KeyD"], 3200, "woody-puente");
check(worst(bridge, "error") < 0.1, `en el puente sigue el arco: error máximo ${(worst(bridge, "error") * 100).toFixed(1)} cm`);

// ── Ruta guiada completa: del cohete a Contacto, cruzando el puente ─────────
await t.put(0, 7.5, { settle: 1000 });
await page.keyboard.press("KeyG");
await wait(300);
const options = await t.evaluate(() => [...document.querySelectorAll(".woody-menu__list button")].map((b) => b.textContent));
check(options.join("|") === "Muéstrame proyectos|Llévame al cohete|¿Dónde está Contacto?|Acompáñame|Silenciar consejos", `menú de guía: ${options.join(" · ")}`);
await t.shot("guia-0-menu");
await t.evaluate(() => [...document.querySelectorAll(".woody-menu__list button")].find((b) => b.textContent === "¿Dónde está Contacto?").click());
await wait(600);
check((await t.speech()) === GUIDE.start, `al pedírselo: "${await t.speech()}"`);
await wait(3600);
w = await t.woody();
p = await t.pos();
check(w.mode === "guide" && w.waiting && Math.hypot(w.x - p.x, w.z - p.z) > 3, `va delante y, si no le sigues, te espera a ${Math.hypot(w.x - p.x, w.z - p.z).toFixed(1)} m`);
check(/GuideWait/.test(await dog()) && (await t.speech()) === GUIDE.waiting, `mirando atrás: ${await dog()}, "${await t.speech()}"`);
await t.shot("guia-1-espera");
let frame = 2;
const arrived = await t.followWoody({ each: async (i) => i % 12 === 6 && (await t.shot(`guia-${frame++}`)) });
await wait(500);
p = await t.pos();
const [cx, cz] = living.guide.nodes.contacto;
check(arrived && Math.hypot(p.x - cx, p.z - cz) < 7, `siguiéndole se llega a Contacto (a ${Math.hypot(p.x - cx, p.z - cz).toFixed(1)} m)`);
check((await t.speech()) === GUIDE.arrive.contacto, `y lo anuncia: "${await t.speech()}"`);
await t.shot(`guia-${frame}-llegada`);
// No atraviesa nada por el camino.
const at = await t.woody();
const inside = living.colliders.some((c) => c.active !== false && distanceTo(c, at.x, at.z) < c.r + 0.3);
check(!inside, "Woody no queda metido en ningún obstáculo");

// ── Silenciar consejos ───────────────────────────────────────────────────────
await page.keyboard.press("KeyG");
await wait(300);
await t.evaluate(() => [...document.querySelectorAll(".woody-menu__list button")].find((b) => b.textContent === "Silenciar consejos").click());
const tree = living.zones.find((zone) => zone.id === "casa-arbol");
await t.put(tree.x, tree.z, { settle: 1300 });
check((await t.speech()) === null, "con los consejos silenciados no comenta la zona");

await t.done();
