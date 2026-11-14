import { player, rig } from "../experience/state";
import sampleData from "./sampleData.json";

// Motor de sonido. Dos fuentes:
//  · Sonidos sintetizados con Web Audio (osciladores y ruido filtrado), que
//    están siempre disponibles.
//  · Muestras grabadas (public/sounds, de Envato; ver docs/CREDITOS.md), que se
//    descargan después de entrar al planeta y sustituyen a su versión
//    sintetizada en cuanto están decodificadas.
// El contexto se crea con el primer gesto del visitante, como exigen los navegadores.

const STORAGE_KEY = "planeta-audio";
function stored() {
 try {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) ?? {};
 } catch {
  return {};
 }
}
export const settings = { muted: false, volume: 0.8, ...stored() };
function save() {
 try {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
 } catch {
  // Sin almacenamiento, el ajuste dura solo esta visita.
 }
}

let context = null;
let master = null;
let noise = null; // 2 s de ruido blanco, compartido
const lastPlayed = new Map(); // id → instante, para no repetir el mismo golpe en ráfaga
// Cuántas veces se ha pedido cada sonido y en qué estado está el contexto (lo leen las pruebas).
export const stats = { played: {}, sampled: {}, steps: {}, state: () => context?.state ?? "sin crear", loopsReady: () => Boolean(loops.pajaros && loops.grillos) };

export const isReady = () => Boolean(context);
export const now = () => context?.currentTime ?? 0;

// Crea el contexto. Hay que llamarlo dentro de un gesto (clic, toque o tecla).
export function unlock() {
 if (context) {
  if (context.state === "suspended") context.resume();
  return;
 }
 const AudioContext = window.AudioContext ?? window.webkitAudioContext;
 if (!AudioContext) return;
 context = new AudioContext();
 master = context.createGain();
 master.gain.value = settings.muted ? 0 : settings.volume;
 // Un compresor suave evita que varios golpes a la vez saturen.
 const limiter = context.createDynamicsCompressor();
 limiter.threshold.value = -14;
 limiter.ratio.value = 6;
 master.connect(limiter).connect(context.destination);
 if (import.meta.env.DEV) instrument(limiter);

 noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
 const data = noise.getChannelData(0);
 for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

export function setMuted(muted) {
 settings.muted = muted;
 save();
 if (master) master.gain.setTargetAtTime(muted ? 0 : settings.volume, context.currentTime, 0.05);
}

// En pausa (o con la pestaña oculta) no suena nada.
export function setRunning(running) {
 if (!context) return;
 if (running) context.resume();
 else context.suspend();
}

// ── Piezas básicas ──────────────────────────────────────────────────────────
// Envolvente: sube en `attack` s hasta `peak` y cae en `decay` s.
function envelope(time, peak, attack, decay) {
 const gain = context.createGain();
 gain.gain.setValueAtTime(0.0001, time);
 gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + attack);
 gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
 return gain;
}

// Una nota: oscilador con envolvente y, si se quiere, un barrido de tono.
function tone(out, time, { from, to = from, type = "sine", peak = 0.2, attack = 0.005, decay = 0.2 }) {
 const oscillator = context.createOscillator();
 oscillator.type = type;
 oscillator.frequency.setValueAtTime(from, time);
 if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, time + attack + decay);
 oscillator.connect(envelope(time, peak, attack, decay)).connect(out);
 oscillator.start(time);
 oscillator.stop(time + attack + decay + 0.05);
}

// Un soplo de ruido filtrado (pasos, salpicaduras, roces…).
function hiss(out, time, { filter = "lowpass", from = 800, to = from, q = 0.8, peak = 0.2, attack = 0.004, decay = 0.12 }) {
 const source = context.createBufferSource();
 source.buffer = noise;
 source.loop = true;
 const biquad = context.createBiquadFilter();
 biquad.type = filter;
 biquad.Q.value = q;
 biquad.frequency.setValueAtTime(from, time);
 if (to !== from) biquad.frequency.exponentialRampToValueAtTime(to, time + attack + decay);
 source.connect(biquad).connect(envelope(time, peak, attack, decay)).connect(out);
 source.start(time, Math.random());
 source.stop(time + attack + decay + 0.05);
}

