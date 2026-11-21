import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { attribute, mix, sin, uniform, vec3 } from "three/tsl";
import { appCard } from "../../content/cards";
import { LAB, MACHINES as TEXT, MACHINE_ORDER, WOODY_LAB } from "../../content/cosmic";
import { Instances } from "../../experience/Instances";
import { useInteractable } from "../../experience/interact";
import { Label } from "../../experience/Label";
import { lambert } from "../../experience/materials";
import { isSpeaking, say } from "../../experience/speech";
import { emit, events, player, rig, ui, voyage, woody } from "../../experience/state";
import { uniforms } from "../../experience/theme";
import { lab } from "../../game/labQuest";
import { ANTENNA, CORE, MACHINES, MACHINE_TIP, SLABS, SPAWN, TUBES, ground } from "./layout";
import { beam, flowing, glassy, powered, solid } from "./materials";
import { ENERGY, createAntenna, createCore, createCoreLamp, createMachine, createPipe, createPod, createSlab } from "./models";

// El laboratorio: el núcleo en el centro, la máquina de Dosia, los sitios
// reservados de las otras cuatro, los tubos que las unen al núcleo y la antena
// del final. Y el juego («enciende el laboratorio»): con la E, la máquina se
// enciende, manda un rayo de energía al núcleo y enseña su app. Los textos, en
// content/cosmic.js; el estado, en game/labQuest.js.

// La secuencia de encendido (s): se encienden las luces de la máquina, sale el
// rayo, llega al núcleo —se enciende su testigo— y se abre el panel.
const SEQUENCE = { lights: 0.9, beam: 1.5, panel: 2.7 };
const READY = MACHINE_ORDER.filter((id) => TEXT[id].ready);
const smooth = (a, b, x) => {
 const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
 return t * t * (3 - 2 * t);
};
// Cuánta energía tiene el núcleo con `count` máquinas encendidas (la primera ya se nota).
const coreLevel = (count) => (count ? 0.22 + (0.78 * (count - 1)) / (MACHINE_ORDER.length - 1) : 0);
const UP = new THREE.Vector3(0, 1, 0);

