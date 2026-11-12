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

// Uniformes compartidos por los sombreadores propios (agua, vaivén de plantas).
export const uniforms = {
 uTime: { value: 0 },
 // Ráfaga de viento que se propaga desde un punto: x, z, instante de inicio, fuerza.
 uGust: { value: new THREE.Vector4(0, 0, -100, 0) },
 // Quién aparta la hierba al pasar: xz del jugador y xz de Woody.
 uActors: { value: new THREE.Vector4(0, 0, 0, 0) },
 uWaterShallow: { value: current.waterShallow },
 uWaterDeep: { value: current.waterDeep },
 uSkyTop: { value: current.skyTop },
 uSkyHorizon: { value: current.skyHorizon },
 uSunDirection: { value: sunDirection },
 uSunColor: { value: current.sun },
 uNight: { value: 0 }, // 0 de día, 1 de noche
 uGlow: { value: 0 },
 uSpace: { value: 0 }, // 0 en tierra, 1 en órbita
};

// Cambia la paleta de día y de noche (al llegar a otro planeta).
export function setPalette(themes) {
 // Lo que el planeta no defina se toma de la paleta por defecto.
 parsed = parse({ day: { ...THEMES.day, ...themes?.day }, night: { ...THEMES.night, ...themes?.night } });
}

// Lanza una ráfaga de viento desde (x, z). Las plantas la notan al pasar el frente.
export function startGust(x, z, strength = 1) {
 uniforms.uGust.value.set(x, z, uniforms.uTime.value, strength);
}

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
 current.skyTop.lerp(SPACE, rig.space);
 current.skyHorizon.lerp(SPACE, rig.space * 0.85);
 current.fogDensity *= 1 - rig.space * 0.8;
 sunDirection.copy(SUN_DAY).lerp(SUN_NIGHT, t).normalize();
 uniforms.uNight.value = t;

 uniforms.uTime.value = elapsed;
 uniforms.uGlow.value = current.glow;
 uniforms.uSpace.value = rig.space;
 for (const { material, day, night, property } of glowing) material[property] = day + (night - day) * t;
}

// Añade a un material un vaivén de viento, que además responde a las ráfagas.
// `byHeight`: se mueve más cuanto más alto está el vértice y se aparta al paso
// del jugador y de Woody (briznas de hierba, flores); con "tall" hace lo mismo
// sin apartarse (árboles: se cimbrean desde el pie); si no, se mece la pieza entera.
export function addSway(material, strength, byHeight = false) {
 const avoidsActors = byHeight === true;
 material.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = uniforms.uTime;
  shader.uniforms.uGust = uniforms.uGust;
  shader.uniforms.uActors = uniforms.uActors;
  shader.vertexShader = shader.vertexShader
   .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform vec4 uGust;\nuniform vec4 uActors;")
   .replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>
    #ifdef USE_INSTANCING
     vec3 swayOrigin = instanceMatrix[3].xyz;
     vec3 swayAxisX = instanceMatrix[0].xyz;
     vec3 swayAxisZ = instanceMatrix[2].xyz;
     float swayHeight = max(position.y, 0.0) * length(instanceMatrix[1].xyz);
    #else
     vec3 swayOrigin = vec3(0.0);
     vec3 swayAxisX = vec3(1.0, 0.0, 0.0);
     vec3 swayAxisZ = vec3(0.0, 0.0, 1.0);
     float swayHeight = max(position.y, 0.0);
    #endif
    float swayPhase = swayOrigin.x * 0.31 + swayOrigin.z * 0.27;
    // Metros que se mueve este vértice con viento flojo.
    float swayAmount = ${byHeight ? "swayHeight * " : ""}${strength.toFixed(3)};

    // Ráfaga: un frente circular que avanza a 16 m/s y dobla lo que encuentra.
    vec2 fromGust = swayOrigin.xz - uGust.xy;
    float gustDistance = length(fromGust);
    float gustFront = (uTime - uGust.z) * 16.0;
    float gust = uGust.w * smoothstep(9.0, 0.0, abs(gustDistance - gustFront)) * smoothstep(75.0, 30.0, gustFront);

    vec2 sway = vec2(sin(uTime * 1.7 + swayPhase), cos(uTime * 1.3 + swayPhase * 1.3) * 0.7) * swayAmount * (1.0 + gust * 2.0);
    sway += (gustDistance > 0.01 ? fromGust / gustDistance : vec2(0.0)) * gust * swayAmount * 5.0;
    ${
     avoidsActors
      ? `// Se aparta de quien pasa cerca.
    vec2 away = swayOrigin.xz - uActors.xy;
    vec2 awayDog = swayOrigin.xz - uActors.zw;
    float near = 1.0 - smoothstep(0.35, 1.25, length(away));
    float nearDog = 1.0 - smoothstep(0.3, 1.0, length(awayDog));
    sway += (normalize(away + 0.0001) * near + normalize(awayDog + 0.0001) * nearDog) * swayHeight * 0.75;`
      : ""
    }
    // El desplazamiento está en metros del mundo: se pasa a los ejes de la pieza.
    transformed.x += dot(vec3(sway.x, 0.0, sway.y), swayAxisX) / dot(swayAxisX, swayAxisX);
    transformed.z += dot(vec3(sway.x, 0.0, sway.y), swayAxisZ) / dot(swayAxisZ, swayAxisZ);`,
   );
 };
 return material;
}
