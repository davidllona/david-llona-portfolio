import * as THREE from "three";
import { uniform } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { startGust, withWind } from "./environment/wind";
import { rig } from "./state";

// Día, atardecer y noche. No cambian los materiales: cambian las luces, la
// niebla, el fondo y cuánto brillan las cosas luminosas, así que pasar de uno
// a otro es solo mezclar unos valores en cada fotograma.
//
// Los tres están en fila —día (0), atardecer (1), noche (2)— y el momento
// actual es un punto de esa fila (`theme.at`): entre dos de ellos se mezclan
// sus paletas. El amanecer es el atardecer recorrido al revés, más suave y con
// el sol al otro lado.
export const THEMES = {
 day: {
  hemiSky: "#fff0d9",
  hemiGround: "#b0607a",
  hemiPower: 1.15,
  sun: "#ffe6c7",
  sunPower: 2.4,
  fog: "#f4b98a",
  fogDensity: 0.0075,
  background: "#f4b98a",
  skyTop: "#7fb6e8",
  skyHorizon: "#f4b98a",
  waterShallow: "#5fe6d2",
  waterDeep: "#1c9bb8",
  glow: 0,
  bloom: 0.5,
  shadow: 1,
 },
 dusk: {
  hemiSky: "#ffb48c",
  hemiGround: "#7a3f7c",
  hemiPower: 1.2,
  sun: "#ff9a52",
  sunPower: 2.2,
  fog: "#e8845e",
  fogDensity: 0.0085,
  background: "#e8845e",
  skyTop: "#5a3f96",
  skyHorizon: "#ff9a5e",
  waterShallow: "#7ab8d8",
  waterDeep: "#3a4f9e",
  glow: 0.45,
  bloom: 0.65,
  shadow: 0.9,
 },
 night: {
  hemiSky: "#6672ff",
  hemiGround: "#4a2ab8",
  hemiPower: 1.9,
  sun: "#8f9bff",
  sunPower: 0.9,
  fog: "#1c1672",
  fogDensity: 0.0075,
  background: "#141056",
  skyTop: "#05041a",
  skyHorizon: "#141056",
  waterShallow: "#5a72ff",
  waterDeep: "#1a2090",
  glow: 1,
  bloom: 0.8,
  shadow: 0.8,
 },
};
const SPACE = new THREE.Color("#05041a");
const ORDER = ["day", "dusk", "night"];

const COLOR_KEYS = ["hemiSky", "hemiGround", "sun", "fog", "background", "skyTop", "skyHorizon", "waterShallow", "waterDeep"];
const NUMBER_KEYS = ["hemiPower", "sunPower", "glow", "fogDensity", "bloom", "shadow"];
const parse = (themes) =>
 Object.fromEntries(
  Object.entries(themes).map(([name, values]) => [
   name,
   Object.fromEntries(Object.entries(values).map(([key, value]) => [key, COLOR_KEYS.includes(key) ? new THREE.Color(value) : value])),
  ]),
 );
// La paleta en uso. Cada planeta trae la suya (ver setPalette).
let parsed = parse(THEMES);

// Valores actuales, ya mezclados.
export const current = Object.fromEntries([
 ...COLOR_KEYS.map((key) => [key, parsed.day[key].clone()]),
 ...NUMBER_KEYS.map((key) => [key, parsed.day[key]]),
]);

// De dónde viene la luz principal: el sol de día (suroeste, alto), el del
// atardecer (bajo, por el oeste: sombras largas hacia el este), el del
// amanecer (bajo, por el este) y la luna de noche (desde el fondo, a
// contraluz: recorta siluetas y deja las caras que miran a la cámara para las
// luces cálidas).
const SUN_DAY = new THREE.Vector3(-0.42, 0.78, 0.46).normalize();
const SUN_DUSK = new THREE.Vector3(-0.8, 0.33, 0.36).normalize();
const SUN_DAWN = new THREE.Vector3(0.8, 0.36, 0.3).normalize();
const SUN_NIGHT_DEFAULT = new THREE.Vector3(0.38, 0.7, -0.6).normalize();
// (Cada planeta puede traer su luna en otro sitio: `night.sunFrom` en su paleta.)
const SUN_NIGHT = SUN_NIGHT_DEFAULT.clone();
const low = new THREE.Vector3();
// En la bienvenida, la luna queda detrás del islote, a la izquierda.
const SUN_WELCOME = new THREE.Vector3(-0.46, 0.72, -0.52).normalize();
const MOON_WELCOME = new THREE.Color("#dbe8ff");
export const sunDirection = SUN_DAY.clone();

