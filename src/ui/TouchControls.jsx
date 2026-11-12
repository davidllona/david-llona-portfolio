import { useEffect, useRef, useState } from "react";
import * as world from "../experience/state";

const { events, input, queueAction, releaseMovement } = world;

const STICK_RADIUS = 56; // px que hay que arrastrar para empujar a fondo

// Controles táctiles: joystick flotante en la mitad izquierda, botón de salto y,
// cuando hay algo que usar cerca, botón de acción. El resto de la pantalla queda
// libre para tocar los objetos de la escena. Escriben en `input`, igual que el
// teclado. El joystick se mueve por ref, sin renders en cada gesto.
export function TouchControls({ onPause }) {
 const base = useRef(null);
 const knob = useRef(null);
 const finger = useRef(null); // { id, x, y } del dedo que lleva el joystick

 useEffect(() => releaseMovement, []);

 // El botón de acción solo aparece cuando hay algo que usar cerca.
 const [hint, setHint] = useState(world.hint);
 useEffect(() => {
  const onHint = () => setHint(world.hint);
  events.addEventListener("hint", onHint);
  return () => events.removeEventListener("hint", onHint);
 }, []);

 const setKnob = (x, y) => {
  knob.current.style.transform = `translate(${x}px, ${y}px)`;
 };

 const onPointerDown = (event) => {
  if (finger.current) return;
  event.currentTarget.setPointerCapture(event.pointerId);
  finger.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  // El joystick aparece donde se apoya el pulgar.
  base.current.style.left = `${event.clientX}px`;
  base.current.style.top = `${event.clientY}px`;
  base.current.classList.add("touch__stick--active");
 };

 const onPointerMove = (event) => {
  if (finger.current?.id !== event.pointerId) return;
  let dx = event.clientX - finger.current.x;
  let dy = event.clientY - finger.current.y;
  const length = Math.hypot(dx, dy);
  if (length > STICK_RADIUS) {
   dx = (dx / length) * STICK_RADIUS;
   dy = (dy / length) * STICK_RADIUS;
  }
  setKnob(dx, dy);
  input.stick.x = dx / STICK_RADIUS;
  input.stick.y = dy / STICK_RADIUS;
 };

 const onPointerEnd = (event) => {
  if (finger.current?.id !== event.pointerId) return;
  finger.current = null;
  input.stick.x = input.stick.y = 0;
  setKnob(0, 0);
  base.current.style.left = "";
  base.current.style.top = "";
  base.current.classList.remove("touch__stick--active");
 };

 return (
  <div className="touch" onContextMenu={(event) => event.preventDefault()}>
   <div
    className="touch__zone"
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerEnd}
    onPointerCancel={onPointerEnd}
   />
   <div ref={base} className="touch__stick" aria-hidden="true">
    <div ref={knob} className="touch__knob" />
   </div>

   <button
    type="button"
    className="touch__button touch__jump"
    onPointerDown={() => {
     input.jumpQueued = true;
    }}
   >
    Saltar
   </button>

   {hint && (
    <button type="button" className="touch__button touch__action" onPointerDown={queueAction}>
     Usar
    </button>
   )}

   <button type="button" className="touch__button touch__pause" aria-label="Pausa" onClick={onPause}>
    <span aria-hidden="true">II</span>
   </button>
  </div>
 );
}
