// Aspecto de los personajes: escala en el juego y colores por material del
// GLB. Lo comparten el personaje jugable y su copia de la bienvenida.

// El astronauta mide 1,25 m en el modelo; en el juego, 1,75 m.
export const ASTRONAUT_SCALE = 1.4;
export const ASTRONAUT_PALETTE = {
 Astro_Visor: { color: "#15131f", emissive: "#2a2456", glow: 0.5 },
 Astro_Teal: { color: "#1fb3a4", emissive: "#1fb3a4", glow: 0.35 },
 Astro_Yellow: { color: "#ffb21f", emissive: "#ffb21f", glow: 0.3 },
};

export const WOODY_SCALE = 1.25;
// En el modelo el pelo es negro puro: aquí se aclara un punto para que las
// facetas se lean con la luz del juego. La mancha del pecho es blanca.
export const WOODY_PALETTE = {
 Woody_Fur: { color: "#3a3943" },
 Woody_FurSoft: { color: "#4b4a56" },
 Woody_Chest: { color: "#f2efe6" },
 Woody_Nose: { color: "#0d0d10" },
 Woody_Eye: { color: "#6b4a26", emissive: "#6b4a26", glow: 0.5 },
};
