import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";

// Edificios modelados en Blender (tools/blender/build.py → public/models/living).
// Cada GLB trae una sola malla con colores de vértice —el juego le pone su
// material facetado— y unas «anclas» con nombre: dónde van las piezas que se
// montan aparte (cristales con luz, la captura del proyecto, el rótulo, el humo).
export const buildingUrl = (name) => `/models/living/${name}.glb`;

// Devuelve { geometry, anchors }. Cada ancla: { position, rotation, size }, con
// `size` = [ancho, alto, fondo] de la pieza que va en ella.
export function useBuilding(name) {
 const { scene } = useGLTF(buildingUrl(name));
 return useMemo(() => {
  let geometry = null;
  const anchors = {};
  scene.updateMatrixWorld(true);
  scene.traverse((node) => {
   if (node.isMesh) {
    geometry = node.geometry;
    // Sin normales en el archivo: el material es facetado y las deduce, pero
    // las sombras y los límites las quieren calculadas.
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
   } else if (node !== scene && node.name) {
    anchors[node.name] = { position: node.position.toArray(), rotation: [node.rotation.x, node.rotation.y, node.rotation.z], size: node.scale.toArray() };
   }
  });
  return { geometry, anchors };
 }, [scene]);
}

export const preloadBuilding = (name) => useGLTF.preload(buildingUrl(name));
