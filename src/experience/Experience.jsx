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
import { Staged } from "../worlds/Staged";
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
import { seeThroughOrder } from "./environment/seeThrough";
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

// Los pipelines se crean SIEMPRE en asíncrono y nada se dibuja hasta que el
// suyo existe en la GPU.
//  · Crear un pipeline «en el acto» (lo que hace three r183 al dibujar algo por
//    primera vez) compila sus sombreadores dentro del proceso de GPU del
//    navegador y lo deja parado mientras dura: en Direct3D, decenas o cientos
//    de ms cada vez. Ese proceso es también el que presenta la página, así que
//    se congelaba hasta la animación CSS de la pantalla de carga. En asíncrono
//    la compilación va a otros hilos y la pantalla sigue viva.
//  · Mientras un pipeline está pendiente, three ya lo tiene apuntado en su
//    caché, pero sin objeto de GPU: dibujar con él lanzaba una excepción a
//    mitad del fotograma y dejaba al renderer con su estado interno a medias
//    (no volvía a pintar nada; pasaba en Windows con la estela de la estrella
//    fugaz). El objeto se salta mientras tanto y entra solo en el primer
//    fotograma en que su pipeline existe. No se espera ningún tiempo.
//    (three hace lo mismo con los pipelines que fallan: `pipelineData.error`.)
// `pipelinesSettled()` avisa cuando no queda ninguno por llegar: es lo que
// espera el precalentamiento antes de dar la escena por lista.
const pipelines = { pending: 0, waiting: [] };
const pipelinesSettled = () => (pipelines.pending === 0 ? Promise.resolve() : new Promise((resolve) => pipelines.waiting.push(resolve)));
function asyncPipelines(renderer) {
 const backend = renderer.backend;
 // Lo compilado no se tira. three descarta un pipeline (y su programa) cuando
 // se queda sin usuarios, aunque sea un instante; al recrearse el objeto de
 // dibujado de su único usuario (pasa al entrar con las sombras de farolas,
 // setas y cohete) lo volvía a compilar en caliente. Son pocos cientos y no
 // pesan: se conservan.
 renderer._pipelines._releasePipeline = () => {};
 renderer._pipelines._releaseProgram = () => {};
 if (!backend.isWebGPUBackend) return; // WebGL2 enlaza sus programas al usarlos
 const create = backend.createRenderPipeline;
 backend.createRenderPipeline = function (renderObject, promises) {
  const list = promises ?? [];
  const from = list.length;
  create.call(this, renderObject, list);
  for (const promise of list.slice(from)) {
   pipelines.pending += 1;
   promise.finally(() => {
    pipelines.pending -= 1;
    if (pipelines.pending === 0) pipelines.waiting.splice(0).forEach((resolve) => resolve());
   });
  }
 };
 // Lo mismo con los pipelines con que three genera los mipmaps (uno por
 // formato de textura), que crea en síncrono: se piden en asíncrono y los
 // mipmaps de esa textura se generan cuando llega.
 const device = backend.device;
 const passes = backend.textureUtils._getPassUtils();
 const asked = new Map();
 const transfer = (format, dimension = "2d-array") => {
  const key = `${format}-${dimension}`;
  if (passes.transferPipelines[key]) return null;
  if (!asked.has(key)) {
   // Se le deja a three escribir el descriptor y se intercepta la creación.
   let descriptor;
   device.createRenderPipeline = (given) => ((descriptor = given), null);
   try {
    passes.getTransferPipeline(format, dimension);
   } finally {
    delete device.createRenderPipeline;
    delete passes.transferPipelines[key];
   }
   asked.set(key, device.createRenderPipelineAsync(descriptor).then((pipeline) => (passes.transferPipelines[key] = pipeline)));
  }
  return asked.get(key);
 };
 const mipmaps = passes.generateMipmaps;
 passes.generateMipmaps = function (textureGPU, encoder = null) {
  const pending = transfer(textureGPU.format, textureGPU.textureBindingViewDimension || "2d-array");
  if (!pending) return mipmaps.call(this, textureGPU, encoder);
  pending.then(() => mipmaps.call(this, textureGPU, null)).catch(() => {}); // (la textura pudo destruirse entretanto)
 };
 if (import.meta.env.DEV) {
  // Para las pruebas: cualquier pipeline creado en síncrono queda anotado.
  const createSync = device.createRenderPipeline;
  window.__world.syncPipelines = [];
  Object.getPrototypeOf(device).createRenderPipeline = function (descriptor) {
   if (this === device) window.__world.syncPipelines.push(descriptor.label ?? "?");
   return createSync.call(this, descriptor);
  };
 }
 const draw = backend.draw;
 backend.draw = function (renderObject, info) {
  if (this.get(renderObject.pipeline).pipeline === undefined) {
   if (import.meta.env.DEV) ((window.__world.skipped ??= []).length < 4000) && window.__world.skipped.push({ frame: renderer.info.frame, object: renderObject.object, material: renderObject.material, target: renderObject.context?.textures?.[0]?.name ?? "", key: renderObject.pipeline.cacheKey, context: renderObject.context?.id }); // para las pruebas automáticas
   return;
  }
  return draw.call(this, renderObject, info);
 };
}

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
 // Detrás de la pantalla de carga el lienzo no se compone: así el navegador no
 // tiene que esperar a la GPU del juego para presentar cada fotograma de la carga.
 canvas.style.visibility = "hidden";
 live.canvas = canvas;
 // El dispositivo ya se pidió desde index.html (ver allí por qué).
 const device = debug?.get("backend") === "webgl" ? null : window.__gpuDevice;
 Promise.resolve(device)
  .then((found) => {
   if (found && renderer.backend.isWebGPUBackend) renderer.backend.parameters.device = found;
   return renderer.init();
  })
  .then(() => {
   asyncPipelines(renderer);
   renderer.setOpaqueSort(seeThroughOrder);
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
// `draw` dibuja solo los objetos dados; `queue` son los que esperan a que un
// fotograma real los dibuje una vez (ver `drawOnce`) y `drained` avisa al vaciarse.
// `loading`: la pantalla de carga tapa el lienzo. Mientras dura, la escena no
// se dibuja: todo lo dibujable se guarda en `held` con su máscara de capas
// puesta a cero y solo se destapa, de pocos en pocos objetos, para compilarlo.
// Dibujarla entera la primera vez construía todos los sombreadores en un solo
// fotograma (0,8 s de hilo principal bloqueado y un lote enorme para la GPU).
const live = { scenePass: null, depth: null, draw: null, queue: [], drained: null, loading: true, held: new Map(), warmed: new WeakSet(), canvas: null, receiver: null };
// ms seguidos dedicados a compilar antes de ceder el turno: ningún tramo del
// hilo principal debe pasar de 50 ms.
const WARM_BUDGET = 12;
const SHADOW_GROUP = 3; // objetos con sombra que se dibujan en un fotograma para compilar la suya
const isDrawn = (object) => object.isMesh || object.isLine || object.isPoints || object.isSprite;

// ¿Recibe sombra? (malla con material iluminado y `receiveShadow`).
const receives = (object) => object.isMesh && object.receiveShadow && [].concat(object.material).some((material) => /Lambert|Standard|Physical|Phong|Toon/.test(material.type));
// Un receptor de sombra cualquiera de la escena (se recuerda mientras siga montado).
function shadowReceiver(scene) {
 if (live.receiver?.parent) return live.receiver;
 live.receiver = null;
 scene.traverse((object) => {
  if (!live.receiver && receives(object)) live.receiver = object;
 });
 return live.receiver;
}

// Tapa lo dibujable que aún no lo esté (lo que se haya montado desde la última vez).
function hold(scene) {
 scene.traverse((object) => {
  if (!isDrawn(object) || live.held.has(object)) return;
  live.held.set(object, object.layers.mask);
  object.layers.mask = 0;
 });
}

// Fin de la carga: todo recupera su capa y la escena se dibuja con normalidad.
function release() {
 for (const [object, mask] of live.held) object.layers.mask = mask;
 live.held.clear();
 live.loading = false;
 if (live.canvas) live.canvas.style.visibility = "";
}

// Ejecuta `work` con los objetos dados a la vista: con su capa, sin descartar
// por encuadre y con sus antepasados visibles (césped, polvo, llama y humo de la
// nave, destellos… están ocultos de momento, y la cámara de la bienvenida no ve
// el planeta). Se deshace antes de volver: ningún fotograma real lo llega a ver.
function exposed(objects, work) {
 const undo = [];
 for (const object of objects) {
  undo.push([object, object.visible, object.frustumCulled, object.layers.mask]);
  object.visible = true;
  object.frustumCulled = false;
  if (live.held.has(object)) object.layers.mask = live.held.get(object);
  for (let parent = object.parent; parent; parent = parent.parent) {
   if (parent.visible) continue;
   undo.push([parent, false, parent.frustumCulled, parent.layers.mask]);
   parent.visible = true;
  }
 }
 try {
  return work();
 } finally {
  for (let i = undo.length - 1; i >= 0; i--) {
   const [object, visible, frustumCulled, mask] = undo[i];
   object.visible = visible;
   object.frustumCulled = frustumCulled;
   object.layers.mask = mask;
  }
 }
}

// Compila por adelantado lo que la escena tenga a la vista, tal y como se va a
// dibujar de verdad. Para que sirva hacen falta:
//  · el mismo destino: el búfer del posproceso, no el lienzo (el formato de
//    color forma parte de cada pipeline);
//  · el mismo contexto de dibujado: `compileAsync` usa siempre el de
//    profundidad 0 y la escena se dibuja en uno más hondo. Son objetos de
//    dibujado distintos y, en las mallas instanciadas, sombreadores distintos,
//    así que lo compilado no se aprovecharía. three r183 no ofrece otra forma
//    de pedirlo: se le indica la profundidad mientras dura la llamada;
//  · las luces definitivas (las del islote no salen nunca de la escena; ver
//    IsletLights en Welcome.jsx).
// La parte que ocupa el hilo principal (construir los sombreadores) termina al
// volver; lo que queda pendiente es solo de la GPU (ver `pipelinesSettled`).
function compileNow(gl, scene, camera) {
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
 try {
  gl.compileAsync(scene, camera);
 } finally {
  if (aligned) {
   delete contexts.get;
   gl._callDepth = depth;
  }
  gl.setRenderTarget(target);
  gl.setMRT(mrt);
 }
}

// Pide dibujar de verdad, una vez, los objetos dados (y solo esos) aunque
// queden fuera de cuadro. Es lo que compila sus sombras: el mapa de sombras
// solo se redibuja al dibujar la escena, y solo una vez por fotograma. Por eso
// no se hace en el acto: se apuntan en `live.queue` y Pipeline dibuja unos pocos
// en cada fotograma real, mientras la compilación sigue por su lado.
const drawOnce = (objects) => live.queue.push(...objects);
// Se cumple cuando la cola se ha dibujado entera.
const queueDrained = () => (live.queue.length === 0 ? Promise.resolve() : new Promise((resolve) => (live.drained = resolve)));

// Cede el turno al navegador sin esperar al siguiente fotograma.
const breathe = () =>
 new Promise((resolve) => {
  const channel = new MessageChannel();
  channel.port1.onmessage = () => resolve();
  channel.port2.postMessage(0);
 });

// Precalentamiento, detrás de la pantalla de carga: compila lo que haya montado
// en la escena de objeto en objeto y, agotado el presupuesto del tramo, cede el
// turno. No espera a la GPU entre tramos (los pipelines se crean en asíncrono,
// en otros hilos): la espera una sola vez, al final. Las sombras de cada tanda
// se compilan dibujándola una vez. Lo que se monte mientras tanto entra en la
// vuelta siguiente.
async function warmUp(gl, scene, camera, onProgress) {
 const seen = live.warmed;
 const spent = { objetos: 0, compilar: 0, sombras: 0, tandas: 0, gpu: 0 }; // ms; para medir (desarrollo)
 for (;;) {
  hold(scene);
  const drawn = [...live.held.keys()].filter((object) => !seen.has(object) && object.parent);
  if (!drawn.length) break;
  spent.objetos += drawn.length;
  let next = 0;
  let casters = [];
  while (next < drawn.length) {
   const started = performance.now();
   while (next < drawn.length && performance.now() - started < WARM_BUDGET) {
    const object = drawn[next++];
    seen.add(object);
    exposed([object], () => compileNow(gl, scene, camera));
    if (object.castShadow) casters.push(object);
   }
   spent.compilar += performance.now() - started;
   onProgress?.((next / drawn.length) * 0.95);
   if (casters.length) {
    drawOnce(casters);
    spent.tandas += 1;
    casters = [];
   }
   await breathe();
  }
 }
 let from = performance.now();
 await queueDrained();
 spent.sombras = performance.now() - from;
 from = performance.now();
 await pipelinesSettled();
 spent.gpu = performance.now() - from;
 if (import.meta.env.DEV) (window.__world.warm ??= []).push(Object.fromEntries(Object.entries(spent).map(([key, value]) => [key, Math.round(value)])));
 onProgress?.(1);
}

// Espera a que lo que hay montado en la escena esté compilado, y entonces
// avisa. Se usa dos veces: primero para la bienvenida y luego (`last`) para el
// planeta; ahí la escena vuelve a dibujarse, se deja correr unos fotogramas y se
// retira la pantalla de carga. Así nada aparece a medio hacer.
function Ready({ last, onCompiling, onProgress, onReady }) {
 const frames = useRef(0);
 const compiled = useRef(false);
 const { gl, scene, camera } = useThree();
 useFrame(() => {
  if (frames.current === 1 && !compiled.current) {
   compiled.current = "pending";
   onCompiling?.();
   warmUp(gl, scene, camera, onProgress)
    .catch((error) => console.error("No se pudo precompilar la escena", error)) // se entra igualmente
    .then(() => {
     if (last) release();
     compiled.current = true;
    });
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
   // Umbral por encima de lo que da una superficie blanca a pleno sol: solo
   // brilla lo que emite luz (cristales, halos, llamas, estrellas).
   glow = bloom(color, 0.3, 0.75, 1.14);
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
  live.draw = (objects) => {
   hold(scene);
   // three solo rehace el mapa de sombras si en ese fotograma se dibuja algo
   // que RECIBE sombra. Una tanda de objetos que solo la proyectan (tótems,
   // cohete, farolas, setas) no lo disparaba y su sombra acababa compilándose
   // al entrar: se dibuja siempre con un receptor al lado (el suelo, por ejemplo).
   const receiver = objects.length && !objects.some(receives) ? shadowReceiver(scene) : null;
   exposed(receiver ? [...objects, receiver] : objects, () => pipeline.render());
  };
  if (import.meta.env.DEV) window.__world.scene = scene; // para las pruebas automáticas
  // Anota a qué profundidad se dibuja la escena (ver `live`).
  scene.onBeforeRender = (renderer, _scene, _camera, target) => {
   if (target === pipeline.scenePass.renderTarget && typeof renderer._callDepth === "number") live.depth = renderer._callDepth;
  };
  return () => {
   live.scenePass = null;
   live.draw = null;
   scene.onBeforeRender = () => {};
   pipeline.dispose();
  };
 }, [pipeline, scene]);

 useFrame(() => {
  scene.fog.density = current.fogDensity;
  if (pipeline.glow) pipeline.glow.strength.value = current.bloom;
  if (!live.loading) return pipeline.render();
  // Detrás de la pantalla de carga no se dibuja: solo lo que pide el
  // precalentamiento (`live.draw`) y una primera vez, vacía, para anotar la
  // profundidad a la que se dibuja la escena.
  if (live.queue.length || live.depth === null) live.draw(live.queue.splice(0, SHADOW_GROUP));
  if (!live.queue.length && live.drained) {
   live.drained();
   live.drained = null;
  }
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
   camera={{ fov: 40, near: 0.5, far: 4500, position: [0, 17, 21] }}
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
      {/* De uno en uno, cediendo el turno entre cada cual (ver Staged). */}
      <Staged
       onDone={() => {
        stage("built");
        setBuilt(true);
       }}
      >
       <Scene quality={lowPower ? "low" : "high"} />
       <Props />
       <Ship />
       <Player active={active} />
       <Woody active={active} />
       <Bursts />
       <WorldUi />
      </Staged>
     </group>
     {built && (
      <Ready
       last
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