export function LabScene() {
 const dosia = MACHINES.dosia;
 const base = useMemo(() => ({ machine: ground(dosia.x, dosia.z), core: ground(CORE.x, CORE.z) }), [dosia]);
 // Uniformes de energía: lo que cada pieza tiene encendido (0 a 1). Se llega ya con lo guardado.
 const power = useMemo(() => {
  const on = lab.isOn("dosia") ? 1 : 0;
  return { machine: uniform(on), beam: uniform(on), core: uniform(coreLevel(lab.count())), zero: uniform(0), lamps: MACHINE_ORDER.map((id) => uniform(lab.isOn(id) ? 1 : 0)) };
 }, []);
 const models = useMemo(() => {
  const others = MACHINE_ORDER.filter((id) => id !== "dosia").map((id) => createPipe(TUBES[id], ground));
  const made = { machine: createMachine(MACHINE_TIP), pod: createPod(), core: createCore(CORE), lamp: createCoreLamp(), antenna: createAntenna(), pipe: createPipe(TUBES.dosia, ground), pipes: mergeGeometries(others), slab: createSlab(), ray: new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0) };
  others.forEach((one) => one.dispose());
  return made;
 }, []);
 const material = useMemo(() => {
  // La esfera del núcleo: violeta oscuro apagada; con energía, lima que late.
  const ball = lambert({ vertexColors: false });
  const facet = attribute("color", "vec3"), pulse = sin(uniforms.uTime.mul(2.2)).mul(0.5).add(0.5);
  ball.colorNode = facet.mul(mix(vec3(0.2, 0.13, 0.42), vec3(0.72, 0.9, 0.3), power.core.pow(1.5)));
  ball.emissiveNode = vec3(0.62, 1.0, 0.16).mul(facet).mul(power.core).mul(pulse.mul(0.6).add(1.2));
  return {
   machine: powered(power.machine),
   glass: glassy(),
   solid: solid(),
   frame: powered(power.core, { gain: 2.2 }),
   ball,
   lamps: power.lamps.map((one) => powered(one)),
   off: powered(power.zero),
   pipe: flowing(power.machine),
   pipes: flowing(power.zero),
   ray: beam(power.beam, 1),
   rayGlow: beam(power.beam, 0.22),
  };
 }, [power]);
 useEffect(
  () => () => {
   const { machine, core, ...rest } = models;
   [machine.body, machine.glass, core.frame, core.ball, core.ring, ...Object.values(rest)].forEach((one) => one.dispose());
   const { lamps, ...others } = material;
   [...lamps, ...Object.values(others)].forEach((one) => one.dispose());
  },
  [models, material],
 );

 // El rayo: de la punta de la antena de la máquina a la esfera del núcleo.
 const ray = useMemo(() => {
  const from = new THREE.Vector3(dosia.tip[0], base.machine + dosia.tip[1], dosia.tip[2]), to = new THREE.Vector3(CORE.x, base.core + CORE.ball, CORE.z);
  const along = to.clone().sub(from);
  return { from, length: along.length() - 1.15, turn: new THREE.Quaternion().setFromUnitVectors(UP, along.clone().normalize()) };
 }, [dosia, base]);
 const lamps = useMemo(
  () =>
   MACHINE_ORDER.map((id) => {
    const dx = MACHINES[id].x - CORE.x, dz = MACHINES[id].z - CORE.z, d = Math.hypot(dx, dz);
    return [CORE.x + (dx / d) * (CORE.r - 0.45), base.core + 0.3, CORE.z + (dz / d) * (CORE.r - 0.45)];
   }),
  [base],
 );
 const slabs = useMemo(() => SLABS.map((one) => ({ position: [one.x, ground(one.x, one.z) - 0.02, one.z], rotation: [0, one.x * 3, 0], scale: [one.r, 1, one.r] })), []);

 const beams = useRef([]);
 const rings = useRef([]);
 const hologram = useRef(null);
 const sequence = useRef(null); // { t } mientras dura el encendido
 const shown = useRef({ beam: lab.isOn("dosia") ? 1 : 0 });
 const afterPanel = useRef(false);

 const panel = () => emit("open", { ...appCard("dosia", TEXT.dosia), at: { x: dosia.x, y: base.machine + 2.3, z: dosia.z, distance: 0.9 } });
 const release = () => {
  sequence.current = null;
  ui.open -= 1;
  rig.focus = null;
  rig.distance = 1;
 };
 useInteractable({
  position: dosia.use,
  radius: 2.7,
  height: 2.7,
  priority: 1,
  hint: () => (lab.isOn("dosia") ? TEXT.dosia.hintOn : TEXT.dosia.hint),
  enabled: () => !ui.open && sequence.current === null,
  action: () => {
   if (lab.isOn("dosia")) return panel();
   // Encendido: sin controles, con la cámara en la máquina y el núcleo.
   sequence.current = { t: 0, done: false };
   ui.open += 1;
   rig.focus = { x: dosia.x * 0.62 + CORE.x * 0.38, y: base.machine + 2.4, z: dosia.z * 0.62 + CORE.z * 0.38 };
   rig.distance = 1.25;
   return undefined;
  },
 });
 // (Si se sale del mundo a media secuencia, no se queda nada a medias.)
 useEffect(() => () => void (sequence.current && release()), []);
 // El núcleo: cuenta qué le falta.
 useInteractable({
  position: { x: CORE.x, z: CORE.z + CORE.r + 0.8 },
  radius: 2.3,
  height: 2.9,
  hint: () => (lab.count() ? LAB.coreSome(lab.count(), lab.total) : LAB.coreOff),
  enabled: () => !ui.open && sequence.current === null,
  action: () => emit("open", { kind: "core", eyebrow: LAB.corePanel.place, title: LAB.corePanel.title, paragraphs: LAB.corePanel.paragraphs, at: { x: CORE.x, y: base.core + 2.8, z: CORE.z, distance: 1.15 } }),
 });

 // Woody: al llegar cuenta de qué va esto y echa a andar hacia la máquina; tras encenderla, lo celebra.
 useEffect(() => {
  let told = false;
  const timer = window.setInterval(() => {
   if (lab.flag("guided") || lab.count() || !woody.tips) return;
   if (player.hidden || rig.intro !== 0 || voyage.phase !== "idle" || ui.open) return;
   if (Math.hypot(player.position.x - SPAWN.x, player.position.z - SPAWN.z) < 1.2) return;
   if (!told) {
    told = true;
    say(WOODY_LAB.arrival, { once: "zona:lab-nave", tip: true });
    return;
   }
   if (isSpeaking()) return;
   lab.setFlag("guided");
   emit("guide", { to: "lab-dosia" });
  }, 300);
  const onClose = () => {
   if (!afterPanel.current) return;
   afterPanel.current = false;
   if (woody.tips) say(WOODY_LAB.afterFirst);
  };
  events.addEventListener("close", onClose);
  return () => {
   window.clearInterval(timer);
   events.removeEventListener("close", onClose);
  };
 }, []);

 useFrame(({ clock }, rawDelta) => {
  const delta = Math.min(rawDelta, 0.05), ease = Math.min(1, delta * 4);
  const run = sequence.current;
  let grow = lab.isOn("dosia") ? 1 : 0;
  if (run) {
   run.t += delta;
   // Las luces arrancan a tirones, como un fluorescente.
   const lit = smooth(0, SEQUENCE.lights, run.t);
   power.machine.value = run.t < SEQUENCE.lights ? lit * (0.72 + 0.28 * Math.sin(run.t * 42)) : 1;
   grow = smooth(SEQUENCE.lights, SEQUENCE.beam, run.t);
   if (!run.done && run.t >= SEQUENCE.beam) {
    run.done = true;
    lab.switchOn("dosia");
    emit("toast", { text: LAB.on(TEXT.dosia.name, lab.count(), lab.total), at: { x: CORE.x, y: base.core + 5.4, z: CORE.z } });
   }
   if (run.t >= SEQUENCE.panel) {
    release();
    afterPanel.current = true;
    panel();
   }
  } else power.machine.value += ((lab.isOn("dosia") ? 1 : 0) - power.machine.value) * ease;
  shown.current.beam = grow;
  power.beam.value = grow > 0.001 ? 1 : 0;
  beams.current.forEach((mesh, i) => mesh && mesh.scale.set(i ? 0.24 : 0.07, Math.max(0.001, ray.length * grow), i ? 0.24 : 0.07));
  // El núcleo y sus testigos siguen a lo encendido, sin saltos.
  power.core.value += (coreLevel(lab.count()) - power.core.value) * ease;
  MACHINE_ORDER.forEach((id, i) => (power.lamps[i].value += ((lab.isOn(id) ? 1 : 0) - power.lamps[i].value) * ease));
  // Los aros giran con la energía que haya (apagado, casi parados).
  const spin = clock.elapsedTime * (0.08 + power.core.value * 1.6);
  if (rings.current[0]) rings.current[0].rotation.set(0.5, spin, 0.2);
  if (rings.current[1]) rings.current[1].rotation.set(-0.7, -spin * 0.7, 1.1);
  // El nombre de la app flota sobre la máquina encendida.
  hologram.current.visible = power.machine.value > 0.05;
  hologram.current.scale.setScalar(0.4 + 0.6 * power.machine.value);
  hologram.current.position.y = base.machine + 4.9 + Math.sin(clock.elapsedTime * 1.4) * 0.07;
  if (import.meta.env.DEV) window.__world.lab = { quest: lab, machine: power.machine.value, core: power.core.value, beam: shown.current.beam, lamps: power.lamps.map((one) => one.value), sequence: Boolean(run), ready: READY }; // para las pruebas automáticas
 });

 return (
  <>
   {/* El núcleo. */}
   <group name="núcleo" position={[CORE.x, base.core, CORE.z]}>
    <mesh geometry={models.core.frame} material={material.frame} castShadow receiveShadow />
    <mesh name="esfera del núcleo" geometry={models.core.ball} material={material.ball} castShadow />
    {[0, 1].map((i) => (
     <mesh key={i} ref={(node) => (rings.current[i] = node)} geometry={models.core.ring} material={material.solid} position-y={CORE.ball} scale={i ? 1.12 : 1} />
    ))}
   </group>
   {lamps.map((at, i) => (
    <mesh key={MACHINE_ORDER[i]} name={`testigo de ${MACHINE_ORDER[i]}`} geometry={models.lamp} material={material.lamps[i]} position={at} />
   ))}
   {/* La máquina de Dosia. */}
   <group name="máquina de Dosia" position={[dosia.x, base.machine, dosia.z]} rotation-y={dosia.turn}>
    <mesh geometry={models.machine.body} material={material.machine} castShadow receiveShadow />
    <mesh geometry={models.machine.glass} material={material.glass} renderOrder={4} />
   </group>
   <group ref={hologram} position={[dosia.x, base.machine + 4.9, dosia.z]} visible={false}>
    <Label text={TEXT.dosia.name} color={ENERGY} width={3.2} billboard />
   </group>
   {/* Las otras cuatro: su sitio, reservado. */}
   {MACHINE_ORDER.filter((id) => !TEXT[id].ready).map((id) => (
    <mesh key={id} name={`sitio de ${id}`} geometry={models.pod} material={material.solid} position={[MACHINES[id].x, ground(MACHINES[id].x, MACHINES[id].z), MACHINES[id].z]} rotation-y={MACHINES[id].turn} castShadow receiveShadow />
   ))}
   {/* Tubos al núcleo: el de Dosia lleva líquido cuando está encendida. */}
   <mesh name="tubo de Dosia" geometry={models.pipe} material={material.pipe} castShadow />
   <mesh name="tubos" geometry={models.pipes} material={material.pipes} castShadow />
   {/* El rayo de energía. */}
   <group position={ray.from} quaternion={ray.turn}>
    <mesh ref={(node) => (beams.current[0] = node)} name="rayo de energía" geometry={models.ray} material={material.ray} renderOrder={5} frustumCulled={false} />
    <mesh ref={(node) => (beams.current[1] = node)} geometry={models.ray} material={material.rayGlow} renderOrder={5} frustumCulled={false} />
   </group>
   {/* La antena, al fondo: apagada hasta el final. */}
   <mesh name="antena" geometry={models.antenna} material={material.off} position={[ANTENNA.x, ground(ANTENNA.x, ANTENNA.z) - 0.05, ANTENNA.z]} castShadow />
   <Instances name="losa" rests={0} geometry={models.slab} material={material.solid} items={slabs} receiveShadow />
  </>
 );
}
