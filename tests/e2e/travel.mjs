// Viaje entre mundos: desde la órbita de The Living World se elige The Twisted
// Moon (The Cosmic Lab sigue cerrado), la nave viaja, aterriza en el mundo 2
// —que se descarga y se compila solo entonces, sin nada en caliente al
// destaparse— y vuelve. El botón «Sobre mí» del menú ofrece el viaje.
//   node tests/e2e/travel.mjs [capturas]
import { open, check, wait } from "./common.mjs";

const shots = process.argv.includes("capturas");
const t = await open();
const state = () =>
 t.evaluate(() => {
  const w = window.__world;
  return { world: w.world().id, voyage: w.voyage.phase, phase: w.ship?.flight.phase, hidden: w.player.hidden, bend: w.rig.bend, space: w.rig.space, moment: document.documentElement.dataset.momento, overlay: !!document.querySelector(".travel--on"), canvas: document.querySelector("canvas").style.visibility };
 });
const until = async (test, timeout = 40000) => {
 const from = Date.now();
 while (Date.now() - from < timeout) {
  if (test(await state())) return true;
  await wait(150);
 }
 return false;
};
// Cuenta los pipelines que el renderer crea a partir de ahora.
const countPipelines = () =>
 t.evaluate(() => {
  const pipelines = window.__world.renderer._pipelines;
  window.__hot = [];
  if (!pipelines.__counted) {
   const create = pipelines._getRenderPipeline.bind(pipelines);
   pipelines._getRenderPipeline = (renderObject, ...rest) => {
    window.__hot.push(`${renderObject.material.type} · ${renderObject.object.type}${renderObject.object.name ? ` «${renderObject.object.name}»` : ""}`);
    return create(renderObject, ...rest);
   };
   pipelines.__counted = true;
  }
 });
const hot = () => t.evaluate(() => [...new Set(window.__hot)]);

// El mundo 2 no se ha descargado al entrar en el 1.
const loaded = () => t.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => /worlds\/twisted\//.test(name)).length);
check((await loaded()) === 0, "al entrar en The Living World no se ha descargado nada de The Twisted Moon");
await t.enter();

