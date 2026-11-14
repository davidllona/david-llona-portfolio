// Despegue: la nave no cambia de tamaño, el césped no se rompe (el parche no
// cambia de tamaño y solo se agita con el empuje), la cámara sigue al cohete
// y hay humo, polvo y chispas. Arriba, la isla es el polo de un planeta que se
// ve entero, con su luna y los otros dos mundos, cerrados, a lo lejos. Al
// aterrizar, el camino inverso. Saca la serie de fotogramas.
import { open, check, wait } from "./common.mjs";
import { PAD } from "../../src/worlds/living/layout.js";

const t = await open();
await t.enter();
await t.put(PAD.x, PAD.z + 5.6, { withWoody: false, settle: 1000 });
check(/Subir a la nave/.test((await t.hint()) ?? ""), `junto a la nave: "${await t.hint()}"`);
const probe = () =>
 t.evaluate((pad) => {
  const w = window.__world;
  const body = w.ship.body;
  const push = w.env.windBlast.value.w;
  return { phase: w.ship.flight.phase, scale: [body.scale.x, body.scale.y, body.scale.z], x: body.position.x, y: body.position.y, z: body.position.z, push, distance: w.rig.distance, space: w.rig.space, thrust: w.ship.exhaust.thrust };
 }, PAD);
const onScreen = async () => {
 const at = await probe();
 const [sx, sy] = await t.screen(at.x, at.y + 4, at.z);
 return sx > 60 && sx < 1380 && sy > 20 && sy < 880;
};
const before = await probe();
await t.shot("despegue-0-antes");
await t.page.keyboard.press("KeyE");
await wait(900);
let now = await probe();
check(now.phase === "igniting" && now.y < 0.2 && now.thrust > 0.3, `encendido: motores en marcha y la nave aún en tierra (${now.phase}, y=${now.y.toFixed(2)})`);
check(now.push > 0.3 && before.push === 0, `el empuje agita la vegetación alrededor de la plataforma (fuerza ${now.push.toFixed(2)}; antes ${before.push.toFixed(2)})`);
await t.shot("despegue-1-encendido");
const samples = [];
for (let i = 2; i < 12; i++) {
 await wait(560);
 now = await probe();
 samples.push({ ...now, seen: await onScreen() });
 await t.shot(`despegue-${i}`);
}
check(samples.every((one) => one.scale.every((value) => Math.abs(value - 1) < 1e-6)), "la nave mantiene su escala durante todo el vuelo");
check(samples.every((one) => one.seen), "la cámara sigue al cohete mientras sube: no sale de la pantalla en ningún momento");
const far = samples.map((one) => one.distance);
check(far.every((value, i) => i === 0 || value >= far[i - 1] - 0.01) && far[far.length - 1] > 30, `y se aleja cada vez más, sin saltos (${far.map((value) => value.toFixed(0)).join(" → ")} veces la distancia de juego)`);
const heights = samples.map((one) => one.y);
check(heights[1] - heights[0] < heights[3] - heights[2] && heights[4] > 8, `acelera poco a poco (alturas: ${heights.slice(0, 6).map((h) => h.toFixed(1)).join(" → ")} m)`);
await wait(3200);
now = await probe();
check(now.phase === "orbit" && now.y > 300, `y llega a la órbita (a ${now.y.toFixed(0)} m)`);
await t.shot("despegue-12-orbita");

