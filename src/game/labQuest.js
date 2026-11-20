import { MACHINE_ORDER } from "../content/cosmic";
import { emit } from "../experience/state";

// El juego de The Cosmic Lab: el laboratorio está apagado y cada máquina que se
// enciende manda energía al núcleo. Aquí solo va el estado —qué máquinas están
// encendidas— y quien lo cambia avisa con el evento "lab" ({ type: "machine", … }).
// Como el reloj de The Twisted Moon (moonQuest.js): se guarda en la visita
// (sessionStorage) y, si el almacenamiento falla, vive en memoria.
const STORAGE_KEY = "lab-energia";
const VERSION = 1;
const empty = () => ({ version: VERSION, on: [], guided: false });

function load() {
 try {
  const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
  if (saved?.version === VERSION && Array.isArray(saved.on)) return { ...empty(), ...saved, on: saved.on.filter((id) => MACHINE_ORDER.includes(id)) };
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
  // Sin almacenamiento, dura solo mientras la página siga abierta.
 }
}

export const lab = {
 total: MACHINE_ORDER.length,
 isOn: (id) => state.on.includes(id),
 count: () => state.on.length,
 complete: () => state.on.length >= MACHINE_ORDER.length,
 // Enciende una máquina. Devuelve si estaba apagada.
 switchOn(id) {
  if (!MACHINE_ORDER.includes(id) || state.on.includes(id)) return false;
  state.on.push(id);
  save();
  emit("lab", { type: "machine", id, count: state.on.length });
  return true;
 },
 flag: (name) => Boolean(state[name]),
 setFlag(name, value = true) {
  if (state[name] === value) return;
  state[name] = value;
  save();
 },
 reset() {
  state = empty();
  save();
  emit("lab", { type: "reset" });
 },
};
