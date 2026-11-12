import { useEffect, useState } from "react";
import { play, setMuted, settings } from "../audio/engine";

// Botón de sonido. También se cambia con la tecla M.
export function SoundToggle() {
 const [muted, setMutedState] = useState(settings.muted);

 const toggle = () =>
  setMutedState((value) => {
   setMuted(!value);
   if (value) play("ui-toggle");
   return !value;
  });

 useEffect(() => {
  const onKey = (event) => {
   if (event.code === "KeyM" && !event.repeat && !event.metaKey && !event.ctrlKey) toggle();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
 }, []);

 return (
  <button
   type="button"
   className="sound-toggle"
   aria-pressed={!muted}
   aria-label={muted ? "Activar el sonido" : "Silenciar el sonido"}
   title={muted ? "Activar sonido (M)" : "Silenciar (M)"}
   onClick={(event) => (event.currentTarget.blur(), toggle())}
  >
   <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    {muted ? <path d="M15.5 9.5l5 5m0-5l-5 5" /> : <path d="M15.5 9a4.2 4.2 0 010 6M18 6.5a7.6 7.6 0 010 11" />}
   </svg>
  </button>
 );
}
