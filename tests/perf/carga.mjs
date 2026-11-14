// La pantalla de carga, medida: primera visita sin caché. Saca
//   · el tiempo hasta poder entrar y las etapas;
//   · los parones del hilo principal (tareas largas de más de 50 ms): cuántos,
//     el peor y cuánto suman;
//   · los parones VISIBLES: huecos de más de 50 ms entre fotogramas que de
//     verdad llegan a la pantalla mientras está la carga. Salen de la traza de
//     Chrome: fotogramas que compone la página (DrawFrame, hilo compositor) y
//     fotogramas que presenta el proceso de GPU (Display::DrawAndSwap). Las
//     animaciones de la carga son CSS de transform y opacity, así que no
//     dependen del hilo principal; sí del compositor y del proceso de GPU.
//   node tests/perf/carga.mjs [url] [con-ventana] [pasadas=N] [traza=archivo.json]
// Por defecto va en Chrome SIN ventana (no molesta a quien esté usando el equipo).
// Desarrollo: http://localhost:5199/ · Producción: npm run build && npx vite preview --port 5198
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { CHROME, GPU_ARGS } from "../chrome.mjs";

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith("http")) ?? "http://localhost:5199/";
const headful = args.includes("con-ventana"); // solo a mano: abre una ventana de Chrome en el escritorio
const runs = Number(args.find((a) => a.startsWith("pasadas="))?.slice(8) ?? 1);
const traceFile = args.find((a) => a.startsWith("traza="))?.slice(6);
const profiled = args.includes("perfil"); // qué funciones ocupan cada tarea larga
const GAP = 50;

