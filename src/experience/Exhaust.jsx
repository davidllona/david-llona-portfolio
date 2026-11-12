import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { world } from "../worlds";

// Escape del cohete: humo, polvo y chispas.
//
//  · Humo: bocanadas facetadas con volumen que nacen en la tobera, chocan con
//    la plataforma y se abren por ella; anaranjadas junto a la llama, gris
//    claro al alejarse, y al final se encogen hasta desaparecer.
//  · Polvo: sale a ras de suelo desde el borde de la plataforma, hacia fuera.
//  · Chispas: puntos de luz que saltan de la tobera, caen y rebotan.
//
// Son tres mallas con instancias, montadas desde el principio con todas sus
// copias a escala cero: el precalentamiento de la carga compila sus materiales
// y despegar no crea nada nuevo. `source` lo escribe Ship.jsx en cada fotograma.

const SMOKE = 130, DUST = 46, SPARKS = 56;
const GRAVITY = 15;

// Color del humo según su edad (0 recién salido → 1 a punto de disiparse).
const SMOKE_RAMP = [
 // (Sin pasarse de brillo: por encima de ~1,5 el resplandor lo quema a blanco.)
 [0, [1.5, 0.6, 0.18]], // naranja encendido
 [0.12, [1.32, 0.66, 0.3]], // naranja cálido
 [0.3, [0.98, 0.77, 0.6]], // rosado, ya se enfría
 [0.5, [0.86, 0.83, 0.8]], // gris cálido
 [1, [0.96, 0.95, 0.93]], // gris claro
];
const DUST_RAMP = [
 [0, [0.82, 0.71, 0.52]],
 [1, [0.94, 0.9, 0.82]],
];
function ramp(stops, t, target) {
 let i = 0;
 while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
 const [t0, a] = stops[i], [t1, b] = stops[i + 1];
 const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
 return target.setRGB(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
}

// Bocanada: un icosaedro deformado, de pocas caras, para que se vea tallada.
function createPuff() {
 const geometry = new THREE.IcosahedronGeometry(1, 1);
 const position = geometry.attributes.position;
 const v = new THREE.Vector3();
 for (let i = 0; i < position.count; i++) {
  v.fromBufferAttribute(position, i);
  // Mismo desplazamiento para los vértices que coinciden (la malla no está indexada).
  const bump = 0.82 + 0.3 * Math.abs(Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453 % 1);
  position.setXYZ(i, v.x * bump, v.y * bump * 0.86, v.z * bump);
 }
 geometry.computeVertexNormals();
 return geometry;
}

const pool = (count) => Array.from({ length: count }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 1, spin: 0, turn: 0, landed: false }));

