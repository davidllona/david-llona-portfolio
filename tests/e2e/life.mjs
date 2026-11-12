// Partículas y vida ambiental: polvo al andar, correr y aterrizar; salpicadura
// y aros al entrar en el agua; hojas, polen y luciérnagas montados; y el
// evento «El bosque despierta» (la ráfaga suelta hojas, espanta a las aves en
// cadena y el jugador conserva el control). Guarda fotogramas de todo.
//   node tests/e2e/life.mjs
import { open, check, wait } from "./common.mjs";
import { POND, WIND_CHIME } from "../../src/worlds/living/layout.js";

const t = await open();
await t.enter();
// Cuántas copias de cada efecto han nacido desde el instante `since` (reloj del juego).
const born = (since) =>
 t.evaluate((since) => {
  const { pools } = window.__world.bursts;
  const count = (pool) => {
   let n = 0;
   for (let i = 0; i < pool.count; i++) if (pool.life.getX(i) >= since) n += 1;
   return n;
  };
  return { dust: count(pools.dust), drop: count(pools.drop), ring: count(pools.ring) };
 }, since);
const clock = () => t.evaluate(() => window.__world.clock());

// ── Polvo ────────────────────────────────────────────────────────────────────
await t.put(0, 11.5, { settle: 1200 }); // el camino del sur: despejado
let since = await clock();
await t.page.keyboard.down("KeyS");
await wait(900);
await t.shot("polvo-andar");
const walking = await born(since);
await t.page.keyboard.down("ShiftLeft");
since = await clock();
await wait(900);
await t.shot("polvo-correr");
const running = await born(since);
await t.page.keyboard.up("ShiftLeft");
await t.page.keyboard.up("KeyS");
check(walking.dust >= 2, `al andar se levanta algo de polvo (${walking.dust} bocanadas en 0,9 s)`);
check(running.dust > walking.dust * 1.5, `y al correr, bastante más (${running.dust})`);
await wait(900);
since = await clock();
await t.page.keyboard.press("Space");
for (let i = 0; i < 6; i++) {
 await wait(170);
 await t.shot(`polvo-salto-${i}`);
}
const landing = await born(since);
check(landing.dust >= 8, `al aterrizar de un salto sale una corona de polvo (${landing.dust} bocanadas)`);

// ── Agua: salpicadura al entrar y aros al vadear ─────────────────────────────
await t.put(POND.x - 1, POND.z + POND.r + 1.6, { withWoody: false, settle: 800 });
since = await clock();
await t.page.keyboard.down("KeyW");
for (let i = 0; i < 7; i++) {
 await wait(260);
 await t.shot(`agua-entrada-${i}`);
}
await t.page.keyboard.up("KeyW");
const wading = await born(since);
const p = await t.pos();
check(p.y < -0.3, `el astronauta está dentro del estanque (y = ${p.y})`);
check(wading.drop >= 10 && wading.ring >= 2, `al entrar salpica y deja aros (${wading.drop} gotas, ${wading.ring} aros)`);

// ── Hojas, polen y luciérnagas: montados y en GPU ────────────────────────────
const ambient = await t.evaluate(() => {
 const found = {};
 window.__world.scene.traverse((mesh) => {
  if (!mesh.isInstancedMesh) return;
  const a = mesh.geometry.attributes;
  if (a.home && a.shape && a.tint) found.leaves = mesh.count;
  else if (a.home && a.seed) found.pollen = mesh.count;
  else if (a.seed && mesh.count > 100) found.fireflies = mesh.count;
 });
 return found;
});
check(ambient.leaves >= 500 && ambient.pollen >= 200 && ambient.fireflies >= 100, `hojas (${ambient.leaves}), polen (${ambient.pollen}) y luciérnagas (${ambient.fireflies}) van en mallas con instancias`);
await t.put(-20.5, 37.6, { withWoody: false, settle: 1500 });
await t.evaluate(() => (window.__world.rig.zoom = 0.72));
await wait(1500);
for (let i = 0; i < 3; i++) {
 await t.shot(`hojas-y-polen-${i}`);
 await wait(500);
}
await t.page.keyboard.press("KeyN");
await wait(2800);
for (let i = 0; i < 3; i++) {
 await t.shot(`luciernagas-${i}`);
 await wait(500);
}
await t.page.keyboard.press("KeyN");
await wait(2600);
await t.evaluate(() => (window.__world.rig.zoom = 1));

// ── «El bosque despierta» ────────────────────────────────────────────────────
await t.put(WIND_CHIME.x, WIND_CHIME.z + 1.3, { withWoody: false, settle: 900 });
await t.evaluate(() => (window.__world.rig.zoom = 1.6));
await wait(1600);
await t.shot("bosque-0-calma");
const before = await t.evaluate(() => ({ gusts: window.__world.gusts ?? 0, flying: window.__world.birds.filter((bird) => bird.started).length }));
await t.page.keyboard.press("KeyE");
const start = await t.pos();
await t.page.keyboard.down("KeyS"); // el jugador sigue mandando mientras dura
const flying = [];
for (let i = 1; i <= 8; i++) {
 await wait(650);
 flying.push(await t.evaluate(() => window.__world.birds.filter((bird) => bird.started && bird.flying > 0).length));
 await t.shot(`bosque-${i}`);
}
await t.page.keyboard.up("KeyS");
const during = await t.evaluate(() => ({ gusts: window.__world.gusts ?? 0, front: window.__world.env.windGust.value.z }));
const end = await t.pos();
check(during.gusts >= before.gusts + 1, "el carillón lanza la ráfaga");
check(Math.max(...flying) >= 3 && flying[0] < Math.max(...flying), `las aves despegan en cadena, según les llega el frente (en vuelo: ${flying.join(", ")})`);
check(end.z > start.z + 4, `el jugador conserva el control durante el evento (avanza ${(end.z - start.z).toFixed(1)} m)`);
await wait(9000);
const calm = await t.evaluate(() => ({ front: window.__world.env.windGust.value.z, strength: window.__world.env.windGust.value.w }));
check(calm.strength === 0, "y todo vuelve a la calma");
await t.shot("bosque-9-calma");
await t.done();
