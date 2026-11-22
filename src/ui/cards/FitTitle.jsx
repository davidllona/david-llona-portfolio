import { useLayoutEffect, useRef } from "react";

// Título de carta que nunca se sale ni se corta (objetivo 27, B1). La misma
// regla que los carteles 3D (experience/fitText.js): el margen es el de la caja
// (su padding, fijo); la letra parte del tamaño que le da la hoja de estilo y se
// reduce hasta que el título cabe en un renglón; si ni con `min` (en veces ese
// tamaño) cabe, pasa a dos renglones centrados en su caja y equilibrados, con la
// letra más grande que quepa (y solo baja de `min2` si ni así cabe).
const MIN = 0.8, MIN2 = 0.55;

export function FitTitle({ className, children }) {
 const ref = useRef(null);
 useLayoutEffect(() => {
  const el = ref.current;
  if (!el) return;
  const fit = () => {
   el.style.fontSize = "";
   el.style.whiteSpace = "nowrap";
   el.removeAttribute("data-lines");
   const base = parseFloat(getComputedStyle(el).fontSize);
   const fits = () => el.scrollWidth <= el.clientWidth + 0.5;
   let size = base;
   const set = (px) => {
    size = px;
    el.style.fontSize = `${px}px`;
   };
   while (!fits() && size > base * MIN) set(size - 1);
   if (fits()) return;
   // Dos renglones: se deja partir y se busca la letra mayor con la que caben en dos.
   el.style.whiteSpace = "normal";
   el.setAttribute("data-lines", "2");
   const lineHeight = () => parseFloat(getComputedStyle(el).lineHeight) || size * 1.05;
   // (offsetHeight es la medida sin la escala con que se encoge la carta entera.)
   const twoLines = () => fits() && el.offsetHeight <= lineHeight() * 2 + 2;
   set(base);
   while (!twoLines() && size > base * MIN2) set(size - 1);
   // Último recurso (un título larguísimo): baja lo que haga falta para no pasar de dos renglones.
   while (!twoLines() && size > 12) set(size - 1);
  };
  fit();
  let frame = 0;
  const again = () => {
   cancelAnimationFrame(frame);
   frame = requestAnimationFrame(fit);
  };
  // La letra web puede llegar después; y la carta cambia de tamaño con la ventana.
  document.fonts?.ready.then(again);
  const watch = new ResizeObserver(again);
  watch.observe(el.parentElement);
  return () => {
   cancelAnimationFrame(frame);
   watch.disconnect();
  };
 }, [children]);
 return (
  <h2 ref={ref} className={className} data-fit-title="">
   {children}
  </h2>
 );
}
