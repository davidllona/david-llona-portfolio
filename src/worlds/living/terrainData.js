import * as THREE from "three";
import { groundColor } from "./groundColor";
import { grassAmount, groundHeight, inShade, surface } from "./layout";

// Datos del terreno horneados en texturas, para que los sombreadores sepan qué
// hay en cada punto sin geometría de por medio (técnica de folio-2025, MIT;
// allí la textura viene pintada, aquí sale del plano de la isla).
//
//  · data  (16 bits flotantes): R = cuánta hierba · G = sombra de árbol ·
//    A = altura del suelo en metros.
//  · color (8 bits, sRGB): color del suelo.
//
// Cubren SPAN × SPAN metros centrados en el origen: uv = xz / SPAN + 0.5.
export const SPAN = 128;
const SIZE = 256; // medio metro por texel

// El horneado va por filas para poder repartirlo en tramos cortos (ver `prepareTerrain`).
function startBake() {
 const data = new Uint16Array(SIZE * SIZE * 4);
 const color = new Uint8Array(SIZE * SIZE * 4);
 const tone = new THREE.Color();
 const half = THREE.DataUtils.toHalfFloat;
 let row = 0;
 // Hornea filas hasta agotar `budget` ms (o todas). Devuelve si ha terminado.
 const advance = (budget = Infinity) => {
  const started = performance.now();
  for (; row < SIZE && performance.now() - started < budget; row++) {
   for (let column = 0; column < SIZE; column++) {
    const x = ((column + 0.5) / SIZE - 0.5) * SPAN;
    const z = ((row + 0.5) / SIZE - 0.5) * SPAN;
    const i = (row * SIZE + column) * 4;
    // El tipo de suelo y la altura se calculan una vez y se reparten.
    const kind = surface(x, z);
    const height = groundHeight(x, z);
    data[i] = half(grassAmount(x, z, kind));
    data[i + 1] = half(kind === "shade" || inShade(x, z) ? 1 : 0);
    data[i + 2] = 0;
    data[i + 3] = half(height);
    groundColor(tone, x, z, { kind, height }).convertLinearToSRGB();
    color.set([tone.r * 255, tone.g * 255, tone.b * 255, 255], i);
   }
  }
  return row >= SIZE;
 };
 const finish = () => {
  advance();
  const dataTexture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.HalfFloatType);
  const colorTexture = new THREE.DataTexture(color, SIZE, SIZE, THREE.RGBAFormat);
  colorTexture.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [dataTexture, colorTexture]) {
   texture.magFilter = texture.minFilter = THREE.LinearFilter;
   texture.needsUpdate = true;
  }
  return { data: dataTexture, color: colorTexture };
 };
 return { advance, finish };
}

let baked = null;
let baking = null;
// Se hornean la primera vez que hacen falta y se comparten.
export const terrainTextures = () => (baked ??= (baking ??= startBake()).finish());

// Lo mismo, por adelantado y en tramos de pocos ms, cediendo el turno entre
// ellos con `breathe` (una función que devuelve una promesa).
export async function prepareTerrain(breathe, budget = 10) {
 baking ??= startBake();
 while (!baked && !baking.advance(budget)) await breathe();
 return terrainTextures();
}
