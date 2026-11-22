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

// El tiro del concurso (objetivo 27, B2). Sin barra: se juzga solo por el
// salto. `timing` va de −1 (despega) a +1 (vuelve al suelo), lineal en el
// tiempo: el salto dura 0,8 s, así que 1 unidad son 400 ms.
//  · window: la ventana del tiro bueno, a cada lado de lo más alto. 0,1 = ±40 ms
//    (80 ms en total; fuera del concurso, con barra, son ±80). En los carros de
//    las esquinas (el primero y el último), 0,075 = ±30 ms.
//  · inside: probabilidad de que entre si se suelta dentro de la ventana (78 %:
//    aun soltando bien, uno de cada cinco se sale).
//  · fall: fuera de la ventana la probabilidad cae en curva hasta 0 a 0,45
//    unidades (180 ms) más allá: 0,78 · (1 − exceso / 0,45)². A ±80 ms (el
//    perfecto de siempre), un 47 %; a ±120 ms, un 24 %; pasados ±220 ms, nada.
// Con esto (simulado en 20 000 partidas): un jugador que suelta con un error
// típico de 60 ms hace 19 de 30 de media; con 80 ms, 16,5; con 110 ms, 13,5.
// El máximo exige 25 canastas seguidas: aun soltando siempre en lo más alto,
// 0,78²⁵ = 0,2 % de las partidas; con 45 ms de error, 1 de cada 10 000.
export const CONTEST_SHOT = { window: 0.1, corner: 0.075, inside: 0.78, fall: 0.45 };
const CORNERS = [0, TRIPLES.racks - 1];
export const shotWindow = (rack) => (CORNERS.includes(rack) ? CONTEST_SHOT.corner : CONTEST_SHOT.window);
// Probabilidad de que entre un tiro soltado en `timing` desde el carro `rack`.
export function shotChance(timing, rack) {
 const excess = Math.abs(timing) - shotWindow(rack);
 if (excess <= 0) return CONTEST_SHOT.inside;
 return CONTEST_SHOT.inside * Math.max(0, 1 - excess / CONTEST_SHOT.fall) ** 2;
}