// Uniformes compartidos por los materiales de nodos (agua, cielo, hierba…).
// Son nodos TSL: se usan tal cual dentro de un material y su `.value` se
// actualiza aquí en cada fotograma. (El viento tiene los suyos en environment/wind.js.)
export const uniforms = {
 uTime: uniform(0),
 uWaterShallow: uniform(current.waterShallow),
 uWaterDeep: uniform(current.waterDeep),
 uSkyTop: uniform(current.skyTop),
 uSkyHorizon: uniform(current.skyHorizon),
 uSunDirection: uniform(sunDirection),
 uSunColor: uniform(current.sun),
 uNight: uniform(0), // 0 de día y al atardecer, 1 de noche
 uGlow: uniform(0),
 uSpace: uniform(0), // 0 en tierra, 1 en órbita
};

// Cambia la paleta (al llegar a otro planeta). Lo que el planeta no defina
// (el atardecer entero, si no lo trae) se toma de la paleta por defecto.
export function setPalette(themes) {
 parsed = parse({ day: { ...THEMES.day, ...themes?.day }, dusk: { ...THEMES.dusk, ...themes?.dusk }, night: { ...THEMES.night, ...themes?.night } });
 const from = themes?.night?.sunFrom;
 if (from) SUN_NIGHT.set(...from).normalize();
 else SUN_NIGHT.copy(SUN_NIGHT_DEFAULT);
}

// Las ráfagas viven en el sistema de viento; se reexporta por comodidad.
export { startGust };

// ── La hora ─────────────────────────────────────────────────────────────────
// El mundo se muestra según la hora local del visitante: la del reloj de su
// navegador, sin pedir ubicación ni permisos. `?hora=18:45` (y `?mes=6`) la
// fijan para probarlo sin esperar.
const asked = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
const fixedHour = (() => {
 const found = /^(\d{1,2})(?::(\d{2}))?$/.exec(asked?.get("hora") ?? "");
 return found && Number(found[1]) < 24 ? Number(found[1]) + Number(found[2] ?? 0) / 60 : null;
})();
const fixedMonth = Number(asked?.get("mes")) >= 1 && Number(asked?.get("mes")) <= 12 ? Number(asked.get("mes")) : null;
// La hora (0–24, con decimales) y el mes (1–12) de ahora.
export function clock() {
 const now = new Date();
 return { hour: fixedHour ?? now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600, month: fixedMonth ?? now.getMonth() + 1 + now.getDate() / 31 };
}
// Franjas del día. En los equinoccios: amanecer de 7:00 a 8:00, día hasta las
// 17:30, atardecer hasta las 20:30 y noche. Con el mes se corren, de forma
// aproximada: en junio anochece hora y cuarto más tarde y amanece una hora
// antes; en diciembre, al revés.
export function bands(month) {
 const season = Math.cos(((month - 6.7) / 12) * Math.PI * 2); // 1 a finales de junio, −1 a finales de diciembre
 return { dawn: 7 - season, day: 8 - season, dusk: 17.5 + season * 1.25, night: 20.5 + season * 1.25 };
}
const TURN = 0.75; // h que tarda en llegar el atardecer y, después, en caer la noche
const ramp = (x) => Math.min(1, Math.max(0, x));
// Dónde cae una hora en la fila día (0) · atardecer (1) · noche (2), cuánto
// tiene de amanecer (0–1) y cómo se llama su franja. Es continua: dentro de
// cada franja el cambio va llegando poco a poco, nunca de golpe.
export function skyAt(hour, month) {
 const b = bands(month);
 if (hour >= b.dawn && hour < b.day) {
  // Amanecer: de la noche al día pasando por el color del atardecer.
  const k = (hour - b.dawn) / (b.day - b.dawn);
  return { at: 2 - 2 * k, dawn: 1, name: "dawn" };
 }
 if (hour >= b.day && hour < b.dusk) return { at: 0, dawn: 0, name: "day" };
 if (hour >= b.dusk && hour < b.night) return { at: ramp((hour - b.dusk) / TURN) + ramp((hour - (b.night - TURN)) / TURN), dawn: 0, name: "dusk" };
 return { at: 2, dawn: 0, name: "night" };
}

