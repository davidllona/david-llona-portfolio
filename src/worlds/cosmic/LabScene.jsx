import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { attribute, mix, sin, uniform, vec3 } from "three/tsl";
import { APP_CARDS, appCard } from "../../content/cards";
import { LAB, MACHINES as TEXT, MACHINE_ORDER, WOODY_LAB } from "../../content/cosmic";
import { Instances } from "../../experience/Instances";
import { useInteractable } from "../../experience/interact";
import { Label } from "../../experience/Label";
import { lambert } from "../../experience/materials";
import { isSpeaking, say } from "../../experience/speech";
import { emit, events, player, rig, ui, voyage, woody } from "../../experience/state";
import { uniforms } from "../../experience/theme";
import { lab } from "../../game/labQuest";
import { ANTENNA, CORE, MACHINES, MACHINE_KINDS, MACHINE_LAMP, MACHINE_TIP, SLABS, SPAWN, TUBES, ground } from "./layout";
import { beam, flowing, glassy, powered, solid } from "./materials";
import { ENERGY, createCore, createCoreLamp, createMachine, createMachineBase, createPipe, createSlab, createStatusPost } from "./models";
import { preloadLabModel, useLabModel } from "./useLabModel";

// El laboratorio: el núcleo en el centro y, en corro, las cinco máquinas —cada
// una, una app o un experimento de David—, unidas a él por un tubo; al fondo,
// la antena. Y el juego («enciende el laboratorio»): con la E, la máquina se
// enciende, manda un rayo de energía al núcleo y enseña su app en su carta.
// Cada máquina lleva una luz de estado, siempre encendida: lima si la app está
// publicada, ámbar si está en construcción. La de los experimentos, sin
// contenido todavía, queda apagada y no se puede usar.
// Los textos, en content/cosmic.js; el estado de cada app, en content/cards.js;
// lo encendido, en game/labQuest.js.

// La secuencia de encendido (s): se encienden las luces de la máquina, sale el
// rayo, llega al núcleo —se enciende su testigo— y se abre la carta.
const SEQUENCE = { lights: 0.9, beam: 1.5, panel: 2.7 };
const READY = MACHINE_ORDER.filter((id) => TEXT[id].ready);
// (Vivas, pero sin pasarse: más fuertes, el resplandor las quema a blanco y dejan de verse lima y ámbar.)
const STATUS_TINT = { published: new THREE.Color(0.86, 1.3, 0.22), building: new THREE.Color(1.42, 0.78, 0.1) };
const smooth = (a, b, x) => {
 const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
 return t * t * (3 - 2 * t);
};
// Cuánta energía tiene el núcleo con `count` máquinas encendidas (la primera ya se nota).
const coreLevel = (count) => (count ? 0.22 + (0.78 * (count - 1)) / (MACHINE_ORDER.length - 1) : 0);
const UP = new THREE.Vector3(0, 1, 0);
// Un punto de los ejes de una máquina, en el mundo.
const placed = (machine, [px, py, pz], base) => [machine.x + px * Math.cos(machine.turn) + pz * Math.sin(machine.turn), base + py, machine.z - px * Math.sin(machine.turn) + pz * Math.cos(machine.turn)];

// El aparato de una máquina (modelo convertido), sobre su peana.
function Device({ id, material }) {
 const kind = MACHINE_KINDS[id];
 const geometry = useLabModel(kind.model);
 return <mesh name={`aparato de ${id}`} geometry={geometry} material={material} position-y={0.2} scale={kind.size} castShadow receiveShadow />;
}

// La nave de máquinas listas para encender: lo que cada una tiene encendido (0 a 1) y su rayo.
function createPowers() {
 return Object.fromEntries(MACHINE_ORDER.map((id) => [id, { machine: uniform(lab.isOn(id) ? 1 : 0), beam: uniform(lab.isOn(id) ? 1 : 0), lamp: uniform(lab.isOn(id) ? 1 : 0), grow: lab.isOn(id) ? 1 : 0 }]));
}

