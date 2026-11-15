import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { aboutCard } from "../../content/about";
import { Instances } from "../../experience/Instances";
import { useInteractable } from "../../experience/interact";
import { addWarmSource } from "../../experience/lightSources";
import { emit } from "../../experience/state";
import { Halos } from "../living/props/Halos";
import { HOUSE, HOUSE_DOOR, height } from "./layout";
import { glass, pool, solid } from "./materials";
import { ACID, WARM, createHouse } from "./models";

// Parada 1 · La casa torcida: mi historia. Por fuera, entera: ventanas
// encendidas en naranja, la buhardilla en verde ácido, el farol de la puerta y
// la luz que sale por los cristales y cae al suelo. Ante la puerta, con E, se
// lee «Sobre mí» (el texto real, de content/about.js).
export function House() {
 const model = useMemo(createHouse, []);
 const material = useMemo(() => ({ body: solid(), warm: glass(WARM), acid: glass(ACID), spill: pool("#ff9a3c", 0.5) }), []);
 const plane = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
 const ground = height(HOUSE.x, HOUSE.z);
 // De los ejes de la casa a los del mundo.
 const lit = useMemo(() => {
  const toWorld = ([x, y, z]) => new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), HOUSE.turn).add(new THREE.Vector3(HOUSE.x, ground, HOUSE.z));
  const lamp = toWorld(model.lamp);
  // Cada ventana alumbra lo que tiene delante.
  const windows = model.windows.map(({ position, yaw, power }) => ({ at: toWorld([position[0] + Math.sin(yaw) * 1.5, position[1], position[2] + Math.cos(yaw) * 1.5]), power }));
  const floor = (v, scale) => ({ position: [v.x, height(v.x, v.z) + 0.07, v.z], scale });
  return {
   lamp,
   windows,
   halos: [lamp.toArray()],
   pools: [floor(lamp, 6.4), ...windows.slice(0, 1).map(({ at }) => floor(at, 5.2))],
  };
 }, [model, ground]);
 useEffect(() => {
  const stop = [
   addWarmSource({ x: lit.lamp.x, y: lit.lamp.y - 0.2, z: lit.lamp.z, power: 1.15, reach: 9, flicker: 0.06, color: "#ffa552" }),
   ...lit.windows.map(({ at, power }) => addWarmSource({ x: at.x, y: at.y - 0.4, z: at.z, power, reach: 7.5, flicker: 0.03, color: "#ffa552" })),
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
 const click = useInteractable({
  position: HOUSE_DOOR,
  radius: 2.7,
  height: 2.6,
  hint: "Leer mi historia",
  action: () => emit("open", { ...aboutCard(), at: { x: HOUSE.x + 0.6, y: 3.4, z: HOUSE.z + 1.5, distance: 0.86 } }),
 });
 return (
  <>
   <group name="casa torcida" userData={{ rests: 0 }} position={[HOUSE.x, ground, HOUSE.z]} rotation-y={HOUSE.turn} {...click}>
    <mesh geometry={model.body} material={material.body} castShadow receiveShadow />
    <mesh geometry={model.warm} material={material.warm.material} />
    <mesh geometry={model.acid} material={material.acid.material} />
   </group>
   <Instances geometry={plane} material={material.spill.material} items={lit.pools} renderOrder={2} />
   <Halos points={lit.halos} size={1.9} color="#ffa24e" night={0.6} />
  </>
 );
}
