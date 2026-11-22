import { useMemo } from "react";
import { PhoneSketch, Silhouette, UiSketch } from "./Markers";
import { CloseButton, MainAction, Picture, SideAction } from "./Parts";
import { FitTitle } from "./FitTitle";

// Las tres cartas (objetivo 26). Cada una es un objeto de su mundo, copiado de
// la maqueta aprobada por David (docs/referencias/cartas/): mismas medidas,
// colores, sombras y giros. Todo lo que pintan viene en `content` (ver
// content/cards.js): aquí no hay textos de ningún proyecto.
// Estructura común: dos imágenes torcidas a la izquierda (la de abajo montada
// sobre la de arriba), el texto a la derecha, una sola X y, como mucho, un botón.

// Los títulos largos van más pequeños (las medidas de la maqueta son para un nombre corto).
const titleClass = (title = "") => `modal__title${title.length > 16 ? " modal__title--largo" : title.length > 8 ? " modal__title--medio" : ""}`;
const Paragraphs = ({ list }) =>
 list?.map((paragraph) => (
  <p key={paragraph} className="modal__text">
   {paragraph}
  </p>
 )) ?? null;
// Línea de tiempo: hitos de arriba abajo.
const Timeline = ({ items }) =>
 items ? (
  <ol className="modal__timeline">
   {items.map(([when, what]) => (
    <li key={when}>
     <b>{when}</b>
     <span>{what}</span>
    </li>
   ))}
  </ol>
 ) : null;
// Lista numerada (el tablón de puntuaciones): posición, nombre y puntos.
const Ranking = ({ rows, empty }) =>
 rows ? (
  rows.length ? (
   <ol className="card__ranking">
    {rows.map((row, i) => (
     <li key={`${i}-${row.name}`} className={row.mine ? "card__mine" : undefined}>
      <b>{i + 1}</b>
      <span>{row.name}</span>
      <em>{row.score}</em>
     </li>
    ))}
   </ol>
  ) : (
   <p className="modal__text">{empty}</p>
  )
 ) : null;

