import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";

const STEPS = ["Trazando la órbita", "Plantando árboles", "Llenando el mar", "Aterrizando"];
const MIN_TIME = 1400; // ms; que no sea un parpadeo si todo está en caché

// Pantalla de carga. Tapa todo hasta que el planeta está descargado, montado
// y dibujado unas cuantas veces; después se retira con un fundido.
export function Loader({ ready }) {
 const { progress } = useProgress();
 const [gone, setGone] = useState(false);
 const [leaving, setLeaving] = useState(false);
 const number = useRef(null);
 const bar = useRef(null);
 const step = useRef(null);
 const target = useRef(0);
 const started = useRef(performance.now());

 // La descarga cuenta hasta el 85 %; el resto es montar y dibujar la escena.
 target.current = ready ? 100 : Math.min(85, progress * 0.85);

 useEffect(() => {
  let shown = 0;
  let frame;
  const tick = () => {
   // El número avanza suave hacia el objetivo, sin saltos.
   shown += (target.current - shown) * 0.09 + 0.05;
   shown = Math.min(shown, target.current);
   const value = Math.round(shown);
   number.current.textContent = String(value).padStart(2, "0");
   bar.current.style.transform = `scaleX(${shown / 100})`;
   step.current.textContent = STEPS[Math.min(STEPS.length - 1, Math.floor(shown / 26))];
   if (value >= 100 && performance.now() - started.current > MIN_TIME) {
    setLeaving(true);
    return;
   }
   frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
 }, []);

 if (gone) return null;

 return (
  <div
   className={`loader${leaving ? " loader--leaving" : ""}`}
   role="status"
   aria-label="Cargando el planeta"
   onTransitionEnd={(event) => event.target === event.currentTarget && setGone(true)}
  >
   <p className="loader__brand">
    David <span>Llona</span>
   </p>
   <div className="loader__center">
    <p className="loader__number">
     <span ref={number}>00</span>
     <small>%</small>
    </p>
    <div className="loader__track">
     <div ref={bar} className="loader__bar" />
    </div>
    <p className="loader__step">
     <span ref={step}>{STEPS[0]}</span>
     <i aria-hidden="true">…</i>
    </p>
   </div>
   <p className="loader__foot">Planeta · Portfolio 3D</p>
  </div>
 );
}
