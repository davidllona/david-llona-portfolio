// Puntuaciones en modo remoto, con Firestore SIMULADO: la prueba sustituye
// src/game/scoresRemote.js (lo único que habla con Firebase) por uno falso que
// guarda en memoria. Además, como en todas las pruebas, el servidor de
// Firestore no resuelve: nada puede llegar a la base de datos real.
//  1. Se lee el top 10 (ordenado, diez como mucho) sin aviso de «solo en este dispositivo».
//  2. Se guarda: exactamente { name, score } (el sello de hora lo pone el SDK), botón desactivado mientras tanto.
//  3. Si Firestore falla: se guarda en el navegador y se avisa con suavidad.
//  4. Con el SDK de verdad (y sin red hasta Firestore): se carga solo al abrir el tablón y cae a local.
//   node tests/e2e/triples-remoto.mjs
import { open, check, wait } from "./common.mjs";
import { TRIPLES_BOARD, TRIPLES_SIGN } from "../../src/worlds/living/layout.js";

const FAKE = `
const db = (window.__fakeFirestore ??= { docs: [], fail: false, slow: 0, calls: [] });
const pause = () => new Promise((resolve) => setTimeout(resolve, db.slow));
export function connect(config) {
 db.calls.push({ type: "connect", projectId: config.projectId, apiKey: Boolean(config.apiKey), appId: Boolean(config.appId) });
 return {
  top: async (count) => {
   db.calls.push({ type: "top", count });
   await pause();
   if (db.fail) throw new Error("sin red (simulado)");
   return [...db.docs].sort((a, b) => b.score - a.score).slice(0, count).map(({ name, score }) => ({ name, score }));
  },
  add: async (name, score) => {
   db.calls.push({ type: "add", fields: { name, score } });
   await pause();
   if (db.fail) throw new Error("sin red (simulado)");
   db.docs.push({ name, score, createdAt: "serverTimestamp" });
  },
 };
}`;
const SEED = [25, 22, 20, 18, 15, 12, 10, 9, 8, 5, 4, 2].map((score, i) => ({ name: `Jugador ${i + 1}`, score }));

const requests = [];
const t = await open({
 viewport: { width: 1440, height: 900 },
 prepare: async (page) => {
  await page.setRequestInterception(true);
  page.on("request", (request) => {
   requests.push(request.url());
   // (Vite lo sirve por /src/... o por /@fs/<ruta absoluta>/src/...: se mira el final.)
   if (new URL(request.url()).pathname.endsWith("/src/game/scoresRemote.js")) request.respond({ status: 200, contentType: "application/javascript", body: FAKE });
   else request.continue();
  });
  await page.evaluateOnNewDocument((seed) => (window.__fakeFirestore = { docs: seed, fail: false, slow: 0, calls: [] }), SEED);
 },
});
const { page } = t;
await t.enter();
const fake = () => t.evaluate(() => JSON.parse(JSON.stringify(window.__fakeFirestore)));
const until = (test, ms = 8000) => t.evaluate((test, ms) => new Promise((resolve) => {
 const fn = new Function("w", `return ${test}`);
 const started = performance.now();
 const look = () => (fn(window.__world) ? resolve(true) : performance.now() - started > ms ? resolve(false) : requestAnimationFrame(look));
 look();
}), test, ms);

check(!requests.some((url) => /scoresRemote|firebase/i.test(url)), "al cargar el portfolio no se pide nada de Firebase");
check((await fake()).calls.length === 0, "ni se conecta");

// 1. El tablón: lee el top 10 al abrirse.
await t.put(TRIPLES_BOARD.x, TRIPLES_BOARD.z + 1.4, { withWoody: false, settle: 5200 });
await page.keyboard.press("KeyE");
await page.waitForSelector(".score-top", { timeout: 8000 }).catch(() => null);
await wait(300);
let top = await t.evaluate(() => ({ rows: [...document.querySelectorAll(".card__ranking li")].map((li) => li.querySelector("em").textContent), note: document.querySelector(".score-note")?.textContent ?? null, mode: document.querySelector(".score-top")?.dataset.mode }));
let calls = (await fake()).calls;
check(requests.some((url) => /scoresRemote/.test(url)), "al abrir el tablón se carga el módulo de Firebase");
check(calls[0]?.type === "connect" && calls[0].projectId === "david-llona-portfolio" && calls[0].apiKey && calls[0].appId, `con la configuración de .env.local (${calls[0]?.projectId})`);
check(calls.some((call) => call.type === "top" && call.count === 10), "pide las 10 mejores");
check(top.mode === "remote" && top.note === null, "es el tablón compartido: sin aviso de «solo en este dispositivo»");
check(top.rows.join(",") === "25,22,20,18,15,12,10,9,8,5", `diez filas, de mayor a menor (${top.rows.join(", ")})`);
const painted = await t.evaluate(() => { let version = 0; window.__world.scene.traverse((o) => o.name === "cara del tablón de triples" && (version = o.material.map.version)); return version; });
check(painted > 1, "el tablón 3D se pinta con lo leído");
await page.keyboard.press("Escape");
await wait(400);

