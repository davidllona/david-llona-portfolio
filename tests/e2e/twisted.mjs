// Mundo 2 · The Twisted Moon: siempre de noche, luna creciente y enorme, isla
// en terrazas con la torre del reloj en lo alto, edificios en su sitio y bien
// apoyados, escaleras y puente colgante que se recorren andando, acantilados
// que no se saltan, miradores donde la cámara se inclina y entra la luna, la
// casa sobre tronco con su puerta («Sobre mí», el texto real), Woody con su
// farolillo y guiando. Abre directamente en ese mundo (?world=twisted, solo en
// desarrollo); el viaje lo prueba travel.mjs y el recorrido completo de la
// isla, sin navegador, twisted-walk.mjs.
//   node tests/e2e/twisted.mjs [fps]
import { open, check, wait } from "./common.mjs";
import twisted, { BIG_TREES, BRIDGES, BUILDINGS, FERNS, FLOWERS, LANTERNS, LEVELS, MUSHROOMS, PUMPKINS, STAIRS, STORY_DOOR, TREES, VINES } from "../../src/worlds/twisted/layout.js";
import { aboutText } from "../../src/content/about.js";

const t = await open({ query: "?world=twisted" });
await t.enter();
await wait(800);
// Desde aquí se cuentan los pipelines que el renderer crea: paseando no debe compilarse nada.
await t.evaluate(() => {
 const pipelines = window.__world.renderer._pipelines;
 window.__hot = [];
 const create = pipelines._getRenderPipeline.bind(pipelines);
 pipelines._getRenderPipeline = (renderObject, ...rest) => {
  window.__hot.push(`${renderObject.material.type} · ${renderObject.object.type}${renderObject.object.name ? ` «${renderObject.object.name}»` : ""}`);
  return create(renderObject, ...rest);
 };
});
// La luna grande: dónde está en el cielo, cuánto ocupa y dónde cae en la pantalla.
const moonNow = () =>
 t.evaluate(() => {
  const w = window.__world, moon = w.bigMoon, away = moon.position.clone().sub(w.camera.position);
  const on = moon.position.clone().project(w.camera);
  return { up: (Math.asin(away.y / away.length()) * 180) / Math.PI, radius: (Math.atan(moon.scale.x / away.length()) * 180) / Math.PI, north: away.z < 0, visible: moon.visible, x: on.x, y: on.y, front: on.z < 1, pitch: (Math.asin(-w.camera.getWorldDirection(away).y) * 180) / Math.PI };
 });
// Anda hasta un punto pulsando hacia él, como una persona.
const held = new Set();
async function walkTo(x, z, reach = 0.6, tries = 60) {
 for (let i = 0; i < tries; i++) {
  const p = await t.pos();
  if (Math.hypot(p.x - x, p.z - z) < reach) break;
  const want = new Set();
  if (z < p.z - 0.25) want.add("KeyW");
  else if (z > p.z + 0.25) want.add("KeyS");
  if (x < p.x - 0.25) want.add("KeyA");
  else if (x > p.x + 0.25) want.add("KeyD");
  for (const key of held) if (!want.has(key)) (await t.page.keyboard.up(key), held.delete(key));
  for (const key of want) if (!held.has(key)) (await t.page.keyboard.down(key), held.add(key));
  await wait(110);
 }
 for (const key of held) await t.page.keyboard.up(key);
 held.clear();
 await wait(350);
 return t.pos();
}

