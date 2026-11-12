import { useEffect, useRef } from "react";
import { SECTIONS } from "../content/sections";
import { Portfolio } from "./Portfolio";
import { useDialog } from "./useDialog";

// Hoja que muestra el portfolio legible encima del planeta (o de la pantalla
// de inicio). `section`: a cuál se desplaza al abrirse.
export function Sheet({ section, onClose, onGuide }) {
 const card = useRef(null);
 const scroller = useRef(null);
 useDialog(card, onClose);

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
   <div ref={card} className="sheet__card" onClick={(event) => event.stopPropagation()}>
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
     <button type="button" className="modal__close sheet__close" aria-label="Cerrar" onClick={onClose}>
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
