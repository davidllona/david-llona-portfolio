import { aboutCard } from "../content/about";
import { CV } from "../content/cv";
import { SECTIONS } from "../content/sections";
import { emit } from "../experience/state";
import { AchievementsButton } from "./Achievements";

// Menú superior, siempre a la vista mientras se explora. Cada botón lleva a su
// sitio dentro del mundo: Woody va delante y te espera. No abre ninguna página
// aparte. El CV, además, se puede descargar desde aquí sin moverse. «Sobre mí»
// no tiene sitio en este mundo: su botón abre la ficha, la misma del juego.
export function QuickMenu({ onAchievements }) {
 const go = (event, place) => {
  event.currentTarget.blur();
  emit("guide", { to: place, asked: true });
 };
 const read = (event) => {
  event.currentTarget.blur();
  emit("open", aboutCard());
 };
 return (
  <nav className="quick" aria-label="Ir a cada zona del planeta">
   {SECTIONS.map((section) => (
    <span key={section.id} className="quick__item">
     <button type="button" title={section.place ? `Ir a ${section.label} con Woody` : `Leer «${section.label}»`} onClick={(event) => (section.place ? go(event, section.place) : read(event))}>
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
