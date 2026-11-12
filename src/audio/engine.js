import { player } from "../experience/state";

// Motor de sonido. Todo se sintetiza con Web Audio (osciladores y ruido
// filtrado): no hay archivos, ni licencias, ni descargas. El contexto se crea
// con el primer gesto del visitante, como exigen los navegadores.

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
export const stats = { played: {}, state: () => context?.state ?? "sin crear" };

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
 // Logro: arpegio corto y brillante.
 achievement: (out, t) => [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => tone(out, t + i * 0.085, { from: f, type: "triangle", peak: 0.14, decay: i === 3 ? 0.7 : 0.22 })),
};

// Mínimo entre dos repeticiones del mismo sonido, en segundos.
const COOLDOWN = { default: 0.05, "ball-floor": 0.07, "ball-rim": 0.06, crate: 0.12, chirp: 0.5, flutter: 1.5, gust: 3 };

// Reproduce un sonido. Con `x, z` suena desde ese punto del mundo: más flojo
// cuanto más lejos del astronauta y desplazado a izquierda o derecha.
export function play(id, { x, z, strength = 1 } = {}) {
 stats.played[id] = (stats.played[id] ?? 0) + 1;
 const make = SOUNDS[id];
 if (!context || !make || context.state !== "running" || settings.muted) return;
 const time = context.currentTime;
 if (time - (lastPlayed.get(id) ?? -10) < (COOLDOWN[id] ?? COOLDOWN.default)) return;
 lastPlayed.set(id, time);

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
   pan.pan.value = Math.max(-0.8, Math.min(0.8, dx / 14));
   gain.connect(pan).connect(master);
  } else gain.connect(master);
  out = gain;
 }
 make(out, time, Math.max(0.05, Math.min(1, strength)));
}

// ── Ambiente ────────────────────────────────────────────────────────────────
// Dos capas continuas (brisa y agua) cuyo volumen se va ajustando.
let ambience = null;
export function startAmbience() {
 if (!context || ambience) return;
 const layer = (filterType, frequency, q) => {
  const source = context.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const gain = context.createGain();
  gain.gain.value = 0;
  source.connect(filter).connect(gain).connect(master);
  source.start(0, Math.random());
  return gain;
 };
 ambience = { wind: layer("lowpass", 420, 0.5), water: layer("bandpass", 1500, 0.5) };
}
// `wind` y `water`: de 0 a 1.
export function setAmbience({ wind = 0, water = 0 }) {
 if (!ambience) return;
 ambience.wind.gain.setTargetAtTime(wind * 0.05, context.currentTime, 0.6);
 ambience.water.gain.setTargetAtTime(water * 0.085, context.currentTime, 0.35);
}
