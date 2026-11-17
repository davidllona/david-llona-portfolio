import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CLOCK, FUTURE, STOPS, TIMELINE, WOODY_CLOCK } from "../../content/twisted";
import { useInteractable } from "../../experience/interact";
import { isSpeaking, say } from "../../experience/speech";
import { emit, events, player, rig, ui, voyage, woody } from "../../experience/state";
import { clockwork, SEQUENCE } from "./clockwork";
import { Glows } from "./Details";
import { QUEST_STOPS, SPAWN, TELESCOPE, TOWER_DOOR, ground } from "./layout";
import { createGear } from "./models";
import { GEARS, quest } from "../../game/moonQuest";

// El juego del reloj, en la escena: los cuatro engranajes que flotan ante su
// parada, el aviso «E» de cada una (abre su panel; al cerrarlo, se gana el
// engranaje), la puerta de la torre (arranca el reloj cuando se tienen los
// cuatro y, después, abre «Mi recorrido») y el observatorio («Lo que viene»).
// Woody va delante: al llegar explica qué pasa y, tras cada engranaje, echa a
// andar hacia la parada siguiente. Los textos, en content/twisted.js.

// La parada sin engranaje que queda más cerca de quien juega.
function nearestMissing() {
 let best = null;
 for (const id of quest.missing()) {
  const d = Math.hypot(QUEST_STOPS[id].x - player.position.x, QUEST_STOPS[id].z - player.position.z);
  if (!best || d < best.d) best = { id, d };
 }
 return best?.id ?? null;
}
// Woody echa a andar hacia un sitio (si no se le han silenciado los consejos) y dice por qué.
function lead(node, line) {
 if (!woody.tips) return;
 emit("guide", { to: node });
 if (line) say(line);
}

// Ficha de una parada: la cámara se acerca a su edificio y se abre el panel.
const cardOf = (text, spot, extra) => ({ eyebrow: text.place, title: text.title, paragraphs: text.paragraphs, at: { x: spot.focus[0], y: ground(spot.focus[0], spot.focus[2]) + spot.focus[1], z: spot.focus[2], distance: spot.distance ?? 0.85 }, ...extra });

function Stop({ id, onOpen }) {
 const spot = QUEST_STOPS[id];
 useInteractable({
  position: spot,
  radius: 2.4,
  height: 2.4,
  priority: 1,
  hint: STOPS[id].hint,
  enabled: () => !ui.open && clockwork.startedAt === null,
  action: () => onOpen(id),
 });
 return null;
}

