// El descenso de la bienvenida al planeta, fotograma a fotograma: una captura
// cada 200 ms desde el clic hasta después de aterrizar. No comprueba nada salvo
// que no haya errores en consola.
//   node tests/e2e/descent.mjs [etiqueta]
import { open, out, wait } from "./common.mjs";

const tag = process.argv[2] ?? "ahora";
const t = await open({ viewport: { width: 1440, height: 900 } });
await wait(1200);
await t.page.click(".overlay__enter");
const started = Date.now();
for (let i = 0; i < 20; i++) {
 await t.page.screenshot({ path: `${out}descenso-${String(i).padStart(2, "0")}-${tag}.jpg`, type: "jpeg", quality: 70 });
 const intro = await t.evaluate(() => window.__world.rig.intro);
 console.log(`fotograma ${i}: ${Date.now() - started} ms · intro ${intro.toFixed(2)}`);
 await wait(120);
}
await t.done();
