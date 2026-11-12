import { Suspense, useRef, useState } from "react";
import { PerformanceMonitor, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { HalfFloatType } from "three";
import { Cables } from "./Cables";
import { Interactions } from "./Interactions";
import { Lights } from "./Lights";
import { Nature } from "./Nature";
import { Player } from "./Player";
import { Props } from "./Props";
import { Ship } from "./Ship";
import { Terrain } from "./Terrain";
import { About } from "./zones/About";
import { Contact } from "./zones/Contact";
import { Lab } from "./zones/Lab";
import { Plaza } from "./zones/Plaza";
import { Projects } from "./zones/Projects";

// Dos niveles de calidad. El planeta es el mismo; en móvil se recorta lo que
// cuesta por píxel (resolución, sombras y suavizado de bordes).
const QUALITY = {
 high: { pixelRatio: 1.5, shadowMapSize: 2048, smoothEdges: true, stars: 5000 },
 low: { pixelRatio: 1.25, shadowMapSize: 1024, smoothEdges: false, stars: 2000 },
};

// Solo en desarrollo: parámetros en la URL para aislar qué cuesta rendimiento,
// por ejemplo ?fx=0&dpr=1&aa=0&shadows=0. En producción no existen.
const debug = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
const flag = (name, fallback) => (debug?.has(name) ? Number(debug.get(name)) : fallback);

// Avisa cuando la escena ya se ha dibujado unas cuantas veces: la pantalla de
// carga espera a eso, para no retirarse sobre un fotograma a medio montar.
function Ready({ onReady }) {
 const frames = useRef(0);
 const { gl, scene, camera } = useThree();
 useFrame(() => {
  if (frames.current > 6) return;
  frames.current += 1;
  if (frames.current === 2) gl.compile(scene, camera);
  if (frames.current > 6) onReady?.();
 });
 return null;
}

export function Experience({ active, lowPower, onReady }) {
 const preset = lowPower ? QUALITY.low : QUALITY.high;
 const quality = { ...preset, pixelRatio: flag("dpr", preset.pixelRatio) };
 const [pixelRatio, setPixelRatio] = useState(quality.pixelRatio);

 return (
  <Canvas
   className="experience"
   shadows={flag("shadows", 1) > 0}
   dpr={[1, pixelRatio]}
   // El antialias y el tone mapping los aplica el compositor de efectos.
   gl={{ antialias: false, powerPreference: "high-performance" }}
   camera={{ fov: 40, near: 0.5, far: 900, position: [0, 17, 21] }}
  >
   {/* El color del fondo y de la niebla los pone el tema (ver Lights.jsx). */}
   <color attach="background" args={["#f4b98a"]} />
   <fogExp2 attach="fog" args={["#f4b98a", 0.0075]} />

   {/* Si el dispositivo no llega a mantener los fps, se baja la resolución. */}
   {!debug?.has("dpr") && <PerformanceMonitor onDecline={() => setPixelRatio(1)} />}

   <Lights shadowMapSize={quality.shadowMapSize} />
   <Stars radius={320} depth={120} count={quality.stars} factor={10} saturation={0.6} fade speed={0.6} />

   <Suspense fallback={null}>
    <Terrain />
    <Nature />
    <Cables />
    <Plaza />
    <Projects />
    <Lab />
    <About />
    <Contact />
    <Props />
    <Ship />
    <Ready onReady={onReady} />
   </Suspense>
   <Player active={active} />
   <Interactions active={active} />

   {/* Búfer de 16 bits por canal, para que los degradados suaves no se rompan en escalones. */}
   {flag("fx", 1) > 0 && (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType} disableNormalPass>
     <Bloom mipmapBlur levels={5} radius={0.7} intensity={0.55} luminanceThreshold={1.05} luminanceSmoothing={0.25} />
     <Vignette offset={0.3} darkness={0.42} />
     <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
     {quality.smoothEdges && flag("aa", 1) > 0 ? <SMAA /> : <></>}
    </EffectComposer>
   )}
  </Canvas>
 );
}