const scene = await t.evaluate(() => {
 const w = window.__world, names = {};
 w.scene.traverse((o) => { if (o.name) names[o.name] = (names[o.name] ?? 0) + (o.isInstancedMesh ? o.count : 1); });
 return { world: w.world().id, moment: document.documentElement.dataset.momento, toggle: !!document.querySelector(".theme-toggle"), names, fog: !!w.scene.fogNode };
});
check(scene.world === "twisted" && scene.moment === "night" && !scene.toggle, `The Twisted Moon: siempre de noche, sin botón de día y noche (${scene.moment})`);
let moon = await moonNow();
check(moon.visible && moon.radius > 4.5 && moon.up > 10 && moon.up < 25 && moon.north, `la luna es enorme y está al norte, hacia donde mira la cámara: ${moon.radius.toFixed(1)}° de radio, a ${moon.up.toFixed(0)}° sobre el horizonte`);
check(scene.fog, "la niebla baja está puesta");
const places = ["torre", "observatorio", "casa-arbol", "casa-tronco", "casita", "invernadero", "casa del alquimista"];
check(places.every((name) => scene.names[name] === 1), `los edificios están en su sitio: ${places.filter((name) => scene.names[name] === 1).join(", ")}`);
check(["escaleras", "puentes", "cascadas", "río", "mar"].every((name) => scene.names[name] === 1), `hay ${STAIRS.length} escaleras, ${BRIDGES.length} puentes, cascadas, río y mar`);
const trees = (scene.names["árbol rizado 1"] ?? 0) + (scene.names["árbol rizado 2"] ?? 0) + (scene.names["árbol rizado 3"] ?? 0);
check(trees === TREES.length && scene.names["farola doblada"] > 0 && scene.names["baliza"] === 4, `${trees} árboles rizados, ${scene.names["farola doblada"]} farolas dobladas y ${scene.names["baliza"]} balizas`);
// La vegetación y los detalles del C2, con instancias: una malla por forma.
const kinds = { sauce: BIG_TREES.filter((one) => one.kind === "willow").length, "árbol de copa ancha": BIG_TREES.filter((one) => one.kind === "broad").length, "árbol en espiral": BIG_TREES.filter((one) => one.kind === "spiral").length, helecho: FERNS.length, seta: MUSHROOMS.length, flor: FLOWERS.length, enredadera: VINES.length, calabaza: PUMPKINS.length, farolillo: LANTERNS.length };
const wrong = Object.entries(kinds).filter(([name, count]) => scene.names[name] !== count);
check(wrong.length === 0, `vegetación y detalles con instancias: ${Object.entries(kinds).map(([name, count]) => `${count} ${name}`).join(", ")}${wrong.length ? ` — no cuadran: ${wrong.map(([name]) => `${name} (${scene.names[name]})`).join(", ")}` : ""}`);
check(scene.names["humo"] === 1 && scene.names["chimenea de la casita"] === 1 && scene.names["plantas del invernadero"] === 1 && scene.names["torre: piedra, tejado y buhardillas"] === 1 && scene.names["esferas del reloj"] === 1, "humo en las chimeneas, plantas que brillan en el invernadero y la torre de piedra con su tejado, sus buhardillas y sus esferas");
// El reloj, una vez en marcha (aquí se arranca sin jugar; el juego entero, en twisted-quest.mjs), marca la
// hora del visitante (las pruebas la fijan a las 12:00): las dos agujas, arriba.
await t.evaluate(() => {
 const quest = window.__world.quest;
 for (const id of quest.missing()) quest.collect(id);
 quest.start();
});
await wait(400);
const hands = await t.evaluate(() => window.__world.towerClock);
check(Math.abs(hands.hour - 12) < 0.05 && hands.hourAngle % (Math.PI * 2) < 0.03 && hands.minuteAngle < 0.03, `el reloj de la torre marca la hora del visitante (${hands.hour.toFixed(2)} h: las dos agujas arriba)`);
check(scene.names["farolillo de Woody"] === 1, "Woody lleva su farolillo al cuello");

// Todo lo plantado se apoya en el suelo, y cada edificio en su terraza.
const seats = await t.evaluate(() => {
 const w = window.__world, world = w.world(), out = [];
 const m = new w.camera.matrixWorld.constructor();
 w.scene.traverse((o) => {
  if (o.userData.rests !== 0) return;
  if (o.isInstancedMesh) {
   for (let i = 0; i < o.count; i++) {
    o.getMatrixAt(i, m);
    const e = m.elements;
    out.push({ name: o.name, gap: e[13] - world.height(e[12], e[14]) });
   }
  } else out.push({ name: o.name, gap: o.position.y - world.height(o.position.x, o.position.z), y: o.position.y });
 });
 return out;
});
const off = seats.filter((one) => one.gap > 0.03 || one.gap < -0.25);
check(seats.length > 200 && off.length === 0, `${seats.length} objetos apoyados en el suelo: ninguno flota ni queda enterrado${off.length ? ` — ${off.slice(0, 4).map((one) => `${one.name} ${one.gap.toFixed(2)}`).join(", ")}` : ""}`);
const level = (name) => seats.find((one) => one.name === name)?.y ?? NaN;
check(Math.abs(level("torre") - LEVELS[3]) < 0.4 && Math.abs(level("observatorio") - LEVELS[2]) < 0.4 && Math.abs(level("casa-arbol") - LEVELS[2]) < 0.4 && Math.abs(level("casa-tronco") - LEVELS[1]) < 0.4 && Math.abs(level("casita")) < 0.4, `la torre está en lo más alto (${level("torre").toFixed(1)} m), observatorio y casa del árbol en sus picos (${level("observatorio").toFixed(1)} y ${level("casa-arbol").toFixed(1)} m), la casa sobre tronco en la primera terraza (${level("casa-tronco").toFixed(1)} m) y la casita abajo`);

