import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { uCurve } from "../../experience/environment/bend";
import { withWind } from "../../experience/environment/wind";
import { Instances } from "../../experience/Instances";
import { lambert } from "../../experience/materials";
import { rig } from "../../experience/state";
import { stretch } from "./globe";
import { BULBS, CRYSTALS, FAR, FLOATERS, LIQUID_LEVEL, MUSHROOMS, SPROUTS, STONES, TENTACLES, ground } from "./layout";
import { floating, glassy, growing, solid } from "./materials";
import { createBulb, createCrystals, createDome, createFloater, createGiantMushroom, createSprout, createStone, createTentacles } from "./models";

// Lo que crece en The Cosmic Lab y lo que flota: hongos gigantes, racimos de
// cristales, bulbos que laten, tentáculos que se mecen, brotes, piedras redondas
// y rocas que flotan. Todo con instancias: una llamada de dibujo por forma, y
// el movimiento lo hace el sombreador. Lo mismo, más grande y más suelto, cubre
// el resto del planeta (con alguna cúpula de cristal): eso solo se dibuja entero en vuelo.

// Copias apoyadas en el suelo.
const seat = (list, { sink = 0, turned = true } = {}) =>
 list.map((one) => ({
  position: [one.x, ground(one.x, one.z) - sink * one.scale + (one.lift ?? 0), one.z],
  rotation: [0, turned ? one.turn : 0, 0],
  scale: one.scale,
  color: one.tint ? new THREE.Color(one.tint) : undefined,
 }));

const helper = { matrix: new THREE.Matrix4(), turn: new THREE.Matrix4(), wide: new THREE.Matrix4(), size: new THREE.Vector3(), color: new THREE.Color() };
// Copias repartidas por el resto del planeta. Cada una se ensancha de través lo
// que el mundo, al cerrarse, la va a encoger en su sitio (en tierra, nada); y
// andando solo se dibujan las cercanas, que van las primeras.
function Beyond({ layers }) {
 const meshes = useRef([]);
 const state = useRef({ curve: -1, flying: null });
 useEffect(() => {
  layers.forEach((layer, i) => {
   if (!layer.colored) return;
   layer.items.forEach((one, k) => meshes.current[i].setColorAt(k, helper.color.set(one.tint)));
   meshes.current[i].instanceColor.needsUpdate = true;
  });
  if (import.meta.env.DEV) window.__world.beyond = { layers, meshes: meshes.current }; // para las pruebas automáticas
 }, [layers]);
 useFrame(() => {
  const flying = rig.space > 0.004 || rig.bend > 0, curve = uCurve.value;
  if (curve !== state.current.curve) {
   state.current.curve = curve;
   layers.forEach((layer, i) => {
    layer.items.forEach((one, k) => {
     const across = Math.atan2(-one.x / one.d, -one.z / one.d);
     helper.matrix.makeTranslation(one.x, Math.max(one.y, LIQUID_LEVEL) + (one.lift ?? 0) - (layer.sink ?? 0), one.z);
     helper.matrix.multiply(helper.turn.makeRotationY(across)).multiply(helper.wide.makeScale(stretch(one.d, curve), 1, 1)).multiply(helper.turn.makeRotationY(one.turn - across));
     helper.matrix.scale(helper.size.setScalar(one.scale));
     meshes.current[i].setMatrixAt(k, helper.matrix);
    });
    meshes.current[i].instanceMatrix.needsUpdate = true;
   });
  }
  if (flying !== state.current.flying) {
   state.current.flying = flying;
   layers.forEach((layer, i) => {
    const count = flying ? layer.items.length : layer.near;
    meshes.current[i].count = Math.max(count, 1);
    meshes.current[i].visible = count > 0;
   });
  }
 });
 return layers.map((layer, i) => <instancedMesh key={layer.name} ref={(mesh) => (meshes.current[i] = mesh)} name={layer.name} args={[layer.geometry, layer.material, layer.items.length]} frustumCulled={false} renderOrder={layer.order ?? 0} />);
}

export function Growth() {
 const models = useMemo(() => ({ mushroom: createGiantMushroom(), crystals: createCrystals(), bulb: createBulb(), tentacles: createTentacles(), sprout: createSprout(), stone: createStone(), floater: createFloater(), dome: createDome() }), []);
 const material = useMemo(
  () => ({
   mushroom: growing({ gain: 1.25, cut: true }),
   crystal: growing({ gain: 1.15, cut: true }),
   bulb: growing({ gain: 1.5, beat: true, side: THREE.DoubleSide }),
   tentacle: growing({ gain: 1.5, sway: 0.4 }),
   sprout: withWind(lambert({ side: THREE.DoubleSide }), { flex: 0.6, power: 1.5, cap: 0.3, trail: 0.5 }),
   stone: solid(),
   floater: floating(),
   // (Lo de lejos no se recorta alrededor del astronauta: nunca lo tapa.)
   far: growing({ gain: 1.2 }),
   glass: glassy("#9ff5ee", { body: 0.16, rim: 0.6 }),
  }),
  [],
 );
 useEffect(
  () => () => {
   const { dome, ...rest } = models;
   [...Object.values(rest), dome.base, dome.glass].forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  },
  [models, material],
 );
 const items = useMemo(
  () => ({
   mushrooms: seat(MUSHROOMS, { sink: 0.06 }),
   crystals: seat(CRYSTALS, { sink: 0.03 }),
   stones: seat(STONES, { sink: 0.06 }),
   // (Sin girar: su latido se calcula en las medidas del modelo; ver materials.js.)
   bulbs: seat(BULBS, { turned: false }),
   tentacles: seat(TENTACLES, { sink: 0.02 }),
   sprouts: seat(SPROUTS),
   floaters: seat(FLOATERS),
  }),
  [],
 );
 const layers = useMemo(
  () => [
   { name: "hongo gigante lejano", geometry: models.mushroom, material: material.far, ...FAR.mushrooms, colored: true, sink: 0.1 },
   { name: "cristales lejanos", geometry: models.crystals, material: material.far, ...FAR.crystals, colored: true },
   { name: "tentáculos lejanos", geometry: models.tentacles, material: material.tentacle, ...FAR.tentacles, colored: true },
   { name: "roca que flota lejana", geometry: models.floater, material: material.floater, ...FAR.floaters },
   { name: "cúpula lejana", geometry: models.dome.base, material: material.far, ...FAR.domes, sink: 0.1 },
   { name: "cristal de la cúpula lejana", geometry: models.dome.glass, material: material.glass, ...FAR.domes, sink: 0.1, order: 4 },
  ],
  [models, material],
 );
 return (
  <>
   <Instances name="hongo gigante" rests={0} geometry={models.mushroom} material={material.mushroom} items={items.mushrooms} colored castShadow receiveShadow />
   <Instances name="cristales" rests={0} geometry={models.crystals} material={material.crystal} items={items.crystals} colored castShadow />
   <Instances name="piedra redonda" rests={0} geometry={models.stone} material={material.stone} items={items.stones} castShadow receiveShadow />
   <Instances name="bulbo" rests={0} geometry={models.bulb} material={material.bulb} items={items.bulbs} colored />
   <Instances name="tentáculos" rests={0} geometry={models.tentacles} material={material.tentacle} items={items.tentacles} colored castShadow />
   <Instances name="brote" rests={0} geometry={models.sprout} material={material.sprout} items={items.sprouts} colored />
   <Instances name="roca que flota" geometry={models.floater} material={material.floater} items={items.floaters} castShadow />
   <Beyond layers={layers} />
  </>
 );
}
