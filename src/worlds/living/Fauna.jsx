import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { attribute, cos, positionLocal, pow, sin, vec3 } from "three/tsl";
import { unlit } from "../../experience/materials";
import { emit, events, player } from "../../experience/state";
import { startGust, uniforms } from "../../experience/theme";
import { POND, SCATTER, WATER_LEVEL, height } from "./layout";

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
// Cada una ronda una flor. Son dos alas (dos instancias) que baten.
const BUTTERFLY_COLORS = ["#ffd24a", "#ff8fc7", "#8fd6ff", "#ffffff", "#ffa45c"];

function Butterflies({ count = 26 }) {
 const left = useRef(null);
 const right = useRef(null);
 const wing = useMemo(() => new THREE.PlaneGeometry(0.2, 0.26).translate(0.1, 0, 0).rotateX(-Math.PI / 2), []);
 const material = useMemo(() => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), []);
 const list = useMemo(() => {
  const random = seeded(77);
  const flowers = SCATTER.flowers;
  return Array.from({ length: count }, (_, i) => {
   const home = flowers[Math.floor(random() * flowers.length)];
   return { x: home.x, z: home.z, phase: random() * 20, reach: 1.2 + random() * 2.2, speed: 0.5 + random() * 0.5, color: BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length] };
  });
 }, [count]);
 useEffect(() => {
  list.forEach((butterfly, i) => {
   left.current.setColorAt(i, tint.set(butterfly.color));
   right.current.setColorAt(i, tint.set(butterfly.color));
  });
  left.current.instanceColor.needsUpdate = true;
  right.current.instanceColor.needsUpdate = true;
  return () => {
   wing.dispose();
   material.dispose();
  };
 }, [list, wing, material]);

 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  list.forEach((butterfly, i) => {
   const t = time * butterfly.speed + butterfly.phase;
   const x = butterfly.x + Math.sin(t) * butterfly.reach + Math.sin(t * 2.3) * 0.4;
   const z = butterfly.z + Math.cos(t * 0.8) * butterfly.reach;
   const y = height(x, z) + 0.9 + Math.sin(t * 1.7) * 0.35;
   const heading = Math.atan2(Math.cos(t) * butterfly.reach, -Math.sin(t * 0.8) * butterfly.reach * 0.8);
   const flap = Math.sin(time * 16 + butterfly.phase) * 0.95;
   dummy.position.set(x, y, z);
   dummy.scale.setScalar(1);
   dummy.rotation.set(0, heading, flap, "YXZ");
   dummy.updateMatrix();
   right.current.setMatrixAt(i, dummy.matrix);
   dummy.rotation.set(0, heading + Math.PI, -flap, "YXZ");
   dummy.updateMatrix();
   left.current.setMatrixAt(i, dummy.matrix);
  });
  left.current.instanceMatrix.needsUpdate = true;
  right.current.instanceMatrix.needsUpdate = true;
 });

 return (
  <>
   <instancedMesh ref={left} args={[wing, material, count]} frustumCulled={false} />
   <instancedMesh ref={right} args={[wing, material, count]} frustumCulled={false} />
  </>
 );
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
  const scareAll = () => birds.forEach((bird) => bird.flying < 0 && takeOff(bird, random() * 0.8));
  events.addEventListener("gust", scareAll);
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
// Dan vueltas por el estanque y de vez en cuando saltan.
function Fish({ count = 7 }) {
 const mesh = useRef(null);
 const geometry = useMemo(() => new THREE.ConeGeometry(0.11, 0.46, 4).rotateX(Math.PI / 2).scale(0.6, 1, 1), []);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ color: "#ff8a3d", flatShading: true }), []);
 const fish = useMemo(() => {
  const random = seeded(404);
  return Array.from({ length: count }, () => ({ radius: 1 + random() * (POND.r - 2.6), speed: (0.35 + random() * 0.4) * (random() < 0.5 ? -1 : 1), phase: random() * 30, every: 9 + random() * 14 }));
 }, [count]);
 useEffect(
  () => () => {
   geometry.dispose();
   material.dispose();
  },
  [geometry, material],
 );
 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  fish.forEach((one, i) => {
   const angle = time * one.speed + one.phase;
   // Salto: un arco de 0,7 s cada `every` segundos.
   const cycle = ((time + one.phase) % one.every) / 0.7;
   const jump = cycle < 1 ? Math.sin(cycle * Math.PI) : 0;
   dummy.position.set(POND.x + Math.cos(angle) * one.radius, WATER_LEVEL - 0.1 + jump * 0.75, POND.z + Math.sin(angle) * one.radius);
   dummy.rotation.set(cycle < 1 ? (0.5 - cycle) * 1.6 * -1 : 0, -angle + (one.speed > 0 ? Math.PI : 0), 0, "YXZ");
   dummy.scale.setScalar(1);
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

// ── Pétalos ─────────────────────────────────────────────────────────────────
// Unos pocos caen siempre de los cerezos; con una ráfaga salen muchos más.
const PETALS = 150;
const CALM_PETALS = 26;

function Petals() {
 const mesh = useRef(null);
 const geometry = useMemo(() => new THREE.PlaneGeometry(0.13, 0.09), []);
 const material = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffc4dc", side: THREE.DoubleSide, toneMapped: false }), []);
 const cherries = useMemo(() => {
  const list = SCATTER.trees.filter((tree) => tree.kind === "cherry");
  return list.length ? list : SCATTER.trees;
 }, []);
 const state = useRef({ active: CALM_PETALS, wind: { x: 0.5, z: 0.2 }, until: 0 });
 const petals = useMemo(() => {
  const random = seeded(606);
  return Array.from({ length: PETALS }, () => ({ x: 0, y: -50, z: 0, life: random() * 6, seed: random() * 50, drift: 0.4 + random() * 0.8 }));
 }, []);
 const random = useMemo(() => seeded(8), []);

 useEffect(() => {
  const burst = (event) => {
   const { x = 0, z = 0 } = event.detail ?? {};
   state.current.active = PETALS;
   state.current.until = uniforms.uTime.value + 9;
   state.current.origin = { x, z };
  };
  events.addEventListener("gust", burst);
  return () => {
   events.removeEventListener("gust", burst);
   geometry.dispose();
   material.dispose();
  };
 }, [geometry, material]);

 useFrame(({ clock }, delta) => {
  const time = clock.elapsedTime;
  const windy = time < state.current.until;
  if (!windy) state.current.active = CALM_PETALS;
  const dt = Math.min(delta, 0.05);
  petals.forEach((petal, i) => {
   petal.life -= dt;
   const ground = height(petal.x, petal.z);
   if ((petal.life <= 0 || petal.y < ground) && i < state.current.active) {
    // Nace en la copa de un cerezo; con viento, en uno cercano al jugador.
    let tree = cherries[Math.floor(random() * cherries.length)];
    if (windy) {
     for (let attempt = 0; attempt < 6; attempt++) {
      const other = cherries[Math.floor(random() * cherries.length)];
      if (Math.hypot(other.x - player.position.x, other.z - player.position.z) < Math.hypot(tree.x - player.position.x, tree.z - player.position.z)) tree = other;
     }
    }
    petal.x = tree.x + (random() - 0.5) * 3;
    petal.z = tree.z + (random() - 0.5) * 3;
    petal.y = height(tree.x, tree.z) + 3 + random() * 1.8;
    petal.life = 5 + random() * 4;
   } else if (petal.life <= 0 || petal.y < ground) {
    petal.y = -50;
   }
   if (petal.y > -40) {
    let wx = 0.5;
    let wz = 0.2;
    if (windy && state.current.origin) {
     const dx = petal.x - state.current.origin.x;
     const dz = petal.z - state.current.origin.z;
     const length = Math.hypot(dx, dz) || 1;
     wx = (dx / length) * 4.5;
     wz = (dz / length) * 4.5;
    }
    petal.x += (wx + Math.sin(time * 1.3 + petal.seed) * 0.8) * petal.drift * dt;
    petal.z += (wz + Math.cos(time * 1.1 + petal.seed) * 0.8) * petal.drift * dt;
    petal.y -= (windy ? 0.35 : 0.7) * dt;
   }
   dummy.position.set(petal.x, petal.y, petal.z);
   dummy.rotation.set(time * 2 + petal.seed, time * 1.3 + petal.seed, 0);
   dummy.scale.setScalar(1);
   dummy.updateMatrix();
   mesh.current.setMatrixAt(i, dummy.matrix);
  });
  mesh.current.instanceMatrix.needsUpdate = true;
 });

 return <instancedMesh ref={mesh} args={[geometry, material, PETALS]} frustumCulled={false} />;
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
   if (!quiet) emit("toast", { text: "El bosque despierta" });
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
  <>
   <Wind />
   <Butterflies />
   <Birds />
   <Fish />
   <Fireflies />
   <Petals />
  </>
 );
}
