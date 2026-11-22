// El puente rojo del jardín japonés (objetivo 27, B3): un puente arqueado que
// pasa POR ENCIMA del agua del estanque, apoyado en las orillas y más alto en
// el centro; se cruza andando y los kois pasan por debajo.
//   node tests/e2e/puente.mjs [etiqueta] [solo-capturas]
import { check, open, out, wait } from "./common.mjs";

const tag = process.argv[2] ?? "ahora";
const onlyShots = process.argv.includes("solo-capturas");
const { GARDEN } = await import("../../src/worlds/living/layout.js");
const { pond } = GARDEN;

const t = await open({ viewport: { width: 1440, height: 900 } });
const { page, evaluate } = t;
await t.enter();

// Capturas: de lado y a ras del agua (se ve si el tablero queda encima o debajo) y como se juega.
const view = async (name, { lift, distance, yaw }) => {
 await evaluate(
  (focus, lift, distance, yaw) => {
   Object.assign(window.__world.rig, { focus, lift, distance, yaw, tilt: 0 });
   window.__world.player.hidden = true;
  },
  { x: pond.x, y: 0.5, z: pond.z },
  lift,
  distance,
  yaw,
 );
 await wait(1800);
 await page.screenshot({ path: `${out}puente-${name}-${tag}.jpg`, type: "jpeg", quality: 88 });
};
await t.put(pond.x - 5, pond.z, { withWoody: false, settle: 600 });
await view("lado", { lift: 0.3, distance: 0.62, yaw: -Math.PI / 2 });
await view("arriba", { lift: 0.9, distance: 0.75, yaw: -0.5 });
await evaluate(() => {
 Object.assign(window.__world.rig, { focus: null, distance: 1, lift: 1, yaw: 0 });
 window.__world.player.hidden = false;
});

if (!onlyShots) {
 // Medidas reales de la escena: el agua, el puente (sus partes más bajas sobre el agua) y los kois.
 const m = await evaluate((pond) => {
  const w = window.__world, THREE = w.THREE;
  let water = null, bridge = null, koi = null;
  w.scene.traverse((node) => {
   if (node.name === "agua del estanque") water = node;
   if (node.name === "puente rojo") bridge = node;
   if (node.name === "koi") koi = node;
  });
  const waterY = water.getWorldPosition(new THREE.Vector3()).y;
  // Lo más bajo del puente dentro del agua (vértices sobre la elipse del estanque).
  const p = bridge.geometry.attributes.position, v = new THREE.Vector3();
  let lowOverWater = Infinity, lowEnd = Infinity, top = -Infinity, ends = [Infinity, -Infinity];
  for (let i = 0; i < p.count; i++) {
   v.fromBufferAttribute(p, i).applyMatrix4(bridge.matrixWorld);
   const inside = ((v.x - pond.x) / pond.rx) ** 2 + ((v.z - pond.z) / pond.rz) ** 2 < 1;
   if (inside) lowOverWater = Math.min(lowOverWater, v.y);
   else lowEnd = Math.min(lowEnd, v.y);
   top = Math.max(top, v.y);
   ends = [Math.min(ends[0], v.z), Math.max(ends[1], v.z)];
  }
  // Kois: lo más alto de cada uno y la altura del tablero del puente justo encima.
  const k = new THREE.Matrix4(), box = new THREE.Box3();
  koi.geometry.computeBoundingBox();
  let koiTop = -Infinity, under = 0;
  for (let i = 0; i < koi.count; i++) {
   koi.getMatrixAt(i, k);
   box.copy(koi.geometry.boundingBox).applyMatrix4(k);
   koiTop = Math.max(koiTop, box.max.y);
   const c = box.getCenter(v);
   if (Math.abs(c.x - pond.x) < 0.8) under += 1;
  }
  return { waterY, lowOverWater, lowEnd, top, ends, koiTop, under, deckMid: w.world().height(pond.x, pond.z) };
 }, pond);
 check(m.lowOverWater > m.waterY + 0.02, `el puente pasa por encima del agua: lo más bajo de él sobre el estanque está a ${m.lowOverWater.toFixed(2)} m y el agua a ${m.waterY.toFixed(2)} (antes, el agua tapaba el tablero)`);
 check(m.ends[0] < pond.z - pond.rz - 0.4 && m.ends[1] > pond.z + pond.rz + 0.4, `apoya en las dos orillas, fuera del agua (de z ${m.ends[0].toFixed(1)} a ${m.ends[1].toFixed(1)}; el agua va de ${(pond.z - pond.rz).toFixed(1)} a ${(pond.z + pond.rz).toFixed(1)})`);
 check(m.deckMid > m.waterY + 0.6, `más alto en el centro: el tablero, a ${m.deckMid.toFixed(2)} m (${(m.deckMid - m.waterY).toFixed(2)} sobre el agua)`);
 check(m.koiTop < m.waterY && m.koiTop < m.deckMid - 0.3, `los kois nadan bajo el agua y bajo el puente (lo más alto de un koi, ${m.koiTop.toFixed(2)} m)`);
 // Cruzarlo andando: de una orilla a la otra con la tecla, y el astronauta va por encima de las tablas.
 const [z0, z1] = [m.ends[0] - 0.8, m.ends[1] + 0.8];
 await t.put(pond.x, z0, { withWoody: false, settle: 600 });
 await evaluate(() => (window.__world.player.facing = Math.PI)); // mira hacia +z
 const path = [];
 await page.keyboard.down("KeyS");
 const started = Date.now();
 while (Date.now() - started < 6000) {
  const p = await t.pos();
  path.push(p);
  if (p.z > z1) break;
  await wait(80);
 }
 await page.keyboard.up("KeyS");
 const overWater = path.filter((p) => ((p.x - pond.x) / pond.rx) ** 2 + ((p.z - pond.z) / pond.rz) ** 2 < 1);
 const crossed = path.at(-1).z > z1;
 check(crossed && overWater.length > 3 && overWater.every((p) => p.y > m.waterY + 0.1) && Math.max(...path.map((p) => p.y)) > m.deckMid - 0.1, `se cruza andando: de z ${z0.toFixed(1)} a ${path.at(-1).z.toFixed(1)}, siempre por encima del agua (sobre ella, de ${Math.min(...overWater.map((p) => p.y)).toFixed(2)} a ${Math.max(...overWater.map((p) => p.y)).toFixed(2)} m)`);
}
await t.done();