// ── Muestras grabadas ───────────────────────────────────────────────────────
const buffers = new Map(); // nombre → AudioBuffer
let loading = null;
// Orden de descarga: primero lo que se oye nada más aterrizar.
const ORDER = ["pasos-hierba", "pajaros", "pop", "grillos", "cascada", "arroyo", "mar", "chapuzon", "cohete-rugido", "cohete-silbido", "poste", "red-1", "red-2", "red-3"];

// Descarga y decodifica las muestras, una tras otra. Se llama después de
// entrar (nunca durante la carga): no retrasa el momento de poder jugar.
export function loadSamples() {
 if (!context || loading) return loading;
 loading = (async () => {
  for (const name of ORDER) {
   try {
    const response = await fetch(import.meta.env.BASE_URL + sampleData[name].file);
    if (!response.ok) throw new Error(String(response.status));
    buffers.set(name, await context.decodeAudioData(await response.arrayBuffer()));
    if (LOOPS[name]) startLoop(name);
   } catch (error) {
    // Sin esa muestra se sigue con el sonido sintetizado.
    console.warn(`Sonido «${name}» no disponible:`, error);
   }
  }
 })();
 return loading;
}

// Dispara una muestra (o un trozo de ella) una vez. Devuelve si pudo.
function sample(out, time, name, { gain = 1, rate = 1, offset = 0, duration, attack = 0, release = 0 } = {}) {
 const buffer = buffers.get(name);
 if (!buffer) return false;
 stats.sampled[name] = (stats.sampled[name] ?? 0) + 1;
 const source = context.createBufferSource();
 source.buffer = buffer;
 source.playbackRate.value = rate;
 const level = context.createGain();
 const length = (duration ?? buffer.duration - offset) / rate;
 if (attack) {
  level.gain.setValueAtTime(0.0001, time);
  level.gain.exponentialRampToValueAtTime(gain, time + attack);
 } else level.gain.setValueAtTime(gain, time);
 if (release) {
  level.gain.setValueAtTime(gain, time + Math.max(attack, length - release));
  level.gain.exponentialRampToValueAtTime(0.0001, time + length);
 }
 source.connect(level).connect(out);
 source.start(time, offset, duration);
 return true;
}

let lastStep = -1;
// Un paso sobre hierba: una de las 16 muestras, nunca la misma dos veces seguidas.
function grassStep(out, time, strength) {
 const { slots, slot, length } = sampleData["pasos-hierba"];
 let index = Math.floor(Math.random() * (slots - 1));
 if (index >= lastStep) index += 1;
 lastStep = index;
 stats.steps[index] = (stats.steps[index] ?? 0) + 1;
 return sample(out, time, "pasos-hierba", { offset: index * slot, duration: length + 0.08, gain: 0.3 + 0.5 * strength, rate: vary(strength > 0.8 ? 1.08 : 1, 0.05) });
}
const net = (out, time, strength) => sample(out, time, `red-${1 + Math.floor(Math.random() * 3)}`, { gain: 0.5 + 0.5 * strength, rate: vary(1, 0.04) });

