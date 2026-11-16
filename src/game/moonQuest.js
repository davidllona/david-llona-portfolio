import { STOP_ORDER } from "../content/twisted";
import { emit } from "../experience/state";

// El juego de The Twisted Moon: el reloj de la torre está parado y le faltan
// cuatro engranajes, uno en cada parada. Aquí solo va el estado —qué
// engranajes se tienen y si el reloj anda— y quien lo cambia avisa con el
// evento "quest" ({ type: "gear" | "start" | "reset", … }).
//
// Se guarda en la visita (sessionStorage): al volver de otro mundo, o al
// recargar la pestaña, no se pierde; al cerrar la pestaña, sí. Si el
// almacenamiento falla o está bloqueado, el progreso vive en memoria y dura
// lo que dure la página: nada se rompe.
const STORAGE_KEY = "luna-reloj";
const VERSION = 1;
export const GEARS = STOP_ORDER;
const empty = () => ({ version: VERSION, gears: [], running: false, guided: false, lantern: false });

function load() {
 try {
  const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
  if (saved?.version === VERSION && Array.isArray(saved.gears)) return { ...empty(), ...saved, gears: saved.gears.filter((id) => GEARS.includes(id)) };
 } catch {
  // Datos ilegibles o almacenamiento bloqueado: se empieza de cero.
 }
 return empty();
}
let state = typeof window === "undefined" ? empty() : load();

function save() {
 try {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
 } catch {
  // Sin almacenamiento, el progreso dura solo mientras la página siga abierta.
 }
}

export const quest = {
 total: GEARS.length,
 has: (id) => state.gears.includes(id),
 count: () => state.gears.length,
 complete: () => state.gears.length >= GEARS.length,
 running: () => state.running,
 // Los que faltan, en su orden.
 missing: () => GEARS.filter((id) => !state.gears.includes(id)),
 // Recoge un engranaje. Devuelve si era nuevo.
 collect(id) {
  if (!GEARS.includes(id) || state.gears.includes(id)) return false;
  state.gears.push(id);
  save();
  emit("quest", { type: "gear", id, count: state.gears.length });
  return true;
 },
 // Arranca el reloj (hacen falta los cuatro). Devuelve si ha arrancado ahora.
 start() {
  if (state.running || !quest.complete()) return false;
  state.running = true;
  save();
  emit("quest", { type: "start" });
  return true;
 },
 // Cosas que pasan una vez por visita: que Woody ya haya echado a andar hacia la primera parada, el farolillo encendido…
 flag: (name) => Boolean(state[name]),
 setFlag(name, value = true) {
  if (state[name] === value) return;
  state[name] = value;
  save();
 },
 reset() {
  state = empty();
  save();
  emit("quest", { type: "reset" });
 },
};
