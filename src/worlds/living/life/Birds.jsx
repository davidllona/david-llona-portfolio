import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { attribute, cos, mix, positionGeometry, sin, vec3 } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { WIND } from "../../../experience/environment/wind";
import { emit, events, player } from "../../../experience/state";
import { LANTERN_GLASS } from "../props/lampModel";
import { SCATTER, SIGNPOSTS, height } from "../layout";

// Pájaros. El modelo es «Animated Bluebird with Feathery Wings» (ver
// docs/CREDITOS.md), reducido a 720 triángulos y con el color plano por cara
// (tools/assets/bird.py). No lleva esqueleto: el GLB trae cuatro posturas del
// ciclo de vuelo del original y una posada, y el sombreador las mezcla. Todos
// los pájaros —los que picotean, los posados y las bandadas— son una sola
// malla con instancias.
//
// Unos picotean en el suelo o están posados en lo alto de un cartel o de una
// farola: si te acercas (o pasa una ráfaga) echan a volar, dan una vuelta y se
// posan en otro sitio. Otros van en bandadas pequeñas que rondan la isla.
const URL = "/models/living/fauna/pajaro.glb";
useGLTF.preload(URL);

const SIZE = 2.1; // sobre el tamaño del modelo (0,36 m de pico a cola)
const LONERS = 10;
const SCARE_DISTANCE = 3.6;
const FLIGHT_TIME = 9;
const FLAPS = 3.4; // aleteos por segundo
// Bandadas: centro y radio de su ronda, altura, cuántos y vueltas por segundo.
const FLOCKS = [
 { x: -8, z: 9, radius: 17, high: 10.5, count: 4, speed: 0.045, start: 0 },
 { x: 13, z: -13, radius: 13, high: 12.5, count: 3, speed: -0.055, start: 2.1 },
];

function seeded(seed) {
 let state = seed;
 return () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
 };
}

// Del GLB a una geometría con las cinco posturas como atributos.
function createGeometry(scene, count) {
 let source = null;
 scene.traverse((node) => node.isMesh && (source = node.geometry));
 const base = source.attributes.position;
 const plain = (read) => {
  const array = new Float32Array(base.count * 3);
  for (let i = 0; i < base.count; i++) array.set(read(i), i * 3);
  return new THREE.BufferAttribute(array, 3);
 };
 const geometry = new THREE.InstancedBufferGeometry();
 geometry.setIndex(source.index);
 geometry.setAttribute("position", plain((i) => [base.getX(i), base.getY(i), base.getZ(i)]));
 // (En glTF las posturas vienen como diferencia con la primera.)
 ["wingA", "wingB", "wingC", "perched"].forEach((name, k) => {
  const delta = source.morphAttributes.position[k];
  geometry.setAttribute(name, plain((i) => [base.getX(i) + delta.getX(i), base.getY(i) + delta.getY(i), base.getZ(i) + delta.getZ(i)]));
 });
 const color = source.attributes.color;
 geometry.setAttribute("color", plain((i) => [color.getX(i), color.getY(i), color.getZ(i)]));
 const place = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage);
 const state = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage);
 geometry.setAttribute("place", place); // x, y, z, giro
 geometry.setAttribute("state", state); // en el aire (0…1), punto del aleteo, tamaño, cabeceo
 // (Ocho atributos: es el tope de WebGPU. Uno más y la malla no se dibuja.)
 geometry.instanceCount = count;
 geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
 return geometry;
}

