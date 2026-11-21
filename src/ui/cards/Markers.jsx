// Marcadores: lo que enseña cada hueco de imagen de una carta mientras David no
// aporte el material. Dibujados como en las maquetas aprobadas
// (docs/referencias/cartas/). Todo SVG: no se descarga nada.

// Mundo 1: un papel con la interfaz del proyecto esbozada —un panel con sus
// controles y muestras, y al lado la pieza grande, a rayas—, en el color del proyecto.
export function UiSketch({ color = "#c97a36", label }) {
 const id = `tx-${color.replace("#", "")}`;
 return (
  <svg className="marker" role="img" aria-label={label ? `Boceto de ${label}` : "Boceto del proyecto"} viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice">
   <defs>
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
     <rect width="6" height="6" fill={color} opacity="0.55" />
     <rect width="3" height="6" fill={color} opacity="0.85" />
    </pattern>
   </defs>
   <rect width="300" height="150" fill="#ffffff" />
   <rect x="21" y="22.5" width="30" height="9" rx="3" fill="#2b2b2b" />
   <rect x="54" y="22.5" width="30" height="9" rx="3" fill="#ececec" />
   <rect x="21" y="40.5" width="63" height="3" fill="#cfcfcf" />
   <rect x="21" y="49.5" width="63" height="3" fill="#cfcfcf" />
   {[0, 1, 2, 3, 4, 5].map((i) => (
    <rect key={i} x={21 + (i % 3) * 21} y={67.5 + Math.floor(i / 3) * 19.5} width="18" height="15" fill={color} opacity={0.35 + ((i * 7) % 5) * 0.12} />
   ))}
   <rect x="21" y="117" width="45" height="9" rx="4.5" fill="#1f1f1f" />
   <rect x="126" y="21" width="126" height="108" fill="#f1ede6" />
   <rect x="126" y="21" width="126" height="108" fill={`url(#${id})`} />
  </svg>
 );
}

// Mundo 2: la silueta dibujada que va en la polaroid. La del perro es la de la maqueta.
const SHAPES = {
 dog: (
  <g transform="translate(55,22)">
   <ellipse cx="62" cy="80" rx="46" ry="26" />
   <circle cx="104" cy="44" r="20" />
   <path d="M96 28l6-20 10 18z" />
   <path d="M112 30l12-14 2 22z" />
   <rect x="24" y="92" width="10" height="24" rx="4" />
   <rect x="84" y="92" width="10" height="24" rx="4" />
   <path d="M16 72q-18-6-16-26" stroke="#3a2f4a" strokeWidth="8" fill="none" strokeLinecap="round" />
  </g>
 ),
 gear: (
  <g transform="translate(67,22)">
   <path d="M44 4h8l3 12 9 4 11-6 6 6-6 11 4 9 12 3v8l-12 3-4 9 6 11-6 6-11-6-9 4-3 12h-8l-3-12-9-4-11 6-6-6 6-11-4-9-12-3v-8l12-3 4-9-6-11 6-6 11 6 9-4z" />
   <circle cx="48" cy="48" r="16" fill="#dcd3c0" />
  </g>
 ),
 pad: (
  <g transform="translate(51,40)">
   <rect x="0" y="6" width="128" height="62" rx="31" />
   <rect x="22" y="33" width="26" height="8" rx="3" fill="#dcd3c0" />
   <rect x="31" y="24" width="8" height="26" rx="3" fill="#dcd3c0" />
   <circle cx="88" cy="30" r="6" fill="#dcd3c0" />
   <circle cx="104" cy="44" r="6" fill="#dcd3c0" />
  </g>
 ),
 map: (
  <g transform="translate(55,28)">
   <path d="M0 14l40-14 40 14 40-14v84l-40 14-40-14-40 14z" />
   <path d="M40 0v84M80 14v84" stroke="#dcd3c0" strokeWidth="3" fill="none" />
   <circle cx="60" cy="46" r="7" fill="#dcd3c0" />
  </g>
 ),
 clock: (
  <g transform="translate(65,20)">
   <circle cx="50" cy="50" r="48" />
   <circle cx="50" cy="50" r="37" fill="#dcd3c0" />
   <path d="M50 22v28l20 12" stroke="#3a2f4a" strokeWidth="7" fill="none" strokeLinecap="round" />
  </g>
 ),
 star: (
  <g transform="translate(63,18)">
   <path d="M52 2l12 32 34 3-26 22 8 34-28-19-28 19 8-34-26-22 34-3z" />
  </g>
 ),
 home: (
  <g transform="translate(57,20)">
   <path d="M4 52L58 6l54 46v8H94v40H22V60H4z" />
   <rect x="48" y="66" width="20" height="34" rx="3" fill="#dcd3c0" />
  </g>
 ),
};
export function Silhouette({ drawing = "star", label }) {
 return (
  <svg className="marker" role="img" aria-label={label ? `Dibujo: ${label}` : "Dibujo"} viewBox="0 0 230 140" preserveAspectRatio="xMidYMid slice">
   <rect width="230" height="140" fill="#dcd3c0" />
   <rect width="230" height="77" fill="#cfc4ad" />
   <g fill="#3a2f4a">{SHAPES[drawing] ?? SHAPES.star}</g>
  </svg>
 );
}

// Mundo 3: la pantalla del móvil holográfico, esbozada en líneas (como la maqueta).
export function PhoneSketch({ label }) {
 return (
  <svg className="marker" role="img" aria-label={label ? `Pantalla de ${label}, esbozada` : "Pantalla esbozada"} viewBox="0 0 150 250" preserveAspectRatio="none">
   <rect x="21" y="25" width="67.5" height="17.5" rx="4" fill="#d8ff6a" />
   {[75, 97.5, 120, 142.5, 165].map((y, i) => (
    <rect key={y} x="21" y={y} width={i % 2 ? 72 : 108} height="8.75" rx="3" fill="#5ff2d6" opacity="0.6" />
   ))}
   <rect x="21" y="205" width="108" height="20" rx="10" fill="#ff7ad9" />
  </svg>
 );
}
