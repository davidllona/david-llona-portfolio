import { useEffect, useState } from "react";
import { CV } from "../content/cv";
import { SECTIONS, TRAVEL_OFFER } from "../content/sections";
import { emit, events } from "../experience/state";
import { world } from "../worlds";
import { AchievementsButton } from "./Achievements";

// Menú superior, siempre a la vista mientras se explora. Cada botón lleva a su
// sitio: si está en este mundo, Woody va delante y te espera; si está en otro
// («Sobre mí» vive en The Twisted Moon; proyectos, CV y contacto, en The Living
// World), se ofrece viajar hasta allí en el cohete. No abre ninguna página
// aparte. El CV, además, se puede descargar desde aquí sin moverse.
export function QuickMenu({ onAchievements }) {
 // (Se vuelve a pintar al cambiar de mundo: cambia a dónde lleva cada botón.)
 const [, refresh] = useState(0);
 useEffect(() => {
  const onWorld = () => refresh((value) => value + 1);
  events.addEventListener("world", onWorld);
  return () => events.removeEventListener("world", onWorld);
 }, []);
 const here = (section) => section.world === world.id;
 const go = (event, section) => {
  event.currentTarget.blur();
  if (here(section)) emit("guide", { to: section.place, asked: true });
  else emit("open", { kind: "travel", eyebrow: section.label, ...TRAVEL_OFFER[section.world], voyage: section.world });
 };
 return (
  <nav className="quick" aria-label="Ir a cada zona del planeta">
   {SECTIONS.map((section) => (
    <span key={section.id} className="quick__item">
     <button type="button" title={here(section) ? `Ir a ${section.label} con Woody` : `${section.label}: viajar a su mundo`} onClick={(event) => go(event, section)}>
      {section.label}
     </button>
     {section.id === "cv" && CV.file && (
      <a className="quick__download" href={CV.file} download title="Descargar el CV en PDF" aria-label="Descargar el CV en PDF">
       ↓
      </a>
     )}
    </span>
   ))}
   <AchievementsButton onOpen={onAchievements} />
  </nav>
 );
}
