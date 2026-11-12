// Portfolio profesional: menú de acceso rápido, hoja legible, modo directo
// (sin jugar) y versión sin WebGL. Escritorio y móvil emulado.
import { open, check, wait } from "./common.mjs";
import { PROJECTS } from "../../src/content/projects.js";
import { CONTACT_LINKS } from "../../src/content/contact.js";

const count = (t, selector) => t.evaluate((selector) => document.querySelectorAll(selector).length, selector);
const visibleTop = (t, id) =>
 t.evaluate((id) => {
  const box = document.querySelector(".sheet__scroll").getBoundingClientRect();
  const top = document.querySelector(`.sheet #${id}`).getBoundingClientRect().top;
  return top - box.top;
 }, id);

// ── Escritorio ──────────────────────────────────────────────────────────────
let t = await open();
let { page } = t;

// La bienvenida no ofrece un modo «sin jugar»: el portfolio se explora.
check((await count(t, ".overlay__direct")) === 0 && !/sin jugar/i.test(await t.text(".overlay")), "la bienvenida no tiene botón «sin jugar»");

// Menú rápido dentro del juego.
await t.enter();
const labels = await t.evaluate(() => [...document.querySelectorAll(".quick button")].map((b) => b.textContent));
check(labels.join("|").startsWith("Proyectos|Sobre mí|CV|Contacto|Logros"), `menú rápido: ${labels.join(" · ")}`);
await t.shot("portfolio-menu");
await t.evaluate(() => [...document.querySelectorAll(".quick button")].find((b) => b.textContent === "Contacto").click());
await wait(400);
// Contenido real del portfolio legible.
check((await count(t, ".sheet .project")) === PROJECTS.length, `la hoja muestra ${await count(t, ".sheet .project")} proyectos`);
const links = await t.evaluate(() => [...document.querySelectorAll(".sheet .project .modal__link")].map((a) => a.href));
check(PROJECTS.every((project) => links.includes(project.link)), "cada proyecto lleva su enlace real");
const contact = await t.evaluate(() => [...document.querySelectorAll(".portfolio__contact a")].map((a) => a.getAttribute("href")));
check(CONTACT_LINKS.every((link) => contact.includes(link.href)), `contacto: ${contact.length} enlaces reales`);
check((await count(t, "#cv a")) === 0 && /todavía no/.test(await t.text("#cv .portfolio__pending")), "CV sin PDF: aviso de pendiente y ningún botón de descarga");
check(!/Dosia/.test(await t.text(".sheet")), "Dosia no aparece mientras no haya datos");
// Es la última sección: no llega arriba del todo, pero debe quedar entera a la vista.
const contactVisible = await t.evaluate(() => {
 const box = document.querySelector(".sheet__scroll").getBoundingClientRect();
 const section = document.querySelector(".sheet #contacto").getBoundingClientRect();
 return section.top >= box.top - 1 && section.bottom <= box.bottom + 1;
});
check(contactVisible, "«Contacto» abre la hoja con su sección a la vista");
// Con la hoja abierta el astronauta no se mueve.
const before = await t.pos();
await t.hold("KeyD", 600);
const after = await t.pos();
check(Math.abs(after.x - before.x) < 0.05, "con la hoja abierta, WASD no mueve al astronauta");
// Navegación interna y cierre con Esc sin pausar.
await t.evaluate(() => [...document.querySelectorAll(".sheet__nav button")].find((b) => b.textContent === "Sobre mí").click());
await wait(900);
check(Math.abs(await visibleTop(t, "sobre-mi")) < 60, "la navegación de la hoja salta a «Sobre mí»");
await t.shot("portfolio-hoja");
await page.keyboard.press("Escape");
await wait(300);
check((await count(t, ".sheet")) === 0 && (await count(t, ".overlay--hidden")) === 1, "Esc cierra la hoja sin pausar el juego");
await t.hold("KeyD", 500);
check((await t.pos()).x > after.x + 0.5, "al cerrar, vuelve el control");
// Ir con Woody desde la hoja.
await t.evaluate(() => [...document.querySelectorAll(".quick button")].find((b) => b.textContent === "Proyectos").click());
await wait(300);
await t.evaluate(() => document.querySelector("#proyectos .portfolio__guide").click());
await wait(1200);
const w = await t.woody();
check((await count(t, ".sheet")) === 0 && w.mode === "guide", `«Ir allí con Woody» cierra la hoja y Woody guía (${w.mode})`);
// Navegable con teclado: el foco entra en la hoja y no se escapa.
await page.focus(".quick button");
await page.keyboard.press("Enter");
await wait(300);
let inside = true;
for (let i = 0; i < 40; i++) {
 await page.keyboard.press("Tab");
 inside &&= await t.evaluate(() => Boolean(document.activeElement.closest(".sheet")));
}
check(inside, "con Tab el foco recorre la hoja sin salirse");
await page.keyboard.press("Escape");
await t.done();

// ── Móvil (emulado, horizontal y vertical) ──────────────────────────────────
t = await open({ mobile: true });
({ page } = t);
await page.tap(".overlay__enter");
await page.waitForFunction(() => window.__world.rig.intro === 0, { timeout: 15000 });
await wait(600);
const overlap = await t.evaluate(() => {
 const boxes = [".quick", ".woody-menu__button", ".theme-toggle", ".sound-toggle", ".touch__pause"].map((s) => document.querySelector(s)?.getBoundingClientRect()).filter(Boolean);
 return boxes.some((a, i) => boxes.some((b, j) => j > i && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom));
});
check(!overlap, "móvil horizontal: el menú rápido no pisa otros botones");
await page.tap(".quick button");
await wait(400);
const fits = await t.evaluate(() => document.querySelector(".sheet__card").scrollWidth <= innerWidth + 1 && [...document.querySelectorAll(".sheet .project")].every((el) => el.getBoundingClientRect().right <= innerWidth + 1));
check(fits, "móvil: la hoja cabe sin desbordar a lo ancho");
await t.shot("portfolio-movil");
await t.done();

t = await open({ mobile: true, viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } });
({ page } = t);
await page.tap(".overlay__enter");
await page.waitForFunction(() => window.__world.rig.intro === 0, { timeout: 15000 });
await wait(600);
await page.tap(".quick button");
await wait(400);
const fitsTall = await t.evaluate(() => [...document.querySelectorAll(".sheet .project, .sheet__bar")].every((el) => el.getBoundingClientRect().right <= innerWidth + 1));
check(fitsTall && (await count(t, ".sheet .project")) === PROJECTS.length, "móvil vertical: la hoja es legible y no desborda");
await t.shot("portfolio-movil-vertical");
await t.done();

// ── Sin WebGL ───────────────────────────────────────────────────────────────
t = await open({ query: "?webgl=0" });
check((await count(t, ".fallback .project")) === PROJECTS.length && (await count(t, "canvas")) === 0, "sin WebGL: el portfolio completo en versión de lectura");
await t.shot("portfolio-sin-webgl");
await t.done();
