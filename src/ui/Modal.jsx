import { useEffect, useState } from "react";
import { events } from "../experience/state";

// Ficha que se abre al pulsar un cartel o un objeto del planeta (evento "open").
export function Modal() {
 const [content, setContent] = useState(null);

 useEffect(() => {
  const onOpen = (event) => setContent(event.detail);
  const onKey = (event) => event.key === "Escape" && setContent(null);
  events.addEventListener("open", onOpen);
  window.addEventListener("keydown", onKey);
  return () => {
   events.removeEventListener("open", onOpen);
   window.removeEventListener("keydown", onKey);
  };
 }, []);

 if (!content) return null;

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
     <a className="modal__link" href={content.link} target="_blank" rel="noopener noreferrer">
      {content.linkLabel ?? "Abrir"} <span aria-hidden="true">→</span>
     </a>
    )}
   </article>
  </div>
 );
}
