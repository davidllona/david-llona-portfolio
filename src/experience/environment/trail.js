import * as THREE from "three";
import { Fn, texture, vec3 } from "three/tsl";

// Rastro del astronauta y de Woody: un campo de «empuje» sobre el suelo que la
// vegetación lee para apartarse y volver poco a poco a su sitio.
//
// Es una textura pequeña anclada al mundo y enrollada (un punto del suelo cae
// siempre en el mismo texel, módulo el tamaño), así que no hay que desplazarla
// cuando el jugador anda. En cada fotograma todo el campo decae un poco y cada
// personaje deja su huella: hacia fuera de él y en el sentido en que se mueve.
// (La idea de un rastro que la hierba consulta viene de folio-2025, MIT.)
const SIZE = 128; // texels por lado
const SPAN = 32; // metros que cubre antes de repetirse
const RECOVERY = 1.25; // lo que tarda la hierba en levantarse (constante de tiempo, s)
const RADIUS = 1.05; // alcance de la huella, en metros

const field = new Float32Array(SIZE * SIZE * 2); // empuje xz por texel, en −1…1
const pixels = new Uint8Array(SIZE * SIZE * 4);
export const trailTexture = new THREE.DataTexture(pixels, SIZE, SIZE, THREE.RGBAFormat);
trailTexture.wrapS = trailTexture.wrapT = THREE.RepeatWrapping;
trailTexture.magFilter = trailTexture.minFilter = THREE.LinearFilter;
pixels.fill(128);
trailTexture.needsUpdate = true;

const wrap = (index) => ((index % SIZE) + SIZE) % SIZE;

function stamp(x, z, vx, vz, strength) {
 const scale = SIZE / SPAN;
 const reach = Math.ceil(RADIUS * scale);
 const cx = Math.floor(x * scale), cz = Math.floor(z * scale);
 const speed = Math.hypot(vx, vz);
 const dirX = speed > 0.05 ? vx / speed : 0, dirZ = speed > 0.05 ? vz / speed : 0;
 for (let dz = -reach; dz <= reach; dz++) {
  for (let dx = -reach; dx <= reach; dx++) {
   // Centro del texel, en metros, respecto al personaje.
   const ox = (cx + dx + 0.5) / scale - x, oz = (cz + dz + 0.5) / scale - z;
   const distance = Math.hypot(ox, oz);
   if (distance > RADIUS) continue;
   const fall = (1 - distance / RADIUS) ** 2 * strength;
   // Hacia fuera, con algo de arrastre en el sentido de la marcha.
   const outX = distance > 0.01 ? ox / distance : dirX, outZ = distance > 0.01 ? oz / distance : dirZ;
   let px = outX * 0.75 + dirX * 0.55, pz = outZ * 0.75 + dirZ * 0.55;
   const size = Math.hypot(px, pz) || 1;
   px = (px / size) * fall;
   pz = (pz / size) * fall;
   const i = (wrap(cz + dz) * SIZE + wrap(cx + dx)) * 2;
   // Se queda el empuje más fuerte: pisar dos veces no lo duplica.
   if (px * px + pz * pz > field[i] ** 2 + field[i + 1] ** 2) {
    field[i] = px;
    field[i + 1] = pz;
   }
  }
 }
}

// `actors`: [{ x, z, vx, vz, strength }]. Se llama una vez por fotograma.
export function updateTrail(delta, actors) {
 const keep = Math.exp(-delta / RECOVERY);
 for (let i = 0; i < field.length; i++) field[i] *= keep;
 for (const actor of actors) stamp(actor.x, actor.z, actor.vx, actor.vz, actor.strength ?? 1);
 for (let i = 0, p = 0; i < field.length; i += 2, p += 4) {
  pixels[p] = 128 + field[i] * 127;
  pixels[p + 1] = 128 + field[i + 1] * 127;
 }
 trailTexture.needsUpdate = true;
}

// Empuje en un punto del suelo: xy = dirección y fuerza (−1…1), z = fuerza (0…1).
export const trailPush = Fn(([position]) => {
 const push = texture(trailTexture, position.div(SPAN)).rg.sub(128 / 255).mul(255 / 127);
 return vec3(push, push.length().min(1));
});

// Fuerza del rastro (0–1) en un punto; para depurar y para las pruebas.
export function trailAt(x, z) {
 const scale = SIZE / SPAN;
 const i = (wrap(Math.floor(z * scale)) * SIZE + wrap(Math.floor(x * scale))) * 2;
 return Math.hypot(field[i], field[i + 1]);
}
