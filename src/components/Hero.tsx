export function Hero() {
  return (
    <section className="min-h-screen flex items-center pt-24">
      <div className="container mx-auto px-6 md:px-12 lg:px-24">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8">
          <div className="lg:col-span-7 xl:col-span-6 flex flex-col justify-center">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
              Creative Developer
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-light leading-[1.1] tracking-tight text-balance">
              Crafting digital
              <br />
              experiences with
              <br />
              <span className="text-muted-foreground">precision & care</span>
            </h1>
            <p className="mt-8 text-base md:text-lg text-muted-foreground max-w-md leading-relaxed">
              I design and build refined digital products that blend thoughtful design with robust engineering.
            </p>
            <div className="mt-12">
              <a 
                href="#work" 
                className="inline-flex items-center gap-2 text-sm text-foreground border-b border-foreground pb-1 hover:text-muted-foreground hover:border-muted-foreground transition-colors"
              >
                View selected work
                <svg 
                  width="12" 
                  height="12" 
                  viewBox="0 0 12 12" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="translate-y-px"
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
          <div className="lg:col-span-5 xl:col-span-6 hidden lg:flex items-center justify-end">
            {/* Intentional empty space for asymmetrical layout */}
          </div>
        </div>
      </div>
    </section>
  )
}
