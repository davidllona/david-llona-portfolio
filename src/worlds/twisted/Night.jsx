import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { attribute, cameraPosition, color, densityFogFactor, float, mix, normalLocal, output, positionLocal, positionWorld, reference, renderGroup, smoothstep, texture, uniform, vec2, vec3, vec4 } from "three/tsl";
import { noiseTexture } from "../../experience/environment/noise";
import { createMoon } from "../../experience/intro/skyModels";
import { unlit } from "../../experience/materials";
import { rig } from "../../experience/state";
import { createGlowTexture } from "../../experience/textures";
import { uniforms } from "../../experience/theme";

// La noche de The Twisted Moon: la luna, enorme y baja, y la niebla a ras de suelo.

// ── Niebla ──────────────────────────────────────────────────────────────────
// La niebla general de la escena (la de la distancia) se queda como está, y se
// le suma otra que solo existe pegada al suelo: lo que queda por debajo de su
// techo se va perdiendo en ella con la distancia, y el techo sube y baja a
// bancos que derivan despacio. Se hace en el nodo de niebla de la escena, así
// que la reciben todos los materiales —suelo, casas, árboles, personajes— sin
// tocarlos ni dibujar nada más. Desde la órbita desaparece. Tiene su propio
// color, más pálido que la niebla del fondo: es la luna, que la alumbra.
const MIST_TOP = 0.9; // m: techo medio de la niebla baja (sobre la terraza de abajo; el mar queda dentro)
const MIST_TINT = "#56608f";
function createFog(scene) {
 const tint = reference("color", "color", scene.fog).setGroup(renderGroup);
 const density = reference("density", "float", scene.fog).setGroup(renderGroup);
 const { uTime, uSpace } = uniforms;
 const drift = vec2(uTime.mul(0.006), uTime.mul(0.0035));
 const banks = texture(noiseTexture, positionWorld.xz.mul(0.021).add(drift)).r.add(texture(noiseTexture, positionWorld.xz.mul(0.052).sub(drift.mul(1.6))).g.mul(0.5));
 const top = float(MIST_TOP).add(banks.sub(0.75).mul(2.6));
 // Cuánta niebla se atraviesa hasta llegar a cada punto: el espesor de la
 // capa sobre él, estirado según lo rasante que se mire. Desde arriba (la
 // cámara de juego) es un velo; a ras de suelo, a lo lejos, se lo traga todo.
 const depth = top.sub(positionWorld.y).max(0);
 const through = depth.mul(positionWorld.distance(cameraPosition)).div(cameraPosition.y.sub(positionWorld.y).max(0.7));
 const low = through.mul(-0.05).exp().oneMinus().mul(0.62).mul(uSpace.oneMinus());
 // Primero la niebla baja, pálida; encima, la del fondo, que se lo lleva todo a lo lejos.
 return vec4(mix(mix(output.rgb, color(MIST_TINT), low), tint, densityFogFactor(density)), output.a);
}

// ── Luna ────────────────────────────────────────────────────────────────────
// Creciente, enorme, blanca azulada: un astro de verdad, facetado y con
// cráteres, al que el sol le da casi por detrás; el resto del disco no se ve:
// solo el creciente y su halo. Está al norte, hacia donde mira la cámara, a la derecha de la
// torre del reloj y por encima de la isla: se ve desde los miradores (donde la
// cámara se inclina hacia el horizonte) y al bajar con la nave. Sigue a la
// cámara (nunca se llega a ella) y no se curva con el mundo.
const MOON_FAR = 2600; // m
const MOON_RADIUS = 262; // unos 5,8° de radio en el cielo: más de un cuarto del alto de la pantalla
const MOON_AT = new THREE.Vector3(0.2, 0.235, -0.95).normalize(); // 12° al este del norte, 13,5° sobre el horizonte
const MOON_TURN = 0.6; // giro fijo del astro: qué cráteres dan la cara
// De dónde le viene la luz al astro: de la derecha, algo de abajo y de detrás.
// Deja encendido menos de un tercio del disco: un creciente abierto hacia la torre.
const MOON_LIT = new THREE.Vector3(0.93, -0.185, -0.29).normalize();
export function Night() {
 const scene = useThree((state) => state.scene);
 const group = useRef(null);
 const halo = useRef(null);
 const moon = useMemo(() => createMoon(), []);
 const glow = useMemo(() => createGlowTexture(), []);
 // El lado encendido brilla (blanco azulado, por encima del umbral del
 // resplandor: lleva halo); el que queda en sombra apenas se adivina contra el cielo.
 const shown = useMemo(() => uniform(1), []);
 const material = useMemo(() => {
  const one = unlit({ transparent: true, fog: false, toneMapped: false, depthWrite: false });
  one.userData.flat = true;
  // La fase se calcula sobre la esfera lisa (un creciente limpio) y los cráteres solo la muerden un poco.
  // (El astro no gira sobre otro eje que el vertical: la luz se lleva a sus ejes una vez.)
  const from = MOON_LIT.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -MOON_TURN);
  const towards = vec3(from.x, from.y, from.z);
  const lit = mix(positionLocal.normalize().dot(towards), normalLocal.dot(towards), 0.22);
  const bright = smoothstep(-0.02, 0.2, lit);
  one.colorNode = attribute("color", "vec3").mul(vec3(1.0, 1.06, 1.22)).mul(lit.max(0).pow(0.6).mul(1.25).add(0.34)).mul(bright);
  // (Solo el creciente: la parte en sombra no se dibuja.)
  one.opacityNode = bright.mul(shown);
  return one;
 }, [shown]);
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
 useFrame(({ camera }) => {
  group.current.position.copy(camera.position).addScaledVector(MOON_AT, MOON_FAR);
  group.current.rotation.y = MOON_TURN;
  halo.current.quaternion.copy(camera.quaternion);
  halo.current.position.copy(group.current.position);
  // En órbita se ve el cielo de la órbita, con su luna: esta se retira.
  // (Aparece a media bajada: desde ahí la cámara mira hacia el horizonte y la luna entra en cuadro; ver Player.jsx.)
  const seen = Math.min(1, Math.max(0, (0.85 - rig.space) / 0.3));
  shown.value = seen;
  halo.current.material.opacity = 0.5 * seen;
  group.current.visible = halo.current.visible = seen > 0.01;
  if (import.meta.env.DEV) window.__world.bigMoon = group.current; // para las pruebas automáticas
 });
 return (
  <>
   <mesh ref={halo} scale={MOON_RADIUS * 6} renderOrder={-9} frustumCulled={false}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#9fb0ff" transparent depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} userData={{ flat: true }} />
   </mesh>
   <mesh ref={group} name="luna" geometry={moon} material={material} scale={MOON_RADIUS} renderOrder={-8} frustumCulled={false} />
  </>
 );
}
