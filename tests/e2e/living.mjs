// Planeta 1 · The Living World: que se puede llegar a todo andando, que cada
// zona abre su contenido real y que los eventos del bosque funcionan.
//   node tests/e2e/living.mjs [fps]
import { distanceTo } from "../../src/worlds/collision.js";
import { open, check, wait } from "./common.mjs";
import { living } from "../../src/worlds/living/layout.js";
import { PROJECTS } from "../../src/content/projects.js";
import { LAB_PROJECTS } from "../../src/content/lab.js";

// ── Sin navegador: la red de caminos se puede andar de punta a punta ─────────
const { nodes, links } = living.guide;
for (const [from, to] of links) {
 const [ax, az] = nodes[from];
 const [bx, bz] = nodes[to];
 const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
 let problem = null;
 let y = living.height(ax, az);
 for (let i = 1; i <= steps && !problem; i++) {
  const x = ax + ((bx - ax) * i) / steps;
  const z = az + ((bz - az) * i) / steps;
  if (living.blocked(x, z, y)) problem = `pared o agua honda en (${x.toFixed(1)}, ${z.toFixed(1)})`;
  const hit = living.colliders.find((c) => c.active !== false && distanceTo(c, x, z) < c.r + 0.42);
  if (hit) problem = `obstáculo en (${x.toFixed(1)}, ${z.toFixed(1)})`;
  y = living.height(x, z);
 }
 check(!problem, `camino ${from} → ${to}${problem ? ": " + problem : ""}`);
}
check(living.height(living.spawn.x, living.spawn.z) > living.waterLevel, "el punto de llegada está en tierra");

// ── En el navegador ─────────────────────────────────────────────────────────
const t = await open();
const { page } = t;
await t.enter();
const prompt = async () => (await t.hint()) ?? "";
const title = () => t.text(".modal__title");
const use = async () => {
 await page.keyboard.press("KeyE");
 await wait(1300); // la cámara se acerca al edificio antes de abrir la ficha
};
const close = async () => {
 await page.keyboard.press("Escape");
 await wait(300);
 // Esc también pausa: si ha salido la pantalla de pausa, se vuelve a entrar.
 if (await page.$(".overlay:not(.overlay--hidden)")) await t.enter();
};

check((await t.evaluate(() => window.__world.world().id)) === "living", "el planeta de inicio es The Living World");

// Cruzar el puente andando: se sube al tablero y se llega al otro lado.
await t.put(18.2, -0.6);
await page.keyboard.down("KeyD");
await wait(1300);
const mid = await t.pos();
await wait(2200);
await page.keyboard.up("KeyD");
const far = await t.pos();
check(mid.y > 0.3 && far.x > 26, `el puente se cruza a pie (a mitad y=${mid.y}, al final x=${far.x})`);

// Subir la rampa a la meseta.
await t.put(-14.5, -14);
await page.keyboard.down("KeyW");
await page.keyboard.down("KeyD");
await wait(4200);
await page.keyboard.up("KeyD");
await page.keyboard.up("KeyW");
const top = await t.pos();
check(top.y > 3.5, `la rampa sube a la meseta (y=${top.y})`);

