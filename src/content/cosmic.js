// Los textos de The Cosmic Lab («lo que estoy construyendo»: un laboratorio es donde están las cosas a
// medio hacer; el estado de cada app —publicada o en construcción— está en content/cards.js). TODO lo que se lee en ese
// mundo sale de este archivo: para cambiar una frase, se cambia aquí y nada más.
// Solo lleva lo que David ha dicho (docs/OBJETIVO-24.md): no hay enlaces,
// capturas ni datos inventados. Lo que falta está marcado «PENDIENTE».

// ── Las máquinas ────────────────────────────────────────────────────────────
// Cada app o experimento es una máquina del laboratorio. `ready`: ya está
// montada y se puede encender; las demás solo tienen reservado su sitio.
// `place`: lo que va encima del título en su panel; `hint`: lo que pone el aviso de la E.
export const MACHINES = {
 dosia: {
  ready: true,
  name: "Dosia",
  place: "The Cosmic Lab · Lo que estoy construyendo",
  hint: "Encender Dosia",
  hintOn: "Dosia",
  paragraphs: ["App para profesionales de enfermería y medicina: preguntas de práctica, calculadoras de dosis, noticias y práctica del examen EIR."],
  // PENDIENTE (David): enlace, capturas y estado de la app.
 },
 epidos: {
  name: "Epidos",
  // Lo dicho por David: «app de gimnasio, comida, etc.». PENDIENTE (David): el texto de su panel.
 },
 chuchometro: {
  name: "Chuchómetro",
  // Lo dicho por David: «mapa para quienes pasean perros, donde se marcan sitios para los demás; con diario del perro y consejos».
 },
 viajes: {
  // CONFIRMAR (David) el nombre: Nokei.
  name: "[CONFIRMAR nombre: Nokei]",
  // Lo dicho por David: «galería de viajes como dioramas 3D: cada lugar es una pieza que se desbloquea al llegar».
 },
 experimentos: {
  name: "Experimentos 3D",
  // Lo dicho por David: «pruebas sueltas de David con Blender y Three.js». PENDIENTE (David): cuáles.
 },
};
// En qué orden se cuentan.
export const MACHINE_ORDER = ["dosia", "epidos", "chuchometro", "viajes", "experimentos"];

// ── El juego: «enciende el laboratorio» ─────────────────────────────────────
export const LAB = {
 counter: "Energía",
 on: (name, have, total) => `${name} encendida · ${have} de ${total}`,
 // Lo que pone el aviso del núcleo.
 coreOff: "El núcleo está apagado",
 coreSome: (have, total) => `El núcleo: ${have} de ${total} máquinas`,
 corePanel: {
  place: "The Cosmic Lab",
  title: "El núcleo",
  paragraphs: ["El laboratorio está apagado. Cada máquina que se enciende manda su energía aquí.", "Con todas encendidas, el núcleo arranca y se activa la antena."],
 },
};

// ── Lo que dice Woody ───────────────────────────────────────────────────────
export const WOODY_LAB = {
 arrival: ["Esto es The Cosmic Lab. Aquí se pesa poco: prueba a saltar.", "El laboratorio está apagado. Cada máquina que enciendas manda energía al núcleo.", "Ven, te llevo a la primera."],
 afterFirst: "¡Guau! Ya llega energía al núcleo. Las demás máquinas aún no están montadas.",
};