// ── Mundo 1 · cartel de madera ──────────────────────────────────────────────
// Vetas, juntas y clavos de la cara de tablones: tres vetas onduladas por
// tablón (48 px), la junta entre tablones y un clavo a cada lado. Siempre igual.
function Planks({ width }) {
 const lines = useMemo(() => {
  const noise = (i) => {
   const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
   return v - Math.floor(v);
  };
  const out = [];
  for (let plank = 0; plank < 34; plank++) {
   const top = plank * 48;
   for (let k = 0; k < 3; k++) {
    const y = top + 6 + k * 13.5 + noise(plank * 7 + k) * 3;
    const points = Array.from({ length: Math.ceil(width / 40) + 2 }, (_, i) => `${i * 40},${(y + noise(plank * 31 + k * 13 + i) * 3).toFixed(1)}`).join(" ");
    out.push(<polyline key={`v${plank}-${k}`} points={points} fill="none" stroke="#8a5a2b" strokeWidth="1" opacity="0.16" />);
   }
   out.push(<rect key={`j${plank}`} x="0" y={top + 46} width={width} height="2" fill="#c9a66d" opacity="0.55" />);
   out.push(<circle key={`a${plank}`} cx="14" cy={top + 24} r="2.6" fill="#6b4220" opacity="0.55" />, <circle key={`b${plank}`} cx={width - 20} cy={top + 24} r="2.6" fill="#6b4220" opacity="0.55" />);
  }
  return out;
 }, [width]);
 return (
  <svg className="cartel__planks" aria-hidden="true" width={width} height={34 * 48} viewBox={`0 0 ${width} ${34 * 48}`}>
   {lines}
  </svg>
 );
}
// Un papel blanco clavado con chinchetas rojas (una o dos); `fold`: con la esquina doblada.
const Paper = ({ className, pins, fold, children }) => (
 <div className={`cartel__paper ${className}`}>
  <div className="cartel__sheet">
   <div className="cartel__shot">{children}</div>
   {fold && <span className="cartel__fold" aria-hidden="true" />}
  </div>
  {pins === 1 ? <span className="cartel__pin cartel__pin--mid" aria-hidden="true" /> : [<span key="a" className="cartel__pin cartel__pin--left" aria-hidden="true" />, <span key="b" className="cartel__pin cartel__pin--right" aria-hidden="true" />]}
 </div>
);
export function WoodSign({ content, close, act, mobile }) {
 const papers = Boolean(content.images);
 return (
  <div className={`cartel${papers ? "" : " cartel--solo"}${content.wide ? " cartel--ancho" : ""}`}>
   <div className="cartel__face">
    <Planks width={mobile ? 306 : papers || content.wide ? 836 : 596} />
   </div>
   {["tl", "tr", "bl", "br"].map((corner) => (
    <span key={corner} className={`cartel__screw cartel__screw--${corner}`} aria-hidden="true" />
   ))}
   <CloseButton className="cartel__close" close={close} />
   <div className="cartel__in">
    {papers && (
     <div className="cartel__papers">
      <Paper className="cartel__paper--top" pins={1}>
       <Picture src={content.images[0]} alt={`${content.title}, captura`}>
        <UiSketch color={content.color} label={content.title} />
       </Picture>
      </Paper>
      <Paper className="cartel__paper--bottom" pins={2} fold>
       <Picture src={content.images[1]} alt={`${content.title}, otra captura`}>
        <UiSketch color={content.color} label={content.title} />
       </Picture>
      </Paper>
     </div>
    )}
    <div className="cartel__text">
     {(content.eyebrow || content.badge) && (
      <div className="cartel__top">
       {content.eyebrow && <span className="modal__eyebrow">{content.eyebrow}</span>}
       {content.badge && <span className="cartel__badge">{content.badge}</span>}
      </div>
     )}
     <FitTitle className="modal__title">{content.title}</FitTitle>
     {content.tagline && <p className="cartel__tagline">{content.tagline}</p>}
     {(content.tagline || content.rows) && <span className="cartel__rule" aria-hidden="true" />}
     <Paragraphs list={content.paragraphs} />
     {content.role && (
      <p className="modal__text cartel__role">
       <b>Mi papel:</b> {content.role}
      </p>
     )}
     <Timeline items={content.timeline} />
     <Ranking rows={content.rows} empty={content.rowsEmpty} />
     {content.body}
     {content.tags && (
      <ul className="modal__tags" aria-label="Tecnologías">
       {content.tags.map((tag) => (
        <li key={tag}>{tag}</li>
       ))}
      </ul>
     )}
     {content.links && (
      <ul className="modal__tags cartel__links">
       {content.links.map((link) => (
        <li key={link.href}>
         <a href={link.href} target="_blank" rel="noopener noreferrer">
          {link.label}
         </a>
        </li>
       ))}
      </ul>
     )}
     <div className="cartel__actions">
      <MainAction content={content} act={act} />
      <SideAction content={content} act={act} />
     </div>
    </div>
   </div>
  </div>
 );
}

