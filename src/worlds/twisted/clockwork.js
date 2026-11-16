import { uniform } from "three/tsl";
import { quest } from "../../game/moonQuest";

// La maquinaria del reloj, vista desde la escena: cuánto llevan encendido las
// esferas, por dónde va la secuencia de arranque y cuánto se han espantado los
// murciélagos. Lo escribe la torre (Buildings.jsx) en cada fotograma y lo leen
// los materiales (uniformes) y quien quiera saber cómo va (las pruebas).
//
// La secuencia de arranque dura SEQUENCE segundos desde que se pulsa E en la
// puerta con los cuatro engranajes:
//   0,4 – 2,6  los engranajes encajan en la fachada, uno tras otro;
//   2,8        empiezan a girar y suenan las campanadas;
//   3,0 – 4,6  las esferas se encienden y las agujas corren hasta la hora real;
//   3,0 – 7,0  los murciélagos salen volando y vuelven.
export const SEQUENCE = 6.6;
export const GEAR_IN = (k) => 0.4 + k * 0.55; // s en que encaja el engranaje k
export const SPIN_AT = 2.8;
const DIM = 0.16; // esferas a media luz, con el reloj parado

export const clockwork = {
 dial: uniform(DIM), // brillo de las esferas
 glow: uniform(0), // halo ante las esferas
 scatter: uniform(0), // 0 = los murciélagos rondan la torre; 1 = espantados, lejos
 startedAt: null, // performance.now() al empezar la secuencia (null si no hay)
 level: 0, // 0 parado … 1 en marcha (lo que llevan las esferas)
 // Segundos de secuencia: −1 con el reloj parado; «infinito» si ya anda.
 time(now = performance.now()) {
  if (clockwork.startedAt !== null) return (now - clockwork.startedAt) / 1000;
  return quest.running() ? 1e6 : -1;
 },
 begin() {
  clockwork.startedAt = performance.now();
 },
 // Se llama en cada fotograma.
 update() {
  const t = clockwork.time();
  if (clockwork.startedAt !== null && t > SEQUENCE + 1.5) clockwork.startedAt = null;
  const smooth = (a, b) => {
   const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
   return k * k * (3 - 2 * k);
  };
  const lit = smooth(3.0, 4.6);
  clockwork.level = lit;
  clockwork.dial.value = DIM + (1.3 - DIM) * lit;
  clockwork.glow.value = lit;
  clockwork.scatter.value = t > 1e5 ? 0 : smooth(3.0, 3.8) * (1 - smooth(5.2, 7.6));
  return t;
 },
};
