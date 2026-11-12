import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Instances } from "../../experience/Instances";
import { uniforms } from "../../experience/theme";
import { BRIDGES, PATHS, PLATEAU, POND, RIVER, STREAM, WATERFALL, WATER_LEVEL, groundHeight, surface } from "./layout";

// Ruido de valores 2D, suave y determinista: manchas de tono en la hierba.
function noise(x, z) {
 const hash = (ix, iz) => {
  const v = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
  return v - Math.floor(v);
 };
 const x0 = Math.floor(x), z0 = Math.floor(z);
 const tx = x - x0, tz = z - z0;
 const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
 const top = hash(x0, z0) * (1 - sx) + hash(x0 + 1, z0) * sx;
 const bottom = hash(x0, z0 + 1) * (1 - sx) + hash(x0 + 1, z0 + 1) * sx;
 return top * (1 - sz) + bottom * sz;
}

const PALETTE = {
 grass: ["#7cc65c", "#69b853", "#93d268", "#58a851"],
 sand: ["#f3e2ad", "#ecd79b"],
 path: ["#dcbf8a", "#d2b27b"],
 rock: ["#9d978f", "#8a847d", "#b1aba1"],
 stone: ["#a9a6b3", "#9b98a6"],
 bed: ["#6fb7ae", "#5aa59d"],
};
const GROUND_RADIUS = 64;

// El suelo: una malla facetada, coloreada según lo que hay en cada punto.
function createGround() {
 const base = new THREE.PlaneGeometry(132, 132, 150, 150).rotateX(-Math.PI / 2);
 const square = base.toNonIndexed();
 base.dispose();
 // Se recorta en redondo: fuera solo hay mar, y desde la nave debe verse una isla.
 const kept = [];
 const corners = square.attributes.position.array;
 for (let i = 0; i < corners.length; i += 9) {
  const x = (corners[i] + corners[i + 3] + corners[i + 6]) / 3;
  const z = (corners[i + 2] + corners[i + 5] + corners[i + 8]) / 3;
  if (Math.hypot(x, z) < GROUND_RADIUS) kept.push(...corners.subarray(i, i + 9));
 }
 square.dispose();
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(kept, 3));
 const position = geometry.attributes.position;
 for (let i = 0; i < position.count; i++) position.setY(i, groundHeight(position.getX(i), position.getZ(i)));

 const palette = Object.fromEntries(Object.entries(PALETTE).map(([key, list]) => [key, list.map((c) => new THREE.Color(c))]));
 const colors = new Float32Array(position.count * 3);
 for (let i = 0; i < position.count; i += 3) {
  const x = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
  const z = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
  // Manchas grandes de tono, y algún triángulo suelto distinto.
  const patch = noise(x * 0.11, z * 0.11) * 0.65 + noise(x * 0.4 + 7, z * 0.4) * 0.35;
  const odd = noise(x * 2.1, z * 2.1) > 0.84;
  // El tipo de suelo se mira en cada esquina: así el borde entre hierba,
  // camino y arena se funde dentro del triángulo en vez de hacer dientes.
  for (let k = 0; k < 3; k++) {
   const tones = palette[surface(position.getX(i + k), position.getZ(i + k))];
   let tone = Math.min(tones.length - 1, Math.floor(patch * tones.length));
   if (odd) tone = (tone + 1) % tones.length;
   tones[tone].toArray(colors, (i + k) * 3);
  }
 }
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 geometry.computeVertexNormals();
 return geometry;
}

