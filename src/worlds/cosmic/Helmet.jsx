import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { uniform } from "three/tsl";
import { keepFlat } from "../../experience/environment/bend";
import { player, woody } from "../../experience/state";
import { glassy, powered } from "./materials";
import { createHelmet } from "./models";

// En este mundo Woody lleva una escafandra pequeña: una burbuja de cristal
// alrededor de la cabeza, con su aro al cuello y una antenita con la luz
// encendida. Va con su cabeza: gira y cabecea con ella. (La monta
// characters/Woody.jsx si el mundo la trae: `woodyWears`.)
const at = new THREE.Vector3();
export function Helmet({ head }) {
 const group = useRef(null);
 const models = useMemo(createHelmet, []);
 const material = useMemo(() => ({ collar: powered(uniform(1)), bubble: glassy("#c8fbff", { body: 0.13, rim: 0.75 }) }), []);
 useEffect(() => {
  // (Va con Woody, que no se curva con el planeta: tampoco su escafandra.)
  keepFlat(group.current);
  return () => {
   models.collar.dispose();
   models.bubble.dispose();
   material.collar.dispose();
   material.bubble.dispose();
  };
 }, [models, material]);
 useFrame(() => {
  if (!head) return;
  // Centrada en la cabeza: algo por delante y por encima de su hueso.
  head.getWorldPosition(at);
  group.current.position.set(at.x - Math.sin(woody.facing) * 0.1, at.y + 0.06, at.z - Math.cos(woody.facing) * 0.1);
  group.current.rotation.y = woody.facing;
  group.current.visible = !player.hidden;
  if (import.meta.env.DEV) window.__world.helmet = group.current; // para las pruebas automáticas
 });
 return (
  <group ref={group} name="escafandra de Woody">
   <mesh geometry={models.collar} material={material.collar} position-y={-0.27} />
   <mesh geometry={models.bubble} material={material.bubble} renderOrder={4} />
  </group>
 );
}
