import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { emit, events, input, releaseMovement, rig, ui, view } from "../experience/state";
import { requestVoyage } from "../worlds/travel";
import { HoloBody, ProjectBody, TaleBody } from "./cards/Bodies";

const APPROACH = 750; // ms que tarda la cámara en acercarse antes de abrir la carta
const E_GUARD = 320; // ms tras abrirse en que la E aún no cierra (es la misma pulsación que la abrió)

// La carta que se abre al usar un edificio o un objeto (evento "open"). Un solo
// componente con tres variantes, una por mundo (`variant` en los datos; ver
// content/cards.js):
//  · "ficha": la ficha de proyecto del mundo 1, clara, con galería;
//  · "hoja":  la hoja de cuento del mundo 2, papel sujeto con una chincheta;
//  · "holo":  el holograma del mundo 3, un móvil translúcido que proyecta la máquina.
// Sin variante, la carta sencilla de siempre (avisos de viaje, el CV, el núcleo…).
// Lo común a todas: el mismo botón de cerrar, las mismas teclas (E o Esc), un
// velo suave que deja ver el mundo, el foco atrapado dentro y la misma
// entrada: la carta sale del objeto usado, desde su sitio en la pantalla.
// Si el evento dice dónde está (`at`), la cámara se acerca primero y la carta
// se abre al llegar; al cerrarla, la cámara vuelve al astronauta.
const BODIES = { ficha: ProjectBody, hoja: TaleBody, holo: HoloBody };

// El borde irregular de la hoja de cuento: un contorno mordido, siempre el mismo.
const PAPER_EDGE = (() => {
 const bite = (i) => {
  const v = Math.sin(i * 127.1 + 3.3) * 43758.5453;
  return (v - Math.floor(v)) * 0.9;
 };
 const points = [];
 const side = (count, at) => Array.from({ length: count + 1 }, (_, i) => at(i / count, bite(points.length + i))).forEach((point) => points.push(point));
 side(18, (t, b) => `${(t * 100).toFixed(1)}% ${b.toFixed(2)}%`);
 side(22, (t, b) => `${(100 - b * 0.9).toFixed(2)}% ${(t * 100).toFixed(1)}%`);
 side(18, (t, b) => `${(100 - t * 100).toFixed(1)}% ${(100 - b).toFixed(2)}%`);
 side(22, (t, b) => `${(b * 0.9).toFixed(2)}% ${(100 - t * 100).toFixed(1)}%`);
 return `polygon(${points.join(", ")})`;
})();

const point = new THREE.Vector3();
// Dónde cae en la pantalla el objeto usado, en px desde el centro de la ventana.
function originOf(at) {
 if (!at || !view.camera) return { x: 0, y: 0 };
 point.set(at.x, at.y ?? 0, at.z).project(view.camera);
 if (point.z > 1) return { x: 0, y: 0 };
 const clamp = (value) => Math.max(-0.9, Math.min(0.9, value));
 return { x: (clamp(point.x) * window.innerWidth) / 2, y: (-clamp(point.y) * window.innerHeight) / 2 };
}