const GEAR_LIFT = 1.55; // m sobre el suelo a los que flota cada engranaje
export function Quest() {
 const pending = useRef(null); // parada cuyo panel está abierto
 const gears = useRef([]);
 const shown = useRef(GEARS.map((id) => (quest.has(id) ? 0 : 1)));
 const model = useMemo(() => createGear(9), []);
 // Latón encendido: brilla por sí mismo, por encima del umbral del resplandor.
 const material = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.45, 1.2, 0.8), toneMapped: false }), []);
 const power = useMemo(() => GEARS.map(() => ({ value: 1 })), []);
 const spots = useMemo(
  () =>
   GEARS.map((id) => {
    const spot = QUEST_STOPS[id];
    return [spot.gear[0], ground(spot.gear[0], spot.gear[1]) + GEAR_LIFT, spot.gear[1]];
   }),
  [],
 );
 useEffect(
  () => () => {
   model.dispose();
   material.dispose();
  },
  [model, material],
 );

 // Al cerrar el panel de una parada, se gana su engranaje.
 useEffect(() => {
  const onClose = () => {
   const id = pending.current;
   pending.current = null;
   if (!id) return;
   if (id === "torre" || id === "observatorio") {
    if (id === "torre" && !quest.flag("pointed")) {
     quest.setFlag("pointed");
     lead("luna-observatorio", WOODY_CLOCK.afterClock);
    }
    return;
   }
   const spot = QUEST_STOPS[id];
   if (!quest.collect(id)) return;
   emit("toast", { text: CLOCK.gear(quest.count(), quest.total), at: { x: spot.x, y: ground(spot.x, spot.z) + 2.6, z: spot.z } });
   const next = nearestMissing();
   if (next) lead(QUEST_STOPS[next].node, WOODY_CLOCK.next[next]);
   else lead("torre", WOODY_CLOCK.allGears);
  };
  events.addEventListener("close", onClose);
  return () => events.removeEventListener("close", onClose);
 }, []);

 // Usar una parada: primero se ve lo que pasa en ella (las notas que se ordenan,
 // el farolillo que se enciende, lo que hay al otro lado del telescopio) y luego
 // se abre su panel. Mientras, sin controles.
 const showing = useRef(null);
 const present = (id, spot, card) => {
  pending.current = id;
  emit("stop-use", { id, show: spot.show ?? 0 });
  if (!spot.show) return emit("open", card);
  ui.open += 1;
  if (id !== "observatorio") {
   rig.focus = { x: card.at.x, y: card.at.y, z: card.at.z };
   rig.distance = card.at.distance;
  }
  showing.current = window.setTimeout(() => {
   showing.current = null;
   ui.open -= 1;
   rig.focus = null;
   rig.distance = 1;
   emit("open", card);
  }, spot.show);
  return undefined;
 };
 useEffect(
  () => () => {
   if (showing.current === null) return;
   window.clearTimeout(showing.current);
   ui.open -= 1;
   rig.focus = null;
   rig.distance = 1;
  },
  [],
 );
 const open = (id) => present(id, QUEST_STOPS[id], { kind: "stop", stop: id, ...cardOf(STOPS[id], QUEST_STOPS[id]) });

 // ── La puerta de la torre ──
 const timeline = () => {
  pending.current = "torre";
  emit("open", { kind: "stop", stop: "torre", eyebrow: TIMELINE.place, title: TIMELINE.title, timeline: TIMELINE.milestones, at: { x: TOWER_DOOR.focus[0], y: ground(TOWER_DOOR.focus[0], TOWER_DOOR.focus[2]) + TOWER_DOOR.focus[1], z: TOWER_DOOR.focus[2], distance: 1.25 } });
 };
 const sequence = useRef(null);
 useInteractable({
  position: TOWER_DOOR,
  radius: 2.6,
  height: 2.7,
  priority: 1,
  hint: () => (quest.running() ? CLOCK.doorRunning : quest.complete() ? CLOCK.doorReady : CLOCK.doorMissing(quest.count(), quest.total)),
  enabled: () => !ui.open && clockwork.startedAt === null,
  action: () => {
   if (quest.running()) return timeline();
   if (!quest.complete()) {
    emit("toast", { text: CLOCK.missing(quest.total - quest.count()), at: { x: TOWER_DOOR.x, y: ground(TOWER_DOOR.x, TOWER_DOOR.z) + 2.9, z: TOWER_DOOR.z } });
    const next = nearestMissing();
    if (next) lead(QUEST_STOPS[next].node, WOODY_CLOCK.doorMissing);
    return undefined;
   }
   // Arranque: la cámara se va a la fachada, los engranajes encajan, suenan
   // las campanadas, las esferas se encienden y, al acabar, «Mi recorrido».
   clockwork.begin();
   quest.start();
   ui.open += 1; // sin controles mientras dura
   const y = ground(TOWER_DOOR.focus[0], TOWER_DOOR.focus[2]);
   rig.focus = { x: TOWER_DOOR.focus[0], y: y + 7.4, z: TOWER_DOOR.focus[2] };
   rig.distance = 1.5;
   rig.lift = 0.55;
   sequence.current = window.setTimeout(() => {
    sequence.current = null;
    ui.open -= 1;
    rig.focus = null;
    rig.distance = 1;
    rig.lift = 1;
    emit("toast", { text: CLOCK.started, at: { x: TOWER_DOOR.x, y: ground(TOWER_DOOR.x, TOWER_DOOR.z) + 2.9, z: TOWER_DOOR.z } });
    if (woody.tips) say(WOODY_CLOCK.started, { now: true });
    timeline();
   }, SEQUENCE * 1000);
   return undefined;
  },
 });
 useEffect(
  () => () => {
   // (Si se sale del mundo a media secuencia, no se queda nada a medias.)
   if (sequence.current === null) return;
   window.clearTimeout(sequence.current);
   ui.open -= 1;
   rig.focus = null;
   rig.distance = 1;
   rig.lift = 1;
  },
  [],
 );

 // ── El observatorio: el final ──
 useInteractable({
  position: TELESCOPE,
  radius: 2.4,
  height: 2.5,
  priority: 1,
  hint: FUTURE.hint,
  enabled: () => !ui.open && clockwork.startedAt === null,
  action: () => {
   present("observatorio", TELESCOPE, { kind: "stop", stop: "observatorio", ...cardOf(FUTURE, TELESCOPE), soon: FUTURE.soon, soonNote: FUTURE.soonNote });
  },
 });

 // Woody, al llegar: cuenta lo del reloj y echa a andar hacia la primera parada.
 useEffect(() => {
  let told = false;
  const timer = window.setInterval(() => {
   if (quest.flag("guided") || quest.running() || !woody.tips) return;
   if (player.hidden || rig.intro !== 0 || voyage.phase !== "idle" || ui.open) return;
   if (Math.hypot(player.position.x - SPAWN.x, player.position.z - SPAWN.z) < 1.2) return;
   if (!told) {
    told = true;
    // (Lleva el mismo «una sola vez» que la frase de la zona de la nave: la sustituye.)
    say(WOODY_CLOCK.arrival, { once: "zona:luna-nave", tip: true });
    return;
   }
   if (isSpeaking()) return;
   quest.setFlag("guided");
   const next = nearestMissing();
   if (next) emit("guide", { to: QUEST_STOPS[next].node });
  }, 300);
  return () => window.clearInterval(timer);
 }, []);

 // Los engranajes giran despacio y suben y bajan; el recogido se encoge y desaparece.
 useFrame(({ clock }, delta) => {
  const t = clock.elapsedTime;
  GEARS.forEach((id, i) => {
   const mesh = gears.current[i];
   if (!mesh) return;
   const target = quest.has(id) ? 0 : 1;
   shown.current[i] += (target - shown.current[i]) * Math.min(1, delta * 5);
   const k = shown.current[i];
   mesh.visible = k > 0.01;
   mesh.scale.setScalar(0.42 * k);
   mesh.rotation.y = t * 0.8 + i * 1.3;
   mesh.position.y = spots[i][1] + Math.sin(t * 1.6 + i) * 0.1;
   power[i].value = k;
  });
  if (import.meta.env.DEV) window.__world.quest = quest; // para las pruebas automáticas
 });

 return (
  <>
   {GEARS.map((id) => (
    <Stop key={id} id={id} onOpen={open} />
   ))}
   {GEARS.map((id, i) => (
    <mesh key={id} ref={(node) => (gears.current[i] = node)} name="engranaje" geometry={model} material={material} position={spots[i]} />
   ))}
   <Glows name="brillo de los engranajes" points={spots} size={1.5} color="#ffb056" power={power} />
  </>
 );
}
