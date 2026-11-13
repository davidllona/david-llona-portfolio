import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { MODELS } from "./species";

// Carga los modelos de vegetación (public/models/living/flora) y los pinta con
// la gama del planeta. Cada GLB trae una malla sin colores: en su lugar lleva
// una máscara por vértice (r = altura dentro de su parte, g = es hoja, b = un
// valor por masa de hojas) y aquí se convierte en color. De un mismo modelo
// salen así tantos árboles como gamas se le pidan, compartiendo la malla.
const url = (name) => `/models/living/flora/${name}.glb`;
const NAMES = Object.keys(MODELS);
NAMES.forEach((name) => useGLTF.preload(url(name)));

const low = new THREE.Color(), high = new THREE.Color(), mixed = new THREE.Color();

// `shapes`: { nombre: { position, index, mask } } · devuelve una geometría pintada.
//  · bark, leaf: [abajo, arriba] · vary: cuánto cambia de tono cada masa de hojas.
function paint(shape, { bark, leaf, vary = 0.14 }) {
 const { position, index, mask } = shape;
 const colors = new Float32Array(position.count * 3);
 for (let i = 0; i < position.count; i++) {
  const t = mask.getX(i);
  if (mask.getY(i) > 0.5) {
   low.set(leaf[0]);
   high.set(leaf[1]);
   mixed.copy(low).lerp(high, t).multiplyScalar(1 - vary / 2 + mask.getZ(i) * vary);
  } else {
   low.set(bark[0]);
   high.set(bark[1]);
   // El pie del tronco, algo más oscuro: lo asienta en el suelo.
   mixed.copy(low).lerp(high, t).multiplyScalar(0.75 + 0.25 * Math.min(1, position.getY(i) / 2.5));
  }
  colors.set([mixed.r, mixed.g, mixed.b], i * 3);
 }
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", position);
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 geometry.setIndex(index);
 geometry.computeVertexNormals();
 geometry.computeBoundingBox();
 geometry.computeBoundingSphere();
 return geometry;
}

// Devuelve `paint(nombre, gamas)`.
export function useFlora() {
 const files = useGLTF(NAMES.map(url));
 return useMemo(() => {
  const shapes = {};
  const point = new THREE.Vector3();
  files.forEach(({ scene }, n) => {
   scene.updateMatrixWorld(true);
   scene.traverse((node) => {
    if (!node.isMesh) return;
    // El archivo va cuantizado (enteros + la escala en el nodo): se pasa a metros.
    const source = node.geometry.attributes.position;
    const position = new THREE.BufferAttribute(new Float32Array(source.count * 3), 3);
    for (let i = 0; i < source.count; i++) position.setXYZ(i, ...point.fromBufferAttribute(source, i).applyMatrix4(node.matrixWorld).toArray());
    shapes[NAMES[n]] = { position, index: node.geometry.index, mask: node.geometry.attributes.color };
   });
  });
  return (name, palette) => paint(shapes[name], palette);
 }, [files]);
}
