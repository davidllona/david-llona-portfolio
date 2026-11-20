import * as THREE from "three";
import { diffuseColor, normalView, vec3 } from "three/tsl";
import { withSeeThrough } from "../../experience/environment/seeThrough";
import { lambert } from "../../experience/materials";
import { createGlowTexture } from "../../experience/textures";
import { registerGlow } from "../../experience/theme";

// Materiales de The Twisted Moon.
// Lo sólido: el facetado de siempre, con colores de vértice, y recortable
// alrededor del astronauta cuando lo tapa (una casa, un árbol).
export const solid = (options) => withSeeThrough(lambert(options));

// Cristal encendido (ventanas, faroles, balizas): solo emite, no refleja las
// luces de la escena. Devuelve el material y cómo apagarlo del registro.
export function glass(color) {
 const material = new THREE.MeshLambertMaterial({ color: "#000000", emissive: color });
 const stop = registerGlow(material, 0.9, 1.3);
 return { material, dispose: () => (stop(), material.dispose()) };
}

// Charco de luz cálida en el suelo: una mancha que suma luz, bien marcada.
export function pool(color = "#ffa24a", strength = 0.5) {
 const map = createGlowTexture();
 const material = new THREE.MeshBasicMaterial({ map, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
 const stop = registerGlow(material, 0, strength, "opacity");
 return { material, dispose: () => (stop(), map.dispose(), material.dispose()) };
}

// Luz de luna de relleno para lo que crece: la luna está al fondo, así que la
// cara que mira a la cámara no la recibe y las copas quedaban en silueta negra.
// Se les suma un tono medio propio (su color, enfriado) y un borde frío en lo
// que se ve de refilón: la luna las recorta. Las sombras del suelo no cambian.
export function moonlit(material, fill, edge) {
 const n = normalView.normalize();
 const rim = n.z.abs().oneMinus().pow(2).mul(n.y.mul(0.5).add(0.8).clamp(0, 1));
 material.emissiveNode = diffuseColor.rgb.mul(vec3(0.72, 0.82, 1.0)).mul(fill).add(vec3(0.42, 0.55, 0.95).mul(rim).mul(edge));
 return material;
}
