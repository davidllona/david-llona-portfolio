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
const PROJECTS = [
 {
  id: 0,
  name: "TemyPlast Configurator",
  year: "2026",
  tagline: "Simulador visual de alfombras a medida",
  description:
   "Configurador 3D donde el cliente elige medidas, color y diseño de alfombra y obtiene en tiempo real una vista realista del producto antes de pedir presupuesto. Pensado para reducir dudas y agilizar el cierre de venta.",
  tags: ["3D Web", "Configurador", "E-commerce"],
  color: "#c97a36",
  images: ["/images/projects/diploma3d.png", "/images/projects/diploma3d.png", "/images/projects/diploma3d.png"],
  link: "https://temyplast.com",
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
  images: ["/images/projects/diploma3d.png", "/images/projects/diploma3d.png"],
  link: null,
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
  images: ["/images/projects/diploma3d.png", "/images/projects/diploma3d.png", "/images/projects/diploma3d.png"],
  link: null,
 },
 {
  id: 3,
  name: "Interactive Room",
  year: "2025–2026",
  tagline: "Escena 3D reactiva con scroll y luz",
  description:
   "Una habitación 3D donde la luz, los objetos y la cámara responden al scroll y al cursor. Un experimento sobre cómo el espacio puede contar una historia sin necesidad de explicarla con texto.",
  tags: ["Three.js", "Scroll-driven", "Iluminación"],
  color: "#7bd389",
  images: ["/images/projects/diploma3d.png", "/images/projects/diploma3d.png"],
  link: null,
 },
];

// ── Scroll layout ──────────────────────────────────────────
const SCROLL_P_START = 0.14;
const SCROLL_P_SPAN = 0.19;
const SCROLL_CAM_START = 0.04;
const SCROLL_CAM_END = 0.13;

// ── Entrada de cámara al inicio de la escena (materialización desde el vacío)
// La cámara empieza más atrás y se acerca suavemente durante el boot
const CAM_ENTRY_START = 7.5; // posición inicial (más atrás = más vacío)

// ── Secuencia de entrada por proyecto ─────────────────────
// Cada proyecto pasa por 4 fases al ser detectado:
// DETECT → GLITCH → STABILIZE → REVEAL
// Los timers son en segundos
const ENTRY_DETECT_DUR = 0.3; // "SEÑAL DETECTADA" parpadeante
const ENTRY_GLITCH_DUR = 0.55; // interferencia
const ENTRY_STABILIZE_DUR = 0.4; // barre de color sólido
const ENTRY_REVEAL_DUR = 0.5; // fade in contenido

