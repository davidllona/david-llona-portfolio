// Cámara, zoom, indicación «E», postes y oclusión.
//   node tests/e2e/camera.mjs
import { open, check, wait } from "./common.mjs";
import { CV_KIOSK, PROJECT_CABINS, SCATTER, SIGNPOSTS, cabinParts, living } from "../../src/worlds/living/layout.js";

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
check((await t.evaluate(() => document.querySelectorAll(".hud__prompt").length)) === 1, "junto al atril hay una sola indicación");
check(/CV/.test((await t.text(".hud__prompt")) ?? ""), "y es la del CV");
check((await t.evaluate(() => getComputedStyle(document.querySelector(".hud__prompt")).backgroundColor)).startsWith("rgba(250, 243, 229"), "con estilo claro");
// La cámara mira a otra parte: el atril deja de verse y la indicación se retira.
await t.evaluate(() => {
 const w = window.__world;
 w.rig.focus = { x: w.player.position.x + 45, y: 0, z: w.player.position.z };
});
await wait(2500);
check((await t.text(".hud__prompt")) === null, "si el objeto no está a la vista, no se ofrece");
await t.evaluate(() => (window.__world.rig.focus = null));
await wait(2500);
check(/CV/.test((await t.text(".hud__prompt")) ?? ""), "y vuelve al verse de nuevo");

// ── Postes indicadores: están, y no se atraviesan ────────────────────────────
check(SIGNPOSTS.length === 5 && SIGNPOSTS.every((s) => living.colliders.some((c) => Math.hypot(c.x - s.x, c.z - s.z) < 0.05)), "los cinco postes tienen colisión");
for (const sign of SIGNPOSTS.slice(0, 2)) {
 await t.put(sign.x, sign.z + 1.3, { withWoody: false, settle: 300 });
 await t.hold("KeyW", 900);
 const p = await t.pos();
 check(p.z > sign.z + 0.3, `no se atraviesa el poste de ${sign.text} (z ${p.z} > ${sign.z})`);
}
// El escaparate de un proyecto tampoco.
{
 const { stand } = cabinParts(PROJECT_CABINS[0]);
 await t.put(stand.x, stand.z + 2, { withWoody: false, settle: 300 });
 await t.hold("KeyW", 1100);
 const p = await t.pos();
 check(p.z > stand.z + 0.8, `no se atraviesa el escaparate (z ${p.z} > ${stand.z})`);
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
console.log(`árbol en (${tree.x.toFixed(1)}, ${tree.z.toFixed(1)}), roca en (${rock.x.toFixed(1)}, ${rock.z.toFixed(1)})`);

await t.done();
