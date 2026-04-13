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
const PROJECTS = [
 {
  id: 0,
  name: "TemyPlast Configurator",
  year: "2026",
  tagline: "Simulador visual de alfombras a medida",
  color: "#c97a36",
  image: "/images/projects/temyplast.jpg",
  link: "https://temyplast.com",
 },
 {
  id: 1,
  name: "Diploma3D System",
  year: "2026",
  tagline: "Generación dinámica de diplomas en 3D",
  color: "#5b8cff",
  image: "/images/projects/diploma3d.jpg",
  link: null,
 },
 {
  id: 2,
  name: "Space Portfolio",
  year: "2026",
  tagline: "Experiencia interactiva en Three.js narrativa",
  color: "#ff6b4a",
  image: "/images/projects/portfolio.jpg",
  link: null,
 },
 {
  id: 3,
  name: "Interactive Room",
  year: "2025–2026",
  tagline: "Escena 3D reactiva con scroll y luz",
  color: "#7bd389",
  image: "/images/projects/room.jpg",
  link: null,
 },
];

// ── Scroll layout ──────────────────────────────────────────
const SCROLL_P_START = 0.14;
const SCROLL_P_SPAN = 0.19;
const SCROLL_CAM_START = 0.04;
const SCROLL_CAM_END = 0.13;

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
 PROJECTS.forEach((p, i) => {
  screen.imagesLoaded[i] = false;
  const img = new Image();
  img.onload = () => {
   screen.imagesLoaded[i] = true;
  };
  img.onerror = () => {};
  img.src = p.image;
  screen.images[i] = img;
 });

 // ══════════════════════════════════════════════════════
 // SCENE
 // ══════════════════════════════════════════════════════
 const scene = new THREE.Scene();
 scene.background = new THREE.Color("#03030a");
 scene.fog = new THREE.FogExp2("#03030a", 0.13);

 const sizes = {
  width: canvas.clientWidth || window.innerWidth,
  height: canvas.clientHeight || window.innerHeight,
 };

 // ── Cámara ──────────────────────────────────────────────
 // FOV más estrecho = pantalla más grande y presente
 const CAM_FAR = 5.2;
 const CAM_NEAR = 3.0;

 const camera = new THREE.PerspectiveCamera(36, sizes.width / sizes.height, 0.1, 60);
 camera.position.set(0, 0.05, CAM_FAR);
 scene.add(camera);

 // ── Renderer ────────────────────────────────────────────
 const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  stencil: false,
  depth: true,
  powerPreference: "high-performance",
 });
 renderer.setSize(sizes.width, sizes.height);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
 renderer.outputColorSpace = THREE.SRGBColorSpace;
 renderer.shadowMap.enabled = false;

 // ══════════════════════════════════════════════════════
 // POLVO ESPACIAL
 // ══════════════════════════════════════════════════════
 const DUST_N = 380;
 const dPos = new Float32Array(DUST_N * 3);
 const dAlpha = new Float32Array(DUST_N); // opacidades individuales
 for (let i = 0; i < DUST_N; i++) {
  dPos[i * 3] = (Math.random() - 0.5) * 18;
  dPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
  dPos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 1;
  dAlpha[i] = Math.random();
 }
 const dustGeo = new THREE.BufferGeometry();
 dustGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
 const dustMat = new THREE.PointsMaterial({
  color: "#1e2440",
  size: 0.018,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
  sizeAttenuation: true,
 });
 const dustPoints = new THREE.Points(dustGeo, dustMat);
 scene.add(dustPoints);

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
 scene.add(new THREE.AmbientLight("#0d1020", 0.55));

 // Rim trasero — hace flotar la pantalla en el void
 const rimBack = new THREE.DirectionalLight("#080d28", 0.45);
 rimBack.position.set(0, 2, -5);
 scene.add(rimBack);

 // Rim lateral izquierdo — forma la carcasa
 const rimLeft = new THREE.DirectionalLight("#050810", 0.3);
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
  bg: "#06070f", // levantado de #02020a — da separación real vs texto
  green: "#00f07a", // más brillante — se lee en fondo oscuro
  gdim: "#006838",
  amber: "#f0ac38", // más luminoso
  white: "#eef2ff", // casi blanco — máximo contraste sin romper atmósfera
  offwhite: "#b8c2e0", // subido desde #a8b0d0
  dim: "#2e3450", // subido — separadores visibles
  dim2: "#3a4468", // subido — texto secundario legible
  cyan: "#50e8ff", // más brillante
  cyanDim: "#0d4050",
  red: "#e03030",
  scan: "rgba(0,0,0,0.10)", // menos agresivo — no aplasta el texto
  scan2: "rgba(255,255,255,0.015)",
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
   { t: "NAV-COMM  /  TRANSMISSION ARCHIVE  v3.1", c: C.offwhite, d: 0.0, bold: true },
   { t: "─────────────────────────────────────────", c: C.dim2, d: 0.07, bold: false },
   { t: "INITIALIZING SIGNAL ARRAY...", c: C.gdim, d: 0.18, bold: false },
   { t: "CARRIER LOCK  ···  ESTABLISHED", c: C.green, d: 0.42, bold: false },
   { t: "─────────────────────────────────────────", c: C.dim, d: 0.52, bold: false },
   { t: "ARCHIVE ENTRIES FOUND  ·  04", c: C.amber, d: 0.64, bold: true },
   { t: "─────────────────────────────────────────", c: C.dim, d: 0.74, bold: false },
   { t: "SCROLL TO RECEIVE  ↓", c: C.cyan, d: 0.84, bold: false },
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
    ctx.fillText("_", SX + ctx.measureText("SCROLL TO RECEIVE  ↓").width + 6, lastY);
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
   ctx.fillText("◈  INCOMING TRANSMISSION DETECTED", TEX_W * 0.5 - 200, TEX_H * 0.5 - 10);

   ctx.font = `11px ${FM}`;
   ctx.fillStyle = h2r(C.dim2, 0.8);
   ctx.fillText(`ENTRY  0${idx + 1} / 04  ·  CLASSIFYING...`, TEX_W * 0.5 - 150, TEX_H * 0.5 + 16);
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

  // Fragmentos de imagen (si cargada)
  if (screen.imagesLoaded[idx]) {
   const img = screen.images[idx];
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
   ctx.fillText("▒▒  SIGNAL CORRUPTED  ▒▒", 44, TEX_H * 0.5);
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
   ctx.fillText("SIGNAL STABILIZED  ·  DECODING ARCHIVE ENTRY", 44, TEX_H - 22);
  }
 }

 // ── Imagen con escáner ───────────────────────────────────
 function drawImage(idx, revealP) {
  if (!screen.imagesLoaded[idx]) {
   // Placeholder de "cargando"
   const MX = 44,
    MY = 60;
   const IW = TEX_W - MX * 2,
    IH = Math.round(IW * 0.5);
   ctx.strokeStyle = h2r(C.dim2, 0.5);
   ctx.lineWidth = 1;
   ctx.strokeRect(MX, MY, IW, IH);
   ctx.font = `12px ${FM}`;
   ctx.fillStyle = h2r(C.dim2, 0.6);
   ctx.fillText("[ LOADING IMAGE... ]", MX + IW * 0.5 - 80, MY + IH * 0.5);
   return;
  }

  const img = screen.images[idx];
  const MX = 44,
   MY = 60;
  const IW = TEX_W - MX * 2;
  const IH = Math.round(IW * 0.5);
  const revH = Math.round(IH * revealP);

  // Imagen recortada con reveal top→bottom
  ctx.save();
  ctx.beginPath();
  ctx.rect(MX, MY, IW, revH);
  ctx.clip();
  ctx.drawImage(img, MX, MY, IW, IH);
  ctx.restore();

  // Overlay muy sutil para integrar imagen con pantalla
  ctx.fillStyle = "rgba(2,2,10,0.32)";
  ctx.fillRect(MX, MY, IW, IH);

  // Borde fino alrededor de la imagen
  ctx.strokeStyle = h2r(C.dim, 0.8);
  ctx.lineWidth = 1;
  ctx.strokeRect(MX, MY, IW, IH);

  // Línea de escáner animada
  if (revealP < 1) {
   const scanY = MY + revH;
   const sg = ctx.createLinearGradient(MX, scanY - 12, MX, scanY + 4);
   sg.addColorStop(0, "rgba(56,216,240,0)");
   sg.addColorStop(0.6, "rgba(56,216,240,0.9)");
   sg.addColorStop(1, "rgba(56,216,240,0)");
   ctx.fillStyle = sg;
   ctx.fillRect(MX, scanY - 12, IW, 16);

   // Coordenadas de escáner (decorativo)
   ctx.font = `10px ${FM}`;
   ctx.fillStyle = h2r(C.cyan, 0.6);
   ctx.fillText(
    `SCAN  ${Math.round(revealP * 100)
     .toString()
     .padStart(3, "0")}%`,
    MX + IW - 80,
    scanY - 3,
   );
  }
 }

 // ── Datos del proyecto ───────────────────────────────────
 function drawData(idx, fade, elapsed) {
  const p = PROJECTS[idx];
  const SX = 44;
  const IH = Math.round((TEX_W - SX * 2) * 0.5);
  const IY = 60;
  const DATA_TOP = IY + IH + 22;

  // ── Header: número de transmisión ──────────────────────
  ctx.fillStyle = h2r(C.dim, fade * 1.0);
  ctx.fillRect(SX, IY - 14, TEX_W - SX * 2, 1);

  ctx.font = `10px ${FM}`;
  ctx.fillStyle = h2r(p.color, fade * 1.0); // de 0.85 → 1.0
  ctx.fillText("TRANSMISSION", SX, IY - 2);

  ctx.font = `bold 10px ${FM}`;
  ctx.fillStyle = h2r(C.white, fade * 1.0); // de 0.9 → 1.0
  ctx.fillText(`0${idx + 1}`, SX + 98, IY - 2);

  ctx.font = `10px ${FM}`;
  ctx.fillStyle = h2r(C.dim2, fade * 0.9); // de 0.7 → 0.9
  ctx.fillText(`/ 04`, SX + 118, IY - 2);

  // Estado de señal (derecha)
  const statusX = TEX_W - SX - 120;
  const sigPulse = Math.sin(elapsed * 3.5) * 0.5 + 0.5;
  ctx.font = `10px ${FM}`;
  ctx.fillStyle = h2r(C.green, fade * (0.7 + sigPulse * 0.3)); // de 0.5 → 0.7 base
  ctx.fillText("● SIGNAL STABLE", statusX, IY - 2);

  // ── Zona inferior ──────────────────────────────────────
  const bottomZone = TEX_H - 30;
  const nameY = bottomZone - 112;

  ctx.fillStyle = h2r(C.dim, fade * 0.8);
  ctx.fillRect(SX, DATA_TOP - 4, TEX_W - SX * 2, 1);

  // Nombre — protagonista tipográfico
  ctx.font = `bold 26px ${FM}`;
  ctx.fillStyle = h2r(C.white, fade * 1.0); // de fade → fade*1.0 explícito
  ctx.fillText(p.name, SX, nameY);

  // Línea de acento
  const nameW = ctx.measureText(p.name).width;
  ctx.fillStyle = h2r(p.color, fade * 0.9); // de 0.7 → 0.9
  ctx.fillRect(SX, nameY + 5, nameW, 2);

  // Año
  ctx.font = `11px ${FM}`;
  ctx.fillStyle = h2r(p.color, fade * 1.0); // de 0.9 → 1.0
  ctx.fillText(p.year, SX + nameW + 16, nameY);

  // Tagline
  ctx.font = `13px ${FM}`;
  ctx.fillStyle = h2r(C.offwhite, fade * 0.92); // de 0.72 → 0.92
  ctx.fillText(p.tagline, SX, nameY + 28);

  // Separador
  ctx.fillStyle = h2r(C.dim, fade * 0.6);
  ctx.fillRect(SX, bottomZone - 48, TEX_W - SX * 2, 1);

  // Link / CTA
  if (p.link) {
   ctx.font = `11px ${FM}`;
   ctx.fillStyle = h2r(C.cyan, fade * 1.0); // de 0.9 → 1.0
   ctx.fillText("▶", SX, bottomZone - 26);
   ctx.fillStyle = h2r(C.cyan, fade * 0.88); // de 0.75 → 0.88
   ctx.fillText(p.link, SX + 18, bottomZone - 26);
  } else {
   ctx.font = `10px ${FM}`;
   ctx.fillStyle = h2r(C.dim2, fade * 0.85); // de 0.7 → 0.85
   ctx.fillText("ARCHIVE  ·  NOT YET DEPLOYED", SX, bottomZone - 26);
  }

  // Watermark decorativo
  ctx.font = `bold 96px ${FM}`;
  ctx.fillStyle = h2r(p.color, fade * 0.055); // de 0.04 → 0.055
  ctx.fillText(`0${idx + 1}`, TEX_W - 160, TEX_H - 20);
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
    const pStart = SCROLL_P_START + proj * SCROLL_P_SPAN;
    const pEnd = pStart + SCROLL_P_SPAN;
    const pNorm = Math.max(0, Math.min(1, (scrollNorm - pStart) / (pEnd - pStart)));
    const revealP = Math.max(0, (pNorm - 0.28) / 0.72);
    const fadeIn = screen.entryPhase === "done" ? 1.0 : Math.min(1, 1 - screen.entryTimer / ENTRY_REVEAL_DUR);

    drawImage(proj, revealP);
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
  const camT = easeIO(Math.min(1, Math.max(0, (sNorm - SCROLL_CAM_START) / (SCROLL_CAM_END - SCROLL_CAM_START))));
  camera.position.z = lerp(CAM_FAR, CAM_NEAR, camT);
  // Flotación muy suave — da vida sin distraer
  camera.position.y = 0.05 + Math.sin(elapsed * 0.28) * 0.04;
  camera.position.x = Math.sin(elapsed * 0.15) * 0.018;

  // ── Luces reactivas ──────────────────────────────────
  screen.lightColor.lerp(screen.lightColorTarget, 0.03);

  screen.lightPulse = Math.max(0, screen.lightPulse - delta * 1.4);
  const pulseBoost = screen.lightPulse * 2.0;

  // Intensidad base más alta para que la carcasa reciba color visible
  const baseInt = screen.activeProject >= 0 ? 3.2 : 0.0;
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
  haloLight.intensity = lerp(haloLight.intensity, screen.activeProject >= 0 ? 0.6 : 0.25, 0.03);

  // Flicker sutil
  if (screen.activeProject >= 0 && screen.entryPhase === "done") {
   reactiveLight.intensity *= 1 + (Math.random() - 0.5) * 0.035;
  }

  // ── Borde interior de pantalla reactivo ──────────────
  if (screen.activeProject >= 0) {
   innerGlowMat.color.copy(screen.lightColor);
   innerGlowMat.opacity = lerp(
    innerGlowMat.opacity,
    screen.entryPhase === "done" ? 0.72 : 0.45, // de 0.5/0.3 → 0.72/0.45
    0.05,
   );
  } else {
   innerGlowMat.opacity = lerp(innerGlowMat.opacity, 0.0, 0.04);
  }

  // ── Polvo ────────────────────────────────────────────
  dustPoints.rotation.y = elapsed * 0.006;
  dustPoints.rotation.x = elapsed * 0.0025;
  // El polvo se tintifica ligeramente con el color del proyecto
  if (screen.activeProject >= 0) {
   dustMat.color.lerp(new THREE.Color(PROJECTS[screen.activeProject].color).multiplyScalar(0.18), 0.02);
  } else {
   dustMat.color.lerp(new THREE.Color("#1e2440"), 0.02);
  }

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

  dustGeo.dispose();
  dustMat.dispose();
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
