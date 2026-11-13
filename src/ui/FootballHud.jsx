import { useEffect, useRef, useState } from "react";
import { emit, events } from "../experience/state";
import { MODES } from "../worlds/living/football/match";
import { football } from "../worlds/living/football/shared";

// Interfaz del fútbol, solo mientras se juega: modos, barrera, reiniciar y
// salir (también para pantallas táctiles) y la barra de potencia con el
// efecto. El marcador no está aquí: es el de madera del campo
// (worlds/living/football/Football.jsx). La barra se mueve por ref en cada
// fotograma, sin renders.
export function FootballHud({ touch }) {
 const [state, setState] = useState(null); // { mode, stats, phase, wallOn } mientras se juega
 const fill = useRef(null);
 const curl = useRef(null);
 const bar = useRef(null);

 useEffect(() => {
  const onMatch = (event) => {
   const detail = event.detail;
   if (detail.type === "exit") setState(null);
   else if (detail.type === "stats" && football.match?.active) setState({ mode: detail.mode, stats: { ...detail.stats }, phase: detail.phase, wallOn: detail.wallOn });
  };
  events.addEventListener("football", onMatch);
  return () => events.removeEventListener("football", onMatch);
 }, []);

 const playing = Boolean(state);
 useEffect(() => {
  if (!playing) return undefined;
  let frame;
  const tick = () => {
   const match = football.match;
   if (match && bar.current) {
    const charging = match.phase === "charge" || match.phase === "strike";
    const power = match.phase === "strike" ? (match.kick?.power ?? 0) : match.power;
    bar.current.dataset.on = charging ? "1" : "0";
    fill.current.style.transform = `scaleX(${charging ? power : 0})`;
    curl.current.style.transform = `translateX(${(match.phase === "strike" ? (match.kick?.curl ?? 0) : match.curl) * 46}px)`;
   }
   frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
 }, [playing]);

 if (!state) return null;
 const { mode, wallOn, phase } = state;
 const rules = MODES[mode];
 const command = (detail) => (event) => {
  event.currentTarget.blur();
  emit("football-command", detail);
 };
 return (
  <div className="football" data-phase={phase}>
   <div className="football__top">
    <div className="football__modes" role="group" aria-label="Modo de juego">
     {Object.entries(MODES).map(([id, one]) => (
      <button key={id} type="button" aria-pressed={id === mode} onClick={command({ command: "mode", mode: id })}>
       {one.name}
      </button>
     ))}
    </div>
    <div className="football__tools">
     {rules.wall && (
      <button type="button" aria-pressed={wallOn} onClick={command({ command: "wall" })}>
       Barrera {wallOn ? "sí" : "no"}
      </button>
     )}
     <button type="button" onClick={command({ command: "restart" })}>Reiniciar</button>
     <button type="button" className="football__exit" onClick={command({ command: "exit" })}>Salir</button>
    </div>
   </div>
   <div className="football__bottom">
    <p className="football__help">
     {phase === "over"
      ? "Ronda terminada. Pulsa para jugar otra."
      : touch
        ? "Toca la portería para apuntar, mantén para cargar, desliza de lado para dar efecto y suelta."
        : "Apunta con el ratón · mantén pulsado para cargar · mueve de lado para dar efecto · suelta para chutar"}
    </p>
    <div ref={bar} className="football__power" data-on="0" aria-hidden="true">
     <div className="football__sweet" />
     <div ref={fill} className="football__fill" />
     <div className="football__curl"><span ref={curl} /></div>
    </div>
   </div>
  </div>
 );
}
