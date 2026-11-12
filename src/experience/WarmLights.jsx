import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { player, rig } from "./state";
import { current } from "./theme";
import { warmSources } from "./lightSources";

const BASE_POWER = 19; // candelas de una farola de noche

// Reserva de luces puntuales cálidas. Solo existen `count`; en cada fotograma
// se reparten entre las fuentes más cercanas a lo que sigue la cámara. Cuando
// una luz cambia de fuente, primero se apaga y luego se enciende en la nueva,
// para que nada salte. De día están apagadas (pero siguen en la escena, así
// los materiales no se recompilan al anochecer).
export function WarmLights({ count = 6 }) {
 const lights = useRef([]);
 const slots = useMemo(() => Array.from({ length: count }, () => ({ source: null, level: 0 })), [count]);
 const nearest = useMemo(() => [], []);

 useFrame(({ clock }, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  const focus = rig.focus ?? player.position;
  const night = current.glow;

  // Las `count` fuentes más cercanas (son pocas decenas: basta ordenar).
  nearest.length = 0;
  if (night > 0.02) {
   for (const source of warmSources) {
    source.distance = Math.hypot(source.x - focus.x, source.z - focus.z);
    nearest.push(source);
   }
   nearest.sort((a, b) => a.distance - b.distance);
   nearest.length = Math.min(nearest.length, count);
  }

  slots.forEach((slot, i) => {
   const light = lights.current[i];
   const keep = slot.source && nearest.includes(slot.source);
   if (keep) slot.level = Math.min(1, slot.level + dt * 2.5);
   else {
    slot.level = Math.max(0, slot.level - dt * 3.5);
    // Apagada: puede pasar a una fuente cercana que aún no tenga luz.
    if (slot.level === 0) slot.source = nearest.find((source) => !slots.some((other) => other.source === source)) ?? null;
   }
   const source = slot.source;
   if (!source || slot.level === 0) {
    light.intensity = 0;
    return;
   }
   const time = clock.elapsedTime;
   const flicker = 1 + source.flicker * (Math.sin(time * 7.3 + source.phase) * 0.6 + Math.sin(time * 13.1 + source.phase * 1.7) * 0.4);
   light.position.set(source.x, source.y, source.z);
   light.color.set(source.color);
   light.distance = source.reach;
   light.intensity = BASE_POWER * source.power * slot.level * night * flicker;
  });
 });

 return slots.map((_, i) => <pointLight key={i} ref={(node) => (lights.current[i] = node)} intensity={0} decay={1.6} />);
}
