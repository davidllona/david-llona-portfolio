import diplomaMain from "../assets/images/diploma3d.png";
import kaizenMain from "../assets/images/diploma3d.png";
import bbvaMain from "../assets/images/diploma3d.png";
import rugMain from "../assets/images/diploma3d.png";

const projects = [
  {
    id: "01",
    title: "Configurador de Diplomas",
    description:
      "Simulador web para personalizar diplomas en tiempo real, con vista previa interactiva, selección de plantillas y una experiencia de configuración pensada para producción.",
    year: "2026",
    category: "Simulador web",
    role: "UX/UI · Frontend · Three.js · WordPress",
    href: "https://diplomaspersonalizados.com/configurador-de-diplomas/",
    image: diplomaMain,
    layout: "content-left",
  },
  {
    id: "02",
    title: "Kaizen Patrimonio",
    description:
      "Web corporativa en WordPress para una firma de inversión inmobiliaria, con foco en estructura visual, jerarquía de contenidos y una presencia digital sobria y cuidada.",
    year: "2025",
    category: "Web corporativa",
    role: "Diseño web · Frontend · WordPress",
    href: "https://kaizenpatrimonio.es/",
    image: kaizenMain,
    layout: "content-right",
  },
  {
    id: "03",
    title: "Simulador Hipotecario BBVA",
    description:
      "Colaboración en el desarrollo de un simulador hipotecario junto al equipo, participando en la mejora de la experiencia digital para una herramienta financiera de uso real.",
    year: "2024",
    category: "Herramienta fintech",
    role: "Colaboración · Frontend · UX",
    href: "#",
    image: bbvaMain,
    layout: "content-left",
  },
  {
    id: "04",
    title: "Simulador de Alfombras",
    description:
      "Herramienta de personalización visual para configurar alfombras a medida, con enfoque en interacción, representación del producto y una experiencia orientada a conversión.",
    year: "2026",
    category: "Configurador de producto",
    role: "Canvas 2D · Frontend · UX/UI",
    href: "#",
    image: rugMain,
    layout: "content-right",
  },
];

function ProjectCard({ project }) {
  const isExternal = project.href && project.href !== "#";
  const isContentLeft = project.layout === "content-left";

  const imageColClasses = isContentLeft
    ? "lg:order-2 lg:border-l lg:border-white/6"
    : "lg:order-1 lg:border-r lg:border-white/6";

  const contentColClasses = isContentLeft ? "lg:order-1" : "lg:order-2";

  const inner = (
    <article className="project-card group relative overflow-hidden border border-white/6 bg-black/70">
      <div className="project-card-glow" />

      <div className="grid min-h-[420px] grid-cols-1 lg:min-h-[470px] lg:grid-cols-2">
        <div className={`relative flex ${contentColClasses}`}>
          <div className="relative flex w-full flex-col justify-between bg-black px-8 py-8 md:px-10 md:py-10 lg:px-12 lg:py-12">
            <div className="pointer-events-none absolute inset-0 opacity-[0.045] bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:36px_36px]" />

            <div className="relative z-[1]">
              <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-[11px] tracking-[0.18em] text-primary/80">
                  {project.id}
                </span>

                <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted/52">
                  {project.year} · {project.category}
                </span>
              </div>

              <h3 className="max-w-[12ch] text-3xl font-light tracking-[-0.05em] text-primary transition-colors duration-300 md:text-4xl lg:text-[50px] lg:leading-[0.95]">
                {project.title}
              </h3>

              <p className="mt-6 max-w-[36ch] text-sm leading-relaxed text-text-muted/80 md:text-[15px]">
                {project.description}
              </p>

              <div className="mt-8">
                <p className="text-[10px] uppercase tracking-[0.22em] text-text-muted/40">
                  Mi rol
                </p>
                <p className="mt-3 text-sm leading-relaxed text-text-muted/76 md:text-[17px]">
                  {project.role}
                </p>
              </div>
            </div>

            <div className="relative z-[1] mt-10">
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-primary/85 transition-colors duration-300 group-hover:text-primary">
                Ver proyecto
                <span
                  aria-hidden="true"
                  className="translate-y-[-1px] transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </div>
          </div>
        </div>

        <div
          className={`relative min-h-[280px] overflow-hidden border-t border-white/6 lg:min-h-0 lg:border-t-0 ${imageColClasses}`}
        >
          <div className="project-media relative h-full w-full overflow-hidden bg-[#0b0b0b]">
            <img
              src={project.image}
              alt={project.title}
              className="project-media-image h-full w-full object-cover object-center"
            />

            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.28),transparent_34%,rgba(255,255,255,0.02))]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.16)_100%)]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[1px] bg-white/5" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[1px] bg-white/5" />

            <div className="project-media-shine" />
          </div>
        </div>
      </div>
    </article>
  );

  if (isExternal) {
    return (
      <a href={project.href} target="_blank" rel="noreferrer" className="block">
        {inner}
      </a>
    );
  }

  return inner;
}

