// Pantalla de carga: el astronauta y Woody caminando sobre el planeta que gira.
// Comprueba lo que se puede medir (peso de las capas, cuándo se pinta, que el
// suelo y los pies van a la misma velocidad, que en móvil vertical la escena
// ocupa lo pedido, que nada se sale) y saca los fotogramas del bucle: seis en
// escritorio y tres en móvil vertical, más un detalle ampliado de los
// caminantes y la serie del fundido real hacia la bienvenida.
//   node tests/e2e/loader.mjs [etiqueta]
// La página se abre sin su JavaScript (se retiene): así la pantalla se queda
// puesta. Cada fotograma se saca parando todas las animaciones en el mismo
// instante del bucle, de modo que la serie es exacta y repetible.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { CHROME, GPU_ARGS } from "../chrome.mjs";
import { BASE, check as report, out, wait } from "./common.mjs";

let failed = 0;
const check = (ok, text) => {
 if (!ok) failed += 1;
 report(ok, text);
};

const tag = process.argv[2] ?? "ahora";
const LIMIT_KB = 250;

// ── Peso de las capas ────────────────────────────────────────────────────────
const folder = path.resolve("public/loader");
const files = fs.readdirSync(folder).filter((name) => !name.startsWith("."));
const sizes = files.map((name) => [name, fs.statSync(path.join(folder, name)).size]);
const total = sizes.reduce((sum, [, size]) => sum + size, 0);
check(total <= LIMIT_KB * 1000, `las capas pesan ${(total / 1000).toFixed(0)} kB en total, máximo ${LIMIT_KB} (${sizes.map(([name, size]) => `${name} ${(size / 1000).toFixed(0)}`).join(", ")})`);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: GPU_ARGS });
// Para todas las animaciones en el instante `ms` del bucle.
const freeze = (page, ms) =>
 page.evaluate((ms) => {
  for (const animation of document.getAnimations()) {
   animation.pause();
   animation.currentTime = ms;
  }
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
 }, ms);
const shot = (page, name, clip) => page.screenshot({ path: `${out}${name}.jpg`, type: "jpeg", quality: 88, clip });