// ── Agua ────────────────────────────────────────────────────────────────────
// Un único plano al nivel del agua. Cada vértice lleva la profundidad real del
// terreno bajo él, así que el mar, el río y el estanque salen solos donde el
// suelo queda por debajo; la espuma aparece donde la profundidad es casi cero.
const WATER_SHADER = {
 vertexShader: /* glsl */ `
  attribute float depth;
  attribute vec2 flow;
  varying float vDepth;
  varying vec2 vFlow;
  varying vec2 vPos;
  void main() {
   vDepth = depth;
   vFlow = flow;
   vPos = position.xz;
   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,
 fragmentShader: /* glsl */ `
  uniform vec3 uWaterShallow;
  uniform vec3 uWaterDeep;
  uniform float uTime;
  uniform float uSpace;
  uniform vec3 uFall; // x, z de la caída de la cascada y radio de sus ondas
  varying float vDepth;
  varying vec2 vFlow;
  varying vec2 vPos;

  void main() {
   if (vDepth < -0.02) discard;
   float r = length(vPos);
   float deep = clamp(vDepth / 2.0, 0.0, 1.0);
   vec3 color = mix(uWaterShallow, uWaterDeep, deep);

   // Espuma pegada a la orilla, que respira, y líneas que siguen el fondo.
   float wobble = 0.03 * sin(uTime * 1.7 + vPos.x * 1.3 + vPos.y * 1.1);
   float foam = 1.0 - smoothstep(0.0, 0.11, vDepth + wobble);
   float wave = fract(vDepth * 1.7 - uTime * 0.16);
   foam = max(foam, smoothstep(0.0, 0.06, wave) * (1.0 - smoothstep(0.06, 0.16, wave)) * (1.0 - smoothstep(0.2, 1.5, vDepth)) * 0.8);

   // Corriente del río: vetas claras que avanzan aguas abajo.
   float current = length(vFlow);
   if (current > 0.01) {
    vec2 dir = vFlow / current;
    float along = dot(vPos, dir);
    float across = dot(vPos, vec2(-dir.y, dir.x));
    float streak = sin(across * 5.0 + sin(along * 0.9) * 1.6) * 0.5 + 0.5;
    float run = fract(along * 0.22 - uTime * 0.55 + streak * 0.35);
    foam = max(foam, smoothstep(0.0, 0.1, run) * (1.0 - smoothstep(0.1, 0.34, run)) * streak * current * 0.55);
   }

   // Ondas donde cae la cascada.
   float fromFall = distance(vPos, uFall.xy);
   float rings = sin(fromFall * 5.5 - uTime * 5.0) * 0.5 + 0.5;
   foam = max(foam, smoothstep(0.55, 1.0, rings) * (1.0 - smoothstep(0.3, uFall.z, fromFall)) * 0.75);
   foam = max(foam, 1.0 - smoothstep(0.5, 1.1, fromFall));

   color = mix(color, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.92);
   float alpha = max(mix(0.62, 0.94, deep), foam);
   // El mar se funde con el horizonte; desde la nave se recoge alrededor de la isla.
   alpha *= 1.0 - smoothstep(105.0, 170.0, r);
   alpha *= 1.0 - uSpace * smoothstep(60.0, 94.0, r);
   gl_FragColor = vec4(color, alpha);
  }`,
};

const WATER_GRID = 116; // metros de lado del plano detallado, a 1 m por celda

function riverFlow(x, z) {
 let best = Infinity;
 let flow = [0, 0];
 for (let i = 0; i < RIVER.length - 1; i++) {
  const [ax, az] = RIVER[i];
  const [bx, bz] = RIVER[i + 1];
  const dx = bx - ax, dz = bz - az;
  const length = Math.hypot(dx, dz);
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (length * length)));
  const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
  if (d < best) {
   best = d;
   flow = [dx / length, dz / length];
  }
 }
 // La corriente se nota en el cauce y se apaga al llegar al mar abierto.
 const strength = (1 - Math.min(1, Math.max(0, (best - 1.2) / 1.6))) * (1 - Math.min(1, Math.max(0, (Math.hypot(x, z) - 40) / 6)));
 return [flow[0] * strength, flow[1] * strength];
}

function createWaterGeometries() {
 // Dentro de la isla: rejilla con la profundidad y la corriente por vértice.
 const inner = new THREE.PlaneGeometry(WATER_GRID, WATER_GRID, WATER_GRID, WATER_GRID).rotateX(-Math.PI / 2);
 const position = inner.attributes.position;
 const depth = new Float32Array(position.count);
 const flow = new Float32Array(position.count * 2);
 for (let i = 0; i < position.count; i++) {
  const x = position.getX(i), z = position.getZ(i);
  depth[i] = WATER_LEVEL - groundHeight(x, z);
  flow.set(riverFlow(x, z), i * 2);
 }
 inner.setAttribute("depth", new THREE.BufferAttribute(depth, 1));
 inner.setAttribute("flow", new THREE.BufferAttribute(flow, 2));

 // Fuera: mar abierto, siempre profundo. Es un marco que encaja con la rejilla.
 const half = WATER_GRID / 2;
 const shape = new THREE.Shape().absarc(0, 0, 175, 0, Math.PI * 2);
 shape.holes.push(new THREE.Path().moveTo(-half, -half).lineTo(-half, half).lineTo(half, half).lineTo(half, -half).closePath());
 const outer = new THREE.ShapeGeometry(shape, 48).rotateX(-Math.PI / 2);
 outer.setAttribute("depth", new THREE.BufferAttribute(new Float32Array(outer.attributes.position.count).fill(3), 1));
 outer.setAttribute("flow", new THREE.BufferAttribute(new Float32Array(outer.attributes.position.count * 2), 2));
 return [inner, outer];
}

function Water() {
 const geometries = useMemo(createWaterGeometries, []);
 const material = useMemo(
  () =>
   new THREE.ShaderMaterial({
    ...WATER_SHADER,
    transparent: true,
    depthWrite: false,
    uniforms: {
     uWaterShallow: uniforms.uWaterShallow,
     uWaterDeep: uniforms.uWaterDeep,
     uTime: uniforms.uTime,
     uSpace: uniforms.uSpace,
     uFall: { value: new THREE.Vector3(WATERFALL.x, WATERFALL.z + 1.5, POND.r) },
    },
   }),
  [],
 );
 useEffect(
  () => () => {
   geometries.forEach((geometry) => geometry.dispose());
   material.dispose();
  },
  [geometries, material],
 );
 return geometries.map((geometry, i) => <mesh key={i} geometry={geometry} material={material} position-y={WATER_LEVEL} />);
}

// Agua que corre: el arroyo de la meseta y la cortina de la cascada comparten
// sombreador, con vetas blancas que bajan.
const FLOW_SHADER = {
 vertexShader: /* glsl */ `
  varying vec2 vUv;
  void main() {
   vUv = uv;
   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,
 fragmentShader: /* glsl */ `
  uniform vec3 uWaterShallow;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uLength;
  varying vec2 vUv;
  void main() {
   float lane = sin(vUv.x * 19.0 + sin(vUv.y * uLength * 0.8) * 1.4) * 0.5 + 0.5;
   float run = fract(vUv.y * uLength * 0.35 + uTime * uSpeed + lane * 0.4);
   float streak = smoothstep(0.0, 0.12, run) * (1.0 - smoothstep(0.12, 0.5, run)) * lane;
   float edge = smoothstep(0.5, 0.42, abs(vUv.x - 0.5));
   vec3 color = mix(uWaterShallow * 1.05, vec3(1.0), clamp(streak * 0.85 + (1.0 - edge) * 0.6, 0.0, 1.0));
   gl_FragColor = vec4(color, 0.9 * smoothstep(0.5, 0.46, abs(vUv.x - 0.5)));
  }`,
};

// Cinta que sigue una línea de puntos 3D con un ancho dado; uv.y recorre su largo.
function ribbon(points, width) {
 const positions = [];
 const uvs = [];
 const indices = [];
 let travelled = 0;
 points.forEach((point, i) => {
  const previous = points[Math.max(i - 1, 0)];
  const next = points[Math.min(i + 1, points.length - 1)];
  const tangent = new THREE.Vector3().subVectors(next, previous).setY(0).normalize();
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(width / 2);
  if (i) travelled += point.distanceTo(previous);
  positions.push(point.x - side.x, point.y, point.z - side.z, point.x + side.x, point.y, point.z + side.z);
  uvs.push(0, travelled, 1, travelled);
  if (i) indices.push(i * 2 - 2, i * 2, i * 2 - 1, i * 2 - 1, i * 2, i * 2 + 1);
 });
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
 // uv.y normalizado a 0–1; el largo real se pasa aparte.
 geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs.map((v, i) => (i % 2 ? v / travelled : v)), 2));
 geometry.setIndex(indices);
 return { geometry, length: travelled };
}

