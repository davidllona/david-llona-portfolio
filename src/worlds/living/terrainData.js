import * as THREE from "three";
import { groundColor } from "./groundColor";
import { grassAmount, groundHeight, inShade } from "./layout";

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

function bake() {
 const data = new Uint16Array(SIZE * SIZE * 4);
 const color = new Uint8Array(SIZE * SIZE * 4);
 const tone = new THREE.Color();
 const half = THREE.DataUtils.toHalfFloat;
 for (let row = 0; row < SIZE; row++) {
  for (let column = 0; column < SIZE; column++) {
   const x = ((column + 0.5) / SIZE - 0.5) * SPAN;
   const z = ((row + 0.5) / SIZE - 0.5) * SPAN;
   const i = (row * SIZE + column) * 4;
   data[i] = half(grassAmount(x, z));
   data[i + 1] = half(inShade(x, z) ? 1 : 0);
   data[i + 2] = 0;
   data[i + 3] = half(groundHeight(x, z));
   groundColor(tone, x, z).convertLinearToSRGB();
   color.set([tone.r * 255, tone.g * 255, tone.b * 255, 255], i);
  }
 }
 const dataTexture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.HalfFloatType);
 const colorTexture = new THREE.DataTexture(color, SIZE, SIZE, THREE.RGBAFormat);
 colorTexture.colorSpace = THREE.SRGBColorSpace;
 for (const texture of [dataTexture, colorTexture]) {
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
 }
 return { data: dataTexture, color: colorTexture };
}

let baked = null;
// Se hornean la primera vez que hacen falta y se comparten.
export const terrainTextures = () => (baked ??= bake());
