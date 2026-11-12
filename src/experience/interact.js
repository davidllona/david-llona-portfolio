import { useEffect, useRef } from "react";
import { emit, interactables, player } from "./state";

// Props para que un objeto de la escena se pueda pulsar: cursor de mano y clic.
export const clickable = (onClick) => ({
 onClick: (event) => {
  event.stopPropagation();
  onClick(event);
 },
 onPointerOver: () => {
  document.body.style.cursor = "pointer";
 },
 onPointerOut: () => {
  document.body.style.cursor = "";
 },
});

export const read = (value) => (typeof value === "function" ? value() : value);
export const distanceTo = (entry) => {
 const at = read(entry.position);
 return Math.hypot(player.position.x - at.x, player.position.z - at.z);
};

// Registra algo con lo que se puede interactuar:
//  · position: { x, z } o función que lo devuelve (si se mueve);
//  · radius: a qué distancia se activa con E;
//  · hint: texto que se muestra (o función);
//  · action: qué hacer;
//  · enabled: función opcional; priority: gana la más alta si hay varias cerca;
//  · anywhere: el clic funciona desde cualquier distancia.
// Devuelve las props de clic para la malla.
export function useInteractable(definition) {
 const entry = useRef(definition);
 entry.current = definition;

 useEffect(() => {
  // Se registra un objeto estable que siempre lee la definición más reciente.
  const live = new Proxy({}, { get: (_, key) => entry.current[key] });
  interactables.add(live);
  return () => interactables.delete(live);
 }, []);

 return clickable(() => {
  const current = entry.current;
  if (current.enabled && !current.enabled()) return;
  if (current.anywhere || distanceTo(current) <= current.radius * 1.6) current.action();
  else emit("toast", { text: "Acércate para usarlo" });
 });
}
