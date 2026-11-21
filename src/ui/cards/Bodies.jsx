import { useEffect, useRef, useState } from "react";
import { isPending } from "../../content/cards";
import { Blueprint, DogSilhouette, Ornament, ProjectMarker } from "./Markers";

// El contenido de cada variante de carta. Todo lo que pintan viene en `content`
// (ver content/cards.js): aquí no hay textos de ningún proyecto.

// Un dato que aún falta se enseña tal cual, pero marcado: se ve que es un hueco, no un texto.
const Value = ({ children }) => (isPending(children) ? <span className="card__pending">{children}</span> : children);

// ── Galería ─────────────────────────────────────────────────────────────────
// Imágenes (y, el primero, un vídeo corto si lo hay) con flechas y puntos; con
// las flechas del teclado también. Sin material, el marcador dibujado.
function Gallery({ items, video, color, label }) {
 const slides = [...(video ? [{ video }] : []), ...items.map((src) => ({ src }))];
 const [at, setAt] = useState(0);
 const index = Math.min(at, Math.max(0, slides.length - 1));
 const many = slides.length > 1;
 useEffect(() => {
  if (!many) return undefined;
  const onKey = (event) => {
   if (event.key === "ArrowRight") setAt((value) => (Math.min(value, slides.length - 1) + 1) % slides.length);
   else if (event.key === "ArrowLeft") setAt((value) => (Math.min(value, slides.length - 1) - 1 + slides.length) % slides.length);
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
 }, [many, slides.length]);
 if (!slides.length) {
  return (
   <div className="card__gallery">
    <ProjectMarker color={color} label={label} />
   </div>
  );
 }
 const slide = slides[index];
 return (
  <div className="card__gallery" aria-roledescription="galería">
   {slide.video ? (
    // (Solo existe con la carta abierta: no se descarga antes.)
    <video key={slide.video} className="card__slide" src={slide.video} muted loop playsInline autoPlay preload="metadata" />
   ) : (
    <img key={slide.src} className="card__slide" src={slide.src} alt={`${label}, imagen ${index + 1} de ${slides.length}`} />
   )}
   {many && (
    <>
     <button type="button" className="card__arrow card__prev" aria-label="Imagen anterior" onClick={() => setAt((index - 1 + slides.length) % slides.length)}>
      ‹
     </button>
     <button type="button" className="card__arrow card__next" aria-label="Imagen siguiente" onClick={() => setAt((index + 1) % slides.length)}>
      ›
     </button>
     <div className="card__dots">
      {slides.map((one, i) => (
       <button key={one.src ?? one.video} type="button" className={`card__dot${i === index ? " card__dot--on" : ""}`} aria-label={`Imagen ${i + 1}`} aria-current={i === index} onClick={() => setAt(i)} />
      ))}
     </div>
    </>
   )}
  </div>
 );
}

// ── Mundo 1 · ficha de proyecto ─────────────────────────────────────────────
export function ProjectBody({ content }) {
 return (
  <>
   <Gallery items={content.gallery ?? []} video={content.video} color={content.color} label={content.title} />
   <div className="ficha__body">
    <p className="modal__eyebrow">
     {content.eyebrow}
     {content.year && <span className="ficha__year">{content.year}</span>}
    </p>
    <h2 className="modal__title">{content.title}</h2>
    {content.tagline && <p className="ficha__tagline">{content.tagline}</p>}
    {content.paragraphs?.map((paragraph) => (
     <p key={paragraph} className="modal__text">
      {paragraph}
     </p>
    ))}
    <dl className="ficha__facts">
     <div>
      <dt>Mi papel</dt>
      <dd>
       <Value>{content.role}</Value>
      </dd>
     </div>
    </dl>
    {content.tags && (
     <ul className="modal__tags" aria-label="Tecnologías">
      {content.tags.map((tag) => (
       <li key={tag}>{tag}</li>
      ))}
     </ul>
    )}
    <div className="card__actions">
     {content.link && (
      <a className="modal__link" href={content.link} target="_blank" rel="noopener noreferrer">
       {content.linkLabel ?? "Ver proyecto"} <span aria-hidden="true">→</span>
      </a>
     )}
     {content.code && (
      <a className="modal__link modal__link--ghost" href={content.code} target="_blank" rel="noopener noreferrer">
       Código <span aria-hidden="true">↗</span>
      </a>
     )}
    </div>
   </div>
  </>
 );
}

// ── Mundo 2 · hoja de cuento ────────────────────────────────────────────────
export function TaleBody({ content }) {
 return (
  <>
   <span className="hoja__pin" aria-hidden="true" />
   <p className="modal__eyebrow">{content.eyebrow}</p>
   <h2 className="modal__title">
    <span>{content.title}</span>
    <Ornament name={content.ornament} />
   </h2>
   <svg className="hoja__rule" viewBox="0 0 220 12" aria-hidden="true" preserveAspectRatio="none">
    <path d="M2 7 C30 1 46 11 74 6 S126 2 150 7 S196 10 218 4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
   </svg>
   <div className={`hoja__row${content.polaroid ? " hoja__row--photo" : ""}`}>
    <div className="hoja__text">
     {content.paragraphs?.map((paragraph) => (
      <p key={paragraph} className="modal__text">
       {paragraph}
      </p>
     ))}
    </div>
    {content.polaroid && (
     <figure className="polaroid">
      {content.photo ? <img src={content.photo} alt={content.caption ?? ""} /> : <DogSilhouette />}
      {content.caption && <figcaption>{content.caption}</figcaption>}
     </figure>
    )}
   </div>
  </>
 );
}

// ── Mundo 3 · holograma ─────────────────────────────────────────────────────
// Capturas que pasan solas.
function Screens({ items, label }) {
 const [at, setAt] = useState(0);
 useEffect(() => {
  if (items.length < 2) return undefined;
  const timer = window.setInterval(() => setAt((value) => (value + 1) % items.length), 2600);
  return () => window.clearInterval(timer);
 }, [items.length]);
 return <img key={items[at]} className="holo__media" src={items[at]} alt={`${label}, captura ${at + 1} de ${items.length}`} />;
}
export function HoloBody({ content }) {
 const video = useRef(null);
 const [sound, setSound] = useState(false);
 const building = content.status !== "published";
 return (
  <>
   <div className="holo__phone">
    <div className="holo__screen">
     {content.video ? (
      // (Silenciado y en bucle; solo existe con la carta abierta.)
      <video ref={video} className="holo__media" src={content.video} muted={!sound} loop playsInline autoPlay preload="metadata" />
     ) : content.screens?.length ? (
      <Screens items={content.screens} label={content.title} />
     ) : (
      <Blueprint building={building} />
     )}
     <span className="holo__scan" aria-hidden="true" />
    </div>
    {content.video && (
     <button type="button" className="holo__sound" aria-pressed={sound} onClick={() => setSound((value) => !value)}>
      {sound ? "Quitar el sonido" : "Poner el sonido"}
     </button>
    )}
   </div>
   <div className="holo__info">
    <p className="modal__eyebrow">{content.eyebrow}</p>
    <h2 className="modal__title">
     <Value>{content.title}</Value>
    </h2>
    <p className={`holo__status holo__status--${building ? "building" : "published"}`}>
     <span aria-hidden="true" />
     {content.statusLabel}
    </p>
    {content.paragraphs?.map((paragraph) => (
     <p key={paragraph} className="modal__text">
      {paragraph}
     </p>
    ))}
    {!building &&
     (content.link ? (
      <a className="modal__link" href={content.link} target="_blank" rel="noopener noreferrer">
       {content.linkLabel} <span aria-hidden="true">→</span>
      </a>
     ) : (
      // Publicada, pero aún sin enlace que poner: el botón se enseña apagado y lo dice.
      <button type="button" className="modal__link holo__open" disabled>
       {content.linkLabel} <span className="card__pending">{content.linkPending}</span>
      </button>
     ))}
   </div>
  </>
 );
}
