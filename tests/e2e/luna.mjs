// Capturas de The Twisted Moon (mundo 2): cada punto con la cámara de juego, a
// la altura del jugador y desde arriba, y el planeta desde la órbita. Abre
// directamente en ese mundo (?world=twisted, solo en desarrollo). No comprueba nada.
//   node tests/e2e/luna.mjs <carpeta> [puntos] [vistas]
//     puntos: llegada,casa,puerta,farola,camino,colina,… (por defecto, todos; «orbita» saca la vista orbital)
//     vistas: juego,bajo,alto,norte                      (por defecto, todas)
import fs from "node:fs";
import { open, wait } from "./common.mjs";
import { HILL, HOUSE_DOOR } from "../../src/worlds/twisted/layout.js";

const POINTS = {
 llegada: [0, 7.5],
 casa: [-9.4, -4.6],
 puerta: [HOUSE_DOOR.x + 0.3, HOUSE_DOOR.z + 0.6],
 farola: [-6.4, -1.4],
 camino: [-0.4, -13.2],
 vista: [0.6, 17.2],
 colina: [HILL.x, HILL.z + HILL.r + 1.5],
};
// `lift`: altura de la cámara (1 = la del juego); `distance`: cuánto se aleja; `yaw`: giro (0 = mira al norte).
const VIEWS = {
 juego: null,
 bajo: { lift: 0.13, distance: 0.72 },
 norte: { lift: 0.07, distance: 1.25 },
 alto: { lift: 1.5, distance: 2.7 },
};

const folder = (process.argv[2] ?? "capturas/25-mundo2/B") + "/";
const pick = (arg, all) => (arg && arg !== "-" ? arg.split(",") : all);
const points = pick(process.argv[3], [...Object.keys(POINTS), "orbita"]);
const views = pick(process.argv[4], Object.keys(VIEWS));
fs.mkdirSync(folder, { recursive: true });

const t = await open({ viewport: { width: 1600, height: 900 }, query: "?world=twisted" });
await t.enter();
await wait(1500);
for (const name of points.filter((one) => one !== "orbita")) {
 const [x, z] = POINTS[name];
 await t.put(x, z, { settle: 500 });
 for (const view of views) {
  const setup = VIEWS[view];
  await t.evaluate((setup) => {
   const w = window.__world, p = w.player.position;
   w.rig.focus = setup ? { x: p.x, y: p.y + 1.2, z: p.z - 0.5 } : null;
   w.rig.lift = setup?.lift ?? 1;
   w.rig.distance = setup?.distance ?? 1;
  }, setup);
  await wait(1700);
  await t.page.screenshot({ path: `${folder}${name}-${view}.jpg`, type: "jpeg", quality: 88 });
 }
 await t.evaluate(() => Object.assign(window.__world.rig, { focus: null, lift: 1, distance: 1 }));
}
if (points.includes("orbita")) {
 await t.put(0, 5.6, { withWoody: false, settle: 900 });
 await t.page.keyboard.press("KeyE");
 for (const [name, ms] of [["subida-1", 3600], ["subida-2", 1900], ["subida-3", 1700], ["orbita", 4200]]) {
  await wait(ms);
  await t.page.screenshot({ path: `${folder}${name}.jpg`, type: "jpeg", quality: 88 });
 }
}
console.log(t.pageErrors.length ? t.pageErrors.join("\n") : "sin excepciones");
console.log(t.logs.length ? [...new Set(t.logs)].join("\n") : "sin avisos en consola");
await t.browser.close();
