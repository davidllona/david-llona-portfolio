import { emit } from "../experience/state";
import { BY_ID } from "./list";

// Progreso de los logros, guardado en este navegador (sin cuentas). El formato
// lleva versión: si cambia, los datos antiguos se descartan en vez de romper.
const STORAGE_KEY = "planeta-logros";
const VERSION = 1;
const empty = () => ({ version: VERSION, unlocked: {}, counts: {}, sets: {} });

function load() {
 try {
  const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
  if (saved?.version === VERSION) return { ...empty(), ...saved };
 } catch {
  // Datos ilegibles o almacenamiento bloqueado: se empieza de cero.
 }
 return empty();
}
let state = load();

function save() {
 try {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
 } catch {
  // Sin almacenamiento, el progreso dura solo esta visita.
 }
}

export const isUnlocked = (id) => Boolean(state.unlocked[id]);
export const unlockedCount = () => Object.keys(state.unlocked).length;
// Cuánto lleva: veces contadas o elementos distintos reunidos.
export const progressOf = (id) => (isUnlocked(id) ? (BY_ID[id].goal ?? 1) : (state.sets[id]?.length ?? state.counts[id] ?? 0));

// Desbloquea un logro (una sola vez) y avisa a la interfaz.
export function unlock(id) {
 if (!BY_ID[id] || state.unlocked[id]) return;
 state.unlocked[id] = Date.now();
 save();
 emit("achievement", { id });
}

// Suma una vez al logro; al llegar a su meta, se desbloquea.
export function count(id) {
 if (isUnlocked(id)) return;
 state.counts[id] = (state.counts[id] ?? 0) + 1;
 save();
 if (state.counts[id] >= (BY_ID[id].goal ?? 1)) unlock(id);
 else emit("achievement-progress", { id });
}

// Apunta un elemento distinto (una zona, un planeta…); repetirlo no suma.
export function collect(id, item) {
 if (isUnlocked(id)) return;
 const items = (state.sets[id] ??= []);
 if (items.includes(item)) return;
 items.push(item);
 save();
 if (items.length >= (BY_ID[id].goal ?? 1)) unlock(id);
 else emit("achievement-progress", { id });
}

// Rachas (canastas seguidas): se pone a cero al fallar.
export function resetCount(id) {
 if (isUnlocked(id) || !state.counts[id]) return;
 state.counts[id] = 0;
 save();
}

export function resetAll() {
 state = empty();
 save();
 emit("achievement-progress", {});
}
