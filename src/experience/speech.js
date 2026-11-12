import { events, player, ui3d, woody } from "./state";

// Lo que dice Woody: una cola de frases que se muestran de una en una en su
// bocadillo (experience/ui3d/WorldUi.jsx). Cada frase dura lo que se tarda en
// leerla y se puede saltar con E o con un clic.

const SAID_KEY = "woody-dicho"; // frases de «una sola vez» que ya ha dicho
const TIPS_KEY = "woody-consejos"; // "off" si se han silenciado los consejos

// La preferencia se lee al arrancar: la bienvenida no debe sonar si se silenció.
try {
 woody.tips = window.localStorage.getItem(TIPS_KEY) !== "off";
} catch {
 // Sin almacenamiento, los consejos se quedan activados.
}

export function setTips(on) {
 woody.tips = on;
 if (!on) hush();
 try {
  window.localStorage.setItem(TIPS_KEY, on ? "on" : "off");
 } catch {
  // Sin almacenamiento, la preferencia dura solo esta visita.
 }
}
const queue = [];
let said = null;

function memory() {
 if (!said) {
  try {
   said = new Set(JSON.parse(window.localStorage.getItem(SAID_KEY) ?? "[]"));
  } catch {
   said = new Set(); // sin almacenamiento, se recuerda solo durante la visita
  }
 }
 return said;
}

const lifeOf = (text) => Math.min(9, 2.2 + text.length * 0.055);

function next() {
 const text = queue.shift();
 ui3d.speech = text ? { text, age: 0, life: lifeOf(text) } : null;
 events.dispatchEvent(new CustomEvent("speech"));
}

// Woody dice estas frases. `once`: identificador para decirlas una sola vez
// (se recuerda entre visitas); `tip`: es un consejo, y calla si están silenciados;
// `now`: corta lo que estuviera diciendo.
export function say(lines, { once, tip = false, now = false } = {}) {
 if (tip && !woody.tips) return false;
 if (once) {
  if (memory().has(once)) return false;
  memory().add(once);
  try {
   window.localStorage.setItem(SAID_KEY, JSON.stringify([...memory()]));
  } catch {
   // Sin almacenamiento no se guarda.
  }
 }
 if (now) queue.length = 0;
 queue.push(...[lines].flat());
 if (now || !ui3d.speech) next();
 return true;
}

export const hasSaid = (id) => memory().has(id);
export const isSpeaking = () => Boolean(ui3d.speech);

// Pasa a la frase siguiente (o calla si no hay más).
export function skipSpeech() {
 if (ui3d.speech) next();
}

// Calla del todo (al silenciar los consejos).
export function hush() {
 queue.length = 0;
 if (ui3d.speech) next();
}

// Se llama en cada fotograma: la frase caduca sola.
export function updateSpeech(dt) {
 const speech = ui3d.speech;
 if (!speech || player.hidden) return; // dentro de la nave no se le ve: espera
 speech.age += dt;
 if (speech.age > speech.life) next();
}
