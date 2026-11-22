import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mix, positionLocal, smoothstep, texture, vec2, vec3 } from "three/tsl";
import { Instances } from "../../../experience/Instances";
import { noiseTexture } from "../../../experience/environment/noise";
import { addWarmSource } from "../../../experience/lightSources";
import { lambert, unlit } from "../../../experience/materials";
import { uniforms } from "../../../experience/theme";
import { createModelMaterial, preloadModel, useModel } from "../buildings/useModel";
import { merge, piece } from "../kit/geometry";
import { WOOD } from "../kit/palette";
import { BRIDGES, GARDEN, bridgeArc, bridgeSlope, groundHeight, height } from "../layout";
import { Halos } from "../props/Halos";
import { createRock } from "../props/rockModel";

// Jardín japonés, al este de la pista de baloncesto. Los modelos son los
// descargados (docs/CREDITOS.md, tools/assets/buildings.py): el torii, los
// faroles «Japan Lamp», la «Island cabin» como casa de té y el koi (solo la
// forma: el color, plano, se lo da cada copia). El puente va hecho a mano (el
// modelo descargado es un puente de carretera, con bolardos y sin barandillas).
// El estanque no toca el relieve: es una lámina de agua a ras de suelo, con su
// borde de piedras.
["torii", "farol-japones", "casa-te", "koi"].forEach(preloadModel);

const KOI_COLORS = ["#ff7a2e", "#f6f1e8", "#e8452a", "#ffb43a", "#f6f1e8", "#ff8a3d", "#2c2a30"];
const KOI_LENGTH = 0.62;
// Altura de la lámina de agua sobre el suelo: los kois caben debajo y el puente pasa por encima.
const WATER_DEPTH = 0.24;
const LAMP_SIZE = 0.52; // lado de la base; mide 2,33 veces eso de alto
const dummy = new THREE.Object3D();

// Puente japonés arqueado: tablero de tablas, largueros, postes con remate y
// dos barandillas por lado, en bermellón. El tablero sigue la curva que se
// pisa (`bridgeArc`), así que el astronauta y Woody caminan sobre las tablas.
// Sale centrado y a lo largo de +z; quien lo monta lo gira hacia su puente.
const VERMILION = { dark: "#a8281a", mid: "#cf3a1e", light: "#e2502a" };
function createArchBridge(bridge) {
 const span = Math.hypot(bridge.to[0] - bridge.from[0], bridge.to[1] - bridge.from[1]);
 const side = bridge.width / 2 + 0.2; // donde van las barandillas (y su colisión, en layout.js)
 const at = (t) => (t - 0.5) * span;
 const tilt = (t) => -Math.atan(bridgeSlope(bridge, t) / span);
 const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
 const parts = [];
 // Tablas.
 const PLANKS = 18;
 for (let i = 0; i < PLANKS; i++) {
  const t = (i + 0.5) / PLANKS;
  parts.push(piece(box(side * 2 + 0.12, 0.07, (span / PLANKS) * 0.9), { color: i % 2 ? "#8f5f3c" : "#7a4e31", vary: 0.08, seed: i, position: [0, bridgeArc(bridge, t) - 0.035, at(t)], rotation: [tilt(t), 0, 0] }));
 }
 // Largueros, pasamanos y travesaño intermedio: tramos cortos que siguen la curva.
 const RUNS = 12;
 for (const x of [-side, side]) {
  for (let i = 0; i < RUNS; i++) {
   const t = (i + 0.5) / RUNS, y = bridgeArc(bridge, t), length = (span / RUNS) * 1.06;
   parts.push(piece(box(0.12, 0.22, length), { bottom: VERMILION.dark, top: VERMILION.mid, position: [x, y - 0.13, at(t)], rotation: [tilt(t), 0, 0] }));
   parts.push(piece(box(0.1, 0.09, length), { bottom: VERMILION.mid, top: VERMILION.light, position: [x, y + 0.74, at(t)], rotation: [tilt(t), 0, 0] }));
   parts.push(piece(box(0.06, 0.07, length), { color: VERMILION.mid, position: [x, y + 0.4, at(t)], rotation: [tilt(t), 0, 0] }));
  }
  // Postes: los de los extremos, más altos y con su remate.
  [0.015, 0.26, 0.5, 0.74, 0.985].forEach((t, i) => {
   const end = i === 0 || i === 4;
   const tall = end ? 1.14 : 0.92, y = bridgeArc(bridge, t) - 0.24;
   parts.push(piece(box(0.15, tall, 0.15), { bottom: VERMILION.dark, top: VERMILION.light, position: [x, y + tall / 2, at(t)] }));
   parts.push(piece(box(0.21, 0.07, 0.21), { color: "#2a2125", position: [x, y + tall + 0.035, at(t)] }));
   if (end) parts.push(piece(new THREE.OctahedronGeometry(0.1, 0), { color: "#2a2125", position: [x, y + tall + 0.16, at(t)], scale: [1, 1.25, 1] }));
  });
 }
 return merge(parts);
}

