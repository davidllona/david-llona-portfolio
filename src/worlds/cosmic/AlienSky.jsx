import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { cameraPosition, color, densityFogFactor, float, mix, output, positionWorld, reference, renderGroup, texture, vec2, vec4 } from "three/tsl";
import { noiseTexture } from "../../experience/environment/noise";
import { celestial } from "../../experience/intro/skyModels";
import { rig } from "../../experience/state";
import { createGlowTexture } from "../../experience/textures";
import { sunDirection, uniforms } from "../../experience/theme";
import { createRingedPlanet } from "./models";

// El cielo de The Cosmic Lab: dos soles —el grande, de donde viene la luz, y
// otro pequeño y turquesa, bajo, al fondo— y un planeta con anillos enorme
// sobre el horizonte del norte, hacia donde mira la cámara. Se ven en los
// miradores (la plataforma y la antena) y al bajar con la nave. Y una neblina
// de color a ras de suelo.
const FLAT = { flat: true }; // (el cielo no se curva con el mundo)
const FAR = 2700; // m
const PLANET_AT = new THREE.Vector3(-0.24, 0.27, -0.93).normalize(); // 14° al oeste del norte, 16° sobre el horizonte
const PLANET_RADIUS = 250; // unos 5° de radio en el cielo; con los anillos, más del doble de ancho
const SECOND_SUN = new THREE.Vector3(0.52, 0.2, -0.83).normalize();
const LIGHT = [0.5, 0.55, 0.4]; // de dónde le da la luz al planeta de los anillos

// Neblina baja, de color: lo que queda por debajo de su techo se va perdiendo
// en ella con la distancia. Va en el nodo de niebla de la escena (como la de
// The Twisted Moon): la reciben todos los materiales sin tocarlos.
const MIST_TOP = 0.7, MIST_TINT = "#8ff0d6";
function createFog(scene) {
 const tint = reference("color", "color", scene.fog).setGroup(renderGroup);
 const density = reference("density", "float", scene.fog).setGroup(renderGroup);
 const { uTime, uSpace } = uniforms;
 const drift = vec2(uTime.mul(0.007), uTime.mul(0.004));
 const banks = texture(noiseTexture, positionWorld.xz.mul(0.024).add(drift)).r.add(texture(noiseTexture, positionWorld.xz.mul(0.06).sub(drift.mul(1.5))).g.mul(0.5));
 const top = float(MIST_TOP).add(banks.sub(0.75).mul(2.2));
 const depth = top.sub(positionWorld.y).max(0);
 const through = depth.mul(positionWorld.distance(cameraPosition)).div(cameraPosition.y.sub(positionWorld.y).max(0.7));
 const low = through.mul(-0.045).exp().oneMinus().mul(0.5).mul(uSpace.oneMinus());
 return vec4(mix(mix(output.rgb, color(MIST_TINT), low), tint, densityFogFactor(density)), output.a);
}

export function AlienSky() {
 const scene = useThree((state) => state.scene);
 const planet = useRef(null);
 const suns = useRef([]);
 const halos = useRef([]);
 const models = useMemo(() => {
  const made = createRingedPlanet();
  made.body.computeVertexNormals();
  return made;
 }, []);
 const glow = useMemo(() => createGlowTexture(), []);
 const material = useMemo(() => {
  const body = celestial(LIGHT, { ambient: 0.5, strength: 0.75 });
  const rings = celestial(LIGHT, { ambient: 0.75, strength: 0.4 });
  for (const one of [body, rings]) {
   one.userData.flat = true;
   one.depthWrite = false;
  }
  rings.side = THREE.DoubleSide;
  return { body, rings };
 }, []);
 useEffect(() => {
  scene.fogNode = createFog(scene);
  return () => {
   scene.fogNode = null;
   models.body.dispose();
   models.rings.dispose();
   glow.dispose();
   material.body.dispose();
   material.rings.dispose();
  };
 }, [scene, models, glow, material]);
 useFrame(({ camera }) => {
  // En órbita se ve el cielo de la órbita: este se retira (y vuelve a media bajada).
  const seen = Math.min(1, Math.max(0, (0.85 - rig.space) / 0.3));
  planet.current.visible = seen > 0.01;
  planet.current.position.copy(camera.position).addScaledVector(PLANET_AT, FAR);
  material.body.opacity = material.rings.opacity = seen;
  [sunDirection, SECOND_SUN].forEach((towards, i) => {
   const sun = suns.current[i], halo = halos.current[i];
   sun.visible = halo.visible = seen > 0.01;
   sun.position.copy(camera.position).addScaledVector(towards, FAR);
   halo.position.copy(sun.position);
   sun.quaternion.copy(camera.quaternion);
   halo.quaternion.copy(camera.quaternion);
   sun.material.opacity = seen;
   halo.material.opacity = (i ? 0.5 : 0.6) * seen;
  });
  if (import.meta.env.DEV) window.__world.ringed = planet.current; // para las pruebas automáticas
 });
 return (
  <>
   <group ref={planet} name="planeta con anillos" scale={PLANET_RADIUS} rotation={[0.42, 0.3, -0.32]} renderOrder={-8}>
    <mesh geometry={models.body} material={material.body} frustumCulled={false} renderOrder={-8} />
    <mesh geometry={models.rings} material={material.rings} frustumCulled={false} renderOrder={-7} />
   </group>
   {[
    { size: 150, tint: [2.6, 2.3, 1.5], halo: "#fff0b8", wide: 1100 },
    { size: 62, tint: [1.5, 2.5, 2.3], halo: "#8ff5e6", wide: 520 },
   ].map((sun, i) => (
    <group key={i}>
     <mesh ref={(node) => (halos.current[i] = node)} scale={sun.wide} renderOrder={-9} frustumCulled={false}>
      <planeGeometry />
      <meshBasicMaterial map={glow} color={sun.halo} transparent depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} userData={FLAT} />
     </mesh>
     <mesh ref={(node) => (suns.current[i] = node)} name={i ? "segundo sol" : "sol"} scale={sun.size} renderOrder={-8} frustumCulled={false}>
      <circleGeometry args={[1, 24]} />
      <meshBasicMaterial color={new THREE.Color(...sun.tint)} transparent toneMapped={false} fog={false} depthWrite={false} userData={FLAT} />
     </mesh>
    </group>
   ))}
  </>
 );
}
