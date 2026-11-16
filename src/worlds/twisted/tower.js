import * as THREE from "three";
import { merge, piece, randomFrom, tube } from "../living/kit/geometry";
import { INK, IRON } from "./models";

// La torre del reloj, hecha a mano (objetivo 22; antes era un campanario de
// tablones descargado). De abajo arriba: zócalo, fuste de piedra en bloques
// desiguales —cada bloque es una pieza, con su tono y su saliente, sobre un
// núcleo oscuro que hace de junta—, cornisa, el cuerpo del reloj con una
// esfera encendida en cada cara, y un tejado de pizarra alto y puntiagudo que
// se retuerce al subir, con una buhardilla en cada faldón y la punta en rizo.
// Ventanas con marco de piedra clara y arco, puerta con su farol de forja y
// dos engranajes de latón bajo la esfera. Ejes: fachada hacia +Z, metros.
// Devuelve lo macizo (`body`), los cristales cálidos (`warm`), las esferas
// (`dial`) y dónde van las agujas (`faces`) y los halos (`glows`).
const SLATE = ["#7f7b98", "#908ca8", "#6d6986", "#a09cb8", "#5f5c76"];
const JOINT = "#262338";
const FRAME = "#b9b5cc"; // piedra clara de marcos y cornisas
const TILES = ["#2b2942", "#35324f", "#403c5e", "#262439"];
const BRASS = { dark: "#8a6427", mid: "#c1933f", light: "#e3bd62" };
const WOOD = "#2f2536";

export const TOWER = { base: 0.7, shaftTop: 8.2, clockY: 9.62, clockR: 1.02, stageTop: 10.95, top: 17.2 };
const YAWS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
// Punto de una cara: `u` a lo ancho, `y` de alto, `out` hacia fuera.
const on = (yaw, u, y, out) => [u * Math.cos(yaw) + out * Math.sin(yaw), y, -u * Math.sin(yaw) + out * Math.cos(yaw)];

