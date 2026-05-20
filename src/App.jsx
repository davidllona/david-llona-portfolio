import { useState } from 'react'
import { Hero } from './components/Hero'
// import { IntroStory } from './components/IntroStory'
import { Projects } from './components/Projects'
import { InteractiveLab } from './components/InteractiveLab'
import { About } from './components/About'
import { Contact } from './components/Contact'
import { LoadingDoor } from './components/LoadingDoor'
import { SpeedInsights } from "@vercel/speed-insights/react"


function App() {
  // ──────────────────────────────────────────────────────────────────────
  // GATE DE MONTAJE — crítico para móviles con GPU limitada
  // ──────────────────────────────────────────────────────────────────────
  // Antes: <Hero />, <Projects />, <InteractiveLab />, <About /> y
  // <Contact /> se montaban SIMULTÁNEAMENTE con <LoadingDoor />. Cada uno
  // arranca su propio WebGLRenderer en su useEffect → ~8 contextos WebGL
  // activos al cargar la página.
  //
  // En desktop / iPhone potente eso es trivial. En ARM Mali-G68 (Samsung
  // A54 5G, Pixel 6a, gama media-baja en general) la VRAM compartida no
  // aguanta tantos contextos en paralelo → Chrome móvil mata el contexto
  // del `#webgl` del Hero por OOM → pantalla negra eterna, exactamente el
  // bug que se veía con "WebGL CONTEXT LOST en #webgl" en el panel debug.
  //
  // Con este gate: mientras LoadingDoor está visible, en el DOM solo
  // existe él (en móvil es HTML/CSS puro, cero WebGL). Cuando notifica
  // que va a desaparecer, se monta el `<main>` y todos los WebGLs nacen
  // sin competencia. La transición funciona bien porque LoadingDoor
  // llama `onComplete` AL INICIO de su fade-out (~700ms antes de
  // desmontarse del todo), dándole al Hero el tiempo para arrancar
  // mientras el loader se desvanece encima.
  //
  // Coste en desktop: cero — el LoadingDoor desktop también llama
  // onComplete cuando termina, simplemente cambia el orden de montaje
  // a uno más limpio (sin solape de WebGL).
  const [mainReady, setMainReady] = useState(false)

  return (
    <div className="min-h-screen bg-bg text-text">
      <LoadingDoor onComplete={() => setMainReady(true)} />
      {mainReady && (
        <main>
          <Hero />
          <Projects />
          <InteractiveLab />
          <About />
          <Contact />
        </main>
      )}
      <SpeedInsights />
    </div>
  )
}

export default App