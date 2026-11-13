// La pantalla previa al aterrizaje (el islote nocturno). Comprueba:
//  · que la pantalla de carga no se retira hasta que el planeta está listo, de
//    modo que al verse la portada ya se puede entrar;
//  · la indicación de entrada (texto y flecha de galones, sin botón), y que se
//    entra con un clic en ella, en cualquier parte y con Enter;
//  · el tiempo entre el clic y el inicio del descenso (objetivo: < 100 ms);
//  · la luna (mayor, gira), el planeta de destino (gira), luciérnagas, polvo y
//    estrellas fugaces cada 4–8 s.
// Y saca capturas: escritorio, móvil, ocho fotogramas seguidos con flecha,
// estrella fugaz y planeta, y recortes de la luna y del planeta.
//   node tests/e2e/welcome.mjs [etiqueta]
import puppeteer from "puppeteer-core";
import { CHROME, GPU_ARGS } from "../chrome.mjs";
import { BASE, check as report, out, wait } from "./common.mjs";

const tag = process.argv[2] ?? "ahora";
let failed = 0;
const check = (ok, text) => {
 if (!ok) failed += 1;
 report(ok, text);
};
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: GPU_ARGS });
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

// Abre la página y vigila, desde antes de que arranque, el instante en que la
// pantalla de carga empieza a retirarse y cómo estaba la entrada en ese momento.
async function open(viewport, { watch = true } = {}) {
 const page = await browser.newPage();
 await page.setViewport(viewport);
 const logs = [];
 page.on("console", (message) => ["error", "warning"].includes(message.type()) && !/Clock|PCFSoft/.test(message.text()) && logs.push(message.text().slice(0, 200)));
 page.on("pageerror", (error) => logs.push("[pageerror] " + error.message.slice(0, 200)));
 await page.evaluateOnNewDocument((watch) => {
  try {
   localStorage.clear();
   localStorage.setItem("woody-consejos", "off");
  } catch {
   // Sin almacenamiento no hay nada que limpiar.
  }
  if (!watch) return;
  window.__leave = null;
  const look = () => {
   const loader = document.getElementById("loader");
   if (loader && !loader.classList.contains("is-leaving")) return requestAnimationFrame(look);
   const enter = document.querySelector(".overlay__enter");
   window.__leave = { at: performance.now(), enabled: Boolean(enter) && !enter.disabled, text: enter?.textContent ?? null, player: Boolean(window.__world?.camera), arrow: Boolean(document.querySelector(".landing__chevron")) };
  };
  document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(look));
 }, watch);
 await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
 await page.waitForFunction(() => !document.querySelector("#loader"), { timeout: 90000 });
 return { page, logs };
}

// Mide, dentro de la página, lo que pasa entre el gesto de entrar y el inicio
// del descenso: el instante del evento, el primer fotograma en que la cámara ya
// ha empezado a bajar (`rig.intro` < 1) y la tarea más larga de ese tramo.
const armLatency = (page) =>
 page.evaluate(() => {
  const w = window.__world;
  const result = (window.__latency = { event: null, moved: null, frames: [], tasks: [] });
  // Las tareas largas se anotan todas: el navegador las comunica con retraso.
  new PerformanceObserver((list) => list.getEntries().forEach((entry) => result.tasks.push([entry.startTime, entry.duration]))).observe({ entryTypes: ["longtask"] });
  const onGesture = (event) => {
   if (result.event !== null || (event.type === "keydown" && event.key !== "Enter")) return;
   result.event = event.timeStamp;
   // (El reloj se lee al ejecutarse el fotograma: la marca que pasa el navegador
   // es la del inicio del fotograma y no cuenta lo que el hilo estuviera ocupado.)
   const frame = () => {
    const now = performance.now();
    result.frames.push(now);
    if (result.moved === null && w.rig.intro < 1) result.moved = now;
    if (result.frames.length < 40) requestAnimationFrame(frame);
   };
   requestAnimationFrame(frame);
  };
  window.addEventListener("click", onGesture, true);
  window.addEventListener("keydown", onGesture, true);
 });
