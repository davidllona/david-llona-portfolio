// Títulos de los carteles 3D y de las cartas (objetivo 27, B1). Regla: margen
// interior fijo; el texto se reduce hasta caber y, si con la letra mínima
// legible aún no cabe, pasa a dos renglones centrados.
//  · Todo texto que se encaja con `fitText` (experience/fitText.js) queda
//    apuntado en `window.__world.fitted`: se comprueba que cabe dentro de su
//    margen y con letra legible, en los tres mundos.
//  · Las cartas HTML (proyectos, paradas, máquinas): el título no se sale de su
//    caja ni pasa de dos renglones.
//  · Capturas de frente de los carteles que se cortaban.
//   node tests/e2e/carteles.mjs [etiqueta] [solo-capturas]
import { check, open, out, wait } from "./common.mjs";

const { PROJECT_CABINS } = await import("../../src/worlds/living/layout.js");
const { QUEST_STOPS } = await import("../../src/worlds/twisted/layout.js");
const { MACHINES } = await import("../../src/worlds/cosmic/layout.js");
const tag = process.argv[2] ?? "ahora";
// Títulos de prueba: largo con espacios, larguísimo y una sola palabra larga.
const LONG = ["Sistema de Diplomas 3D", "Configurador de alfombras personalizadas", "Electroencefalografía"];

const useIt = async (t, [x, z]) => {
 await t.put(x, z, { withWoody: false, settle: 900 });
 await t.page.keyboard.press("KeyE");
 await t.page.waitForSelector(".modal__card [data-fit-title]", { timeout: 12000 }).catch(() => {});
 await wait(700);
};
// El título de la carta abierta: dentro de su caja (sin salirse ni cortarse) y en uno o dos renglones.
async function cardTitle(t, what) {
 await t.evaluate(() => document.fonts.ready);
 await wait(250);
 const title = await t.evaluate(() => {
  const el = document.querySelector(".modal__card [data-fit-title]");
  if (!el) return null;
  const line = parseFloat(getComputedStyle(el).lineHeight);
  return { text: el.textContent, inside: el.scrollWidth <= el.clientWidth + 1, lines: Math.round(el.offsetHeight / line), size: parseFloat(getComputedStyle(el).fontSize), centered: el.dataset.lines === "2" ? getComputedStyle(el).textAlign === "center" : true };
 });
 check(Boolean(title) && title.inside && title.lines <= 2 && title.centered && title.size >= 16, `${what} «${title?.text}»: el título cabe (${title?.size.toFixed(0)} px, ${title?.lines} ${title?.lines === 1 ? "renglón" : "renglones"}${title?.lines === 2 ? ", centrados" : ""})`);
 return title;
}
async function stress(t, variant) {
 for (const title of LONG) {
  await t.evaluate((title) => window.__world.card({ title }), title);
  await wait(500);
  await cardTitle(t, `${variant}, título de prueba`);
 }
}
const onlyShots = process.argv.includes("solo-capturas");

