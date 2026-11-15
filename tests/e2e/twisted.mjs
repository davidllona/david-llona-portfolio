// Mundo 2 · The Twisted Moon (muestra de estilo): siempre de noche, la luna
// enorme y baja, la colina en espiral (se sube por su senda y solo por ella),
// la casa torcida con su puerta («Sobre mí», el texto real), árboles rizados,
// farola, verja y balizas bien apoyados y con colisión, Woody con su farolillo
// y guiando hasta la casa. Abre directamente en ese mundo (?world=twisted,
// solo en desarrollo); el viaje hasta él lo prueba travel.mjs.
//   node tests/e2e/twisted.mjs [fps]
import { open, check, wait } from "./common.mjs";
import twisted, { HILL, HOUSE, HOUSE_DOOR, LAMPS, TREES, WATER_LEVEL, height } from "../../src/worlds/twisted/layout.js";
import { aboutText } from "../../src/content/about.js";

// ── Sin navegador: la senda de la colina ──
{
 const TAU = Math.PI * 2, steps = [];
 let free = true, last = -1, rising = true;
 // (Hasta un metro de la cima: arriba del todo está el árbol.)
 for (let turned = 0.06; turned < HILL.turns * TAU - 1.7; turned += 0.02) {
  const r = HILL.r * (1 - turned / (TAU * HILL.turns)), angle = turned + Math.PI / 2;
  const x = HILL.x + Math.cos(angle) * r, z = HILL.z + Math.sin(angle) * r, y = height(x, z);
  if (twisted.blocked(x, z, y)) free = false;
  if (y < last - 0.02) rising = false;
  last = y;
  steps.push(y);
 }
 check(free && rising && last > HILL.height * 0.86, `la senda de la colina sube en espiral sin cortes, de ${steps[0].toFixed(1)} a ${last.toFixed(1)} m en ${HILL.turns} vueltas`);
 // De una vuelta de la senda a la siguiente hay un talud que no se trepa.
 let wall = 0;
 for (const angle of [0.4, 1.9, 3.3, 5.1]) {
  let hit = false;
  for (let r = HILL.r - 0.4; r > 1.5; r -= 0.1) if (twisted.blocked(HILL.x + Math.cos(angle) * r, HILL.z + Math.sin(angle) * r, 0)) hit = true;
  if (hit) wall += 1;
 }
 check(wall === 4, `ladera arriba, en línea recta, siempre hay un talud que corta el paso (${wall} de 4 rumbos)`);
 let puddles = 0;
 for (let x = -40; x <= 40; x += 1) for (let z = -40; z <= 40; z += 1) if (Math.hypot(x, z) < 38 && height(x, z) < WATER_LEVEL + 0.05) puddles += 1;
 check(puddles === 0, `tierra adentro no queda ningún charco (${puddles} puntos bajo el nivel de la laguna)`);
}

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

const scene = await t.evaluate(() => {
 const w = window.__world, names = {};
 w.scene.traverse((o) => { if (o.name) names[o.name] = (names[o.name] ?? 0) + (o.isInstancedMesh ? o.count : 1); });
 // La luna grande: dónde está en el cielo y cuánto ocupa.
 const moon = w.bigMoon, away = moon.position.clone().sub(w.camera.position);
 return {
  world: w.world().id,
  moment: document.documentElement.dataset.momento,
  toggle: !!document.querySelector(".theme-toggle"),
  names,
  moon: { up: (Math.asin(away.y / away.length()) * 180) / Math.PI, radius: (Math.atan(moon.scale.x / away.length()) * 180) / Math.PI, north: away.z < 0, visible: moon.visible },
  fog: !!w.scene.fogNode,
 };
});
check(scene.world === "twisted" && scene.moment === "night" && !scene.toggle, `The Twisted Moon: siempre de noche, sin botón de día y noche (${scene.moment})`);
check(scene.moon.visible && scene.moon.radius > 8 && scene.moon.up > 6 && scene.moon.up < 20 && scene.moon.north, `la luna es enorme y está baja, al norte: ${scene.moon.radius.toFixed(0)}° de radio, a ${scene.moon.up.toFixed(0)}° sobre el horizonte`);
check(scene.fog, "la niebla baja está puesta");
const trees = (scene.names["árbol rizado 1"] ?? 0) + (scene.names["árbol rizado 2"] ?? 0) + (scene.names["árbol rizado 3"] ?? 0);
check(scene.names["casa torcida"] === 1 && trees === TREES.length && scene.names["farola doblada"] === LAMPS.length && scene.names["verja"] === 1 && scene.names["baliza"] === 4, `están la casa torcida, ${trees} árboles rizados, ${scene.names["farola doblada"]} farola doblada, la verja y ${scene.names["baliza"]} balizas`);
check(scene.names["farolillo de Woody"] === 1, "Woody lleva su farolillo al cuello");

// Todo lo plantado se apoya en el suelo.
const seats = await t.evaluate(() => {
 const w = window.__world, world = w.world(), out = [];
 const m = new w.camera.matrixWorld.constructor();
 w.scene.traverse((o) => {
  if (!o.isInstancedMesh || o.userData.rests !== 0) return;
  for (let i = 0; i < o.count; i++) {
   o.getMatrixAt(i, m);
   const e = m.elements;
   out.push({ name: o.name, gap: e[13] - world.height(e[12], e[14]) });
  }
 });
 return out;
});
const off = seats.filter((one) => one.gap > 0.03 || one.gap < -0.25);
check(seats.length > 200 && off.length === 0, `${seats.length} objetos apoyados en el suelo: ninguno flota ni queda enterrado${off.length ? ` — ${off.slice(0, 4).map((one) => `${one.name} ${one.gap.toFixed(2)}`).join(", ")}` : ""}`);

