// Insignias de los logros: dibujos propios en SVG. Todas comparten el marco
// hexagonal y cada una tiene su figura, trazada sobre una rejilla de 24 × 24.

const GROUP_COLORS = {
 Exploración: "#2bb673",
 Baloncesto: "#ff6b2c",
 Fútbol: "#3d8bff",
 Woody: "#b98a5e",
 Espacio: "#8b6bff",
 Secretos: "#e0a526",
 Eventos: "#e0568f",
};

const GLYPHS = {
 // Dos huellas de bota.
 "primeros-pasos": (
  <>
   <rect x="5" y="9.5" width="5" height="9" rx="2.5" />
   <rect x="5" y="19.5" width="5" height="2.5" rx="1.2" />
   <rect x="14" y="2" width="5" height="9" rx="2.5" />
   <rect x="14" y="12" width="5" height="2.5" rx="1.2" />
  </>
 ),
 // Brújula.
 explorador: (
  <>
   <circle cx="12" cy="12" r="9" fill="none" />
   <path d="M15.5 8.5l-2 5-5 2 2-5z" />
   <path d="M12 3v2M12 19v2M3 12h2M19 12h2" fill="none" />
  </>
 ),
 // Ventana de proyecto con un cursor.
 "primer-contacto": (
  <>
   <rect x="3" y="4" width="18" height="13" rx="2" fill="none" />
   <path d="M3 8h18" fill="none" />
   <path d="M12 11l6.5 6.5-3 .5 1.6 3.4-1.8.8-1.6-3.4-2 2.2z" />
  </>
 ),
 // Aro con red.
 "primer-enceste": (
  <>
   <ellipse cx="12" cy="7" rx="8" ry="2.6" fill="none" />
   <path d="M4.5 8l3 12M19.5 8l-3 12M9 9.5l1.5 10.5M15 9.5l-1.5 10.5M7.5 20h9M6 13.5h12" fill="none" />
  </>
 ),
 // Punto de mira sobre el balón.
 francotirador: (
  <>
   <circle cx="12" cy="12" r="6.5" fill="none" />
   <circle cx="12" cy="12" r="1.8" />
   <path d="M12 2v5M12 17v5M2 12h5M17 12h5" fill="none" />
  </>
 ),
 // Balón en llamas.
 "mano-caliente": (
  <>
   <path d="M12 2c1 3.5 5.5 5 5.5 10.5a5.5 5.5 0 01-11 0c0-2 1-3.2 2-4.2.2 1.7 1 2.5 1.8 2.7C10 8 10.5 4.5 12 2z" />
   <circle cx="12" cy="14.5" r="2.2" fill="var(--badge)" stroke="none" />
  </>
 ),
 // Mano del defensor y el balón pasando por encima.
 "contra-todo-pronostico": (
  <>
   <circle cx="16.5" cy="5.5" r="3.2" />
   <path d="M6 22V12M6 12V8M9 22v-9.5M9 12.5V7M12 22v-8.5M12 13.5V9M3.5 22v-6" fill="none" strokeWidth="2.4" />
  </>
 ),
 // Portería con el balón dentro.
 "primer-gol": (
  <>
   <path d="M3 20V6h18v14" fill="none" strokeWidth="2.2" />
   <path d="M3 10.5h18M3 15h18M8 6v14M12.5 6v14M17 6v14" fill="none" strokeWidth="0.8" />
   <circle cx="12.5" cy="15.5" r="3" />
  </>
 ),
 // Poste y balón rebotando.
 "al-palo": (
  <>
   <path d="M7 22V3h13" fill="none" strokeWidth="2.6" />
   <circle cx="13.5" cy="11" r="3.2" />
   <path d="M18 15.5l2.5 2M17.5 18.5l1.5 3M20 12.5l2.5.5" fill="none" />
  </>
 ),
 // Diana con tres marcas.
 especialista: (
  <>
   <circle cx="12" cy="12" r="9" fill="none" />
   <circle cx="12" cy="12" r="5" fill="none" />
   <circle cx="12" cy="12" r="1.6" />
   <circle cx="8" cy="7.5" r="1.3" />
   <circle cx="16.5" cy="15" r="1.3" />
  </>
 ),
 // Huella de perro.
 "mejor-amigo": (
  <>
   <ellipse cx="12" cy="15.5" rx="4.6" ry="3.8" />
   <ellipse cx="5.6" cy="10.6" rx="1.9" ry="2.5" />
   <ellipse cx="9.6" cy="6.6" rx="1.9" ry="2.6" />
   <ellipse cx="14.4" cy="6.6" rx="1.9" ry="2.6" />
   <ellipse cx="18.4" cy="10.6" rx="1.9" ry="2.5" />
  </>
 ),
 // Casco de astronauta y cabeza de perro, juntos.
 "companeros-de-aventura": (
  <>
   <circle cx="8.5" cy="10" r="5.5" fill="none" />
   <rect x="5.5" y="8" width="6" height="4" rx="2" />
   <path d="M15 12.5l1.5-4 2 2.5h2.5l1 3-2 4h-4z" />
   <path d="M4 21c1-3 8-3 9 0" fill="none" />
  </>
 ),
 // Cohete.
 "viajero-espacial": (
  <>
   <path d="M12 2c3.5 3 4.5 7 4 12H8c-.5-5 .5-9 4-12z" />
   <path d="M8 13l-3.5 4H8zM16 13l3.5 4H16z" />
   <path d="M10.5 17.5L12 22l1.5-4.5" fill="none" />
   <circle cx="12" cy="8.5" r="1.7" fill="var(--badge)" stroke="none" />
  </>
 ),
 // Tres planetas en una órbita.
 "explorador-galactico": (
  <>
   <ellipse cx="12" cy="12" rx="10" ry="4.5" fill="none" transform="rotate(-20 12 12)" />
   <circle cx="5" cy="14.5" r="2.6" />
   <circle cx="12.5" cy="12" r="3.4" />
   <circle cx="19.5" cy="8.5" r="2" />
  </>
 ),
 // Libros, uno sacado: el que abre el pasadizo.
 "entre-libros": (
  <>
   <rect x="3" y="6" width="4" height="15" rx="1" />
   <rect x="8.5" y="3" width="4" height="18" rx="1" />
   <rect x="14" y="8" width="4" height="13" rx="1" transform="rotate(14 16 14.5)" />
   <path d="M2 21.5h20" fill="none" />
  </>
 ),
 // Disco de vinilo con el brazo.
 melomano: (
  <>
   <circle cx="11" cy="13" r="8.5" fill="none" />
   <circle cx="11" cy="13" r="5" fill="none" strokeWidth="0.8" />
   <circle cx="11" cy="13" r="2" />
   <path d="M21 3v7l-5.5 4" fill="none" strokeWidth="2" />
  </>
 ),
 // Cuadro enmarcado.
 "amante-del-arte": (
  <>
   <rect x="3" y="5" width="18" height="15" rx="1.5" fill="none" strokeWidth="2.2" />
   <path d="M6 17l4-5 3 3.5 2-2.5 3 4z" />
   <circle cx="16.5" cy="9.5" r="1.5" />
   <path d="M12 5V2.5" fill="none" />
  </>
 ),
 // Matraz burbujeando.
 "mente-inquieta": (
  <>
   <path d="M9.5 3h5M10.5 3v6L5 19.5A1.5 1.5 0 006.3 22h11.4a1.5 1.5 0 001.3-2.5L13.5 9V3" fill="none" />
   <path d="M7.8 16h8.4l2 4H5.8z" />
   <circle cx="17.5" cy="5.5" r="1.2" />
   <circle cx="20" cy="9" r="0.9" />
  </>
 ),
 // Reloj marcando las doce, con luna.
 "medianoche-magica": (
  <>
   <circle cx="11" cy="13" r="8.5" fill="none" />
   <path d="M11 13V7.5" fill="none" strokeWidth="2.2" />
   <path d="M11 13V9" fill="none" strokeWidth="2.2" />
   <path d="M21.5 2.5a3.5 3.5 0 01-4 4.5 3.5 3.5 0 004-4.5z" />
  </>
 ),
 // Núcleo con tres órbitas.
 "energia-cosmica": (
  <>
   <circle cx="12" cy="12" r="2.6" />
   <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" />
   <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" transform="rotate(60 12 12)" />
   <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" transform="rotate(120 12 12)" />
  </>
 ),
 // Constelación.
 mitologo: (
  <>
   <path d="M3.5 17l5-9 5.5 4 6.5-8M14 12l2.5 8.5" fill="none" strokeWidth="1" />
   <circle cx="3.5" cy="17" r="1.8" />
   <circle cx="8.5" cy="8" r="2.2" />
   <circle cx="14" cy="12" r="1.8" />
   <circle cx="20.5" cy="4" r="2" />
   <circle cx="16.5" cy="20.5" r="1.6" />
  </>
 ),
};

// `locked`: en gris, con la figura atenuada.
export function Badge({ achievement, locked = false, size = 72 }) {
 const color = locked ? "#3a3648" : (GROUP_COLORS[achievement.group] ?? "#ff6b2c");
 return (
  <svg className={`badge${locked ? " badge--locked" : ""}`} width={size} height={size} viewBox="0 0 64 64" style={{ "--badge": color }} aria-hidden="true">
   <path d="M32 2.5l25.5 14.75v29.5L32 61.5 6.5 46.75v-29.5z" fill="#f6ead6" opacity={locked ? 0.25 : 1} />
   <path d="M32 7l21.6 12.5v25L32 57 10.4 44.5v-25z" fill={color} />
   <g
    transform="translate(17 17) scale(1.25)"
    fill="#f6ead6"
    stroke="#f6ead6"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    opacity={locked ? 0.4 : 1}
   >
    {GLYPHS[achievement.id]}
   </g>
  </svg>
 );
}