// Sonidos que tienen muestra grabada. Si aún no ha llegado, devuelven false y
// suena el sintetizado del catálogo.
const SAMPLED = {
 "step-grass": grassStep,
 // Chapuzón: al entrar andando en el agua y al caer en ella de un salto.
 splash: (out, t, s) => sample(out, t, "chapuzon", { gain: 0.35 + 0.55 * s, rate: vary(1, 0.06) }),
 // Fútbol: poste (seco) y larguero (lo mismo, más grave); red.
 "ball-woodwork": (out, t, s) => sample(out, t, "poste", { gain: 0.45 + 0.55 * s, rate: vary(1.04, 0.03) }),
 "ball-crossbar": (out, t, s) => sample(out, t, "poste", { gain: 0.45 + 0.55 * s, rate: vary(0.86, 0.03) }),
 "ball-goalnet": net,
 // Interfaz: el mismo «pop», más agudo al abrir y más grave al cerrar.
 "ui-open": (out, t) => sample(out, t, "pop", { gain: 0.5, rate: 1 }),
 "ui-close": (out, t) => sample(out, t, "pop", { gain: 0.4, rate: 0.8 }),
 "ui-toggle": (out, t) => sample(out, t, "pop", { gain: 0.45, rate: 1.2 }),
 "ui-pop": (out, t) => sample(out, t, "pop", { gain: 0.4, rate: vary(1.05, 0.04) }),
 // Despegue: el rugido desde el encendido y el silbido cuando se levanta (1,6 s después).
 "rocket-launch": (out, t) => {
  const rumble = sample(out, t, "cohete-rugido", { gain: 0.85, attack: 0.5 });
  const whoosh = sample(out, t + 1.6, "cohete-silbido", { gain: 0.75 });
  return rumble && whoosh;
 },
 // Aterrizaje: el final del rugido, que se apaga al posarse.
 "rocket-land": (out, t) => sample(out, t, "cohete-rugido", { gain: 0.6, offset: 6.5, duration: 5, attack: 0.6, release: 2.5 }),
};

// ── Catálogo ────────────────────────────────────────────────────────────────
// Cada sonido recibe (salida, instante, fuerza 0–1).
const vary = (value, amount = 0.08) => value * (1 + (Math.random() * 2 - 1) * amount);
const STEP = {
 grass: (out, t) => hiss(out, t, { filter: "bandpass", from: vary(1500, 0.2), q: 0.7, peak: 0.1, decay: 0.09 }),
 path: (out, t) => {
  hiss(out, t, { filter: "lowpass", from: vary(900, 0.2), peak: 0.13, decay: 0.07 });
  tone(out, t, { from: vary(130), to: 70, peak: 0.07, decay: 0.06 });
 },
 sand: (out, t) => hiss(out, t, { filter: "highpass", from: vary(2400, 0.2), peak: 0.07, attack: 0.012, decay: 0.12 }),
 stone: (out, t) => {
  hiss(out, t, { filter: "bandpass", from: vary(2600, 0.15), q: 1.4, peak: 0.1, decay: 0.045 });
  tone(out, t, { from: vary(210), to: 120, type: "triangle", peak: 0.08, decay: 0.05 });
 },
 wood: (out, t) => {
  tone(out, t, { from: vary(190, 0.12), to: 95, type: "triangle", peak: 0.2, decay: 0.1 });
  hiss(out, t, { filter: "bandpass", from: 700, q: 2, peak: 0.07, decay: 0.05 });
 },
 water: (out, t) => {
  hiss(out, t, { filter: "bandpass", from: vary(900, 0.3), to: 2400, q: 1.2, peak: 0.16, attack: 0.02, decay: 0.2 });
  tone(out, t + 0.03, { from: vary(420, 0.3), to: 880, peak: 0.05, decay: 0.09 });
 },
};

