import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../../experience/Instances";
import { WIND, withWind } from "../../../experience/environment/wind";
import { withSeeThrough } from "../../../experience/environment/seeThrough";
import { lambert } from "../../../experience/materials";
import { randomFrom } from "../kit/geometry";
import { POND, SCATTER, WATER_LEVEL, groundHeight, settle, surface } from "../layout";
import { createPlantModels } from "./plantModels";
import { BUSH_LEAF } from "./species";
import { useFlora } from "./useFlora";

// Matices por instancia: casi blancos, para que una pradera no sea un solo verde.
const GRASS_TINTS = ["#ffffff", "#f2ffe6", "#fff8dc", "#e6f6ea", "#f6f0d2"];
const ROCK_TINTS = ["#ffffff", "#eef1f6", "#e2e6ee", "#f6f4ee"];
const pick = (list, seed) => list[Math.floor(seed * list.length) % list.length];
// Reparte una lista entre las variantes de un modelo.
// Una piedra suelta no se pone donde no crece nada por estar construido o ser camino.
const blocksPath = (x, z, size) => size < 0.5 && ["path", "stone", "plaza"].includes(surface(x, z));
const split = (list, variants, by = (item) => item.seed) => variants.map((_, i) => list.filter((item) => Math.floor(by(item) * 997) % variants.length === i));

