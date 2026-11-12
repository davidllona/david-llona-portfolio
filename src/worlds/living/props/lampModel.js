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