async function run() {
 const browser = await puppeteer.launch({ executablePath: CHROME, headless: headful ? false : "new", args: headful ? ["--window-size=1480,1040"] : GPU_ARGS });
 const page = await browser.newPage();
 await page.setViewport({ width: 1440, height: 900 });
 await page.setCacheEnabled(false);
 const errors = [];
 page.on("pageerror", (error) => errors.push(error.message.slice(0, 200)));
 await page.evaluateOnNewDocument(() => {
  window.__long = [];
  new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ entryTypes: ["longtask"] });
 });
 const client = await page.createCDPSession();
 if (profiled) {
  await client.send("Profiler.enable");
  await client.send("Profiler.setSamplingInterval", { interval: 1000 });
  await client.send("Profiler.start");
 }
 await page.tracing.start({ categories: ["blink.user_timing", "devtools.timeline", "disabled-by-default-devtools.timeline.frame", "viz", "cc", "benchmark", ...(traceFile ? ["toplevel", "gpu", "gpu.dawn", "disabled-by-default-gpu.dawn"] : [])] });
 await page.goto(url, { waitUntil: "load", timeout: 120000 });
 await page.waitForFunction(() => performance.getEntriesByName("carga:world").length > 0, { timeout: 180000, polling: 50 });
 const inPage = await page.evaluate(() => ({
  marks: performance.getEntriesByType("mark").filter((m) => m.name.startsWith("carga:")).map((m) => [m.name.slice(6), Math.round(m.startTime)]),
  long: window.__long,
  fcp: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? -1),
  skipped: window.__world?.skipped?.length ?? null,
  sync: window.__world?.syncPipelines ?? null,
  warm: window.__world?.warm ?? null,
 }));
 const profile = profiled ? (await client.send("Profiler.stop")).profile : null;
 const trace = JSON.parse(Buffer.from(await page.tracing.stop()).toString("utf8"));
 if (traceFile) fs.writeFileSync(traceFile, JSON.stringify(trace));
 await browser.close();

 const events = trace.traceEvents;
 // Origen de tiempos de la página y fin de la carga, en el reloj de la traza (µs).
 const mark = (name) => events.filter((e) => e.name === name && e.cat?.includes("blink.user_timing")).pop()?.ts;
 const start = mark("navigationStart");
 const end = mark("carga:world");
 const ready = inPage.marks.find(([name]) => name === "world")[1];
 // Se mide desde que la animación arranca (antes se ve su primer fotograma, quieto).
 const fcpTs = mark("carga:animada") ?? start + inPage.fcp * 1000;
 // Fotogramas vistos: cada serie, sus huecos dentro de la carga (desde que arranca la animación).
 const series = (name) => events.filter((e) => e.name === name && e.ts >= fcpTs && e.ts <= end).map((e) => e.ts).sort((a, b) => a - b);
 const gaps = (stamps) => {
  const list = [];
  let last = fcpTs;
  for (const ts of [...stamps, end]) {
   if (ts - last > GAP * 1000) list.push([Math.round((last - start) / 1000), Math.round((ts - last) / 1000)]);
   last = ts;
  }
  return list;
 };
 const long = inPage.long.filter(([s]) => s < ready);
 const report = (label, list) => `${label}: ${list.length} de más de ${GAP} ms${list.length ? `; el peor ${Math.max(...list.map(([, d]) => d))} ms; suman ${list.reduce((s, [, d]) => s + d, 0)} ms` : ""}`;
 const composed = series("DrawFrame");
 const shown = series("Display::DrawAndSwap");
 console.log(`${url} · Chrome ${headful ? "con" : "sin"} ventana`);
 console.log(`  se puede entrar a los ${(ready / 1000).toFixed(2)} s · primera pintura ${inPage.fcp} ms · etapas (ms): ${inPage.marks.map(([n, t]) => `${n} ${t}`).join(", ")}`);
 console.log(`  ${report("hilo principal, tareas largas", long)}`);
 if (long.length) console.log(`     las mayores [inicio, ms]: ${JSON.stringify([...long].sort((a, b) => b[1] - a[1]).slice(0, 10))}`);
 console.log(`  ${report(`fotogramas compuestos por la página (${composed.length})`, gaps(composed))}`);
 console.log(`  ${report(`fotogramas presentados en pantalla (${shown.length})`, gaps(shown))}`);
 const visible = gaps(shown.length ? shown : composed);
 if (visible.length) console.log(`     parones visibles [inicio, ms]: ${JSON.stringify(visible.slice(0, 40))}`);
 if (profile) {
  // Por cada tarea larga, las funciones del proyecto (o, si no hay, de las bibliotecas) con más tiempo dentro.
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  let at = profile.startTime;
  const samples = profile.samples.map((id, i) => ({ id, t: (at += profile.timeDeltas[i]) }));
  for (const [s, d] of [...long].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
   const from = start + s * 1000, to = from + d * 1000;
   const own = new Map(), any = new Map();
   for (const one of samples) {
    if (one.t < from || one.t > to) continue;
    const seen = new Set();
    for (let id = one.id; id; id = parent.get(id)) {
     const f = byId.get(id).callFrame;
     if (!f.url || f.url.includes("extension")) continue;
     const key = `${f.functionName || "(anónima)"} ${f.url.split("/").pop().split("?")[0]}:${f.lineNumber + 1}`;
     if (seen.has(key)) continue;
     seen.add(key);
     (f.url.includes("/src/") ? own : any).set(key, ((f.url.includes("/src/") ? own : any).get(key) ?? 0) + 1);
    }
   }
   const top = [...(own.size ? own : any)].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${k} ${n} ms`).join(" · ");
   console.log(`     tarea de ${d} ms a los ${s}: ${top}`);
  }
 }
 if (inPage.skipped !== null) console.log(`  dibujados aplazados por pipeline pendiente: ${inPage.skipped}`);
 if (inPage.sync) console.log(`  pipelines creados en síncrono (paran el proceso de GPU): ${inPage.sync.length}${inPage.sync.length ? ` → ${inPage.sync.join(", ")}` : ""}`);
 if (inPage.warm) console.log(`  precalentamiento (bienvenida, planeta): ${JSON.stringify(inPage.warm)}`);
 if (errors.length) console.log(`  EXCEPCIONES: ${errors.join(" | ")}`);
 return { ready, long, visible };
}

for (let i = 0; i < runs; i++) await run();