const SOUNDS = {
 // Pasos según el suelo: step-grass, step-path, step-sand, step-stone, step-wood, step-water.
 ...Object.fromEntries(Object.entries(STEP).map(([surface, make]) => [`step-${surface}`, make])),
 jump: (out, t) => hiss(out, t, { filter: "bandpass", from: 500, to: 1800, peak: 0.1, attack: 0.02, decay: 0.12 }),
 land: (out, t, s) => {
  tone(out, t, { from: 150, to: 55, peak: 0.25 * s, decay: 0.12 });
  hiss(out, t, { from: 700, peak: 0.14 * s, decay: 0.1 });
 },
 // Interfaz.
 "ui-open": (out, t) => tone(out, t, { from: 520, to: 780, type: "triangle", peak: 0.09, decay: 0.09 }),
 "ui-close": (out, t) => tone(out, t, { from: 640, to: 420, type: "triangle", peak: 0.07, decay: 0.08 }),
 "ui-toggle": (out, t) => tone(out, t, { from: 880, type: "triangle", peak: 0.07, decay: 0.05 }),
 // Baloncesto.
 "ball-floor": (out, t, s) => {
  tone(out, t, { from: vary(150), to: 62, peak: 0.5 * s, decay: 0.13 });
  hiss(out, t, { filter: "bandpass", from: 1900, q: 1, peak: 0.12 * s, decay: 0.03 });
 },
 "ball-rim": (out, t, s) => {
  // Metal: parciales inarmónicos que se apagan a ritmos distintos.
  for (const [ratio, decay] of [[1, 0.3], [2.76, 0.18], [5.4, 0.09]]) tone(out, t, { from: 415 * ratio, type: "sine", peak: (0.2 * s) / ratio, decay });
  hiss(out, t, { filter: "highpass", from: 3500, peak: 0.08 * s, decay: 0.03 });
 },
 "ball-board": (out, t, s) => {
  tone(out, t, { from: 240, to: 140, type: "square", peak: 0.12 * s, decay: 0.07 });
  hiss(out, t, { filter: "lowpass", from: 1400, peak: 0.2 * s, decay: 0.06 });
 },
 // Valla metálica: un golpe sordo y la malla que tintinea.
 "ball-fence": (out, t, s) => {
  for (const [ratio, decay] of [[1, 0.22], [1.93, 0.16], [3.1, 0.1], [4.7, 0.07]]) tone(out, t + ratio * 0.004, { from: vary(520) * ratio, type: "triangle", peak: (0.11 * s) / ratio, decay });
  hiss(out, t, { filter: "bandpass", from: 4200, to: 2600, q: 2.2, peak: 0.16 * s, attack: 0.005, decay: 0.22 });
 },
 // Tapón: la mano contra el cuero.
 "ball-block": (out, t, s) => {
  tone(out, t, { from: 210, to: 90, peak: 0.4 * s, decay: 0.09 });
  hiss(out, t, { filter: "bandpass", from: 1500, q: 0.8, peak: 0.3 * s, decay: 0.05 });
 },
 "ball-post": (out, t, s) => tone(out, t, { from: 290, to: 250, type: "triangle", peak: 0.2 * s, decay: 0.16 }),
 "ball-net": (out, t) => {
  hiss(out, t, { filter: "bandpass", from: 5200, to: 1700, q: 0.9, peak: 0.28, attack: 0.02, decay: 0.3 });
  hiss(out, t + 0.07, { filter: "highpass", from: 3000, peak: 0.1, attack: 0.03, decay: 0.2 });
 },
 "ball-grab": (out, t) => hiss(out, t, { filter: "bandpass", from: 1100, q: 1.5, peak: 0.16, decay: 0.05 }),
 "ball-throw": (out, t) => hiss(out, t, { filter: "bandpass", from: 600, to: 2200, q: 1, peak: 0.12, attack: 0.03, decay: 0.14 }),
 score: (out, t) => [523.25, 659.25, 783.99].forEach((f, i) => tone(out, t + 0.12 + i * 0.09, { from: f, type: "triangle", peak: 0.13, decay: 0.25 })),
 // Woody.
 bark: (out, t) => {
  for (const offset of [0, 0.17]) {
   tone(out, t + offset, { from: vary(520, 0.05), to: 260, type: "sawtooth", peak: 0.11, attack: 0.012, decay: 0.09 });
   hiss(out, t + offset, { filter: "bandpass", from: 1300, q: 2.5, peak: 0.12, attack: 0.01, decay: 0.08 });
  }
 },
 pet: (out, t) => [0, 0.11, 0.22, 0.33].forEach((offset) => hiss(out, t + offset, { filter: "bandpass", from: 2300, q: 3, peak: 0.05, attack: 0.03, decay: 0.05 })),
 // Mundo.
 chime: (out, t) => [1318.5, 1568, 1760, 2093, 1568, 2349.3].forEach((f, i) => tone(out, t + i * 0.13 + Math.random() * 0.05, { from: f, peak: 0.1, attack: 0.003, decay: 1.4 })),
 gust: (out, t, s) => hiss(out, t, { filter: "bandpass", from: 300, to: 1500, q: 0.6, peak: 0.3 * s, attack: 1.4, decay: 3.2 }),
 flutter: (out, t) => {
  for (let i = 0; i < 7; i++) hiss(out, t + i * 0.055, { filter: "bandpass", from: 1800, q: 1.2, peak: 0.07, attack: 0.01, decay: 0.03 });
  tone(out, t + 0.05, { from: 3200, to: 4300, peak: 0.04, decay: 0.07 });
 },
 chirp: (out, t) => {
  const base = vary(3100, 0.25);
  for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) tone(out, t + i * 0.11, { from: base, to: base * vary(1.35, 0.2), peak: 0.035, attack: 0.01, decay: 0.06 });
 },
 cricket: (out, t) => {
  for (let i = 0; i < 4; i++) tone(out, t + i * 0.055, { from: 4300, type: "square", peak: 0.012, attack: 0.004, decay: 0.03 });
 },
 splash: (out, t) => STEP.water(out, t),
 explosion: (out, t) => {
  hiss(out, t, { from: 2600, to: 90, peak: 0.7, attack: 0.005, decay: 0.9 });
  tone(out, t, { from: 120, to: 34, peak: 0.6, decay: 0.6 });
 },
 crate: (out, t, s) => tone(out, t, { from: vary(170, 0.15), to: 80, type: "square", peak: 0.09 * s, decay: 0.08 }),
 // Cohete.
 "rocket-launch": (out, t) => {
  hiss(out, t, { from: 120, to: 2200, peak: 0.6, attack: 1.6, decay: 4.2 });
  tone(out, t, { from: 42, to: 95, type: "sawtooth", peak: 0.2, attack: 1.2, decay: 4 });
 },
 "rocket-land": (out, t) => {
  hiss(out, t, { from: 1800, to: 140, peak: 0.45, attack: 0.8, decay: 3.4 });
  tone(out, t, { from: 90, to: 40, type: "sawtooth", peak: 0.15, attack: 0.6, decay: 3 });
 },
 // Fútbol: cada contacto, su sonido.
 "ball-kick": (out, t, s) => {
  tone(out, t, { from: vary(170, 0.1), to: 58, peak: 0.55 * s, decay: 0.11 });
  hiss(out, t, { filter: "bandpass", from: 900, q: 0.8, peak: 0.2 * s, decay: 0.045 });
 },
 "ball-grass": (out, t, s) => {
  hiss(out, t, { filter: "lowpass", from: vary(900, 0.2), peak: 0.22 * s, attack: 0.006, decay: 0.09 });
  tone(out, t, { from: 110, to: 60, peak: 0.16 * s, decay: 0.07 });
 },
 // Poste: metal hueco y seco. Larguero: más grave y con más cola.
 "ball-woodwork": (out, t, s) => {
  for (const [ratio, decay] of [[1, 0.22], [2.4, 0.12], [4.1, 0.06]]) tone(out, t, { from: 690 * ratio, peak: (0.26 * s) / ratio, decay });
  hiss(out, t, { filter: "highpass", from: 4200, peak: 0.1 * s, decay: 0.02 });
 },
 "ball-crossbar": (out, t, s) => {
  for (const [ratio, decay] of [[1, 0.55], [1.5, 0.4], [2.9, 0.2], [5.2, 0.08]]) tone(out, t, { from: 430 * ratio, peak: (0.26 * s) / ratio, decay });
  tone(out, t, { from: 120, to: 70, peak: 0.2 * s, decay: 0.1 });
 },
 "ball-goalnet": (out, t, s) => {
  hiss(out, t, { filter: "bandpass", from: 3600, to: 900, q: 0.7, peak: 0.3 * s, attack: 0.03, decay: 0.45 });
  hiss(out, t + 0.12, { filter: "highpass", from: 2600, peak: 0.09 * s, attack: 0.05, decay: 0.3 });
 },
 "ball-wall": (out, t, s) => {
  tone(out, t, { from: vary(130, 0.15), to: 70, type: "triangle", peak: 0.4 * s, decay: 0.09 });
  hiss(out, t, { filter: "lowpass", from: 500, peak: 0.25 * s, decay: 0.07 });
 },
 "ball-save": (out, t, s) => {
  hiss(out, t, { filter: "bandpass", from: 2200, q: 1.2, peak: 0.3 * s, decay: 0.05 });
  tone(out, t, { from: 210, to: 120, type: "triangle", peak: 0.25 * s, decay: 0.08 });
 },
 "football-goal": (out, t) => {
  [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(out, t + 0.1 + i * 0.1, { from: f, type: "triangle", peak: 0.15, decay: i === 4 ? 0.9 : 0.24 }));
  hiss(out, t + 0.05, { filter: "bandpass", from: 700, to: 1500, q: 0.5, peak: 0.16, attack: 0.5, decay: 1.6 });
 },
 "football-target": (out, t) => [880, 1318.5].forEach((f, i) => tone(out, t + i * 0.07, { from: f, type: "square", peak: 0.08, decay: 0.16 })),
 "football-trophy": (out, t) => [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => tone(out, t + i * 0.11, { from: f, type: "triangle", peak: 0.13, decay: i === 5 ? 1.2 : 0.3 })),
 // Logro: arpegio corto y brillante.
 achievement: (out, t) => [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => tone(out, t + i * 0.085, { from: f, type: "triangle", peak: 0.14, decay: i === 3 ? 0.7 : 0.22 })),
};

