import { useEffect } from "react";
import { isReady, loadExtra, playSample, startExtraLoop, stopExtraLoop } from "../../audio/engine";
import { events, player } from "../../experience/state";
import { lab } from "../../game/labQuest";
import { CORE, MACHINES } from "./layout";
import soundData from "./soundData.json";

// El sonido de The Cosmic Lab (sus archivos se descargan solo aquí; ver
// tools/assets/cosmic_sounds.py y docs/CREDITOS.md):
//  · Música suave en bucle. Tres para elegir de oído: `?musica=1` (por defecto,
//    «Pixels of Solar Energy»), `?musica=2` («Chill Ambient Space») y
//    `?musica=3` («Space Ambient»). Entra fundiéndose al llegar y se funde al irse.
//  · El ambiente del planeta, en bucle, muy bajo.
//  · Al encender una máquina: su arranque y, cuando sale, el rayo de energía.
//  · Un zumbido de máquina mientras haya alguna encendida, más fuerte cerca de ellas.
//  · El salto (muy bajo) y, al usar la antena, sus pitidos de telemetría.
// Todo pasa por la salida general: el botón de silencio lo calla.
const asked = Number(new URLSearchParams(window.location.search).get("musica"));
const TRACK = [1, 2, 3].includes(asked) ? asked : 1;
const MUSIC = `musica-${TRACK}`;
const MUSIC_VOLUME = 0.26;
const AMBIENCE_VOLUME = 0.07;
const HUM_VOLUME = 0.1;
const BEAM_AT = 900; // ms desde el arranque hasta que sale el rayo (ver LabScene.jsx)

export function CosmicSounds() {
 useEffect(() => {
  let live = true, started = false, humming = false;
  const pending = [];
  const later = (ms, work) => pending.push(window.setTimeout(work, ms));
  const files = Object.fromEntries([MUSIC, "ambiente", "zumbido", "encendido", "rayo", "salto", "antena"].map((name) => [name, soundData[name]]));
  const begin = () => {
   started = true;
   loadExtra(files).then(() => {
    if (!live) return;
    startExtraLoop(MUSIC, MUSIC_VOLUME, 4.5);
    startExtraLoop("ambiente", AMBIENCE_VOLUME, 3);
   });
  };
  // Al irse a otro mundo, todo se funde mientras la nave se aleja.
  const onVoyage = (event) => {
   if (event.detail?.phase !== "leaving") return;
   for (const name of [MUSIC, "ambiente", "zumbido"]) stopExtraLoop(name, 2);
   humming = false;
  };
  const onLab = (event) => {
   const { type, id } = event.detail ?? {};
   if (type === "starting") {
    const { x, z } = MACHINES[id];
    playSample("encendido", { x, z, gain: 0.6 });
    later(BEAM_AT, () => live && playSample("rayo", { x: (x + CORE.x) / 2, z: (z + CORE.z) / 2, gain: 0.5 }));
   } else if (type === "antenna") playSample("antena", { gain: 0.2 });
  };
  // (El salto de siempre lo sintetiza el motor; aquí se le suma este, muy bajo.)
  const onSound = (event) => event.detail?.id === "jump" && !player.hidden && playSample("salto", { gain: 0.1, rate: 0.96 + Math.random() * 0.08 });
  events.addEventListener("voyage", onVoyage);
  events.addEventListener("lab", onLab);
  events.addEventListener("sound", onSound);
  const timer = window.setInterval(() => {
   // El contexto de sonido se crea con el primer gesto: hasta entonces, nada.
   if (!isReady()) return;
   if (!started) begin();
   // El zumbido: suena mientras haya alguna máquina encendida.
   const on = lab.count() > 0 && !player.hidden;
   if (on && !humming) humming = startExtraLoop("zumbido", HUM_VOLUME, 2);
   else if (!on && humming) {
    stopExtraLoop("zumbido", 1.5);
    humming = false;
   }
  }, 300);
  if (import.meta.env.DEV) window.__world.cosmicSounds = { track: TRACK }; // para las pruebas automáticas
  return () => {
   live = false;
   window.clearInterval(timer);
   pending.forEach((one) => window.clearTimeout(one));
   events.removeEventListener("voyage", onVoyage);
   events.removeEventListener("lab", onLab);
   events.removeEventListener("sound", onSound);
   for (const name of [MUSIC, "ambiente", "zumbido"]) stopExtraLoop(name, 1);
  };
 }, []);
 return null;
}
