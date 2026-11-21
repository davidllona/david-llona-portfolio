// Marcadores: lo que enseña el hueco de la imagen o del vídeo de una carta
// mientras David no aporte el material. Dibujados, a juego con cada mundo: no
// son recuadros grises ni iconos rotos. (Todo SVG: no se descarga nada.)

// Mundo 1: una ilustración sencilla con el color del proyecto —una ventana de
// navegador sobre unas lomas, con el sol detrás—.
export function ProjectMarker({ color = "#ff6b2c", label }) {
 return (
  <svg className="marker marker--ficha" viewBox="0 0 640 360" role="img" aria-label={label ? `Ilustración de ${label}` : "Ilustración del proyecto"} preserveAspectRatio="xMidYMid slice">
   <rect width="640" height="360" fill="#fdeed3" />
   <circle cx="500" cy="96" r="54" fill={color} opacity="0.22" />
   <circle cx="500" cy="96" r="34" fill={color} opacity="0.5" />
   <path d="M0 262 Q120 206 250 250 T470 236 T640 258 V360 H0Z" fill={color} opacity="0.2" />
   <path d="M0 300 Q160 252 320 292 T640 284 V360 H0Z" fill={color} opacity="0.34" />
   <g transform="translate(150 78)">
    <rect width="340" height="214" rx="16" fill="#fffaf0" stroke="#2b1c12" strokeWidth="4" />
    <path d="M0 40 H340" stroke="#2b1c12" strokeWidth="4" />
    <circle cx="24" cy="20" r="6" fill={color} />
    <circle cx="46" cy="20" r="6" fill="#2b1c12" opacity="0.25" />
    <circle cx="68" cy="20" r="6" fill="#2b1c12" opacity="0.25" />
    <rect x="24" y="62" width="130" height="126" rx="10" fill={color} opacity="0.85" />
    <rect x="174" y="64" width="142" height="14" rx="7" fill="#2b1c12" opacity="0.8" />
    <rect x="174" y="92" width="110" height="10" rx="5" fill="#2b1c12" opacity="0.28" />
    <rect x="174" y="112" width="128" height="10" rx="5" fill="#2b1c12" opacity="0.28" />
    <rect x="174" y="132" width="84" height="10" rx="5" fill="#2b1c12" opacity="0.28" />
    <rect x="174" y="160" width="76" height="28" rx="14" fill={color} />
   </g>
  </svg>
 );
}

// Mundo 2: la silueta dibujada a tinta que va dentro de la polaroid (un perro sentado).
export function DogSilhouette() {
 return (
  <svg className="marker marker--hoja" viewBox="0 0 200 200" role="img" aria-label="Silueta de Woody, dibujada">
   <rect width="200" height="200" fill="#dcd6c6" />
   <path d="M0 160 Q50 146 100 158 T200 152 V200 H0Z" fill="#c9c2af" />
   {/* Un perro sentado, de perfil: hocico largo, oreja caída y la cola por detrás. */}
   <g fill="#1a2444">
    <path d="M66 176 C56 148 62 118 88 104 L96 84 L122 96 C132 112 136 142 132 176 Z" />
    <path d="M70 170 C48 168 36 150 40 130 C50 146 60 154 76 156 Z" />
    <ellipse cx="112" cy="74" rx="24" ry="22" />
    <path d="M122 62 L160 74 C166 78 166 90 158 92 L124 94 Z" />
    <circle cx="160" cy="77" r="5" />
    <ellipse cx="80" cy="177" rx="18" ry="6" />
    <ellipse cx="124" cy="177" rx="18" ry="6" />
   </g>
   <path d="M96 58 C82 62 76 84 84 104 C96 100 104 84 106 64 Z" fill="#33426e" />
   <circle cx="126" cy="70" r="3.2" fill="#dcd6c6" />
  </svg>
 );
}

// Adornos de la hoja de cuento, uno por parada: trazos a tinta.
const ORNAMENTS = {
 paw: (
  <g fill="currentColor" stroke="none">
   <ellipse cx="24" cy="31" rx="10" ry="8" />
   <circle cx="10" cy="20" r="4.6" />
   <circle cx="19" cy="12" r="4.8" />
   <circle cx="30" cy="12" r="4.8" />
   <circle cx="38" cy="20" r="4.6" />
  </g>
 ),
 gear: (
  <>
   <circle cx="24" cy="24" r="9" />
   <circle cx="24" cy="24" r="3" />
   <path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4.5 4.5M32.5 32.5 37 37M37 11l-4.5 4.5M15.5 32.5 11 37" />
  </>
 ),
 map: (
  <>
   <path d="M6 12l12-5 12 5 12-5v29l-12 5-12-5-12 5z" />
   <path d="M18 7v29M30 12v29" />
  </>
 ),
 pad: (
  <>
   <rect x="5" y="14" width="38" height="22" rx="11" />
   <path d="M14 21v8M10 25h8" />
   <circle cx="32" cy="22" r="1.6" fill="currentColor" />
   <circle cx="36" cy="28" r="1.6" fill="currentColor" />
  </>
 ),
 clock: (
  <>
   <circle cx="24" cy="24" r="17" />
   <path d="M24 13v11l8 5" />
  </>
 ),
 star: <path d="M24 5l5.4 12 13 1.3-9.8 8.7 2.9 12.8L24 33l-11.5 6.8 2.9-12.8-9.8-8.7 13-1.3z" />,
};
export function Ornament({ name }) {
 return (
  <svg className="hoja__ornament" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
   {ORNAMENTS[name] ?? ORNAMENTS.star}
  </svg>
 );
}

// Mundo 3: dentro del móvil holográfico, la interfaz esbozada con líneas que se
// dibujan solas (app publicada) o un plano en construcción, con su cota y su
// retícula (app a medio hacer). Una línea de barrido la recorre.
export function Blueprint({ building }) {
 return (
  <svg className={`marker marker--holo${building ? " marker--building" : ""}`} viewBox="0 0 180 360" role="img" aria-label={building ? "Plano en construcción" : "Interfaz esbozada"}>
   <defs>
    <pattern id="holo-grid" width="18" height="18" patternUnits="userSpaceOnUse">
     <path d="M18 0H0V18" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.28" />
    </pattern>
   </defs>
   <rect width="180" height="360" fill="url(#holo-grid)" />
   <g className="holo__lines" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {building ? (
     <>
      <path pathLength="1" d="M26 70 H154 V250 H26 Z" />
      <path pathLength="1" d="M26 70 L154 250 M154 70 L26 250" />
      <path pathLength="1" d="M26 276 H154 M26 270 V282 M154 270 V282" />
      <path pathLength="1" d="M60 300 H120" />
      <path pathLength="1" d="M90 40 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0" />
     </>
    ) : (
     <>
      <path pathLength="1" d="M22 40 H98" />
      <path pathLength="1" d="M134 40 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0" />
      <path pathLength="1" d="M22 74 H158 V150 H22 Z" />
      <path pathLength="1" d="M36 130 L64 104 L88 122 L116 94 L144 116" />
      <path pathLength="1" d="M22 172 H84 V228 H22 Z M96 172 H158 V228 H96 Z" />
      <path pathLength="1" d="M22 252 H158 M22 272 H126 M22 292 H142" />
      <path pathLength="1" d="M52 318 H128 a10 10 0 0 1 0 20 H52 a10 10 0 0 1 0 -20 Z" />
     </>
    )}
   </g>
   <rect className="holo__sweep" x="0" y="0" width="180" height="26" fill="currentColor" opacity="0.16" />
  </svg>
 );
}