// 2. Una partida corta (un carro: 6 puntos) y se guarda.
await t.put(TRIPLES_SIGN.x, TRIPLES_SIGN.z + 1.3, { withWoody: false, settle: 400 });
await page.keyboard.press("KeyE");
await until("w.triples.state.phase === 'play'", 6000);
for (let i = 0; i < 5; i++) {
 await until("w.ball.mode === 'held' && !w.ball.empty && !w.player.auto", 6000);
 await t.evaluate(() => window.__world.court.shoot(0));
 await wait(350);
}
await wait(1500);
await t.evaluate(() => (window.__world.triples.state.time = 0.2));
await until("w.triples.state.phase === 'idle'", 6000);
await page.waitForSelector("#score-name", { timeout: 6000 }).catch(() => null);
await t.evaluate(() => (window.__fakeFirestore.slow = 900));
await page.type("#score-name", "Remota Uno");
await page.click(".score-form__save");
await wait(250);
const saving = await t.evaluate(() => ({ disabled: document.querySelector(".score-form__save").disabled, label: document.querySelector(".score-form__save").textContent, input: document.querySelector("#score-name").disabled }));
check(saving.disabled && saving.input && saving.label === "Guardando…", `mientras se guarda, el botón está desactivado («${saving.label}»)`);
await wait(2400);
calls = (await fake()).calls;
const added = calls.filter((call) => call.type === "add");
check(added.length === 1 && JSON.stringify(added[0].fields) === JSON.stringify({ name: "Remota Uno", score: 6 }), `se envía solo nombre y puntos, enteros (${JSON.stringify(added[0]?.fields)}; la hora la pone serverTimestamp())`);
let status = await t.evaluate(() => document.querySelector("#score-status")?.textContent);
check(/puesto 10/.test(status), `y se relee el top: «${status}»`);
// Un envío por partida: no se puede volver a mandar.
await page.click(".score-form__save").catch(() => null);
await wait(300);
check((await fake()).calls.filter((call) => call.type === "add").length === 1, "un solo envío por partida");
await page.keyboard.press("Escape");
await wait(400);

// 3. Firestore falla: se guarda en el navegador y se dice con suavidad.
await t.evaluate(() => Object.assign(window.__fakeFirestore, { fail: true, slow: 0 }));
await t.evaluate(() => localStorage.setItem("triples-ultimo-envio", "0")); // (sin esperar los 30 s)
await t.put(TRIPLES_SIGN.x, TRIPLES_SIGN.z + 1.3, { withWoody: false, settle: 400 });
await page.keyboard.press("KeyE");
await until("w.triples.state.phase === 'play'", 6000);
await until("w.ball.mode === 'held' && !w.ball.empty && !w.player.auto", 6000);
await t.evaluate(() => window.__world.court.shoot(0));
await wait(1700);
await t.evaluate(() => (window.__world.triples.state.time = 0.2));
await until("w.triples.state.phase === 'idle'", 6000);
await page.waitForSelector("#score-name", { timeout: 6000 }).catch(() => null);
await page.click("#score-name", { clickCount: 3 });
await page.type("#score-name", "Sin Red");
await page.click(".score-form__save");
await wait(800);
status = await t.evaluate(() => document.querySelector("#score-status")?.textContent);
const local = await t.evaluate(() => JSON.parse(localStorage.getItem("triples-local") ?? "[]"));
check(/no se ha podido conectar/i.test(status) && /solo en este dispositivo/i.test(status), `sin conexión: «${status}»`);
check(local.length === 1 && local[0].name === "Sin Red" && local[0].score === 1, `y queda en el navegador (${JSON.stringify(local)})`);
await page.keyboard.press("Escape");
await wait(400);
await t.put(TRIPLES_BOARD.x, TRIPLES_BOARD.z + 1.4, { withWoody: false, settle: 500 });
await page.keyboard.press("KeyE");
await page.waitForSelector(".score-top", { timeout: 8000 }).catch(() => null);
await wait(300);
top = await t.evaluate(() => ({ rows: [...document.querySelectorAll(".card__ranking li span")].map((one) => one.textContent), note: document.querySelector(".score-note")?.textContent ?? null }));
check(/no se ha podido conectar/i.test(top.note ?? "") && top.rows.includes("Sin Red"), `y el tablón cae a lo guardado aquí: «${top.note}»`);
await page.keyboard.press("Escape");
check(!requests.some((url) => /firestore\.googleapis\.com/.test(url)), "ninguna petición a Firestore");
await t.done();

// 4. Con el SDK de verdad, sin poder llegar a Firestore (el nombre no resuelve):
// se carga al abrir el tablón y no antes, y la lectura cae al modo local.
// (Solo se abre el tablón: aquí no se guarda nada.)
const real = [];
const r = await open({ viewport: { width: 1280, height: 800 }, prepare: (page) => page.on("request", (request) => real.push(request.url())) });
await r.enter();
check(!real.some((url) => /firebase|scoresRemote/i.test(url)), "con el SDK real: nada de Firebase al cargar");
await r.put(TRIPLES_BOARD.x, TRIPLES_BOARD.z + 1.4, { withWoody: false, settle: 5200 });
await r.page.keyboard.press("KeyE");
const fell = await r.page.waitForSelector(".score-note", { timeout: 30000 }).then(() => true, () => false);
const note = await r.evaluate(() => document.querySelector(".score-note")?.textContent ?? null);
check(real.some((url) => /firebase_firestore_lite|firebase\/firestore\/lite|firestore.lite/i.test(url) || /scoresRemote/.test(url)), "al abrir el tablón se descarga el SDK (firebase/app + firestore/lite)");
check(fell && /no se ha podido conectar/i.test(note ?? ""), `sin red hasta Firestore, el tablón cae a local: «${note}»`);
await r.page.keyboard.press("Escape");
// (Lo esperado sin red: el navegador no resuelve el nombre y el SDK lo anota. No son fallos del portfolio.)
const expected = (line) => /ERR_NAME_NOT_RESOLVED|@firebase\/firestore/.test(line);
check(r.logs.every((line) => expected(line)), `en consola, solo los avisos de la red cortada (${r.logs.filter((line) => !expected(line)).join(" | ") || "ninguno más"})`);
r.logs.splice(0, r.logs.length);
await r.done();
