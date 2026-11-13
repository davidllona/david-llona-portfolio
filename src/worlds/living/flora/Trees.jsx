import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../../experience/Instances";
import { withSeeThrough } from "../../../experience/environment/seeThrough";
import { WIND, withWind } from "../../../experience/environment/wind";
import { lambert } from "../../../experience/materials";
import { ANCIENT_TREES, SCATTER, groundHeight } from "../layout";
import { SPECIES } from "./species";
import { ancient } from "./treeModels";
import { useFlora } from "./useFlora";

// Matices con los que se tiñe cada árbol: casi blancos, para variar sin ensuciar.
const TINTS = ["#ffffff", "#f1fbe9", "#fff6e2", "#e9f4f0", "#fbf2ee", "#f4f1dc", "#e6f3e0"];
const part = (seed, by) => (seed * by) % 1;

// Los árboles del planeta. Cuatro modelos (flora/species.js); cada combinación
// de modelo y gama de hoja es una sola malla con instancias, y cada copia
// cambia de tamaño, proporción, giro y matiz. Se cimbrean desde el pie con el
// viento (más cuanto más arriba).
export function Trees() {
 const paint = useFlora();
 const old = useMemo(() => ancient(0.42), []);
 // El tronco apenas cede; la copa, arriba, se mueve más. La copa que tape al
 // astronauta se vuelve translúcida a su alrededor.
 const material = useMemo(() => withSeeThrough(withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.tree, power: 2, cap: 6 })), []);

 const groups = useMemo(() => {
  const byLook = new Map();
  for (const tree of SCATTER.trees) {
   const species = SPECIES[tree.kind] ?? SPECIES.oak;
   const shade = Math.floor(part(tree.seed, 997) * species.leaf.length);
   const key = `${tree.model}/${tree.kind}/${shade}`;
   if (!byLook.has(key)) byLook.set(key, { geometry: paint(tree.model, { bark: species.bark, leaf: species.leaf[shade] }), items: [] });
   const s = tree.scale;
   byLook.get(key).items.push({
    position: [tree.x, tree.y - 0.08, tree.z],
    rotation: [0, tree.turn, 0],
    // Algo más altos o más anchos unos que otros.
    scale: [s * (0.9 + part(tree.seed, 53) * 0.22), s * (0.88 + part(tree.seed, 31) * 0.28), s * (0.9 + part(tree.seed, 17) * 0.22)],
    color: TINTS[Math.floor(part(tree.seed, 613) * TINTS.length)],
   });
  }
  return [...byLook.values()];
 }, [paint]);
 useEffect(
  () => () => {
   groups.forEach(({ geometry }) => geometry.dispose());
  },
  [groups],
 );
 useEffect(
  () => () => {
   old.dispose();
   material.dispose();
  },
  [old, material],
 );

 const elders = useMemo(() => ANCIENT_TREES.map((tree, i) => ({ position: [tree.x, groundHeight(tree.x, tree.z) - 0.15, tree.z], rotation: [0, i * 2.1 + 0.4, 0], scale: tree.scale * 0.82, color: "#ffffff" })), []);

 return (
  <>
   {groups.map(({ geometry, items }, i) => (
    <Instances key={i} name="árbol" rests={0} geometry={geometry} material={material} items={items} colored castShadow receiveShadow />
   ))}
   <Instances name="árbol viejo" rests={0} geometry={old} material={material} items={elders} colored castShadow receiveShadow />
  </>
 );
}
