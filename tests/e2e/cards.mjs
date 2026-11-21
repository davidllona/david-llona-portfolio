// Las cartas (objetivo 25): una variante por mundo sobre un mismo componente.
// Comprueba lo común (velo sin emborronar, sale del objeto, E y Esc cierran,
// foco atrapado, móvil, «reducir movimiento») y lo propio de cada una: la ficha
// de proyecto con su galería, la hoja de Woody con su polaroid y el holograma
// de Dosia con su estado.
//   node tests/e2e/cards.mjs
import { open, check, wait } from "./common.mjs";
import { APP_STATUS, PENDING, PROJECT_CARDS } from "../../src/content/cards.js";
import { MACHINES as LAB_TEXT } from "../../src/content/cosmic.js";
import { PROJECTS } from "../../src/content/projects.js";
import { STOPS } from "../../src/content/twisted.js";
import { PROJECT_CABINS } from "../../src/worlds/living/layout.js";
import { QUEST_STOPS } from "../../src/worlds/twisted/layout.js";
import { MACHINES } from "../../src/worlds/cosmic/layout.js";

const project = PROJECTS[0];
const HOUSE = [PROJECT_CABINS[0].x + 0.4, PROJECT_CABINS[0].z + 3.4];
// Lo que hay a la vista de la carta abierta.
const read = (t) =>
 t.evaluate(() => {
  const modal = document.querySelector(".modal"), card = document.querySelector(".modal__card");
  if (!card) return null;
  const style = getComputedStyle(modal), box = card.getBoundingClientRect();
  return {
   variant: [...modal.classList].find((name) => name.startsWith("modal--"))?.slice(7),
   blur: style.backdropFilter || style.webkitBackdropFilter || "none",
   veil: Number((style.backgroundColor.match(/[\d.]+\)$/) ?? ["1)"])[0].slice(0, -1)),
   from: [modal.style.getPropertyValue("--from-x"), modal.style.getPropertyValue("--from-y")],
   animated: getComputedStyle(card).animationName,
   font: getComputedStyle(card.querySelector(".modal__title")).fontFamily,
   eyebrow: card.querySelector(".modal__eyebrow")?.firstChild?.textContent ?? null,
   title: card.querySelector(".modal__title")?.textContent.trim() ?? null,
   text: [...card.querySelectorAll(".modal__text")].map((one) => one.textContent),
   close: Boolean(card.querySelector(".modal__close")),
   focusInside: card.contains(document.activeElement),
   dialog: modal.getAttribute("role") === "dialog" && modal.getAttribute("aria-modal") === "true",
   wide: box.width / innerWidth,
   tall: box.height / innerHeight,
   scrolls: getComputedStyle(card).overflowY,
   hud: getComputedStyle(document.querySelector(".quick")).opacity,
  };
 });
const count = (t, selector) => t.evaluate((selector) => document.querySelectorAll(selector).length, selector);
const useIt = async (t, [x, z]) => {
 await t.put(x, z, { withWoody: false, settle: 900 });
 await t.page.keyboard.press("KeyE");
 await t.page.waitForSelector(".modal__card", { timeout: 12000 }).catch(() => {});
 await wait(900);
};

