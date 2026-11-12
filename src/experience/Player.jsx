import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Astronaut } from "../characters/Astronaut";
import { world } from "../worlds";
import { moveAgent } from "../worlds/collision";
import { updateSeeThrough } from "./environment/seeThrough";
import { WELCOME, emit, input, player, rig, ui } from "./state";

const WALK_SPEED = 3.6; // m/s
const RUN_SPEED = 6.2;
const WATER_DRAG = 0.55; // en el agua se anda más despacio
const STICK_RUN_THRESHOLD = 0.92; // joystick empujado a fondo = correr
const GROUND_RESPONSE = 12; // rapidez con la que se alcanza la velocidad deseada
const AIR_RESPONSE = 2.5;
const GRAVITY = 15;
const JUMP_SPEED = 6;
const MAX_STEP = 0.05; // s; evita saltos al volver a la pestaña
const TURN_RESPONSE = 13;

// Cámara cercana que sigue al personaje desde el sur, inclinada 39° sobre el
// suelo: el astronauta ocupa en torno al 17 % del alto de la pantalla. `rig`
// puede pedirle que siga otra cosa (la nave), que se aleje o que mire más desde
// arriba; el usuario la acerca y la aleja con la rueda o el pellizco (`rig.zoom`).
const CAMERA_DISTANCE = 13.4; // m hasta el punto que mira
const CAMERA_PITCH = (39 * Math.PI) / 180;
const CAMERA = { height: CAMERA_DISTANCE * Math.sin(CAMERA_PITCH), back: CAMERA_DISTANCE * Math.cos(CAMERA_PITCH), lookAhead: 0.5, lookUp: 1.0, response: 4.5, fov: 40 };

const PUFFS = 10;

