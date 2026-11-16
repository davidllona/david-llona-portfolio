import { useEffect, useState } from "react";
import { CV } from "../content/cv";
import { SECTIONS, TRAVEL_OFFER } from "../content/sections";
import { CLOCK } from "../content/twisted";
import { emit, events } from "../experience/state";
import { quest } from "../game/moonQuest";
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
  events.addEventListener("quest", onWorld);
  return () => {
   events.removeEventListener("world", onWorld);
   events.removeEventListener("quest", onWorld);
  };
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
   {/* Solo en The Twisted Moon: los engranajes del reloj que se llevan. */}
   {world.id === "twisted" && (
    <span className={`quick__gears${quest.running() ? " quick__gears--done" : ""}`} title="Engranajes del reloj de la torre" aria-label={`${CLOCK.counter}: ${quest.count()} de ${quest.total}`}>
     <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8" />
     </svg>
     {CLOCK.counter}{" "}
     <b>
      {quest.count()}/{quest.total}
     </b>
    </span>
   )}
   <AchievementsButton onOpen={onAchievements} />
  </nav>
 );
}
