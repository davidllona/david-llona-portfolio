// Comprobación MANUAL (no está en la batería): que el tablón lee el top 10 de
// la base de datos REAL de Firestore. Solo lee: cualquier petición a Firestore
// que no sea una consulta (`:runQuery`) se corta antes de salir, así que no
// puede escribir nada aunque algo lo intentara. No juega ni guarda.
//   node tests/e2e/firebase-lectura.mjs
import { open, check } from "./common.mjs";
import { TRIPLES_BOARD } from "../../src/worlds/living/layout.js";

const seen = { queries: 0, blocked: [] };
const t = await open({
 firestore: true,
 prepare: async (page) => {
  await page.setRequestInterception(true);
  page.on("request", (request) => {
   const url = request.url();
   if (/firestore\.googleapis\.com/.test(url) && !/:runQuery/.test(url)) {
    seen.blocked.push(`${request.method()} ${url.slice(0, 140)}`);
    request.abort();
   } else {
    if (/firestore\.googleapis\.com/.test(url)) seen.queries += 1;
    request.continue();
   }
  });
 },
});
await t.enter();
await t.put(TRIPLES_BOARD.x, TRIPLES_BOARD.z + 1.4, { withWoody: false, settle: 5200 });
const started = Date.now();
await t.page.keyboard.press("KeyE");
await t.page.waitForSelector(".score-top", { timeout: 20000 }).catch(() => null);
const top = await t.evaluate(() => ({ mode: document.querySelector(".score-top")?.dataset.mode, note: document.querySelector(".score-note")?.textContent ?? null, rows: [...document.querySelectorAll(".card__ranking li")].map((li) => li.textContent), empty: document.querySelector(".score-top .modal__text")?.textContent }));
console.log(`lectura en ${((Date.now() - started) / 1000).toFixed(1)} s · consultas a Firestore: ${seen.queries} · cortadas: ${seen.blocked.length}`);
console.log(`filas: ${top.rows.length ? top.rows.join(" | ") : "(ninguna)"} ${top.rows.length ? "" : `— «${top.empty}»`}`);
check(top.mode === "remote" && top.note === null, `el tablón lee de Firestore (modo ${top.mode}${top.note ? `; aviso: ${top.note}` : ""})`);
check(seen.queries >= 1 && seen.blocked.length === 0, `solo consultas de lectura (${seen.queries}); ninguna otra petición (${seen.blocked.join(", ") || "ninguna"})`);
await t.page.keyboard.press("Escape");
await t.done();
