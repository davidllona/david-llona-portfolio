import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../../experience/Instances";
import { WIND, withWind } from "../../../experience/environment/wind";
import { withSeeThrough } from "../../../experience/environment/seeThrough";
import { lambert } from "../../../experience/materials";
import { POND, SCATTER, WATER_LEVEL, settle, surface } from "../layout";
import { createPlantModels } from "./plantModels";

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
   // Cada especie cede al viento a su manera (ver WIND.flex) y se aparta al paso.
   blades: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.grass, cap: 0.9, trail: 1 }),
   flowers: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.flower, cap: 0.45, trail: 1 }),
   ferns: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.fern, cap: 0.45, trail: 0.7 }),
   reeds: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.reed, cap: 1.4, trail: 0.5 }),
   bushes: withWind(lambert(), { flex: WIND.flex.bush, power: 1.5, cap: 1.1 }),
   still: lambert(),
   rocks: withSeeThrough(lambert()), // la roca que tape al astronauta se vuelve translúcida
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
    const size = 0.42 + (i % 4) * 0.15;
    const spot = settle(x, z, 0.5 * size, { relief: 0.4 * size, slide: 0.75, centre: true, embed: 0 });
    // (La que cae dentro del agua asoma, como las rocas de la orilla.)
    return spot && { ...spot, y: Math.max(spot.y, WATER_LEVEL - 0.28 * size), seed: (i * 0.37) % 1, turn: i * 2, size };
   }).filter((stone, i) => stone && i !== 3 && i !== 4),
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

 // `name` y `rests`: para la comprobación de objetos mal apoyados (tests/e2e/terrain.mjs).
 const each = (name, geometries, lists, mat, props) => geometries.map((geometry, i) => lists[i].length > 0 && <Instances key={i} name={name} rests={0} geometry={geometry} material={mat} items={lists[i]} {...props} />);

 return (
  <>
   {/* Del césped se encarga Grass.jsx; aquí quedan solo las espigas, como acento en las praderas. */}
   <Instances name="espiga" rests={0} geometry={models.tufts.seed} material={material.blades} items={items.tufts.seed} colored receiveShadow />
   {Object.entries(models.flowers).map(([kind, geometry]) => items.flowers[kind].length > 0 && <Instances key={kind} name="flor" rests={0} geometry={geometry} material={material.flowers} items={items.flowers[kind]} />)}
   <Instances name="trébol" rests={0} geometry={models.clover} material={material.still} items={items.clover} receiveShadow />
   {each("helecho", models.ferns, items.ferns, material.ferns)}
   {each("arbusto", models.bushes, items.bushes, material.bushes, { castShadow: true, receiveShadow: true })}
   {each("junco", models.reeds, items.reeds, material.reeds, { rests: "water" })}
   {each("seta", models.mushrooms, items.mushrooms, material.still, { castShadow: true })}
   {/* Las rocas asoman del suelo: la mitad va enterrada a propósito (`sinks`). */}
   {each("roca", models.rocks, items.rocks, material.rocks, { colored: true, castShadow: true, receiveShadow: true, sinks: 0.5 })}
   {each("roca con musgo", models.mossy, items.mossy, material.rocks, { colored: true, castShadow: true, receiveShadow: true, sinks: 0.5 })}
   <Instances name="guijarro" rests={0} geometry={models.pebble} material={material.still} items={items.pebbles} colored />
   {each("nenúfar", models.lilies, items.lilies, material.still, { rests: "water" })}
  </>
 );
}
