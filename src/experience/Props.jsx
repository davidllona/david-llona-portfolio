import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useInteractable } from "./interact";
import { emit, player, rig } from "./state";
import { world } from "../worlds";
import { PLAYER_RADIUS, pushOut } from "../worlds/collision";

// Objetos sueltos: cajas que se empujan y barriles que explotan. Su física es
// muy simple: cada uno es un círculo visto desde arriba que se desliza por el
// suelo, choca con el jugador, con los demás y con lo fijo, y se frena solo.

const FRICTION = 2.4;
const BLAST_RADIUS = 7.5;
const CHAIN_RADIUS = 4; // un barril hace estallar a otro que esté así de cerca
const RESPAWN_TIME = 4.5;

function createBodies() {
 return world.props.map((item, id) => ({
  ...item,
  id,
  home: { x: item.x, z: item.z },
  r: item.type === "crate" ? 0.58 : 0.46,
  vx: 0,
  vz: 0,
  spin: 0,
  turn: (id * 1.7) % Math.PI,
  gone: 0, // segundos que le quedan desaparecido tras explotar
  appear: 1, // 0 → 1 al reaparecer
 }));
}

// ── Explosiones ─────────────────────────────────────────────────────────────
const CHUNKS = 28;
const BLASTS = 4;
const FIRE = ["#fff1a8", "#ffb347", "#ff6b2c", "#ff3d2e", "#3b2a44"].map((c) => new THREE.Color(c));

function Explosions({ pool }) {
 const meshes = useRef([]);
 const flashes = useRef([]);
 const helper = useMemo(() => new THREE.Object3D(), []);
 const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
 const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);

 useFrame((_, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  pool.forEach((blast, index) => {
   const mesh = meshes.current[index];
   const flash = flashes.current[index];
   if (!mesh) return;
   if (blast.life <= 0) {
    mesh.visible = flash.visible = false;
    return;
   }
   if (blast.fresh) {
    // Arranque: cada trozo sale disparado en una dirección, con su color.
    blast.fresh = false;
    blast.chunks.forEach((chunk, i) => {
     const angle = Math.random() * Math.PI * 2;
     const lift = 0.25 + Math.random() * 0.9;
     const speed = 4 + Math.random() * 9;
     chunk.position.set(blast.x, blast.y + 0.5, blast.z);
     chunk.velocity.set(Math.cos(angle) * speed, lift * speed, Math.sin(angle) * speed);
     chunk.size = 0.16 + Math.random() * 0.42;
     mesh.setColorAt(i, FIRE[Math.floor(Math.random() * FIRE.length)]);
    });
    mesh.instanceColor.needsUpdate = true;
   }
   blast.life -= dt * 1.15;
   const t = Math.max(blast.life, 0);
   blast.chunks.forEach((chunk, i) => {
    chunk.velocity.y -= 16 * dt;
    chunk.velocity.multiplyScalar(1 - 1.6 * dt);
    chunk.position.addScaledVector(chunk.velocity, dt);
    if (chunk.position.y < 0.1) {
     chunk.position.y = 0.1;
     chunk.velocity.y *= -0.35;
    }
    helper.position.copy(chunk.position);
    helper.scale.setScalar(chunk.size * Math.min(1, t * 2.2));
    helper.rotation.set(t * 5 + i, t * 3, i);
    helper.updateMatrix();
    mesh.setMatrixAt(i, helper.matrix);
   });
   mesh.instanceMatrix.needsUpdate = true;
   mesh.visible = true;
   // Fogonazo: una esfera que crece y se apaga enseguida.
   const burst = Math.max(0, (t - 0.72) / 0.28);
   flash.visible = burst > 0;
   flash.position.set(blast.x, blast.y + 0.8, blast.z);
   flash.scale.setScalar(0.8 + (1 - burst) * 2.4);
   flash.material.opacity = burst * 0.7;
  });
 });

 return pool.map((_, i) => (
  <group key={i}>
   <instancedMesh
    ref={(node) => (meshes.current[i] = node)}
    args={[geometry, material, CHUNKS]}
    visible={false}
    frustumCulled={false}
   />
   <mesh ref={(node) => (flashes.current[i] = node)} visible={false}>
    <icosahedronGeometry args={[1, 2]} />
    <meshBasicMaterial color="#fff3c4" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
   </mesh>
  </group>
 ));
}

