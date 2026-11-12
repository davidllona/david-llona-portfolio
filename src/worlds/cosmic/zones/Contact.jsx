import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CONTACT_LINKS } from "../../../content/contact";
import { Label } from "../../../experience/Label";
import { useInteractable } from "../../../experience/interact";
import { registerGlow } from "../../../experience/theme";
import { COLORS, CONTACT } from "../layout";

function openLink(href) {
 if (href.startsWith("mailto:")) window.location.href = href;
 else window.open(href, "_blank", "noopener,noreferrer");
}

// Un terminal por enlace: se abre al pulsarlo.
function Terminal({ link, x, z }) {
 const click = useInteractable({
  position: { x, z: z + 1.2 },
  radius: 2.4,
  hint: `Abrir ${link.label}`,
  anywhere: true,
  action: () => openLink(link.href),
 });
 return (
  <group position={[x, 0, z]} {...click}>
   <mesh position-y={0.6} castShadow>
    <boxGeometry args={[0.8, 1.2, 0.6]} />
    <meshLambertMaterial color="#3b2a5c" flatShading />
   </mesh>
   <mesh position={[0, 1.45, 0.05]} rotation-x={-0.35} castShadow>
    <boxGeometry args={[1.5, 0.95, 0.14]} />
    <meshLambertMaterial color="#241a4d" flatShading />
   </mesh>
   <mesh position={[0, 1.47, 0.13]} rotation-x={-0.35}>
    <planeGeometry args={[1.3, 0.75]} />
    <meshBasicMaterial color={COLORS.contacto} toneMapped={false} />
   </mesh>
   <Label text={link.label.toUpperCase()} color={COLORS.contacto} width={2.4} position={[0, 0.17, 1.3]} plate flat />
  </group>
 );
}

// Antena parabólica que gira despacio, con una baliza en la punta.
function Antenna() {
 const dish = useRef(null);
 const beacon = useMemo(() => new THREE.MeshLambertMaterial({ color: COLORS.contacto, emissive: COLORS.contacto }), []);
 useEffect(() => registerGlow(beacon, 0.8, 3), [beacon]);
 useFrame(({ clock }) => {
  dish.current.rotation.y = clock.elapsedTime * 0.35;
 });
 const { x, z } = CONTACT.antenna;
 return (
  <group position={[x, 0, z]}>
   <mesh position-y={0.3} castShadow>
    <cylinderGeometry args={[1, 1.3, 0.6, 8]} />
    <meshLambertMaterial color="#3b2a5c" flatShading />
   </mesh>
   <mesh position-y={2} castShadow>
    <cylinderGeometry args={[0.16, 0.22, 3, 6]} />
    <meshLambertMaterial color="#fbf3e4" flatShading />
   </mesh>
   <group ref={dish} position-y={3.7}>
    <mesh rotation-x={-0.9} castShadow>
     <coneGeometry args={[1.7, 0.8, 12, 1, true]} />
     <meshLambertMaterial color="#fbf3e4" flatShading side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0.5, 0.65]} rotation-x={-0.9}>
     <cylinderGeometry args={[0.03, 0.03, 1.2, 5]} />
     <meshLambertMaterial color="#3b2a5c" />
    </mesh>
    <mesh position={[0, 0.88, 1.12]} material={beacon}>
     <sphereGeometry args={[0.13, 8, 6]} />
    </mesh>
   </group>
  </group>
 );
}

export function Contact() {
 return (
  <>
   <Label text="CONTACTO" color={COLORS.contacto} width={6} position={[CONTACT.center.x, 0.17, CONTACT.center.z + 7]} flat />
   <Antenna />
   {CONTACT_LINKS.map((link, i) => (
    <Terminal key={link.label} link={link} {...CONTACT.terminals[i]} />
   ))}
  </>
 );
}