// Devuelve: ms hasta el primer fotograma en que la cámara ya baja; la tarea
// larga (si la hay) que cae antes de ese fotograma; y, ya en pleno descenso, el
// mayor hueco entre fotogramas y la mayor tarea del primer medio segundo.
async function latency(page) {
 await page.waitForFunction(() => window.__latency.frames.length >= 40, { timeout: 8000 });
 await wait(300);
 return page.evaluate(() => {
  const { event, moved, frames, tasks } = window.__latency;
  const before = tasks.filter(([start]) => start + 1 >= event && start < moved).map(([, duration]) => duration);
  const after = tasks.filter(([start]) => start >= moved && start < event + 500).map(([start, duration]) => `${duration.toFixed(0)} ms a los ${(start - event).toFixed(0)}`);
  let gap = 0;
  for (let i = 1; i < frames.length; i++) if (frames[i] < event + 500) gap = Math.max(gap, frames[i] - frames[i - 1]);
  return { ms: moved - event, blocking: Math.max(0, ...before), after, gap };
 });
}
const told = (r) => `${r.ms.toFixed(0)} ms (ninguna tarea larga antes de ese fotograma: ${r.blocking === 0}; después, mayor hueco entre fotogramas en el primer medio segundo: ${r.gap.toFixed(0)} ms${r.after.length ? `; tareas largas ya en descenso: ${r.after.join(", ")}` : ""})`;

