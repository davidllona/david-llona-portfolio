import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { attribute, smoothstep, texture, uv, mix, vec2, vec3 } from "three/tsl";
import { noiseTexture } from "../../experience/environment/noise";
import { unlit } from "../../experience/materials";
import { uniforms } from "../../experience/theme";
import { WATERFALLS, createRandom } from "./layout";

// Las cascadas de The Twisted Moon: las de la isla (Terrain.jsx) y las de la
// tierra lejana (FarScene.jsx).

// Cascadas: no una lámina, sino varias tiras de agua, cada una de su ancho, que
// caen a distinta velocidad y dejan huecos entre ellas por los que se ve la roca.
export function createFalls(falls = WATERFALLS, seed = 20261122) {
 const random = createRandom(seed);
 const strips = [];
 for (const fall of falls) {
  const drop = fall.top - fall.bottom, tall = drop + 0.5;
  const COUNT = 6, slot = fall.width / COUNT;
  for (let k = 0; k < COUNT; k++) {
   const width = slot * (0.42 + random() * 0.4), across = -fall.width / 2 + slot * (k + 0.5) + (random() - 0.5) * slot * 0.3;
   const out = random() * 0.22, speed = 0.55 + random() * 0.6, seed = random();
   const sheet = new THREE.PlaneGeometry(width, tall, 1, 6);
   const points = sheet.attributes.position, uvs = sheet.attributes.uv;
   const strip = new Float32Array(points.count * 2);
   for (let i = 0; i < points.count; i++) {
    const t = (points.getY(i) + tall / 2) / tall; // 0 abajo, 1 arriba
    // Cae algo tendida, con una panza hacia fuera a media altura; cada tira, a su distancia de la roca.
    points.setX(i, points.getX(i) + across);
    points.setZ(i, (1 - t) * 0.9 + Math.sin(t * Math.PI) * (0.2 + out) + out * 0.4);
    uvs.setXY(i, uvs.getX(i), t * tall);
    strip[i * 2] = speed;
    strip[i * 2 + 1] = seed;
   }
   sheet.setAttribute("strip", new THREE.BufferAttribute(strip, 2));
   sheet.setAttribute("flow", new THREE.BufferAttribute(new Float32Array(points.count * 2), 2));
   sheet.rotateY(fall.turn).translate(fall.x, (fall.top + fall.bottom) / 2 - 0.2, fall.z);
   const flat = sheet.toNonIndexed();
   sheet.dispose();
   flat.deleteAttribute("normal");
   strips.push(flat);
  }
 }
 return mergeGeometries(strips);
}

