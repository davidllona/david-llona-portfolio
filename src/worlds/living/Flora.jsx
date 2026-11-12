import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../experience/Instances";
import { createGlowTexture } from "../../experience/textures";
import { addSway, registerGlow } from "../../experience/theme";
import { ANCIENT_TREES, POND, SCATTER, WATER_LEVEL, groundHeight } from "./layout";

// Toda la vegetación del planeta. Cada tipo de pieza (tronco, copa, brizna…)
// es una sola malla con instancias, así que miles de plantas cuestan unas
// pocas llamadas de dibujo. El viento y las ráfagas van en el sombreador.

const GREENS = ["#5fae4e", "#74c05a", "#8fce63", "#4c9a52", "#69b853"];
const AUTUMN = ["#e9c65a", "#f0a850", "#dfd060"];
const PINES = ["#2f7d57", "#3a8d60", "#276b4d"];
const BLOSSOM = ["#f6a8c4", "#f9bfd5", "#f291b6"];
const PETALS = ["#ff7fa8", "#ffd45a", "#ffffff", "#b58cff", "#ff8a5c"];
const CAPS = ["#e2583e", "#f0a24b", "#f3e3c8", "#c96bd0"];

const pick = (list, seed) => list[Math.floor(seed * list.length) % list.length];
const lambert = (options = {}) => new THREE.MeshLambertMaterial({ flatShading: true, ...options });

