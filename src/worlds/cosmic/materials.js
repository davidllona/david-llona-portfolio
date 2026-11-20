import * as THREE from "three";
import { attribute, diffuseColor, float, hash, instanceIndex, mix, normalView, positionGeometry, positionLocal, sin, texture, vec2, vec3 } from "three/tsl";
import { noiseTexture } from "../../experience/environment/noise";
import { withSeeThrough } from "../../experience/environment/seeThrough";
import { withWind } from "../../experience/environment/wind";
import { lambert, unlit } from "../../experience/materials";
import { uniforms } from "../../experience/theme";

// Materiales de The Cosmic Lab.
const LIT = () => attribute("lit", "float");

// Lo sólido: el facetado de siempre, recortable alrededor del astronauta cuando lo tapa.
export const solid = (options) => withSeeThrough(lambert(options));

// Algo que se enciende: `power` (un uniforme, de 0 a 1) dice cuánta energía le
// llega. Apagado, sus luces son cristal oscuro; encendido, emiten su color por
// encima del umbral del resplandor (llevan halo).
export function powered(power, { gain = 1.75, dim = 0.16 } = {}) {
 const material = withSeeThrough(lambert({ vertexColors: false }));
 const tint = attribute("color", "vec3"), lit = LIT();
 material.colorNode = tint.mul(mix(float(1), mix(float(dim), float(1), power), lit));
 material.emissiveNode = tint.mul(lit).mul(power).mul(gain);
 return material;
}

// Lo que crece: cada copia lleva su color. Lo que lleva `lit` brilla siempre un
// poco (lunares, perlas, cristales). `beat`: late —se hincha y brilla al compás,
// cada copia a su ritmo—; `sway`: se mece con el viento.
export function growing({ gain = 1.3, beat = false, sway = 0, cut = false, side = THREE.FrontSide } = {}) {
 let material = lambert({ side });
 const lit = LIT();
 const pulse = beat ? sin(uniforms.uTime.mul(hash(instanceIndex).mul(1.1).add(1.7)).add(hash(instanceIndex.add(7)).mul(6.28))).mul(0.5).add(0.5) : float(1);
 material.emissiveNode = diffuseColor.rgb.mul(lit).mul(beat ? pulse.mul(0.9).add(0.5) : float(1)).mul(gain);
 // (La bolsa del bulbo se hincha desde su centro, a 0,78 m del suelo. Con instancias, `positionLocal` ya
 // lleva la copia colocada: el empuje se calcula en las medidas del modelo, y por eso los bulbos no van girados.)
 if (beat) material.positionNode = positionLocal.add(positionGeometry.sub(vec3(0, 0.78, 0)).mul(lit).mul(pulse.mul(0.22)));
 if (sway) material = withWind(material, { flex: sway, power: 1.8, cap: 3 });
 return cut ? withSeeThrough(material) : material;
}

// Rocas que flotan: suben y bajan despacio, cada una a su compás (`bob`, por copia: fase y recorrido).
export function floating() {
 const material = lambert();
 const seed = hash(instanceIndex);
 material.positionNode = positionLocal.add(vec3(0, sin(uniforms.uTime.mul(seed.mul(0.4).add(0.45)).add(seed.mul(40))).mul(0.3), 0));
 material.emissiveNode = diffuseColor.rgb.mul(LIT()).mul(1.5);
 return material;
}

// Cristal: casi no se ve de frente y se enciende en los bordes (lo que mira de refilón).
export function glassy(tint = "#9ff5ee", { body = 0.1, rim = 0.62 } = {}) {
 const material = unlit({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
 const edge = normalView.normalize().z.abs().oneMinus();
 const colour = new THREE.Color(tint);
 material.colorNode = mix(vec3(colour.r, colour.g, colour.b), vec3(1, 1, 1), edge.pow(2));
 material.opacityNode = edge.pow(1.6).mul(rim).add(body);
 return material;
}

// El líquido que corre por un tubo: apagado, cristal oscuro; con energía, bandas turquesa que avanzan hacia el núcleo.
export function flowing(power) {
 const material = withSeeThrough(lambert({ vertexColors: false }));
 const along = attribute("along", "float");
 const band = sin(along.mul(2.6).sub(uniforms.uTime.mul(5))).mul(0.5).add(0.5);
 material.colorNode = mix(vec3(0.11, 0.09, 0.24), vec3(0.2, 0.75, 0.72), power);
 material.emissiveNode = vec3(0.32, 1.0, 0.92).mul(band.pow(2).mul(1.5).add(0.25)).mul(power);
 return material;
}

// El líquido brillante de las charcas y de los lagos: turquesa que emite, con manchas más claras que derivan.
export function liquid() {
 const material = unlit();
 const at = positionLocal.xz, { uTime } = uniforms;
 const drift = vec2(uTime.mul(0.014), uTime.mul(-0.01));
 const cells = texture(noiseTexture, at.mul(0.11).add(drift)).r.mul(0.6).add(texture(noiseTexture, at.mul(0.27).sub(drift.mul(1.8))).g.mul(0.4));
 material.colorNode = mix(vec3(0.1, 0.78, 0.74), vec3(0.62, 1.28, 1.02), cells.smoothstep(0.42, 0.7));
 return material;
}

// El rayo de energía: una columna de luz con pulsos que la recorren hacia el núcleo.
export function beam(power, strength = 1) {
 const material = unlit({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
 const run = sin(positionLocal.y.mul(26).sub(uniforms.uTime.mul(9))).mul(0.5).add(0.5);
 material.colorNode = vec3(0.86, 1.25, 0.36).mul(run.mul(0.6).add(0.7)).mul(strength);
 material.opacityNode = power.mul(strength);
 return material;
}
