// El contacto pasa al mundo 3 (objetivo 27, bloque C).
//  · El botón «Contacto» del menú abre el contacto directamente en los tres
//    mundos, sin viajar ni guiar.
//  · Mundo 1: donde estaba la casita, un poste «CONTACTO → The Cosmic Lab»: con
//    la E ofrece el viaje y enseña el correo.
//  · Mundo 3: la antena («Envía una señal») y tres terminales (LinkedIn, GitHub,
//    Email) abren su carta de máquina con su botón SIEMPRE, con las máquinas
//    apagadas; al encender todas las que hay montadas, la antena se activa
//    (haz, anillos y la onda de luz por el planeta) y sigue funcionando.
//  · Capturas de los dos sitios.
//   node tests/e2e/contacto.mjs [etiqueta] [solo-capturas]
import { check, open, out, wait } from "./common.mjs";

const tag = process.argv[2] ?? "ahora";
const onlyShots = process.argv.includes("solo-capturas");
const { EMAIL, CONTACT_LINKS } = await import("../../src/content/contact.js");
const living = await import("../../src/worlds/living/layout.js");
const cosmic = await import("../../src/worlds/cosmic/layout.js");

const card = (t) =>
 t.evaluate(() => {
  const el = document.querySelector(".modal__card");
  if (!el) return null;
  return {
   object: [...el.classList].find((name) => name.startsWith("card--"))?.slice(6),
   title: el.querySelector(".modal__title")?.textContent,
   text: el.textContent,
   links: [...el.querySelectorAll(".modal__tags a")].map((a) => a.getAttribute("href")),
   button: el.querySelector(".modal__link")?.textContent.trim() ?? null,
   href: el.querySelector("a.modal__link")?.getAttribute("href") ?? null,
   voyage: Boolean(el.querySelector(".modal__voyage")),
  };
 });
const closeCard = async (t) => {
 await t.page.keyboard.press("Escape");
 await wait(500);
};
const menu = async (t) => {
 await t.evaluate(() => [...document.querySelectorAll(".quick button")].find((one) => one.textContent === "Contacto").click());
 await wait(700);
};
const frontView = async (t, focus, name, { yaw = 0, lift = 0.32, distance = 0.55 } = {}) => {
 await t.evaluate(
  (focus, yaw, lift, distance) => {
   Object.assign(window.__world.rig, { focus, yaw, lift, distance, tilt: 0 });
   window.__world.player.hidden = true;
  },
  focus,
  yaw,
  lift,
  distance,
 );
 await wait(1800);
 await t.page.screenshot({ path: `${out}contacto-${name}-${tag}.jpg`, type: "jpeg", quality: 88 });
 await t.evaluate(() => {
  Object.assign(window.__world.rig, { focus: null, yaw: 0, lift: 1, distance: 1 });
  window.__world.player.hidden = false;
 });
 await wait(400);
};
const PROFILES = CONTACT_LINKS.filter((one) => !one.href.startsWith("mailto:")).map((one) => one.href);

// ── Mundo 1 ──────────────────────────────────────────────────────────────────
{
 const t = await open({});
 await t.enter();
 const spot = living.CONTACT.post ?? living.CONTACT;
 await t.put(spot.x, spot.z + 6, { withWoody: false, settle: 600 });
 await frontView(t, { x: living.CONTACT.x, y: 1.4, z: living.CONTACT.z + 0.5 }, "mundo1");
 if (!onlyShots) {
  await menu(t);
  const c = await card(t);
  const woody = await t.evaluate(() => window.__world.woody.guideTo);
  check(c?.object === "cartel" && c.title === "Escríbeme" && c.text.includes(EMAIL) && c.href === `mailto:${EMAIL}` && PROFILES.every((href) => c.links.includes(href)) && !c.voyage && !woody, `mundo 1: «Contacto» abre el contacto aquí mismo (cartel «${c?.title}», correo, LinkedIn y GitHub, botón «${c?.button}»), sin viaje ni guía`);
  await closeCard(t);
  const scene = await t.evaluate(() => {
   const names = [];
   window.__world.scene.traverse((node) => node.name && names.push(node.name));
   return { house: names.some((name) => /aparato de|^antena$/.test(name)), post: names.includes("poste de contacto") };
  });
  check(!scene.house && scene.post, "la casita de contacto ya no está: en su sitio, el poste de contacto");
  await t.put(spot.x, spot.z + 1.3, { withWoody: false, settle: 600 });
  check((await t.hint()) === "Contacto: The Cosmic Lab", `junto al poste: «${await t.hint()}»`);
  await t.page.keyboard.press("KeyE");
  await wait(900);
  const post = await card(t);
  check(post?.voyage && /Cosmic Lab/.test(post.button ?? "") && post.text.includes(EMAIL) && post.links.includes(`mailto:${EMAIL}`), `con la E ofrece el viaje («${post?.button}») y enseña el correo (${EMAIL})`);
  await closeCard(t);
 }
 await t.done();
}

