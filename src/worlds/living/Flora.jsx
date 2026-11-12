import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "../../experience/Instances";
import { createGlowTexture } from "../../experience/textures";
import { registerGlow } from "../../experience/theme";
import { addWarmSource } from "../../experience/lightSources";
import { Plants } from "./flora/Plants";
import { Trees } from "./flora/Trees";
import { SCATTER } from "./layout";

// La vegetación del planeta (árboles y plantas, cada uno en su archivo) y las
// farolas de los caminos.


const lambert = (options = {}) => new THREE.MeshLambertMaterial({ flatShading: true, ...options });

// Farolas de madera a lo largo de los caminos; de noche dan un charco de luz.
function Lanterns() {
 const glow = useMemo(() => createGlowTexture(), []);
 const geometry = useMemo(
  () => ({
   post: new THREE.BoxGeometry(0.14, 1.9, 0.14).translate(0, 0.95, 0),
   head: new THREE.BoxGeometry(0.36, 0.42, 0.36),
   roof: new THREE.ConeGeometry(0.34, 0.24, 4).rotateY(Math.PI / 4),
   pool: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  }),
  [],
 );
 const material = useMemo(
  () => ({
   post: lambert({ color: "#6b4a34" }),
   head: new THREE.MeshLambertMaterial({ color: "#ffd98a", emissive: "#ffb44a" }),
   pool: new THREE.MeshBasicMaterial({ map: glow, color: "#ffc070", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }),
  }),
  [glow],
 );
 useEffect(() => {
  const stop = [
   registerGlow(material.head, 0.35, 3),
   registerGlow(material.pool, 0, 0.3, "opacity"),
   ...SCATTER.lanterns.map((l) => addWarmSource({ x: l.x, y: l.y + 2.3, z: l.z })),
  ];
  return () => {
   stop.forEach((off) => off());
   glow.dispose();
  };
 }, [material, glow]);

 const at = (lift, scale) => SCATTER.lanterns.map((l) => ({ position: [l.x, l.y + lift, l.z], scale }));
 const posts = useMemo(() => at(0, 1), []);
 const heads = useMemo(() => at(2.05, 1), []);
 const roofs = useMemo(() => at(2.38, 1), []);
 const pools = useMemo(() => at(0.07, 10), []);
 return (
  <>
   <Instances geometry={geometry.post} material={material.post} items={posts} castShadow />
   <Instances geometry={geometry.head} material={material.head} items={heads} />
   <Instances geometry={geometry.roof} material={material.post} items={roofs} />
   <Instances geometry={geometry.pool} material={material.pool} items={pools} />
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
