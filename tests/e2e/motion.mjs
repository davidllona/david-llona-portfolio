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
await t.done();
