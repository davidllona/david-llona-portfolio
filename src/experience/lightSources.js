import * as THREE from "three";

// Fuentes de luz cálida del planeta (farolas, ventanas, hogueras…). Hay
// muchas más de las que se pueden encender a la vez, así que cada pieza se
// apunta aquí y WarmLights.jsx enciende solo las más cercanas al jugador.
export const warmSources = new Set();

// `source`: { x, y, z, color?, power?, reach?, flicker? }. Devuelve la función que la retira.
// (La función lleva en `.source` la fuente apuntada: quien la mueva —el farolillo de Woody— escribe ahí su sitio.)
export function addWarmSource(source) {
 const entry = { color: "#ffb66b", power: 1, reach: 11, flicker: 0.06, phase: Math.random() * 100, ...source };
 warmSources.add(entry);
 const stop = () => warmSources.delete(entry);
 stop.source = entry;
 return stop;
}

// Las dos luces generales de la escena: la de ambiente (cielo/suelo) y el sol o
// la luna, con sombras. Existen desde el principio (Lights.jsx las monta y las
// mueve) para que quien necesite un conjunto de luces propio —el islote de la
// bienvenida— pueda contar con ellas en cuanto se crea.
export const sceneLights = { hemisphere: new THREE.HemisphereLight(), sun: new THREE.DirectionalLight() };