const SPRAY = 60;

function Waterfall() {
 const spray = useRef(null);
 const helper = useMemo(() => new THREE.Object3D(), []);
 const drops = useMemo(
  () => Array.from({ length: SPRAY }, () => ({ life: Math.random(), angle: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 1.2, lift: 1.2 + Math.random() * 1.8, size: 0.08 + Math.random() * 0.16 })),
  [],
 );

 const parts = useMemo(() => {
  const flowMaterial = (speed, length) =>
   new THREE.ShaderMaterial({
    ...FLOW_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uWaterShallow: uniforms.uWaterShallow, uTime: uniforms.uTime, uSpeed: { value: speed }, uLength: { value: length } },
   });
  // Arroyo sobre la meseta, del manantial al borde.
  const curve = new THREE.CatmullRomCurve3(STREAM.map(([x, z]) => new THREE.Vector3(x, PLATEAU.height + 0.04, z)));
  const stream = ribbon(curve.getPoints(40), 1.7);
  // Cortina: sale del borde y cae en parábola hasta el estanque.
  const { x, z, top, width } = WATERFALL;
  const fall = ribbon(
   Array.from({ length: 16 }, (_, i) => {
    const t = i / 15;
    return new THREE.Vector3(x, top + 0.04 - (top - WATER_LEVEL) * t * t, z - 0.9 + t * 2.3);
   }),
   width,
  );
  return {
   stream: { ...stream, material: flowMaterial(-0.35, stream.length) },
   fall: { ...fall, material: flowMaterial(-1.5, fall.length) },
  };
 }, []);
 useEffect(
  () => () => {
   for (const part of Object.values(parts)) {
    part.geometry.dispose();
    part.material.dispose();
   }
  },
  [parts],
 );

 // Salpicaduras al pie de la cascada: bolitas blancas que saltan y caen.
 useFrame((_, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  const baseX = WATERFALL.x;
  const baseZ = WATERFALL.z + 1.45;
  drops.forEach((drop, i) => {
   drop.life += dt * 0.9;
   if (drop.life > 1) {
    drop.life = 0;
    drop.angle = Math.random() * Math.PI * 2;
   }
   const t = drop.life;
   const reach = t * drop.speed;
   helper.position.set(baseX + Math.cos(drop.angle) * reach * 1.3, WATER_LEVEL + Math.sin(t * Math.PI) * drop.lift * 0.45, baseZ + Math.sin(drop.angle) * reach);
   helper.scale.setScalar(drop.size * (1 - t * 0.6));
   helper.updateMatrix();
   spray.current.setMatrixAt(i, helper.matrix);
  });
  spray.current.instanceMatrix.needsUpdate = true;
 });

 const spring = STREAM[0];
 return (
  <>
   <mesh geometry={parts.stream.geometry} material={parts.stream.material} />
   <mesh geometry={parts.fall.geometry} material={parts.fall.material} />
   {/* Manantial del que nace el arroyo. */}
   <mesh position={[spring[0], PLATEAU.height + 0.05, spring[1]]} rotation-x={-Math.PI / 2}>
    <circleGeometry args={[1.7, 20]} />
    <meshBasicMaterial color="#8fe9dc" transparent opacity={0.9} />
   </mesh>
   <instancedMesh ref={spray} args={[undefined, undefined, SPRAY]} frustumCulled={false}>
    <icosahedronGeometry args={[1, 0]} />
    <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
   </instancedMesh>
  </>
 );
}

