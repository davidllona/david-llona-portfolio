import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { attribute, float, vec3 } from "three/tsl";
import { withSeeThrough } from "../../../experience/environment/seeThrough";
import { lambert } from "../../../experience/materials";
import { uniforms } from "../../../experience/theme";

// Edificios hechos con los modelos descargados (docs/CREDITOS.md), ya
// convertidos por tools/assets/buildings.py: una malla por edificio, sin
// materiales ni texturas, con el color en los vértices, apoyada en y = 0,
// centrada en planta y con su lado mayor en planta de 1 (el tamaño se lo da
// quien lo monta, con `scale`).
export const modelUrl = (name) => `/models/living/buildings/${name}.glb`;
export const preloadModel = (name) => useGLTF.preload(modelUrl(name));

// El color exacto con el que la conversión pinta las ventanas (ver `GLASS` en
// buildings.py): de noche, lo que tenga ese color se enciende.
const GLASS = vec3(1.0, 0.82, 0.5);

// Devuelve la geometría del modelo, lista para dibujar.
export function useModel(name) {
 const { scene } = useGLTF(modelUrl(name));
 const geometry = useMemo(() => {
  let source = null;
  scene.traverse((node) => node.isMesh && (source = node.geometry));
  const made = new THREE.BufferGeometry();
  made.setAttribute("position", source.attributes.position);
  made.setIndex(source.index);
  // (El color viene con cuatro componentes y normalizado: se queda en tres, en coma flotante.)
  const from = source.attributes.color;
  const colors = new Float32Array(from.count * 3);
  for (let i = 0; i < from.count; i++) colors.set([from.getX(i), from.getY(i), from.getZ(i)], i * 3);
  made.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  made.computeVertexNormals();
  made.computeBoundingBox();
  made.computeBoundingSphere();
  return made;
 }, [scene]);
 useEffect(() => () => geometry.dispose(), [geometry]);
 return geometry;
}

// Material de los edificios: facetado, con el color de los vértices; las
// ventanas brillan de noche y, si tapa al astronauta, se vuelve translúcido a
// su alrededor (`seeThrough`).
export function createModelMaterial({ seeThrough = true, glow = 1.25 } = {}) {
 const material = lambert({ side: THREE.DoubleSide });
 const colour = attribute("color", "vec3");
 const window = float(1).sub(colour.sub(GLASS).length().mul(30).clamp(0, 1)); // 1 solo en el color de las ventanas
 material.emissiveNode = vec3(1, 0.74, 0.42).mul(window).mul(uniforms.uGlow).mul(glow);
 return seeThrough ? withSeeThrough(material) : material;
}
