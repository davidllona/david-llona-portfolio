// La hoja de la tipografía ya no bloquea el primer pintado (index.html): puede
// llegar después que este código. `document.fonts.load` resuelve vacío si la
// letra aún no está declarada, así que se insiste hasta que exista (o 4 s).
export function fontReady(spec) {
 if (!document.fonts?.load) return Promise.resolve();
 const started = performance.now();
 return new Promise((resolve) => {
  const attempt = () =>
   document.fonts.load(spec).then(
    (found) => (found.length || performance.now() - started > 4000 ? resolve() : window.setTimeout(attempt, 80)),
    () => resolve(),
   );
  attempt();
 });
}