// `name`: el momento que se muestra (día, atardecer o noche; el amanecer
// cuenta como atardecer). `manual`: el elegido a mano con el botón, la tecla N
// o el telescopio, que manda sobre la hora hasta que se recarga la página.
// `at`: el punto actual de la fila; `mix`, cuánto hay de noche y `dusk`,
// cuánto de atardecer (los dos de 0 a 1); `dawn`, cuánto de amanecer.
const start = typeof window === "undefined" ? { at: 0, dawn: 0, name: "day" } : skyAt(clock().hour, clock().month);
const shown = (sky) => (sky.name === "dawn" ? "dusk" : sky.name);
// `lock`: el momento fijo del planeta en que se está (The Twisted Moon: siempre
// de noche); manda sobre la hora y sobre lo elegido a mano, que se conserva
// para cuando se vuelva.
export const theme = { name: shown(start), manual: null, lock: null, at: start.at, mix: ramp(start.at - 1), dusk: 1 - Math.abs(start.at - 1), dawn: start.dawn, band: start.name };
const announce = () => {
 if (typeof document !== "undefined") document.documentElement.dataset.momento = theme.name;
};
announce();
if (import.meta.env?.DEV && typeof window !== "undefined") Object.assign((window.__world ??= {}), { theme, sky: { skyAt, bands, current } }); // para las pruebas automáticas

// Elige un momento a mano. (En un planeta de momento fijo no se puede.)
export function setTheme(name) {
 if (theme.lock) return;
 theme.manual = theme.name = name;
 announce();
}
// El siguiente: día → atardecer → noche → día.
export function nextTheme() {
 if (theme.lock) return theme.name;
 setTheme(ORDER[(ORDER.indexOf(theme.name) + 1) % ORDER.length]);
 return theme.name;
}
// Fija el momento del planeta (o lo suelta, con `null`). Se hace al cambiar de
// mundo, con la pantalla tapada: no hay transición, se llega ya así.
export function lockTheme(name) {
 theme.lock = name ?? null;
 let at = ORDER.indexOf(theme.lock ?? theme.manual);
 if (at < 0) {
  const sky = skyAt(clock().hour, clock().month);
  at = sky.at;
  theme.name = shown(sky);
 } else theme.name = ORDER[at];
 theme.at = at;
 announce();
}

// Cosas que brillan más de noche (farolas, cristales, ventanas…).
const glowing = new Set();
// Registra un material: `property` vale `day` de día y `night` de noche; al
// atardecer, lo que diga el brillo de su paleta (empiezan a encenderse). Con
// `by: "night"` sigue a la noche y no al brillo (las estrellas: no salen hasta
// que oscurece).
// El brillo propio tiene tope: por encima, farolas y ventanas se queman a blanco
// con el resplandor del posproceso y pierden su color.
const GLOW_LIMIT = { day: 0.9, night: 1.3 };
export function registerGlow(material, day, night, property = "emissiveIntensity", { by = "glow" } = {}) {
 if (property === "emissiveIntensity") {
  day = Math.min(day, GLOW_LIMIT.day);
  night = Math.min(night, GLOW_LIMIT.night);
 }
 const entry = { material, day, night, property, by };
 glowing.add(entry);
 material[property] = day + (night - day) * (by === "night" ? uniforms.uNight.value : current.glow);
 return () => glowing.delete(entry);
}

