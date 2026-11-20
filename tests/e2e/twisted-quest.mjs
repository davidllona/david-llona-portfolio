// El juego de The Twisted Moon («arranca el reloj y conóceme»): al llegar el
// reloj de la torre está parado y hay cuatro engranajes, uno ante cada parada.
// Se recorren las cuatro (E abre su panel; al cerrarlo, se gana el engranaje),
// se sube a la torre, se arranca el reloj (secuencia, campanadas, esferas
// encendidas) y se abre «Mi recorrido». Después, el observatorio. El progreso
// se guarda en la visita. Abre directamente en ese mundo (?world=twisted, solo en desarrollo).
//   node tests/e2e/twisted-quest.mjs
import { open, check, wait } from "./common.mjs";
import { aboutText } from "../../src/content/about.js";
import { CLOCK, CURRENT_COMPANY, FUTURE, STOPS, STOP_ORDER, TIMELINE } from "../../src/content/twisted.js";
import { QUEST_STOPS, TELESCOPE, TOWER_DOOR } from "../../src/worlds/twisted/layout.js";

const t = await open({ query: "?world=twisted" });
await t.enter();
await wait(800);
// Desde aquí se cuentan los pipelines que el renderer crea: jugando no debe compilarse nada.
await t.evaluate(() => {
 const pipelines = window.__world.renderer._pipelines;
 window.__hot = [];
 const create = pipelines._getRenderPipeline.bind(pipelines);
 pipelines._getRenderPipeline = (renderObject, ...rest) => {
  window.__hot.push(`${renderObject.material.type} · ${renderObject.object.type}${renderObject.object.name ? ` «${renderObject.object.name}»` : ""}`);
  return create(renderObject, ...rest);
 };
});
const clock = () => t.evaluate(() => window.__world.towerClock);
const counter = async () => ((await t.text(".quick__gears")) ?? "").replace(/\s+/g, " ").trim();
const gearsSeen = () =>
 t.evaluate(() => {
  let seen = 0;
  window.__world.scene.traverse((node) => node.name === "engranaje" && node.visible && node.scale.x > 0.05 && seen++);
  return seen;
 });
const modal = () =>
 t.evaluate(() => {
  const card = document.querySelector(".modal__card");
  if (!card) return null;
  return {
   eyebrow: card.querySelector(".modal__eyebrow")?.textContent ?? null,
   title: card.querySelector(".modal__title")?.textContent ?? null,
   text: [...card.querySelectorAll(".modal__text")].map((one) => one.textContent),
   timeline: [...card.querySelectorAll(".modal__timeline li")].map((one) => [one.querySelector("b").textContent, one.querySelector("span").textContent]),
   soon: card.querySelector(".modal__soon") ? { text: card.querySelector(".modal__soon").textContent.replace(/\s+/g, " ").trim(), disabled: card.querySelector(".modal__soon").disabled } : null,
   voyage: card.querySelector(".modal__voyage") ? { text: card.querySelector(".modal__voyage").textContent.replace(/\s+/g, " ").replace("→", "").trim(), disabled: card.querySelector(".modal__voyage").disabled } : null,
  };
 });
const close = async () => {
 await t.page.keyboard.press("Escape");
 await wait(700);
};

// ── Al llegar: reloj parado ─────────────────────────────────────────────────
let state = await clock();
const stoppedAngle = ((10 + 10 / 60) / 12) * Math.PI * 2;
check(!state.running && state.level < 0.01 && state.cogs === 0, `al llegar el reloj está parado: esferas a media luz y ningún engranaje en la fachada (nivel ${state.level.toFixed(2)})`);
check(Math.abs(state.hourAngle - stoppedAngle) < 0.01, `las agujas están quietas en las diez y diez, no en la hora real (${((state.hourAngle / (Math.PI * 2)) * 12).toFixed(2)} h)`);
await wait(1200);
check(Math.abs((await clock()).minuteAngle - state.minuteAngle) < 1e-6, "y no se mueven");
check((await counter()) === `${CLOCK.counter} 0/4`, `el contador, junto a los logros: «${await counter()}»`);
check((await gearsSeen()) === 4, `hay cuatro engranajes a la vista, uno ante cada parada (${await gearsSeen()})`);

