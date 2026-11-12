// Capturas de puntos concretos, para revisar el aspecto a ojo.
//   node tests/e2e/look.mjs '[["nombre", x, z, noche?, distanciaCámara?]]' ['?world=cosmic']
//   node tests/e2e/look.mjs tests/e2e/views.json            (las vistas fijas, de día y de noche)
import fs from "node:fs";
import { open, wait } from "./common.mjs";

const source = process.argv[2] ?? "[]";
const fromFile = source.endsWith(".json");
let views = JSON.parse(fromFile ? fs.readFileSync(source, "utf8") : source);
// Las vistas fijas se sacan dos veces: de día y de noche.
if (fromFile) views = [...views.map(([name, x, z, , d]) => [`${name}-dia`, x, z, 0, d]), ...views.map(([name, x, z, , d]) => [`${name}-noche`, x, z, 1, d])];

const t = await open({ query: fromFile ? "" : (process.argv[3] ?? "") });
await t.enter();
for (const [name, x, z, night, distance] of views) {
 await t.put(x, z, { settle: 100 });
 await t.evaluate((distance) => (window.__world.rig.distance = distance ?? 1), distance);
 const isNight = await t.evaluate(() => document.querySelector(".theme-toggle")?.getAttribute("aria-pressed") === "true");
 if (Boolean(night) !== isNight) await t.page.keyboard.press("KeyN");
 await wait(2200);
 await t.shot(name);
}
await t.done();
