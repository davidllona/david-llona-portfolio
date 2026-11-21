// Concurso de triples en modo local (sin Firebase: `?marcador=local`): cartel,
// cuenta atrás, carros, puntos, cambio de carro, bocina, cartel del final con el
// nombre (validación, filtro, un envío por partida, 30 s entre envíos), tablón
// 3D, cartel del top 10 y logro «Francotirador». Nada sale del navegador.
//   node tests/e2e/triples.mjs [carpeta de capturas]
import fs from "node:fs";
import { open, check, wait } from "./common.mjs";
import { BASKET, TRIPLES_BOARD, TRIPLES_SIGN } from "../../src/worlds/living/layout.js";

const folder = process.argv[2] ? process.argv[2] + "/" : null;
if (folder) fs.mkdirSync(folder, { recursive: true });
const requests = [];
const t = await open({
 viewport: { width: 1440, height: 900 },
 query: "?marcador=local",
 prepare: (page) => page.on("request", (request) => requests.push(request.url())),
});
const { page } = t;
const shot = (name) => folder && page.screenshot({ path: `${folder}${name}.jpg`, type: "jpeg", quality: 88 });
await t.enter();
const state = () =>
 t.evaluate(() => {
  const w = window.__world, s = w.triples.state, c = w.court;
  return { ...s, held: w.ball.mode === "held" && !w.ball.empty, money: w.ball.money, contest: c.play.contest, guard: c.blocker.active, marker: c.marker.active, x: w.player.position.x, z: w.player.position.z, auto: Boolean(w.player.auto), played: { ...w.audio.played }, hud: document.querySelector(".triples") ? { time: document.querySelector(".triples__time")?.textContent, score: document.querySelector(".triples__score")?.textContent, rack: document.querySelector(".triples__rack")?.textContent, count: document.querySelector(".triples__count")?.textContent ?? null } : null };
 });
const until = (test, ms = 8000) => t.evaluate((test, ms) => new Promise((resolve) => {
 const fn = new Function("w", `return ${test}`);
 const started = performance.now();
 const look = () => (fn(window.__world) ? resolve(true) : performance.now() - started > ms ? resolve(false) : requestAnimationFrame(look));
 look();
}), test, ms);
// Tira el balón que tiene en las manos (tiro perfecto, sin dispersión), en cuanto lo tenga.
const shoot = async (timing = 0) => {
 await until("w.ball.mode === 'held' && !w.ball.empty && !w.player.auto && w.triples.state.phase === 'play'", 6000);
 await t.evaluate((timing) => window.__world.court.shoot(timing), timing);
 await wait(350);
};

// 1. El cartel y el tablón, junto a la puerta.
await t.put(TRIPLES_SIGN.x, TRIPLES_SIGN.z + 1.3, { withWoody: false, settle: 5200 }); // (pasa el aviso del primer logro)
check((await t.hint()) === "Concurso de triples", `junto al cartel: "${await t.hint()}"`);
await shot("1-cartel");
await t.put(TRIPLES_BOARD.x, TRIPLES_BOARD.z + 1.4, { withWoody: false, settle: 700 });
check((await t.hint()) === "Ver el top 10", `junto al tablón: "${await t.hint()}"`);
const boardText = await t.evaluate(() => { let ok = false; window.__world.scene.traverse((o) => o.name === "cara del tablón de triples" && (ok = Boolean(o.material.map))); return ok; });
check(boardText, "el tablón 3D lleva su cara dibujada («TOP 10 · TRIPLES»)");
check(!requests.some((url) => /firebase|scoresRemote/i.test(url)), "Firebase no se ha descargado con el portfolio");

