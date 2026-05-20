/**
 * visibilityGate.js — Pausa de render-loop coordinada
 * ────────────────────────────────────────────────────────────────────────
 * Helper único para que cualquier escena Three.js vanilla del portfolio
 * pause su `requestAnimationFrame` cuando:
 *   1) la pestaña está oculta (document.hidden)
 *   2) el canvas no está intersectando el viewport (IntersectionObserver)
 *
 * Devuelve un objeto con:
 *   - `shouldAnimate()` → boolean
 *   - `onWake(cb)`      → registra callback que se dispara al volver a ser
 *                          visible (lo usas para arrancar el tick de nuevo)
 *   - `dispose()`       → limpia listeners
 *
 * Cómo se usa (ver patches adjuntos):
 *
 *   const gate = createVisibilityGate(canvas, () => kick());
 *   let rafId = null;
 *
 *   const tick = () => {
 *     rafId = null;
 *     if (!gate.shouldAnimate()) return;
 *     // … animaciones …
 *     renderer.render(scene, camera);
 *     rafId = requestAnimationFrame(tick);
 *   };
 *
 *   const kick = () => { if (!rafId && gate.shouldAnimate()) tick(); };
 *   kick();
 *
 *   // cleanup
 *   gate.dispose();
 *   if (rafId) cancelAnimationFrame(rafId);
 *
 * Por qué este helper y no un IntersectionObserver inline en cada archivo:
 *   - Centraliza el patrón → cualquier escena nueva hereda el mismo gate.
 *   - Garantiza que el threshold y la lógica de wake sean idénticos en
 *     todas las secciones (importante para que la pausa/reanudación se
 *     comporte igual visualmente en cualquier sección).
 *   - El cleanup queda en un solo sitio.
 */

export function createVisibilityGate(canvas, onWakeCallback) {
 let isTabVisible = !document.hidden;
 let isCanvasVisible = true;
 let disposed = false;

 const wakeCallbacks = [];
 if (typeof onWakeCallback === "function") wakeCallbacks.push(onWakeCallback);

 const fireWake = () => {
  if (disposed) return;
  for (const cb of wakeCallbacks) {
   try {
    cb();
   } catch (e) {
    // No queremos que un error en un callback rompa el gate.
    console.warn("[visibilityGate] wake callback error:", e);
   }
  }
 };

 const onVisibilityChange = () => {
  const next = !document.hidden;
  if (next === isTabVisible) return;
  isTabVisible = next;
  if (isTabVisible && isCanvasVisible) fireWake();
 };
 document.addEventListener("visibilitychange", onVisibilityChange);

 // Threshold 0.01 — pausa solo cuando el canvas está completamente fuera.
 // Si bajáramos esto a 0.2/0.5 cortaríamos la animación cuando aún está
 // entrando por la parte baja del viewport, lo que se vería como un
 // "freeze and snap" cuando el usuario hace scroll lento.
 const io = new IntersectionObserver(
  (entries) => {
   const next = entries[0]?.isIntersecting ?? true;
   if (next === isCanvasVisible) return;
   isCanvasVisible = next;
   if (isTabVisible && isCanvasVisible) fireWake();
  },
  { threshold: 0.01 },
 );
 io.observe(canvas);

 return {
  shouldAnimate: () => !disposed && isTabVisible && isCanvasVisible,
  onWake: (cb) => {
   if (typeof cb === "function") wakeCallbacks.push(cb);
  },
  dispose: () => {
   if (disposed) return;
   disposed = true;
   document.removeEventListener("visibilitychange", onVisibilityChange);
   io.disconnect();
   wakeCallbacks.length = 0;
  },
 };
}