// Lo que hay en las paradas (bloque D2): cada una, su detalle.
const props = await t.evaluate(() => {
 const names = {};
 window.__world.scene.traverse((node) => node.name && (names[node.name] = (names[node.name] ?? 0) + 1));
 return { names, stops: window.__world.stops };
});
const expected = ["tablón de notas", "notas del tablón", "mesa de bocetos", "estantería", "consola", "pantalla encendida", "cama de Woody", "hueco de Woody", "retrato de Woody", "mapa con chinchetas", "maleta", "farolillo de papel"];
check(expected.every((name) => props.names[name] === 1), `cada parada tiene su detalle: ${expected.filter((name) => props.names[name] === 1).join(", ")}`);
check(props.stops.notes === 0 && props.stops.lantern < 0.01 && props.stops.scope < 0.01, "al llegar las notas están revueltas, el farolillo de papel apagado y el telescopio sin usar");
check(props.stops.photo ? props.names["foto de Woody"] === 1 : props.names["silueta de Woody"] === 1, props.stops.photo ? "el marco lleva la foto de Woody (public/img/woody.jpg)" : "no hay public/img/woody.jpg: el marco lleva una silueta (y no se pide el archivo)");

// Sin engranajes, la puerta de la torre no arranca nada.
await t.put(TOWER_DOOR.x, TOWER_DOOR.z + 0.4, { settle: 1200 });
check((await t.hint()) === CLOCK.doorMissing(0, 4), `la puerta de la torre avisa: «${await t.hint()}»`);
await t.page.keyboard.press("KeyE");
await wait(600);
check((await t.toasts()).includes(CLOCK.missing(4)) && !(await clock()).running && !(await modal()), `sin engranajes no arranca: «${(await t.toasts()).join(" · ")}»`);

// ── Las cuatro paradas ──────────────────────────────────────────────────────
let have = 0;
for (const id of STOP_ORDER) {
 const spot = QUEST_STOPS[id], text = STOPS[id];
 await t.put(spot.x, spot.z, { settle: 1100 });
 const hint = await t.hint();
 await t.page.keyboard.press("KeyE");
 await t.page.waitForSelector(".modal__card", { timeout: 5000 }).catch(() => {});
 const card = await modal();
 const sameText = card && card.text.length === text.paragraphs.length && card.text.every((line, i) => line === text.paragraphs[i]);
 check(hint === text.hint && card?.title === text.title && card?.eyebrow === text.place && sameText, `${text.place}: la E («${hint}») abre «${card?.title}» con su texto tal cual (${card?.text.length} párrafos)`);
 const before = await t.evaluate(() => window.__world.quest.count());
 await close();
 have += 1;
 const now = await t.evaluate((id) => ({ count: window.__world.quest.count(), has: window.__world.quest.has(id) }), id);
 check(before === have - 1 && now.count === have && now.has, `al cerrar el panel se gana su engranaje (${now.count}/4)`);
 check((await t.toasts()).includes(CLOCK.gear(have, 4)) && (await counter()) === `${CLOCK.counter} ${have}/4`, `aviso «${CLOCK.gear(have, 4)}» y contador «${await counter()}»`);
 if (id === "alquimista") check((await t.evaluate(() => window.__world.stops.notes)) > 0.99, "al usarla, las notas del tablón han volado y están ordenadas en columnas");
 if (id === "invernadero") check((await t.evaluate(() => window.__world.stops.lantern)) > 0.9, "al usarla, el farolillo de papel se ha encendido");
 if (id === "casita") {
  // Woody se va a su hueco, junto a la cama, y se tumba.
  await wait(7500);
  const dog = await t.woody();
  const hollow = await t.evaluate(() => window.__world.woody.post);
  check(dog.posture === "lie" && hollow && Math.hypot(dog.x - hollow.x, dog.z - hollow.z) < 0.9, `junto a la casita Woody se tumba en su hueco del suelo, no en la cama (postura: ${dog.posture})`);
 }
}
await wait(900);
check((await gearsSeen()) === 0, `los engranajes recogidos ya no flotan ante las paradas (${await gearsSeen()})`);
// Volver a una parada no da otro.
await t.put(QUEST_STOPS.casita.x, QUEST_STOPS.casita.z, { settle: 900 });
await t.page.keyboard.press("KeyE");
await t.page.waitForSelector(".modal__card", { timeout: 5000 }).catch(() => {});
await close();
check((await t.evaluate(() => window.__world.quest.count())) === 4, "repetir una parada no suma engranajes");
// El progreso queda guardado en la visita.
const saved = await t.evaluate(() => JSON.parse(window.sessionStorage.getItem("luna-reloj") ?? "null"));
check(saved?.gears?.length === 4 && saved.running === false, `el progreso se guarda en la visita: ${saved?.gears?.join(", ")}`);
check((await t.evaluate(() => JSON.parse(window.localStorage.getItem("planeta-logros") ?? "{}").unlocked?.["cuatro-engranajes"])) > 0, "logro «Cuatro engranajes» conseguido");

