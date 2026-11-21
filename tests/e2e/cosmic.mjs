// The Cosmic Lab (mundo 3): se elige desde la órbita de The Living World (tecla
// B), se descarga solo entonces, se aterriza sin nada en caliente; allí la
// gravedad es baja, Woody lleva escafandra, la máquina de Dosia se enciende y
// manda su rayo al núcleo, y se vuelve a The Living World.
//   node tests/e2e/cosmic.mjs
import { open, check, wait } from "./common.mjs";
import { APP_STATUS } from "../../src/content/cards.js";
import { LAB, MACHINES as TEXT, MACHINE_ORDER } from "../../src/content/cosmic.js";
import cosmic, { CORE, GRAVITY, MACHINES, edge } from "../../src/worlds/cosmic/layout.js";

const t = await open();
const state = () =>
 t.evaluate(() => {
  const w = window.__world;
  return { world: w.world().id, voyage: w.voyage.phase, phase: w.ship?.flight.phase, hidden: w.player.hidden, bend: w.rig.bend, moment: document.documentElement.dataset.momento, canvas: document.querySelector("canvas").style.visibility };
 });
const until = async (test, timeout = 40000) => {
 const from = Date.now();
 while (Date.now() - from < timeout) {
  if (test(await state())) return true;
  await wait(150);
 }
 return false;
};
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
const loaded = () => t.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => /worlds\/cosmic\//.test(name)).length);
const modal = () =>
 t.evaluate(() => {
  const card = document.querySelector(".modal__card");
  return card ? { object: [...card.classList].find((name) => name.startsWith("card--"))?.slice(6), status: card.querySelector(".maquina__status")?.textContent.trim() ?? null, tagline: card.querySelector(".maquina__tagline")?.textContent ?? null, energy: card.querySelector(".maquina__energy")?.textContent ?? null, phones: card.querySelectorAll(".maquina__phone").length, button: card.querySelectorAll(".modal__link").length, title: card.querySelector(".modal__title")?.textContent ?? null, text: [...card.querySelectorAll(".modal__text")].map((one) => one.textContent) } : null;
 });
const labNow = () => t.evaluate(() => { const l = window.__world.lab; return { on: l.quest.isOn("dosia"), count: l.quest.count(), machine: l.machine, core: l.core, beam: l.beam, lamps: l.lamps, sequence: l.sequence }; });

// ── El viaje de ida ─────────────────────────────────────────────────────────
check((await loaded()) === 0, "al entrar en The Living World no se ha descargado nada de The Cosmic Lab");
await t.enter();
await t.put(0, 5.6, { withWoody: false, settle: 900 });
await t.page.keyboard.press("KeyE");
check(await until((s) => s.phase === "orbit", 20000), "se despega de The Living World y se llega a la órbita");
const sky = await t.evaluate(() => ({ names: window.__world.space.names, open: window.__world.space.open }));
check(sky.open.join() === "twisted,cosmic", `desde la órbita se pueden elegir los otros dos mundos: The Cosmic Lab ya no está en «Próximamente» (abiertos: ${sky.open.join(", ")})`);
await wait(900);
await t.page.keyboard.press("KeyB");
check(await until((s) => s.voyage === "leaving", 3000), `con la tecla B la nave sale hacia The Cosmic Lab: «${(await t.text(".travel__name")) ?? ""}»`);
check(await until((s) => s.voyage === "loading" && s.world === "cosmic", 15000), "con la pantalla cubierta se cambia de mundo");
check((await loaded()) > 0, `y solo entonces se descarga The Cosmic Lab (${await loaded()} módulos)`);
await countPipelines();
const from = Date.now();
check(await until((s) => s.voyage === "arriving", 60000), `el mundo 3 se monta y se compila detrás de la pantalla (${((Date.now() - from) / 1000).toFixed(1)} s)`);
let now = await state();
check(now.phase === "orbit" && now.hidden && now.bend === 1 && now.canvas === "", `al destaparse, la nave está en la órbita de The Cosmic Lab, con el mundo cerrado en planeta (fase ${now.phase}, curva ${now.bend})`);
const far = await t.evaluate(() => { const b = window.__world.beyond; return { drawn: b.meshes.reduce((sum, mesh) => sum + (mesh.visible ? mesh.count : 0), 0), all: b.layers.reduce((sum, layer) => sum + layer.items.length, 0) }; });
check(far.drawn === far.all && far.all > 250, `desde la órbita el planeta entero es el mundo: se dibuja todo lo que crece lejos (${far.drawn} copias)`);
await t.evaluate(() => (window.__hot = []));
check(await until((s) => s.phase === "idle" && s.voyage === "idle" && !s.hidden, 20000), "baja sola, aterriza y el astronauta sale");
await wait(1500);
let compiled = await hot();
check(compiled.length === 0, `0 pipelines en caliente desde que se destapa hasta después de aterrizar${compiled.length ? ": " + compiled.join(", ") : ""}`);
now = await state();
check(now.world === "cosmic" && now.moment === "day" && now.bend === 0 && (await t.evaluate(() => !document.querySelector(".theme-toggle"))), `está en The Cosmic Lab, con el suelo plano y sin botón de día y noche (mundo ${now.world}, ${now.moment})`);
const counter = () => t.evaluate(() => document.querySelector(".quick__energy")?.textContent.replace(/\s+/g, " ").trim() ?? null);
check((await counter()) === `${LAB.counter} 0/${MACHINE_ORDER.length}`, `el menú lleva el contador: «${await counter()}»`);