// En órbita se ve un planeta: el globo entero cabe en la pantalla, con la isla
// en su polo, la nave delante, y la luna y los otros dos mundos alrededor.
const orbit = await t.evaluate(() => {
 const w = window.__world, s = w.space;
 const seen = {};
 s.group.traverse((o) => { if (o.name) seen[o.name] = o.visible; });
 return { visible: s.group.visible, shown: s.shown.value, radius: s.radius, centre: s.centre, names: s.names, seen, fog: w.scene.fog.density, labels: [] };
});
check(orbit.visible && orbit.shown > 0.99 && orbit.fog < 1e-5, `el planeta está a la vista y sin niebla (aparición ${orbit.shown.toFixed(2)}, niebla ${orbit.fog.toExponential(1)})`);
const rim = [];
for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) rim.push(await t.screen(dx * orbit.radius, orbit.centre, dz * orbit.radius));
const [poleX, poleY] = await t.screen(PAD.x, 0, PAD.z);
const inside = (x, y) => x > 0 && x < 1440 && y > 0 && y < 900;
const wide = Math.hypot(rim[0][0] - rim[1][0], rim[0][1] - rim[1][1]);
check(rim.every(([x, y]) => inside(x, y)) && wide > 320, `el planeta cabe entero en la pantalla y la llena (${wide.toFixed(0)} px de lado a lado)`);
check(inside(poleX, poleY) && Math.hypot(poleX - 720, poleY - 450) < wide * 0.4, `la isla es su polo, hacia el centro de la vista (en ${poleX.toFixed(0)}, ${poleY.toFixed(0)})`);
check(await onScreen(), "la nave se ve delante del planeta");
const sky = await t.evaluate(() => {
 const w = window.__world, out = {};
 const camera = w.camera, v = new camera.position.constructor();
 w.space.sky.traverse((o) => {
  if (!o.isMesh) return;
  o.getWorldPosition(v).project(camera);
  (out[o.name || "astro"] ??= []).push({ x: +((v.x * 0.5 + 0.5) * innerWidth).toFixed(0), y: +((0.5 - v.y * 0.5) * innerHeight).toFixed(0), front: v.z < 1, opacity: o.material.opacity });
 });
 return out;
});
const bodies = Object.values(sky).flat();
check(sky["luna de la órbita"]?.length === 1 && bodies.length === 5 && bodies.every((b) => b.front && inside(b.x, b.y) && b.opacity > 0.95), `la luna y los otros dos mundos, con su rótulo, están en la pantalla (${bodies.map((b) => `${b.x},${b.y}`).join(" · ")})`);
check(orbit.names.length === 2 && orbit.names.every((name) => /\S/.test(name)), `los dos mundos cerrados llevan nombre provisional y «Próximamente» (${orbit.names.join(", ")})`);
// Gira despacio: la cámara rodea el planeta.
const yaw0 = await t.evaluate(() => window.__world.rig.yaw);
await wait(2000);
const yaw1 = await t.evaluate(() => window.__world.rig.yaw);
check(yaw1 - yaw0 > 0.03 && yaw1 - yaw0 < 0.2 && (await onScreen()), `el planeta gira despacio y la nave sigue delante (${((yaw1 - yaw0) / 2).toFixed(3)} rad/s)`);
await t.shot("despegue-12b-orbita");
// Aterrizar deja todo como estaba.
await t.page.keyboard.press("KeyE");
// El camino inverso: baja, la cámara vuelve a acercarse y el planeta vuelve a ser la isla.
const down = [];
for (let i = 0; i < 6; i++) {
 await wait(900);
 down.push(await probe());
 await t.shot(`aterrizaje-${i + 1}`);
}
check(down.every((one, i) => i === 0 || (one.y <= down[i - 1].y + 0.5 && one.distance <= down[i - 1].distance + 0.01)), `al aterrizar baja y la cámara se acerca, sin saltos (alturas: ${down.map((one) => one.y.toFixed(0)).join(" → ")} m)`);
await wait(900);
now = await probe();
const after = await t.evaluate(() => ({ planet: window.__world.space.group.visible, yaw: window.__world.rig.yaw, fog: window.__world.scene.fog.density }));
check(now.phase === "idle" && now.y < 0.05 && Math.abs(now.x - PAD.x) < 0.05 && Math.abs(now.z - PAD.z) < 0.05 && Math.abs(now.distance - 1) < 0.01, "al aterrizar, la nave vuelve a su sitio y la cámara al astronauta");
check(!after.planet && after.yaw === 0 && after.fog > 0.001 && now.space === 0, "y en tierra no queda nada del espacio: ni planeta, ni giro, y vuelve la niebla");
await wait(2500);
await t.shot("despegue-13-de-vuelta");
await t.done();
