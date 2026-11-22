// Capturas y medidas de los edificios: cada uno de cerca y desde la cámara de
// juego, de día y de noche, más las llamadas de dibujo y los triángulos por
// fotograma en dos puntos fijos. No comprueba nada: es para comparar a ojo y
// en números un antes y un después.
//   node tests/e2e/buildings.mjs [etiqueta] [filtro de nombre]     («medida» como filtro: solo los números)
//   (las capturas van a E2E_SHOTS, con la etiqueta como sufijo)
import { open, wait } from "./common.mjs";
import { LAB_TOTEMS, PAD, PLAZA, PROJECT_CABINS, TREEHOUSE } from "../../src/worlds/living/layout.js";

const tag = process.argv[2] ?? "ahora";
const only = process.argv[3];
// [nombre, x, z del edificio, desde dónde mira el jugador (dx, dz), distancia del primer plano, altura a la que se mira]
const spots = [
 ...PROJECT_CABINS.map((c, i) => [`proyecto-${i}`, c.x, c.z - 1.6, 0.4, 5.6, 0.8, 2.2]),
 ["cartel-proyectos", PLAZA.x, PLAZA.z - 7.2, 0, 4, 0.5, 1.8],
 ["casa-arbol", TREEHOUSE.x, TREEHOUSE.z - 0.9, 0, 5.5, 0.8, 3],
 ...LAB_TOTEMS.map((totem, i) => [`laboratorio-${i}`, totem.x, totem.z, 0, 3.2, 0.42, 1.3]),
 // La casa de referencia junto al cohete.
 ["referencia-con-cohete", (PROJECT_CABINS[0].x + PAD.x) / 2 + 0.6, (PROJECT_CABINS[0].z - 1.6 + PAD.z) / 2, 0, 9, 1.45, 2.4],
].filter(([name]) => !only || name.includes(only));

const t = await open();
await t.enter();
// El primer movimiento da el logro de «Primeros pasos», que taparía las capturas: se espera a que se retire.
await t.put(0, 12, { settle: 300 });
await t.hold("KeyS", 500);
await wait(6500);
const info = () =>
 t.evaluate(async () => {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const { render } = window.__world.renderer.info;
  return { calls: render.calls, drawCalls: render.drawCalls, triangles: render.triangles };
 });
const setNight = async (night) => {
 await t.moment(night ? "night" : "day");
};

if (!only || only === "medida") {
 await t.put(PLAZA.x, PLAZA.z + 3, { settle: 1500 });
 await t.evaluate(() => (window.__world.rig.zoom = 1.9));
 await wait(2000);
 console.log(`${tag} · plaza, cámara lejos:`, JSON.stringify(await info()));
 await t.evaluate(() => (window.__world.rig.zoom = 1));
 await t.put(0, 9.5, { settle: 2000 });
 console.log(`${tag} · junto al cohete:`, JSON.stringify(await info()));
}
for (const night of [false, true]) {
 await setNight(night);
 const time = night ? "noche" : "dia";
 for (const [name, x, z, dx, dz, distance, lookAt] of spots) {
  // Desde la cámara de juego.
  await t.evaluate(() => Object.assign(window.__world.rig, { focus: null, distance: 1, zoom: 1 }));
  await t.put(x + dx, z + dz, { withWoody: false, settle: 1900 });
  await t.shot(`${name}-juego-${time}-${tag}`);
  // De cerca: la cámara mira al edificio.
  await t.evaluate((x, z, distance, lookAt) => {
   const w = window.__world;
   w.rig.focus = { x, y: w.world().height(x, z) + lookAt, z: z + 0.6 };
   w.rig.distance = distance;
  }, x, z, distance, lookAt);
  await wait(2300);
  await t.shot(`${name}-cerca-${time}-${tag}`);
 }
}
await t.evaluate(() => Object.assign(window.__world.rig, { focus: null, distance: 1 }));
await t.browser.close();
