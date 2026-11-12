import { MeshBasicNodeMaterial, MeshLambertNodeMaterial } from "three/webgpu";

// Materiales de nodos (TSL) del proyecto. El renderer es WebGPU con respaldo
// WebGL2: los materiales clásicos de three (MeshLambertMaterial…) siguen
// valiendo para lo que no necesita sombreador propio, pero todo lo que deforma
// vértices o calcula su color se construye a partir de estos.

// Lambert facetado con colores de vértice: el material base del mundo low-poly.
export const lambert = (options = {}) => new MeshLambertNodeMaterial({ vertexColors: true, flatShading: true, ...options });
// Sin iluminación: agua, cielo, brillos.
export const unlit = (options = {}) => new MeshBasicNodeMaterial(options);