// Árboles: troncos, copas redondas (y de cerezo) y pisos de pino.
function Trees() {
 const geometry = useMemo(
  () => ({
   trunk: new THREE.CylinderGeometry(0.16, 0.3, 1, 6).translate(0, 0.5, 0),
   blob: new THREE.IcosahedronGeometry(1, 1),
   tier: new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0),
   vine: new THREE.CylinderGeometry(0.035, 0.035, 1, 4).translate(0, -0.5, 0),
  }),
  [],
 );
 const material = useMemo(
  () => ({
   trunk: lambert(),
   blob: addSway(lambert(), 0.1),
   tier: addSway(lambert(), 0.06),
   vine: addSway(lambert({ color: "#4f9a4c" }), 0.12),
  }),
  [],
 );

 const items = useMemo(() => {
  const trunks = [];
  const blobs = [];
  const tiers = [];
  const vines = [];
  const rotate = (dx, dz, turn) => [dx * Math.cos(turn) - dz * Math.sin(turn), dx * Math.sin(turn) + dz * Math.cos(turn)];

  for (const tree of SCATTER.trees) {
   const { x, y, z, scale: s, seed, turn } = tree;
   const lean = [(seed - 0.5) * 0.16, turn, ((seed * 31) % 1 - 0.5) * 0.16];
   if (tree.kind === "pine") {
    const height = 1.3 * s;
    trunks.push({ position: [x, y - 0.1, z], rotation: lean, scale: [s * 0.9, height + 0.2, s * 0.9], color: "#6b4a34" });
    const tone = pick(PINES, seed);
    // Tres pisos, cada uno más estrecho y algo más claro.
    [[1.75, 1.9, 0], [1.35, 1.7, 1.25], [0.95, 1.5, 2.4]].forEach(([radius, tall, lift], i) => {
     tiers.push({
      position: [x, y + height + lift * s, z],
      rotation: [0, turn + i, 0],
      scale: [radius * s, tall * s, radius * s],
      color: new THREE.Color(tone).offsetHSL(0, 0, i * 0.035),
     });
    });
    continue;
   }
   const cherry = tree.kind === "cherry";
   const height = (cherry ? 1.9 : 2.3) * s;
   trunks.push({ position: [x, y - 0.1, z], rotation: lean, scale: [s, height + 0.1, s], color: cherry ? "#7a4b45" : "#8a5c3c" });
   const tone = new THREE.Color(cherry ? pick(BLOSSOM, seed) : (seed * 13) % 1 > 0.86 ? pick(AUTUMN, seed) : pick(GREENS, seed));
   // Una copa grande y tres menores alrededor, con tonos algo distintos.
   [[0, 0.75, 0, 1.4], [0.95, 0.15, 0.3, 0.95], [-0.8, 0.3, -0.5, 0.88], [0.1, 0.05, 0.95, 0.8]].forEach(([dx, dy, dz, size], i) => {
    const [rx, rz] = rotate(dx, dz, turn);
    blobs.push({
     position: [x + rx * s, y + height + dy * s, z + rz * s],
     rotation: [seed * 3 + i, turn + i, i * 1.3],
     scale: [size * s, size * s * 0.86, size * s],
     color: tone.clone().offsetHSL(0, 0, (i - 1.2) * 0.035),
    });
   });
  }

  // Árboles viejos: tronco grueso e inclinado, ramas, copa enorme y lianas.
  for (const tree of ANCIENT_TREES) {
   const { x, z, scale: s } = tree;
   const y = groundHeight(x, z);
   trunks.push({ position: [x, y - 0.2, z], rotation: [0.06, 0.5, -0.1], scale: [5.4 * s, 6.2 * s, 5.4 * s], color: "#7b5136" });
   // Raíces que asoman.
   for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.4;
    trunks.push({ position: [x + Math.cos(angle) * 1.5 * s, y - 0.25, z + Math.sin(angle) * 1.5 * s], rotation: [Math.sin(angle) * 1.05, 0, -Math.cos(angle) * 1.05], scale: [2.2 * s, 2 * s, 2.2 * s], color: "#6f4830" });
   }
   const top = y + 6 * s;
   [[2.2, 0.9, -0.6], [-2.4, 0.6, 0.8], [0.4, 1.3, 2.2]].forEach(([dx, dy, dz]) => {
    trunks.push({ position: [x, top - 1.2 * s, z], rotation: [dz * 0.32, 0, -dx * 0.32], scale: [2.1 * s, 3.4 * s, 2.1 * s], color: "#7b5136" });
    blobs.push({ position: [x + dx * 1.35 * s, top + (dy + 1) * s, z + dz * 1.35 * s], rotation: [dx, dy, dz], scale: [2.5 * s, 2.1 * s, 2.5 * s], color: pick(GREENS, Math.abs(dx) / 3) });
   });
   [[0, 2.6, 0, 3.3], [1.9, 1.5, 1.6, 2.3], [-1.8, 1.9, -1.4, 2.4], [-0.6, 1.1, 2.6, 1.9], [2.6, 0.9, -1.9, 1.8]].forEach(([dx, dy, dz, size], i) => {
    blobs.push({ position: [x + dx * s, top + dy * s, z + dz * s], rotation: [i, i * 2, i * 0.7], scale: [size * s, size * s * 0.8, size * s], color: new THREE.Color(GREENS[i % GREENS.length]).offsetHSL(0, 0, -0.02) });
   });
   // Lianas colgando de la copa.
   for (let i = 0; i < 9; i++) {
    const angle = i * 2.4;
    const radius = (1.6 + (i % 3) * 0.9) * s;
    vines.push({ position: [x + Math.cos(angle) * radius, top + 0.8 * s, z + Math.sin(angle) * radius], scale: [1, (1.6 + (i % 4) * 0.7) * s, 1] });
   }
  }
  return { trunks, blobs, tiers, vines };
 }, []);

 return (
  <>
   <Instances geometry={geometry.trunk} material={material.trunk} items={items.trunks} colored castShadow />
   <Instances geometry={geometry.blob} material={material.blob} items={items.blobs} colored castShadow />
   <Instances geometry={geometry.tier} material={material.tier} items={items.tiers} colored castShadow />
   <Instances geometry={geometry.vine} material={material.vine} items={items.vines} />
  </>
 );
}