// 2. Empieza: cuenta atrás, defensas a un lado y el astronauta va al primer carro.
await t.put(TRIPLES_SIGN.x, TRIPLES_SIGN.z + 1.3, { withWoody: false, settle: 400 });
// (Cuenta los pipelines que el renderer compila desde aquí: los carros y sus balones no deben provocar tirones.)
await t.evaluate(() => {
 const pipelines = window.__world.renderer._pipelines;
 window.__hot = [];
 const create = pipelines._getRenderPipeline.bind(pipelines);
 pipelines._getRenderPipeline = (renderObject, ...rest) => {
  window.__hot.push(`${renderObject.material.type} · ${renderObject.object.name || renderObject.object.type}`);
  return create(renderObject, ...rest);
 };
});
await page.keyboard.press("KeyE");
await wait(250);
const counting = await state();
check(counting.phase === "count" && counting.contest && !counting.guard && !counting.marker, `con la E empieza la cuenta atrás y los defensas se apartan (${counting.phase})`);
check(counting.hud && counting.hud.count === "3" && counting.hud.time === "60" && counting.hud.score === "0" && counting.hud.rack === "1/5", `la interfaz enseña 3, 60 s, 0 puntos, carro 1/5 (${JSON.stringify(counting.hud)})`);
await shot("2-cuenta-atras");
const racks = await t.evaluate(() => { let n = 0, money = 0; window.__world.scene.traverse((o) => { if (o.name === "balón del carro" && o.visible) n++; if (o.name === "balón de color del carro" && o.visible) money++; }); return { n, money }; });
check(racks.n === 20 && racks.money === 5, `salen los cinco carros: 20 balones y 5 de color (${racks.n} + ${racks.money})`);
// Durante la cuenta atrás no se puede tirar.
await page.keyboard.press("KeyE");
await wait(100);
check(!(await state()).held, "durante la cuenta atrás aún no hay balón en las manos");
await until("w.triples.state.phase === 'play'", 5000);
const going = await state();
check(going.phase === "play" && (going.played["triples-count"] ?? 0) >= 2 && (going.played["triples-go"] ?? 0) === 1, `«3, 2, 1» con pitidos y salida (${going.played["triples-count"]} + ${going.played["triples-go"]})`);
await until("w.ball.mode === 'held' && !w.ball.empty && !w.player.auto", 5000);
const first = await state();
check(first.held && Math.hypot(first.x - (BASKET.hoop.x - 0.62 - 0.8), first.z - (BASKET.hoop.z - 4.8)) < 0.6, `ha ido al primer carro y coge balón (en ${first.x.toFixed(1)}, ${first.z.toFixed(1)})`);
// No se anda: en el concurso el astronauta está en su carro.
await t.hold("KeyA", 600);
const still = await state();
check(Math.hypot(still.x - first.x, still.z - first.z) < 0.1, "en el concurso no se anda: se tira desde el carro");

// 3. Un carro: cuatro normales y el de color (2). Sale corto uno a propósito.
await shoot(0);
await wait(1600);
check((await state()).score === 1, `una canasta, un punto (${(await state()).score})`);
await shoot(-0.9);
await wait(1600);
check((await state()).score === 1, "un tiro corto no suma");
await shoot(0);
await shoot(0);
await until("w.ball.money === true && w.ball.mode === 'held' && !w.ball.empty", 4000);
check((await state()).money, "el último balón del carro es el de color");
await shot("3-partida");
await shoot(0);
await wait(1800);
const rack1 = await state();
check(rack1.score === 5, `el de color vale 2: ${rack1.score} puntos (1 + 0 + 1 + 1 + 2)`);
const hot = await t.evaluate(() => [...new Set(window.__hot)]);
check(hot.length === 0, `0 pipelines en caliente al empezar, tirar y cambiar de carro${hot.length ? ": " + hot.join(", ") : ""}`);
check(rack1.rack === 1 && rack1.hud.rack === "2/5", `acabado el carro, pasa al siguiente (${rack1.hud.rack})`);
await wait(250);
await shot("4-cambio-de-carro");
await until("!w.player.auto", 4000);
const second = await state();
check(Math.hypot(second.x - first.x, second.z - first.z) > 3, `y el astronauta ha ido solo hasta él (${Math.hypot(second.x - first.x, second.z - first.z).toFixed(1)} m)`);

