import * as THREE from "three";

/**
 * =========================================================
 * PROJECTS SCENE — "El Archivo de Transmisión"
 * =========================================================
 * Fase 3: Refinamiento cinematográfico.
 * – Pantalla con más presencia y escala
 * – Secuencia de entrada en 4 fases por proyecto
 * – Microanimaciones: flicker, pulso de señal, noise leve
 * – Jerarquía tipográfica mejorada
 * – Luz reactiva con pulso y tinte atmosférico
 * =========================================================
 */

// ── Proyectos ──────────────────────────────────────────────
// Cada proyecto admite hasta 3 imágenes para componer un collage
// tipo "ficha de archivo": principal + detalle/estudio.
// Si solo hay 1 imagen se muestra grande sola; si hay 2 se reparten
// en proporción 60/40; si hay 3, una grande + dos apiladas.
// Exportado para que ProjectsMobile pueda reutilizar los mismos datos
// sin duplicarlos. La versión móvil renderiza estos proyectos como
// cards HTML estáticas (sin WebGL) por compatibilidad con GPUs
// móviles limitadas.
export const PROJECTS = [
 {
  id: 0,
  name: "TemyPlast Configurator",
  year: "2026",
  tagline: "Simulador visual de alfombras a medida",
  description:
   "Configurador 3D donde el cliente elige medidas, color y diseño de alfombra y obtiene en tiempo real una vista realista del producto antes de pedir presupuesto. Pensado para reducir dudas y agilizar el cierre de venta.",
  tags: ["3D Web", "Configurador", "E-commerce"],
  color: "#c97a36",
  images: ["/images/projects/configurador-alfombras.png"],
  link: "https://adrabadev.com/configurador-alfombras/",
 },
 {
  id: 1,
  name: "Diploma3D System",
  year: "2026",
  tagline: "Generación dinámica de diplomas en 3D",
  description:
   "Sistema que genera diplomas personalizados en 3D combinando textura, tipografía y firma digital. Cada diploma se renderiza al vuelo según los datos del estudiante, listo para descargar o imprimir.",
  tags: ["Three.js", "Procedural", "Plantillas"],
  color: "#5b8cff",
  images: ["/images/projects/diploma3d.png"],
  link: "https://diplomaspersonalizados.com/configurador-de-diplomas/",
 },
 {
  id: 2,
  name: "Space Portfolio",
  year: "2026",
  tagline: "Experiencia interactiva en Three.js narrativa",
  description:
   "Este mismo portfolio. Una narrativa espacial donde cada sección es una escena: laboratorio, archivo de transmisión, contacto. Iluminación, scroll y profundidad como lenguaje en lugar de texto.",
  tags: ["Three.js", "Narrativa", "Cinemático"],
  color: "#ff6b4a",
  images: ["/images/projects/portfolio.png"],
  link: "https://www.davidllona.com/",
 },
 {
  id: 3,
  name: "AIO Armazém",
  year: "2026",
  tagline: "Plataforma web con experiencia de app móvil",
  description:
   "Diseño y desarrollo de una web app para la gestión de maquinaria, pensada para ofrecer una experiencia cercana a una aplicación móvil sin abandonar el entorno web. Incluye acceso de usuarios, solicitud de registro, navegación por secciones, paneles informativos y una interfaz visual orientada a la claridad y control",
  tags: ["React", "Node.js", "MySQL"],
  color: "#12c4a3",
  images: ["/images/projects/aio.png"],
  link: "https://adrabadev.com/app-aio/",
 },
];

// ── Scroll layout ──────────────────────────────────────────
// Cálculo del reparto (wrapper = 650vh → sH = 6.5):
//   · Sticky efectivo termina en sNorm = 5.5/6.5 ≈ 0.846
//   · Reserva final de ~0.10 para "respirar" tras el último proyecto
//   · Usable real: 0.10 → 0.74 → 4 proyectos × 0.16 cada uno
//
// Antes (550vh + START 0.14 + SPAN 0.19) el proyecto 3 entraba en
// 0.71 y la sticky moría en 0.818 → solo 0.10 de span efectivo,
// la mitad que los demás. Por eso "pasaba directo".
const SCROLL_P_START = 0.1;
const SCROLL_P_SPAN = 0.16;
const SCROLL_CAM_START = 0.03;
const SCROLL_CAM_END = 0.1;

// Nota: los antiguos CAM_ENTRY_START / ENTRY_*_DUR ahora viven dentro
// de initProjectsScene como cameraParamsP.entryStart y entryParams.*
// para que el GUI pueda tunearlos en vivo.

