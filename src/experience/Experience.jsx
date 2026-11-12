import { Suspense, useRef, useState } from "react";
import { PerformanceMonitor, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { HalfFloatType } from "three";
import { Woody } from "../characters/Woody";
import { SCENES, world } from "../worlds";
import { Interactions } from "./Interactions";
import { Lights } from "./Lights";
import { Player } from "./Player";
import { Props } from "./Props";
import { Ship } from "./Ship";
import { Sky } from "./Sky";
import { current } from "./theme";
import { WarmLights } from "./WarmLights";

// Dos niveles de calidad. El planeta es el mismo; en móvil se recorta lo que
// cuesta por píxel (resolución, sombras y suavizado de bordes).
const QUALITY = {
 high: { pixelRatio: 1.5, shadowMapSize: 2048, smoothEdges: true, stars: 5000, warmLights: 6 },
 low: { pixelRatio: 1.25, shadowMapSize: 1024, smoothEdges: false, stars: 2000, warmLights: 3 },
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

// La niebla y el resplandor cambian con la hora: de noche, más bruma y las
// luces brillan más.
function Atmosphere({ bloom }) {
 const scene = useThree((state) => state.scene);
 useFrame(() => {
  scene.fog.density = current.fogDensity;
  if (bloom.current) bloom.current.intensity = current.bloom;
 });
 return null;
}

export function Experience({ active, lowPower, onReady }) {
 const bloom = useRef(null);
 const preset = lowPower ? QUALITY.low : QUALITY.high;
 const quality = { ...preset, pixelRatio: flag("dpr", preset.pixelRatio) };
 const [pixelRatio, setPixelRatio] = useState(quality.pixelRatio);
 const Scene = SCENES[world.id];

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
   <WarmLights count={quality.warmLights} />
   <Sky />
   <Atmosphere bloom={bloom} />
   <Stars radius={320} depth={120} count={quality.stars} factor={10} saturation={0.6} fade speed={0.6} />

   {/* Lo propio del planeta se descarga aparte; lo común (personajes, nave,
       objetos) es igual en todos. La clave reinicia todo al cambiar de mundo. */}
   <Suspense fallback={null}>
    <group key={world.id}>
     <Scene />
     <Props />
     <Ship />
     <Player active={active} />
     <Woody active={active} />
    </group>
    <Ready onReady={onReady} />
   </Suspense>
   <Interactions active={active} />

   {/* Búfer de 16 bits por canal, para que los degradados suaves no se rompan en escalones. */}
   {flag("fx", 1) > 0 && (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType} disableNormalPass>
     {/* Solo brilla lo que emite luz (por encima del blanco): farolas, ventanas, cristales. */}
     <Bloom ref={bloom} mipmapBlur levels={6} radius={0.75} intensity={0.5} luminanceThreshold={1.02} luminanceSmoothing={0.3} />
     <Vignette offset={0.3} darkness={0.42} />
     <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
     {quality.smoothEdges && flag("aa", 1) > 0 ? <SMAA /> : <></>}
    </EffectComposer>
   )}
  </Canvas>
 );
}
