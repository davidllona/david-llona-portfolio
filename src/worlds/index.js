import { lazy } from "react";
import { emit, player } from "../experience/state";
import { lockTheme, setPalette } from "../experience/theme";
import { living } from "./living/layout";

// Registro de planetas. Cada uno aporta sus datos (terreno, colisiones, nave,
// rutas) y, aparte, su escena, que se descarga solo cuando se visita.
export const WORLDS = { living };
// Los que no se descargan hasta que se viaja a ellos: ni sus datos ni su
// escena pesan en la entrada al primer mundo. (Cada escena se pide una sola vez.)
const LAZY = {
 twisted: { data: () => import("./twisted/layout"), scene: () => (LAZY.twisted.asked ??= import("./twisted/Scene")) },
 cosmic: { data: () => import("./cosmic/layout"), scene: () => (LAZY.cosmic.asked ??= import("./cosmic/Scene")) },
};
export const SCENES = {
 living: lazy(() => import("./living/Scene")),
 twisted: lazy(() => LAZY.twisted.scene()),
 cosmic: lazy(() => LAZY.cosmic.scene()),
};
// Nombre y lema de cada destino, para los rótulos (el del mundo cargado está en sus datos).
export const WORLD_NAMES = {
 living: { name: "The Living World", motto: "Lo que hago" },
 twisted: { name: "The Twisted Moon", motto: "Quién soy" },
 cosmic: { name: "The Cosmic Lab", motto: "Lo que experimento" },
};

// En desarrollo se puede abrir un planeta concreto con ?world=<id>.
const requested = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("world") : null;
const DEFAULT_WORLD = "living";

// El planeta en el que se está. Es un enlace vivo: quien lo importa ve el cambio.
export let world = WORLDS[requested] ?? WORLDS[DEFAULT_WORLD];

// Coloca al jugador en el punto de llegada y aplica la paleta del planeta.
function placePlayer() {
 setPalette(world.themes);
 lockTheme(world.moment ?? null);
 player.position.set(world.spawn.x, world.height(world.spawn.x, world.spawn.z), world.spawn.z);
 player.velocity.set(0, 0, 0);
}
placePlayer();

// Ayuda para depurar y para las pruebas automáticas.
if (import.meta.env.DEV) window.__world.world = () => world;

// Descarga los datos y la escena de un planeta (si aún no están). Devuelve sus datos.
export async function loadWorld(id) {
 if (!WORLDS[id] && LAZY[id]) {
  const [data] = await Promise.all([LAZY[id].data(), LAZY[id].scene()]);
  WORLDS[id] = data.default;
 }
 return WORLDS[id];
}

export function setWorld(id) {
 if (!WORLDS[id] || WORLDS[id] === world) return;
 world = WORLDS[id];
 placePlayer();
 emit("world");
}

// Antes de montar la página: si se pidió abrir directamente un planeta de los
// que se descargan aparte (solo en desarrollo), se trae y se entra en él.
export const prepareWorld = () => (requested && LAZY[requested] ? loadWorld(requested).then(() => setWorld(requested)) : null);
