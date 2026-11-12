// Fuentes de luz cálida del planeta (farolas, ventanas, hogueras…). Hay
// muchas más de las que se pueden encender a la vez, así que cada pieza se
// apunta aquí y WarmLights.jsx enciende solo las más cercanas al jugador.
export const warmSources = new Set();

// `source`: { x, y, z, color?, power?, reach?, flicker? }. Devuelve la función que la retira.
export function addWarmSource(source) {
 const entry = { color: "#ffb66b", power: 1, reach: 11, flicker: 0.06, phase: Math.random() * 100, ...source };
 warmSources.add(entry);
 return () => warmSources.delete(entry);
}
