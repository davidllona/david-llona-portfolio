import { useEffect, useState } from "react";
import * as world from "../experience/state";

// Avisos que la escena envía a la interfaz: qué se puede hacer ahora mismo,
// mensajes breves y las canastas.
export function Hud({ touch }) {
 const [hint, setHint] = useState(world.hint);
 const [scored, setScored] = useState(0);
 const [toast, setToast] = useState(null);

 useEffect(() => {
  const onHint = () => setHint(world.hint);
  const onScore = (event) => setScored(event.detail.score);
  const onToast = (event) => setToast({ text: event.detail.text, id: performance.now() });
  world.events.addEventListener("hint", onHint);
  world.events.addEventListener("score", onScore);
  world.events.addEventListener("toast", onToast);
  return () => {
   world.events.removeEventListener("hint", onHint);
   world.events.removeEventListener("score", onScore);
   world.events.removeEventListener("toast", onToast);
  };
 }, []);

 return (
  <div className="hud" aria-live="polite">
   {hint && (
    <div className="hud__prompt">
     <p>
      {!touch && <kbd>E</kbd>}
      {hint}
     </p>
    </div>
   )}

   {toast && (
    // La clave reinicia la animación con cada mensaje.
    <p key={toast.id} className="hud__toast">
     {toast.text}
    </p>
   )}

   {scored > 0 && (
    <p key={scored} className="hud__score">
     ¡Canasta! <strong>{scored}</strong>
    </p>
   )}

   {!touch && (
    <p className="hud__hint" aria-hidden="true">
     <kbd>WASD</kbd> moverte · <kbd>Espacio</kbd> saltar · <kbd>Shift</kbd> correr · <kbd>E</kbd> usar · <kbd>N</kbd> día/noche ·{" "}
     <kbd>Esc</kbd> pausa
    </p>
   )}
  </div>
 );
}
