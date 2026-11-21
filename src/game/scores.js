// Puntuaciones del concurso de triples: validación, guardado y lectura del top 10.
//
// Dos modos:
//  · remoto: Cloud Firestore (colección `triples`), si están las variables
//    VITE_FIREBASE_* (ver .env.example y docs/FIREBASE.md). El SDK de Firebase
//    NO se carga con el portfolio: se pide la primera vez que se abre el tablón
//    o se guarda una puntuación (scoresRemote.js, un trozo aparte).
//  · local: en el navegador del visitante («Solo en este dispositivo»), si no
//    hay configuración o si Firestore falla.
// Lo que aquí se valida es lo mismo que exigen las reglas (firestore.rules):
// si se cambia una cosa, hay que cambiar la otra.

const env = import.meta.env ?? {};
const CONFIG = {
 apiKey: env.VITE_FIREBASE_API_KEY,
 authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
 projectId: env.VITE_FIREBASE_PROJECT_ID,
 storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
 messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
 appId: env.VITE_FIREBASE_APP_ID,
};
// (En desarrollo, `?marcador=local` hace como si no hubiera configuración: las pruebas no tocan la base de datos real.)
const forcedLocal = Boolean(env.DEV) && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("marcador") === "local";
export const isRemote = () => Boolean(CONFIG.apiKey && CONFIG.projectId && CONFIG.appId) && !forcedLocal;

export const MAX_SCORE = 30;
export const TOP = 10;
export const SEND_EVERY = 30; // s entre envíos de un mismo navegador
// El mismo patrón que la regla de Firestore: letras (con tildes y ñ), números y espacios, de 3 a 12.
export const NAME_PATTERN = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ ]{3,12}$/;

// Filtro básico de palabras malsonantes (español e inglés). Se mira el nombre
// sin tildes, sin espacios y con los números que hacen de letra deshechos.
const BLOCKED = ["puta", "puto", "mierda", "joder", "jodete", "cabron", "gilipolla", "polla", "zorra", "maricon", "subnormal", "imbecil", "idiota", "pendejo", "culero", "verga", "nazi", "hitler", "fuck", "shit", "bitch", "cunt", "dick", "nigger", "nigga", "faggot", "whore", "slut", "porn", "vagina", "hostia", "capullo", "follar", "mamon", "pajero", "cojon", "retrasad"];
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b" };
const plain = (text) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[013457 8]/g, (c) => LEET[c] ?? "");
export const isClean = (name) => {
 const flat = plain(name);
 // («coño» pierde la virgulilla al quitar tildes y «cono» es una palabra normal: se mira aparte.)
 if (/co[ñÑ]o/.test(name)) return false;
 return !BLOCKED.some((word) => flat.includes(word));
};

// El nombre, limpio de espacios de más, y si vale. `message`: qué decirle al visitante.
export function checkName(raw) {
 const name = String(raw ?? "").replace(/\s+/g, " ").trim();
 if (name.length < 3) return { ok: false, name, message: "El nombre necesita al menos 3 caracteres." };
 if (name.length > 12) return { ok: false, name, message: "El nombre puede tener 12 caracteres como mucho." };
 if (!NAME_PATTERN.test(name)) return { ok: false, name, message: "Solo letras, números y espacios." };
 if (!isClean(name)) return { ok: false, name, message: "Ese nombre no vale. Prueba con otro." };
 return { ok: true, name, message: "" };
}
export const cleanScore = (score) => Math.min(MAX_SCORE, Math.max(0, Math.round(Number(score) || 0)));

// ── Navegador ───────────────────────────────────────────────────────────────
const KEYS = { local: "triples-local", best: "triples-mejor", sent: "triples-ultimo-envio", name: "triples-nombre" };
const read = (key, fallback) => {
 try {
  return JSON.parse(window.localStorage.getItem(key)) ?? fallback;
 } catch {
  return fallback;
 }
};
const write = (key, value) => {
 try {
  window.localStorage.setItem(key, JSON.stringify(value));
 } catch {
  // Sin almacenamiento, la puntuación vive lo que dure la visita.
 }
};
const memory = { local: null };
// Filas válidas, de mayor a menor, las diez primeras. (Lo leído de fuera no se da por bueno.)
const tidy = (rows) =>
 (Array.isArray(rows) ? rows : [])
  .filter((row) => row && typeof row.name === "string" && NAME_PATTERN.test(row.name) && Number.isInteger(row.score) && row.score >= 0 && row.score <= MAX_SCORE)
  .map((row) => ({ name: isClean(row.name) ? row.name : "***", score: row.score }))
  .sort((a, b) => b.score - a.score)
  .slice(0, TOP);