// Encuadra de frente el plano con texto (textura de lienzo) más cercano a (x, z) y lo fotografía.
async function frame(t, name, [x, z], { y = null, group = null } = {}) {
 const found = await t.evaluate(
  (x, z, y, group) => {
   const w = window.__world;
   const THREE = w.THREE;
   let best = null;
   const at = new THREE.Vector3(), normal = new THREE.Vector3();
   // (Con `group`, solo lo que cuelga de ese objeto de la escena.)
   let root = w.scene;
   if (group) w.scene.traverse((node) => node.name === group && (root = node));
   root.traverse((node) => {
    const map = node.material?.map;
    if (!node.isMesh || !map?.image || !(map.image instanceof HTMLCanvasElement) || node.geometry.type !== "PlaneGeometry") return;
    // (Solo carteles: fuera los avisos flotantes de la interfaz 3D, que también son planos con lienzo.)
    if (node.geometry.parameters.width * node.getWorldScale(new THREE.Vector3()).x < 0.5 || !node.visible) return;
    node.getWorldPosition(at);
    const d = Math.hypot(at.x - x, at.z - z) + (y === null ? 0 : Math.abs(at.y - y));
    if (!best || d < best.d) best = { d, node, at: at.clone() };
   });
   if (!best) return null;
   best.node.getWorldDirection(normal);
   const size = new THREE.Vector3();
   best.node.geometry.computeBoundingBox();
   best.node.geometry.boundingBox.getSize(size).multiply(best.node.getWorldScale(new THREE.Vector3()));
   w.__frame = { mesh: best.node, focus: { x: best.at.x, y: best.at.y, z: best.at.z }, yaw: Math.atan2(normal.x, normal.z) };
   return { at: best.at.toArray(), width: size.x };
  },
  x,
  z,
  y,
  group,
 );
 if (!found) return console.log(`     (no hay cartel cerca de ${x}, ${z})`);
 // Primero, como se ve jugando (el astronauta delante); luego de frente, sin él.
 await t.page.screenshot({ path: `${out}cartel-${name}-juego-${tag}.jpg`, type: "jpeg", quality: 86 });
 const corners = () =>
  t.evaluate(() => {
   const w = window.__world, THREE = w.THREE, mesh = w.__frame.mesh;
   mesh.geometry.computeBoundingBox();
   const { min, max } = mesh.geometry.boundingBox;
   const xs = [], ys = [];
   for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) {
    const p = mesh.localToWorld(new THREE.Vector3(x, y, 0)).project(w.camera);
    xs.push(((p.x + 1) / 2) * innerWidth);
    ys.push(((1 - p.y) / 2) * innerHeight);
   }
   return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  });
 await t.evaluate(() => {
  const w = window.__world;
  Object.assign(w.rig, { focus: w.__frame.focus, yaw: w.__frame.yaw, lift: 0.12, tilt: 0, distance: 0.5 });
  w.player.hidden = true;
 });
 // La distancia se ajusta hasta que el cartel ocupa el 45 % del ancho de la pantalla.
 let box;
 for (let i = 0; i < 4; i++) {
  await wait(1400);
  box = await corners();
  const share = (box[2] - box[0]) / 1440;
  if (process.env.DEPURAR) console.log("     encuadre", name, box.map((v) => v.toFixed(0)).join(","), share.toFixed(2), await t.evaluate(() => window.__world.rig.distance.toFixed(2)));
  if (Math.abs(share - 0.45) < 0.03) break;
  await t.evaluate((k) => (window.__world.rig.distance *= k), Math.min(3, Math.max(0.3, share / 0.45)));
 }
 await wait(400);
 box = await corners();
 const pad = 70;
 const x0 = Math.max(0, box[0] - pad), y0 = Math.max(0, box[1] - pad);
 const clip = { x: x0, y: y0, width: Math.min(1440, box[2] + pad) - x0, height: Math.min(900, box[3] + pad) - y0 };
 await t.page.screenshot({ path: `${out}cartel-${name}-${tag}.jpg`, type: "jpeg", quality: 88, clip });
}
const release = (t) =>
 t.evaluate(() => {
  Object.assign(window.__world.rig, { focus: null, distance: 1, lift: 1, yaw: 0 });
  window.__world.player.hidden = false;
 });

// Lo apuntado por `fitText`.
async function fitted(t, where) {
 const list = await t.evaluate(() => window.__world.fitted ?? null);
 if (onlyShots || !list) return;
 const bad = list.filter((one) => !one.fits);
 const tiny = list.filter((one) => one.size < one.min);
 check(list.length > 0 && bad.length === 0 && tiny.length === 0, `${where}: ${list.length} textos encajados, todos dentro de su margen y con letra legible${bad.length ? ` (se salen: ${bad.map((one) => one.text).join(", ")})` : ""}${tiny.length ? ` (letra diminuta: ${tiny.map((one) => one.text).join(", ")})` : ""}`);
 const two = list.filter((one) => one.lines.length === 2);
 if (two.length) console.log(`     en dos renglones: ${[...new Set(two.map((one) => one.lines.join(" / ")))].join(" · ")}`);
}

