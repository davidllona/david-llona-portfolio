// Capturas de la pantalla de carga al 0 %, 50 % y 100 %, en escritorio y móvil
// vertical, y una serie del fundido real hacia la bienvenida.
//   node tests/e2e/loader.mjs [etiqueta]
// El 0 % es real (se retiene el JavaScript de la página). El 50 % y el 100 % se
// ponen a mano sobre esa misma página, con las mismas operaciones que hace
// src/ui/loaderControl.js: en una carga normal duran un instante.
import puppeteer from "puppeteer-core";
import { CHROME, GPU_ARGS } from "../chrome.mjs";
import { BASE, out, wait } from "./common.mjs";

const tag = process.argv[2] ?? "ahora";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: GPU_ARGS });
for (const [name, viewport] of [["escritorio", { width: 1440, height: 900 }], ["movil-vertical", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
 const page = await browser.newPage();
 await page.setViewport(viewport);
 await page.setRequestInterception(true);
 page.on("request", (request) => (/\/src\/main\.jsx/.test(request.url()) ? null : request.continue())); // el código no llega nunca
 const started = Date.now();
 page.goto(BASE, { timeout: 0 }).catch(() => {}); // no termina nunca de cargar: falta el código
 await page.waitForSelector(".ld-stage img", { timeout: 30000 });
 await page.waitForFunction(() => [...document.querySelectorAll(".ld-stage img")].every((img) => img.complete && img.naturalWidth > 0));
 console.log(`${name}: imagen pintada a los ${Date.now() - started} ms`);
 const share = await page.evaluate(() => { const r = document.querySelector(".ld-stage").getBoundingClientRect(); return Math.round((r.height / innerHeight) * 100); });
 console.log(`${name}: la escena ocupa el ${share} % del alto (con su margen transparente)`);
 await wait(700);
 await page.screenshot({ path: `${out}carga-${name}-000-${tag}.jpg`, type: "jpeg", quality: 85 });
 for (const [value, text] of [[50, "Despertando el bosque…"], [100, ""]]) {
  await page.evaluate((value, text) => {
   document.getElementById("loader-number").textContent = String(value);
   document.getElementById("loader-bar").style.transform = `scaleX(${value / 100})`;
   document.getElementById("loader-step").textContent = text;
  }, value, text);
  await wait(900);
  await page.screenshot({ path: `${out}carga-${name}-${String(value).padStart(3, "0")}-${tag}.jpg`, type: "jpeg", quality: 85 });
 }
 await page.close();
}
// El fundido real: carga normal, una captura cada ~90 ms desde que el número pasa de 80.
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => Number(document.getElementById("loader-number")?.textContent ?? 100) >= 80 || !document.getElementById("loader"), { polling: 16, timeout: 60000 });
for (let i = 0; i < 12; i++) {
 const state = await page.evaluate(() => { const l = document.getElementById("loader"); return l ? `${document.getElementById("loader-number").textContent} % · opacidad ${getComputedStyle(l).opacity}` : "retirada"; });
 await page.screenshot({ path: `${out}carga-fundido-${String(i).padStart(2, "0")}-${tag}.jpg`, type: "jpeg", quality: 70 });
 console.log(`fundido ${i}: ${state}`);
 await wait(40);
}
await browser.close();
