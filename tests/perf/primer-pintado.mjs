// Primer pintado de la pantalla de carga (objetivo 27): cuánto tarda el
// navegador en pintar la escena, sin el código del juego (se retiene: solo
// cuentan el HTML, su estilo en línea —con las nubes SVG— y sus imágenes).
// Mediana de N cargas, sin caché. Para comparar dos versiones de index.html.
//   node tests/perf/primer-pintado.mjs [cargas=15] [url]
import puppeteer from "puppeteer-core";
import { CHROME, GPU_ARGS } from "../chrome.mjs";

const runs = Number(process.argv.find((a) => a.startsWith("cargas="))?.slice(7) ?? 15);
const url = process.argv.find((a) => a.startsWith("http")) ?? "http://localhost:5199/";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: GPU_ARGS });
const firsts = [], largest = [];
for (let i = 0; i < runs; i++) {
 const page = await browser.newPage();
 await page.setViewport({ width: 1440, height: 900 });
 await page.setCacheEnabled(false);
 await page.setRequestInterception(true);
 page.on("request", (request) => (/\/src\/main\.jsx/.test(request.url()) ? null : request.continue()));
 await page.evaluateOnNewDocument(() => {
  window.__lcp = 0;
  new PerformanceObserver((list) => list.getEntries().forEach((entry) => (window.__lcp = entry.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
 });
 page.goto(url, { timeout: 0 }).catch(() => {});
 await page.waitForFunction(() => performance.getEntriesByType("paint").some((entry) => entry.name === "first-contentful-paint"), { timeout: 15000 });
 await new Promise((resolve) => setTimeout(resolve, 600));
 const r = await page.evaluate(() => ({ fcp: performance.getEntriesByType("paint").find((entry) => entry.name === "first-contentful-paint").startTime, lcp: window.__lcp, bytes: document.documentElement.outerHTML.length }));
 if (i > 0) (firsts.push(r.fcp), largest.push(r.lcp)); // (la primera calienta el servidor)
 if (i === 0) console.log(`HTML: ${(r.bytes / 1000).toFixed(1)} kB`);
 await page.close();
}
const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
console.log(`primer pintado (mediana de ${firsts.length}): ${median(firsts).toFixed(0)} ms · mayor pintado: ${median(largest).toFixed(0)} ms · (de ${Math.min(...firsts).toFixed(0)} a ${Math.max(...firsts).toFixed(0)} ms)`);
await browser.close();
