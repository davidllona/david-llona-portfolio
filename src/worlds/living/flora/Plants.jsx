import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../../experience/Instances";
import { addSway } from "../../../experience/theme";
import { POND, SCATTER, WATER_LEVEL, groundHeight, surface } from "../layout";
import { createPlantModels } from "./plantModels";

const lambert = (options = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...options });
// Matices por instancia: casi blancos, para que una pradera no sea un solo verde.
const GRASS_TINTS = ["#ffffff", "#f2ffe6", "#fff8dc", "#e6f6ea", "#f6f0d2"];
const ROCK_TINTS = ["#ffffff", "#f1ede6", "#e6e2dc", "#fbf6ea"];
const pick = (list, seed) => list[Math.floor(seed * list.length) % list.length];
// Reparte una lista entre las variantes de un modelo.
const split = (list, variants, by = (item) => item.seed) => variants.map((_, i) => list.filter((item) => Math.floor(by(item) * 997) % variants.length === i));

// Vegetación baja y rocas. Cada modelo es una malla con instancias; las
// plantas se mecen con el viento y se apartan al paso.
export function Plants() {
 const models = useMemo(createPlantModels, []);
 const material = useMemo(
  () => ({
   // Hierba, flores, helechos y juncos: se doblan más cuanto más arriba y se apartan de quien pasa.
   blades: addSway(lambert({ side: THREE.DoubleSide }), 0.24, true),
   flowers: addSway(lambert({ side: THREE.DoubleSide }), 0.2, true),
   reeds: addSway(lambert({ side: THREE.DoubleSide }), 0.12, true),
   bushes: addSway(lambert(), 0.03, "tall"),
   still: lambert(),
  }),
  [],
 );
 useEffect(
  () => () => {
   const dispose = (value) => (value.isBufferGeometry ? value.dispose() : Object.values(value).forEach(dispose));
   dispose(models);
   Object.values(material).forEach((one) => one.dispose());
  },
  [models, material],
 );

 const items = useMemo(() => {
  const plant = (p, scale, lift = 0) => ({ position: [p.x, p.y + lift, p.z], rotation: [0, p.turn, 0], scale });
  const tufts = Object.fromEntries(
   Object.entries(SCATTER.tufts).map(([kind, list]) => [kind, list.map((t) => ({ ...plant(t, [1.0 + t.seed * 0.6, 0.8 + ((t.seed * 7) % 1) * 0.65, 1.0 + t.seed * 0.6]), color: pick(GRASS_TINTS, (t.seed * 13) % 1) }))]),
  );
  const flowers = Object.fromEntries(Object.entries(SCATTER.flowersByKind).map(([kind, list]) => [kind, list.map((f) => plant(f, 0.85 + f.seed * 0.5))]));
  // Rocas: con musgo las que están en zona húmeda o a la sombra.
  const stones = [
   ...SCATTER.rocks.map((r) => ({ ...r, size: r.scale })),
   ...SCATTER.cliffRocks.map((r) => ({ ...r, size: r.scale * 1.35, tall: 1.25 })),
   ...SCATTER.shoreRocks.map((r) => ({ ...r, size: r.scale, sink: 0.25 })),
   // Piedras que bordean el estanque.
   ...Array.from({ length: 13 }, (_, i) => {
    const angle = (i / 13) * Math.PI * 2 + 0.2;
    const radius = POND.r + 0.25 + (i % 3) * 0.3;
    const x = POND.x + Math.cos(angle) * radius, z = POND.z + Math.sin(angle) * radius;
    return { x, y: groundHeight(x, z), z, seed: (i * 0.37) % 1, turn: i * 2, size: 0.42 + (i % 4) * 0.15 };
   }).filter((_, i) => i !== 3 && i !== 4),
  ].map((r) => {
   const kind = surface(r.x, r.z);
   return { ...r, mossy: ["moss", "shade", "bank"].includes(kind) && r.seed > 0.25 };
  });
  const toRock = (r) => ({ position: [r.x, r.y - (r.sink ?? 0.06) * r.size, r.z], rotation: [0, r.turn, 0], scale: [r.size, r.size * (r.tall ?? 1), r.size], color: pick(ROCK_TINTS, r.seed) });
  return {
   tufts,
   flowers,
   clover: SCATTER.clover.map((c) => plant(c, 0.9 + c.seed * 0.7)),
   ferns: split(SCATTER.ferns, models.ferns).map((list) => list.map((f) => plant(f, 0.75 + f.seed * 0.7))),
   bushes: split(SCATTER.bushes, models.bushes).map((list) => list.map((b) => plant(b, b.scale * 1.25))),
   reeds: split(SCATTER.reeds, models.reeds).map((list) => list.map((r) => plant(r, 0.85 + r.seed * 0.5, -0.05))),
   mushrooms: split(SCATTER.mushrooms, models.mushrooms).map((list) => list.map((m) => plant(m, 0.9 + m.seed * 0.9))),
   rocks: split(stones.filter((r) => !r.mossy), models.rocks).map((list) => list.map(toRock)),
   mossy: split(stones.filter((r) => r.mossy), models.mossy).map((list) => list.map(toRock)),
   pebbles: SCATTER.pebbles.map((p) => ({ position: [p.x, p.y + p.scale * 0.2, p.z], rotation: [0, p.turn, 0], scale: p.scale, color: pick(ROCK_TINTS, p.seed) })),
   lilies: split(SCATTER.lilies, models.lilies).map((list) => list.map((l) => ({ position: [l.x, WATER_LEVEL + 0.035, l.z], rotation: [0, l.turn, 0], scale: 0.75 + l.seed * 0.6 }))),
  };
 }, [models]);

 const each = (geometries, lists, mat, props) => geometries.map((geometry, i) => lists[i].length > 0 && <Instances key={i} geometry={geometry} material={mat} items={lists[i]} {...props} />);

 return (
  <>
   {Object.entries(models.tufts).map(([kind, geometry]) => (
    <Instances key={kind} geometry={geometry} material={material.blades} items={items.tufts[kind]} colored receiveShadow />
   ))}
   {Object.entries(models.flowers).map(([kind, geometry]) => items.flowers[kind].length > 0 && <Instances key={kind} geometry={geometry} material={material.flowers} items={items.flowers[kind]} />)}
   <Instances geometry={models.clover} material={material.still} items={items.clover} receiveShadow />
   {each(models.ferns, items.ferns, material.blades)}
   {each(models.bushes, items.bushes, material.bushes, { castShadow: true, receiveShadow: true })}
   {each(models.reeds, items.reeds, material.reeds)}
   {each(models.mushrooms, items.mushrooms, material.still, { castShadow: true })}
   {each(models.rocks, items.rocks, material.still, { colored: true, castShadow: true, receiveShadow: true })}
   {each(models.mossy, items.mossy, material.still, { colored: true, castShadow: true, receiveShadow: true })}
   <Instances geometry={models.pebble} material={material.still} items={items.pebbles} colored />
   {each(models.lilies, items.lilies, material.still)}
  </>
 );
}
