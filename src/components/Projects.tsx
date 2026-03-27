const projects = [
  {
    title: "Meridian",
    description: "A comprehensive design system for a fintech platform, focusing on accessibility and scalability.",
    year: "2024",
    featured: true,
  },
  {
    title: "Arcturus",
    description: "E-commerce experience for a premium lifestyle brand.",
    year: "2024",
    featured: false,
  },
  {
    title: "Vertex",
    description: "Data visualization dashboard for enterprise analytics.",
    year: "2023",
    featured: false,
  },
]

export function Projects() {
  const featuredProject = projects.find(p => p.featured)
  const otherProjects = projects.filter(p => !p.featured)

  return (
    <section id="work" className="py-32 lg:py-48">
      <div className="container mx-auto px-6 md:px-12 lg:px-24">
        <div className="flex items-baseline justify-between mb-16 lg:mb-24">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Selected Work
          </h2>
          <span className="text-xs text-muted-foreground">
            03 Projects
          </span>
        </div>

        {/* Featured Project */}
        {featuredProject && (
          <article className="group mb-24 lg:mb-32">
            <a href="#" className="block">
              <div className="aspect-[16/10] bg-muted mb-8 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-muted to-accent transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-light tracking-tight mb-3">
                    {featuredProject.title}
                  </h3>
                  <p className="text-muted-foreground max-w-lg">
                    {featuredProject.description}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground lg:text-right">
                  {featuredProject.year}
                </span>
              </div>
            </a>
          </article>
        )}

        {/* Other Projects */}
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
          {otherProjects.map((project) => (
            <article key={project.title} className="group">
              <a href="#" className="block">
                <div className="aspect-[4/3] bg-muted mb-6 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-muted to-accent transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl md:text-2xl font-light tracking-tight mb-2">
                      {project.title}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {project.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {project.year}
                  </span>
                </div>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
