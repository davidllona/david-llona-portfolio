import { useEffect } from "react";
import { initHeroScene } from "../3d/heroScene";

export function Hero() {
  useEffect(() => {
    const cleanup = initHeroScene();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-bg">
      <canvas id="webgl" className="absolute left-0 top-0 h-full w-full"></canvas>

      <div className="absolute bottom-6 w-full text-center text-sm text-text-muted">
        Scroll para empezar ↓
      </div>
    </section>
  );
}