export function LabScene() {
 const base = useMemo(() => ({ core: ground(CORE.x, CORE.z), ...Object.fromEntries(MACHINE_ORDER.map((id) => [id, ground(MACHINES[id].x, MACHINES[id].z)])) }), []);
 const power = useMemo(() => ({ ...createPowers(), core: uniform(coreLevel(lab.count())), zero: uniform(0) }), []);
 const models = useMemo(
  () => ({
   base: createMachineBase(MACHINE_TIP),
   // (La de los experimentos: la cápsula hecha a mano, con su propia antena.)
   spare: createMachine([1.05, 4.25, -0.2]),
   post: createStatusPost(),
   bulb: new THREE.IcosahedronGeometry(0.2, 1),
   core: createCore(CORE),
   lamp: createCoreLamp(),
   pipes: Object.fromEntries(MACHINE_ORDER.map((id) => [id, createPipe(TUBES[id], ground)])),
   slab: createSlab(),
   ray: new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0),
  }),
  [],
 );
 const antenna = useLabModel("antena");
 const material = useMemo(() => {
  // La esfera del núcleo: violeta oscuro apagada; con energía, lima que late.
  const ball = lambert({ vertexColors: false });
  const facet = attribute("color", "vec3"), pulse = sin(uniforms.uTime.mul(2.2)).mul(0.5).add(0.5);
  ball.colorNode = facet.mul(mix(vec3(0.2, 0.13, 0.42), vec3(0.72, 0.9, 0.3), power.core.pow(1.5)));
  ball.emissiveNode = vec3(0.62, 1.0, 0.16).mul(facet).mul(power.core).mul(pulse.mul(0.6).add(1.2));
  return {
   machines: Object.fromEntries(MACHINE_ORDER.map((id) => [id, powered(power[id].machine)])),
   pipes: Object.fromEntries(MACHINE_ORDER.map((id) => [id, flowing(power[id].machine)])),
   lamps: Object.fromEntries(MACHINE_ORDER.map((id) => [id, powered(power[id].lamp)])),
   rays: Object.fromEntries(READY.map((id) => [id, [beam(power[id].beam, 1), beam(power[id].beam, 0.22)]])),
   status: Object.fromEntries(Object.entries(STATUS_TINT).map(([status, tint]) => [status, new THREE.MeshBasicMaterial({ color: tint, toneMapped: false })])),
   glass: glassy(),
   solid: solid(),
   frame: powered(power.core, { gain: 2.2 }),
   ball,
   off: powered(power.zero),
  };
 }, [power]);
 useEffect(
  () => () => {
   const { spare, core, pipes, ...rest } = models;
   [spare.body, spare.glass, core.frame, core.ball, core.ring, ...Object.values(pipes), ...Object.values(rest)].forEach((one) => one.dispose());
   const { machines, pipes: flows, lamps, rays, status, ...others } = material;
   [...Object.values(machines), ...Object.values(flows), ...Object.values(lamps), ...Object.values(rays).flat(), ...Object.values(status), ...Object.values(others)].forEach((one) => one.dispose());
  },
  [models, material],
 );

 // El rayo de cada máquina: de la punta de su antena a la esfera del núcleo.
 const rays = useMemo(
  () =>
   Object.fromEntries(
    READY.map((id) => {
     const from = new THREE.Vector3(...placed(MACHINES[id], MACHINE_TIP, base[id])), to = new THREE.Vector3(CORE.x, base.core + CORE.ball, CORE.z);
     const along = to.clone().sub(from);
     return [id, { from, length: along.length() - 1.15, turn: new THREE.Quaternion().setFromUnitVectors(UP, along.clone().normalize()) }];
    }),
   ),
  [base],
 );
 const lamps = useMemo(
  () =>
   MACHINE_ORDER.map((id) => {
    const dx = MACHINES[id].x - CORE.x, dz = MACHINES[id].z - CORE.z, d = Math.hypot(dx, dz);
    return [CORE.x + (dx / d) * (CORE.r - 0.45), base.core + 0.3, CORE.z + (dz / d) * (CORE.r - 0.45)];
   }),
  [base],
 );
 const slabs = useMemo(() => SLABS.map((one) => ({ position: [one.x, ground(one.x, one.z) - 0.02, one.z], rotation: [0, one.x * 3, 0], scale: [one.r, 1, one.r] })), []);

 const beams = useRef({});
 const rings = useRef([]);
 const holograms = useRef({});
 const sequence = useRef(null); // { id, t, done } mientras dura un encendido
 const afterPanel = useRef(null);

 const panel = (id) => emit("open", { ...appCard(id, TEXT[id], [lab.count(), lab.total]), at: { x: MACHINES[id].x, y: base[id] + 2.3, z: MACHINES[id].z, distance: 0.9 } });
 const release = () => {
  sequence.current = null;
  ui.open -= 1;
  rig.focus = null;
  rig.distance = 1;
 };
 const operate = (id) => {
  if (lab.isOn(id)) return panel(id);
  // Encendido: sin controles, con la cámara en la máquina y el núcleo.
  const machine = MACHINES[id];
  sequence.current = { id, t: 0, done: false };
  ui.open += 1;
  rig.focus = { x: machine.x * 0.62 + CORE.x * 0.38, y: base[id] + 2.4, z: machine.z * 0.62 + CORE.z * 0.38 };
  rig.distance = 1.25;
  emit("lab", { type: "starting", id });
  return undefined;
 };
 // (Si se sale del mundo a media secuencia, no se queda nada a medias.)
 useEffect(() => () => void (sequence.current && release()), []);

 // El núcleo: cuenta qué le falta. Y la antena, apagada hasta el final.
 useInteractable({
  position: { x: CORE.x, z: CORE.z + CORE.r + 0.8 },
  radius: 2.3,
  height: 2.9,
  hint: () => (lab.count() ? LAB.coreSome(lab.count(), lab.total) : LAB.coreOff),
  enabled: () => !ui.open && sequence.current === null,
  action: () => emit("open", { kind: "core", title: LAB.corePanel.title, paragraphs: LAB.corePanel.paragraphs, energy: `Energía en el núcleo · ${lab.count()}/${lab.total}`, at: { x: CORE.x, y: base.core + 2.8, z: CORE.z, distance: 1.15 } }),
 });
 const antennaY = ground(ANTENNA.x, ANTENNA.z);
 useInteractable({
  position: { x: ANTENNA.x, z: ANTENNA.z + 2.2 },
  radius: 2.4,
  height: 3,
  hint: LAB.antennaHint,
  enabled: () => !ui.open && sequence.current === null,
  action: () => {
   emit("lab", { type: "antenna" });
   emit("open", { kind: "antenna", title: LAB.antennaPanel.title, paragraphs: LAB.antennaPanel.paragraphs, at: { x: ANTENNA.x, y: antennaY + 3, z: ANTENNA.z, distance: 1.1 } });
  },
 });

 // Woody: al llegar cuenta de qué va esto y echa a andar hacia la primera máquina; tras cada una, hacia la siguiente.
 useEffect(() => {
  let told = false;
  const nextOff = () => {
   let best = null;
   for (const id of READY) {
    if (lab.isOn(id)) continue;
    const d = Math.hypot(MACHINES[id].use.x - player.position.x, MACHINES[id].use.z - player.position.z);
    if (!best || d < best.d) best = { id, d };
   }
   return best?.id ?? null;
  };
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
   const id = afterPanel.current;
   afterPanel.current = null;
   if (!id || !woody.tips) return;
   const next = nextOff();
   say(next ? (lab.count() === 1 ? WOODY_LAB.afterFirst : WOODY_LAB.next) : WOODY_LAB.allOn);
   if (next) emit("guide", { to: `lab-${next}` });
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
  if (run) {
   run.t += delta;
   if (!run.done && run.t >= SEQUENCE.beam) {
    run.done = true;
    lab.switchOn(run.id);
    emit("toast", { text: LAB.on(TEXT[run.id].name, lab.count(), lab.total), at: { x: CORE.x, y: base.core + 5.4, z: CORE.z } });
   }
   if (run.t >= SEQUENCE.panel) {
    const id = run.id;
    release();
    afterPanel.current = id;
    panel(id);
   }
  }
  for (const id of MACHINE_ORDER) {
   const one = power[id], on = lab.isOn(id) ? 1 : 0;
   if (run?.id === id) {
    // Las luces arrancan a tirones, como un fluorescente; luego sale el rayo.
    const lit = smooth(0, SEQUENCE.lights, run.t);
    one.machine.value = run.t < SEQUENCE.lights ? lit * (0.72 + 0.28 * Math.sin(run.t * 42)) : 1;
    one.grow = smooth(SEQUENCE.lights, SEQUENCE.beam, run.t);
   } else {
    one.machine.value += (on - one.machine.value) * ease;
    one.grow = on;
   }
   one.beam.value = one.grow > 0.001 ? 1 : 0;
   one.lamp.value += (on - one.lamp.value) * ease;
   beams.current[id]?.forEach((mesh, i) => mesh && mesh.scale.set(i ? 0.24 : 0.07, Math.max(0.001, rays[id].length * one.grow), i ? 0.24 : 0.07));
   // El nombre de la app flota sobre la máquina encendida.
   const hologram = holograms.current[id];
   if (hologram) {
    hologram.visible = one.machine.value > 0.05;
    hologram.scale.setScalar(0.4 + 0.6 * one.machine.value);
    hologram.position.y = base[id] + 4.9 + Math.sin(clock.elapsedTime * 1.4 + hologram.position.x) * 0.07;
   }
  }
  // El núcleo sigue a lo encendido, sin saltos; sus aros giran con la energía que haya (apagado, casi parados).
  power.core.value += (coreLevel(lab.count()) - power.core.value) * ease;
  const spin = clock.elapsedTime * (0.08 + power.core.value * 1.6);
  if (rings.current[0]) rings.current[0].rotation.set(0.5, spin, 0.2);
  if (rings.current[1]) rings.current[1].rotation.set(-0.7, -spin * 0.7, 1.1);
  if (import.meta.env.DEV) {
   // Para las pruebas automáticas.
   const first = power.dosia;
   window.__world.lab = { quest: lab, machine: first.machine.value, beam: first.grow, core: power.core.value, lamps: MACHINE_ORDER.map((id) => power[id].lamp.value), all: Object.fromEntries(MACHINE_ORDER.map((id) => [id, { machine: power[id].machine.value, beam: power[id].grow }])), sequence: Boolean(run), ready: READY };
  }
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
    <mesh key={MACHINE_ORDER[i]} name={`testigo de ${MACHINE_ORDER[i]}`} geometry={models.lamp} material={material.lamps[MACHINE_ORDER[i]]} position={at} />
   ))}
   {/* Las cinco máquinas. */}
   {MACHINE_ORDER.map((id) => {
    const machine = MACHINES[id], ready = TEXT[id].ready, status = APP_CARDS[id]?.status;
    return (
     <group key={id} name={`máquina de ${TEXT[id].name}`} position={[machine.x, base[id], machine.z]} rotation-y={machine.turn}>
      {ready ? (
       <>
        <mesh geometry={models.base} material={material.machines[id]} castShadow receiveShadow />
        <Device id={id} material={material.machines[id]} />
        {/* La luz de estado: lima si la app está publicada, ámbar si está en construcción. */}
        <mesh geometry={models.post} material={material.solid} position={[MACHINE_LAMP[0], 0.15, MACHINE_LAMP[2]]} />
        <mesh name={`luz de estado de ${id}: ${status}`} geometry={models.bulb} material={material.status[status]} position={MACHINE_LAMP} />
       </>
      ) : (
       <>
        <mesh geometry={models.spare.body} material={material.off} castShadow receiveShadow />
        <mesh geometry={models.spare.glass} material={material.glass} renderOrder={4} />
       </>
      )}
     </group>
    );
   })}
   {READY.map((id) => (
    <MachineUse key={id} id={id} busy={() => Boolean(ui.open) || sequence.current !== null} onUse={operate} />
   ))}
   {READY.map((id) => (
    <group key={id} ref={(node) => (holograms.current[id] = node)} position={[MACHINES[id].x, base[id] + 4.9, MACHINES[id].z]} visible={false}>
     <Label text={TEXT[id].name} color={ENERGY} width={3.2} billboard />
    </group>
   ))}
   {/* Tubos al núcleo: llevan líquido cuando su máquina está encendida. */}
   {MACHINE_ORDER.map((id) => (
    <mesh key={id} name={`tubo de ${id}`} geometry={models.pipes[id]} material={material.pipes[id]} castShadow />
   ))}
   {/* Los rayos de energía. */}
   {READY.map((id) => (
    <group key={id} position={rays[id].from} quaternion={rays[id].turn}>
     {[0, 1].map((i) => (
      <mesh key={i} ref={(node) => ((beams.current[id] ??= [])[i] = node)} name={i ? undefined : `rayo de energía de ${id}`} geometry={models.ray} material={material.rays[id][i]} renderOrder={5} frustumCulled={false} />
     ))}
    </group>
   ))}
   {/* La antena, al fondo: apagada hasta el final. */}
   <mesh name="antena" geometry={antenna} material={material.off} position={[ANTENNA.x, antennaY - 0.05, ANTENNA.z]} rotation-y={-0.35} scale={3.6} castShadow />
   <Instances name="losa" rests={0} geometry={models.slab} material={material.solid} items={slabs} receiveShadow />
  </>
 );
}

// El aviso de la E de una máquina: apagada, la enciende; encendida, abre su carta.
function MachineUse({ id, busy, onUse }) {
 useInteractable({
  position: MACHINES[id].use,
  radius: 2.7,
  height: 2.7,
  priority: 1,
  hint: () => (lab.isOn(id) ? LAB.hintOn(TEXT[id].name) : LAB.hintOff(TEXT[id].name)),
  enabled: () => !busy(),
  action: () => onUse(id),
 });
 return null;
}

["escaner", "consola", "consola-doble", "capsula", "antena"].forEach(preloadLabModel);