// Mirador de la plataforma: la cámara se inclina y la luna entra en cuadro.
await wait(2600);
moon = await moonNow();
check(moon.front && Math.abs(moon.x) < 0.95 && moon.y > 0 && moon.y < 1.05 && moon.pitch < 12, `en la plataforma la cámara se inclina hacia el horizonte (${moon.pitch.toFixed(0)}° hacia abajo) y la luna entra en cuadro (en ${moon.x.toFixed(2)}, ${moon.y.toFixed(2)} de la pantalla)`);
await t.shot("luna-mirador");

// Escalera del oeste: se sube andando, pasando antes la pasarela del río.
await t.put(-6, -4.4, { withWoody: false, settle: 2400 });
const away = await moonNow();
check(away.pitch > 30, `lejos de un mirador la cámara vuelve a su sitio (${away.pitch.toFixed(0)}° hacia abajo)`);
const bridge = BRIDGES.find((one) => one.id === "rio");
await walkTo(...bridge.from, 0.5);
let at = await walkTo(bridge.to[0] + bridge.ux * 0.4, bridge.to[1] + bridge.uz * 0.4, 0.5);
check(Math.hypot(at.x - bridge.to[0], at.z - bridge.to[1]) < 1.2, `se cruza la pasarela del río (queda en ${at.x}, ${at.z})`);
const stair = STAIRS.find((one) => one.id === "oeste");
for (const [x, z] of stair.through) at = await walkTo(x, z, 0.55);
at = await walkTo(-10, -18.4, 0.6);
check(Math.abs(at.y - LEVELS[1]) < 0.3, `y se sube la escalera del oeste hasta la primera terraza (a ${at.y} m)`);
await t.shot("luna-terraza");

// El acantilado no se salta: andando hacia el borde (lejos de la escalera), se queda arriba.
await t.put(-6, -18.4, { withWoody: false, settle: 500 });
await t.hold("KeyS", 2200);
at = await t.pos();
check(Math.abs(at.y - LEVELS[1]) < 0.4, `andando contra el borde de la terraza no se cae (sigue a ${at.y} m, en ${at.x}, ${at.z})`);

// Puente colgante del observatorio: se cruza entero, combándose en el centro.
const rope = BRIDGES.find((one) => one.id === "observatorio");
await t.put(rope.to[0] + rope.ux * 0.8, rope.to[1] + rope.uz * 0.8, { withWoody: false, settle: 700 });
const mid = await walkTo((rope.from[0] + rope.to[0]) / 2, (rope.from[1] + rope.to[1]) / 2, 0.5);
at = await walkTo(rope.from[0] - rope.ux * 0.8, rope.from[1] - rope.uz * 0.8, 0.6);
check(mid.y < LEVELS[2] - 0.25 && mid.y > LEVELS[2] - 1 && Math.abs(at.y - LEVELS[2]) < 0.3 && at.x < rope.from[0] + 0.5, `el puente colgante se cruza andando hasta el pico del observatorio (en el centro baja a ${mid.y} m; se llega a ${at.x}, ${at.z}, a ${at.y} m)`);
await t.shot("luna-puente");
// Y por los lados no se sale: empujando de costado en mitad del puente, se sigue en él.
await t.put((rope.from[0] + rope.to[0]) / 2, (rope.from[1] + rope.to[1]) / 2, { withWoody: false, settle: 500 });
await t.hold("KeyS", 1300);
at = await t.pos();
check(at.y > LEVELS[2] - 1.1, `desde el puente no se cae por un lado (sigue a ${at.y} m)`);

