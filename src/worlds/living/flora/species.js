import { BARK, LEAF } from "../kit/palette.js";

// Árboles y arbusto del planeta. Los modelos son de slabdsgn (Envato; ver
// docs/CREDITOS.md), preparados por tools/assets/trees.mjs. Este archivo solo
// tiene datos: lo leen también layout.js (colisiones, sombras) y las pruebas.

// Medidas de cada modelo a escala 1, en metros (las imprime tools/assets/trees.mjs).
//  · trunk: radio del tronco con el que se choca · crown: desde qué altura hay copa
//  · spread: radio de la copa.
export const MODELS = {
 frutal: { height: 4.7, trunk: 0.24, crown: 1.84, spread: 1.21 },
 frondoso: { height: 5.6, trunk: 0.26, crown: 2.8, spread: 2.86 },
 redondo: { height: 5.0, trunk: 0.3, crown: 2.55, spread: 2.54 },
 acacia: { height: 3.8, trunk: 0.36, crown: 2.59, spread: 3.09 },
 mata: { height: 1.15, trunk: 0, crown: 0, spread: 1.06 },
};

// Cada especie del reparto (layout.js) se planta con uno de estos modelos, con
// su corteza y una de sus gamas de hoja. Así los cinco modelos dan una
// veintena de árboles distintos sin que el bosque pierda sus zonas: sauces de
// copa ancha junto al agua, arboledas rosas, verdes oscuros en el norte.
export const SPECIES = {
 oak: { models: ["redondo", "frondoso", "acacia"], leaf: LEAF.oak, bark: BARK.oak },
 maple: { models: ["frutal", "redondo"], leaf: LEAF.maple, bark: BARK.oak },
 poplar: { models: ["frondoso", "frutal"], leaf: LEAF.poplar, bark: BARK.oak },
 pine: { models: ["frondoso", "frutal"], leaf: LEAF.pine, bark: BARK.pine },
 birch: { models: ["redondo", "frutal"], leaf: LEAF.birch, bark: BARK.birch },
 cherry: { models: ["frutal", "redondo"], leaf: LEAF.cherry, bark: BARK.cherry },
 willow: { models: ["acacia"], leaf: LEAF.willow, bark: BARK.oak },
};

// Qué modelo le toca a un árbol, según su semilla (0–1).
export const modelOf = (kind, seed) => {
 const { models } = SPECIES[kind] ?? SPECIES.oak;
 return models[Math.floor(((seed * 389) % 1) * models.length)];
};

// Gamas del arbusto: [abajo, arriba].
export const BUSH_LEAF = [["#3a8a47", "#86c95e"], ["#4a9a4f", "#a3d86a"], ["#357f4b", "#7cc25c"], ["#74b83c", "#c6e866"], ["#d98f4e", "#f6c488"]];
