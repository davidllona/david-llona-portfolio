// Concurso de triples: sus reglas y el estado de la partida en curso. Lo
// escribe la pista (worlds/living/Triples.jsx); lo leen la interfaz
// (ui/TriplesHud.jsx) y los logros.
//
// Cinco carros de cinco balones alrededor de la línea de tres. Cada canasta,
// un punto; el último balón de cada carro (el de color), dos. Máximo: 30.
export const TRIPLES = { racks: 5, balls: 5, seconds: 60, countdown: 3, money: 2, max: 30, goal: 20 };

// `phase`: "idle" (no hay partida), "count" (cuenta atrás), "play", "over"
// (tiempo cumplido o balones acabados: se espera a los que aún vuelan).
// `time`: s que quedan de cuenta atrás o de partida. `rack` y `ball`: por cuál
// va (desde 0). `game`: número de partida de esta visita (un envío por partida).
export const triples = { phase: "idle", time: 0, score: 0, rack: 0, ball: 0, game: 0 };
