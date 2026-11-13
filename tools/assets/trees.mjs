// Prepara los árboles y el arbusto de slabdsgn (Envato; ver docs/CREDITOS.md)
// para la web: assets-externos/modelos/*/N.gltf → public/models/living/flora/*.glb
//
//   node tools/assets/trees.mjs
//
// De cada modelo sale UNA malla (madera y hojas unidas), en metros, con el pie
// en el origen, simplificada hasta su presupuesto de triángulos y comprimida
// (cuantización + meshopt). No lleva materiales ni normales: el juego le pone
// su material facetado. En el color de vértice va una máscara, no un color:
//   r = altura dentro de su parte (0 abajo, 1 arriba) · g = 1 si es hoja ·
//   b = un valor al azar por masa de hojas (para variar el tono de cada una).
// La paleta se aplica al cargar (src/worlds/living/flora/useFlora.js), así se
// cambia sin volver a exportar.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { meshopt, quantize } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = path.join(root, "assets-externos/modelos");
const TARGET = path.join(root, "public/models/living/flora");

// name: archivo de salida · height: altura final en metros · wood/leaf:
// triángulos como mucho en cada parte (sin tope = se queda como viene).
const MODELS = [
 { name: "frutal", file: "low-poly-fruit-tree-asset/11.gltf", height: 4.7, wood: 1100, leaf: 1800 },
 { name: "frondoso", file: "low-poly-green-tree-asset/15.gltf", height: 5.6, wood: 2000 },
 { name: "redondo", file: "low-poly-green-tree-object/13.gltf", height: 5.0 },
 { name: "acacia", file: "low-poly-umbrella-thorn-tree/14.gltf", height: 3.8, wood: 1250 },
 { name: "mata", file: "low-poly-bush-cluster/10.gltf", height: 1.15 },
];

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

// Une los vértices que coinciden: los modelos vienen con las caras sueltas.
function weld(points, indices) {
 const seen = new Map();
 const remap = new Uint32Array(points.length / 3);
 const kept = [];
 for (let i = 0; i < remap.length; i++) {
  const key = `${Math.round(points[i * 3] * 2e4)},${Math.round(points[i * 3 + 1] * 2e4)},${Math.round(points[i * 3 + 2] * 2e4)}`;
  let id = seen.get(key);
  if (id === undefined) {
   id = kept.length / 3;
   seen.set(key, id);
   kept.push(points[i * 3], points[i * 3 + 1], points[i * 3 + 2]);
  }
  remap[i] = id;
 }
 const welded = [];
 for (let i = 0; i < indices.length; i += 3) {
  const a = remap[indices[i]], b = remap[indices[i + 1]], c = remap[indices[i + 2]];
  if (a !== b && b !== c && a !== c) welded.push(a, b, c);
 }
 return { points: new Float32Array(kept), indices: new Uint32Array(welded) };
}

// Quita los vértices que ya no usa ningún triángulo.
function compact({ points, indices }) {
 const remap = new Int32Array(points.length / 3).fill(-1);
 const kept = [];
 const out = new Uint32Array(indices.length);
 indices.forEach((index, i) => {
  if (remap[index] < 0) {
   remap[index] = kept.length / 3;
   kept.push(points[index * 3], points[index * 3 + 1], points[index * 3 + 2]);
  }
  out[i] = remap[index];
 });
 return { points: new Float32Array(kept), indices: out };
}

// Reduce hasta `budget` triángulos conservando la silueta (meshoptimizer).
function simplify(part, budget) {
 if (!budget || part.indices.length / 3 <= budget) return part;
 const [indices] = MeshoptSimplifier.simplify(part.indices, part.points, 3, budget * 3, 0.05, []);
 return compact({ points: part.points, indices });
}

// Islas de triángulos conectados: cada masa de hojas es una.
function islands({ points, indices }) {
 const parent = Array.from({ length: points.length / 3 }, (_, i) => i);
 const find = (i) => {
  while (parent[i] !== i) i = parent[i] = parent[parent[i]];
  return i;
 };
 for (let i = 0; i < indices.length; i += 3) {
  parent[find(indices[i])] = find(indices[i + 1]);
  parent[find(indices[i])] = find(indices[i + 2]);
 }
 return parent.map((_, i) => find(i));
}

