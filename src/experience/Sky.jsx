import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { createGlowTexture } from "./textures";
import { current, sunDirection, uniforms } from "./theme";

// Cielo: una cúpula con degradado del horizonte al cenit, y el sol o la luna
// con su halo allí de donde viene la luz. Sigue a la cámara, así que nunca se
// llega a su borde. Desde el suelo apenas se ve (la cámara mira hacia abajo);
// luce al despegar con el cohete.
export function Sky() {
 const group = useRef(null);
 const orb = useRef(null);
 const halo = useRef(null);
 const glow = useMemo(() => createGlowTexture(), []);
 const dome = useMemo(
  () =>
   new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uSkyTop: uniforms.uSkyTop, uSkyHorizon: uniforms.uSkyHorizon },
    vertexShader: /* glsl */ `
     varying vec3 vDirection;
     void main() {
      vDirection = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
     }`,
    fragmentShader: /* glsl */ `
     uniform vec3 uSkyTop;
     uniform vec3 uSkyHorizon;
     varying vec3 vDirection;
     void main() {
      float up = smoothstep(-0.05, 0.55, normalize(vDirection).y);
      gl_FragColor = vec4(mix(uSkyHorizon, uSkyTop, up), 1.0);
      #include <colorspace_fragment>
     }`,
   }),
  [],
 );
 useEffect(
  () => () => {
   glow.dispose();
   dome.dispose();
  },
  [glow, dome],
 );

 useFrame(({ camera }) => {
  group.current.position.copy(camera.position);
  orb.current.position.copy(sunDirection).multiplyScalar(560);
  halo.current.position.copy(orb.current.position);
  orb.current.quaternion.copy(camera.quaternion);
  halo.current.quaternion.copy(camera.quaternion);
  // De día es un sol cálido y grande; de noche, una luna fría.
  const night = current.glow;
  orb.current.material.color.setRGB(2.4 - night * 0.9, 2.1 - night * 0.3, 1.5 + night * 0.9);
  halo.current.material.color.copy(current.sun);
  halo.current.material.opacity = 0.5 - night * 0.15;
  orb.current.scale.setScalar(30 - night * 8);
 });

 return (
  <group ref={group} renderOrder={-10}>
   <mesh material={dome}>
    <sphereGeometry args={[700, 24, 12]} />
   </mesh>
   <mesh ref={orb}>
    <circleGeometry args={[1, 20]} />
    <meshBasicMaterial toneMapped={false} fog={false} depthWrite={false} />
   </mesh>
   <mesh ref={halo} scale={190}>
    <planeGeometry />
    <meshBasicMaterial map={glow} transparent depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} />
   </mesh>
  </group>
 );
}