// ── Puente y losas ──────────────────────────────────────────────────────────
function Bridges() {
 const plank = useMemo(() => new THREE.BoxGeometry(1, 0.12, 1), []);
 const wood = useMemo(() => new THREE.MeshLambertMaterial({ flatShading: true }), []);
 const items = useMemo(() => {
  const list = [];
  for (const bridge of BRIDGES) {
   const [ax, az] = bridge.from;
   const [bx, bz] = bridge.to;
   const length = Math.hypot(bx - ax, bz - az);
   const yaw = Math.atan2(-(bz - az), bx - ax);
   const count = Math.round(length / 0.62);
   for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const y = 0.12 + Math.sin(t * Math.PI) * bridge.rise;
    const slope = Math.atan((Math.cos(t * Math.PI) * Math.PI * bridge.rise) / length);
    // Tablones a lo ancho, siguiendo el arco.
    list.push({ position: [ax + (bx - ax) * t, y - 0.07, az + (bz - az) * t], rotation: [0, yaw, slope], scale: [0.54, 1, bridge.width + 0.5], color: i % 2 ? "#b9824f" : "#a87343" });
    // Postes de la barandilla, uno de cada dos tablones.
    if (i % 2 === 0) {
     for (const side of [-1, 1]) {
      const nx = (-(bz - az) / length) * side * (bridge.width / 2 + 0.2);
      const nz = ((bx - ax) / length) * side * (bridge.width / 2 + 0.2);
      list.push({ position: [ax + (bx - ax) * t + nx, y + 0.45, az + (bz - az) * t + nz], rotation: [0, yaw, 0], scale: [0.16, 9, 0.16], color: "#7d5233" });
     }
    }
   }
   // Pasamanos: dos largueros que siguen el arco por tramos.
   for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
     const t = (i + 0.5) / 6;
     const nx = (-(bz - az) / length) * side * (bridge.width / 2 + 0.2);
     const nz = ((bx - ax) / length) * side * (bridge.width / 2 + 0.2);
     const slope = Math.atan((Math.cos(t * Math.PI) * Math.PI * bridge.rise) / length);
     list.push({ position: [ax + (bx - ax) * t + nx, 0.12 + Math.sin(t * Math.PI) * bridge.rise + 0.95, az + (bz - az) * t + nz], rotation: [0, yaw, slope], scale: [length / 6 + 0.06, 1, 0.14], color: "#7d5233" });
    }
   }
  }
  return list;
 }, []);
 return <Instances geometry={plank} material={wood} items={items} colored castShadow receiveShadow />;
}

