import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadingManager, loadSharedTexture } from "./loadingManager";

/**
 * assetPreloader.js — disparo temprano de descargas pesadas
 *
 * Problema que resuelve
 * ─────────────────────────────────────────────────────────────────────
 * El LoadingDoor está suscrito al `loadingManager` y muestra su progreso
 * via la barra "PREPARANDO LA ESCENA". Pero el `loadingManager` solo
 * recibe eventos `onProgress` cuando hay loaders REGISTRADOS descargando
 * algo. Y los loaders nacen dentro del useEffect de cada componente
 * (Hero, Projects, etc.), que ahora NO se montan hasta que termina el
 * LoadingDoor (gate añadido en App.jsx para evitar context loss en
 * móviles ARM Mali).
 *
 * Consecuencia: con el gate, mientras el LoadingDoor está visible no
 * existe ningún loader → la barra se queda en 0% → al expirar el
 * MIN_DISPLAY_MS / MAX_WAIT_MS salta del 0 al 100 directamente. La
 * carga es "fantasma".
 *
 * Solución: este preloader dispara las descargas pesadas del Hero al
 * montar `<App />`, ANTES de que el LoadingDoor decida que ha terminado.
 * Pasa el loadingManager a los loaders → la barra muestra progreso real.
 * Cuando los componentes hijos se montan más tarde, vuelven a pedir los
 * mismos archivos, pero ya están en el HTTP cache del navegador → la
 * "carga" es instantánea, sin doble descarga.
 *
 * Cero overhead de WebGL: GLTFLoader + TextureLoader solo descargan y
 * decodifican; NO crean contextos WebGL. Lo único que se sube a GPU
 * cuando los componentes los usan, pero eso es trabajo que ya ocurriría
 * de todas formas.
 *
 * Qué se precarga aquí (y qué no)
 * ─────────────────────────────────────────────────────────────────────
 * SÍ — todo lo del Hero (lo primero que se ve y lo más pesado):
 *   · desk.glb, monitor.glb, astronauta_silla_2.glb, astronauta.glb,
 *     lampara.glb, teclado.glb, raton.glb, dog.glb, neon_22.glb
 *   · textures/moon.jpg
 *
 * NO se precarga aquí — assets de secciones que vienen después:
 *   · UFO.glb (aparece al avanzar el scroll en F4+)
 *   · contacto.glb (sección Contact, lejos)
 *   · robot_*.glb (popups de Projects, solo al click)
 *
 * Si más adelante quisieras que esas también muestren progreso real,
 * añádelas a CRITICAL_GLBS. Pero ojo: cuanto más precargues, más larga
 * la pantalla de carga. El balance actual prioriza tiempo-a-Hero.
 */

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

/**
 * Dispara las descargas. Idempotente: llamarla varias veces solo
 * registra los loaders una vez. Pensada para invocarse desde un
 * useEffect de App.jsx al montar.
 *
 * No devuelve promise: el LoadingDoor ya está suscrito al
 * loadingManager y se entera por ese canal. Mantener esto fire-and-
 * forget evita acoplar App.jsx a la mecánica interna del manager.
 */
export function preloadCriticalAssets() {
 if (started) return;
 started = true;

 // Texturas — vía el cache compartido del loadingManager.
 // loadSharedTexture deduplica peticiones al mismo URL si dos módulos
 // la piden a la vez. Crítico para moon.jpg que también usa el exterior.
 for (const url of CRITICAL_TEXTURES) {
  loadSharedTexture(
   url,
   () => {},
   (err) => console.warn("[preloader] textura falló:", url, err),
  );
 }

 // GLBs — un único GLTFLoader registrado al loadingManager.
 // No necesitamos guardar las referencias del modelo; basta con que el
 // archivo llegue al disco y al HTTP cache del navegador. Cuando el Hero
 // se monte, su propio GLTFLoader hará la petición y el navegador
 // responderá desde caché instantáneamente.
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
