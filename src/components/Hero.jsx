import { useEffect, useRef } from "react";
import { initHeroScene } from "../3d/heroScene";

/**
 * Hero.jsx — wrapper 380vh + sticky 100vh
 *
 * Overlay HTML "DESLIZA PARA COMENZAR":
 *  - texto UPPERCASE con tracking generoso
 *  - línea horizontal fina con gradiente cálido (matchea glow del cohete)
 *  - flecha ↓ animada debajo
 *  - fade-out al hacer scroll
 */
export function Hero() {
 const wrapperRef = useRef(null);
 const hintRef = useRef(null);

 useEffect(() => {
  const cleanup = initHeroScene(wrapperRef.current);

  const onScroll = () => {
   if (!hintRef.current || !wrapperRef.current) return;

   const rect = wrapperRef.current.getBoundingClientRect();
   const range = rect.height - window.innerHeight;
   const scrolled = Math.max(0, -rect.top);
   const progress = range > 0 ? scrolled / range : 0;

   // Hint visible solo dentro de la habitación.
   // - 0%-4%   → opacity 1 (estable, no parpadea con scrolls mínimos)
   // - 4%-10%  → fade out cinemático
   // - >10%    → opacity 0 (mucho antes de cruzar la ventana ~25-29%)
   const FADE_START = 0.04;
   const FADE_END = 0.1;
   let op;
   if (progress <= FADE_START) {
    op = 1;
   } else if (progress >= FADE_END) {
    op = 0;
   } else {
    op = 1 - (progress - FADE_START) / (FADE_END - FADE_START);
   }
   // pointer-events fuera cuando ya no se ve — evita que capture ratón muerto
   hintRef.current.style.opacity = String(op);
   hintRef.current.style.visibility = op === 0 ? "hidden" : "visible";
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  return () => {
   window.removeEventListener("scroll", onScroll);
   if (cleanup) cleanup();
  };
 }, []);

 return (
  <div ref={wrapperRef} style={{ position: "relative", height: "380vh" }}>
   <div
    style={{
     position: "sticky",
     top: 0,
     height: "100vh",
     overflow: "hidden",
    }}
   >
    <canvas
     id="webgl"
     style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      display: "block",
     }}
    />

    {/* Scroll hint premium */}
    <div ref={hintRef} className="hero-scroll-hint" aria-hidden="true">
     <span className="hero-scroll-hint__label">DESLIZA PARA COMENZAR</span>
     <span className="hero-scroll-hint__line" />
     <svg className="hero-scroll-hint__arrow" width="14" height="18" viewBox="0 0 14 18" fill="none">
      <path
       d="M7 1V16M7 16L1 10M7 16L13 10"
       stroke="currentColor"
       strokeWidth="1.2"
       strokeLinecap="round"
       strokeLinejoin="round"
      />
     </svg>
    </div>

    <style>{`
  .hero-scroll-hint {
    position: absolute;
    bottom: 48px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    pointer-events: none;
    user-select: none;
    /* Halo dark + warm: el dark da contraste sobre cualquier fondo,
       el warm conserva la identidad cálida del cohete. */
    filter: drop-shadow(0 2px 18px rgba(0, 0, 0, 0.55));
    animation: hero-hint-fadein 1.4s ease-out 0.6s both;
  }

  .hero-scroll-hint__label {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.42em;
  color: rgba(255, 225, 200, 0.96);
  white-space: nowrap;             /* ← nunca rompe línea */
  text-shadow:
    0 0 1px rgba(0, 0, 0, 0.9),
    0 0 14px rgba(0, 0, 0, 0.55),
    0 0 22px rgba(255, 160, 90, 0.45);
  animation: hero-hint-breathe 3.2s ease-in-out infinite;
}

/* … resto igual … */

@media (max-width: 767px) {
  .hero-scroll-hint {
    /* Respeta el home indicator del iPhone sin pegarse al borde */
    bottom: max(24px, env(safe-area-inset-bottom));
    gap: 10px;
  }
  .hero-scroll-hint__label {
    font-size: 9.5px;              /* baja un punto */
    letter-spacing: 0.26em;        /* tracking más cerrado → cabe en una línea */
  }
  .hero-scroll-hint__line {
    width: 150px;                  /* coherente con el texto más corto */
  }
  .hero-scroll-hint__arrow {
    width: 12px;
    height: 16px;
  }
}

  /* Línea cálida — densidad un punto arriba */
  .hero-scroll-hint__line {
    width: 240px;
    height: 1px;
    background: linear-gradient(
      to right,
      rgba(255, 160, 90, 0.0)  0%,
      rgba(255, 175, 105, 0.75) 25%,
      rgba(255, 200, 145, 1.0)  50%,
      rgba(255, 175, 105, 0.75) 75%,
      rgba(255, 160, 90, 0.0)  100%
    );
    box-shadow: 0 0 12px rgba(255, 160, 90, 0.4);
  }

  .hero-scroll-hint__arrow {
    color: rgba(255, 200, 150, 0.95);
    filter: drop-shadow(0 0 6px rgba(255, 160, 90, 0.35));
    animation: hero-hint-arrow 2.4s ease-in-out infinite;
  }

  @keyframes hero-hint-fadein {
    from { opacity: 0; transform: translate(-50%, 10px); }
    to   { opacity: 1; transform: translate(-50%, 0); }
  }

  /* Floor subido: ya nunca baja de 0.88 */
  @keyframes hero-hint-breathe {
    0%, 100% { opacity: 0.88; }
    50%      { opacity: 1;    }
  }

  @keyframes hero-hint-arrow {
    0%, 100% { transform: translateY(0);   opacity: 0.75; }
    50%      { transform: translateY(5px); opacity: 1;    }
  }

  @media (max-width: 767px) {
    .hero-scroll-hint         { bottom: 32px; gap: 12px; }
    .hero-scroll-hint__label  { font-size: 11px; letter-spacing: 0.34em; }
    .hero-scroll-hint__line   { width: 180px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-scroll-hint,
    .hero-scroll-hint__label,
    .hero-scroll-hint__arrow { animation: none; }
  }
`}</style>
   </div>
  </div>
 );
}