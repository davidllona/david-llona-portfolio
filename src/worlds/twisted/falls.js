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
   sheet.rotateY(fall.turn).translate(fall.x, (fall.top + fall.bottom) / 2 - 0.2, fall.z);
   const flat = sheet.toNonIndexed();
   sheet.dispose();
   flat.deleteAttribute("normal");
   strips.push(flat);
  }
 }
 return mergeGeometries(strips);
}

// Las cascadas: turquesa (no blanco), con vetas más claras que caen y desgarros
// por los que la tira se abre. Brillan lo justo: solo las vetas rozan el umbral del resplandor.
export function createFallMaterial() {
 const { uTime } = uniforms;
 const material = unlit({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
 const at = uv(), strip = attribute("strip", "vec2");
 const fall = at.y.mul(0.17).add(uTime.mul(strip.x)).add(strip.y.mul(9));
 const streaks = texture(noiseTexture, vec2(at.x.mul(0.3).add(strip.y), fall)).r;
 const fine = texture(noiseTexture, vec2(at.x.mul(0.7).add(strip.y.mul(3.1)), fall.mul(2.4))).g;
 const light = smoothstep(0.42, 0.72, streaks.mul(0.6).add(fine.mul(0.5)));
 material.colorNode = mix(vec3(0.06, 0.42, 0.47), vec3(0.4, 1.12, 1.06), light);
 const tear = smoothstep(0.3, 0.44, texture(noiseTexture, vec2(strip.y.mul(5.3), fall.mul(0.45))).g);
 material.opacityNode = smoothstep(0, 0.28, at.x).mul(smoothstep(1, 0.72, at.x)).mul(light.mul(0.35).add(0.55)).mul(tear);
 return material;
}