async function open(viewport) {
 const page = await browser.newPage();
 await page.setViewport(viewport);
 await page.setRequestInterception(true);
 const requested = [];
 page.on("request", (request) => {
  if (/\/loader\//.test(request.url())) requested.push(request.url().split("/").pop());
  return /\/src\/main\.jsx/.test(request.url()) ? null : request.continue(); // el código no llega nunca
 });
 page.goto(BASE, { timeout: 0 }).catch(() => {}); // no termina nunca de cargar: falta el código
 await page.waitForSelector(".ld-world img", { timeout: 30000 });
 await page.waitForFunction(() => [...document.querySelectorAll("#loader img")].every((img) => img.complete && img.naturalWidth > 0));
 // Cuándo se pintó, según el propio navegador (no el reloj de la prueba).
 await page.waitForFunction(() => performance.getEntriesByType("paint").some((entry) => entry.name === "first-contentful-paint"), { timeout: 8000 }).catch(() => {});
 const paint = await page.evaluate(() => {
  const first = performance.getEntriesByType("paint").find((entry) => entry.name === "first-contentful-paint")?.startTime;
  const images = performance.getEntriesByType("resource").filter((entry) => /\/loader\//.test(entry.name)).map((entry) => entry.responseEnd);
  return { first, images: Math.max(...images) };
 });
 // Los textos (nombre, porcentaje, mensaje) salen cuando llega la tipografía.
 await page.waitForFunction(() => document.documentElement.classList.contains("has-font"), { timeout: 8000 }).catch(() => {});
 paint.text = await page.evaluate(() => performance.getEntriesByType("resource").filter((entry) => /fonts\.g/.test(entry.name)).reduce((latest, entry) => Math.max(latest, entry.responseEnd), 0));
 await wait(400); // su fundido de entrada
 return { page, requested, paint };
}

// Dónde están en pantalla el suelo, las cabezas y el sol, y a qué velocidad va cada cosa.
const measure = (page) =>
 page.evaluate(() => {
  const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
  const loader = document.getElementById("loader");
  const m = rect(".ld-shade").width / 7.2; // píxeles por metro
  const seconds = (selector) => parseFloat(getComputedStyle(document.querySelector(selector)).animationDuration);
  const globe = seconds(".ld-globe"), astro = seconds(".ld-astro img"), woody = seconds(".ld-woody img");
  const horizon = rect(".ld-shade").top;
  const sun = rect(".ld-sun");
  const info = rect(".ld-info");
  return {
   m,
   horizon,
   // Velocidad del suelo y de cada caminante, en metros por segundo.
   ground: (2 * Math.PI * 3.6) / globe,
   astro: (0.52 * 0.667) / astro,
   woody: (1.33 * 0.533) / woody,
   cycles: { globe, astro, woody },
   astroBox: rect(".ld-astro .ld-cell").toJSON(),
   woodyBox: rect(".ld-woody .ld-cell").toJSON(),
   sunTop: sun.top,
   sunVisible: (Math.min(innerWidth, sun.right) - Math.max(0, sun.left)) / sun.width,
   info: info.toJSON(),
   overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight || getComputedStyle(loader).overflow !== "hidden",
   size: [innerWidth, innerHeight],
  };
 });

// ── Escritorio ───────────────────────────────────────────────────────────────
{
 const { page, requested, paint } = await open({ width: 1440, height: 900 });
 // El primer pintado varía de una carga a otra: se mide en cinco y se da la mediana.
 const paints = [paint];
 for (let i = 0; i < 4; i++) {
  const again = await open({ width: 1440, height: 900 });
  paints.push(again.paint);
  await again.page.close();
 }
 const firsts = paints.map((one) => one.first).sort((a, b) => a - b);
 check(firsts[2] < 100, `la escena se pinta a los ${firsts[2].toFixed(0)} ms (mediana de cinco cargas: ${firsts.map((ms) => ms.toFixed(0)).join(", ")}; objetivo: menos de 100) y sus capas llegan a los ${paint.images.toFixed(0)} ms, sin esperar al 3D ni a la tipografía`);
 const shown = await page.evaluate(() => [".ld-brand", ".ld-info"].map((selector) => getComputedStyle(document.querySelector(selector)).opacity).join("/"));
 check(shown === "1/1", `el nombre, el porcentaje y el mensaje aparecen al llegar la tipografía, a los ${paint.text.toFixed(0)} ms (opacidad ${shown}); nunca se ven con otra letra`);
 check(requested.length === 4, `la pantalla pide 4 imágenes (${requested.join(", ")})`);
 const s = await measure(page);
 check(Math.abs(s.astro / s.ground - 1) < 0.02 && Math.abs(s.woody / s.ground - 1) < 0.02, `los pies no patinan: el suelo pasa a ${s.ground.toFixed(2)} m/s, el astronauta anda a ${s.astro.toFixed(2)} y Woody trota a ${s.woody.toFixed(2)} (ciclos de ${s.cycles.astro.toFixed(2)} y ${s.cycles.woody.toFixed(2)} s; vuelta del planeta, ${s.cycles.globe.toFixed(0)} s)`);
 check(s.woodyBox.left > s.astroBox.right - s.m * 0.2, `Woody va delante (a la derecha): astronauta hasta x ${s.astroBox.right.toFixed(0)}, Woody desde ${s.woodyBox.left.toFixed(0)}`);
 check(!s.overflow, "nada se sale de la pantalla (sin barras de desplazamiento)");
 check(s.info.top > s.horizon + s.m * 0.4, `el porcentaje, la barra y el texto van abajo, sobre el planeta (empiezan en y ${s.info.top.toFixed(0)}; el horizonte está en ${s.horizon.toFixed(0)})`);
 console.log(`     escritorio: 1 m = ${s.m.toFixed(0)} px; el astronauta mide ${(s.m * 1.22).toFixed(0)} px (${((s.m * 1.22 * 100) / 900).toFixed(0)} % del alto)`);
 // Seis fotogramas seguidos del bucle (cada 0,37 s: los dos ciclos de paso caen en fases distintas).
 for (let i = 0; i < 6; i++) {
  await freeze(page, i * 370);
  await shot(page, `carga-escritorio-${i + 1}-${tag}`);
  // Detalle de los caminantes, ampliado: para ver las fases del paso.
  await shot(page, `carga-detalle-${i + 1}-${tag}`, { x: 720 - s.m * 2.3, y: s.horizon - s.m * 1.75, width: s.m * 4.6, height: s.m * 2.3 });
 }
 // Y tres más separados, para ver lo que va despacio: el giro del planeta y las capas del cielo.
 for (const [i, seconds] of [[1, 0], [2, 7], [3, 14]]) {
  await freeze(page, seconds * 1000);
  await shot(page, `carga-escritorio-largo-${i}-${tag}`);
 }
 // La barra a medias y llena, como las pone src/ui/loaderControl.js.
 for (const [value, text] of [[50, "Despertando el bosque…"], [100, ""]]) {
  await page.evaluate((value, text) => {
   document.getElementById("loader-number").textContent = String(value);
   document.getElementById("loader-bar").style.transform = `scaleX(${value / 100})`;
   document.getElementById("loader-step").textContent = text;
  }, value, text);
  await freeze(page, 2500 + value * 20);
  await shot(page, `carga-escritorio-${String(value).padStart(3, "0")}-${tag}`);
 }
 // Las animaciones corren solas (no solo al pararlas a mano): dos lecturas separadas difieren.
 await page.evaluate(() => document.getAnimations().forEach((animation) => animation.play()));
 const read = () => page.evaluate(() => [".ld-globe", ".ld-astro img", ".ld-woody img", ".ld-drift--near"].map((selector) => getComputedStyle(document.querySelector(selector)).transform));
 const first = await read();
 await wait(700);
 const second = await read();
 check(first.every((value, i) => value !== second[i]), "el planeta, los dos ciclos de paso y las nubes se mueven solos");
 // Nubes low poly (objetivo 27): SVG facetado en línea, de tres profundidades, y ninguna pasa
 // nunca por delante (ni por detrás) del astronauta, de Woody o del porcentaje: se mira el bucle
 // entero de la capa más lenta, en 48 instantes.
 const clouds = await page.evaluate(() => [...document.querySelectorAll(".ld-cloud")].map((cloud) => ({ layer: cloud.parentElement.className.match(/ld-drift--(\w+)/)[1], width: cloud.getBoundingClientRect().width, facets: cloud.querySelector("use") ? document.querySelector(cloud.querySelector("use").getAttribute("href")).querySelectorAll("path").length : 0 })));
 const widths = Object.fromEntries(["far", "mid", "near"].map((layer) => [layer, Math.max(...clouds.filter((cloud) => cloud.layer === layer).map((cloud) => cloud.width))]));
 check(clouds.length >= 3 && clouds.length <= 4 && clouds.every((cloud) => cloud.facets >= 10) && widths.far < widths.mid && widths.mid < widths.near, `${clouds.length} nubes facetadas (${clouds.map((cloud) => `${cloud.layer} ${cloud.width.toFixed(0)} px`).join(", ")}): las lejanas, más pequeñas`);
 let touching = [];
 for (let i = 0; i < 48; i++) {
  await freeze(page, (i / 48) * 190000);
  touching = touching.concat(await page.evaluate(() => {
   const boxes = { astronauta: ".ld-astro .ld-cell", Woody: ".ld-woody .ld-cell", porcentaje: ".ld-info" };
   const hits = [];
   for (const cloud of document.querySelectorAll(".ld-cloud")) {
    const a = cloud.getBoundingClientRect();
    for (const [name, selector] of Object.entries(boxes)) {
     const b = document.querySelector(selector).getBoundingClientRect();
     if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) hits.push(name);
    }
   }
   return hits;
  }));
 }
 check(touching.length === 0, `en todo el bucle (190 s, 48 instantes) ninguna nube toca al astronauta, a Woody ni al porcentaje${touching.length ? ` (toca: ${[...new Set(touching)].join(", ")})` : ""}`);
 await page.close();
}

// ── Móvil vertical ───────────────────────────────────────────────────────────
{
 const { page } = await open({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
 const s = await measure(page);
 // La escena: desde lo más alto del sol o de las cabezas hasta el pie de la pantalla (el planeta llega abajo).
 const top = Math.min(s.sunTop, s.astroBox.top);
 const share = ((844 - top) / 844) * 100;
 check(share >= 40, `en móvil vertical la escena ocupa el ${share.toFixed(0)} % del alto (mínimo 40): de y ${top.toFixed(0)} a ${844}`);
 check(s.astroBox.left > 0 && s.woodyBox.right < 390, `y los dos caminantes caben enteros (de x ${s.astroBox.left.toFixed(0)} a ${s.woodyBox.right.toFixed(0)} de 390)`);
 check(s.sunVisible > 0.6, `el sol se ve (${(s.sunVisible * 100).toFixed(0)} % de su ancho dentro de la pantalla)`);
 check(!s.overflow, "nada se sale de la pantalla");
 console.log(`     móvil: 1 m = ${s.m.toFixed(0)} px; el astronauta mide ${(s.m * 1.22).toFixed(0)} px (${((s.m * 1.22 * 100) / 844).toFixed(0)} % del alto)`);
 for (const [i, ms] of [[1, 0], [2, 740], [3, 7000]]) {
  await freeze(page, ms);
  await shot(page, `carga-movil-${i}-${tag}`);
 }
 await page.close();
}

// ── El fundido real: carga normal, una captura cada ~90 ms desde que el número pasa de 80 ──
{
 const page = await browser.newPage();
 await page.setViewport({ width: 1440, height: 900 });
 const errors = [];
 page.on("pageerror", (error) => errors.push(error.message));
 await page.goto(BASE, { waitUntil: "domcontentloaded" });
 await page.waitForFunction(() => Number(document.getElementById("loader-number")?.textContent ?? 100) >= 80 || !document.getElementById("loader"), { polling: 16, timeout: 60000 });
 const states = [];
 for (let i = 0; i < 12; i++) {
  states.push(await page.evaluate(() => { const l = document.getElementById("loader"); return l ? `${document.getElementById("loader-number").textContent} %/${(+getComputedStyle(l).opacity).toFixed(2)}` : "retirada"; }));
  await page.screenshot({ path: `${out}carga-fundido-${String(i).padStart(2, "0")}-${tag}.jpg`, type: "jpeg", quality: 70 });
  await wait(40);
 }
 await page.waitForFunction(() => !document.getElementById("loader"), { timeout: 60000 });
 check(errors.length === 0, `con la carga real, la pantalla llega al 100 %, se funde con la bienvenida y se retira (${states.join(" → ")})`);
}
await browser.close();
if (failed) process.exitCode = 1;
