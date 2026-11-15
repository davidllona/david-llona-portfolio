import { useEffect, useState } from "react";
import { emit, events } from "../experience/state";
import { nextTheme, theme } from "../experience/theme";

// Botón del momento del día. Al entrar, el mundo sigue la hora del visitante;
// con el botón (o la tecla N) se cambia a mano entre día, atardecer y noche, y
// esa elección manda hasta que se recarga la página.
const LABEL = { day: "día", dusk: "atardecer", night: "noche" };
const NEXT = { day: "dusk", dusk: "night", night: "day" };
export function ThemeToggle() {
 const [moment, setMoment] = useState(theme.name);

 const toggle = () => {
  setMoment(nextTheme());
  emit("theme");
 };

 useEffect(() => {
  const onKey = (event) => {
   if (event.code === "KeyN" && !event.repeat && !event.metaKey && !event.ctrlKey) toggle();
  };
  // También puede cambiar desde el planeta (el telescopio) o con la hora.
  const onTheme = () => setMoment(theme.name);
  const watch = window.setInterval(onTheme, 2000);
  window.addEventListener("keydown", onKey);
  events.addEventListener("theme", onTheme);
  return () => {
   window.clearInterval(watch);
   window.removeEventListener("keydown", onKey);
   events.removeEventListener("theme", onTheme);
  };
 }, []);

 return (
  <button
   type="button"
   className="theme-toggle"
   data-moment={moment}
   aria-pressed={moment === "night"}
   aria-label={`Ahora: ${LABEL[moment]}. Cambiar a ${LABEL[NEXT[moment]]}`}
   title={`${LABEL[moment][0].toUpperCase()}${LABEL[moment].slice(1)} · cambiar a ${LABEL[NEXT[moment]]} (N)`}
   onClick={toggle}
  >
   <svg viewBox="0 0 24 24" aria-hidden="true">
    {moment === "night" ? (
     <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    ) : moment === "dusk" ? (
     <>
      {/* Medio sol sobre el horizonte. */}
      <path d="M6.8 16.5a5.2 5.2 0 0 1 10.4 0" />
      <path d="M2.5 16.5h19M6 20h12M12 5.2v2.4M4.9 9.4l1.7 1.7M19.1 9.4l-1.7 1.7" />
     </>
    ) : (
     <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3 7 7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7" />
     </>
    )}
   </svg>
  </button>
 );
}
