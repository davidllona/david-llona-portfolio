import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { Instances } from "../../experience/Instances";
import { withSeeThrough } from "../../experience/environment/seeThrough";
import { withWind } from "../../experience/environment/wind";
import { diffuseColor, normalView, vec3 } from "three/tsl";
import { lambert } from "../../experience/materials";
import { BIG_TREES, FERNS, FLOWERS, ISLETS, MUSHROOMS, SEA_BED, SHARDS, TREES, TUFTS, VINES, WATER_LEVEL, height } from "./layout";
import { solid } from "./materials";
import { createCurlyTree, createDryTuft, createSeaRock, createShard } from "./models";
import { createBroadTree, createFlower, createMushroom, createSpiralTree, createVine, createWillow } from "./plants";

// Lo que crece en The Twisted Moon: sauces llorones, árboles de copa ancha y
// en espiral (morados y verde azulado), los árboles sin hojas de ramas
// rizadas, helechos, setas que brillan, flores violetas, enredaderas con
// rizos, matojos y lascas de piedra. Todo con instancias: una llamada de
// dibujo por forma; el color de cada copia va en la instancia.
const FERN_URL = "/models/twisted/helecho.glb";
const FERN_SIZE = 1.7; // m de lado del helecho (el modelo viene con el lado mayor = 1)

// Geometría de un modelo convertido (una malla, con el color en los vértices).
function useConverted(url) {
 const { scene } = useGLTF(url);
 const geometry = useMemo(() => {
  let source = null;
  scene.traverse((node) => node.isMesh && (source = node.geometry));
  const made = new THREE.BufferGeometry();
  made.setAttribute("position", source.attributes.position);
  made.setIndex(source.index);
  const from = source.attributes.color;
  const colors = new Float32Array(from.count * 3);
  for (let i = 0; i < from.count; i++) colors.set([from.getX(i), from.getY(i), from.getZ(i)], i * 3);
  made.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  made.computeVertexNormals();
  made.computeBoundingSphere();
  return made;
 }, [scene]);
 useEffect(() => () => geometry.dispose(), [geometry]);
 return geometry;
}

// Luz de luna de relleno para lo que crece: la luna está al fondo, así que la
// cara que mira a la cámara no la recibe y las copas quedaban en silueta negra.
// Se les suma un tono medio propio (su color, enfriado) y un borde frío en lo
// que se ve de refilón: la luna las recorta. Las sombras del suelo no cambian.
function moonlit(material, fill, edge) {
 const n = normalView.normalize();
 const rim = n.z.abs().oneMinus().pow(2).mul(n.y.mul(0.5).add(0.8).clamp(0, 1));
 material.emissiveNode = diffuseColor.rgb.mul(vec3(0.72, 0.82, 1.0)).mul(fill).add(vec3(0.42, 0.55, 0.95).mul(rim).mul(edge));
 return material;
}

// Copias apoyadas en el suelo: posición, giro, tamaño y (si lo lleva) su color.
const seat = (list, { sink = 0, size = 1, glow = 1 } = {}) =>
 list.map((one) => ({
  position: [one.x, height(one.x, one.z) - sink * (one.scale ?? 1), one.z],
  rotation: [0, one.turn ?? 0, 0],
  scale: (one.scale ?? 1) * size,
  color: one.tint ? new THREE.Color(one.tint).multiplyScalar(glow) : undefined,
 }));

