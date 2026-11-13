import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { fxaa } from "three/addons/tsl/display/FXAANode.js";
import { pass, renderOutput } from "three/tsl";
import { RenderPipeline, WebGPURenderer } from "three/webgpu";
import { Woody } from "../characters/Woody";
import { progress, stage } from "../ui/loaderControl";
import { SCENES, world } from "../worlds";
import { Interactions } from "./Interactions";
import { Lights } from "./Lights";
import { Player } from "./Player";
import { Props } from "./Props";
import { Ship } from "./Ship";
import { Sky } from "./Sky";
import { current } from "./theme";
import { WarmLights } from "./WarmLights";
import { WorldUi } from "./ui3d/WorldUi";
import { Bursts } from "./effects/Bursts";
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
  if (import.meta.env.DEV) Object.assign(window.__world, { renderer, backend: renderer.backend.isWebGPUBackend ? "webgpu" : "webgl2" }); // para las pruebas automáticas
  stage("gpu");
  onReady();
 });
 return renderer;
}

// El pase que dibuja la escena dentro del posproceso (lo publica Pipeline).
// `depth` es a qué profundidad de llamadas anidadas dibuja el renderer la
// escena: el posproceso dibuja su rectángulo final y, dentro de esa llamada,
// los pases intermedios y por fin la escena (1 o 2 según haya suavizado de
// bordes; las sombras, una más). Se anota al dibujar, no se supone.
// `uncull` es una tanda de objetos que el siguiente fotograma dibuja sin
// descartar por encuadre (ver `drawOnce`).
const live = { scenePass: null, depth: null, uncull: null };
const WARM_GROUP = 3; // objetos que se compilan de una vez
// ms por fotograma dedicados a compilar el planeta. Ocurre detrás de la pantalla
// de carga, cuyas animaciones no dependen de este hilo: se puede apretar.
const WARM_BUDGET = 22;
const isDrawn = (object) => object.isMesh || object.isLine || object.isPoints || object.isSprite;

// Compila por adelantado lo que hay en la escena (o solo la tanda `slice`), tal
// y como se va a dibujar de verdad. Para que sirva hacen falta cuatro cosas:
//  · el mismo destino: el búfer del posproceso, no el lienzo (el formato de
//    color forma parte de cada pipeline);
//  · el mismo contexto de dibujado: `compileAsync` usa siempre el de
//    profundidad 0 y la escena se dibuja en uno más hondo. Son objetos de
//    dibujado distintos y, en las mallas instanciadas, sombreadores distintos,
//    así que lo compilado no se aprovecharía. three r183 no ofrece otra forma
//    de pedirlo: se le indica la profundidad mientras dura la llamada;
//  · todo lo que la cámara no ve ahora (el renderer descarta con el encuadre
//    del último fotograma, el de la bienvenida) y lo que está oculto de
//    momento: césped, polvo, llama y humo de la nave, destellos;
//  · las luces definitivas (las del islote no salen nunca de la escena; ver
//    IsletLights en Welcome.jsx).
// La lista de lo que hay que compilar se arma en el acto, así que el estado
// forzado se deshace antes de volver: ningún fotograma real lo llega a ver. Lo
// que se espera después es solo a la GPU.
function compileNow(gl, scene, camera, slice = null) {
 const forced = [];
 scene.traverse((object) => {
  forced.push([object, object.visible, object.frustumCulled, object.layers.mask]);
  object.visible = true;
  object.frustumCulled = false;
  // Lo que no toca en esta tanda se salta sin ocultar a sus hijos.
  if (slice && isDrawn(object) && !slice.has(object)) object.layers.mask = 0;
 });
 const pass = live.scenePass;
 const target = gl.getRenderTarget();
 const mrt = gl.getMRT();
 const contexts = gl._renderContexts;
 const depth = gl._callDepth;
 const aligned = Boolean(pass && contexts && typeof depth === "number" && live.depth !== null);
 if (pass) {
  gl.setRenderTarget(pass.renderTarget);
  gl.setMRT(pass.getMRT());
 }
 if (aligned) {
  contexts.get = (renderTarget, renderMrt, callDepth) => Object.getPrototypeOf(contexts).get.call(contexts, renderTarget, renderMrt, callDepth ?? live.depth);
  gl._callDepth = live.depth;
 }
 let done;
 try {
  done = gl.compileAsync(scene, camera);
 } finally {
  if (aligned) {
   delete contexts.get;
   gl._callDepth = depth;
  }
  gl.setRenderTarget(target);
  gl.setMRT(mrt);
  for (const [object, visible, frustumCulled, mask] of forced) {
   object.visible = visible;
   object.frustumCulled = frustumCulled;
   object.layers.mask = mask;
  }
 }
 return done;
}

// Dibuja de verdad, una vez, los objetos dados aunque queden fuera de cuadro.
// Es lo que compila sus sombras: el mapa de sombras solo se redibuja en un
// fotograma real, y en la bienvenida no cae nada del planeta dentro de él, así
// que sin esto se compilarían todas a la vez en el instante de entrar. Fuera
// de cuadro no se ve nada distinto. Lo ejecuta Pipeline al dibujar.
const drawOnce = (objects) => new Promise((resolve) => (live.uncull = { objects, resolve }));