// Sotobosque: arbustos, helechos, setas, flores y hierba.
function Undergrowth() {
 const geometry = useMemo(
  () => ({
   bush: new THREE.IcosahedronGeometry(1, 1),
   // Helecho: una roseta abierta, como un cuenco de hojas.
   fern: new THREE.ConeGeometry(0.75, 0.5, 7, 1, true).rotateX(Math.PI).translate(0, 0.25, 0),
   stem: new THREE.CylinderGeometry(0.05, 0.07, 1, 5).translate(0, 0.5, 0),
   cap: new THREE.SphereGeometry(1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2),
   stalk: new THREE.CylinderGeometry(0.018, 0.018, 1, 3).translate(0, 0.5, 0),
   // La cabeza de la flor va en lo alto de su tallo (y = 1) y comparte su
   // escala vertical: así el viento la mueve exactamente lo que a la punta.
   head: new THREE.OctahedronGeometry(1, 0).scale(1, 0.3, 1).translate(0, 1, 0),
   blade: new THREE.ConeGeometry(0.075, 0.6, 3).translate(0, 0.3, 0),
  }),
  [],
 );
 const material = useMemo(
  () => ({
   bush: addSway(lambert(), 0.05),
   fern: addSway(lambert({ side: THREE.DoubleSide }), 0.12, true),
   stem: lambert({ color: "#f1e6cf" }),
   cap: lambert(),
   stalk: addSway(lambert({ color: "#4f9a4c" }), 0.22, true),
   head: addSway(lambert(), 0.22, true),
   blade: addSway(lambert(), 0.24, true),
  }),
  [],
 );

 const items = useMemo(() => {
  const at = (p, lift = 0) => [p.x, p.y + lift, p.z];
  const stalkHeight = (p) => 0.28 + p.seed * 0.22;
  return {
   bushes: SCATTER.bushes.map((b) => ({ position: at(b, b.scale * 0.4), rotation: [b.seed * 2, b.turn, 0], scale: [b.scale, b.scale * 0.72, b.scale], color: pick(GREENS, b.seed) })),
   ferns: SCATTER.ferns.map((f) => ({ position: at(f), rotation: [0, f.turn, 0], scale: 0.7 + f.seed * 0.7, color: f.seed > 0.5 ? "#3f9a5c" : "#4eab57" })),
   stems: SCATTER.mushrooms.map((m) => ({ position: at(m), scale: [1.6, 0.22 + m.seed * 0.2, 1.6] })),
   caps: SCATTER.mushrooms.map((m) => ({ position: at(m, 0.2 + m.seed * 0.2), rotation: [0, m.turn, 0], scale: [0.2 + m.seed * 0.13, 0.15 + m.seed * 0.08, 0.2 + m.seed * 0.13], color: pick(CAPS, m.seed) })),
   stalks: SCATTER.flowers.map((f) => ({ position: at(f), scale: [1, stalkHeight(f), 1] })),
   heads: SCATTER.flowers.map((f) => {
    const size = 0.08 + f.seed * 0.05;
    return { position: at(f), rotation: [0, f.turn, 0], scale: [size, stalkHeight(f), size], color: pick(PETALS, f.tint) };
   }),
   blades: SCATTER.grass.map((g) => ({ position: at(g), rotation: [0, g.turn, 0], scale: [1, 0.55 + g.seed * 0.9, 1], color: pick(GREENS, g.seed * 0.999) })),
  };
 }, []);

 return (
  <>
   <Instances geometry={geometry.bush} material={material.bush} items={items.bushes} colored castShadow receiveShadow />
   <Instances geometry={geometry.fern} material={material.fern} items={items.ferns} colored />
   <Instances geometry={geometry.stem} material={material.stem} items={items.stems} />
   <Instances geometry={geometry.cap} material={material.cap} items={items.caps} colored castShadow />
   <Instances geometry={geometry.stalk} material={material.stalk} items={items.stalks} />
   <Instances geometry={geometry.head} material={material.head} items={items.heads} colored />
   <Instances geometry={geometry.blade} material={material.blade} items={items.blades} colored />
  </>
 );
}

