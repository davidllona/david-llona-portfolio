const skills = [
  { category: "Development", items: ["React", "TypeScript", "Next.js", "Node.js"] },
  { category: "Design", items: ["Figma", "Tailwind CSS"] },
  { category: "Infrastructure", items: ["PostgreSQL", "AWS"] },
]

export function About() {
  return (
    <section id="about" className="py-40 lg:py-56 border-t border-border/30">
      <div className="container mx-auto px-6 md:px-12 lg:px-24">
        {/* Big Statement */}
        <blockquote className="mb-32 lg:mb-44">
          <p className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extralight leading-[1.2] tracking-[-0.02em] max-w-5xl text-balance">
            <span className="text-foreground">I believe great software comes from the intersection of </span>
            <span className="text-muted-foreground/50">thoughtful design and meticulous engineering.</span>
          </p>
        </blockquote>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-12 gap-20 lg:gap-32">
          {/* Left: Description */}
          <div className="lg:col-span-6">
            <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70 mb-10">
              About
            </h2>
            <div className="space-y-7 text-muted-foreground/70 text-[15px] leading-[1.8]">
              <p>
                {"I'm a creative developer focused on building digital experiences that are both beautiful and functional. With a background in both design and engineering, I approach each project with a holistic perspective."}
              </p>
              <p>
                Currently, I work at the intersection of design and technology, helping companies bring their digital products to life. My process emphasizes clarity, simplicity, and attention to detail.
              </p>
              <p>
                {"When I'm not coding, you'll find me exploring new technologies, contributing to open source, or refining my craft through personal projects."}
              </p>
            </div>
          </div>

          {/* Right: Skills */}
          <div className="lg:col-span-5 lg:col-start-8">
            <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70 mb-10">
              Skills & Tools
            </h2>
            <div className="space-y-10">
              {skills.map((group) => (
                <div key={group.category}>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 block mb-4">
                    {group.category}
                  </span>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {group.items.map((skill) => (
                      <span 
                        key={skill}
                        className="text-foreground/80 text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
