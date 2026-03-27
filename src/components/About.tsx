const skills = [
  "React",
  "TypeScript",
  "Next.js",
  "Node.js",
  "Tailwind CSS",
  "Figma",
  "PostgreSQL",
  "AWS",
]

export function About() {
  return (
    <section id="about" className="py-32 lg:py-48 border-t border-border">
      <div className="container mx-auto px-6 md:px-12 lg:px-24">
        {/* Big Statement */}
        <blockquote className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-light leading-[1.3] tracking-tight max-w-4xl mb-24 lg:mb-32">
          <span className="text-balance">
            {"I believe great software comes from the intersection of thoughtful design and meticulous engineering."}
          </span>
        </blockquote>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-12 gap-16 lg:gap-24">
          {/* Left: Description */}
          <div className="lg:col-span-7">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8">
              About
            </h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                {"I'm a creative developer focused on building digital experiences that are both beautiful and functional. With a background in both design and engineering, I approach each project with a holistic perspective."}
              </p>
              <p>
                Currently, I work at the intersection of design and technology, helping companies bring their digital products to life. My process emphasizes clarity, simplicity, and attention to detail.
              </p>
              <p>
                When I'm not coding, you'll find me exploring new technologies, contributing to open source, or refining my craft through personal projects.
              </p>
            </div>
          </div>

          {/* Right: Skills */}
          <div className="lg:col-span-5">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8">
              Skills & Tools
            </h2>
            <ul className="space-y-3">
              {skills.map((skill) => (
                <li 
                  key={skill}
                  className="text-foreground/90 flex items-center gap-3"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
