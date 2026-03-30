import { Hero } from './components/Hero'
import { Projects } from './components/Projects'
import { About } from './components/About'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { SpeedInsights } from "@vercel/speed-insights/react"


function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <Hero />
        <Projects />
        <About />
        <Contact />
      </main>
      <Footer />
      <SpeedInsights />
    </div>
  )
}

export default App