export function initProjectsScene(canvas) {
 if (!canvas) {
  console.warn("[ProjectsScene] No canvas provided");
  return () => {};
 }

 // ── Estado general ──────────────────────────────────────
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
 // FOV más estrecho = pantalla más grande y presente
 const CAM_FAR = 5.2;
 const CAM_NEAR = 3.0;

 const camera = new THREE.PerspectiveCamera(36, sizes.width / sizes.height, 0.1, 60);
 // Empieza más atrás — se acerca durante el boot, como si emergiera del vacío
 camera.position.set(0, 0.05, CAM_ENTRY_START);
 scene.add(camera);

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

  const FS = 15;
  const LH = 31;
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
  const t = 1 - timer / ENTRY_DETECT_DUR;

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
  const intensity = timer / ENTRY_GLITCH_DUR;
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
  const t = 1 - timer / ENTRY_STABILIZE_DUR; // 0→1
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

 // ── Polaroid superpuesta ─────────────────────────────────
 // Imagen pequeña con marco oscuro y borde blanco translúcido.
 // Una pequeña marca del color del proyecto en la esquina superior
 // izquierda actúa como "tab de archivo", evitando el conflicto
 // cromático que aparecía cuando todo el borde era de color.
 function drawPolaroid(img, loaded, x, y, w, h, label, sublabel, revealP, color) {
  // Sombra muy sutil — no compite con la imagen principal
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(x + 2, y + 3, w, h);

  // Marco exterior — fondo oscuro tipo dorso de fotografía CRT
  ctx.fillStyle = "#0a0c14";
  ctx.fillRect(x, y, w, h);

  // Borde fino blanco translúcido — neutro, integra mejor con
  // cualquier contenido detrás (el borde de color daba conflicto
  // cromático cuando la imagen de fondo era saturada).
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  // Zona interior de la imagen (deja espacio inferior para etiqueta)
  const PAD = 4;
  const LABEL_H = 11;
  const ix = x + PAD;
  const iy = y + PAD;
  const iw = w - PAD * 2;
  const ih = h - PAD * 2 - LABEL_H;

  if (loaded && img) {
   const revH = Math.round(ih * Math.min(1, Math.max(0, revealP)));

   ctx.save();
   ctx.beginPath();
   ctx.rect(ix, iy, iw, revH);
   ctx.clip();

   const imgRatio = img.naturalWidth / img.naturalHeight;
   const boxRatio = iw / ih;
   let dw, dh, dx, dy;
   if (imgRatio > boxRatio) {
    dh = ih;
    dw = ih * imgRatio;
    dx = ix - (dw - iw) / 2;
    dy = iy;
   } else {
    dw = iw;
    dh = iw / imgRatio;
    dx = ix;
    dy = iy - (dh - ih) / 2;
   }
   ctx.drawImage(img, dx, dy, dw, dh);
   ctx.restore();

   // Overlay sutil
   ctx.fillStyle = "rgba(2,2,10,0.30)";
   ctx.fillRect(ix, iy, iw, ih);
  } else {
   ctx.fillStyle = h2r(C.dim, 0.18);
   ctx.fillRect(ix, iy, iw, ih);
  }

  // Tab de color del proyecto — pequeña marca en la esquina sup.izq
  // (sustituye al borde de color que generaba conflicto cromático)
  ctx.fillStyle = h2r(color, 0.95);
  ctx.fillRect(x, y, 14, 2);

  // Etiqueta inferior dentro del marco
  ctx.font = `8px ${FM}`;
  ctx.fillStyle = h2r(color, 0.9);
  ctx.fillText(label, x + PAD, y + h - 4);

  ctx.fillStyle = h2r(C.dim2, 0.75);
  ctx.fillText("/ " + sublabel, x + PAD + ctx.measureText(label).width + 4, y + h - 4);
 }

 // ── Collage: imagen grande + polaroids superpuestas ──────
 // Estructura: una imagen principal a ancho completo y, sobre
 // ella en la esquina inferior derecha, 1-2 polaroids pequeñas.
 // Distintos tamaños entre las polaroids para crear jerarquía
 // (la #02 más grande como "detalle principal", la #03 más pequeña
 // asomando como "referencia adicional"). Aparecen con retraso
 // respecto al reveal de la principal.
 function drawCollage(idx, revealP) {
  const p = PROJECTS[idx];
  const imgs = screen.images[idx] || [];
  const loaded = screen.imagesLoaded[idx] || [];

  // Imagen principal — ancho completo, más alta que antes
  const SX = 44;
  const MAIN_Y = 60;
  const MAIN_W = TEX_W - SX * 2;
  const MAIN_H = 330;

  drawMainImage(imgs[0], loaded[0], SX, MAIN_Y, MAIN_W, MAIN_H, revealP, p.color);

  // Polaroids superpuestas — esquina inferior derecha
  // Anclaje al borde derecho/inferior de la imagen principal
  const POL_RIGHT = SX + MAIN_W - 16;
  const POL_BOTTOM = MAIN_Y + MAIN_H - 16;

  // Tamaños DIFERENTES para crear jerarquía (la 02 manda)
  const POL2_W = 115;
  const POL2_H = 82;
  const POL3_W = 88;
  const POL3_H = 62;

  // Aparecen cuando el reveal de la principal está avanzado
  const polReveal = Math.max(0, (revealP - 0.55) / 0.45);

  if (polReveal > 0) {
   // #03 (más pequeña, asoma por arriba-izquierda de la #02)
   if (imgs.length >= 3) {
    drawPolaroid(
     imgs[2],
     loaded[2],
     POL_RIGHT - POL2_W - POL3_W * 0.55,
     POL_BOTTOM - POL2_H - POL3_H * 0.55,
     POL3_W,
     POL3_H,
     "03",
     "ESTUDIO",
     polReveal,
     p.color,
    );
   }

   // #02 (más grande, esquina inferior derecha)
   if (imgs.length >= 2) {
    drawPolaroid(
     imgs[1],
     loaded[1],
     POL_RIGHT - POL2_W,
     POL_BOTTOM - POL2_H,
     POL2_W,
     POL2_H,
     "02",
     "DETALLE",
     polReveal,
     p.color,
    );
   }
  }
 }

 // ── Datos del proyecto (debajo de la imagen) ─────────────
 // Layout vertical: nombre + año en una línea, tagline y
 // descripción larga. Mantiene la jerarquía de la versión
 // original pero con descripción explicativa más extensa.
 function drawData(idx, fade, elapsed) {
  const p = PROJECTS[idx];
  const SX = 44;
  const MAIN_Y = 60;
  const MAIN_H = 330;
  const MAIN_BOTTOM = MAIN_Y + MAIN_H; // 390

  // ── Header: transmisión + estado de señal ─────────────
  const headerY = 36;

  ctx.fillStyle = h2r(C.dim, fade * 0.8);
  ctx.fillRect(SX, headerY + 8, TEX_W - SX * 2, 1);

  ctx.font = `10px ${FM}`;
  ctx.fillStyle = h2r(p.color, fade);
  ctx.fillText("TRANSMISIÓN", SX, headerY);

  ctx.font = `bold 10px ${FM}`;
  ctx.fillStyle = h2r(C.white, fade);
  ctx.fillText(`0${idx + 1}`, SX + 98, headerY);

  ctx.font = `10px ${FM}`;
  ctx.fillStyle = h2r(C.dim2, fade * 0.85);
  ctx.fillText("/ 04", SX + 118, headerY);

  // Status (derecha, con pulso)
  const statusX = TEX_W - SX - 120;
  const sigPulse = Math.sin(elapsed * 3.5) * 0.5 + 0.5;
  ctx.font = `10px ${FM}`;
  ctx.fillStyle = h2r(C.green, fade * (0.65 + sigPulse * 0.3));
  ctx.fillText("● SEÑAL ESTABLE", statusX, headerY);

  // ── Bloque de datos: arranca debajo de la imagen ──────
  let DY = MAIN_BOTTOM + 28;

  // Línea separadora encima del nombre
  ctx.fillStyle = h2r(C.dim, fade * 0.7);
  ctx.fillRect(SX, DY - 16, TEX_W - SX * 2, 1);

  // Nombre — protagonista tipográfico
  ctx.font = `bold 22px ${FM}`;
  ctx.fillStyle = h2r(C.white, fade);
  ctx.fillText(p.name, SX, DY);
  const nameW = ctx.measureText(p.name).width;

  // Año al lado del nombre
  ctx.font = `11px ${FM}`;
  ctx.fillStyle = h2r(p.color, fade);
  ctx.fillText(p.year, SX + nameW + 16, DY);

  // Línea de acento bajo el nombre
  ctx.fillStyle = h2r(p.color, fade * 0.9);
  ctx.fillRect(SX, DY + 6, nameW, 2);

  DY += 28;

  // Tagline
  ctx.font = `13px ${FM}`;
  ctx.fillStyle = h2r(C.offwhite, fade * 0.92);
  ctx.fillText(p.tagline, SX, DY);
  DY += 22;

  // Descripción larga (ancho recortado para no chocar con el watermark "0X")
  const DESC_W = TEX_W - SX * 2 - 140;
  const descLines = wrapText(p.description, DESC_W, `11px ${FM}`).slice(0, 3);
  ctx.font = `11px ${FM}`;
  ctx.fillStyle = h2r(C.offwhite, fade * 0.78);
  descLines.forEach((line, i) => {
   ctx.fillText(line, SX, DY + i * 16);
  });

  // ── Footer ─────────────────────────────────────────────
  const footerY = TEX_H - 26;

  ctx.fillStyle = h2r(C.dim, fade * 0.55);
  ctx.fillRect(SX, footerY - 14, TEX_W - SX * 2, 1);

  if (p.link) {
   ctx.font = `11px ${FM}`;
   ctx.fillStyle = h2r(C.cyan, fade);
   ctx.fillText("▶", SX, footerY);
   ctx.fillStyle = h2r(C.cyan, fade * 0.9);
   ctx.fillText(p.link, SX + 18, footerY);
  } else {
   ctx.font = `10px ${FM}`;
   ctx.fillStyle = h2r(C.dim2, fade * 0.85);
   ctx.fillText("ARCHIVO  ·  AÚN NO DESPLEGADO", SX, footerY);
  }

  // Watermark del número — inferior derecha
  ctx.font = `bold 96px ${FM}`;
  ctx.fillStyle = h2r(p.color, fade * 0.06);
  ctx.fillText(`0${idx + 1}`, TEX_W - 160, TEX_H - 18);
 }

 // ── Render principal ─────────────────────────────────────
 function renderScreen(elapsed, scrollNorm) {
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
    const revealP = screen.entryPhase === "done" ? 1 : Math.min(1, 1 - screen.entryTimer / ENTRY_REVEAL_DUR);
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
   requestRender();
  }, 80);
 };
 window.addEventListener("resize", onResize, { passive: true });

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
  const sEl = canvas.closest("[data-projects-section]") || canvas.parentElement?.parentElement;
  const sTop = sEl ? sEl.getBoundingClientRect().top + window.scrollY : 0;
  const sH = sizes.height * 5.5;
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

  // El índice activo solo puede avanzar de uno en uno.
  // Si el scroll objetivo es mayor que prevActive+1, avanzamos
  // solo hasta prevActive+1 — el siguiente tick avanzará más.
  // Esto garantiza que la secuencia de entrada se ejecuta siempre.
  let newActive = screen.prevActive;

  if (scrollTarget > screen.prevActive) {
   // Solo avanzar si la secuencia de entrada del proyecto actual terminó
   const entryDone = screen.entryPhase === "done" || screen.entryPhase === "idle";
   if (entryDone) {
    newActive = screen.prevActive + 1; // avanzar un paso
   }
  } else if (scrollTarget < screen.prevActive) {
   // Al hacer scroll hacia atrás: retrocede libremente
   newActive = scrollTarget;
  }

  // Clamp al rango válido
  newActive = Math.max(-1, Math.min(PROJECTS.length - 1, newActive));

  // ── Cambio de proyecto → reinicia secuencia de entrada
  if (newActive !== screen.prevActive) {
   screen.prevActive = newActive;
   screen.activeProject = newActive;
   if (newActive >= 0) {
    screen.entryPhase = "detect";
    screen.entryTimer = ENTRY_DETECT_DUR;
    screen.lightColorTarget.set(PROJECTS[newActive].color);
    screen.lightPulse = 1.0;
   } else {
    screen.entryPhase = "idle";
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
      screen.entryTimer = ENTRY_GLITCH_DUR;
      break;
     case "glitch":
      screen.entryPhase = "stabilize";
      screen.entryTimer = ENTRY_STABILIZE_DUR;
      break;
     case "stabilize":
      screen.entryPhase = "reveal";
      screen.entryTimer = ENTRY_REVEAL_DUR;
      break;
     case "reveal":
      screen.entryPhase = "done";
      screen.entryTimer = 0;
      break;
    }
   }
  }

  // ── Cámara ───────────────────────────────────────────
  // Durante el boot la cámara se aproxima desde el vacío hasta CAM_FAR
  // Después el scroll la lleva de CAM_FAR a CAM_NEAR
  if (!screen.bootDone) {
   // Aproximación suave durante el boot: CAM_ENTRY_START → CAM_FAR
   const bootEase =
    screen.bootProgress < 0.5
     ? 4 * screen.bootProgress * screen.bootProgress * screen.bootProgress
     : 1 - Math.pow(-2 * screen.bootProgress + 2, 3) / 2;
   camera.position.z = lerp(CAM_ENTRY_START, CAM_FAR, bootEase);
  } else {
   const camT = easeIO(Math.min(1, Math.max(0, (sNorm - SCROLL_CAM_START) / (SCROLL_CAM_END - SCROLL_CAM_START))));
   camera.position.z = lerp(CAM_FAR, CAM_NEAR, camT);
  }
  // Flotación muy suave — da vida sin distraer
  camera.position.y = 0.05 + Math.sin(elapsed * 0.28) * 0.04;
  camera.position.x = Math.sin(elapsed * 0.15) * 0.018;

  // ── Luces reactivas ──────────────────────────────────
  screen.lightColor.lerp(screen.lightColorTarget, 0.03);

  screen.lightPulse = Math.max(0, screen.lightPulse - delta * 1.4);
  const pulseBoost = screen.lightPulse * 2.0;

  // Intensidad más alta — carcasa recibe color visible y la pantalla brilla
  const baseInt = screen.activeProject >= 0 ? 4.5 : 0.0;
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
  haloLight.intensity = lerp(haloLight.intensity, screen.activeProject >= 0 ? 0.85 : 0.4, 0.03);

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
 return () => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onResize);
  document.removeEventListener("visibilitychange", onVis);
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
}
