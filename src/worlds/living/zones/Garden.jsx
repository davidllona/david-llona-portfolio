import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mix, positionLocal, smoothstep, texture, vec2, vec3 } from "three/tsl";
import { Instances } from "../../../experience/Instances";
import { noiseTexture } from "../../../experience/environment/noise";
import { addWarmSource } from "../../../experience/lightSources";
import { unlit } from "../../../experience/materials";
import { uniforms } from "../../../experience/theme";
import { createModelMaterial, preloadModel, useModel } from "../buildings/useModel";
import { WOOD } from "../kit/palette";
import { GARDEN, height } from "../layout";
import { Halos } from "../props/Halos";
import { createRock } from "../props/rockModel";

// Jardín japonés, al este de la pista de baloncesto. Los modelos son los
// descargados (docs/CREDITOS.md, tools/assets/buildings.py): el torii, el puente
// (pintado de rojo), los faroles «Japan Lamp», la «Island cabin» como casa de
// té y el koi (solo la forma: el color, plano, se lo da cada copia). El
// estanque no toca el relieve: es una lámina de agua a ras de suelo, con su
// borde de piedras.
["torii", "farol-japones", "puente-rojo", "casa-te", "koi"].forEach(preloadModel);

const KOI_COLORS = ["#ff7a2e", "#f6f1e8", "#e8452a", "#ffb43a", "#f6f1e8", "#ff8a3d", "#2c2a30"];
const KOI_LENGTH = 0.62;
const LAMP_SIZE = 0.52; // lado de la base; mide 2,33 veces eso de alto
const dummy = new THREE.Object3D();

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
 const y = height(x, z);
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
   dummy.scale.setScalar(KOI_LENGTH * one.size);
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
   <mesh position={[x, y + 0.11, z]} rotation-x={-Math.PI / 2} scale={[rx, rz, 1]} material={water} renderOrder={2}>
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
 const bridge = useModel("puente-rojo");
 const teaHouse = useModel("casa-te");
 const material = useMemo(() => ({ solid: createModelMaterial({ seeThrough: false }), house: createModelMaterial(), lamp: createModelMaterial({ seeThrough: false, glow: 1.5 }) }), []);
 const at = (spot) => [spot.x, height(spot.x, spot.z), spot.z];
 const lamps = useMemo(() => GARDEN.lamps.map(([x, z], i) => ({ position: [x, height(x, z) - 0.02, z], rotation: [0, i * 1.3, 0], scale: LAMP_SIZE })), []);
 const lights = useMemo(() => lamps.map(({ position: [x, y, z] }) => [x, y + LAMP_SIZE * 1.45, z]), [lamps]);
 useEffect(() => {
  // Dos de los faroles dan luz de verdad; los demás, su brillo y su halo.
  const stop = lights.filter((_, i) => i % 2 === 0).map(([x, y, z]) => addWarmSource({ x, y: y + 0.2, z, reach: 6, power: 0.9, flicker: 0.05 }));
  return () => {
   stop.forEach((off) => off());
   Object.values(material).forEach((one) => one.dispose());
  };
 }, [lights, material]);

 const [fromX, fromZ] = GARDEN.bridge.from, [toX, toZ] = GARDEN.bridge.to;
 const span = Math.hypot(toX - fromX, toZ - fromZ);
 const { teaHouse: house, bench } = GARDEN;
 return (
  <>
   <mesh name="torii" userData={{ rests: 0 }} geometry={torii} material={material.solid} position={at(GARDEN.torii)} rotation-y={GARDEN.torii.turn} scale={GARDEN.torii.size} castShadow />
   <Pond />
   {/* El puente: el modelo, algo más ancho que el original para que se pueda cruzar. */}
   <mesh name="puente rojo" geometry={bridge} material={material.solid} position={[(fromX + toX) / 2, height(fromX, fromZ) - 0.42, (fromZ + toZ) / 2]} scale={[span * 1.9, span * 2.2, span * 1.04]} castShadow receiveShadow />
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
