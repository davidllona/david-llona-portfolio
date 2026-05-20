import { useEffect, useState } from 'react'
import { Hero } from './components/Hero'
// import { IntroStory } from './components/IntroStory'
import { Projects } from './components/Projects'
import { InteractiveLab } from './components/InteractiveLab'
import { About } from './components/About'
import { Contact } from './components/Contact'
import { LoadingDoor } from './components/LoadingDoor'
import { LazyMount } from './components/LazyMount'
import { preloadCriticalAssets } from './3d/assetPreloader'
import { SpeedInsights } from "@vercel/speed-insights/react"


function App() {
  // ──────────────────────────────────────────────────────────────────────
  // GATE DE MONTAJE — crítico para móviles con GPU limitada
  // ──────────────────────────────────────────────────────────────────────
  // Mientras LoadingDoor está visible, en el DOM solo existe él (en móvil
  // es HTML/CSS puro, cero WebGL). Cuando notifica que va a desaparecer,
  // se monta el `<main>` y empieza la cascada de lazy mount: Hero arranca
  // su WebGL, las demás secciones esperan a estar cerca del viewport.
  const [mainReady, setMainReady] = useState(false)

  // ──────────────────────────────────────────────────────────────────────
  // PRECARGA DE ASSETS — barra del LoadingDoor con progreso real
  // ──────────────────────────────────────────────────────────────────────
  // El loadingManager solo recibe eventos cuando hay loaders activos.
  // Con el gate de mainReady, los componentes que crean loaders no
  // existen todavía → barra plana en 0%. Disparar aquí las descargas
  // de los GLBs/texturas del Hero resuelve eso. Los componentes los
  // pedirán de nuevo cuando se monten, pero ya estarán en caché HTTP.
  useEffect(() => {
    preloadCriticalAssets()
  }, [])

  return (
    <div className="min-h-screen bg-bg text-text">
      <LoadingDoor onComplete={() => setMainReady(true)} />
      {mainReady && (
        <main>
          {/*
            Hero se monta inmediatamente — es la primera sección visible
            y necesita estar lista para el scroll inmediato del usuario.
            Su WebGL es el único contexto activo en este momento.
          */}
          <Hero />

          {/*
            Resto de secciones con LazyMount — cada una se monta cuando
            está a ~300px del viewport. En móviles con GPU limitada
            (Mali-G68) esto evita los ~9 contextos WebGL simultáneos
            que causaban OOM y secciones en blanco / sad face.
            En cualquier momento solo hay 1-2 contextos WebGL activos.
          */}
          <LazyMount><Projects /></LazyMount>
          <LazyMount><InteractiveLab /></LazyMount>
          <LazyMount><About /></LazyMount>
          <LazyMount><Contact /></LazyMount>
        </main>
      )}
      <SpeedInsights />
    </div>
  )
}

export default App