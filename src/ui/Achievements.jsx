import { useEffect, useRef, useState } from "react";
import { Badge } from "../achievements/Badge";
import { ACHIEVEMENTS, BY_ID } from "../achievements/list";
import { isUnlocked, progressOf, resetAll, unlockedCount } from "../achievements/store";
import { events } from "../experience/state";
import { useDialog } from "./useDialog";

// Vuelve a pintar quien lo use cada vez que cambia el progreso.
function useProgress() {
 const [, refresh] = useState(0);
 useEffect(() => {
  const onChange = () => refresh((value) => value + 1);
  events.addEventListener("achievement", onChange);
  events.addEventListener("achievement-progress", onChange);
  return () => {
   events.removeEventListener("achievement", onChange);
   events.removeEventListener("achievement-progress", onChange);
  };
 }, []);
}

// Botón del menú rápido, con el recuento.
export function AchievementsButton({ onOpen }) {
 useProgress();
 return (
  <button type="button" className="quick__trophy" onClick={(event) => (event.currentTarget.blur(), onOpen())}>
   Logros{" "}
   <span>
    {unlockedCount()}/{ACHIEVEMENTS.length}
   </span>
  </button>
 );
}

// Vitrina con los 21 logros.
export function AchievementsPanel({ onClose }) {
 const card = useRef(null);
 const [confirming, setConfirming] = useState(false);
 useDialog(card, onClose);
 useProgress();

 return (
  <div className="sheet" role="dialog" aria-modal="true" aria-label="Logros" onClick={onClose}>
   <div ref={card} className="sheet__card sheet__card--narrow" onClick={(event) => event.stopPropagation()}>
    <header className="sheet__bar">
     <p className="sheet__name">
      Logros{" "}
      <span>
       {unlockedCount()}/{ACHIEVEMENTS.length}
      </span>
     </p>
     <button type="button" className="modal__close sheet__close" aria-label="Cerrar" onClick={onClose}>
      ×
     </button>
    </header>
    <div className="sheet__scroll">
     <ul className="achievements">
      {ACHIEVEMENTS.map((achievement) => {
       const unlocked = isUnlocked(achievement.id);
       const progress = progressOf(achievement.id);
       return (
        <li key={achievement.id} className={`achievement${unlocked ? " achievement--unlocked" : ""}`}>
         <Badge achievement={achievement} locked={!unlocked} size={64} />
         <div>
          <p className="achievement__group">{achievement.group}</p>
          <h3 className="achievement__name">{achievement.name}</h3>
          <p className="achievement__text">{achievement.description}</p>
          {unlocked ? (
           <p className="achievement__state achievement__state--done">Conseguido</p>
          ) : !achievement.ready ? (
           <p className="achievement__state">Próximamente</p>
          ) : achievement.goal ? (
           <p className="achievement__state">
            {progress} de {achievement.goal}
            <progress value={progress} max={achievement.goal} aria-label={`Progreso de ${achievement.name}`} />
           </p>
          ) : (
           <p className="achievement__state">Sin conseguir</p>
          )}
         </div>
        </li>
       );
      })}
     </ul>
     <p className="achievements__note">El progreso se guarda solo en este navegador.</p>
     {confirming ? (
      <p className="achievements__reset">
       ¿Borrar todo el progreso?{" "}
       <button type="button" onClick={() => (resetAll(), setConfirming(false))}>
        Sí, borrar
       </button>
       <button type="button" onClick={() => setConfirming(false)}>
        Cancelar
       </button>
      </p>
     ) : (
      <p className="achievements__reset">
       <button type="button" onClick={() => setConfirming(true)} disabled={unlockedCount() === 0}>
        Reiniciar progreso
       </button>
      </p>
     )}
    </div>
   </div>
  </div>
 );
}

// Aviso discreto al conseguir un logro. Si llegan varios, salen de uno en uno.
export function AchievementToast() {
 const [queue, setQueue] = useState([]);
 useEffect(() => {
  const onUnlock = (event) => setQueue((list) => [...list, event.detail.id]);
  events.addEventListener("achievement", onUnlock);
  return () => events.removeEventListener("achievement", onUnlock);
 }, []);
 const current = queue[0];
 useEffect(() => {
  if (!current) return undefined;
  const timer = window.setTimeout(() => setQueue((list) => list.slice(1)), 4200);
  return () => window.clearTimeout(timer);
 }, [current]);

 if (!current) return null;
 const achievement = BY_ID[current];
 return (
  <div key={current} className="achievement-toast" role="status">
   <Badge achievement={achievement} size={52} />
   <p>
    <span>Logro conseguido</span>
    <strong>{achievement.name}</strong>
   </p>
  </div>
 );
}