function Crate({ body, register }) {
 return (
  <group name="caja" ref={(node) => register(body.id, node)}>
   <mesh position-y={0.5} castShadow receiveShadow>
    <boxGeometry args={[0.96, 0.96, 0.96]} />
    <meshLambertMaterial color="#f2b25c" flatShading />
   </mesh>
   {/* Listones oscuros en los bordes. */}
   {[
    [0, 0.92, 0, 1.04, 0.14, 1.04],
    [0, 0.08, 0, 1.04, 0.14, 1.04],
   ].map(([x, y, z, w, h, d]) => (
    <mesh key={y} position={[x, y, z]} castShadow>
     <boxGeometry args={[w, h, d]} />
     <meshLambertMaterial color="#8a4a3a" flatShading />
    </mesh>
   ))}
  </group>
 );
}

function Barrel({ body, register, explode }) {
 const click = useInteractable({
  position: body,
  radius: 2.4,
  hint: "Detonar el barril",
  enabled: () => body.gone <= 0,
  anywhere: true,
  action: () => explode(body),
 });
 return (
  <group name="barril" ref={(node) => register(body.id, node)} {...click}>
   <mesh position-y={0.6} castShadow>
    <cylinderGeometry args={[0.44, 0.44, 1.2, 10]} />
    <meshLambertMaterial color="#ff3d2e" flatShading />
   </mesh>
   {[0.26, 0.94].map((y) => (
    <mesh key={y} position-y={y}>
     <cylinderGeometry args={[0.47, 0.47, 0.12, 10]} />
     <meshLambertMaterial color="#ffcf4a" emissive="#ffb000" emissiveIntensity={0.5} flatShading />
    </mesh>
   ))}
   <mesh position-y={1.22}>
    <cylinderGeometry args={[0.36, 0.44, 0.05, 10]} />
    <meshLambertMaterial color="#3b2a44" flatShading />
   </mesh>
  </group>
 );
}

