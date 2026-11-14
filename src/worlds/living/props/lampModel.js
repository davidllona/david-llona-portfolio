import * as THREE from "three";
import { limb, merge, piece, tube } from "../kit/geometry";
import { ROCK, WOOD } from "../kit/palette";

// Farola: poste de madera que se curva, brazo y farol colgante. El cristal
// encendido va aparte, en LAMP_GLASS (posición respecto al pie).
export const LAMP_GLASS = [-0.62, 2.82, 0];
export function createLamp() {
 const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
 return merge([
  piece(tube([[0, 0, 0], [0.05, 1.6, 0], [0.0, 2.9, 0], [-0.25, 3.35, 0], [-0.7, 3.45, 0]], (t) => 0.1 - t * 0.045, { sides: 6, segments: 8 }), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.08 }),
  piece(new THREE.CylinderGeometry(0.2, 0.26, 0.22, 7), { color: ROCK.mid, jitter: 0.02, position: [0, 0.11, 0] }),
  piece(limb(0.012, 0.012, 0.3, 4), { color: "#3b3836", position: [-0.62, 3.1, 0] }),
  piece(new THREE.ConeGeometry(0.24, 0.2, 4), { color: WOOD.dark, position: [-0.62, 3.1, 0], rotation: [0, Math.PI / 4, 0] }),
  piece(box(0.3, 0.04, 0.3), { color: WOOD.dark, position: [-0.62, 2.62, 0] }),
  ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => piece(box(0.03, 0.4, 0.03), { color: WOOD.dark, position: [-0.62 + x * 0.13, 2.82, z * 0.13] })),
 ]);
}

// Farola del planeta: poste recto de madera sobre un dado de piedra, brazo de
// hierro con su tornapunta y un farol de hierro colgado, con tejadillo y
// cuatro montantes. El cristal va aparte (LANTERN_GLASS, respecto al pie),
// para poder encenderlo de noche.
const IRON = "#2c2f36";
export const LANTERN_GLASS = [-0.66, 2.2, 0];
export const LANTERN_GLASS_SIZE = [0.2, 0.3, 0.2];
export function createLantern() {
 const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
 const [gx, gy] = LANTERN_GLASS;
 return merge([
  // Dado de piedra y poste, algo más fino arriba, con su remate.
  piece(new THREE.CylinderGeometry(0.2, 0.27, 0.26, 6), { bottom: ROCK.dark, top: ROCK.light, position: [0, 0.13, 0] }),
  piece(limb(0.095, 0.07, 2.72, 6), { bottom: WOOD.dark, top: WOOD.mid, vary: 0.08, position: [0, 0.2, 0] }),
  piece(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 6), { color: WOOD.dark, position: [0, 2.93, 0] }),
  piece(new THREE.ConeGeometry(0.09, 0.14, 6), { color: WOOD.dark, position: [0, 3.02, 0] }),
  // Abrazadera, brazo y tornapunta de hierro.
  piece(new THREE.CylinderGeometry(0.095, 0.095, 0.07, 6), { color: IRON, position: [0, 2.66, 0] }),
  piece(box(0.82, 0.05, 0.05), { color: IRON, position: [-0.37, 2.66, 0] }),
  piece(box(0.56, 0.035, 0.035), { color: IRON, position: [-0.22, 2.44, 0], rotation: [0, 0, -0.82] }),
  piece(box(0.06, 0.06, 0.06), { color: IRON, position: [-0.8, 2.66, 0], rotation: [0, 0, Math.PI / 4] }),
  // Cadena y farol: tejadillo a cuatro aguas, montantes, base y remate.
  piece(box(0.022, 0.16, 0.022), { color: IRON, position: [gx, 2.56, 0] }),
  piece(new THREE.ConeGeometry(0.23, 0.16, 4), { color: IRON, position: [gx, gy + 0.25, 0], rotation: [0, Math.PI / 4, 0] }),
  piece(box(0.3, 0.03, 0.3), { color: IRON, position: [gx, gy + 0.165, 0] }),
  ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => piece(box(0.026, 0.32, 0.026), { color: IRON, position: [gx + x * 0.115, gy, z * 0.115] })),
  piece(box(0.28, 0.035, 0.28), { color: IRON, position: [gx, gy - 0.17, 0] }),
  piece(new THREE.ConeGeometry(0.05, 0.09, 4), { color: IRON, position: [gx, gy - 0.23, 0], rotation: [Math.PI, Math.PI / 4, 0] }),
 ]);
}