// ── Mundo 1 ──────────────────────────────────────────────────────────────────
{
 const t = await open({ viewport: { width: 1440, height: 900 } });
 await t.enter();
 const GROUPS = { "top10-triples": "tablón de triples", "concurso-triples": "cartel del concurso de triples" };
 const SHOTS = {
  "movimiento-galactico": [-24.5, 7.7],
  "top10-triples": [-3.2, 9.5],
  "concurso-triples": [2.0, 9.5],
 };
 // (La pista: el tablón y el cartel están junto a la puerta, z = COURT.z0 + 0.7.)
 const court = await t.evaluate(() => {
  let found = null;
  window.__world.scene.traverse((node) => node.name === "tablón de triples" && (found = node.getWorldPosition(new window.__world.THREE.Vector3()).toArray()));
  return found;
 });
 if (court) {
  SHOTS["top10-triples"] = [court[0], court[2]];
  SHOTS["concurso-triples"] = [court[0] + 5.2, court[2]];
 }
 for (const [name, spot] of Object.entries(SHOTS)) {
  await t.put(spot[0], spot[1] + 3, { withWoody: false, settle: 1500 });
  await frame(t, name, spot, { group: GROUPS[name] ?? null });
  await release(t);
 }
 // Los carteles de las cabañas de proyecto (el nombre más largo) y los indicadores.
 const village = await t.evaluate(() => {
  const spots = [];
  const v = new window.__world.THREE.Vector3();
  window.__world.scene.traverse((node) => /cabaña|proyecto/i.test(node.name) && node.isGroup && spots.push(node.getWorldPosition(v).toArray()));
  return spots.slice(0, 1);
 });
 for (const [i, spot] of village.entries()) {
  await t.put(spot[0], spot[2] + 3.5, { withWoody: false, settle: 500 });
  await frame(t, `proyecto-${i + 1}`, [spot[0], spot[2]], { y: 1.7 });
 }
 await release(t);
 await fitted(t, "mundo 1");
 // Las cartas de proyecto: el título dentro de su caja, en uno o dos renglones.
 if (!onlyShots) {
  for (const [i, cabin] of PROJECT_CABINS.entries()) {
   await useIt(t, [cabin.x + 0.4, cabin.z + 3.4]);
   await cardTitle(t, `carta de proyecto ${i + 1}`);
   if (i === 1) await t.page.screenshot({ path: `${out}carta-proyecto-${i + 1}-${tag}.jpg`, type: "jpeg", quality: 86 });
   await t.page.keyboard.press("Escape");
   await wait(500);
  }
  await useIt(t, [PROJECT_CABINS[0].x + 0.4, PROJECT_CABINS[0].z + 3.4]);
  await stress(t, "cartel");
  await t.page.keyboard.press("Escape");
 } else {
  // (Solo capturas: la carta del proyecto 2, la del título largo, y una prueba de título larguísimo.)
  await useIt(t, [PROJECT_CABINS[1].x + 0.4, PROJECT_CABINS[1].z + 3.4]);
  await t.page.screenshot({ path: `${out}carta-proyecto-2-${tag}.jpg`, type: "jpeg", quality: 86 });
  await t.evaluate((title) => window.__world.card({ title }), LONG[1]);
  await wait(600);
  await t.page.screenshot({ path: `${out}carta-titulo-largo-${tag}.jpg`, type: "jpeg", quality: 86 });
  await t.page.keyboard.press("Escape");
 }
 await t.done();
}

// ── Mundos 2 y 3 ─────────────────────────────────────────────────────────────
for (const world of ["twisted", "cosmic"]) {
 const t = await open({ viewport: { width: 1440, height: 900 }, query: `?world=${world}` });
 await t.enter();
 await wait(1500);
 await fitted(t, world === "twisted" ? "mundo 2" : "mundo 3");
 if (!onlyShots) {
  if (world === "twisted") await useIt(t, [QUEST_STOPS.casita.x, QUEST_STOPS.casita.z]);
  else {
   await t.evaluate(() => window.__world.lab.quest.switchOn("dosia"));
   await useIt(t, [MACHINES.dosia.use.x + 0.4, MACHINES.dosia.use.z + 0.9]);
  }
  await cardTitle(t, world === "twisted" ? "cartel colgante" : "máquina");
  await stress(t, world === "twisted" ? "colgante" : "maquina");
 }
 await t.done();
}