// ── Mundo 1 · ficha de proyecto ─────────────────────────────────────────────
let t = await open();
await t.enter();
await useIt(t, HOUSE);
let card = await read(t);
check(card?.variant === "ficha" && card.title === project.name && card.text.join("|") === project.description, `mundo 1: la casa abre la ficha de proyecto («${card?.title}»), con su descripción tal cual`);
check(card.blur === "none" && card.veil > 0.1 && card.veil < 0.45, `el mundo de detrás no se emborrona ni se tapa: un velo del ${Math.round(card.veil * 100)} % y sin desenfoque`);
check(card.from.every((value) => /px$/.test(value)) && card.animated !== "none" && card.hud === "0", `sale del objeto usado (desde ${card.from.join(", ")} del centro) y la interfaz de juego se retira`);
check(card.dialog && card.close && card.focusInside, "es un diálogo, con su botón de cerrar y el foco dentro");
const ficha = await t.evaluate(() => {
 const card = document.querySelector(".modal__card"), gallery = card.querySelector(".card__gallery").getBoundingClientRect(), box = card.getBoundingClientRect();
 return { image: card.querySelector(".card__slide")?.getAttribute("src") ?? null, share: gallery.height / Math.min(box.height, innerHeight), role: card.querySelector(".ficha__facts dd")?.textContent ?? null, tags: [...card.querySelectorAll(".modal__tags li")].map((one) => one.textContent), year: card.querySelector(".ficha__year")?.textContent ?? null, link: card.querySelector(".modal__link")?.getAttribute("href") ?? null, linkText: card.querySelector(".modal__link")?.textContent.replace("→", "").trim(), code: card.querySelectorAll(".modal__link--ghost").length, arrows: card.querySelectorAll(".card__arrow").length, background: getComputedStyle(card).backgroundColor };
});
check(ficha.image === project.images[0] && ficha.share > 0.36 && ficha.arrows === 0, `arriba, la galería con la imagen que el proyecto ya tenía (${ficha.image}), el ${Math.round(ficha.share * 100)} % de la carta; con una sola imagen no hay flechas`);
check(ficha.role === PROJECT_CARDS[0].role && ficha.role === PENDING && ficha.year === project.year && ficha.tags.join() === project.tags.join(), `debajo: «Mi papel» (${ficha.role}: no se inventa), el año y las tecnologías como etiquetas (${ficha.tags.join(", ")})`);
check(ficha.link === project.link && ficha.linkText === "Ver proyecto" && ficha.code === 0, "el botón «Ver proyecto» lleva a su enlace real; sin repositorio, no hay botón «Código»");
const [r, g, b] = ficha.background.match(/\d+/g).map(Number);
check(r > 235 && g > 225 && b > 200, `clara, crema: nada de caja negra (${ficha.background})`);
// Foco atrapado: con Tab no se sale de la carta.
let inside = true;
for (let i = 0; i < 6; i++) {
 await t.page.keyboard.press("Tab");
 inside &&= await t.evaluate(() => document.querySelector(".modal__card").contains(document.activeElement));
}
check(inside, "con Tab el foco no sale de la carta");
// La galería con varias imágenes, y sin ninguna.
await t.evaluate(() => window.__world.card({ gallery: ["/images/projects/configurador-alfombras.png", "/images/projects/aio.png"] }));
await wait(400);
const before = await t.evaluate(() => document.querySelector(".card__slide").getAttribute("src"));
await t.page.click(".card__next");
await wait(300);
const next = await t.evaluate(() => ({ src: document.querySelector(".card__slide").getAttribute("src"), dots: document.querySelectorAll(".card__dot").length, on: [...document.querySelectorAll(".card__dot")].findIndex((one) => one.classList.contains("card__dot--on")) }));
await t.page.keyboard.press("ArrowLeft");
await wait(300);
check(next.src !== before && next.dots === 2 && next.on === 1 && (await t.evaluate(() => document.querySelector(".card__slide").getAttribute("src"))) === before, "con más de una imagen hay flechas y puntos: la flecha pasa a la siguiente y la tecla ← vuelve");
await t.evaluate(() => window.__world.card({ gallery: [] }));
await wait(400);
check((await count(t, ".card__gallery svg.marker--ficha")) === 1 && (await count(t, ".card__gallery img")) === 0, "sin imágenes, el hueco enseña su ilustración (no un hueco roto)");
// La E cierra (y esa pulsación no vuelve a abrirla); Esc también.
await t.page.keyboard.press("KeyE");
await wait(900);
check((await count(t, ".modal")) === 0 && (await t.evaluate(() => Number(getComputedStyle(document.querySelector(".quick")).opacity))) > 0.5, "la E cierra la carta, no la reabre, y vuelve la interfaz de juego");
await t.page.keyboard.press("KeyE");
await t.page.waitForSelector(".modal__card", { timeout: 12000 }).catch(() => {});
await wait(700);
await t.page.keyboard.press("Escape");
await wait(600);
check((await count(t, ".modal")) === 0 && (await count(t, ".overlay--hidden")) === 1, "Esc también la cierra (y no pausa el juego)");
// La carta sencilla (el CV) comparte lo común.
await t.evaluate(() => [...document.querySelectorAll(".quick button")].find((one) => one.textContent === "Sobre mí").click());
await wait(700);
const plain = await read(t);
check(plain?.variant === "plain" && plain.blur === "none" && plain.close && plain.font === card.font, "las cartas que aún no tienen variante comparten lo común: velo, botón de cerrar y letra");
await t.page.keyboard.press("Escape");
await wait(400);
await t.done();

// ── «Reducir movimiento» y móvil ────────────────────────────────────────────
t = await open({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, mobile: true });
await t.page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await t.enter();
await useIt(t, HOUSE);
card = await read(t);
check(card?.variant === "ficha" && card.wide > 0.9 && card.tall > 0.6 && card.scrolls === "auto", `en móvil ocupa casi toda la pantalla (${Math.round(card?.wide * 100)} % del ancho, ${Math.round(card?.tall * 100)} % del alto) y se desplaza`);
check(card.animated === "none", "con «reducir movimiento» la carta aparece en su sitio, sin animación");
await t.done();

