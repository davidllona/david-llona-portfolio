// Fps a 2880 × 1620 sin límite en cinco puntos de un mundo (o de varios).
//   node tests/perf/fps-mundos.mjs [living] [twisted] [cosmic]      (por defecto, los tres)
import { open } from "../e2e/common.mjs";

const POINTS = {
 living: [["llegada", 0, 7.5], ["proyectos", -20, 0], ["estanque", 8, -6], ["meseta", 8, -24], ["pista", 3, 26]],
 twisted: [["llegada", 0, 7.5], ["río", -6, -4.4], ["terraza", -6.4, -19], ["historia", 13.9, -18.1], ["cima", 0.6, -33.2]],
 cosmic: [["llegada", 0, 6.5], ["núcleo", 0, -15], ["Dosia", -12, -19], ["charca", 12, -9], ["fondo", 3, -30]],
};
const asked = process.argv.slice(2).filter((one) => POINTS[one]);
for (const id of asked.length ? asked : Object.keys(POINTS)) {
 const r = await open({ viewport: { width: 1440, height: 810, deviceScaleFactor: 2 }, uncapped: true, query: (id === "living" ? "?" : `?world=${id}`) + (process.env.FPS_QUERY ?? "") });
 await r.enter();
 const line = [];
 for (const [name, x, z] of POINTS[id]) {
  await r.put(x, z, { settle: 2400 });
  line.push(`${name} ${await r.fps(3)}`);
 }
 console.log(`fps ${id} (2880 × 1620, sin límite): ` + line.join(" · "));
 await r.browser.close();
}
