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

      // Progreso real del wrapper (sticky 100vh dentro de 380vh ⇒ ~280vh
      // de rango de scroll). Mucho más fiable que scrollY absoluto: no se
      // descalibra entre pantallas con distinto innerHeight.
      const rect = wrapperRef.current.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const progress = range > 0 ? scrolled / range : 0;

      // Fade-out completo al ~14% del progreso. La cámara sale por la
      // ventana hacia el ~29%, así que el hint queda fuera bastante antes.
      const op = Math.max(0, 1 - progress * 7);
      hintRef.current.style.opacity = String(op);
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
          <svg
            className="hero-scroll-hint__arrow"
            width="14"
            height="18"
            viewBox="0 0 14 18"
            fill="none"
          >
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
            bottom: 42px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            pointer-events: none;
            user-select: none;
            color: rgba(255, 180, 120, 0.75);
            animation: hero-hint-fadein 1.4s ease-out 0.6s both;
          }

          .hero-scroll-hint__label {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 11px;
            font-weight: 400;
            letter-spacing: 0.38em;
            color: rgba(235, 220, 200, 0.8);
            text-shadow: 0 0 18px rgba(255, 160, 90, 0.25);
            animation: hero-hint-breathe 3.2s ease-in-out infinite;
          }

          /* Línea cálida dorada con fade a los lados (estilo ref) */
          .hero-scroll-hint__line {
            width: 220px;
            height: 1px;
            background: linear-gradient(
              to right,
              rgba(255, 160, 90, 0.0)  0%,
              rgba(255, 170, 100, 0.55) 25%,
              rgba(255, 190, 130, 0.85) 50%,
              rgba(255, 170, 100, 0.55) 75%,
              rgba(255, 160, 90, 0.0)  100%
            );
            box-shadow: 0 0 10px rgba(255, 160, 90, 0.25);
          }

          .hero-scroll-hint__arrow {
            color: rgba(255, 180, 120, 0.7);
            animation: hero-hint-arrow 2.4s ease-in-out infinite;
          }

          @keyframes hero-hint-fadein {
            from { opacity: 0; transform: translate(-50%, 10px); }
            to   { opacity: 1; transform: translate(-50%, 0); }
          }

          @keyframes hero-hint-breathe {
            0%, 100% { opacity: 0.65; }
            50%      { opacity: 0.95; }
          }

          @keyframes hero-hint-arrow {
            0%, 100% { transform: translateY(0);   opacity: 0.6; }
            50%      { transform: translateY(5px); opacity: 1; }
          }

          @media (max-width: 767px) {
            .hero-scroll-hint         { bottom: 28px; gap: 10px; }
            .hero-scroll-hint__label  { font-size: 10px; letter-spacing: 0.32em; }
            .hero-scroll-hint__line   { width: 170px; }
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