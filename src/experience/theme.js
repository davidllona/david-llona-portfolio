import * as THREE from "three";
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
  background: "#f4b98a",
  waterShallow: "#5fe6d2",
  waterDeep: "#1c9bb8",
  glow: 0,
 },
 night: {
  hemiSky: "#6672ff",
  hemiGround: "#4a2ab8",
  hemiPower: 1.9,
  sun: "#8f9bff",
  sunPower: 0.9,
  fog: "#1c1672",
  background: "#141056",
  waterShallow: "#5a72ff",
  waterDeep: "#1a2090",
  glow: 1,
 },
};
const SPACE = new THREE.Color("#05041a");

const COLOR_KEYS = ["hemiSky", "hemiGround", "sun", "fog", "background", "waterShallow", "waterDeep"];
const NUMBER_KEYS = ["hemiPower", "sunPower", "glow"];
const parsed = Object.fromEntries(
 Object.entries(THEMES).map(([name, values]) => [
  name,
  Object.fromEntries(Object.entries(values).map(([key, value]) => [key, COLOR_KEYS.includes(key) ? new THREE.Color(value) : value])),
 ]),
);

// Valores actuales, ya mezclados.
export const current = Object.fromEntries([
 ...COLOR_KEYS.map((key) => [key, parsed.day[key].clone()]),
 ...NUMBER_KEYS.map((key) => [key, parsed.day[key]]),
 ["fogDensity", 0.0075],
]);

// Uniformes compartidos por los sombreadores propios (agua, vaivén de plantas).
export const uniforms = {
 uTime: { value: 0 },
 uWaterShallow: { value: current.waterShallow },
 uWaterDeep: { value: current.waterDeep },
 uGlow: { value: 0 },
 uSpace: { value: 0 }, // 0 en tierra, 1 en órbita
};

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
export function registerGlow(material, day, night, property = "emissiveIntensity") {
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
 const t = theme.mix;
 for (const key of COLOR_KEYS) current[key].copy(parsed.day[key]).lerp(parsed.night[key], t);
 for (const key of NUMBER_KEYS) current[key] = parsed.day[key] + (parsed.night[key] - parsed.day[key]) * t;

 // Al subir con la nave, el cielo se va volviendo espacio.
 current.background.lerp(SPACE, rig.space);
 current.fog.lerp(SPACE, rig.space);
 current.fogDensity = 0.0075 * (1 - rig.space * 0.8);

 uniforms.uTime.value = elapsed;
 uniforms.uGlow.value = current.glow;
 uniforms.uSpace.value = rig.space;
 for (const { material, day, night, property } of glowing) material[property] = day + (night - day) * t;
}

// Añade a un material un vaivén de viento. `byHeight`: se mueve más cuanto más
// alto está el vértice (briznas de hierba); si no, se mece la pieza entera.
export function addSway(material, strength, byHeight = false) {
 material.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = uniforms.uTime;
  shader.vertexShader = shader.vertexShader
   .replace("#include <common>", "#include <common>\nuniform float uTime;")
   .replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>
    #ifdef USE_INSTANCING
     vec3 swayOrigin = instanceMatrix[3].xyz;
    #else
     vec3 swayOrigin = vec3(0.0);
    #endif
    float swayPhase = swayOrigin.x * 0.31 + swayOrigin.z * 0.27;
    float swayAmount = ${byHeight ? "max(position.y, 0.0) * " : ""}${strength.toFixed(3)};
    transformed.x += sin(uTime * 1.7 + swayPhase) * swayAmount;
    transformed.z += cos(uTime * 1.3 + swayPhase * 1.3) * swayAmount * 0.7;`,
   );
 };
 return material;
}
