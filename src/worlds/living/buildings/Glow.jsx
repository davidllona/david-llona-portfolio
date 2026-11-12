import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { registerGlow } from "../../../experience/theme";
import { addWarmSource } from "../../../experience/lightSources";
import { WARM_LIGHT } from "../kit/palette";

// Cristal encendido: una ventana, un farol, una lente. De día es un cristal
// claro; de noche brilla y, si `light` no es false, ilumina lo que tiene
// delante (hacia +z local, a `reach` metros; `drop` baja la luz hacia el suelo).
//
// El cristal solo emite: no refleja las luces de la escena. Si lo hiciera, la
// luz que él mismo enciende a un palmo lo quemaría a blanco. Su brillo va de
// 0,7 (día) a 1,3 como mucho (noche): con color, sin saturar.
export function Glow({ children, color = WARM_LIGHT, emissive = "#ffb24a", day = 0.2, night = 2.8, light = true, power = 0.55, reach = 8, forward = 1.4, drop = 0, ...props }) {
 const mesh = useRef(null);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ color: "#000000", emissive: new THREE.Color(color).lerp(new THREE.Color(emissive), 0.35) }), [color, emissive]);
 useEffect(() => {
  const stop = [registerGlow(material, day > 1 ? 0.9 : 0.7, 1 + (Math.min(night, 3.2) / 3.2) * 0.3)];
  if (light) {
   mesh.current.updateWorldMatrix(true, false);
   const at = mesh.current.localToWorld(new THREE.Vector3(0, 0, forward));
   stop.push(addWarmSource({ x: at.x, y: at.y + 0.15 - drop, z: at.z, power, reach, flicker: 0.025, color: emissive }));
  }
  return () => {
   stop.forEach((off) => off());
   material.dispose();
  };
 }, [material, day, night, light, power, reach, forward, drop, emissive]);
 return (
  <mesh ref={mesh} material={material} {...props}>
   {children}
  </mesh>
 );
}
