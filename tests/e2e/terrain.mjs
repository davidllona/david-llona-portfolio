// Objetos mal apoyados. Recorre la escena real y mide todo lo que está marcado
// como «apoyado» (userData.rests; ver `rests` en experience/Instances.jsx):
// cada copia de las mallas con instancias (árboles, rocas, flores, farolas,
// adoquines…) y cada edificio u objeto entero. Compara su base con la altura
// del terreno bajo su apoyo y avisa de lo que flota y de lo que está hundido.
//   node tests/e2e/terrain.mjs            comprobación (falla si hay alguno)
//   node tests/e2e/terrain.mjs lista      imprime además todo lo medido y lo que no se mide
//   node tests/e2e/terrain.mjs capturas   saca una captura del peor caso de cada grupo
import { open, check, wait } from "./common.mjs";

const mode = process.argv[2];
const t = await open();
await t.enter();
await wait(600);

const report = await t.evaluate(() => {
 const { scene, world: getWorld } = window.__world;
 const world = getWorld();
 scene.updateMatrixWorld(true);
 const matrix = scene.matrixWorld.clone();
 const units = [], loose = new Map();

 const shown = (object) => {
  for (let node = object; node; node = node.parent) if (node.visible === false) return false;
  return true;
 };
 const solid = (mesh) => {
  if (!mesh.isMesh || mesh.isSkinnedMesh || !mesh.geometry?.attributes?.position || !shown(mesh)) return false;
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return !(material?.transparent && material.opacity === 0) && material?.depthTest !== false;
 };
 // Caja en el mundo de una malla con una matriz dada: [minX, minY, minZ, maxX, maxY, maxZ].
 const boxOf = (mesh, m) => {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const { min, max } = mesh.geometry.boundingBox, e = m.elements;
  const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 8; i++) {
   const x = i & 1 ? max.x : min.x, y = i & 2 ? max.y : min.y, z = i & 4 ? max.z : min.z;
   const w = [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]];
   for (let k = 0; k < 3; k++) {
    box[k] = Math.min(box[k], w[k]);
    box[k + 3] = Math.max(box[k + 3], w[k]);
   }
  }
  return box;
 };
 const join = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[3], b[3]), Math.max(a[4], b[4]), Math.max(a[5], b[5])];

 // `small`: una copia (árbol, roca…): se apoya en su pie, no en toda su caja.
 // `origin`: en una copia, dónde está plantada (su caja puede quedar descentrada).
 // `foot`: radio de apoyo declarado (userData.foot) cuando la caja del objeto
 // es mucho mayor que su base: un poste con brazo, una casa bajo un árbol.
 const measure = (name, rests, box, small, origin, foot, sinks = 0) => {
  const tall = box[4] - box[1], spanX = box[3] - box[0], spanZ = box[5] - box[2];
  if (tall < 0.01 && spanX < 0.01) return; // copia a escala cero
  const x = origin ? origin[0] : (box[0] + box[3]) / 2, z = origin ? origin[1] : (box[2] + box[5]) / 2;
  if (Math.hypot(x, z) > 60) return;
  // Apoyo: en lo pequeño, el centro y un pie corto (lo alto y estrecho apoya
  // en un punto); en lo grande, una rejilla por toda su planta.
  let reachX = (spanX / 2) * 0.6, reachZ = (spanZ / 2) * 0.6, steps = 1;
  if (small) {
   const foot = tall > 1.5 ? 0.3 : 0.5;
   reachX = Math.min(reachX, foot);
   reachZ = Math.min(reachZ, foot);
  } else if (foot) {
   reachX = reachZ = foot;
   steps = 2;
  } else {
   reachX = (spanX / 2) * 0.8;
   reachZ = (spanZ / 2) * 0.8;
   steps = Math.max(1, Math.min(4, Math.ceil(Math.max(spanX, spanZ) / 2.5)));
  }
  let low = Infinity, high = -Infinity, middle = 0;
  for (let i = -steps; i <= steps; i++) {
   for (let k = -steps; k <= steps; k++) {
    // (El terreno de verdad: lo que hay bajo un puente está bajo el puente.)
    let ground = (world.ground ?? world.height)(x + (i / steps) * reachX, z + (k / steps) * reachZ);
    if (rests === "water") ground = Math.max(ground, world.waterLevel);
    low = Math.min(low, ground);
    high = Math.max(high, ground);
    if (i === 0 && k === 0) middle = ground;
   }
  }
  // Bajo el agua no se ve nada: lo que queda a más de un palmo de profundidad
  // no cuenta como hueco (una roca del mar se apoya en el agua, no en el fondo).
  const wet = middle < world.waterLevel - 0.05;
  low = Math.max(low, world.waterLevel - 0.3);
  const lift = typeof rests === "number" ? rests : 0;
  // Lo pequeño se da por hundido según el suelo de su centro (en una cuesta, un
  // lado siempre entra más); lo grande, según el punto más alto de su planta.
  units.push({ name, x, z, base: box[1], top: box[4], tall, wide: Math.max(spanX, spanZ), low: low + lift, high: (small ? middle : high) + lift, small, sinks, wet, water: world.waterLevel });
 };

 const inUnit = new Set();
 scene.traverse((object) => {
  const rests = object.userData?.rests;
  if (rests === undefined || !shown(object)) return;
  const name = object.name || "(sin nombre)";
  if (object.isInstancedMesh) {
   if (!solid(object)) return;
   inUnit.add(object);
   for (let i = 0; i < object.count; i++) {
    object.getMatrixAt(i, matrix);
    matrix.premultiply(object.matrixWorld);
    measure(name, rests, boxOf(object, matrix), true, [matrix.elements[12], matrix.elements[14]], undefined, object.userData.sinks ?? 0);
   }
   return;
  }
  let box = null;
  object.traverse((mesh) => {
   if (!solid(mesh) || mesh.isInstancedMesh) return;
   inUnit.add(mesh);
   const one = boxOf(mesh, mesh.matrixWorld);
   box = box ? join(box, one) : one;
  });
  if (box) measure(name, rests, box, false, object.userData.foot ? [object.matrixWorld.elements[12], object.matrixWorld.elements[14]] : null, object.userData.foot);
 });
 // Lo que no se mide: se cuenta, para que no se quede nada sin mirar por descuido.
 scene.traverse((mesh) => {
  if (!solid(mesh) || inUnit.has(mesh)) return;
  let owner = "";
  for (let node = mesh.parent; node && node !== scene && !owner; node = node.parent) owner = node.name;
  const key = `${owner || "—"} · ${mesh.geometry.type === "BufferGeometry" ? `malla de ${mesh.geometry.attributes.position.count} vértices` : mesh.geometry.type}${mesh.isInstancedMesh ? ` × ${mesh.count}` : ""}`;
  loose.set(key, (loose.get(key) ?? 0) + 1);
 });
 return { units, loose: [...loose] };
});

