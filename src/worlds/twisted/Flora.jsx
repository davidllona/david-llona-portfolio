import { useEffect, useMemo } from "react";
import { Instances } from "../../experience/Instances";
import { lambert } from "../../experience/materials";
import { SHARDS, TREES, TUFTS, height } from "./layout";
import { solid } from "./materials";
import { createCurlyTree, createDryTuft, createShard } from "./models";

// Lo que crece (es un decir) en The Twisted Moon: árboles sin hojas de ramas
// rizadas, matojos secos y lascas de piedra. Todo con instancias: una llamada
// de dibujo por forma.
export function Flora() {
 const models = useMemo(() => ({ trees: [0, 1, 2].map(createCurlyTree), tuft: createDryTuft(), shard: createShard() }), []);
 const material = useMemo(() => ({ wood: solid(), stone: solid(), tuft: lambert() }), []);
 useEffect(
  () => () => {
   [...models.trees, models.tuft, models.shard].forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  },
  [models, material],
 );
 const items = useMemo(() => {
  const seat = (list, sink = 0) => list.map((one) => ({ position: [one.x, height(one.x, one.z) - sink * (one.scale ?? 1), one.z], rotation: [0, one.turn ?? 0, 0], scale: one.scale ?? 1 }));
  return {
   trees: [0, 1, 2].map((kind) => seat(TREES.filter((tree) => tree.kind === kind), 0.05)),
   tufts: seat(TUFTS, 0.02),
   shards: seat(SHARDS, 0.08),
  };
 }, []);
 return (
  <>
   {models.trees.map((model, kind) => items.trees[kind].length > 0 && <Instances key={kind} name={`árbol rizado ${kind + 1}`} rests={0} geometry={model} material={material.wood} items={items.trees[kind]} castShadow receiveShadow />)}
   <Instances name="lasca de piedra" rests={0} geometry={models.shard} material={material.stone} items={items.shards} castShadow receiveShadow />
   <Instances name="matojo seco" rests={0} geometry={models.tuft} material={material.tuft} items={items.tufts} receiveShadow />
  </>
 );
}
