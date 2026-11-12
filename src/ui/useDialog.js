import { useEffect } from "react";
import { emit, releaseMovement, ui } from "../experience/state";

// Comportamiento común de las ventanas que se abren sobre el juego: mientras
// están abiertas el astronauta no recibe controles, Esc las cierra, el foco
// entra en ellas, no se escapa con Tab y al cerrar vuelve a donde estaba.
// `container`: ref del elemento que contiene la ventana.
export function useDialog(container, onClose) {
 useEffect(() => {
  releaseMovement();
  ui.open += 1;
  emit("sound", { id: "ui-open" });
  const previous = document.activeElement;
  const focusable = () => container.current?.querySelectorAll("a[href], button:not([disabled])") ?? [];
  focusable()[0]?.focus();

  const onKey = (event) => {
   if (event.key === "Escape") onClose();
   if (event.key !== "Tab") return;
   const items = focusable();
   const first = items[0];
   const last = items[items.length - 1];
   if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
   } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
   }
  };
  window.addEventListener("keydown", onKey);
  return () => {
   ui.open -= 1;
   emit("sound", { id: "ui-close" });
   window.removeEventListener("keydown", onKey);
   previous?.focus?.();
  };
 }, [container, onClose]);
}
