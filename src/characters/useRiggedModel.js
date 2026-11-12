import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { AnimationController } from "./AnimationController";

// Carga un personaje riggeado y lo deja listo para la escena:
//  · sustituye sus materiales por otros facetados y baratos, con los colores
//    de `palette` (por nombre de material del GLB) o los originales;
//  · crea su controlador de animación;
//  · localiza sus sockets (huesos vacíos donde enganchar objetos).
export function useRiggedModel(url, { palette = {}, aliases, events, onEvent, sockets = [] }) {
 const { scene, animations } = useGLTF(url);

 // Los materiales se convierten una sola vez por modelo: la escena que devuelve
 // useGLTF está en caché y se comparte entre montajes (React la pide dos veces
 // en desarrollo), así que la conversión se guarda en la propia escena.
 const model = useMemo(() => {
  if (!scene.userData.materials) {
   const materials = new Map();
   const convert = (original) => {
    if (!materials.has(original.name)) {
     const spec = palette[original.name] ?? {};
     const material = new THREE.MeshLambertMaterial({
      color: spec.color ?? original.color,
      emissive: spec.emissive ?? "#000000",
      emissiveIntensity: spec.glow ?? 0,
      flatShading: true,
     });
     material.name = original.name;
     materials.set(original.name, material);
    }
    return materials.get(original.name);
   };
   scene.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    // La malla se deforma con los huesos: su caja de recorte original no vale.
    node.frustumCulled = false;
    node.material = Array.isArray(node.material) ? node.material.map(convert) : convert(node.material);
   });
   scene.userData.materials = materials;
  }

  const found = Object.fromEntries(sockets.map((name) => [name, scene.getObjectByName(name)]));
  const controller = new AnimationController(scene, animations, { aliases, events, onEvent });
  return { scene, controller, sockets: found };
  // La paleta y los eventos son constantes de cada personaje.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [scene, animations]);

 useEffect(() => () => model.controller.dispose(), [model]);

 return model;
}
