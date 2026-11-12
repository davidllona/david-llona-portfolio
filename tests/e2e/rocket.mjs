// Despegue: la nave no cambia de tamaño, el césped no se rompe (el parche no
// cambia de tamaño y solo se agita con el empuje), la cámara sigue al cohete
// y hay humo, polvo y chispas. Saca la serie de fotogramas.
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
  return { phase: w.ship.flight.phase, scale: [body.scale.x, body.scale.y, body.scale.z], y: body.position.y, push, distance: w.rig.distance, thrust: w.ship.exhaust.thrust };
 }, PAD);
const onScreen = async () => {
 const y = (await probe()).y;
 const [sx, sy] = await t.screen(PAD.x, y + 4, PAD.z);
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
check(samples.slice(0, 7).every((one) => one.seen), "la cámara sigue al cohete mientras sube");
const heights = samples.map((one) => one.y);
check(heights[1] - heights[0] < heights[3] - heights[2] && heights[4] > 8, `acelera poco a poco (alturas: ${heights.slice(0, 6).map((h) => h.toFixed(1)).join(" → ")} m)`);
await wait(1500);
check((await probe()).phase === "orbit", "y llega a la órbita");
await t.shot("despegue-12-orbita");
// Aterrizar deja todo como estaba.
await t.page.keyboard.press("KeyE");
await wait(5600);
now = await probe();
check(now.phase === "idle" && now.y < 0.05 && Math.abs(now.distance - 1) < 0.01, "al aterrizar, la nave vuelve a su sitio y la cámara al astronauta");
await wait(2500);
await t.shot("despegue-13-de-vuelta");
await t.done();
