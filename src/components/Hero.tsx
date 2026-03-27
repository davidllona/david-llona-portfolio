export function Hero() {
  return (
    <section className="min-h-screen flex items-center py-32 lg:py-40">
      <div className="container mx-auto px-6 md:px-12 lg:px-24">
        <div className="max-w-3xl">
          <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70 mb-10 block">
            Creative Developer
          </span>
          <h1 className="leading-[1.05] tracking-[-0.02em]">
            <span className="block text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extralight text-foreground">
              Crafting digital
            </span>
            <span className="block text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extralight text-foreground mt-1">
              experiences with
            </span>
            <span className="block text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extralight text-muted-foreground/50 mt-3">
              precision & care
            </span>
          </h1>
          <p className="mt-16 text-base text-muted-foreground/80 max-w-md leading-[1.7]">
            I design and build refined digital products that blend thoughtful design with robust engineering.
          </p>
          <div className="mt-16">
            <a 
              href="#work" 
              className="inline-flex items-center gap-3 text-sm text-foreground/90 border-b border-foreground/30 pb-2 hover:border-foreground/60 transition-colors duration-300"
            >
              View selected work
              <svg 
                width="10" 
                height="10" 
                viewBox="0 0 12 12" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M1 11L11 1M11 1H3M11 1V9" 
                  stroke="currentColor" 
                  strokeWidth="1.5"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
