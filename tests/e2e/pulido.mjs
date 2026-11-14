// Capturas del objetivo 18: cada punto desde la cámara de juego, a la altura
// del jugador y desde arriba, de día y de noche. No comprueba nada.
//   node tests/e2e/pulido.mjs <carpeta> [puntos] [vistas] [momentos]
//     puntos:   llegada,proyectos,estanque,meseta,pista,…  (por defecto, todos)
//     vistas:   juego,bajo,alto                             (por defecto, las tres)
//     momentos: dia,noche                                   (por defecto, los dos)
import fs from "node:fs";
import { open, wait } from "./common.mjs";

const POINTS = {
 llegada: [0, 7.5],
 proyectos: [-20, 0],
 estanque: [8, -5.5],
 meseta: [8, -24],
 pista: [3, 26],
 camino: [-9, 0.6],
 pradera: [14, 12],
 orilla: [22, -1.5],
 cascada: [8.2, -8.2],
 futbol: [-22, 15],
 contacto: [33, 2],
 playa: [0, 41],
 totems: [-24.5, 10.8],
 atril: [6.6, 8.8],
 prado: [-24.5, 12.5],
 roca: [13.4, 13.6],
 aldea: [-24.5, -3.5],
 observatorio: [19, -21.5],
 arbol: [3, -22.5],
 trofeo: [-26.8, 17.2],
 jardin: [19, 21.6],
 puenteRojo: [19, 17.4],
 entradaJardin: [13.4, 12.6],
};
// `lift`: altura de la cámara (1 = la del juego); `distance`: cuánto se aleja.
const VIEWS = { cerca: { lift: 0.24, distance: 0.3 }, juego: { lift: 1, distance: 1 }, bajo: { lift: 0.2, distance: 0.62 }, alto: { lift: 1.45, distance: 2.6 } };

const folder = (process.argv[2] ?? "capturas/23-pulido") + "/";
const pick = (arg, all) => (arg && arg !== "-" ? arg.split(",") : all);
const points = pick(process.argv[3], Object.keys(POINTS));
const views = pick(process.argv[4], Object.keys(VIEWS));
const moments = pick(process.argv[5], ["dia", "noche"]);
fs.mkdirSync(folder, { recursive: true });

const t = await open({ viewport: { width: 1600, height: 900 } });
await t.enter();
for (const moment of moments) {
 const isNight = await t.evaluate(() => document.querySelector(".theme-toggle")?.getAttribute("aria-pressed") === "true");
 if ((moment === "noche") !== isNight) {
  await t.page.keyboard.press("KeyN");
  await wait(2500);
 }
 for (const name of points) {
  const [x, z] = POINTS[name];
  await t.put(x, z, { settle: 300 });
  for (const view of views) {
   const { lift, distance } = VIEWS[view];
   await t.evaluate(
    (lift, distance, plain) => {
     const w = window.__world;
     const p = w.player.position;
     // La cámara de juego es la de siempre; las otras dos siguen un punto fijo.
     w.rig.focus = plain ? null : { x: p.x, y: p.y + 1, z: p.z - 0.5 };
     w.rig.lift = lift;
     w.rig.yaw = 0;
     w.rig.tilt = 0;
     w.rig.distance = distance;
    },
    lift,
    distance,
    view === "juego",
   );
   await wait(1500);
   await t.page.screenshot({ path: `${folder}${name}-${view}-${moment}.jpg`, type: "jpeg", quality: 88 });
  }
  await t.evaluate(() => { const w = window.__world; w.rig.focus = null; w.rig.distance = 1; w.rig.lift = 1; });
 }
}
await t.done();
