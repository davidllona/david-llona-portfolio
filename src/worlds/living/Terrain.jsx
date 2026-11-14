import { useEffect, useMemo } from "react";
import { Staged } from "../Staged";
import * as THREE from "three";
import { attribute, color, mix, positionLocal, smoothstep, texture } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { Instances } from "../../experience/Instances";
import { groundColor } from "./groundColor";
import { randomFrom } from "./kit/geometry";
import { BRIDGES, PAD, PATHS, PLAZA, bridgeArc, bridgeSlope, groundHeight, noise2, settle, surface } from "./layout";
import { SLAB_THICKNESS, createSlab } from "./props/cobbles";
import { SPAN, terrainTextures } from "./terrainData";
import { noiseTexture } from "../../experience/environment/noise";
import { Water } from "./water/Water";
import { Waterfall } from "./water/Waterfall";

const GROUND_RADIUS = 64;

// El suelo: una malla facetada, coloreada según lo que hay en cada punto.
function createGround() {
 const SEGMENTS = 150, SIZE = 132;
 const side = SEGMENTS + 1;
 // Altura y tipo de suelo de cada vértice de la rejilla, una sola vez.
 const xs = new Float32Array(side), heights = new Float32Array(side * side), kinds = new Array(side * side);
 for (let i = 0; i < side; i++) xs[i] = (i / SEGMENTS - 0.5) * SIZE;
 for (let row = 0; row < side; row++) {
  for (let column = 0; column < side; column++) {
   if (Math.hypot(xs[column], xs[row]) > GROUND_RADIUS + 1.5) continue; // fuera solo hay mar
   const i = row * side + column;
   heights[i] = groundHeight(xs[column], xs[row]);
   // (Sin los caminos: esos los pinta el material, con borde nítido.)
   kinds[i] = surface(xs[column], xs[row], false);
  }
 }
 // Dos triángulos por casilla, sin compartir vértices (para el facetado y el
 // color por cara). Se recorta en redondo: desde la nave debe verse una isla.
 const positions = [], colors = [];
 const tone = new THREE.Color();
 const triangle = (a, b, c) => {
  const cx = (xs[a[0]] + xs[b[0]] + xs[c[0]]) / 3, cz = (xs[a[1]] + xs[b[1]] + xs[c[1]]) / 3;
  if (Math.hypot(cx, cz) >= GROUND_RADIUS) return;
  // El tono (mancha grande, y algún triángulo suelto distinto) es uno por
  // cara; el tipo de suelo es el de cada esquina: así el borde entre hierba,
  // camino y arena se funde dentro del triángulo en vez de hacer dientes.
  const odd = noise2(cx * 2.1, cz * 2.1) > 0.84;
  for (const [column, row] of [a, b, c]) {
   const i = row * side + column;
   positions.push(xs[column], heights[i], xs[row]);
   groundColor(tone, xs[column], xs[row], { at: [cx, cz], odd, kind: kinds[i], height: heights[i] });
   colors.push(tone.r, tone.g, tone.b);
  }
 };
 for (let row = 0; row < SEGMENTS; row++) {
  for (let column = 0; column < SEGMENTS; column++) {
   triangle([column, row], [column, row + 1], [column + 1, row]);
   triangle([column, row + 1], [column + 1, row + 1], [column + 1, row]);
  }
 }
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
 geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
 geometry.computeVertexNormals();
 return geometry;
}

// ── Puente y adoquines ──────────────────────────────────────────────────────────
function Bridges() {
 const plank = useMemo(() => new THREE.BoxGeometry(1, 0.12, 1), []);
 const wood = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true }), []);
 const items = useMemo(() => {
  const list = [];
  for (const bridge of BRIDGES) {
   const [ax, az] = bridge.from;
   const [bx, bz] = bridge.to;
   const length = Math.hypot(bx - ax, bz - az);
   const yaw = Math.atan2(-(bz - az), bx - ax);
   const count = Math.round(length / 0.62);
   for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const y = bridgeArc(bridge, t);
    const slope = Math.atan(bridgeSlope(bridge, t) / length);
    // Tablones a lo ancho, siguiendo el arco.
    list.push({ position: [ax + (bx - ax) * t, y - 0.07, az + (bz - az) * t], rotation: [0, yaw, slope], scale: [0.54, 1, bridge.width + 0.5], color: i % 2 ? "#b9824f" : "#a87343" });
    // Postes de la barandilla, uno de cada dos tablones.
    if (i % 2 === 0) {
     for (const side of [-1, 1]) {
      const nx = (-(bz - az) / length) * side * (bridge.width / 2 + 0.2);
      const nz = ((bx - ax) / length) * side * (bridge.width / 2 + 0.2);
      list.push({ position: [ax + (bx - ax) * t + nx, y + 0.45, az + (bz - az) * t + nz], rotation: [0, yaw, 0], scale: [0.16, 9, 0.16], color: "#7d5233" });
     }
    }
   }
   // Pasamanos: dos largueros que siguen el arco por tramos.
   for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
     const t = (i + 0.5) / 6;
     const nx = (-(bz - az) / length) * side * (bridge.width / 2 + 0.2);
     const nz = ((bx - ax) / length) * side * (bridge.width / 2 + 0.2);
     const slope = Math.atan(bridgeSlope(bridge, t) / length);
     list.push({ position: [ax + (bx - ax) * t + nx, bridgeArc(bridge, t) + 0.95, az + (bz - az) * t + nz], rotation: [0, yaw, slope], scale: [length / 6 + 0.06, 1, 0.14], color: "#7d5233" });
    }
   }
  }
  return list;
 }, []);
 return <Instances name="puente" geometry={plank} material={wood} items={items} colored castShadow receiveShadow />; // (sigue el arco del puente, no el terreno)
}

