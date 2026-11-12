import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../experience/Instances";
import { groundColor } from "./groundColor";
import { BRIDGES, PATHS, groundHeight, noise2, surface } from "./layout";
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
   kinds[i] = surface(xs[column], xs[row]);
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

// ── Puente y losas ──────────────────────────────────────────────────────────
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
    const y = 0.12 + Math.sin(t * Math.PI) * bridge.rise;
    const slope = Math.atan((Math.cos(t * Math.PI) * Math.PI * bridge.rise) / length);
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
     const slope = Math.atan((Math.cos(t * Math.PI) * Math.PI * bridge.rise) / length);
     list.push({ position: [ax + (bx - ax) * t + nx, 0.12 + Math.sin(t * Math.PI) * bridge.rise + 0.95, az + (bz - az) * t + nz], rotation: [0, yaw, slope], scale: [length / 6 + 0.06, 1, 0.14], color: "#7d5233" });
    }
   }
  }
  return list;
 }, []);
 return <Instances geometry={plank} material={wood} items={items} colored castShadow receiveShadow />;
}

// Losas sueltas a lo largo de los caminos.
function SteppingStones() {
 const geometry = useMemo(() => new THREE.CylinderGeometry(0.5, 0.56, 0.1, 6), []);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ color: "#c9c4cf", flatShading: true }), []);
 const items = useMemo(() => {
  const list = [];
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const path of PATHS) {
   for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const steps = Math.floor(Math.hypot(bx - ax, bz - az) / 1.5);
    for (let k = 1; k < steps; k++) {
     const t = k / steps;
     const x = ax + (bx - ax) * t + (random() - 0.5) * 0.5;
     const z = az + (bz - az) * t + (random() - 0.5) * 0.5;
     const y = groundHeight(x, z);
     if (y < -0.03) continue;
     const scale = 0.75 + random() * 0.45;
     list.push({ position: [x, y + 0.04, z], rotation: [0, random() * Math.PI, 0], scale: [scale, 1, scale] });
    }
   }
  }
  return list;
 }, []);
 return <Instances geometry={geometry} material={material} items={items} receiveShadow />;
}

export function Terrain() {
 const ground = useMemo(createGround, []);
 useEffect(() => () => ground.dispose(), [ground]);
 return (
  <>
   <mesh geometry={ground} receiveShadow castShadow>
    <meshLambertMaterial vertexColors flatShading />
   </mesh>
   <Water />
   <Waterfall />
   <Bridges />
   <SteppingStones />
  </>
 );
}
