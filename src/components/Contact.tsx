export function Contact() {
  return (
    <section id="contact" className="py-32 lg:py-48 border-t border-border">
      <div className="container mx-auto px-6 md:px-12 lg:px-24">
        <div className="max-w-3xl">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8 block">
            Contact
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-light leading-[1.2] tracking-tight mb-8">
            <span className="text-balance">
              {"Let's work together"}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-lg">
            Have a project in mind? I'd love to hear about it. Drop me a line and let's create something exceptional.
          </p>
          <a 
            href="mailto:hello@davidllona.com"
            className="inline-flex items-center gap-3 text-lg md:text-xl text-foreground border-b border-foreground pb-2 hover:text-muted-foreground hover:border-muted-foreground transition-colors"
          >
            hello@davidllona.com
            <svg 
              width="16" 
              height="16" 
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
    </section>
  )
}
