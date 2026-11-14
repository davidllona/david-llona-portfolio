// Movimiento del entorno: que el viento mueve de verdad la pradera (y no todo
// a la vez), que una ráfaga avanza por el terreno y que la hierba se aparta al
// paso y se recupera. Guarda además una secuencia de fotogramas para verlo.
//   node tests/e2e/motion.mjs [?backend=webgl]
import { open, check, wait } from "./common.mjs";

const t = await open({ query: process.argv[2] ?? "" });
const { page } = t;
await t.enter();
console.log("backend:", await t.evaluate(() => window.__world.backend));

// Miniatura en grises de una zona de la pantalla (x0…x1, y0…y1 en fracción).
const thumb = (x0, y0, x1, y1) =>
 t.evaluate(
  async (x0, y0, x1, y1) => {
   await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
   const source = document.querySelector("canvas.experience, .experience canvas, canvas");
   const canvas = document.createElement("canvas");
   canvas.width = 96;
   canvas.height = 60;
   const ctx = canvas.getContext("2d", { willReadFrequently: true });
   ctx.drawImage(source, source.width * x0, source.height * y0, source.width * (x1 - x0), source.height * (y1 - y0), 0, 0, 96, 60);
   const { data } = ctx.getImageData(0, 0, 96, 60);
   const gray = [];
   for (let i = 0; i < data.length; i += 4) gray.push((data[i] * 2 + data[i + 1] * 5 + data[i + 2]) / 8);
   return gray;
  },
  x0, y0, x1, y1,
 );
const difference = (a, b) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length;

// Pradera abierta, quietos: lo único que se mueve es el viento.
await t.put(-27, 12.5, { settle: 1500 });
const left = [], right = [];
for (let i = 0; i < 6; i++) {
 left.push(await thumb(0.05, 0.3, 0.3, 0.6));
 right.push(await thumb(0.62, 0.55, 0.87, 0.85));
 await t.shot(`viento-${i}`);
 await wait(180);
}
const motionLeft = left.slice(1).map((frame, i) => difference(frame, left[i]));
const motionRight = right.slice(1).map((frame, i) => difference(frame, right[i]));
const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;
check(mean(motionLeft) > 0.15 && mean(motionRight) > 0.15, `la pradera se mueve con el viento (cambio medio por fotograma: ${mean(motionLeft).toFixed(2)} y ${mean(motionRight).toFixed(2)} sobre 255)`);
// Variación espacial: dos zonas no se mueven al unísono.
const correlation = (() => {
 const a = motionLeft, b = motionRight, ma = mean(a), mb = mean(b);
 const cov = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0);
 const sa = Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0)), sb = Math.sqrt(b.reduce((s, v) => s + (v - mb) ** 2, 0));
 return sa && sb ? cov / (sa * sb) : 0;
})();
console.log(`     movimiento izquierda ${motionLeft.map((v) => v.toFixed(2)).join(" ")} · derecha ${motionRight.map((v) => v.toFixed(2)).join(" ")} · correlación ${correlation.toFixed(2)}`);

// El reloj del viento avanza y la ráfaga recorre el terreno.
const clock = () => t.evaluate(() => ({ time: window.__world.env.windTime.value, strength: window.__world.env.windStrength.value, front: window.__world.env.windGust.value.z }));
const before = await clock();
await t.evaluate(() => window.__world.env.startGust(-40, 12, 1));
await wait(1000);
const during = await clock();
await t.shot("rafaga-1s");
await wait(1500);
const later = await clock();
await t.shot("rafaga-2s5");
check(during.time > before.time, `el reloj del viento avanza (${before.time.toFixed(3)} → ${during.time.toFixed(3)})`);
check(during.front > 8 && later.front > during.front + 15, `el frente de la ráfaga avanza: ${during.front.toFixed(1)} m al segundo, ${later.front.toFixed(1)} m a los 2,5 s`);
check(during.strength > before.strength, `durante la ráfaga sube el viento (${before.strength.toFixed(2)} → ${during.strength.toFixed(2)})`);
await wait(9000);
const calm = await clock();
check(calm.front > 1000 && Math.abs(calm.strength - before.strength) < 0.05, `y luego amaina (fuerza ${calm.strength.toFixed(2)})`);

