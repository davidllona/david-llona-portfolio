export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
      <nav className="container mx-auto px-6 md:px-12 lg:px-24 py-6 flex items-center justify-between">
        <a href="#" className="text-sm font-medium tracking-tight text-foreground">
          David Llona
        </a>
        <ul className="hidden md:flex items-center gap-8">
          <li>
            <a 
              href="#work" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Work
            </a>
          </li>
          <li>
            <a 
              href="#about" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </a>
          </li>
          <li>
            <a 
              href="#contact" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </li>
        </ul>
        <a 
          href="#contact" 
          className="md:hidden text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Contact
        </a>
      </nav>
    </header>
  )
}