// La casa: desde la puerta se lee «Sobre mí», el texto real.
await t.put(HOUSE_DOOR.x + 0.3, HOUSE_DOOR.z + 0.5, { settle: 1200 });
check((await t.hint()) === "Leer mi historia", `ante la puerta de la casa torcida: «${await t.hint()}»`);
const lights = await t.evaluate(() => { let on = 0; window.__world.scene.traverse((o) => { if (o.isPointLight && o.intensity > 0.5) on += 1; }); return on; });
check(lights >= 3, `junto a la casa hay luces cálidas encendidas de verdad (${lights}: farol de la puerta, ventanas, farola, el farolillo)`);
await t.shot("luna-puerta");
await t.page.keyboard.press("KeyE");
await wait(1400);
const card = await t.evaluate(() => ({ title: document.querySelector(".modal__title")?.textContent, text: [...document.querySelectorAll(".modal__text")].map((p) => p.textContent) }));
check(card.title === aboutText.headline.join(" ") && card.text.join("|") === aboutText.paragraphs.join("|"), `con E se abre su historia, con el texto real de «Sobre mí»: «${card.title}»`);
await t.shot("luna-ficha");
await t.page.keyboard.press("Escape");
await wait(900);

// Colisiones: ni la casa ni un árbol se atraviesan.
const inside = (p) => {
 const dx = p.x - HOUSE.x, dz = p.z - HOUSE.z;
 const lx = dx * Math.cos(HOUSE.turn) - dz * Math.sin(HOUSE.turn), lz = dx * Math.sin(HOUSE.turn) + dz * Math.cos(HOUSE.turn);
 return Math.abs(lx) < HOUSE.width / 2 && Math.abs(lz) < HOUSE.depth / 2;
};
await t.hold("KeyW", 1600);
let at = await t.pos();
check(!inside(at), `andando contra la fachada no se entra en la casa (queda en ${at.x}, ${at.z})`);
const tree = TREES[2];
await t.put(tree.x, tree.z + 2.2, { withWoody: false, settle: 500 });
await t.hold("KeyW", 1400);
at = await t.pos();
check(Math.hypot(at.x - tree.x, at.z - tree.z) > 0.45, `ni se atraviesa un árbol (a ${Math.hypot(at.x - tree.x, at.z - tree.z).toFixed(2)} m de su tronco)`);

// Woody guía hasta la casa torcida.
await t.put(0, 7.5, { settle: 900 });
await t.evaluate(() => [...document.querySelectorAll(".quick button")].find((b) => b.textContent === "Sobre mí").click());
await wait(500);
check((await t.woody()).mode === "guide", "«Sobre mí» en el menú: Woody echa a andar hacia la casa torcida");
const arrived = await t.followWoody({ steps: 160 });
at = await t.pos();
check(arrived && Math.hypot(at.x - HOUSE_DOOR.x, at.z - HOUSE_DOOR.z) < 4.5, `y siguiéndole se llega a su puerta (a ${Math.hypot(at.x - HOUSE_DOOR.x, at.z - HOUSE_DOOR.z).toFixed(1)} m)`);

// Se sube a la colina andando por la senda (media vuelta larga).
await t.put(HILL.x, HILL.z + HILL.r - 0.4, { withWoody: false, settle: 500 });
const foot = await t.pos();
const held = new Set();
for (let turned = 0.3; turned <= 4.2; turned += 0.3) {
 const r = HILL.r * (1 - turned / (Math.PI * 2 * HILL.turns)), angle = turned + Math.PI / 2;
 const goal = [HILL.x + Math.cos(angle) * r, HILL.z + Math.sin(angle) * r];
 for (let i = 0; i < 30; i++) {
  const p = await t.pos();
  if (Math.hypot(p.x - goal[0], p.z - goal[1]) < 0.7) break;
  const want = new Set();
  if (goal[1] < p.z - 0.3) want.add("KeyW");
  else if (goal[1] > p.z + 0.3) want.add("KeyS");
  if (goal[0] < p.x - 0.3) want.add("KeyA");
  else if (goal[0] > p.x + 0.3) want.add("KeyD");
  for (const key of held) if (!want.has(key)) (await t.page.keyboard.up(key), held.delete(key));
  for (const key of want) if (!held.has(key)) (await t.page.keyboard.down(key), held.add(key));
  await wait(120);
 }
}
for (const key of held) await t.page.keyboard.up(key);
await wait(400);
at = await t.pos();
check(at.y > foot.y + 1.6, `por la senda de la colina se sube andando (de ${foot.y} a ${at.y} m en dos tercios de vuelta)`);
await t.shot("luna-colina-senda");

const hot = await t.evaluate(() => [...new Set(window.__hot)]);
check(hot.length === 0, `0 pipelines en caliente en todo el paseo (la ficha, las luces que cambian de sitio, Woody guiando, la colina)${hot.length ? ": " + hot.join(", ") : ""}`);

if (process.argv.includes("fps")) {
 await t.browser.close();
 const r = await open({ viewport: { width: 1440, height: 810, deviceScaleFactor: 2 }, uncapped: true, query: "?world=twisted" });
 await r.enter();
 const line = [];
 for (const [name, x, z] of [["llegada", 0, 7.5], ["casa", -9.4, -4.6], ["puerta", HOUSE_DOOR.x, HOUSE_DOOR.z + 0.6], ["colina", HILL.x, HILL.z + HILL.r + 1.5], ["páramo", 14, 10]]) {
  await r.put(x, z, { settle: 1200 });
  line.push(`${name} ${await r.fps(3)}`);
 }
 console.log("fps (2880 × 1620, sin límite): " + line.join(" · "));
 await r.browser.close();
 process.exit(process.exitCode ?? 0);
}
await t.done();
