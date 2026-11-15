import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../experience/Instances";
import { addWarmSource } from "../../experience/lightSources";
import { Halos } from "../living/props/Halos";
import { HOUSE, height } from "./layout";
import { glass, pool, solid } from "./materials";
import { ACID, createHouse } from "./models";

// La casa del alquimista: la casa torcida hecha a mano en la muestra de estilo,
// ahora más pequeña y en la primera terraza. Es la de la luz morada: ventanas
// en violeta, la buhardilla en verde ácido, el farol de la puerta en cálido.
// («Sobre mí» se lee ahora en la casa sobre tronco: ver Buildings.jsx.)
const VIOLET = "#b56bff";
export function House() {
 const model = useMemo(createHouse, []);
 const material = useMemo(() => ({ body: solid(), warm: glass(VIOLET), acid: glass(ACID), spill: pool("#9a5cff", 0.5) }), []);
 const plane = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
 const ground = height(HOUSE.x, HOUSE.z);
 // De los ejes de la casa a los del mundo.
 const lit = useMemo(() => {
  const toWorld = ([x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(HOUSE.scale).applyAxisAngle(new THREE.Vector3(0, 1, 0), HOUSE.turn).add(new THREE.Vector3(HOUSE.x, ground, HOUSE.z));
  const lamp = toWorld(model.lamp);
  // Cada ventana alumbra lo que tiene delante.
  const windows = model.windows.map(({ position, yaw, power }) => ({ at: toWorld([position[0] + Math.sin(yaw) * 1.5, position[1], position[2] + Math.cos(yaw) * 1.5]), power }));
  const floor = (v, scale) => ({ position: [v.x, height(v.x, v.z) + 0.07, v.z], scale });
  return {
   lamp,
   windows,
   halos: [lamp.toArray()],
   pools: [floor(lamp, 5), ...windows.slice(0, 1).map(({ at }) => floor(at, 4.2))],
  };
 }, [model, ground]);
 useEffect(() => {
  const stop = [
   addWarmSource({ x: lit.lamp.x, y: lit.lamp.y - 0.2, z: lit.lamp.z, power: 1.0, reach: 8, flicker: 0.06, color: "#b070ff" }),
   ...lit.windows.slice(0, 1).map(({ at, power }) => addWarmSource({ x: at.x, y: at.y - 0.4, z: at.z, power, reach: 7, flicker: 0.03, color: "#b070ff" })),
  ];
  return () => stop.forEach((off) => off());
 }, [lit]);
 useEffect(
  () => () => {
   [model.body, model.warm, model.acid, plane].forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  },
  [model, material, plane],
 );
 return (
  <>
   <group name="casa del alquimista" userData={{ rests: 0 }} position={[HOUSE.x, ground, HOUSE.z]} rotation-y={HOUSE.turn} scale={HOUSE.scale}>
    <mesh geometry={model.body} material={material.body} castShadow receiveShadow />
    <mesh geometry={model.warm} material={material.warm.material} />
    <mesh geometry={model.acid} material={material.acid.material} />
   </group>
   <Instances geometry={plane} material={material.spill.material} items={lit.pools} renderOrder={2} />
   <Halos points={lit.halos} size={1.7} color="#b47cff" night={0.6} />
  </>
 );
}
