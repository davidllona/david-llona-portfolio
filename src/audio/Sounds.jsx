import { useEffect } from "react";
import { events, player } from "../experience/state";
import { theme } from "../experience/theme";
import { world } from "../worlds";
import { isReady, loadSamples, play, setAmbience, setRunning, startAmbience, stats, unlock } from "./engine";

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
  let frame = 0;
  const start = () => {
   unlock();
   startAmbience();
   // Las muestras grabadas se piden ahora, ya dentro: la carga no las espera.
   loadSamples();
   setRunning(!document.hidden);
  };
  if (active) {
   // Normalmente el contexto ya existe (se crea al pulsar, antes del clic; ver
   // App.jsx). Si se entra con el teclado no ha habido ocasión: crearlo cuesta
   // unos 80 ms, así que se deja para dos fotogramas después, con el descenso
   // ya en marcha, en vez de retrasar su inicio.
   if (isReady()) start();
   else frame = requestAnimationFrame(() => (frame = requestAnimationFrame(start)));
  } else setRunning(false);
  const onVisibility = () => setRunning(active && !document.hidden);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
   cancelAnimationFrame(frame);
   document.removeEventListener("visibilitychange", onVisibility);
  };
 }, [active]);

 useEffect(() => {
  if (import.meta.env.DEV) window.__world.audio = stats; // para las pruebas automáticas
  const at = (event) => event.detail ?? {};
  let lastStep = 0;
  const handlers = {
   // Marcas de los clips de animación: pasos, despegue del salto y caída.
   anim: (event) => {
    const { who, name } = at(event);
    if (who !== "astro") return;
    if (name.startsWith("footstep")) {
     // Corriendo, el paso suena más fuerte y algo más agudo. Los clips de andar y
     // correr marcan hoy más pisadas de las que se dan de verdad (hasta 7–9 por
     // segundo): se deja pasar una cadencia natural, no una ráfaga.
     const running = Math.hypot(player.velocity.x, player.velocity.z) > 4.4;
     const time = performance.now();
     if (time - lastStep < (running ? 200 : 290)) return;
     lastStep = time;
     play(`step-${surfaceUnderPlayer()}`, { strength: running ? 1 : 0.55 });
    } else if (name === "jump_takeoff") play("jump");
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
  // Interfaz: cualquier botón o enlace de la página hace «pop» al pulsarlo.
  const onClick = (event) => event.target.closest?.("button, a, [role='button']") && play("ui-pop");
  document.addEventListener("click", onClick, true);

  // Ambiente: brisa de fondo; pájaros de día y grillos de noche, que se funden
  // con el cielo; y el agua (cascada, arroyo, mar) según dónde quede.
  let ticks = 0;
  const timer = window.setInterval(() => {
   const { x, z } = player.position;
   const hidden = player.hidden; // dentro del cohete
   const night = theme.mix;
   // Desde la nave, el planeta se oye apagado y sin agua.
   const outside = hidden ? 0.25 : 1;
   setAmbience({
    wind: hidden ? 0.2 : 0.6 + night * 0.3,
    birds: (1 - night) * outside,
    crickets: night * outside,
    sources: hidden ? {} : (world.soundSources?.(x, z) ?? {}),
   });
   // Mientras no llegan los bucles grabados (o en un mundo sin ellos), trinos y grillos sintetizados.
   if (hidden || (ticks++ % 3) || stats.loopsReady?.()) return;
   const angle = Math.random() * Math.PI * 2;
   const spot = { x: x + Math.cos(angle) * 9, z: z + Math.sin(angle) * 9 };
   if (night < 0.4 && Math.random() < 0.09) play("chirp", spot);
   if (night > 0.6 && Math.random() < 0.3) play("cricket", spot);
  }, 140);

  return () => {
   for (const [type, handler] of Object.entries(handlers)) events.removeEventListener(type, handler);
   document.removeEventListener("click", onClick, true);
   window.clearInterval(timer);
  };
 }, []);

 return null;
}
