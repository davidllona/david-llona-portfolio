import { useEffect, useRef } from "react";
import { initHeroScene } from "../3d/heroScene";

/**
 * Hero.jsx — wrapper 450vh + sticky 100vh
 *
 * El texto del exterior ("Diseñando experiencias de otro planeta"
 * y el texto técnico de archivo) vive en planos 3D dentro de heroScene.js,
 * no como overlay HTML. Eso garantiza integración visual real con la escena.
 *
 * Este componente solo gestiona:
 *  - el canvas Three.js
 *  - el hint de scroll (desaparece al primer scroll)
 */
export function Hero() {
  const wrapperRef = useRef(null);
  const hintRef    = useRef(null);

  useEffect(() => {
    const cleanup = initHeroScene(wrapperRef.current);

    const onScroll = () => {
      if (hintRef.current) {
        const op = Math.max(0, 1 - (window.scrollY / window.innerHeight) * 5);
        hintRef.current.style.opacity = String(op);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", height: "450vh" }}
    >
      <div
        style={{
          position: "sticky",
          top     : 0,
          height  : "100vh",
          overflow: "hidden",
        }}
      >
        <canvas
          id="webgl"
          style={{
            position: "absolute",
            inset   : 0,
            width   : "100%",
            height  : "100%",
            display : "block",
          }}
        />

        <div
          ref={hintRef}
          style={{
            position     : "absolute",
            bottom       : "28px",
            width        : "100%",
            textAlign    : "center",
            fontSize     : "11px",
            letterSpacing: "0.20em",
            color        : "rgba(255,255,255,0.28)",
            pointerEvents: "none",
            userSelect   : "none",
            fontFamily   : "'Courier New', monospace",
          }}
        >
          scroll to begin ↓
        </div>
      </div>
    </div>
  );
}