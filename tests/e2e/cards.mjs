// Las cartas (objetivo 26): cada una es un objeto de su mundo —cartel de madera,
// cartel colgante, máquina del laboratorio— sobre un mismo componente.
// Comprueba lo común (velo sin emborronar, crece desde el objeto, una sola X,
// E y Esc cierran, foco atrapado, móvil, «reducir movimiento», interfaz
// retirada) y lo propio de cada objeto, contra las medidas de las maquetas.
//   node tests/e2e/cards.mjs
import { open, check, wait } from "./common.mjs";
import { TALE_CARDS } from "../../src/content/cards.js";
import { CONTACT_LINKS, EMAIL, signalCard } from "../../src/content/contact.js";
import { LAB } from "../../src/content/cosmic.js";
import { PROJECTS } from "../../src/content/projects.js";
import { CLOCK, STOPS, TIMELINE } from "../../src/content/twisted.js";
import { CONTACT, CV_KIOSK, PROJECT_CABINS } from "../../src/worlds/living/layout.js";
import { QUEST_STOPS, STORY_DOOR, TOWER_DOOR } from "../../src/worlds/twisted/layout.js";
import { ANTENNA, CORE, MACHINES } from "../../src/worlds/cosmic/layout.js";

const project = PROJECTS[0];
const HOUSE = [PROJECT_CABINS[0].x + 0.4, PROJECT_CABINS[0].z + 3.4];
// Lo común de la carta abierta.
const read = (t) =>
 t.evaluate(() => {
  const modal = document.querySelector(".modal"), card = document.querySelector(".modal__card");
  if (!card) return null;
  const style = getComputedStyle(modal), box = card.getBoundingClientRect();
  const turn = (selector) => {
   const node = card.querySelector(selector);
   if (!node) return null;
   const [a, b] = getComputedStyle(node).transform.match(/-?[\d.]+/g).map(Number);
   return +((Math.atan2(b, a) * 180) / Math.PI).toFixed(1);
  };
  return {
   object: [...card.classList].find((name) => name.startsWith("card--"))?.slice(6),
   mobile: modal.classList.contains("is-movil"),
   blur: style.backdropFilter || "none",
   veil: Number((style.backgroundColor.match(/[\d.]+\)$/) ?? ["1)"])[0].slice(0, -1)),
   from: [modal.style.getPropertyValue("--from-x"), modal.style.getPropertyValue("--from-y")],
   animated: getComputedStyle(card).animationName,
   eyebrow: card.querySelector(".modal__eyebrow")?.textContent ?? null,
   title: card.querySelector(".modal__title")?.textContent ?? null,
   font: getComputedStyle(card.querySelector(".modal__title")).fontFamily.split(",")[0].replace(/"/g, ""),
   text: [...card.querySelectorAll(".modal__text")].map((one) => one.textContent),
   closes: card.querySelectorAll(".modal__close").length,
   buttons: [...card.querySelectorAll(".modal__link")].map((one) => one.textContent.trim()),
   focusInside: card.contains(document.activeElement),
   dialog: modal.getAttribute("role") === "dialog" && modal.getAttribute("aria-modal") === "true",
   wide: box.width / innerWidth,
   tall: box.height / innerHeight,
   fits: box.left >= -1 && box.right <= innerWidth + 1,
   scrolls: style.overflowY,
   hud: getComputedStyle(document.querySelector(".quick")).opacity,
   pending: /\[(PENDIENTE|CONFIRMAR)/.test(modal.textContent),
   turns: { paperTop: turn(".cartel__paper--top"), paperBottom: turn(".cartel__paper--bottom"), polaroidTop: turn(".colgante__polaroid--top"), polaroidBottom: turn(".colgante__polaroid--bottom"), phoneTop: turn(".maquina__phone--top .maquina__glass"), phoneBottom: turn(".maquina__phone--bottom .maquina__glass") },
  };
 });
const count = (t, selector) => t.evaluate((selector) => document.querySelectorAll(selector).length, selector);
const fontReady = (t, face) => t.evaluate((face) => document.fonts.load(face).then((found) => found.length > 0), face);
const useIt = async (t, [x, z], settle = 900) => {
 await t.put(x, z, { withWoody: false, settle });
 await t.page.keyboard.press("KeyE");
 await t.page.waitForSelector(".modal__card", { timeout: 12000 }).catch(() => {});
 await wait(1100);
};
const close = async (t) => {
 await t.page.keyboard.press("Escape");
 await wait(700);
};
const near = (value, target, slack = 0.6) => value !== null && Math.abs(value - target) <= slack;

// ── Mundo 1 · cartel de madera ──────────────────────────────────────────────
let t = await open();
await t.enter();
await useIt(t, HOUSE);
let card = await read(t);
check(card?.object === "cartel" && card.title === project.name && card.text.join("|") === project.description && card.eyebrow === "Proyecto 1 / 4", `mundo 1: la casa abre un cartel de madera («${card?.eyebrow}», «${card?.title}») con su descripción tal cual`);
check(card.blur === "none" && card.veil > 0.1 && card.veil < 0.45 && card.from.every((value) => /px$/.test(value)) && card.animated !== "none" && card.hud === "0", `velo suave sin desenfoque (${Math.round(card.veil * 100)} %), crece desde el objeto (${card.from.join(", ")}) y el menú de arriba se retira`);
check(card.dialog && card.closes === 1 && card.focusInside, "es un diálogo, con una sola X y el foco dentro");
const sign = await t.evaluate(() => {
 const card = document.querySelector(".modal__card"), frame = getComputedStyle(card.querySelector(".cartel"));
 return { border: [frame.borderTopColor, frame.borderBottomColor], width: frame.borderTopWidth, screws: card.querySelectorAll(".cartel__screw").length, planks: card.querySelectorAll(".cartel__planks polyline").length, nails: card.querySelectorAll(".cartel__planks circle").length, pins: [card.querySelectorAll(".cartel__paper--top .cartel__pin").length, card.querySelectorAll(".cartel__paper--bottom .cartel__pin").length], fold: card.querySelectorAll(".cartel__paper--bottom .cartel__fold").length, image: card.querySelector(".cartel__paper--top img")?.getAttribute("src") ?? null, sketch: card.querySelectorAll(".cartel__paper--bottom svg.marker").length, badge: card.querySelector(".cartel__badge")?.textContent, tags: [...card.querySelectorAll(".modal__tags li")].map((one) => one.textContent), href: card.querySelector(".modal__link")?.getAttribute("href"), words: card.textContent };
});
check(sign.border[0] === "rgb(125, 67, 34)" && sign.border[1] === "rgb(62, 28, 10)" && sign.width === "16px" && sign.screws === 4 && sign.planks > 20 && sign.nails > 10, `marco marrón grueso con relieve (claro arriba, oscuro abajo), cuatro tornillos y cara de tablones con vetas (${sign.planks}) y clavos (${sign.nails})`);
check(near(card.turns.paperTop, -4.5) && near(card.turns.paperBottom, 3.8) && sign.pins.join() === "1,2" && sign.fold === 1, `dos papeles clavados con chinchetas: el de arriba girado ${card.turns.paperTop}° con una, el de abajo ${card.turns.paperBottom}° con dos y la esquina doblada`);
check(sign.image === project.images[0] && sign.sketch === 1, "arriba, la captura que el proyecto ya tiene; abajo, sin segunda imagen, su boceto dibujado");
check((await fontReady(t, '1em "Titan One"')) && card.font === "Titan One" && sign.badge === project.year && sign.tags.join() === project.tags.join(), `título en ${card.font}, placa del año (${sign.badge}) y etiquetas como plaquitas (${sign.tags.join(", ")})`);
check(card.buttons.length === 1 && /^Ver proyecto/i.test(card.buttons[0]) && sign.href === project.link && !/Código|Mi papel/.test(sign.words) && !card.pending, "un solo botón, «Ver proyecto», con su enlace real; sin «Código», sin «Mi papel» (no hay dato) y sin ningún «[PENDIENTE]»");
// Foco atrapado: con Tab no se sale del cartel.
let inside = true;
for (let i = 0; i < 5; i++) {
 await t.page.keyboard.press("Tab");
 inside &&= await t.evaluate(() => document.querySelector(".modal__card").contains(document.activeElement));
}
check(inside, "con Tab el foco no sale de la carta");
// Con dos imágenes, los dos papeles llevan foto.
await t.evaluate(() => window.__world.card({ images: ["/images/projects/configurador-alfombras.png", "/images/projects/aio.png"] }));
await wait(400);
check((await count(t, ".cartel__paper img")) === 2 && (await count(t, ".cartel__paper svg.marker")) === 0, "con dos imágenes en el contenido, los dos papeles las enseñan (sin tocar el componente)");
// La E cierra (y esa pulsación no vuelve a abrirla); Esc también.
await t.page.keyboard.press("KeyE");
await wait(900);
check((await count(t, ".modal")) === 0 && (await t.evaluate(() => Number(getComputedStyle(document.querySelector(".quick")).opacity))) > 0.5, "la E cierra la carta, no la reabre, y vuelve el menú");
await t.page.keyboard.press("KeyE");
await t.page.waitForSelector(".modal__card", { timeout: 12000 }).catch(() => {});
await wait(700);
await close(t);
check((await count(t, ".modal")) === 0 && (await count(t, ".overlay--hidden")) === 1, "Esc también la cierra (y no pausa el juego)");
// CV y Contacto: el mismo cartel, sin imágenes.
await useIt(t, [CV_KIOSK.x, CV_KIOSK.z + 1]);
const cv = await read(t);
check(cv?.object === "cartel" && (await count(t, ".cartel__paper")) === 0 && cv.closes === 1 && !cv.pending, `el CV usa el mismo cartel, sin imágenes («${cv?.title}»)`);
await close(t);
// (Desde el objetivo 27 el contacto vive en The Cosmic Lab; aquí se abre desde el menú.)
await t.evaluate(() => [...document.querySelectorAll(".quick button")].find((one) => one.textContent === "Contacto").click());
await t.page.waitForSelector(".modal__card", { timeout: 6000 }).catch(() => {});
await wait(700);
const contact = await read(t);
const links = await t.evaluate(() => [...document.querySelectorAll(".cartel__links a")].map((one) => one.getAttribute("href")));
check(contact?.object === "cartel" && (await count(t, ".cartel__paper")) === 0 && contact.text.join() === EMAIL && links.join() === CONTACT_LINKS.filter((one) => !one.href.startsWith("mailto:")).map((one) => one.href).join() && contact.buttons.length === 1, `Contacto, también: el correo, sus enlaces (${links.length}) y un solo botón («${contact?.buttons[0]}»)`);
await close(t);
// El aviso de viaje del menú, igual: el cartel de este mundo.
await t.evaluate(() => [...document.querySelectorAll(".quick button")].find((one) => one.textContent === "Sobre mí").click());
await wait(900);
const offer = await read(t);
check(offer?.object === "cartel" && offer.buttons.length === 1 && /Twisted Moon/.test(offer.buttons[0]) && (await count(t, ".modal__about")) === 1, `los avisos de viaje usan el cartel del mundo en que se está: un botón («${offer?.buttons[0]}») y, de segunda opción, un enlace de texto`);
await close(t);
await t.done();

// ── Móvil y «reducir movimiento» ────────────────────────────────────────────
t = await open({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, mobile: true });
await t.page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await t.enter();
await useIt(t, HOUSE);
card = await read(t);
const column = await t.evaluate(() => getComputedStyle(document.querySelector(".cartel__in")).flexDirection);
check(card?.mobile && card.wide > 0.88 && card.fits && column === "column" && card.scrolls === "auto", `en móvil, el cartel en vertical: ${Math.round(card?.wide * 100)} % del ancho, papeles arriba y texto debajo, y se desplaza con el dedo`);
check(card.animated === "none", "con «reducir movimiento» la carta aparece en su sitio, sin animación");
await t.done();

// ── Mundo 2 · cartel colgante ───────────────────────────────────────────────
t = await open({ query: "?world=twisted" });
await t.enter();
await useIt(t, [QUEST_STOPS.casita.x, QUEST_STOPS.casita.z]);
const woody = await read(t);
check(woody?.object === "colgante" && woody.title === STOPS.casita.title && woody.text.join("|") === STOPS.casita.paragraphs.join("|") && woody.closes === 1 && woody.blur === "none" && !woody.pending, `mundo 2: la parada de Woody abre un cartel colgante («${woody?.title}»), con su texto tal cual`);
const board = await t.evaluate(() => {
 const card = document.querySelector(".modal__card");
 const css = (selector, name) => getComputedStyle(card.querySelector(selector))[name];
 return { arm: Boolean(card.querySelector(".colgante__arm path")), lantern: Boolean(card.querySelector(".colgante__flame")), wood: css(".colgante__wood", "clipPath"), tape: Boolean(card.querySelector(".colgante__tape")), nails: card.querySelectorAll(".colgante__nail").length, glow: css(".colgante__glow", "backgroundImage"), paper: css(".colgante__torn", "clipPath"), captions: [...card.querySelectorAll(".colgante__caption")].map((one) => one.textContent), captionFont: css(".colgante__caption", "fontFamily").split(",")[0].replace(/"/g, ""), drawn: card.querySelectorAll(".colgante__polaroid svg.marker").length, photos: card.querySelectorAll(".colgante__polaroid img").length, pins: card.querySelectorAll(".colgante__polaroid .colgante__pin").length, gear: card.querySelector(".colgante__gear text")?.textContent, subtitle: card.querySelector(".colgante__subtitle")?.textContent, note: card.querySelector(".colgante__note")?.textContent, noteFont: css(".colgante__note", "fontFamily").split(",")[0].replace(/"/g, ""), closeAt: (() => { const x = card.querySelector(".modal__close").getBoundingClientRect(), b = card.querySelector(".colgante__board").getBoundingClientRect(); return Math.abs(x.left + x.width / 2 - (b.left + b.width / 2)) / b.width; })(), button: getComputedStyle(card.querySelector(".modal__link")).color };
});
check(board.arm && board.lantern && /polygon/.test(board.wood) && board.tape && board.nails === 4 && /radial-gradient/.test(board.glow), "cuelga de su brazo de hierro con el farolillo encendido; tablón irregular, cinta a rayas, clavos y la luz cálida en la esquina");
check(near(woody.turns.polaroidTop, -6) && near(woody.turns.polaroidBottom, 5) && board.pins === 3 && board.drawn === 2 && board.photos === 0, `dos polaroids torcidas (${woody.turns.polaroidTop}° y ${woody.turns.polaroidBottom}°) con chinchetas doradas; sin fotos, su silueta dibujada`);
check(board.captions.join("|") === TALE_CARDS.casita.captions.join("|") && board.captionFont === "Caveat" && board.subtitle === TALE_CARDS.casita.subtitle, `con su nota manuscrita en ${board.captionFont} («${board.captions.join("», «")}») y el subtítulo «${board.subtitle}»`);
check((await fontReady(t, '1em "Mystery Quest"')) && woody.font === "Mystery Quest" && /polygon/.test(board.paper) && board.note === STOPS.casita.paragraphs.at(-1) && board.noteFont === "Caveat", `el texto, en una hoja de bordes rotos: título en ${woody.font} y la última frase manuscrita`);
check(board.gear === "3/4" && board.closeAt < 0.04 && woody.buttons.length === 1 && woody.buttons[0] === CLOCK.next && board.button === "rgb(255, 194, 74)", `el engranaje de la parada («${board.gear}») al lateral, la X arriba en el centro y un botón, «${woody.buttons[0]}», oscuro con letra dorada`);
// «Siguiente parada»: cierra, se gana el engranaje y Woody echa a andar hacia la que falta.
await t.page.click(".modal__guide");
await wait(1500);
const after = await t.evaluate(() => ({ modal: document.querySelectorAll(".modal").length, gear: window.__world.quest.has("casita"), mode: window.__world.woodyBrain.mode, to: window.__world.woody.guideTo }));
check(after.modal === 0 && after.gear && after.mode === "guide" && /^luna-/.test(after.to ?? ""), `«Siguiente parada» cierra la carta, se gana el engranaje y Woody guía a la siguiente (${after.to})`);
await t.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyG" })));
// La casa sobre tronco (la historia): el mismo cartel, sin engranaje.
await useIt(t, [STORY_DOOR.x, STORY_DOOR.z], 1400);
const story = await read(t);
check(story?.object === "colgante" && (await count(t, ".colgante__gear")) === 0 && (await count(t, ".colgante__polaroid")) === 2 && story.buttons.length === 1, `la casa sobre tronco, sin engranaje («${story?.title}»)`);
await close(t);
// «Mi recorrido», en la torre: la línea de tiempo dibujada a mano sobre la hoja.
await t.evaluate(() => { const q = window.__world.quest; ["alquimista", "casa-arbol", "casita", "invernadero"].forEach((id) => q.collect(id)); q.start(); });
await useIt(t, [TOWER_DOOR.x, TOWER_DOOR.z], 1600);
const tower = await read(t);
const line = await t.evaluate(() => ({ items: [...document.querySelectorAll(".colgante .modal__timeline li")].map((one) => one.querySelector("b").textContent), drawn: getComputedStyle(document.querySelector(".colgante .modal__timeline"), "::before").backgroundImage, font: getComputedStyle(document.querySelector(".colgante .modal__timeline b")).fontFamily.split(",")[0].replace(/"/g, "") }));
check(tower?.object === "colgante" && tower.title === TIMELINE.title && line.items.length === TIMELINE.milestones.length && /svg/.test(line.drawn) && line.font === "Caveat" && !tower.pending, `«${tower?.title}»: la misma hoja con la línea de tiempo dibujada a mano (${line.items.length} hitos, fechas en ${line.font})`);
await close(t);
await t.done();

// ── Mundo 2 en móvil ────────────────────────────────────────────────────────
t = await open({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, mobile: true, query: "?world=twisted" });
await t.enter();
await useIt(t, [QUEST_STOPS.casita.x, QUEST_STOPS.casita.z]);
const small = await read(t);
const layout = await t.evaluate(() => { const card = document.querySelector(".modal__card"), a = card.querySelector(".colgante__polaroid--top").getBoundingClientRect(), b = card.querySelector(".colgante__polaroid--bottom").getBoundingClientRect(), paper = card.querySelector(".colgante__paper").getBoundingClientRect(); return { hook: Boolean(card.querySelector(".colgante__hook")), arm: Boolean(card.querySelector(".colgante__arm")), row: Math.abs(a.top - b.top) < 60 && b.left > a.left + 40, below: paper.top > Math.max(a.top, b.top) + 40 }; });
check(small?.mobile && small.fits && layout.hook && !layout.arm && layout.row && layout.below, "en móvil: el brazo de hierro se reduce a un gancho, las polaroids arriba en fila y la hoja de papel debajo");
await t.done();

// ── Mundo 3 · máquina del laboratorio ───────────────────────────────────────
t = await open({ query: "?world=cosmic" });
await t.enter();
await t.evaluate(() => window.__world.lab.quest.switchOn("dosia"));
await useIt(t, [MACHINES.dosia.use.x + 0.4, MACHINES.dosia.use.z + 0.9]);
const machine = await read(t);
const parts = await t.evaluate(() => {
 const card = document.querySelector(".modal__card");
 const css = (selector, name) => getComputedStyle(card.querySelector(selector))[name];
 return { dome: Boolean(card.querySelector(".maquina__dome")), ball: css(".maquina__ball", "backgroundColor"), tube: css(".maquina__tube", "backgroundImage"), bubbles: css(".maquina__bubbles", "animationName"), lights: card.querySelectorAll(".maquina__lights span").length, screen: css(".maquina__screen", "backgroundImage"), scan: getComputedStyle(card.querySelector(".maquina__screen"), "::after").backgroundImage, phones: card.querySelectorAll(".maquina__phone").length, border: css(".maquina__glass", "borderTopColor"), cones: card.querySelectorAll(".maquina__cone").length, emitters: card.querySelectorAll(".maquina__emitter").length, sketches: card.querySelectorAll(".maquina__glass svg.marker").length, status: card.querySelector(".maquina__status")?.textContent.trim(), tone: css(".maquina__status", "backgroundColor"), tagline: css(".maquina__tagline", "color"), energy: card.querySelector(".maquina__energy")?.textContent, close: css(".modal__close", "borderTopColor"), video: card.querySelectorAll("video").length, media: [...performance.getEntriesByType("resource")].filter((entry) => /\.(mp4|webm|mov)(\?|$)/.test(entry.name)).length };
});
check(machine?.object === "maquina" && parts.dome && parts.ball === "rgb(216, 255, 106)" && /linear-gradient/.test(parts.tube) && parts.bubbles === "bubbles" && parts.lights === 3, "mundo 3: la carta es una máquina: carcasa con cúpula, antena con su bola lima, tubo de líquido con burbujas que suben y la fila de luces");
check(/radial-gradient/.test(parts.screen) && /repeating-linear-gradient/.test(parts.scan) && parts.phones === 2 && parts.border === "rgb(95, 242, 214)" && parts.cones === 2 && parts.emitters === 2 && near(machine.turns.phoneTop, -7, 0.8) && near(machine.turns.phoneBottom, 6, 0.8), `pantalla morada con líneas de escaneo y dos móviles holográficos de borde turquesa, torcidos (${machine.turns.phoneTop}° y ${machine.turns.phoneBottom}°) sobre sus emisores`);
check(parts.sketches === 2 && parts.video === 0 && parts.media === 0, "sin capturas, la interfaz esbozada en líneas; no hay vídeo ni se ha descargado ninguno");
check((await fontReady(t, '700 1em "Fredoka"')) && machine.font === "Fredoka" && parts.status === "Publicada" && parts.tone === "rgb(216, 255, 106)" && parts.tagline === "rgb(255, 159, 224)" && /ENERGÍA ENVIADA AL NÚCLEO · 1\/5/i.test(parts.energy ?? ""), `etiqueta «${parts.status}» en lima, título en ${machine.font}, subtítulo rosa y «${parts.energy}»`);
check(machine.closes === 1 && parts.close === "rgb(255, 122, 217)" && machine.buttons.length === 0 && !machine.pending, "X redonda con borde rosa; publicada pero sin enlace: no sale «Abrir la app» (ni ningún «[PENDIENTE]»)");
// Con enlace, sí sale; y «En construcción», en ámbar y sin botón.
await t.evaluate(() => window.__world.card({ link: "https://example.com/" }));
await wait(300);
const linked = await read(t);
await t.evaluate(() => window.__world.card({ link: null, status: "building", statusLabel: "En construcción" }));
await wait(300);
const building = await t.evaluate(() => ({ status: document.querySelector(".maquina__status").textContent.trim(), tone: getComputedStyle(document.querySelector(".maquina__status")).backgroundColor, buttons: document.querySelectorAll(".modal__link").length }));
check(linked.buttons.length === 1 && /^Abrir la app/.test(linked.buttons[0]) && building.status === "En construcción" && building.tone === "rgb(255, 185, 56)" && building.buttons === 0, `con enlace sale «${linked.buttons[0]}»; «${building.status}», en ámbar y sin botón`);
await close(t);
// El núcleo y la antena: la misma máquina, sin móviles.
await useIt(t, [CORE.x, CORE.z + CORE.r + 1.1]);
const core = await read(t);
check(core?.object === "maquina" && core.title === LAB.corePanel.title && (await count(t, ".maquina__phone")) === 0 && core.closes === 1, `el núcleo abre la misma máquina, sin móviles («${core?.title}»)`);
await close(t);
await useIt(t, [ANTENNA.x, ANTENNA.z + 2.2], 1600);
const dish = await read(t);
check(dish?.object === "maquina" && dish.title === signalCard().title && dish.text.join("|") === signalCard().paragraphs.join("|"), `y la antena (el contacto), también («${dish?.title}»: ${dish?.text[0]})`);
await close(t);
await t.done();

// ── Mundo 3 en móvil ────────────────────────────────────────────────────────
t = await open({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, mobile: true, query: "?world=cosmic" });
await t.enter();
await t.evaluate(() => window.__world.lab.quest.switchOn("dosia"));
await useIt(t, [MACHINES.dosia.use.x + 0.4, MACHINES.dosia.use.z + 0.9]);
const pocket = await read(t);
const upright = await t.evaluate(() => { const card = document.querySelector(".modal__card"), phones = card.querySelector(".maquina__phones").getBoundingClientRect(), text = card.querySelector(".maquina__text").getBoundingClientRect(), tube = card.querySelector(".maquina__tube").getBoundingClientRect(); return { below: text.top >= phones.bottom - 2, tube: tube.width }; });
check(pocket?.mobile && pocket.fits && pocket.wide > 0.88 && upright.below && upright.tube < 16, `en móvil: la máquina en vertical, los móviles arriba y el texto debajo; el tubo, una franja lateral fina (${Math.round(upright.tube)} px)`);
await t.done();
