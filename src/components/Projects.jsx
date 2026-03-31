import diplomaMain from "../assets/images/diploma3d.png";
import kaizenMain from "../assets/images/diploma3d.png";
import bbvaMain from "../assets/images/diploma3d.png";
import rugMain from "../assets/images/diploma3d.png";

const projects = [
  {
    id: "01",
    title: "Configurador de Diplomas",
    description:
      "Simulador web para personalizar diplomas en tiempo real, con vista previa interactiva, selección de plantillas y una experiencia de configuración pensada para producción. Un proyecto centrado en interacción, claridad visual y personalización.",
    year: "2026",
    category: "Simulador web",
    role: "UX/UI · Frontend · Three.js · WordPress",
    href: "https://diplomaspersonalizados.com/configurador-de-diplomas/",
    image: diplomaMain,
  },
  {
    id: "02",
    title: "Kaizen Patrimonio",
    description:
      "Desarrollo de una web corporativa en WordPress para una firma de inversión inmobiliaria, con foco en estructura visual, jerarquía de contenidos y una presencia digital sobria, clara y cuidada.",
    year: "2025",
    category: "Web corporativa",
    role: "Diseño web · Frontend · WordPress",
    href: "https://kaizenpatrimonio.es/",
    image: kaizenMain,
  },
  {
    id: "03",
    title: "Simulador Hipotecario BBVA",
    description:
      "Colaboración en el desarrollo de un simulador hipotecario junto al equipo, participando en la construcción y mejora de la experiencia digital para una herramienta financiera de uso real.",
    year: "2025",
    category: "Herramienta fintech",
    role: "Colaboración · Frontend · UX",
    href: "#",
    image: bbvaMain,
  },
  {
    id: "04",
    title: "Simulador de Alfombras",
    description:
      "Herramienta de personalización visual para configurar alfombras a medida, con enfoque en interacción, representación del producto y una experiencia más clara, útil y orientada a conversión.",
    year: "2026",
    category: "Configurador de producto",
    role: "Canvas 2D · Frontend · UX/UI",
    href: "#",
    image: rugMain,
  },
];

function ProjectVisual({ project }) {
  const isLinkEnabled = project.href && project.href !== "#";

  const visual = (
    <div className="relative w-full max-w-[640px]">
      <div className="project-card relative overflow-hidden bg-[#060606] transition-all duration-500">
        <div className="project-glow" />
        <div className="project-shine" />

        <div className="relative aspect-[16/10] overflow-hidden border border-white/8 bg-[#0b0b0b]">
          <img
            src={project.image}
            alt={project.title}
            className="project-image h-full w-full object-contain p-2 md:p-3"
          />

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.10),transparent_45%,rgba(255,255,255,0.015))]" />
        </div>
      </div>
    </div>
  );

  if (isLinkEnabled) {
    return (
      <a
        href={project.href}
        target="_blank"
        rel="noreferrer"
        className="block w-full max-w-[640px]"
      >
        {visual}
      </a>
    );
  }

  return visual;
}

export function Projects() {
  return (
    <>
      <section
        id="work"
        className="relative overflow-hidden bg-bg py-20 md:py-24 lg:py-32"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-20 h-[420px] w-[420px] rounded-full bg-primary/5 blur-[140px]" />
          <div className="absolute right-[-120px] top-[30%] h-[360px] w-[360px] rounded-full bg-primary/4 blur-[150px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.08),rgba(0,0,0,0.35),rgba(0,0,0,0.58))]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-16">
          <div className="mb-16 max-w-3xl md:mb-20 lg:mb-24">
            <span className="mb-4 block text-[11px] uppercase tracking-[0.28em] text-primary/70">
              Casos reales
            </span>

            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-primary md:text-4xl lg:text-5xl">
              Del experimento al producto
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-text-muted/80 md:text-[15px]">
              Algunas piezas nacen como exploración. Otras acaban resolviendo
              necesidades reales de negocio, personalización y experiencia
              digital. Esta selección reúne proyectos donde la parte visual, la
              interacción y el frontend se convierten en herramientas útiles,
              claras y construidas para funcionar.
            </p>
          </div>

          <div className="border-t border-white/6">
            {projects.map((project) => (
              <article
                key={project.id}
                className="group grid gap-10 border-b border-white/6 py-12 transition-all duration-500 md:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16"
              >
                <div>
                  <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-[11px] tracking-[0.18em] text-primary/80">
                      {project.id}
                    </span>

                    <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted/55">
                      {project.year} · {project.category}
                    </span>
                  </div>

                  <h3 className="max-w-2xl text-3xl font-light tracking-[-0.05em] text-text transition-colors duration-300 group-hover:text-primary-soft md:text-4xl lg:text-[52px] lg:leading-[0.98]">
                    {project.title}
                  </h3>

                  <p className="mt-5 max-w-xl text-sm leading-relaxed text-text-muted/80 md:text-[15px]">
                    {project.description}
                  </p>

                  <div className="mt-8">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-text-muted/45">
                      Mi rol
                    </p>
                    <p className="mt-3 text-base leading-relaxed text-text-muted/78 md:text-[18px]">
                      {project.role}
                    </p>
                  </div>

                  <div className="mt-10">
                    <a
                      href={project.href}
                      target={project.href !== "#" ? "_blank" : undefined}
                      rel={project.href !== "#" ? "noreferrer" : undefined}
                      className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-text-muted/75 transition-all duration-300 hover:text-primary"
                    >
                      Ver proyecto
                      <span
                        aria-hidden="true"
                        className="translate-y-[-1px] transition-transform duration-300 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </a>
                  </div>
                </div>

                <div className="lg:flex lg:justify-end">
                  <ProjectVisual project={project} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .project-card {
          position: relative;
          isolation: isolate;
          transform: translateY(0);
          transition:
            transform 500ms ease,
            filter 500ms ease;
        }

        .group:hover .project-card {
          transform: translateY(-4px);
        }

        .project-image {
          transform: scale(1.06);
          opacity: 0.96;
          transition:
            transform 700ms ease,
            opacity 600ms ease,
            filter 700ms ease;
        }

        .group:hover .project-image {
          transform: scale(1.1);
          opacity: 1;
          filter: brightness(1.03) contrast(1.02);
        }

        .project-glow {
          position: absolute;
          inset: -10%;
          border-radius: 24px;
          background:
            radial-gradient(circle at left center, rgba(245, 138, 92, 0.16), transparent 24%),
            radial-gradient(circle at right center, rgba(245, 138, 92, 0.16), transparent 24%);
          filter: blur(40px);
          opacity: 0;
          transition:
            opacity 450ms ease,
            transform 700ms ease;
          transform: scale(0.96);
          pointer-events: none;
          z-index: 0;
        }

        .group:hover .project-glow {
          opacity: 1;
          transform: scale(1);
        }

        .project-shine {
          position: absolute;
          inset: -20%;
          background: linear-gradient(
            110deg,
            transparent 38%,
            rgba(255, 255, 255, 0.04) 47%,
            rgba(245, 138, 92, 0.14) 50%,
            rgba(255, 255, 255, 0.04) 53%,
            transparent 62%
          );
          transform: translateX(-130%) rotate(8deg);
          opacity: 0;
          pointer-events: none;
          z-index: 2;
        }

        .group:hover .project-shine {
          opacity: 1;
          animation: projectSweep 1100ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes projectSweep {
          0% {
            transform: translateX(-130%) rotate(8deg);
          }
          100% {
            transform: translateX(130%) rotate(8deg);
          }
        }
      `}</style>
    </>
  );
}