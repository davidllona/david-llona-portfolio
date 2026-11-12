import { SECTIONS } from "../content/sections";
import { AchievementsButton } from "./Achievements";

// Acceso rápido, siempre a la vista mientras se explora: lo esencial del
// portfolio a un clic, sin tener que encontrarlo andando, y los logros.
export function QuickMenu({ onOpen, onAchievements }) {
 return (
  <nav className="quick" aria-label="Acceso rápido al portfolio">
   {SECTIONS.map((section) => (
    <button key={section.id} type="button" onClick={(event) => (event.currentTarget.blur(), onOpen(section.id))}>
     {section.label}
    </button>
   ))}
   <AchievementsButton onOpen={onAchievements} />
  </nav>
 );
}
