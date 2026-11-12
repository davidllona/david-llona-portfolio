import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { attribute, cos, fract, length, mix, positionLocal, sin, smoothstep, step, vec2, vec3 } from "three/tsl";
import { windDirection, windGust, windStrength } from "../../../experience/environment/wind";
import { unlit } from "../../../experience/materials";
import { uniforms } from "../../../experience/theme";
import { ANCIENT_TREES, SCATTER, height } from "../layout";

// Hojas y pétalos que caen de las copas, y motas de polen que flotan de día
// entre los árboles. Todo se mueve en la GPU: cada copia guarda de qué árbol
// sale y unas semillas, y el sombreador deduce su caída, su deriva con el
// viento y su giro a partir del reloj. No se actualiza nada por fotograma.
//
// En calma solo cae una parte de las hojas. Cuando pasa una ráfaga («El bosque
// despierta»), el frente va soltando las de cada árbol al alcanzarlo y se las
// lleva por delante; al amainar vuelven a caer las de siempre.

function seeded(seed) {
 let state = seed;
 return () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
 };
}

// Altura de copa (por metro de escala), colores de hoja y cuántas le tocan.
const CROWNS = {
 oak: { top: 3.5, colors: ["#8fcf62", "#a3d86a", "#d6c35a"], share: 1 },
 maple: { top: 3.5, colors: ["#f6b24a", "#f08a43", "#f8d25c"], share: 1.6 },
 poplar: { top: 4.6, colors: ["#a8dc70", "#b7e27a", "#e2d870"], share: 1 },
 birch: { top: 3.7, colors: ["#d6e676", "#e2ec84", "#f0dc6a"], share: 1.2 },
 cherry: { top: 3.1, colors: ["#ffc4dc", "#ffd9e8", "#ff9fc4"], share: 2.6, petal: true },
 willow: { top: 3.3, colors: ["#b9dc7a", "#9fcf68"], share: 1 },
 old: { top: 6.2, colors: ["#8fcf62", "#b9dc7a", "#d6c35a"], share: 3 },
};

// Los árboles que sueltan hoja (los pinos no), con lo que hace falta de cada uno.
function leafyTrees() {
 const list = [];
 for (const tree of SCATTER.trees) {
  const crown = CROWNS[tree.kind];
  if (crown) list.push({ x: tree.x, z: tree.z, top: crown.top * tree.scale, spread: 1.5 * tree.scale, crown });
 }
 for (const tree of ANCIENT_TREES) list.push({ x: tree.x, z: tree.z, top: CROWNS.old.top * tree.scale, spread: 3.2 * tree.scale, crown: CROWNS.old });
 return list;
}

const LEAVES = 900;
const CALM = 0.4; // parte de las hojas que cae sin viento

// Hoja: un rombo alargado, tumbado.
function createLeafGeometry() {
 const shape = new THREE.Shape();
 shape.moveTo(-0.5, 0);
 shape.quadraticCurveTo(-0.1, 0.34, 0.5, 0);
 shape.quadraticCurveTo(-0.1, -0.34, -0.5, 0);
 return new THREE.ShapeGeometry(shape, 3).rotateX(-Math.PI / 2);
}