// ── Mundo 2 · la hoja de Woody ──────────────────────────────────────────────
t = await open({ query: "?world=twisted" });
await t.enter();
await useIt(t, [QUEST_STOPS.casita.x, QUEST_STOPS.casita.z]);
const hoja = await read(t);
check(hoja?.variant === "hoja" && hoja.eyebrow === STOPS.casita.place && hoja.title === STOPS.casita.title && hoja.text.join("|") === STOPS.casita.paragraphs.join("|"), `mundo 2: la parada de Woody abre una hoja de cuento («${hoja?.title}»), con su texto tal cual`);
const paper = await t.evaluate(() => {
 const card = document.querySelector(".modal__card"), sheet = card.querySelector(".card__sheet");
 return { clipped: /polygon/.test(sheet.style.clipPath), pin: Boolean(card.querySelector(".hoja__pin")), ornament: Boolean(card.querySelector(".hoja__ornament")), polaroid: Boolean(card.querySelector(".polaroid svg.marker--hoja")), photo: card.querySelectorAll(".polaroid img").length, caption: card.querySelector(".polaroid figcaption")?.textContent ?? null, tilt: getComputedStyle(card.querySelector(".polaroid")).transform !== "none", ink: getComputedStyle(card.querySelector(".modal__text")).color, paper: getComputedStyle(sheet).backgroundImage !== "none" };
});
check(paper.clipped && paper.pin && paper.paper && paper.ornament, "papel de borde irregular, sujeto con su chincheta, y el adorno de la parada (una huella)");
check(paper.polaroid && paper.photo === 0 && paper.caption === "Woody" && paper.tilt, "la foto, como polaroid torcida: hoy, su silueta dibujada (no se pide ningún archivo)");
check(hoja.blur === "none" && hoja.close && hoja.font === card.font, "con lo común: sin desenfoque, el mismo botón de cerrar y la misma letra");
await t.page.keyboard.press("KeyE");
await wait(900);
check((await count(t, ".modal")) === 0 && (await t.evaluate(() => window.__world.quest.has("casita"))), "al cerrarla con la E se gana su engranaje, como antes");
await t.done();

// ── Mundo 3 · el holograma de Dosia ─────────────────────────────────────────
t = await open({ query: "?world=cosmic" });
await t.enter();
await t.evaluate(() => window.__world.lab.quest.switchOn("dosia"));
await useIt(t, [MACHINES.dosia.use.x + 0.4, MACHINES.dosia.use.z + 0.9]);
const holo = await read(t);
check(holo?.variant === "holo" && holo.title === LAB_TEXT.dosia.name && holo.text.join("|") === LAB_TEXT.dosia.paragraphs.join("|"), `mundo 3: la máquina proyecta el holograma de «${holo?.title}», con su texto tal cual`);
const light = await t.evaluate(() => {
 const card = document.querySelector(".modal__card"), screen = card.querySelector(".holo__screen"), status = card.querySelector(".holo__status"), button = card.querySelector(".holo__open") ?? card.querySelector(".modal__link");
 return { box: getComputedStyle(card).backgroundColor, border: getComputedStyle(screen).borderTopColor, flicker: getComputedStyle(screen).animationName, marker: Boolean(screen.querySelector("svg.marker--holo")), lines: screen.querySelectorAll(".holo__lines path").length, status: status?.textContent.trim(), tone: getComputedStyle(status).backgroundColor, button: button?.textContent.trim() ?? null, disabled: button?.disabled ?? null, beam: Boolean(document.querySelector(".holo__beam")), media: [...performance.getEntriesByType("resource")].filter((entry) => /\.(mp4|webm|mov)(\?|$)/.test(entry.name)).length, video: card.querySelectorAll("video").length };
});
check(light.box === "rgba(0, 0, 0, 0)" && light.beam && /98, 246, 230/.test(light.border) && light.flicker !== "none", "no es una caja: un móvil translúcido de borde turquesa que parpadea, con el haz que sube de la máquina");
check(light.marker && light.lines > 4 && light.video === 0 && light.media === 0, `dentro, la interfaz esbozada con líneas (${light.lines} trazos); no hay vídeo ni se ha descargado ninguno`);
check(light.status === APP_STATUS.published && /216, 255, 92/.test(light.tone), `etiqueta de estado bien visible: «${light.status}», en verde lima`);
check(/^Abrir la app/.test(light.button ?? "") && light.button.includes(PENDING) && light.disabled === true, `publicada: sale «Abrir la app»; sin enlace todavía, apagado y diciéndolo («${light.button}»)`);
await t.evaluate(() => window.__world.card({ status: "building", statusLabel: "En construcción" }));
await wait(400);
const building = await t.evaluate(() => ({ status: document.querySelector(".holo__status").textContent.trim(), tone: getComputedStyle(document.querySelector(".holo__status")).backgroundColor, button: document.querySelectorAll(".holo__open, .card--holo a.modal__link").length, plan: Boolean(document.querySelector("svg.marker--building")) }));
check(building.status === APP_STATUS.building && /255, 185, 56/.test(building.tone) && building.button === 0 && building.plan, "en construcción: etiqueta ámbar, sin botón de abrir y, en el móvil, el plano en construcción");
await t.page.keyboard.press("Escape");
await wait(500);
check((await count(t, ".modal")) === 0, "Esc la cierra");
await t.done();
