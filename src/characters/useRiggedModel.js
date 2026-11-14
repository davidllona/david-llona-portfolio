import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { color as tslColor, mix, normalView, smoothstep, vec3 } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { uniforms } from "../experience/theme";
import { AnimationController } from "./AnimationController";

// Carga un personaje riggeado y lo deja listo para la escena:
//  · sustituye sus materiales por otros facetados y baratos, con los colores
//    de `palette` (por nombre de material del GLB) o los originales;
//  · crea su controlador de animación;
//  · localiza sus sockets (huesos vacíos donde enganchar objetos).
// Cristal de un visor: oscuro de frente, con el cielo reflejado (más claro
// arriba y en el borde, donde se mira de refilón) y un brillo fijo arriba a la
// izquierda. No recibe luces: es el mismo de día, de noche y a la sombra, y el
// cielo que refleja es el del momento.
function createGlass(color) {
 const material = new MeshBasicNodeMaterial();
 const n = normalView.normalize();
 const rim = n.z.abs().oneMinus().pow(1.6); // 0 de frente, 1 en el borde
 const sky = mix(uniforms.uSkyHorizon, uniforms.uSkyTop, n.y.mul(0.5).add(0.5)).mul(uniforms.uNight.mul(0.45).oneMinus()).add(vec3(0.05, 0.07, 0.16));
 const body = mix(tslColor(color), sky, n.y.mul(0.5).add(0.5).mul(0.42).add(rim.mul(0.5)).clamp(0, 0.9));
 const glint = smoothstep(0.9, 0.97, n.dot(vec3(-0.42, 0.52, 0.74).normalize()));
 const streak = smoothstep(0.8, 0.9, n.dot(vec3(0.5, -0.3, 0.81).normalize())).mul(0.16);
 material.colorNode = body.add(vec3(1, 0.98, 0.94).mul(glint.mul(0.85).add(streak)));
 return material;
}

//  · `clips`: clips hechos por código; el que se llame como uno del GLB lo sustituye.
export function useRiggedModel(url, { palette = {}, aliases, events, onEvent, sockets = [], clips = [] }) {
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
     const material = spec.glass ? createGlass(spec.color) : new THREE.MeshLambertMaterial({
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
  const controller = new AnimationController(scene, [...animations.filter((one) => !clips.some((own) => own.name === one.name)), ...clips], { aliases, events, onEvent });
  return { scene, controller, sockets: found };
  // La paleta y los eventos son constantes de cada personaje.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [scene, animations]);

 useEffect(() => () => model.controller.dispose(), [model]);

 return model;
}
