import * as THREE from "three";

// Retoques de huesos encima de la animación, en el espacio del mundo: así sirven
// con cualquier eje local del esqueleto. Los usan la hamaca de la bienvenida
// (intro/hammock.js) y la caricia a Woody (Astronaut.jsx).

const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
const delta = new THREE.Quaternion(), world = new THREE.Quaternion(), parent = new THREE.Quaternion(), none = new THREE.Quaternion();

// Gira `bone` para que la dirección de su hueso (de él a `child`) sea `dir`
// (en el mundo); `weight` < 1 lo deja a medias.
export function aim(bone, child, dir, weight = 1) {
 bone.getWorldPosition(a);
 child.getWorldPosition(b);
 b.sub(a).normalize();
 delta.setFromUnitVectors(b, d.copy(dir).normalize());
 if (weight < 1) delta.slerpQuaternions(none, delta, weight);
 bone.getWorldQuaternion(world);
 bone.parent.getWorldQuaternion(parent);
 bone.quaternion.copy(parent.invert().multiply(delta.multiply(world)));
 bone.updateMatrixWorld(true);
}

// Que ningún tramo de la cadena (huesos seguidos, p. ej. la cola) baje de
// `floor` (y del mundo): si la punta de un tramo queda por debajo, se levanta.
export function keepAbove(chain, floor) {
 for (let i = 0; i < chain.length - 1; i++) {
  chain[i + 1].getWorldPosition(b);
  if (b.y >= floor) continue;
  chain[i].getWorldPosition(a);
  d.copy(b).sub(a);
  d.y = Math.max(d.y, floor - a.y + 0.04 * d.length());
  aim(chain[i], chain[i + 1], d);
 }
}

// Cinemática inversa de dos huesos (brazo y antebrazo): lleva `end` (la
// muñeca) a `target` (en el mundo), con el codo hacia donde ya apuntaba.
// Si no llega, estira el brazo hacia allí. Devuelve lo que le falta (m).
const s = new THREE.Vector3(), e = new THREE.Vector3(), w = new THREE.Vector3(), t = new THREE.Vector3(), axis = new THREE.Vector3(), pole = new THREE.Vector3(), elbow = new THREE.Vector3();
export function reach(upper, lower, end, target) {
 upper.getWorldPosition(s);
 lower.getWorldPosition(e);
 end.getWorldPosition(w);
 const la = s.distanceTo(e), lb = e.distanceTo(w);
 t.copy(target);
 const far = t.distanceTo(s);
 const span = Math.min(Math.max(far, Math.abs(la - lb) + 1e-3), la + lb - 1e-3);
 axis.copy(t).sub(s).normalize();
 // Hacia dónde se dobla el codo: su posición actual, quitada la parte a lo largo del eje.
 pole.copy(e).sub(s);
 pole.addScaledVector(axis, -pole.dot(axis));
 if (pole.lengthSq() < 1e-8) pole.set(0, -1, 0).addScaledVector(axis, -axis.y);
 pole.normalize();
 const along = (la * la - lb * lb + span * span) / (2 * span);
 const out = Math.sqrt(Math.max(0, la * la - along * along));
 elbow.copy(s).addScaledVector(axis, along).addScaledVector(pole, out);
 aim(upper, lower, elbow.sub(s));
 lower.getWorldPosition(e);
 aim(lower, end, t.sub(e));
 return Math.max(0, far - (la + lb));
}
