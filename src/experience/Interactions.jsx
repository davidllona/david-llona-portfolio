import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { world } from "../worlds";
import { distanceTo, read } from "./interact";
import { isSpeaking, skipSpeech } from "./speech";
import { emit, input, interactables, setHint, ui } from "./state";

const point = new THREE.Vector3();
const anchor = { x: 0, y: 0, z: 0 };
// ¿Cae dentro de la pantalla, con algo de margen? Lo que no se ve no se ofrece.
function onScreen(camera, at) {
 point.set(at.x, world.height(at.x, at.z) + 0.7, at.z).project(camera);
 return point.z < 1 && Math.abs(point.x) < 0.94 && point.y > -0.86 && point.y < 0.9;
}

// Elige en cada fotograma la interacción disponible más cercana que esté a la
// vista —una sola—, coloca su indicación sobre el objeto y la ejecuta cuando
// se pulsa E (o el botón táctil). Si no hay nada que usar y Woody está
// hablando, la E pasa su bocadillo.
export function Interactions({ active }) {
 useFrame(({ camera }) => {
  let best = null;
  let bestScore = Infinity;
  if (active && !ui.open) {
   for (const entry of interactables) {
    if (entry.enabled && !entry.enabled()) continue;
    const distance = distanceTo(entry);
    if (distance > entry.radius) continue;
    if (!onScreen(camera, read(entry.position))) continue;
    const score = distance - (entry.priority ?? 0) * 1000;
    if (score < bestScore) {
     best = entry;
     bestScore = score;
    }
   }
  }
  if (best) {
   // La indicación flota sobre el objeto (`sign`: dónde, si no es su punto de uso).
   const at = read(best.sign) ?? read(best.position);
   anchor.x = at.x;
   anchor.z = at.z;
   anchor.y = at.y !== undefined && best.sign ? at.y : world.height(at.x, at.z) + (best.height ?? 2.3);
   setHint(read(best.hint), anchor);
  } else setHint(null);
  if (input.actionQueued) {
   input.actionQueued = false;
   if (best) {
    best.action();
    emit("interact", { x: best.sign ? undefined : read(best.position).x, z: best.sign ? undefined : read(best.position).z });
   }
   else if (active && isSpeaking()) skipSpeech();
  }
 });
 return null;
}
