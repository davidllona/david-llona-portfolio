import * as THREE from "three";

export const loadingManager = new THREE.LoadingManager();

const listeners = new Set();
let lastPct = 0;
let isDone = false;

loadingManager.onProgress = (_url, loaded, total) => {
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
 console.warn("[LoadingManager] Asset failed:", url);
};

export function subscribeProgress(cb) {
 listeners.add(cb);

 cb(lastPct, isDone);
 return () => listeners.delete(cb);
}

const _textureCache = new Map();
const _texturePending = new Map(); // url → array de callbacks pendientes
const _sharedTextureLoader = new THREE.TextureLoader(loadingManager);

export function loadSharedTexture(url, onLoad, onError) {
 if (_textureCache.has(url)) {
  queueMicrotask(() => onLoad(_textureCache.get(url)));
  return;
 }

 if (_texturePending.has(url)) {
  _texturePending.get(url).push(onLoad);
  return;
 }

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