// El agua del estanque: turquesa hondo en el centro y claro en la orilla, con
// unas ondas finas que derivan. De noche se apaga, como el resto del agua.
function createPondMaterial() {
 const { uTime, uWaterShallow, uWaterDeep, uNight } = uniforms;
 const p = positionLocal.xy; // el disco, antes de tumbarlo: radio 1
 const fromCentre = p.length();
 const at = p.mul(vec2(GARDEN.pond.rx, GARDEN.pond.rz));
 const waveA = texture(noiseTexture, at.mul(0.11).add(vec2(uTime.mul(0.012), uTime.mul(0.008)))).r;
 const waveB = texture(noiseTexture, at.mul(0.19).add(vec2(uTime.mul(-0.01), uTime.mul(0.014)))).g;
 const lines = smoothstep(0.022, 0.005, waveA.add(waveB).sub(1).abs()).mul(uNight.mul(0.8).oneMinus());
 const edge = smoothstep(0.9, 0.985, fromCentre);
 const material = unlit({ transparent: true, depthWrite: false });
 material.colorNode = mix(mix(uWaterDeep, uWaterShallow, smoothstep(0.25, 0.95, fromCentre)), vec3(1), edge.mul(0.75).add(lines.mul(0.28)).clamp(0, 1));
 material.opacityNode = mix(0.9, 1, edge);
 return material;
}

function Pond() {
 const { x, z, rx, rz } = GARDEN.pond;
 // (El suelo, sin el puente: con `height` el centro del estanque daba la altura
 // del tablero y el agua quedaba por encima de él.)
 const y = groundHeight(x, z);
 const fish = useRef(null);
 const koi = useModel("koi");
 const water = useMemo(createPondMaterial, []);
 const stone = useMemo(() => [createRock(0.27, { shape: "slab", moss: 0 }), createRock(0.61, { shape: "chunk", moss: 1 })], []);
 const material = useMemo(() => ({ stone: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), koi: new THREE.MeshLambertMaterial({ flatShading: true }), bed: new THREE.MeshLambertMaterial({ color: "#2c6f78", flatShading: true }) }), []);
 useEffect(
  () => () => {
   water.dispose();
   stone.forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  },
  [water, stone, material],
 );
 // Piedras del borde, todo alrededor salvo donde apoya el puente.
 const rim = useMemo(() => {
  const lists = [[], []];
  const count = 30;
  for (let i = 0; i < count; i++) {
   const angle = (i / count) * Math.PI * 2 + 0.1;
   if (Math.abs(Math.cos(angle)) < 0.24) continue; // los dos extremos del puente
   const seed = (i * 0.618) % 1;
   const size = 0.26 + seed * 0.16;
   lists[i % 3 === 0 ? 1 : 0].push({ position: [x + Math.cos(angle) * (rx + 0.12), y + 0.02, z + Math.sin(angle) * (rz + 0.12)], rotation: [0, angle * 3.1, 0], scale: [size * 1.25, size, size], color: seed > 0.5 ? "#ffffff" : "#e6eaf0" });
  }
  return lists;
 }, [x, y, z, rx, rz]);
 // Kois: cada uno ronda el estanque por su carril, a su paso.
 const kois = useMemo(() => KOI_COLORS.map((color, i) => ({ color, lane: 0.3 + ((i * 0.37) % 0.5), speed: (0.16 + ((i * 0.23) % 0.14)) * (i % 2 ? 1 : -1), phase: i * 1.7, size: 0.8 + ((i * 0.41) % 0.45) })), []);
 useEffect(() => {
  const tint = new THREE.Color();
  kois.forEach((one, i) => fish.current.setColorAt(i, tint.set(one.color)));
  fish.current.instanceColor.needsUpdate = true;
 }, [kois]);
 useFrame(({ clock }) => {
  const time = clock.elapsedTime;
  kois.forEach((one, i) => {
   const angle = one.phase + time * one.speed;
   const wobble = 1 + Math.sin(time * 0.4 + one.phase) * 0.12;
   dummy.position.set(x + Math.cos(angle) * rx * one.lane * wobble, y + 0.035, z + Math.sin(angle) * rz * one.lane * wobble);
   // Rumbo: la tangente de su vuelta (la cabeza del modelo mira a −x), coleando.
   const heading = Math.atan2(-Math.cos(angle) * rz * Math.sign(one.speed), -Math.sin(angle) * rx * Math.sign(one.speed));
   dummy.rotation.set(0, -heading + Math.PI + Math.sin(time * 5 + one.phase) * 0.22, 0);
   // (Algo aplanados: así nadan enteros bajo la lámina de agua, que es poco honda.)
   dummy.scale.set(KOI_LENGTH * one.size, KOI_LENGTH * one.size * 0.6, KOI_LENGTH * one.size);
   dummy.updateMatrix();
   fish.current.setMatrixAt(i, dummy.matrix);
  });
  fish.current.instanceMatrix.needsUpdate = true;
 });
 return (
  <>
   <mesh position={[x, y + 0.012, z]} rotation-x={-Math.PI / 2} scale={[rx, rz, 1]} material={material.bed} receiveShadow>
    <circleGeometry args={[1, 40]} />
   </mesh>
   <instancedMesh ref={fish} name="koi" args={[koi, material.koi, kois.length]} frustumCulled={false} />
   <mesh name="agua del estanque" position={[x, y + WATER_DEPTH, z]} rotation-x={-Math.PI / 2} scale={[rx, rz, 1]} material={water} renderOrder={2}>
    <circleGeometry args={[1, 40]} />
   </mesh>
   {rim.map((items, i) => (
    <Instances key={i} name="piedra del estanque" geometry={stone[i]} material={material.stone} items={items} colored castShadow receiveShadow />
   ))}
  </>
 );
}

