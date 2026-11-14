import * as THREE from "three";
import { float, positionView, screenUV, smoothstep, uniform, vec2 } from "three/tsl";
import { player } from "../state";

// Hueco de visión: lo que queda entre la cámara y el astronauta (una copa, una
// roca, una casa, el pozo, el cohete) se recorta a su alrededor, para no
// perderlo nunca de vista. Es un círculo limpio en pantalla: dentro no queda
// nada de lo que tapa y el borde se funde con mezcla de verdad (sin tramado).
// En profundidad también es gradual: lo que está justo delante de él apenas cede.
//
// Estos materiales siguen siendo opacos para el renderer (escriben profundidad y
// van en su lista de opacos, que es la que ahorra píxeles): solo llevan la
// mezcla activada. Para que el borde se funda con lo que hay detrás, se dibujan
// después del resto de lo opaco (`seeThroughOrder`); y el césped, que es lo más
// caro de pintar, después de ellos, para que una copa o una casa le sigan
// ahorrando lo que tapan. (Sacarlos a la lista de lo translúcido costaba 6 fps.)

// Radio del recorte, en fracciones del alto de la pantalla: limpio hasta
// `CLEAR`, y de ahí a `EDGE` se va cerrando.
const CLEAR = 0.105, EDGE = 0.17;

// Dónde está el astronauta en pantalla (0–1), a qué profundidad, y el aspecto de la ventana.
const view = { screen: uniform(new THREE.Vector2(0.5, 0.5)), depth: uniform(-20), aspect: uniform(1.6) };
const point = new THREE.Vector3();

export function withSeeThrough(material) {
 const fromPlayer = screenUV.sub(view.screen).mul(vec2(view.aspect, 1)).length();
 const inFront = smoothstep(view.depth.add(0.35), view.depth.add(1.5), positionView.z);
 const hole = smoothstep(EDGE, CLEAR, fromPlayer).mul(inFront);
 material.opacityNode = float(1).sub(hole);
 // Mezcla por alfa sin declararse translúcido (three solo la activa en lo opaco si es «a medida»).
 material.blending = THREE.CustomBlending;
 material.blendSrc = THREE.SrcAlphaFactor;
 material.blendDst = THREE.OneMinusSrcAlphaFactor;
 material.alphaTest = 0.02; // dentro del círculo no queda nada: ni color ni profundidad
 material.userData.seeThrough = true;
 return material;
}

// Lo que debe dibujarse después de lo recortable (el césped): ver arriba.
export function drawAfterSeeThrough(material) {
 material.userData.afterSeeThrough = true;
 return material;
}

// Orden de lo opaco: lo de siempre (de cerca a lejos), luego lo recortable y, al final, el césped.
const turn = (item) => (item.material.userData.afterSeeThrough ? 2 : item.material.userData.seeThrough ? 1 : 0);
export function seeThroughOrder(a, b) {
 if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
 const first = turn(a) - turn(b);
 if (first !== 0) return first;
 if (a.renderOrder !== b.renderOrder) return a.renderOrder - b.renderOrder;
 if (a.z !== b.z) return a.z - b.z;
 return a.id - b.id;
}

// Se llama una vez por fotograma, con la cámara ya colocada.
export function updateSeeThrough(camera, size) {
 point.copy(player.position).setY(player.position.y + 1).applyMatrix4(camera.matrixWorldInverse);
 view.depth.value = player.hidden ? -1e4 : point.z;
 point.applyMatrix4(camera.projectionMatrix);
 view.screen.value.set(point.x * 0.5 + 0.5, 0.5 - point.y * 0.5);
 view.aspect.value = size.width / size.height;
}
