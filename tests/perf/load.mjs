// Mide la carga de verdad: build de producción (npx vite preview --port 5198),
// primera visita sin caché. Saca los hitos, las tareas largas del hilo
// principal y en qué funciones se va la CPU.
//   node tests/perf/load.mjs [url] [ralentización de CPU, p. ej. 4]
import puppeteer from "puppeteer-core";

const url = process.argv[2] ?? "http://localhost:5198/";
const throttle = Number(process.argv[3] ?? 1);
const browser = await puppeteer.launch({
 executablePath: process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
 headless: "new",
 args: ["--enable-gpu", "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu", "--enable-features=WebGPU"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.setCacheEnabled(false);
const client = await page.createCDPSession();
if (throttle > 1) await client.send("Emulation.setCPUThrottlingRate", { rate: throttle });
await client.send("Profiler.enable");
await client.send("Profiler.setSamplingInterval", { interval: 500 });
await page.evaluateOnNewDocument(() => {
 window.__long = [];
 new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ entryTypes: ["longtask"] });
 window.__marks = {};
 const started = performance.now();
 // Hitos visibles: primera pintura con contenido, portada interactiva, cargador retirado.
 const watch = setInterval(() => {
  const now = Math.round(performance.now() - started);
  if (!window.__marks.cargador && document.querySelector("#loader")) window.__marks.cargador = now;
  if (!window.__marks.bienvenida && window.__marks.cargador && document.querySelector("#loader.is-leaving, body:not(:has(#loader))")) window.__marks.bienvenida = now;
  const enter = document.querySelector(".overlay__enter");
  if (!window.__marks.entrar && enter && !enter.disabled) {
   window.__marks.entrar = now;
   clearInterval(watch);
  }
 }, 16);
});
await client.send("Profiler.start");
const t0 = Date.now();
await page.goto(url, { waitUntil: "load", timeout: 120000 });
const loadEvent = Date.now() - t0;
await page.waitForFunction(() => window.__marks.entrar, { timeout: 180000, polling: 50 });
const total = Date.now() - t0;
const { profile } = await client.send("Profiler.stop");
const marks = await page.evaluate(() => ({ marks: window.__marks, long: window.__long, custom: performance.getEntriesByType("mark").map((m) => [m.name, Math.round(m.startTime)]), memory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, fcp: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? -1) }));

// CPU por función (tiempo propio), agrupada.
const self = new Map();
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => {
 const node = byId.get(id);
 const f = node.callFrame;
 const key = `${f.functionName || "(anónima)"} ${f.url.split("/").pop().split("?")[0]}:${f.lineNumber}`;
 self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0) / 1000);
});
const top = [...self.entries()].filter(([k]) => !k.startsWith("(idle)") && !k.startsWith("(program)")).sort((a, b) => b[1] - a[1]).slice(0, 22);
const longTotal = marks.long.reduce((s, [, d]) => s + d, 0);
console.log(`ralentización de CPU ×${throttle}`);
console.log(`evento load: ${loadEvent} ms · primera pintura: ${marks.fcp} ms · portada lista para entrar: ${total} ms`);
console.log("hitos (ms):", JSON.stringify(marks.marks), "marcas propias:", JSON.stringify(marks.custom));
console.log(`tareas largas: ${marks.long.length}, suman ${longTotal} ms; la mayor ${Math.max(0, ...marks.long.map(([, d]) => d))} ms · memoria JS ${marks.memory} MB`);
console.log("mayores tareas [inicio, duración]:", JSON.stringify([...marks.long].sort((a, b) => b[1] - a[1]).slice(0, 8)));
console.log("CPU por función (ms de tiempo propio):");
for (const [name, ms] of top) console.log(`  ${ms.toFixed(0).padStart(6)}  ${name}`);
await browser.close();
