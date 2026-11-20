// Capturas de The Cosmic Lab (mundo 3). Abre directamente en ese mundo
// (?world=cosmic, solo en desarrollo). No comprueba nada.
//   node tests/e2e/lab.mjs <carpeta> [qué]
//     qué: postal, puntos (llegada,nucleo,dosia,charca,fondo), maquina, salto, orbita, vuelta, tres; por defecto, todo menos «vuelta» y «tres»
//     («tres»: una captura de juego de cada mundo, en el mismo sitio —recién llegado, junto al cohete—, para verlos lado a lado.)
import fs from "node:fs";
import { open, wait } from "./common.mjs";
import { ANTENNA, CORE, MACHINES, POOLS } from "../../src/worlds/cosmic/layout.js";

const POINTS = {
 llegada: [0, 6.5],
 nucleo: [0.6, -9.6],
 dosia: [MACHINES.dosia.use.x + 0.4, MACHINES.dosia.use.z + 0.9],
 charca: [POOLS[0].x + 4.4, POOLS[0].z + 1.6],
 fondo: [ANTENNA.x + 1.6, ANTENNA.z + 4.4],
};
const folder = (process.argv[2] ?? "capturas/30-mundo3/B") + "/";
const what = process.argv[3] && process.argv[3] !== "-" ? process.argv[3].split(",") : ["postal", "puntos", "maquina", "salto", "orbita"];
fs.mkdirSync(folder, { recursive: true });
const shot = (t, name) => t.page.screenshot({ path: `${folder}${name}.jpg`, type: "jpeg", quality: 90 });
const HIDE = ".quick, .woody-menu, .sound-toggle, .theme-toggle { display: none !important; }";

if (what.includes("postal")) {
 // Tres cuartos desde arriba: el llano entero, con el núcleo en medio.
 const t = await open({ viewport: { width: 1600, height: 1000 }, query: "?world=cosmic" });
 await t.enter();
 await t.page.addStyleTag({ content: HIDE });
 for (const [name, yaw, lift, distance] of [["postal", -0.5, 0.95, 2.35], ["postal-este", 0.6, 0.8, 2.25]]) {
  await t.evaluate((yaw, lift, distance, core) => {
   const w = window.__world;
   // (Objetivo más abierto que el del juego, como en la postal del mundo 2: cabe el llano entero sin alejarse.)
   w.camera.fov = 58;
   w.camera.updateProjectionMatrix();
   w.player.position.set(-2.4, 0, 5.2);
   w.woody.position.set(-4, 0, 6);
   Object.assign(w.rig, { focus: { x: core.x, y: 1.5, z: core.z - 1 }, distance, lift, yaw, tilt: 0 });
  }, yaw, lift, distance, CORE);
  await wait(name === "postal" ? 7000 : 3200);
  await shot(t, name);
 }
 await t.browser.close();
}

if (what.includes("tres")) {
 for (const [name, query, x, z] of [["mundo1-juego", "", 2.2, 9.5], ["mundo2-juego", "?world=twisted", 2.6, 6.4], ["mundo3-juego", "?world=cosmic", 2.4, 7.4]]) {
  const one = await open({ viewport: { width: 1600, height: 900 }, query });
  await one.enter();
  await one.put(x, z, { settle: 5200 });
  await shot(one, name);
  await one.browser.close();
 }
}

const t = await open({ viewport: { width: 1600, height: 900 }, query: "?world=cosmic" });
await t.enter();
await wait(1200);
if (what.includes("puntos")) {
 for (const [name, [x, z]] of Object.entries(POINTS)) {
  await t.put(x, z, { settle: 3200 });
  await shot(t, `${name}-juego`);
 }
}
if (what.includes("salto")) {
 // La gravedad baja: tres fotogramas de un salto junto al núcleo.
 await t.put(3.4, -8.6, { settle: 1500 });
 await t.page.keyboard.press("Space");
 for (const [name, ms] of [["salto-1", 450], ["salto-2", 500], ["salto-3", 700]]) {
  await wait(ms);
  await shot(t, name);
 }
 await wait(2500);
}
if (what.includes("maquina")) {
 // La máquina de Dosia: apagada, encendiéndose (con su rayo al núcleo), su panel y encendida.
 await t.evaluate(() => window.__world.lab.quest.reset());
 await t.put(POINTS.dosia[0], POINTS.dosia[1], { settle: 2600 });
 await shot(t, "maquina-apagada");
 await t.page.keyboard.press("KeyE");
 await wait(1350);
 await shot(t, "maquina-rayo");
 await t.page.waitForSelector(".modal__card", { timeout: 8000 });
 await wait(500);
 await shot(t, "maquina-panel");
 await t.page.keyboard.press("Escape");
 await wait(2600);
 await shot(t, "maquina-encendida");
 await t.put(POINTS.nucleo[0], POINTS.nucleo[1], { settle: 2800 });
 await shot(t, "nucleo-con-energia");
}
if (what.includes("orbita") || what.includes("vuelta")) {
 await t.put(0, 5.6, { withWoody: false, settle: 900 });
 await t.page.keyboard.press("KeyE");
 if (what.includes("orbita")) {
  for (const [name, ms] of [["subida-1", 3600], ["subida-2", 1900], ["subida-3", 1700], ["orbita", 4200]]) {
   await wait(ms);
   await shot(t, name);
  }
 }
 if (what.includes("vuelta")) {
  await t.page.waitForFunction(() => window.__world.ship.flight.phase === "orbit", { timeout: 30000 });
  await t.page.addStyleTag({ content: HIDE });
  for (let i = 0; i < 4; i++) {
   await wait(i ? 31000 : 3000);
   await shot(t, `vuelta-${i + 1}`);
  }
 }
 if (what.includes("orbita")) {
  await t.page.keyboard.press("KeyE");
  for (const [name, ms] of [["bajada-1", 1600], ["bajada-2", 1400], ["bajada-3", 1400], ["bajada-4", 1400]]) {
   await wait(ms);
   await shot(t, name);
  }
 }
}
console.log(t.pageErrors.length ? t.pageErrors.join("\n") : "sin excepciones");
console.log(t.logs.length ? [...new Set(t.logs)].join("\n") : "sin avisos en consola");
await t.browser.close();