// Proyectos: cada cabaña abre la ficha de su proyecto.
const { PROJECT_CABINS, LAB_TOTEMS, CV_KIOSK, TREEHOUSE, OBSERVATORY, CONTACT, WIND_CHIME, BASKET } = await import("../../src/worlds/living/layout.js");
for (const [i, project] of PROJECTS.entries()) {
 await t.put(PROJECT_CABINS[i].x + 0.4, PROJECT_CABINS[i].z + 3.4, { withWoody: false, settle: 500 });
 const hint = await prompt();
 await use();
 const shown = await title();
 const link = await t.evaluate(() => document.querySelector(".modal__link")?.getAttribute("href") ?? null);
 check(hint.includes(project.name) && shown === project.name && link === project.link, `cabaña ${i + 1}: «${shown}» con su enlace real`);
 await close();
}
// Lab: los tótems.
for (const [i, experiment] of LAB_PROJECTS.slice(0, 3).entries()) {
 await t.put(LAB_TOTEMS[i].x, LAB_TOTEMS[i].z + 1.8, { withWoody: false, settle: 500 });
 await use();
 check((await title()) === experiment.title, `tótem ${i + 1}: «${await title()}»`);
 await close();
}
// CV: sin PDF, la ficha lo dice y no hay enlace de descarga.
await t.put(CV_KIOSK.x, CV_KIOSK.z + 1.4, { withWoody: false, settle: 500 });
check(/CV/.test(await prompt()), `atril del CV: "${await prompt()}"`);
await use();
const cvLink = await page.$(".modal__link");
check(/pendiente/i.test((await title()) ?? "") && !cvLink, `CV sin PDF: «${await title()}», sin botón de descarga`);
await close();
// Sobre mí.
await t.put(TREEHOUSE.x + 2.6, TREEHOUSE.z + 3, { withWoody: false, settle: 500 });
check(/Sobre mí/.test(await prompt()), `casa del árbol: "${await prompt()}"`);
await use();
check(Boolean(await title()), `Sobre mí abre su texto: «${await title()}»`);
await close();
// Observatorio: el telescopio cambia a noche y de vuelta.
await t.put(OBSERVATORY.x, OBSERVATORY.z + 3.0, { withWoody: false, settle: 500 });
check(/Telescopio/.test(await prompt()), `observatorio: "${await prompt()}"`);
await use();
await wait(1800);
const night = await t.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("color-scheme") + "|" + localStorage.getItem("planeta-tema"));
check(/night/.test(night), `el telescopio pone la noche (${night})`);
await t.shot("living-noche-meseta");
await use();
await wait(600);
check((await t.evaluate(() => localStorage.getItem("planeta-tema"))) === "day", "y otra vez devuelve el día");
// Contacto: tres terminales con su enlace.
for (const [i, name] of ["LinkedIn", "GitHub", "Email"].entries()) {
 await t.put(CONTACT.terminals[i].x, CONTACT.terminals[i].z + 1.5, { withWoody: false, settle: 400 });
 check((await prompt()).toLowerCase().includes(name.toLowerCase()), `terminal ${i + 1}: "${await prompt()}"`);
}
// Carillón: despierta al bosque.
await t.put(WIND_CHIME.x, WIND_CHIME.z + 1.3, { withWoody: false, settle: 500 });
const before = await t.evaluate(() => window.__world.gusts ?? 0);
await use();
const toast = (await t.toasts()).join(" · ");
const after = await t.evaluate(() => window.__world.gusts ?? 0);
check(after === before + 1 && /bosque despierta/i.test(toast ?? ""), `el carillón lanza la ráfaga (aviso: "${toast}")`);
await wait(1500);
await t.shot("living-rafaga");
// Baloncesto: el balón está en su soporte y se puede coger.
await t.put(BASKET.ballStand.x + 0.9, BASKET.ballStand.z + 0.6, { withWoody: false, settle: 600 });
check(/balón/i.test(await prompt()), `pista: "${await prompt()}"`);
await use();
await wait(500);
check(/canasta/i.test(await prompt()), `con el balón en la mano: "${await prompt()}"`);

await t.done();

// ── Rendimiento a resolución retina, sin límite de fps ──────────────────────
if (process.argv[2] === "fps") {
 const r = await open({ viewport: { width: 1440, height: 810, deviceScaleFactor: 2 }, uncapped: true });
 await r.enter();
 for (const [name, x, z] of [["llegada", 0, 7.5], ["proyectos", -20, 0], ["estanque", 8, -6], ["meseta", 8, -24], ["pista", 3, 26]]) {
  await r.put(x, z, { settle: 1200 });
  console.log(`fps ${name}: ${await r.fps(3)}`);
 }
 await r.done();
}
