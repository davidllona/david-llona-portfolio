// Capturas de la bienvenida (islote nocturno) en escritorio, panorámico y móvil
// vertical. No comprueba nada.
//   node tests/e2e/welcome.mjs [etiqueta]
import { open, out, wait } from "./common.mjs";

const tag = process.argv[2] ?? "ahora";
const views = [
 ["escritorio", { viewport: { width: 1440, height: 900, deviceScaleFactor: 2 } }],
 ["panoramico", { viewport: { width: 1920, height: 820 } }],
 ["movil-vertical", { mobile: true, viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }],
];
for (const [name, options] of views) {
 // Primero, recién retirada la pantalla de carga: «Preparando el planeta…».
 if (name !== "panoramico") {
  const early = await open({ ...options, early: true });
  await early.shot(`bienvenida-${name}-preparando-${tag}`);
  console.log(name, "· texto mientras prepara:", await early.text(".overlay__enter"));
  await early.browser.close();
 }
 const t = await open(options);
 await wait(2500);
 await t.shot(`bienvenida-${name}-${tag}`);
 if (name === "escritorio") {
  // Tres recortes seguidos de los protagonistas: se ve si respiran y si Woody mueve la cola.
  for (let i = 0; i < 3; i++) {
   await wait(330);
   await t.page.screenshot({ path: `${out}bienvenida-personajes-${i}-${tag}.jpg`, type: "jpeg", quality: 88, clip: { x: 980, y: 370, width: 380, height: 270 } });
  }
 }
 console.log(name, t.logs.length ? t.logs.join("\n") : "sin avisos");
 await t.browser.close();
}