// ── Gravedad baja y la escafandra de Woody ──────────────────────────────────
await t.put(3.4, -8.6, { settle: 2600 });
const helmet = await t.evaluate(() => { const w = window.__world, h = w.helmet; return h ? { visible: h.visible, away: Math.hypot(h.position.x - w.woody.position.x, h.position.z - w.woody.position.z), up: h.position.y - w.woody.position.y } : null; });
check(helmet?.visible && helmet.away < 0.9 && helmet.up > 0.2 && helmet.up < 1.4, `Woody lleva su escafandra, en la cabeza (a ${helmet?.away.toFixed(2)} m de él en planta y ${helmet?.up.toFixed(2)} m sobre el suelo)`);
// (Woody, de pie: acaba de llegar junto al astronauta.)
await t.evaluate(() => { const w = window.__world; w.woodyBrain.posture = "stand"; w.woodyBrain.rest = 0; });
const ground = (await t.pos()).y;
await t.page.keyboard.press("Space");
let top = 0, dogTop = 0, air = 0;
const started = Date.now();
for (let i = 0; i < 60; i++) {
 await wait(70);
 const at = await t.evaluate(() => ({ y: window.__world.player.position.y, grounded: window.__world.player.grounded, hop: window.__world.woodyHop ?? 0 }));
 top = Math.max(top, at.y - ground);
 dogTop = Math.max(dogTop, at.hop);
 if (at.grounded && i > 4) break;
 air = (Date.now() - started) / 1000;
}
check(cosmic.gravity === GRAVITY && top > 2.4 && air > 1.6, `gravedad baja: el salto sube ${top.toFixed(2)} m y dura ${air.toFixed(1)} s (en los otros mundos, 1,2 m y 0,8 s)`);
check(dogTop > 0.6, `y Woody salta con el astronauta (${dogTop.toFixed(2)} m)`);
await wait(1200);

// ── El reborde cierra el llano ──────────────────────────────────────────────
await t.put(-24, -14, { withWoody: false, settle: 600 });
await t.hold("KeyA", 3200);
const west = await t.pos();
check(edge(west.x, west.z) > 0.5 && west.x < -24.5, `andando hacia fuera no se pasa del reborde (se queda a ${edge(west.x, west.z).toFixed(1)} m del borde del llano)`);

