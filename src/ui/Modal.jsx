import { useEffect, useState } from "react";
import { emit, events, releaseMovement, rig, ui } from "../experience/state";

const APPROACH = 750; // ms que tarda la cámara en acercarse antes de abrir la ficha

// Ficha que se abre al usar un edificio o un objeto del planeta (evento
// "open"). Si el evento dice dónde está (`at`), la cámara se acerca primero a
// ese sitio y la ficha se abre al llegar; al cerrarla, la cámara vuelve al
// astronauta y se sigue jugando.
export function Modal() {
 const [content, setContent] = useState(null);
 const [arrived, setArrived] = useState(false);

 useEffect(() => {
  const onOpen = (event) => {
   setArrived(false);
   setContent(event.detail);
  };
  const onKey = (event) => event.key === "Escape" && setContent(null);
  events.addEventListener("open", onOpen);
  window.addEventListener("keydown", onKey);
  return () => {
   events.removeEventListener("open", onOpen);
   window.removeEventListener("keydown", onKey);
  };
 }, []);

 // Con la ficha abierta (o la cámara de camino), el juego no recibe controles.
 const isOpen = Boolean(content);
 useEffect(() => {
  if (!isOpen) return undefined;
  releaseMovement();
  ui.open += 1;
  return () => {
   ui.open -= 1;
   emit("close");
  };
 }, [isOpen]);

 // Acercamiento de la cámara al edificio.
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
 }, [content]);

 if (!content || !arrived) return null;

 return (
  <div className="modal" role="dialog" aria-modal="true" aria-label={content.title} onClick={() => setContent(null)}>
   <article className="modal__card" onClick={(event) => event.stopPropagation()}>
    <button type="button" className="modal__close" aria-label="Cerrar" onClick={() => setContent(null)} autoFocus>
     ×
    </button>
    {content.image && <img className="modal__image" src={content.image} alt={content.title} />}
    {content.eyebrow && <p className="modal__eyebrow">{content.eyebrow}</p>}
    <h2 className="modal__title">{content.title}</h2>
    {content.paragraphs?.map((paragraph) => (
     <p key={paragraph} className="modal__text">
      {paragraph}
     </p>
    ))}
    {content.tags && (
     <ul className="modal__tags">
      {content.tags.map((tag) => (
       <li key={tag}>{tag}</li>
      ))}
     </ul>
    )}
    {content.link && (
     <a className="modal__link" href={content.link} {...(content.download ? { download: "" } : { target: "_blank", rel: "noopener noreferrer" })}>
      {content.linkLabel ?? "Abrir"} <span aria-hidden="true">{content.download ? "↓" : "→"}</span>
     </a>
    )}
   </article>
  </div>
 );
}
