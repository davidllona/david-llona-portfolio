import { useEffect, useRef, useState } from "react";

export function IntroStory() {
  const sectionRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      /**
       * Queremos que el efecto ocurra solo mientras la sección
       * entra y empieza a salir del viewport.
       */
      const rawProgress = (windowHeight - rect.top) / (windowHeight + rect.height);

      const clamped = Math.max(0, Math.min(rawProgress, 1));
      setProgress(clamped);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // Movimiento más elegante y menos agresivo
  const translateY = progress * -90;
  const scale = 1 - progress * 0.04;

  // Ya no desaparece casi del todo
  const opacity = 1 - progress * 0.28;

  // Glow suave, pero sin apagarse demasiado rápido
  const glowOpacity = 0.12 - progress * 0.05;

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-bg py-20 md:py-24 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary blur-[140px] transition-opacity duration-300"
          style={{ opacity: Math.max(glowOpacity, 0.04) }}
        />
      </div>

      <div
        className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center px-6 text-center md:px-10 lg:px-16 will-change-transform"
        style={{
          transform: `translateY(${translateY}px) scale(${scale})`,
          opacity,
        }}
      >
        <h2 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-text md:text-6xl lg:text-7xl">
          Diseñando experiencias
          <span className="block text-primary">de otro planeta</span>
        </h2>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-muted md:text-base">
          Desarrollo interfaces y experiencias interactivas donde el diseño,
          el frontend y el 3D trabajan juntos para construir algo más inmersivo,
          visual y memorable.
        </p>
      </div>
    </section>
  );
}