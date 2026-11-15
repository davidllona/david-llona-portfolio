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
 "casa-arbol": "La casa del árbol. Buen sitio para sentarse un rato y mirar la isla.",
 contacto: "Desde aquí se le escribe: LinkedIn, GitHub y el buzón del correo.",
 cv: "En este atril está su currículum.",
 observatorio: "El observatorio. Con el telescopio se hace de noche… y otra vez de día.",
 pistas: "¡Las pistas! Coge el balón y prueba a encestar.",
 nave: "La nave. Súbete y verás el planeta entero desde arriba.",
 // The Twisted Moon.
 "luna-nave": "Esto es The Twisted Moon. Aquí siempre es de noche… pero yo llevo farol.",
 "casa-torcida": "La casa torcida. Dentro está su historia: acércate a la puerta.",
 colina: "La colina en espiral. Se sube por la senda, dando vueltas.",
};

// Menú del botón «Woody»: a dónde sabe llevar y cómo se le pide.
export const MENU = [
 { place: "proyectos", ask: "Muéstrame proyectos" },
 { place: "cohete", ask: "Llévame al cohete" },
 { place: "contacto", ask: "¿Dónde está Contacto?" },
 // The Twisted Moon.
 { place: "casa-torcida", ask: "Llévame a la casa torcida" },
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
  cv: "Aquí tienes el CV.",
  "casa-torcida": "La casa torcida. Aquí empieza su historia.",
 },
};
