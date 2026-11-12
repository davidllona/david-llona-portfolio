import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../../experience/Instances";
import { WIND, withWind } from "../../../experience/environment/wind";
import { lambert } from "../../../experience/materials";
import { ANCIENT_TREES, SCATTER, groundHeight } from "../layout";
import { ancient, createTreeModels } from "./treeModels";

// Matices con los que se tiñe cada árbol: casi blancos, para variar sin ensuciar.
const TINTS = ["#ffffff", "#f1fbe9", "#fff6e2", "#e9f4f0", "#fbf2ee"];

// Los árboles del planeta: cada variante de cada especie es una sola malla con
// instancias. Se cimbrean desde el pie con el viento (más cuanto más arriba).
export function Trees() {
 const models = useMemo(createTreeModels, []);
 const old = useMemo(() => ancient(0.42), []);
 // El tronco apenas cede; la copa, arriba, se mueve más.
 const material = useMemo(() => withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.tree, power: 2, cap: 6 }), []);
 useEffect(
  () => () => {
   Object.values(models).flat().forEach((geometry) => geometry.dispose());
   old.dispose();
   material.dispose();
  },
  [models, old, material],
 );

 const groups = useMemo(() => {
  const byModel = new Map();
  for (const tree of SCATTER.trees) {
   const variants = models[tree.kind] ?? models.oak;
   const geometry = variants[Math.floor(tree.seed * 997) % variants.length];
   if (!byModel.has(geometry)) byModel.set(geometry, []);
   const s = tree.scale;
   byModel.get(geometry).push({
    position: [tree.x, tree.y - 0.08, tree.z],
    rotation: [0, tree.turn, 0],
    // Algo más altos o más anchos unos que otros.
    scale: [s * (0.94 + ((tree.seed * 53) % 1) * 0.14), s * (0.9 + ((tree.seed * 31) % 1) * 0.24), s * (0.94 + ((tree.seed * 17) % 1) * 0.14)],
    color: TINTS[Math.floor(tree.seed * 613) % TINTS.length],
   });
  }
  return [...byModel.entries()];
 }, [models]);

 const elders = useMemo(() => ANCIENT_TREES.map((tree, i) => ({ position: [tree.x, groundHeight(tree.x, tree.z) - 0.15, tree.z], rotation: [0, i * 2.1 + 0.4, 0], scale: tree.scale * 0.82, color: "#ffffff" })), []);

 return (
  <>
   {groups.map(([geometry, items], i) => (
    <Instances key={i} geometry={geometry} material={material} items={items} colored castShadow receiveShadow />
   ))}
   <Instances geometry={old} material={material} items={elders} colored castShadow receiveShadow />
  </>
 );
}
