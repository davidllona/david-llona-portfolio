// Capturas de puntos concretos, para revisar el aspecto a ojo.
//   node tests/e2e/look.mjs '[["nombre", x, z, noche?, distanciaCámara?]]' ['?world=cosmic']
import { open, wait } from "./common.mjs";

const views = JSON.parse(process.argv[2] ?? "[]");
const t = await open({ query: process.argv[3] ?? "" });
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
