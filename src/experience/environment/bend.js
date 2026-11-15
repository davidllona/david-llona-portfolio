import { Box3, Matrix4, Vector3 } from "three";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";
import { NodeMaterial } from "three/webgpu";
import { PLANET } from "../state";
import { PI, cameraProjectionMatrix, cameraViewMatrix, cos, modelWorldMatrix, positionLocal, renderGroup, select, sin, uniform, vec3, vec4 } from "three/tsl";

// El mundo se curva de verdad. Andando, el suelo es plano; al subir con la nave
// cada vértice de la escena se enrolla sobre una esfera cuyo radio va bajando
// de infinito (plano) hasta el del planeta: la isla se cierra sobre sí misma y
// su mar llega hasta el antípoda. No hay otro modelo ni cambio de escena: son
// los mismos árboles, casas, río y luces, desplazados en el sombreador de
// vértices («planeta diminuto»).
//
// Solo se curva la posición en pantalla. La luz, las sombras, la niebla, la
// espuma y todo lo que un material calcula con la posición del mundo se siguen
// haciendo en plano: por eso al andar no cambia nada y arriba todo casa.
//
// El eje del planeta pasa por el origen (la plataforma de la nave) y la esfera
// toca el plano y = 0 en el polo: su centro está en (0, −radio, 0).
export { PLANET };
// Curvatura actual: 1 / radio efectivo. 0 = plano.
// (Va en el grupo de uniformes del render, que se actualiza una vez por
// fotograma para todos. Como uniforme «de objeto», three solo lo refresca en
// el primero de los objetos que comparten sombreador —pasa con los materiales
// clásicos iguales: las losas de la pista y del campo— y los demás se quedaban
// con la curvatura de fotogramas atrás.)
export const uCurve = uniform(0).setGroup(renderGroup);
// Cuánto del mar lejano está ya «cerrado» (0 en tierra: el mar se funde con el horizonte).
export const uClosed = uniform(0).setGroup(renderGroup);

// Punto del mundo plano → punto del mundo curvo (nodos TSL).
//  · a lo largo del suelo se conserva la distancia al polo (arco);
//  · la altura se conserva a lo largo del radio;
//  · lo que queda más allá del antípoda se recoge en él.
export function bendWorld(p) {
 const d = p.xz.length();
 const dir = p.xz.div(d.max(1e-4));
 const arc = d.min(PI.div(uCurve.max(1e-6)));
 const angle = arc.mul(uCurve);
 const small = angle.lessThan(1e-3);
 // (sen a / a y (1 − cos a) / a, sin dividir por cero cuando el mundo es plano.)
 const sinc = select(small, 1, sin(angle).div(angle.max(1e-3)));
 const cosc = select(small, angle.mul(0.5), cos(angle).oneMinus().div(angle.max(1e-3)));
 const out = arc.mul(sinc).add(p.y.mul(sin(angle)));
 const up = p.y.mul(cos(angle)).sub(arc.mul(cosc));
 // Con curvatura cero se devuelve el punto tal cual, bit a bit.
 return select(uCurve.lessThanEqual(0), p, vec3(dir.x.mul(out), up, dir.y.mul(out)));
}

// Lo mismo en JavaScript (para colocar cosas rígidas y para las pruebas).
export function bendPoint(x, y, z, curve = uCurve.value) {
 if (curve <= 0) return [x, y, z];
 const d = Math.hypot(x, z);
 const arc = Math.min(d, Math.PI / curve);
 const angle = arc * curve;
 const out = (1 / curve + y) * Math.sin(angle);
 const up = (1 / curve + y) * Math.cos(angle) - 1 / curve;
 return d > 1e-6 ? [(x / d) * out, up, (z / d) * out] : [0, up, 0];
}

// Se aplica a todos los materiales en un solo sitio: donde three calcula la
// posición en pantalla. Quedan fuera los que llevan `userData.flat` (cielo,
// astros, la nave, que va rígida), el pase de sombras (el mapa de sombras es
// plano, como la luz) y los rectángulos del posproceso.
const project = NodeMaterial.prototype.setupModelViewProjection;
NodeMaterial.prototype.setupModelViewProjection = function (builder) {
 if (this.isShadowPassMaterial || this.userData?.flat || builder.object?.isQuadMesh) return project.call(this, builder);
 return cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(bendWorld(modelWorldMatrix.mul(positionLocal).xyz), 1)));
};