// ── Escritorio: la carga espera al planeta; la indicación; el cielo ──────────
{
 const { page, logs } = await open(DESKTOP);
 const leave = await page.evaluate(() => window.__leave);
 check(leave?.enabled && leave.player, `la pantalla de carga no empieza a retirarse hasta que se puede entrar: en ese instante (${leave?.at.toFixed(0)} ms) la entrada está habilitada (${leave?.enabled}) y el planeta montado (${leave?.player})`);
 check(leave?.text === "Haz clic para aterrizar" && leave.arrow, `y la portada nunca muestra «Preparando el planeta…»: lo primero que se lee es «${leave?.text}», con la flecha`);
 await wait(900); // el fundido de la carga

 const hint = await page.evaluate(() => {
  const enter = document.querySelector(".overlay__enter");
  const style = getComputedStyle(enter);
  const chevrons = [...document.querySelectorAll(".landing__chevron")];
  const text = document.querySelector(".landing__text").getBoundingClientRect();
  const arrow = document.querySelector(".landing__arrow").getBoundingClientRect();
  return {
   background: style.backgroundColor,
   radius: style.borderTopLeftRadius,
   shadow: style.boxShadow,
   chevrons: chevrons.length,
   stroke: getComputedStyle(chevrons[0]).stroke,
   animation: getComputedStyle(chevrons[0]).animationName,
   delays: chevrons.map((one) => getComputedStyle(one).animationDelay),
   halo: getComputedStyle(document.querySelector(".landing__arrow"), "::before").animationName,
   below: arrow.top >= text.bottom - 1,
   box: enter.getBoundingClientRect().toJSON(),
  };
 });
 check(hint.background === "rgba(0, 0, 0, 0)" && hint.shadow === "none", `ya no hay botón naranja en forma de píldora: la indicación no tiene fondo (${hint.background}) ni sombra (${hint.shadow})`);
 check(hint.chevrons === 3 && hint.below && hint.stroke === "rgb(255, 107, 44)" && hint.animation === "landing-fall" && new Set(hint.delays).size === 3, `debajo del texto, tres galones naranjas (${hint.stroke}) que bajan en bucle con desvanecido, uno cada medio segundo (${hint.delays.join(", ")})`);
 check(hint.halo === "landing-halo", "y un halo suave detrás, que late");
 // Los galones se mueven: su posición y opacidad cambian entre dos lecturas.
 const sample = () => page.evaluate(() => [...document.querySelectorAll(".landing__chevron")].map((one) => `${one.getBoundingClientRect().top.toFixed(1)}/${(+getComputedStyle(one).opacity).toFixed(2)}`).join(" "));
 const first = await sample();
 await wait(350);
 const second = await sample();
 check(first !== second, `la flecha se mueve (y/opacidad de cada galón: ${first} → ${second})`);

 // El cielo: luna, planeta, luciérnagas, polvo.
 const sky = () =>
  page.evaluate(() => {
   const w = window.__world;
   const project = (object, radius) => {
    const camera = w.camera;
    const centre = object.getWorldPosition(new camera.position.constructor());
    const edge = centre.clone().add(new camera.position.constructor(0, radius, 0));
    const toScreen = (v) => { const p = v.clone().project(camera); return [((p.x + 1) / 2) * innerWidth, ((1 - p.y) / 2) * innerHeight]; };
    const [x, y] = toScreen(centre);
    return { x, y, r: Math.abs(toScreen(edge)[1] - y) };
   };
   const counts = {};
   w.scene.traverse((object) => object.isInstancedMesh && object.geometry.type === "OctahedronGeometry" && (counts[object.geometry.parameters.radius] = object.count));
   return { moon: { ...project(w.moon, w.moon.scale.x), scale: w.moon.scale.x, turn: w.moon.rotation.y, faces: w.moon.geometry.attributes.position.count / 3 }, globe: { ...project(w.destination.group, w.destination.group.scale.x), turn: w.destination.globe.rotation.y }, counts, shooting: w.shooting.count };
  });
 const a = await sky();
 await wait(3000);
 const b = await sky();
 check(a.moon.r * 2 > 900 * 0.24 && a.moon.y - a.moon.r > -a.moon.r * 0.25 && a.moon.faces >= 1500, `la luna es más grande y detallada: ${(a.moon.r * 2).toFixed(0)} px de diámetro (${((a.moon.r * 200) / 900).toFixed(0)} % del alto; antes, ${((a.moon.r * 200 * 3.4) / a.moon.scale / 900).toFixed(0)} %), ${a.moon.faces} caras con 26 cráteres (antes 320 y 7), y entra en la pantalla (su borde alto, en y ${(a.moon.y - a.moon.r).toFixed(0)})`);
 check(b.moon.turn > a.moon.turn, `y gira muy despacio (${((b.moon.turn - a.moon.turn) * (180 / Math.PI) / 3).toFixed(2)}° por segundo)`);
 check(a.globe.x > 0 && a.globe.x < 1440 && a.globe.y > 0 && a.globe.y + a.globe.r < 900 && b.globe.turn > a.globe.turn, `el planeta The Living World se ve abajo (centro en ${a.globe.x.toFixed(0)}, ${a.globe.y.toFixed(0)}; ${(a.globe.r * 2).toFixed(0)} px) y gira despacio (${((b.globe.turn - a.globe.turn) * (180 / Math.PI) / 3).toFixed(1)}° por segundo)`);
 check(a.counts[0.04] === 34 && a.counts[0.022] === 130, `hay ${a.counts[0.04]} luciérnagas (antes 14) y ${a.counts[0.022]} motas de polvo luminoso (antes ninguna)`);

 await page.screenshot({ path: `${out}bienvenida-escritorio-${tag}.jpg`, type: "jpeg", quality: 90 });
 const cut = (name, { x, y, r }, pad) => page.screenshot({ path: `${out}bienvenida-${name}-${tag}.jpg`, type: "jpeg", quality: 92, clip: { x: Math.max(0, x - r * pad), y: Math.max(0, y - r * pad), width: r * pad * 2, height: r * pad * 2 } });
 await cut("luna", a.moon, 1.5);
 await cut("planeta", a.globe, 1.9);

 // Estrellas fugaces: se cuentan las que salen en 25 s y se mide cada cuánto.
 const seen = [];
 const started = Date.now();
 let last = (await sky()).shooting;
 while (Date.now() - started < 25000) {
  await wait(60);
  const now = await page.evaluate(() => window.__world.shooting.count);
  if (now !== last) {
   seen.push((Date.now() - started) / 1000);
   last = now;
  }
 }
 const gaps = seen.slice(1).map((time, i) => time - seen[i]);
 check(seen.length >= 3 && gaps.every((gap) => gap > 3.7 && gap < 8.4), `estrellas fugaces cada 4–8 s: ${seen.length} en 25 s, separadas ${gaps.map((gap) => gap.toFixed(1)).join(", ")} s`);

 // Ocho fotogramas seguidos, empezando justo cuando sale una estrella fugaz.
 await page.waitForFunction((count) => window.__world.shooting.count > count, { timeout: 12000, polling: "raf" }, last);
 let starSeen = 0;
 for (let i = 0; i < 8; i++) {
  const state = await page.evaluate(() => ({ active: window.__world.shooting.active, chevrons: [...document.querySelectorAll(".landing__chevron")].map((one) => (+getComputedStyle(one).opacity).toFixed(2)).join("/") }));
  await page.screenshot({ path: `${out}bienvenida-secuencia-${i + 1}-${tag}.jpg`, type: "jpeg", quality: 86 });
  starSeen += state.active ? 1 : 0;
  console.log(`     fotograma ${i + 1}: estrella fugaz ${state.active ? "en vuelo" : "no"} · opacidad de los galones ${state.chevrons}`);
 }
 check(starSeen >= 3, `la estrella fugaz está en vuelo en ${starSeen} de los 8 fotogramas`);
 check(logs.length === 0, logs.length ? `consola: ${logs.join(" | ")}` : "sin errores ni avisos en consola");

 // Clic sobre la indicación (pulsación de 90 ms, como la de una persona).
 await armLatency(page);
 await page.click(".overlay__enter", { delay: 90 });
 const clicked = await latency(page);
 check(clicked.ms < 100, `clic en la indicación → inicio del descenso: ${told(clicked)}`);
 await page.close();
}

