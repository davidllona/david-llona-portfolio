import { SECTIONS } from "../content/sections";

// Acceso rápido, siempre a la vista mientras se explora: lo esencial del
// portfolio a un clic, sin tener que encontrarlo andando.
export function QuickMenu({ onOpen }) {
 return (
  <nav className="quick" aria-label="Acceso rápido al portfolio">
   {SECTIONS.map((section) => (
    <button key={section.id} type="button" onClick={(event) => (event.currentTarget.blur(), onOpen(section.id))}>
     {section.label}
    </button>
   ))}
  </nav>
 );
}
