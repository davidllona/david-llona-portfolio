// Capturas de The Twisted Moon (mundo 2). Abre directamente en ese mundo
// (?world=twisted, solo en desarrollo). No comprueba nada.
//   node tests/e2e/luna.mjs <carpeta> [qué] [vistas]
//     qué:    postal, orbita y/o puntos (llegada,rio,casita,terraza,historia,macizo,cima,observatorio,invernadero…); por defecto, todo
//     vistas: juego,alto (para los puntos; por defecto, las dos)
// La «vista postal» imita el encuadre de las imágenes de referencia
// (docs/referencias/mundo2/): vertical, tres cuartos, desde delante y algo por
// encima, la isla entera y la luna en cuadro. Usa un objetivo más abierto que
// el del juego (58° en vez de 40°), como las referencias: con el del juego no
// caben a la vez la isla vista desde arriba y la luna.
import fs from "node:fs";
import { open, wait } from "./common.mjs";
import { BUILDINGS, STORY_DOOR } from "../../src/worlds/twisted/layout.js";

const POINTS = {
 llegada: [0, 7.5],
 rio: [-6.2, -3.8],
 casita: [-13.4, -9.6],
 invernadero: [9.8, -4.6],
 terraza: [-6.4, -19],
 alquimista: [-14.6, -16.4],
 historia: [STORY_DOOR.x - 0.4, STORY_DOOR.z + 0.4],
 macizo: [0.4, -28.6],
 cima: [0.6, -33.2],
 observatorio: [BUILDINGS.observatorio.x + 2, BUILDINGS.observatorio.z + 2.6],
};
// `lift`: altura de la cámara (1 = la del juego); `distance`: cuánto se aleja.
const VIEWS = { juego: null, alto: { lift: 1.5, distance: 3.4 } };

const folder = (process.argv[2] ?? "capturas/26-mundo2/C1") + "/";
const pick = (arg, all) => (arg && arg !== "-" ? arg.split(",") : all);
const what = pick(process.argv[3], ["postal", ...Object.keys(POINTS), "orbita"]);
const views = pick(process.argv[4], Object.keys(VIEWS));
fs.mkdirSync(folder, { recursive: true });
const shot = (t, name) => t.page.screenshot({ path: `${folder}${name}.jpg`, type: "jpeg", quality: 90 });

if (what.includes("postal")) {
 const t = await open({ viewport: { width: 900, height: 1200 }, query: "?world=twisted" });
 await t.enter();
 // Sin interfaz: es una postal.
 await t.page.addStyleTag({ content: ".quick, .woody-menu, .sound-toggle, .theme-toggle { display: none !important; }" });
 for (const [name, yaw, focus] of [["postal", -0.12, [0.5, 7, -15.5]], ["postal-oeste", -0.62, [0, 7, -15.5]], ["postal-este", 0.5, [0, 7, -15.5]]]) {
  await t.evaluate((yaw, focus) => {
   const w = window.__world;
   w.camera.fov = 58;
   w.camera.updateProjectionMatrix();
   // (Woody y el astronauta, junto al cohete, como en las referencias.)
   w.player.position.set(-2.6, 0, 4.4);
   w.woody.position.set(-4.2, 0, 5);
   Object.assign(w.rig, { focus: { x: focus[0], y: focus[1], z: focus[2] }, distance: 3.45, lift: 0.3, yaw, tilt: 0 });
  }, yaw, focus);
  // (La primera espera más: que se vaya el aviso del logro «Primeros pasos».)
  await wait(name === "postal" ? 7000 : 3200);
  await shot(t, name);
 }
 await t.browser.close();
}

const places = what.filter((one) => POINTS[one]);
if (places.length || what.includes("orbita")) {
 const t = await open({ viewport: { width: 1600, height: 900 }, query: "?world=twisted" });
 await t.enter();
 await wait(1200);
 for (const name of places) {
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
   // (En los miradores la cámara tarda en inclinarse.)
   await wait(setup ? 1700 : 3200);
   await shot(t, `${name}-${view}`);
  }
  await t.evaluate(() => Object.assign(window.__world.rig, { focus: null, lift: 1, distance: 1 }));
 }
 if (what.includes("orbita")) {
  await t.put(0, 5.6, { withWoody: false, settle: 900 });
  await t.page.keyboard.press("KeyE");
  for (const [name, ms] of [["subida-1", 3600], ["subida-2", 1900], ["subida-3", 1700], ["orbita", 4200]]) {
   await wait(ms);
   await shot(t, name);
  }
 }
 console.log(t.pageErrors.length ? t.pageErrors.join("\n") : "sin excepciones");
 console.log(t.logs.length ? [...new Set(t.logs)].join("\n") : "sin avisos en consola");
 await t.browser.close();
}