// ── Arrancar el reloj ───────────────────────────────────────────────────────
const chimes = () => t.evaluate(() => window.__world.audio.sampled.campanada ?? 0);
const rung = await chimes();
await t.put(TOWER_DOOR.x, TOWER_DOOR.z + 0.4, { settle: 1200 });
check((await t.hint()) === CLOCK.doorReady, `con los cuatro, la puerta ofrece «${await t.hint()}»`);
await t.page.keyboard.press("KeyE");
await wait(1500);
state = await clock();
check(state.running && state.sequence > 1 && state.sequence < 3 && state.cogs >= 2 && state.cogs < 4 && state.level < 0.01, `secuencia en marcha: a los ${state.sequence.toFixed(1)} s ya han encajado ${state.cogs} engranajes y las esferas siguen apagadas`);
await t.page.keyboard.press("KeyW");
check(!(await modal()), "mientras dura no se abre nada");
await wait(2600);
state = await clock();
check(state.cogs === 4 && state.level > 0.3 && state.level < 1, `a los ${state.sequence.toFixed(1)} s están los cuatro y las esferas se van encendiendo (nivel ${state.level.toFixed(2)})`);
await t.page.waitForSelector(".modal__card", { timeout: 8000 }).catch(() => {});
let card = await modal();
check(card?.title === TIMELINE.title && card.timeline.length === 5 && card.timeline.every(([when, what], i) => when === TIMELINE.milestones[i][0] && what === TIMELINE.milestones[i][1]), `al acabar se abre «${card?.title}» con sus cinco hitos: ${card?.timeline.map(([when]) => when).join(" · ")}`);
check(card?.timeline.some(([when]) => when === CURRENT_COMPANY) && CURRENT_COMPANY.startsWith("[CONFIRMAR"), `el nombre por confirmar se enseña tal cual: «${CURRENT_COMPANY}»`);
state = await clock();
check(state.running && state.level > 0.99 && Math.abs(state.hour - 12) < 0.05 && state.hourAngle % (Math.PI * 2) < 0.03 && state.minuteAngle % (Math.PI * 2) < 0.03, `el reloj anda y marca la hora del visitante (${state.hour.toFixed(2)} h; esferas al ${Math.round(state.level * 100)} %)`);
await wait(7000);
check((await chimes()) - rung === 4, `al arrancar suenan cuatro campanadas (${(await chimes()) - rung})`);
check((await t.evaluate(() => JSON.parse(window.localStorage.getItem("planeta-logros") ?? "{}").unlocked?.relojero)) > 0, "logro «Relojero» conseguido");
await close();
check((await t.hint()) === CLOCK.doorRunning, `después, la puerta abre «${await t.hint()}» cuando se quiera`);
check((await t.evaluate(() => JSON.parse(window.sessionStorage.getItem("luna-reloj")).running)) === true, "y queda guardado que el reloj anda");

