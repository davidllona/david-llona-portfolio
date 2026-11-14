// Pájaros: capturas de cerca de uno posado en el suelo, uno en lo alto de un
// cartel, uno recién espantado y una bandada. Comprueba además que hay
// pájaros posados en alto y que la malla es una sola con instancias.
//   node tests/e2e/birds.mjs [carpeta]
import fs from "node:fs";
import { open, check, wait } from "./common.mjs";

const folder = (process.argv[2] ?? "capturas/23-pulido/3-pajaros") + "/";
fs.mkdirSync(folder, { recursive: true });
const t = await open({ viewport: { width: 1600, height: 900 } });
await t.enter();
// Lejos de todos, para que ninguno se espante mientras se mira.
await t.put(40, 20, { settle: 600 });

// Enfoca un punto con la cámara cerca y baja.
const look = (x, y, z, distance = 0.3, lift = 0.5) =>
 t.evaluate(
  (x, y, z, distance, lift) => {
   const w = window.__world;
   w.rig.focus = { x, y, z };
   w.rig.distance = distance;
   w.rig.lift = lift;
  },
  x, y, z, distance, lift,
 );
const shot = (name) => t.page.screenshot({ path: `${folder}${name}.jpg`, type: "jpeg", quality: 90 });

const birds = await t.evaluate(() => window.__world.birds.map((b) => ({ x: b.x, y: b.y, z: b.z, lift: b.lift })));
const high = birds.filter((b) => b.lift > 0), low = birds.filter((b) => b.lift === 0);
check(high.length >= 2 && low.length >= 4, `hay pájaros posados en alto (${high.length}) y en el suelo (${low.length})`);
const mesh = await t.evaluate(() => {
 let found = null;
 window.__world.scene.traverse((o) => o.name === "pájaros" && (found = { count: o.geometry.instanceCount, triangles: o.geometry.index.count / 3 }));
 return found;
});
check(mesh && mesh.count >= 14, `todos van en una malla con instancias (${mesh?.count} pájaros de ${mesh?.triangles} triángulos)`);

await look(low[0].x, low[0].y + 0.15, low[0].z);
await wait(1800);
await shot("suelo");
await look(high[0].x, high[0].y + 0.1, high[0].z, 0.34, 0.45);
await wait(1800);
await shot("cartel");

// Al acercarse a uno, echa a volar: se le sigue en el aire.
await t.put(low[1].x + 1.2, low[1].z + 1.2, { withWoody: false, settle: 100 });
let flying = null;
for (let i = 0; i < 40 && !flying; i++) {
 await wait(250);
 flying = await t.evaluate(() => {
  const w = window.__world;
  const b = w.birds.find((bird) => bird.started && bird.flying > 1.2 && bird.flying < 6);
  return b ? { x: b.x, y: b.y, z: b.z } : null;
 });
}
check(!!flying, "al acercarse, el pájaro echa a volar");
if (flying) {
 for (let i = 0; i < 4; i++) {
  const now = await t.evaluate(() => { const b = window.__world.birds.find((bird) => bird.started && bird.flying > 1.2); return b ? { x: b.x, y: b.y, z: b.z } : null; });
  if (!now) break;
  await look(now.x, now.y, now.z, 0.5, 0.6);
  await wait(120);
  await shot(`vuelo-${i}`);
 }
}
// La bandada del sur, desde la cámara de juego algo alejada.
await look(-8, 9, 9, 2.2, 0.9);
await wait(1500);
await shot("bandada");
await t.evaluate(() => { const w = window.__world; w.rig.focus = null; w.rig.distance = 1; w.rig.lift = 1; });
await t.done();