// Losas encajadas en la tierra a la salida de la plataforma del cohete: los
// primeros metros de cada camino que nace de ella. Van en hiladas apretadas,
// con junta fina, a ras de suelo (asoman centímetro y medio), y se van
// perdiendo hacia fuera. En el resto de los caminos, tierra.
const SLAB_TONES = ["#b9c0cb", "#a9b1bd", "#c6ccd5", "#9fa8b5", "#b2b7c0"];
function PadSlabs() {
 const geometry = useMemo(createSlab, []);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true, vertexColors: true }), []);
 useEffect(
  () => () => {
   geometry.dispose();
   material.dispose();
  },
  [geometry, material],
 );
 const items = useMemo(() => {
  const random = randomFrom(0.713);
  const list = [];
  for (const path of PATHS) {
   // Solo los caminos que arrancan junto a la plataforma.
   const [ax, az] = path[0];
   const [bx, bz] = path[1];
   if (Math.hypot(ax - PAD.x, az - PAD.z) > PAD.padRadius + 1.5) continue;
   const length = Math.hypot(bx - ax, bz - az);
   const dx = (bx - ax) / length, dz = (bz - az) / length;
   const yaw = Math.atan2(-dz, dx);
   const REACH = 3.4, WIDTH = 1.66, JOINT = 0.035;
   // Empieza donde acaba la losa de la plataforma, sea donde sea que arranque el camino.
   const start = PAD.padRadius + 0.12 - Math.hypot(ax - PAD.x, az - PAD.z);
   for (let d = start; d < start + REACH; ) {
    const depth = 0.42 + random() * 0.22;
    const fade = (d - start) / REACH; // hacia fuera faltan cada vez más
    const cuts = [0, 0.3 + random() * 0.12, 0.62 + random() * 0.12, 1];
    for (let k = 0; k < 3; k++) {
     const from = cuts[k] * WIDTH - WIDTH / 2, to = cuts[k + 1] * WIDTH - WIDTH / 2;
     if (random() < Math.max(0, fade - 0.45) * 1.5) continue;
     const along = d + depth / 2, across = (from + to) / 2;
     const x = ax + dx * along - dz * across, z = az + dz * along + dx * across;
     const spot = settle(x, z, 0.3, { relief: 0.06, embed: 0 });
     if (!spot) continue;
     const tone = SLAB_TONES[Math.floor(random() * SLAB_TONES.length)];
     list.push({ position: [x, spot.y + 0.015 - SLAB_THICKNESS / 2, z], rotation: [0, yaw + (random() - 0.5) * 0.05, 0], scale: [depth - JOINT, 1, to - from - JOINT], color: tone });
    }
    d += depth;
   }
  }
  return list;
 }, []);
 return <Instances name="adoquín de la plataforma" geometry={geometry} material={material} items={items} colored receiveShadow />;
}

// El suelo se pinta con el color de cada vértice, salvo los caminos: esos se
// calculan en cada píxel a partir de la distancia a su borde (horneada en la
// textura del terreno), así que el borde sale nítido por grande que sea la
// malla. Tierra clara, más pisada en el centro, y un reborde oscuro y fino.
function createGroundMaterial() {
 const { color: map } = terrainTextures();
 const material = new MeshLambertNodeMaterial({ flatShading: true }) // (el color de vértice entra por `colorNode`: con `vertexColors` se multiplicaría dos veces);
 const at = positionLocal.xz;
 const lane = texture(map, at.div(SPAN).add(0.5)).a.sub(0.5).mul(4); // metros al borde; negativo = dentro
 // El borde tiembla un poco más de cerca de lo que da la textura.
 const edge = lane.add(texture(noiseTexture, at.mul(0.41)).r.sub(0.5).mul(0.14));
 const blotch = texture(noiseTexture, at.mul(0.06)).g;
 const earth = mix(color("#e2c692"), color("#f0dcae"), smoothstep(-0.25, -0.8, edge).mul(0.7).add(blotch.mul(0.3)));
 const rim = color("#b99a68");
 const inside = smoothstep(0.02, -0.02, edge);
 const border = smoothstep(0.02, -0.02, edge.sub(0.07)).mul(smoothstep(-0.16, -0.05, edge));
 material.colorNode = mix(attribute("color", "vec3"), mix(earth, rim, border), inside.max(border));
 return material;
}

export function Terrain() {
 const ground = useMemo(createGround, []);
 const soil = useMemo(createGroundMaterial, []);
 useEffect(
  () => () => {
   ground.dispose();
   soil.dispose();
  },
  [ground, soil],
 );
 return (
  <Staged>
   <mesh geometry={ground} material={soil} receiveShadow castShadow />
   <Water />
   <Waterfall />
   <Bridges />
   <PadSlabs />
  </Staged>
 );
}
