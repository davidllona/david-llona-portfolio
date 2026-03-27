const projects = [
  {
    title: "Meridian",
    description: "A comprehensive design system for a fintech platform, focusing on accessibility and scalability.",
    year: "2024",
    category: "Design System",
    featured: true,
  },
  {
    title: "Arcturus",
    description: "E-commerce experience for a premium lifestyle brand.",
    year: "2024",
    category: "E-commerce",
    featured: false,
  },
  {
    title: "Vertex",
    description: "Data visualization dashboard for enterprise analytics.",
    year: "2023",
    category: "Dashboard",
    featured: false,
  },
]

export function Projects() {
  const featuredProject = projects.find(p => p.featured)
  const otherProjects = projects.filter(p => !p.featured)

  return (
    <section id="work" className="py-40 lg:py-56">
      <div className="container mx-auto px-6 md:px-12 lg:px-24">
        <div className="flex items-baseline justify-between mb-20 lg:mb-28">
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70">
            Selected Work
          </h2>
          <span className="text-[11px] tracking-wide text-muted-foreground/50">
            03
          </span>
        </div>

        {/* Featured Project */}
        {featuredProject && (
          <article className="group mb-32 lg:mb-40">
            <a href="#" className="block">
              <div className="aspect-[2/1] lg:aspect-[2.5/1] mb-10 overflow-hidden border border-border/30">
                <div className="w-full h-full bg-muted/30 transition-all duration-700 ease-out group-hover:scale-[1.02] group-hover:opacity-80" />
              </div>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="space-y-4">
                  <h3 className="text-3xl md:text-4xl lg:text-5xl font-extralight tracking-[-0.02em] text-foreground">
                    {featuredProject.title}
                  </h3>
                  <p className="text-sm text-muted-foreground/60 max-w-md leading-relaxed">
                    {featuredProject.description}
                  </p>
                </div>
                <div className="flex items-center gap-6 lg:pt-3">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/40">
                    {featuredProject.category}
                  </span>
                  <span className="text-[11px] text-muted-foreground/40">
                    {featuredProject.year}
                  </span>
                </div>
              </div>
            </a>
          </article>
        )}

        {/* Other Projects */}
        <div className="grid md:grid-cols-2 gap-x-12 lg:gap-x-20 gap-y-20 lg:gap-y-24">
          {otherProjects.map((project) => (
            <article key={project.title} className="group">
              <a href="#" className="block">
                <div className="aspect-[16/11] mb-8 overflow-hidden border border-border/20">
                  <div className="w-full h-full bg-muted/20 transition-all duration-500 ease-out group-hover:scale-[1.03] group-hover:opacity-70" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-xl md:text-2xl font-extralight tracking-tight text-foreground/90">
                      {project.title}
                    </h3>
                    <span className="text-[10px] text-muted-foreground/40 shrink-0">
                      {project.year}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/50 max-w-sm leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