// `source`: { x, y, z (tobera), thrust 0…1, ground (altura del suelo bajo la nave), radius (de la plataforma) }.
export function Exhaust({ source }) {
 const smokeMesh = useRef(null), dustMesh = useRef(null), sparkMesh = useRef(null);
 const state = useMemo(() => ({ smoke: pool(SMOKE), dust: pool(DUST), sparks: pool(SPARKS), next: { smoke: 0, dust: 0, sparks: 0 }, owed: { smoke: 0, dust: 0, sparks: 0 }, busy: false }), []);
 const geometry = useMemo(() => ({ puff: createPuff(), spark: new THREE.OctahedronGeometry(1, 0) }), []);
 const material = useMemo(
  () => ({
   smoke: new THREE.MeshLambertMaterial({ flatShading: true }),
   dust: new THREE.MeshLambertMaterial({ flatShading: true }),
   spark: new THREE.MeshBasicMaterial({ toneMapped: false, fog: false }),
  }),
  [],
 );
 const helper = useMemo(() => ({ object: new THREE.Object3D(), color: new THREE.Color() }), []);

 // Todas las copias empiezan a escala cero y con su color ya creado.
 useEffect(() => {
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const white = new THREE.Color(1, 1, 1);
  for (const [mesh, count] of [[smokeMesh.current, SMOKE], [dustMesh.current, DUST], [sparkMesh.current, SPARKS]]) {
   for (let i = 0; i < count; i++) {
    mesh.setMatrixAt(i, zero);
    mesh.setColorAt(i, white);
   }
   mesh.instanceMatrix.needsUpdate = true;
   mesh.instanceColor.needsUpdate = true;
  }
  return () => {
   Object.values(geometry).forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  };
 }, [geometry, material]);

 const spawn = (kind) => {
  const list = state[kind];
  const p = list[state.next[kind]++ % list.length];
  const angle = Math.random() * Math.PI * 2;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  p.landed = false;
  p.spin = (Math.random() - 0.5) * 3;
  p.turn = Math.random() * 6;
  if (kind === "smoke") {
   // Sale de la tobera hacia abajo, con algo de apertura.
   const open = Math.random() * 1.6;
   Object.assign(p, { x: source.x + cos * 0.25, y: source.y, z: source.z + sin * 0.25, vx: cos * open, vy: -(7 + Math.random() * 4), vz: sin * open, size: 0.42 + Math.random() * 0.4, max: 1.7 + Math.random() * 1.1 });
  } else if (kind === "dust") {
   // Desde el borde de la plataforma, a ras de suelo y hacia fuera.
   const from = source.radius * (0.7 + Math.random() * 0.45), speed = 6 + Math.random() * 5;
   const x = source.x + cos * from, z = source.z + sin * from;
   Object.assign(p, { x, y: Math.max(world.height(x, z), source.ground) + 0.25, z, vx: cos * speed, vy: 0.5 + Math.random() * 0.9, vz: sin * speed, size: 0.34 + Math.random() * 0.36, max: 0.9 + Math.random() * 0.7, landed: true });
  } else {
   const speed = 2.5 + Math.random() * 7;
   Object.assign(p, { x: source.x + cos * 0.3, y: source.y - 0.1, z: source.z + sin * 0.3, vx: cos * speed, vy: -2 - Math.random() * 6, vz: sin * speed, size: 0.05 + Math.random() * 0.05, max: 0.4 + Math.random() * 0.55 });
  }
  p.life = p.max;
 };

 useFrame((_, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  const { object, color } = helper;
  const thrust = source.thrust;
  const above = source.y - source.ground; // altura de la tobera sobre el suelo
  // Cuánto sale: mucho humo cerca del suelo, menos al subir; polvo y chispas solo abajo.
  if (thrust > 0) {
   state.owed.smoke += dt * thrust * (above < 20 ? 62 : 0);
   state.owed.dust += dt * thrust * (above < 5 ? 34 : 0);
   state.owed.sparks += dt * thrust * (above < 7 ? 44 : 0);
   for (const kind of ["smoke", "dust", "sparks"]) {
    while (state.owed[kind] >= 1) {
     state.owed[kind] -= 1;
     spawn(kind);
    }
   }
   state.busy = true;
  }
  if (!state.busy) return;
  let alive = 0;

  // Humo y polvo: misma malla de bocanada, distinta vida.
  for (const [list, mesh, stops, flat] of [[state.smoke, smokeMesh.current, SMOKE_RAMP, 0.9], [state.dust, dustMesh.current, DUST_RAMP, 0.55]]) {
   for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) {
     object.scale.setScalar(0);
     object.updateMatrix();
     mesh.setMatrixAt(i, object.matrix);
     continue;
    }
    alive++;
    const age = 1 - p.life / p.max;
    const floor = Math.max(world.height(p.x, p.z), Math.hypot(p.x - source.x, p.z - source.z) < source.radius ? source.ground : -10);
    const radius = p.size * (0.5 + 1.55 * Math.pow(age, 0.6));
    if (!p.landed && p.y - radius * 0.55 <= floor) {
     // Choca con la plataforma (o el suelo): lo que bajaba sale ahora hacia los lados.
     p.landed = true;
     const out = Math.atan2(p.z - source.z, p.x - source.x) + (Math.random() - 0.5) * 0.9;
     const speed = 4.5 + Math.abs(p.vy) * 0.55;
     p.vx = Math.cos(out) * speed;
     p.vz = Math.sin(out) * speed;
     p.vy = 0.4;
    }
    const drag = Math.exp(-(p.landed ? 1.7 : 1.1) * dt);
    p.vx *= drag;
    p.vz *= drag;
    if (p.landed) p.vy += (0.9 + age * 1.6 - p.vy) * Math.min(1, dt * 2); // se va levantando
    else p.vy *= Math.exp(-0.9 * dt);
    p.x += p.vx * dt;
    p.y = Math.max(p.y + p.vy * dt, floor + radius * 0.5);
    p.z += p.vz * dt;
    p.turn += p.spin * dt;
    // Al final se encoge hasta desaparecer.
    const fade = age > 0.72 ? 1 - (age - 0.72) / 0.28 : 1;
    const grow = Math.min(1, age * 9); // nace pequeña
    object.position.set(p.x, p.y, p.z);
    object.rotation.set(p.turn * 0.6, p.turn, p.turn * 0.3);
    object.scale.set(radius * fade * grow, radius * flat * fade * grow, radius * fade * grow);
    object.updateMatrix();
    mesh.setMatrixAt(i, object.matrix);
    // Color por edad y, mientras hay llama, por cercanía a ella: lo que queda
    // junto a la tobera sigue encendido en naranja aunque lleve un rato fuera.
    const heat = flat > 0.8 ? thrust * Math.max(0, 1 - Math.hypot(p.x - source.x, p.y - source.y, p.z - source.z) / 6.5) : 0;
    mesh.setColorAt(i, ramp(stops, age * (1 - 0.92 * heat), color));
   }
   mesh.instanceMatrix.needsUpdate = true;
   mesh.instanceColor.needsUpdate = true;
  }

  // Chispas: caen, rebotan y se apagan.
  for (let i = 0; i < state.sparks.length; i++) {
   const p = state.sparks[i];
   if (p.life <= 0) continue;
   p.life -= dt;
   const floor = Math.max(world.height(p.x, p.z), Math.hypot(p.x - source.x, p.z - source.z) < source.radius ? source.ground : -10) + 0.05;
   p.vy -= GRAVITY * dt;
   p.x += p.vx * dt;
   p.y += p.vy * dt;
   p.z += p.vz * dt;
   if (p.y < floor) {
    p.y = floor;
    p.vy = -p.vy * 0.4;
    p.vx *= 0.7;
    p.vz *= 0.7;
   }
   const left = Math.max(0, p.life / p.max);
   if (left > 0) alive++;
   object.position.set(p.x, p.y, p.z);
   object.rotation.set(p.turn, p.turn * 2, 0);
   object.scale.setScalar(p.size * (0.4 + left));
   if (left <= 0) object.scale.setScalar(0);
   object.updateMatrix();
   sparkMesh.current.setMatrixAt(i, object.matrix);
   sparkMesh.current.setColorAt(i, color.setRGB(3.4 * (0.4 + left), 1.7 * left + 0.25, 0.35 * left));
  }
  sparkMesh.current.instanceMatrix.needsUpdate = true;
  sparkMesh.current.instanceColor.needsUpdate = true;
  if (alive === 0 && thrust === 0) state.busy = false;
 });

 return (
  <>
   <instancedMesh ref={smokeMesh} args={[geometry.puff, material.smoke, SMOKE]} frustumCulled={false} />
   <instancedMesh ref={dustMesh} args={[geometry.puff, material.dust, DUST]} frustumCulled={false} />
   <instancedMesh ref={sparkMesh} args={[geometry.spark, material.spark, SPARKS]} frustumCulled={false} />
  </>
 );
}
