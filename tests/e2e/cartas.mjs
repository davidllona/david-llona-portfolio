// Capturas de las cartas (objetivo 25): la ficha de un proyecto (mundo 1), la
// hoja de Woody (mundo 2) y el holograma de Dosia (mundo 3). No comprueba nada.
//   node tests/e2e/cartas.mjs <carpeta> [qué]
//     qué: escritorio, movil, apertura, galeria; por defecto, todo
// «apertura»: tres fotogramas de la animación con que la carta sale de su objeto
// (se detiene la animación en tres instantes: no depende de cuándo dispare la captura).
import fs from "node:fs";
import { open, wait } from "./common.mjs";
import { PROJECT_CABINS } from "../../src/worlds/living/layout.js";
import { QUEST_STOPS } from "../../src/worlds/twisted/layout.js";
import { MACHINES } from "../../src/worlds/cosmic/layout.js";

const folder = (process.argv[2] ?? "capturas/31-cartas/muestra") + "/";
const what = process.argv[3] && process.argv[3] !== "-" ? process.argv[3].split(",") : ["escritorio", "movil", "apertura", "galeria"];
fs.mkdirSync(folder, { recursive: true });

const CARDS = [
 { name: "mundo1-proyecto", query: "", at: [PROJECT_CABINS[0].x + 0.4, PROJECT_CABINS[0].z + 3.4] },
 { name: "mundo2-woody", query: "?world=twisted", at: [QUEST_STOPS.casita.x, QUEST_STOPS.casita.z] },
 // (La máquina, ya encendida: la E abre su carta sin pasar por la secuencia.)
 { name: "mundo3-dosia", query: "?world=cosmic", at: [MACHINES.dosia.use.x + 0.4, MACHINES.dosia.use.z + 0.9], before: () => window.__world.lab.quest.switchOn("dosia") },
];
const VIEWS = {
 escritorio: { viewport: { width: 1440, height: 900 } },
 movil: { viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, mobile: true },
};
const shot = (t, name) => t.page.screenshot({ path: `${folder}${name}.jpg`, type: "jpeg", quality: 90 });

async function show(card, view) {
 const t = await open({ ...VIEWS[view], query: card.query });
 await t.enter();
 await t.put(card.at[0], card.at[1], { withWoody: false, settle: 900 });
 if (card.before) await t.evaluate(card.before);
 await wait(600);
 await t.page.keyboard.press("KeyE");
 await t.page.waitForSelector(".modal__card", { timeout: 12000 });
 return t;
}

for (const view of ["escritorio", "movil"].filter((one) => what.includes(one))) {
 for (const card of CARDS) {
  const t = await show(card, view);
  await wait(1600);
  await shot(t, `${card.name}-${view}`);
  if (t.pageErrors.length) console.log(card.name, view, t.pageErrors.join("\n"));
  await t.browser.close();
 }
}
if (what.includes("apertura")) {
 for (const card of CARDS) {
  const t = await show(card, "escritorio");
  // Las animaciones de la carta, detenidas en tres instantes de su recorrido.
  for (const [i, part] of [0.1, 0.34, 0.7].entries()) {
   await t.evaluate((part) => {
    for (const animation of document.querySelector(".modal").getAnimations({ subtree: true })) {
     const timing = animation.effect.getComputedTiming();
     if (timing.iterations === Infinity) continue; // (lo que late o parpadea sin fin, a su aire)
     animation.pause();
     animation.currentTime = (timing.delay ?? 0) + timing.duration * part;
    }
   }, part);
   await wait(150);
   await shot(t, `${card.name}-apertura-${i + 1}`);
  }
  await t.browser.close();
 }
}
if (what.includes("galeria")) {
 // La galería con más de una imagen (flechas y puntos) y el marcador de cuando no hay ninguna: se abre la
 // misma ficha con otros datos de galería. Es una demostración: hoy cada proyecto tiene una sola imagen.
 const t = await show(CARDS[0], "escritorio");
 await wait(900);
 for (const [name, gallery] of [["mundo1-galeria-varias", ["/images/projects/configurador-alfombras.png", "/images/projects/aio.png", "/images/projects/diploma3d.png"]], ["mundo1-sin-imagen", []]]) {
  const ok = await t.evaluate((gallery) => (window.__world.card ? (window.__world.card({ gallery }), true) : false), gallery);
  if (!ok) break;
  await wait(700);
  if (gallery.length) await t.page.click(".card__next").catch(() => {});
  await wait(700);
  await shot(t, name);
 }
 await t.browser.close();
}
console.log("hecho");
