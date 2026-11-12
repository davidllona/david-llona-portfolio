import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { input, player, rig } from "./state";
import { WATER_LEVEL, movePlayer, terrainHeight } from "./world";

const WALK_SPEED = 4.8; // m/s
const RUN_SPEED = 8;
const WATER_DRAG = 0.55; // en el agua se anda más despacio
const STICK_RUN_THRESHOLD = 0.92; // joystick empujado a fondo = correr
const GROUND_RESPONSE = 12; // rapidez con la que se alcanza la velocidad deseada
const AIR_RESPONSE = 2.5;
const GRAVITY = 15;
const JUMP_SPEED = 6;
const MAX_STEP = 0.05; // s; evita saltos al volver a la pestaña
const TURN_RESPONSE = 13;

// Cámara elevada que sigue al personaje desde el sur. `rig` puede pedirle que
// siga otra cosa (la nave), que se aleje o que mire más desde arriba.
const CAMERA = { height: 16.5, back: 14.5, lookAhead: 1.5, response: 4.5, fov: 40 };

const SUIT = "#fbf3e4";
const ORANGE = "#ff6b2c";
const NAVY = "#241a4d";

// El astronauta: cabezón, con visera grande, mochila y botas de color. Brazos
// y piernas cuelgan de un pivote para poder balancearlos al andar.
function Astronaut({ parts }) {
 const flat = (color) => <meshLambertMaterial color={color} flatShading />;
 const part = (name) => (node) => (parts.current[name] = node);
 return (
  <group ref={part("body")} scale={1.3}>
   {/* Piernas y botas. */}
   {[-1, 1].map((side) => (
    <group key={side} ref={part(`leg${side}`)} position={[side * 0.15, 0.46, 0]}>
     <mesh position-y={-0.2} castShadow>
      <boxGeometry args={[0.2, 0.36, 0.22]} />
      {flat(SUIT)}
     </mesh>
     <mesh position={[0, -0.39, -0.04]} castShadow>
      <boxGeometry args={[0.23, 0.14, 0.34]} />
      {flat(ORANGE)}
     </mesh>
    </group>
   ))}

   <group ref={part("torso")}>
    {/* Torso, cinturón y panel del pecho. */}
    <RoundedBox args={[0.6, 0.52, 0.42]} radius={0.12} smoothness={2} position-y={0.74} castShadow>
     {flat(SUIT)}
    </RoundedBox>
    <mesh position-y={0.5}>
     <boxGeometry args={[0.62, 0.08, 0.44]} />
     {flat(ORANGE)}
    </mesh>
    <mesh position={[0, 0.78, -0.215]}>
     <boxGeometry args={[0.28, 0.17, 0.03]} />
     {flat(NAVY)}
    </mesh>
    {[
     [-0.08, "#5ff2ff"],
     [0, "#ffcf4a"],
     [0.08, "#ff5d8f"],
    ].map(([x, color]) => (
     <mesh key={x} position={[x, 0.78, -0.235]}>
      <boxGeometry args={[0.045, 0.045, 0.02]} />
      <meshBasicMaterial color={color} toneMapped={false} />
     </mesh>
    ))}

    {/* Mochila con dos depósitos y antena. */}
    <RoundedBox args={[0.46, 0.5, 0.24]} radius={0.08} smoothness={2} position={[0, 0.78, 0.31]} castShadow>
     {flat("#b9bfd6")}
    </RoundedBox>
    {[-1, 1].map((side) => (
     <mesh key={side} position={[side * 0.12, 0.8, 0.45]}>
      <cylinderGeometry args={[0.07, 0.07, 0.4, 8]} />
      {flat(ORANGE)}
     </mesh>
    ))}
    <mesh position={[0.17, 1.2, 0.33]}>
     <cylinderGeometry args={[0.012, 0.012, 0.42, 5]} />
     {flat(NAVY)}
    </mesh>
    <mesh position={[0.17, 1.43, 0.33]}>
     <sphereGeometry args={[0.05, 8, 6]} />
     <meshBasicMaterial color="#ff5d8f" toneMapped={false} />
    </mesh>

    {/* Brazos y guantes. */}
    {[-1, 1].map((side) => (
     <group key={side} ref={part(`arm${side}`)} position={[side * 0.37, 0.93, 0]}>
      <mesh position-y={-0.17} castShadow>
       <capsuleGeometry args={[0.085, 0.2, 3, 8]} />
       {flat(SUIT)}
      </mesh>
      <mesh position-y={-0.37}>
       <sphereGeometry args={[0.1, 8, 6]} />
       {flat(ORANGE)}
      </mesh>
     </group>
    ))}

    {/* Collar. */}
    <mesh position-y={1.02}>
     <cylinderGeometry args={[0.25, 0.27, 0.09, 12]} />
     {flat(ORANGE)}
    </mesh>
    {/* Cabeza, algo echada hacia atrás para que la visera se vea desde arriba:
        casco, visera grande con un reflejo, franja de color y auriculares. */}
    <group position-y={1.34} rotation-x={0.34}>
     <mesh scale={[1.08, 1, 1.06]} castShadow>
      <icosahedronGeometry args={[0.38, 2]} />
      {flat(SUIT)}
     </mesh>
     <mesh position={[0, 0.02, -0.2]} scale={[1.04, 0.84, 0.8]}>
      <icosahedronGeometry args={[0.31, 2]} />
      <meshLambertMaterial color={NAVY} emissive="#4a3fb0" emissiveIntensity={0.7} flatShading />
     </mesh>
     <mesh position={[0.1, 0.12, -0.44]} rotation={[0.5, 0, -0.5]}>
      <boxGeometry args={[0.15, 0.045, 0.02]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
     </mesh>
     <mesh position={[0, 0.3, 0.1]} rotation-x={-0.35}>
      <boxGeometry args={[0.14, 0.12, 0.5]} />
      {flat(ORANGE)}
     </mesh>
     {[-1, 1].map((side) => (
      <mesh key={side} position={[side * 0.4, -0.02, 0.02]} rotation-z={Math.PI / 2}>
       <cylinderGeometry args={[0.11, 0.11, 0.08, 10]} />
       {flat(ORANGE)}
      </mesh>
     ))}
    </group>
   </group>
  </group>
 );
}

const PUFFS = 10;

export function Player({ active }) {
 const camera = useThree((state) => state.camera);
 const aspect = useThree((state) => state.size.width / state.size.height);
 const group = useRef(null);
 const shadow = useRef(null);
 const parts = useRef({});
 const puffs = useRef([]);
 const body = useRef({
  grounded: true,
  stride: 0,
  puffTimer: 0,
  nextPuff: 0,
  focus: new THREE.Vector3(player.position.x, 0, player.position.z),
  distance: 1,
  tilt: 0,
  started: false,
 });
 const reducedMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

 // En vertical la cámara se aleja: se conserva el ancho de escena visible.
 const portrait = Math.max(1, 1.15 / aspect);

 useEffect(() => {
  camera.fov = CAMERA.fov;
  camera.updateProjectionMatrix();
  if (import.meta.env.DEV) window.__world.camera = camera; // para las pruebas automáticas
 }, [camera]);

 // Polvo al correr y ondas al andar por el agua: una nube o un aro que crece y se apaga.
 const spawnPuff = (x, y, z, water) => {
  const puff = puffs.current[body.current.nextPuff++ % PUFFS];
  if (!puff) return;
  puff.position.set(x, y, z);
  puff.userData = { life: 1, water };
  puff.visible = true;
 };

 useFrame(({ clock }, rawDelta) => {
  const dt = Math.min(rawDelta, MAX_STEP);
  const state = body.current;
  const { position, velocity } = player;
  const { keys, stick } = input;
  const controllable = active && !player.frozen;

  // Movimiento relativo a la pantalla: arriba es el norte (-Z), derecha el este (+X).
  const side = controllable ? Number(keys.right) - Number(keys.left) + stick.x : 0;
  const ahead = controllable ? Number(keys.forward) - Number(keys.back) - stick.y : 0;
  const length = Math.hypot(side, ahead);
  const inWater = position.y < WATER_LEVEL - 0.08;
  const running = keys.run || Math.hypot(stick.x, stick.y) > STICK_RUN_THRESHOLD;
  const speed = Math.min(length, 1) * (running ? RUN_SPEED : WALK_SPEED) * (inWater ? WATER_DRAG : 1);
  const wishX = length > 0 ? (side / length) * speed : 0;
  const wishZ = length > 0 ? (-ahead / length) * speed : 0;

  // Aceleración y frenado suaves, independientes de los fps.
  const blend = 1 - Math.exp(-(state.grounded ? GROUND_RESPONSE : AIR_RESPONSE) * dt);
  velocity.x += (wishX - velocity.x) * blend;
  velocity.z += (wishZ - velocity.z) * blend;

  if (input.jumpQueued) {
   input.jumpQueued = false;
   if (controllable && state.grounded) {
    velocity.y = JUMP_SPEED;
    state.grounded = false;
   }
  }

  if (!player.frozen) {
   const moved = movePlayer(position, velocity.x * dt, velocity.z * dt);
   if (!(moved & 1)) velocity.x = 0;
   if (!(moved & 2)) velocity.z = 0;

   // Gravedad y suelo (que baja en la orilla y en el lago).
   const ground = terrainHeight(position.x, position.z);
   velocity.y -= GRAVITY * dt;
   position.y += velocity.y * dt;
   if (position.y <= ground || (state.grounded && velocity.y <= 0 && position.y - ground < 0.3)) {
    if (!state.grounded && velocity.y < -4) spawnPuff(position.x, Math.max(ground, WATER_LEVEL) + 0.05, position.z, inWater);
    position.y = ground;
    velocity.y = 0;
    state.grounded = true;
   } else {
    state.grounded = false;
   }
  }

  // El personaje mira hacia donde anda.
  const groundSpeed = Math.hypot(velocity.x, velocity.z);
  if (groundSpeed > 0.5) player.facing = Math.atan2(-velocity.x, -velocity.z);
  let turn = player.facing - group.current.rotation.y;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  group.current.rotation.y += turn * Math.min(1, dt * TURN_RESPONSE);
  group.current.position.copy(position);
  group.current.visible = !player.hidden;

  // Andar: piernas y brazos alternos, el cuerpo se inclina y da pequeños botes.
  const walking = state.grounded ? Math.min(groundSpeed / WALK_SPEED, 1.5) : 0;
  state.stride += groundSpeed * dt * 2.3;
  const swing = reducedMotion ? 0 : Math.sin(state.stride) * Math.min(walking, 1.2);
  const { body: figure, torso } = parts.current;
  parts.current["leg-1"].rotation.x = swing * 0.75;
  parts.current.leg1.rotation.x = -swing * 0.75;
  parts.current["arm-1"].rotation.x = -swing * 0.8;
  parts.current.arm1.rotation.x = swing * 0.8;
  // En el aire, brazos arriba.
  const airborne = state.grounded ? 0 : 1;
  parts.current["arm-1"].rotation.z = -airborne * 1.1;
  parts.current.arm1.rotation.z = airborne * 1.1;
  torso.position.y = reducedMotion ? 0 : Math.abs(Math.cos(state.stride)) * 0.05 * walking + Math.sin(clock.elapsedTime * 2.2) * 0.012;
  figure.rotation.x = -Math.min(walking, 1.4) * 0.13;

  // Polvo al correr; ondas en el agua.
  state.puffTimer -= dt;
  if (state.grounded && !player.hidden && state.puffTimer <= 0 && groundSpeed > (inWater ? 0.8 : WALK_SPEED + 0.6)) {
   state.puffTimer = inWater ? 0.28 : 0.14;
   spawnPuff(position.x, inWater ? WATER_LEVEL + 0.02 : position.y + 0.08, position.z, inWater);
  }
  for (const puff of puffs.current) {
   if (!puff?.visible) continue;
   const data = puff.userData;
   data.life -= dt * (data.water ? 1.1 : 2.4);
   if (data.life <= 0) {
    puff.visible = false;
    continue;
   }
   const grow = 1 - data.life;
   if (data.water) puff.scale.set(0.5 + grow * 2.6, 0.06, 0.5 + grow * 2.6);
   else puff.scale.setScalar(0.2 + grow * 0.5);
   puff.material.opacity = data.life * (data.water ? 0.55 : 0.5);
   if (!data.water) puff.position.y += dt * 0.5;
  }

  // Sombra de contacto bajo los pies cuando salta.
  const ground = terrainHeight(position.x, position.z);
  shadow.current.visible = !player.hidden && position.y - ground > 0.05;
  shadow.current.position.set(position.x, Math.max(ground, WATER_LEVEL) + 0.03, position.z);

  // Cámara.
  const target = rig.focus ?? position;
  const follow = state.started ? 1 - Math.exp(-CAMERA.response * dt) : 1;
  state.started = true;
  state.focus.x += (target.x - state.focus.x) * follow;
  state.focus.y += ((rig.focus ? target.y : target.y * 0.5) - state.focus.y) * follow;
  state.focus.z += (target.z - (rig.focus ? 0 : CAMERA.lookAhead) - state.focus.z) * follow;
  state.distance += (rig.distance * portrait - state.distance) * follow * 0.6;
  state.tilt += ((rig.focus ? rig.tilt ?? 0 : 0) - state.tilt) * follow * 0.6;

  rig.shake = Math.max(0, rig.shake - dt * 1.6);
  const shake = reducedMotion ? 0 : rig.shake * rig.shake;
  const offsetY = CAMERA.height * state.distance;
  const offsetZ = CAMERA.back * state.distance * (1 - state.tilt * 0.82);
  camera.position.set(
   state.focus.x + (Math.random() - 0.5) * shake,
   state.focus.y + offsetY + (Math.random() - 0.5) * shake,
   state.focus.z + offsetZ,
  );
  camera.lookAt(state.focus.x, state.focus.y, state.focus.z);
 });

 return (
  <>
   <group ref={group}>
    <Astronaut parts={parts} />
   </group>
   <mesh ref={shadow} rotation-x={-Math.PI / 2} visible={false}>
    <circleGeometry args={[0.4, 20]} />
    <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
   </mesh>
   {Array.from({ length: PUFFS }, (_, i) => (
    <mesh key={i} ref={(node) => (puffs.current[i] = node)} visible={false}>
     <icosahedronGeometry args={[0.5, 1]} />
     <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
    </mesh>
   ))}
  </>
 );
}
