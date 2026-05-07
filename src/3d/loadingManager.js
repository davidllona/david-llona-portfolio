import * as THREE from "three";

/**
 * loadingManager.js — singleton compartido
 *
 * Un único THREE.LoadingManager para todos los loaders del portfolio
 * (GLTFLoader, TextureLoader, etc.). Permite que la pantalla de carga
 * sepa con exactitud cuándo TODO está listo, no solo parte del hero.
 *
 * Uso en cualquier archivo 3D:
 *   import { loadingManager } from "./loadingManager";
 *   const loader = new GLTFLoader(loadingManager);
 *
 * Uso en React:
 *   import { subscribeProgress } from "./loadingManager";
 *   useEffect(() => subscribeProgress((pct, done) => { ... }), []);
 */

export const loadingManager = new THREE.LoadingManager();

const listeners = new Set();
let lastPct = 0;
let isDone = false;

loadingManager.onProgress = (_url, loaded, total) => {
 // Suavizado: la barra solo avanza, nunca retrocede.
 const raw = total > 0 ? loaded / total : 0;
 lastPct = Math.max(lastPct, raw);
 listeners.forEach((cb) => cb(lastPct, false));
};

loadingManager.onLoad = () => {
 lastPct = 1;
 isDone = true;
 listeners.forEach((cb) => cb(1, true));
};

loadingManager.onError = (url) => {
 // No bloqueamos la carga por un asset suelto; solo lo logueamos.
 console.warn("[LoadingManager] Asset failed:", url);
};

/**
 * Suscribe un callback al progreso.
 * @param {(pct: number, done: boolean) => void} cb
 * @returns {() => void} unsubscribe
 */
export function subscribeProgress(cb) {
 listeners.add(cb);
 // Estado inicial inmediato (evita parpadeos de 0% si llegas tarde).
 cb(lastPct, isDone);
 return () => listeners.delete(cb);
}
