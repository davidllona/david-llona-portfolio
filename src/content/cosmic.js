// Los textos de The Cosmic Lab («lo que estoy construyendo»: un laboratorio es
// donde están las cosas a medio hacer). TODO lo que se lee en ese mundo sale de
// este archivo: para cambiar una frase, se cambia aquí y nada más. El estado de
// cada app —publicada o en construcción—, su enlace y sus capturas, en
// content/cards.js.
// Solo lleva lo que David ha dicho (docs/OBJETIVO-24.md, -25 y -26): no hay
// datos inventados, y lo que falta no se enseña (los pendientes, en docs/ESTADO.md).

// ── Las máquinas ────────────────────────────────────────────────────────────
// Cada app es una máquina del laboratorio. `ready`: tiene contenido y se puede
// encender; la que no, queda apagada y no abre carta. `tagline`: la línea rosa
// bajo el nombre (si no hay, no sale).
export const MACHINES = {
 dosia: {
  ready: true,
  name: "Dosia",
  // (Subtítulo y descripción, como en la maqueta aprobada por David.)
  tagline: "App para enfermería y medicina",
  paragraphs: ["Preguntas de práctica, calculadoras de dosis, noticias y práctica del examen EIR."],
 },
 epidos: {
  ready: true,
  name: "Epidos",
  paragraphs: ["App de gimnasio, comida, etc."],
 },
 chuchometro: {
  ready: true,
  name: "Chuchómetro",
  paragraphs: ["Mapa para quienes pasean perros, donde se marcan sitios para los demás; con diario del perro y consejos."],
 },
 viajes: {
  // El nombre está por confirmar (David: ¿Nokei?). Hasta entonces se enseña como «App de viajes».
  ready: true,
  name: "App de viajes",
  paragraphs: ["Galería de viajes como dioramas 3D: cada lugar es una pieza que se desbloquea al llegar."],
 },
 experimentos: {
  // Sin contenido todavía (David: cuáles son): su máquina queda apagada y no abre carta.
  ready: false,
  name: "Experimentos 3D",
 },
};
// En qué orden se cuentan.
export const MACHINE_ORDER = ["dosia", "epidos", "chuchometro", "viajes", "experimentos"];

// ── El juego: «enciende el laboratorio» ─────────────────────────────────────
export const LAB = {
 counter: "Energía",
 // Lo que pone el aviso de la E ante una máquina, apagada y encendida.
 hintOff: (name) => `Encender ${name}`,
 hintOn: (name) => name,
 on: (name, have, total) => `${name} encendida · ${have} de ${total}`,
 // Lo que pone el aviso del núcleo.
 coreOff: "El núcleo está apagado",
 coreSome: (have, total) => `El núcleo: ${have} de ${total} máquinas`,
 corePanel: {
  title: "El núcleo",
  paragraphs: ["El laboratorio está apagado. Cada máquina que se enciende manda su energía aquí.", "Con todas encendidas, se activa la antena del fondo. (La antena es el contacto: funciona siempre.)"],
 },
 // La antena del fondo: el contacto (su carta, en content/contact.js). Funciona siempre.
 antennaHint: "Envía una señal",
};

// ── Lo que dice Woody ───────────────────────────────────────────────────────
export const WOODY_LAB = {
 arrival: ["Esto es The Cosmic Lab. Aquí se pesa poco: prueba a saltar.", "El laboratorio está apagado. Cada máquina que enciendas manda energía al núcleo.", "Ven, te llevo a la primera."],
 afterFirst: "¡Guau! Ya llega energía al núcleo. Vamos a por la siguiente.",
 next: "Otra más. Ven, te llevo a la siguiente.",
 allOn: "Encendidas todas las que hay montadas. ¡Mira la antena del fondo! Desde ahí se le envía una señal a David.",
 // En la antena (el contacto).
 antenna: "La antena. Desde aquí se le envía una señal: LinkedIn, GitHub o un correo, en esos tres terminales.",
};