// Mínimo entre dos repeticiones del mismo sonido, en segundos.
// Los cuatro sonidos de interfaz comparten turno: un botón que abre una ficha no suena dos veces.
const GROUP = { "ui-open": "ui", "ui-close": "ui", "ui-toggle": "ui", "ui-pop": "ui" };
const COOLDOWN = { default: 0.05, ui: 0.09, splash: 0.4, "ball-grass": 0.12, "ball-woodwork": 0.15, "ball-crossbar": 0.15, "ball-wall": 0.15, "ball-save": 0.15, "ball-goalnet": 0.8, "football-goal": 1.5, "ball-floor": 0.07, "ball-rim": 0.06, "ball-fence": 0.1, "ball-block": 0.2, crate: 0.12, chirp: 0.5, flutter: 1.5, gust: 3 };

// Reproduce un sonido. Con `x, z` suena desde ese punto del mundo: más flojo
// cuanto más lejos del astronauta y desplazado a izquierda o derecha.
export function play(id, { x, z, strength = 1 } = {}) {
 stats.played[id] = (stats.played[id] ?? 0) + 1;
 const make = SOUNDS[id];
 const recorded = SAMPLED[id];
 if (!context || !(make || recorded) || context.state !== "running" || settings.muted) return;
 const time = context.currentTime;
 const turn = GROUP[id] ?? id;
 if (time - (lastPlayed.get(turn) ?? -10) < (COOLDOWN[turn] ?? COOLDOWN.default)) return;
 lastPlayed.set(turn, time);

 let out = master;
 if (x !== undefined) {
  const dx = x - player.position.x;
  const dz = z - player.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance > 45) return;
  const gain = context.createGain();
  gain.gain.value = 1 / (1 + (distance / 9) ** 2);
  const pan = context.createStereoPanner?.();
  if (pan) {
   pan.pan.value = panTowards(dx, dz);
   gain.connect(pan).connect(master);
  } else gain.connect(master);
  out = gain;
 }
 const force = Math.max(0.05, Math.min(1, strength));
 if (!recorded?.(out, time, force)) make?.(out, time, force);
}

