import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../experience/Instances";
import { addWarmSource } from "../../experience/lightSources";
import { Halos } from "../living/props/Halos";
import { HOUSE, height } from "./layout";
import { glass, pool, solid } from "./materials";
import { WARM, createHouse } from "./models";

// La casa del alquimista: la casa torcida hecha a mano en la muestra de estilo,
// ahora más pequeña y en la primera terraza. Es la de la luz morada: ventanas
// en violeta que brillan hacia fuera, la buhardilla en verde, el farolillo de
// la puerta en cálido y, por la chimenea, humo violeta (ver Buildings.jsx).
// («Sobre mí» se lee ahora en la casa sobre tronco: ver Buildings.jsx.)
const VIOLET = "#c283ff";
const EYE = "#7fb83a"; // la buhardilla redonda: verde, pero sin deslumbrar
export function House() {
 const model = useMemo(createHouse, []);
 const material = useMemo(() => ({ body: solid(), warm: glass(VIOLET), acid: glass(EYE), lantern: glass(WARM), spill: pool("#9a5cff", 0.5), glow: pool("#ff9a3c", 0.5) }), []);
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
   // (Las ventanas brillan hacia fuera: un halo violeta ante cada una de las de la fachada.)
   panes: model.windows.slice(0, 2).map(({ position, yaw }) => toWorld([position[0] + Math.sin(yaw) * 0.25, position[1], position[2] + Math.cos(yaw) * 0.25]).toArray()),
   pools: windows.slice(0, 1).map(({ at }) => floor(at, 4.6)),
   warmPools: [floor(lamp, 3.6)],
  };
 }, [model, ground]);
 useEffect(() => {
  const stop = [
   addWarmSource({ x: lit.lamp.x, y: lit.lamp.y - 0.2, z: lit.lamp.z, power: 0.8, reach: 6, flicker: 0.07, color: "#ffa552" }),
   ...lit.windows.slice(0, 1).map(({ at, power }) => addWarmSource({ x: at.x, y: at.y - 0.4, z: at.z, power, reach: 7, flicker: 0.03, color: "#b070ff" })),
  ];
  return () => stop.forEach((off) => off());
 }, [lit]);
 useEffect(
  () => () => {
   [model.body, model.warm, model.acid, model.lantern, plane].forEach((one) => one.dispose());
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
    <mesh geometry={model.lantern} material={material.lantern.material} />
   </group>
   <Instances geometry={plane} material={material.spill.material} items={lit.pools} renderOrder={2} />
   <Instances geometry={plane} material={material.glow.material} items={lit.warmPools} renderOrder={2} />
   <Halos points={lit.halos} size={1.4} color="#ffa24e" night={0.6} />
   <Halos points={lit.panes} size={2.1} color="#b47cff" night={0.5} />
  </>
 );
}
