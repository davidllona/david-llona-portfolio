import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Label } from "./Label";
import { useInteractable } from "./interact";
import { emit, player, rig } from "./state";
import { registerGlow } from "./theme";
import { world } from "../worlds";

const PAD_COLOR = "#ffb238";

const ALTITUDE = 34; // m a los que se queda en órbita
const ASCENT = 5.5; // s de subida
const DESCENT = 4.5;
const SMOKE = 26;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// El cohete: cuerpo blanco, morro y aletas rojas, ojo de buey luminoso.
function Rocket({ flame }) {
 const flat = (color) => <meshLambertMaterial color={color} flatShading />;
 const glass = useMemo(() => new THREE.MeshLambertMaterial({ color: "#5ff2ff", emissive: "#3fd8ff" }), []);
 useEffect(() => registerGlow(glass, 0.7, 2.6), [glass]);
 return (
  <group>
   {/* Tres patas-aleta. */}
   {[0, 1, 2].map((i) => (
    <group key={i} rotation-y={(i * Math.PI * 2) / 3 + Math.PI / 6}>
     <mesh position={[0, 1.05, 1.5]} rotation-x={0.42} castShadow>
      <boxGeometry args={[0.22, 2.3, 1.0]} />
      {flat("#ff4f3a")}
     </mesh>
     <mesh position={[0, 0.08, 2.0]}>
      <cylinderGeometry args={[0.34, 0.4, 0.16, 8]} />
      {flat("#3b2a5c")}
     </mesh>
    </group>
   ))}
   {/* Tobera y faldón. */}
   <mesh position-y={0.95}>
    <cylinderGeometry args={[0.55, 0.85, 0.7, 10, 1, true]} />
    <meshLambertMaterial color="#2a2140" flatShading side={THREE.DoubleSide} />
   </mesh>
   <mesh position-y={1.65} castShadow>
    <cylinderGeometry args={[1.3, 0.75, 0.8, 10]} />
    {flat("#3b2a5c")}
   </mesh>
   {/* Cuerpo, franja y morro. */}
   <mesh position-y={3.9} castShadow>
    <cylinderGeometry args={[1.18, 1.3, 3.7, 10]} />
    {flat("#fbf3e4")}
   </mesh>
   <mesh position-y={5.3}>
    <cylinderGeometry args={[1.2, 1.24, 0.45, 10]} />
    {flat("#ffb238")}
   </mesh>
   <mesh position-y={6.95} castShadow>
    <coneGeometry args={[1.18, 2.4, 10]} />
    {flat("#ff4f3a")}
   </mesh>
   <mesh position-y={8.3}>
    <sphereGeometry args={[0.13, 8, 6]} />
    <meshBasicMaterial color="#ffcf4a" toneMapped={false} />
   </mesh>
   {/* Ojo de buey, mirando a la cámara, y puerta. */}
   <mesh position={[0, 4.4, 1.2]} rotation-x={Math.PI / 2}>
    <cylinderGeometry args={[0.62, 0.62, 0.16, 14]} />
    {flat("#3b2a5c")}
   </mesh>
   <mesh position={[0, 4.4, 1.27]} rotation-x={Math.PI / 2} material={glass}>
    <cylinderGeometry args={[0.46, 0.46, 0.1, 14]} />
   </mesh>
   <mesh position={[0, 2.75, 1.27]}>
    <boxGeometry args={[0.8, 1.3, 0.08]} />
    {flat("#d9d2e6")}
   </mesh>
   {/* Llama: solo se ve en vuelo. */}
   <mesh ref={flame} position-y={-0.3} rotation-x={Math.PI} visible={false}>
    <coneGeometry args={[0.6, 2.6, 8, 1, true]} />
    <meshBasicMaterial color="#ffd27a" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} />
   </mesh>
  </group>
 );
}

