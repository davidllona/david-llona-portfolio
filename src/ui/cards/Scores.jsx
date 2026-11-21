import { useEffect, useState } from "react";
import { emit } from "../../experience/state";
import { checkName, lastName, loadTop, myBest, saveScore } from "../../game/scores";

// Lo que va dentro de los dos carteles del concurso de triples (ver
// content/triples.jsx): el formulario para guardar la puntuación con nombre y
// la lista del top 10. Los dos usan la capa de puntuaciones (game/scores.js),
// que decide si va a Firestore o se queda en el navegador.

const points = (score) => (score === 1 ? "1 punto" : `${score} puntos`);
// Lo ya enviado en esta visita, por partida: un envío por partida, aunque se cierre y se reabra el cartel.
const sent = new Map();

// Guardar es opcional: el cartel se puede cerrar sin más.
export function ScoreForm({ score, game }) {
 const [name, setName] = useState(lastName);
 const [state, setState] = useState(() => sent.get(game) ?? { phase: "idle", message: "", error: false });
 const best = myBest();

 const submit = async (event) => {
  event.preventDefault();
  if (state.phase !== "idle") return;
  const checked = checkName(name);
  if (!checked.ok) {
   setState({ phase: "idle", message: checked.message, error: true });
   return;
  }
  setState({ phase: "saving", message: "Guardando…", error: false });
  const result = await saveScore(checked.name, score);
  if (!result.ok) {
   setState({ phase: "idle", message: result.message, error: true });
   return;
  }
  const place = result.rows.findIndex((row) => row.name === result.name && row.score === result.score);
  const message =
   result.mode === "remote"
    ? place >= 0
      ? `Guardada. Vas en el puesto ${place + 1} del top 10.`
      : "Guardada. Esta vez no entra en el top 10."
    : result.failed
      ? "No se ha podido conectar con el tablón compartido: se ha guardado solo en este dispositivo."
      : "Guardada. Solo en este dispositivo.";
  const done = { phase: "saved", message, error: false, mode: result.mode };
  sent.set(game, done);
  setState(done);
  emit("triples", { type: "saved", mode: result.mode });
 };

 return (
  <form className="score-form" onSubmit={submit} noValidate>
   {best && best.score > score && <p className="modal__text">Tu mejor marca en este dispositivo: {points(best.score)}.</p>}
   <label className="score-form__label" htmlFor="score-name">
    Tu nombre para el tablón <span>(opcional)</span>
   </label>
   <div className="score-form__row">
    <input
     id="score-name"
     className="score-form__name"
     type="text"
     value={name}
     maxLength={12}
     autoComplete="off"
     autoCapitalize="words"
     spellCheck={false}
     placeholder="De 3 a 12 letras"
     disabled={state.phase !== "idle"}
     aria-describedby="score-status"
     aria-invalid={state.error || undefined}
     onChange={(event) => {
      setName(event.target.value);
      if (state.error) setState({ phase: "idle", message: "", error: false });
     }}
    />
    <button type="submit" className="modal__link score-form__save" disabled={state.phase !== "idle"}>
     {state.phase === "saved" ? "Guardada" : state.phase === "saving" ? "Guardando…" : "Guardar puntuación"}
    </button>
   </div>
   <p id="score-status" className={`score-form__status${state.error ? " is-error" : ""}`} role="status" aria-live="polite">
    {state.message}
   </p>
  </form>
 );
}

// El top 10 y el mejor resultado del visitante. Se pide al abrirse el cartel.
export function TopTen() {
 const [top, setTop] = useState(null);
 useEffect(() => {
  let live = true;
  loadTop().then((result) => {
   if (live) setTop(result);
   emit("triples", { type: "top", mode: result.mode });
  });
  return () => {
   live = false;
  };
 }, []);
 const best = myBest();
 if (!top) return <p className="modal__text score-top__wait" role="status">Cargando el tablón…</p>;
 return (
  <div className="score-top" data-mode={top.mode}>
   {top.rows.length ? (
    <ol className="card__ranking card__ranking--doble">
     {top.rows.map((row, i) => (
      <li key={`${i}-${row.name}`} className={best && best.name === row.name && best.score === row.score ? "card__mine" : undefined}>
       <b>{i + 1}</b>
       <span>{row.name}</span>
       <em>{row.score}</em>
      </li>
     ))}
    </ol>
   ) : (
    <p className="modal__text">Aún no hay puntuaciones. ¡Estrena el tablón!</p>
   )}
   {top.mode === "local" && (
    <p className="score-note">
     Solo en este dispositivo{top.failed ? ": no se ha podido conectar con el tablón compartido." : ""}
    </p>
   )}
   <p className="modal__text score-top__best">
    {best ? (
     <>
      <b>Tu mejor resultado:</b> {points(best.score)}
     </>
    ) : (
     "Aún no has jugado: el cartel de al lado empieza el concurso."
    )}
   </p>
  </div>
 );
}
