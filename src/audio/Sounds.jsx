import { useEffect } from "react";
import { events, player } from "../experience/state";
import { theme } from "../experience/theme";
import { world } from "../worlds";
import { play, setAmbience, setRunning, startAmbience, stats, unlock } from "./engine";

// Qué pisa el astronauta ahora mismo.
function surfaceUnderPlayer() {
 const { x, y, z } = player.position;
 if (y < world.waterLevel - 0.02) return "water";
 return world.surface?.(x, z) ?? "path";
}

// Conecta lo que pasa en el juego con su sonido. No dibuja nada.
// `active`: se está jugando (no en la pantalla de inicio ni en pausa).
export function Sounds({ active }) {
 // El audio arranca con el primer gesto y se detiene en pausa.
 useEffect(() => {
  if (active) {
   unlock();
   startAmbience();
  }
  setRunning(active && !document.hidden);
  const onVisibility = () => setRunning(active && !document.hidden);
  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
 }, [active]);

 useEffect(() => {
  if (import.meta.env.DEV) window.__world.audio = stats; // para las pruebas automáticas
  const at = (event) => event.detail ?? {};
  const handlers = {
   // Marcas de los clips de animación: pasos, despegue del salto y caída.
   anim: (event) => {
    const { who, name } = at(event);
    if (who !== "astro") return;
    if (name.startsWith("footstep")) play(`step-${surfaceUnderPlayer()}`);
    else if (name === "jump_takeoff") play("jump");
    else if (name === "land" || name === "land_hard") play(surfaceUnderPlayer() === "water" ? "splash" : "land", { strength: name === "land_hard" ? 1 : 0.6 });
   },
   // Golpes físicos: los emite quien los calcula, con su posición y su fuerza.
   sound: (event) => play(at(event).id, at(event)),
   score: () => {
    play("ball-net");
    play("score");
   },
   open: () => play("ui-open"),
   close: () => play("ui-close"),
   theme: () => play("ui-toggle"),
   pet: () => play("pet"),
   guide: (event) => at(event).to && play("bark"),
   gust: (event) => {
    const { x, z, strength = 1, quiet } = at(event);
    if (!quiet) play("chime", { x, z });
    play("gust", { strength });
   },
   birds: () => play("flutter"),
   flash: () => play("explosion"),
   ship: (event) => play(at(event).phase === "launch" ? "rocket-launch" : "rocket-land"),
   achievement: () => play("achievement"),
  };
  for (const [type, handler] of Object.entries(handlers)) events.addEventListener(type, handler);

  // Ambiente: brisa de fondo, agua según lo cerca que esté, pájaros de día y grillos de noche.
  const timer = window.setInterval(() => {
   const { x, z } = player.position;
   const hidden = player.hidden; // dentro del cohete
   setAmbience({ wind: hidden ? 0.2 : 0.6 + theme.mix * 0.3, water: hidden ? 0 : (world.waterNear?.(x, z) ?? 0) });
   if (hidden) return;
   const angle = Math.random() * Math.PI * 2;
   const spot = { x: x + Math.cos(angle) * 9, z: z + Math.sin(angle) * 9 };
   if (theme.mix < 0.4 && Math.random() < 0.09) play("chirp", spot);
   if (theme.mix > 0.6 && Math.random() < 0.3) play("cricket", spot);
  }, 400);

  return () => {
   for (const [type, handler] of Object.entries(handlers)) events.removeEventListener(type, handler);
   window.clearInterval(timer);
  };
 }, []);

 return null;
}