const localRows = () => (memory.local ??= tidy(read(KEYS.local, [])));
function saveLocal(name, score) {
 memory.local = tidy([...localRows(), { name, score }]);
 write(KEYS.local, memory.local);
}

// El mejor resultado del visitante en este navegador ({ name, score } o null) y el último nombre que usó.
export const myBest = () => {
 const best = read(KEYS.best, null);
 return best && Number.isInteger(best.score) ? best : null;
};
export const lastName = () => {
 const name = read(KEYS.name, "");
 return typeof name === "string" && NAME_PATTERN.test(name) ? name : "";
};
// Apunta el resultado de una partida (se guarde o no con nombre).
export function noteResult(score, name = null) {
 const best = myBest();
 const points = cleanScore(score);
 if (!best || points > best.score || (name && points === best.score)) write(KEYS.best, { score: points, name: name ?? best?.name ?? null });
}

// Lo más que se espera a Firestore antes de darlo por caído (el SDK reintenta solo y, sin red, tarda).
const PATIENCE = { read: 7000, write: 10000 };
const patient = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`sin respuesta en ${ms / 1000} s`)), ms))]);

// ── Remoto ──────────────────────────────────────────────────────────────────
let remote = null; // el módulo, una vez cargado
const loadRemote = () => (remote ??= import("./scoresRemote.js").then((module) => module.connect(CONFIG)));

// Lo último que se sabe del top, para pintar el tablón sin pedir nada: { rows, mode } o null.
export const known = { top: null };
const settle = (rows, mode, extra = {}) => {
 known.top = { rows, mode };
 return { rows, mode, ...extra };
};

// Lo que se sabe del top sin pedir nada fuera: lo último leído o, en modo local, lo del navegador. (En remoto, antes de la primera lectura: null.)
export const peekTop = () => known.top ?? (isRemote() ? null : settle(localRows(), "local"));

// El top 10. `mode`: "remote" o "local" (y `failed` si se quería remoto y no se pudo).
export async function loadTop() {
 if (!isRemote()) return settle(localRows(), "local");
 try {
  const api = await loadRemote();
  return settle(tidy(await patient(api.top(TOP), PATIENCE.read)), "remote");
 } catch (error) {
  remote = null; // (la próxima vez se intenta de nuevo)
  if (env.DEV) console.info("[puntuaciones] sin Firestore, se usa el navegador:", error?.message ?? error);
  return settle(localRows(), "local", { failed: true });
 }
}

// Cuánto falta (s) para poder enviar otra puntuación desde este navegador.
export const waitToSend = () => Math.max(0, Math.ceil(SEND_EVERY - (Date.now() - read(KEYS.sent, 0)) / 1000));

// Guarda una puntuación. Devuelve { ok, mode, rows, message }:
//  · nombre inválido o envío demasiado seguido: `ok: false` y el porqué;
//  · guardada en Firestore: mode "remote" y el top ya releído;
//  · sin configuración, o si Firestore falla: guardada en el navegador, mode "local" (y `failed`).
export async function saveScore(rawName, rawScore) {
 const checked = checkName(rawName);
 if (!checked.ok) return { ok: false, message: checked.message };
 const wait = waitToSend();
 if (wait > 0) return { ok: false, wait, message: `Espera ${wait} s para guardar otra puntuación.` };
 const name = checked.name, score = cleanScore(rawScore);
 write(KEYS.sent, Date.now());
 write(KEYS.name, name);
 noteResult(score, name);
 if (isRemote()) {
  try {
   const api = await loadRemote();
   await patient(api.add(name, score), PATIENCE.write);
   // (Si la relectura falla, la puntuación ya está guardada: se enseña lo que se sabía, con ella.)
   const rows = await patient(api.top(TOP), PATIENCE.read).then(tidy, () => tidy([...(known.top?.rows ?? []), { name, score }]));
   return { ok: true, ...settle(rows, "remote"), name, score };
  } catch (error) {
   remote = null;
   if (env.DEV) console.info("[puntuaciones] no se pudo guardar en Firestore, va al navegador:", error?.message ?? error);
   saveLocal(name, score);
   return { ok: true, ...settle(localRows(), "local", { failed: true }), name, score };
  }
 }
 saveLocal(name, score);
 return { ok: true, ...settle(localRows(), "local"), name, score };
}