export function initProjectsScene(canvas) {
 if (!canvas) {
  console.warn("[ProjectsScene] No canvas provided");
  return () => {};
 }

 // ══════════════════════════════════════════════════════
 // PARÁMETROS TUNEABLES (expuestos al GUI)
 // ══════════════════════════════════════════════════════
 // Estos objetos se mutan en vivo desde el GUI. Las funciones de
 // dibujo leen de ellos cada frame, así los sliders responden al
 // momento sin necesidad de reinicializar la escena.

 const layoutParams = {
  mainTop: 60, // margen superior de la imagen principal
  mainHeight: 330, // altura de la imagen principal (canvas 2D, 0–576)
  mainMarginX: 44, // margen lateral del contenido del CRT
 };

 // Tipografía y espaciado del bloque de texto. Colores se mantienen
 // semánticos (paleta C.* + p.color) para preservar coherencia entre
 // proyectos: editar opacidades sí, pero no colores absolutos.
 const textParams = {
  // ── Header (TRANSMISIÓN / SEÑAL ESTABLE) ─────────────
  headerY: 36,
  headerSize: 10,

  // ── Nombre del proyecto ──────────────────────────────
  nameTopGap: 52, // separación entre la imagen y el nombre
  nameSeparatorGap: 34, // separación entre la línea horizontal y el nombre
  nameSize: 22,
  nameBold: true,
  nameOpacity: 1.0,
  nameAccentH: 2, // grosor de la línea de acento bajo el nombre
  nameAccentOpacity: 0.9,

  // ── Tagline ──────────────────────────────────────────
  taglineSize: 13,
  taglineOpacity: 0.92,
  taglineGap: 28, // separación nombre → tagline

  // ── Descripción ──────────────────────────────────────
  descSize: 11,
  descOpacity: 0.78,
  descGap: 22, // separación tagline → descripción
  descLineHeight: 16,
  descMaxLines: 3,
  descRightMargin: 140, // espacio reservado al watermark

  // ── Footer (link / ARCHIVO · AÚN NO DESPLEGADO) ──────
  footerSize: 11,
  footerOpacity: 0.9,
  footerBottomY: 26, // distancia desde el borde inferior

  // ── Watermark "0X" ───────────────────────────────────
  watermarkSize: 96,
  watermarkOpacity: 0.06,
  watermarkOffsetX: 160, // desde el borde derecho
  watermarkOffsetY: 18, // desde el borde inferior
 };

 const lightParams = {
  baseIntensity: 4.5, // intensidad base de la luz reactiva frontal
  haloIntensity: 0.85, // intensidad del halo ambiental cuando hay proyecto
  pulseStrength: 2.0, // fuerza del pulso al detectar nuevo proyecto
 };

 const cameraParamsP = {
  camFar: 5.2, // z de la cámara antes de hacer scroll dentro del proyecto
  camNear: 3.0, // z al final del rango del proyecto
  entryStart: 7.5, // z inicial durante el boot (más atrás = más vacío)
  floatAmplY: 0.04, // amplitud de flotación vertical
  floatAmplX: 0.018, // amplitud de flotación horizontal
 };

 const entryParams = {
  detectDur: 0.3, // duración fase DETECT
  glitchDur: 0.55, // duración fase GLITCH
  stabilizeDur: 0.4, // duración fase STABILIZE
  revealDur: 0.5, // duración fase REVEAL
 };

 // ══════════════════════════════════════════════════════
 // Estado general
 // ══════════════════════════════════════════════════════
 let resizeTimeout = null;
 let animFrameId = null;
 let isRendering = false;
 let isTabVisible = !document.hidden;
 let isCanvasVisible = true;
 let scrollY = 0;
 let latestScrollY = 0;
 let scrollTicking = false;

 // ── Estado de pantalla ──────────────────────────────────
 const screen = {
  bootProgress: 0,
  bootDone: false,
  activeProject: -1,
  prevActive: -1,
  lastChangeTime: -999, // tiempo del último cambio de proyecto (para debounce de scroll rápido)

  // Secuencia de entrada
  entryPhase: "idle", // idle | detect | glitch | stabilize | reveal | done
  entryTimer: 0,
  entryColor: "#1a2fff",

  // Microanimaciones
  flickerVal: 1.0, // multiplicador de opacidad para flicker
  flickerTimer: 0,
  noiseOffset: 0,
  signalPulse: 0, // 0→1, pulso periódico de "señal recibida"
  signalPulseT: 0,

  // Luces
  lightColor: new THREE.Color("#0a0e2a"),
  lightColorTarget: new THREE.Color("#0a0e2a"),
  lightPulse: 0, // intensidad extra durante entrada

  // Imágenes
  images: [],
  imagesLoaded: [],

  // ── Sistema de click en el link ──────────────────────
  // Bbox actualizado por drawData cada frame que hay link visible.
  // Coordenadas en el espacio del canvas 2D (TEX_W × TEX_H). Si es
  // null no hay nada clickable (boot, transición, proyecto sin link).
  activeLinkBounds: null,
  linkHover: false,
 };

 // ── Precarga ────────────────────────────────────────────
 // screen.images[i]        → array de Image() de cada proyecto
 // screen.imagesLoaded[i]  → array de booleans paralelos
 //
 // Usamos un caché por URL: cuando varias entradas comparten
 // la misma imagen (caso muy frecuente), reutilizamos el Image
 // ya cargado en lugar de crear instancias nuevas. Esto evita
 // race conditions con la caché del navegador (algunos browsers
 // no disparan onload de forma consistente para el mismo src).
 const imageCache = new Map();

 PROJECTS.forEach((p, i) => {
  screen.images[i] = [];
  screen.imagesLoaded[i] = [];

  p.images.forEach((src, j) => {
   // Caso 1: la URL ya está en el caché
   if (imageCache.has(src)) {
    const entry = imageCache.get(src);
    screen.images[i][j] = entry.img;
    screen.imagesLoaded[i][j] = entry.loaded;

    // Si aún no terminó de cargar, registramos un callback
    if (!entry.loaded) {
     entry.waiters.push(() => {
      screen.imagesLoaded[i][j] = true;
      requestRender();
     });
    }
    return;
   }

   // Caso 2: URL nueva — creamos Image y lo registramos en el caché
   screen.imagesLoaded[i][j] = false;
   const img = new Image();
   const entry = { img, loaded: false, waiters: [] };
   imageCache.set(src, entry);

   img.onload = () => {
    entry.loaded = true;
    screen.imagesLoaded[i][j] = true;
    // Notificar a todos los slots que comparten esta URL
    entry.waiters.forEach((cb) => cb());
    entry.waiters = [];
    requestRender();
   };

   img.onerror = () => {
    screen.imagesLoaded[i][j] = false;
    console.error("[ProjectsScene] Error cargando imagen:", src);
   };

   img.src = src;
   screen.images[i][j] = img;
  });
 });

 // ══════════════════════════════════════════════════════
 // SCENE
 // ══════════════════════════════════════════════════════
 const scene = new THREE.Scene();
 // Sin background ni fog: el canvas es transparente y deja ver
 // las estrellas que hay detrás (initProjectsStarsScene).

 const sizes = {
  width: canvas.clientWidth || window.innerWidth,
  height: canvas.clientHeight || window.innerHeight,
 };

 // ── Cámara ──────────────────────────────────────────────
 // Las z's reales se leen de cameraParamsP en cada frame (GUI en vivo).
 // Estas constantes solo se usan para el setup inicial.
 const camera = new THREE.PerspectiveCamera(36, sizes.width / sizes.height, 0.1, 60);
 camera.position.set(0, 0.05, cameraParamsP.entryStart);
 scene.add(camera);

 // (camScale se aplicará en cuanto se ejecute applyResponsiveLayout
 // más abajo; aquí lo dejamos en la posición base para mantener el
 // orden de inicialización limpio.)

 // ── Renderer ────────────────────────────────────────────
 const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  stencil: false,
  depth: true,
  powerPreference: "high-performance",
 });
 renderer.setSize(sizes.width, sizes.height);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
 renderer.outputColorSpace = THREE.SRGBColorSpace;
 renderer.setClearColor(0x000000, 0);
 renderer.shadowMap.enabled = false;

 // ══════════════════════════════════════════════════════
 // LAYOUT RESPONSIVO
 // ══════════════════════════════════════════════════════
 //
 // El CRT mide 3.0×1.8 unidades de mundo (definido más abajo en
 // SW/SH). Con cámara fija a z=3.0 y FOV 36°, en aspects estrechos
 // la pantalla se sale del frame.
 //
 // En lugar de escalar la geometría (que rompería el rig de luces),
 // calculamos la Z mínima a la que el CRT entra con margen, y
 // aplicamos un multiplicador `camScale` sobre los valores del GUI.
 //
 //   camScale  → multiplica camera.position.z para que el CRT siempre
 //               quepa con margen, sin importar el aspect.
 //   textScale → multiplica el tamaño base del texto en canvas2D
 //               para compensar la pérdida visual cuando la cámara
 //               se aleja en mobile.
 //
 // Si el aspect es desktop (≥1.4), camScale=1 y textScale=1: el GUI
 // del usuario manda al 100%. En mobile el sistema garantiza fit.

 const SW_RESP = 3.0;
 const SH_RESP = 1.8;

 let camScale = 1.0;
 let textScale = 1.0;

 function applyResponsiveLayout() {
  const aspect = sizes.width / sizes.height;
  const fovRad = (36 * Math.PI) / 180;

  // Margen alrededor del CRT.
  // En desktop wide (≥1.4) usamos un margen pequeño para que el setup
  // del GUI mande al 100% (camScale=1.0). En aspects estrechos
  // aplicamos margen más generoso para que el CRT no quede comido
  // por los bordes.
  const marginFactor = aspect >= 1.4 ? 1.04 : 1.08;

  // Z mínima para que el CRT quepa en altura y anchura
  const minZHeight = (SH_RESP * marginFactor) / (2 * Math.tan(fovRad / 2));
  const minZWidth = (SW_RESP * marginFactor) / (2 * Math.tan(fovRad / 2) * aspect);
  const fitZ = Math.max(minZHeight, minZWidth);

  // Escala respecto a la Z "cercana" del GUI
  camScale = Math.max(1, fitZ / cameraParamsP.camNear);

  // Compensación tipográfica para mobile
  if (aspect < 0.7) textScale = 1.55;
  else if (aspect < 1.0) textScale = 1.3;
  else if (aspect < 1.4) textScale = 1.12;
  else textScale = 1.0;
 }

 applyResponsiveLayout();

 // ══════════════════════════════════════════════════════
 // (POLVO ESPACIAL eliminado — ahora hay estrellas reales
 //  detrás del canvas, el polvo era redundante y restaba
 //  protagonismo a la pantalla CRT.)
 // ══════════════════════════════════════════════════════

 // ══════════════════════════════════════════════════════
 // HALO DE FONDO — plano grande detrás de la pantalla
 // Da presencia volumétrica a la pantalla en el void
 // ══════════════════════════════════════════════════════
 const haloGeo = new THREE.PlaneGeometry(6, 4);
 const haloMat = new THREE.MeshBasicMaterial({
  color: "#06060f",
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
 });
 const haloMesh = new THREE.Mesh(haloGeo, haloMat);
 haloMesh.position.z = -0.5;
 scene.add(haloMesh);

 // ══════════════════════════════════════════════════════
 // PANTALLA CRT
 // ══════════════════════════════════════════════════════
 const screenGroup = new THREE.Group();
 screenGroup.position.set(0, 0.06, 0);
 scene.add(screenGroup);

 // Pantalla más ancha y cinematográfica (16:9 aprox)
 const SW = 3.0;
 const SH = 1.8;
 const BZ = 0.072;
 const DP = 0.13;

 // Carcasa
 const bodyGeo = new THREE.BoxGeometry(SW + BZ * 2, SH + BZ * 2, DP);
 const bodyMat = new THREE.MeshStandardMaterial({
  color: "#0e0f16",
  roughness: 0.82,
  metalness: 0.25,
 });
 screenGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

 // Bisel
 const biselGeo = new THREE.BoxGeometry(SW + 0.006, SH + 0.006, DP * 0.22);
 const biselMat = new THREE.MeshStandardMaterial({ color: "#080910", roughness: 1 });
 const biselMesh = new THREE.Mesh(biselGeo, biselMat);
 biselMesh.position.z = DP * 0.4;
 screenGroup.add(biselMesh);

 // Borde de luz interior — línea fina que brilla con el color del proyecto
 const innerGlowGeo = new THREE.BoxGeometry(SW + BZ * 0.5, SH + BZ * 0.5, 0.004);
 const innerGlowMat = new THREE.MeshBasicMaterial({
  color: "#1a2fff",
  transparent: true,
  opacity: 0.0,
 });
 const innerGlowMesh = new THREE.Mesh(innerGlowGeo, innerGlowMat);
 innerGlowMesh.position.z = DP * 0.48;
 screenGroup.add(innerGlowMesh);

 // LED
 const ledGeo = new THREE.CircleGeometry(0.014, 8);
 const ledMat = new THREE.MeshBasicMaterial({ color: "#00ff88" });
 const ledMesh = new THREE.Mesh(ledGeo, ledMat);
 ledMesh.position.set(SW * 0.5 - 0.055, -SH * 0.5 - BZ * 0.55, DP * 0.53);
 screenGroup.add(ledMesh);

 // Soporte
 const stMat = new THREE.MeshStandardMaterial({ color: "#0b0c11", roughness: 0.9, metalness: 0.1 });
 const neck = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 0.09), stMat);
 neck.position.set(0, -SH * 0.5 - BZ - 0.16, -DP * 0.05);
 screenGroup.add(neck);
 const base = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.042, 0.28), stMat);
 base.position.set(0, -SH * 0.5 - BZ - 0.32, 0.05);
 screenGroup.add(base);

 // ── Canvas 2D → textura ──────────────────────────────
 const TEX_W = 960;
 const TEX_H = 576; // 16:10 interno para tener margen
 const sc2d = document.createElement("canvas");
 sc2d.width = TEX_W;
 sc2d.height = TEX_H;
 const ctx = sc2d.getContext("2d");

 const scTex = new THREE.CanvasTexture(sc2d);
 scTex.minFilter = THREE.LinearFilter;
 scTex.magFilter = THREE.LinearFilter;

 const scMat = new THREE.MeshBasicMaterial({ map: scTex, toneMapped: false });
 const scMesh = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), scMat);
 scMesh.position.z = DP * 0.53;
 screenGroup.add(scMesh);

 // ══════════════════════════════════════════════════════
 // LUCES
 // ══════════════════════════════════════════════════════
 scene.add(new THREE.AmbientLight("#14182e", 0.85));

 // Rim trasero — hace flotar la pantalla en el void
 const rimBack = new THREE.DirectionalLight("#0c1230", 0.65);
 rimBack.position.set(0, 2, -5);
 scene.add(rimBack);

 // Rim lateral izquierdo — forma la carcasa
 const rimLeft = new THREE.DirectionalLight("#080c18", 0.45);
 rimLeft.position.set(-4, 1, 2);
 scene.add(rimLeft);

 // Luz reactiva principal — frente a la pantalla, más intensa
 const reactiveLight = new THREE.PointLight("#1a2fff", 0.0, 12, 1.6);
 reactiveLight.position.set(0, 0.8, 2.6);
 scene.add(reactiveLight);

 // Segunda luz reactiva — desde abajo, crea halo en carcasa
 const reactiveBottom = new THREE.PointLight("#1a2fff", 0.0, 7, 2);
 reactiveBottom.position.set(0, -1.8, 1.6);
 scene.add(reactiveBottom);

 // Halo ambiental suave — rodea el monitor separándolo del void
 // Siempre encendido a muy baja intensidad, se colorea con el proyecto
 const haloLight = new THREE.PointLight("#1a2040", 0.35, 5, 2);
 haloLight.position.set(0, 0.4, 1.8);
 scene.add(haloLight);

 // ══════════════════════════════════════════════════════
 // CANVAS 2D — SISTEMA DE DIBUJO
 // ══════════════════════════════════════════════════════
 const FM = "'Courier New', 'Lucida Console', monospace";

 // Paleta: fondo levantado para contraste, textos más luminosos
 const C = {
  bg: "#05060e", // fondo ligeramente más oscuro → más contraste de texto
  green: "#00ff88", // verde nítido, pleno
  gdim: "#007840", // verde dim más visible
  amber: "#ffb830", // ámbar más luminoso
  orange: "#ff6b2c", // naranja exacto del portfolio — acento principal
  white: "#f8fbff", // blanco casi puro — máximo contraste
  offwhite: "#d8e0f5", // off-white más luminoso — texto secundario legible
  dim: "#3a4460", // separadores más visibles
  dim2: "#4e5878", // texto secundario más claro
  cyan: "#48e8ff", // cian nítido
  cyanDim: "#0f4858",
  red: "#e83030",
  scan: "rgba(0,0,0,0.08)",
  scan2: "rgba(255,255,255,0.018)",
 };

 // ── Util ─────────────────────────────────────────────────
 const h2r = (hex, a) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
 };

 const lerp = (a, b, t) => a + (b - a) * t;
 const easeOut = (t) => 1 - Math.pow(1 - t, 3);
 const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

 // ── Fondo ───────────────────────────────────────────────
 function clear(projColor) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Glow interno del color del proyecto — más visible para separar fondo del texto
  if (projColor) {
   const g = ctx.createRadialGradient(TEX_W * 0.5, TEX_H * 0.55, 0, TEX_W * 0.5, TEX_H * 0.5, TEX_W * 0.6);
   g.addColorStop(0, h2r(projColor, 0.16)); // de 0.08 a 0.16
   g.addColorStop(0.5, h2r(projColor, 0.06));
   g.addColorStop(1, "rgba(0,0,0,0)");
   ctx.fillStyle = g;
   ctx.fillRect(0, 0, TEX_W, TEX_H);
  }

  // Halo phosphor base — pantalla CRT siempre tiene un leve brillo interno
  const phosphor = ctx.createRadialGradient(TEX_W * 0.5, TEX_H * 0.5, 0, TEX_W * 0.5, TEX_H * 0.5, TEX_W * 0.45);
  phosphor.addColorStop(0, "rgba(18,22,50,0.55)");
  phosphor.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = phosphor;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
 }

 // ── Scanlines ───────────────────────────────────────────
 function scanlines(elapsed) {
  // Líneas fijas oscuras
  ctx.fillStyle = C.scan;
  for (let y = 0; y < TEX_H; y += 3) ctx.fillRect(0, y, TEX_W, 1);

  // Línea de barrido lenta (traveling scanline)
  const sweepY = (elapsed * 28) % TEX_H;
  const sg = ctx.createLinearGradient(0, sweepY - 6, 0, sweepY + 3);
  sg.addColorStop(0, "rgba(255,255,255,0)");
  sg.addColorStop(0.5, "rgba(255,255,255,0.025)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, sweepY - 6, TEX_W, 9);
 }

 // ── Viñeta ───────────────────────────────────────────────
 function vignette() {
  const g = ctx.createRadialGradient(
   TEX_W * 0.5,
   TEX_H * 0.5,
   TEX_H * 0.22, // radio interior más grande = más área legible
   TEX_W * 0.5,
   TEX_H * 0.5,
   TEX_H * 0.88,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.68)"); // de 0.85 a 0.68 — bordes oscuros, centro legible
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
 }

 // ── Ruido de pixeles leve ────────────────────────────────
 function drawNoise(intensity, elapsed) {
  if (intensity <= 0) return;
  const count = Math.floor(intensity * 180);
  for (let i = 0; i < count; i++) {
   const a = Math.random() * intensity * 0.22;
   ctx.fillStyle = `rgba(255,255,255,${a})`;
   ctx.fillRect(Math.random() * TEX_W, Math.random() * TEX_H, 1, 1);
  }
 }

 // ── Boot ─────────────────────────────────────────────────
 function drawBoot(p, elapsed) {
  const lines = [
   { t: "◈  SEÑAL DETECTADA  ·  ENLACE AL ARCHIVO ESTABLECIDO", c: C.orange, d: 0.0, bold: true },
   { t: "─────────────────────────────────────────", c: C.dim2, d: 0.08, bold: false },
   { t: "NAV-COMM  /  ARCHIVO DE TRANSMISIÓN  v3.1", c: C.offwhite, d: 0.18, bold: false },
   { t: "INICIALIZANDO ARRAY DE SEÑALES...", c: C.gdim, d: 0.3, bold: false },
   { t: "PORTADORA BLOQUEADA  ···  ESTABLECIDA", c: C.green, d: 0.46, bold: false },
   { t: "─────────────────────────────────────────", c: C.dim, d: 0.54, bold: false },
   { t: "ENTRADAS EN ARCHIVO  ·  04", c: C.amber, d: 0.66, bold: true },
   { t: "─────────────────────────────────────────", c: C.dim, d: 0.75, bold: false },
   { t: "DESPLÁZATE PARA RECIBIR  ↓", c: C.cyan, d: 0.84, bold: false },
  ];

  // En mobile escalamos también el boot — si no, queda invisible
  const FS = 15 * textScale;
  const LH = 31 * textScale;
  const SX = 44;
  const SY = 102;

  lines.forEach(({ t, c, d, bold }, i) => {
   if (p < d) return;
   const lp = Math.min(1, (p - d) / 0.09);
   const chars = Math.floor(t.length * lp);
   ctx.font = `${bold ? "bold " : ""}${FS}px ${FM}`;
   ctx.fillStyle = c;
   ctx.fillText(t.slice(0, chars), SX, SY + i * LH);
  });

  // Cursor parpadeante bajo "SCROLL TO RECEIVE"
  if (p >= 0.96) {
   const visible = Math.floor(elapsed / 0.55) % 2 === 0;
   if (visible) {
    ctx.font = `${FS}px ${FM}`;
    ctx.fillStyle = C.cyan;
    const lastY = SY + 7 * LH;
    ctx.fillText("_", SX + ctx.measureText("DESPLÁZATE PARA RECIBIR  ↓").width + 6, lastY);
   }
  }
 }

 // ── Fase DETECT ─────────────────────────────────────────
 function drawDetect(timer, idx) {
  const p = PROJECTS[idx];
  const t = 1 - timer / entryParams.detectDur;

  // Fondo muy oscuro con tinte del color del proyecto
  ctx.fillStyle = h2r(p.color, 0.04);
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Texto parpadeante de detección
  const blink = Math.floor(timer * 8) % 2 === 0;
  if (blink) {
   ctx.font = `bold 13px ${FM}`;
   ctx.fillStyle = h2r(C.amber, 0.9);
   ctx.fillText("◈  TRANSMISIÓN ENTRANTE DETECTADA", TEX_W * 0.5 - 200, TEX_H * 0.5 - 10);

   ctx.font = `11px ${FM}`;
   ctx.fillStyle = h2r(C.dim2, 0.8);
   ctx.fillText(`ENTRADA  0${idx + 1} / 04  ·  CLASIFICANDO...`, TEX_W * 0.5 - 150, TEX_H * 0.5 + 16);
  }

  // Barra de progreso de recepción
  const barW = TEX_W * 0.55;
  const barX = (TEX_W - barW) * 0.5;
  const barY = TEX_H * 0.5 + 38;
  ctx.strokeStyle = h2r(C.dim2, 0.6);
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, 3);
  ctx.fillStyle = h2r(p.color, 0.75);
  ctx.fillRect(barX, barY, barW * t, 3);
 }

 // ── Fase GLITCH ─────────────────────────────────────────
 function drawGlitch(timer, idx) {
  const intensity = timer / entryParams.glitchDur;
  const p = PROJECTS[idx];

  // Bloques de color (interferencia de imagen)
  const blockCount = Math.floor(intensity * 22);
  const colors = [C.cyan, C.red, h2r(p.color, 1), C.white, C.green];
  for (let i = 0; i < blockCount; i++) {
   const y = Math.random() * TEX_H;
   const h = Math.random() * 9 + 1;
   const x = (Math.random() - 0.5) * 60;
   const w = Math.random() * TEX_W * 0.65 + TEX_W * 0.2;
   ctx.fillStyle = h2r(colors[Math.floor(Math.random() * colors.length)], Math.random() * 0.55 + 0.08);
   ctx.fillRect(x, y, w, h);
  }

  // Fragmentos de imagen principal (si cargada)
  if (screen.imagesLoaded[idx]?.[0]) {
   const img = screen.images[idx][0];
   const slices = Math.floor(intensity * 6);
   for (let i = 0; i < slices; i++) {
    const sy = Math.random() * img.naturalHeight;
    const sh = Math.random() * 40 + 10;
    const dy = Math.random() * TEX_H;
    const dx = (Math.random() - 0.5) * 30;
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, dy, TEX_W, sh);
    ctx.clip();
    ctx.drawImage(img, 0, sy, img.naturalWidth, sh, dx, dy, TEX_W, sh);
    ctx.restore();
    ctx.fillStyle = h2r(p.color, 0.25);
    ctx.fillRect(dx, dy, TEX_W, sh);
   }
  }

  // Ruido denso
  const nc = Math.floor(intensity * 700);
  for (let i = 0; i < nc; i++) {
   ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.28})`;
   ctx.fillRect(Math.random() * TEX_W, Math.random() * TEX_H, 1 + (Math.random() > 0.9 ? 1 : 0), 1);
  }

  // Texto corrupto
  if (intensity > 0.3) {
   ctx.font = `bold 12px ${FM}`;
   ctx.fillStyle = h2r(C.red, intensity * 0.9);
   ctx.fillText("▒▒  SEÑAL CORRUPTA  ▒▒", 44, TEX_H * 0.5);
  }
 }

 // ── Fase STABILIZE ──────────────────────────────────────
 function drawStabilize(timer, idx) {
  const p = PROJECTS[idx];
  const t = 1 - timer / entryParams.stabilizeDur; // 0→1
  const ease = easeOut(t);

  // Barre horizontal que limpia la pantalla con el color del proyecto
  const barH = TEX_H * ease;
  const grad = ctx.createLinearGradient(0, TEX_H - barH - 20, 0, TEX_H - barH + 8);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, h2r(p.color, 0.22));
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, TEX_H - barH - 20, TEX_W, 28);

  // La parte ya "limpia" muestra un fondo sólido del proyecto
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, TEX_H - barH, TEX_W, barH);

  // Pequeño texto de estabilización
  if (t > 0.5) {
   ctx.font = `11px ${FM}`;
   ctx.fillStyle = h2r(C.green, (t - 0.5) * 2 * 0.7);
   ctx.fillText("SEÑAL ESTABILIZADA  ·  DECODIFICANDO ENTRADA DE ARCHIVO", 44, TEX_H - 22);
  }
 }

 // ── Util: wrap de texto en líneas según ancho ────────────
 function wrapText(text, maxW, font) {
  ctx.font = font;
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const w of words) {
   const test = current ? current + " " + w : w;
   if (ctx.measureText(test).width <= maxW) {
    current = test;
   } else {
    if (current) lines.push(current);
    current = w;
   }
  }
  if (current) lines.push(current);
  return lines;
 }

 // ── Imagen principal ─────────────────────────────────────
 // Ancho completo, marco fino, escáner durante el reveal.
 // Mantiene la presencia cinematográfica del monitor que tenía
 // la versión anterior.
 function drawMainImage(img, loaded, x, y, w, h, revealP, color) {
  // Marco fino
  ctx.strokeStyle = h2r(C.dim, 0.75);
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  if (!loaded || !img) {
   ctx.fillStyle = h2r(C.dim, 0.1);
   ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
   ctx.font = `12px ${FM}`;
   ctx.fillStyle = h2r(C.dim2, 0.55);
   const txt = "[ CARGANDO IMAGEN... ]";
   const tw = ctx.measureText(txt).width;
   ctx.fillText(txt, x + (w - tw) / 2, y + h / 2);
   return;
  }

  const revH = Math.round(h * Math.min(1, Math.max(0, revealP)));

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, revH);
  ctx.clip();

  // Cover-fit: la imagen llena la caja sin deformarse
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let dw, dh, dx, dy;
  if (imgRatio > boxRatio) {
   dh = h;
   dw = h * imgRatio;
   dx = x - (dw - w) / 2;
   dy = y;
  } else {
   dw = w;
   dh = w / imgRatio;
   dx = x;
   dy = y - (dh - h) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  // Overlay sutil para integrar con la pantalla CRT
  ctx.fillStyle = "rgba(2,2,10,0.32)";
  ctx.fillRect(x, y, w, h);

  // Línea de escáner durante el reveal
  if (revealP < 1) {
   const scanY = y + revH;
   const sg = ctx.createLinearGradient(x, scanY - 12, x, scanY + 4);
   sg.addColorStop(0, "rgba(56,216,240,0)");
   sg.addColorStop(0.6, "rgba(56,216,240,0.9)");
   sg.addColorStop(1, "rgba(56,216,240,0)");
   ctx.fillStyle = sg;
   ctx.fillRect(x, scanY - 12, w, 16);

   // Coordenadas de escáner
   ctx.font = `10px ${FM}`;
   ctx.fillStyle = h2r(C.cyan, 0.6);
   ctx.fillText(
    `ESCANEO  ${Math.round(revealP * 100)
     .toString()
     .padStart(3, "0")}%`,
    x + w - 80,
    scanY - 3,
   );
  }
 }

 // ── Imagen del proyecto ─────────────────────────────────
 // Una única imagen a ancho completo. Las polaroids superpuestas
 // se eliminaron — competían visualmente con la imagen principal.
 // (drawPolaroid sigue arriba por si en el futuro se reintroduce
 // alguna variante de collage.)
 function drawCollage(idx, revealP) {
  const p = PROJECTS[idx];
  const imgs = screen.images[idx] || [];
  const loaded = screen.imagesLoaded[idx] || [];

  const SX = layoutParams.mainMarginX;
  const MAIN_Y = layoutParams.mainTop;
  const MAIN_W = TEX_W - SX * 2;
  const MAIN_H = layoutParams.mainHeight;

  drawMainImage(imgs[0], loaded[0], SX, MAIN_Y, MAIN_W, MAIN_H, revealP, p.color);
 }

 // ── Datos del proyecto (debajo de la imagen) ─────────────
 // Layout vertical: nombre + año en una línea, tagline y
 // descripción larga. Mantiene la jerarquía de la versión
 // original pero con descripción explicativa más extensa.
 //
 // textScale (responsive) multiplica los tamaños base. En desktop
 // = 1.0, en mobile sube a ~1.55 para compensar la reducción visual
 // del CRT cuando la cámara se aleja para hacer fit.
 function drawData(idx, fade, elapsed) {
  const p = PROJECTS[idx];
  const SX = layoutParams.mainMarginX;
  const MAIN_Y = layoutParams.mainTop;
  const MAIN_H = layoutParams.mainHeight;
  const MAIN_BOTTOM = MAIN_Y + MAIN_H;
  const T = textParams;
  const ts = textScale; // alias corto

  // ── Header: transmisión + estado de señal ─────────────
  const headerY = T.headerY;
  const hSize = T.headerSize * ts;
  const hFont = `${hSize}px ${FM}`;

  ctx.fillStyle = h2r(C.dim, fade * 0.8);
  ctx.fillRect(SX, headerY + 8, TEX_W - SX * 2, 1);

  ctx.font = hFont;
  ctx.fillStyle = h2r(p.color, fade);
  ctx.fillText("TRANSMISIÓN", SX, headerY);

  // Posición del número 0X relativa al ancho real de "TRANSMISIÓN"
  // (así escala bien si cambias headerSize)
  const labelW = ctx.measureText("TRANSMISIÓN").width;

  ctx.font = `bold ${hSize}px ${FM}`;
  ctx.fillStyle = h2r(C.white, fade);
  ctx.fillText(`0${idx + 1}`, SX + labelW + 8, headerY);

  ctx.font = hFont;
  ctx.fillStyle = h2r(C.dim2, fade * 0.85);
  ctx.fillText("/ 04", SX + labelW + 28, headerY);

  // Status (derecha, con pulso)
  // Posición ajustada a textScale para que no se salga del margen
  const statusX = TEX_W - SX - 120 * ts;
  const sigPulse = Math.sin(elapsed * 3.5) * 0.5 + 0.5;
  ctx.font = hFont;
  ctx.fillStyle = h2r(C.green, fade * (0.65 + sigPulse * 0.3));
  ctx.fillText("● SEÑAL ESTABLE", statusX, headerY);

  // ── Bloque de datos: arranca debajo de la imagen ──────
  let DY = MAIN_BOTTOM + T.nameTopGap;

  // Línea separadora encima del nombre
  ctx.fillStyle = h2r(C.dim, fade * 0.7);
  ctx.fillRect(SX, DY - T.nameSeparatorGap, TEX_W - SX * 2, 1);

  // Nombre — protagonista tipográfico
  const nameSize = T.nameSize * ts;
  const nameWeight = T.nameBold ? "bold " : "";
  ctx.font = `${nameWeight}${nameSize}px ${FM}`;
  ctx.fillStyle = h2r(C.white, fade * T.nameOpacity);
  ctx.fillText(p.name, SX, DY);
  const nameW = ctx.measureText(p.name).width;

  // Año al lado del nombre (escala con el tamaño del nombre)
  const yearSize = Math.max(9, Math.round(nameSize * 0.5));
  ctx.font = `${yearSize}px ${FM}`;
  ctx.fillStyle = h2r(p.color, fade);
  ctx.fillText(p.year, SX + nameW + 16, DY);

  // Línea de acento bajo el nombre
  ctx.fillStyle = h2r(p.color, fade * T.nameAccentOpacity);
  ctx.fillRect(SX, DY + 6, nameW, T.nameAccentH);

  DY += T.taglineGap;

  // Tagline
  const taglineSize = T.taglineSize * ts;
  ctx.font = `${taglineSize}px ${FM}`;
  ctx.fillStyle = h2r(C.offwhite, fade * T.taglineOpacity);
  ctx.fillText(p.tagline, SX, DY);
  DY += T.descGap;

  // Descripción larga (ancho recortado para no chocar con el watermark)
  const descSize = T.descSize * ts;
  const descLineHeight = T.descLineHeight * ts;
  // En mobile reducimos líneas máximas para que no se solape con el footer
  const maxLines = ts > 1.25 ? Math.max(2, T.descMaxLines - 1) : T.descMaxLines;
  const DESC_W = TEX_W - SX * 2 - T.descRightMargin * ts;
  const descLines = wrapText(p.description, DESC_W, `${descSize}px ${FM}`).slice(0, maxLines);
  ctx.font = `${descSize}px ${FM}`;
  ctx.fillStyle = h2r(C.offwhite, fade * T.descOpacity);
  descLines.forEach((line, i) => {
   ctx.fillText(line, SX, DY + i * descLineHeight);
  });

  // ── Footer ─────────────────────────────────────────────
  const footerY = TEX_H - T.footerBottomY;
  const footerSize = T.footerSize * ts;

  ctx.fillStyle = h2r(C.dim, fade * 0.55);
  ctx.fillRect(SX, footerY - 14, TEX_W - SX * 2, 1);

  if (p.link) {
   // Display limpio sin protocolo — más legible y libera espacio
   // para que no choque con el watermark "0X" en links largos.
   const displayLink = p.link.replace(/^https?:\/\//, "");

   ctx.font = `${footerSize}px ${FM}`;

   // Hover → texto blanco brillante + subrayado fino cyan.
   // Cambio mínimo pero suficiente para señalar afordancia
   // sin romper la estética CRT (nada de glows agresivos).
   const hovered = screen.linkHover;
   const linkAlpha = fade * T.footerOpacity;

   ctx.fillStyle = h2r(hovered ? C.white : C.cyan, linkAlpha);
   ctx.fillText("▶", SX, footerY);

   ctx.fillStyle = h2r(hovered ? C.white : C.cyan, linkAlpha);
   ctx.fillText(displayLink, SX + 18, footerY);

   const linkW = ctx.measureText(displayLink).width;

   if (hovered) {
    ctx.fillStyle = h2r(C.cyan, fade * 0.85);
    ctx.fillRect(SX + 18, footerY + 4, linkW, 1);
   }

   // Registrar bbox clickable (padding generoso vertical para
   // que el target sea cómodo, sobre todo en mobile/tap).
   screen.activeLinkBounds = {
    x: SX - 2,
    y: footerY - footerSize - 2,
    w: 18 + linkW + 6,
    h: footerSize + 10,
   };
  } else {
   screen.activeLinkBounds = null;
   ctx.font = `${Math.max(9, footerSize - 1)}px ${FM}`;
   ctx.fillStyle = h2r(C.dim2, fade * T.footerOpacity * 0.94);
   ctx.fillText("ARCHIVO  ·  AÚN NO DESPLEGADO", SX, footerY);
  }

  // Watermark del número — inferior derecha
  const watermarkSize = T.watermarkSize * ts;
  ctx.font = `bold ${watermarkSize}px ${FM}`;
  ctx.fillStyle = h2r(p.color, fade * T.watermarkOpacity);
  ctx.fillText(`0${idx + 1}`, TEX_W - T.watermarkOffsetX * ts, TEX_H - T.watermarkOffsetY);
 }

 // ── Render principal ─────────────────────────────────────
 function renderScreen(elapsed, scrollNorm) {
  // Reset cada frame: solo drawData en fase reveal/done lo
  // volverá a setear si efectivamente hay link visible.
  // Evita que el bbox quede "fantasma" durante boot/transiciones.
  screen.activeLinkBounds = null;

  const proj = screen.activeProject;
  const projColor = proj >= 0 ? PROJECTS[proj].color : null;

  clear(projColor);

  // ── Boot ──────────────────────────────────────────────
  if (!screen.bootDone) {
   drawBoot(screen.bootProgress, elapsed);
   drawNoise(0.35, elapsed);
   scanlines(elapsed);
   vignette();
   scTex.needsUpdate = true;
   return;
  }

  // ── Sin proyecto activo: boot completo + cursor ───────
  if (proj < 0) {
   drawBoot(1.0, elapsed);
   drawNoise(0.2, elapsed);
   scanlines(elapsed);
   vignette();
   scTex.needsUpdate = true;
   return;
  }

  // ── Secuencia de entrada ──────────────────────────────
  switch (screen.entryPhase) {
   case "detect":
    drawDetect(screen.entryTimer, proj);
    drawNoise(0.15, elapsed);
    break;

   case "glitch":
    drawGlitch(screen.entryTimer, proj);
    break;

   case "stabilize":
    drawStabilize(screen.entryTimer, proj);
    drawNoise(0.1, elapsed);
    break;

   case "reveal":
   case "done": {
    // revealP va atado al timer de la fase REVEAL, NO al scroll.
    // Así la imagen se completa al terminar la secuencia de entrada
    // (~0.5s después de STABILIZE), sin necesidad de seguir scrolleando.
    const revealP = screen.entryPhase === "done" ? 1 : Math.min(1, 1 - screen.entryTimer / entryParams.revealDur);
    const fadeIn = revealP;

    drawCollage(proj, revealP);
    drawData(proj, fadeIn, elapsed);
    drawNoise(0.12 * (1 - fadeIn * 0.7), elapsed);
    break;
   }
  }

  scanlines(elapsed);
  vignette();
  scTex.needsUpdate = true;
 }

 // ══════════════════════════════════════════════════════
 // EVENTOS
 // ══════════════════════════════════════════════════════
 const onScroll = () => {
  latestScrollY = window.scrollY;
  if (!scrollTicking) {
   scrollTicking = true;
   requestAnimationFrame(() => {
    scrollY = latestScrollY;
    scrollTicking = false;
    requestRender();
   });
  }
 };
 window.addEventListener("scroll", onScroll, { passive: true });

 const onVis = () => {
  isTabVisible = !document.hidden;
  if (isTabVisible) requestRender();
 };
 document.addEventListener("visibilitychange", onVis);

 const obs = new IntersectionObserver(
  (e) => {
   isCanvasVisible = e[0]?.isIntersecting ?? true;
   if (isCanvasVisible) requestRender();
  },
  { threshold: 0.01 },
 );
 obs.observe(canvas);

 const onResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
   sizes.width = canvas.clientWidth || window.innerWidth;
   sizes.height = canvas.clientHeight || window.innerHeight;
   camera.aspect = sizes.width / sizes.height;
   camera.updateProjectionMatrix();
   renderer.setSize(sizes.width, sizes.height);
   renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
   applyResponsiveLayout();
   requestRender();
  }, 80);
 };
 window.addEventListener("resize", onResize, { passive: true });

 // ══════════════════════════════════════════════════════
 // INTERACCIÓN — Click sobre el link del CRT
 // ══════════════════════════════════════════════════════
 //
 // El link se dibuja dentro del canvas 2D que es textura del
 // scMesh. Para detectarlo:
 //   1. Raycast desde la cámara al puntero
 //   2. Si golpea scMesh, leer la UV del impacto
 //   3. Convertir UV → píxel del canvas 2D (TEX_W × TEX_H)
 //   4. Comparar contra screen.activeLinkBounds
 //
 // El bbox lo registra drawData en cada frame con link visible,
 // así la zona clickable acompaña automáticamente al texto aunque
 // cambie de tamaño (responsive) o de proyecto.
 const raycaster = new THREE.Raycaster();
 const ndcPointer = new THREE.Vector2();

 function updateHoverFromPointer(clientX, clientY) {
  const bounds = screen.activeLinkBounds;
  if (!bounds) {
   if (screen.linkHover) {
    screen.linkHover = false;
    canvas.style.cursor = "";
    requestRender();
   }
   return false;
  }

  const rect = canvas.getBoundingClientRect();
  ndcPointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndcPointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(ndcPointer, camera);
  const hits = raycaster.intersectObject(scMesh);

  let inside = false;
  if (hits.length > 0 && hits[0].uv) {
   const uv = hits[0].uv;
   const px = uv.x * TEX_W;
   const py = (1 - uv.y) * TEX_H; // canvas 2D crece hacia abajo
   inside = px >= bounds.x && px <= bounds.x + bounds.w && py >= bounds.y && py <= bounds.y + bounds.h;
  }

  if (inside !== screen.linkHover) {
   screen.linkHover = inside;
   canvas.style.cursor = inside ? "pointer" : "";
   requestRender();
  }
  return inside;
 }

 const onPointerMove = (e) => updateHoverFromPointer(e.clientX, e.clientY);

 const onPointerLeave = () => {
  if (screen.linkHover) {
   screen.linkHover = false;
   canvas.style.cursor = "";
   requestRender();
  }
 };

 const onCanvasClick = (e) => {
  // Recalcular dentro del propio click → cubre el caso mobile
  // donde no hay pointermove previo al tap.
  const inside = updateHoverFromPointer(e.clientX, e.clientY);
  if (!inside) return;

  const proj = screen.activeProject;
  if (proj < 0) return;
  const url = PROJECTS[proj].link;
  if (!url) return;

  // Solo permitir click cuando el contenido es legible
  // (durante glitch/detect no tiene sentido y sería frustrante).
  if (screen.entryPhase !== "done" && screen.entryPhase !== "reveal") return;

  window.open(url, "_blank", "noopener,noreferrer");
 };

 canvas.addEventListener("pointermove", onPointerMove, { passive: true });
 canvas.addEventListener("pointerleave", onPointerLeave, { passive: true });
 canvas.addEventListener("click", onCanvasClick);

 // ══════════════════════════════════════════════════════
 // RENDER LOOP
 // ══════════════════════════════════════════════════════
 const clock = new THREE.Clock();
 const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

 function shouldAnimate() {
  return isTabVisible && isCanvasVisible;
 }

 function requestRender() {
  if (!shouldAnimate() || isRendering) return;
  isRendering = true;
  animFrameId = requestAnimationFrame(tick);
 }

 let lastElapsed = 0;

 function tick() {
  isRendering = false;
  if (!shouldAnimate()) return;

  const elapsed = clock.getElapsedTime();
  const delta = Math.min(elapsed - lastElapsed, 0.05);
  lastElapsed = elapsed;

  // ── Scroll normalizado ──────────────────────────────
  // sH = 6.5 → coincide con el wrapper "650vh" del JSX.
  // No tocar uno sin tocar el otro: rompe el reparto del scroll.
  const sEl = canvas.closest("[data-projects-section]") || canvas.parentElement?.parentElement;
  const sTop = sEl ? sEl.getBoundingClientRect().top + window.scrollY : 0;
  const sH = sizes.height * 6.5;
  const sNorm = Math.min(1, Math.max(0, (scrollY - sTop) / sH));

  // ── Boot ─────────────────────────────────────────────
  if (!screen.bootDone) {
   screen.bootProgress = Math.min(1, elapsed / 2.4);
   if (screen.bootProgress >= 1) screen.bootDone = true;
  }

  // ── Proyecto activo — lógica robusta anti-salto ──────
  // Calculamos el índice "objetivo" según scroll
  let scrollTarget = -1;
  if (screen.bootDone && sNorm >= SCROLL_P_START) {
   for (let i = PROJECTS.length - 1; i >= 0; i--) {
    if (sNorm >= SCROLL_P_START + i * SCROLL_P_SPAN) {
     scrollTarget = i;
     break;
    }
   }
  }

  // ─────────────────────────────────────────────────────
  // CONVERGENCIA DIRECTA AL TARGET (anti-bug scroll rápido)
  // ─────────────────────────────────────────────────────
  //
  // El sistema SIEMPRE converge al scrollTarget real del usuario.
  // No encolamos pasos intermedios — eso era lo que dejaba el CRT
  // 5–7s por detrás tras un scroll fuerte.
  //
  // Reglas de transición:
  //  · animación previa terminada → cambiar libremente al target
  //  · animación a medio + salto ≥2 → abortar y saltar (no podemos
  //    hacer esperar al usuario, ya pasó dos proyectos atrás)
  //  · animación a medio + salto 1 → esperar a que termine
  //
  // Reglas de animación de entrada:
  //  · scroll lento (1 paso, sin cambios recientes) → secuencia
  //    cinematográfica completa (detect→glitch→stabilize→reveal)
  //  · scroll rápido (salto ≥2, cambio reciente, o aborto) →
  //    reveal corto sin glitch, mantiene la fluidez

  const entryDone = screen.entryPhase === "done" || screen.entryPhase === "idle";
  const distance = Math.abs(scrollTarget - screen.prevActive);
  const timeSinceLastChange = elapsed - screen.lastChangeTime;

  let newActive = screen.prevActive;
  let abortedMidAnim = false;

  if (scrollTarget !== screen.prevActive) {
   if (entryDone) {
    newActive = scrollTarget;
   } else if (distance >= 2) {
    // El usuario ya pasó dos o más — abortamos y saltamos
    newActive = scrollTarget;
    abortedMidAnim = true;
   }
  }

  newActive = Math.max(-1, Math.min(PROJECTS.length - 1, newActive));

  if (newActive !== screen.prevActive) {
   const isFastScroll = distance >= 2 || timeSinceLastChange < 0.8 || abortedMidAnim;

   screen.prevActive = newActive;
   screen.activeProject = newActive;
   screen.lastChangeTime = elapsed;

   if (newActive >= 0) {
    if (isFastScroll) {
     // Modo rápido — reveal directo, sin detect/glitch
     screen.entryPhase = "reveal";
     screen.entryTimer = entryParams.revealDur * 0.4;
     screen.lightPulse = 0.35;
    } else {
     // Modo normal — secuencia cinematográfica completa
     screen.entryPhase = "detect";
     screen.entryTimer = entryParams.detectDur;
     screen.lightPulse = 1.0;
    }
    screen.lightColorTarget.set(PROJECTS[newActive].color);
   } else {
    screen.entryPhase = "idle";
    screen.entryTimer = 0;
    screen.lightColorTarget.set("#0a0e2a");
   }
  }

  // ── Avance de la secuencia de entrada ────────────────
  if (screen.entryTimer > 0) {
   screen.entryTimer = Math.max(0, screen.entryTimer - delta);

   if (screen.entryTimer <= 0) {
    // Avanzar a siguiente fase
    switch (screen.entryPhase) {
     case "detect":
      screen.entryPhase = "glitch";
      screen.entryTimer = entryParams.glitchDur;
      break;
     case "glitch":
      screen.entryPhase = "stabilize";
      screen.entryTimer = entryParams.stabilizeDur;
      break;
     case "stabilize":
      screen.entryPhase = "reveal";
      screen.entryTimer = entryParams.revealDur;
      break;
     case "reveal":
      screen.entryPhase = "done";
      screen.entryTimer = 0;
      break;
    }
   }
  }

  // ── Cámara ───────────────────────────────────────────
  // Z's leídas en vivo de cameraParamsP (tuneables vía GUI).
  // camScale (responsive) garantiza que el CRT entra en frame en
  // cualquier aspect — en desktop = 1.0, en mobile sube según aspect.
  if (!screen.bootDone) {
   const bootEase =
    screen.bootProgress < 0.5
     ? 4 * screen.bootProgress * screen.bootProgress * screen.bootProgress
     : 1 - Math.pow(-2 * screen.bootProgress + 2, 3) / 2;
   camera.position.z = lerp(cameraParamsP.entryStart, cameraParamsP.camFar, bootEase) * camScale;
  } else {
   const camT = easeIO(Math.min(1, Math.max(0, (sNorm - SCROLL_CAM_START) / (SCROLL_CAM_END - SCROLL_CAM_START))));
   camera.position.z = lerp(cameraParamsP.camFar, cameraParamsP.camNear, camT) * camScale;
  }
  // Flotación muy suave — da vida sin distraer
  camera.position.y = 0.05 + Math.sin(elapsed * 0.28) * cameraParamsP.floatAmplY;
  camera.position.x = Math.sin(elapsed * 0.15) * cameraParamsP.floatAmplX;

  // ── Luces reactivas ──────────────────────────────────
  screen.lightColor.lerp(screen.lightColorTarget, 0.03);

  screen.lightPulse = Math.max(0, screen.lightPulse - delta * 1.4);
  const pulseBoost = screen.lightPulse * lightParams.pulseStrength;

  // Intensidad reactiva (carcasa recibe color y la pantalla brilla)
  const baseInt = screen.activeProject >= 0 ? lightParams.baseIntensity : 0.0;
  const targetInt = baseInt + pulseBoost;
  reactiveLight.intensity = lerp(reactiveLight.intensity, targetInt, 0.05);
  reactiveLight.color.copy(screen.lightColor);

  reactiveBottom.intensity = reactiveLight.intensity * 0.5;
  reactiveBottom.color.copy(screen.lightColor);

  // Halo siempre presente, se tiñe suavemente con el proyecto
  haloLight.color.lerp(
   screen.activeProject >= 0
    ? new THREE.Color(PROJECTS[screen.activeProject].color).multiplyScalar(0.25)
    : new THREE.Color("#1a2040"),
   0.025,
  );
  haloLight.intensity = lerp(
   haloLight.intensity,
   screen.activeProject >= 0 ? lightParams.haloIntensity : lightParams.haloIntensity * 0.47,
   0.03,
  );

  // Flicker sutil
  if (screen.activeProject >= 0 && screen.entryPhase === "done") {
   reactiveLight.intensity *= 1 + (Math.random() - 0.5) * 0.035;
  }

  // ── Borde interior de pantalla reactivo ──────────────
  if (screen.activeProject >= 0) {
   innerGlowMat.color.copy(screen.lightColor);
   innerGlowMat.opacity = lerp(innerGlowMat.opacity, screen.entryPhase === "done" ? 0.9 : 0.6, 0.05);
  } else {
   innerGlowMat.opacity = lerp(innerGlowMat.opacity, 0.0, 0.04);
  }

  // ── (Polvo eliminado — ver arriba) ───────────────────

  // ── LED ──────────────────────────────────────────────
  const ledOn = Math.floor(elapsed / 1.0) % 2 === 0;
  ledMat.color.set(
   screen.entryPhase === "glitch"
    ? Math.random() > 0.4
      ? "#ff2000"
      : "#00ff88"
    : screen.entryPhase === "detect"
      ? Math.floor(elapsed * 8) % 2 === 0
        ? "#ffaa00"
        : "#443300"
      : ledOn
        ? "#00ff88"
        : "#001f10",
  );

  // ── Canvas 2D ────────────────────────────────────────
  renderScreen(elapsed, sNorm);

  renderer.render(scene, camera);
  requestRender();
 }

 requestRender();

 // ══════════════════════════════════════════════════════
 // CLEANUP
 // ══════════════════════════════════════════════════════
 // Devolvemos la función de cleanup (compatibilidad con el uso
 // actual de Projects.jsx) pero le adjuntamos referencias a los
 // params y a requestRender para que el GUI pueda enchucharse.
 const cleanup = () => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onResize);
  document.removeEventListener("visibilitychange", onVis);
  canvas.removeEventListener("pointermove", onPointerMove);
  canvas.removeEventListener("pointerleave", onPointerLeave);
  canvas.removeEventListener("click", onCanvasClick);
  canvas.style.cursor = "";
  obs.disconnect();
  if (animFrameId) cancelAnimationFrame(animFrameId);

  haloGeo.dispose();
  haloMat.dispose();
  bodyGeo.dispose();
  bodyMat.dispose();
  biselGeo.dispose();
  biselMat.dispose();
  innerGlowGeo.dispose();
  innerGlowMat.dispose();
  ledGeo.dispose();
  ledMat.dispose();
  stMat.dispose();
  scMat.dispose();
  scTex.dispose();
  renderer.dispose();
 };

 // Exponemos los objetos de params para attachProjectsGUI(gui, refs)
 cleanup.layoutParams = layoutParams;
 cleanup.textParams = textParams;
 cleanup.lightParams = lightParams;
 cleanup.cameraParamsP = cameraParamsP;
 cleanup.entryParams = entryParams;
 cleanup.requestRender = requestRender;

 return cleanup;
}