// Losas sueltas a lo largo de los caminos.
function SteppingStones() {
 const geometry = useMemo(() => new THREE.CylinderGeometry(0.5, 0.56, 0.1, 6), []);
 const material = useMemo(() => new THREE.MeshLambertMaterial({ color: "#c9c4cf", flatShading: true }), []);
 const items = useMemo(() => {
  const list = [];
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const path of PATHS) {
   for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const steps = Math.floor(Math.hypot(bx - ax, bz - az) / 1.5);
    for (let k = 1; k < steps; k++) {
     const t = k / steps;
     const x = ax + (bx - ax) * t + (random() - 0.5) * 0.5;
     const z = az + (bz - az) * t + (random() - 0.5) * 0.5;
     const y = groundHeight(x, z);
     if (y < -0.03) continue;
     const scale = 0.75 + random() * 0.45;
     list.push({ position: [x, y + 0.04, z], rotation: [0, random() * Math.PI, 0], scale: [scale, 1, scale] });
    }
   }
  }
  return list;
 }, []);
 return <Instances geometry={geometry} material={material} items={items} receiveShadow />;
}

export function Terrain() {
 const ground = useMemo(createGround, []);
 useEffect(() => () => ground.dispose(), [ground]);
 return (
  <>
   <mesh geometry={ground} receiveShadow castShadow>
    <meshLambertMaterial vertexColors flatShading />
   </mesh>
   <Water />
   <Waterfall />
   <Bridges />
   <SteppingStones />
  </>
 );
}