// ── La máquina de Dosia ─────────────────────────────────────────────────────
const dosia = MACHINES.dosia;
await t.put(dosia.use.x + 0.4, dosia.use.z + 0.9, { settle: 2200 });
let state0 = await labNow();
check(!state0.on && state0.machine === 0 && state0.core === 0 && state0.beam === 0, "al llegar, el laboratorio está apagado: la máquina, el rayo y el núcleo");
check((await t.hint()) === LAB.hintOff(TEXT.dosia.name), `junto a la máquina: «${await t.hint()}»`);
await t.page.keyboard.press("KeyE");
await wait(700);
const mid = await labNow();
check(mid.sequence && mid.machine > 0.2 && !(await modal()), `con la E se enciende: primero sus luces (${mid.machine.toFixed(2)}), sin controles y sin panel todavía`);
await wait(1100);
const lit = await labNow();
const toast = (await t.toasts()).join(" | ");
check(lit.on && lit.beam > 0.95 && lit.count === 1, `el rayo de energía llega al núcleo y la máquina queda encendida (rayo ${lit.beam.toFixed(2)}; ${lit.count} de ${MACHINE_ORDER.length})`);
check(toast.includes(LAB.on(TEXT.dosia.name, 1, MACHINE_ORDER.length)), `aviso: «${toast}»`);
await t.page.waitForSelector(".modal__card", { timeout: 8000 }).catch(() => {});
const card = await modal();
check(card?.title === TEXT.dosia.name && card.tagline === TEXT.dosia.tagline && card.text.join("|") === TEXT.dosia.paragraphs.join("|"), `y se abre su carta con el texto tal cual: «${card?.title}» — «${card?.text[0]}»`);
check(card?.object === "maquina" && card.phones === 2 && card.status === APP_STATUS.published && /1\/5/.test(card.energy ?? "") && card.button === 0, `es una máquina del laboratorio, con sus dos móviles holográficos, «${card?.status}», «${card?.energy}» y sin botón «Abrir la app» (no hay enlace que poner)`);
await t.page.keyboard.press("Escape");
await wait(1600);
const after = await labNow();
check(after.core > 0.15 && after.core < 0.4 && after.lamps[0] > 0.9 && after.lamps.slice(1).every((one) => one < 0.05), `al núcleo le llega energía (${after.core.toFixed(2)} de 1) y se enciende su testigo, solo el de Dosia`);
check((await counter()) === `${LAB.counter} 1/${MACHINE_ORDER.length}` && (await t.hint()) === LAB.hintOn(TEXT.dosia.name), `el contador pasa a «${await counter()}» y la E vuelve a abrir «${await t.hint()}»`);
check((await t.evaluate(() => JSON.parse(window.localStorage.getItem("planeta-logros") ?? "{}").unlocked?.["mente-inquieta"])) > 0, "logro «Mente inquieta» conseguido");
check((await t.evaluate(() => JSON.parse(window.sessionStorage.getItem("lab-energia")).on.join())) === "dosia", "queda guardado en la visita");
// El sonido del mundo 3: su arranque y su rayo han sonado, y solo se ha descargado la música elegida.
const heard = await t.evaluate(() => ({ played: window.__world.audio.played, track: window.__world.cosmicSounds.track, files: performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => /sounds\/cosmic\//.test(name)).map((name) => name.split("/").pop()) }));
check(heard.played["muestra:encendido"] >= 1 && heard.played["muestra:rayo"] >= 1 && heard.played["muestra:salto"] >= 1, `al encenderla suenan el arranque y el rayo, y al saltar, su salto (${["encendido", "rayo", "salto"].map((name) => `${name}: ${heard.played["muestra:" + name] ?? 0}`).join(", ")})`);
check(heard.files.filter((name) => /^musica-/.test(name)).join() === `musica-${heard.track}.mp3` && ["ambiente.mp3", "zumbido.mp3", "antena.mp3"].every((name) => heard.files.includes(name)), `se descargan sus sonidos y, de las tres músicas, solo la elegida (${heard.files.filter((name) => /^musica-/.test(name)).join(", ")})`);
// Las cinco máquinas: cada una con su luz de estado; la de los experimentos, apagada y sin carta.
const lights = await t.evaluate(() => {
 const found = {};
 window.__world.scene.traverse((node) => {
  const match = /^luz de estado de (.+): (.+)$/.exec(node.name ?? "");
  if (match) found[match[1]] = { status: match[2], colour: node.material.color.getHexString() };
 });
 return found;
});
check(lights.dosia?.status === "published" && ["epidos", "chuchometro", "viajes"].every((id) => lights[id]?.status === "building" && lights[id].colour !== lights.dosia.colour) && !lights.experimentos, `cada máquina enseña su estado en el mundo: Dosia publicada (luz lima); Epidos, Chuchómetro y la app de viajes en construcción (ámbar); la de los experimentos, sin luz`);
await t.put(MACHINES.experimentos.use.x, MACHINES.experimentos.use.z, { withWoody: false, settle: 1200 });
check((await t.hint()) === null, "la máquina de los experimentos, sin contenido todavía, queda apagada: junto a ella no se ofrece nada");
// Otra máquina, en construcción: se enciende igual y su carta lo dice.
await t.put(MACHINES.epidos.use.x, MACHINES.epidos.use.z, { withWoody: false, settle: 1500 });
check((await t.hint()) === LAB.hintOff(TEXT.epidos.name), `junto a la de Epidos: «${await t.hint()}»`);
await t.page.keyboard.press("KeyE");
await t.page.waitForSelector(".modal__card", { timeout: 9000 }).catch(() => {});
await wait(500);
const second = await modal();
check(second?.title === TEXT.epidos.name && second.status === APP_STATUS.building && second.text.join("|") === TEXT.epidos.paragraphs.join("|") && /2\/5/.test(second.energy ?? "") && second.button === 0 && second.tagline === null, `su carta: «${second?.title}», «${second?.status}», «${second?.text[0]}» y «${second?.energy}»; sin botón ni subtítulo (no los tiene)`);
check((await t.evaluate(() => document.querySelector(".modal").textContent.includes("["))) === false, "ninguna carta enseña un «[PENDIENTE]»");
await t.page.keyboard.press("Escape");
await wait(1200);
check((await t.evaluate(() => window.__world.lab.all.epidos)).beam > 0.95, "y su rayo llega también al núcleo");
// El núcleo.
await t.put(CORE.x, CORE.z + CORE.r + 1.1, { withWoody: false, settle: 1500 });
check((await t.hint()) === LAB.coreSome(2, MACHINE_ORDER.length), `el núcleo cuenta lo que le falta: «${await t.hint()}»`);
compiled = await hot();
check(compiled.length === 0, `0 pipelines en caliente en todo el paseo (salto, máquina, rayo, panel)${compiled.length ? ": " + compiled.join(", ") : ""}`);

// ── La vuelta ───────────────────────────────────────────────────────────────
await t.put(0, 5.6, { withWoody: false, settle: 1000 });
await t.page.keyboard.press("KeyE");
check(await until((s) => s.phase === "orbit", 20000), "se despega de The Cosmic Lab y se llega a la órbita");
const back = await t.evaluate(() => window.__world.space.open);
check(back.join() === "living,twisted", `desde aquí se puede ir a los otros dos mundos (abiertos: ${back.join(", ")})`);
await wait(900);
await t.page.keyboard.press("KeyV");
check(await until((s) => s.voyage === "loading" && s.world === "living", 20000), "con la tecla V se vuelve a The Living World");
await countPipelines();
check(await until((s) => s.voyage === "arriving", 90000), "The Living World se vuelve a montar detrás de la pantalla");
await t.evaluate(() => (window.__hot = []));
check(await until((s) => s.phase === "idle" && s.voyage === "idle" && !s.hidden, 20000), "y aterriza en The Living World");
await wait(1500);
compiled = await hot();
check(compiled.length === 0, `0 pipelines en caliente al volver${compiled.length ? ": " + compiled.join(", ") : ""}`);
now = await state();
check(now.world === "living" && (await t.evaluate(() => !document.querySelector(".quick__energy") && !window.__world.helmet?.parent)), "de vuelta en The Living World: sin contador de energía y Woody sin escafandra");
const jumpBack = await (async () => {
 await t.put(3, 12, { withWoody: false, settle: 800 });
 const base = (await t.pos()).y;
 await t.page.keyboard.press("Space");
 let most = 0;
 for (let i = 0; i < 14; i++) {
  await wait(70);
  most = Math.max(most, (await t.pos()).y - base);
 }
 return most;
})();
check(jumpBack > 0.8 && jumpBack < 1.5, `y aquí se salta lo de siempre (${jumpBack.toFixed(2)} m)`);
await t.done();