// Avanza la transición y actualiza todo lo compartido. Se llama en cada fotograma.
export function updateTheme(delta, elapsed) {
 // Hacia dónde: lo elegido a mano o, si no, lo que marque el reloj.
 let target = ORDER.indexOf(theme.lock ?? theme.manual), dawn = 0;
 if (target < 0) {
  const { hour, month } = clock();
  const sky = skyAt(hour, month);
  target = sky.at;
  dawn = sky.dawn;
  theme.band = sky.name;
  if (shown(sky) !== theme.name) {
   theme.name = shown(sky);
   announce();
  }
 }
 theme.at += (target - theme.at) * Math.min(1, delta * 2.2);
 if (Math.abs(target - theme.at) < 0.001) theme.at = target;
 theme.dawn += (dawn - theme.dawn) * Math.min(1, delta * 2.2);
 // En la bienvenida es de noche; al entrar amanece (o no, si es de noche).
 const at = theme.at + (2 - theme.at) * rig.intro * rig.intro * (3 - 2 * rig.intro);
 const t = ramp(at - 1); // cuánto hay de noche
 const evening = 1 - Math.abs(at - 1); // cuánto de atardecer
 theme.mix = t;
 theme.dusk = evening;
 const from = at <= 1 ? parsed.day : parsed.dusk, to = at <= 1 ? parsed.dusk : parsed.night, k = at <= 1 ? at : at - 1;
 // (El amanecer es un atardecer más suave: a medio camino del día.)
 const soft = evening * theme.dawn * 0.35;
 for (const key of COLOR_KEYS) current[key].copy(from[key]).lerp(to[key], k).lerp(parsed.day[key], soft);
 for (const key of NUMBER_KEYS) {
  current[key] = from[key] + (to[key] - from[key]) * k;
  current[key] += (parsed.day[key] - current[key]) * soft;
 }

 // Al subir con la nave (y en el islote de la bienvenida), el cielo es espacio.
 const space = Math.max(rig.space, rig.intro);
 current.background.lerp(SPACE, space);
 current.fog.lerp(SPACE, space);
 current.skyTop.lerp(SPACE, space);
 // (Desde la órbita se mira hacia abajo: ahí el cielo es todo «horizonte», y también es espacio.)
 current.skyHorizon.lerp(SPACE, Math.max(space * 0.85, rig.space));
 current.fogDensity *= 1 - space * 0.8;
 // En órbita no queda niebla: el planeta se ve entero.
 current.fogDensity *= (1 - rig.space) ** 2;
 low.copy(SUN_DUSK).lerp(SUN_DAWN, theme.dawn);
 if (at <= 1) sunDirection.copy(SUN_DAY).lerp(low, at);
 else sunDirection.copy(low).lerp(SUN_NIGHT, at - 1);
 sunDirection.lerp(SUN_WELCOME, rig.intro).normalize();
 // En el islote la luna manda menos luz de ambiente: las siluetas se recortan.
 current.hemiPower *= 1 - rig.intro * 0.5;
 current.sunPower *= 1 + rig.intro * 2.1;
 // Y es más blanca: con la azul del planeta, las hojas verdes apenas la devuelven.
 current.sun.lerp(MOON_WELCOME, rig.intro * 0.85);
 uniforms.uNight.value = t;

 uniforms.uTime.value = elapsed;
 uniforms.uGlow.value = current.glow;
 uniforms.uSpace.value = space;
 for (const { material, day, night, property, by } of glowing) material[property] = day + (night - day) * (by === "night" ? t : current.glow);
}

// Devuelve una versión de `material` (Lambert) que se mece con el viento global.
// Se mantiene por compatibilidad con el planeta antiguo; el código nuevo usa
// `withWind` de environment/wind.js directamente.
//  · byHeight: true = se dobla más cuanto más alto y se aparta al paso; si no, se mece entero.
export function addSway(material, strength, byHeight = false) {
 const node = new MeshLambertNodeMaterial({ color: material.color, vertexColors: material.vertexColors, flatShading: material.flatShading, side: material.side });
 material.dispose();
 return withWind(node, byHeight ? { flex: strength * 3.5, power: 2, cap: 1.2, trail: byHeight === true ? 0.8 : 0 } : { flex: strength * 1.2, power: 1, cap: 4 });
}
