// Fps a 2880 × 1620 sin límite en cinco puntos del planeta (lo mismo que
// `living.mjs fps`, sin pasar antes por toda la prueba).
//   node tests/perf/fps.mjs
import { open } from "../e2e/common.mjs";

const r = await open({ viewport: { width: 1440, height: 810, deviceScaleFactor: 2 }, uncapped: true });
await r.enter();
const line = [];
for (const [name, x, z] of [["llegada", 0, 7.5], ["proyectos", -20, 0], ["estanque", 8, -6], ["meseta", 8, -24], ["pista", 3, 26]]) {
 await r.put(x, z, { settle: 1200 });
 line.push(`${name} ${await r.fps(3)}`);
}
console.log("fps: " + line.join(" · "));
await r.browser.close();
