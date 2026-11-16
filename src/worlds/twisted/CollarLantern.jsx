import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { color, normalView, uniform, vec3 } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { keepFlat } from "../../experience/environment/bend";
import { addWarmSource } from "../../experience/lightSources";
import { lambert } from "../../experience/materials";
import { player, woody } from "../../experience/state";
import { createGlowTexture } from "../../experience/textures";
import { glass, pool } from "./materials";
import { WARM, createCollarLantern } from "./models";
import { height } from "./layout";

// En este mundo Woody lleva un farolillo colgado del cuello. Cuelga bajo su
// garganta, se balancea al andar y alumbra de verdad: un charco de luz cálida
// que va con él. (Lo monta characters/Woody.jsx si el mundo lo trae: `woodyWears`.)
const at = new THREE.Vector3();
const moonRim = uniform(0); // cuánto contorno de luna lleva Woody (1 en este mundo; 0 fuera)
export function CollarLantern({ neck }) {
 const group = useRef(null);
 const halo = useRef(null);
 const floor = useRef(null);
 const swing = useRef({ x: 0, z: 0, angle: 0, speed: 0 });
 const model = useMemo(createCollarLantern, []);
 const glow = useMemo(() => createGlowTexture(), []);
 const material = useMemo(() => ({ iron: lambert(), lit: glass(WARM), light: pool("#ff9a3c", 0.42) }), []);
 useEffect(() => {
  // (Va con Woody, que no se curva con el planeta: tampoco su farol.)
  keepFlat(group.current);
  const stop = addWarmSource({ x: 0, y: 0, z: 0, power: 1.05, reach: 6.5, flicker: 0.08, color: "#ffa552" });
  swing.current.source = stop.source;
  return () => {
   stop();
   model.dispose();
   glow.dispose();
   material.iron.dispose();
   material.lit.dispose();
   material.light.dispose();
  };
 }, [model, glow, material]);
 // Woody es negro y aquí es de noche: se le da un contorno de luz de luna,
 // fría, en lo que mira de refilón a la cámara y hacia arriba. Solo en este
 // mundo: al llegar se le ponen unos materiales que lo llevan y, al irse, el
 // contorno se apaga (`moonRim`) pero los materiales se quedan: devolverle los
 // de antes obligaría a compilar en caliente al volver al otro mundo.
 useEffect(() => {
  if (!neck) return undefined;
  let root = neck;
  while (root.parent && !root.userData.materials) root = root.parent;
  const made = (root.userData.moonlit ??= new Map());
  const lit = (from) => {
   if (!from.isMeshLambertMaterial || from.isNodeMaterial) return from;
   if (!made.has(from)) {
    const material = new MeshLambertNodeMaterial({ color: from.color, flatShading: true });
    const n = normalView.normalize();
    const rim = n.z.abs().oneMinus().pow(2).mul(n.y.mul(0.5).add(0.75).clamp(0, 1));
    material.emissiveNode = color(from.emissive).mul(from.emissiveIntensity).add(vec3(0.3, 0.46, 0.95).mul(rim).mul(0.85).mul(moonRim));
    material.name = from.name;
    made.set(from, material);
   }
   return made.get(from);
  };
  root.traverse((node) => {
   if (node.isMesh) node.material = Array.isArray(node.material) ? node.material.map(lit) : lit(node.material);
  });
  moonRim.value = 1;
  return () => {
   moonRim.value = 0;
  };
 }, [neck]);
 useFrame(({ camera, clock }, delta) => {
  if (!neck) return;
  const state = swing.current;
  // Bajo la garganta, algo por delante del cuello.
  neck.getWorldPosition(at);
  const ahead = 0.16;
  at.x -= Math.sin(woody.facing) * ahead;
  at.z -= Math.cos(woody.facing) * ahead;
  at.y -= 0.27;
  // Se balancea con lo que se mueve Woody.
  const dt = Math.max(delta, 1e-3);
  const speed = Math.min(6, Math.hypot(at.x - state.x, at.z - state.z) / dt);
  state.x = at.x;
  state.z = at.z;
  state.speed += (speed - state.speed) * Math.min(1, delta * 6);
  state.angle = Math.sin(clock.elapsedTime * 9) * Math.min(0.5, state.speed * 0.09) + Math.sin(clock.elapsedTime * 1.7) * 0.05;
  group.current.position.copy(at);
  group.current.rotation.set(state.angle * Math.cos(woody.facing), woody.facing, state.angle * Math.sin(woody.facing) + state.angle * 0.6);
  group.current.visible = halo.current.visible = floor.current.visible = !player.hidden;
  halo.current.position.copy(at);
  halo.current.quaternion.copy(camera.quaternion);
  const ground = height(at.x, at.z);
  floor.current.position.set(at.x, ground + 0.06, at.z);
  // (La luz, algo por encima y por delante del farol: le da en la cara y en el lomo, no solo en la tripa.)
  if (state.source) Object.assign(state.source, { x: at.x - Math.sin(woody.facing) * 0.25, y: at.y + 0.62, z: at.z - Math.cos(woody.facing) * 0.25 });
 });
 return (
  <>
   <group ref={group} name="farolillo de Woody">
    <mesh geometry={model} material={material.iron} />
    <mesh position-y={-0.012} material={material.lit.material}>
     <boxGeometry args={[0.078, 0.092, 0.078]} />
    </mesh>
   </group>
   <mesh ref={halo} scale={0.75} renderOrder={3}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#ffa24e" transparent opacity={0.5} depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} userData={{ flat: true }} />
   </mesh>
   <mesh ref={floor} rotation-x={-Math.PI / 2} scale={4.2} material={material.light.material} renderOrder={2}>
    <planeGeometry />
   </mesh>
  </>
 );
}
