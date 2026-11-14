// Experiencia solo 3D: el menú superior lleva a cada zona dentro del mundo (no
// abre ninguna página aparte), no queda porfolio legible, el CV se anuncia como
// pendiente mientras no haya PDF y, sin WebGL, solo sale un aviso con contacto.
import { open, check, wait } from "./common.mjs";
import { CONTACT_LINKS, EMAIL } from "../../src/content/contact.js";
import { CV } from "../../src/content/cv.js";
import { living } from "../../src/worlds/living/layout.js";

const count = (t, selector) => t.evaluate((selector) => document.querySelectorAll(selector).length, selector);
const press = (t, label) => t.evaluate((label) => [...document.querySelectorAll(".quick button")].find((b) => b.textContent === label).click(), label);

// ── Escritorio ──────────────────────────────────────────────────────────────
let t = await open();
let { page } = t;
check((await count(t, ".overlay__direct")) === 0 && !/sin jugar/i.test(await t.text(".overlay")), "la bienvenida no tiene botón «sin jugar»");
await t.enter();
const labels = await t.evaluate(() => [...document.querySelectorAll(".quick button")].map((b) => b.textContent));
check(labels.join("|").startsWith("Proyectos|Sobre mí|CV|Contacto|Logros"), `menú superior: ${labels.join(" · ")}`);

// Cada botón pide a Woody que guíe hasta su zona; siguiéndole, se llega.
const PLACES = [["Proyectos", "proyectos"], ["CV", "cv"], ["Contacto", "contacto"]];
for (const [label, place] of PLACES) {
 await t.put(0, 7.5, { settle: 900 });
 await press(t, label);
 await wait(700);
 const w = await t.woody();
 const guideTo = await t.evaluate(() => window.__world.woody.guideTo);
 check((await count(t, ".sheet, .modal")) === 0 && w.mode === "guide" && guideTo === place, `«${label}» no abre ninguna página: Woody guía hacia ${guideTo}`);
 if (place === "proyectos") {
  check(/sígueme/i.test((await t.speech()) ?? ""), `y lo dice en su bocadillo: "${await t.speech()}"`);
  await t.shot("menu-proyectos-0-sale");
 }
 const arrived = await t.followWoody({ run: true });
 await wait(500);
 const p = await t.pos();
 const [nx, nz] = living.guide.nodes[place];
 check(arrived && Math.hypot(p.x - nx, p.z - nz) < 7, `siguiéndole se llega a ${label} (a ${Math.hypot(p.x - nx, p.z - nz).toFixed(1)} m de su punto)`);
 await t.shot(`menu-${place}-llegada`);
}

// «Sobre mí» no tiene sitio en este mundo: su botón abre la ficha sin mover a nadie.
await t.put(0, 7.5, { settle: 900 });
await press(t, "Sobre mí");
await wait(600);
check((await count(t, ".modal")) === 1 && (await t.woody()).mode !== "guide" && /\S/.test((await t.text(".modal__title")) ?? ""), `«Sobre mí» abre su ficha desde el menú, sin guiado: «${await t.text(".modal__title")}»`);
const aboutTags = await count(t, ".modal__tag, .modal__tags li, .modal__tags span");
check(aboutTags > 0, `y trae las áreas de trabajo (${aboutTags})`);
await page.keyboard.press("Escape");
await wait(500);
check((await count(t, ".modal")) === 0, "Esc la cierra");
check(!living.guide.places.some((place) => place.id === "sobre-mi"), "Woody ya no guía a «Sobre mí»");

// Con una ficha abierta no se mueve; al cerrarla, se sigue jugando.
await t.put(living.guide.nodes.cv[0] + 0.4, living.guide.nodes.cv[1] - 0.4, { withWoody: false, settle: 900 });
check(/CV/.test((await t.hint()) ?? ""), `junto al atril: "${await t.hint()}"`);
await page.keyboard.press("KeyE");
await wait(350);
check((await count(t, ".modal")) === 0 && (await t.evaluate(() => Boolean(window.__world.rig.focus))), "al usar el atril, primero se acerca la cámara");
await wait(1000);
check((await count(t, ".modal")) === 1, "y al llegar se abre la ficha del CV");
if (CV.file) check((await t.evaluate(() => document.querySelector(".modal__link")?.hasAttribute("download"))) === true && (await count(t, ".quick__download")) === 1, "el CV se descarga desde su ficha y desde el menú");
else check((await count(t, ".modal__link")) === 0 && (await count(t, ".quick__download")) === 0 && /pendiente/i.test(await t.text(".modal__title")), "sin PDF todavía: la ficha lo dice y no se ofrece descarga");
await t.shot("ficha-cv");
const before = await t.pos();
await t.hold("KeyD", 500);
check(Math.abs((await t.pos()).x - before.x) < 0.05, "con la ficha abierta, WASD no mueve al astronauta");
await page.keyboard.press("Escape");
await wait(900);
check((await count(t, ".modal")) === 0 && (await count(t, ".overlay--hidden")) === 1 && !(await t.evaluate(() => Boolean(window.__world.rig.focus))), "Esc cierra la ficha sin pausar y la cámara vuelve");
await t.hold("KeyA", 500);
check((await t.pos()).x < before.x - 0.5, "al cerrar, vuelve el control");
await t.done();

// ── Móvil (emulado) ─────────────────────────────────────────────────────────
t = await open({ mobile: true });
({ page } = t);
await page.tap(".overlay__enter");
await page.waitForFunction(() => window.__world.rig.intro === 0, { timeout: 15000 });
await wait(600);
const overlap = await t.evaluate(() => {
 const boxes = [".quick", ".woody-menu__button", ".theme-toggle", ".sound-toggle", ".touch__pause"].map((s) => document.querySelector(s)?.getBoundingClientRect()).filter(Boolean);
 return boxes.some((a, i) => boxes.some((b, j) => j > i && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom));
});
check(!overlap, "móvil horizontal: el menú superior no pisa otros botones");
await page.tap(".quick button");
await wait(600);
check((await count(t, ".sheet, .modal")) === 0 && (await t.woody()).mode === "guide", "móvil: tocar un botón del menú también hace que Woody guíe");
await t.shot("menu-movil");
await t.done();

// ── Sin WebGL ───────────────────────────────────────────────────────────────
t = await open({ query: "?webgl=0" });
const links = await t.evaluate(() => [...document.querySelectorAll(".fallback a")].map((a) => a.getAttribute("href")));
const linkedin = CONTACT_LINKS.find((link) => link.label === "LinkedIn").href;
check((await count(t, "canvas")) === 0 && links.length === 2 && links.includes(linkedin) && links.includes(`mailto:${EMAIL}`), `sin WebGL: solo un aviso con LinkedIn y correo (${links.length} enlaces)`);
check((await count(t, ".project, .portfolio, .sheet")) === 0, "y ningún porfolio de lectura");
await t.shot("sin-webgl");
await t.done();
