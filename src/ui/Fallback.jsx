import { Component } from "react";
import { CONTACT_LINKS } from "../content/contact";
import { PROJECTS } from "../content/projects";

// Versión sin 3D: se muestra si el navegador no tiene WebGL o si la escena falla.
export function Fallback() {
 return (
  <main className="fallback">
   <p className="overlay__eyebrow">Portfolio</p>
   <h1 className="overlay__title">David Llona</h1>
   <p className="overlay__lead">
    Frontend developer. Tu navegador no puede mostrar la estación en 3D, así que aquí tienes el
    contenido en versión sencilla.
   </p>

   <h2>Proyectos</h2>
   <ul className="fallback__projects">
    {PROJECTS.map((project) => (
     <li key={project.id}>
      <a href={project.link} target="_blank" rel="noopener noreferrer">
       {project.name}
      </a>
      <p>{project.tagline}</p>
     </li>
    ))}
   </ul>

   <h2>Contacto</h2>
   <ul className="overlay__links">
    {CONTACT_LINKS.map((link) => (
     <li key={link.label}>
      <a href={link.href} target="_blank" rel="noopener noreferrer">
       {link.label}
      </a>
     </li>
    ))}
   </ul>
  </main>
 );
}

export class ErrorBoundary extends Component {
 state = { failed: false };

 static getDerivedStateFromError() {
  return { failed: true };
 }

 componentDidCatch(error) {
  console.error("[Experience] La escena 3D ha fallado:", error);
 }

 render() {
  return this.state.failed ? <Fallback /> : this.props.children;
 }
}