// Vegetación baja y rocas. Cada modelo es una malla con instancias; las
// plantas se mecen con el viento y se apartan al paso.
export function Plants() {
 const models = useMemo(createPlantModels, []);
 // El arbusto es un modelo (flora/species.js), con tres gamas de verde.
 const paint = useFlora();
 const bushes = useMemo(() => BUSH_LEAF.map((leaf) => paint("mata", { bark: leaf, leaf, vary: 0.2 })), [paint]);
 useEffect(() => () => bushes.forEach((geometry) => geometry.dispose()), [bushes]);
 const material = useMemo(
  () => ({
   // Cada especie cede al viento a su manera (ver WIND.flex) y se aparta al paso.
   blades: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.grass, cap: 0.9, trail: 1 }),
   flowers: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.flower, cap: 0.45, trail: 1 }),
   ferns: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.fern, cap: 0.45, trail: 0.7 }),
   reeds: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.reed, cap: 1.4, trail: 0.5 }),
   bushes: withWind(lambert({ side: THREE.DoubleSide }), { flex: WIND.flex.bush, power: 1.5, cap: 1.1 }),
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
  ];
  // Cada roca es un grupo: la grande y, arrimadas a ella, de dos a cuatro
  // más, cada una menor que la anterior (de 3 a 5 tamaños por grupo).
  const SIZES = [0.58, 0.4, 0.28, 0.2];
  const grouped = stones.flatMap((r) => {
   const random = randomFrom(r.seed * 0.91 + 0.043);
   const start = random() * Math.PI * 2;
   const count = 2 + Math.floor(random() * 3);
   const wet = groundHeight(r.x, r.z) < WATER_LEVEL;
   const group = [{ ...r, lead: true }];
   for (let i = 0; i < count; i++) {
    const size = r.size * SIZES[i] * (0.9 + random() * 0.25);
    const angle = start + i * (Math.PI * 2 / count) * (0.7 + random() * 0.5);
    const reach = r.size * (0.72 + random() * 0.3) + size * 0.55;
    const x = r.x + Math.cos(angle) * reach, z = r.z + Math.sin(angle) * reach;
    const seed = random(), turn = random() * Math.PI * 2;
    // Asentada donde cae; lo que quede colgando de un talud o sobre lo construido no se pone.
    const spot = settle(x, z, 0.45 * size, { relief: 0.5 * size, centre: true, embed: 0 });
    if (!spot || blocksPath(x, z, size)) continue;
    if (size < 0.27 && groundHeight(x, z) < WATER_LEVEL) continue; // tan pequeña, en el agua no llegaría a asomar
    const y = wet || spot.y < WATER_LEVEL ? Math.max(spot.y, WATER_LEVEL - 0.28 * size) : spot.y;
    group.push({ x, y, z, seed, turn, size, sink: r.sink });
   }
   return group;
  }).map((r) => {
   const kind = surface(r.x, r.z);
   // Musgo en todas las de tierra; las que tienen el pie en el agua o en la arena van peladas.
   return { ...r, mossy: !["bed", "wetsand", "sand"].includes(kind) };
  });
  // (Las que tienen el pie en el agua asoman siempre, sea cual sea su forma.)
  const toRock = (r) => ({ position: [r.x, groundHeight(r.x, r.z) < WATER_LEVEL ? Math.max(r.y - (r.sink ?? 0.06) * r.size, WATER_LEVEL + 0.07 - 0.44 * r.size) : r.y - (r.sink ?? 0.06) * r.size, r.z], rotation: [0, r.turn, 0], scale: [r.size * (0.9 + ((r.seed * 29) % 1) * 0.25), r.size * (r.tall ?? 1), r.size], color: pick(ROCK_TINTS, r.seed) });
  return {
   tufts,
   flowers,
   clover: SCATTER.clover.map((c) => plant(c, 0.9 + c.seed * 0.7)),
   ferns: split(SCATTER.ferns, models.ferns).map((list) => list.map((f) => plant(f, 0.75 + f.seed * 0.7))),
   // Matas: unas más anchas y otras más altas, cada una con su matiz.
   bushes: split(SCATTER.bushes, BUSH_LEAF).map((list) => list.map((b) => ({ ...plant(b, [b.scale * (0.7 + ((b.seed * 53) % 1) * 0.3), b.scale * (0.75 + ((b.seed * 31) % 1) * 0.4), b.scale * (0.7 + ((b.seed * 17) % 1) * 0.3)], -0.04), color: pick(GRASS_TINTS, (b.seed * 13) % 1) }))),
   shrubs: models.shrubs.map((_, tone) => SCATTER.shrubs.filter((s) => s.tone === tone).map((s) => ({ ...plant(s, [s.scale * (0.9 + ((s.seed * 53) % 1) * 0.25), s.scale * (0.85 + ((s.seed * 31) % 1) * 0.3), s.scale * (0.9 + ((s.seed * 17) % 1) * 0.25)], -0.03), color: pick(GRASS_TINTS, (s.seed * 13) % 1) }))),
   reeds: split(SCATTER.reeds, models.reeds).map((list) => list.map((r) => plant(r, 0.85 + r.seed * 0.5, -0.05))),
   mushrooms: split(SCATTER.mushrooms, models.mushrooms).map((list) => list.map((m) => plant(m, 0.9 + m.seed * 0.9))),
   rocks: split(grouped.filter((r) => !r.mossy), models.rocks).map((list) => list.map(toRock)),
   mossy: split(grouped.filter((r) => r.mossy), models.mossy).map((list) => list.map(toRock)),
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
   {each("arbusto", bushes, items.bushes, material.bushes, { colored: true, castShadow: true, receiveShadow: true })}
   {each("arbusto", models.shrubs, items.shrubs, material.bushes, { colored: true, castShadow: true, receiveShadow: true })}
   {each("junco", models.reeds, items.reeds, material.reeds, { rests: "water" })}
   {each("seta", models.mushrooms, items.mushrooms, material.still, { castShadow: true })}
   {/* Las rocas asoman del suelo: la mitad va enterrada a propósito (`sinks`). */}
   {each("roca", models.rocks, items.rocks, material.rocks, { colored: true, castShadow: true, receiveShadow: true, sinks: 0.5 })}
   {each("roca con musgo", models.mossy, items.mossy, material.rocks, { colored: true, castShadow: true, receiveShadow: true, sinks: 0.5 })}
   <Instances name="guijarro" rests={0} sinks={0.4} geometry={models.pebble} material={material.still} items={items.pebbles} colored />
   {each("nenúfar", models.lilies, items.lilies, material.still, { rests: "water" })}
  </>
 );
}
