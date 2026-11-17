import { useRef } from "react";
import { aboutText } from "../content/about";
import { FUTURE, STOPS, STOP_ORDER, STORY, TIMELINE } from "../content/twisted";
import { useDialog } from "./useDialog";

// «Sobre mí», entero y de una vez: todo lo que cuenta The Twisted Moon —las
// paradas, el recorrido y lo que viene—, para quien prefiera leerlo sin
// pasear por la isla. Se abre desde el menú superior. Los textos son los
// mismos que los de las paradas (content/twisted.js y content/about.js).
export function AboutPanel({ onClose, onWalk }) {
 const card = useRef(null);
 useDialog(card, onClose);
 return (
  <div className="sheet" role="dialog" aria-modal="true" aria-label="Sobre mí" onClick={onClose}>
   <div ref={card} className="sheet__card sheet__card--narrow" onClick={(event) => event.stopPropagation()}>
    <header className="sheet__bar">
     <p className="sheet__name">Sobre mí</p>
     <button type="button" className="modal__close sheet__close" aria-label="Cerrar" onClick={onClose}>
      ×
     </button>
    </header>
    <div className="sheet__scroll about">
     <section className="about__part">
      <p className="modal__eyebrow">{STORY.place}</p>
      <h3 className="about__title">{STORY.title}</h3>
      {aboutText.paragraphs.map((paragraph) => (
       <p key={paragraph} className="modal__text">
        {paragraph}
       </p>
      ))}
     </section>
     {STOP_ORDER.map((id) => (
      <section key={id} className="about__part">
       <p className="modal__eyebrow">{STOPS[id].place}</p>
       <h3 className="about__title">{STOPS[id].title}</h3>
       {STOPS[id].paragraphs.map((paragraph) => (
        <p key={paragraph} className="modal__text">
         {paragraph}
        </p>
       ))}
      </section>
     ))}
     <section className="about__part">
      <p className="modal__eyebrow">{TIMELINE.place}</p>
      <h3 className="about__title">{TIMELINE.title}</h3>
      <ol className="modal__timeline">
       {TIMELINE.milestones.map(([when, what]) => (
        <li key={when}>
         <b>{when}</b>
         <span>{what}</span>
        </li>
       ))}
      </ol>
     </section>
     <section className="about__part">
      <p className="modal__eyebrow">{FUTURE.place}</p>
      <h3 className="about__title">{FUTURE.title}</h3>
      {FUTURE.paragraphs.map((paragraph) => (
       <p key={paragraph} className="modal__text">
        {paragraph}
       </p>
      ))}
     </section>
     {onWalk && (
      <p className="about__walk">
       <button type="button" className="modal__link" onClick={onWalk}>
        Recorrerlo con Woody <span aria-hidden="true">→</span>
       </button>
      </p>
     )}
    </div>
   </div>
  </div>
 );
}
