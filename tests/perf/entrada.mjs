// Primera visita y entrada al planeta, vistas y medidas. Dos pasadas, cada una
// con un Chrome nuevo y sin caché:
//   1. medida: hitos de carga, y tirones (huecos entre fotogramas y tareas
//      largas) antes y después de pulsar para entrar; sin capturas, que estorban;
//   2. capturas: a 0,5 / 1 / 2 / 4 / 8 s de abrir y una ráfaga tras el clic.
//   node tests/perf/entrada.mjs [url] [carpeta de capturas]
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const url = process.argv[2] ?? "http://localhost:5199/";
const out = process.argv[3] ?? "capturas/7-carga";
fs.mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function open() {
 const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--enable-gpu", "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu", "--enable-features=WebGPU"],
 });
 const page = await browser.newPage();
 await page.setViewport({ width: 1440, height: 900 });
 await page.setCacheEnabled(false);
 const logs = [];
 page.on("console", (message) => ["error", "warning", "warn"].includes(message.type()) && logs.push(`[${message.type()}] ${message.text().slice(0, 300)}`));
 page.on("pageerror", (error) => logs.push(`[pageerror] ${String(error).slice(0, 300)}`));
 await page.evaluateOnNewDocument(() => {
  window.__long = [];
  new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ entryTypes: ["longtask"] });
  window.__gaps = [];
  let last = performance.now();
  const loop = () => {
   const now = performance.now();
   if (now - last > 40) window.__gaps.push([Math.round(last), Math.round(now - last)]);
   last = now;
   requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
 });
 return { browser, page, logs };
}
const enabled = () => {
 const button = document.querySelector(".overlay__enter");
 return button && !button.disabled;
};

// 1. Medida.
{
 const { browser, page, logs } = await open();
 const t0 = Date.now();
 await page.goto(url, { waitUntil: "load", timeout: 120000 });
 await page.waitForFunction(enabled, { timeout: 180000, polling: 50 });
 const ready = Date.now() - t0;
 const before = await page.evaluate(() => ({ now: Math.round(performance.now()), marks: performance.getEntriesByType("mark").map((m) => [m.name, Math.round(m.startTime)]), long: window.__long, gaps: window.__gaps }));
 await page.mouse.click(720, 450);
 await wait(9000);
 const after = await page.evaluate((from) => ({ long: window.__long.filter(([s]) => s >= from).map(([s, d]) => [s - from, d]), gaps: window.__gaps.filter(([s]) => s >= from).map(([s, d]) => [s - from, d]) }), before.now);
 console.log(`${url} · botón habilitado a los ${ready} ms`);
 console.log("marcas:", JSON.stringify(before.marks));
 console.log("antes de entrar · tareas largas [inicio, ms]:", JSON.stringify(before.long));
 console.log("antes de entrar · huecos >40 ms:", JSON.stringify(before.gaps));
 console.log("tras el clic · tareas largas [ms desde el clic, ms]:", JSON.stringify(after.long));
 console.log("tras el clic · huecos >40 ms:", JSON.stringify(after.gaps));
 console.log(`consola: ${logs.length} avisos o errores`);
 for (const line of new Set(logs)) console.log("  ", line);
 await browser.close();
}

// 2. Capturas.
{
 const { browser, page } = await open();
 const t0 = Date.now();
 const shot = (name) => page.screenshot({ path: path.join(out, `${name}.png`) }).catch(() => {});
 const loading = page.goto(url, { waitUntil: "load", timeout: 120000 }).catch(() => {});
 for (const at of [500, 1000, 2000, 4000, 8000]) {
  await wait(Math.max(0, at - (Date.now() - t0)));
  await shot(`carga-${String(at).padStart(4, "0")}ms`);
 }
 await loading;
 await page.waitForFunction(enabled, { timeout: 180000, polling: 50 });
 await shot("listo-para-entrar");
 await page.mouse.click(720, 450);
 const click = Date.now();
 for (let i = 0; i < 22; i++) {
  await shot(`entrada-${String(Date.now() - click).padStart(4, "0")}ms`);
  await wait(120);
 }
 await wait(Math.max(0, 6000 - (Date.now() - click)));
 await shot("entrada-6000ms");
 await browser.close();
 console.log(`capturas en ${out}`);
}
