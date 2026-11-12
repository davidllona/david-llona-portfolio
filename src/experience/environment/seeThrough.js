import * as THREE from "three";
import { dot, fract, positionView, screenCoordinate, screenUV, smoothstep, step, uniform, vec2 } from "three/tsl";
import { player } from "../state";

// Hueco de visión: lo que queda entre la cámara y el astronauta (una copa, una
// roca, una casa) se vuelve translúcido a su alrededor, para no perderlo nunca
// de vista. La transparencia se hace con un tramado fino por píxel en vez de
// mezcla alfa: así no hay que ordenar miles de instancias y las sombras siguen
// funcionando. El borde es suave en pantalla (se desvanece con la distancia al
// astronauta) y en profundidad (lo que está justo delante de él apenas cede).
// (La idea viene del follaje de folio-2025, de Bruno Simon, MIT.)

// Dónde está el astronauta en pantalla (0–1), a qué profundidad, y el aspecto de la ventana.
const view = { screen: uniform(new THREE.Vector2(0.5, 0.5)), depth: uniform(-20), aspect: uniform(1.6) };
const point = new THREE.Vector3();

// `strength`: cuánto llega a deshacerse en el centro (1 = desaparece del todo).
export function withSeeThrough(material, { strength = 0.88 } = {}) {
 const fromPlayer = screenUV.sub(view.screen).mul(vec2(view.aspect, 1)).length();
 const inFront = smoothstep(view.depth.add(0.35), view.depth.add(1.5), positionView.z);
 const hole = smoothstep(0.26, 0.08, fromPlayer).mul(inFront).mul(strength);
 const grain = fract(fract(dot(screenCoordinate.xy, vec2(0.06711056, 0.00583715))).mul(52.9829189));
 material.opacityNode = step(hole, grain.mul(0.98).add(0.01));
 material.alphaTest = 0.5;
 return material;
}

// Se llama una vez por fotograma, con la cámara ya colocada.
export function updateSeeThrough(camera, size) {
 point.copy(player.position).setY(player.position.y + 1).applyMatrix4(camera.matrixWorldInverse);
 view.depth.value = player.hidden ? -1e4 : point.z;
 point.applyMatrix4(camera.projectionMatrix);
 view.screen.value.set(point.x * 0.5 + 0.5, 0.5 - point.y * 0.5);
 view.aspect.value = size.width / size.height;
}
