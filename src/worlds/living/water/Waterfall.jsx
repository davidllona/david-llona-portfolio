import { BLUESTONE, ROCK_SHAPES, WET_STONE, createBlock } from "../props/rockModel";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { createGlowTexture } from "../../../experience/textures";
import { attribute, mix, positionLocal, sin, smoothstep, step, texture, uv, vec2, vec3 } from "three/tsl";
import { noiseTexture } from "../../../experience/environment/noise";
import { lambert, unlit } from "../../../experience/materials";
import { current, uniforms } from "../../../experience/theme";
import { merge } from "../kit/geometry";
import { STREAM, STREAM_LEVEL, WATERFALL, WATER_LEVEL } from "../layout";

// Agua que corre por una cinta: el arroyo de la meseta y las láminas de la
// cascada. uv.x cruza la cinta y uv.y la recorre (0 arriba, 1 abajo).
//  · fall: 0 = arroyo tumbado, 1 = lámina que cae (más blanca, borde dentado).
function flowMaterial({ speed, length, width, fall = 0, white = 0, seed = 0 }) {
 const { uTime, uWaterShallow, uWaterDeep, uNight } = uniforms;
 const noise = (p) => texture(noiseTexture, p);
 const across = uv().x.sub(0.5);
 const along = uv().y.mul(length);
 // Hilos de agua: dos capas de ruido muy estiradas en el sentido de la
 // corriente, que bajan a distinto paso; donde se cruzan sale un hilo claro.
 const stretch = fall ? 0.034 : 0.05;
 const first = noise(vec2(uv().x.mul(width * 0.2).add(seed * 0.13), along.mul(stretch).sub(uTime.mul(speed * 0.12)))).r;
 const second = noise(vec2(uv().x.mul(width * 0.34).add(seed * 0.29 + 0.4), along.mul(stretch * 1.7).sub(uTime.mul(speed * 0.2)))).g;
 const lines = smoothstep(fall ? 0.07 : 0.03, 0.006, first.add(second).sub(1).abs());
 const clumps = smoothstep(0.35, 0.65, first);
 // Borde: en la cascada se deshilacha (entra y sale mientras cae); en el
 // arroyo es espuma contra la orilla.
 const ragged = noise(vec2(along.mul(0.1).sub(uTime.mul(speed * 0.28)), uv().x.mul(0.05).add(seed * 0.37))).r.sub(0.45).mul(0.34 * fall);
 const edge = across.abs().add(ragged);
 const rim = smoothstep(0.34, 0.48, edge);
 // Cuerpo de agua de color, en dos tonos, y por encima los hilos blancos.
 const base = mix(uWaterShallow, uWaterDeep, clumps.mul(0.2).add(fall ? 0.3 : 0.42));
 let foam = lines.mul(0.8).add(rim.mul(fall ? 0.3 : 0.6)).add(white);
 // La caída gana espuma en el último tramo y revienta al llegar.
 if (fall) foam = foam.add(smoothstep(0.78, 1, uv().y).mul(0.7));
 foam = foam.clamp(0, 1);
 const material = unlit({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
 material.colorNode = mix(base, mix(vec3(1), vec3(0.62, 0.78, 1), uNight.mul(0.75)), foam);
 material.opacityNode = mix(0.9, 0.97, foam).mul(step(edge, 0.5));
 return material;
}

// Cinta que sigue una línea de puntos 3D; uv.y recorre su largo (0–1).
// `columns`: divisiones a lo ancho; con `bulge` la cinta se abomba hacia fuera.
//  · flare: cuánto se abre hacia el final (0 = ancho constante).
function ribbon(points, width, { columns = 1, bulge = 0, flare = 0 } = {}) {
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
   const wide = width * (1 - flare * 0.5 + (flare * lengths[i]) / total);
   positions.push(point.x + side.x * (u - 0.5) * wide + out.x * lift, point.y + out.y * lift, point.z + side.z * (u - 0.5) * wide + out.z * lift);
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

// Láminas de la cascada, de atrás adelante: [desplazamiento lateral, ancho,
// cuánto sobresale, velocidad, blancura extra].
const SHEETS = [
 [0, 1, 0, 1.25, 0],
 [-0.28, 0.4, 0.22, 1.7, 0.04],
 [0.3, 0.32, 0.3, 2.0, 0.08],
 [0.04, 0.2, 0.42, 2.35, 0.14],
];
// La roca del salto: un canal oscuro y mojado por detrás del agua, bloques que
// la encauzan a los lados, el labio del que cae y piedras donde rompe.
function createRocks() {
 const { x, z } = WATERFALL;
 const drop = STREAM_LEVEL - WATER_LEVEL;
 const wet = WET_STONE; // piedra mojada, más oscura
 // Bloques de cantos biselados, como el resto de rocas (props/rockModel.js);
 // los secos, con musgo arriba.
 const stone = (seed, position, scale, colors) =>
  createBlock(((seed * 0.137) % 1 + 1) % 1 + 0.01, { shape: ROCK_SHAPES[Math.abs(seed) % ROCK_SHAPES.length], moss: colors ? 0 : 1, stone: colors ?? BLUESTONE, position: [position[0], position[1] - 0.25 * scale[1], position[2]], scale: scale.map((v) => v * 1.12), rotation: [0, seed * 2.1, (seed % 3 - 1) * 0.12] });
 const pieces = [];
 // Pared del fondo, en escalones que avanzan hacia abajo.
 for (let i = 0; i < 5; i++) {
  const t = i / 4;
  pieces.push(stone(i + 1, [x + (i % 2 ? 0.25 : -0.2), STREAM_LEVEL - 0.5 - drop * t * 0.9, z - 0.95 + t * 0.9], [1.75 - t * 0.25, 0.75, 0.75], wet));
 }
 // Columnas laterales que estrechan la caída, más altas arriba.
 for (const side of [-1, 1]) {
  for (let i = 0; i < 4; i++) {
   const t = i / 3;
   pieces.push(stone(10 + i + side, [x + side * (1.75 + (i % 2) * 0.3), STREAM_LEVEL - 0.2 - drop * t * 0.92, z - 0.5 + t * 1.3], [0.85 + (i % 2) * 0.25, 0.9, 0.85]));
  }
  // Labio: dos piedras que sujetan el arroyo antes de saltar.
  pieces.push(stone(30 + side, [x + side * 1.5, STREAM_LEVEL + 0.12, z - 1.0], [0.6, 0.42, 0.7]));
 }
 // Piedra que parte el agua en lo alto y bloques donde rompe abajo.
 pieces.push(stone(41, [x + 0.35, STREAM_LEVEL - 0.05, z - 0.55], [0.34, 0.3, 0.4], wet));
 pieces.push(stone(42, [x - 1.25, WATER_LEVEL + 0.05, z + 1.2], [0.62, 0.42, 0.6], wet), stone(43, [x + 1.35, WATER_LEVEL + 0.02, z + 1.35], [0.5, 0.36, 0.55], wet), stone(44, [x + 0.15, WATER_LEVEL - 0.05, z + 0.75], [0.42, 0.3, 0.4], wet));
 return merge(pieces);
}

const PILLOWS = 9; // almohadas de espuma en la base
const DROPS = 46;
const MIST = 8;

export function Waterfall() {
 const drops = useRef(null);
 const mist = useRef([]);
 const helper = useMemo(() => new THREE.Object3D(), []);
 const rocks = useMemo(createRocks, []);
 const rockMaterial = useMemo(() => lambert(), []);
 // Espuma con volumen: bultos blancos facetados que suben y bajan a destiempo.
 const pillows = useMemo(() => {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const seeds = new Float32Array(PILLOWS).map((_, i) => i * 1.93 + 0.4);
  geometry.setAttribute("seed", new THREE.InstancedBufferAttribute(seeds, 1));
  const material = lambert({ vertexColors: false, color: "#f4fbff", emissive: "#9fb9c9" });
  const seed = attribute("seed", "float");
  const swell = sin(uniforms.uTime.mul(2.6).add(seed)).mul(0.5).add(0.5);
  material.positionNode = positionLocal.add(vec3(0, swell.mul(0.16), 0));
  return { geometry, material };
 }, []);
 const pillowMesh = useRef(null);
 useEffect(() => {
  const dummy = new THREE.Object3D();
  for (let i = 0; i < PILLOWS; i++) {
   const angle = (i / PILLOWS) * Math.PI + 0.15;
   const radius = 0.5 + (i % 3) * 0.42;
   dummy.position.set(WATERFALL.x + Math.cos(angle) * radius * 1.5, WATER_LEVEL - 0.08, WATERFALL.z + 1.3 + Math.sin(angle) * radius * 0.75);
   dummy.rotation.set(i, i * 2.3, i * 0.6);
   dummy.scale.set(0.34 + (i % 4) * 0.09, 0.2 + (i % 3) * 0.05, 0.3 + (i % 2) * 0.12);
   dummy.updateMatrix();
   pillowMesh.current.setMatrixAt(i, dummy.matrix);
  }
  pillowMesh.current.instanceMatrix.needsUpdate = true;
  return () => {
   rocks.dispose();
   rockMaterial.dispose();
   pillows.geometry.dispose();
   pillows.material.dispose();
  };
 }, [rocks, rockMaterial, pillows]);
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
   const sheet = ribbon(path, width * share, { columns: i ? 2 : 4, bulge: i ? 0.08 : 0.16, flare: i ? 0.5 : 0.28 });
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

  // (Los anillos que se abren sobre el estanque los dibuja el propio agua: Water.jsx.)
 });

 return (
  <>
   {parts.map((part, i) => (
    <mesh key={i} name="agua de la cascada" geometry={part.geometry} material={part.material} renderOrder={i} />
   ))}
   <mesh name="rocas de la cascada" geometry={rocks} material={rockMaterial} castShadow receiveShadow />
   <instancedMesh ref={pillowMesh} args={[pillows.geometry, pillows.material, PILLOWS]} frustumCulled={false} />
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
   {/* Manantial del que nace el arroyo: una poza entre piedras. */}
   <mesh position={[STREAM[0][0], STREAM_LEVEL, STREAM[0][1]]} rotation-x={-Math.PI / 2} material={parts[0].material}>
    <circleGeometry args={[2.1, 12]} />
   </mesh>
  </>
 );
}
