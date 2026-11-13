// Capturas de los árboles, para comparar a ojo. No comprueba nada.
//   node tests/e2e/trees.mjs [etiqueta] [cohete|todo]
import { open, wait } from "./common.mjs";

const tag = process.argv[2] ?? "ahora";
const all = process.argv[3] === "todo";
// [nombre, x, z del jugador, punto al que mira la cámara o null, distancia]
const spots = [
 ["cohete", 3.5, 8.5, [1, 1.5, 2], 1.5],
 ["cohete-bosque", 4.2, 3.2, [0, 2, -5], 2.0],
 ...(all
  ? [
     ["aldea", -20, 2, null, 1.4],
     ["estanque", 8, -6, null, 1.4],
     ["meseta", 8, -24, null, 1.4],
     ["rio", 17.5, -3.2, null, 1.4],
     ["pista", 3, 26, null, 1.4],
     ["cerezos", 15, 15, null, 1.2],
     ["aerea", 0, 6, [0, 0, 0], 5.2],
    ]
  : []),
];

const t = await open();
await t.enter();
await t.put(0, 12, { settle: 300 });
await t.hold("KeyS", 500);
await wait(6500); // que se retire el logro de «Primeros pasos»
for (const [name, x, z, look, distance] of spots) {
 await t.evaluate((look, distance) => Object.assign(window.__world.rig, { focus: look ? { x: look[0], y: look[1], z: look[2] } : null, distance, zoom: 1 }), look, distance);
 await t.put(x, z, { withWoody: false, settle: 2300 });
 await t.shot(`arboles-${name}-${tag}`);
}
await t.done();