export function Flora() {
 const fern = useConverted(FERN_URL);
 const models = useMemo(() => ({ curly: [0, 1, 2].map(createCurlyTree), willow: createWillow(), broad: createBroadTree(), spiral: createSpiralTree(), tuft: createDryTuft(), shard: createShard(), rock: createSeaRock(), vine: createVine(), flower: createFlower(), mushroom: createMushroom() }), []);
 const material = useMemo(
  () => ({
   wood: moonlit(solid(), 0.12, 0.16),
   // Las copas se mecen con el viento: el sauce, con sus tiras, mucho más que los demás.
   willow: withSeeThrough(withWind(moonlit(lambert({ side: THREE.DoubleSide }), 0.3, 0.18), { flex: 0.5, power: 2.2, cap: 5.4 })),
   crown: withSeeThrough(withWind(moonlit(lambert({ side: THREE.DoubleSide }), 0.28, 0.18), { flex: 0.14, power: 2, cap: 6 })),
   stone: moonlit(solid(), 0.1, 0.07),
   low: moonlit(lambert({ side: THREE.DoubleSide }), 0.16, 0),
   // El sombrero de las setas brilla con su color (por encima del umbral del resplandor: lleva halo).
   glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  }),
  [],
 );
 useEffect(
  () => () => {
   const { curly, mushroom, ...rest } = models;
   [...curly, ...Object.values(rest), mushroom.stem, mushroom.cap].forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  },
  [models, material],
 );
 const items = useMemo(
  () => ({
   curly: [0, 1, 2].map((kind) => seat(TREES.filter((tree) => tree.kind === kind), { sink: 0.05 })),
   big: Object.fromEntries(["willow", "broad", "spiral"].map((kind) => [kind, seat(BIG_TREES.filter((tree) => tree.kind === kind), { sink: 0.06 })])),
   tufts: seat(TUFTS, { sink: 0.02 }),
   shards: seat(SHARDS, { sink: 0.08 }),
   // (Las rocas del mar nacen del fondo: lo que asoma es su altura sobre el agua.)
   islets: ISLETS.map(([x, z, r, top, turn]) => ({ position: [x, SEA_BED, z], rotation: [0, turn, 0], scale: [r * 1.5, top + (WATER_LEVEL - SEA_BED), r * 1.5] })),
   ferns: seat(FERNS, { size: FERN_SIZE, sink: 0.02 }),
   vines: seat(VINES, { sink: 0.02 }),
   flowers: seat(FLOWERS, { sink: 0.01 }),
   stems: seat(MUSHROOMS.map((one) => ({ ...one, tint: undefined })), { sink: 0.02 }),
   caps: seat(MUSHROOMS, { sink: 0.02, glow: 1.25 }),
  }),
  [],
 );
 return (
  <>
   {models.curly.map((model, kind) => items.curly[kind].length > 0 && <Instances key={kind} name={`árbol rizado ${kind + 1}`} rests={0} geometry={model} material={material.wood} items={items.curly[kind]} castShadow receiveShadow />)}
   <Instances name="sauce" rests={0} geometry={models.willow} material={material.willow} items={items.big.willow} colored castShadow receiveShadow />
   <Instances name="árbol de copa ancha" rests={0} geometry={models.broad} material={material.crown} items={items.big.broad} colored castShadow receiveShadow />
   <Instances name="árbol en espiral" rests={0} geometry={models.spiral} material={material.crown} items={items.big.spiral} colored castShadow receiveShadow />
   <Instances name="islote" geometry={models.rock} material={material.stone} items={items.islets} castShadow />
   <Instances name="lasca de piedra" rests={0} geometry={models.shard} material={material.stone} items={items.shards} castShadow receiveShadow />
   <Instances name="matojo seco" rests={0} geometry={models.tuft} material={material.low} items={items.tufts} receiveShadow />
   <Instances name="helecho" rests={0} geometry={fern} material={material.low} items={items.ferns} colored receiveShadow />
   <Instances name="enredadera" rests={0} geometry={models.vine} material={material.low} items={items.vines} colored />
   <Instances name="flor" rests={0} geometry={models.flower} material={material.low} items={items.flowers} colored />
   <Instances name="pie de seta" rests={0} geometry={models.mushroom.stem} material={material.low} items={items.stems} />
   <Instances name="seta" geometry={models.mushroom.cap} material={material.glow} items={items.caps} colored />
  </>
 );
}

useGLTF.preload(FERN_URL);