function createMaterial() {
 const place = attribute("place", "vec4"), state = attribute("state", "vec4");
 // Las cuatro posturas del aleteo, en rueda: en cada momento se está entre dos.
 const beat = state.y.fract().mul(4);
 const near = (k) => {
  const away = beat.sub(k).abs();
  return away.min(away.oneMinus().add(3)).oneMinus().max(0); // 1 − distancia en la rueda de 4
 };
 const flying = positionGeometry.mul(near(0)).add(attribute("wingA", "vec3").mul(near(1))).add(attribute("wingB", "vec3").mul(near(2))).add(attribute("wingC", "vec3").mul(near(3)));
 const shape = mix(attribute("perched", "vec3"), flying, state.x).mul(state.z);
 // Cabeceo (sobre el eje de las alas) y rumbo.
 const nod = vec3(shape.x, shape.y.mul(cos(state.w)).sub(shape.z.mul(sin(state.w))), shape.y.mul(sin(state.w)).add(shape.z.mul(cos(state.w))));
 const turned = vec3(nod.x.mul(cos(place.w)).add(nod.z.mul(sin(place.w))), nod.y, nod.z.mul(cos(place.w)).sub(nod.x.mul(sin(place.w))));
 const material = new MeshLambertNodeMaterial({ flatShading: true });
 material.positionNode = turned.add(place.xyz);
 material.colorNode = attribute("color", "vec3");
 return material;
}

