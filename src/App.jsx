import { Hero } from './components/Hero'
// import { IntroStory } from './components/IntroStory'
import { Projects } from './components/Projects'
import { InteractiveLab } from './components/InteractiveLab'
import { About } from './components/About'
import { Contact } from './components/Contact'
import { LoadingDoor } from './components/LoadingDoor'
import { SpeedInsights } from "@vercel/speed-insights/react"

/**
 * App.jsx
 *
 * El Hero se monta DESDE EL PRINCIPIO, debajo del LoadingDoor (z-index 9999).
 * Esto es crítico para que sus loaders (GLTFLoader, TextureLoader) se
 * registren contra el loadingManager y el LoadingDoor pueda mostrar
 * progreso real. Si Hero esperase a que LoadingDoor termine, el
 * loadingManager se quedaría en 0% sin nada que reportar → deadlock.
 *
 * El problema del "sad face" en móvil (dos contextos WebGL simultáneos
 * matando uno por OOM) se resuelve en LoadingDoor.jsx mediante:
 *   1) renderer.forceContextLoss() en el cleanup → libera contexto YA.
 *   2) pixelRatio bajado a 1.5 en móvil → menos presión de VRAM mientras
 *      coexisten LoadingDoor y Hero los pocos segundos que ambos viven.
 *   3) Canvas dinámico (createElement) en vez de ref de React → arregla
 *      el problema de StrictMode reciclando contextos muertos.
 */
function App() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <LoadingDoor />
      <main>
        <Hero />
        <Projects />
        <InteractiveLab />
        <About />
        <Contact />
      </main>
      <SpeedInsights />
    </div>
  )
}

export default App