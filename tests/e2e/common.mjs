// Utilidades de las pruebas de extremo a extremo. Abren el portfolio en el
// Chrome del sistema (sin ventana) contra el servidor de desarrollo:
//
//   npm run dev -- --port 5199      (en otra terminal)
//   node tests/e2e/<prueba>.mjs
//
// Variables: E2E_URL (por defecto http://localhost:5199/), CHROME (ruta al
// ejecutable), E2E_SHOTS (carpeta para capturas; por defecto, la temporal),
// E2E_HEADFUL=1 (Chrome con ventana, como lo ve una persona).
//
// Cualquier excepción de la página es un FALLO de la prueba que la vea, con
// su traza: una sola a mitad del dibujado puede dejar el lienzo en blanco.
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { CHROME, GPU_ARGS } from "../chrome.mjs";

export const BASE = process.env.E2E_URL ?? "http://localhost:5199/";
export const out = (process.env.E2E_SHOTS ?? path.join(os.tmpdir(), "portfolio-e2e")) + "/";
fs.mkdirSync(out, { recursive: true });

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let failures = 0;
export const check = (ok, text) => {
 if (!ok) failures += 1;
 console.log(`${ok ? "OK   " : "FALLO"} ${text}`);
};

const MOBILE_UA =
 "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Abre la página, espera a que termine la carga y devuelve utilidades.