// El controlador del jugador: lee la entrada, mueve al astronauta por el
// mundo activo (colisiones, relieve, agua, salto) y lleva la cámara. El aspecto
// y la animación del personaje están en characters/Astronaut.jsx.
export function Player({ active }) {
 const camera = useThree((state) => state.camera);
 const look = useMemo(() => new THREE.Vector3(), []);
 const introPoint = useMemo(() => new THREE.Vector3(), []);
 const aspect = useThree((state) => state.size.width / state.size.height);
 const group = useRef(null);
 const shadow = useRef(null);
 const puffs = useRef([]);
 const body = useRef({
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

 useFrame(({ size }, rawDelta) => {
  const dt = Math.min(rawDelta, MAX_STEP);
  const state = body.current;
  const { position, velocity } = player;
  const { keys, stick } = input;
  // Durante el descenso de la bienvenida aún no se maneja.
  const controllable = active && !player.frozen && !player.gesture && !ui.open && rig.intro < 0.12;
  const waterLevel = world.waterLevel;

  // Movimiento relativo a la pantalla: arriba es el norte (-Z), derecha el este (+X).
  const side = controllable ? Number(keys.right) - Number(keys.left) + stick.x : 0;
  const ahead = controllable ? Number(keys.forward) - Number(keys.back) - stick.y : 0;
  const length = Math.hypot(side, ahead);
  const inWater = position.y < waterLevel - 0.08;
  const running = keys.run || Math.hypot(stick.x, stick.y) > STICK_RUN_THRESHOLD;
  const speed = Math.min(length, 1) * (running ? RUN_SPEED : WALK_SPEED) * (inWater ? WATER_DRAG : 1);
  const wishX = length > 0 ? (side / length) * speed : 0;
  const wishZ = length > 0 ? (-ahead / length) * speed : 0;

  // Aceleración y frenado suaves, independientes de los fps.
  const blend = 1 - Math.exp(-(player.grounded ? GROUND_RESPONSE : AIR_RESPONSE) * dt);
  velocity.x += (wishX - velocity.x) * blend;
  velocity.z += (wishZ - velocity.z) * blend;

  if (input.jumpQueued) {
   input.jumpQueued = false;
   if (controllable && player.grounded) {
    velocity.y = JUMP_SPEED;
    emit("sound", { id: "jump" });
    player.grounded = false;
   }
  }

  if (!player.frozen) {
   const moved = moveAgent(world, position, velocity.x * dt, velocity.z * dt);
   if (!(moved & 1)) velocity.x = 0;
   if (!(moved & 2)) velocity.z = 0;

   // Gravedad y suelo (que sube y baja con el relieve).
   const ground = world.height(position.x, position.z);
   velocity.y -= GRAVITY * dt;
   position.y += velocity.y * dt;
   if (position.y <= ground || (player.grounded && velocity.y <= 0 && position.y - ground < 0.35)) {
    if (!player.grounded && velocity.y < -4) spawnPuff(position.x, Math.max(ground, waterLevel) + 0.05, position.z, inWater);
    position.y = ground;
    velocity.y = 0;
    player.grounded = true;
   } else {
    player.grounded = false;
   }
  }

  // El personaje mira hacia donde anda.
  const groundSpeed = Math.hypot(velocity.x, velocity.z);
  if (groundSpeed > 0.5) player.facing = Math.atan2(-velocity.x, -velocity.z);
  let turn = player.facing - group.current.rotation.y;
  turn = Math.atan2(Math.sin(turn), Math.cos(turn));
  group.current.rotation.y += turn * Math.min(1, dt * TURN_RESPONSE);
  group.current.position.copy(position);

  // Polvo al correr; ondas en el agua.
  state.puffTimer -= dt;
  if (player.grounded && !player.hidden && state.puffTimer <= 0 && groundSpeed > (inWater ? 0.8 : WALK_SPEED + 0.6)) {
   state.puffTimer = inWater ? 0.28 : 0.14;
   spawnPuff(position.x, inWater ? waterLevel + 0.02 : position.y + 0.08, position.z, inWater);
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
  const ground = world.height(position.x, position.z);
  shadow.current.visible = !player.hidden && position.y - ground > 0.05;
  shadow.current.position.set(position.x, Math.max(ground, waterLevel) + 0.03, position.z);

  // Cámara.
  const target = rig.focus ?? position;
  // Si lo seguido aparece de golpe lejos (un salto de sitio, no un paseo), la
  // cámara se coloca sin barrido: con el encuadre cercano tardaría en llegar.
  const jumped = !rig.focus && Math.hypot(target.x - state.focus.x, target.z - state.focus.z) > 10;
  const follow = state.started && !jumped ? 1 - Math.exp(-CAMERA.response * dt) : 1;
  state.started = true;
  state.focus.x += (target.x - state.focus.x) * follow;
  state.focus.y += (target.y - state.focus.y) * follow * (rig.focus ? 1 : 0.5);
  state.focus.z += (target.z - (rig.focus ? 0 : CAMERA.lookAhead) - state.focus.z) * follow;
  state.distance += (rig.distance * rig.zoom * portrait - state.distance) * follow * 0.6;
  state.tilt += ((rig.focus ? rig.tilt ?? 0 : 0) - state.tilt) * follow * 0.6;

  rig.shake = Math.max(0, rig.shake - dt * 1.6);
  const shake = reducedMotion ? 0 : rig.shake * rig.shake;
  // (La altura se cuenta desde el punto al que se mira, para que la inclinación sea la dicha.)
  const lookUp = rig.focus ? 0 : CAMERA.lookUp;
  const offsetY = lookUp + CAMERA.height * state.distance;
  const offsetZ = CAMERA.back * state.distance * (1 - state.tilt * 0.82);
  camera.position.set(
   state.focus.x + (Math.random() - 0.5) * shake,
   state.focus.y + offsetY + (Math.random() - 0.5) * shake,
   state.focus.z + offsetZ,
  );
  // Se mira a la altura del pecho del astronauta, no a sus pies.
  look.set(state.focus.x, state.focus.y + lookUp, state.focus.z);
  // Bienvenida: la cámara está en el islote y, al entrar, viaja hasta aquí.
  if (rig.intro > 0) {
   const pose = aspect < 1 ? WELCOME.tall : WELCOME.wide;
   const k = rig.intro * rig.intro * (3 - 2 * rig.intro);
   const [ox, oy, oz] = WELCOME.origin;
   camera.position.lerp(introPoint.set(ox + pose.camera[0], oy + pose.camera[1], oz + pose.camera[2]), k);
   look.lerp(introPoint.set(ox + pose.look[0], oy + pose.look[1], oz + pose.look[2]), k);
  }
  camera.lookAt(look);
  camera.updateMatrixWorld();
  updateSeeThrough(camera, size);
 });

 return (
  <>
   <group ref={group}>
    <Astronaut />
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