// «Sobre mí» ofrece viajar.
await t.evaluate(() => [...document.querySelectorAll(".quick button")].find((b) => b.textContent === "Sobre mí").click());
await wait(500);
const offer = await t.evaluate(() => ({ title: document.querySelector(".modal__title")?.textContent, button: document.querySelector(".modal__voyage")?.textContent }));
check(/Twisted Moon/.test(offer.button ?? ""), `el botón «Sobre mí» ofrece el viaje: «${offer.title}» → «${(offer.button ?? "").trim()}»`);
if (shots) await t.shot("viaje-0-oferta");
await t.evaluate(() => document.querySelector(".modal__voyage").click());
check(await until((s) => s.phase === "igniting" || s.phase === "ascending", 4000), "al aceptarlo, la nave despega sola");
check(await until((s) => s.phase === "orbit" || s.voyage !== "idle", 16000), "llega a la órbita");
const sky = await t.evaluate(() => ({ names: window.__world.space.names, open: window.__world.space.open }));
check(sky.open.join() === "twisted" && sky.names.length === 2, `desde la órbita, The Twisted Moon se puede elegir y The Cosmic Lab sigue cerrado (abiertos: ${sky.open.join(", ")}; a la vista: ${sky.names.join(", ")})`);
if (shots) {
 await wait(300);
 await t.shot("viaje-1-orbita-mundo1");
}
check(await until((s) => s.voyage === "leaving", 6000), "y sale hacia The Twisted Moon");
if (shots) {
 await wait(700);
 await t.shot("viaje-2-saliendo");
}
check(await until((s) => s.overlay, 5000), `la pantalla del viaje cubre la escena: «${(await t.text(".travel__name")) ?? ""}»`);
if (shots) {
 await wait(900);
 await t.shot("viaje-3-pantalla");
}
check(await until((s) => s.voyage === "loading" && s.world === "twisted", 15000), "con la pantalla cubierta se cambia de mundo");
check((await loaded()) > 0, `y solo entonces se descarga The Twisted Moon (${await loaded()} módulos)`);
await countPipelines();
const from = Date.now();
check(await until((s) => s.voyage === "arriving", 60000), `el mundo 2 se monta y se compila detrás de la pantalla (${((Date.now() - from) / 1000).toFixed(1)} s)`);
let now = await state();
check(now.phase === "orbit" && now.hidden && now.bend === 1 && now.canvas === "", `al destaparse, la nave está en la órbita de The Twisted Moon, con el mundo cerrado en planeta (fase ${now.phase}, curva ${now.bend})`);
check(now.moment === "night", `en The Twisted Moon es de noche (${now.moment})`);
await t.evaluate(() => (window.__hot = []));
await wait(1400);
if (shots) await t.shot("viaje-4-orbita-mundo2");
check(await until((s) => s.phase === "descending", 6000), "y baja sola");
if (shots) {
 for (let i = 0; i < 5; i++) {
  await wait(1000);
  await t.shot(`viaje-5-bajada-${i}`);
 }
}
check(await until((s) => s.phase === "idle" && s.voyage === "idle" && !s.hidden, 12000), "aterriza y el astronauta sale");
await wait(1500);
const compiled = await hot();
check(compiled.length === 0, `0 pipelines en caliente desde que se destapa hasta después de aterrizar${compiled.length ? ": " + compiled.join(", ") : ""}`);
now = await state();
const spot = await t.pos();
check(now.world === "twisted" && now.bend === 0 && Math.hypot(spot.x, spot.z) < 8, `está en The Twisted Moon, junto a la plataforma, con el suelo plano (${spot.x}, ${spot.z}; mundo ${now.world}, curva ${now.bend})`);
check((await t.evaluate(() => !document.querySelector(".theme-toggle"))), "sin botón de día y noche: aquí siempre es de noche");
if (shots) await t.shot("viaje-6-en-tierra");
// Se anda.
const before = await t.pos();
await t.hold("KeyS", 900);
const after = await t.pos();
check(after.z - before.z > 1.5, `se puede andar (${before.z} → ${after.z})`);
// N no hace de día.
await t.page.keyboard.press("KeyN");
await wait(600);
check((await state()).moment === "night", "la tecla N no cambia la noche");
// «Sobre mí», aquí, abre el panel con todos los textos; su botón pone a Woody a guiar hasta la casa sobre tronco.
await t.evaluate(() => [...document.querySelectorAll(".quick button")].find((b) => b.textContent === "Sobre mí").click());
await wait(700);
const aboutOpen = await t.evaluate(() => Boolean(document.querySelector(".sheet .about")));
await t.evaluate(() => document.querySelector(".about__walk button")?.click());
await wait(700);
check(aboutOpen && (await t.woody()).mode === "guide", "en The Twisted Moon, «Sobre mí» abre el panel con todo y, desde él, Woody guía hasta la casa sobre tronco");
await t.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyG" })));
await wait(200);
// «Proyectos», desde aquí, ofrece volver.
await t.evaluate(() => document.querySelector(".woody-menu__list") && window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyG" })));
await t.evaluate(() => [...document.querySelectorAll(".quick button")].find((b) => b.textContent === "Proyectos").click());
await wait(500);
check(/Living World/.test((await t.text(".modal__voyage")) ?? ""), `«Proyectos» ofrece volver: «${((await t.text(".modal__voyage")) ?? "").trim()}»`);
await t.page.keyboard.press("Escape");
await wait(400);

// La vuelta, a mano: subir a la nave, y desde la órbita, la tecla V.
await t.put(0, 5.6, { withWoody: false, settle: 1000 });
check(/Subir a la nave/.test((await t.hint()) ?? ""), `junto a la nave: «${await t.hint()}»`);
await t.page.keyboard.press("KeyE");
check(await until((s) => s.phase === "orbit", 16000), "despega de The Twisted Moon y llega a la órbita");
const back = await t.evaluate(() => window.__world.space.open);
check(back.join() === "living", `desde aquí se puede volver a The Living World (abiertos: ${back.join(", ")})`);
if (shots) {
 await wait(600);
 await t.shot("viaje-7-orbita-vuelta");
}
await t.page.keyboard.press("KeyV");
check(await until((s) => s.voyage === "leaving", 3000), "con la tecla V sale hacia The Living World");
check(await until((s) => s.voyage === "loading" && s.world === "living", 15000), "se cambia de mundo");
await countPipelines();
check(await until((s) => s.voyage === "arriving", 90000), "The Living World se vuelve a montar detrás de la pantalla");
await t.evaluate(() => (window.__hot = []));
check(await until((s) => s.phase === "idle" && s.voyage === "idle" && !s.hidden, 20000), "y aterriza en The Living World");
await wait(1500);
const again = await hot();
check(again.length === 0, `0 pipelines en caliente al volver${again.length ? ": " + again.join(", ") : ""}`);
now = await state();
check(now.world === "living" && now.moment === "day" && (await t.evaluate(() => !!document.querySelector(".theme-toggle"))), `de vuelta en The Living World, con su hora (${now.moment}) y su botón de día y noche`);
if (shots) await t.shot("viaje-8-de-vuelta");
await t.done();