export function Garden() {
 const torii = useModel("torii");
 const lamp = useModel("farol-japones");
 const bridge = useMemo(() => createArchBridge(BRIDGES.find((one) => one.own)), []);
 const teaHouse = useModel("casa-te");
 const material = useMemo(() => ({ wood: lambert(), house: createModelMaterial(), lamp: createModelMaterial({ seeThrough: false, glow: 1.5 }) }), []);
 const at = (spot) => [spot.x, height(spot.x, spot.z), spot.z];
 const lamps = useMemo(() => GARDEN.lamps.map(([x, z], i) => ({ position: [x, height(x, z) - 0.02, z], rotation: [0, i * 1.3, 0], scale: LAMP_SIZE })), []);
 const lights = useMemo(() => lamps.map(({ position: [x, y, z] }) => [x, y + LAMP_SIZE * 1.45, z]), [lamps]);
 useEffect(() => {
  // Dos de los faroles dan luz de verdad; los demás, su brillo y su halo.
  const stop = lights.filter((_, i) => i % 2 === 0).map(([x, y, z]) => addWarmSource({ x, y: y + 0.2, z, reach: 6, power: 0.9, flicker: 0.05 }));
  return () => {
   stop.forEach((off) => off());
   Object.values(material).forEach((one) => one.dispose());
   bridge.dispose();
  };
 }, [lights, material, bridge]);

 const [fromX, fromZ] = GARDEN.bridge.from, [toX, toZ] = GARDEN.bridge.to;
 const { teaHouse: house, bench } = GARDEN;
 return (
  <>
   <mesh name="torii" userData={{ rests: 0 }} geometry={torii} material={material.house} position={at(GARDEN.torii)} rotation-y={GARDEN.torii.turn} scale={GARDEN.torii.size} castShadow />
   <Pond />
   {/* El puente: su tablero es la curva que se pisa. */}
   <mesh name="puente rojo" geometry={bridge} material={material.wood} position={[(fromX + toX) / 2, 0, (fromZ + toZ) / 2]} rotation-y={Math.atan2(toX - fromX, toZ - fromZ)} castShadow receiveShadow />
   <mesh name="casa de té" userData={{ rests: 0 }} geometry={teaHouse} material={material.house} position={at(house)} rotation-y={house.turn} scale={house.size} castShadow receiveShadow />
   {/* Banco junto al estanque. */}
   <group name="banco del jardín" userData={{ rests: 0 }} position={at(bench)} rotation-y={bench.turn}>
    <mesh position-y={0.44} castShadow>
     <boxGeometry args={[1.7, 0.08, 0.46]} />
     <meshLambertMaterial color={WOOD.mid} flatShading />
    </mesh>
    {[-0.68, 0.68].map((x) => (
     <mesh key={x} position={[x, 0.2, 0]} castShadow>
      <boxGeometry args={[0.1, 0.4, 0.4]} />
      <meshLambertMaterial color={WOOD.dark} flatShading />
     </mesh>
    ))}
   </group>
   <Instances name="farol japonés" rests={0} geometry={lamp} material={material.lamp} items={lamps} castShadow />
   <Halos points={lights} size={1.2} night={0.5} />
  </>
 );
}
