import { useEffect, useRef, useState } from "react";
import { MENU, MENU_FOLLOW, MENU_MUTE, MENU_UNMUTE } from "../content/woody";
import { setTips } from "../experience/speech";
import { emit, events, woody } from "../experience/state";
import { world } from "../worlds";

// Menú de guía de Woody: pedirle que te lleve a un sitio, que vuelva a
// acompañarte o que no dé consejos. Se abre con su botón o con la tecla G.
// (Los textos están en content/woody.js.)
export function WoodyMenu() {
 const [open, setOpen] = useState(false);
 const [, refresh] = useState(0);
 const button = useRef(null);

 useEffect(() => {
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
  emit("guide", { to, asked: true });
  setOpen(false);
  button.current?.blur();
 };

 const toggleTips = () => {
  setTips(!woody.tips);
  refresh((value) => value + 1);
 };

 // Solo los sitios a los que sabe llegar en este planeta.
 const known = new Set((world.guide?.places ?? []).map((place) => place.id));
 const places = MENU.filter((entry) => known.has(entry.place));

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
     {places.map((entry) => (
      <li key={entry.place}>
       <button type="button" onClick={() => guide(entry.place)} aria-current={woody.guideTo === entry.place}>
        {entry.ask}
       </button>
      </li>
     ))}
     <li>
      <button type="button" onClick={() => guide(null)} disabled={!woody.guideTo}>
       {MENU_FOLLOW}
      </button>
     </li>
     <li>
      <button type="button" onClick={toggleTips} aria-pressed={!woody.tips}>
       {woody.tips ? MENU_MUTE : MENU_UNMUTE}
      </button>
     </li>
    </ul>
   )}
  </div>
 );
}