// Las cascadas de la isla (objetivo 28): cada una nace del agua de arriba. Las
// tiras empiezan sobre el propio arroyo, medio metro antes del borde, pegadas
// al agua; al llegar a él se curvan (el labio, con su espuma) y caen
// abriéndose de la roca lo justo para salvar el cortado, que avanza al bajar,
// hasta el agua de abajo. Debajo de las tiras va una lámina entera, sin
// desgarros en el labio, para que el agua no se corte al doblar el borde.
// Cada vértice lleva `strip` (velocidad y semilla de su tira) y `flow`
// (cuánta espuma, y cuánto de lámina entera).
export function createCascades(falls = WATERFALLS, seed = 20261128) {
 const random = createRandom(seed);
 const strips = [];
 const RUN = 0.7, STEPS = 12; // m de agua tendida antes del borde; tramos de la caída
 for (const fall of falls) {
  const out = [Math.sin(fall.turn), Math.cos(fall.turn)], side = [Math.cos(fall.turn), -Math.sin(fall.turn)];
  const drop = fall.from - (fall.to - 0.12);
  const strip = ({ across, width, reach, speed, tag, body, lift }) => {
   // El recorrido, en (lo que se aleja del borde, altura): tendido, y luego una parábola (cae como cae el agua).
   const path = [[-RUN, fall.from + lift], [-RUN * 0.45, fall.from + lift]];
   for (let k = 0; k <= STEPS; k++) path.push([reach * (k / STEPS), fall.from + lift - drop * (k / STEPS) ** 2]);
   const lengths = [0];
   for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
   const total = lengths[lengths.length - 1];
   const positions = [], uvs = [], tags = [], flows = [], index = [];
   path.forEach(([away, y], i) => {
    const k = i - 2; // 0 en el borde
    // Espuma: en el labio y al batir abajo. Lámina entera: tendida y en el labio; más abajo se deshace.
    const foam = Math.max(k < 0 ? 0.25 : Math.max(0, 1 - Math.abs(k - 1) / 2.2), i >= path.length - 2 ? 0.8 : 0);
    const whole = body ? Math.max(0, 1 - Math.max(0, k) / (STEPS * 0.55)) : k <= 0 ? 1 : 0;
    // (La tira se estrecha un poco al caer y vuelve a abrirse abajo.)
    const wide = width * (k <= 0 ? 1 : 0.86 + 0.2 * (k / STEPS));
    for (const edge of [-0.5, 0.5]) {
     const a = across + edge * wide;
     positions.push(fall.lip[0] + out[0] * away + side[0] * a, y, fall.lip[1] + out[1] * away + side[1] * a);
     uvs.push(edge + 0.5, total - lengths[i]);
     tags.push(speed, tag);
     flows.push(foam, whole);
    }
    if (i) index.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
   });
   const made = new THREE.BufferGeometry();
   made.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
   made.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
   made.setAttribute("strip", new THREE.Float32BufferAttribute(tags, 2));
   made.setAttribute("flow", new THREE.Float32BufferAttribute(flows, 2));
   made.setIndex(index);
   const flat = made.toNonIndexed();
   made.dispose();
   strips.push(flat);
  };
  // La lámina de debajo, a todo lo ancho.
  strip({ across: 0, width: fall.width, reach: fall.reach * 0.86, speed: 0.5, tag: random(), body: true, lift: 0.02 });
  const COUNT = 5, slot = fall.width / COUNT;
  for (let k = 0; k < COUNT; k++) {
   strip({ across: -fall.width / 2 + slot * (k + 0.5) + (random() - 0.5) * slot * 0.3, width: slot * (0.5 + random() * 0.42), reach: fall.reach * (0.94 + random() * 0.22), speed: 0.55 + random() * 0.6, tag: random(), body: false, lift: 0.05 });
  }
 }
 return mergeGeometries(strips);
}

// Las cascadas: turquesa (no blanco), con vetas más claras que caen y desgarros
// por los que la tira se abre. Brillan lo justo: solo las vetas rozan el umbral del resplandor.
export function createFallMaterial() {
 const { uTime } = uniforms;
 const material = unlit({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
 const at = uv(), strip = attribute("strip", "vec2"), flow = attribute("flow", "vec2");
 const fall = at.y.mul(0.17).add(uTime.mul(strip.x)).add(strip.y.mul(9));
 const streaks = texture(noiseTexture, vec2(at.x.mul(0.3).add(strip.y), fall)).r;
 const fine = texture(noiseTexture, vec2(at.x.mul(0.7).add(strip.y.mul(3.1)), fall.mul(2.4))).g;
 const light = smoothstep(0.42, 0.72, streaks.mul(0.6).add(fine.mul(0.5)));
 // Espuma (en el labio y donde bate): blanca verdosa, a borbotones.
 const froth = flow.x.mul(fine.mul(0.9).add(0.35)).clamp(0, 1);
 material.colorNode = mix(mix(vec3(0.06, 0.42, 0.47), vec3(0.4, 1.12, 1.06), light), vec3(0.74, 1.2, 1.14), froth);
 // (Donde la lámina va entera —tendida y en el labio— no hay desgarros.)
 const tear = smoothstep(0.3, 0.44, texture(noiseTexture, vec2(strip.y.mul(5.3), fall.mul(0.45))).g).max(flow.y);
 material.opacityNode = smoothstep(0, 0.28, at.x).mul(smoothstep(1, 0.72, at.x)).mul(light.mul(0.35).add(0.55)).mul(tear);
 return material;
}
