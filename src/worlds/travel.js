import { emit, voyage } from "../experience/state";
import { WORLD_NAMES, loadWorld, setWorld, world } from "./index";

// El viaje de un mundo a otro. Se sale desde la órbita:
//  1. "leaving": la nave se aleja hacia el otro planeta y la pantalla se cubre
//     (ui/TravelOverlay.jsx). Mientras, se descargan los datos y la escena del
//     destino: el segundo mundo no pesa nada hasta que se viaja a él.
//  2. "loading": con la pantalla cubierta se cambia de mundo; el nuevo se monta
//     y se compila entero detrás, igual que el primero detrás de la pantalla de
//     carga (ver Experience.jsx): al destaparse no queda nada por compilar.
//  3. "arriving": se destapa con la nave en la órbita del destino, y baja sola.
const LEAVE = 2300; // ms que la nave tarda en alejarse (la pantalla se cubre en ese tiempo)
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export async function travelTo(id, towards = null) {
 if (voyage.phase !== "idle" || id === world.id || !WORLD_NAMES[id]) return false;
 Object.assign(voyage, { phase: "leaving", to: id, towards });
 emit("voyage", { phase: "leaving", to: id, ...WORLD_NAMES[id] });
 try {
  const [found] = await Promise.all([loadWorld(id), wait(LEAVE)]);
  if (!found) throw new Error(`No existe el mundo «${id}»`);
 } catch (error) {
  // Sin conexión, por ejemplo: la nave se queda donde estaba.
  console.error("No se pudo viajar", error);
  Object.assign(voyage, { phase: "idle", to: null, towards: null });
  emit("voyage", { phase: "failed", to: id });
  return false;
 }
 voyage.phase = "loading";
 setWorld(id);
 return true;
}

// Pide viajar a un mundo desde donde se esté (el menú): la nave despega si
// hace falta y, ya en órbita, sale hacia él (ver Ship.jsx).
export const requestVoyage = (to) => emit("voyage-request", { to });

// El mundo de destino ya está montado, compilado y a la vista (lo avisa Experience.jsx).
export function voyageReady() {
 if (voyage.phase !== "loading") return;
 voyage.phase = "arriving";
 emit("voyage", { phase: "arrived", to: voyage.to, ...WORLD_NAMES[voyage.to] });
}

// La nave ha tocado tierra en el destino (lo avisa Ship.jsx).
export function voyageDone() {
 Object.assign(voyage, { phase: "idle", to: null, towards: null });
 emit("voyage", { phase: "landed", to: world.id });
}

if (import.meta.env.DEV) window.__world.travelTo = travelTo; // para las pruebas automáticas
