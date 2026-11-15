import * as THREE from "three";
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
