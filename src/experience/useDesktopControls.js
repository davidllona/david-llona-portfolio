import { useEffect } from "react";
import { input, queueAction, releaseMovement } from "./state";

// Se usa event.code (posición física de la tecla) para que WASD funcione
// igual en cualquier distribución de teclado.
const ACTIONS = {
 KeyW: "forward",
 ArrowUp: "forward",
 KeyS: "back",
 ArrowDown: "back",
 KeyA: "left",
 ArrowLeft: "left",
 KeyD: "right",
 ArrowRight: "right",
 Space: "jump",
 ShiftLeft: "run",
 ShiftRight: "run",
 KeyE: "action",
};

// Teclado. El ratón queda libre para hacer clic en los objetos de la escena.
// Escribe en `input`; no devuelve nada.
export function useDesktopControls() {
 useEffect(() => {
  const held = new Map(); // acción → teclas que la mantienen pulsada

  const isTyping = (event) => {
   const target = event.target;
   return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
   );
  };

  const onKeyDown = (event) => {
   const action = ACTIONS[event.code];
   if (!action || isTyping(event) || event.metaKey || event.ctrlKey) return;
   event.preventDefault();
   if (action === "jump") {
    if (!event.repeat) input.jumpQueued = true;
    return;
   }
   if (action === "action") {
    if (!event.repeat) queueAction();
    return;
   }
   if (!held.has(action)) held.set(action, new Set());
   held.get(action).add(event.code);
   input.keys[action] = true;
  };

  const onKeyUp = (event) => {
   const action = ACTIONS[event.code];
   if (!action || action === "jump" || action === "action") return;
   const codes = held.get(action);
   codes?.delete(event.code);
   input.keys[action] = Boolean(codes?.size);
  };

  // Al perder el foco no llegan los keyup: se sueltan todas las teclas.
  const reset = () => {
   held.clear();
   releaseMovement();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", reset);
  return () => {
   window.removeEventListener("keydown", onKeyDown);
   window.removeEventListener("keyup", onKeyUp);
   window.removeEventListener("blur", reset);
  };
 }, []);
}
