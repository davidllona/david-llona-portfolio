// Controla la pantalla de carga que vive en index.html (se pinta antes de que
// llegue este código). El porcentaje y el mensaje salen de etapas reales: cada
// una se marca cuando de verdad termina, y la barra solo llega al final cuando
// la bienvenida está lista para verse.

// Etapas, en orden, con el porcentaje al que se llega al completar cada una y
// el mensaje que se muestra mientras se trabaja en la siguiente.
const STAGES = [
 { id: "code", upTo: 14, next: "Woody está buscando el camino…" }, // el código ha llegado y arranca; se descargan los personajes
 { id: "models", upTo: 36, next: "Encendiendo las estrellas…" }, // personajes cargados; se inicia la GPU
 { id: "gpu", upTo: 56, next: "Despertando el bosque…" }, // GPU lista; se monta la escena de bienvenida
 { id: "scene", upTo: 80, next: "Preparando el aterrizaje…" }, // montada; se compilan sus sombreadores
 { id: "shaders", upTo: 100, next: "" }, // compilados y dibujados: lista
];

const done = new Set();
let target = 4;
let shown = 0;
let finished = false;
let onGone = null;
const element = () => document.getElementById("loader");

// Tiempos reales de cada etapa, para medir (tests/perf/load.mjs los recoge).
export function stage(id) {
 if (done.has(id)) return;
 done.add(id);
 performance.mark(`carga:${id}`);
 if (!STAGES.some((one) => one.id === id)) return;
 // Manda la etapa más avanzada que se haya completado (pueden llegar desordenadas).
 const furthest = STAGES.filter((one) => done.has(one.id)).pop();
 target = Math.max(target, furthest.upTo);
 const step = document.getElementById("loader-step");
 if (step && furthest.next) step.textContent = furthest.next;
 if (id === "shaders") finished = true;
}

// Avanza el número hacia el objetivo, deprisa y sin saltos, y al llegar al
// final se retira: el astronauta se incorpora y la escena se funde con la bienvenida.
function tick() {
 const root = element();
 if (!root) return;
 // Con todo listo no se hace esperar: el número llega al final de inmediato.
 shown = finished ? 100 : Math.min(target, shown + Math.max(0.6, (target - shown) * 0.2));
 document.getElementById("loader-number").textContent = String(Math.round(shown));
 document.getElementById("loader-bar").style.transform = `scaleX(${shown / 100})`;
 if (finished && shown >= 100) {
  root.classList.add("is-done");
  window.setTimeout(() => {
   root.classList.add("is-leaving");
   onGone?.();
   window.setTimeout(() => root.remove(), 800);
  }, 520);
  return;
 }
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Avisa cuando la pantalla empieza a retirarse.
export const whenLoaderLeaves = (callback) => (onGone = callback);

// Retira la pantalla sin esperar a la escena 3D (versión sin WebGL, o si falla).
export function dismissLoader() {
 finished = true;
}
