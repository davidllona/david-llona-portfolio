// Jardín japonés: están el torii, la casa de té, el puente, los faroles, los
// kois y los cerezos; el puente se cruza andando; el cartel dice JARDÍN.
//   node tests/e2e/garden.mjs
import { open, check, wait } from "./common.mjs";

const t = await open();
await t.enter();
const L = await t.evaluate(async () => {
 const m = await import("/src/worlds/living/layout.js");
 return { GARDEN: m.GARDEN, signs: m.SIGNPOSTS.map((s) => s.text), cherries: m.SCATTER.trees.filter((tree) => tree.kind === "cherry" && Math.hypot(tree.x - m.GARDEN.x, tree.z - m.GARDEN.z) < 11).length };
});
const { GARDEN } = L;
const found = await t.evaluate(() => {
 const seen = {};
 window.__world.scene.traverse((o) => {
  if (!o.isMesh || !o.name) return;
  if (["torii", "puente rojo", "casa de té", "koi", "farol japonés", "piedra del estanque"].includes(o.name)) seen[o.name] = (seen[o.name] ?? 0) + (o.isInstancedMesh ? o.count : 1);
 });
 return seen;
});
check(found.torii === 1 && found["casa de té"] === 1 && found["puente rojo"] === 1, "están el torii, la casa de té y el puente rojo");
check(found.koi >= 6 && found["farol japonés"] === GARDEN.lamps.length && found["piedra del estanque"] > 15, `kois (${found.koi}), faroles (${found["farol japonés"]}) y piedras del estanque (${found["piedra del estanque"]}), con instancias`);
check(L.signs.includes("JARDÍN") && L.cherries >= 3, `cartel «JARDÍN» y cerezos alrededor (${L.cherries})`);

// El puente se cruza andando, de norte a sur, subiendo por su lomo.
const [fx, fz] = GARDEN.bridge.from, [, tz] = GARDEN.bridge.to;
await t.put(fx, fz - 0.9, { withWoody: false, settle: 500 });
await t.page.keyboard.down("KeyS");
let top = 0;
for (let i = 0; i < 16; i++) {
 await wait(150);
 top = Math.max(top, (await t.pos()).y);
}
await t.page.keyboard.up("KeyS");
const end = await t.pos();
check(end.z > tz - 0.3 && top > 0.25, `el puente se cruza andando (llega a z ${end.z}; sube ${top.toFixed(2)} m en el lomo)`);

// Los kois nadan.
const koiAt = () => t.evaluate(() => { let p = null; window.__world.scene.traverse((o) => { if (o.name === "koi") { const m = new o.matrix.constructor(); o.getMatrixAt(0, m); p = [m.elements[12], m.elements[14]]; } }); return p; });
const a = await koiAt();
await wait(1500);
const b = await koiAt();
check(Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.1, `los kois nadan (${Math.hypot(a[0] - b[0], a[1] - b[1]).toFixed(2)} m en 1,5 s)`);
await t.done();
