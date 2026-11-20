import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mix, normalView, normalWorld, positionViewDirection, smoothstep, uniform, vec3 } from "three/tsl";
import { PLANET, bendPoint, uClosed } from "../../experience/environment/bend";
import { unlit } from "../../experience/materials";
import { rig } from "../../experience/state";
import { createGlowTexture } from "../../experience/textures";
import { current, sunDirection, uniforms } from "../../experience/theme";
import { WORLD_NAMES } from "../index";
import { OrbitSky, SPOTS } from "../orbit/OrbitSky";

// Lo que el planeta necesita para verse como tal desde la nave. EL PLANETA ES
// LA ISLA: no hay otro modelo. Al subir, el mundo entero se curva (ver
// experience/environment/bend.js) hasta cerrarse en una esfera de 32 m de
// radio, con la isla ocupando casi todo el hemisferio que se ve y su mar
// alrededor, hasta el borde. Aquí solo va lo que le falta a esa esfera:
//  · un fondo de mar opaco, que se curva con todo lo demás y la cierra por
//    debajo del agua (que es translúcida) hasta el antípoda;
//  · la sombra del lado de noche y el halo de la atmósfera;
//  · el cielo de la órbita (worlds/orbit/OrbitSky.jsx): estrellas, la luna y,
//    a lo lejos, los otros dos mundos del porfolio como destinos: The Twisted
//    Moon y The Cosmic Lab. Se eligen desde aquí y la nave viaja hasta ellos.
const SEA_FLOOR = -4.7; // m: por debajo del fondo de la isla
const SEA_REACH = 150; // m: como el mar (water/Water.jsx)
const AIR = 11; // m sobre el suelo hasta donde llega la sombra de la noche: por encima de árboles y casas
const FLAT = { flat: true }; // (lo que no se curva con el mundo)
const COARSE = { coarse: true }; // (ya viene en anillos: no hay que partirlo más; ver `splitLongFaces`)

const smooth = (a, b, x) => {
 const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
 return t * t * (3 - 2 * t);
};

// Fondo del mar: un disco en anillos, bajo el agua. Sin curvar tiene el color
// del horizonte (no se distingue); curvado, el del mar hondo.
function createSeaBed() {
 return new THREE.RingGeometry(34, SEA_REACH, 96, 30).rotateX(-Math.PI / 2);
}
function createSeaBedMaterial() {
 const material = unlit();
 material.colorNode = mix(uniform(current.background), uniforms.uWaterDeep.mul(0.78), uClosed);
 return material;
}
// Sombra del lado de noche: una esfera algo mayor que el planeta, transparente
// donde da la luz y oscura donde no llega. La luz de la isla viene de muy
// arriba (su lado de noche quedaría detrás, donde no se mira): para esta
// sombra se tumba, y así se ve caer por el borde contrario al sol.
function createShadeMaterial(shown, from) {
 const material = unlit({ transparent: true, depthWrite: false, fog: false });
 material.userData.flat = true;
 material.colorNode = vec3(0.012, 0.016, 0.06);
 // (Hacia su propio borde se desvanece: lo que oscurece es el planeta, no un disco a su alrededor.)
 material.opacityNode = smoothstep(0.12, -0.42, normalWorld.dot(from)).mul(0.8).mul(shown).mul(smoothstep(0.12, 0.5, normalView.dot(positionViewDirection)));
 return material;
}

// Los otros mundos, vistos desde esta órbita.
const DESTINATIONS = [
 { id: "twisted", spot: SPOTS.upperRight, open: true, spin: 0.05 },
 { id: "cosmic", spot: SPOTS.lowerLeft, open: true, spin: -0.04, hotkey: "B" },
];

export function Space() {
 const group = useRef(null);
 const shade = useRef(null);
 const air = useRef(null);
 const shaded = useMemo(() => uniform(0), []);
 const shadeFrom = useMemo(() => uniform(new THREE.Vector3(0, 1, 0)), []);
 const glow = useMemo(() => createGlowTexture(), []);
 const models = useMemo(() => ({ bed: createSeaBed(), shade: new THREE.IcosahedronGeometry(1, 6) }), []);
 const material = useMemo(() => ({ bed: createSeaBedMaterial(), shade: createShadeMaterial(shaded, shadeFrom) }), [shaded, shadeFrom]);
 useEffect(
  () => () => {
   glow.dispose();
   Object.values(models).forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  },
  [glow, models, material],
 );
 // Para las pruebas automáticas.
 const onSky = useMemo(
  () => (sky) => {
   if (import.meta.env.DEV) window.__world.space = { group: group.current, sky, radius: PLANET.radius, bendPoint, names: DESTINATIONS.map((one) => WORLD_NAMES[one.id].name.toUpperCase()), open: DESTINATIONS.filter((one) => one.open).map((one) => one.id) };
  },
  [],
 );

 useFrame(({ camera }) => {
  // Solo existe en vuelo.
  group.current.visible = rig.space > 0.004 || rig.bend > 0;
  if (!group.current.visible) return;
  // La sombra y el halo siguen a la esfera mientras se cierra: su centro está
  // a un radio (el de ese momento) bajo el polo. Solo se ven con ella ya casi cerrada.
  const closing = smooth(0.6, 1, rig.bend);
  const radius = PLANET.radius / Math.max(rig.bend, 0.05);
  shade.current.visible = air.current.visible = closing > 0;
  shade.current.position.y = air.current.position.y = -radius;
  shade.current.scale.setScalar(radius + AIR);
  shaded.value = closing;
  shadeFrom.value.set(sunDirection.x, 0.3, sunDirection.z).normalize();
  air.current.scale.setScalar(radius * 2.75);
  air.current.quaternion.copy(camera.quaternion);
  air.current.material.opacity = closing * (0.42 - current.glow * 0.14);
 });

 return (
  <group ref={group} visible={false}>
   <mesh name="fondo del mar" geometry={models.bed} material={material.bed} position-y={SEA_FLOOR} frustumCulled={false} userData={COARSE} />
   <mesh ref={shade} name="sombra de la noche" geometry={models.shade} material={material.shade} frustumCulled={false} renderOrder={6} />
   <mesh ref={air} name="atmósfera" frustumCulled={false}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#4fa8ff" transparent opacity={0} depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} userData={FLAT} />
   </mesh>
   <OrbitSky destinations={DESTINATIONS} onSky={onSky} />
  </group>
 );
}
