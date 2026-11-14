// Nada revienta y el 3D se ve. Recorre carga → bienvenida → estrella fugaz →
// aterrizaje → mundo, en Chrome sin ventana y con ventana (como un visitante), y
// falla si hay CUALQUIER excepción de página o si el lienzo se queda sin dibujar.
// (El 14-11-2026, en Windows, una excepción al dibujar la estela de la estrella
// fugaz dejaba el lienzo vacío y las pruebas seguían diciendo OK.)
//   node tests/e2e/errors.mjs [sin-ventana | con-ventana]
import { open, check, wait, out } from "./common.mjs";

const only = process.argv[2];
const modes = [
 { headful: false, tag: "sin-ventana" },
 { headful: true, tag: "con-ventana" },
].filter((mode) => !only || mode.tag === only);

// Cuánto varía la imagen del lienzo 3D: tonos de gris distintos en una rejilla
// de 64 × 40 y diferencia entre el más claro y el más oscuro. Un lienzo sin
// dibujar da 1 tono y 0 de contraste.
const drawn = (t) =>
 t.evaluate(
  () =>
   new Promise((resolve) =>
    requestAnimationFrame(() => {
     const source = document.querySelector("canvas");
     const canvas = document.createElement("canvas");
     canvas.width = 64;
     canvas.height = 40;
     const ctx = canvas.getContext("2d", { willReadFrequently: true });
     ctx.drawImage(source, 0, 0, 64, 40);
     const { data } = ctx.getImageData(0, 0, 64, 40);
     const gray = [];
     for (let i = 0; i < data.length; i += 4) gray.push(Math.round((data[i] * 2 + data[i + 1] * 5 + data[i + 2]) / 8));
     resolve({ tones: new Set(gray).size, contrast: Math.max(...gray) - Math.min(...gray) });
    }),
   ),
 );
const seen = ({ tones, contrast }) => tones >= 24 && contrast >= 40;
const say = ({ tones, contrast }) => `${tones} tonos, contraste ${contrast} sobre 255`;

for (const { headful, tag } of modes) {
 console.log(`── Chrome ${tag.replace("-", " ")}`);
 const t = await open({ headful });
 const { page } = t;
 const info = await t.evaluate(async () => {
  const adapter = await navigator.gpu?.requestAdapter();
  return { backend: window.__world.backend, gpu: adapter ? `${adapter.info?.vendor ?? "?"} ${adapter.info?.architecture ?? ""}`.trim() : "sin WebGPU" };
 });
 console.log(`     backend ${info.backend} · GPU ${info.gpu}`);

 check(t.pageErrors.length === 0, `la carga termina sin excepciones (${t.pageErrors.length})`);
 const welcome = await drawn(t);
 check(seen(welcome), `la bienvenida se dibuja (${say(welcome)})`);
 await t.shot(`errores-bienvenida-${tag}`);

 // La estrella fugaz nace oculta y aparece más tarde: es justo lo que se dibujaba sin pipeline.
 const before = await t.evaluate(() => window.__world.shooting.count);
 const star = await page.waitForFunction((count) => window.__world.shooting.count > count && window.__world.shooting.active > 0, { timeout: 15000, polling: "raf" }, before).then(() => true, () => false);
 await wait(250);
 const withStar = await drawn(t);
 check(star && seen(withStar) && t.pageErrors.length === 0, `pasa una estrella fugaz y la escena se sigue dibujando (${say(withStar)})`);
 await t.shot(`errores-estrella-${tag}`);

 await t.enter();
 await t.hold("KeyW", 900);
 const world = await drawn(t);
 check(seen(world), `tras aterrizar, el mundo se dibuja (${say(world)})`);
 // Y sigue vivo: la imagen cambia al andar.
 const a = await t.pos();
 await t.hold("KeyD", 900);
 const b = await t.pos();
 check(Math.hypot(b.x - a.x, b.z - a.z) > 0.5 && seen(await drawn(t)), `y sigue dibujándose al andar (${Math.hypot(b.x - a.x, b.z - a.z).toFixed(1)} m)`);
 await t.shot(`errores-mundo-${tag}`);
 const skipped = await t.evaluate(() => window.__world.skippedDraws ?? 0);
 console.log(`     dibujados aplazados por pipeline aún sin crear: ${skipped}`);
 await t.done();
}
console.log(`     capturas en ${out}errores-*.jpg`);