// La casa sobre tronco: desde la puerta se lee «Sobre mí», el texto real.
await t.put(STORY_DOOR.x - 0.2, STORY_DOOR.z + 0.3, { settle: 1200 });
check((await t.hint()) === "Leer mi historia", `ante la puerta de la casa sobre tronco: «${await t.hint()}»`);
await t.page.keyboard.press("KeyE");
await wait(1400);
const card = await t.evaluate(() => ({ title: document.querySelector(".modal__title")?.textContent, text: [...document.querySelectorAll(".modal__text")].map((p) => p.textContent) }));
check(card.title === aboutText.headline.join(" ") && card.text.join("|") === aboutText.paragraphs.join("|"), `con E se abre su historia, con el texto real de «Sobre mí»: «${card.title}»`);
await t.page.keyboard.press("Escape");
await wait(900);
// No se atraviesa.
const house = BUILDINGS["casa-tronco"];
await walkTo(house.x, house.z, 0.4, 16);
at = await t.pos();
check(Math.hypot(at.x - house.x, at.z - house.z) > 1.6, `andando contra la casa no se entra en ella (a ${Math.hypot(at.x - house.x, at.z - house.z).toFixed(1)} m de su centro)`);

// Woody guía desde la llegada hasta la casa sobre tronco (escalera arriba).
await t.put(0, 7.5, { settle: 900 });
await t.evaluate(() => [...document.querySelectorAll(".quick button")].find((b) => b.textContent === "Sobre mí").click());
await wait(500);
// («Sobre mí» abre ahora el panel con todos los textos —lo comprueba twisted-quest.mjs—; el paseo sale de su botón.)
check((await t.woody()).mode !== "guide" && (await t.evaluate(() => Boolean(document.querySelector(".sheet .about")))), "«Sobre mí» en el menú abre el panel con todos los textos, sin mover a Woody");
await t.evaluate(() => document.querySelector(".about__walk button").click());
await wait(500);
check((await t.woody()).mode === "guide", "y su botón «Recorrerlo con Woody»: Woody echa a andar hacia la casa sobre tronco");
const arrived = await t.followWoody({ steps: 420 });
// (Woody llega antes y deja de guiar: el astronauta termina de subir tras él.)
// (Por el camino, punto a punto: del invernadero a la escalera del este y por ella arriba.)
// (Por los mismos puntos de la red de guía de Woody —twisted-walk.mjs comprueba que están despejados—, sin desandar lo andado.)
const nodes = twisted.guide.nodes;
for (const id of ["cruce-este", "invernadero", "escalera-este-pie", "escalera-este-medio", "escalera-este-alto", "terraza-este", "casa-tronco"]) {
 const [x, z] = nodes[id];
 const here = await t.pos();
 if (z > here.z + 1) continue;
 await walkTo(x, z, 0.6);
}
at = await t.pos();
// Woody da el guiado por terminado cuando el astronauta llega a menos de 6 m de
// la puerta (si se queda atrás, espera allí). La prueba lo sigue a ciegas, en
// línea recta hacia el perro, y en la escalera a veces se atasca contra su
// costado: por eso no basta con «lo siguió»; lo que cuenta es que, una vez
// arriba, Woody ya no está guiando.
await wait(600);
const done = arrived || (await t.woody()).mode === "follow";
check(done && Math.hypot(at.x - STORY_DOOR.x, at.z - STORY_DOOR.z) < 4.5 && Math.abs(at.y - LEVELS[1]) < 0.4, `y siguiéndole se llega a su puerta, en la primera terraza (a ${Math.hypot(at.x - STORY_DOOR.x, at.z - STORY_DOOR.z).toFixed(1)} m, a ${at.y} m de altura)`);

