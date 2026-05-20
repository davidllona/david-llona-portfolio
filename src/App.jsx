import { useEffect, useState } from 'react'
import { Hero } from './components/Hero'
// import { IntroStory } from './components/IntroStory'
import { Projects } from './components/Projects'
import { InteractiveLab } from './components/InteractiveLab'
import { About } from './components/About'
import { Contact } from './components/Contact'
import { LoadingDoor } from './components/LoadingDoor'
import { preloadCriticalAssets } from './3d/assetPreloader'
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
  // del `#webgl` del Hero por OOM → pantalla negra eterna.
  //
  // Con este gate: mientras LoadingDoor está visible, en el DOM solo
  // existe él (en móvil es HTML/CSS puro, cero WebGL). Cuando notifica
  // que va a desaparecer, se monta el `<main>` y todos los WebGLs nacen
  // sin competencia.
  const [mainReady, setMainReady] = useState(false)

  // ──────────────────────────────────────────────────────────────────────
  // PRECARGA DE ASSETS — para que la barra del LoadingDoor avance de
  // verdad y no salte del 0 al 100
  // ──────────────────────────────────────────────────────────────────────
  // El LoadingDoor está suscrito al `loadingManager` compartido, pero ese
  // manager solo recibe eventos cuando hay loaders activos. Con el gate
  // de arriba, los componentes que crean loaders (Hero, etc.) no existen
  // todavía → no hay nada que cargar → barra plana en 0%.
  //
  // Lo arreglamos disparando aquí las descargas de los GLBs/texturas más
  // pesados del Hero. El loadingManager observa el progreso y se lo
  // notifica al LoadingDoor → la barra avanza con datos reales. Cuando
  // el Hero se monte, pedirá los mismos archivos y los recibirá
  // instantáneos desde el HTTP cache del navegador.
  //
  // Importante: el preloader NO crea contextos WebGL. Solo descarga y
  // decodifica archivos. La filosofía del gate sigue intacta.
  useEffect(() => {
    preloadCriticalAssets()
  }, [])

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