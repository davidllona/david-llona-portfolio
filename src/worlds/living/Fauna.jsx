import { useEffect, useMemo, useRef } from "react";
import { Staged } from "../Staged";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { attribute, cos, float, instanceIndex, positionLocal, pow, sin, vec3 } from "three/tsl";
import { unlit } from "../../experience/materials";
import { emit, events, player } from "../../experience/state";
import { startGust, uniforms } from "../../experience/theme";
import { WIND } from "../../experience/environment/wind";
import { ring, splash } from "../../experience/effects/pools";
import { merge, piece } from "./kit/geometry";
import { POND, SCATTER, WATER_LEVEL, height } from "./layout";
import { Leaves, Pollen } from "./life/Leaves";

// Generador con semilla: la fauna sale siempre en los mismos sitios.
function seeded(seed) {
 let state = seed;
 return () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
 };
}

const dummy = new THREE.Object3D();
const tint = new THREE.Color();

// ── Mariposas ───────────────────────────────────────────────────────────────
// Cada una ronda una flor. Es una sola malla con instancias: cuerpo y dos alas
// con forma, que baten en la GPU (cada vértice sabe de qué ala es). Aquí solo
// se mueve cada mariposa por su ruta.
const BUTTERFLY_COLORS = ["#ffd24a", "#ff8fc7", "#8fd6ff", "#fff3d6", "#ffa45c", "#c9a0ff"];

function createButterfly() {
 // Ala derecha vista desde arriba (x hacia fuera, y hacia delante): dos lóbulos.
 const outline = [[0.012, 0.05], [0.1, 0.17], [0.19, 0.15], [0.2, 0.05], [0.12, 0], [0.15, -0.08], [0.09, -0.14], [0.012, -0.05]];
 const parts = [];
 for (const side of [1, -1]) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x * side, y)));
  const wing = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).toNonIndexed();
  const count = wing.attributes.position.count;
  const colors = new Float32Array(count * 3);
  // Más claras junto al cuerpo, con el borde algo más oscuro.
  for (let i = 0; i < count; i++) colors.fill(1 - Math.min(0.35, Math.abs(wing.attributes.position.getX(i)) * 1.6), i * 3, i * 3 + 3);
  wing.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  wing.setAttribute("wing", new THREE.BufferAttribute(new Float32Array(count).fill(1), 1));
  wing.deleteAttribute("uv");
  wing.deleteAttribute("normal");
  parts.push(wing);
 }
 const body = new THREE.BoxGeometry(0.03, 0.03, 0.2).toNonIndexed();
 body.setAttribute("color", new THREE.BufferAttribute(new Float32Array(body.attributes.position.count * 3).fill(0.16), 3));
 body.setAttribute("wing", new THREE.BufferAttribute(new Float32Array(body.attributes.position.count), 1));
 body.deleteAttribute("uv");
 body.deleteAttribute("normal");
 parts.push(body);
 const geometry = mergeGeometries(parts);
 parts.forEach((part) => part.dispose());
 return geometry;
}

function Butterflies({ count = 26 }) {
 const mesh = useRef(null);
 const geometry = useMemo(createButterfly, []);
 const material = useMemo(() => {
  const result = unlit({ side: THREE.DoubleSide, vertexColors: true });
  // Aleteo: las alas giran sobre el eje del cuerpo, las dos hacia arriba, cada mariposa a su compás.
  const beat = sin(uniforms.uTime.mul(15).add(float(instanceIndex).mul(2.39))).mul(0.5).add(0.5);
  const angle = beat.mul(1.25).sub(0.2).mul(attribute("wing", "float"));
  result.positionNode = vec3(positionLocal.x.mul(cos(angle)), positionLocal.y.add(positionLocal.x.abs().mul(sin(angle))), positionLocal.z);
  return result;
 }, []);
 const list = useMemo(() => {
  const random = seeded(77);
  const flowers = SCATTER.flowers;
  return Array.from({ length: count }, (_, i) => {
   const home = flowers[Math.floor(random() * flowers.length)];
   return { x: home.x, z: home.z, phase: random() * 20, reach: 1.2 + random() * 2.2, speed: 0.5 + random() * 0.5, size: 0.85 + random() * 0.4, color: BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length] };
  });
 }, [count]);
 useEffect(() => {
  list.forEach((butterfly, i) => mesh.current.setColorAt(i, tint.set(butterfly.color)));
  mesh.current.instanceColor.needsUpdate = true;
  return () => {
   geometry.dispose();
   material.dispose();
  };
 }, [list, geometry, material]);

 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  list.forEach((butterfly, i) => {
   const t = time * butterfly.speed + butterfly.phase;
   const x = butterfly.x + Math.sin(t) * butterfly.reach + Math.sin(t * 2.3) * 0.4;
   const z = butterfly.z + Math.cos(t * 0.8) * butterfly.reach;
   // Vuelo a saltitos: sube con cada batida.
   const y = height(x, z) + 0.9 + Math.sin(t * 1.7) * 0.35 + Math.abs(Math.sin(time * 7.5 + butterfly.phase)) * 0.07;
   // Rumbo: la derivada de la ruta (el morro mira a −z).
   const vx = Math.cos(t) * butterfly.reach + Math.cos(t * 2.3) * 0.92, vz = -Math.sin(t * 0.8) * butterfly.reach * 0.8;
   dummy.position.set(x, y, z);
   dummy.rotation.set(0.25, Math.atan2(-vx, -vz), Math.sin(t * 1.3) * 0.2, "YXZ");
   dummy.scale.setScalar(butterfly.size);
   dummy.updateMatrix();
   mesh.current.setMatrixAt(i, dummy.matrix);
  });
  mesh.current.instanceMatrix.needsUpdate = true;
 });

 return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}

