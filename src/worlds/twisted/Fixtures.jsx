import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../experience/Instances";
import { addWarmSource } from "../../experience/lightSources";
import { Halos } from "../living/props/Halos";
import { BEACONS, FENCES, LAMPS, height } from "./layout";
import { glass, pool, solid } from "./materials";
import { BEACON_TIP, LAMP_GLASS, LAMP_GLASS_SIZE, WARM, createBeacon, createBentLamp, createFences } from "./models";

// Lo plantado por alguien: farolas dobladas, las balizas de la zona de
// aterrizaje y la verja. Las farolas alumbran de verdad (las más cercanas al
// astronauta; ver experience/WarmLights.jsx), con su halo alrededor del
// cristal y un charco de luz cálida, bien marcado, en el suelo.
const turnedPoint = ([px, py, pz], item, y) => [item.x + px * Math.cos(item.turn) + pz * Math.sin(item.turn), y + py, item.z - px * Math.sin(item.turn) + pz * Math.cos(item.turn)];

export function Fixtures() {
 const models = useMemo(
  () => ({ lamp: createBentLamp(), beacon: createBeacon(), fence: createFences(FENCES, height), glass: new THREE.BoxGeometry(...LAMP_GLASS_SIZE), bulb: new THREE.IcosahedronGeometry(0.12, 0), pool: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) }),
  [],
 );
 const material = useMemo(() => ({ iron: solid(), lit: glass(WARM), light: pool("#ff9a3c", 0.56) }), []);
 const placed = useMemo(() => {
  const lamps = LAMPS.map((lamp) => ({ ...lamp, y: height(lamp.x, lamp.z) }));
  const beacons = BEACONS.map((beacon) => ({ ...beacon, y: height(beacon.x, beacon.z) }));
  const heads = lamps.map((lamp) => turnedPoint(LAMP_GLASS, lamp, lamp.y));
  const tips = beacons.map((beacon) => turnedPoint(BEACON_TIP, beacon, beacon.y));
  return {
   heads,
   tips,
   lamps: lamps.map((lamp) => ({ position: [lamp.x, lamp.y - 0.03, lamp.z], rotation: [0, lamp.turn, 0] })),
   beacons: beacons.map((beacon) => ({ position: [beacon.x, beacon.y - 0.02, beacon.z], rotation: [0, beacon.turn, 0] })),
   glasses: heads.map((head, i) => ({ position: head, rotation: [0, lamps[i].turn, 0] })),
   bulbs: tips.map((tip) => ({ position: tip })),
   pools: [...heads.map((head) => ({ position: [head[0], height(head[0], head[2]) + 0.06, head[2]], scale: 8.5 })), ...tips.map((tip) => ({ position: [tip[0], height(tip[0], tip[2]) + 0.06, tip[2]], scale: 2.6 }))],
  };
 }, []);
 useEffect(() => {
  const stop = placed.heads.map(([x, y, z]) => addWarmSource({ x, y: y - 0.25, z, power: 1.25, reach: 10, flicker: 0.05, color: "#ffa552" }));
  return () => stop.forEach((off) => off());
 }, [placed]);
 useEffect(
  () => () => {
   Object.values(models).forEach((one) => one.dispose());
   material.iron.dispose();
   material.lit.dispose();
   material.light.dispose();
  },
  [models, material],
 );
 return (
  <>
   <Instances name="farola doblada" rests={0} geometry={models.lamp} material={material.iron} items={placed.lamps} castShadow />
   <Instances name="baliza" rests={0} geometry={models.beacon} material={material.iron} items={placed.beacons} castShadow />
   <mesh name="verja" geometry={models.fence} material={material.iron} castShadow />
   <Instances geometry={models.glass} material={material.lit.material} items={placed.glasses} />
   <Instances geometry={models.bulb} material={material.lit.material} items={placed.bulbs} />
   <Instances geometry={models.pool} material={material.light.material} items={placed.pools} renderOrder={2} />
   <Halos points={placed.heads} size={2.3} color="#ffa24e" night={0.6} />
   <Halos points={placed.tips} size={1.0} color="#ffa24e" night={0.5} />
  </>
 );
}
