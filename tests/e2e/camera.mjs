// Cámara, zoom, indicación «E», postes y oclusión.
//   node tests/e2e/camera.mjs
import { open, check, wait } from "./common.mjs";
import { CV_KIOSK, PAD, PROJECT_CABINS, SCATTER, SIGNPOSTS, cabinParts, living } from "../../src/worlds/living/layout.js";

const ASTRONAUT_HEIGHT = 2.17; // m, casco incluido

const t = await open();
await t.enter();
const pose = () =>
 t.evaluate(() => {
  const { camera, player, rig } = window.__world;
  const dx = camera.position.x - player.position.x, dy = camera.position.y - (player.position.y + 1), dz = camera.position.z - (player.position.z - 0.5);
  return { pitch: (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI, distance: Math.hypot(dx, dy, dz), zoom: rig.zoom };
 });
const astronautShare = async () => {
 const p = await t.pos();
 const [, feet] = await t.screen(p.x, p.y, p.z);
 const [, head] = await t.screen(p.x, p.y + ASTRONAUT_HEIGHT, p.z);
 return (feet - head) / 900;
};

// ── Encuadre ─────────────────────────────────────────────────────────────────
await t.put(0, 9.5, { settle: 1600 });
let view = await pose();
check(view.pitch > 38 && view.pitch < 40, `la cámara mira con ${view.pitch.toFixed(1)}° de inclinación (38–40)`);
let share = await astronautShare();
check(share > 0.15 && share < 0.2, `el astronauta ocupa el ${(share * 100).toFixed(1)} % del alto (15–20)`);
check((await t.evaluate(() => getComputedStyle(document.querySelector("canvas")).filter)) === "none", "sin filtro de desenfoque sobre el lienzo");

// ── Zoom con la rueda, con límites ───────────────────────────────────────────
await t.page.mouse.move(720, 300);
for (let i = 0; i < 30; i++) await t.page.mouse.wheel({ deltaY: -120 });
await wait(1500);
const near = await pose();
for (let i = 0; i < 60; i++) await t.page.mouse.wheel({ deltaY: 120 });
await wait(2200);
const far = await pose();
check(near.zoom > 0.7 && near.zoom < 0.75 && near.distance < view.distance * 0.78, `la rueda acerca hasta un tope (zoom ${near.zoom.toFixed(2)}, ${near.distance.toFixed(1)} m)`);
check(far.zoom > 1.85 && far.zoom <= 1.9 && far.distance > view.distance * 1.7, `y aleja hasta otro (zoom ${far.zoom.toFixed(2)}, ${far.distance.toFixed(1)} m)`);
await t.shot("camara-zoom-lejos");
await t.evaluate(() => (window.__world.rig.zoom = 1));
await wait(1800);

// ── Indicación «E»: una, y solo de lo que se ve ──────────────────────────────
await t.put(CV_KIOSK.x, CV_KIOSK.z + 1.4, { withWoody: false, settle: 1400 });
check(/CV/.test((await t.hint()) ?? ""), "junto al atril hay una sola indicación, la del CV");
{
 const [hx, , hz] = await t.hintAt();
 check(Math.hypot(hx - CV_KIOSK.x, hz - CV_KIOSK.z) < 1.5, "y flota junto al atril, dentro del mundo");
}
check((await t.evaluate(() => document.querySelectorAll(".hud, .hud__prompt, .hud__toast, .hud__hint").length)) === 0, "no queda ningún aviso HTML encima del juego");
// La cámara mira a otra parte: el atril deja de verse y la indicación se retira.
await t.evaluate(() => {
 const w = window.__world;
 w.rig.focus = { x: w.player.position.x + 45, y: 0, z: w.player.position.z };
});
await wait(2500);
check((await t.hint()) === null, "si el objeto no está a la vista, no se ofrece");
await t.evaluate(() => (window.__world.rig.focus = null));
await wait(2500);
check(/CV/.test((await t.hint()) ?? ""), "y vuelve al verse de nuevo");

// ── Tarjeta de la «E»: discreta, sobre su objeto y sin tapar al astronauta ───
// Con Woody al lado y a tres distancias de cámara: el tamaño en pantalla apenas
// cambia, queda sobre Woody y no pisa al astronauta.
await t.put(0, 9.5, { settle: 1500 });
{
 const sizes = [];
 for (const zoom of [0.72, 1, 1.9]) {
  await t.evaluate((zoom) => (window.__world.rig.zoom = zoom), zoom);
  await wait(1900);
  const hint = await t.evaluate(() => window.__world.ui3d.hint && { ...window.__world.ui3d.hint });
  const w = await t.woody();
  const [wx, wy] = await t.screen(w.x, w.y + 0.5, w.z);
  const box = hint?.screen;
  const ok = Boolean(box) && /Woody/.test(hint.text);
  const px = ok ? { left: (box.left * 0.5 + 0.5) * 1440, right: (box.right * 0.5 + 0.5) * 1440, top: (0.5 - box.top * 0.5) * 900, bottom: (0.5 - box.bottom * 0.5) * 900 } : null;
  const high = ok ? px.bottom - px.top : 0, wide = ok ? px.right - px.left : 0;
  sizes.push(high);
  const body = ok ? box.body : null;
  const clear = ok && (box.left >= body.right || box.right <= body.left || box.bottom >= body.top || box.top <= body.bottom);
  const above = ok && px.bottom <= wy + 4 && wx > px.left - 40 && wx < px.right + 40;
  check(ok && high >= 18 && high <= 34 && wide <= 250, `zoom ${zoom}: la tarjeta de Woody mide ${wide.toFixed(0)} × ${high.toFixed(0)} px (discreta: 18–34 de alto)`);
  check(clear, `zoom ${zoom}: no tapa al astronauta`);
  check(above, `zoom ${zoom}: queda sobre Woody`);
  await t.shot(`tarjeta-woody-zoom-${zoom}`);
 }
 check(Math.max(...sizes) / Math.min(...sizes) < 1.5, `su tamaño es estable al acercar y alejar (de ${Math.min(...sizes).toFixed(0)} a ${Math.max(...sizes).toFixed(0)} px)`);
 await t.evaluate(() => (window.__world.rig.zoom = 1));
 await wait(1500);
}

// ── Postes indicadores: están, y no se atraviesan ────────────────────────────
check(SIGNPOSTS.length >= 5 && SIGNPOSTS.every((s) => living.colliders.some((c) => Math.hypot((c.x + (c.bx ?? c.x)) / 2 - s.x, (c.z + (c.bz ?? c.z)) / 2 - s.z) < 0.05)), `los ${SIGNPOSTS.length} carteles tienen colisión`);
for (const sign of SIGNPOSTS.slice(0, 2)) {
 await t.put(sign.x, sign.z + 1.3, { withWoody: false, settle: 300 });
 await t.hold("KeyW", 900);
 const p = await t.pos();
 check(p.z > sign.z + 0.3, `no se atraviesa el poste de ${sign.text} (z ${p.z} > ${sign.z})`);
}
// La pantalla de cada proyecto tampoco: va exenta, delante de la casa. Andando
// de frente contra ella el astronauta se para o la rodea, pero no acaba al otro
// lado por el medio.
for (const cabin of PROJECT_CABINS) {
 const { stand } = cabinParts(cabin);
 await t.put(stand.x, stand.z + 2, { withWoody: false, settle: 300 });
 await t.hold("KeyW", 1300);
 const p = await t.pos();
 const through = p.z < stand.z - 0.25 && Math.abs(p.x - stand.x) < 0.75;
 check(!through && Math.hypot(p.x - stand.x, p.z - stand.z) > 0.45, `no se atraviesa la pantalla del proyecto ${PROJECT_CABINS.indexOf(cabin)} (queda en ${p.x}, ${p.z}; la pantalla, en ${stand.x.toFixed(2)}, ${stand.z.toFixed(2)})`);
}

// ── Oclusión: capturas detrás de un árbol, una roca y una casa ───────────────
const alone = (list, item, gap) => list.every((other) => other === item || Math.hypot(other.x - item.x, other.z - item.z) > gap);
const free = (x, z) => !living.blocked(x, z, living.height(x, z)) && !living.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.45);
const tree = SCATTER.trees.find((one) => one.kind === "oak" && one.scale > 1.1 && living.height(one.x, one.z) < 1 && alone(SCATTER.trees, one, 5) && free(one.x, one.z - 1.5));
const rock = [...SCATTER.rocks].sort((a, b) => b.scale - a.scale).find((one) => living.height(one.x, one.z) < 1 && free(one.x, one.z - 1.6));
const house = PROJECT_CABINS[0];
for (const [name, x, z] of [["arbol", tree.x, tree.z - 1.5], ["roca", rock.x, rock.z - 1.6], ["casa", house.x + 0.4, house.z - 4.4]]) {
 await t.put(x, z, { withWoody: false, settle: 1800 });
 await t.shot(`oclusion-${name}`);
}
// El cohete: todo su material cede alrededor del astronauta, y este se ve a través.
{
 await t.put(PAD.x, PAD.z - 3.4, { withWoody: false, settle: 1800 });
 const solid = await t.evaluate(() => {
  let total = 0, through = 0;
  window.__world.scene.getObjectByName("cohete").traverse((mesh) => {
   if (!mesh.isMesh || mesh.material.transparent) return; // (la llama y la zona de clic no tapan)
   total += 1;
   if (mesh.material.opacityNode) through += 1;
  });
  return { total, through };
 });
 check(solid.total >= 10 && solid.through === solid.total, `las ${solid.total} piezas del cohete se vuelven translúcidas ante el astronauta`);
 // El astronauta cambia lo que se ve en su sitio: con él y sin él no sale la misma imagen.
 const p = await t.pos();
 const [sx, sy] = await t.screen(p.x, p.y + 1.1, p.z);
 const patch = () =>
  t.evaluate(
   async (sx, sy) => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const source = document.querySelector("canvas");
    const k = source.width / innerWidth;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 48;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, (sx - 26) * k, (sy - 44) * k, 52 * k, 88 * k, 0, 0, 48, 48);
    return [...ctx.getImageData(0, 0, 48, 48).data];
   },
   sx,
   sy,
  );
 const withBody = await patch();
 await t.shot("oclusion-cohete");
 await t.evaluate(() => (window.__world.scene.getObjectByName("astronauta").visible = false));
 const without = await patch();
 await t.evaluate(() => (window.__world.scene.getObjectByName("astronauta").visible = true));
 const change = withBody.reduce((sum, value, i) => sum + Math.abs(value - without[i]), 0) / withBody.length;
 check(change > 6, `detrás del cohete el astronauta se sigue viendo (cambio de imagen ${change.toFixed(1)} sobre 255)`);
}
console.log(`árbol en (${tree.x.toFixed(1)}, ${tree.z.toFixed(1)}), roca en (${rock.x.toFixed(1)}, ${rock.z.toFixed(1)})`);

await t.done();
