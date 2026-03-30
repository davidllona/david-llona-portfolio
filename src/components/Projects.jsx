const projects = [
  {
    id: "01",
    title: "Meridian",
    description:
      "Sistema visual y experiencia digital pensados para escalar con claridad, consistencia y una interfaz más refinada.",
    year: "2024",
    category: "Design System",
    scope: ["Strategy", "Design", "Development"],
  },
  {
    id: "02",
    title: "Arcturus",
    description:
      "Experiencia e-commerce para una marca premium, con foco en narrativa visual, conversión y frontend cuidado.",
    year: "2024",
    category: "E-commerce",
    scope: ["UX Design", "Frontend"],
  },
  {
    id: "03",
    title: "Vertex",
    description:
      "Dashboard de visualización de datos para analítica avanzada, orientado a claridad, jerarquía y usabilidad real.",
    year: "2023",
    category: "Dashboard",
    scope: ["Product Design", "React"],
  },
];

export function Projects() {
  return (
<section id="work" className="bg-bg py-16 md:py-20 lg:py-24">
  <div className="mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-16">
    <div className="mb-12 md:mb-14 lg:mb-16 max-w-3xl">
      <span className="mb-4 block text-[11px] uppercase tracking-[0.28em] text-primary/70">
        Selected Work
      </span>

      <h2 className="text-3xl font-semibold tracking-[-0.04em] text-text md:text-4xl lg:text-5xl">
        Proyectos reales
      </h2>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted/80 md:text-[15px]">
        Una selección de trabajos donde diseño, frontend y estructura se unen
        con una ejecución cuidada, clara y funcional.
      </p>
    </div>

        <div className="divide-y divide-white/6">
          {projects.map((project) => (
            <article
              key={project.id}
              className="group grid gap-8 py-10 transition-colors duration-300 md:gap-10 md:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
            >
              <div>
                <div className="mb-4 flex items-center gap-4">
                  <span className="text-[11px] tracking-[0.18em] text-primary/75">
                    {project.id}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted/55">
                    {project.year} · {project.category}
                  </span>
                </div>

                <h3 className="mb-4 text-3xl font-light tracking-[-0.04em] text-text transition-colors duration-300 group-hover:text-primary-soft md:text-4xl lg:text-5xl">
                  {project.title}
                </h3>

                <p className="mb-6 max-w-xl text-sm leading-relaxed text-text-muted/80 md:text-[15px]">
                  {project.description}
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {project.scope.map((item) => (
                    <span
                      key={item}
                      className="text-[10px] uppercase tracking-[0.16em] text-primary/60 transition-colors duration-300 group-hover:text-primary/90"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="lg:flex lg:justify-end">
                <div className="w-full max-w-[460px] overflow-hidden border border-white/8 bg-gradient-to-br from-[#0b0b0b] via-[#101010] to-[#16110d] transition-all duration-500 group-hover:border-primary/25 group-hover:shadow-[0_0_30px_rgba(249,115,22,0.06)]">
                  <div className="aspect-[16/10] bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.03),transparent_28%)] transition-all duration-500 group-hover:scale-[1.015] group-hover:brightness-110" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}