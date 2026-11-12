import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Instances } from "./Instances";
import { createGlowTexture } from "./textures";
import { addSway, registerGlow } from "./theme";
import { SCATTER } from "./world";

const FOLIAGE = ["#ff5d8f", "#ff8552", "#c65bd9", "#ffcf4a", "#3fd0b8", "#ff6fb5"];
const BUSHES = ["#7fd66b", "#3fc7a0", "#d6c94a", "#ff9a5b"];
const GRASS = ["#4fc79a", "#7fd86a", "#3fb0a8", "#b6d85a"];

// Árboles: tronco y tres copas facetadas que se mecen con el viento.
function Trees() {
 const trunkGeometry = useMemo(() => new THREE.CylinderGeometry(0.14, 0.26, 1, 6).translate(0, 0.5, 0), []);
 const trunkMaterial = useMemo(() => new THREE.MeshLambertMaterial({ color: "#5b3a78", flatShading: true }), []);
 const crownGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
 const crownMaterial = useMemo(() => addSway(new THREE.MeshLambertMaterial({ flatShading: true }), 0.09), []);

 const { trunks, crowns } = useMemo(() => {
  const trunks = [];
  const crowns = [];
  for (const tree of SCATTER.trees) {
   const height = 2.1 * tree.scale;
   trunks.push({ position: [tree.x, 0, tree.z], rotation: [0, tree.turn, 0], scale: [tree.scale, height, tree.scale] });
   const base = new THREE.Color(FOLIAGE[Math.floor(tree.seed * FOLIAGE.length)]);
   // Una copa grande arriba y dos menores a los lados, con tonos algo distintos.
   const blobs = [
    [0, height + 0.55 * tree.scale, 0, 1.25],
    [0.75, height - 0.05, 0.25, 0.85],
    [-0.6, height + 0.1, -0.45, 0.75],
   ];
   blobs.forEach(([dx, y, dz, size], i) => {
    const cos = Math.cos(tree.turn), sin = Math.sin(tree.turn);
    crowns.push({
     position: [tree.x + (dx * cos - dz * sin) * tree.scale, y, tree.z + (dx * sin + dz * cos) * tree.scale],
     rotation: [tree.seed * 3 + i, tree.turn + i, i * 1.3],
     scale: size * tree.scale,
     color: base.clone().offsetHSL(0, 0, (i - 1) * 0.045),
    });
   });
  }
  return { trunks, crowns };
 }, []);

 return (
  <>
   <Instances geometry={trunkGeometry} material={trunkMaterial} items={trunks} castShadow />
   <Instances geometry={crownGeometry} material={crownMaterial} items={crowns} colored castShadow />
  </>
 );
}

function Bushes() {
 const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
 const material = useMemo(() => addSway(new THREE.MeshLambertMaterial({ flatShading: true }), 0.05), []);
 const items = useMemo(
  () =>
   SCATTER.bushes.map((b) => ({
    position: [b.x, b.scale * 0.42, b.z],
    rotation: [b.seed * 2, b.turn, 0],
    scale: [b.scale, b.scale * 0.72, b.scale],
    color: BUSHES[Math.floor(b.seed * BUSHES.length)],
   })),
  [],
 );
 return <Instances geometry={geometry} material={material} items={items} colored castShadow receiveShadow />;
}

// Hierba: miles de briznas de tres caras que se doblan con el viento.
function Grass() {
 const geometry = useMemo(() => new THREE.ConeGeometry(0.075, 0.6, 3).translate(0, 0.3, 0), []);
 const material = useMemo(() => addSway(new THREE.MeshLambertMaterial({ flatShading: true }), 0.16, true), []);
 const items = useMemo(
  () =>
   SCATTER.grass.map((g) => ({
    position: [g.x, 0, g.z],
    rotation: [0, g.turn, 0],
    scale: [1, 0.6 + g.seed * 0.9, 1],
    color: GRASS[Math.floor(g.seed * GRASS.length)],
   })),
  [],
 );
 return <Instances geometry={geometry} material={material} items={items} colored />;
}

// Cristales luminosos: de día apenas brillan; de noche iluminan su alrededor.
function Crystals({ glow }) {
 const geometry = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ color: "#ffffff", emissive: "#ffffff", flatShading: true }), []);
 const haloMaterial = useMemo(
  () => new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }),
  [glow],
 );
 const haloGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
 useEffect(() => {
  const stop = [registerGlow(material, 0.35, 1.6), registerGlow(haloMaterial, 0, 0.55, "opacity")];
  return () => stop.forEach((off) => off());
 }, [material, haloMaterial]);

 const { shards, halos } = useMemo(() => {
  const shards = [];
  const halos = [];
  for (const c of SCATTER.crystals) {
   const color = c.seed > 0.5 ? "#5ff2ff" : "#ff7ae6";
   const pieces = [
    [0, 0.75, 0, 0.3, 1.0, 0],
    [0.42, 0.45, 0.1, 0.2, 0.62, 0.45],
    [-0.3, 0.38, -0.28, 0.17, 0.52, -0.5],
   ];
   for (const [dx, y, dz, width, height, tilt] of pieces) {
    shards.push({ position: [c.x + dx, y, c.z + dz], rotation: [tilt * 0.6, c.turn, tilt], scale: [width, height, width], color });
   }
   halos.push({ position: [c.x, 0.05, c.z], scale: 6.5, color });
  }
  return { shards, halos };
 }, []);

 return (
  <>
   <Instances geometry={geometry} material={material} items={shards} colored castShadow />
   <Instances geometry={haloGeometry} material={haloMaterial} items={halos} colored />
  </>
 );
}

// Farolas a los lados de los caminos, con su charco de luz por la noche.
function Lanterns({ glow }) {
 const postGeometry = useMemo(() => new THREE.BoxGeometry(0.13, 1.7, 0.13).translate(0, 0.85, 0), []);
 const postMaterial = useMemo(() => new THREE.MeshLambertMaterial({ color: "#3b2a5c", flatShading: true }), []);
 const headGeometry = useMemo(() => new THREE.BoxGeometry(0.4, 0.46, 0.4), []);
 const headMaterial = useMemo(() => new THREE.MeshLambertMaterial({ color: "#ffb347", emissive: "#ffa030" }), []);
 const poolGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
 const poolMaterial = useMemo(
  () =>
   new THREE.MeshBasicMaterial({ map: glow, color: "#ffb060", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }),
  [glow],
 );
 useEffect(() => {
  const stop = [registerGlow(headMaterial, 0.5, 3.2), registerGlow(poolMaterial, 0, 0.6, "opacity")];
  return () => stop.forEach((off) => off());
 }, [headMaterial, poolMaterial]);

 const at = (y, scale) => SCATTER.lanterns.map((l) => ({ position: [l.x, y, l.z], scale }));
 return (
  <>
   <Instances geometry={postGeometry} material={postMaterial} items={useMemo(() => at(0, 1), [])} castShadow />
   <Instances geometry={headGeometry} material={headMaterial} items={useMemo(() => at(1.9, 1), [])} />
   <Instances geometry={poolGeometry} material={poolMaterial} items={useMemo(() => at(0.06, 9), [])} />
  </>
 );
}

export function Nature() {
 const glow = useMemo(() => createGlowTexture(), []);
 useEffect(() => () => glow.dispose(), [glow]);
 return (
  <>
   <Trees />
   <Bushes />
   <Grass />
   <Crystals glow={glow} />
   <Lanterns glow={glow} />
  </>
 );
}
