import { Hero } from './components/Hero'
// import { IntroStory } from './components/IntroStory'
import { Projects } from './components/Projects'
import { InteractiveLab } from './components/InteractiveLab'
import { About } from './components/About'
// import { Contact } from './components/Contact'
import { SpeedInsights } from "@vercel/speed-insights/react"


function App() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <main>
        <Hero />
        <Projects />
        <InteractiveLab />
        <About />
        {/* <Contact /> */}
      </main>
      <SpeedInsights />
    </div>
  )
}

export default App
