import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../experience/Instances";
import { lambert } from "../../experience/materials";
import { createGlowTexture } from "../../experience/textures";
import { registerGlow } from "../../experience/theme";
import { addWarmSource } from "../../experience/lightSources";
import { Plants } from "./flora/Plants";
import { Trees } from "./flora/Trees";
import { SCATTER } from "./layout";
import { LAMP_GLASS, createLamp } from "./props/lampModel";

// La vegetación del planeta (árboles y plantas, cada uno en su archivo) y las
// farolas de los caminos.



// Farolas a lo largo de los caminos: poste curvo con farol colgante. De noche
// cada una da luz de verdad (ver experience/WarmLights.jsx) y un charco cálido en el suelo.
function Lanterns() {
 const glow = useMemo(() => createGlowTexture(), []);
 const geometry = useMemo(() => ({ lamp: createLamp(), glass: new THREE.BoxGeometry(0.2, 0.34, 0.2), pool: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) }), []);
 const material = useMemo(
  () => ({
   lamp: lambert(),
   // Solo emite (ver buildings/Glow.jsx): así la luz de la propia farola no lo quema.
   glass: new THREE.MeshLambertMaterial({ color: "#000000", emissive: "#ffc878" }),
   pool: new THREE.MeshBasicMaterial({ map: glow, color: "#ffc070", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }),
  }),
  [glow],
 );
 // Cada farola mira hacia el camino junto al que está.
 const lamps = useMemo(() => SCATTER.lanterns.map((l, i) => ({ ...l, turn: ((i * 2.4) % 6.28) })), []);
 useEffect(() => {
  const stop = [
   registerGlow(material.glass, 0.7, 1.3),
   registerGlow(material.pool, 0, 0.3, "opacity"),
   ...lamps.map((l) => addWarmSource({ x: l.x - Math.cos(l.turn) * 1.0, y: l.y + 1.9, z: l.z + Math.sin(l.turn) * 1.0 })),
  ];
  return () => {
   stop.forEach((off) => off());
   glow.dispose();
   Object.values(geometry).forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  };
 }, [material, glow, geometry, lamps]);

 const items = useMemo(() => {
  const head = (l, y) => [l.x + LAMP_GLASS[0] * Math.cos(l.turn), l.y + y, l.z - LAMP_GLASS[0] * Math.sin(l.turn)];
  return {
   posts: lamps.map((l) => ({ position: [l.x, l.y, l.z], rotation: [0, l.turn, 0] })),
   glasses: lamps.map((l) => ({ position: head(l, LAMP_GLASS[1]), rotation: [0, l.turn, 0] })),
   pools: lamps.map((l) => ({ position: head(l, 0.07), scale: 10 })),
  };
 }, [lamps]);
 return (
  <>
   <Instances geometry={geometry.lamp} material={material.lamp} items={items.posts} castShadow />
   <Instances geometry={geometry.glass} material={material.glass} items={items.glasses} />
   <Instances geometry={geometry.pool} material={material.pool} items={items.pools} />
  </>
 );
}

export function Flora() {
 return (
  <>
   <Trees />
   <Plants />
   <Lanterns />
  </>
 );
}