// ── Pájaros ─────────────────────────────────────────────────────────────────
// Picotean en el suelo. Si te acercas (o pasa una ráfaga) echan a volar, dan
// una vuelta y se posan en otro sitio.
const BIRD_COLORS = ["#ff7a59", "#4fb6ff", "#ffd24a", "#f4f1ea"];
const SCARE_DISTANCE = 3.6;
const FLIGHT_TIME = 9;

function Birds({ count = 12 }) {
 const body = useRef(null);
 const wings = useRef(null);
 const bodyGeometry = useMemo(() => new THREE.ConeGeometry(0.13, 0.42, 5).rotateX(Math.PI / 2).translate(0, 0.13, 0), []);
 const wingGeometry = useMemo(() => new THREE.BoxGeometry(0.62, 0.025, 0.2).translate(0, 0.17, -0.02), []);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true }), []);
 const spots = useMemo(() => {
  const random = seeded(909);
  return SCATTER.bushes.filter(() => random() < 0.5).map((bush) => ({ x: bush.x + 1.4, z: bush.z + 1.1 }));
 }, []);
 const birds = useMemo(() => {
  const random = seeded(31);
  return Array.from({ length: count }, (_, i) => {
   const spot = spots[Math.floor(random() * spots.length)];
   return { x: spot.x, z: spot.z, y: 0, turn: random() * 6, flying: -1, from: null, to: null, phase: random() * 10, color: BIRD_COLORS[i % BIRD_COLORS.length] };
  });
 }, [count, spots]);
 const random = useMemo(() => seeded(5), []);

 useEffect(() => {
  birds.forEach((bird, i) => {
   body.current.setColorAt(i, tint.set(bird.color));
   wings.current.setColorAt(i, tint.set(bird.color).multiplyScalar(0.8));
  });
  body.current.instanceColor.needsUpdate = true;
  wings.current.instanceColor.needsUpdate = true;
  // Con una ráfaga despegan en cadena: cada una cuando le llega el frente.
  const scareAll = (event) => {
   const { x = 0, z = 0 } = event.detail ?? {};
   birds.forEach((bird) => !bird.started && takeOff(bird, Math.hypot(bird.x - x, bird.z - z) / WIND.gustSpeed + random() * 0.5));
  };
  events.addEventListener("gust", scareAll);
  if (import.meta.env.DEV) window.__world.birds = birds; // para las pruebas automáticas
  return () => {
   events.removeEventListener("gust", scareAll);
   bodyGeometry.dispose();
   wingGeometry.dispose();
   material.dispose();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [birds]);

 function takeOff(bird, delay = 0) {
  const spot = spots[Math.floor(random() * spots.length)];
  bird.flying = -delay; // negativo: aún espera
  bird.from = { x: bird.x, z: bird.z };
  bird.to = spot;
  bird.started = true;
 }

 useFrame(({ clock }, delta) => {
  const time = clock.elapsedTime;
  birds.forEach((bird, i) => {
   let flap = 0;
   if (!bird.started) {
    // En el suelo: saltitos y picoteo.
    bird.y = height(bird.x, bird.z) + Math.max(0, Math.sin(time * 5 + bird.phase)) * 0.04;
    const dx = player.position.x - bird.x;
    const dz = player.position.z - bird.z;
    if (dx * dx + dz * dz < SCARE_DISTANCE * SCARE_DISTANCE) {
     takeOff(bird);
     emit("birds");
    }
    dummy.rotation.set(Math.max(0, Math.sin(time * 2.2 + bird.phase)) * 0.5, bird.turn, 0, "YXZ");
   } else {
    bird.flying += delta;
    const t = Math.min(1, Math.max(0, bird.flying) / FLIGHT_TIME);
    // Sube, da una vuelta amplia y baja al nuevo sitio.
    const ease = t * t * (3 - 2 * t);
    const loop = Math.sin(t * Math.PI);
    const angle = bird.phase + t * Math.PI * 2;
    const x = bird.from.x + (bird.to.x - bird.from.x) * ease + Math.cos(angle) * loop * 9;
    const z = bird.from.z + (bird.to.z - bird.from.z) * ease + Math.sin(angle) * loop * 9;
    const ground = height(bird.from.x, bird.from.z) + (height(bird.to.x, bird.to.z) - height(bird.from.x, bird.from.z)) * ease;
    bird.turn = Math.atan2(x - bird.x, z - bird.z);
    bird.x = x;
    bird.z = z;
    bird.y = ground + loop * 8.5;
    flap = Math.sin(time * 22 + bird.phase) * 0.9;
    dummy.rotation.set(-loop * 0.25, bird.turn, 0, "YXZ");
    if (t >= 1) {
     bird.started = false;
     bird.x = bird.to.x;
     bird.z = bird.to.z;
    }
   }
   dummy.position.set(bird.x, bird.y, bird.z);
   dummy.scale.setScalar(1);
   dummy.updateMatrix();
   body.current.setMatrixAt(i, dummy.matrix);
   // Alas: plegadas en el suelo, batiendo en el aire.
   dummy.scale.set(bird.started ? 1 : 0.42, 1 + Math.abs(flap) * 6, 1);
   dummy.updateMatrix();
   wings.current.setMatrixAt(i, dummy.matrix);
  });
  body.current.instanceMatrix.needsUpdate = true;
  wings.current.instanceMatrix.needsUpdate = true;
 });

 return (
  <>
   <instancedMesh ref={body} args={[bodyGeometry, material, count]} frustumCulled={false} castShadow />
   <instancedMesh ref={wings} args={[wingGeometry, material, count]} frustumCulled={false} />
  </>
 );
}

// ── Peces ───────────────────────────────────────────────────────────────────
// Carpas que dan vueltas por el estanque coleteando y de vez en cuando saltan,
// con su salpicadura al salir y al caer.
const FISH_COLORS = ["#ff8a3d", "#f4f1ea", "#ff6a3a", "#ffc24a", "#f4f1ea", "#e8552e", "#ffd9a0"];

function createFish() {
 // Mira a +z. Cuerpo ahusado, cola en abanico y una aleta dorsal.
 return merge([
  piece(new THREE.OctahedronGeometry(1, 1), { bottom: "#d9d9d9", top: "#ffffff", vary: 0.06, scale: [0.075, 0.085, 0.24] }),
  piece(new THREE.ConeGeometry(0.11, 0.17, 4), { color: "#ececec", position: [0, 0, -0.29], rotation: [Math.PI / 2, 0, 0], scale: [0.35, 1, 1] }),
  piece(new THREE.ConeGeometry(0.05, 0.12, 3), { color: "#e0e0e0", position: [0, 0.085, 0.0], rotation: [-0.5, 0, 0], scale: [0.3, 1, 1] }),
 ]);
}

function Fish({ count = 7 }) {
 const mesh = useRef(null);
 const geometry = useMemo(createFish, []);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), []);
 const fish = useMemo(() => {
  const random = seeded(404);
  return Array.from({ length: count }, () => ({ radius: 1 + random() * (POND.r - 2.6), speed: (0.35 + random() * 0.4) * (random() < 0.5 ? -1 : 1), phase: random() * 30, every: 9 + random() * 14, size: 0.85 + random() * 0.5, jumping: false }));
 }, [count]);
 useEffect(() => {
  fish.forEach((_, i) => mesh.current.setColorAt(i, tint.set(FISH_COLORS[i % FISH_COLORS.length])));
  mesh.current.instanceColor.needsUpdate = true;
  return () => {
   geometry.dispose();
   material.dispose();
  };
 }, [fish, geometry, material]);
 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  fish.forEach((one, i) => {
   const angle = time * one.speed + one.phase;
   // Salto: un arco de 0,7 s cada `every` segundos.
   const cycle = ((time + one.phase) % one.every) / 0.7;
   const jumping = cycle < 1;
   const jump = jumping ? Math.sin(cycle * Math.PI) : 0;
   const x = POND.x + Math.cos(angle) * one.radius, z = POND.z + Math.sin(angle) * one.radius;
   if (jumping !== one.jumping) {
    // Rompe el agua al salir y al volver a entrar.
    one.jumping = jumping;
    if (jumping) splash(x, WATER_LEVEL, z, { count: 5, speed: 1.5, size: 0.05 });
    else {
     splash(x, WATER_LEVEL, z, { count: 7, speed: 1.2, size: 0.05 });
     ring(x, WATER_LEVEL, z, { size: 0.8, duration: 1.4 });
    }
   }
   dummy.position.set(x, WATER_LEVEL - 0.07 + jump * 0.75, z);
   // Nada de cara a su marcha (tangente a la vuelta) y colea.
   const heading = -angle + (one.speed > 0 ? 0 : Math.PI);
   dummy.rotation.set(jumping ? (cycle - 0.5) * 1.7 : 0, heading + Math.sin(time * 7 + one.phase) * 0.28, 0, "YXZ");
   dummy.scale.setScalar(one.size);
   dummy.updateMatrix();
   mesh.current.setMatrixAt(i, dummy.matrix);
  });
  mesh.current.instanceMatrix.needsUpdate = true;
 });
 return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}

