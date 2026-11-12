import { Component, useEffect } from "react";
import { dismissLoader } from "./loaderControl";
import { Portfolio } from "./Portfolio";

// Versión sin 3D: se muestra si el navegador no tiene WebGL o si la escena falla.
export function Fallback() {
 // No hay escena que esperar: la pantalla de carga se retira ya.
 useEffect(dismissLoader, []);
 return (
  <main className="fallback">
   <p className="overlay__eyebrow">Portfolio</p>
   <h1 className="overlay__title">
    David <span>Llona</span>
   </h1>
   <p className="overlay__lead">
    Frontend developer. Tu navegador no puede mostrar el planeta en 3D, así que aquí tienes todo el contenido en
    versión de lectura.
   </p>
   <Portfolio />
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