export function Modal() {
 const [content, setContent] = useState(null);
 const [arrived, setArrived] = useState(false);
 const card = useRef(null);
 const shownAt = useRef(0);

 useEffect(() => {
  const onOpen = (event) => {
   setArrived(false);
   setContent(event.detail);
  };
  events.addEventListener("open", onOpen);
  // Para las pruebas y las capturas: cambia datos de la carta abierta.
  if (import.meta.env.DEV) window.__world.card = (patch) => setContent((now) => (now ? { ...now, ...patch } : now));
  return () => events.removeEventListener("open", onOpen);
 }, []);

 // Con la carta abierta (o la cámara de camino), el juego no recibe controles.
 const isOpen = Boolean(content);
 useEffect(() => {
  if (!isOpen) return undefined;
  releaseMovement();
  ui.open += 1;
  // Esc la cierra desde el primer momento: también mientras la cámara aún se está acercando.
  const onEscape = (event) => event.key === "Escape" && setContent(null);
  window.addEventListener("keydown", onEscape);
  return () => {
   window.removeEventListener("keydown", onEscape);
   ui.open -= 1;
   // (Si se cerró con la E, esa pulsación no vuelve a usar el objeto.)
   input.actionQueued = false;
   emit("close");
  };
 }, [isOpen]);

 // Acercamiento de la cámara al objeto.
 useEffect(() => {
  if (!content) return undefined;
  const at = content.at;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!at || rig.focus) {
   setArrived(true);
   return undefined;
  }
  rig.focus = { x: at.x, y: at.y ?? 0, z: at.z };
  rig.distance = at.distance ?? 0.62;
  const timer = window.setTimeout(() => setArrived(true), reduced ? 0 : APPROACH);
  return () => {
   window.clearTimeout(timer);
   rig.focus = null;
   rig.distance = 1;
  };
  // (Solo al abrirse otra carta: cambiarle datos a la abierta no mueve la cámara.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [content?.at, isOpen]);

 // Teclas, ya con la carta a la vista: la E también cierra; Tab no sale de la carta.
 const shown = Boolean(content) && arrived;
 useEffect(() => {
  if (!shown) return undefined;
  shownAt.current = performance.now();
  // (La interfaz de juego se retira mientras tanto: ver cards.css.)
  document.documentElement.dataset.carta = "abierta";
  const previous = document.activeElement;
  const focusable = () => [...(card.current?.querySelectorAll("a[href], button:not([disabled]), video[controls]") ?? [])];
  focusable()[0]?.focus();
  const onKey = (event) => {
   if (event.code === "KeyE" && !event.repeat && !event.metaKey && !event.ctrlKey && performance.now() - shownAt.current > E_GUARD) {
    setContent(null);
    return;
   }
   if (event.key !== "Tab") return;
   const items = focusable();
   if (!items.length) return;
   const first = items[0], last = items[items.length - 1];
   if (event.shiftKey && (document.activeElement === first || !card.current.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
   } else if (!event.shiftKey && (document.activeElement === last || !card.current.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
   }
  };
  window.addEventListener("keydown", onKey);
  return () => {
   window.removeEventListener("keydown", onKey);
   delete document.documentElement.dataset.carta;
   previous?.focus?.();
  };
 }, [shown]);

 // De dónde sale: el sitio del objeto en la pantalla, al abrirse.
 const origin = useMemo(() => (shown ? originOf(content.at) : { x: 0, y: 0 }), [shown, content?.at]);

 if (!shown) return null;
 const variant = BODIES[content.variant] ? content.variant : "plain";
 const Body = BODIES[variant];
 const close = () => setContent(null);

 return (
  <div className={`modal modal--${variant}`} style={{ "--from-x": `${origin.x.toFixed(0)}px`, "--from-y": `${origin.y.toFixed(0)}px` }} role="dialog" aria-modal="true" aria-label={content.title} onClick={close}>
   {/* (En el holograma: el haz que sube desde la máquina hasta la proyección.) */}
   {variant === "holo" && <span className="holo__beam" aria-hidden="true" />}
   <article ref={card} className={`modal__card card card--${variant}`} onClick={(event) => event.stopPropagation()}>
    <button type="button" className="modal__close" aria-label="Cerrar" title="Cerrar (E o Esc)" onClick={close}>
     ×
    </button>
    <div className="card__sheet" style={variant === "hoja" ? { clipPath: PAPER_EDGE } : undefined}>
     {Body ? <Body content={content} /> : <PlainBody content={content} close={close} />}
    </div>
   </article>
  </div>
 );
}

// La carta sencilla: título, texto y, según el caso, una línea de tiempo, etiquetas o un botón.
function PlainBody({ content, close }) {
 return (
  <>
   {content.image && <img className="modal__image" src={content.image} alt={content.title} />}
   {content.eyebrow && <p className="modal__eyebrow">{content.eyebrow}</p>}
   <h2 className="modal__title">{content.title}</h2>
   {content.paragraphs?.map((paragraph) => (
    <p key={paragraph} className="modal__text">
     {paragraph}
    </p>
   ))}
   {/* Línea de tiempo (The Twisted Moon, «Mi recorrido»): hitos de arriba abajo. */}
   {content.timeline && (
    <ol className="modal__timeline">
     {content.timeline.map(([when, what]) => (
      <li key={when}>
       <b>{when}</b>
       <span>{what}</span>
      </li>
     ))}
    </ol>
   )}
   {content.tags && (
    <ul className="modal__tags">
     {content.tags.map((tag) => (
      <li key={tag}>{tag}</li>
     ))}
    </ul>
   )}
   {/* Lo pedido está en otro mundo: se viaja en el cohete. */}
   {content.voyage && (
    <button
     type="button"
     className="modal__link modal__voyage"
     onClick={() => {
      close();
      requestVoyage(content.voyage);
     }}
    >
     {content.action ?? "Viajar"} <span aria-hidden="true">→</span>
    </button>
   )}
   {/* «Sobre mí» sin viajar: abre el panel con todos los textos. */}
   {content.about && (
    <button
     type="button"
     className="modal__link modal__about"
     onClick={() => {
      close();
      emit("about");
     }}
    >
     {content.about}
    </button>
   )}
   {/* Un destino que aún no existe: el botón se enseña, apagado. */}
   {content.soon && (
    <button type="button" className="modal__link modal__soon" disabled>
     {content.soon} <span>{content.soonNote}</span>
    </button>
   )}
   {content.link && (
    <a className="modal__link" href={content.link} {...(content.download ? { download: "" } : { target: "_blank", rel: "noopener noreferrer" })}>
     {content.linkLabel ?? "Abrir"} <span aria-hidden="true">{content.download ? "↓" : "→"}</span>
    </a>
   )}
  </>
 );
}