// ── Luciérnagas ─────────────────────────────────────────────────────────────
// Solo de noche. Motas de luz que flotan y parpadean; todo el movimiento se
// calcula en la GPU a partir de una semilla por instancia.
function Fireflies({ count = 170 }) {
 const mesh = useRef(null);
 const geometry = useMemo(() => {
  const random = seeded(1234);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = random() * 100;
  const result = new THREE.OctahedronGeometry(0.055, 0);
  result.setAttribute("seed", new THREE.InstancedBufferAttribute(seeds, 1));
  return result;
 }, [count]);
 const material = useMemo(() => {
  const { uTime, uGlow } = uniforms;
  const seed = attribute("seed", "float");
  const result = unlit({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  result.positionNode = positionLocal.add(vec3(sin(uTime.mul(0.5).add(seed)).mul(0.9), sin(uTime.mul(0.8).add(seed.mul(1.7))).mul(0.45), cos(uTime.mul(0.4).add(seed.mul(0.6))).mul(0.9)));
  const blink = pow(sin(uTime.mul(2.2).add(seed.mul(3))).mul(0.5).add(0.5), 3).mul(0.65).add(0.35);
  // Por encima del blanco: el resplandor del posproceso las hace brillar.
  result.colorNode = vec3(2.6, 2.2, 0.7).mul(blink);
  result.opacityNode = uGlow;
  return result;
 }, []);
 useEffect(() => {
  const random = seeded(77);
  const helper = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
   const angle = random() * Math.PI * 2;
   const radius = 6 + Math.sqrt(random()) * 34;
   const x = Math.cos(angle) * radius;
   const z = Math.sin(angle) * radius;
   helper.position.set(x, Math.max(height(x, z), WATER_LEVEL) + 0.6 + random() * 2.2, z);
   helper.updateMatrix();
   mesh.current.setMatrixAt(i, helper.matrix);
  }
  mesh.current.instanceMatrix.needsUpdate = true;
  return () => {
   geometry.dispose();
   material.dispose();
  };
 }, [count, geometry, material]);
 return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}

// ── Viento ──────────────────────────────────────────────────────────────────
// «El bosque despierta»: el carillón (o el propio bosque, de vez en cuando)
// lanza una ráfaga que dobla la vegetación, suelta pétalos y espanta pájaros.
function Wind() {
 const next = useRef(45);
 useEffect(() => {
  const onGust = (event) => {
   const { x = 0, z = 0, strength = 1, quiet = false } = event.detail ?? {};
   startGust(x, z, strength);
   if (import.meta.env.DEV) window.__world.gusts = (window.__world.gusts ?? 0) + 1; // para las pruebas automáticas
   if (!quiet) emit("toast", { text: "El bosque despierta", at: { x, y: height(x, z) + 4, z } });
  };
  events.addEventListener("gust", onGust);
  return () => events.removeEventListener("gust", onGust);
 }, []);
 useFrame(({ clock }) => {
  if (clock.elapsedTime < next.current) return;
  next.current = clock.elapsedTime + 70 + Math.random() * 50;
  // Una brisa más suave, que entra por un lado de la isla.
  const angle = Math.random() * Math.PI * 2;
  emit("gust", { x: Math.cos(angle) * 40, z: Math.sin(angle) * 40, strength: 0.6, quiet: true });
 });
 return null;
}

export function Fauna() {
 return (
  <Staged>
   <Wind />
   <Butterflies />
   <Birds />
   <Fish />
   <Fireflies />
   <Leaves />
   <Pollen />
  </Staged>
 );
}
