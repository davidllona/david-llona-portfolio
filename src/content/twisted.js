// Los textos de The Twisted Moon («quién soy»). TODO lo que se lee en ese mundo
// —paneles de las paradas, la línea de tiempo, lo que dice Woody sobre el reloj,
// avisos— sale de este archivo: para cambiar una frase, se cambia aquí y nada más.
// («Mi historia», la casa sobre tronco, sigue en content/about.js.)

// ── Pendiente de confirmar por David ────────────────────────────────────────
// El nombre de la empresa actual. Se enseña tal cual hasta que lo confirme.
// (Objetivo 26: lo pendiente no se enseña al visitante. Mientras siga en null, ese hito de la línea de
// tiempo sale como «Ahora». Cuando David lo confirme —¿Adrava?—, se escribe aquí el nombre y sale solo.)
export const CURRENT_COMPANY = null;

// ── Las paradas que dan engranaje ───────────────────────────────────────────
// `place`: cómo se llama el sitio (va encima del título); `hint`: lo que pone
// el aviso de la E; `paragraphs`: el texto del panel, un párrafo por línea.
export const STOPS = {
 alquimista: {
  place: "Casa del alquimista",
  title: "Cómo trabajo",
  hint: "Cómo trabajo",
  paragraphs: [
   "Antes de tocar código, dibujo. Empiezo por bocetos de la web.",
   "Con proyectos propios como Dosia es distinto: son ideas que voy teniendo, cosas que veo y voy añadiendo. Lo junto todo, lo agrupo y entonces le doy forma.",
  ],
 },
 "casa-arbol": {
  place: "Casa del árbol",
  title: "A qué juego",
  hint: "A qué juego",
  paragraphs: ["Juego un poco a todo, pero lo que más me gusta son los juegos con historia.", "Mis sagas: Assassin's Creed, Resident Evil y Red Dead Redemption."],
 },
 casita: {
  place: "Casita de cuento",
  title: "Woody",
  hint: "Woody",
  paragraphs: ["Woody es un border collie con mastín. Va a cumplir 4 años.", "Lo vimos en un post de Instagram y nos lo trajimos a casa.", "Su manía: dormir en el suelo aunque tenga cama."],
 },
 invernadero: {
  place: "Invernadero",
  title: "Aventurero",
  hint: "Aventurero",
  paragraphs: ["Soy muy aventurero y me gusta aprender cosas nuevas.", "El primer sitio de la lista: Japón. Todavía no he ido. Me engancha toda su cultura."],
 },
};
// En qué orden se cuentan (y se leen en el panel «Sobre mí»).
export const STOP_ORDER = ["alquimista", "casa-arbol", "casita", "invernadero"];

// ── La torre del reloj: «Mi recorrido» ──────────────────────────────────────
export const TIMELINE = {
 place: "Torre del reloj",
 title: "Mi recorrido",
 milestones: [
  ["2021", "Empiezo a estudiar programación."],
  ["2024", "Termino los estudios."],
  ["BBVA", "Mi primer trabajo serio: cambios en webs y el simulador de hipotecas."],
  [CURRENT_COMPANY ?? "Ahora", "Donde estoy ahora."],
  ["Hoy", "Este porfolio."],
 ],
};

// ── El observatorio: «Lo que viene» ─────────────────────────────────────────
export const FUTURE = {
 place: "Observatorio",
 title: "Lo que viene",
 hint: "Lo que viene",
 paragraphs: ["Quiero llegar más lejos con el 3D.", "Con la IA, cualquiera puede tener una web. Lo difícil ahora es que alguien la recuerde. Por eso hago esto."],
 // El botón del final: el cohete lleva al tercer mundo.
 go: "Viajar a The Cosmic Lab",
 goTo: "cosmic",
};

// ── La casa sobre tronco: la introducción ───────────────────────────────────
export const STORY = { place: "Casa sobre tronco", title: "Mi historia" };

// ── El juego del reloj: avisos y contador ───────────────────────────────────
export const CLOCK = {
 counter: "Engranajes",
 gear: (have, total) => `Engranaje ${have} de ${total}`,
 again: "Ya tienes este engranaje",
 // Lo que pone el aviso de la puerta de la torre.
 doorMissing: (have, total) => `El reloj está parado (${have}/${total} engranajes)`,
 doorReady: "Arrancar el reloj",
 doorRunning: "Mi recorrido",
 missing: (left) => (left === 1 ? "Falta un engranaje" : `Faltan ${left} engranajes`),
 started: "El reloj vuelve a andar",
 lantern: "Encender el farolillo",
 // El botón del cartel de cada parada.
 next: "Siguiente parada",
};

// ── Lo que dice Woody sobre el reloj ────────────────────────────────────────
export const WOODY_CLOCK = {
 // Al llegar (sustituye a la frase de la zona de la nave).
 arrival: ["Esto es The Twisted Moon. Aquí siempre es de noche… pero yo llevo farol.", "¿Ves la torre? Su reloj está parado: le faltan cuatro engranajes.", "Hay uno en cada parada de la isla. Ven, te llevo al primero."],
 // Tras cada engranaje, hacia dónde queda el siguiente.
 next: {
  alquimista: "El siguiente está en la casa del alquimista, la de las ventanas moradas.",
  "casa-arbol": "El siguiente está en la casa del árbol, cruzando el puente colgante.",
  casita: "El siguiente está en la casita de cuento, junto al río.",
  invernadero: "El siguiente está en el invernadero, el de cristal.",
 },
 allGears: "¡Los cuatro! A la torre: vamos a arrancar ese reloj.",
 doorMissing: "Sin los cuatro engranajes no anda. Yo te llevo a por el que falta.",
 started: "¡Guau! Ya marca tu hora, la de verdad.",
 afterClock: "Queda una cosa: el observatorio. Desde allí se ve lo que viene.",
};
