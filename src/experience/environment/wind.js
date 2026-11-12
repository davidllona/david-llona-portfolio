import * as THREE from "three";
import { Fn, float, length, positionGeometry, positionLocal, smoothstep, texture, uniform, vec3 } from "three/tsl";
import { noiseTexture } from "./noise";
import { trailPush } from "./trail";

// Viento global. Un único campo, definido por posición y tiempo, que leen
// todos los sombreadores de vegetación y las partículas: así una racha se ve
// pasar de la hierba a los arbustos y a las copas, en vez de animaciones
// sueltas. La base matemática (dos capas de ruido que se desplazan en la
// dirección del viento, con el reloj integrado) está adaptada de folio-2025
// de Bruno Simon (MIT; ver docs/CREDITOS.md). Las rachas viajeras y el frente
// de ráfaga son añadidos propios.

// Todo lo ajustable, en un solo sitio.
export const WIND = {
 angle: Math.PI * 0.62, // hacia dónde sopla (0 = hacia +z)
 strength: 0.5, // 0 calma · 1 vendaval
 timeFrequency: 0.1, // velocidad a la que se desplaza el ruido
 positionFrequency: 0.5, // tamaño de las ondas (menor = más grandes)
 gustSpeed: 15, // m/s a los que avanza el frente de una ráfaga
 gustLength: 11, // grosor del frente, en metros
 // Cuánto cede cada especie (metros de desplazamiento por metro de altura).
 flex: { grass: 1, flower: 0.75, fern: 0.4, reed: 0.5, bush: 0.12, tree: 0.05, vine: 0.3 },
};

export const windDirection = uniform(new THREE.Vector2(Math.sin(WIND.angle), Math.cos(WIND.angle)));
export const windStrength = uniform(WIND.strength);
export const windTime = uniform(0); // reloj integrado: cambia de ritmo sin dar saltos
// Ráfaga: xz de origen, metros que ha avanzado el frente y fuerza.
export const windGust = uniform(new THREE.Vector4(0, 0, 1e4, 0));

const gust = { active: false, travelled: 0 };

// Lanza una ráfaga desde (x, z): un frente circular que recorre el mundo.
export function startGust(x, z, strength = 1) {
 gust.active = true;
 gust.travelled = 0;
 windGust.value.set(x, z, 0, strength);
}

export function setWind({ angle, strength }) {
 if (angle !== undefined) windDirection.value.set(Math.sin(angle), Math.cos(angle));
 if (strength !== undefined) WIND.strength = strength;
}

// Se llama una vez por fotograma.
export function updateWind(delta) {
 // Con una ráfaga en marcha el viento de fondo sube un poco y luego amaina.
 const boost = gust.active ? windGust.value.w * Math.max(0, 1 - gust.travelled / 110) * 0.5 : 0;
 windStrength.value += (WIND.strength + boost - windStrength.value) * Math.min(1, delta * 1.5);
 windTime.value += delta * WIND.timeFrequency * (0.4 + windStrength.value);
 if (gust.active) {
  gust.travelled += delta * WIND.gustSpeed;
  windGust.value.z = gust.travelled;
  if (gust.travelled > 130) {
   gust.active = false;
   windGust.value.set(0, 0, 1e4, 0);
  }
 }
}

// Dónde está el frente de la ráfaga (0–1) en un punto del suelo; lo usan
// también, en JavaScript, las hojas y los pájaros.
export function gustAt(x, z) {
 if (!gust.active) return 0;
 const fromFront = Math.hypot(x - windGust.value.x, z - windGust.value.y) - gust.travelled;
 return windGust.value.w * Math.max(0, 1 - Math.abs(fromFront) / WIND.gustLength) * Math.max(0, 1 - gust.travelled / 110);
}

// Desplazamiento del viento en un punto del suelo (vec2 en xz, en metros por
// unidad de flexibilidad y de altura).
export const windOffset = Fn(([position]) => {
 const scaled = position.mul(WIND.positionFrequency);
 // Dos capas de la misma textura: una menuda y rápida, otra amplia y lenta.
 const fine = texture(noiseTexture, scaled.mul(0.2).add(windDirection.mul(windTime))).r.sub(0.5);
 const broad = texture(noiseTexture, scaled.mul(0.1).add(windDirection.mul(windTime.mul(0.2)))).r.sub(0.5);
 // Rachas: manchas grandes que cruzan el terreno a favor del viento. Donde
 // pasan, la vegetación se tumba más; por eso se ve «correr» el viento.
 const patches = texture(noiseTexture, position.mul(0.021).sub(windDirection.mul(windTime.mul(1.6)))).g;
 const squall = smoothstep(0.5, 0.82, patches);
 const sway = fine.add(broad).mul(float(1).add(squall.mul(1.4)));
 const lean = squall.mul(0.55).add(0.12); // inclinación sostenida a favor del viento
 const field = windDirection.mul(sway.add(lean)).mul(windStrength);

 // Frente de ráfaga: empuja hacia fuera desde su origen, al paso.
 const fromOrigin = position.sub(windGust.xy);
 const distance = length(fromOrigin);
 const front = smoothstep(WIND.gustLength, 0, distance.sub(windGust.z).abs()).mul(windGust.w).mul(smoothstep(110, 40, windGust.z));
 const outward = fromOrigin.div(distance.max(0.001));
 return field.add(outward.mul(front).mul(1.6)).add(windDirection.mul(front).mul(sway).mul(2));
});

// Añade a un material de nodos el movimiento del viento.
//  · flex: flexibilidad (ver WIND.flex).
//  · power: cómo crece el movimiento con la altura (2 = la punta se curva; 1 = se inclina recto).
//  · cap: altura a partir de la cual ya no aumenta (metros del modelo).
//  · trail: cuánto se aparta al paso del astronauta y de Woody (0 = nada).
// La base de la planta queda anclada: a altura 0 el desplazamiento es 0.
export function withWind(material, { flex = 0.5, power = 2, cap = 1, trail = 0 } = {}) {
 // Con instancias, `positionLocal` ya incluye la posición de cada copia.
 const ground = positionLocal.xz;
 const height = positionGeometry.y.max(0);
 const weight = height.div(cap).min(1).pow(power).mul(cap);
 let offset = windOffset(ground).mul(flex).mul(weight);
 if (trail) offset = offset.add(trailPush(ground).xy.mul(trail).mul(height.min(cap)));
 material.positionNode = positionLocal.add(vec3(offset.x, 0, offset.y));
 return material;
}

// Para depurar en la consola del navegador.
export const windDebug = { WIND, windStrength, windTime, windGust, gust };
