import * as THREE from "three";
import { grassAmount, groundHeight, noise2, surface } from "./layout";

// Color del suelo en cada punto. Lo usan la malla del terreno y la textura que
// lee el césped (cada brizna nace del color del suelo que tiene debajo).

// Tonos de cada tipo de suelo (ver `surface` en layout.js).
const PALETTE = {
 grass: ["#7cc65c", "#70bd57", "#88cc62"],
 meadow: ["#93d266", "#9ed86c", "#89cb60"],
 shade: ["#5a9f4d", "#52964a", "#63a851"],
 moss: ["#62a955", "#6db058", "#589f52"],
 bank: ["#b3a47c", "#a59670", "#bfb189"],
 wetsand: ["#d3bd88", "#c9b27d"],
 sand: ["#f3e2ad", "#ecd79b", "#f7e9bb"],
 path: ["#e3ca98", "#dcc08b"],
 pathEdge: ["#c3c184", "#b9bb7c"], // a medio camino entre la tierra y la hierba: el borde se funde
 stone: ["#a9a6b3", "#9b98a6"],
 plaza: ["#cdbfa6", "#c2b49a", "#d6c9b1"],
 bed: ["#4f9f9c", "#3f8f90", "#2f7f86"],
};
// La roca va por estratos: el tono depende de la altura.
const STRATA = ["#8a847d", "#a59f95", "#b9b3a7", "#968f88", "#aaa398"];

const palette = Object.fromEntries(Object.entries(PALETTE).map(([key, list]) => [key, list.map((c) => new THREE.Color(c))]));
const strata = STRATA.map((c) => new THREE.Color(c));

// Escribe en `target` el color del suelo en (x, z).
//  · at: punto del que se toma la mancha de tono (por defecto, el mismo).
//  · odd: usa el tono siguiente (para salpicar caras sueltas distintas).
//  · kind, height: tipo de suelo y altura, si quien llama ya los tiene.
export function groundColor(target, x, z, { at = [x, z], odd = false, kind = surface(x, z), height } = {}) {
 if (kind === "rock") {
  const band = Math.floor((height ?? groundHeight(x, z)) * 1.5 + noise2(at[0] * 0.5, at[1] * 0.5) * 1.6);
  return target.copy(strata[((band % strata.length) + strata.length) % strata.length]);
 }
 const tones = palette[kind];
 const patch = noise2(at[0] * 0.11, at[1] * 0.11) * 0.65 + noise2(at[0] * 0.4 + 7, at[1] * 0.4) * 0.35;
 let tone = Math.min(tones.length - 1, Math.floor(patch * tones.length));
 if (odd) tone = (tone + 1) % tones.length;
 // Bajo la hierba el suelo es más oscuro: da fondo y hace destacar las puntas.
 return target.copy(tones[tone]).multiplyScalar(1 - grassAmount(x, z, kind) * 0.2);
}