// ── El observatorio: el final ───────────────────────────────────────────────
await t.put(TELESCOPE.x, TELESCOPE.z, { settle: 1400 });
const lastHint = await t.hint();
await t.page.keyboard.press("KeyE");
await wait(1300);
check((await t.evaluate(() => window.__world.stops.scope)) > 0.8 && !(await modal()), "con la E se mira por el telescopio un instante (The Cosmic Lab, en un círculo) antes de abrirse el panel");
await t.page.waitForSelector(".modal__card", { timeout: 9000 }).catch(() => {});
card = await modal();
check(lastHint === FUTURE.hint && card?.title === FUTURE.title && card.text.join("|") === FUTURE.paragraphs.join("|"), `observatorio: «${card?.title}» con su texto`);
check(card?.voyage && !card.voyage.disabled && !card.soon && card.voyage.text === FUTURE.go, `el botón del final ya funciona: «${card?.voyage?.text}»`);
await close();

// El panel «Sobre mí» del menú reúne todos los textos, sin pasear.
await t.evaluate(() => [...document.querySelectorAll(".quick button")].find((one) => one.textContent.trim() === "Sobre mí").click());
await wait(600);
const about = await t.evaluate(() => {
 const sheet = document.querySelector(".sheet .about");
 return sheet ? { titles: [...sheet.querySelectorAll(".about__title")].map((one) => one.textContent), text: sheet.textContent, walk: Boolean(sheet.querySelector(".about__walk button")) } : null;
});
const all = [...aboutText.paragraphs, ...STOP_ORDER.flatMap((id) => STOPS[id].paragraphs), ...TIMELINE.milestones.flat(), ...FUTURE.paragraphs];
check(about && all.every((line) => about.text.includes(line)) && about.walk, `el botón «Sobre mí» abre un panel con todo: ${about?.titles.join(" · ")} (${all.length} textos, tal cual)`);
check((await t.woody()).mode !== "guide", "y leerlo no pone a Woody a guiar");
await t.page.keyboard.press("Escape");
await wait(500);

const hot = await t.evaluate(() => [...new Set(window.__hot)]);
check(hot.length === 0, `0 pipelines en caliente en todo el juego${hot.length ? ": " + hot.join(", ") : ""}`);

// ── Al volver a entrar en la misma visita, sigue como estaba ────────────────
await t.page.reload({ waitUntil: "load" });
await t.page.waitForFunction(() => !document.querySelector("#loader"), { timeout: 90000 });
await t.page.waitForFunction(() => { const enter = document.querySelector(".overlay__enter"); return !enter || !enter.disabled; }, { timeout: 90000 });
await t.enter();
await wait(1500);
state = await clock();
check(state.running && state.level > 0.99 && state.cogs === 4 && (await counter()) === `${CLOCK.counter} 4/4` && (await gearsSeen()) === 0, `tras recargar en la misma visita el reloj sigue en marcha y el contador en «${await counter()}»`);
// Y si el almacenamiento falla, no se rompe nada.
const safe = await t.evaluate(() => {
 const original = Storage.prototype.setItem;
 Storage.prototype.setItem = () => { throw new Error("almacenamiento lleno"); };
 try {
  window.__world.quest.reset();
  const got = window.__world.quest.collect("casita");
  return { got, count: window.__world.quest.count() };
 } catch (error) {
  return { error: String(error) };
 } finally {
  Storage.prototype.setItem = original;
 }
});
check(safe.got === true && safe.count === 1, `con el almacenamiento roto el juego sigue (en memoria): ${JSON.stringify(safe)}`);

// ── El botón del observatorio lleva de verdad a The Cosmic Lab (objetivo 24) ──
await t.put(TELESCOPE.x, TELESCOPE.z, { settle: 1400 });
await t.page.keyboard.press("KeyE");
await t.page.waitForSelector(".modal__voyage", { timeout: 9000 }).catch(() => {});
await t.evaluate(() => document.querySelector(".modal__voyage")?.click());
const reach = async (test, timeout) => {
 const from = Date.now();
 while (Date.now() - from < timeout) {
  if (await t.evaluate(test)) return true;
  await wait(200);
 }
 return false;
};
check(await reach(() => ["igniting", "ascending"].includes(window.__world.ship.flight.phase), 6000), "al pulsarlo, la nave despega sola");
check(await reach(() => window.__world.world().id === "cosmic" && window.__world.voyage.phase === "idle" && !window.__world.player.hidden, 120000), "y se llega a The Cosmic Lab: se aterriza y el astronauta sale");
await t.done();