export function Birds() {
 const { scene } = useGLTF(URL);
 const total = LONERS + FLOCKS.reduce((sum, flock) => sum + flock.count, 0);
 const geometry = useMemo(() => createGeometry(scene, total), [scene, total]);
 const material = useMemo(createMaterial, []);
 // Dónde se posan: junto a los arbustos, en lo alto de los carteles y de las farolas.
 const spots = useMemo(() => {
  const random = seeded(909);
  return [
   ...SCATTER.bushes.filter(() => random() < 0.5).map((bush) => ({ x: bush.x + 1.4, z: bush.z + 1.1, lift: 0 })),
   ...SIGNPOSTS.map((sign) => ({ x: sign.x + Math.cos(sign.turn) * 0.5, z: sign.z - Math.sin(sign.turn) * 0.5 - 0.14 * (sign.scale ?? 1), lift: 2.07 * (sign.scale ?? 1) })),
   ...SCATTER.lanterns.map((lamp) => ({ x: lamp.x + LANTERN_GLASS[0] * 0.5 * Math.cos(lamp.turn), z: lamp.z - LANTERN_GLASS[0] * 0.5 * Math.sin(lamp.turn), lift: 2.69 })),
  ];
 }, []);
 const birds = useMemo(() => {
  const random = seeded(31);
  const taken = new Set();
  return Array.from({ length: LONERS }, (_, i) => {
   // Tres de cada diez empiezan posados en alto.
   const pool = spots.filter((spot) => !taken.has(spot) && (i % 3 === 0 ? spot.lift > 0 : spot.lift === 0));
   const spot = pool[Math.floor(random() * pool.length)];
   taken.add(spot);
   return { x: spot.x, z: spot.z, lift: spot.lift, y: 0, turn: random() * 6, flying: -1, from: null, to: null, phase: random() * 10 };
  });
 }, [spots]);
 const random = useMemo(() => seeded(5), []);

 function takeOff(bird, delay = 0) {
  const free = spots.filter((spot) => !birds.some((other) => (other.to ?? other) === spot || (Math.abs(other.x - spot.x) < 0.3 && Math.abs(other.z - spot.z) < 0.3)));
  const spot = free[Math.floor(random() * free.length)] ?? spots[0];
  bird.flying = -delay; // negativo: aún espera
  bird.from = { x: bird.x, z: bird.z, lift: bird.lift };
  bird.to = spot;
  bird.started = true;
 }

 useEffect(() => {
  // Con una ráfaga despegan en cadena: cada uno cuando le llega el frente.
  const scareAll = (event) => {
   const { x = 0, z = 0 } = event.detail ?? {};
   birds.forEach((bird) => !bird.started && takeOff(bird, Math.hypot(bird.x - x, bird.z - z) / WIND.gustSpeed + random() * 0.5));
  };
  events.addEventListener("gust", scareAll);
  if (import.meta.env.DEV) window.__world.birds = birds; // para las pruebas automáticas
  return () => events.removeEventListener("gust", scareAll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [birds]);
 useEffect(
  () => () => {
   geometry.dispose();
   material.dispose();
  },
  [geometry, material],
 );

 useFrame(({ clock }, delta) => {
  const time = clock.elapsedTime;
  const place = geometry.attributes.place, state = geometry.attributes.state;
  birds.forEach((bird, i) => {
   let air = 0, nod = 0;
   if (!bird.started) {
    // Posado: saltitos y picoteo (en alto, solo mira a los lados).
    const ground = bird.lift === 0;
    bird.y = height(bird.x, bird.z) + bird.lift + (ground ? Math.max(0, Math.sin(time * 5 + bird.phase)) * 0.04 : 0);
    const dx = player.position.x - bird.x;
    const dz = player.position.z - bird.z;
    if (dx * dx + dz * dz < SCARE_DISTANCE * SCARE_DISTANCE) {
     takeOff(bird);
     emit("birds");
    }
    nod = ground ? Math.max(0, Math.sin(time * 2.2 + bird.phase)) * 0.55 : 0;
    if (!ground) bird.turn += Math.sin(time * 0.7 + bird.phase) * delta * 0.5;
   } else {
    bird.flying += delta;
    const t = Math.min(1, Math.max(0, bird.flying) / FLIGHT_TIME);
    // Sube, da una vuelta amplia y baja al nuevo sitio.
    const ease = t * t * (3 - 2 * t);
    const loop = Math.sin(t * Math.PI);
    const angle = bird.phase + t * Math.PI * 2;
    const x = bird.from.x + (bird.to.x - bird.from.x) * ease + Math.cos(angle) * loop * 9;
    const z = bird.from.z + (bird.to.z - bird.from.z) * ease + Math.sin(angle) * loop * 9;
    const from = height(bird.from.x, bird.from.z) + bird.from.lift, to = height(bird.to.x, bird.to.z) + bird.to.lift;
    if (t > 0) bird.turn = Math.atan2(x - bird.x, z - bird.z);
    bird.x = x;
    bird.z = z;
    bird.y = from + (to - from) * ease + loop * 8.5;
    // Abre las alas al despegar y las recoge al posarse.
    air = Math.min(1, t * 22, (1 - t) * 22);
    nod = -loop * 0.25;
    if (t >= 1) {
     bird.started = false;
     bird.x = bird.to.x;
     bird.z = bird.to.z;
     bird.lift = bird.to.lift;
     bird.to = null;
    }
   }
   place.setXYZW(i, bird.x, bird.y, bird.z, bird.turn);
   state.setXYZW(i, air, time * FLAPS + bird.phase, SIZE, nod);
  });
  // Bandadas: rondan en círculo, en cuña, subiendo y bajando un poco; de vez
  // en cuando dejan de batir y planean.
  let i = LONERS;
  for (const flock of FLOCKS) {
   const way = Math.sign(flock.speed);
   for (let k = 0; k < flock.count; k++, i++) {
    // Detrás y a un lado del primero, alternando.
    const back = Math.ceil(k / 2) * 1.5, aside = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 1.2;
    const angle = flock.start + time * flock.speed * Math.PI * 2 - (way * back) / flock.radius;
    const radius = flock.radius + aside + Math.sin(time * 0.23 + flock.start) * 3;
    const x = flock.x + Math.cos(angle) * radius, z = flock.z + Math.sin(angle) * radius;
    const y = flock.high + Math.sin(time * 0.31 + k * 1.7 + flock.start) * 1.1;
    // Rumbo: la tangente del círculo, en el sentido de la marcha.
    const turn = Math.atan2(-Math.sin(angle) * way, Math.cos(angle) * way);
    const glide = Math.sin(time * 0.37 + flock.start * 3 + k * 0.4) > 0.72;
    place.setXYZW(i, x, y, z, turn);
    state.setXYZW(i, 1, glide ? 0.3 : time * FLAPS * 0.85 + k * 0.37, SIZE, -0.06);
   }
  }
  place.needsUpdate = true;
  state.needsUpdate = true;
 });

 return <mesh name="pájaros" geometry={geometry} material={material} frustumCulled={false} castShadow />;
}