// Precalentamiento completo. Con `spread` se reparte entre fotogramas para no
// congelar la bienvenida mientras se prepara el planeta: se compila de pocos
// en pocos objetos y, agotado el presupuesto del fotograma, se cede el turno.
async function warmUp(gl, scene, camera, spread = false, onProgress) {
 if (!spread) return compileNow(gl, scene, camera);
 const drawn = [];
 scene.traverse((object) => isDrawn(object) && drawn.push(object));
 let next = 0;
 while (next < drawn.length) {
  const started = performance.now();
  const first = next;
  const pending = [];
  while (next < drawn.length && performance.now() - started < WARM_BUDGET) {
   pending.push(compileNow(gl, scene, camera, new Set(drawn.slice(next, next + WARM_GROUP))));
   next += WARM_GROUP;
  }
  await Promise.all(pending);
  await drawOnce(drawn.slice(first, next).filter((object) => object.castShadow));
  onProgress?.(Math.min(1, next / drawn.length));
 }
 // Una pasada final con todo: lo que ya está compilado no cuesta, y recoge lo
 // que se haya montado mientras tanto.
 return compileNow(gl, scene, camera);
}

// Espera a que lo que hay montado en la escena esté compilado y dibujado unas
// cuantas veces, y entonces avisa. Se usa dos veces: primero para la
// bienvenida (y ahí se retira la pantalla de carga) y luego para el planeta
// (y ahí se puede entrar). Así nada aparece a medio hacer.
function Ready({ spread, onCompiling, onProgress, onReady }) {
 const frames = useRef(0);
 const compiled = useRef(false);
 const { gl, scene, camera } = useThree();
 useFrame(() => {
  if (frames.current === 1 && !compiled.current) {
   compiled.current = "pending";
   onCompiling?.();
   warmUp(gl, scene, camera, spread, onProgress)
    .catch((error) => console.error("No se pudo precompilar la escena", error)) // se entra igualmente
    .then(() => (compiled.current = true));
  }
  if (frames.current > 5) return;
  if (frames.current < 2 || compiled.current === true) frames.current += 1;
  if (frames.current > 5) onReady?.();
 });
 return null;
}

// Posproceso con nodos: la escena se dibuja a un búfer de 16 bits por canal,
// se le suma el resplandor de lo que emite luz, y al final
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
   output = color.add(glow);
  }
  result.outputColorTransform = false;
  output = renderOutput(output);
  result.outputNode = quality.smoothEdges && flag("aa", 1) > 0 ? fxaa(output) : output;
  return { render: () => result.render(), dispose: () => result.dispose(), glow, scenePass };
 }, [gl, scene, camera, quality, effects]);
 useEffect(() => {
  live.scenePass = pipeline.scenePass;
  live.depth = null;
  if (import.meta.env.DEV) window.__world.scene = scene; // para las pruebas automáticas
  // Anota a qué profundidad se dibuja la escena (ver `live`).
  scene.onBeforeRender = (renderer, _scene, _camera, target) => {
   if (target === pipeline.scenePass.renderTarget && typeof renderer._callDepth === "number") live.depth = renderer._callDepth;
  };
  return () => {
   live.scenePass = null;
   scene.onBeforeRender = () => {};
   pipeline.dispose();
  };
 }, [pipeline, scene]);

 useFrame(() => {
  scene.fog.density = current.fogDensity;
  if (pipeline.glow) pipeline.glow.strength.value = current.bloom;
  const once = live.uncull;
  if (!once) return pipeline.render();
  live.uncull = null;
  const culled = once.objects.filter((object) => object.frustumCulled);
  culled.forEach((object) => (object.frustumCulled = false));
  pipeline.render();
  culled.forEach((object) => (object.frustumCulled = true));
  once.resolve();
 }, 1);
 return null;
}

export function Experience({ active, lowPower, onReady }) {
 const preset = lowPower ? QUALITY.low : QUALITY.high;
 const quality = useMemo(() => ({ ...preset, pixelRatio: flag("dpr", preset.pixelRatio) }), [preset]);
 const [pixelRatio, setPixelRatio] = useState(quality.pixelRatio);
 // El bucle de dibujado no arranca hasta que la GPU está lista.
 const [gpuReady, setGpuReady] = useState(false);
 // Niveles de carga: 0 = solo la bienvenida; 1 = también el planeta.
 const [tier, setTier] = useState(0);
 const [built, setBuilt] = useState(false);
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

   {/* Primer nivel: la bienvenida, que es lo que se verá al retirarse la pantalla de carga. */}
   <Suspense fallback={null}>
    <Welcome onMounted={() => stage("models")} />
    <Ready
     onCompiling={() => stage("scene")}
     onReady={() => {
      stage("shaders");
      // El planeta se monta ya, detrás de la pantalla de carga, que no se
      // retira hasta que esté listo para entrar.
      setTier(1);
     }}
    />
   </Suspense>

   {/* Segundo nivel: el planeta, que se monta y se compila por partes con la
       pantalla de carga todavía puesta. Lo propio de cada mundo se descarga aparte; lo común
       (personajes, nave, objetos) es igual en todos. La clave reinicia todo al
       cambiar de mundo. */}
   {tier > 0 && (
    <Suspense fallback={null}>
     <group key={world.id}>
      <Scene
       quality={lowPower ? "low" : "high"}
       onBuilt={() => {
        stage("built");
        setBuilt(true);
       }}
      />
      <Props />
      <Ship />
      <Player active={active} />
      <Woody active={active} />
      <Bursts />
      <WorldUi />
     </group>
     {built && (
      <Ready
       spread
       onProgress={progress}
       onReady={() => {
        // Primero se habilita la entrada y después se retira la pantalla: nunca al revés.
        onReady();
        stage("world");
       }}
      />
     )}
    </Suspense>
   )}
   <Interactions active={active} />
   <Pipeline quality={quality} effects={flag("fx", 1) > 0} />
  </Canvas>
 );
}
