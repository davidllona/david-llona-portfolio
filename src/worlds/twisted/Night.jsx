import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { densityFogFactor, exponentialHeightFogFactor, float, fog, positionWorld, reference, renderGroup, texture, vec2 } from "three/tsl";
import { noiseTexture } from "../../experience/environment/noise";
import { celestial, createMoon } from "../../experience/intro/skyModels";
import { rig } from "../../experience/state";
import { createGlowTexture } from "../../experience/textures";
import { sunDirection, uniforms } from "../../experience/theme";

// La noche de The Twisted Moon: la luna, enorme y baja, y la niebla a ras de suelo.

// ── Niebla ──────────────────────────────────────────────────────────────────
// La niebla general de la escena (la de la distancia) se queda como está, y se
// le suma otra que solo existe pegada al suelo: lo que queda por debajo de su
// techo se va perdiendo en ella con la distancia, y el techo sube y baja a
// bancos que derivan despacio. Se hace en el nodo de niebla de la escena, así
// que la reciben todos los materiales —suelo, casas, árboles, personajes— sin
// tocarlos ni dibujar nada más. Desde la órbita desaparece.
const MIST_TOP = 1.5; // m: techo medio de la niebla baja
function createFog(scene) {
 const tint = reference("color", "color", scene.fog).setGroup(renderGroup);
 const density = reference("density", "float", scene.fog).setGroup(renderGroup);
 const { uTime, uSpace } = uniforms;
 const drift = vec2(uTime.mul(0.006), uTime.mul(0.0035));
 const banks = texture(noiseTexture, positionWorld.xz.mul(0.021).add(drift)).r.add(texture(noiseTexture, positionWorld.xz.mul(0.052).sub(drift.mul(1.6))).g.mul(0.5));
 const top = float(MIST_TOP).add(banks.sub(0.75).mul(2.4));
 const low = exponentialHeightFogFactor(float(0.034), top).mul(uSpace.oneMinus());
 return fog(tint, densityFogFactor(density).max(low));
}

// ── Luna ────────────────────────────────────────────────────────────────────
// Un astro de verdad, facetado y con cráteres, en el sitio de donde viene la
// luz. Llena buena parte del cielo del norte: la colina en espiral se recorta
// contra ella. Sigue a la cámara (nunca se llega a ella) y no se curva con el mundo.
const MOON_FAR = 2600; // m
const MOON_RADIUS = 520; // unos 11° de radio en el cielo
export function Night() {
 const scene = useThree((state) => state.scene);
 const group = useRef(null);
 const halo = useRef(null);
 const moon = useMemo(() => createMoon(), []);
 const glow = useMemo(() => createGlowTexture(), []);
 // (Su cara iluminada mira a la isla: se la ve llena, con el relieve marcado desde un lado.)
 const material = useMemo(() => {
  const one = celestial([0.5, 0.35, 0.8], { ambient: 0.5, strength: 0.62, contrast: 1.5 });
  one.userData.flat = true;
  return one;
 }, []);
 useEffect(() => {
  // La niebla baja entra con este mundo y se va con él.
  scene.fogNode = createFog(scene);
  return () => {
   scene.fogNode = null;
   moon.dispose();
   glow.dispose();
   material.dispose();
  };
 }, [scene, moon, glow, material]);
 useFrame(({ camera, clock }) => {
  group.current.position.copy(camera.position).addScaledVector(sunDirection, MOON_FAR);
  group.current.rotation.y = 0.6 + clock.elapsedTime * 0.004;
  halo.current.quaternion.copy(camera.quaternion);
  halo.current.position.copy(group.current.position);
  // En órbita se ve el cielo de la órbita, con su luna: esta se retira.
  const shown = 1 - Math.min(1, rig.space * 1.6);
  material.opacity = shown;
  halo.current.material.opacity = 0.42 * shown;
  group.current.visible = halo.current.visible = shown > 0.01;
  if (import.meta.env.DEV) window.__world.bigMoon = group.current; // para las pruebas automáticas
 });
 return (
  <>
   <mesh ref={halo} scale={MOON_RADIUS * 5.2} renderOrder={-9} frustumCulled={false}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#8f8cff" transparent depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} userData={{ flat: true }} />
   </mesh>
   <mesh ref={group} name="luna" geometry={moon} material={material} scale={MOON_RADIUS} renderOrder={-8} frustumCulled={false} />
  </>
 );
}