// Hacia qué lado de la pantalla queda un punto (−0,8 izquierda … 0,8 derecha),
// teniendo en cuenta el giro de la cámara.
function panTowards(dx, dz) {
 const yaw = rig.focus ? (rig.yaw ?? 0) : 0;
 return Math.max(-0.8, Math.min(0.8, (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / 14));
}

// ── Ambiente ────────────────────────────────────────────────────────────────
// Una capa de brisa sintetizada y cinco bucles grabados: dos de fondo (pájaros
// de día, grillos de noche) y tres con posición en el mundo (cascada, arroyo y
// mar), que se atenúan con la distancia y se oyen del lado en que quedan.
const LOOPS = { pajaros: 0.5, grillos: 0.42, cascada: 0.8, arroyo: 0.6, mar: 0.7 }; // volumen a tope de cada uno
const loops = {}; // nombre → { gain, pan, level, side }
let wind = null;

export function startAmbience() {
 if (!context || wind) return;
 const source = context.createBufferSource();
 source.buffer = noise;
 source.loop = true;
 const filter = context.createBiquadFilter();
 filter.type = "lowpass";
 filter.frequency.value = 420;
 filter.Q.value = 0.5;
 wind = context.createGain();
 wind.gain.value = 0;
 source.connect(filter).connect(wind).connect(master);
 source.start(0, Math.random());
}

function startLoop(name) {
 if (loops[name]) return;
 const source = context.createBufferSource();
 source.buffer = buffers.get(name);
 source.loop = true;
 // El periodo que se repite va dentro del archivo, lejos de sus bordes (tools/assets/sounds.py).
 [source.loopStart, source.loopEnd] = sampleData[name].loop;
 const gain = context.createGain();
 gain.gain.value = 0;
 const pan = context.createStereoPanner?.();
 if (pan) source.connect(gain).connect(pan).connect(master);
 else source.connect(gain).connect(master);
 source.start(0, source.loopStart);
 loops[name] = { gain, pan, level: 0, side: 0 };
 if (import.meta.env.DEV) loops[name].meter = meter(pan ?? gain);
}

// Ajusta el ambiente. `wind`, `birds` y `crickets`: de 0 a 1. `sources`: los
// bucles con posición, cada uno con la distancia `d` al astronauta, hacia
// dónde queda (`dx`, `dz`) y su alcance `reach` (distancia a la que baja a la mitad…).
export function setAmbience({ wind: breeze = 0, birds = 0, crickets = 0, sources = {} }) {
 if (!wind) return;
 const time = context.currentTime;
 wind.gain.setTargetAtTime(breeze * 0.05, time, 0.6);
 const set = (name, level, side = 0, ease = 0.5) => {
  const loop = loops[name];
  if (!loop) return;
  loop.level = level * LOOPS[name];
  loop.side = side;
  loop.gain.gain.setTargetAtTime(loop.level, time, ease);
  loop.pan?.pan.setTargetAtTime(side, time, 0.25);
 };
 set("pajaros", birds, 0, 0.9);
 set("grillos", crickets, 0, 0.9);
 for (const name of ["cascada", "arroyo", "mar"]) {
  const source = sources[name];
  if (!source) {
   set(name, 0);
   continue;
  }
  // Cae con el cuadrado de la distancia y se apaga del todo al llegar a `far`.
  const fade = Math.max(0, 1 - source.d / source.far);
  // Pegado a la fuente el sonido envuelve; el lado se nota al separarse.
  set(name, (source.gain ?? 1) * fade * fade / (1 + (source.d / source.reach) ** 2), panTowards(source.dx, source.dz) * Math.min(1, source.d / 4), 0.3);
 }
}

// ── Para las pruebas (solo en desarrollo) ───────────────────────────────────
// Medidores de señal real: lo que de verdad sale por cada bucle y por la salida.
function meter(node) {
 const analyser = context.createAnalyser();
 analyser.fftSize = 2048;
 node.connect(analyser);
 const data = new Float32Array(analyser.fftSize);
 return () => {
  analyser.getFloatTimeDomainData(data);
  let sum = 0;
  for (const value of data) sum += value * value;
  return Math.sqrt(sum / data.length);
 };
}
function instrument(output) {
 const level = meter(output);
 Object.assign(stats, {
  level, // señal en la salida (RMS de los últimos 46 ms)
  loaded: () => Object.fromEntries([...buffers].map(([name, buffer]) => [name, +buffer.duration.toFixed(2)])),
  loops: () => Object.fromEntries(Object.entries(loops).map(([name, loop]) => [name, { set: +loop.level.toFixed(3), side: +loop.side.toFixed(2), heard: +loop.meter().toFixed(4) }])),
  master: () => master.gain.value,
  // La salida como flujo, para grabarla.
  tap: () => {
   const destination = context.createMediaStreamDestination();
   output.connect(destination);
   return destination.stream;
  },
 });
}
