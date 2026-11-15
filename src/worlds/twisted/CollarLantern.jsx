import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
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
  const stop = addWarmSource({ x: 0, y: 0, z: 0, power: 0.72, reach: 6.5, flicker: 0.08, color: "#ffa552" });
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
  if (state.source) Object.assign(state.source, { x: at.x, y: at.y + 0.1, z: at.z });
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