export function Props() {
 const bodies = useMemo(createBodies, []);
 const nodes = useRef(new Map());
 const register = (id, node) => nodes.current.set(id, node);
 const blasts = useMemo(
  () =>
   Array.from({ length: BLASTS }, () => ({
    life: 0,
    fresh: false,
    x: 0,
    y: 0,
    z: 0,
    chunks: Array.from({ length: CHUNKS }, () => ({ position: new THREE.Vector3(), velocity: new THREE.Vector3(), size: 0.3 })),
   })),
  [],
 );
 const pending = useRef([]); // barriles que estallarán en cadena, con su retardo

 const explode = (barrel) => {
  if (barrel.gone > 0) return;
  barrel.gone = RESPAWN_TIME;
  const blast = blasts.find((b) => b.life <= 0) ?? blasts[0];
  Object.assign(blast, { life: 1, fresh: true, x: barrel.x, y: world.height(barrel.x, barrel.z), z: barrel.z });
  rig.shake = Math.min(1.1, rig.shake + 0.8);
  emit("flash");

  // Onda expansiva: empuja lo que haya cerca, jugador incluido.
  const push = (x, z) => {
   const dx = x - barrel.x;
   const dz = z - barrel.z;
   const d = Math.hypot(dx, dz) || 0.01;
   const force = Math.max(0, 1 - d / BLAST_RADIUS);
   return { x: (dx / d) * force, z: (dz / d) * force, force, d };
  };
  for (const other of bodies) {
   if (other === barrel || other.gone > 0) continue;
   const p = push(other.x, other.z);
   other.vx += p.x * 14;
   other.vz += p.z * 14;
   other.spin += p.force * 9;
   if (other.type === "barrel" && p.d < CHAIN_RADIUS) pending.current.push({ barrel: other, delay: 0.18 + p.d * 0.05 });
  }
  if (!player.hidden) {
   const p = push(player.position.x, player.position.z);
   player.velocity.x += p.x * 11;
   player.velocity.z += p.z * 11;
   if (p.force > 0.15) player.velocity.y = Math.max(player.velocity.y, 3 + p.force * 5);
  }
 };

 useEffect(() => {
  if (import.meta.env.DEV) window.__world.bodies = bodies; // para las pruebas automáticas
 }, [bodies]);

 useFrame((_, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);

  pending.current = pending.current.filter((entry) => {
   entry.delay -= dt;
   if (entry.delay > 0) return true;
   explode(entry.barrel);
   return false;
  });

  const feet = player.position;
  for (const body of bodies) {
   const node = nodes.current.get(body.id);
   if (body.gone > 0) {
    body.gone -= dt;
    if (node) node.visible = false;
    if (body.gone <= 0) Object.assign(body, { x: body.home.x, z: body.home.z, vx: 0, vz: 0, appear: 0 });
    continue;
   }
   body.appear = Math.min(1, body.appear + dt * 3);

   // El jugador lo empuja al chocar con él.
   if (!player.hidden && feet.y - world.height(feet.x, feet.z) < 0.9) {
    const dx = body.x - feet.x;
    const dz = body.z - feet.z;
    const d = Math.hypot(dx, dz);
    const reach = body.r + PLAYER_RADIUS;
    if (d < reach && d > 1e-4) {
     const nx = dx / d;
     const nz = dz / d;
     body.x = feet.x + nx * reach;
     body.z = feet.z + nz * reach;
     const push = Math.max(0, player.velocity.x * nx + player.velocity.z * nz) * 1.05 + 0.4;
     const along = body.vx * nx + body.vz * nz;
     if (along < push) {
      body.vx += (push - along) * nx;
      body.vz += (push - along) * nz;
      body.spin += (nx * player.velocity.z - nz * player.velocity.x) * 0.4;
     }
    }
   }

   // Avance, rozamiento y choques con lo fijo y con el agua profunda.
   const fromX = body.x;
   const fromZ = body.z;
   body.x += body.vx * dt;
   body.z += body.vz * dt;
   const drag = Math.exp(-FRICTION * dt);
   body.vx *= drag;
   body.vz *= drag;
   body.spin *= drag;
   body.turn += body.spin * dt;
   if (pushOut(world, body, body.r)) {
    body.vx *= 0.55;
    body.vz *= 0.55;
   }
   if (world.blocked(body.x, body.z, 0, { prop: true })) {
    body.x = fromX;
    body.z = fromZ;
    body.vx *= -0.4;
    body.vz *= -0.4;
   }
  }

  // Choques entre objetos: se separan y se pasan el impulso.
  for (let i = 0; i < bodies.length; i++) {
   for (let j = i + 1; j < bodies.length; j++) {
    const a = bodies[i];
    const b = bodies[j];
    if (a.gone > 0 || b.gone > 0) continue;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const d = Math.hypot(dx, dz);
    const reach = a.r + b.r;
    if (d >= reach || d < 1e-4) continue;
    const nx = dx / d;
    const nz = dz / d;
    const overlap = (reach - d) / 2;
    a.x -= nx * overlap;
    a.z -= nz * overlap;
    b.x += nx * overlap;
    b.z += nz * overlap;
    const relative = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
    if (relative < 0) {
     a.vx += relative * nx * 0.9;
     a.vz += relative * nz * 0.9;
     b.vx -= relative * nx * 0.9;
     b.vz -= relative * nz * 0.9;
    }
   }
  }

  for (const body of bodies) {
   const node = nodes.current.get(body.id);
   if (!node || body.gone > 0) continue;
   node.visible = true;
   // En el agua, flotan.
   const ground = world.height(body.x, body.z);
   node.position.set(body.x, Math.max(ground, world.waterLevel - 0.3), body.z);
   node.rotation.y = body.turn;
   node.scale.setScalar(body.appear);
  }
 });

 return (
  <>
   {bodies.map((body) =>
    body.type === "crate" ? (
     <Crate key={body.id} body={body} register={register} />
    ) : (
     <Barrel key={body.id} body={body} register={register} explode={explode} />
    ),
   )}
   <Explosions pool={blasts} />
  </>
 );
}
