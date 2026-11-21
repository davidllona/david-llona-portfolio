// Capturas de las cartas (objetivo 26): cada carta de cada mundo, en escritorio
// y en móvil. No comprueba nada (eso, cards.mjs).
//   node tests/e2e/cartas.mjs <carpeta> [escritorio,movil] [mundo1,mundo2,mundo3]
// Las maquetas de referencia se capturan con tests/e2e/maquetas.mjs.
import fs from "node:fs";
import { open, wait } from "./common.mjs";
import { CONTACT, CV_KIOSK, LAB_TOTEMS, PROJECT_CABINS } from "../../src/worlds/living/layout.js";
import { QUEST_STOPS, STORY_DOOR, TELESCOPE, TOWER_DOOR } from "../../src/worlds/twisted/layout.js";
import { ANTENNA, CORE, MACHINES } from "../../src/worlds/cosmic/layout.js";

const folder = (process.argv[2] ?? "capturas/32-cartas") + "/";
const pick = (arg, all) => (arg && arg !== "-" ? arg.split(",") : all);
const views = pick(process.argv[3], ["escritorio", "movil"]);
const worlds = pick(process.argv[4], ["mundo1", "mundo2", "mundo3"]);
fs.mkdirSync(folder, { recursive: true });

const menu = (label) => (t) => t.evaluate((label) => [...document.querySelectorAll(".quick button")].find((one) => one.textContent === label).click(), label);
// Con el reloj en marcha, la puerta de la torre abre «Mi recorrido».
const clockOn = () => {
 const q = window.__world.quest;
 ["alquimista", "casa-arbol", "casita", "invernadero"].forEach((id) => q.collect(id));
 q.start();
};
const machineOn = (id) => [(id) => window.__world.lab.quest.switchOn(id), id];
// Cada carta: dónde se pulsa la E (o cómo se abre) y qué hay que preparar antes. `movil`: también en móvil.
const CARDS = {
 mundo1: {
  query: "",
  cards: [
   ...PROJECT_CABINS.map((cabin, i) => ({ name: `proyecto-${i + 1}`, at: [cabin.x + 0.4, cabin.z + 3.4], movil: i === 0 })),
   { name: "cv", at: [CV_KIOSK.x, CV_KIOSK.z + 1] },
   { name: "contacto", at: [CONTACT.antenna.x, CONTACT.antenna.z + 1.7], movil: true },
   { name: "laboratorio", at: [LAB_TOTEMS[0].x, LAB_TOTEMS[0].z + 1.8] },
   { name: "viaje", open: menu("Sobre mí") },
  ],
 },
 mundo2: {
  query: "?world=twisted",
  cards: [
   { name: "historia", at: [STORY_DOOR.x, STORY_DOOR.z] },
   { name: "alquimista", at: [QUEST_STOPS.alquimista.x, QUEST_STOPS.alquimista.z], hold: 2600 },
   { name: "casa-arbol", at: [QUEST_STOPS["casa-arbol"].x, QUEST_STOPS["casa-arbol"].z] },
   { name: "woody", at: [QUEST_STOPS.casita.x, QUEST_STOPS.casita.z], movil: true },
   { name: "invernadero", at: [QUEST_STOPS.invernadero.x, QUEST_STOPS.invernadero.z], hold: 2000 },
   { name: "torre", at: [TOWER_DOOR.x, TOWER_DOOR.z], before: [clockOn], movil: true },
   { name: "observatorio", at: [TELESCOPE.x, TELESCOPE.z], hold: 3200 },
   { name: "viaje", open: menu("Proyectos") },
  ],
 },
 mundo3: {
  query: "?world=cosmic",
  cards: [
   { name: "dosia", at: [MACHINES.dosia.use.x + 0.4, MACHINES.dosia.use.z + 0.9], before: machineOn("dosia"), movil: true },
   { name: "epidos", at: [MACHINES.epidos.use.x, MACHINES.epidos.use.z], before: machineOn("epidos"), movil: true },
   { name: "chuchometro", at: [MACHINES.chuchometro.use.x, MACHINES.chuchometro.use.z], before: machineOn("chuchometro") },
   { name: "viajes", at: [MACHINES.viajes.use.x, MACHINES.viajes.use.z], before: machineOn("viajes") },
   { name: "nucleo", at: [CORE.x, CORE.z + CORE.r + 1.1] },
   { name: "antena", at: [ANTENNA.x, ANTENNA.z + 2.2] },
  ],
 },
};
const VIEWS = {
 escritorio: { viewport: { width: 1440, height: 900 } },
 movil: { viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, mobile: true },
};

for (const view of views) {
 for (const world of worlds) {
  const { query, cards } = CARDS[world];
  const t = await open({ ...VIEWS[view], query });
  await t.enter();
  // (Sin el aviso del primer logro por medio.)
  await t.put(3, 9, { withWoody: false, settle: 5200 });
  for (const card of cards) {
   if (view === "movil" && !card.movil) continue;
   if (card.before) await t.evaluate(...card.before);
   if (card.at) {
    await t.put(card.at[0], card.at[1], { withWoody: false, settle: 1100 });
    await t.page.keyboard.press("KeyE");
   } else await card.open(t);
   const shown = await t.page.waitForSelector(".modal__card", { timeout: 12000 }).then(() => true, () => false);
   if (!shown) {
    console.log(`${world} ${card.name} (${view}): no se abre`);
    continue;
   }
   await wait(2300);
   await t.page.screenshot({ path: `${folder}${world}-${card.name}-${view}.jpg`, type: "jpeg", quality: 90 });
   await t.page.keyboard.press("Escape");
   await wait(card.hold ?? 1200);
   // (Woody no se pone a guiar entre carta y carta.)
   await t.evaluate(() => window.__world.woodyBrain.mode === "guide" && window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyG" })));
  }
  if (t.pageErrors.length) console.log(world, view, t.pageErrors.join("\n"));
  await t.browser.close();
 }
}
console.log("hecho");