export function Leaves() {
 const geometry = useMemo(() => {
  const random = seeded(606);
  const trees = leafyTrees();
  const total = trees.reduce((sum, tree) => sum + tree.crown.share, 0);
  const home = new Float32Array(LEAVES * 3);
  const shape = new Float32Array(LEAVES * 4);
  const seed = new Float32Array(LEAVES * 3);
  const tint = new Float32Array(LEAVES * 3);
  const color = new THREE.Color();
  for (let i = 0; i < LEAVES; i++) {
   // Reparto proporcional a lo que suelta cada árbol.
   let pick = random() * total;
   let tree = trees[0];
   for (const one of trees) {
    pick -= one.crown.share;
    if (pick <= 0) {
     tree = one;
     break;
    }
   }
   home.set([tree.x, height(tree.x, tree.z), tree.z], i * 3);
   // Altura de la que cae, radio de la copa, ritmo de caída y tamaño.
   shape.set([tree.top * (0.75 + random() * 0.3), tree.spread, 0.07 + random() * 0.05, (tree.crown.petal ? 0.15 : 0.26) * (0.75 + random() * 0.5)], i * 4);
   seed.set([random(), random(), random()], i * 3);
   color.set(tree.crown.colors[Math.floor(random() * tree.crown.colors.length)]).multiplyScalar(0.92 + random() * 0.16);
   color.toArray(tint, i * 3);
  }
  const result = createLeafGeometry();
  result.setAttribute("home", new THREE.InstancedBufferAttribute(home, 3));
  result.setAttribute("shape", new THREE.InstancedBufferAttribute(shape, 4));
  result.setAttribute("seed", new THREE.InstancedBufferAttribute(seed, 3));
  result.setAttribute("tint", new THREE.InstancedBufferAttribute(tint, 3));
  return result;
 }, []);

 const material = useMemo(() => {
  const { uTime, uNight } = uniforms;
  const home = attribute("home", "vec3");
  const shape = attribute("shape", "vec4");
  const seed = attribute("seed", "vec3");
  const tint = attribute("tint", "vec3");

  // Ráfaga: cuánto ha pasado ya el frente por este árbol (0…1) y hacia dónde empuja.
  const fromOrigin = home.xz.sub(windGust.xy);
  const distance = length(fromOrigin);
  const stormy = smoothstep(distance.sub(3), distance.add(5), windGust.z).mul(windGust.w.min(1)).mul(smoothstep(125, 70, windGust.z));
  const outward = fromOrigin.div(distance.max(0.001));
  const shown = step(seed.z, mix(CALM, 1, stormy));

  // Ciclo de cada hoja: cae durante la mayor parte y descansa en el suelo al final.
  const cycle = fract(uTime.mul(shape.z).add(seed.x));
  const fall = cycle.div(0.86).min(1);
  const landed = step(0.86, cycle);
  const angle = seed.y.mul(6.2832);
  const start = vec2(cos(angle), sin(angle)).mul(shape.y).mul(fract(seed.z.mul(7.31)).mul(0.7).add(0.3));
  // Deriva: a favor del viento (más con racha) y, con ráfaga, por delante de su frente.
  const drift = windDirection.mul(fall).mul(windStrength.mul(3).add(0.8).add(stormy.mul(5))).add(outward.mul(stormy).mul(fall).mul(4.5));
  const flutter = vec2(sin(uTime.mul(1.7).add(seed.x.mul(40))), cos(uTime.mul(1.3).add(seed.y.mul(30)))).mul(fall.mul(0.45));
  const ground = home.xz.add(start).add(drift).add(flutter);
  const y = home.y.add(shape.x.mul(fall.oneMinus())).add(0.04);

  // Giro: revolotea mientras cae y queda tumbada al posarse.
  const tumble = uTime.mul(2.4).add(seed.x.mul(50)).mul(landed.oneMinus());
  const turn = uTime.mul(1.5).mul(landed.oneMinus()).add(seed.y.mul(30));
  const p = positionLocal;
  const tilted = vec3(p.x, p.y.mul(cos(tumble)).sub(p.z.mul(sin(tumble))), p.y.mul(sin(tumble)).add(p.z.mul(cos(tumble))));
  const turned = vec3(tilted.x.mul(cos(turn)).add(tilted.z.mul(sin(turn))), tilted.y, tilted.z.mul(cos(turn)).sub(tilted.x.mul(sin(turn))));
  const fade = smoothstep(0, 0.05, cycle).mul(smoothstep(1, 0.95, cycle)).mul(shown);

  const result = unlit({ side: THREE.DoubleSide });
  result.positionNode = turned.mul(shape.w).mul(fade).add(vec3(ground.x, y, ground.y));
  result.colorNode = tint.mul(mix(1, 0.45, uNight));
  return result;
 }, []);

 useEffect(
  () => () => {
   geometry.dispose();
   material.dispose();
  },
  [geometry, material],
 );
 return <instancedMesh args={[geometry, material, LEAVES]} frustumCulled={false} />;
}

// ── Polen ───────────────────────────────────────────────────────────────────
// Motas claras que flotan de día en las zonas de bosque y derivan con el
// viento. De noche se apagan: las relevan las luciérnagas.
const POLLEN = 240;

export function Pollen() {
 const geometry = useMemo(() => {
  const random = seeded(4242);
  const trees = leafyTrees();
  const home = new Float32Array(POLLEN * 3);
  const seed = new Float32Array(POLLEN * 2);
  for (let i = 0; i < POLLEN; i++) {
   const tree = trees[Math.floor(random() * trees.length)];
   const angle = random() * Math.PI * 2, radius = 0.8 + random() * 3.6;
   const x = tree.x + Math.cos(angle) * radius, z = tree.z + Math.sin(angle) * radius;
   home.set([x, Math.max(height(x, z), 0) + 0.7 + random() * 2.6, z], i * 3);
   seed.set([random(), random()], i * 2);
  }
  const result = new THREE.OctahedronGeometry(0.042, 0);
  result.setAttribute("home", new THREE.InstancedBufferAttribute(home, 3));
  result.setAttribute("seed", new THREE.InstancedBufferAttribute(seed, 2));
  return result;
 }, []);
 const material = useMemo(() => {
  const { uTime, uGlow } = uniforms;
  const home = attribute("home", "vec3");
  const seed = attribute("seed", "vec2");
  // Cada mota hace un trayecto corto a favor del viento, aparece y se va.
  const trip = fract(uTime.mul(seed.y.mul(0.02).add(0.03)).add(seed.x));
  const along = windDirection.mul(trip.sub(0.5)).mul(windStrength.mul(4).add(2.5));
  const bob = vec3(sin(uTime.mul(0.6).add(seed.x.mul(40))).mul(0.3), sin(uTime.mul(0.9).add(seed.y.mul(50))).mul(0.22), cos(uTime.mul(0.5).add(seed.x.mul(27))).mul(0.3));
  // Algo por encima del blanco: el resplandor del posproceso las vuelve motas de luz.
  const result = unlit({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  result.positionNode = positionLocal.mul(seed.y.mul(0.8).add(0.7)).add(home).add(vec3(along.x, 0, along.y)).add(bob);
  result.colorNode = vec3(1.3, 1.2, 0.78);
  result.opacityNode = smoothstep(0, 0.15, trip).mul(smoothstep(1, 0.85, trip)).mul(uGlow.oneMinus()).mul(0.8);
  return result;
 }, []);
 useEffect(
  () => () => {
   geometry.dispose();
   material.dispose();
  },
  [geometry, material],
 );
 return <instancedMesh args={[geometry, material, POLLEN]} frustumCulled={false} />;
}