// `uncapped`: sin límite de 60 fps, para medir rendimiento real.
// `tips`: con los consejos de Woody activados (bienvenida y frases de zona).
// Por defecto van apagados: las demás pruebas no esperan a que termine de hablar.
// `early`: no espera a que el planeta esté listo (para ver la bienvenida mientras se prepara).
// `headful`: con ventana y sin opciones gráficas forzadas, como el Chrome de un visitante.
export async function open({ mobile = false, viewport, query = "", uncapped = false, tips = false, early = false, headful = !!process.env.E2E_HEADFUL } = {}) {
 const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: headful ? false : "new",
  args: [
   ...(headful ? ["--window-size=1480,1040"] : GPU_ARGS),
   ...(uncapped ? ["--disable-frame-rate-limit", "--disable-gpu-vsync"] : []),
  ],
 });
 const page = await browser.newPage();
 if (mobile) await page.setUserAgent(MOBILE_UA);
 await page.setViewport(
  viewport ??
   (mobile
    ? { width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true }
    : { width: 1440, height: 900 }),
 );
 const logs = [];
 page.on("console", (message) => {
  // Avisos conocidos de three que no dependen de este proyecto.
  if (["error", "warning"].includes(message.type()) && !/Clock|PCFSoft/.test(message.text())) logs.push(message.text().slice(0, 300));
 });
 const pageErrors = [];
 page.on("pageerror", (error) => pageErrors.push(`${error.message.slice(0, 300)}\n${(error.stack ?? "").split("\n").slice(1, 9).join("\n")}`));
 // Cada prueba parte de cero: sin tema, ajustes ni logros guardados.
 await page.evaluateOnNewDocument((tips) => {
  try {
   // (Salvo que la prueba pida conservarlo, para comprobar que algo persiste.)
   if (!sessionStorage.getItem("e2e-conservar")) {
    localStorage.clear();
    localStorage.setItem("woody-consejos", tips ? "on" : "off");
   }
  } catch {
   // Sin almacenamiento no hay nada que limpiar.
  }
 }, tips);
 // El mundo sigue la hora del visitante: las pruebas la fijan (mediodía, salvo que pidan otra) para no depender de cuándo se pasan.
 await page.goto(BASE + (/[?&]hora=/.test(query) ? query : `${query}${query.includes("?") ? "&" : "?"}hora=12:00`), { waitUntil: "load", timeout: 60000 });
 const startedAt = Date.now();
 await page.waitForFunction(() => !document.querySelector("#loader"), { timeout: 90000 });
 // La bienvenida ya se ve; se espera además a que el planeta esté listo para entrar (si lo hay).
 if (!early) await page.waitForFunction(() => { const enter = document.querySelector(".overlay__enter"); return !enter || !enter.disabled; }, { timeout: 90000 });
 if (process.env.E2E_DEBUG) console.log(`carga: ${((Date.now() - startedAt) / 1000).toFixed(1)} s · backend: ${await page.evaluate(() => window.__world?.backend)}`);
 await wait(400);

 const evaluate = (fn, ...args) => page.evaluate(fn, ...args);
 const round = (value) => +value.toFixed(2);
 return {
  browser,
  page,
  logs,
  pageErrors,
  evaluate,
  shot: (name) => page.screenshot({ path: `${out}${name}.jpg`, type: "jpeg", quality: 82 }),
  text: (selector) => evaluate((selector) => document.querySelector(selector)?.textContent ?? null, selector),
  // La interfaz del juego es 3D (tarjetas dentro del mundo): se lee de su estado.
  hint: () => evaluate(() => window.__world.ui3d.hint?.text ?? null),
  hintAt: () => evaluate(() => { const h = window.__world.ui3d.hint; return h ? [h.x, h.y, h.z] : null; }),
  toasts: () => evaluate(() => window.__world.ui3d.toasts.map((toast) => toast.text)),
  achievement: () => evaluate(() => window.__world.ui3d.achievement?.name ?? null),
  speech: () => evaluate(() => window.__world.ui3d.speech?.text ?? null),
  center: (selector) =>
   evaluate((selector) => {
    const rect = document.querySelector(selector)?.getBoundingClientRect();
    return rect ? [rect.x + rect.width / 2, rect.y + rect.height / 2] : null;
   }, selector),
  // Entra desde la pantalla de inicio.
  enter: async () => {
   await page.click(".overlay__enter");
   // La primera vez la cámara baja del islote de bienvenida: se espera a que llegue.
   await page.waitForFunction(() => window.__world.rig.intro === 0, { timeout: 15000 });
   await wait(500);
  },
  pos: async () => {
   const p = await evaluate(() => {
    const p = window.__world.player.position;
    return [p.x, p.y, p.z];
   });
   return { x: round(p[0]), y: round(p[1]), z: round(p[2]) };
  },
  woody: async () => {
   const w = await evaluate(() => {
    const w = window.__world.woody;
    const b = window.__world.woodyBrain;
    return { x: w.position.x, y: w.position.y, z: w.position.z, mode: b.mode, posture: b.posture, speed: b.speed, waiting: b.waiting };
   });
   return { ...w, x: round(w.x), y: round(w.y), z: round(w.z), speed: round(w.speed) };
  },
  // Coloca al jugador (y, salvo que se diga lo contrario, a Woody a su lado).
  put: async (x, z, { withWoody = true, settle = 900 } = {}) => {
   await evaluate(
    (x, z, withWoody) => {
     const w = window.__world;
     const y = w.world().height(x, z);
     w.player.position.set(x, y, z);
     w.player.velocity.set(0, 0, 0);
     if (withWoody) w.woody.position.set(x + 1.6, w.world().height(x + 1.6, z + 0.6), z + 0.6);
    },
    x,
    z,
    withWoody,
   );
   await wait(settle);
  },
  // Sigue a Woody mientras guía: en cada paso se pulsa hacia donde está.
  // `each(i)`: se llama en cada paso (para sacar capturas). Devuelve si llegó.
  followWoody: async ({ run = false, steps = 220, each } = {}) => {
   const held = new Set();
   let arrived = false;
   if (run) await page.keyboard.down("ShiftLeft");
   for (let i = 0; i < steps && !arrived; i++) {
    const { wx, wz, px, pz, mode } = await evaluate(() => {
     const w = window.__world;
     return { wx: w.woody.position.x, wz: w.woody.position.z, px: w.player.position.x, pz: w.player.position.z, mode: w.woodyBrain.mode };
    });
    const want = new Set();
    if (wz < pz - 0.8) want.add("KeyW");
    else if (wz > pz + 0.8) want.add("KeyS");
    if (wx < px - 0.8) want.add("KeyA");
    else if (wx > px + 0.8) want.add("KeyD");
    for (const key of held) if (!want.has(key)) (await page.keyboard.up(key), held.delete(key));
    for (const key of want) if (!held.has(key)) (await page.keyboard.down(key), held.add(key));
    await wait(200);
    await each?.(i);
    arrived = mode === "follow";
   }
   for (const key of held) await page.keyboard.up(key);
   if (run) await page.keyboard.up("ShiftLeft");
   return arrived;
  },
  // Pone el momento del día pedido («day», «dusk» o «night») con la tecla N, como lo haría una persona. Devuelve el que queda.
  moment: async (name, settle = 2600) => {
   const now = () => page.evaluate(() => document.documentElement.dataset.momento);
   for (let i = 0; i < 3 && (await now()) !== name; i++) await page.keyboard.press("KeyN");
   await wait(settle);
   return now();
  },
  hold: async (code, ms) => {
   await page.keyboard.down(code);
   await wait(ms);
   await page.keyboard.up(code);
   await wait(450);
  },
  // Proyecta un punto del mundo a píxeles de pantalla con las matrices de la cámara.
  screen: (x, y, z) =>
   evaluate(
    (x, y, z) => {
     const camera = window.__world.camera;
     camera.updateMatrixWorld();
     const mul = (m, v) => [0, 1, 2, 3].map((r) => m[r] * v[0] + m[r + 4] * v[1] + m[r + 8] * v[2] + m[r + 12] * v[3]);
     const v = mul(camera.projectionMatrix.elements, mul(camera.matrixWorldInverse.elements, [x, y, z, 1]));
     return [((v[0] / v[3]) * 0.5 + 0.5) * innerWidth, (1 - ((v[1] / v[3]) * 0.5 + 0.5)) * innerHeight];
    },
    x,
    y,
    z,
   ),
  fps: (seconds = 2) =>
   evaluate(
    (seconds) =>
     new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      const tick = () => {
       frames += 1;
       if (performance.now() - start < seconds * 1000) requestAnimationFrame(tick);
       else resolve(Math.round(frames / seconds));
      };
      requestAnimationFrame(tick);
     }),
    seconds,
   ),
  done: async () => {
   check(pageErrors.length === 0, `sin excepciones de página${pageErrors.length ? ` — ${pageErrors.length}:` : ""}`);
   for (const one of [...new Set(pageErrors)]) console.log(one.replace(/^/gm, "       "));
   console.log(logs.length ? [...new Set(logs)].join("\n") : "sin errores ni avisos en consola");
   await browser.close();
   if (failures || logs.length) process.exitCode = 1;
  },
 };
}