// Hierba al paso: deja rastro donde pisa, no más allá, y se recupera.
await t.put(-27, 12.5, { withWoody: false, settle: 2600 });
const trail = (x, z) => t.evaluate((x, z) => window.__world.env.trailAt(x, z), x, z);
const start = await t.pos();
await page.keyboard.down("KeyA");
await wait(900);
await t.shot("rastro-andando");
const middle = await t.pos();
await page.keyboard.up("KeyA");
await wait(250);
const end = await t.pos();
const behind = await trail((middle.x + end.x) / 2, end.z);
const aside = await trail(end.x, end.z + 4);
check(end.x < start.x - 2 && behind > 0.3 && aside < 0.02, `andar por la hierba deja rastro detrás (${behind.toFixed(2)}) y no a 4 m de lado (${aside.toFixed(2)})`);
await t.shot("rastro-recien");
// Se alejan los dos (quien se queda encima sigue pisando) y se espera.
await t.put(-27, 22, { settle: 4500 });
const healed = await trail((middle.x + end.x) / 2, end.z);
check(healed < behind * 0.12, `la hierba se recupera sola: ${behind.toFixed(2)} → ${healed.toFixed(3)} en 4,5 s`);

// Ninguna brizna sobre lo construido: la máscara que lee el césped (interpolada
// como en la GPU) vale menos que el umbral de nacer (0,07) en toda la pista,
// el campo, la plataforma del cohete, la plaza y el eje de los caminos.
const hard = await t.evaluate(async () => {
 const w = window.__world, L = await import("/src/worlds/living/layout.js");
 const worst = { pista: 0, campo: 0, plataforma: 0, plaza: 0, caminos: 0 };
 const see = (name, x, z) => { worst[name] = Math.max(worst[name], w.grassAt(x, z).amount); };
 for (const [name, rect] of [["pista", L.COURT], ["campo", L.PITCH]]) for (let x = rect.x0; x <= rect.x1; x += 0.2) for (let z = rect.z0; z <= rect.z1; z += 0.2) see(name, x, z);
 for (const [name, disc, r] of [["plataforma", L.PAD, L.PAD.padRadius], ["plaza", L.PLAZA, L.PLAZA.r - 0.4]]) for (let a = 0; a < 6.283; a += 0.05) for (let d = 0; d <= r; d += 0.2) see(name, disc.x + Math.cos(a) * d, disc.z + Math.sin(a) * d);
 for (const path of L.PATHS) for (let i = 0; i < path.length - 1; i++) for (let k = 0; k <= 1; k += 0.02) see("caminos", path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k);
 return worst;
});
check(Object.values(hard).every((v) => v < 0.07), `ninguna brizna sobre pista, campo, plataforma, plaza ni caminos (máscara máxima: ${Object.entries(hard).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(" · ")})`);
// Y la densidad cambia: tupida junto al camino, rala en los claros.
const spread = await t.evaluate(() => {
 const w = window.__world;
 let low = 1, high = 0;
 for (let x = -44; x <= 44; x += 0.5) for (let z = -44; z <= 44; z += 0.5) { const s = w.grassAt(x, z); if (s.amount > 0.3) { low = Math.min(low, s.density); high = Math.max(high, s.density); } }
 return { low, high, verge: w.grassAt(-9, 2.6).density };
});
check(spread.low < 0.2 && spread.high > 0.95 && spread.verge > 0.9, `hay claros y zonas tupidas (densidad ${spread.low.toFixed(2)}–${spread.high.toFixed(2)}; junto al camino ${spread.verge.toFixed(2)})`);
await t.done();
