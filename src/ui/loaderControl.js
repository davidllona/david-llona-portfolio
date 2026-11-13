// Controla la pantalla de carga que vive en index.html (se pinta antes de que
// llegue este código). El porcentaje y el mensaje salen de etapas reales: cada
// una se marca cuando de verdad termina, y la barra solo llega al final cuando
// la bienvenida está lista para verse.

// Etapas, en orden, con el porcentaje al que se llega al completar cada una y
// el mensaje que se muestra mientras se trabaja en la siguiente. La pantalla no
// se retira hasta la última: cuando se ve la portada, el planeta ya está entero
// y compilado, y el clic para aterrizar responde al instante.
const STAGES = [
 { id: "code", upTo: 8, next: "Woody está buscando el camino…" }, // el código ha llegado y arranca; se descargan los personajes
 { id: "models", upTo: 18, next: "Encendiendo las estrellas…" }, // personajes cargados; se inicia la GPU
 { id: "gpu", upTo: 26, next: "Colgando los farolillos…" }, // GPU lista; se monta la escena de bienvenida
 { id: "scene", upTo: 34, next: "Colgando los farolillos…" }, // montada; se compilan sus sombreadores
 { id: "shaders", upTo: 42, next: "Despertando el bosque…" }, // la bienvenida está lista; se construye el planeta
 { id: "built", upTo: 62, next: "Preparando el aterrizaje…" }, // planeta construido; se compila por tandas (ver `progress`)
 { id: "world", upTo: 100, next: "" }, // compilado y dibujado: se puede entrar
];
const LAST = STAGES[STAGES.length - 1].id;

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
 if (id === LAST) finished = true;
}

// Avance dentro de la última etapa (la compilación del planeta), de 0 a 1.
export function progress(fraction) {
 const from = STAGES[STAGES.length - 2].upTo;
 if (done.has(STAGES[STAGES.length - 2].id)) target = Math.max(target, from + (99 - from) * Math.min(1, fraction));
}

// Avanza el número hacia el objetivo, deprisa y sin saltos. Al llegar al final
// no se queda parado en el 100 %: en ese mismo fotograma empieza a fundirse con
// la bienvenida, que ya está dibujada detrás (y con el planeta listo).
function tick() {
 const root = element();
 if (!root) return;
 // Con todo listo no se hace esperar: el número llega al final de inmediato.
 shown = finished ? 100 : Math.min(target, shown + Math.max(0.6, (target - shown) * 0.2));
 document.getElementById("loader-number").textContent = String(Math.round(shown));
 document.getElementById("loader-bar").style.transform = `scaleX(${shown / 100})`;
 if (finished) {
  const step = document.getElementById("loader-step");
  if (step) step.textContent = "";
  root.classList.add("is-leaving");
  onGone?.();
  window.setTimeout(() => root.remove(), 800);
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
