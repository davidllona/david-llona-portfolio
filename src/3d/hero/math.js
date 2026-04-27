/**
 * math.js
 * ─────────────────────────────────────────────────────────────────────────
 * Helpers de easing / phase / lerp compartidos por todos los módulos del
 * hero (exterior, room, interactives). Funciones puras, sin estado.
 *
 * No mover a librería externa: el coste de tenerlas inline es 0 y nos
 * evita una dependencia más en el build.
 */

// ── Easings cúbicos ─────────────────────────────────────────────────────
export const easeIn3 = (t) => t * t * t;
export const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
export const easeIO3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ── Utilidades ──────────────────────────────────────────────────────────
export const clamp01 = (t) => Math.max(0, Math.min(1, t));
export const lerpV = (a, b, t) => a + (b - a) * t;

// ── Phase: convierte un sp ∈ [s, e] en una rampa [0, 1] clampeada ───────
// Útil para fades de scroll-driven: phase(sp, 1.5, 1.78) da 0 antes de 1.5,
// 1 después de 1.78, y un valor intermedio entre medias.
export const phase = (sp, s, e) => clamp01((sp - s) / (e - s));
