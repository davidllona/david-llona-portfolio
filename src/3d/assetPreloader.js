import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadingManager, loadSharedTexture } from "./loadingManager";

const CRITICAL_GLBS = [
 "/modelos/desk.glb",
 "/modelos/monitor.glb",
 "/modelos/astronauta_silla_2.glb",
 "/modelos/astronauta.glb",
 "/modelos/lampara.glb",
 "/modelos/teclado.glb",
 "/modelos/raton.glb",
 "/modelos/dog.glb",
 "/modelos/neon_22.glb",
];

const CRITICAL_TEXTURES = ["/textures/moon.jpg"];

let started = false;

export function preloadCriticalAssets() {
 if (started) return;
 started = true;

 for (const url of CRITICAL_TEXTURES) {
  loadSharedTexture(
   url,
   () => {},
   (err) => console.warn("[preloader] textura falló:", url, err),
  );
 }

 const gltfLoader = new GLTFLoader(loadingManager);
 for (const url of CRITICAL_GLBS) {
  gltfLoader.load(
   url,
   () => {},
   undefined,
   (err) => console.warn("[preloader] GLB falló:", url, err),
  );
 }
}
