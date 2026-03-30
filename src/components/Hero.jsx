import { useEffect } from "react";
import { initHeroScene } from "../3d/heroScene";

export function Hero() {
  useEffect(() => {
    initHeroScene();
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-bg">
      
      <canvas
        id="webgl"
        className="absolute top-0 left-0 w-full h-full"
      ></canvas>

      <div className="absolute bottom-6 w-full text-center text-text-muted text-sm">
        Scroll para empezar ↓
      </div>

    </section>
  );
}