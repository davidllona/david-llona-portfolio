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

// The Twisted Moon visto desde la nave. Como en el primer mundo, el planeta es
// la isla: al subir se curva hasta cerrarse en una esfera, con su laguna negra
// alrededor. Aquí va lo que le falta a esa esfera —la sombra del lado al que no
// llega la luna y un halo violeta— y el cielo de la órbita, desde el que se
// vuelve a The Living World.
const AIR = 12; // m sobre el suelo hasta donde llega la sombra: por encima de árboles y tejados
const FLAT = { flat: true };
const smooth = (a, b, x) => {
 const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
 return t * t * (3 - 2 * t);
};
const DESTINATIONS = [
 { id: "living", spot: SPOTS.upperRight, open: true, spin: 0.04 },
 { id: "cosmic", spot: SPOTS.lowerLeft, open: false, spin: -0.04 },
];

export function Space() {
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
  material.colorNode = vec3(0.02, 0.012, 0.05);
  material.opacityNode = smoothstep(0.2, -0.4, normalWorld.dot(shadeFrom)).mul(0.72).mul(shaded).mul(smoothstep(0.12, 0.5, normalView.dot(positionViewDirection)));
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
  // (La luna está muy baja: para la sombra se levanta algo, y así cae por el borde contrario.)
  shadeFrom.value.set(sunDirection.x, 0.45, sunDirection.z).normalize();
  air.current.scale.setScalar(radius * 2.8);
  air.current.quaternion.copy(camera.quaternion);
  air.current.material.opacity = closing * 0.34;
 });

 return (
  <group ref={group} visible={false}>
   <mesh ref={shade} name="sombra de la noche" geometry={ball} material={dark} frustumCulled={false} renderOrder={6} />
   <mesh ref={air} name="atmósfera" frustumCulled={false}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#8a5cff" transparent opacity={0} depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} userData={FLAT} />
   </mesh>
   <OrbitSky destinations={DESTINATIONS} onSky={onSky} />
  </group>
 );
}