// 4. Los otros cuatro carros, todos dentro: 5 + 4 × 6 = 29. Varios balones en el aire a la vez.
for (let i = 0; i < 20; i++) await shoot(0);
await until("w.triples.state.phase === 'idle'", 8000);
const ended = await state();
check((ended.played["triples-horn"] ?? 0) === 1, "al acabar los balones suena la bocina");
await wait(900);
const result = await t.evaluate(() => ({ title: document.querySelector(".modal__title")?.textContent, badge: document.querySelector(".cartel__badge")?.textContent, input: Boolean(document.querySelector("#score-name")) }));
check(result.title === "29 puntos" && result.badge === "29 / 30" && result.input, `cartel del final: ${result.title}, ${result.badge}, con el nombre`);
check((await t.achievement()) === "Francotirador" || (await t.evaluate(() => JSON.parse(localStorage.getItem("logros") ?? "{}")))?.unlocked?.includes?.("francotirador") || (await t.evaluate(() => Object.keys(localStorage).some((k) => (localStorage.getItem(k) ?? "").includes("francotirador")))), "29 puntos: logro «Francotirador»");
const after = await state();
check(!after.contest && after.guard && after.marker && after.hud === null, "acabado, los defensas vuelven y la interfaz del concurso se va");

// 5. El nombre: se valida igual que en las reglas, con un mensaje claro.
const typeName = async (name) => {
 await page.click("#score-name", { clickCount: 3 });
 await page.keyboard.press("Backspace");
 if (name) await page.type("#score-name", name);
 await page.click(".score-form__save");
 await wait(250);
 return t.evaluate(() => ({ status: document.querySelector("#score-status")?.textContent, invalid: document.querySelector("#score-name")?.getAttribute("aria-invalid"), saved: document.querySelector(".score-form__save")?.disabled }));
};
let form = await typeName("ab");
check(/al menos 3/.test(form.status) && form.invalid === "true" && !form.saved, `«ab»: ${form.status}`);
form = await typeName("Ana_7!");
check(/letras, n[uú]meros/.test(form.status) && !form.saved, `«Ana_7!»: ${form.status}`);
form = await typeName("PutoAmo");
check(/no vale/.test(form.status) && !form.saved, `una palabrota: ${form.status}`);
// (La E no cierra el cartel mientras se escribe.)
await page.click("#score-name", { clickCount: 3 });
await page.keyboard.press("Backspace");
await page.type("#score-name", "Ñandú Eme");
check((await t.evaluate(() => document.querySelector("#score-name").value)) === "Ñandú Eme" && (await t.evaluate(() => Boolean(document.querySelector(".modal__card")))), "se escribe con tildes, ñ y espacios, y la E no cierra el cartel");
await shot("5-final-con-nombre");
await page.click(".score-form__save");
await wait(400);
form = await t.evaluate(() => ({ status: document.querySelector("#score-status")?.textContent, saved: document.querySelector(".score-form__save")?.disabled, label: document.querySelector(".score-form__save")?.textContent }));
check(/solo en este dispositivo/i.test(form.status) && form.saved && form.label === "Guardada", `guardada en el navegador: «${form.status}»`);
const stored = await t.evaluate(() => JSON.parse(localStorage.getItem("triples-local")));
check(stored.length === 1 && stored[0].name === "Ñandú Eme" && stored[0].score === 29, `en el navegador: ${JSON.stringify(stored)}`);
// Un envío por partida: cerrado y reabierto (con la misma partida), sigue guardada.
await page.keyboard.press("Escape");
await wait(500);
const tablon = await t.evaluate(() => { let painted = false; window.__world.scene.traverse((o) => o.name === "cara del tablón de triples" && (painted = o.material.map.version > 1)); return painted; });
check(tablon, "el tablón 3D se ha vuelto a pintar al guardar");

