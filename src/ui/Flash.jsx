import { useEffect, useRef } from "react";
import { events } from "../experience/state";

// Destello a pantalla completa cuando la escena lo pide (una explosión).
export function Flash() {
 const element = useRef(null);

 useEffect(() => {
  const onFlash = () => {
   const node = element.current;
   // Quitar y volver a poner la clase reinicia la animación si se encadenan saltos.
   node.classList.remove("flash--on");
   void node.offsetWidth;
   node.classList.add("flash--on");
  };
  events.addEventListener("flash", onFlash);
  return () => events.removeEventListener("flash", onFlash);
 }, []);

 return <div ref={element} className="flash" aria-hidden="true" />;
}
