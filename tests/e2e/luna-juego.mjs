// Capturas del juego de The Twisted Moon (objetivo 23): el reloj parado, cada
// parada con su panel abierto, la secuencia de arranque (tres fotogramas), la
// línea de tiempo, la vista por el telescopio y el panel «Sobre mí». No comprueba nada.
//   node tests/e2e/luna-juego.mjs [carpeta] [móvil]
import fs from "node:fs";
import { open, wait } from "./common.mjs";
import { STOP_ORDER } from "../../src/content/twisted.js";
import { QUEST_STOPS, TELESCOPE, TOWER_DOOR } from "../../src/worlds/twisted/layout.js";

const folder = (process.argv[2] ?? "capturas/28-mundo2-contenido") + "/";
const mobile = process.argv.includes("móvil") || process.argv.includes("movil");
fs.mkdirSync(folder, { recursive: true });
const t = await open(mobile ? { mobile: true, query: "?world=twisted" } : { viewport: { width: 1600, height: 900 }, query: "?world=twisted" });
const shot = (name) => t.page.screenshot({ path: `${folder}${mobile ? "movil-" : ""}${name}.jpg`, type: "jpeg", quality: 90 });
const use = async () => {
 if (mobile) await t.page.evaluate(() => window.__world.useNearest?.());
 else await t.page.keyboard.press("KeyE");
};
await t.enter();
await wait(1500);

// El reloj parado, desde el pie de la torre y desde la llegada.
await shot("01-llegada-reloj-parado");
await t.put(TOWER_DOOR.x + 0.6, TOWER_DOOR.z + 1.6, { settle: 600 });
await t.evaluate((x, z) => Object.assign(window.__world.rig, { focus: { x, y: window.__world.player.position.y + 8.2, z }, distance: 1.7, lift: 0.5 }), TOWER_DOOR.focus[0], TOWER_DOOR.focus[2]);
await wait(1800);
await shot("02-torre-reloj-parado");
await t.evaluate(() => Object.assign(window.__world.rig, { focus: null, distance: 1, lift: 1 }));

// Las paradas: el engranaje ante la puerta y, luego, su panel.
let n = 3;
for (const id of STOP_ORDER) {
 const spot = QUEST_STOPS[id];
 await t.put(spot.x, spot.z, { settle: 1600 });
 await shot(`${String(n).padStart(2, "0")}-${id}-engranaje`);
 await t.page.keyboard.press("KeyE");
 await t.page.waitForSelector(".modal__card", { timeout: 6000 }).catch(() => {});
 await wait(900);
 await shot(`${String(n).padStart(2, "0")}-${id}-panel`);
 await t.page.keyboard.press("Escape");
 await wait(1400);
 await shot(`${String(n).padStart(2, "0")}-${id}-despues`);
 n += 1;
}

// La secuencia de arranque: tres fotogramas y la línea de tiempo.
await t.put(TOWER_DOOR.x, TOWER_DOOR.z + 0.4, { settle: 1300 });
await shot("07-torre-lista");
await t.page.keyboard.press("KeyE");
await wait(1700);
await shot("08-arranque-1-engranajes");
await wait(1900);
await shot("09-arranque-2-esferas");
await wait(1700);
await shot("10-arranque-3-en-marcha");
await t.page.waitForSelector(".modal__card", { timeout: 9000 }).catch(() => {});
await wait(900);
await shot("11-mi-recorrido");
await t.page.keyboard.press("Escape");
await wait(1200);

// El observatorio: la vista por el telescopio y su panel.
await t.put(TELESCOPE.x, TELESCOPE.z, { settle: 1500 });
await shot("12-observatorio");
await t.page.keyboard.press("KeyE");
await wait(1500);
await shot("13-telescopio");
await t.page.waitForSelector(".modal__card", { timeout: 9000 }).catch(() => {});
await wait(900);
await shot("14-lo-que-viene");
await t.page.keyboard.press("Escape");
await wait(900);

// El panel «Sobre mí» del menú, con todos los textos.
const about = await t.page.$(".quick button");
if (about) {
 await t.page.evaluate(() => [...document.querySelectorAll(".quick button")].find((one) => one.textContent.trim() === "Sobre mí")?.click());
 await wait(900);
 await shot("15-sobre-mi");
}
console.log(t.pageErrors.length ? t.pageErrors.join("\n") : "sin excepciones");
console.log(t.logs.length ? [...new Set(t.logs)].join("\n") : "sin avisos en consola");
await t.browser.close();
