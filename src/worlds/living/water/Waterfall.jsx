import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { createGlowTexture } from "../../../experience/textures";
import { current, uniforms } from "../../../experience/theme";
import { PLATEAU, STREAM, STREAM_LEVEL, WATERFALL, WATER_LEVEL } from "../layout";
import { CELLS } from "./glsl";

// Agua que corre por una cinta: el arroyo de la meseta y las láminas de la
// cascada. uv.x cruza la cinta y uv.y la recorre (0 arriba, 1 abajo).
//  · `uFall`: 0 = arroyo tumbado, 1 = lámina que cae (más blanca, borde dentado).
const FLOW_SHADER = {
 vertexShader: /* glsl */ `
  varying vec2 vUv;
  void main() {
   vUv = uv;
   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,
 fragmentShader: /* glsl */ `
  uniform vec3 uWaterShallow;
  uniform vec3 uWaterDeep;
  uniform float uTime;
  uniform float uNight;
  uniform float uSpeed;
  uniform float uLength;
  uniform float uWidth;
  uniform float uFall;
  uniform float uWhite;
  uniform float uSeed;
  varying vec2 vUv;
  ${CELLS}

  void main() {
   float across = vUv.x - 0.5;
   float along = vUv.y * uLength;
   // Celdas estiradas en el sentido de la corriente: hilos de agua que bajan.
   vec2 threads = cells(vec2(vUv.x * uWidth * 1.5 + uSeed, along * mix(0.5, 0.28, uFall) - uTime * uSpeed), 0.0);
   float lines = smoothstep(mix(0.09, 0.16, uFall), 0.0, threads.y);
   float clumps = smoothstep(0.25, 0.6, threads.x);

   // Borde: en la cascada se deshilacha; en el arroyo es espuma contra la orilla.
   float ragged = cells(vec2(along * 1.3 - uTime * uSpeed * 2.0, uSeed), 0.0).x * 0.13 * uFall;
   float edge = abs(across) + ragged;
   if (edge > 0.5) discard;
   float rim = smoothstep(0.34, 0.48, edge);

   // Cuerpo de agua de color, en dos tonos, y por encima los hilos blancos.
   vec3 base = mix(uWaterShallow, uWaterDeep, mix(0.42, 0.3, uFall) + 0.2 * clumps);
   float white = clamp(lines * 0.8 + rim * mix(0.6, 0.3, uFall) + uWhite, 0.0, 1.0);
   // La caída gana espuma en el último tramo y revienta al llegar.
   white = clamp(white + uFall * smoothstep(0.78, 1.0, vUv.y) * 0.7, 0.0, 1.0);
   vec3 foam = mix(vec3(1.0), vec3(0.62, 0.78, 1.0), uNight * 0.75);
   vec3 color = mix(base, foam, white);
   gl_FragColor = vec4(color, mix(0.9, 0.97, white));
  }`,
};

// Cinta que sigue una línea de puntos 3D; uv.y recorre su largo (0–1).
// `columns`: divisiones a lo ancho; con `bulge` la cinta se abomba hacia fuera.
function ribbon(points, width, { columns = 1, bulge = 0 } = {}) {
 const positions = [];
 const uvs = [];
 const indices = [];
 const lengths = [0];
 for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
 const total = lengths[lengths.length - 1];
 points.forEach((point, i) => {
  const previous = points[Math.max(i - 1, 0)];
  const next = points[Math.min(i + 1, points.length - 1)];
  const tangent = new THREE.Vector3().subVectors(next, previous).normalize();
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  const out = new THREE.Vector3().crossVectors(side, tangent).normalize();
  for (let c = 0; c <= columns; c++) {
   const u = c / columns;
   const lift = Math.sin(u * Math.PI) * bulge;
   positions.push(point.x + side.x * (u - 0.5) * width + out.x * lift, point.y + out.y * lift, point.z + side.z * (u - 0.5) * width + out.z * lift);
   uvs.push(u, lengths[i] / total);
   if (i && c) {
    const a = (i - 1) * (columns + 1) + c - 1;
    const b = i * (columns + 1) + c - 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
   }
  }
 });
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
 geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
 geometry.setIndex(indices);
 return { geometry, length: total };
}

const flowMaterial = ({ speed, length, width, fall = 0, white = 0, seed = 0 }) =>
 new THREE.ShaderMaterial({
  ...FLOW_SHADER,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  uniforms: {
   uWaterShallow: uniforms.uWaterShallow,
   uWaterDeep: uniforms.uWaterDeep,
   uTime: uniforms.uTime,
   uNight: uniforms.uNight,
   uSpeed: { value: speed },
   uLength: { value: length },
   uWidth: { value: width },
   uFall: { value: fall },
   uWhite: { value: white },
   uSeed: { value: seed },
  },
 });

// Láminas de la cascada, de atrás adelante: [desplazamiento lateral, ancho,
// cuánto sobresale, velocidad, blancura extra].
const SHEETS = [
 [0, 1, 0, 1.25, 0],
 [-0.28, 0.4, 0.22, 1.7, 0.04],
 [0.3, 0.32, 0.3, 2.0, 0.08],
 [0.04, 0.2, 0.42, 2.35, 0.14],
];
const DROPS = 46;
const MIST = 8;
const RINGS = 3;

export function Waterfall() {
 const drops = useRef(null);
 const mist = useRef([]);
 const rings = useRef([]);
 const helper = useMemo(() => new THREE.Object3D(), []);
 const glow = useMemo(() => createGlowTexture(), []);
 const spray = useMemo(
  () => Array.from({ length: DROPS }, () => ({ life: Math.random(), angle: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 1.3, lift: 0.9 + Math.random() * 1.6, size: 0.04 + Math.random() * 0.075 })),
  [],
 );
 const puffs = useMemo(() => Array.from({ length: MIST }, (_, i) => ({ life: i / MIST, side: Math.random() * 2 - 1, drift: Math.random() * 2 - 1, size: 1.3 + Math.random() * 1.3 })), []);

 const parts = useMemo(() => {
  const list = [];
  // Arroyo sobre la meseta, del manantial al borde, dentro de su cauce.
  const curve = new THREE.CatmullRomCurve3(STREAM.map(([x, z]) => new THREE.Vector3(x, STREAM_LEVEL, z)));
  const stream = ribbon(curve.getPoints(44), 2.3);
  list.push({ ...stream, material: flowMaterial({ speed: 0.42, length: stream.length, width: 2.3 }) });

  // Cascada: sale del borde y cae en parábola hasta el estanque.
  const { x, z, top, width } = WATERFALL;
  const drop = STREAM_LEVEL - WATER_LEVEL;
  SHEETS.forEach(([shift, share, forward, speed, white], i) => {
   const path = Array.from({ length: 18 }, (_, k) => {
    const t = k / 17;
    return new THREE.Vector3(x + shift * width, STREAM_LEVEL - drop * t * t, z - 0.75 + t * (2.0 + forward) + forward * 0.4);
   });
   const sheet = ribbon(path, width * share, { columns: i ? 2 : 4, bulge: i ? 0.08 : 0.16 });
   list.push({ ...sheet, material: flowMaterial({ speed, length: sheet.length, width: width * share, fall: 1, white, seed: i * 7.3 }) });
  });
  void top;
  return list;
 }, []);
 useEffect(
  () => () => {
   glow.dispose();
   for (const part of parts) {
    part.geometry.dispose();
    part.material.dispose();
   }
  },
  [parts, glow],
 );

 const baseX = WATERFALL.x;
 const baseZ = WATERFALL.z + 1.45;
 useFrame(({ camera }, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  // Gotas que saltan del pie de la cascada.
  spray.forEach((drop, i) => {
   drop.life += dt * 1.1;
   if (drop.life > 1) {
    drop.life = 0;
    drop.angle = Math.random() * Math.PI * 2;
   }
   const t = drop.life;
   const reach = t * drop.speed;
   helper.position.set(baseX + Math.cos(drop.angle) * reach * 1.3, WATER_LEVEL + Math.sin(t * Math.PI) * drop.lift * 0.5, baseZ + Math.sin(drop.angle) * reach * 0.9 + 0.1);
   helper.rotation.set(t * 7, drop.angle, 0);
   helper.scale.setScalar(drop.size * (1 - t * 0.5));
   helper.updateMatrix();
   drops.current.setMatrixAt(i, helper.matrix);
  });
  drops.current.instanceMatrix.needsUpdate = true;

  // Bruma: nubecillas que suben, se abren y se deshacen.
  const dim = 1 - current.glow * 0.55;
  puffs.forEach((puff, i) => {
   puff.life += dt * 0.22;
   if (puff.life > 1) {
    puff.life = 0;
    puff.side = Math.random() * 2 - 1;
    puff.drift = Math.random() * 2 - 1;
   }
   const sprite = mist.current[i];
   const t = puff.life;
   sprite.position.set(baseX + puff.side * 1.2 + puff.drift * t * 0.8, WATER_LEVEL + 0.2 + t * 1.5, baseZ + 0.2 + t * 0.9);
   sprite.scale.setScalar(puff.size * (0.6 + t * 1.3));
   sprite.quaternion.copy(camera.quaternion);
   sprite.material.opacity = Math.sin(t * Math.PI) * 0.09 * dim;
  });

  // Anillos de espuma que se abren sobre el estanque.
  rings.current.forEach((ring, i) => {
   const t = (uniforms.uTime.value * 0.3 + i / RINGS) % 1;
   ring.scale.setScalar(1.1 + t * 2.6);
   ring.material.opacity = (1 - t) * 0.5 * dim;
  });
 });

 return (
  <>
   {parts.map((part, i) => (
    <mesh key={i} geometry={part.geometry} material={part.material} renderOrder={i} />
   ))}
   <instancedMesh ref={drops} args={[undefined, undefined, DROPS]} frustumCulled={false}>
    <tetrahedronGeometry args={[1, 0]} />
    <meshBasicMaterial color="#f4fbff" transparent opacity={0.9} />
   </instancedMesh>
   {puffs.map((_, i) => (
    <mesh key={i} ref={(node) => (mist.current[i] = node)} renderOrder={8}>
     <planeGeometry />
     <meshBasicMaterial map={glow} color="#eaf6ff" transparent opacity={0} depthWrite={false} fog={false} />
    </mesh>
   ))}
   {Array.from({ length: RINGS }, (_, i) => (
    <mesh key={i} ref={(node) => (rings.current[i] = node)} position={[baseX, WATER_LEVEL + 0.03, baseZ + 0.25]} rotation-x={-Math.PI / 2} renderOrder={6}>
     <ringGeometry args={[0.86, 1, 9]} />
     <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
    </mesh>
   ))}
   {/* Manantial del que nace el arroyo: una poza entre piedras. */}
   <mesh position={[STREAM[0][0], STREAM_LEVEL, STREAM[0][1]]} rotation-x={-Math.PI / 2} material={parts[0].material}>
    <circleGeometry args={[2.1, 12]} />
   </mesh>
  </>
 );
}
