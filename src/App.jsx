import { useEffect, useState } from 'react'
import { Hero } from './components/Hero'

import { Projects } from './components/Projects'
import { InteractiveLab } from './components/InteractiveLab'
import { About } from './components/About'
import { Contact } from './components/Contact'
import { LoadingDoor } from './components/LoadingDoor'
import { LazyMount } from './components/LazyMount'
import { preloadCriticalAssets } from './3d/assetPreloader'
import { SpeedInsights } from "@vercel/speed-insights/react"


function App() {

  const [mainReady, setMainReady] = useState(false)

  useEffect(() => {
    preloadCriticalAssets()
  }, [])

  return (
    <div className="min-h-screen bg-bg text-text">
      <LoadingDoor onComplete={() => setMainReady(true)} />
      {mainReady && (
        <main>
          {}
          <Hero />

          {}
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