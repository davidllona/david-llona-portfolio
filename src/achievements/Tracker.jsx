import { useEffect } from "react";
import { events, player } from "../experience/state";
import { TRIPLES } from "../game/triples";
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
   // Concurso de triples: 20 puntos o más de 30.
   triples: (event) => event.detail?.type === "end" && event.detail.score >= TRIPLES.goal && unlock("francotirador"),
   pet: () => count("mejor-amigo"),
   ship: (event) => event.detail?.phase === "launch" && unlock("viajero-espacial"),
   // The Twisted Moon: cada engranaje ganado y el arranque del reloj.
   quest: (event) => {
    if (event.detail?.type === "gear") collect("cuatro-engranajes", event.detail.id);
    else if (event.detail?.type === "start") unlock("relojero");
   },
   // The Cosmic Lab: una máquina que se enciende.
   lab: (event) => event.detail?.type === "machine" && unlock("mente-inquieta"),
   // Fútbol: goles que cruzan la línea, golpes reales en el palo, faltas y dianas.
   football: (event) => {
    const { type, goal, free, cleared } = event.detail ?? {};
    if (type === "result" && goal) {
     unlock("primer-gol");
     if (free) count("especialista");
    } else if (type === "woodwork") unlock("al-palo");
    else if (type === "target" && cleared) unlock("dianas");
   },
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
  // Tras reiniciar el progreso se empieza de cero también aquí: los «primeros
  // pasos» cuentan desde donde se esté.
  const onReset = () => start.copy(player.position);
  events.addEventListener("achievements-reset", onReset);
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
  return () => {
   window.clearInterval(timer);
   events.removeEventListener("achievements-reset", onReset);
  };
 }, [active]);

 return null;
}
