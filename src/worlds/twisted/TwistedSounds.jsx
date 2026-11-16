import { useEffect } from "react";
import { isReady, loadExtra, playSample, setStepSound, startExtraLoop, stopExtraLoop } from "../../audio/engine";
import { events, player, voyage } from "../../experience/state";
import { clock } from "../../experience/theme";
import { BELL, FIREFLIES, MUSHROOMS, height } from "./layout";
import soundData from "./soundData.json";

// El sonido de The Twisted Moon (sus archivos se descargan solo aquí; ver
// tools/assets/twisted_sounds.py):
//  · Música suave en bucle. Tres para elegir de oído: `?musica=1` (por
//    defecto, «Mysterious Fairy Tale Waltz»), `?musica=2` («Curious Mystery
//    Box») y `?musica=3` («Quirky Music Box»). Entra fundiéndose al llegar y
//    se funde al irse.
//  · Grillos de fondo, en bucle (los del primer mundo callan aquí).
//  · Campanadas de la torre: dos al acercarse a ella y, en cada hora en punto
//    real del visitante, tantas como la hora.
//  · Destello mágico al usar algo (E o clic) y al pasar junto a una seta o un corro de luciérnagas.
//  · Pasos de madera en los puentes.
//  · Un búho de vez en cuando, lejos y bajo.
// Todo pasa por la salida general: el botón de silencio lo calla.
const asked = Number(new URLSearchParams(window.location.search).get("musica"));
const TRACK = [1, 2, 3].includes(asked) ? asked : 1;
const MUSIC = `musica-${TRACK}`;
const MUSIC_VOLUME = 0.3;
const CRICKETS_VOLUME = 0.32;
const STRIKE_GAP = 2.4; // s entre campanadas

export function TwistedSounds() {
 useEffect(() => {
  let live = true, started = false, timer = 0;
  const pending = [];
  const later = (ms, work) => pending.push(window.setTimeout(work, ms));
  const files = Object.fromEntries([MUSIC, "grillos-noche", "campanada", "destello-1", "destello-2", "destello-3", "destello-4", "pasos-madera", "buho"].map((name) => [name, soundData[name]]));
  const sparkle = (gain = 0.45) => playSample(`destello-${1 + Math.floor(Math.random() * 4)}`, { gain, rate: 0.94 + Math.random() * 0.12 });
  const strike = (count, gain) => {
   for (let i = 0; i < count; i++) later(i * STRIKE_GAP * 1000, () => live && playSample("campanada", { gain, rate: 1 - i * 0.004 }));
  };
  const begin = () => {
   started = true;
   loadExtra(files).then(() => {
    if (!live) return;
    // (Si se está llegando de otro mundo, la pantalla del viaje aún cubre: la música entra igual, despacio.)
    startExtraLoop(MUSIC, MUSIC_VOLUME, 4.5);
    startExtraLoop("grillos-noche", CRICKETS_VOLUME, 3);
    setStepSound("step-wood", "pasos-madera");
   });
  };
  // Al irse a otro mundo, la música y los grillos se funden mientras la nave se aleja.
  const onVoyage = (event) => {
   if (event.detail?.phase !== "leaving") return;
   stopExtraLoop(MUSIC, 2);
   stopExtraLoop("grillos-noche", 2);
  };
  const onInteract = () => sparkle(0.5);
  events.addEventListener("voyage", onVoyage);
  events.addEventListener("interact", onInteract);

  let lastHour = null, nearBell = false, bellAt = -1e9, owlAt = performance.now() + 18000 + Math.random() * 20000, touched = -1, touchedAt = 0;
  timer = window.setInterval(() => {
   // El contexto de sonido se crea con el primer gesto: hasta entonces, nada.
   if (!isReady()) return;
   if (!started) begin();
   if (voyage.phase !== "idle" || player.hidden) return;
   const now = performance.now(), { x, z } = player.position;
   // Campanadas en cada hora en punto real (las oye toda la isla), y dos al llegar junto a la torre.
   const hour = Math.floor(clock().hour);
   if (lastHour !== null && hour !== lastHour) strike(hour % 12 || 12, 0.4);
   lastHour = hour;
   const close = Math.hypot(x - BELL.x, z - BELL.z) < 8;
   if (close && !nearBell && now - bellAt > 60000) {
    bellAt = now;
    strike(2, 0.6);
   }
   nearBell = close;
   // El búho: de vez en cuando, lejos y bajo, a un lado.
   if (now > owlAt) {
    owlAt = now + 25000 + Math.random() * 35000;
    playSample("buho", { gain: 0.16, pan: Math.random() < 0.5 ? -0.65 : 0.65, rate: 0.95 + Math.random() * 0.08 });
   }
   // Destello al pasar junto a una seta o un corro de luciérnagas.
   if (now - touchedAt > 1400) {
    let hit = -1;
    for (let i = 0; i < MUSHROOMS.length && hit < 0; i++) if (Math.abs(MUSHROOMS[i].x - x) < 0.6 && Math.abs(MUSHROOMS[i].z - z) < 0.6) hit = i;
    for (let i = 0; i < FIREFLIES.length && hit < 0; i++) if (Math.hypot(FIREFLIES[i].x - x, FIREFLIES[i].z - z) < 0.9 && Math.abs(height(x, z) + FIREFLIES[i].lift - player.position.y) < 2.5) hit = 1000 + i;
    if (hit >= 0 && hit !== touched) {
     touched = hit;
     touchedAt = now;
     sparkle(0.32);
    }
   }
  }, 250);
  if (import.meta.env.DEV) window.__world.twistedSounds = { track: TRACK, strike: (count) => strike(count, 0.4) }; // para las pruebas automáticas
  return () => {
   live = false;
   window.clearInterval(timer);
   pending.forEach((one) => window.clearTimeout(one));
   events.removeEventListener("voyage", onVoyage);
   events.removeEventListener("interact", onInteract);
   stopExtraLoop(MUSIC, 1);
   stopExtraLoop("grillos-noche", 1);
   setStepSound("step-wood", null);
  };
 }, []);
 return null;
}
