// Capturas del agua y de la vida ambiental, para comparar a ojo: río, estanque,
// cascada, costa y mar, de día y de noche. No comprueba nada.
//   node tests/e2e/water.mjs [etiqueta] [filtro de nombre]
import { open, wait } from "./common.mjs";
import { POND, WATERFALL } from "../../src/worlds/living/layout.js";

const tag = process.argv[2] ?? "ahora";
const only = process.argv[3];
// [nombre, x, z del jugador, punto al que mira la cámara (x, y, z) o null, distancia]
const spots = [
 ["rio", 17.5, -3.2, null, 1],
 ["rio-cerca", 22, -6, [21, 0, -3.5], 0.5],
 ["estanque", POND.x - 1, POND.z + 6.3, null, 1],
 ["estanque-cerca", POND.x, POND.z + 6.5, [POND.x, 0, POND.z + 1], 0.6],
 ["cascada", WATERFALL.x + 0.5, WATERFALL.z + 6.8, [WATERFALL.x, 1.6, WATERFALL.z + 1], 0.62],
 ["costa", -4, 43.5, null, 1],
 ["costa-cerca", 6, 44, [6, 0, 46.5], 0.55],
 ["mar", 0, 30, [0, 0, 20], 4.6],
].filter(([name]) => !only || name.includes(only));

const t = await open();
await t.enter();
await t.put(0, 12, { settle: 300 });
await t.hold("KeyS", 500);
await wait(6500); // que se retire el logro de «Primeros pasos»
for (const night of [false, true]) {
 await t.moment(night ? "night" : "day");
 for (const [name, x, z, look, distance] of spots) {
  await t.evaluate((look, distance) => Object.assign(window.__world.rig, { focus: look ? { x: look[0], y: look[1], z: look[2] } : null, distance, zoom: 1 }), look, distance);
  await t.put(x, z, { withWoody: false, settle: 2300 });
  await t.shot(`${name}-${night ? "noche" : "dia"}-${tag}`);
 }
}
await t.browser.close();
