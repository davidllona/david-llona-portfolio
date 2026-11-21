import { TRIPLES } from "../game/triples";
import { ScoreForm, TopTen } from "../ui/cards/Scores";

// Los dos carteles del concurso de triples (el cartel de madera del mundo 1,
// sin imágenes; ver ui/cards/Objects.jsx). Lo que llevan dentro —el formulario
// del nombre y la lista— está en ui/cards/Scores.jsx.

const verdict = (score) => (score >= TRIPLES.goal ? "¡Francotirador!" : score >= 12 ? "Buena mano." : score >= 5 ? "No está mal." : "Otra vez será.");

// Al acabar una partida: la puntuación y, si se quiere, guardarla con nombre.
// (`sticky`: la E no lo cierra: se venía pulsando para tirar.)
export const resultCard = (score, game) => ({
 variant: "cartel",
 kind: "triples-result",
 sticky: true,
 eyebrow: "Concurso de triples",
 badge: `${score} / ${TRIPLES.max}`,
 title: score === 1 ? "1 punto" : `${score} puntos`,
 tagline: verdict(score),
 body: <ScoreForm score={score} game={game} />,
});

// El tablón: el top 10 y el mejor resultado del visitante.
export const boardCard = () => ({
 variant: "cartel",
 kind: "triples-top",
 wide: true,
 eyebrow: "Concurso de triples",
 title: "Top 10 · Triples",
 body: <TopTen />,
});
