import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { world } from "../worlds";
import { distanceTo, read } from "./interact";
import { input, interactables, setHint, ui } from "./state";

// Elige en cada fotograma la interacción disponible más cercana que esté a la
// vista —una sola—, muestra su texto y la ejecuta cuando se pulsa E (o el
// botón táctil).
const point = new THREE.Vector3();
// ¿Cae dentro de la pantalla, con algo de margen? Lo que no se ve no se ofrece.
function onScreen(camera, at) {
 point.set(at.x, world.height(at.x, at.z) + 0.7, at.z).project(camera);
 return point.z < 1 && Math.abs(point.x) < 0.94 && point.y > -0.86 && point.y < 0.9;
}

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
  setHint(best ? read(best.hint) : null);
  if (input.actionQueued) {
   input.actionQueued = false;
   best?.action();
  }
 });
 return null;
}
