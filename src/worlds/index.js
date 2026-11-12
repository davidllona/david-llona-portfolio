import { lazy } from "react";
import { emit, player } from "../experience/state";
import { cosmic } from "./cosmic/layout";

// Registro de planetas. Cada uno aporta sus datos (terreno, colisiones, nave,
// rutas) y, aparte, su escena, que se descarga solo cuando se visita.
export const WORLDS = { cosmic };
export const SCENES = {
 cosmic: lazy(() => import("./cosmic/Scene")),
};

// En desarrollo se puede abrir un planeta concreto con ?world=<id>.
const requested = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("world") : null;
const DEFAULT_WORLD = "cosmic";

// El planeta en el que se está. Es un enlace vivo: quien lo importa ve el cambio.
export let world = WORLDS[requested] ?? WORLDS[DEFAULT_WORLD];

function placePlayer() {
 player.position.set(world.spawn.x, world.height(world.spawn.x, world.spawn.z), world.spawn.z);
 player.velocity.set(0, 0, 0);
}
placePlayer();

// Ayuda para depurar y para las pruebas automáticas.
if (import.meta.env.DEV) window.__world.world = () => world;

export function setWorld(id) {
 if (!WORLDS[id] || WORLDS[id] === world) return;
 world = WORLDS[id];
 placePlayer();
 emit("world");
}
