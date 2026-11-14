import { useEffect, useMemo } from "react";
import { Staged } from "../Staged";
import * as THREE from "three";
import { Instances } from "../../experience/Instances";
import { lambert } from "../../experience/materials";
import { createGlowTexture } from "../../experience/textures";
import { registerGlow } from "../../experience/theme";
import { addWarmSource } from "../../experience/lightSources";
import { Plants } from "./flora/Plants";
import { Trees } from "./flora/Trees";
import { SCATTER } from "./layout";
import { Halos } from "./props/Halos";
import { LANTERN_GLASS, LANTERN_GLASS_SIZE, createLantern } from "./props/lampModel";

// La vegetación del planeta (árboles y plantas, cada uno en su archivo) y las
// farolas de los caminos.



// Farolas de los caminos (dónde, en layout.js; el modelo, en props/lampModel.js).
// De noche cada una da luz de verdad, cálida y de alcance corto (ver
// experience/WarmLights.jsx), con un halo alrededor del cristal y un charco
// de luz en el suelo.
function Lanterns() {
 const glow = useMemo(() => createGlowTexture(), []);
 const geometry = useMemo(() => ({ lamp: createLantern(), glass: new THREE.BoxGeometry(...LANTERN_GLASS_SIZE), pool: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) }), []);
 const material = useMemo(
  () => ({
   lamp: lambert(),
   // Solo emite (ver buildings/Glow.jsx): así la luz de la propia farola no lo quema.
   glass: new THREE.MeshLambertMaterial({ color: "#000000", emissive: "#ffc878" }),
   pool: new THREE.MeshBasicMaterial({ map: glow, color: "#ffb866", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }),
  }),
  [glow],
 );
 const lamps = SCATTER.lanterns;
 // Dónde queda el cristal de cada una.
 const heads = useMemo(() => lamps.map((l) => [l.x + LANTERN_GLASS[0] * Math.cos(l.turn), l.y + LANTERN_GLASS[1], l.z - LANTERN_GLASS[0] * Math.sin(l.turn)]), [lamps]);
 useEffect(() => {
  const stop = [
   registerGlow(material.glass, 0.7, 1.3),
   registerGlow(material.pool, 0, 0.34, "opacity"),
   ...heads.map(([x, y, z]) => addWarmSource({ x, y: y - 0.25, z, reach: 7.5, power: 1.15 })),
  ];
  return () => {
   stop.forEach((off) => off());
   glow.dispose();
   Object.values(geometry).forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  };
 }, [material, glow, geometry, heads]);

 const items = useMemo(
  () => ({
   posts: lamps.map((l) => ({ position: [l.x, l.y, l.z], rotation: [0, l.turn, 0] })),
   glasses: lamps.map((l, i) => ({ position: heads[i], rotation: [0, l.turn, 0] })),
   pools: lamps.map((l, i) => ({ position: [heads[i][0], l.y + 0.07, heads[i][2]], scale: 7 })),
  }),
  [lamps, heads],
 );
 return (
  <>
   <Instances name="farola" rests={0} geometry={geometry.lamp} material={material.lamp} items={items.posts} castShadow />
   <Instances geometry={geometry.glass} material={material.glass} items={items.glasses} />
   <Instances geometry={geometry.pool} material={material.pool} items={items.pools} />
   <Halos points={heads} size={1.5} />
  </>
 );
}

export function Flora() {
 return (
  <Staged>
   <Trees />
   <Plants />
   <Lanterns />
  </Staged>
 );
}
