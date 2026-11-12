import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { dot, fract, positionView, screenCoordinate, screenUV, smoothstep, step, uniform, vec2 } from "three/tsl";
import * as THREE from "three";
import { Instances } from "../../../experience/Instances";
import { WIND, withWind } from "../../../experience/environment/wind";
import { lambert } from "../../../experience/materials";
import { player } from "../../../experience/state";
import { ANCIENT_TREES, SCATTER, groundHeight } from "../layout";
import { ancient, createTreeModels } from "./treeModels";

// Matices con los que se tiñe cada árbol: casi blancos, para variar sin ensuciar.
const TINTS = ["#ffffff", "#f1fbe9", "#fff6e2", "#e9f4f0", "#fbf2ee"];

// Los árboles del planeta: cada variante de cada especie es una sola malla con
// instancias. Se cimbrean desde el pie con el viento (más cuanto más arriba).
export function Trees() {
 const models = useMemo(createTreeModels, []);
 const old = useMemo(() => ancient(0.42), []);
 // Dónde está el astronauta en pantalla (0–1), a qué profundidad y el aspecto de la ventana.
 const view = useMemo(() => ({ screen: uniform(new THREE.Vector2(0.5, 0.5)), depth: uniform(-20), aspect: uniform(1.6) }), []);
 const material = useMemo(() => {
  // El tronco apenas cede; la copa, arriba, se mueve más.
  const result = withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.tree, power: 2, cap: 6 });
  // Hueco de visión: lo que queda entre la cámara y el astronauta se deshace
  // en un tramado alrededor de él, para no perderlo nunca tras una copa.
  // (La idea viene del follaje de folio-2025, MIT.)
  const fromPlayer = screenUV.sub(view.screen).mul(vec2(view.aspect, 1)).length();
  const inFront = step(view.depth.add(1.2), positionView.z);
  const hole = smoothstep(0.17, 0.06, fromPlayer).mul(inFront);
  const grain = fract(fract(dot(screenCoordinate.xy, vec2(0.06711056, 0.00583715))).mul(52.9829189));
  result.opacityNode = step(hole.mul(1.1), grain.add(0.02));
  result.alphaTest = 0.5;
  return result;
 }, [view]);
 const point = useMemo(() => new THREE.Vector3(), []);
 useFrame(({ camera, size }) => {
  point.copy(player.position).setY(player.position.y + 1).applyMatrix4(camera.matrixWorldInverse);
  view.depth.value = player.hidden ? -1e4 : point.z;
  point.applyMatrix4(camera.projectionMatrix);
  view.screen.value.set(point.x * 0.5 + 0.5, 0.5 - point.y * 0.5);
  view.aspect.value = size.width / size.height;
 });
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