// ── Mundo 2 · cartel colgante torcido ───────────────────────────────────────
// Una polaroid clavada con chinchetas doradas, con su nota manuscrita.
const Polaroid = ({ className, pins, src, drawing, caption, label }) => (
 <div className={`colgante__polaroid ${className}`}>
  <div className="colgante__print">
   <div className="colgante__photo">
    <Picture src={src} alt={caption ?? label}>
     <Silhouette drawing={drawing} label={label} />
    </Picture>
   </div>
   {caption && <p className="colgante__caption">{caption}</p>}
  </div>
  {pins === 1 ? <span className="colgante__pin colgante__pin--mid" aria-hidden="true" /> : [<span key="a" className="colgante__pin colgante__pin--left" aria-hidden="true" />, <span key="b" className="colgante__pin colgante__pin--right" aria-hidden="true" />]}
 </div>
);
export function HangingSign({ content, close, act, mobile }) {
 const photos = Boolean(content.images);
 return (
  <div className={`colgante${photos ? "" : " colgante--solo"}`}>
   {/* De qué cuelga: en escritorio, el brazo de hierro con sus espirales, las cadenas y el farolillo; en móvil, un gancho. */}
   {mobile ? (
    <svg className="colgante__hook" aria-hidden="true" width="120" height="70" viewBox="0 0 120 70">
     <path d="M60 0v20q0 14 14 14q12 0 12-12q0-10-10-10q-8 0-8 8" fill="none" stroke="#151020" strokeWidth="7" strokeLinecap="round" />
     <path d="M44 34l-8 36M76 34l8 36" stroke="#3a3048" strokeWidth="4" fill="none" />
    </svg>
   ) : (
    <svg className="colgante__arm" aria-hidden="true" width="1000" height="200" viewBox="0 0 1000 200">
     <path d="M30 200V60q0-30 30-30h880" fill="none" stroke="#151020" strokeWidth="16" strokeLinecap="round" />
     <path d="M60 30q-10 40 30 50q30 4 30-20q0-18-18-18q-14 0-14 14" fill="none" stroke="#151020" strokeWidth="8" strokeLinecap="round" />
     <path d="M940 30q22 0 22 22q0 18-16 18q-12 0-12-12" fill="none" stroke="#151020" strokeWidth="8" strokeLinecap="round" />
     <path d="M300 30q-20 24 0 40M700 30q20 24 0 40" fill="none" stroke="#151020" strokeWidth="6" strokeLinecap="round" />
     <g stroke="#3a3048" strokeWidth="5" fill="none">
      <path d="M230 34l-6 100" />
      <path d="M770 34l10 96" />
     </g>
     <g transform="translate(860,30)">
      <path d="M0 0v28" stroke="#151020" strokeWidth="4" />
      <path d="M-16 28h32l-6 44h-20z" fill="#2a2238" stroke="#151020" strokeWidth="3" />
      <rect className="colgante__flame" x="-9" y="36" width="18" height="28" fill="#ffc24a" />
      <circle cx="0" cy="50" r="70" fill="#ffb347" opacity="0.18" />
     </g>
    </svg>
   )}
   <div className="colgante__board">
    <div className="colgante__wood" aria-hidden="true" />
    <div className="colgante__glow" aria-hidden="true" />
    <div className="colgante__tape" aria-hidden="true" />
    {content.gear && (
     <div className="colgante__gear">
      <svg role="img" aria-label={`Engranaje ${content.gear.replace("/", " de ")}`} width="96" height="96" viewBox="0 0 96 96">
       <g fill="#c8901f" stroke="#6b4a0c" strokeWidth="3">
        <path d="M44 4h8l3 12 9 4 11-6 6 6-6 11 4 9 12 3v8l-12 3-4 9 6 11-6 6-11-6-9 4-3 12h-8l-3-12-9-4-11 6-6-6 6-11-4-9-12-3v-8l12-3 4-9-6-11 6-6 11 6 9-4z" />
       </g>
       <circle cx="48" cy="48" r="20" fill="#f4ecda" stroke="#6b4a0c" strokeWidth="3" />
       <text x="48" y="54" textAnchor="middle" fontFamily="Mystery Quest" fontSize="18" fill="#2b2340">
        {content.gear}
       </text>
      </svg>
     </div>
    )}
    {["tl", "tr", "bl", "br"].map((corner) => (
     <span key={corner} className={`colgante__nail colgante__nail--${corner}`} aria-hidden="true" />
    ))}
    <CloseButton className="colgante__close" close={close} />
    <div className="colgante__in">
     {photos && (
      <div className="colgante__photos">
       <Polaroid className="colgante__polaroid--top" pins={1} src={content.images[0]} drawing={content.drawing} caption={content.captions?.[0]} label={content.title} />
       <Polaroid className="colgante__polaroid--bottom" pins={2} src={content.images[1]} drawing={content.drawing} caption={content.captions?.[1]} label={content.title} />
      </div>
     )}
     <div className="colgante__paper">
      <div className="colgante__torn" aria-hidden="true" />
      <span className="colgante__pin colgante__pin--paper" aria-hidden="true" />
      <div className="colgante__text">
       {content.eyebrow && <p className="modal__eyebrow">{content.eyebrow}</p>}
       <FitTitle className={titleClass(content.title)}>{content.title}</FitTitle>
       {content.subtitle && <p className="colgante__subtitle">{content.subtitle}</p>}
       <Paragraphs list={content.paragraphs} />
       {content.note && <p className="modal__text colgante__note">{content.note}</p>}
       <Timeline items={content.timeline} />
       {content.tags && <p className="colgante__tags">{content.tags.join(" · ")}</p>}
       <div className="colgante__actions">
        <MainAction content={content} act={act} />
        <SideAction content={content} act={act} />
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}

// ── Mundo 3 · máquina del laboratorio ───────────────────────────────────────
// Un móvil holográfico flotando sobre su emisor, con el cono de luz que lo proyecta.
const HoloPhone = ({ className, src, video, label }) => (
 <div className={`maquina__phone ${className}`}>
  <div className="maquina__cone" aria-hidden="true" />
  <div className="maquina__glass">
   {video ? (
    // (Silenciado y en bucle; solo existe con la carta abierta: no se descarga al entrar en el mundo.)
    <video className="marker" src={video} muted loop playsInline autoPlay preload="metadata" />
   ) : (
    <Picture src={src} alt={`${label}, captura`}>
     <PhoneSketch label={label} />
    </Picture>
   )}
   <div className="maquina__lines" aria-hidden="true" />
  </div>
  <div className="maquina__emitter" aria-hidden="true" />
 </div>
);
const BUBBLES = [
 [18, 40, 3],
 [25, 74, 4],
 [32, 108, 5],
 [39, 142, 3],
 [24, 176, 4],
 [31, 210, 5],
 [38, 244, 3],
 [23, 278, 4],
 [30, 312, 5],
];
export function LabMachine({ content, close, act }) {
 const phones = Boolean(content.images);
 return (
  <div className={`maquina${phones ? "" : " maquina--solo"}`}>
   <div className="maquina__dome" aria-hidden="true" />
   <div className="maquina__mast" aria-hidden="true" />
   <div className="maquina__ball" aria-hidden="true" />
   {/* El tubo de líquido lima, con burbujas que suben. */}
   <div className="maquina__tube" aria-hidden="true">
    <div className="maquina__liquid">
     <svg className="maquina__bubbles" width="56" height="760" viewBox="0 0 56 760">
      {[0, 380].map((shift) => BUBBLES.map(([cx, cy, r]) => <circle key={`${shift}-${cy}`} cx={cx} cy={cy + shift} r={r} fill="#f6ffd0" opacity="0.8" />))}
     </svg>
    </div>
   </div>
   <div className="maquina__joint" aria-hidden="true" />
   <div className="maquina__body">
    <div className="maquina__screen">
     <CloseButton className="maquina__close" close={close} />
     {phones && (
      <div className="maquina__phones">
       <HoloPhone className="maquina__phone--top" src={content.images[0]} video={content.video} label={content.title} />
       <HoloPhone className="maquina__phone--bottom" src={content.images[1]} label={content.title} />
      </div>
     )}
     <div className="maquina__text">
      {content.statusLabel && (
       <p className={`maquina__status maquina__status--${content.status}`}>
        <span aria-hidden="true" />
        {content.statusLabel}
       </p>
      )}
      {content.eyebrow && <p className="modal__eyebrow">{content.eyebrow}</p>}
      <FitTitle className={titleClass(content.title)}>{content.title}</FitTitle>
      {content.tagline && <p className="maquina__tagline">{content.tagline}</p>}
      <Paragraphs list={content.paragraphs} />
      <Timeline items={content.timeline} />
      {content.tags && (
       <ul className="modal__tags">
        {content.tags.map((tag) => (
         <li key={tag}>{tag}</li>
        ))}
       </ul>
      )}
      {content.links && (
       <ul className="modal__tags maquina__links">
        {content.links.map((link) => (
         <li key={link.href}>
          <a href={link.href} target="_blank" rel="noopener noreferrer">
           {link.label}
          </a>
         </li>
        ))}
       </ul>
      )}
      {content.energy && <p className="maquina__energy">› {content.energy}</p>}
      <div className="maquina__actions">
       <MainAction content={content} act={act} />
       <SideAction content={content} act={act} />
      </div>
     </div>
    </div>
   </div>
   <div className="maquina__lights" aria-hidden="true">
    <span />
    <span />
    <span />
   </div>
  </div>
 );
}
