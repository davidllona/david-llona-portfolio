import { useEffect } from "react";
import { events, player } from "../experience/state";
import { world } from "../worlds";
import { collect, count, isUnlocked, unlock } from "./store";

// Escucha lo que pasa en el juego y apunta los logros. No dibuja nada.
// Cada logro sale de un hecho comprobado: una canasta que entra por el aro,
// una ficha de proyecto que se abre, un despegue que ocurre.
export function Tracker({ active }) {
 useEffect(() => {
  const handlers = {
   open: (event) => event.detail?.kind === "project" && unlock("primer-contacto"),
   "project-link": () => unlock("primer-contacto"),
   score: () => unlock("primer-enceste"),
   pet: () => count("mejor-amigo"),
   ship: (event) => event.detail?.phase === "launch" && unlock("viajero-espacial"),
  };
  for (const [type, handler] of Object.entries(handlers)) events.addEventListener(type, handler);
  return () => {
   for (const [type, handler] of Object.entries(handlers)) events.removeEventListener(type, handler);
  };
 }, []);

 // Lo que depende de por dónde se anda se mira unas pocas veces por segundo.
 useEffect(() => {
  if (!active) return undefined;
  const start = player.position.clone();
  const timer = window.setInterval(() => {
   if (player.hidden) return;
   const { x, z } = player.position;
   if (!isUnlocked("primeros-pasos") && Math.hypot(x - start.x, z - start.z) > 1.5) unlock("primeros-pasos");
   if (world.id === "living" && !isUnlocked("explorador")) {
    for (const area of world.areas) {
     if (Math.hypot(x - area.x, z - area.z) < area.r) collect("explorador", area.id);
    }
   }
  }, 250);
  return () => window.clearInterval(timer);
 }, [active]);

 return null;
}
