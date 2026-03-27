const projects = [
  {
    id: "01",
    title: "Meridian",
    description: "A comprehensive design system for a fintech platform, focusing on accessibility and scalability.",
    year: "2024",
    category: "Design System",
    scope: ["Strategy", "Design", "Development"],
  },
  {
    id: "02",
    title: "Arcturus",
    description: "E-commerce experience for a premium lifestyle brand.",
    year: "2024",
    category: "E-commerce",
    scope: ["UX Design", "Frontend"],
  },
  {
    id: "03",
    title: "Vertex",
    description: "Data visualization dashboard for enterprise analytics.",
    year: "2023",
    category: "Dashboard",
    scope: ["Product Design", "React"],
  },
]

export function Projects() {
  return (
    <section id="work" className="py-40 lg:py-56">
      <div className="container mx-auto px-6 md:px-12 lg:px-24">
        {/* Section Header - offset positioning */}
        <div className="mb-32 lg:mb-44">
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70">
            Selected Work
          </h2>
        </div>

        {/* Project 01 - Large, image left, text right */}
        <article className="group mb-48 lg:mb-64">
          <a href="#" className="block">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-6 items-end">
              {/* Image - takes 7 cols, bleeds left */}
              <div className="lg:col-span-7 lg:-ml-12">
                <div className="aspect-[4/3] overflow-hidden border border-border/20">
                  <div className="w-full h-full bg-muted/20 transition-all duration-700 ease-out group-hover:scale-[1.02]" />
                </div>
              </div>
              
              {/* Text - right side, offset up */}
              <div className="lg:col-span-4 lg:col-start-9 lg:-mb-16">
                <span className="text-[10px] text-muted-foreground/30 block mb-6">
                  {projects[0].id}
                </span>
                <h3 className="text-4xl md:text-5xl lg:text-6xl font-extralight tracking-[-0.03em] text-foreground mb-6">
                  {projects[0].title}
                </h3>
                <p className="text-sm text-muted-foreground/50 leading-relaxed mb-8 max-w-xs">
                  {projects[0].description}
                </p>
                <div className="flex flex-wrap gap-3">
                  {projects[0].scope.map((item) => (
                    <span key={item} className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </a>
        </article>

        {/* Project 02 - Text left, image right, different rhythm */}
        <article className="group mb-48 lg:mb-64">
          <a href="#" className="block">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-6 items-start">
              {/* Text - left side */}
              <div className="lg:col-span-4 lg:col-start-2 order-2 lg:order-1 lg:pt-24">
                <span className="text-[10px] text-muted-foreground/30 block mb-6">
                  {projects[1].id}
                </span>
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-extralight tracking-[-0.03em] text-foreground mb-6">
                  {projects[1].title}
                </h3>
                <p className="text-sm text-muted-foreground/50 leading-relaxed mb-8">
                  {projects[1].description}
                </p>
                <div className="flex flex-wrap gap-3">
                  {projects[1].scope.map((item) => (
                    <span key={item} className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Image - right side, different aspect ratio */}
              <div className="lg:col-span-6 lg:col-start-7 order-1 lg:order-2">
                <div className="aspect-[3/4] lg:aspect-[4/5] overflow-hidden border border-border/20">
                  <div className="w-full h-full bg-muted/20 transition-all duration-700 ease-out group-hover:scale-[1.02]" />
                </div>
              </div>
            </div>
          </a>
        </article>

        {/* Project 03 - Compact, horizontal, different feel */}
        <article className="group">
          <a href="#" className="block">
            <div className="lg:ml-[16%]">
              <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Compact image */}
                <div className="lg:col-span-5">
                  <div className="aspect-[16/10] overflow-hidden border border-border/20">
                    <div className="w-full h-full bg-muted/20 transition-all duration-700 ease-out group-hover:scale-[1.02]" />
                  </div>
                </div>
                
                {/* Text inline */}
                <div className="lg:col-span-5">
                  <div className="flex items-baseline gap-6 mb-4">
                    <span className="text-[10px] text-muted-foreground/30">
                      {projects[2].id}
                    </span>
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-extralight tracking-[-0.02em] text-foreground">
                      {projects[2].title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground/50 leading-relaxed mb-6">
                    {projects[2].description}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {projects[2].scope.map((item) => (
                      <span key={item} className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </a>
        </article>
      </div>
    </section>
  )
}
