import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import GUI from "lil-gui";
import { attachHeroGUI, setGui, clearGui } from "./hero/gui";
import { buildExterior } from "./hero/exterior";
import { easeIn3, easeOut3, easeIO3, clamp01, lerpV, phase } from "./hero/math";
import { buildNeon, buildDogHologram, buildOrrery } from "./hero/interactives";
import { buildRoom } from "./hero/room";
import { buildDesk } from "./hero/desk";
import { buildProps } from "./hero/props";
import { loadingManager } from "./loadingManager";

export function initHeroScene(wrapperEl) {
 const canvas = document.querySelector("#webgl");

 if (!canvas) return;

 // ═══════════════════════════════════════════════════════════════════════
 // SCROLL PROGRESS — único punto de verdad
 // ═══════════════════════════════════════════════════════════════════════
 // Calcula el progreso real [0..1] del wrapper sticky del Hero, igual que
 // hace Hero.jsx para el hint. Esto es CRÍTICO para mobile: nunca se usa
 // window.innerHeight como divisor (es engañoso en móviles donde la barra
 // de URL aparece y desaparece y vh CSS != innerHeight JS).
 //
 // Si por algún motivo no se pasa el wrapper, fallback a document.body
 // (la animación seguirá pero no estará optimizada para esta sección).
 const scrollWrapper = wrapperEl || document.body;

 // Caché de scroll progress — actualizada SOLO en scroll/resize.
 // Evita un getBoundingClientRect() cada frame (forced reflow @ 60fps).
 let cachedScrollProgress = 0;

 const computeScrollProgress = () => {
  const rect = scrollWrapper.getBoundingClientRect();
  const range = rect.height - window.innerHeight;
  if (range <= 0) return 0;
  const scrolled = Math.max(0, -rect.top);
  return Math.max(0, Math.min(1, scrolled / range));
 };

 const getScrollProgress = () => cachedScrollProgress;

 // ═══════════════════════════════════════════════════════════════════════
 // CUSTOM CURSOR — solo en dispositivos con puntero fino (desktop)
 // ═══════════════════════════════════════════════════════════════════════
 // Touch devices no tienen ratón → crear el cursor custom es un artefacto
 // visible (aro cian centrado) y un coste DOM gratis.
 //
 // La detección original solo usaba `(hover: none) and (pointer: coarse)`,
 // pero algunos móviles (Samsung con S-Pen, Chrome Android con flags,
 // navegadores que reportan capacidades mixtas) NO devuelven `true` ahí,
 // y entonces el cursor custom aparece fijo en el centro de la pantalla
 // del móvil (porque nunca recibe mousemove) → exactamente el bug del
 // aro naranja que se veía en los pantallazos.
 //
 // Defensa en profundidad — 3 señales que indican "esto es móvil":
 //   1) media query touch (la original)
 //   2) ancho del viewport < 768 px (mismo umbral que el resto del código)
 //   3) presencia de la API ontouchstart (touchscreens en general)
 //
 // Con que UNA dispare, no se inyecta el cursor custom.

 const isTouchDevice =
  window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
  window.innerWidth < 768 ||
  "ontouchstart" in window;

 // Refs hoisted al scope superior — las usa el cleanup al final del archivo.
 // Quedan undefined en touch, pero el cleanup también está guardado.
 let cursorRing = null;
 let cursorDot = null;
 let cursorStyleEl = null;
 let cursorRafId = 0;
 let onCursorMove = null;
 let onCursorOver = null;
 let onCursorLeave = null;
 let onCursorEnter = null;

 if (!isTouchDevice) {
  const CUR_COLOR = "#ff7a3d";
  const CUR_COLOR_RGB = "255, 122, 61"; // mismo color, formato rgb()

  cursorRing = document.createElement("div");
  Object.assign(cursorRing.style, {
   position: "fixed",
   top: "0",
   left: "0",
   width: "26px",
   height: "26px",
   borderRadius: "50%",
   border: `1.4px solid ${CUR_COLOR}`,
   background: `rgba(${CUR_COLOR_RGB}, 0)`,
   pointerEvents: "none",
   zIndex: "99998",
   transform: "translate3d(-50%, -50%, 0)",
   transition:
    "width 0.22s ease, height 0.22s ease, background 0.22s ease, border-color 0.22s ease, opacity 0.25s ease",
   willChange: "transform",
  });

  cursorDot = document.createElement("div");
  Object.assign(cursorDot.style, {
   position: "fixed",
   top: "0",
   left: "0",
   width: "4px",
   height: "4px",
   borderRadius: "50%",
   background: CUR_COLOR,
   pointerEvents: "none",
   zIndex: "99999",
   transform: "translate3d(-50%, -50%, 0)",
   transition: "opacity 0.25s ease, width 0.15s ease, height 0.15s ease",
   willChange: "transform",
  });

  document.body.appendChild(cursorRing);
  document.body.appendChild(cursorDot);

  // ── Ocultar cursor nativo: CSS global + inline en html/body ──────────
  const HIDDEN_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'><rect width='1' height='1' fill='none'/></svg>") 0 0, none`;

  cursorStyleEl = document.createElement("style");
  cursorStyleEl.setAttribute("data-hero-cursor", "true");
  cursorStyleEl.textContent = `
   html, body, #root, main, canvas, a, button, input, textarea, select,
   label, [role="button"], [data-clickable], * {
    cursor: ${HIDDEN_CURSOR} !important;
   }
  `;
  document.head.appendChild(cursorStyleEl);
  document.documentElement.style.setProperty("cursor", HIDDEN_CURSOR, "important");
  document.body.style.setProperty("cursor", HIDDEN_CURSOR, "important");
  if (canvas) canvas.style.setProperty("cursor", HIDDEN_CURSOR, "important");

  // ── Estado interno del cursor ────────────────────────────────────────
  let cursorMouseX = window.innerWidth / 2;
  let cursorMouseY = window.innerHeight / 2;
  let cursorRingX = cursorMouseX;
  let cursorRingY = cursorMouseY;
  let cursorHover = false;
  let cursorIdle = false;

  // ── Tick: declarado como function (hoisted) → sin TDZ ────────────────
  //
  // ARQUITECTURA HYPER-FLUIDA
  // ─────────────────────────────────────────────────────────────────
  // El cursor está dividido en dos elementos con estrategias distintas:
  //
  //   • PUNTO (cursorDot): se pinta DIRECTAMENTE desde el handler de
  //     mousemove, sin pasar por rAF y sin lerp. Esto significa que va
  //     clavado al cursor real con cero latencia, INDEPENDIENTEMENTE de
  //     lo que esté haciendo Three.js. Aunque la escena pierda frames
  //     (drop a 30 fps durante el cruce de la ventana, por ejemplo),
  //     el punto sigue al 100 % del refresh rate del puntero del SO.
  //     Es el truco para que el cursor SE SIENTA hyper-fluido aunque
  //     la GPU esté agobiada.
  //
  //   • ARO (cursorRing): SÍ usa rAF + lerp. Su estela ligera es
  //     deliberada y cinemática. Como el aro tiene su propia "inercia"
  //     visual, los pequeños tirones del rAF se camuflan dentro de la
  //     estela y son imperceptibles.
  //
  // Rates calibrados:
  //   - Aro:   40 → ~80% en 50 ms (estela muy sutil, sin lag perceptible)
  //
  // Por qué el dot no usa rAF: con el rAF antiguo, si Three.js tardaba
  // 33 ms en un frame, el dot también tardaba 33 ms en moverse. A
  // velocidades de ratón normales (1-2 px/ms) eso son 30-60 px de
  // retraso visible. Pintando desde mousemove eso se reduce a 0.
  const CUR_RING_RATE = 40;
  let cursorLastT = performance.now();
  function cursorTick(now) {
   if (typeof now !== "number") now = performance.now();
   // dt clampeado: si el RAF se duerme >100 ms (tab oculta, debug pause)
   // no queremos un salto brusco al volver. Lo limitamos a 50 ms.
   const dt = Math.min(0.05, Math.max(0.001, (now - cursorLastT) / 1000));
   cursorLastT = now;

   const ringK = 1 - Math.exp(-CUR_RING_RATE * dt);

   // Aro — con estela cinemática (no es lag, es deliberado)
   cursorRingX += (cursorMouseX - cursorRingX) * ringK;
   cursorRingY += (cursorMouseY - cursorRingY) * ringK;
   cursorRing.style.transform = `translate3d(${cursorRingX}px, ${cursorRingY}px, 0) translate(-50%, -50%)`;

   // Bail si el aro está dentro de medio píxel del target — no hay
   // movimiento real que renderizar. El RAF se reactiva en onCursorMove.
   const dx = Math.abs(cursorMouseX - cursorRingX) + Math.abs(cursorMouseY - cursorRingY);
   if (dx < 0.5) {
    cursorIdle = true;
    cursorRafId = 0;
    return;
   }

   cursorRafId = requestAnimationFrame(cursorTick);
  }

  onCursorMove = (e) => {
   cursorMouseX = e.clientX;
   cursorMouseY = e.clientY;

   // ── PUNTO: actualización directa, sin rAF ──────────────────────────
   // Esto es lo que hace al cursor "hyper-fluido": no esperamos al
   // siguiente frame de Three.js. El punto se pinta YA mismo, en el
   // mismo callstack del evento del puntero. La compositing del
   // navegador lo aplica al siguiente vsync, sin pasar por nuestro rAF.
   cursorDot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;

   // NOTA: antes había aquí un `e.target.style.setProperty("cursor", ...,
   // "important")`. Era REDUNDANTE — el CSS global de cursorStyleEl ya
   // incluye un selector universal `* { cursor: ... !important }` que
   // cubre todo el DOM. Pero, sobre todo, era el causante de que el
   // cursor fuese fluido al cargar y a pedales después de mover el
   // ratón un rato: en cada mousemove (60-120 Hz) inyectaba un atributo
   // `style="cursor: url(data:image/svg+xml;...) 0 0, none !important"`
   // en el elemento bajo el ratón. Como ese data URL es largo y el
   // atributo inline se quedaba fijado para siempre, el DOM se iba
   // inflando con cientos de estilos inline tras unos segundos de uso
   // → cada style recalc por frame se volvía más caro → cursor a pedales.

   // ── ARO: despertar el RAF si está parado ───────────────────────────
   if (cursorIdle) {
    cursorIdle = false;
    // Reset del timestamp: si el RAF ha estado dormido segundos enteros,
    // un dt enorme aplicado al exp() haría un salto teleport (ringK ≈ 1).
    // Lo reseteamos al "ahora" para que la primera frame sea pequeña.
    cursorLastT = performance.now();
    cursorRafId = requestAnimationFrame(cursorTick);
   }
  };

  onCursorOver = (e) => {
   const t = e.target;
   const isInteractive = t.closest("a, button, [data-clickable], canvas") !== null;
   if (isInteractive !== cursorHover) {
    cursorHover = isInteractive;
    // DESPUÉS
    if (cursorHover) {
     cursorRing.style.width = "40px";
     cursorRing.style.height = "40px";
     cursorRing.style.background = `rgba(${CUR_COLOR_RGB}, 0.14)`;
     cursorRing.style.borderColor = `rgba(${CUR_COLOR_RGB}, 0.95)`;
     cursorDot.style.width = "3px";
     cursorDot.style.height = "3px";
    } else {
     cursorRing.style.width = "26px";
     cursorRing.style.height = "26px";
     cursorRing.style.background = `rgba(${CUR_COLOR_RGB}, 0)`;
     cursorRing.style.borderColor = CUR_COLOR;
     cursorDot.style.width = "4px";
     cursorDot.style.height = "4px";
    }
   }
  };

  onCursorLeave = () => {
   cursorRing.style.opacity = "0";
   cursorDot.style.opacity = "0";
  };
  onCursorEnter = () => {
   cursorRing.style.opacity = "1";
   cursorDot.style.opacity = "1";
  };

  window.addEventListener("mousemove", onCursorMove, { passive: true });
  window.addEventListener("mouseover", onCursorOver, { passive: true });
  document.addEventListener("mouseleave", onCursorLeave);
  document.addEventListener("mouseenter", onCursorEnter);

  // Arranque — se auto-pausa al estabilizarse
  cursorTick();
 }

 /**
  * =========================================================
  * VARIABLES
  * =========================================================
  */
 let scrollTicking = false;
 let resizeTimeout = null;

 /**
  * =========================================================
  * DEBUG / GUI
  * =========================================================
  * Reglas:
  *   - Móvil: GUI siempre OFF. Sin teclado/ratón fino no es usable
  *     y además crashearía al intentar leer params de stubs (los
  *     interactivos no se construyen en móvil — ver más abajo).
  *   - Desktop: GUI OFF por defecto (producción limpia). Para
  *     activarlo durante desarrollo, añade ?gui=1 a la URL.
  *     Antes la lógica era inversa (default ON, ?gui=0 para ocultar)
  *     pero eso dejaba el panel "Controls" visible en producción.
  *
  * `isMobileForDebug` es una copia local de la detección porque
  * `isMobile` (el oficial del bloque DEVICE/QUALITY) se define más
  * abajo. Esto no es duplicación: es que el orden de declaración
  * matters — GUI necesita saber si es móvil ANTES de instanciarse.
  */
 const isMobileForDebug = window.innerWidth < 768;
 const DEBUG = !isMobileForDebug && /[?&]gui=1\b/.test(typeof window !== "undefined" ? window.location.search : "");
 const gui = DEBUG ? new GUI() : null;
 if (gui) gui.close();
 // Publicar la instancia para que otras escenas (Projects, etc.)
 // puedan engancharle sus propios folders sin acoplarse a heroScene.
 if (gui) setGui(gui);

 /**
  * =========================================================
  * DEVICE / QUALITY
  * =========================================================
  */
 const isMobile = window.innerWidth < 768;
 const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

 /**
  * QUALITY BUDGET — calibrado tras diagnóstico de móvil
  * ─────────────────────────────────────────────────────────────────────
  * El bug del "WebGL CONTEXT LOST" en móviles ARM Mali (Samsung gama
  * media) venía de saturar VRAM: muchas texturas + canvas a DPR ≥ 2 +
  * tone mapping ACES + 180 estrellas con shader custom. La GPU móvil
  * tiene del orden de 256-512 MB de VRAM compartidas con el sistema;
  * al subir todo el contenido a la vez, Android nos mataba el contexto.
  *
  * Reducciones aplicadas SOLO en móvil:
  *   - pixelRatio: 0.7 → renderiza al 70 % de la resolución lógica,
  *     escala con CSS al canvas. Reduce el framebuffer en ~50 %.
  *     A simple vista en móvil pequeño no se distingue.
  *   - starsCount: 80 → tercio que antes; el espacio sigue lleno
  *     porque hay 3 capas (estática + lejana + ambient).
  *   - moonSegments: 10 → menos triángulos, esfera sigue pareciendo
  *     redonda a tamaño móvil.
  *
  * Reducciones aplicadas en setup (ver más abajo):
  *   - NoToneMapping en móvil → ahorra una pasada de fragment shader
  *   - shadowMap ya estaba desactivado, sin cambios.
  */
 const quality = {
  antialias: !isMobile,
  pixelRatio: isMobile ? Math.min(window.devicePixelRatio, 0.7) : Math.min(window.devicePixelRatio, 1.25),
  starsCount: isMobile ? 80 : isTablet ? 350 : 550,
  starsSize: isMobile ? 0.014 : 0.018,
  moonSegments: isMobile ? 10 : 20,
 };

 /**
  * =========================================================
  * SCENE
  * =========================================================
  */
 const scene = new THREE.Scene();
 scene.background = new THREE.Color("#07070d");

 // Fog para la fase de salida al exterior — empieza inactivo
 scene.fog = new THREE.FogExp2("#03030a", 0.0);

 // Colores de interpolación para la transición
 const BG_ROOM = new THREE.Color("#07070d"); // fondo normal de la habitación
 const BG_SPACE = new THREE.Color("#03030a"); // fondo del espacio / Projects

 /**
  * =========================================================
  * SIZES
  * =========================================================
  */
 const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
 };

 /**
  * =========================================================
  * RESPONSIVE CONFIG
  * =========================================================
  */
 function getResponsiveConfig() {
  const width = window.innerWidth;

  if (width < 768) {
   return {
    camera: { x: 6.2, y: 2.9, z: 11.5 },
    target: { x: 0.4, y: 1.9, z: 0.3 },
    fov: 62,
    scrollYFactor: 0.35,
    scrollZFactor: 0.18,
   };
  }

  if (width < 1024) {
   return {
    camera: { x: 5.5, y: 2.7, z: 9.8 },
    target: { x: 0.6, y: 1.95, z: 0.25 },
    fov: 48,
    scrollYFactor: 0.6,
    scrollZFactor: 0.25,
   };
  }

  return {
   camera: { x: 4.8, y: 5.17, z: 8.5 },
   target: { x: 0.8, y: 3.74, z: 0.2 },
   fov: 35,
   scrollYFactor: 0.8,
   scrollZFactor: 0.35,
  };
 }

 const responsiveState = getResponsiveConfig();

 /**
  * =========================================================
  * CAMERA
  * =========================================================
  */
 const camera = new THREE.PerspectiveCamera(responsiveState.fov, sizes.width / sizes.height, 0.1, 100);

 const cameraBase = {
  x: responsiveState.camera.x,
  y: responsiveState.camera.y,
  z: responsiveState.camera.z,
 };

 // ── Multiplicadores de luces editables por GUI ────────────────────────
 // El tick reescribe las intensidades cada frame (por roomFade).
 // En vez de pasarle el valor "absoluto" al GUI (se perdería al instante),
 // exponemos multiplicadores que el tick lee y respeta. Default 1.0 = sin
 // efecto. Si subes "ambient" a 1.5 → +50 % sobre el valor base.
 const lightMultipliers = {
  ambient: 1.0,
  moonDir: 1.0,
  windowFill: 1.0,
  moonArea: 1.0,
  rimChair: 1.0,
  rimBack: 1.0,
  ledDesk: 1.0,
  rightFill: 1.0,
 };

 const scrollConfig = {
  yFactor: responsiveState.scrollYFactor,
  zFactor: responsiveState.scrollZFactor,
 };

 camera.position.set(cameraBase.x, cameraBase.y, cameraBase.z);
 scene.add(camera);

 /**
  * =========================================================
  * RENDERER
  * =========================================================
  */
 const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: quality.antialias,
  powerPreference: "high-performance",
  alpha: false,
  stencil: false,
  depth: true,
 });

 renderer.setSize(sizes.width, sizes.height);
 renderer.setPixelRatio(quality.pixelRatio);
 renderer.outputColorSpace = THREE.SRGBColorSpace;
 renderer.shadowMap.enabled = false;
 renderer.info.autoReset = true;

 // Tone mapping
 // ─────────────────────────────────────────────────────────────────────
 // En desktop: ACESFilmic (look cinematográfico, cuesta una pasada de
 // fragment shader sobre el framebuffer completo).
 // En móvil: NoToneMapping. La GPU móvil no puede permitirse esa pasada
 // extra encima de todo el resto; era una de las causas del context
 // lost. El look queda algo más "plano" pero la escena se ve.
 renderer.toneMapping = isMobile ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure = isMobile ? 1.0 : 0.88;

 // ── Params atmosféricos globales (controlable por GUI) ───────────────────
 const atmosphereParams = {
  exposure: isMobile ? 1.0 : 0.88,
  toneMapping: isMobile ? "None" : "ACESFilmic",
  backgroundColor: "#07070d",
  vignetteOpacity: 0.88,
  fogDensityMult: 1.0,
 };

 const toneMappingMap = {
  None: THREE.NoToneMapping,
  Linear: THREE.LinearToneMapping,
  Reinhard: THREE.ReinhardToneMapping,
  ACESFilmic: THREE.ACESFilmicToneMapping,
 };

 // ═══════════════════════════════════════════════════════════════════════
 // WEBGL CONTEXT LOSS — handler de recuperación
 // ═══════════════════════════════════════════════════════════════════════
 // Diagnosticado en móvil (ARM Mali-G68): el sistema operativo puede
 // matar el contexto WebGL por presión de VRAM. Sin handler, el canvas
 // queda mudo (pantalla negra) sin error visible.
 //
 // 1) preventDefault() es OBLIGATORIO: sin él, el navegador NO disparará
 //    'webglcontextrestored' nunca y el contexto queda muerto para siempre.
 // 2) Al restaurarse, Three.js re-sube las texturas/buffers automáticamente
 //    en el siguiente render(). Solo necesitamos pedirlo (requestRender
 //    está definido más abajo; usamos un flag para evitar TDZ).
 let _ctxLost = false;
 canvas.addEventListener(
  "webglcontextlost",
  (e) => {
   e.preventDefault();
   _ctxLost = true;
   console.warn("[heroScene] WebGL context LOST — esperando restauración");
  },
  false,
 );
 canvas.addEventListener(
  "webglcontextrestored",
  () => {
   _ctxLost = false;
   console.warn("[heroScene] WebGL context RESTORED");
   // Un resize sintético dispara la lógica de resize que ya pide
   // requestRender, sin acoplarnos a su API en este punto del archivo.
   window.dispatchEvent(new Event("resize"));
  },
  false,
 );

 /**
  * =========================================================
  * SHARED GEOMETRIES
  * =========================================================
  */
 const planeGeometry14 = new THREE.PlaneGeometry(14, 14);
 const planeGeometryWall = new THREE.PlaneGeometry(14, 7);
 const unitPlaneGeometry = new THREE.PlaneGeometry(1, 1);
 const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
 const moonGeometry = new THREE.SphereGeometry(0.95, quality.moonSegments, quality.moonSegments);

 /**
  * =========================================================
  * MATERIALS
  * =========================================================
  */
 /* Pared procedural — sin archivos, sin 404.
  * En esta escena las paredes solo reciben grazing light (luna lateral
  * + spot del poster). Una textura PBR realista añadiría ruido y rompería
  * el look cinematográfico. Resolvemos con un normal map procedural sutil:
  * la luz "agarra" en imperfecciones invisibles, sin distraer.
  */
 const _wallNormalCanvas = document.createElement("canvas");
 _wallNormalCanvas.width = _wallNormalCanvas.height = 512;
 {
  const ctx = _wallNormalCanvas.getContext("2d");
  ctx.fillStyle = "rgb(128,128,255)"; // normal neutro
  ctx.fillRect(0, 0, 512, 512);
  const img = ctx.getImageData(0, 0, 512, 512);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
   const n = (Math.random() - 0.5) * 14; // amplitud baja → muy sutil
   data[i] = 128 + n; // X
   data[i + 1] = 128 + n; // Y
   // B alto → normal apunta hacia fuera
  }
  ctx.putImageData(img, 0, 0);
 }
 const wallNormalTex = new THREE.CanvasTexture(_wallNormalCanvas);
 wallNormalTex.wrapS = wallNormalTex.wrapT = THREE.RepeatWrapping;
 wallNormalTex.repeat.set(4, 3);
 wallNormalTex.needsUpdate = true;

 const wallMaterial = new THREE.MeshStandardMaterial({
  color: "#2a2c38", // tinte oscuro azulado
  normalMap: wallNormalTex,
  normalScale: new THREE.Vector2(0.18, 0.18), // imperceptible al ojo, visible a la luz
  roughness: 0.95,
  metalness: 0,
 });

 // Normal map procedural — micro-textura tipo microcemento, sin cargar archivos.
 const _floorNormalCanvas = document.createElement("canvas");
 _floorNormalCanvas.width = _floorNormalCanvas.height = 512;
 {
  const ctx = _floorNormalCanvas.getContext("2d");
  // Base neutra (0.5, 0.5, 1.0) en RGB = normal recto hacia arriba
  ctx.fillStyle = "rgb(128,128,255)";
  ctx.fillRect(0, 0, 512, 512);
  // Ruido muy sutil para romper el plano sin que se note
  const img = ctx.getImageData(0, 0, 512, 512);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
   const n = (Math.random() - 0.5) * 14;
   d[i] = Math.max(0, Math.min(255, 128 + n));
   d[i + 1] = Math.max(0, Math.min(255, 128 + n * 0.8));
   d[i + 2] = 255;
  }
  ctx.putImageData(img, 0, 0);
 }
 const floorNormalTex = new THREE.CanvasTexture(_floorNormalCanvas);
 floorNormalTex.wrapS = floorNormalTex.wrapT = THREE.RepeatWrapping;
 floorNormalTex.repeat.set(6, 6);
 floorNormalTex.needsUpdate = true;

 const floorMaterial = new THREE.MeshStandardMaterial({
  color: "#252a38", // gris azulado, NO negro puro
  roughness: 0.6, // reflexión controlada tipo microcemento pulido
  metalness: 0.1, // sutil — las luces "resbalan"
  normalMap: floorNormalTex,
  normalScale: new THREE.Vector2(0.35, 0.35),
  envMapIntensity: 0.5,
 });

 const deskMaterial = new THREE.MeshStandardMaterial({
  color: "#d7d8dd",
  roughness: 0.9,
  metalness: 0,
 });

 const legMaterial = new THREE.MeshStandardMaterial({
  color: "#111215",
  roughness: 1,
  metalness: 0,
 });

 // El marco no es un LED. Es metal que refleja el azul del exterior.
 // Metalness alta + emissive bajo → recibe luz, no la emite.
 const windowFrameMaterial = new THREE.MeshStandardMaterial({
  color: "#7a8db0",
  roughness: 0.55,
  metalness: 0.4,
  emissive: new THREE.Color("#2a3a7a"),
  emissiveIntensity: 0.28,
 });

 const windowRevealMaterial = new THREE.MeshStandardMaterial({
  color: "#bfc4d4",
  roughness: 0.9,
  metalness: 0,
 });

 const windowGlassMaterial = new THREE.MeshBasicMaterial({
  color: "#a8c2ff", // tinte frío en vez de blanco plano
  transparent: true,
  opacity: 0.07, // un pelín más presente
  depthWrite: false,
  depthTest: false,
 });

 const outerGlowMaterial = new THREE.MeshBasicMaterial({
  color: "#4a6eff",
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
 });

 // Luna con textura real — textures/moon.jpg
 const moonTextureLoader = new THREE.TextureLoader(loadingManager);
 // La luna NO es una bombilla. Es un planeta texturizado con glow sutil.
 // El claroscuro viene de su textura (moon.jpg), no de emissive.
 const moonMaterial = new THREE.MeshStandardMaterial({
  color: "#b8c6e8", // base ligeramente apagada, deja respirar la textura
  roughness: 0.95,
  metalness: 0.0,
  emissive: new THREE.Color("#2a3a7a"),
  emissiveIntensity: 0.2, // glow muy suave, no foco frontal
 });
 moonTextureLoader.load("textures/moon.jpg", (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  moonMaterial.map = tex;
  moonMaterial.needsUpdate = true;
  requestRender();
 });

 // ════════════════════════════════════════════════════════════════════════
 // DESK — escritorio + 2 monitores + pantallas procedurales
 // ════════════════════════════════════════════════════════════════════════
 // Construcción + tick + cleanup viven en ./hero/desk.js.
 // El callback onDeskReady notifica al módulo props para que reposicione
 // chair, lampara, teclado y ratón cuando el escritorio se carga.
 //
 // deskAnchor / deskTopSupport / deskSupportMeshes se exponen aquí como
 // `let` porque props.js los consume vía getters (getDeskAnchor, etc.) y
 // necesitan ser variables actualizables tras la carga async del .glb.
 let deskAnchor = null;
 let deskTopSupport = null;
 let deskSupportMeshes = [];

 const desk = buildDesk({
  scene,
  requestRender,
  onDeskReady: () => {
   // Sincronizar refs locales con las del módulo desk
   deskAnchor = desk.deskAnchor;
   deskTopSupport = desk.deskTopSupport;
   deskSupportMeshes = desk.deskSupportMeshes;

   // Notificar a los modelos que dependían de la mesa
   updateLampara();
   updateTeclado();
   updateRaton();
   updateChair();
  },
 });

 // Aliases para mantener nombres antiguos en GUI, raycast de silla, props
 const attachToDesk = desk.attachToDesk;
 const deskParams = desk.deskParams;
 const deskFixParams = desk.deskFixParams;
 const monitorParams = desk.monitorParams;
 const monitorFixParams = desk.monitorFixParams;
 const wireScreen = desk.wireScreen;
 const updateDesk = desk.updateDesk;
 const updateMonitors = desk.updateMonitors;

 /**
  * =========================================================
  * VISIBILITY / INTERSECTION
  * =========================================================
  */
 let isTabVisible = !document.hidden;
 let isCanvasVisible = true;

 const onVisibilityChange = () => {
  isTabVisible = !document.hidden;
  if (isTabVisible) requestRender();
 };

 document.addEventListener("visibilitychange", onVisibilityChange);

 const observer = new IntersectionObserver(
  (entries) => {
   if (!entries.length) return;
   isCanvasVisible = entries[0].isIntersecting;
   if (isCanvasVisible) requestRender();
  },
  { threshold: 0.01 },
 );

 observer.observe(canvas);

 /**
  * =========================================================
  * RENDER LOOP CONTROL
  * =========================================================
  */
 const clock = new THREE.Clock();
 let animationFrameId = null;
 let isRendering = false;

 function shouldAnimate() {
  return isTabVisible && isCanvasVisible;
 }

 // ════════════════════════════════════════════════════════════════════════
 // FASES DE LA DRAMATURGIA — calibradas sobre el wrapper de Hero
 // ════════════════════════════════════════════════════════════════════════
 // El wrapper de Hero.jsx mide 380vh con sticky 100vh dentro, lo que da
 // un rango real de scroll de 280vh. Las fases originales estaban en
 // escala scrollY/vh (frágil en mobile). Aquí las definimos en vh
 // recorridos sobre el wrapper y las normalizamos a [0..1] dividiendo
 // por el rango. La cadencia visual queda IDÉNTICA a la versión anterior.
 //
 // Si más adelante quieres ajustar la dramaturgia, edita los _VH y todas
 // las fases se recalibran automáticamente.
 const WRAPPER_RANGE_VH = 280; // = 380vh wrapper - 100vh sticky

 const F1_END_VH = 30; // F1: habitación estática
 const F2_END_VH = 75; // F2: aproximación a la ventana
 const F3_END_VH = 110; // F3: cruce de la pared
 const F4_END_VH = 150; // F4: vacío limpio (cámara llega a destino)
 // >F4: cámara quieta, cosmos animado (UFO, claim, etc.)

 const F2S = F1_END_VH / WRAPPER_RANGE_VH; // 0.107
 const F2E = F2_END_VH / WRAPPER_RANGE_VH; // 0.268
 const F3S = F2_END_VH / WRAPPER_RANGE_VH; // 0.268
 const F3E = F3_END_VH / WRAPPER_RANGE_VH; // 0.393
 const F4S = F3_END_VH / WRAPPER_RANGE_VH; // 0.393
 const F4E = F4_END_VH / WRAPPER_RANGE_VH; // 0.536

 function requestRender() {
  if (!shouldAnimate()) return;
  if (isRendering) return;
  isRendering = true;
  animationFrameId = window.requestAnimationFrame(tick);
 }

 // ════════════════════════════════════════════════════════════════════════
 // EXTERIOR — escena espacial completa (estrellas, luna, nebula, viñeta,
 // satélite, asteroides, fugaz, UFO, claim, plano C)
 // ════════════════════════════════════════════════════════════════════════
 // Toda la construcción + tick + cleanup vive en ./hero/exterior.js
 // Aquí solo se desestructuran las refs que la GUI y el cleanup necesitan.
 const exterior = buildExterior({
  scene,
  camera,
  renderer,
  isMobile,
  atmosphereParams,
  requestRender,
 });

 const {
  // Constantes — la GUI las usa para rangos de luna/claim
  EXT_X,
  EXT_Y,
  EXT_Z,
  // Params (GUI)
  starsParams,
  moonParams,
  nebulaParams,
  ufoParams,
  claimParams,
  asteroidParams,
  // Objetos referenciados desde GUI
  extMoon,
  nebulaMesh,
  // Funciones onChange para GUI
  updateMoon,
  updateNebula,
  regenerateNebula,
  updateUfo,
  updateClaim,
 } = exterior;

 // ════════════════════════════════════════════════════════════════════════
 // ROOM — paredes + ventana + estrellas internas + luces interiores + poster
 // ════════════════════════════════════════════════════════════════════════
 // Construcción + tick + cleanup viven en ./hero/room.js.
 // El sistema cameraFocus se queda en este orquestador (modifica la cámara).
 const room = buildRoom({
  scene,
  camera,
  canvas,
  clock,
  floorMaterial,
  wallMaterial,
  windowFrameMaterial,
  windowGlassMaterial,
  windowRevealMaterial,
  outerGlowMaterial,
  planeGeometry14,
  planeGeometryWall,
  unitPlaneGeometry,
  unitBoxGeometry,
  moonGeometry,
  moonMaterial,
  quality,
  requestRender,
  onPosterFocusEnter: (now) => {
   enterCameraFocus("poster", now);
  },
  onPosterFocusExit: (now) => {
   exitCameraFocus(now);
  },
  isCameraFocusActive: () => cameraFocus.active,
 });

 // Aliases para mantener nombres antiguos en GUI, tick, cleanup y keyframes
 const wallPoster = room.wallPoster;
 const posterSpot = room.posterSpot;
 const windowParams = room.windowParams; // usado en buildKeyframes (KP[1], KP[2])
 const floor = room.floor; // usado en getChairSupportY para raycast del suelo

 // ════════════════════════════════════════════════════════════════════════
 // CAMERA FOCUS — close-up cinemático (responsabilidad del orquestador)
 // ════════════════════════════════════════════════════════════════════════
 // El sistema cameraFocus modifica la cámara. Vive aquí porque la cámara
 // es responsabilidad del orquestador, no del módulo room.
 // Comunicación con room: vía callbacks onPosterFocusEnter / onPosterFocusExit
 // pasados a buildRoom. El cierre del poster lo hace room internamente cuando
 // exitCameraFocus llama a wallPoster.userData.triggerClose.
 const cameraFocus = {
  active: false,
  phase: "idle", // idle | entering | held | exiting
  phaseStart: 0,
  enterDuration: 1.1,
  exitDuration: 1.0,
  targetKey: null, // "poster" | "monitors"
 };

 // Pose resultante (se recalcula cada frame en tick)
 const focusPos = new THREE.Vector3();
 const focusQuat = new THREE.Quaternion();
 const _focusMat = new THREE.Matrix4();
 const _focusUp = new THREE.Vector3(0, 1, 0);
 const _focusLookAt = new THREE.Vector3();
 // Buffers temporales para world position / quaternion del poster.
 // Reusados cada frame para no crear basura en el GC.
 const _focusWorldQuat = new THREE.Quaternion();
 const _focusNormal = new THREE.Vector3();

 const computeFocusTarget = () => {
  // En móvil wallPoster es null (no se crea por VRAM). Salimos sin
  // tocar la cámara si por algún motivo se llega aquí en móvil.
  if (!wallPoster) return;

  // ── World position en lugar de local ─────────────────────────────
  // ANTES se usaba `wallPoster.position`, que es la posición LOCAL
  // dentro del padre del mesh. Como room.js coloca el poster dentro de
  // un grupo / con transformaciones, la posición local NO coincide con
  // la world. El resultado era un focusPos que apuntaba a un punto del
  // espacio cercano a la silla del astronauta en lugar del cuadro.
  // getWorldPosition() resuelve el árbol de transformaciones y nos da
  // la posición real del poster en el mundo.
  wallPoster.getWorldPosition(_focusLookAt);

  // ── Offset hacia DELANTE del poster, no en Z absoluto ────────────
  // ANTES el offset era `z + 2.3` fijo, asumiendo que el poster mira
  // hacia +Z. Eso solo funciona si el poster está en una pared frontal
  // sin rotar. Si está rotado (pared lateral / esquina), el offset Z
  // mete la cámara dentro de la pared.
  // Calculamos el "frente" real del poster aplicando su world quaternion
  // a un vector Z+1: eso da el vector normal al plano del cuadro, en
  // world space. La cámara se coloca a 2.3u a lo largo de esa normal.
  // Robusto a cualquier pared y orientación futura.
  wallPoster.getWorldQuaternion(_focusWorldQuat);
  _focusNormal.set(0, 0, 1).applyQuaternion(_focusWorldQuat);
  focusPos.copy(_focusLookAt).addScaledVector(_focusNormal, 2.3);

  _focusMat.lookAt(focusPos, _focusLookAt, _focusUp);
  focusQuat.setFromRotationMatrix(_focusMat);
 };

 function enterCameraFocus(targetKey, now) {
  if (cameraFocus.active) return false;
  cameraFocus.active = true;
  cameraFocus.phase = "entering";
  cameraFocus.phaseStart = now;
  cameraFocus.targetKey = targetKey;
  if (controls.enabled) controls.enabled = false;
  document.body.style.overflow = "hidden";
  return true;
 }

 function exitCameraFocus(now) {
  if (!cameraFocus.active) return;
  if (cameraFocus.phase === "exiting") return;

  // El poster se cierra directamente vía su API (solo desktop)
  if (cameraFocus.targetKey === "poster" && wallPoster) {
   wallPoster.userData.triggerClose(now);
  }

  cameraFocus.phase = "exiting";
  cameraFocus.phaseStart = now;
  document.body.style.overflow = "";
 }

 // ════════════════════════════════════════════════════════════════════════
 // OBJETOS VIVOS — neón + perro hologram + orrery
 // ════════════════════════════════════════════════════════════════════════
 // En móvil saltamos los 3 interactivos:
 //   - Neon: depende de hover (color cambia al pasar el ratón)
 //   - Dog Hologram: shader custom + texturas scan/halo/ring (~3 MB VRAM)
 //   - Orrery: shader del planeta + glow procedural
 //
 // Sin hover ninguno es funcional en móvil. Y juntos consumían ~6 MB de
 // VRAM + 3 ShaderMaterials cuya compilación en Mali-G68 era parte de
 // la causa del WebGL CONTEXT LOST. Stubs API-compatible para que el
 // resto del archivo (GUI, ticks, dispose) no tenga que llevar guardas.
 //
 // Construcción + tick + cleanup viven en ./hero/interactives.js
 let neon, dogHologramRef, orreryRef;
 if (isMobile) {
  neon = {
   params: {}, // GUI no se monta en móvil → vacío basta
   letterHalos: [], // forEach() lo ignora
   update: () => {},
   dispose: () => {},
  };
  dogHologramRef = { group: null, dispose: () => {} };
  orreryRef = { group: null, dispose: () => {} };
 } else {
  neon = buildNeon({ scene, requestRender });
  dogHologramRef = buildDogHologram({
   attachToDesk,
   getDeskTopSupport: () => deskTopSupport,
   requestRender,
  });
  orreryRef = buildOrrery({ scene });
 }

 // Aliases para GUI y cleanup
 const neonParams = neon.params;
 const neonLetterHalos = neon.letterHalos;
 const dogHologram = dogHologramRef.group;
 const orrery = orreryRef.group;

 // ════════════════════════════════════════════════════════════════════════
 // PROPS — chair + astronauta + lámpara/cohete + teclado + ratón + flame
 // ════════════════════════════════════════════════════════════════════════
 // Construcción + tick + cleanup viven en ./hero/props.js.
 // Las 3 luces del cohete (warmLight, lamparaLight, lamparaFlameLight) y el
 // sistema flame también se mueven aquí — están acoplados a la lámpara.
 const props = buildProps({
  scene,
  attachToDesk,
  getDeskAnchor: () => deskAnchor,
  getDeskTopSupport: () => deskTopSupport,
  getDeskSupportMeshes: () => deskSupportMeshes,
  getFloor: () => room.floor,
  requestRender,
  isMobile,
 });

 // Aliases para GUI (Cohete folder)
 const lamparaParams = props.lamparaParams;
 const warmLight = props.warmLight;
 const lamparaFlameLight = props.lamparaFlameLight;

 // Aliases para que el orquestador (desk.onDeskReady) pueda llamarlas
 const updateChair = props.updateChair;
 const updateLampara = props.updateLampara;
 const updateTeclado = props.updateTeclado;
 const updateRaton = props.updateRaton;

 /**
  * =========================================================
  * CONTROLS
  * =========================================================
  */
 const controls = new OrbitControls(camera, canvas);
 controls.enableDamping = !isMobile;
 controls.enableZoom = false;
 controls.enablePan = false;
 controls.enabled = !isMobile;
 controls.target.set(responsiveState.target.x, responsiveState.target.y, responsiveState.target.z);

 // ─── FIX scroll mobile ────────────────────────────────────────────────
 // OrbitControls añade `touch-action: none` al canvas en su constructor
 // (independientemente de controls.enabled). Eso impide que el navegador
 // inicie scroll vertical cuando el dedo cae sobre el canvas — y como en
 // móvil el canvas ocupa toda la ventana, equivale a "no scrollea NUNCA".
 // `pan-y` devuelve al navegador el control del scroll vertical y deja
 // al canvas el resto de gestos (irrelevante porque controls están
 // deshabilitados en móvil).
 canvas.style.touchAction = "pan-y";

 if (!isMobile) {
  controls.addEventListener("change", requestRender);
 }

 /**
  * =========================================================
  * RESPONSIVE LAYOUT
  * =========================================================
  */
 function applyResponsiveLayout() {
  const config = getResponsiveConfig();

  cameraBase.x = config.camera.x;
  cameraBase.y = config.camera.y;
  cameraBase.z = config.camera.z;

  scrollConfig.yFactor = config.scrollYFactor;
  scrollConfig.zFactor = config.scrollZFactor;

  camera.fov = config.fov;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  controls.target.set(config.target.x, config.target.y, config.target.z);

  // Reconstruir keyframes si el sistema de animación ya está inicializado
  if (typeof buildKeyframes === "function" && typeof KP !== "undefined") buildKeyframes();

  requestRender();
 }

 /**
  * =========================================================
  * GUI
  * =========================================================
  */
 if (gui) {
  attachHeroGUI(gui, {
   // params
   neonParams,
   monitorParams,
   wireScreen,
   lamparaParams,
   lightMultipliers,
   cameraBase,
   starsParams,
   moonParams,
   nebulaParams,
   ufoParams,
   claimParams,
   asteroidParams,

   // objetos three
   neonLetterHalos,
   neon,
   wallPoster,
   posterSpot,
   dogHologram,
   orrery,
   warmLight,
   lamparaFlameLight,
   renderer,
   camera,
   controls,
   extMoon,
   nebulaMesh,

   // constantes del exterior
   EXT_X,
   EXT_Y,
   EXT_Z,

   // funciones
   requestRender,
   updateMonitors,
   updateLampara,
   updateMoon,
   updateNebula,
   regenerateNebula,
   updateUfo,
   updateClaim,
   buildKeyframes,
   getScrollProgress,
  });
 }

 /**
  * =========================================================
  * SCROLL
  * =========================================================
  */
 // Ya no guardamos scrollY como state — el progress se calcula on-demand
 // dentro de tick() vía getScrollProgress(). Aquí solo programamos un
 // render por frame (rAF) cuando hay scroll, evitando rendereos múltiples.
 const onScroll = () => {
  if (!scrollTicking) {
   scrollTicking = true;
   requestAnimationFrame(() => {
    scrollTicking = false;
    cachedScrollProgress = computeScrollProgress(); // ← actualizar caché
    requestRender();
   });
  }
 };

 /**
  * =========================================================
  * RESIZE — versión segura para móvil
  * =========================================================
  *
  * Lecciones aprendidas (importante no repetirlas):
  *
  * 1) NO escuchar `visualViewport.resize`: en móvil la barra de URL no
  *    colapsa de golpe sino progresivamente durante el scroll. Eso dispara
  *    el evento decenas de veces por segundo, y cada uno provoca un
  *    `renderer.setSize()` (reasignación de framebuffers + viewports), que
  *    es carísimo y termina matando el WebGL por presión de memoria —
  *    Chrome muestra el "sad face" tab crashed.
  *
  * 2) NO hacer un kick de resize justo tras el mount: los GLBs aún están
  *    cargando en la GPU y forzar otro render mientras compiten por VRAM
  *    provoca context loss en móviles modestos.
  *
  * 3) NO encadenar dobles requestAnimationFrame + setTimeout(250) llamando
  *    a applyResize: cada llamada rebuildea keyframes y reaplica layout —
  *    coste innecesario y suma al pico de carga inicial.
  *
  * Solución conservadora:
  *   - window.resize  → cubre orientación, redimensionado real, y desktop.
  *     (Sí, también se dispara en orientationchange en navegadores modernos;
  *     no hace falta escuchar `orientationchange` por separado.)
  *   - Un único kick suave a ~120ms tras el mount: solo recalcula el
  *     scrollProgress (no toca renderer ni keyframes), suficiente para
  *     arreglar el caso del "se ve mal hasta scrollear" sin riesgo.
  */
 const applyResize = () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  const newIsMobile = window.innerWidth < 768;
  const newPixelRatio = Math.min(window.devicePixelRatio, newIsMobile ? 1 : 1.25);

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(newPixelRatio);

  applyResponsiveLayout();
  cachedScrollProgress = computeScrollProgress();
  requestRender();
 };

 const onResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(applyResize, 100);
 };

 window.addEventListener("scroll", onScroll, { passive: true });
 window.addEventListener("resize", onResize, { passive: true });

 // ── Kick suave inicial — SIN tocar renderer ni rebuildear keyframes.
 //    Solo recalcula el scrollProgress una vez el layout de React/CSS
 //    se ha estabilizado (~120ms tras el mount). Esto cubre el caso del
 //    "el header se ve raro hasta que scrolleas" sin riesgo de matar
 //    el WebGL por presión de memoria en móviles modestos.
 setTimeout(() => {
  cachedScrollProgress = computeScrollProgress();
  requestRender();
 }, 120);

 /**
  * =========================================================
  * ANIMATION — rail cinematográfico con keyframes + slerp
  * =========================================================
  *
  * NO se usa lookAt() dinámico en ningún frame de scroll.
  * buildKeyframes() calcula posición y orientación UNA VEZ (y en resize).
  * tick(): solo lerp posición + slerp quaternion.
  *
  * Fases (sp = progress del wrapper de Hero, [0..1]):
  *  F1  0.000–0.107   Habitación estática
  *  F2  0.107–0.268   Aproximación a la ventana
  *  F3  0.268–0.393   Cruce de la pared
  *  F4  0.393–0.536   Vacío limpio (cámara llega a destino)
  *  F5+ 0.536–1.000   Cámara quieta, cosmos animado (UFO, claim, etc.)
  */

 // ─── Keyframes (declarados ANTES de applyResponsiveLayout) ─
 const KP = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
 const KQ = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
 const auxCam = new THREE.PerspectiveCamera();
 const workQ = new THREE.Quaternion();
 const workPos = new THREE.Vector3();

 function buildKeyframes() {
  KP[0].set(cameraBase.x, cameraBase.y, cameraBase.z);
  KP[1].set(-1.5, 4.51, windowParams.z);
  KP[2].set(-12.0, 4.51, windowParams.z);

  auxCam.position.copy(KP[0]);
  auxCam.up.set(0, 1, 0);
  auxCam.lookAt(controls.target.x, controls.target.y, controls.target.z);
  KQ[0].copy(auxCam.quaternion);

  auxCam.position.copy(KP[1]);
  auxCam.up.set(0, 1, 0);
  auxCam.lookAt(-20.0, KP[1].y, KP[1].z);
  KQ[1].copy(auxCam.quaternion);

  KQ[2].copy(KQ[1]);
 }

 // Construir keyframes ANTES de applyResponsiveLayout
 buildKeyframes();

 /**
  * =========================================================
  * INIT RESPONSIVE
  * =========================================================
  */
 applyResponsiveLayout();

 function tick() {
  isRendering = false;
  if (!shouldAnimate()) return;

  const elapsedTime = clock.getElapsedTime();
  const sp = getScrollProgress();

  // ── Posición y rotación de la cámara ──────────────────────────────────────
  //
  // El recorrido completo KP0 → KP1 → KP2 se divide en dos segmentos:
  //   Seg A: KP0 → KP1  durante F1+F2  (sp 0 → F2E)
  //   Seg B: KP1 → KP2  durante F3     (sp F3S → F3E)
  //
  // La rotación sigue los mismos segmentos con slerp.
  // En F4+ la cámara está quieta en KP2 con micro-flotación.

  // ── POSE BASE DRIVEN BY SCROLL ───────────────────────────────────────
  // Calculamos la pose de scroll en workPos/workQ pero NO la aplicamos
  // todavía — luego la mezclaremos con el focus del póster si está activo.
  if (sp <= F3E) {
   const tA = easeIO3(phase(sp, F2S, F2E));
   workPos.lerpVectors(KP[0], KP[1], tA);
   workQ.slerpQuaternions(KQ[0], KQ[1], tA);
   if (sp >= F3S) {
    const tB = easeIO3(phase(sp, F3S, F3E));
    workPos.lerpVectors(KP[1], KP[2], tB);
    workQ.slerpQuaternions(KQ[1], KQ[2], tB);
   }
  } else {
   workPos.set(KP[2].x, KP[2].y + Math.sin(elapsedTime * 0.22) * 0.035, KP[2].z + Math.sin(elapsedTime * 0.18) * 0.025);
   workQ.copy(KQ[2]);
  }

  // ── CAMERA FOCUS BLEND ────────────────────────────────────────────────
  let focusBlend = 0;
  if (cameraFocus.active) {
   const dt = elapsedTime - cameraFocus.phaseStart;
   if (cameraFocus.phase === "entering") {
    const k = clamp01(dt / cameraFocus.enterDuration);
    focusBlend = easeIO3(k);
    if (k >= 1) cameraFocus.phase = "held";
   } else if (cameraFocus.phase === "held") {
    focusBlend = 1;
   } else if (cameraFocus.phase === "exiting") {
    const k = clamp01(dt / cameraFocus.exitDuration);
    focusBlend = 1 - easeIO3(k);
    if (k >= 1) {
     cameraFocus.active = false;
     cameraFocus.phase = "idle";
     cameraFocus.targetKey = null;
    }
   }

   computeFocusTarget(); // recalcula focusPos/focusQuat cada frame
  }

  // ── APLICAR POSE FINAL ────────────────────────────────────────────────
  if (focusBlend > 0) {
   camera.position.lerpVectors(workPos, focusPos, focusBlend);
   camera.quaternion.slerpQuaternions(workQ, focusQuat, focusBlend);
  } else {
   camera.position.copy(workPos);
   camera.quaternion.copy(workQ);
  }

  // ── OrbitControls — orbit libre SOLO mientras estás en F1 SIN focus ───
  // Reglas:
  //   - F1 (sp < F2S) sin focus activo: orbit habilitado.
  //   - F1 con cameraFocus.active (click al cuadro): orbit DESHABILITADO.
  //     La cámara la mueve enteramente el sistema de focus mediante
  //     focusBlend. Si no excluyésemos cameraFocus de la condición,
  //     `controls.update()` sobrescribiría la pose del focus cada frame
  //     y el zoom al cuadro nunca se completaría — visualmente el usuario
  //     vería la pose KP[0] (cámara general del Hero) en lugar del zoom.
  //     Ese era el bug del "zoom va al astronauta": no había zoom, era
  //     la pose orbital reactivándose encima del focusBlend.
  //   - F2+ (sp >= F2S): orbit deshabilitado, la cámara la maneja el
  //     rail cinemático (KP[0]→KP[1]→KP[2]).
  // Al cruzar la frontera F1↔F2 el assignment es trivial (idempotente);
  // OrbitControls re-engancha listeners internos sin coste perceptible.
  //
  // NOTA conocida: si orbitas en F1 y luego scrolleas, el rail arranca
  // desde KP[0] (cameraBase), no desde la pose orbitada → hay un mini
  // snap al iniciar F2. Es aceptable porque scroll = movimiento, no se
  // percibe como bug.
  const orbitAllowed = sp < F2S && !cameraFocus.active;
  if (controls.enabled !== orbitAllowed) {
   controls.enabled = orbitAllowed;
  }
  if (controls.enabled && controls.enableDamping) {
   controls.update();
  }

  // ── Fondo — habitación → espacio ──────────────────────────────────────────
  const bgT = clamp01(phase(sp, F3S, F4E));
  scene.background.lerpColors(BG_ROOM, BG_SPACE, easeOut3(bgT));

  // ── Fog ───────────────────────────────────────────────────────────────────
  // El fog solo actúa durante el cruce (F3) para ocultar la habitación.
  // En F4+ es prácticamente cero — no queremos oscurecer el exterior.
  // atmosphereParams.fogDensityMult permite ajustar el pico desde GUI.
  if (scene.fog) {
   scene.fog.color.lerpColors(BG_ROOM, BG_SPACE, easeOut3(bgT));
   const fogMult = atmosphereParams.fogDensityMult;
   if (sp < F3S) {
    scene.fog.density = 0.0;
   } else if (sp < F3E) {
    scene.fog.density = lerpV(0.0, 0.38, easeIn3(phase(sp, F3S, F3E))) * fogMult;
   } else if (sp < F4E) {
    // Se aclara completamente — el exterior debe ser legible
    scene.fog.density = lerpV(0.38, 0.0, easeOut3(phase(sp, F3E, F4E))) * fogMult;
   } else {
    scene.fog.density = 0.0;
   }
  }

  // ── Interior cull — saltarse updates pesados cuando no se ven ─────────
  // Cuando sp > INTERIOR_CULL_SP la habitación ya es invisible: roomFade=0
  // ha apagado todas las luces internas y los meshes interiores quedan en
  // negro. Pero los update() de desk, hologram, orrery y neon siguen
  // corriendo cada frame. Lo más caro de todos:
  //   - desk.update() repinta los canvas de los 2 monitores y hace
  //     texture.needsUpdate → sube una textura nueva a GPU CADA FRAME.
  //   - dogHologram / orrery / neon → uniforms de shaders custom.
  //
  // El margen +0.04 sobre F3E evita pop perceptible justo en el borde.
  // El reloj (elapsedTime) sigue avanzando: si el usuario scroll-ea de
  // vuelta, las animaciones se reanudan en el punto temporal que les
  // toca, sin glitch.
  const INTERIOR_CULL_SP = F3E + 0.04; // ≈ 0.43
  const interiorVisible = sp < INTERIOR_CULL_SP;

  if (interiorVisible) {
   // Pantallas del monitor (typing + viewports wireframe) — delegado a desk
   desk.update(elapsedTime);

   // Holograma del perro — respiración + scan
   if (dogHologram?.userData.update) dogHologram.userData.update(elapsedTime);
   if (orrery?.userData?.update) orrery.userData.update(elapsedTime);
  }

  // ── Luces de la habitación + poster — delegado al módulo room ───────────
  const roomFade = 1 - clamp01(phase(sp, F2E, F3E));

  // warmFade — atenuación específica para las luces cálidas del cohete/
  // lámpara. Arranca su descenso en F2S (cuando empieza la aproximación a
  // la ventana) en lugar de F2E (cuando ya está casi llegando). Resultado:
  // estas luces se atenúan a la mitad de la aproximación y están casi
  // apagadas al iniciar el cruce → menos bleed por la ventana y menos
  // fragment lighting durante F2/F3.
  //
  // Si en algún momento quisieras invertir esto y usar el mismo fade que
  // el resto, basta con sustituir la línea por: const warmFade = roomFade;
  const warmFade = 1 - clamp01(phase(sp, F2S, F2E));

  // Habitación: 11 luces interiores + poster (raycast vive dentro del room)
  room.update({ elapsedTime, roomFade, lightMultipliers, isMobile });

  // Cohete: warmLight + flame system + lamparaLight + lamparaFlameLight
  // Las llamas (sprite/mesh) siguen visibles hasta roomFade=0 (cruce
  // completo); las LUCES que emiten se apagan antes vía warmFade.
  props.update({ elapsedTime, roomFade, warmFade });

  // ── Neón 3D (GLB) — posición / luces de rebote / titileo selectivo ─────
  // Solo se actualiza si el interior se ve — su update calcula bounce
  // lights y flicker selectivo que son caros y no se aprecian fuera.
  if (interiorVisible) {
   neon.update(elapsedTime, roomFade);
  }

  // ── Exterior completo (estrellas, luna, nebula, viñeta, satélite, ─────────
  // asteroides, fugaz, UFO, claim, plano técnico) ──────────────────────────
  exterior.update({ sp, elapsedTime, F4S });

  // ── Atmósfera global — exposure + background (cambios en vivo) ───────────
  if (renderer.toneMappingExposure !== atmosphereParams.exposure) {
   renderer.toneMappingExposure = atmosphereParams.exposure;
  }

  renderer.render(scene, camera);
  requestRender();
 }

 cachedScrollProgress = computeScrollProgress();
 requestRender();

 /**
  * =========================================================
  * CLEANUP
  * =========================================================
  */
 return () => {
  // Garantía dura: si el componente se desmonta con un cameraFocus
  // activo, el body había quedado con overflow:hidden. Liberamos.
  document.body.style.overflow = "";

  // Cursor custom — limpieza solo si se creó (desktop, no touch)
  if (!isTouchDevice) {
   if (cursorRafId) cancelAnimationFrame(cursorRafId);
   if (onCursorMove) window.removeEventListener("mousemove", onCursorMove);
   if (onCursorOver) window.removeEventListener("mouseover", onCursorOver);
   if (onCursorLeave) document.removeEventListener("mouseleave", onCursorLeave);
   if (onCursorEnter) document.removeEventListener("mouseenter", onCursorEnter);
   if (cursorRing?.parentNode) cursorRing.parentNode.removeChild(cursorRing);
   if (cursorDot?.parentNode) cursorDot.parentNode.removeChild(cursorDot);
   if (cursorStyleEl?.parentNode) cursorStyleEl.parentNode.removeChild(cursorStyleEl);
   document.documentElement.style.removeProperty("cursor");
   document.body.style.removeProperty("cursor");
  }

  window.removeEventListener("scroll", onScroll);
  // Listeners de pointermove / pointerdown / keydown del poster los quita room.dispose()
  canvas.style.cursor = "";
  window.removeEventListener("resize", onResize);
  document.removeEventListener("visibilitychange", onVisibilityChange);

  if (controls.enabled) {
   controls.removeEventListener("change", requestRender);
  }

  observer.disconnect();

  if (animationFrameId) {
   cancelAnimationFrame(animationFrameId);
  }

  controls.dispose();

  // Props — chair + astronauta + lámpara + teclado + ratón + flame + 3 luces del cohete
  props.dispose();

  // Escritorio + 2 monitores + pantallas procedurales — delegado al módulo desk
  desk.dispose();

  planeGeometry14.dispose();
  floorNormalTex.dispose();
  planeGeometryWall.dispose();
  unitPlaneGeometry.dispose();
  unitBoxGeometry.dispose();
  moonGeometry.dispose();

  // Estrellas internas + material: limpiados por room.dispose()

  exterior.dispose();

  wallMaterial.dispose();
  floorMaterial.dispose();
  deskMaterial.dispose();
  legMaterial.dispose();
  windowFrameMaterial.dispose();
  windowRevealMaterial.dispose();
  windowGlassMaterial.dispose();
  outerGlowMaterial.dispose();
  moonMaterial.dispose();

  if (orrery) {
   orrery.traverse((child) => {
    if (child.isMesh || child.isSprite) {
     if (child.geometry) child.geometry.dispose();
     const mats = Array.isArray(child.material) ? child.material : [child.material];
     mats.forEach((m) => {
      if (m?.map) m.map.dispose();
      if (m?.dispose) m.dispose();
     });
    }
   });
   scene.remove(orrery);
  }

  renderer.dispose();

  if (gui) gui.destroy();

  neon.dispose();

  // Habitación — limpieza completa delegada al módulo room
  // (11 luces interiores + wallPoster + posterSpot + estrellas internas + estructura)
  room.dispose();

  dogHologramRef.dispose();
  orreryRef.dispose();
  // Texturas de pared
  wallNormalTex.dispose();

  // Liberar el broker para que el HMR de Vite no deje colgando
  // referencias a un GUI viejo cuando initHeroScene se remonta.
  if (gui) {
   gui.destroy();
   clearGui();
  }
 };
}