// La nave y su viaje: subes, despega, se queda en órbita viendo el planeta
// entero, y vuelve a aterrizar cuando quieras.
export function Ship() {
 const SHIP = world.ship;
 const ship = useRef(null);
 const flame = useRef(null);
 const smoke = useRef([]);
 const flight = useRef({ phase: "idle", time: 0, nextSmoke: 0, smokeTimer: 0 });
 const focus = useMemo(() => new THREE.Vector3(), []);
 const ringMaterial = useMemo(() => new THREE.MeshLambertMaterial({ color: PAD_COLOR, emissive: PAD_COLOR }), []);
 useEffect(() => registerGlow(ringMaterial, 0.5, 2.4), [ringMaterial]);

 const launch = () => {
  flight.current = { ...flight.current, phase: "ascending", time: 0 };
  player.hidden = player.frozen = true;
  player.velocity.set(0, 0, 0);
  world.shipCollider.active = false;
  rig.shake = 0.5;
  emit("toast", { text: "¡Despegue!" });
 };
 const land = () => {
  flight.current = { ...flight.current, phase: "descending", time: 0 };
 };

 const click = useInteractable({
  position: SHIP,
  radius: 6.2,
  priority: 2,
  hint: () => (flight.current.phase === "orbit" ? "Aterrizar" : "Subir a la nave"),
  enabled: () => flight.current.phase === "idle" || flight.current.phase === "orbit",
  action: () => (flight.current.phase === "orbit" ? land() : launch()),
 });

 // Si el componente se desmonta en pleno vuelo, el jugador no se queda atrapado.
 useEffect(
  () => () => {
   player.hidden = player.frozen = false;
   world.shipCollider.active = true;
   Object.assign(rig, { focus: null, distance: 1, tilt: 0, space: 0 });
  },
  [],
 );

 useFrame(({ clock }, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  const state = flight.current;
  const time = clock.elapsedTime;
  let height = 0;
  let progress = 0; // 0 en tierra, 1 en órbita

  if (state.phase === "ascending") {
   state.time += dt;
   progress = ease(Math.min(state.time / ASCENT, 1));
   if (state.time >= ASCENT) {
    state.phase = "orbit";
    emit("toast", { text: "En órbita" });
   }
  } else if (state.phase === "descending") {
   state.time += dt;
   progress = 1 - ease(Math.min(state.time / DESCENT, 1));
   if (state.time >= DESCENT) {
    state.phase = "idle";
    // De vuelta en tierra: el astronauta sale por delante de la nave.
    player.position.set(SHIP.x, 0, SHIP.z + SHIP.padRadius + 0.9);
    player.facing = Math.PI;
    player.hidden = player.frozen = false;
    world.shipCollider.active = true;
    Object.assign(rig, { focus: null, distance: 1, tilt: 0, space: 0 });
   }
  } else if (state.phase === "orbit") {
   progress = 1;
  }
  height = progress * ALTITUDE;

  const flying = state.phase !== "idle";
  const drift = state.phase === "orbit" ? 1 : progress;
  ship.current.position.set(
   SHIP.x + Math.sin(time * 0.3) * 3 * drift,
   height + (flying ? Math.sin(time * 1.7) * 0.25 * drift : 0),
   SHIP.z + Math.cos(time * 0.3) * 3 * drift,
  );
  ship.current.rotation.y = flying ? time * 0.25 * drift : 0;
  // En órbita se ve desde muy lejos: se agranda un poco para que no se pierda.
  ship.current.scale.setScalar(1 + progress * 1.1);

  if (flying) {
   // La cámara deja de seguir al jugador: mira al planeta entero desde arriba.
   focus.set(SHIP.x * (1 - progress * 0.85), height * 0.28, SHIP.z * (1 - progress * 0.97));
   rig.focus = focus;
   rig.distance = 1 + progress * 6.8;
   rig.tilt = progress;
   rig.space = Math.min(1, progress * 1.3);
   if (state.phase !== "orbit") rig.shake = Math.max(rig.shake, 0.22 * (1 - Math.abs(progress - 0.3)));
  }

  // Llama y humo mientras los motores empujan.
  const thrust = state.phase === "ascending" || state.phase === "descending";
  flame.current.visible = thrust || state.phase === "orbit";
  const flicker = 0.8 + Math.sin(time * 40) * 0.12 + Math.sin(time * 23) * 0.08;
  flame.current.scale.set(flicker, (thrust ? 1.2 : 0.45) * flicker, flicker);

  state.smokeTimer -= dt;
  if (thrust && height < 16 && state.smokeTimer <= 0) {
   state.smokeTimer = 0.05;
   const puff = smoke.current[state.nextSmoke++ % SMOKE];
   const angle = Math.random() * Math.PI * 2;
   puff.position.set(ship.current.position.x, Math.max(0.3, height * 0.5), ship.current.position.z);
   puff.userData = { life: 1, vx: Math.cos(angle) * (2 + Math.random() * 3), vz: Math.sin(angle) * (2 + Math.random() * 3) };
   puff.visible = true;
  }
  for (const puff of smoke.current) {
   if (!puff?.visible) continue;
   const data = puff.userData;
   data.life -= dt * 0.7;
   if (data.life <= 0) {
    puff.visible = false;
    continue;
   }
   puff.position.x += data.vx * dt;
   puff.position.z += data.vz * dt;
   puff.position.y = Math.max(0.3, puff.position.y - dt * 2.5);
   puff.scale.setScalar(0.5 + (1 - data.life) * 2.2);
   puff.material.opacity = data.life * 0.7;
  }
 });

 return (
  <>
   {/* Plataforma de despegue. */}
   <group position={[SHIP.x, 0, SHIP.z]}>
    <mesh position-y={0.1} receiveShadow>
     <cylinderGeometry args={[SHIP.padRadius, SHIP.padRadius + 0.3, 0.2, 24]} />
     <meshLambertMaterial color="#3b2a5c" flatShading />
    </mesh>
    <mesh position-y={0.21} rotation-x={-Math.PI / 2} material={ringMaterial}>
     <ringGeometry args={[SHIP.padRadius - 0.75, SHIP.padRadius - 0.45, 40]} />
    </mesh>
    <Label text="NAVE" color={PAD_COLOR} width={2.4} position={[0, 0.17, SHIP.padRadius + 1.6]} plate flat />
   </group>

   <group ref={ship} position={[SHIP.x, 0, SHIP.z]} {...click}>
    <Rocket flame={flame} />
    {/* Zona de clic generosa. */}
    <mesh position-y={4.2}>
     <cylinderGeometry args={[2.3, 2.3, 8.6, 10]} />
     <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
   </group>

   {Array.from({ length: SMOKE }, (_, i) => (
    <mesh key={i} ref={(node) => (smoke.current[i] = node)} visible={false}>
     <icosahedronGeometry args={[0.6, 1]} />
     <meshBasicMaterial color="#fff1e0" transparent opacity={0} depthWrite={false} />
    </mesh>
   ))}
  </>
 );
}
