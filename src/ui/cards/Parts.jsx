// Piezas que comparten las tres cartas: la X de cerrar, la flecha del botón y
// el botón principal (como mucho uno por carta), que sale del contenido.

export const Cross = () => (
 <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
  <path d="M6 6l12 12M18 6L6 18" />
 </svg>
);
export const Arrow = ({ down = false }) => (
 <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
  <path d={down ? "M12 5v14M6 13l6 6 6-6" : "M5 12h14M13 6l6 6-6 6"} />
 </svg>
);

// La X: una sola por carta. Cada variante le da su aspecto con `className`.
export const CloseButton = ({ className, close }) => (
 <button type="button" className={`modal__close ${className}`} aria-label="Cerrar" title="Cerrar (E o Esc)" onClick={close}>
  <Cross />
 </button>
);

// El botón principal. Según lo que traiga la carta: un enlace, un viaje a otro
// mundo en el cohete, o que Woody lleve a un sitio. Si no trae nada, no hay botón.
// `act`: { voyage(mundo), guide(sitio), about() } (lo pone Modal.jsx).
export function MainAction({ content, act, className = "" }) {
 if (content.link) {
  return (
   <a className={`modal__link ${className}`} href={content.link} {...(content.download ? { download: "" } : { target: "_blank", rel: "noopener noreferrer" })}>
    {content.linkLabel ?? "Abrir"} <Arrow down={content.download} />
   </a>
  );
 }
 if (content.voyage) {
  return (
   <button type="button" className={`modal__link modal__voyage ${className}`} onClick={() => act.voyage(content.voyage)}>
    {content.action ?? "Viajar"} <Arrow />
   </button>
  );
 }
 if (content.guide) {
  return (
   <button type="button" className={`modal__link modal__guide ${className}`} onClick={() => act.guide(content.guide)}>
    {content.guideLabel ?? "Siguiente parada"} <Arrow />
   </button>
  );
 }
 return null;
}
// Segunda opción, discreta (un enlace de texto, no otro botón): «Leerlo aquí».
export const SideAction = ({ content, act, className = "" }) =>
 content.about ? (
  <button type="button" className={`modal__about ${className}`} onClick={act.about}>
   {content.about}
  </button>
 ) : null;

// Una imagen de la carta: la foto o captura si la hay; si no, su marcador dibujado.
export const Picture = ({ src, alt, children }) => (src ? <img className="marker" src={src} alt={alt ?? ""} /> : children);
