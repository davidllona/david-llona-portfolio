import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mix, positionLocal, smoothstep } from "three/tsl";
import { unlit } from "./materials";
import { createGlowTexture } from "./textures";
import { current, registerGlow, sunDirection, uniforms } from "./theme";

// Generador con semilla: las estrellas salen siempre en el mismo sitio.
function seeded(seed) {
 let state = seed;
 return () => ((state = (state * 16807) % 2147483647) / 2147483647);
}

// Estrellas: plaquitas repartidas por la cúpula, mirando al centro. Solo se ven de noche.
function Stars({ count }) {
 const mesh = useRef(null);
 const material = useMemo(() => new THREE.MeshBasicMaterial({ color: "#eaf2ff", transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false }), []);
 useEffect(() => {
  const random = seeded(4242);
  const helper = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
   // Solo en la mitad alta del cielo.
   const angle = random() * Math.PI * 2;
   const up = 0.04 + random() * 0.96;
   const flat = Math.sqrt(1 - up * up);
   helper.position.set(Math.cos(angle) * flat, up, Math.sin(angle) * flat).multiplyScalar(620);
   helper.lookAt(0, 0, 0);
   helper.scale.setScalar(0.7 + random() ** 3 * 2.6);
   helper.updateMatrix();
   mesh.current.setMatrixAt(i, helper.matrix);
  }
  mesh.current.instanceMatrix.needsUpdate = true;
  const stop = registerGlow(material, 0, 1, "opacity");
  return () => {
   stop();
   material.dispose();
  };
 }, [count, material]);
 return (
  <instancedMesh ref={mesh} args={[undefined, material, count]} frustumCulled={false}>
   <planeGeometry args={[1, 1]} />
  </instancedMesh>
 );
}

// Cielo: una cúpula con degradado del horizonte al cenit, las estrellas, y el
// sol o la luna con su halo allí de donde viene la luz. Sigue a la cámara, así
// que nunca se llega a su borde. Desde el suelo apenas se ve (la cámara mira
// hacia abajo); luce al despegar con el cohete.
export function Sky({ stars = 3000 }) {
 const group = useRef(null);
 const orb = useRef(null);
 const halo = useRef(null);
 const glow = useMemo(() => createGlowTexture(), []);
 const dome = useMemo(() => {
  const material = unlit({ side: THREE.BackSide, depthWrite: false, fog: false });
  material.colorNode = mix(uniforms.uSkyHorizon, uniforms.uSkyTop, smoothstep(-0.05, 0.55, positionLocal.normalize().y));
  return material;
 }, []);
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
   <Stars count={stars} />
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
