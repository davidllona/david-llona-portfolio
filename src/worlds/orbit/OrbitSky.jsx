import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { uniform, vec3 } from "three/tsl";
import { clickable } from "../../experience/interact";
import { celestial, createGlobe, createMoon } from "../../experience/intro/skyModels";
import { unlit } from "../../experience/materials";
import { ORBIT_VIEW, rig, voyage } from "../../experience/state";
import { fontReady } from "../../ui/fonts";
import { WORLD_NAMES } from "../index";
import { randomFrom } from "../living/kit/geometry";
import { travelTo } from "../travel";
import { createAlienWorld, createTwistedWorld } from "./worldModels";

// El cielo de la órbita, común a todos los mundos: estrellas por todo
// alrededor, la luna y, a lo lejos, los otros mundos del porfolio como
// destinos. Los que están abiertos se eligen desde aquí: un clic (o un toque)
// sobre el astro o su rótulo, o la tecla V, y la nave viaja hasta él. Los que
// aún no existen llevan «Próximamente» y no hacen nada.
const FLAT = { flat: true }; // (lo que no se curva con el mundo)
const MODELS = { living: createGlobe, twisted: createTwistedWorld, cosmic: createAlienWorld };
const smooth = (a, b, x) => {
 const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
 return t * t * (3 - 2 * t);
};

// Dónde va cada astro en la vista de la órbita: grados a la derecha y hacia
// arriba del centro de la pantalla, a qué distancia de la cámara y su radio.
// (La cámara de la órbita está en `ORBIT_VIEW`, en experience/state.js.)
export const SPOTS = {
 moon: { right: -22, up: 10.5, far: 1500, radius: 58 },
 upperRight: { right: 23.5, up: 8.5, far: 1750, radius: 66 },
 lowerLeft: { right: -21, up: -11.5, far: 1650, radius: 60 },
};
// Hacia dónde mira esa cámara, y qué es «derecha» y «arriba» en su pantalla.
const VIEW = (() => {
 const camera = new THREE.Vector3(...ORBIT_VIEW.camera);
 const forward = new THREE.Vector3(...ORBIT_VIEW.focus).sub(camera).normalize();
 const side = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
 return { camera, forward, side, above: new THREE.Vector3().crossVectors(side, forward) };
})();
function placeInView({ right, up, far }) {
 const { camera, forward, side, above } = VIEW;
 return camera.clone().addScaledVector(forward.clone().addScaledVector(side, Math.tan((right * Math.PI) / 180)).addScaledVector(above, Math.tan((up * Math.PI) / 180)).normalize(), far);
}
const LIGHT = [-0.42, 0.78, 0.46];
const touch = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

// Rótulo de un mundo: su nombre y, debajo, una pastilla: «Próximamente» si
// sigue cerrado o cómo viajar a él si está abierto. En la letra del juego.
function createWorldLabel(name, pill, open) {
 const canvas = document.createElement("canvas");
 canvas.width = 1024;
 canvas.height = 320;
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 const draw = () => {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
  // (Se reduce la letra hasta que el nombre quepa con margen.)
  let size = 118;
  do {
   size -= 6;
   ctx.font = `800 ${size}px "Bricolage Grotesque", system-ui, sans-serif`;
  } while (ctx.measureText(name).width > 930 && size > 48);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, 512, 104);
  if ("letterSpacing" in ctx) ctx.letterSpacing = open ? "7px" : "10px";
  ctx.font = '700 58px "Bricolage Grotesque", system-ui, sans-serif';
  const wide = ctx.measureText(pill).width + 84;
  // Abierto: pastilla clara, como un botón. Cerrado: la naranja de siempre.
  ctx.fillStyle = open ? "rgba(255, 255, 255, 0.96)" : "rgba(255, 178, 56, 0.95)";
  ctx.beginPath();
  ctx.roundRect(512 - wide / 2, 186, wide, 96, 48);
  ctx.fill();
  ctx.fillStyle = "#1a1330";
  ctx.fillText(pill, 512 + 4, 237);
  texture.needsUpdate = true;
 };
 draw();
 fontReady('800 112px "Bricolage Grotesque"').then(draw);
 return texture;
}

// Estrellas de la órbita: por todo alrededor (las del cielo del planeta solo
// están arriba; desde la nave se mira hacia abajo). Una sola malla con
// instancias, lejos, detrás de todo.
function OrbitStars({ shown, count = 900 }) {
 const mesh = useRef(null);
 const material = useMemo(() => {
  const one = unlit({ transparent: true, depthWrite: false, fog: false });
  one.userData.flat = true;
  one.colorNode = vec3(0.86, 0.9, 1.0);
  one.opacityNode = shown;
  return one;
 }, [shown]);
 useEffect(() => {
  const random = randomFrom(0.4242);
  const helper = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
   const y = random() * 2 - 1, angle = random() * Math.PI * 2, flat = Math.sqrt(1 - y * y);
   helper.position.set(Math.cos(angle) * flat, y, Math.sin(angle) * flat).multiplyScalar(3000);
   helper.lookAt(0, 0, 0);
   helper.scale.setScalar((0.7 + random() ** 3 * 2.6) * 5);
   helper.updateMatrix();
   mesh.current.setMatrixAt(i, helper.matrix);
  }
  mesh.current.instanceMatrix.needsUpdate = true;
  return () => material.dispose();
 }, [count, material]);
 return (
  <instancedMesh ref={mesh} name="estrellas de la órbita" args={[undefined, material, count]} frustumCulled={false} renderOrder={-5}>
   <planeGeometry args={[1, 1]} />
  </instancedMesh>
 );
}

