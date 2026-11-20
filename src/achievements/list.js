// Los 24 logros. Cada uno se desbloquea con un hecho real del juego (ver
// Tracker.jsx); ninguno por simple cercanía cuando pide completar una acción.
//  · `goal`: cuántas veces hay que hacerlo (si es más de una, enseña progreso).
//  · `ready`: su disparador ya existe en el juego. Los que aún no, se ven en
//    la vitrina como «Próximamente» y no se pueden conseguir todavía.
export const ACHIEVEMENTS = [
 { id: "primeros-pasos", name: "Primeros pasos", description: "Da tus primeros pasos por el planeta.", group: "Exploración", ready: true },
 { id: "explorador", name: "Explorador", description: "Descubre las seis zonas de The Living World.", group: "Exploración", goal: 6, ready: true },
 { id: "primer-contacto", name: "Primer contacto", description: "Abre un proyecto real.", group: "Exploración", ready: true },
 { id: "primer-enceste", name: "Primer enceste", description: "Mete una canasta.", group: "Baloncesto", ready: true },
 { id: "francotirador", name: "Francotirador", description: "Anota 3 triples en el reto de triples.", group: "Baloncesto", goal: 3 },
 { id: "mano-caliente", name: "Mano caliente", description: "Encadena 5 canastas sin fallar.", group: "Baloncesto", goal: 5 },
 { id: "contra-todo-pronostico", name: "Contra todo pronóstico", description: "Encesta con la barrera defensiva activa.", group: "Baloncesto" },
 { id: "primer-gol", name: "Primer gol", description: "Marca un gol.", group: "Fútbol", ready: true },
 { id: "al-palo", name: "Al palo", description: "Estrella el balón en el poste o el larguero.", group: "Fútbol", ready: true },
 { id: "especialista", name: "Especialista", description: "Marca 3 faltas directas.", group: "Fútbol", goal: 3, ready: true },
 { id: "dianas", name: "Dianas", description: "Derriba las cinco dianas en una ronda de precisión.", group: "Fútbol", ready: true },
 { id: "mejor-amigo", name: "Mejor amigo", description: "Acaricia a Woody 3 veces.", group: "Woody", goal: 3, ready: true },
 { id: "companeros-de-aventura", name: "Compañeros de aventura", description: "Viaja con Woody a los tres mundos.", group: "Woody", goal: 3 },
 { id: "viajero-espacial", name: "Viajero espacial", description: "Despega por primera vez en el cohete.", group: "Espacio", ready: true },
 { id: "explorador-galactico", name: "Explorador galáctico", description: "Visita los tres planetas.", group: "Espacio", goal: 3 },
 { id: "entre-libros", name: "Entre libros", description: "Descubre el pasadizo de la biblioteca.", group: "Secretos" },
 { id: "melomano", name: "Melómano", description: "Pon un disco en el tocadiscos.", group: "Secretos" },
 { id: "amante-del-arte", name: "Amante del arte", description: "Visita la galería de The Twisted Moon.", group: "Secretos" },
 { id: "mente-inquieta", name: "Mente inquieta", description: "Activa un experimento en The Cosmic Lab.", group: "Secretos", ready: true },
 { id: "medianoche-magica", name: "Medianoche mágica", description: "Presencia el evento de la torre del reloj.", group: "Eventos" },
 { id: "energia-cosmica", name: "Energía cósmica", description: "Activa el núcleo de The Cosmic Lab.", group: "Eventos" },
 { id: "mitologo", name: "Mitólogo", description: "Resuelve el puzle de las constelaciones.", group: "Eventos" },
 // The Twisted Moon: el juego del reloj.
 { id: "cuatro-engranajes", name: "Cuatro engranajes", description: "Reúne los cuatro engranajes de The Twisted Moon.", group: "Exploración", goal: 4, ready: true },
 { id: "relojero", name: "Relojero", description: "Arranca el reloj de la torre.", group: "Eventos", ready: true },
];

export const BY_ID = Object.fromEntries(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));
