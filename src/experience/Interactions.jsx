import { useFrame } from "@react-three/fiber";
import { distanceTo, read } from "./interact";
import { input, interactables, setHint, ui } from "./state";

// Elige en cada fotograma la interacción disponible más cercana, muestra su
// texto y la ejecuta cuando se pulsa E (o el botón táctil).
export function Interactions({ active }) {
 useFrame(() => {
  let best = null;
  let bestScore = Infinity;
  if (active && !ui.open) {
   for (const entry of interactables) {
    if (entry.enabled && !entry.enabled()) continue;
    const distance = distanceTo(entry);
    if (distance > entry.radius) continue;
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
