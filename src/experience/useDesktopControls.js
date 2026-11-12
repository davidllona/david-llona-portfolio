import { useEffect } from "react";
import { input, queueAction, releaseMovement, ui, zoomBy } from "./state";

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

  // Zoom: rueda del ratón (o dos dedos en el panel táctil) sobre la escena, y
  // pellizco con dos dedos en pantallas táctiles. Los límites están en state.js.
  const onScene = (target) => target instanceof Element && !target.closest(".modal, .sheet, .overlay, button, a");
  const onWheel = (event) => {
   if (ui.open || !onScene(event.target)) return;
   event.preventDefault();
   zoomBy(Math.exp(Math.max(-120, Math.min(120, event.deltaY)) * 0.0016));
  };
  let pinch = 0;
  const spread = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  const onTouchStart = (event) => {
   pinch = event.touches.length === 2 && [...event.touches].every((touch) => onScene(touch.target)) ? spread(event.touches) : 0;
  };
  const onTouchMove = (event) => {
   if (!pinch || event.touches.length !== 2 || ui.open) return;
   const now = spread(event.touches);
   if (now > 0) zoomBy(pinch / now);
   pinch = now;
  };
  const onTouchEnd = () => (pinch = 0);

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("touchend", onTouchEnd);
  window.addEventListener("touchcancel", onTouchEnd);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", reset);
  return () => {
   window.removeEventListener("wheel", onWheel);
   window.removeEventListener("touchstart", onTouchStart);
   window.removeEventListener("touchmove", onTouchMove);
   window.removeEventListener("touchend", onTouchEnd);
   window.removeEventListener("touchcancel", onTouchEnd);
   window.removeEventListener("keydown", onKeyDown);
   window.removeEventListener("keyup", onKeyUp);
   window.removeEventListener("blur", reset);
  };
 }, []);
}
