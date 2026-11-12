import { useEffect, useRef, useState } from "react";
import { emit, events, woody } from "../experience/state";
import { world } from "../worlds";

const TIPS_KEY = "woody-consejos";

// Menú de Woody: pedirle que te lleve a un sitio, que deje de guiar o que no
// dé consejos. Se abre con su botón o con la tecla G.
export function WoodyMenu() {
 const [open, setOpen] = useState(false);
 const [, refresh] = useState(0);
 const button = useRef(null);

 useEffect(() => {
  try {
   woody.tips = window.localStorage.getItem(TIPS_KEY) !== "off";
  } catch {
   // Sin almacenamiento, los consejos se quedan activados.
  }
  const onChange = () => refresh((value) => value + 1);
  const onKey = (event) => {
   if (event.code === "KeyG" && !event.repeat && !event.metaKey && !event.ctrlKey) setOpen((value) => !value);
   if (event.key === "Escape") setOpen(false);
  };
  events.addEventListener("woody", onChange);
  window.addEventListener("keydown", onKey);
  return () => {
   events.removeEventListener("woody", onChange);
   window.removeEventListener("keydown", onKey);
  };
 }, []);

 const guide = (to) => {
  emit("guide", { to });
  setOpen(false);
  button.current?.blur();
 };

 const toggleTips = () => {
  woody.tips = !woody.tips;
  try {
   window.localStorage.setItem(TIPS_KEY, woody.tips ? "on" : "off");
  } catch {
   // Sin almacenamiento, la preferencia dura solo esta visita.
  }
  refresh((value) => value + 1);
 };

 const places = world.guide?.places ?? [];

 return (
  <div className="woody-menu">
   <button
    ref={button}
    type="button"
    className="woody-menu__button"
    aria-expanded={open}
    aria-controls="woody-menu-list"
    title="Woody (G)"
    onClick={() => setOpen((value) => !value)}
   >
    <svg viewBox="0 0 24 24" aria-hidden="true">
     <ellipse cx="12" cy="15.5" rx="4.6" ry="3.8" />
     <ellipse cx="5.6" cy="10.6" rx="1.9" ry="2.5" />
     <ellipse cx="9.6" cy="6.6" rx="1.9" ry="2.6" />
     <ellipse cx="14.4" cy="6.6" rx="1.9" ry="2.6" />
     <ellipse cx="18.4" cy="10.6" rx="1.9" ry="2.5" />
    </svg>
    Woody
   </button>

   {open && (
    <ul id="woody-menu-list" className="woody-menu__list">
     {places.map((place) => (
      <li key={place.id}>
       <button type="button" onClick={() => guide(place.id)} aria-current={woody.guideTo === place.id}>
        {place.ask}
       </button>
      </li>
     ))}
     <li>
      <button type="button" onClick={() => guide(null)} disabled={!woody.guideTo}>
       Acompáñame
      </button>
     </li>
     <li>
      <button type="button" onClick={toggleTips} aria-pressed={!woody.tips}>
       {woody.tips ? "Silenciar consejos" : "Activar consejos"}
      </button>
     </li>
    </ul>
   )}
  </div>
 );
}
