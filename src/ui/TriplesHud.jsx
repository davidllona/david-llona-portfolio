import { useEffect, useRef, useState } from "react";
import { emit, events } from "../experience/state";
import { TRIPLES, triples } from "../game/triples";

// Interfaz del concurso de triples, solo mientras se juega: tiempo, puntos y
// carro, la cuenta atrás «3, 2, 1» y el botón de salir. El reloj se escribe por
// ref en cada fotograma, sin renders.
export function TriplesHud() {
 const [view, setView] = useState(null); // { phase, score, rack, ball } mientras hay partida
 const time = useRef(null);
 const count = useRef(null);

 useEffect(() => {
  const onTriples = (event) => {
   const type = event.detail?.type;
   if (type === "exit") setView(null);
   else if (triples.phase !== "idle") setView({ phase: triples.phase, score: triples.score, rack: triples.rack, ball: triples.ball });
  };
  events.addEventListener("triples", onTriples);
  return () => events.removeEventListener("triples", onTriples);
 }, []);

 const on = Boolean(view);
 useEffect(() => {
  if (!on) return undefined;
  let frame;
  const tick = () => {
   const seconds = Math.max(0, Math.ceil(triples.time));
   if (time.current) {
    time.current.textContent = triples.phase === "count" ? String(TRIPLES.seconds) : String(seconds);
    time.current.dataset.low = triples.phase === "play" && seconds <= 10 ? "1" : "0";
   }
   if (count.current && triples.phase === "count") count.current.textContent = String(Math.max(1, seconds));
   frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
 }, [on]);

 if (!view) return null;
 const left = TRIPLES.balls - view.ball;
 return (
  <div className="triples" data-phase={view.phase}>
   <div className="triples__bar">
    <div className="triples__cell">
     <span>Tiempo</span>
     <b ref={time} className="triples__time">{TRIPLES.seconds}</b>
    </div>
    <div className="triples__cell" role="status" aria-label={`${view.score} puntos`}>
     <span>Puntos</span>
     <b className="triples__score">{view.score}</b>
    </div>
    <div className="triples__cell">
     <span>Carro</span>
     <b className="triples__rack">
      {view.rack + 1}/{TRIPLES.racks}
     </b>
     <i className="triples__balls" aria-label={`Quedan ${left} balones en este carro`}>
      {Array.from({ length: TRIPLES.balls }, (_, i) => (
       <u key={i} data-on={i >= view.ball ? "1" : "0"} data-money={i === TRIPLES.balls - 1 ? "1" : "0"} />
      ))}
     </i>
    </div>
    <button
     type="button"
     className="triples__exit"
     onClick={(event) => {
      event.currentTarget.blur();
      emit("triples-command", { command: "exit" });
     }}
    >
     Salir
    </button>
   </div>
   {view.phase === "count" && (
    <div ref={count} className="triples__count" aria-live="assertive">
     {TRIPLES.countdown}
    </div>
   )}
   {view.phase === "over" && <div className="triples__count triples__count--end">¡Final!</div>}
   {view.phase !== "over" && <p className="triples__help">Mantén pulsado y suelta en lo más alto del salto · el balón azul vale 2</p>}
  </div>
 );
}
