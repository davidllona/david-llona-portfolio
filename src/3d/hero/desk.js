import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadingManager } from "../loadingManager";


export function buildDesk({ scene, requestRender, onDeskReady }) {
 // ════════════════════════════════════════════════════════════════════════
 // CONFIG EN VIVO DE LA PANTALLA WIREFRAME
 // ════════════════════════════════════════════════════════════════════════
 // GUI puede ajustar fps y speed en tiempo real.
 const wireScreen = {
  fps: 30,
  speed: 1.0,
 };

 // ════════════════════════════════════════════════════════════════════════
 // ESCRITORIO — estado y cola de adjuntos
 // ════════════════════════════════════════════════════════════════════════
 const deskLoader = new GLTFLoader(loadingManager);
 const monitorLoader = new GLTFLoader(loadingManager);

 let deskRoot = null;
 let deskAnchor = null;
 let deskYaw = null;
 let deskFix = null;
 let deskTopSupport = null;

 const deskSupportMeshes = [];

 // Cola de adjuntos pendientes al deskAnchor (evita race conditions
 // si un modelo carga antes que la mesa)
 const pendingDeskChildren = [];
 const attachToDesk = (child) => {
  if (deskAnchor) {
   deskAnchor.add(child);
  } else {
   pendingDeskChildren.push(child);
  }
 };

 const deskParams = {
  scale: 0.024,
  x: 0.15,
  y: 0,
  z: 0.35,
  rotY: 0.03,
  brightness: 0.5,
  wallGapLeft: 0.02,
  wallGapBack: 0.02,

  supportWidth: 3.0,
  supportDepth: 1.2,
  supportYOffset: 0.01,
  showSupport: false,
 };

 // Corrección interna del GLB, igual filosofía que la silla
 const deskFixParams = {
  posX: 0,
  posY: 0,
  posZ: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
 };

 // ════════════════════════════════════════════════════════════════════════
 // MONITORES — estado
 // ════════════════════════════════════════════════════════════════════════
 let monitorLeftRoot = null;
 let monitorRightRoot = null;

 let monitorLeftAnchor = null;
 let monitorRightAnchor = null;

 let monitorLeftFix = null;
 let monitorRightFix = null;

 const monitorParams = {
  scale: 2,
  brightness: 0.6,

  yOffset: 0.01,
  zOffset: 0.02,

  gap: 2.201,

  leftX: -0.42,
  rightX: 0.42,

  rotY: -1.5,
  rotX: 0,
  rotZ: 0,

  tiltLeftY: 0.288,
  tiltRightY: -0.288,
 };

 const monitorFixParams = {
  posX: -0.18,
  posY: 0,
  posZ: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
 };

 // ════════════════════════════════════════════════════════════════════════
 // HELPERS DE MATERIALES (shared por todos los monitores)
 // ════════════════════════════════════════════════════════════════════════
 function applyMonitorMaterialTweaks(root) {
  if (!root) return;

  root.traverse((child) => {
   if (!child.isMesh) return;

   child.castShadow = false;
   child.receiveShadow = false;

   const materials = Array.isArray(child.material) ? child.material : [child.material];

   materials.forEach((mat) => {
    if (!mat) return;

    if ("roughness" in mat) mat.roughness = Math.max(mat.roughness ?? 0.75, 0.45);
    if ("metalness" in mat) mat.metalness = Math.min(mat.metalness ?? 0.1, 0.25);
    if ("envMapIntensity" in mat) mat.envMapIntensity = 0.8;

    if (mat.color) {
     mat.userData.__baseColor = mat.color.clone();
     mat.color.copy(mat.userData.__baseColor).multiplyScalar(monitorParams.brightness);
    }
   });
  });
 }

 function centerMonitorRoot(root) {
  if (!root) return;

  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.updateMatrixWorld(true);

  const rawBox = new THREE.Box3().setFromObject(root);
  const rawCenter = rawBox.getCenter(new THREE.Vector3());

  root.position.set(-rawCenter.x, -rawBox.min.y, -rawCenter.z);
  root.updateMatrixWorld(true);
 }

 function updateMonitorBrightness(root) {
  if (!root) return;

  root.traverse((child) => {
   if (!child.isMesh) return;

   const applyBrightness = (mat) => {
    if (!mat || !mat.color) return;

    if (!mat.userData.__baseColor) {
     mat.userData.__baseColor = mat.color.clone();
    }

    mat.color.copy(mat.userData.__baseColor).multiplyScalar(monitorParams.brightness);
   };

   if (Array.isArray(child.material)) {
    child.material.forEach(applyBrightness);
   } else {
    applyBrightness(child.material);
   }
  });
 }

 // ════════════════════════════════════════════════════════════════════════
 // PANTALLAS PROCEDURALES — canvas animados
 // ════════════════════════════════════════════════════════════════════════
 // Lista de updaters de pantalla — el tick los llama con elapsedTime cada
 // frame. Cada updater decide internamente si redibujar o no (throttling
 // por deltaTime).
 const screenAnimators = [];

 
 function makeCodeScreenTexture() {
  const W = 1024,
   H = 640;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  // Script que se irá escribiendo línea a línea
  const script = [
   { t: "import * as THREE from 'three';", cls: "kw" },
   { t: "import { GLTFLoader } from 'three/loader';", cls: "kw" },
   { t: "", cls: "" },
   { t: "export function initHeroScene() {", cls: "fn" },
   { t: "  const scene = new THREE.Scene();", cls: "var" },
   { t: "  const camera = new THREE.PerspectiveCamera(", cls: "var" },
   { t: "    35, window.innerWidth / window.innerHeight,", cls: "num" },
   { t: "    0.1, 100", cls: "num" },
   { t: "  );", cls: "" },
   { t: "", cls: "" },
   { t: "  // cinematic lighting setup", cls: "cmt" },
   { t: "  const moonLight = new THREE.DirectionalLight(", cls: "var" },
   { t: "    '#8a9cff', 1.0", cls: "str" },
   { t: "  );", cls: "" },
   { t: "  scene.add(moonLight);", cls: "var" },
   { t: "", cls: "" },
   { t: "  return () => cleanup();", cls: "kw" },
   { t: "}", cls: "fn" },
  ];

  const palette = {
   kw: "#b48aff",
   fn: "#6ad0ff",
   var: "#d5deee",
   num: "#ffb977",
   str: "#8ae2a3",
   cmt: "#4e5a75",
   "": "#d5deee",
  };
  const sidebar = [
   "▸ src",
   "  ├ App.jsx",
   "  ├ Hero.jsx",
   "  ├ Projects.jsx",
   "  ├ About.jsx",
   "  └ Contact.jsx",
   "▸ 3d",
   "  ├ heroScene.js",
   "  └ utils.js",
   "▸ textures",
   "▸ public",
  ];

  let lineIdx = 0;
  let charIdx = 0;
  let lastStep = 0;
  let nextDelay = 0.09;
  let pauseUntil = 0;
  let scrollOffset = 0;

  function draw(elapsed) {
   c.fillStyle = "#0f131d";
   c.fillRect(0, 0, W, H);

   c.fillStyle = "#0a0d15";
   c.fillRect(0, 0, 160, H);
   c.fillStyle = "#2a3650";
   c.font = "12px -apple-system, 'Segoe UI', monospace";
   sidebar.forEach((f, i) => c.fillText(f, 10, 40 + i * 20));

   c.fillStyle = "#161b28";
   c.fillRect(160, 0, W - 160, 28);
   c.fillStyle = "#8aa0c8";
   c.font = "11px monospace";
   c.fillText("heroScene.js  ●", 180, 19);

   const startX = 160,
    gutterW = 40,
    lineH = 20;
   c.font = "12px 'Menlo', 'Consolas', monospace";
   const maxVisible = Math.floor((H - 54 - 22) / lineH);
   const firstVisible = scrollOffset;
   const lastVisible = Math.min(script.length, firstVisible + maxVisible);

   for (let i = firstVisible; i < lastVisible; i++) {
    const y = 54 + (i - firstVisible) * lineH;
    c.fillStyle = "#3a4666";
    c.fillText(String(i + 1).padStart(2, " "), startX + 6, y);

    const ln = script[i];
    const fullText = ln.t;
    const text = i < lineIdx ? fullText : i === lineIdx ? fullText.slice(0, charIdx) : "";
    c.fillStyle = palette[ln.cls] || palette[""];
    c.fillText(text, startX + gutterW, y);

    if (i === lineIdx) {
     const blink = Math.floor(elapsed * 2) % 2 === 0;
     if (blink) {
      const cursorX = startX + gutterW + c.measureText(text).width + 1;
      c.fillStyle = "#d5deee";
      c.fillRect(cursorX, y - 11, 6, 14);
     }
    }
   }

   c.fillStyle = "#1a2135";
   c.fillRect(0, H - 22, W, 22);
   c.fillStyle = "#6a7fa8";
   c.font = "10px monospace";
   const colNum = (lineIdx < script.length ? charIdx : script[script.length - 1].t.length) + 1;
   c.fillText(`main  ●  JavaScript  UTF-8  Ln ${lineIdx + 1}, Col ${colNum}`, 170, H - 8);

   tex.needsUpdate = true;
  }

  draw(0);

  const update = (elapsed) => {
   if (elapsed < pauseUntil) {
    if (elapsed - lastStep > 0.15) {
     lastStep = elapsed;
     draw(elapsed);
    }
    return;
   }

   if (elapsed - lastStep < nextDelay) {
    if (elapsed - lastStep > 0.25) draw(elapsed);
    return;
   }

   lastStep = elapsed;

   if (lineIdx >= script.length) {
    pauseUntil = elapsed + 4.0;
    lineIdx = 0;
    charIdx = 0;
    scrollOffset = 0;
    draw(elapsed);
    return;
   }

   const line = script[lineIdx];
   if (charIdx < line.t.length) {
    charIdx++;
    const ch = line.t[charIdx - 1];
    nextDelay = 0.07 + Math.random() * 0.07;
    if (ch === " " || ch === "." || ch === ",") nextDelay += 0.05;
   } else {
    lineIdx++;
    charIdx = 0;
    nextDelay = 0.02;
    pauseUntil = elapsed + (line.t === "" ? 0.15 : 0.35 + Math.random() * 0.5);
    const maxVisible = Math.floor((H - 54 - 22) / 20);
    if (lineIdx - scrollOffset >= maxVisible) scrollOffset = lineIdx - maxVisible + 1;
   }

   draw(elapsed);
  };

  screenAnimators.push(update);
  return tex;
 }

 
 function makeWireframeViewerScreenTexture() {
  // Canvas final 460×300 — mitad de píxeles que el original sin pérdida
  // visible a la distancia a la que se ve desde la cámara.
  const W = 460;
  const H = 300;

  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const COL = {
   bg: "#0b1020",
   panel: "#0d1526",
   grid: "#182338",
   gridStrong: "#25344f",
   wire: "#6ad0ff",
   wireSoft: "rgba(61, 123, 168, 0.38)",
   wireFront: "rgba(106, 208, 255, 0.88)",
   label: "#8aa0c8",
   accent: "#b48aff",
   dim: "#3a4666",
  };

  // ── Geometrías ─────────────────────────────────────────────────────────
  const CUBE = (() => {
   const v = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
   ];
   const e = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
   ];
   return { v, e };
  })();

  const ICO = (() => {
   const t = (1 + Math.sqrt(5)) / 2;
   const v = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
   ];
   const n = v.map((p) => {
    const l = Math.hypot(p[0], p[1], p[2]);
    return [p[0] / l, p[1] / l, p[2] / l];
   });
   const e = [
    [0, 11],
    [0, 5],
    [0, 1],
    [0, 7],
    [0, 10],
    [1, 5],
    [1, 7],
    [1, 8],
    [1, 9],
    [2, 3],
    [2, 4],
    [2, 6],
    [2, 10],
    [2, 11],
    [3, 4],
    [3, 6],
    [3, 8],
    [3, 9],
    [4, 5],
    [4, 9],
    [4, 11],
    [5, 9],
    [5, 11],
    [6, 7],
    [6, 8],
    [6, 10],
    [7, 8],
    [7, 10],
    [8, 9],
    [10, 11],
   ];
   return { v: n, e };
  })();

  const TORUS = (() => {
   const R = 0.9,
    r = 0.35,
    nU = 10,
    nV = 6;
   const v = [];
   for (let i = 0; i < nU; i++) {
    const u = (i / nU) * Math.PI * 2;
    for (let j = 0; j < nV; j++) {
     const th = (j / nV) * Math.PI * 2;
     v.push([(R + r * Math.cos(th)) * Math.cos(u), r * Math.sin(th), (R + r * Math.cos(th)) * Math.sin(u)]);
    }
   }
   const e = [];
   for (let i = 0; i < nU; i++) {
    for (let j = 0; j < nV; j++) {
     const a = i * nV + j;
     const b = i * nV + ((j + 1) % nV);
     const cIx = ((i + 1) % nU) * nV + j;
     e.push([a, b]);
     e.push([a, cIx]);
    }
   }
   return { v, e };
  })();

  // ── Proyección ortográfica ─────────────────────────────────────────────
  const project = (v, rx, ry, cx, cy, s) => {
   const cosX = Math.cos(rx),
    sinX = Math.sin(rx);
   const cosY = Math.cos(ry),
    sinY = Math.sin(ry);
   let x = v[0] * cosY - v[2] * sinY;
   let z = v[0] * sinY + v[2] * cosY;
   let y = v[1] * cosX - z * sinX;
   z = v[1] * sinX + z * cosX;
   return [cx + x * s, cy - y * s, z];
  };

  // ── Layout calculado una sola vez ──────────────────────────────────────
  const headerH = 34;
  const footY = H - 40;
  const pad = 14;
  const vpY = headerH + pad;
  const vpH = H - headerH - pad - 50;
  const vpW = (W - pad * 4) / 3;

  const viewports = [
   {
    x: pad + 0 * (vpW + pad),
    geo: CUBE,
    rxBase: 0.35,
    ryFactor: 0.3,
    rxFactor: 0.2,
    label: "// CUBE",
    idx: 1,
    verts: 8,
    edges: 12,
   },
   {
    x: pad + 1 * (vpW + pad),
    geo: ICO,
    rxBase: 0.45,
    ryFactor: 0.38,
    rxFactor: 0.15,
    label: "// ICOSAHEDRON",
    idx: 2,
    verts: 12,
    edges: 30,
   },
   {
    x: pad + 2 * (vpW + pad),
    geo: TORUS,
    rxBase: 0.4,
    ryFactor: 0.28,
    rxFactor: 0.18,
    label: "// TORUS",
    idx: 3,
    verts: 60,
    edges: 120,
   },
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // PRE-RENDER del FONDO ESTÁTICO — rejillas, marcos, textos, HUD.
  // Esto se dibuja UNA SOLA VEZ. En cada frame luego se copia con drawImage
  // (casi gratis) y encima se pinta sólo lo que cambia (las aristas).
  // ═══════════════════════════════════════════════════════════════════════
  const bgCv = document.createElement("canvas");
  bgCv.width = W;
  bgCv.height = H;
  const bg = bgCv.getContext("2d");

  const drawStaticBackground = () => {
   // Fondo global
   bg.fillStyle = COL.bg;
   bg.fillRect(0, 0, W, H);

   // Header
   bg.fillStyle = COL.panel;
   bg.fillRect(0, 0, W, headerH);
   bg.strokeStyle = COL.grid;
   bg.lineWidth = 1;
   bg.beginPath();
   bg.moveTo(0, headerH + 0.5);
   bg.lineTo(W, headerH + 0.5);
   bg.stroke();

   bg.fillStyle = COL.accent;
   bg.font = "11px 'Menlo', 'Consolas', monospace";
   bg.fillText("▸ VIEWPORT", 18, 21);
   bg.fillStyle = COL.label;
   bg.fillText("three.js  /  primitives", 110, 21);
   bg.fillStyle = COL.dim;
   bg.font = "10px 'Menlo', 'Consolas', monospace";
   bg.fillText("60 FPS  ●  wire", W - 118, 21);

   // Cada viewport: panel + borde + rejilla + cruz + label
   viewports.forEach((vp) => {
    bg.fillStyle = COL.panel;
    bg.fillRect(vp.x, vpY, vpW, vpH);
    bg.strokeStyle = COL.grid;
    bg.lineWidth = 1;
    bg.strokeRect(vp.x + 0.5, vpY + 0.5, vpW - 1, vpH - 1);

    // Rejilla cada 30px
    bg.beginPath();
    for (let gx = vp.x + 30; gx < vp.x + vpW; gx += 30) {
     bg.moveTo(gx + 0.5, vpY + 1);
     bg.lineTo(gx + 0.5, vpY + vpH - 1);
    }
    for (let gy = vpY + 30; gy < vpY + vpH; gy += 30) {
     bg.moveTo(vp.x + 1, gy + 0.5);
     bg.lineTo(vp.x + vpW - 1, gy + 0.5);
    }
    bg.stroke();

    // Cruz central
    const cx = vp.x + vpW / 2;
    const cy = vpY + vpH / 2;
    bg.strokeStyle = COL.gridStrong;
    bg.beginPath();
    bg.moveTo(cx - 7, cy + 0.5);
    bg.lineTo(cx + 7, cy + 0.5);
    bg.moveTo(cx + 0.5, cy - 7);
    bg.lineTo(cx + 0.5, cy + 7);
    bg.stroke();

    // Label + índice
    bg.fillStyle = COL.label;
    bg.font = "10px 'Menlo', 'Consolas', monospace";
    bg.fillText(vp.label, vp.x + 8, vpY + 15);
    bg.fillStyle = COL.dim;
    bg.fillText("0" + vp.idx, vp.x + vpW - 20, vpY + 15);
   });

   // Footer: HUD inferior con métricas
   bg.fillStyle = COL.panel;
   bg.fillRect(0, footY, W, 40);
   bg.strokeStyle = COL.grid;
   bg.beginPath();
   bg.moveTo(0, footY + 0.5);
   bg.lineTo(W, footY + 0.5);
   bg.stroke();

   bg.font = "10px 'Menlo', 'Consolas', monospace";
   viewports.forEach((vp) => {
    const gx = vp.x + 6;
    bg.fillStyle = COL.dim;
    bg.fillText("VERTS", gx, footY + 17);
    bg.fillStyle = COL.wire;
    bg.fillText(String(vp.verts), gx + 40, footY + 17);
    bg.fillStyle = COL.dim;
    bg.fillText("EDGES", gx + 82, footY + 17);
    bg.fillStyle = COL.wire;
    bg.fillText(String(vp.edges), gx + 125, footY + 17);
    // Barra base estática
    bg.fillStyle = COL.grid;
    bg.fillRect(gx, footY + 25, vpW - 18, 3);
   });
  };
  drawStaticBackground();

  // ═══════════════════════════════════════════════════════════════════════
  // DRAW — cada frame. Sólo copia fondo + dibuja wireframes + barras pulse.
  // ═══════════════════════════════════════════════════════════════════════
  let t = 0;
  let lastDraw = -1;

  const drawWireframe = (vp, rx, ry) => {
   const cx = vp.x + vpW / 2;
   const cy = vpY + vpH / 2;
   const scale = Math.min(vpW, vpH) * 0.26;
   const geo = vp.geo;

   // Proyectar todos los vértices una vez
   const proj = geo.v.map((vv) => project(vv, rx, ry, cx, cy, scale));

   // Una sola pasada — alpha fijo según Z medio de cada arista (cálculo
   // barato, sólo un if por arista). Sin sort.
   c.lineWidth = 1.1;
   c.strokeStyle = COL.wireSoft;
   c.beginPath();
   geo.e.forEach(([a, b]) => {
    if ((proj[a][2] + proj[b][2]) * 0.5 < 0) {
     c.moveTo(proj[a][0], proj[a][1]);
     c.lineTo(proj[b][0], proj[b][1]);
    }
   });
   c.stroke();

   c.strokeStyle = COL.wireFront;
   c.beginPath();
   geo.e.forEach(([a, b]) => {
    if ((proj[a][2] + proj[b][2]) * 0.5 >= 0) {
     c.moveTo(proj[a][0], proj[a][1]);
     c.lineTo(proj[b][0], proj[b][1]);
    }
   });
   c.stroke();
  };

  function draw() {
   // 1. Copia del fondo estático — operación aceleradísima
   c.drawImage(bgCv, 0, 0);

   // 2. Wireframes de cada viewport
   viewports.forEach((vp) => {
    drawWireframe(vp, t * vp.rxFactor + vp.rxBase, t * vp.ryFactor);
   });

   // 3. Barras de actividad con pulse — lo único animado del footer
   c.fillStyle = COL.wire;
   viewports.forEach((vp, i) => {
    const gx = vp.x + 6;
    const pulse = 0.5 + Math.sin(t * 2 + i) * 0.5;
    c.fillRect(gx, footY + 25, (vpW - 18) * pulse, 3);
   });

   tex.needsUpdate = true;
  }

  draw();

  // Acumulador propio: permite cambiar la velocidad sin saltos bruscos.
  let accumulatedT = 0;

  const update = (elapsed) => {
   if (lastDraw < 0) lastDraw = elapsed;
   const dt = elapsed - lastDraw;
   // FPS configurable en vivo desde GUI
   const threshold = 1 / Math.max(wireScreen.fps, 0.5);
   if (dt < threshold) return;
   lastDraw = elapsed;
   // Tiempo "artístico" — avanza con speed. A 0 se congela.
   accumulatedT += dt * wireScreen.speed;
   t = accumulatedT;
   draw();
  };

  screenAnimators.push(update);
  return tex;
 }

 // ════════════════════════════════════════════════════════════════════════
 // SWAP DE TEXTURA — sustituye el wallpaper original del GLB por el canvas
 // ════════════════════════════════════════════════════════════════════════
 // Override opcional: si necesitas forzar una mesh concreta como pantalla,
 // pon aquí su nombre (ej: "Screen"). Por defecto la detección automática
 // por textura + área funciona.
 const MONITOR_SCREEN_MESH_NAME = null;

 
 function applyMonitorScreenContent(root, kind) {
  if (!root) return;
  let screenMesh = null;
  let maxArea = -1;

  root.traverse((child) => {
   if (!child.isMesh || !child.geometry) return;
   child.geometry.computeBoundingBox();
   const b = child.geometry.boundingBox;
   if (!b) return;
   const sx = b.max.x - b.min.x;
   const sy = b.max.y - b.min.y;
   const sz = b.max.z - b.min.z;

   const mats = Array.isArray(child.material) ? child.material : [child.material];
   const hasMap = mats.some((m) => m && (m.map || m.emissiveMap));

   if (MONITOR_SCREEN_MESH_NAME && child.name === MONITOR_SCREEN_MESH_NAME) {
    screenMesh = child;
    return;
   }
   // Pantalla = mesh con textura existente + mayor área XY.
   if (hasMap) {
    const area = sx * sy;
    if (area > maxArea) {
     maxArea = area;
     screenMesh = child;
    }
   }
  });

  if (!screenMesh) return;

  // Fabricamos la textura de contenido
  const newTex = kind === "code" ? makeCodeScreenTexture() : makeWireframeViewerScreenTexture();

  // SWAP sobre el material existente (preserva roughness/metalness originales del GLB)
  const mat = Array.isArray(screenMesh.material) ? screenMesh.material[0] : screenMesh.material;
  if (!mat) return;

  // Dispose de texturas anteriores (el wallpaper de Windows 11)
  if (mat.map && mat.map.dispose) mat.map.dispose();
  if (mat.emissiveMap && mat.emissiveMap.dispose) mat.emissiveMap.dispose();

  mat.map = newTex;
  mat.emissiveMap = newTex;
  mat.emissive = new THREE.Color("#ffffff");
  mat.emissiveIntensity = 0.85; // pantalla "encendida" sin depender de luces
  mat.toneMapped = false; // preserva nitidez del canvas
  mat.needsUpdate = true;

  screenMesh.userData.__screenTex = newTex;
  screenMesh.userData.__screenMat = mat;
 }

 // ════════════════════════════════════════════════════════════════════════
 // CARGA DE MONITORES — carga secuencial (left primero, luego right)
 // ════════════════════════════════════════════════════════════════════════
 function ensureMonitorsLoaded() {
  if (!deskAnchor) return;
  if (monitorLeftAnchor || monitorRightAnchor) return;

  monitorLoader.load(
   "/modelos/monitor.glb",
   (gltf) => {
    monitorLeftRoot = gltf.scene;
    monitorLeftAnchor = new THREE.Group();
    monitorLeftFix = new THREE.Group();

    monitorLeftAnchor.add(monitorLeftFix);
    monitorLeftFix.add(monitorLeftRoot);
    deskAnchor.add(monitorLeftAnchor);

    applyMonitorMaterialTweaks(monitorLeftRoot);
    applyMonitorScreenContent(monitorLeftRoot, "code");
    centerMonitorRoot(monitorLeftRoot);

    monitorLoader.load(
     "/modelos/monitor.glb",
     (gltf2) => {
      monitorRightRoot = gltf2.scene;
      monitorRightAnchor = new THREE.Group();
      monitorRightFix = new THREE.Group();

      monitorRightAnchor.add(monitorRightFix);
      monitorRightFix.add(monitorRightRoot);
      deskAnchor.add(monitorRightAnchor);

      applyMonitorMaterialTweaks(monitorRightRoot);
      applyMonitorScreenContent(monitorRightRoot, "ui");
      centerMonitorRoot(monitorRightRoot);

      updateMonitors();
      requestRender();
     },
     undefined,
     (error) => {
      console.error("Error cargando segundo monitor.glb:", error);
     },
    );
   },
   undefined,
   (error) => {
    console.error("Error cargando monitor.glb:", error);
   },
  );
 }

 // ════════════════════════════════════════════════════════════════════════
 // UPDATES — posicionamiento y brillo
 // ════════════════════════════════════════════════════════════════════════
 function updateSingleMonitor(anchor, fix, root, x, extraRotY) {
  if (!anchor || !fix || !root || !deskTopSupport) return;

  anchor.position.set(x, deskTopSupport.position.y + monitorParams.yOffset, monitorParams.zOffset);
  anchor.rotation.set(monitorParams.rotX, monitorParams.rotY + extraRotY, monitorParams.rotZ);
  anchor.scale.setScalar(monitorParams.scale);

  fix.position.set(monitorFixParams.posX, monitorFixParams.posY, monitorFixParams.posZ);
  fix.rotation.set(monitorFixParams.rotX, monitorFixParams.rotY, monitorFixParams.rotZ);

  anchor.updateMatrixWorld(true);
  fix.updateMatrixWorld(true);
  root.updateMatrixWorld(true);

  updateMonitorBrightness(root);
 }

 function updateMonitors() {
  if (!deskAnchor || !deskTopSupport) return;

  updateSingleMonitor(
   monitorLeftAnchor,
   monitorLeftFix,
   monitorLeftRoot,
   monitorParams.leftX - monitorParams.gap * 0.5,
   monitorParams.tiltLeftY,
  );

  updateSingleMonitor(
   monitorRightAnchor,
   monitorRightFix,
   monitorRightRoot,
   monitorParams.rightX + monitorParams.gap * 0.5,
   monitorParams.tiltRightY,
  );

  requestRender();
 }

 function updateDesk() {
  if (!deskRoot || !deskAnchor || !deskYaw || !deskFix || !deskTopSupport) return;

  const LEFT_WALL_X = -5;
  const BACK_WALL_Z = -4;

  // 1) Transformación base
  deskAnchor.position.set(0, 0, 0);
  deskYaw.rotation.set(0, deskParams.rotY, 0);
  deskYaw.scale.setScalar(deskParams.scale);

  deskFix.position.set(deskFixParams.posX, deskFixParams.posY, deskFixParams.posZ);
  deskFix.rotation.set(deskFixParams.rotX, deskFixParams.rotY, deskFixParams.rotZ);

  deskAnchor.updateMatrixWorld(true);
  deskYaw.updateMatrixWorld(true);
  deskFix.updateMatrixWorld(true);
  deskRoot.updateMatrixWorld(true);

  // 2) Apoyo en suelo
  const floorBox = new THREE.Box3().setFromObject(deskAnchor);
  deskAnchor.position.y = deskParams.y - floorBox.min.y;

  deskAnchor.updateMatrixWorld(true);
  deskYaw.updateMatrixWorld(true);
  deskFix.updateMatrixWorld(true);
  deskRoot.updateMatrixWorld(true);

  // 3) Caja ya apoyada
  const wallSnapBox = new THREE.Box3().setFromObject(deskAnchor);

  // 4) Snap contra pared izquierda y pared del fondo
  const deltaX = LEFT_WALL_X + deskParams.wallGapLeft - wallSnapBox.min.x;
  const deltaZ = BACK_WALL_Z + deskParams.wallGapBack - wallSnapBox.min.z;

  deskAnchor.position.x += deltaX;
  deskAnchor.position.z += deltaZ;

  deskAnchor.updateMatrixWorld(true);
  deskYaw.updateMatrixWorld(true);
  deskFix.updateMatrixWorld(true);
  deskRoot.updateMatrixWorld(true);

  // 5) Caja final
  const alignedBox = new THREE.Box3().setFromObject(deskAnchor);

  // 6) Plano superior de apoyo
  const supportWorldY = alignedBox.max.y + deskParams.supportYOffset;
  const supportLocalY = supportWorldY - deskAnchor.position.y;

  deskTopSupport.position.set(0, supportLocalY, 0);
  deskTopSupport.rotation.set(-Math.PI * 0.5, 0, 0);
  deskTopSupport.scale.set(deskParams.supportWidth, deskParams.supportDepth, 1);
  deskTopSupport.visible = deskParams.showSupport;

  deskTopSupport.updateMatrixWorld(true);

  // 7) Brillo materiales
  deskRoot.traverse((child) => {
   if (!child.isMesh) return;

   const applyBrightness = (mat) => {
    if (!mat || !mat.color) return;

    if (!mat.userData.__baseColor) {
     mat.userData.__baseColor = mat.color.clone();
    }

    mat.color.copy(mat.userData.__baseColor).multiplyScalar(deskParams.brightness);
   };

   if (Array.isArray(child.material)) {
    child.material.forEach(applyBrightness);
   } else {
    applyBrightness(child.material);
   }
  });

  updateMonitors();
  requestRender();
 }

 // ════════════════════════════════════════════════════════════════════════
 // CARGA DEL ESCRITORIO — callback completo
 // ════════════════════════════════════════════════════════════════════════
 deskLoader.load(
  "/modelos/desk.glb",
  (gltf) => {
   deskRoot = gltf.scene;

   // Jerarquía limpia:
   //   deskAnchor -> posición global
   //   deskYaw    -> rotación/escala de escena
   //   deskFix    -> corrección interna del GLB
   //   deskRoot   -> modelo real
   deskAnchor = new THREE.Group();
   deskYaw = new THREE.Group();
   deskFix = new THREE.Group();

   scene.add(deskAnchor);
   deskAnchor.add(deskYaw);
   deskYaw.add(deskFix);
   deskFix.add(deskRoot);

   let meshCount = 0;

   deskRoot.traverse((child) => {
    if (!child.isMesh) return;

    meshCount++;
    child.castShadow = false;
    child.receiveShadow = false;

    const materials = Array.isArray(child.material) ? child.material : [child.material];

    materials.forEach((mat) => {
     if (!mat) return;

     if ("roughness" in mat) mat.roughness = Math.max(mat.roughness ?? 0.65, 0.55);
     if ("metalness" in mat) mat.metalness = Math.min(mat.metalness ?? 0.08, 0.18);
     if ("envMapIntensity" in mat) mat.envMapIntensity = 0.6;

     if (mat.color) {
      mat.userData.__baseColor = mat.color.clone();
      mat.color.copy(mat.userData.__baseColor).multiplyScalar(deskParams.brightness);
     }
    });
   });

   if (meshCount === 0) {
    console.warn("desk.glb se ha cargado pero no contiene meshes visibles");
    return;
   }

   // ── Recentrado REAL del GLB una sola vez ─────────────────────────────
   deskAnchor.position.set(0, 0, 0);
   deskYaw.position.set(0, 0, 0);
   deskYaw.rotation.set(0, 0, 0);
   deskYaw.scale.setScalar(1);
   deskFix.rotation.set(0, 0, 0);
   deskRoot.position.set(0, 0, 0);
   deskRoot.rotation.set(0, 0, 0);

   deskAnchor.updateMatrixWorld(true);
   deskYaw.updateMatrixWorld(true);
   deskFix.updateMatrixWorld(true);
   deskRoot.updateMatrixWorld(true);

   const rawBox = new THREE.Box3().setFromObject(deskRoot);
   const rawCenter = rawBox.getCenter(new THREE.Vector3());

   // Centramos X/Z y apoyamos base en Y=0
   deskRoot.position.set(-rawCenter.x, -rawBox.min.y, -rawCenter.z);

   deskRoot.updateMatrixWorld(true);

   // ── Plano invisible superior ─────────────────────────────────────────
   // Sirve como superficie para adjuntar lámpara, teclado, ratón, etc.
   // También se usa como target del raycast de la silla (getChairSupportY).
   deskTopSupport = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
     color: "#00ffff",
     transparent: true,
     opacity: 0.2,
     depthWrite: false,
     side: THREE.DoubleSide,
    }),
   );

   deskTopSupport.rotation.x = -Math.PI * 0.5;
   deskTopSupport.visible = deskParams.showSupport;
   deskAnchor.add(deskTopSupport);

   deskSupportMeshes.length = 0;
   deskSupportMeshes.push(deskTopSupport);

   updateDesk();

   // Vaciar la cola de pendientes (cohete, teclado, ratón que cargaron
   // antes que la mesa — esto arregla el bug del cohete desaparecido)
   while (pendingDeskChildren.length) {
    const pending = pendingDeskChildren.shift();
    deskAnchor.add(pending);
   }

   // Notificar al orquestador para que reposicione chair, lampara, teclado, ratón
   if (onDeskReady) onDeskReady();

   ensureMonitorsLoaded();
   requestRender();
  },
  undefined,
  (error) => {
   console.error("Error cargando desk.glb:", error);
  },
 );

 // ════════════════════════════════════════════════════════════════════════
 // TICK — anima las pantallas procedurales (typing + viewports wireframe)
 // ════════════════════════════════════════════════════════════════════════
 // NOTA: en el archivo original esto se llamaba 2 veces por frame (bug). Ahora
 // solo una. Las animaciones de las pantallas van a la velocidad correcta.
 function update(elapsedTime) {
  for (let i = 0; i < screenAnimators.length; i++) {
   screenAnimators[i](elapsedTime);
  }
 }

 // ════════════════════════════════════════════════════════════════════════
 // CLEANUP — desk + 2 monitores + plano de apoyo
 // ════════════════════════════════════════════════════════════════════════
 // No limpia los hijos adjuntados con attachToDesk (lampara, teclado, ratón,
 // perro hologram). Cada módulo es responsable de su propio dispose.
 function dispose() {
  // Desadjuntar monitores del desk antes de dispose
  if (monitorLeftAnchor && deskAnchor) {
   deskAnchor.remove(monitorLeftAnchor);
  }
  if (monitorRightAnchor && deskAnchor) {
   deskAnchor.remove(monitorRightAnchor);
  }

  // Monitor izquierdo: incluye textura procedural en __screenTex
  if (monitorLeftRoot) {
   monitorLeftRoot.traverse((child) => {
    if (!child.isMesh) return;

    if (child.userData.__screenTex) child.userData.__screenTex.dispose();
    if (child.userData.__screenMat) child.userData.__screenMat.dispose();
    if (child.geometry) child.geometry.dispose();

    if (Array.isArray(child.material)) {
     child.material.forEach((mat) => {
      if (mat && mat.dispose) mat.dispose();
     });
    } else if (child.material) {
     child.material.dispose();
    }
   });
  }

  // Monitor derecho
  if (monitorRightRoot) {
   monitorRightRoot.traverse((child) => {
    if (!child.isMesh) return;

    if (child.userData.__screenTex) child.userData.__screenTex.dispose();
    if (child.userData.__screenMat) child.userData.__screenMat.dispose();
    if (child.geometry) child.geometry.dispose();

    if (Array.isArray(child.material)) {
     child.material.forEach((mat) => {
      if (mat && mat.dispose) mat.dispose();
     });
    } else if (child.material) {
     child.material.dispose();
    }
   });
  }

  // Plano de apoyo
  if (deskTopSupport) {
   if (deskTopSupport.geometry) deskTopSupport.geometry.dispose();
   if (deskTopSupport.material) deskTopSupport.material.dispose();
  }

  // Desk
  if (deskRoot) {
   deskRoot.traverse((child) => {
    if (!child.isMesh) return;

    if (child.geometry) child.geometry.dispose();

    if (Array.isArray(child.material)) {
     child.material.forEach((mat) => {
      if (mat && mat.dispose) mat.dispose();
     });
    } else if (child.material) {
     child.material.dispose();
    }
   });
  }

  if (deskAnchor) {
   scene.remove(deskAnchor);
  }
 }

 // ════════════════════════════════════════════════════════════════════════
 // SALIDA — API pública del módulo
 // ════════════════════════════════════════════════════════════════════════
 // Los getters son necesarios para deskAnchor / deskTopSupport / monitor refs
 // porque se asignan asíncronamente cuando termina la carga del .glb.
 return {
  // Función pública: adjuntar hijos a la mesa (con cola si aún no cargó)
  attachToDesk,

  // Getters para estado async
  get deskAnchor() {
   return deskAnchor;
  },
  get deskTopSupport() {
   return deskTopSupport;
  },
  get deskSupportMeshes() {
   return deskSupportMeshes;
  },
  get monitorLeftRoot() {
   return monitorLeftRoot;
  },
  get monitorRightRoot() {
   return monitorRightRoot;
  },

  // Refs estables para GUI
  deskParams,
  deskFixParams,
  monitorParams,
  monitorFixParams,
  wireScreen,

  // Funciones que la GUI llama en onChange
  updateDesk,
  updateMonitors,

  // Tick + cleanup
  update,
  dispose,
 };
}
