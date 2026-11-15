import { useEffect, useState } from "react";
import { events } from "../experience/state";

// Pantalla del viaje entre mundos. Cubre la escena mientras la nave se aleja,
// se queda puesta mientras el mundo de destino se monta y se compila detrás, y
// se retira cuando ya se puede ver (ver worlds/travel.js). Dice a dónde se va.
export function TravelOverlay() {
 // `shown`: está en pantalla; `covering`: opaca (o yendo a serlo).
 const [trip, setTrip] = useState(null);
 const [covering, setCovering] = useState(false);
 useEffect(() => {
  let timer = 0;
  const onVoyage = (event) => {
   const { phase, name, motto } = event.detail ?? {};
   window.clearTimeout(timer);
   if (phase === "leaving") {
    setTrip({ name, motto });
    // (Un fotograma después, para que la transición de entrada arranque.)
    timer = window.setTimeout(() => setCovering(true), 30);
   } else if (phase === "arrived" || phase === "failed") {
    setCovering(false);
    timer = window.setTimeout(() => setTrip(null), 1300);
   }
  };
  events.addEventListener("voyage", onVoyage);
  return () => {
   window.clearTimeout(timer);
   events.removeEventListener("voyage", onVoyage);
  };
 }, []);
 if (!trip) return null;
 return (
  <div className={`travel${covering ? " travel--on" : ""}`} role="status" aria-live="polite">
   <div className="travel__stars" aria-hidden="true" />
   <p className="travel__eyebrow">Rumbo a</p>
   <p className="travel__name">{trip.name}</p>
   {trip.motto && <p className="travel__motto">{trip.motto}</p>}
  </div>
 );
}
