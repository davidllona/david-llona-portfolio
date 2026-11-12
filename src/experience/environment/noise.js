import * as THREE from "three";

// Ruido de gradiente 2D que se repite sin costura, horneado una vez en una
// textura pequeña. Es la fuente de «azar suave» de todo el entorno: el viento,
// la altura de la hierba, las manchas de color. (Idea de folio-2025, MIT; ver
// docs/CREDITOS.md.)
const SIZE = 128;
const PERIOD = 6; // celdas de ruido por lado

function gradient(ix, iy) {
 const x = ((ix % PERIOD) + PERIOD) % PERIOD;
 const y = ((iy % PERIOD) + PERIOD) % PERIOD;
 const fract = (v) => v - Math.floor(v);
 return [fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) * 2 - 1, fract(Math.sin(x * 269.5 + y * 183.3) * 43758.5453) * 2 - 1];
}

function perlin(x, y) {
 const ix = Math.floor(x), iy = Math.floor(y);
 const fx = x - ix, fy = y - iy;
 const ease = (t) => t * t * (3 - 2 * t);
 const corner = (dx, dy) => {
  const [gx, gy] = gradient(ix + dx, iy + dy);
  return gx * (fx - dx) + gy * (fy - dy);
 };
 const top = corner(0, 0) + (corner(1, 0) - corner(0, 0)) * ease(fx);
 const bottom = corner(0, 1) + (corner(1, 1) - corner(0, 1)) * ease(fx);
 return top + (bottom - top) * ease(fy);
}

function createNoiseTexture() {
 const data = new Uint8Array(SIZE * SIZE * 4);
 for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
   const u = (x / SIZE) * PERIOD, v = (y / SIZE) * PERIOD;
   // Canal R: ruido base. Canal G: el mismo, desplazado (segunda fuente independiente).
   const a = Math.min(1, Math.max(0, perlin(u, v) * 0.8 + 0.5));
   const b = Math.min(1, Math.max(0, perlin(u + 2.37, v + 4.11) * 0.8 + 0.5));
   data.set([a * 255, b * 255, 0, 255], (y * SIZE + x) * 4);
  }
 }
 const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
 texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
 texture.magFilter = texture.minFilter = THREE.LinearFilter;
 texture.needsUpdate = true;
 return texture;
}

export const noiseTexture = createNoiseTexture();
