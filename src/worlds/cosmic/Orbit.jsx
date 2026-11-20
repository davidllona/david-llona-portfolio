import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { normalView, normalWorld, positionViewDirection, smoothstep, uniform, vec3 } from "three/tsl";
import { PLANET, bendPoint } from "../../experience/environment/bend";
import { unlit } from "../../experience/materials";
import { rig } from "../../experience/state";
import { createGlowTexture } from "../../experience/textures";
import { sunDirection } from "../../experience/theme";
import { WORLD_NAMES } from "../index";
import { OrbitSky, SPOTS } from "../orbit/OrbitSky";

// The Cosmic Lab visto desde la nave. Como en los otros dos mundos, el planeta
// es el mundo: al subir se curva hasta cerrarse en una esfera. Aquí va lo que
// le falta a esa esfera —la sombra del lado al que no llega el sol y un halo
// turquesa— y el cielo de la órbita, desde el que se vuelve a los otros dos.
const AIR = 11; // m sobre el suelo hasta donde llega la sombra: por encima de hongos y cúpulas
const FLAT = { flat: true };
const smooth = (a, b, x) => {
 const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
 return t * t * (3 - 2 * t);
};
const DESTINATIONS = [
 { id: "living", spot: SPOTS.upperRight, open: true, spin: 0.04, hotkey: "V" },
 { id: "twisted", spot: SPOTS.lowerLeft, open: true, spin: -0.04, hotkey: "B" },
];

export function Orbit() {
 const group = useRef(null);
 const shade = useRef(null);
 const air = useRef(null);
 const shaded = useMemo(() => uniform(0), []);
 const shadeFrom = useMemo(() => uniform(new THREE.Vector3(0, 1, 0)), []);
 const glow = useMemo(() => createGlowTexture(), []);
 const ball = useMemo(() => new THREE.IcosahedronGeometry(1, 6), []);
 const dark = useMemo(() => {
  const material = unlit({ transparent: true, depthWrite: false, fog: false });
  material.userData.flat = true;
  material.colorNode = vec3(0.05, 0.02, 0.12);
  material.opacityNode = smoothstep(0.12, -0.42, normalWorld.dot(shadeFrom)).mul(0.72).mul(shaded).mul(smoothstep(0.12, 0.5, normalView.dot(positionViewDirection)));
  return material;
 }, [shaded, shadeFrom]);
 useEffect(
  () => () => {
   glow.dispose();
   ball.dispose();
   dark.dispose();
  },
  [glow, ball, dark],
 );
 const onSky = useMemo(
  () => (sky) => {
   if (import.meta.env.DEV) window.__world.space = { group: group.current, sky, radius: PLANET.radius, bendPoint, names: DESTINATIONS.map((one) => WORLD_NAMES[one.id].name.toUpperCase()), open: DESTINATIONS.filter((one) => one.open).map((one) => one.id) }; // para las pruebas automáticas
  },
  [],
 );

 useFrame(({ camera }) => {
  // Solo existe en vuelo.
  group.current.visible = rig.space > 0.004 || rig.bend > 0;
  if (!group.current.visible) return;
  const closing = smooth(0.6, 1, rig.bend);
  const radius = PLANET.radius / Math.max(rig.bend, 0.05);
  shade.current.visible = air.current.visible = closing > 0;
  shade.current.position.y = air.current.position.y = -radius;
  shade.current.scale.setScalar(radius + AIR);
  shaded.value = closing;
  // (La luz viene de muy arriba: para la sombra se tumba, y así cae por el borde contrario al sol.)
  shadeFrom.value.set(sunDirection.x, 0.3, sunDirection.z).normalize();
  air.current.scale.setScalar(radius * 2.75);
  air.current.quaternion.copy(camera.quaternion);
  air.current.material.opacity = closing * 0.4;
 });

 return (
  <group ref={group} visible={false}>
   <mesh ref={shade} name="sombra del lado sin sol" geometry={ball} material={dark} frustumCulled={false} renderOrder={6} />
   <mesh ref={air} name="atmósfera" frustumCulled={false}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#5ff0d2" transparent opacity={0} depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} userData={FLAT} />
   </mesh>
   <OrbitSky destinations={DESTINATIONS} onSky={onSky} />
  </group>
 );
}