// Un triángulo solo se curva por sus vértices: entre ellos sigue recto. Sobre
// un planeta de 32 m de radio, una losa de 20 m hecha con dos triángulos se
// hundiría metro y medio bajo el suelo. Esto recorre lo montado y parte las caras
// largas (pistas, campo, largueros de las vallas…) hasta que ninguna pase de
// `coarse` metros: se hunden, como mucho, 10 cm. Lo que es una lámina tendida
// (losas, líneas pintadas, manchas de luz: menos de `THIN` de alto) va pegado
// al suelo o a otra lámina, a milímetros: esas se parten a `fine` metros (se
// hunden 4 mm) para que no se crucen. Los dos topes salen del radio del planeta. Se hace una vez, al terminar de montarse
// el mundo y antes de compilarlo. Lo que ya es fino (el terreno, los modelos)
// ni se toca.
const SPLIT = new Set(["position", "normal", "color", "uv", "uv1"]);
const THIN = 0.4;
// (Una cuerda de largo L se hunde L² / 8R.)
const chord = (sag) => Math.sqrt(8 * PLANET.radius * sag);
export function splitLongFaces(root, coarse = chord(0.1), fine = chord(0.004)) {
 const done = new Map();
 const box = new Box3(), size = new Vector3(), scale = new Vector3(), a = new Vector3(), b = new Vector3(), matrix = new Matrix4();
 root.updateMatrixWorld(true);
 root.traverse((object) => {
  const geometry = object.geometry;
  if (!object.isMesh || object.isSkinnedMesh || !geometry?.attributes?.position || geometry.isInstancedBufferGeometry || object.userData.coarse) return;
  if ([].concat(object.material ?? []).some((material) => material.userData?.flat)) return;
  if (geometry.morphAttributes?.position || Object.keys(geometry.attributes).some((name) => !SPLIT.has(name))) return;
  // Cuánto estira el objeto cada eje (en las mallas con instancias, la que más).
  scale.setFromMatrixScale(object.matrixWorld);
  if (object.isInstancedMesh) {
   const most = new Vector3();
   for (let i = 0; i < object.count; i++) {
    object.getMatrixAt(i, matrix);
    most.max(a.setFromMatrixScale(matrix));
   }
   scale.multiply(most);
  }
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  box.copy(geometry.boundingBox).getSize(size).multiply(scale);
  // (El alto se mide en el mundo: una lámina puede venir girada.)
  const tall = box.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld).getSize(a).y;
  const longest = !object.isInstancedMesh && tall < THIN ? fine : Math.min(size.x, size.y, size.z) < THIN && object.isInstancedMesh ? fine * 2 : coarse;
  if (Math.max(size.x, size.y, size.z) <= longest) return;
  // ¿Alguna arista larga de verdad?
  const points = geometry.attributes.position, index = geometry.index;
  const count = index ? index.count : points.count;
  let long = false;
  for (let i = 0; i < count && !long; i += 3) {
   for (let k = 0; k < 3 && !long; k++) {
    a.fromBufferAttribute(points, index ? index.getX(i + k) : i + k).multiply(scale);
    b.fromBufferAttribute(points, index ? index.getX(i + ((k + 1) % 3)) : i + ((k + 1) % 3)).multiply(scale);
    long = a.distanceTo(b) > longest;
   }
  }
  if (!long) return;
  const key = `${geometry.uuid}:${Math.round(Math.max(scale.x, scale.y, scale.z) * 10)}:${longest}`;
  if (!done.has(key)) {
   // (El modificador trabaja en las medidas del modelo: se le da el tope dividido por lo que el objeto lo estira.)
   const split = new TessellateModifier(longest / Math.max(scale.x, scale.y, scale.z), 12).modify(geometry);
   split.boundingBox = geometry.boundingBox.clone();
   if (geometry.boundingSphere) split.boundingSphere = geometry.boundingSphere.clone();
   done.set(key, split);
  }
  object.geometry = done.get(key);
 });
 return done.size;
}

// three reutiliza el sombreador entre materiales «iguales» y para decidirlo no
// mira `userData`: sin esto, uno rígido y otro curvo con los mismos ajustes
// compartirían el del primero que se compilase.
const programKey = NodeMaterial.prototype.customProgramCacheKey;
NodeMaterial.prototype.customProgramCacheKey = function () {
 return programKey.call(this) + (this.userData?.flat ? "·rígido" : "");
};

// Marca como rígidos (sin curvar) los materiales de un objeto y de lo que cuelga de él.
export function keepFlat(root) {
 root.traverse((object) => {
  for (const material of [].concat(object.material ?? [])) material.userData.flat = true;
 });
}