// Al bajar con la nave se ve la luna: se despega, se espera a la órbita y, durante la bajada, se mira dónde cae en pantalla.
await t.put(0, 5.6, { withWoody: false, settle: 900 });
// La tierra lejana (objetivo 24): a pie solo se dibuja la franja que puede asomar por el horizonte; en órbita, el planeta entero.
const farNow = () => t.evaluate(() => { const f = window.__world.farland; return { drawn: f.meshes.reduce((sum, mesh) => sum + (mesh.visible ? mesh.count : 0), 0), land: f.near.visible, all: f.layers.reduce((sum, layer) => sum + layer.items.length, 0), near: f.layers.reduce((sum, layer) => sum + layer.near, 0), rest: f.far.visible }; });
// (Junto al invernadero, abajo, la cámara mira al suelo de la isla: la tierra lejana no entra en cuadro y no se dibuja nada de ella.)
await t.put(9.8, -4.6, { withWoody: false, settle: 3200 });
const afoot = await farNow();
check(afoot.drawn === 0 && !afoot.land && !afoot.rest, `a pie, junto al invernadero, la tierra lejana no entra en cuadro y no se dibuja (${afoot.drawn} copias de ${afoot.all})`);
// En el mirador de la torre la cámara se inclina hacia el horizonte: asoma la franja cercana, y solo esa.
await t.put(0.4, -32.6, { withWoody: false, settle: 3200 });
const atTower = await farNow();
check(atTower.drawn === atTower.near && atTower.near < atTower.all * 0.6 && atTower.land && !atTower.rest, `en el mirador de la torre asoma por el horizonte, y solo lo cercano (${atTower.drawn} copias de ${atTower.all}; el resto del suelo, sin dibujar)`);
await t.put(0, 5.6, { withWoody: false, settle: 900 });
await t.page.keyboard.press("KeyE");
await t.page.waitForFunction(() => window.__world.ship.flight.phase === "orbit", { timeout: 20000 });
await wait(800);
const aloft = await farNow();
check(aloft.drawn === aloft.all && aloft.all > 400 && aloft.rest, `desde la órbita se dibuja entera: el planeta es tierra (${aloft.drawn} copias: árboles, casitas, farolillos, picos)`);
await t.page.keyboard.press("KeyE");
const seen = [];
for (let i = 0; i < 18; i++) {
 await wait(300);
 const now = await t.evaluate(() => window.__world.ship.flight.phase);
 if (now !== "descending") break;
 const m = await moonNow();
 if (m.visible && m.front && Math.abs(m.x) < 1 && Math.abs(m.y) < 1) seen.push(`${m.x.toFixed(2)},${m.y.toFixed(2)}`);
}
check(seen.length >= 4, `al bajar con la nave la luna está en pantalla (${seen.length} de los fotogramas mirados: ${seen.slice(0, 6).join(" · ")})`);
await t.page.waitForFunction(() => window.__world.ship.flight.phase === "idle", { timeout: 15000 });

const hot = await t.evaluate(() => [...new Set(window.__hot)]);
check(hot.length === 0, `0 pipelines en caliente en todo el paseo (miradores, escaleras, puentes, la ficha, las luces que cambian de sitio, Woody guiando)${hot.length ? ": " + hot.join(", ") : ""}`);

if (process.argv.includes("fps")) {
 await t.browser.close();
 const r = await open({ viewport: { width: 1440, height: 810, deviceScaleFactor: 2 }, uncapped: true, query: "?world=twisted" });
 await r.enter();
 const line = [];
 for (const [name, x, z] of [["llegada", 0, 7.5], ["río", -6, -4.4], ["terraza", -6.4, -19], ["historia", STORY_DOOR.x, STORY_DOOR.z + 0.4], ["cima", 0.6, -33.2]]) {
  await r.put(x, z, { settle: 2600 });
  line.push(`${name} ${await r.fps(3)}`);
 }
 console.log("fps (2880 × 1620, sin límite): " + line.join(" · "));
 await r.browser.close();
 // Calidad baja: la del móvil (pantalla táctil), a 844 × 390 con densidad 2, sin límite.
 const low = await open({ mobile: true, uncapped: true, query: "?world=twisted" });
 await low.enter();
 const quality = await low.evaluate(() => window.__world.renderer.getPixelRatio());
 const lowLine = [];
 for (const [name, x, z] of [["llegada", 0, 7.5], ["río", -6, -4.4], ["terraza", -6.4, -19], ["cima", 0.6, -33.2]]) {
  await low.put(x, z, { settle: 2600 });
  lowLine.push(`${name} ${await low.fps(3)}`);
 }
 console.log(`fps en calidad baja (móvil, 844 × 390, densidad de píxel ${quality}, sin límite): ` + lowLine.join(" · "));
 await low.browser.close();
 process.exit(process.exitCode ?? 0);
}
await t.done();