// Qué es un problema.
//  · Flota: bajo su base queda un hueco de más de 12 cm en algún punto de su apoyo.
//  · Hundido: el suelo le llega a más de la mitad de su altura (y más de 30 cm),
//    o lo cubre entero. Lo que va enterrado a propósito (`sinks`, las rocas que
//    asoman) puede estarlo un cuarto más de lo previsto.
//  · Sumergido: una roca con el pie en el agua que no llega a asomar (5 cm).
const FLOAT = 0.12, SUNK_SHARE = 0.55, SUNK_DEPTH = 0.3;
const groups = new Map();
for (const unit of report.units) {
 const group = groups.get(unit.name) ?? { name: unit.name, count: 0, floating: [], sunk: [], drowned: [] };
 group.count += 1;
 const gap = unit.base - unit.low;
 const depth = unit.high - unit.base;
 if (gap > FLOAT) group.floating.push({ ...unit, gap });
 const share = unit.sinks ? unit.sinks + 0.25 : SUNK_SHARE;
 if ((depth > SUNK_DEPTH && depth > unit.tall * share) || unit.top < unit.high - 0.02) group.sunk.push({ ...unit, depth });
 if (unit.wet && /^roca/.test(unit.name) && unit.top < unit.water + 0.05) group.drowned.push({ ...unit, under: unit.water - unit.top });
 groups.set(unit.name, group);
}
const place = (unit) => `(${unit.x.toFixed(1)}, ${unit.z.toFixed(1)})`;
const sorted = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
if (mode === "lista") {
 console.log("— Medido —");
 for (const group of sorted) console.log(`  ${String(group.count).padStart(4)} × ${group.name}`);
 console.log("— Sin medir (no van apoyados en el suelo, o son parte de otra cosa) —");
 for (const [key, count] of report.loose.sort()) console.log(`  ${String(count).padStart(4)} × ${key}`);
}
const bad = sorted.filter((group) => group.floating.length || group.sunk.length || group.drowned.length);
const worst = [];
for (const group of bad) {
 const float = group.floating.sort((a, b) => b.gap - a.gap)[0];
 const sunk = group.sunk.sort((a, b) => b.depth - a.depth)[0];
 if (float) {
  console.log(`FLOTA   ${group.floating.length} de ${group.count} × ${group.name} — el peor, ${(float.gap * 100).toFixed(0)} cm de hueco en ${place(float)}`);
  worst.push({ ...float, kind: "flota" });
 }
 const drowned = group.drowned.sort((a, b) => b.under - a.under)[0];
 if (drowned) {
  console.log(`BAJO EL AGUA ${group.drowned.length} de ${group.count} × ${group.name} — la peor, ${(drowned.under * 100).toFixed(0)} cm bajo la superficie en ${place(drowned)}`);
  worst.push({ ...drowned, kind: "sumergida" });
 }
 if (sunk) {
  console.log(`HUNDIDO ${group.sunk.length} de ${group.count} × ${group.name} — el peor, ${(sunk.depth * 100).toFixed(0)} cm de sus ${(sunk.tall * 100).toFixed(0)} en ${place(sunk)}`);
  worst.push({ ...sunk, kind: "hundido" });
 }
}
if (mode === "capturas") {
 for (const unit of worst) {
  // Se mira desde un poco al sur, que es donde está la cámara.
  await t.put(unit.x, unit.z + 2.2, { withWoody: false, settle: 1300 });
  await t.shot(`${unit.kind}-${unit.name.replace(/[^\p{L}\p{N}]+/gu, "-")}`);
 }
}
console.log(`${report.units.length} objetos medidos en ${groups.size} grupos`);
check(bad.length === 0, `ningún objeto flota, está hundido ni queda bajo el agua (${bad.length} grupos con problemas)`);
const wetRocks = report.units.filter((unit) => unit.wet && /^roca/.test(unit.name)).length;
check(wetRocks >= 20, `las ${wetRocks} rocas con el pie en el agua asoman`);
await t.done();