export function createTower() {
 const random = randomFrom(0.347);
 const body = [], warm = [], dial = [], glows = [];
 const pick = (list) => list[Math.floor(random() * list.length)];
 const { base, shaftTop, clockY, clockR, stageTop } = TOWER;
 // Medio ancho del fuste a cada altura: se estrecha al subir.
 const shaft = (y) => 1.74 - 0.36 * Math.min(1, Math.max(0, (y - base) / (shaftTop - base)));
 const STAGE = 1.66; // medio ancho del cuerpo del reloj
 const put = (yaw, geometry, options, u, y, out, spin = 0) => piece(geometry, { ...options, position: on(yaw, u, y, out), rotation: [0, yaw, spin] });

 // ── Zócalo y escalones ──
 body.push(piece(new THREE.BoxGeometry(4.0, base, 4.0), { bottom: SLATE[4], top: SLATE[2], jitter: 0.03, vary: 0.1, position: [0, base / 2, 0], rotation: [0, 0.02, 0] }));
 body.push(put(0, new THREE.BoxGeometry(1.9, 0.26, 0.6), { bottom: SLATE[4], top: SLATE[1], jitter: 0.02, seed: 3 }, 0.02, 0.44, 2.2));
 body.push(put(0, new THREE.BoxGeometry(2.3, 0.24, 0.6), { bottom: SLATE[4], top: SLATE[0], jitter: 0.02, seed: 5 }, -0.03, 0.14, 2.62));

 // ── Piedra en bloques ──
 const core = (y0, y1, low, high) => piece(new THREE.CylinderGeometry((high - 0.12) * Math.SQRT2, (low - 0.12) * Math.SQRT2, y1 - y0, 4).rotateY(Math.PI / 4), { color: JOINT, position: [0, (y0 + y1) / 2, 0] });
 const blocks = (y0, y1, halfAt) => {
  let y = y0;
  while (y < y1 - 0.02) {
   let tall = 0.44 + random() * 0.28;
   if (y1 - (y + tall) < 0.3) tall = y1 - y;
   for (const yaw of YAWS) {
    const h = halfAt(y + tall / 2);
    let left = -h;
    while (left < h - 0.02) {
     let wide = 0.5 + random() * 0.66;
     if (h - (left + wide) < 0.34) wide = h - left;
     const deep = 0.3, proud = random() * 0.075;
     body.push(put(yaw, new THREE.BoxGeometry(wide - 0.055, tall - 0.055, deep), { color: pick(SLATE), vary: 0.12, jitter: 0.014, seed: 1 + Math.floor(random() * 900) }, left + wide / 2, y + tall / 2, h - deep / 2 + proud, (random() - 0.5) * 0.025));
     left += wide;
    }
   }
   y += tall;
  }
 };
 body.push(core(base, shaftTop, shaft(base), shaft(shaftTop)));
 blocks(base, shaftTop, shaft);
 // Cornisa y ménsulas bajo el cuerpo del reloj.
 body.push(piece(new THREE.BoxGeometry(STAGE * 2 + 0.5, 0.22, STAGE * 2 + 0.5), { bottom: SLATE[2], top: FRAME, jitter: 0.015, position: [0, shaftTop + 0.11, 0] }));
 for (const yaw of YAWS) for (const u of [-1.0, 0, 1.0]) body.push(put(yaw, new THREE.ConeGeometry(0.2, 0.5, 4).rotateX(Math.PI), { color: SLATE[4] }, u, shaftTop - 0.26, shaft(shaftTop) + 0.14));
 body.push(core(shaftTop + 0.22, stageTop - 0.2, STAGE, STAGE));
 blocks(shaftTop + 0.22, stageTop - 0.2, () => STAGE);
 body.push(piece(new THREE.BoxGeometry(STAGE * 2 + 0.7, 0.2, STAGE * 2 + 0.7), { bottom: SLATE[2], top: FRAME, jitter: 0.015, position: [0, stageTop - 0.1, 0], rotation: [0, 0.03, 0] }));

 // ── Esferas del reloj: una en cada cara, encendida, con aro de latón y las horas marcadas ──
 const faces = YAWS.map((yaw) => {
  const out = STAGE + 0.07;
  dial.push(put(yaw, new THREE.CircleGeometry(clockR, 20), {}, 0, clockY, out));
  body.push(put(yaw, new THREE.TorusGeometry(clockR + 0.04, 0.1, 5, 20), { bottom: BRASS.dark, top: BRASS.light }, 0, clockY, out));
  for (let k = 0; k < 12; k++) {
   const angle = (k / 12) * Math.PI * 2, long = k % 3 ? 0.14 : 0.24, r = clockR - 0.1 - long / 2;
   body.push(put(yaw, new THREE.BoxGeometry(k % 3 ? 0.045 : 0.07, long, 0.03), { color: INK }, Math.sin(angle) * r, clockY + Math.cos(angle) * r, out + 0.02, -angle));
  }
  glows.push({ at: on(yaw, 0, clockY, out + 0.06), size: 3.4, tint: "dial" });
  return { position: on(yaw, 0, clockY, out + 0.03), yaw };
 });

 // ── Ventanas: cristal con arco, marco de piedra clara, cruceta de hierro y alféizar ──
 const window = (yaw, u, y, w, h, halfAt, lean = 0) => {
  const out = halfAt(y) + 0.09;
  const inner = (geometry, options, dx, dy, dz = 0, spin = 0) => {
   const made = piece(geometry, { ...options, position: [dx, dy, dz], rotation: [0, 0, spin] });
   made.applyMatrix4(new THREE.Matrix4().makeRotationZ(lean)).applyMatrix4(new THREE.Matrix4().makeRotationY(yaw));
   made.translate(...on(yaw, u, y, out));
   return made;
  };
  warm.push(inner(new THREE.PlaneGeometry(w, h), {}, 0, 0), inner(new THREE.CircleGeometry(w / 2, 8, 0, Math.PI), {}, 0, h / 2));
  body.push(
   inner(new THREE.BoxGeometry(0.13, h + 0.06, 0.16), { color: FRAME }, -w / 2 - 0.06, 0),
   inner(new THREE.BoxGeometry(0.13, h + 0.06, 0.16), { color: FRAME }, w / 2 + 0.06, 0),
   inner(new THREE.TorusGeometry(w / 2 + 0.06, 0.075, 4, 8, Math.PI), { color: FRAME }, 0, h / 2),
   inner(new THREE.BoxGeometry(w + 0.46, 0.11, 0.3), { bottom: SLATE[2], top: FRAME }, 0, -h / 2 - 0.06, 0.05),
   inner(new THREE.BoxGeometry(0.04, h + w / 2, 0.04), { color: IRON }, 0, w / 4, 0.02),
   inner(new THREE.BoxGeometry(w, 0.04, 0.04), { color: IRON }, 0, h * 0.16, 0.02),
  );
  glows.push({ at: on(yaw, u, y + 0.1, out + 0.08), size: 1.9, tint: "warm" });
 };
 window(0, -0.62, 3.5, 0.56, 0.86, shaft, 0.03);
 window(0, 0.5, 5.9, 0.5, 0.8, shaft, -0.04);
 window(Math.PI / 2, 0.1, 4.4, 0.54, 0.84, shaft, 0.03);
 window(-Math.PI / 2, -0.15, 6.3, 0.5, 0.8, shaft, -0.03);
 window(-Math.PI / 2, 0.3, 2.9, 0.5, 0.8, shaft, 0.04);
 window(Math.PI, 0, 5.0, 0.54, 0.84, shaft, 0.02);

 // ── Puerta: hoja de madera en arco, marco de piedra, montante encendido y farol de forja ──
 {
  const out = shaft(base + 1) + 0.1, w = 1.0, h = 1.55;
  body.push(
   put(0, new THREE.BoxGeometry(w, h, 0.12), { bottom: WOOD, top: "#463652", vary: 0.08 }, 0, base + h / 2, out),
   put(0, new THREE.BoxGeometry(0.17, h + 0.1, 0.24), { color: FRAME }, -w / 2 - 0.08, base + h / 2, out),
   put(0, new THREE.BoxGeometry(0.17, h + 0.1, 0.24), { color: FRAME }, w / 2 + 0.08, base + h / 2, out),
   put(0, new THREE.TorusGeometry(w / 2 + 0.08, 0.1, 4, 9, Math.PI), { color: FRAME }, 0, base + h, out),
   put(0, new THREE.BoxGeometry(0.035, h, 0.03), { color: INK }, -0.17, base + h / 2, out + 0.07),
   put(0, new THREE.BoxGeometry(0.035, h, 0.03), { color: INK }, 0.17, base + h / 2, out + 0.07),
   put(0, new THREE.BoxGeometry(w - 0.1, 0.07, 0.03), { color: IRON }, 0, base + 0.4, out + 0.08),
   put(0, new THREE.BoxGeometry(w - 0.1, 0.07, 0.03), { color: IRON }, 0, base + 1.2, out + 0.08),
   put(0, new THREE.SphereGeometry(0.06, 6, 5), { color: BRASS.light }, 0.32, base + 0.82, out + 0.1),
  );
  warm.push(put(0, new THREE.CircleGeometry(w / 2 - 0.02, 9, 0, Math.PI), {}, 0, base + h, out + 0.04));
  // Farol: un brazo de hierro que sale de la pared y se enrosca, y el farol colgando.
  const arm = [[0.98, base + 2.3, out - 0.05], [1.0, base + 2.62, out + 0.25], [1.02, base + 2.7, out + 0.6], [1.02, base + 2.52, out + 0.74], [1.01, base + 2.4, out + 0.62], [1.01, base + 2.46, out + 0.52]];
  body.push(
   piece(tube(arm, () => 0.03, { sides: 4, segments: 12 }), { color: IRON }),
   piece(new THREE.ConeGeometry(0.17, 0.2, 5), { color: IRON, position: [1.02, base + 2.3, out + 0.66] }),
   piece(new THREE.CylinderGeometry(0.11, 0.07, 0.05, 5), { color: IRON, position: [1.02, base + 1.94, out + 0.66] }),
  );
  warm.push(piece(new THREE.BoxGeometry(0.18, 0.26, 0.18), { position: [1.02, base + 2.08, out + 0.66] }));
  glows.push({ at: [1.02, base + 2.08, out + 0.72], size: 1.5, tint: "warm" }, { at: [0, base + h + 0.2, out + 0.1], size: 1.6, tint: "warm" });
 }

 // ── Engranajes de latón bajo la esfera, medio asomados de la piedra ──
 const gear = (yaw, u, y, r, teeth, tone, turn) => {
  const out = shaft(y) + 0.1;
  body.push(put(yaw, new THREE.CylinderGeometry(r, r, 0.12, teeth * 2).rotateX(Math.PI / 2), { bottom: tone.dark, top: tone.light, vary: 0.06 }, u, y, out));
  body.push(put(yaw, new THREE.CylinderGeometry(r * 0.3, r * 0.3, 0.2, 8).rotateX(Math.PI / 2), { color: tone.dark }, u, y, out + 0.02));
  for (let k = 0; k < teeth; k++) {
   const angle = (k / teeth) * Math.PI * 2 + turn;
   body.push(put(yaw, new THREE.BoxGeometry(r * 0.3, r * 0.3, 0.12), { color: tone.mid }, u + Math.sin(angle) * (r + r * 0.1), y + Math.cos(angle) * (r + r * 0.1), out, -angle));
  }
 };
 gear(0, -0.72, 7.25, 0.52, 9, BRASS, 0);
 gear(0, 0.14, 6.92, 0.33, 7, { dark: "#5d4a2a", mid: "#8c7036", light: "#a8894a" }, 0.3);
 gear(Math.PI / 2, 0.5, 7.3, 0.42, 8, BRASS, 0.2);

 // ── Tejado de pizarra: alto, puntiagudo y retorcido ──
 // Secciones cuadradas [altura, medio ancho, giro, desplazamiento]: cada una gira algo más y se vence hacia el este.
 const SECTIONS = [
  [stageTop, 2.16, 0, 0],
  [11.5, 1.86, 0.03, 0],
  [12.2, 1.52, 0.08, 0.02],
  [13.0, 1.2, 0.15, 0.06],
  [13.8, 0.92, 0.24, 0.12],
  [14.6, 0.68, 0.36, 0.2],
  [15.4, 0.46, 0.5, 0.32],
  [16.1, 0.28, 0.66, 0.46],
  [16.7, 0.13, 0.84, 0.62],
 ];
 {
  const positions = [], colors = [], tone = new THREE.Color();
  const ring = ([y, half, turn, dx]) => [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([sx, sz]) => [dx + (sx * Math.cos(turn) + sz * Math.sin(turn)) * half, y, (-sx * Math.sin(turn) + sz * Math.cos(turn)) * half]);
  // (Cada tramo, partido en dos hiladas de pizarra.)
  const rows = [];
  for (let i = 0; i < SECTIONS.length - 1; i++) for (let k = 0; k < 2; k++) rows.push(SECTIONS[i].map((v, c) => v + (SECTIONS[i + 1][c] - v) * (k / 2)));
  rows.push(SECTIONS[SECTIONS.length - 1]);
  for (let i = 0; i < rows.length - 1; i++) {
   const low = ring(rows[i]), high = ring(rows[i + 1]);
   for (let side = 0; side < 4; side++) {
    const next = (side + 1) % 4;
    tone.set(TILES[(i + side) % TILES.length]).multiplyScalar(0.9 + random() * 0.24);
    // (Por fuera: el recorrido de las esquinas va en el sentido de las agujas visto desde arriba.)
    for (const point of [low[side], high[next], low[next], low[side], high[side], high[next]]) {
     positions.push(...point);
     colors.push(tone.r, tone.g, tone.b);
    }
   }
  }
  const roof = new THREE.BufferGeometry();
  roof.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  roof.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  body.push(roof);
  // Alero oscuro y punta en rizo, con su bola de latón.
  body.push(piece(new THREE.BoxGeometry(4.5, 0.12, 4.5), { color: TILES[3], position: [0, stageTop + 0.02, 0] }));
  const tip = [[0.62, 16.62, 0], [0.8, 17.0, 0.02], [1.12, 17.2, 0.06], [1.42, 17.02, 0.08], [1.4, 16.74, 0.08], [1.24, 16.7, 0.07]];
  body.push(piece(tube(tip, (t) => 0.13 * (1 - t) + 0.03, { sides: 5, segments: 12 }), { color: TILES[1], vary: 0.08 }));
  body.push(piece(new THREE.OctahedronGeometry(0.12, 0), { color: BRASS.light, position: [1.22, 16.62, 0.07] }));
 }
 // Buhardillas: una en cada faldón, a distinta altura, cada una con su ventanita encendida y su gorro.
 YAWS.forEach((yaw, i) => {
  const y = 11.75 + (i % 2) * 0.55, out = 1.86 - (y - 11.5) * 0.47 + 0.1, lean = (i % 2 ? -1 : 1) * 0.07;
  const u = (i % 2 ? 0.2 : -0.15);
  body.push(
   put(yaw, new THREE.BoxGeometry(0.86, 0.8, 0.9), { bottom: SLATE[2], top: SLATE[1], vary: 0.1, seed: 40 + i }, u, y, out - 0.25, lean),
   put(yaw, new THREE.ConeGeometry(0.78, 0.78, 4).rotateY(Math.PI / 4), { bottom: TILES[0], top: TILES[2], vary: 0.1, seed: 50 + i }, u - lean * 0.6, y + 0.78, out - 0.25, lean * 1.6),
   put(yaw, new THREE.BoxGeometry(0.6, 0.07, 0.12), { color: FRAME }, u, y - 0.3, out + 0.22, lean),
   put(yaw, new THREE.BoxGeometry(0.035, 0.5, 0.03), { color: IRON }, u, y, out + 0.22, lean),
  );
  warm.push(put(yaw, new THREE.PlaneGeometry(0.46, 0.5), {}, u, y, out + 0.205, lean));
  glows.push({ at: on(yaw, u, y, out + 0.28), size: 1.4, tint: "warm" });
 });

 // Dónde encajan, al arrancar el reloj, los cuatro engranajes que se recogen por la isla: [x, y, z, radio].
 const slots = [[-0.02, 7.86, 0.3], [0.78, 7.36, 0.34], [0.86, 6.42, 0.27], [-0.86, 6.36, 0.3]].map(([u, y, r]) => [...on(0, u, y, shaft(y) + 0.2), r]);
 return { body: merge(body), warm: merge(warm), dial: merge(dial), faces, glows, slots };
}
