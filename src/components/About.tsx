const capabilities = [
  "React / Next.js",
  "TypeScript",
  "Design Systems",
  "Product Strategy",
  "UI/UX Design",
  "Figma",
]

export function About() {
  return (
    <section id="about" className="py-40 lg:py-56 border-t border-border/20">
      <div className="container mx-auto px-6 md:px-12 lg:px-24">
        
        {/* Editorial layout - asymmetric composition */}
        <div className="grid lg:grid-cols-12 gap-16 lg:gap-8">
          
          {/* Left column - Label + large statement */}
          <div className="lg:col-span-8">
            <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/50 block mb-16 lg:mb-24">
              About
            </span>
            
            {/* Main statement - broken into intentional lines */}
            <div className="space-y-1 mb-20 lg:mb-32">
              <p className="text-3xl md:text-4xl lg:text-5xl xl:text-[3.5rem] font-extralight leading-[1.15] tracking-[-0.02em]">
                <span className="text-foreground">Creative developer</span>
              </p>
              <p className="text-3xl md:text-4xl lg:text-5xl xl:text-[3.5rem] font-extralight leading-[1.15] tracking-[-0.02em]">
                <span className="text-foreground">building at the edge of</span>
              </p>
              <p className="text-3xl md:text-4xl lg:text-5xl xl:text-[3.5rem] font-extralight leading-[1.15] tracking-[-0.02em]">
                <span className="text-muted-foreground/40">design and engineering.</span>
              </p>
            </div>

            {/* Body text - offset from main statement */}
            <div className="lg:ml-[20%] max-w-md">
              <p className="text-[15px] text-muted-foreground/60 leading-[1.8] mb-6">
                {"I'm focused on building digital experiences that feel both beautiful and inevitable. My approach combines the rigor of engineering with the intuition of design."}
              </p>
              <p className="text-[15px] text-muted-foreground/60 leading-[1.8]">
                Currently available for select projects and collaborations.
              </p>
            </div>
          </div>

          {/* Right column - Capabilities, pushed down */}
          <div className="lg:col-span-3 lg:col-start-10 lg:pt-[30vh]">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 block mb-8">
              Capabilities
            </span>
            <ul className="space-y-3">
              {capabilities.map((item, index) => (
                <li 
                  key={item}
                  className="text-sm text-foreground/70 flex items-baseline gap-4"
                >
                  <span className="text-[9px] text-muted-foreground/30">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom element - creates vertical rhythm */}
        <div className="mt-32 lg:mt-48 pt-16 border-t border-border/10">
          <div className="flex flex-col lg:flex-row lg:items-baseline justify-between gap-6">
            <p className="text-sm text-muted-foreground/40 max-w-sm">
              I believe the best work comes from genuine collaboration and shared creative vision.
            </p>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/30">
              Based in Madrid
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
