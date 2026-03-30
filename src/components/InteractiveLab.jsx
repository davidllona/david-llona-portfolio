import { useEffect } from "react";
import {
  initLabStarsScene,
  initLabPreviewScenes,
} from "../3d/labStarsScene";

const mainProject = {
  id: "A1",
  title: "Shader Water",
  description:
    "Exploración de superficie procedural animada con shaders, color dinámico y detalle en las olas. Una pieza centrada en movimiento, profundidad y atmósfera para convertir una simple malla en una experiencia visual viva.",
  type: "Shaders / Realtime Surface",
  url: "https://threejs-water-shader.vercel.app",
  previewId: "preview-main",
};

const secondaryProjects = [
  {
    id: "A2",
    title: "Galaxy Motion",
    description:
      "Sistema de partículas y profundidad espacial para crear atmósferas más inmersivas.",
    type: "Particles / Shader Feel",
    url: "https://threejs-water-shader.vercel.app",
    previewId: "preview-galaxy",
  },
  {
    id: "A3",
    title: "Interactive Object",
    description:
      "Pieza experimental donde el usuario puede rotar, inspeccionar y sentir el volumen del modelo.",
    type: "Realtime Interaction",
    url: "https://threejs-water-shader.vercel.app",
    previewId: "preview-object",
  },
];

export function InteractiveLab() {
  useEffect(() => {
    const cleanupBackground = initLabStarsScene();
    const cleanupPreviews = initLabPreviewScenes();

    return () => {
      if (cleanupBackground) cleanupBackground();
      if (cleanupPreviews) cleanupPreviews();
    };
  }, []);

  return (
    <section
      id="lab"
      className="relative overflow-hidden bg-bg py-24 md:py-32 lg:py-40"
    >
      <canvas
        id="lab-stars-canvas"
        className="absolute inset-0 h-full w-full"
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.5),rgba(0,0,0,0.15),rgba(0,0,0,0.45))]" />

      <div className="pointer-events-none absolute left-1/2 top-[18%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />

      <div className="relative z-10 mx-auto w-full max-w-[1350px] px-4 sm:px-6 md:px-10 lg:px-16">
        <div className="mb-16 max-w-3xl md:mb-20">
          <span className="mb-4 block text-[11px] uppercase tracking-[0.28em] text-primary/70">
            Interactive Lab
          </span>

          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-primary md:text-4xl lg:text-5xl">
            Más allá de la interfaz
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted/85 md:text-[15px]">
            Una colección de piezas y experimentos donde el 3D deja de ser solo
            un recurso visual para convertirse en parte de la interacción, la
            atmósfera y la forma de contar cada idea. Aquí es donde exploro
            movimiento, profundidad y narrativa para construir experiencias más
            vivas, más inmersivas y más personales.
          </p>
        </div>

        {/* BLOQUE PRINCIPAL UNIFICADO */}
        <article className="mb-12 overflow-hidden border border-white/10 bg-black/20 backdrop-blur-[2px] transition-all duration-500 hover:border-primary/20 hover:shadow-[0_0_35px_rgba(249,115,22,0.06)]">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative overflow-hidden border-b border-white/8 lg:border-b-0 lg:border-r lg:border-white/8">
              <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.10),transparent_24%),linear-gradient(180deg,rgba(7,7,10,0.96)_0%,rgba(3,3,5,0.98)_100%)] sm:aspect-[16/10]">
                <canvas
                  data-preview-id={mainProject.previewId}
                  className="absolute inset-0 h-full w-full"
                />

                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.28),rgba(0,0,0,0.02),rgba(0,0,0,0.1))]" />

                <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-primary/75 backdrop-blur-sm">
                  Live preview
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center p-6 md:p-8">
              <div className="mb-4 flex items-center gap-4">
                <span className="text-[11px] tracking-[0.18em] text-primary/75">
                  {mainProject.id}
                </span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-text-muted/65">
                  {mainProject.type}
                </span>
              </div>

              <h3 className="mb-4 text-3xl font-light tracking-[-0.04em] text-primary md:text-4xl lg:text-5xl">
                {mainProject.title}
              </h3>

              <p className="mb-6 text-sm leading-relaxed text-text-muted/85 md:text-[15px]">
                {mainProject.description}
              </p>

              <a
                href={mainProject.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] uppercase tracking-[0.18em] text-primary/80 transition-colors duration-300 hover:text-primary"
              >
                Explorar pieza →
              </a>
            </div>
          </div>
        </article>

        {/* PIEZAS SECUNDARIAS */}
        <div className="grid gap-6 md:grid-cols-2">
          {secondaryProjects.map((project) => (
            <article
              key={project.id}
              className="group overflow-hidden border border-white/10 bg-black/20 backdrop-blur-[2px] transition-all duration-500 hover:border-primary/20 hover:shadow-[0_0_35px_rgba(249,115,22,0.06)]"
            >
              <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
                <div className="relative overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.08),transparent_24%),linear-gradient(180deg,rgba(8,8,12,0.96)_0%,rgba(4,4,7,0.98)_100%)] md:border-b-0 md:border-r md:border-white/8">
                  <div className="relative aspect-[16/10] overflow-hidden md:aspect-[4/3]">
                    <canvas
                      data-preview-id={project.previewId}
                      className="absolute inset-0 h-full w-full"
                    />

                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.22),rgba(0,0,0,0.02),rgba(0,0,0,0.08))]" />

                    <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-primary/65 backdrop-blur-sm">
                      Preview 3D
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center p-6">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <span className="text-[11px] tracking-[0.16em] text-primary/75">
                      {project.id}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-text-muted/65">
                      {project.type}
                    </span>
                  </div>

                  <h3 className="mb-3 text-2xl font-light tracking-[-0.03em] text-primary">
                    {project.title}
                  </h3>

                  <p className="mb-5 text-sm leading-relaxed text-text-muted/85">
                    {project.description}
                  </p>

                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] uppercase tracking-[0.18em] text-primary/75 transition-colors duration-300 group-hover:text-primary"
                  >
                    Explorar pieza →
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}