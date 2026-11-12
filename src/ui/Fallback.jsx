import { Component, useEffect } from "react";
import { CONTACT_LINKS, EMAIL } from "../content/contact";
import { dismissLoader } from "./loaderControl";

// Aviso para los navegadores que no pueden dibujar el planeta (sin WebGPU ni
// WebGL2) o si la escena falla: el porfolio es solo 3D, así que aquí solo se
// dice y se deja cómo escribirme.
export function Fallback() {
 // No hay escena que esperar: la pantalla de carga se retira ya.
 useEffect(dismissLoader, []);
 const linkedin = CONTACT_LINKS.find((link) => link.label === "LinkedIn");
 return (
  <main className="fallback">
   <p className="overlay__eyebrow">Portfolio · Frontend developer</p>
   <h1 className="overlay__title">
    David <span>Llona</span>
   </h1>
   <p className="overlay__lead">
    Este porfolio es un planeta en 3D y tu navegador no puede mostrarlo. Prueba con una versión reciente de Chrome,
    Edge, Firefox o Safari.
   </p>
   <p className="fallback__contact">
    <a href={linkedin.href} target="_blank" rel="noopener noreferrer">
     LinkedIn
    </a>
    <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
   </p>
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
