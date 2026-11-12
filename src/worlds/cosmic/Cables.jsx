import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CONTACT, LAB, SHIP } from "./layout";

// Cables tendidos por el suelo: de la nave a los pedestales del laboratorio y
// de la antena a los terminales. Puro adorno; no se choca con ellos.
const RUNS = [
 ...LAB.pedestals.map((p) => [SHIP, p]),
 ...CONTACT.terminals.map((t) => [CONTACT.antenna, t]),
];

export function Cables() {
 const geometry = useMemo(() => {
  const tubes = RUNS.map(([from, to], index) => {
   const dx = to.x - from.x;
   const dz = to.z - from.z;
   const length = Math.hypot(dx, dz);
   // Puntos intermedios desplazados a los lados, para que serpentee.
   const points = Array.from({ length: 6 }, (_, i) => {
    const t = i / 5;
    const sway = Math.sin(t * Math.PI) * Math.sin(t * 7 + index * 2) * 1.1;
    return new THREE.Vector3(from.x + dx * t + (-dz / length) * sway, 0.07, from.z + dz * t + (dx / length) * sway);
   });
   return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.07, 5);
  });
  const merged = mergeGeometries(tubes);
  tubes.forEach((tube) => tube.dispose());
  return merged;
 }, []);
 useEffect(() => () => geometry.dispose(), [geometry]);

 return (
  <mesh geometry={geometry} receiveShadow>
   <meshLambertMaterial color="#2a2140" flatShading />
  </mesh>
 );
}