// Un mundo a lo lejos, con su rótulo debajo. `open`: se puede viajar a él.
function Destination({ id, spot, open, labels, spin }) {
 const body = useRef(null);
 const label = useRef(null);
 const name = WORLD_NAMES[id].name.toUpperCase();
 const position = useMemo(() => placeInView(spot), [spot]);
 const geometry = useMemo(() => MODELS[id](), [id]);
 const material = useMemo(() => {
  const one = celestial(LIGHT, { ambient: id === "living" ? 0.2 : 0.3, strength: id === "living" ? 1.0 : 0.9 });
  one.userData.flat = true;
  return one;
 }, [id]);
 const texture = useMemo(() => createWorldLabel(name, open ? (touch() ? "TOCA PARA VIAJAR" : "VIAJAR · TECLA V") : "PRÓXIMAMENTE", open), [name, open]);
 useEffect(
  () => () => {
   texture.dispose();
   geometry.dispose();
   material.dispose();
  },
  [texture, geometry, material],
 );
 const at = useMemo(() => new THREE.Vector3(), []);
 // Sale hacia él la nave, si está en órbita y no hay ya un viaje en marcha.
 const go = useMemo(
  () => () => {
   if (!open || !voyage.canLeave) return;
   travelTo(id, body.current.getWorldPosition(at));
  },
  [id, open, at],
 );
 useEffect(() => {
  const entry = { mesh: label.current, material, open, id, go, body: body.current };
  labels.push(entry);
  return () => void labels.splice(labels.indexOf(entry), 1);
 }, [labels, material, open, id, go]);
 useFrame(({ clock }) => {
  body.current.rotation.y = clock.elapsedTime * spin;
 });
 const click = open ? clickable(go) : {};
 return (
  <group position={position}>
   <group rotation={[0.3, 0, 0.35]}>
    <mesh ref={body} geometry={geometry} material={material} scale={spot.radius} {...click} />
   </group>
   {/* El rótulo, debajo del astro en la pantalla. */}
   <mesh ref={label} position={VIEW.above.clone().multiplyScalar(-spot.radius * 1.75)} {...click}>
    <planeGeometry args={[spot.radius * 3.5, (spot.radius * 3.5 * 320) / 1024]} />
    <meshBasicMaterial map={texture} transparent opacity={0} depthWrite={false} fog={false} toneMapped={false} userData={FLAT} />
   </mesh>
  </group>
 );
}

// `destinations`: [{ id, spot, open, spin }]; `onSky`: recibe el grupo del
// cielo (para las pruebas).
export function OrbitSky({ destinations, onSky }) {
 const sky = useRef(null);
 const moon = useRef(null);
 const stars = useRef(null);
 const labels = useMemo(() => [], []);
 const facing = useMemo(() => new THREE.Quaternion(), []);
 const starlight = useMemo(() => uniform(0), []);
 const moonModel = useMemo(() => createMoon(), []);
 const moonMaterial = useMemo(() => {
  const one = celestial(LIGHT, { ambient: 0.22, strength: 0.95, contrast: 1.6 });
  one.userData.flat = true;
  return one;
 }, []);
 const moonAt = useMemo(() => placeInView(SPOTS.moon), []);
 useEffect(
  () => () => {
   moonModel.dispose();
   moonMaterial.dispose();
  },
  [moonModel, moonMaterial],
 );
 useEffect(() => {
  onSky?.(sky.current);
  // Tecla V: viajar al mundo abierto (hoy solo hay uno por órbita).
  const onKey = (event) => {
   if (event.code !== "KeyV" || event.repeat || event.metaKey || event.ctrlKey) return;
   labels.find((entry) => entry.open)?.go();
  };
  // Viaje pedido desde fuera (el menú): la nave necesita saber hacia dónde queda.
  voyage.spot = (id) => labels.find((entry) => entry.id === id)?.body.getWorldPosition(new THREE.Vector3()) ?? null;
  window.addEventListener("keydown", onKey);
  return () => {
   window.removeEventListener("keydown", onKey);
   voyage.spot = null;
  };
 }, [labels, onSky]);

 useFrame(({ camera, clock }) => {
  const space = rig.space;
  // El cielo de la órbita acompaña a la cámara cuando esta rodea el planeta:
  // luna y mundos lejanos se quedan en su sitio de la pantalla y lo que gira es el planeta.
  sky.current.rotation.y = rig.viewYaw ?? 0;
  const far = smooth(0.55, 1, space);
  // (De noche ya están las del cielo del planeta por arriba: estas completan el resto.)
  starlight.value = far * 0.9;
  stars.current.position.copy(camera.position);
  moonMaterial.opacity = far;
  moon.current.rotation.y = clock.elapsedTime * 0.01;
  // Los rótulos miran a la cámara (son hijos del cielo, que gira: se deshace ese giro).
  facing.copy(sky.current.quaternion).invert().multiply(camera.quaternion);
  for (const entry of labels) {
   entry.material.opacity = far;
   entry.mesh.quaternion.copy(facing);
   entry.mesh.material.opacity = smooth(0.8, 1, space);
   // El destino abierto late un poco: se nota que se puede pulsar.
   entry.mesh.scale.setScalar(entry.open ? 1 + Math.sin(clock.elapsedTime * 2.4) * 0.035 : 1);
  }
 });

 return (
  <>
   <group ref={stars}>
    <OrbitStars shown={starlight} />
   </group>
   <group ref={sky}>
    <mesh ref={moon} name="luna de la órbita" geometry={moonModel} material={moonMaterial} position={moonAt} scale={SPOTS.moon.radius} />
    {destinations.map((one) => (
     <Destination key={one.id} {...one} labels={labels} />
    ))}
   </group>
  </>
 );
}