// ── Mundo 2 ──────────────────────────────────────────────────────────────────
if (!onlyShots) {
 const t = await open({ query: "?world=twisted" });
 await t.enter();
 await menu(t);
 const c = await card(t);
 check(c?.title === "Escríbeme" && c.href === `mailto:${EMAIL}` && !c.voyage, `mundo 2: «Contacto» también lo abre aquí (${c?.object}, «${c?.title}»), sin viajar`);
 await t.done();
}

// ── Mundo 3 ──────────────────────────────────────────────────────────────────
{
 const t = await open({ query: "?world=cosmic" });
 await t.enter();
 const { ANTENNA, TERMINALS } = cosmic;
 await t.put(ANTENNA.x, ANTENNA.z + 7, { withWoody: false, settle: 600 });
 await frontView(t, { x: ANTENNA.x, y: 1.6, z: ANTENNA.z + 3 }, "mundo3", { distance: 1.2, lift: 0.6 });
 if (!onlyShots && TERMINALS) {
  await menu(t);
  const c = await card(t);
  check(c?.object === "maquina" && c.title === "Escríbeme" && c.href === `mailto:${EMAIL}` && PROFILES.every((href) => c.links.includes(href)) && !c.voyage, `mundo 3: «Contacto» abre la carta de máquina del contacto (${c?.links.length} enlaces y el correo)`);
  await closeCard(t);
  // Con todo apagado: la antena y los tres terminales funcionan.
  const count = await t.evaluate(() => window.__world.lab.quest.count());
  await t.put(ANTENNA.x, ANTENNA.z + 2.4, { withWoody: false, settle: 700 });
  check((await t.hint()) === "Envía una señal", `con ${count} máquinas encendidas, la antena: «${await t.hint()}»`);
  await t.page.keyboard.press("KeyE");
  await wait(1200);
  const signal = await card(t);
  check(signal?.object === "maquina" && signal.title === "Envía una señal" && signal.href === `mailto:${EMAIL}` && PROFILES.every((href) => signal.links.includes(href)), `abre «${signal?.title}»: carta de máquina con LinkedIn, GitHub y el botón «${signal?.button}»`);
  await closeCard(t);
  for (const spot of TERMINALS) {
   await t.put(spot.use.x, spot.use.z, { withWoody: false, settle: 600 });
   const hint = await t.hint();
   await t.page.keyboard.press("KeyE");
   await wait(1100);
   const one = await card(t);
   const href = CONTACT_LINKS.find((link) => link.label === spot.id).href;
   check(one?.object === "maquina" && one.title === spot.id && one.href === href && Boolean(one.button), `terminal de ${spot.id} («${hint}»): su carta de máquina con su botón («${one?.button}» → ${one?.href})`);
   await closeCard(t);
  }
  const before = await t.evaluate(() => window.__world.signal);
  check(before.level < 0.01 && !before.beam, "con las máquinas apagadas la antena no hace la animación (pero funciona)");
  // Todas las máquinas montadas encendidas: la antena se activa.
  await t.evaluate(() => window.__world.lab.ready.forEach((id) => window.__world.lab.quest.switchOn(id)));
  await wait(1500);
  const rising = await t.evaluate(() => window.__world.signal);
  await t.put(ANTENNA.x, ANTENNA.z + 7, { withWoody: false, settle: 300 });
  await frontView(t, { x: ANTENNA.x, y: 1.6, z: ANTENNA.z + 3 }, "mundo3-activa", { distance: 1.2, lift: 0.6 });
  const after = await t.evaluate(() => window.__world.signal);
  check(rising.wave >= 0 && after.level > 0.9 && after.beam && after.rings >= 2, `con todas encendidas, la antena se activa: haz al cielo, ${after.rings} anillos de señal y la onda de luz por el planeta (nivel ${after.level.toFixed(2)})`);
  await t.put(ANTENNA.x, ANTENNA.z + 2.4, { withWoody: false, settle: 600 });
  await t.page.keyboard.press("KeyE");
  await wait(1200);
  check((await card(t))?.title === "Envía una señal", "y sigue abriendo «Envía una señal»");
  await closeCard(t);
  // Woody sabe llevar a la antena.
  const guide = await t.evaluate(() => window.__world.world().guide.places.some((place) => place.id === "lab-antena"));
  check(guide, "Woody sabe llevar a la antena («Llévame a la antena»)");
 }
 await t.done();
}
