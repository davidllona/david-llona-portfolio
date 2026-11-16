import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { attribute, float, fract, hash, instanceIndex, positionGeometry, sin, uniform, vec3 } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { bendWorld } from "../../experience/environment/bend";
import { Instances } from "../../experience/Instances";
import { addWarmSource } from "../../experience/lightSources";
import { createGlowTexture } from "../../experience/textures";
import { uniforms } from "../../experience/theme";
import { Halos } from "../living/props/Halos";
import { LANTERNS, PUMPKINS, height } from "./layout";
import { glass, pool, solid } from "./materials";
import { WARM } from "./models";
import { LANTERN_POST_GLASS, createLanternPost, createPumpkin } from "./plants";

// Detalles sueltos: calabazas sonrientes (pocas), farolillos en los caminos y
// en los puentes, y el humo de las chimeneas.
const turnedPoint = ([px, py, pz], item, y) => [item.x + px * Math.cos(item.turn) + pz * Math.sin(item.turn), y + py, item.z - px * Math.sin(item.turn) + pz * Math.cos(item.turn)];

export function Details() {
 const models = useMemo(() => ({ pumpkin: createPumpkin(), post: createLanternPost(), glass: new THREE.BoxGeometry(0.14, 0.18, 0.14), pool: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) }), []);
 const material = useMemo(() => ({ solid: solid(), lit: glass(WARM), face: glass("#ffb03a"), light: pool("#ff9a3c", 0.42) }), []);
 const placed = useMemo(() => {
  const posts = LANTERNS.map((one) => ({ ...one, y: height(one.x, one.z) }));
  const heads = posts.map((one) => turnedPoint(LANTERN_POST_GLASS, one, one.y));
  const pumpkins = PUMPKINS.map((one) => ({ position: [one.x, height(one.x, one.z) - 0.05, one.z], rotation: [0, one.turn, 0], scale: one.scale }));
  return {
   heads,
   posts: posts.map((one) => ({ position: [one.x, one.y - 0.03, one.z], rotation: [0, one.turn, 0] })),
   glasses: heads.map((head, i) => ({ position: head, rotation: [0, posts[i].turn, 0] })),
   pumpkins,
   // Charcos de luz: cada farolillo, el suyo —unos anchos y flojos, otros recogidos y vivos— y uno de
   // cada cinco, sin charco (un farol a medio gas): que no sean discos iguales.
   pools: [
    ...heads.flatMap((head, i) => {
     const a = (Math.sin(i * 12.9898) * 43758.5453) % 1, b = (Math.sin(i * 78.233) * 43758.5453) % 1;
     const size = Math.abs(a), power = Math.abs(b);
     if (i % 5 === 3) return [];
     return [{ position: [head[0], height(head[0], head[2]) + 0.06, head[2]], scale: 2.5 + size * 2.6, color: new THREE.Color().setScalar(0.5 + power * 0.75 - size * 0.2) }];
    }),
    ...pumpkins.map(({ position, scale }) => ({ position: [position[0], position[1] + 0.1, position[2] + 0.5 * scale], scale: 1.6 * scale, color: new THREE.Color(1, 1, 1) })),
   ],
  };
 }, []);
 useEffect(() => {
  // (Flojos: son farolillos. Más fuertes, teñían de naranja todo lo que tenían cerca, el observatorio entero.)
  const stop = placed.heads.map(([x, y, z]) => addWarmSource({ x, y: y - 0.1, z, power: 0.42, reach: 4.5, flicker: 0.07, color: "#ffa552" }));
  return () => stop.forEach((off) => off());
 }, [placed]);
 useEffect(
  () => () => {
   [models.pumpkin.shell, models.pumpkin.face, models.post, models.glass, models.pool].forEach((one) => one.dispose());
   material.solid.dispose();
   material.lit.dispose();
   material.face.dispose();
   material.light.dispose();
  },
  [models, material],
 );
 return (
  <>
   <Instances name="calabaza" rests={0} geometry={models.pumpkin.shell} material={material.solid} items={placed.pumpkins} castShadow receiveShadow />
   <Instances geometry={models.pumpkin.face} material={material.face.material} items={placed.pumpkins} />
   <Instances name="farolillo" rests={0} geometry={models.post} material={material.solid} items={placed.posts} castShadow />
   <Instances geometry={models.glass} material={material.lit.material} items={placed.glasses} />
   <Instances geometry={models.pool} material={material.light.material} items={placed.pools} colored renderOrder={2} />
   <Halos points={placed.heads} size={1.3} color="#ffa24e" night={0.55} />
  </>
 );
}