// ── Cero espera: clic nada más verse la portada, en cualquier parte, y Enter ──
const times = [];
// Una persona tarda unos 60–120 ms entre pulsar y soltar; ahí se crea el contexto
// de audio (~80 ms la primera vez), antes de que llegue el clic. El último caso
// es el peor posible: pulsar y soltar en el mismo instante, como hace un programa.
for (const [how, act] of [
 ["clic en cualquier parte, nada más retirarse la carga", (page) => page.mouse.click(1100, 300, { delay: 90 })],
 ["tecla Enter, nada más retirarse la carga", (page) => page.keyboard.press("Enter")],
 ["clic en la indicación tras 1,5 s", (page) => page.click(".overlay__enter", { delay: 90 })],
 ["clic en la indicación tras 12 s", (page) => page.click(".overlay__enter", { delay: 90 })],
 ["peor caso: pulsar y soltar en el mismo instante", (page) => page.click(".overlay__enter")],
]) {
 const { page } = await open(DESKTOP, { watch: false });
 if (!/nada más/.test(how)) await wait(/12 s/.test(how) ? 12000 : 1500);
 await armLatency(page);
 await act(page);
 const result = await latency(page);
 times.push(result.ms);
 check(result.ms < 100, `${how} → inicio del descenso: ${told(result)}`);
 await page.close();
}
console.log(`     tiempos medidos entre el gesto y el inicio del descenso: ${times.map((ms) => ms.toFixed(0)).join(", ")} ms`);

// ── Móvil vertical ───────────────────────────────────────────────────────────
{
 const page = await browser.newPage();
 await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
 await page.setViewport(PHONE);
 await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
 await page.waitForFunction(() => !document.querySelector("#loader"), { timeout: 90000 });
 await wait(2200);
 const phone = await page.evaluate(() => {
  const enter = document.querySelector(".overlay__enter").getBoundingClientRect();
  const globe = window.__world.destination.group.getWorldPosition(new window.__world.camera.position.constructor()).project(window.__world.camera);
  return { text: document.querySelector(".landing__text").textContent, enter: enter.toJSON(), globe: [((globe.x + 1) / 2) * innerWidth, ((1 - globe.y) / 2) * innerHeight] };
 });
 check(phone.text === "Toca para aterrizar" && phone.enter.left >= 0 && phone.enter.right <= 390 && phone.enter.bottom < 844, `en móvil vertical la indicación dice «${phone.text}» y cabe entera (de x ${phone.enter.left.toFixed(0)} a ${phone.enter.right.toFixed(0)}, hasta y ${phone.enter.bottom.toFixed(0)})`);
 check(phone.globe[0] > 0 && phone.globe[0] < 390 && phone.globe[1] > 0 && phone.globe[1] < 844, `y el planeta de destino se ve (centro en ${phone.globe.map((v) => v.toFixed(0)).join(", ")})`);
 await page.screenshot({ path: `${out}bienvenida-movil-${tag}.jpg`, type: "jpeg", quality: 90 });
 await page.close();
}

await browser.close();
if (failed) process.exitCode = 1;