export function Projects() {
  return (
    <>
      <section
        id="work"
        className="relative overflow-hidden bg-bg py-12 md:py-16 lg:py-20"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-120px] top-16 h-[420px] w-[420px] rounded-full bg-primary/5 blur-[140px]" />
          <div className="absolute right-[-120px] top-[28%] h-[360px] w-[360px] rounded-full bg-primary/4 blur-[150px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.08),rgba(0,0,0,0.32),rgba(0,0,0,0.58))]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1440px] px-6 md:px-10 lg:px-12">
          <div className="mb-12 max-w-3xl md:mb-14 lg:mb-16">
            <span className="mb-4 block text-[11px] uppercase tracking-[0.28em] text-primary/80">
              Casos reales
            </span>

            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-primary md:text-4xl lg:text-5xl">
              Del experimento al producto
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-text-muted/80 md:text-[15px]">
              Una selección de proyectos donde la parte visual, la interacción y
              el frontend dejan de ser solo estética y pasan a resolver
              necesidades reales de producto, personalización y experiencia
              digital.
            </p>
          </div>

          <div className="grid gap-8 md:gap-10 lg:gap-12">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .project-card {
          transition:
            transform 500ms ease,
            border-color 500ms ease,
            box-shadow 500ms ease,
            background-color 500ms ease;
        }

        .project-card:hover {
          transform: translateY(-6px);
          border-color: rgba(var(--color-primary-rgb), 0.18);
          box-shadow:
            0 28px 80px rgba(0, 0, 0, 0.30),
            0 0 0 1px rgba(var(--color-primary-rgb), 0.05);
        }

        .project-card-glow {
          position: absolute;
          inset: -6%;
          z-index: 0;
          opacity: 0;
          transform: scale(0.96);
          pointer-events: none;
          background:
            radial-gradient(circle at 18% 50%, rgba(255,255,255,0.14), transparent 16%),
            radial-gradient(circle at 82% 50%, rgba(255,255,255,0.14), transparent 16%),
            radial-gradient(circle at 16% 50%, rgba(var(--color-primary-rgb), 0.12), transparent 20%),
            radial-gradient(circle at 84% 50%, rgba(var(--color-primary-rgb), 0.12), transparent 20%);
          filter: blur(42px);
          transition:
            opacity 500ms ease,
            transform 700ms ease;
        }

        .project-card:hover .project-card-glow {
          opacity: 1;
          transform: scale(1);
        }

        .project-media-image {
          transform: scale(1);
          transition:
            transform 800ms ease,
            filter 800ms ease;
        }

        .project-card:hover .project-media-image {
          transform: scale(1.045);
          filter: brightness(1.03) contrast(1.02);
        }

        .project-media-shine {
          position: absolute;
          inset: -20%;
          background: linear-gradient(
            110deg,
            transparent 38%,
            rgba(255,255,255,0.04) 47%,
            rgba(var(--color-primary-rgb), 0.14) 50%,
            rgba(255,255,255,0.04) 53%,
            transparent 62%
          );
          transform: translateX(-130%) rotate(8deg);
          opacity: 0;
          pointer-events: none;
        }

        .project-card:hover .project-media-shine {
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