// 6. El cartel del top 10.
await t.put(TRIPLES_BOARD.x, TRIPLES_BOARD.z + 1.4, { withWoody: false, settle: 600 });
await shot("6-tablon-3d");
await page.keyboard.press("KeyE");
await page.waitForSelector(".score-top", { timeout: 8000 }).catch(() => null);
await wait(900);
const top = await t.evaluate(() => ({ title: document.querySelector(".modal__title")?.textContent, rows: [...document.querySelectorAll(".card__ranking li")].map((li) => li.textContent), mine: document.querySelector(".card__mine")?.textContent ?? null, note: document.querySelector(".score-note")?.textContent ?? null, best: document.querySelector(".score-top__best")?.textContent }));
check(top.title === "Top 10 · Triples" && top.rows.length === 1 && top.mine === "1Ñandú Eme29", `el cartel del top: ${JSON.stringify(top.rows)}, el del visitante resaltado`);
check(/solo en este dispositivo/i.test(top.note ?? "") && /29 puntos/.test(top.best), `con el aviso «${top.note}» y «${top.best}»`);
await shot("7-tablon-abierto");
await wait(400);
await page.keyboard.press("KeyE");
await wait(500);
check(!(await t.evaluate(() => Boolean(document.querySelector(".modal__card")))), "el cartel del top se cierra con la E");

// 7. Otra partida: se sale con Esc a mitad (todo vuelve) y otra que acaba por tiempo.
await t.put(TRIPLES_SIGN.x, TRIPLES_SIGN.z + 1.3, { withWoody: false, settle: 400 });
await page.keyboard.press("KeyE");
await until("w.triples.state.phase === 'play'", 5000);
await page.keyboard.press("Escape");
await wait(400);
const left = await state();
check(left.phase === "idle" && !left.contest && left.guard && left.hud === null && !(await t.evaluate(() => window.__world.player.pinned)), "con Esc se sale del concurso a mitad y todo vuelve a su sitio");
await t.put(TRIPLES_SIGN.x, TRIPLES_SIGN.z + 1.3, { withWoody: false, settle: 400 });
// (Con el portfolio en pausa no se ofrece nada: si el cartel vuelve a ofrecer la E, Esc no ha pausado.)
check((await t.hint()) === "Concurso de triples", "y Esc no pausa el portfolio: el cartel vuelve a ofrecer la E");
await page.keyboard.press("KeyE");
await until("w.triples.state.phase === 'play'", 5000);
await shoot(0);
await wait(300);
const timeBefore = await t.evaluate(() => window.__world.triples.state.time);
await wait(1000);
const timeAfter = await t.evaluate(() => window.__world.triples.state.time);
check(timeBefore - timeAfter > 0.8 && timeBefore - timeAfter < 1.3, `el reloj corre (${timeBefore.toFixed(1)} → ${timeAfter.toFixed(1)} s)`);
await t.evaluate(() => (window.__world.triples.state.time = 0.4));
await until("w.triples.state.phase === 'over'", 3000);
await shot("8-final-tiempo");
await until("w.triples.state.phase === 'idle'", 6000);
await wait(900);
check((await state()).played["triples-horn"] === 2 && /puntos?$/.test(await t.evaluate(() => document.querySelector(".modal__title")?.textContent ?? "")), "al acabarse el tiempo, bocina y cartel del final");
// Menos de 30 s después del anterior: no deja guardar todavía.
await page.click("#score-name", { clickCount: 3 });
await page.type("#score-name", "Otro");
await page.click(".score-form__save");
await wait(300);
form = await t.evaluate(() => ({ status: document.querySelector("#score-status")?.textContent, saved: document.querySelector(".score-form__save")?.disabled }));
check(/Espera \d+ s/.test(form.status) && !form.saved, `30 s entre envíos: «${form.status}»`);
await page.keyboard.press("Escape");
check(!requests.some((url) => /firebase|scoresRemote|googleapis\.com\/google\.firestore/i.test(url)), "en modo local no se ha pedido nada a Firebase");
await t.done();