const report = [];
fs.mkdirSync(TARGET, { recursive: true });
for (const model of MODELS) {
 const source = await io.read(path.join(SOURCE, model.file));
 const parts = { wood: { points: [], indices: [] }, leaf: { points: [], indices: [] } };
 let before = 0;
 for (const node of source.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const m = node.getWorldMatrix();
  for (const primitive of mesh.listPrimitives()) {
   // «coklat kayu» = madera; «hijau» = verde (los nombres vienen en indonesio).
   const part = /coklat|kayu/i.test(primitive.getMaterial()?.getName() ?? "") ? parts.wood : parts.leaf;
   const position = primitive.getAttribute("POSITION");
   const base = part.points.length / 3;
   const p = [0, 0, 0];
   for (let i = 0; i < position.getCount(); i++) {
    position.getElement(i, p);
    part.points.push(m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]);
   }
   const index = primitive.getIndices();
   const count = index ? index.getCount() : position.getCount();
   for (let i = 0; i < count; i++) part.indices.push(base + (index ? index.getScalar(i) : i));
   before += count / 3;
  }
 }

 const wood = simplify(weld(parts.wood.points, parts.wood.indices), model.wood);
 const leaf = simplify(weld(parts.leaf.points, parts.leaf.indices), model.leaf);

 // Pie en el origen, centrado en el tronco (o en el conjunto si no lo hay), y a su altura final.
 const all = [...wood.points, ...leaf.points];
 let low = Infinity, high = -Infinity;
 for (let i = 1; i < all.length; i += 3) (low = Math.min(low, all[i])), (high = Math.max(high, all[i]));
 const foot = wood.points.length ? wood.points : leaf.points;
 let cx = 0, cz = 0, n = 0;
 const footTop = low + (high - low) * (wood.points.length ? 0.12 : 1);
 for (let i = 0; i < foot.length; i += 3) if (foot[i + 1] <= footTop) (cx += foot[i]), (cz += foot[i + 2]), (n += 1);
 cx /= n;
 cz /= n;
 const scale = model.height / (high - low);
 const place = (part) => {
  for (let i = 0; i < part.points.length; i += 3) {
   part.points[i] = (part.points[i] - cx) * scale;
   part.points[i + 1] = (part.points[i + 1] - low) * scale;
   part.points[i + 2] = (part.points[i + 2] - cz) * scale;
  }
 };
 place(wood);
 place(leaf);

 // Máscara de color.
 const mask = (part, isLeaf) => {
  const count = part.points.length / 3;
  const colors = new Uint8Array(count * 4);
  if (!count) return colors;
  const group = isLeaf ? islands(part) : new Array(count).fill(0);
  const range = new Map();
  for (let i = 0; i < count; i++) {
   const y = part.points[i * 3 + 1];
   const r = range.get(group[i]) ?? [Infinity, -Infinity];
   range.set(group[i], [Math.min(r[0], y), Math.max(r[1], y)]);
  }
  // Con una sola masa (copa de una pieza) el degradado va de abajo arriba de la
  // copa; con varias, cada una lleva el suyo y un tono propio.
  for (let i = 0; i < count; i++) {
   const [min, max] = range.get(group[i]);
   const t = (part.points[i * 3 + 1] - min) / Math.max(max - min, 1e-4);
   const dice = Math.abs(Math.sin(group[i] * 12.9898 + 4.1) * 43758.5453) % 1;
   colors.set([Math.round(t * 255), isLeaf ? 255 : 0, Math.round(dice * 255), 255], i * 4);
  }
  return colors;
 };
 const points = new Float32Array([...wood.points, ...leaf.points]);
 const colors = new Uint8Array([...mask(wood, false), ...mask(leaf, true)]);
 const offset = wood.points.length / 3;
 const indices = new Uint32Array([...wood.indices, ...Array.from(leaf.indices, (i) => i + offset)]);

 // Medidas que usa el juego (colisión, sombra, de dónde caen las hojas).
 let trunk = 0, crownLow = Infinity, spread = 0;
 for (let i = 0; i < wood.points.length; i += 3) if (wood.points[i + 1] < model.height * 0.14) trunk = Math.max(trunk, Math.hypot(wood.points[i], wood.points[i + 2]));
 for (let i = 0; i < leaf.points.length; i += 3) (crownLow = Math.min(crownLow, leaf.points[i + 1])), (spread = Math.max(spread, Math.hypot(leaf.points[i], leaf.points[i + 2])));

 const document = new Document();
 const buffer = document.createBuffer();
 const primitive = document
  .createPrimitive()
  .setAttribute("POSITION", document.createAccessor().setType("VEC3").setArray(points).setBuffer(buffer))
  .setAttribute("COLOR_0", document.createAccessor().setType("VEC4").setArray(colors).setNormalized(true).setBuffer(buffer))
  .setIndices(document.createAccessor().setType("SCALAR").setArray(indices.length < 65536 * 3 && points.length / 3 < 65536 ? new Uint16Array(indices) : indices).setBuffer(buffer));
 document.createScene(model.name).addChild(document.createNode(model.name).setMesh(document.createMesh(model.name).addPrimitive(primitive)));
 await document.transform(quantize({ quantizePosition: 14 }), meshopt({ encoder: MeshoptEncoder, level: "high" }));
 const out = path.join(TARGET, `${model.name}.glb`);
 await io.write(out, document);
 report.push({ modelo: model.name, "triángulos antes": before, después: indices.length / 3, madera: wood.indices.length / 3, hojas: leaf.indices.length / 3, vértices: points.length / 3, "kB": +(fs.statSync(out).size / 1024).toFixed(1), "alto m": model.height, "radio tronco": +trunk.toFixed(2), "copa desde": +crownLow.toFixed(2), "radio copa": +spread.toFixed(2) });
}
console.table(report);
