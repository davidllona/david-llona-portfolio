import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Label } from "../Label";
import { registerGlow } from "../theme";
import { COLORS, PLAZA } from "../world";

// La plaza de llegada: una plataforma redonda con el nombre y las direcciones.
export function Plaza() {
 const ring = useMemo(() => new THREE.MeshLambertMaterial({ color: "#ff6b2c", emissive: "#ff6b2c" }), []);
 useEffect(() => registerGlow(ring, 0.25, 1.8), [ring]);
 const { x, z, r } = PLAZA;
 return (
  <group position={[x, 0, z]}>
   <mesh position-y={0.04} receiveShadow>
    <cylinderGeometry args={[r, r + 0.25, 0.1, 40]} />
    <meshLambertMaterial color="#ffe9dc" flatShading />
   </mesh>
   <mesh position-y={0.095} rotation-x={-Math.PI / 2} material={ring}>
    <ringGeometry args={[r - 0.55, r - 0.35, 56]} />
   </mesh>
   <Label text="DAVID LLONA" color="#241a4d" width={5.6} position={[0, 0.17, -0.4]} flat />
   <Label text="↑ PROYECTOS" color={COLORS.proyectos} width={3} position={[0, 0.17, -r - 1.5]} plate flat />
   <Label text="LAB →" color={COLORS.lab} width={2.2} position={[r + 2.4, 0.17, -1.6]} plate flat />
   <Label text="↓ SOBRE MÍ" color={COLORS["sobre-mi"]} width={3} position={[0, 0.17, r + 1.5]} plate flat />
   <Label text="← CONTACTO" color={COLORS.contacto} width={3} position={[-r - 2.8, 0.17, -0.2]} plate flat />
  </group>
 );
}