// Humo de chimenea: bocanadas suaves que suben, se abren y se deshacen. Cada
// bocanada es una mancha de cara a la cámara; el movimiento lo calcula el
// sombreador (no hay nada que actualizar en cada fotograma salvo la cámara).
// `sources`: [[x, y, z], …], las bocas de las chimeneas. Con otros ajustes es
// también la espuma al pie de las cascadas (`color`, `speed`, `rise`, `size`,
// `opacity`, `puffs`, `additive`).
export function Smoke({ sources, name = "humo", color = "#a49bd0", speed = 0.13, rise = 3.2, size: big = 1.3, opacity = 0.3, puffs: PUFFS = 7, additive = false, spread = 1 }) {
 const glow = useMemo(() => createGlowTexture(), []);
 const basis = useMemo(() => ({ right: uniform(new THREE.Vector3(1, 0, 0)), up: uniform(new THREE.Vector3(0, 1, 0)) }), []);
 const geometry = useMemo(() => {
  const plane = new THREE.PlaneGeometry(1, 1);
  const instanced = new THREE.InstancedBufferGeometry();
  instanced.setAttribute("position", plane.attributes.position);
  instanced.setAttribute("uv", plane.attributes.uv);
  instanced.setIndex(plane.index);
  const origins = sources.flatMap((source) => Array.from({ length: PUFFS }, () => source)).flat();
  instanced.setAttribute("origin", new THREE.InstancedBufferAttribute(new Float32Array(origins), 3));
  instanced.instanceCount = sources.length * PUFFS;
  instanced.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  return instanced;
 }, [sources, PUFFS]);
 const material = useMemo(() => {
  const one = new MeshBasicNodeMaterial({ map: glow, color, transparent: true, depthWrite: false, ...(additive ? { blending: THREE.AdditiveBlending, toneMapped: false } : {}) });
  one.userData.flat = true;
  const seed = hash(instanceIndex);
  // Edad de la bocanada (0 al salir, 1 al deshacerse): cada una va desfasada.
  const age = fract(uniforms.uTime.mul(speed).add(seed));
  const drift = vec3(sin(age.mul(5).add(seed.mul(20))).mul(0.35 * spread).add(age.mul(0.9 * spread)), age.mul(rise), sin(age.mul(4).add(seed.mul(9))).mul(0.25 * spread));
  const size = age.mul(big).add(0.35);
  one.positionNode = bendWorld(attribute("origin", "vec3").add(drift)).add(basis.right.mul(positionGeometry.x.mul(size))).add(basis.up.mul(positionGeometry.y.mul(size)));
  one.opacityNode = sin(age.mul(Math.PI)).mul(float(opacity));
  return one;
 }, [glow, basis, color, speed, rise, big, opacity, additive, spread]);
 useEffect(
  () => () => {
   glow.dispose();
   geometry.dispose();
   material.dispose();
  },
  [glow, geometry, material],
 );
 useFrame(({ camera }) => {
  basis.right.value.setFromMatrixColumn(camera.matrixWorld, 0);
  basis.up.value.setFromMatrixColumn(camera.matrixWorld, 1);
 });
 return <mesh name={name} geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />;
}

// Gotas que saltan donde bate una cascada: puntos de luz pequeños que salen
// despedidos, suben y caen (una parábola por gota, calculada en el sombreador).
export function Drops({ sources, name = "gotas", color = "#a8f4ee", count = 12, reach = 1.1, jump = 0.9, speed = 0.85, size = 0.085 }) {
 const glow = useMemo(() => createGlowTexture(), []);
 const basis = useMemo(() => ({ right: uniform(new THREE.Vector3(1, 0, 0)), up: uniform(new THREE.Vector3(0, 1, 0)) }), []);
 const geometry = useMemo(() => {
  const plane = new THREE.PlaneGeometry(1, 1);
  const instanced = new THREE.InstancedBufferGeometry();
  instanced.setAttribute("position", plane.attributes.position);
  instanced.setAttribute("uv", plane.attributes.uv);
  instanced.setIndex(plane.index);
  const origins = sources.flatMap((source) => Array.from({ length: count }, () => source)).flat();
  instanced.setAttribute("origin", new THREE.InstancedBufferAttribute(new Float32Array(origins), 3));
  instanced.instanceCount = sources.length * count;
  instanced.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  return instanced;
 }, [sources, count]);
 const material = useMemo(() => {
  const one = new MeshBasicNodeMaterial({ map: glow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  one.userData.flat = true;
  const seed = hash(instanceIndex), other = hash(instanceIndex.add(977));
  const age = fract(uniforms.uTime.mul(seed.mul(0.6).add(0.7)).mul(speed).add(other));
  const angle = other.mul(Math.PI * 2);
  const out = age.mul(seed.mul(0.7).add(0.3)).mul(reach);
  const hop = vec3(angle.cos().mul(out), age.mul(age.oneMinus()).mul(4 * jump).mul(other.mul(0.6).add(0.4)), angle.sin().mul(out));
  one.positionNode = bendWorld(attribute("origin", "vec3").add(hop)).add(basis.right.mul(positionGeometry.x.mul(size))).add(basis.up.mul(positionGeometry.y.mul(size)));
  one.opacityNode = age.oneMinus().mul(0.9);
  return one;
 }, [glow, basis, color, reach, jump, speed, size]);
 useEffect(
  () => () => {
   glow.dispose();
   geometry.dispose();
   material.dispose();
  },
  [glow, geometry, material],
 );
 useFrame(({ camera }) => {
  basis.right.value.setFromMatrixColumn(camera.matrixWorld, 0);
  basis.up.value.setFromMatrixColumn(camera.matrixWorld, 1);
 });
 return <mesh name={name} geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />;
}
