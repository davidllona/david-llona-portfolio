import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

// Modelos convertidos de The Cosmic Lab (public/models/cosmic; ver
// tools/assets/cosmic.py y docs/CREDITOS.md): una sola malla, sin materiales,
// con el color en los vértices y el lado mayor en planta = 1.
export const MODEL_URL = (name) => `/models/cosmic/${name}.glb`;

// La geometría de uno, lista para los materiales del mundo: posición, color y
// `lit` (cuánto emite cada vértice).
//  · `lit` sin dar: lo que el modelo trae pintado en un color vivo —lima,
//    turquesa o magenta: pantallas, luces, líquido— emite; el resto, no;
//  · `lit` con un número: todo el modelo emite eso (cristales, coral).
export function useLabModel(name, { lit } = {}) {
 const { scene } = useGLTF(MODEL_URL(name));
 const geometry = useMemo(() => {
  let source = null;
  scene.traverse((node) => node.isMesh && (source = node.geometry));
  const made = new THREE.BufferGeometry();
  made.setAttribute("position", source.attributes.position);
  made.setIndex(source.index);
  const from = source.attributes.color;
  const colors = new Float32Array(from.count * 3), glow = new Float32Array(from.count);
  for (let i = 0; i < from.count; i++) {
   const r = from.getX(i), g = from.getY(i), b = from.getZ(i);
   colors.set([r, g, b], i * 3);
   const most = Math.max(r, g, b), least = Math.min(r, g, b);
   glow[i] = lit ?? (most > 0.72 && (most - least) / most > 0.5 ? 1 : 0);
  }
  made.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  made.setAttribute("lit", new THREE.BufferAttribute(glow, 1));
  made.computeVertexNormals();
  made.computeBoundingSphere();
  return made;
 }, [scene, lit]);
 useEffect(() => () => geometry.dispose(), [geometry]);
 return geometry;
}
export const preloadLabModel = (name) => useGLTF.preload(MODEL_URL(name));