// Rocas sueltas, pedruscos al pie del acantilado y nenúfares en el estanque.
function Stones() {
 const rock = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
 const lily = useMemo(() => new THREE.CylinderGeometry(0.42, 0.42, 0.04, 9, 1, false, 0.5, Math.PI * 1.75), []);
 const bud = useMemo(() => new THREE.OctahedronGeometry(0.13, 0), []);
 const material = useMemo(() => ({ rock: lambert(), lily: lambert({ color: "#4fae63" }), bud: lambert({ color: "#ffb6d0" }) }), []);

 const items = useMemo(() => {
  const tone = (seed) => (seed > 0.6 ? "#b3ada3" : seed > 0.3 ? "#9d978f" : "#8a847d");
  return {
   rocks: [
    ...SCATTER.rocks.map((r) => ({ position: [r.x, r.y + r.scale * 0.3, r.z], rotation: [r.seed * 2, r.turn, r.seed], scale: [r.scale, r.scale * 0.7, r.scale * 0.9], color: tone(r.seed) })),
    ...SCATTER.cliffRocks.map((r) => ({ position: [r.x, r.y + r.scale * 0.5, r.z], rotation: [r.seed * 3, r.turn, r.seed * 2], scale: [r.scale * 1.3, r.scale * 1.5, r.scale * 1.2], color: tone(r.seed) })),
    // Piedras que encauzan la caída de la cascada y bordean el estanque.
    ...Array.from({ length: 11 }, (_, i) => {
     const angle = (i / 11) * Math.PI * 2;
     const radius = POND.r + 0.3 + (i % 3) * 0.3;
     const x = POND.x + Math.cos(angle) * radius;
     const z = POND.z + Math.sin(angle) * radius;
     return { position: [x, groundHeight(x, z) + 0.15, z], rotation: [i, i * 2, i], scale: 0.45 + (i % 4) * 0.16, color: tone((i * 0.37) % 1) };
    }).filter((_, i) => i !== 0 && i !== 10),
   ],
   lilies: SCATTER.lilies.map((l) => ({ position: [l.x, WATER_LEVEL + 0.03, l.z], rotation: [0, l.turn, 0], scale: 0.7 + l.seed * 0.6 })),
   buds: SCATTER.lilies.filter((l) => l.seed > 0.45).map((l) => ({ position: [l.x, WATER_LEVEL + 0.13, l.z], rotation: [0, l.turn, 0], scale: 1 })),
  };
 }, []);

 return (
  <>
   <Instances geometry={rock} material={material.rock} items={items.rocks} colored castShadow receiveShadow />
   <Instances geometry={lily} material={material.lily} items={items.lilies} />
   <Instances geometry={bud} material={material.bud} items={items.buds} />
  </>
 );
}

// Farolas de madera a lo largo de los caminos; de noche dan un charco de luz.
function Lanterns() {
 const glow = useMemo(() => createGlowTexture(), []);
 const geometry = useMemo(
  () => ({
   post: new THREE.BoxGeometry(0.14, 1.9, 0.14).translate(0, 0.95, 0),
   head: new THREE.BoxGeometry(0.36, 0.42, 0.36),
   roof: new THREE.ConeGeometry(0.34, 0.24, 4).rotateY(Math.PI / 4),
   pool: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  }),
  [],
 );
 const material = useMemo(
  () => ({
   post: lambert({ color: "#6b4a34" }),
   head: new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ffb44a" }),
   pool: new THREE.MeshBasicMaterial({ map: glow, color: "#ffc070", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }),
  }),
  [glow],
 );
 useEffect(() => {
  const stop = [registerGlow(material.head, 0.35, 3), registerGlow(material.pool, 0, 0.55, "opacity")];
  return () => {
   stop.forEach((off) => off());
   glow.dispose();
  };
 }, [material, glow]);

 const at = (lift, scale) => SCATTER.lanterns.map((l) => ({ position: [l.x, l.y + lift, l.z], scale }));
 const posts = useMemo(() => at(0, 1), []);
 const heads = useMemo(() => at(2.05, 1), []);
 const roofs = useMemo(() => at(2.38, 1), []);
 const pools = useMemo(() => at(0.07, 10), []);
 return (
  <>
   <Instances geometry={geometry.post} material={material.post} items={posts} castShadow />
   <Instances geometry={geometry.head} material={material.head} items={heads} />
   <Instances geometry={geometry.roof} material={material.post} items={roofs} />
   <Instances geometry={geometry.pool} material={material.pool} items={pools} />
  </>
 );
}

export function Flora() {
 return (
  <>
   <Trees />
   <Undergrowth />
   <Stones />
   <Lanterns />
  </>
 );
}
