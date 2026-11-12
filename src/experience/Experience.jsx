import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { fxaa } from "three/addons/tsl/display/FXAANode.js";
import { pass, renderOutput, screenUV, smoothstep } from "three/tsl";
import { RenderPipeline, WebGPURenderer } from "three/webgpu";
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
import { Welcome } from "./Welcome";

// Dos niveles de calidad. El planeta es el mismo; en móvil se recorta lo que
// cuesta por píxel (resolución, sombras y suavizado de bordes).
const QUALITY = {
 high: { pixelRatio: 1.5, shadowMapSize: 2048, smoothEdges: true, stars: 3000, warmLights: 6, bloomMips: 5 },
 low: { pixelRatio: 1.25, shadowMapSize: 1024, smoothEdges: false, stars: 1200, warmLights: 3, bloomMips: 3 },
};

// Solo en desarrollo: parámetros en la URL para aislar qué cuesta rendimiento
// o probar el respaldo, por ejemplo ?fx=0&dpr=1&aa=0&shadows=0&backend=webgl.
const debug = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
const flag = (name, fallback) => (debug?.has(name) ? Number(debug.get(name)) : fallback);

// El renderer es WebGPU. Donde el navegador no lo ofrece, el propio renderer
// cae a su backend WebGL2: mismos materiales de nodos, mismo código.
function createRenderer(canvas, onReady) {
 const renderer = new WebGPURenderer({
  canvas,
  antialias: false, // los bordes se suavizan en el posproceso
  powerPreference: "high-performance",
  forceWebGL: debug?.get("backend") === "webgl",
 });
 // La inicialización es asíncrona (pide el adaptador y el dispositivo de GPU):
 // hasta que termina no se dibuja nada.
 renderer.init().then(() => {
  if (import.meta.env.DEV) window.__world.backend = renderer.backend.isWebGPUBackend ? "webgpu" : "webgl2"; // para las pruebas automáticas
  onReady();
 });
 return renderer;
}

// Avisa cuando la escena ya se ha compilado y dibujado unas cuantas veces: la
// pantalla de carga espera a eso, para no retirarse sobre un fotograma a medio montar.
function Ready({ onReady }) {
 const frames = useRef(0);
 const compiled = useRef(false);
 const { gl, scene, camera } = useThree();
 useFrame(() => {
  if (frames.current === 1 && !compiled.current) {
   compiled.current = "pending";
   gl.compileAsync(scene, camera).then(() => (compiled.current = true));
  }
  if (frames.current > 8) return;
  if (frames.current < 2 || compiled.current === true) frames.current += 1;
  if (frames.current > 8) onReady?.();
 });
 return null;
}

// Posproceso con nodos: la escena se dibuja a un búfer de 16 bits por canal,
// se le suma el resplandor de lo que emite luz, una viñeta suave, y al final
// se aplican el mapeo de tonos y el suavizado de bordes. Toma el control del
// dibujado (prioridad 1), así que también hace avanzar la niebla.
function Pipeline({ quality, effects }) {
 const { gl, scene, camera } = useThree();
 const pipeline = useMemo(() => {
  const result = new RenderPipeline(gl);
  const scenePass = pass(scene, camera);
  const color = scenePass.getTextureNode("output");
  let output = color;
  let glow = null;
  if (effects) {
   // Solo brilla lo que supera el blanco: farolas, ventanas, cristales.
   glow = bloom(color, 0.5, 0.75, 1.0);
   glow._nMips = quality.bloomMips;
   const vignette = smoothstep(1.05, 0.35, screenUV.sub(0.5).length()).mul(0.42).add(0.58);
   output = color.add(glow).mul(vignette);
  }
  result.outputColorTransform = false;
  output = renderOutput(output);
  result.outputNode = quality.smoothEdges && flag("aa", 1) > 0 ? fxaa(output) : output;
  return { render: () => result.render(), dispose: () => result.dispose(), glow };
 }, [gl, scene, camera, quality, effects]);
 useEffect(() => () => pipeline.dispose(), [pipeline]);

 useFrame(() => {
  scene.fog.density = current.fogDensity;
  if (pipeline.glow) pipeline.glow.strength.value = current.bloom;
  pipeline.render();
 }, 1);
 return null;
}

export function Experience({ active, lowPower, onReady }) {
 const preset = lowPower ? QUALITY.low : QUALITY.high;
 const quality = useMemo(() => ({ ...preset, pixelRatio: flag("dpr", preset.pixelRatio) }), [preset]);
 const [pixelRatio, setPixelRatio] = useState(quality.pixelRatio);
 // El bucle de dibujado no arranca hasta que la GPU está lista.
 const [gpuReady, setGpuReady] = useState(false);
 const Scene = SCENES[world.id];

 return (
  <Canvas
   className="experience"
   frameloop={gpuReady ? "always" : "never"}
   shadows={flag("shadows", 1) > 0}
   dpr={[1, pixelRatio]}
   gl={(canvas) => createRenderer(canvas, () => setGpuReady(true))}
   camera={{ fov: 40, near: 0.5, far: 900, position: [0, 17, 21] }}
  >
   {/* El color del fondo y de la niebla los pone el tema (ver Lights.jsx). */}
   <color attach="background" args={["#f4b98a"]} />
   <fogExp2 attach="fog" args={["#f4b98a", 0.0075]} />

   {/* Si el dispositivo no llega a mantener los fps, se baja la resolución. */}
   {!debug?.has("dpr") && <PerformanceMonitor onDecline={() => setPixelRatio(1)} />}

   <Lights shadowMapSize={quality.shadowMapSize} />
   <WarmLights count={quality.warmLights} />
   <Sky stars={quality.stars} />

   {/* Lo propio del planeta se descarga aparte; lo común (personajes, nave,
       objetos) es igual en todos. La clave reinicia todo al cambiar de mundo. */}
   <Suspense fallback={null}>
    <group key={world.id}>
     <Scene quality={lowPower ? "low" : "high"} />
     <Props />
     <Ship />
     <Player active={active} />
     <Woody active={active} />
    </group>
    <Welcome />
    <Ready onReady={onReady} />
   </Suspense>
   <Interactions active={active} />
   <Pipeline quality={quality} effects={flag("fx", 1) > 0} />
  </Canvas>
 );
}
