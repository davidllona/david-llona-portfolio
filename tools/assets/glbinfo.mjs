import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
for (const node of root.listNodes()) {
 const mesh = node.getMesh();
 if (!mesh) { console.log("nodo", node.getName(), node.getTranslation().map((v) => +v.toFixed(2))); continue; }
 let tris = 0; const min = [9e9, 9e9, 9e9], max = [-9e9, -9e9, -9e9]; const mats = new Set();
 for (const prim of mesh.listPrimitives()) {
  tris += (prim.getIndices()?.getCount() ?? prim.getAttribute("POSITION").getCount()) / 3;
  const p = prim.getAttribute("POSITION"); const a = p.getMin([]), b = p.getMax([]);
  for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], a[k]); max[k] = Math.max(max[k], b[k]); }
  const m = prim.getMaterial(); mats.add(m ? `${m.getName()}:${m.getBaseColorFactor().slice(0, 3).map((v) => v.toFixed(2))}${m.getBaseColorTexture() ? ":tex" : ""}` : "-");
 }
 console.log("malla", node.getName(), Math.round(tris), "tri", "T", node.getTranslation().map((v) => +v.toFixed(2)), "S", node.getScale().map((v) => +v.toFixed(2)), "min", min.map((v) => +v.toFixed(2)), "max", max.map((v) => +v.toFixed(2)), [...mats].join(" | "));
}
console.log("texturas", root.listTextures().map((t) => `${t.getName()} ${t.getSize()}`), "anim", root.listAnimations().length);
