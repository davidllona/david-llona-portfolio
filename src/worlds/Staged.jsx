import { Children, useEffect, useRef, useState } from "react";

// Monta a sus hijos de uno en uno, cediendo el turno al navegador entre cada
// cual: construir el planeta de golpe bloquea el hilo principal cientos de ms
// seguidos. Se puede anidar (un <Staged> dentro de otro): entre todos montan
// una sola pieza cada vez, y `onDone` avisa cuando no queda nada por montar en
// ninguno.
const queue = { pending: 0, turns: [], taken: false };

// Cede el turno sin esperar al siguiente fotograma (detrás de la pantalla de
// carga no se dibuja nada que haya que dejar pasar).
function later(work) {
 let live = true;
 const channel = new MessageChannel();
 channel.port1.onmessage = () => live && work();
 channel.port2.postMessage(0);
 return () => (live = false);
}

// Un único turno para todos: el siguiente no empieza hasta que quien lo tiene
// ha terminado de montar su pieza (`release`).
function pump() {
 if (queue.taken || !queue.turns.length) return;
 queue.taken = true;
 later(() => {
  const turn = queue.turns.shift();
  if (turn) turn();
  else release();
 });
}
function release() {
 queue.taken = false;
 pump();
}
function request(turn) {
 queue.turns.push(turn);
 pump();
 return () => {
  const at = queue.turns.indexOf(turn);
  if (at >= 0) queue.turns.splice(at, 1);
 };
}

// Trabajo previo al montaje que también cuenta como pendiente. Devuelve cómo darlo por hecho.
export function busy() {
 queue.pending += 1;
 let open = true;
 return () => {
  if (open) queue.pending -= 1;
  open = false;
 };
}

// Lo mismo que `later`, como promesa.
export const breathe = () => new Promise((resolve) => later(resolve));

export function Staged({ children, onDone }) {
 const parts = Children.toArray(children);
 const [count, setCount] = useState(1);
 const [idle, setIdle] = useState(false);
 const holding = useRef(false);
 const mounted = count >= parts.length;
 useEffect(() => {
  // La pieza pedida en el turno anterior ya está montada: pasa el turno.
  if (holding.current) {
   holding.current = false;
   release();
  }
  if (mounted) return undefined;
  queue.pending += 1;
  const cancel = request(() => {
   holding.current = true;
   setCount((value) => value + 1);
  });
  return () => {
   queue.pending -= 1;
   cancel();
  };
 }, [count, mounted]);
 useEffect(
  () => () => {
   if (holding.current) release();
  },
  [],
 );
 // Los hijos recién montados se apuntan en este mismo ciclo: se mira después.
 useEffect(() => {
  if (!mounted || !onDone || idle) return undefined;
  let cancel;
  const look = () => {
   if (queue.pending === 0) setIdle(true);
   else cancel = later(look);
  };
  cancel = later(look);
  return () => cancel();
 }, [mounted, onDone, idle]);
 useEffect(() => {
  if (idle) onDone?.();
  // `onDone` no cambia durante la vida del componente.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [idle]);
 return parts.slice(0, count);
}
