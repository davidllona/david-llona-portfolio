import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { attribute, float, mix, normalView, positionLocal, sin, smoothstep, texture, vec2, vec3 } from "three/tsl";
import { noiseTexture } from "../../experience/environment/noise";
import { addWarmSource } from "../../experience/lightSources";
import { unlit } from "../../experience/materials";
import { createGreenhouse } from "./glasshouse";
import { GREENHOUSE, ground } from "./layout";
import { glass, moonlit, pool, solid } from "./materials";
import { WARM } from "./models";

// El invernadero (ver glasshouse.js): piedra y hierro, cristal casi
// transparente, plantas dentro y dos luces que salen por los cristales —la
// cálida del farol que cuelga del techo y la violeta de lo que florece— y caen
// al suelo alrededor.

// El cristal: apenas un velo verdoso que deja ver lo de dentro. Se ve más de
// refilón (ahí refleja el cielo) y lleva unas bandas de brillo en diagonal;
// los paños empañados (`tone`) son lechosos y a manchas.
function createGlassMaterial() {
 const material = unlit({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
 const tone = attribute("tone", "float");
 const grazing = normalView.z.abs().oneMinus().pow(2);
 const p = positionLocal;
 const sheen = smoothstep(0.82, 1, sin(p.x.mul(1.7).add(p.y.mul(2.6)).add(p.z.mul(1.9))).mul(0.5).add(0.5));
 const mist = texture(noiseTexture, vec2(p.x.add(p.y).mul(0.21), p.z.add(p.y).mul(0.21))).r.mul(0.7).add(0.5);
 material.colorNode = mix(mix(vec3(0.36, 0.62, 0.66), vec3(0.62, 0.76, 0.98), grazing), vec3(0.6, 0.66, 0.78), tone.mul(0.8));
 material.opacityNode = float(0.055).add(grazing.mul(0.24)).add(sheen.mul(0.07)).add(tone.mul(mist).mul(0.5)).clamp(0, 0.7);
 return material;
}

export function Greenhouse() {
 const model = useMemo(() => createGreenhouse(GREENHOUSE), []);
 const material = useMemo(() => {
  // Lo que brilla: por encima del umbral del resplandor (cada flor, con su color).
  const glow = unlit({ toneMapped: false });
  glow.colorNode = attribute("color", "vec3").mul(2.1);
  return {
   frame: moonlit(solid(), 0.04, 0.16),
   // (Lo que crece lleva algo de luz propia: dentro, entre hierros, no le llega la luna.)
   green: moonlit(solid({ side: THREE.DoubleSide }), 0.42, 0.25),
   glass: createGlassMaterial(),
   glow,
   lamp: glass(WARM),
   warm: pool("#ff9d45", 0.36),
   violet: pool("#a873ff", 0.24),
  };
 }, []);
 const y = ground(GREENHOUSE.x, GREENHOUSE.z);
 const plane = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
 // De los ejes del invernadero a los del mundo.
 const at = useMemo(() => {
  const c = Math.cos(GREENHOUSE.turn), s = Math.sin(GREENHOUSE.turn);
  return (px, py, pz) => [GREENHOUSE.x + px * c + pz * s, y + py, GREENHOUSE.z - px * s + pz * c];
 }, [y]);
 useEffect(() => {
  const lamp = at(...model.lampAt), back = at(0, 1.3, -GREENHOUSE.depth / 2 + 1);
  const stop = [addWarmSource({ x: lamp[0], y: lamp[1] - 0.3, z: lamp[2], power: 1.0, reach: 7.5, flicker: 0.05, color: "#ffa552" }), addWarmSource({ x: back[0], y: back[1], z: back[2], power: 0.7, reach: 6, flicker: 0.03, color: "#a070ff" })];
  return () => {
   stop.forEach((off) => off());
   Object.values(model).forEach((one) => one.dispose?.());
   plane.dispose();
   Object.values(material).forEach((one) => one.dispose());
  };
 }, [model, plane, material, at]);
 const front = at(0, 0.06, 0.8), rear = at(0, 0.06, -1.4);
 return (
  <>
   <group name="invernadero" userData={{ rests: 0 }} position={[GREENHOUSE.x, y - 0.04, GREENHOUSE.z]} rotation-y={GREENHOUSE.turn}>
    <mesh name="invernadero: piedra, hierro y bancales" geometry={model.frame} material={material.frame} castShadow receiveShadow />
    <mesh name="plantas del invernadero" geometry={model.green} material={material.green} />
    <mesh name="flores del invernadero" geometry={model.glow} material={material.glow} />
    <mesh name="farol del invernadero" geometry={model.lamp} material={material.lamp.material} />
    <mesh name="cristales del invernadero" geometry={model.glass} material={material.glass} renderOrder={2} />
   </group>
   {/* La luz que sale por los cristales y cae al suelo: cálida por delante, violeta por detrás. */}
   <mesh geometry={plane} material={material.warm.material} position={front} scale={[GREENHOUSE.width + 4.6, 1, GREENHOUSE.depth + 1.5]} rotation-y={GREENHOUSE.turn} renderOrder={2} />
   <mesh geometry={plane} material={material.violet.material} position={rear} scale={[GREENHOUSE.width + 3.6, 1, GREENHOUSE.depth + 1]} rotation-y={GREENHOUSE.turn} renderOrder={2} />
  </>
 );
}
