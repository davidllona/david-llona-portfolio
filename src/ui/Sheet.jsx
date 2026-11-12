import { useEffect, useRef } from "react";
import { releaseMovement, ui } from "../experience/state";
import { SECTIONS } from "../content/sections";
import { Portfolio } from "./Portfolio";

// Hoja que muestra el portfolio legible encima del planeta (o de la pantalla
// de inicio). `section`: a cuál se desplaza al abrirse.
export function Sheet({ section, onClose, onGuide }) {
 const scroller = useRef(null);
 const closeButton = useRef(null);

 // Mientras está abierta, el juego no recibe controles.
 useEffect(() => {
  releaseMovement();
  ui.open += 1;
  const previous = document.activeElement;
  closeButton.current?.focus();
  const onKey = (event) => {
   if (event.key === "Escape") onClose();
   // El foco no sale de la hoja con el tabulador.
   if (event.key === "Tab") {
    const items = scroller.current.parentElement.querySelectorAll("a[href], button:not([disabled])");
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
     event.preventDefault();
     last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
     event.preventDefault();
     first.focus();
    }
   }
  };
  window.addEventListener("keydown", onKey);
  return () => {
   ui.open -= 1;
   window.removeEventListener("keydown", onKey);
   previous?.focus?.();
  };
 }, [onClose]);

 const go = (id, smooth = true) => {
  const target = scroller.current?.querySelector(`#${id}`);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target?.scrollIntoView({ behavior: smooth && !reduced ? "smooth" : "auto", block: "start" });
 };
 useEffect(() => {
  if (section) go(section, false);
 }, [section]);

 return (
  <div className="sheet" role="dialog" aria-modal="true" aria-label="Portfolio de David Llona" onClick={onClose}>
   <div className="sheet__card" onClick={(event) => event.stopPropagation()}>
    <header className="sheet__bar">
     <p className="sheet__name">
      David <span>Llona</span>
     </p>
     <nav className="sheet__nav" aria-label="Secciones">
      {SECTIONS.map((item) => (
       <button key={item.id} type="button" onClick={() => go(item.id)}>
        {item.label}
       </button>
      ))}
     </nav>
     <button ref={closeButton} type="button" className="modal__close sheet__close" aria-label="Cerrar" onClick={onClose}>
      ×
     </button>
    </header>
    <div ref={scroller} className="sheet__scroll">
     <Portfolio onGuide={onGuide} />
    </div>
   </div>
  </div>
 );
}
