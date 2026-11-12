import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { registerGlow } from "../../../experience/theme";
import { addWarmSource } from "../../../experience/lightSources";
import { WARM_LIGHT } from "../kit/palette";

// Cristal encendido: una ventana, un farol, una lente. De día apenas se nota;
// de noche brilla y, si `light` no es false, ilumina lo que tiene delante
// (hacia +z local, a `reach` metros).
export function Glow({ children, color = WARM_LIGHT, emissive = "#ffb24a", day = 0.2, night = 2.8, light = true, power = 0.55, reach = 8, forward = 0.9, ...props }) {
 const mesh = useRef(null);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ color, emissive }), [color, emissive]);
 useEffect(() => {
  const stop = [registerGlow(material, day, night)];
  if (light) {
   mesh.current.updateWorldMatrix(true, false);
   const at = mesh.current.localToWorld(new THREE.Vector3(0, 0, forward));
   stop.push(addWarmSource({ x: at.x, y: at.y + 0.15, z: at.z, power, reach, flicker: 0.025, color: emissive }));
  }
  return () => {
   stop.forEach((off) => off());
   material.dispose();
  };
 }, [material, day, night, light, power, reach, forward, emissive]);
 return (
  <mesh ref={mesh} material={material} {...props}>
   {children}
  </mesh>
 );
}
