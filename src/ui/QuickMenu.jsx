import { CV } from "../content/cv";
import { SECTIONS } from "../content/sections";
import { emit } from "../experience/state";
import { AchievementsButton } from "./Achievements";

// Menú superior, siempre a la vista mientras se explora. Cada botón lleva a su
// sitio dentro del mundo: Woody va delante y te espera. No abre ninguna página
// aparte. El CV, además, se puede descargar desde aquí sin moverse.
export function QuickMenu({ onAchievements }) {
 const go = (event, place) => {
  event.currentTarget.blur();
  emit("guide", { to: place, asked: true });
 };
 return (
  <nav className="quick" aria-label="Ir a cada zona del planeta">
   {SECTIONS.map((section) => (
    <span key={section.id} className="quick__item">
     <button type="button" title={`Ir a ${section.label} con Woody`} onClick={(event) => go(event, section.place)}>
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
