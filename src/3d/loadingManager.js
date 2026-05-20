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

// ════════════════════════════════════════════════════════════════════════
// TEXTURE CACHE — comparte una sola textura entre múltiples consumidores
// ════════════════════════════════════════════════════════════════════════
// Three.js NO comparte texturas entre TextureLoaders por defecto. Si dos
// módulos hacen `new TextureLoader().load("moon.jpg")`, se descarga dos
// veces, se decodifica dos veces, y ocupa el doble de VRAM al subirla
// a GPU como dos texturas distintas.
//
// Este cache devuelve la MISMA instancia de Texture a todos los que la
// pidan, evitando descargas duplicadas y duplicación en GPU. Crítico
// para `moon.jpg` que se usa en heroScene (luna interior) y exterior
// (luna del cielo).
//
// Uso:
//   import { loadSharedTexture } from "./loadingManager";
//   loadSharedTexture("/textures/moon.jpg", (tex) => { ... });

const _textureCache = new Map();
const _texturePending = new Map(); // url → array de callbacks pendientes
const _sharedTextureLoader = new THREE.TextureLoader(loadingManager);

export function loadSharedTexture(url, onLoad, onError) {
 // 1) Cache hit: textura ya cargada, devolver inmediatamente.
 if (_textureCache.has(url)) {
  // Asíncrono para no romper expectativas del consumidor
  // (que la callback no se llame antes de retornar).
  queueMicrotask(() => onLoad(_textureCache.get(url)));
  return;
 }

 // 2) Carga en curso: añadir a la cola de pendientes.
 if (_texturePending.has(url)) {
  _texturePending.get(url).push(onLoad);
  return;
 }

 // 3) Primera petición: iniciar carga y registrar pendientes.
 _texturePending.set(url, [onLoad]);
 _sharedTextureLoader.load(
  url,
  (tex) => {
   _textureCache.set(url, tex);
   const callbacks = _texturePending.get(url) || [];
   _texturePending.delete(url);
   callbacks.forEach((cb) => cb(tex));
  },
  undefined,
  (err) => {
   _texturePending.delete(url);
   if (onError) onError(err);
   else console.warn("[loadSharedTexture] failed:", url, err);
  },
 );
}
