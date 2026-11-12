// Lo que dice Woody. Edita aquí los textos: el juego los lee tal cual.
// Frases cortas (caben mejor en el bocadillo); no hace falta tocar nada más.

// Al aterrizar por primera vez: de uno en uno, se pasan con E o con un clic.
export const WELCOME = [
 "¡Guau! Bienvenido al planeta de David. Yo soy Woody.",
 "Muévete con WASD o las flechas. Shift para correr y Espacio para saltar.",
 "Cuando veas una E sobre algo, acércate y púlsala: así se abre lo que hay dentro.",
 "Si no sabes por dónde ir, pulsa mi botón, arriba, y te llevo yo.",
];

// Una frase la primera vez que se entra en cada zona.
export const ZONE_LINES = {
 proyectos: "Esta es la aldea de proyectos: cada casa guarda uno. Acércate a su escaparate.",
 "sobre-mi": "La casa del árbol es de David. Ahí cuenta quién es y en qué trabaja.",
 contacto: "Desde aquí se le escribe: LinkedIn, GitHub y el buzón del correo.",
 cv: "En este atril está su currículum.",
 observatorio: "El observatorio. Con el telescopio se hace de noche… y otra vez de día.",
 pistas: "¡Las pistas! Coge el balón y prueba a encestar.",
 nave: "La nave. Súbete y verás el planeta entero desde arriba.",
};

// Menú del botón «Woody»: a dónde sabe llevar y cómo se le pide.
export const MENU = [
 { place: "proyectos", ask: "Muéstrame proyectos" },
 { place: "cohete", ask: "Llévame al cohete" },
 { place: "contacto", ask: "¿Dónde está Contacto?" },
];
export const MENU_FOLLOW = "Acompáñame";
export const MENU_MUTE = "Silenciar consejos";
export const MENU_UNMUTE = "Activar consejos";

// Mientras guía.
export const GUIDE = {
 start: "¡Sígueme!",
 waiting: "¿Vienes? Te espero aquí.",
 stop: "Vale, voy contigo.",
 // Al llegar a cada sitio.
 arrive: {
  proyectos: "Aquí están los proyectos.",
  cohete: "El cohete.",
  contacto: "Contacto, al otro lado del río.",
  "sobre-mi": "Sobre mí, en la casa del árbol.",
  cv: "Aquí tienes el CV.",
 },
};
