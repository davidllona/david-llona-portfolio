import { useEffect, useState } from "react";
import { setTheme, theme } from "../experience/theme";

// Botón de día / noche. También se cambia con la tecla N.
export function ThemeToggle() {
 const [night, setNight] = useState(theme.name === "night");

 const toggle = () =>
  setNight((value) => {
   setTheme(value ? "day" : "night");
   return !value;
  });

 useEffect(() => {
  const onKey = (event) => {
   if (event.code === "KeyN" && !event.repeat && !event.metaKey && !event.ctrlKey) toggle();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
 }, []);

 return (
  <button
   type="button"
   className="theme-toggle"
   aria-pressed={night}
   aria-label={night ? "Cambiar a modo día" : "Cambiar a modo noche"}
   title={night ? "Modo día (N)" : "Modo noche (N)"}
   onClick={toggle}
  >
   <svg viewBox="0 0 24 24" aria-hidden="true">
    {night ? (
     <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
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
