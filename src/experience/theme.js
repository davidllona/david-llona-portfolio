import * as THREE from "three";
import { uniform } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { startGust, withWind } from "./environment/wind";
import { rig } from "./state";

// Día y noche. No cambian los materiales: cambian las luces, la niebla, el
// fondo y cuánto brillan las cosas luminosas, así que pasar de uno a otro es
// solo mezclar unos valores en cada fotograma.
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

// De dónde viene la luz principal: el sol de día (suroeste, alto) y la luna de
// noche (desde el fondo, a contraluz: recorta siluetas y deja las caras que
// miran a la cámara para las luces cálidas).
const SUN_DAY = new THREE.Vector3(-0.42, 0.78, 0.46).normalize();
const SUN_NIGHT = new THREE.Vector3(0.38, 0.7, -0.6).normalize();
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
 uNight: uniform(0), // 0 de día, 1 de noche
 uGlow: uniform(0),
 uSpace: uniform(0), // 0 en tierra, 1 en órbita
};

// Cambia la paleta de día y de noche (al llegar a otro planeta).
export function setPalette(themes) {
 // Lo que el planeta no defina se toma de la paleta por defecto.
 parsed = parse({ day: { ...THEMES.day, ...themes?.day }, night: { ...THEMES.night, ...themes?.night } });
}

// Las ráfagas viven en el sistema de viento; se reexporta por comodidad.
export { startGust };

const STORAGE_KEY = "planeta-tema";
function stored() {
 try {
  return window.localStorage.getItem(STORAGE_KEY);
 } catch {
  return null; // almacenamiento bloqueado (modo privado, etc.)
 }
}

// `mix`: 0 = día, 1 = noche. Avanza poco a poco hacia el tema elegido.
export const theme = { name: stored() === "night" ? "night" : "day", mix: stored() === "night" ? 1 : 0 };

export function setTheme(name) {
 theme.name = name;
 try {
  window.localStorage.setItem(STORAGE_KEY, name);
 } catch {
  // Sin almacenamiento, el tema simplemente no se recuerda.
 }
}

// Materiales que brillan más de noche (farolas, cristales, ventanas…).
const glowing = new Set();
// Registra un material: `property` vale `day` de día y `night` de noche.
// El brillo propio tiene tope: por encima, farolas y ventanas se queman a blanco
// con el resplandor del posproceso y pierden su color.
const GLOW_LIMIT = { day: 0.9, night: 1.3 };
export function registerGlow(material, day, night, property = "emissiveIntensity") {
 if (property === "emissiveIntensity") {
  day = Math.min(day, GLOW_LIMIT.day);
  night = Math.min(night, GLOW_LIMIT.night);
 }
 const entry = { material, day, night, property };
 glowing.add(entry);
 material[property] = day + (night - day) * theme.mix;
 return () => glowing.delete(entry);
}

// Avanza la transición y actualiza todo lo compartido. Se llama en cada fotograma.
export function updateTheme(delta, elapsed) {
 const target = theme.name === "night" ? 1 : 0;
 theme.mix += (target - theme.mix) * Math.min(1, delta * 3);
 if (Math.abs(target - theme.mix) < 0.001) theme.mix = target;
 // En la bienvenida es de noche; al entrar amanece (o no, si se dejó en noche).
 const t = Math.max(theme.mix, rig.intro * rig.intro * (3 - 2 * rig.intro));
 for (const key of COLOR_KEYS) current[key].copy(parsed.day[key]).lerp(parsed.night[key], t);
 for (const key of NUMBER_KEYS) current[key] = parsed.day[key] + (parsed.night[key] - parsed.day[key]) * t;

 // Al subir con la nave (y en el islote de la bienvenida), el cielo es espacio.
 const space = Math.max(rig.space, rig.intro);
 current.background.lerp(SPACE, space);
 current.fog.lerp(SPACE, space);
 current.skyTop.lerp(SPACE, space);
 current.skyHorizon.lerp(SPACE, space * 0.85);
 current.fogDensity *= 1 - space * 0.8;
 sunDirection.copy(SUN_DAY).lerp(SUN_NIGHT, t).normalize();
 uniforms.uNight.value = t;

 uniforms.uTime.value = elapsed;
 uniforms.uGlow.value = current.glow;
 uniforms.uSpace.value = space;
 for (const { material, day, night, property } of glowing) material[property] = day + (night - day) * t;
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
