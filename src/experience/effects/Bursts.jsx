import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { attribute, mix, normalLocal, positionLocal, smoothstep, step, vec3 } from "three/tsl";
import { world } from "../../worlds";
import { unlit } from "../materials";
import { emit, player, woody } from "../state";
import { uniforms } from "../theme";
import { GRAVITY, POOLS, dust, pools, ring, splash } from "./pools";

// Efectos breves que nacen de un golpe: polvo al andar, correr y aterrizar;
// gotas y aros al entrar en el agua o al saltar un pez.
//
// Son tres mallas con instancias (bocanadas, gotas y aros) y todo su
// movimiento se calcula en la GPU: cada copia guarda dónde y cuándo nació y
// con qué impulso, y el sombreador deduce el resto a partir del reloj. Lanzar
// un efecto solo escribe esos datos; no se crea ni se mueve nada por fotograma.
// Están montadas desde la carga, así que el precalentamiento las compila.

function createMaterials() {
 const { uTime, uNight } = uniforms;
 const origin = attribute("origin", "vec3");
 const motion = attribute("motion", "vec3");
 const life = attribute("life", "vec4");
 const age = uTime.sub(life.x);
 const k = age.div(life.y).clamp(0, 1);
 const alive = step(0, age).mul(step(age, life.y));
 const dim = uNight.mul(0.5).oneMinus();

 // Polvo: sale, frena, se hincha y se deshace.
 const dustMaterial = unlit({ transparent: true, depthWrite: false });
 const drift = motion.mul(age).mul(k.mul(0.45).oneMinus());
 dustMaterial.positionNode = positionLocal.mul(life.z.mul(k.mul(1.1).add(0.4))).mul(alive).add(origin).add(drift);
 dustMaterial.colorNode = mix(vec3(0.74, 0.65, 0.5), vec3(0.96, 0.91, 0.8), normalLocal.y.mul(0.5).add(0.5)).mul(dim);
 dustMaterial.opacityNode = smoothstep(0, 0.12, k).mul(k.oneMinus()).mul(0.6);

 // Gotas: tiro parabólico; encogen al caer.
 const dropMaterial = unlit({ transparent: true, depthWrite: false });
 const flight = motion.mul(age).add(vec3(0, age.mul(age).mul(-GRAVITY / 2), 0));
 dropMaterial.positionNode = positionLocal.mul(life.z.mul(k.mul(0.5).oneMinus())).mul(alive).add(origin).add(flight);
 dropMaterial.colorNode = mix(vec3(0.82, 0.95, 1), vec3(1), normalLocal.y.mul(0.5).add(0.5)).mul(dim);
 dropMaterial.opacityNode = k.mul(k).oneMinus().mul(0.9);

 // Aros: se abren y se apagan.
 const ringMaterial = unlit({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
 const open = life.z.mul(k.oneMinus().pow(2).oneMinus().mul(1.9).add(0.25));
 ringMaterial.positionNode = positionLocal.mul(vec3(open, 1, open)).mul(alive).add(origin);
 ringMaterial.colorNode = mix(vec3(1), vec3(0.7, 0.84, 1), uNight.mul(0.7));
 ringMaterial.opacityNode = k.oneMinus().mul(0.7);
 return { dust: dustMaterial, drop: dropMaterial, ring: ringMaterial };
}

function withPool(geometry, pool) {
 geometry.setAttribute("origin", pool.origin);
 geometry.setAttribute("motion", pool.motion);
 geometry.setAttribute("life", pool.life);
 return geometry;
}

// Lo que cada personaje va dejando: polvo en seco, aros y gotas en el agua.
const createTrack = () => ({ x: 0, z: 0, wet: false, timer: 0, known: false });

export function Bursts() {
 const material = useMemo(createMaterials, []);
 const geometry = useMemo(
  () => ({
   dust: withPool(new THREE.IcosahedronGeometry(1, 0), pools.dust),
   drop: withPool(new THREE.OctahedronGeometry(1, 0), pools.drop),
   ring: withPool(new THREE.RingGeometry(0.84, 1, 40).rotateX(-Math.PI / 2), pools.ring),
  }),
  [],
 );
 const tracks = useRef({ player: createTrack(), woody: createTrack() });
 useEffect(() => {
  if (import.meta.env.DEV) Object.assign(window.__world, { bursts: { dust, splash, ring, pools }, clock: () => uniforms.uTime.value }); // para las pruebas automáticas
  return () => {
   Object.values(geometry).forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  };
 }, [geometry, material]);

 useFrame((_, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  if (dt <= 0) return;
  const level = world.waterLevel;
  const actors = [
   [tracks.current.player, player.position, !player.hidden, 1, player.grounded],
   [tracks.current.woody, woody.position, !player.hidden, 0.7, true],
  ];
  for (const [track, position, shown, weight, grounded] of actors) {
   const speed = track.known ? Math.hypot(position.x - track.x, position.z - track.z) / dt : 0;
   const dirX = speed > 0.01 ? (position.x - track.x) / (speed * dt) : 0, dirZ = speed > 0.01 ? (position.z - track.z) / (speed * dt) : 0;
   // (Un salto de sitio no es andar: ni polvo ni chapuzón.)
   const jumped = speed > 30;
   track.x = position.x;
   track.z = position.z;
   const wet = shown && level !== undefined && position.y < level - 0.08;
   if (track.known && shown && !jumped) {
    track.timer -= dt;
    if (wet && !track.wet) {
     splash(position.x, level, position.z, { count: Math.round(12 * weight), speed: 1.6 + Math.min(speed, 6) * 0.25 });
     // Chapuzón: más fuerte cuanto más deprisa se entra; el de Woody, más flojo.
     emit("sound", { id: "splash", x: position.x, z: position.z, strength: weight * (0.45 + Math.min(speed, 7) * 0.08) });
    }
    else if (wet && speed > 0.6 && track.timer <= 0) {
     // Vadeando: un aro a cada paso y alguna gota por delante.
     track.timer = 0.34;
     ring(position.x, level, position.z, { size: 0.42 * weight, duration: 1 });
     if (speed > 2) splash(position.x + dirX * 0.3, level, position.z + dirZ * 0.3, { count: 2, speed: 1.3, size: 0.05 });
    } else if (!wet && grounded && track.timer <= 0 && speed > 1.2) {
     // En seco: poco polvo al andar, más al correr.
     const running = speed > 4.4;
     track.timer = running ? 0.13 : 0.3;
     dust(position.x - dirX * 0.2, position.y, position.z - dirZ * 0.2, { count: running ? 2 : 1, speed: running ? 0.9 : 0.4, size: (running ? 0.24 : 0.15) * weight, duration: running ? 0.7 : 0.5, back: { x: -dirX, z: -dirZ } });
    }
   }
   track.wet = wet;
   track.known = true;
  }
 });

 return (
  <>
   <instancedMesh args={[geometry.dust, material.dust, POOLS.dust]} frustumCulled={false} renderOrder={4} />
   <instancedMesh args={[geometry.drop, material.drop, POOLS.drop]} frustumCulled={false} renderOrder={5} />
   <instancedMesh args={[geometry.ring, material.ring, POOLS.ring]} frustumCulled={false} renderOrder={3} />
  </>
 );
}
