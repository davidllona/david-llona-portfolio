import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { hash, instanceIndex, mix, positionLocal, sin, smoothstep, uniform, vec3 } from "three/tsl";
import { unlit } from "./materials";
import { createGlowTexture } from "./textures";
import { rig } from "./state";
import { current, registerGlow, sunDirection, theme, uniforms } from "./theme";

const FLAT = { flat: true };

// Generador con semilla: las estrellas salen siempre en el mismo sitio.
function seeded(seed) {
 let state = seed;
 return () => ((state = (state * 16807) % 2147483647) / 2147483647);
}

// Estrellas: plaquitas repartidas por la cúpula, mirando al centro. Solo se
// ven de noche. Cada una parpadea un poco, a su ritmo (lo calcula el sombreador).
function Stars({ count }) {
 const mesh = useRef(null);
 const { material, shown } = useMemo(() => {
  const shown = uniform(0);
  const material = unlit({ transparent: true, depthWrite: false, fog: false });
  material.userData.flat = true; // (el cielo no se curva con el mundo: ver environment/bend.js)
  const seed = hash(instanceIndex);
  const twinkle = sin(uniforms.uTime.mul(seed.mul(1.7).add(0.5)).add(seed.mul(60))).mul(0.3).add(0.7);
  material.colorNode = vec3(0.86, 0.9, 1.0);
  material.opacityNode = shown.mul(twinkle);
  return { material, shown };
 }, []);
 useEffect(() => {
  const random = seeded(4242);
  const helper = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
   // Solo en la mitad alta del cielo.
   const angle = random() * Math.PI * 2;
   const up = 0.04 + random() * 0.96;
   const flat = Math.sqrt(1 - up * up);
   helper.position.set(Math.cos(angle) * flat, up, Math.sin(angle) * flat).multiplyScalar(3100);
   helper.lookAt(0, 0, 0);
   helper.scale.setScalar((0.7 + random() ** 3 * 2.6) * 5);
   helper.updateMatrix();
   mesh.current.setMatrixAt(i, helper.matrix);
  }
  mesh.current.instanceMatrix.needsUpdate = true;
  const stop = registerGlow(shown, 0, 1, "value", { by: "night" }); // (al atardecer aún no hay estrellas)
  return () => {
   stop();
   material.dispose();
  };
 }, [count, material, shown]);
 return (
  <instancedMesh ref={mesh} args={[undefined, material, count]} frustumCulled={false}>
   <planeGeometry args={[1, 1]} />
  </instancedMesh>
 );
}

// Cielo: una cúpula con degradado del horizonte al cenit, las estrellas, y el
// sol o la luna con su halo allí de donde viene la luz. Sigue a la cámara, así
// que nunca se llega a su borde. Desde el suelo apenas se ve (la cámara mira
// hacia abajo); luce al despegar con el cohete. Va muy lejos (3,5 km): el
// planeta entero y los astros de la órbita quedan por delante.
export function Sky({ stars = 3000 }) {
 const group = useRef(null);
 const orb = useRef(null);
 const halo = useRef(null);
 const glow = useMemo(() => createGlowTexture(), []);
 const dome = useMemo(() => {
  const material = unlit({ side: THREE.BackSide, depthWrite: false, fog: false });
  material.userData.flat = true;
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
  orb.current.position.copy(sunDirection).multiplyScalar(2800);
  halo.current.position.copy(orb.current.position);
  orb.current.quaternion.copy(camera.quaternion);
  halo.current.quaternion.copy(camera.quaternion);
  // De día es un sol cálido y grande; al atardecer, más grande y naranja; de noche, una luna fría.
  const night = theme.mix, dusk = theme.dusk;
  orb.current.material.color.setRGB(2.4 - night * 0.9 + dusk * 0.5, 2.1 - night * 0.3 - dusk * 0.9, 1.5 + night * 0.9 - dusk * 1.0);
  halo.current.material.color.copy(current.sun);
  halo.current.material.opacity = 0.5 - night * 0.15 + dusk * 0.3;
  orb.current.scale.setScalar((30 - night * 8 + dusk * 12) * 5);
  // El cielo acompaña a la cámara cuando rodea el planeta en órbita: las estrellas no se arremolinan.
  group.current.rotation.y = rig.space > 0 ? rig.viewYaw : 0;
  // En la bienvenida la luna es la del islote (Welcome.jsx): esta no se ve.
  orb.current.visible = halo.current.visible = rig.intro < 1;
 });

 return (
  <group ref={group} renderOrder={-10}>
   <mesh material={dome}>
    <sphereGeometry args={[3500, 24, 12]} />
   </mesh>
   <Stars count={stars} />
   <mesh ref={orb}>
    <circleGeometry args={[1, 20]} />
    <meshBasicMaterial toneMapped={false} fog={false} depthWrite={false} userData={FLAT} />
   </mesh>
   <mesh ref={halo} scale={950}>
    <planeGeometry />
    <meshBasicMaterial map={glow} transparent depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} userData={FLAT} />
   </mesh>
  </group>
 );
}
