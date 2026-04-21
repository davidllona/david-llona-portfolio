import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import GUI from "lil-gui";

export function initHeroScene() {
 const canvas = document.querySelector("#webgl");

 if (!canvas) {
  console.log("No se encontró el canvas");
  return;
 }

 /**
  * =========================================================
  * VARIABLES
  * =========================================================
  */
 let scrollY = window.scrollY;
 let latestScrollY = window.scrollY;
 let scrollTicking = false;
 let resizeTimeout = null;

 /**
  * =========================================================
  * DEBUG
  * =========================================================
  */
 const DEBUG = true;
 const gui = DEBUG ? new GUI() : null;
 if (gui) gui.close();

 /**
  * =========================================================
  * DEVICE / QUALITY
  * =========================================================
  */
 const isMobile = window.innerWidth < 768;
 const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

 const quality = {
  antialias: !isMobile,
  pixelRatio: Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5),
  starsCount: isMobile ? 180 : isTablet ? 350 : 550,
  starsSize: isMobile ? 0.014 : 0.018,
  moonSegments: isMobile ? 14 : 20,
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

 // Tone mapping — por defecto ACESFilmic suave, controlable por GUI
 renderer.toneMapping = THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure = 0.88;

 // ── Params atmosféricos globales (controlable por GUI) ───────────────────
 const atmosphereParams = {
  exposure: 0.88,
  toneMapping: "ACESFilmic", // None | Linear | Reinhard | ACESFilmic
  backgroundColor: "#07070d",
  vignetteOpacity: 0.88, // multiplicador sobre el fade del vignette
  fogDensityMult: 1.0,
 };

 const toneMappingMap = {
  None: THREE.NoToneMapping,
  Linear: THREE.LinearToneMapping,
  Reinhard: THREE.ReinhardToneMapping,
  ACESFilmic: THREE.ACESFilmicToneMapping,
 };

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
 // Pared con textura PBR — textures/pared/ (repetición sutil 3×2)
 const wallTexLoader = new THREE.TextureLoader();
 const WALL_REP = new THREE.Vector2(3, 2);
 const _wrapRepeat = (t) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.copy(WALL_REP);
 };
 const wallColorTex = wallTexLoader.load("textures/pared/BaseColor.jpg", (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  _wrapRepeat(t);
  requestRender();
 });
 const wallNormalTex = wallTexLoader.load("textures/pared/Normal.jpg", (t) => {
  _wrapRepeat(t);
  requestRender();
 });
 const wallRoughTex = wallTexLoader.load("textures/pared/Roughness.jpg", (t) => {
  _wrapRepeat(t);
  requestRender();
 });
 const wallAOTex = wallTexLoader.load("textures/pared/AmbientOcclusion.jpg", (t) => {
  _wrapRepeat(t);
  requestRender();
 });

 const wallMaterial = new THREE.MeshStandardMaterial({
  color: "#2f3140", // tinte oscuro — mantiene look nocturno
  map: wallColorTex,
  normalMap: wallNormalTex,
  normalScale: new THREE.Vector2(0.3, 0.3), // normal sutil
  roughnessMap: wallRoughTex,
  roughness: 0.92,
  aoMap: wallAOTex,
  aoMapIntensity: 0.45,
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
 const moonTextureLoader = new THREE.TextureLoader();
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

 /**
  * =========================================================
  * ROOM BASE
  * =========================================================
  */
 const floor = new THREE.Mesh(planeGeometry14, floorMaterial);
 floor.rotation.x = -Math.PI * 0.5;
 floor.position.y = 0;
 scene.add(floor);

 const backWall = new THREE.Mesh(planeGeometryWall, wallMaterial);
 backWall.position.set(0, 3.5, -4);
 scene.add(backWall);

 /**
  * =========================================================
  * DESK
  * =========================================================
  */
 const deskLoader = new GLTFLoader();
 const monitorLoader = new GLTFLoader();

 let deskRoot = null;
 let deskAnchor = null;
 let deskYaw = null;
 let deskFix = null;
 let deskTopSupport = null;

 const deskSupportMeshes = [];

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

 /**
  * =========================================================
  * MONITORS
  * =========================================================
  */
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

 // Lista de updaters de pantalla — el tick() los llama con elapsedTime cada frame.
 // Cada updater decide internamente si redibujar o no (throttling por deltaTime).
 const screenAnimators = [];

 /**
  * Pantalla izquierda — editor de código estilo VSCode con typing lento.
  * Registra un updater en screenAnimators que redibuja cuando hay cambios.
  */
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

 /**
  * Genera una textura tipo UI futurista minimal (pantalla derecha).
  * Paneles, títulos, líneas tenues — todo en azules integrados.
  */
 function makeUIScreenTexture() {
  const W = 1024,
   H = 640;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d");

  c.fillStyle = "#0b1020";
  c.fillRect(0, 0, W, H);

  // Header
  c.fillStyle = "#8aa8e0";
  c.font = "16px -apple-system, 'Segoe UI', sans-serif";
  c.fillText("▸ CONSTRUYENDO EXPERIENCIAS", 40, 50);
  c.fillText("  DIGITALES DE OTRO PLANETA", 40, 72);

  // Código central
  c.font = "12px 'Menlo', monospace";
  c.fillStyle = "#5f78a8";
  const code = [
   "function buildExperience(idea) {",
   "  return create(Import(idea));",
   "}",
   "",
   "const skills = {",
   "  'Three.js',",
   "  'React',",
   "  'GLSL',",
   "  'GSAP',",
   "};",
   "",
   "while (passion) {",
   "  keepLearning();",
   "  keepBuilding();",
   "}",
   "",
   "> Building the future...",
  ];
  code.forEach((ln, i) => c.fillText(ln, 40, 110 + i * 18));

  // Panel lateral derecho
  const panelX = 680,
   panelW = W - panelX - 30;
  c.strokeStyle = "#2a3a5e";
  c.lineWidth = 1;
  c.strokeRect(panelX, 40, panelW, H - 80);

  c.fillStyle = "#6ad0ff";
  c.font = "12px -apple-system, 'Segoe UI', sans-serif";
  c.fillText("PROJECTS", panelX + 16, 62);
  c.fillStyle = "#7a8db0";
  c.font = "11px -apple-system, 'Segoe UI', sans-serif";
  ["• Interactive Worlds", "• 3D Experiences", "• Web Development"].forEach((l, i) =>
   c.fillText(l, panelX + 16, 82 + i * 18),
  );

  c.fillStyle = "#6ad0ff";
  c.font = "12px -apple-system, 'Segoe UI', sans-serif";
  c.fillText("SKILLS", panelX + 16, 172);
  c.fillStyle = "#7a8db0";
  c.font = "11px -apple-system, 'Segoe UI', sans-serif";
  ["• Three.js", "• React", "• Node.js", "• GSAP", "• WebGL"].forEach((l, i) =>
   c.fillText(l, panelX + 16, 192 + i * 18),
  );

  c.fillStyle = "#6ad0ff";
  c.font = "12px -apple-system, 'Segoe UI', sans-serif";
  c.fillText("STATUS", panelX + 16, 310);
  c.fillStyle = "#8ae2a3";
  c.font = "11px -apple-system, 'Segoe UI', sans-serif";
  ["▸ Focused", "▸ Motivated", "▸ Building"].forEach((l, i) => c.fillText(l, panelX + 16, 330 + i * 18));

  // Orb/grid sutil tipo radar
  c.strokeStyle = "rgba(106,208,255,0.18)";
  c.lineWidth = 1;
  c.beginPath();
  for (let r = 20; r <= 100; r += 20) c.arc(560, 330, r, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.moveTo(460, 330);
  c.lineTo(660, 330);
  c.moveTo(560, 230);
  c.lineTo(560, 430);
  c.stroke();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
 }

 // Opcional: si tras ver el console.log quieres forzar una mesh concreta.
 const MONITOR_SCREEN_MESH_NAME = null; // ej: "Screen" o null

 /**
  * Detecta la mesh "pantalla" y hace SWAP del map del material existente.
  * Estrategia robusta: busca meshes cuyo material ya tenga una textura (map
  * o emissiveMap) — en GLBs de monitores, la pantalla siempre trae wallpaper,
  * el resto del chasis no. Preservamos el material original (roughness,
  * metalness, etc.) y solo intercambiamos la textura.
  */
 function applyMonitorScreenContent(root, kind) {
  if (!root) return;
  const meshLog = [];
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

   meshLog.push({ name: child.name, sx: +sx.toFixed(3), sy: +sy.toFixed(3), sz: +sz.toFixed(3), hasMap });

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

  console.log(`[monitor:${kind}] meshes:`, meshLog);
  console.log(`[monitor:${kind}] screen →`, screenMesh?.name ?? "(ninguna)");
  if (!screenMesh) return;

  // Fabricamos la textura de contenido
  const newTex = kind === "code" ? makeCodeScreenTexture() : makeUIScreenTexture();

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

 deskLoader.load(
  "/modelos/desk.glb",
  (gltf) => {
   deskRoot = gltf.scene;

   // Jerarquía limpia:
   // deskAnchor -> posición global
   // deskYaw    -> rotación/escala de escena
   // deskFix    -> corrección interna del GLB
   // deskRoot   -> modelo real
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

     if ("roughness" in mat) mat.roughness = Math.max(mat.roughness ?? 0.75, 0.75);
     if ("metalness" in mat) mat.metalness = Math.min(mat.metalness ?? 0.05, 0.1);
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

   // -----------------------------------------------------
   // Recentrado REAL del GLB una sola vez
   // -----------------------------------------------------
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

   // -----------------------------------------------------
   // Plano invisible superior
   // -----------------------------------------------------
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
   ensureMonitorsLoaded();
   updateChair();
   requestRender();
  },
  undefined,
  (error) => {
   console.error("Error cargando desk.glb:", error);
  },
 );

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

 /**
  * =========================================================
  * WINDOW PARAMS
  * =========================================================
  */
 const windowParams = {
  x: -4.94,
  y: 4.51,
  z: 0.55,

  width: 4.47,
  height: 3.8,

  frameThickness: 0.16,
  innerPadding: 0.0,
  frameDepth: 0.14,
  glassOffset: -0.032,

  revealDepth: 0.55,
  revealThickness: 0.12,
  sillDepth: 0.38,
  sillHeight: 0.08,
  mullionWidth: 0.08,

  glowWidth: 5.2,
  glowHeight: 4.6,
  glowOffset: -0.45,
  glowColor: "#5d7bff",
 };

 /**
  * =========================================================
  * LEFT WALL WITH WINDOW CUTOUT
  * =========================================================
  */
 const leftWallGroup = new THREE.Group();
 scene.add(leftWallGroup);

 const leftWallParams = {
  x: -5,
  y: 3.5,
  z: 1,
  width: 10,
  height: 7,
 };

 const leftWallTop = new THREE.Mesh(unitPlaneGeometry, wallMaterial);
 const leftWallBottom = new THREE.Mesh(unitPlaneGeometry, wallMaterial);
 const leftWallLeft = new THREE.Mesh(unitPlaneGeometry, wallMaterial);
 const leftWallRight = new THREE.Mesh(unitPlaneGeometry, wallMaterial);

 leftWallGroup.add(leftWallTop, leftWallBottom, leftWallLeft, leftWallRight);
 leftWallGroup.rotation.y = Math.PI * 0.5;

 function updateLeftWallCutout() {
  const wallWidth = leftWallParams.width;
  const wallHeight = leftWallParams.height;

  const wallCenterX = leftWallParams.x;
  const wallCenterY = leftWallParams.y;
  const wallCenterZ = leftWallParams.z;

  const wallLeft = -wallWidth * 0.5;
  const wallRight = wallWidth * 0.5;
  const wallBottom = -wallHeight * 0.5;
  const wallTopY = wallHeight * 0.5;

  const winLeft = windowParams.z - windowParams.width * 0.5;
  const winRight = windowParams.z + windowParams.width * 0.5;
  const winBottom = windowParams.y - wallCenterY - windowParams.height * 0.5;
  const winTop = windowParams.y - wallCenterY + windowParams.height * 0.5;

  leftWallGroup.position.set(wallCenterX, wallCenterY, wallCenterZ);

  const topHeight = Math.max(0.01, wallTopY - winTop);
  leftWallTop.scale.set(wallWidth, topHeight, 1);
  leftWallTop.position.set(0, winTop + topHeight * 0.5, 0);

  const bottomHeight = Math.max(0.01, winBottom - wallBottom);
  leftWallBottom.scale.set(wallWidth, bottomHeight, 1);
  leftWallBottom.position.set(0, wallBottom + bottomHeight * 0.5, 0);

  const leftWidth = Math.max(0.01, winLeft - wallLeft);
  leftWallLeft.scale.set(leftWidth, windowParams.height, 1);
  leftWallLeft.position.set(wallLeft + leftWidth * 0.5, (winBottom + winTop) * 0.5, 0);

  const rightWidth = Math.max(0.01, wallRight - winRight);
  leftWallRight.scale.set(rightWidth, windowParams.height, 1);
  leftWallRight.position.set(winRight + rightWidth * 0.5, (winBottom + winTop) * 0.5, 0);
 }

 /**
  * =========================================================
  * WINDOW SYSTEM
  * =========================================================
  */
 const windowGroup = new THREE.Group();
 scene.add(windowGroup);
 windowGroup.rotation.y = Math.PI * 0.5;

 const topFrame = new THREE.Mesh(unitBoxGeometry, windowFrameMaterial);
 const bottomFrame = new THREE.Mesh(unitBoxGeometry, windowFrameMaterial);
 const leftFramePiece = new THREE.Mesh(unitBoxGeometry, windowFrameMaterial);
 const rightFramePiece = new THREE.Mesh(unitBoxGeometry, windowFrameMaterial);
 const centerMullion = new THREE.Mesh(unitBoxGeometry, windowFrameMaterial);

 const windowGlass = new THREE.Mesh(unitPlaneGeometry, windowGlassMaterial);

 const revealTop = new THREE.Mesh(unitBoxGeometry, windowRevealMaterial);
 const revealBottom = new THREE.Mesh(unitBoxGeometry, windowRevealMaterial);
 const revealLeft = new THREE.Mesh(unitBoxGeometry, windowRevealMaterial);
 const revealRight = new THREE.Mesh(unitBoxGeometry, windowRevealMaterial);

 const windowSill = new THREE.Mesh(unitBoxGeometry, windowRevealMaterial);
 const outerGlow = new THREE.Mesh(unitPlaneGeometry, outerGlowMaterial);

 windowGroup.add(
  topFrame,
  bottomFrame,
  leftFramePiece,
  rightFramePiece,
  centerMullion,
  windowGlass,
  revealTop,
  revealBottom,
  revealLeft,
  revealRight,
  windowSill,
  outerGlow,
 );

 /**
  * =========================================================
  * SPACE OUTSIDE WINDOW
  * =========================================================
  */
 const spaceParams = {
  width: 3.95,
  height: 3.71,
  depth: -0.5,

  starsCount: quality.starsCount,
  starsSpreadZ: 0.6,
  starsSize: quality.starsSize,
  starsColor: "#dbe4ff",

  moonX: 3,
  moonY: 0.79,
  moonZ: -2.34,
  moonRadius: 1.77,
  moonColor: "#c7d2ff",
 };

 const spaceGroup = new THREE.Group();
 windowGroup.add(spaceGroup);

 let starsPoints = null;
 let starsGeometry = null;
 let starsMaterial = null;

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

 /**
  * =========================================================
  * HELPERS Y CONSTANTES DE FASE — antes de requestRender/tick
  * =========================================================
  */
 const easeIn3 = (t) => t * t * t;
 const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
 const easeIO3 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
 const clamp01 = (t) => Math.max(0, Math.min(1, t));
 const lerpV = (a, b, t) => a + (b - a) * t;
 const phase = (sp, s, e) => clamp01((sp - s) / (e - s));

 // Fases de scrollProgress (sp = scrollY / vh)
 const F2S = 0.3,
  F2E = 0.75;
 const F3S = 0.75,
  F3E = 1.1;
 const F4S = 1.1,
  F4E = 1.5;

 function requestRender() {
  if (!shouldAnimate()) return;
  if (isRendering) return;
  isRendering = true;
  animationFrameId = window.requestAnimationFrame(tick);
 }

 function buildStars() {
  if (starsPoints) {
   spaceGroup.remove(starsPoints);
   starsGeometry.dispose();
   starsMaterial.dispose();
   starsPoints = null;
   starsGeometry = null;
   starsMaterial = null;
  }

  const positions = new Float32Array(spaceParams.starsCount * 3);

  for (let i = 0; i < spaceParams.starsCount; i++) {
   const i3 = i * 3;
   positions[i3 + 0] = (Math.random() - 0.5) * spaceParams.width;
   positions[i3 + 1] = (Math.random() - 0.5) * spaceParams.height;
   positions[i3 + 2] = spaceParams.depth - Math.random() * spaceParams.starsSpreadZ;
  }

  starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  starsMaterial = new THREE.PointsMaterial({
   color: spaceParams.starsColor,
   size: spaceParams.starsSize,
   sizeAttenuation: true,
   transparent: true,
   opacity: 0.9,
   depthWrite: false,
  });

  starsPoints = new THREE.Points(starsGeometry, starsMaterial);
  starsPoints.renderOrder = 2;
  spaceGroup.add(starsPoints);

  requestRender();
 }

 buildStars();

 const moon = new THREE.Mesh(moonGeometry, moonMaterial);
 spaceGroup.add(moon);

 function updateSpace() {
  spaceGroup.position.set(0, 0, 0);
  spaceGroup.rotation.set(0, 0, 0);

  moon.position.set(spaceParams.moonX, spaceParams.moonY, spaceParams.depth + spaceParams.moonZ);
  moon.scale.setScalar(spaceParams.moonRadius / 0.95);
  moonMaterial.color.set(spaceParams.moonColor);

  requestRender();
 }

 /**
  * =========================================================
  * EXTERIOR ESPACIAL — estrellas + luna + texto en escena raíz
  * =========================================================
  *
  * KP[2] = (-12, 4.51, 0.55)  ← posición final de cámara
  * Todo lo exterior vive aquí, en coordenadas absolutas.
  * Invisible hasta F4. Controlado por .visible + opacity.
  */

 // ── Centro del exterior ────────────────────────────────────────────────────
 const EXT_X = -12.0;
 const EXT_Y = 4.51;
 const EXT_Z = 0.55;

 // ── Estrellas exteriores — 4 capas cromáticas con sprite circular real ──
 //
 // Cada capa usa un ShaderMaterial con:
 //  - sprite radial suave (CanvasTexture compartida) → discos, no cuadrados
 //  - atributo aColor por vértice → variación cromática dentro de la capa
 //  - atributo aSize por vértice → jerarquía de tamaños (algunas brillantes)
 //  - twinkle opcional con fase aleatoria por estrella
 //
 // Capa A (lejana):  azul frío / densa   → polvo estelar profundo
 // Capa B (media):   blanco neutro       → magnitud media
 // Capa C (cercana): blanco cálido       → puntos de brillo
 // Capa D (foreground): muy pocas, DOF   → sensación de profundidad

 // ── Sprite procedural — gradiente radial gaussiano (una sola textura) ───
 const starSpriteTex = (() => {
  const s = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const c = cv.getContext("2d");
  const g = c.createRadialGradient(s * 0.5, s * 0.5, 0, s * 0.5, s * 0.5, s * 0.5);
  // Núcleo muy brillante → halo suave → borde transparente (gaussiana)
  g.addColorStop(0.0, "rgba(255,255,255,1.0)");
  g.addColorStop(0.12, "rgba(255,255,255,0.92)");
  g.addColorStop(0.28, "rgba(255,255,255,0.45)");
  g.addColorStop(0.55, "rgba(255,255,255,0.12)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");
  c.fillStyle = g;
  c.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cv);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
 })();

 // ── Params de estrellas (controlable por GUI) ────────────────────────────
 const starsParams = {
  visible: true,
  globalOpacity: 2.0,
  twinkleStrength: 0.15, // 0 = off
  parallaxSpeed: 1.25,

  // Capa A — lejana
  aCount: isMobile ? 550 : 2200,
  aSize: isMobile ? 0.07 : 0.055,
  aOpacity: 0.78,
  aTint: "#b8cdff",

  // Capa B — media
  bCount: isMobile ? 140 : 550,
  bSize: isMobile ? 0.12 : 0.095,
  bOpacity: 0.9,
  bTint: "#e8efff",

  // Capa C — cercana (brillantes)
  cCount: isMobile ? 22 : 90,
  cSize: isMobile ? 0.18 : 0.15,
  cOpacity: 0.95,
  cTint: "#fff4e8",

  // Capa D — foreground DOF
  dCount: isMobile ? 0 : 24,
  dSize: 0.32,
  dOpacity: 0.1,
  dTint: "#dde8ff",
 };

 // ── Shader compartido — sprite + atributos por vértice + twinkle ─────────
 const starVertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uTime;
  uniform float uTwinkle;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Size attenuation manual — tamaño en pantalla ~ 1/-mv.z
    gl_PointSize = aSize * uSize * uPixelRatio * (300.0 / max(-mv.z, 0.1));
    vColor = aColor;
    // Twinkle: seno por-estrella con fase aleatoria
    float tw = sin(uTime * 1.4 + aPhase * 6.2831) * 0.5 + 0.5;
    vTwinkle = mix(1.0, tw, uTwinkle);
  }
 `;

 const starFragmentShader = /* glsl */ `
  uniform sampler2D uSprite;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec4 tex = texture2D(uSprite, gl_PointCoord);
    float a = tex.a;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor, a * uOpacity * vTwinkle);
  }
 `;

 // ── Helper: construir geometría de capa con atributos por vértice ────────
 // tint: color base de la capa (hex)
 // biasY/biasZ: sesgo de centro de distribución (como antes)
 // brightRatio: fracción de estrellas "brillantes" (tamaño ×2–3)
 function buildStarLayer(count, rMin, rMax, tint, biasY = 0, biasZ = 0, brightRatio = 0.06) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const siz = new Float32Array(count);
  const pha = new Float32Array(count);

  const tintCol = new THREE.Color(tint);
  const warm = new THREE.Color("#ffeec8");
  const cold = new THREE.Color("#b6c8ff");
  const pure = new THREE.Color("#ffffff");
  const tmp = new THREE.Color();

  for (let i = 0; i < count; i++) {
   const r = rMin + Math.random() * (rMax - rMin);
   const u = Math.random(),
    v = Math.random();
   const theta = 2 * Math.PI * u;
   const phi = Math.acos(2 * v - 1);
   pos[i * 3] = EXT_X + r * Math.sin(phi) * Math.cos(theta);
   pos[i * 3 + 1] = EXT_Y + r * Math.sin(phi) * Math.sin(theta) + biasY * r * 0.35;
   pos[i * 3 + 2] = EXT_Z + r * Math.cos(phi) + biasZ * r * 0.35;

   // Color: mezcla del tint de capa con un shift aleatorio
   const shift = Math.random();
   tmp.copy(tintCol);
   if (shift < 0.2) tmp.lerp(warm, 0.35 + Math.random() * 0.3);
   else if (shift < 0.5) tmp.lerp(cold, 0.15 + Math.random() * 0.25);
   else tmp.lerp(pure, Math.random() * 0.2);
   col[i * 3] = tmp.r;
   col[i * 3 + 1] = tmp.g;
   col[i * 3 + 2] = tmp.b;

   // Tamaño: 0.4–1.6 base, con ~brightRatio% multiplicado ×2–3 → jerarquía
   let s = 0.4 + Math.random() * 1.2;
   if (Math.random() < brightRatio) s *= 2.0 + Math.random();
   siz[i] = s;

   pha[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(siz, 1));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(pha, 1));
  return geo;
 }

 function makeStarMaterial(sizeMult) {
  return new THREE.ShaderMaterial({
   uniforms: {
    uSprite: { value: starSpriteTex },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uSize: { value: sizeMult },
    uTime: { value: 0 },
    uOpacity: { value: 0.0 },
    uTwinkle: { value: starsParams.twinkleStrength },
   },
   vertexShader: starVertexShader,
   fragmentShader: starFragmentShader,
   transparent: true,
   depthWrite: false,
   blending: THREE.AdditiveBlending,
  });
 }

 // ── Capa A — lejana, azul frío, densa ────────────────────────────────────
 let extStarsGeo = buildStarLayer(starsParams.aCount, 20, 42, starsParams.aTint, 0.6, -0.4, 0.04);
 const extStarsMat = makeStarMaterial(starsParams.aSize);
 const extStarsPoints = new THREE.Points(extStarsGeo, extStarsMat);
 extStarsPoints.renderOrder = 1;
 extStarsPoints.visible = false;
 scene.add(extStarsPoints);

 // ── Capa B — media, blanco neutro ────────────────────────────────────────
 let extStarsBGeo = buildStarLayer(starsParams.bCount, 10, 22, starsParams.bTint, 0, 0, 0.07);
 const extStarsBMat = makeStarMaterial(starsParams.bSize);
 const extStarsBPoints = new THREE.Points(extStarsBGeo, extStarsBMat);
 extStarsBPoints.renderOrder = 2;
 extStarsBPoints.visible = false;
 scene.add(extStarsBPoints);

 // ── Capa C — cercana, blanco cálido, brillantes ──────────────────────────
 let extStarsCGeo = buildStarLayer(starsParams.cCount, 4, 11, starsParams.cTint, 0, 0, 0.15);
 const extStarsCMat = makeStarMaterial(starsParams.cSize);
 const extStarsCPoints = new THREE.Points(extStarsCGeo, extStarsCMat);
 extStarsCPoints.renderOrder = 3;
 extStarsCPoints.visible = false;
 scene.add(extStarsCPoints);

 // ── Capa D — foreground DOF (muy cercano) ────────────────────────────────
 let extStarsDGeo =
  starsParams.dCount > 0
   ? buildStarLayer(starsParams.dCount, 1.5, 4, starsParams.dTint, 0, 0, 0.2)
   : (() => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
      g.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(3), 3));
      g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(1), 1));
      g.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(1), 1));
      return g;
     })();
 const extStarsDMat = makeStarMaterial(starsParams.dSize);
 const extStarsDPoints = new THREE.Points(extStarsDGeo, extStarsDMat);
 extStarsDPoints.renderOrder = 4;
 extStarsDPoints.visible = false;
 scene.add(extStarsDPoints);

 // ── Rebuild helpers (para GUI: count, tint) ──────────────────────────────
 function rebuildStarLayer(which) {
  if (which === "A") {
   extStarsGeo.dispose();
   extStarsGeo = buildStarLayer(starsParams.aCount, 20, 42, starsParams.aTint, 0.6, -0.4, 0.04);
   extStarsPoints.geometry = extStarsGeo;
  } else if (which === "B") {
   extStarsBGeo.dispose();
   extStarsBGeo = buildStarLayer(starsParams.bCount, 10, 22, starsParams.bTint, 0, 0, 0.07);
   extStarsBPoints.geometry = extStarsBGeo;
  } else if (which === "C") {
   extStarsCGeo.dispose();
   extStarsCGeo = buildStarLayer(starsParams.cCount, 4, 11, starsParams.cTint, 0, 0, 0.15);
   extStarsCPoints.geometry = extStarsCGeo;
  } else if (which === "D") {
   extStarsDGeo.dispose();
   if (starsParams.dCount > 0) {
    extStarsDGeo = buildStarLayer(starsParams.dCount, 1.5, 4, starsParams.dTint, 0, 0, 0.2);
   } else {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(3), 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(1), 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(1), 1));
    extStarsDGeo = g;
   }
   extStarsDPoints.geometry = extStarsDGeo;
  }
  requestRender();
 }

 // ── Luna exterior — textura real, fondo equilibrado ──────────────────────
 //
 // Params controlables desde GUI
 const moonParams = {
  visible: true,
  x: EXT_X - 26,
  y: EXT_Y + 3.2,
  z: EXT_Z - 1.5,
  scale: 1.0,
  opacity: 0.88,
  lightIntensity: 0.2,
  tint: "#ffffff",
 };

 const extMoonLoader = new THREE.TextureLoader();
 const extMoonGeo = new THREE.SphereGeometry(1.5, 36, 36);
 const extMoonMat = new THREE.MeshBasicMaterial({
  color: "#f5f8ff",
  transparent: true,
  opacity: 0.0,
 });
 const extMoon = new THREE.Mesh(extMoonGeo, extMoonMat);
 extMoon.position.set(moonParams.x, moonParams.y, moonParams.z);
 extMoon.renderOrder = 10;
 extMoon.visible = false;
 scene.add(extMoon);

 extMoonLoader.load("/textures/moon.jpg", (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  extMoonMat.map = tex;
  extMoonMat.color.set(moonParams.tint);
  extMoonMat.needsUpdate = true;
  requestRender();
 });

 // DirectionalLight desde la luna — ilumina suavemente el entorno sin "foco"
 // intensity empieza en 0, sube en F4 — muy sutil, sin teñir
 const extMoonLight = new THREE.DirectionalLight("#e8f0ff", 0.0);
 extMoonLight.position.copy(extMoon.position);
 extMoonLight.target.position.set(EXT_X, EXT_Y, EXT_Z);
 scene.add(extMoonLight);
 scene.add(extMoonLight.target);

 // Stub para cleanup (halo desactivado)
 const extMoonHaloGeo = new THREE.SphereGeometry(0.01, 3, 3);
 const extMoonHaloMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
 const extMoonHalo = new THREE.Mesh(extMoonHaloGeo, extMoonHaloMat);
 extMoonHalo.visible = false;
 scene.add(extMoonHalo);

 function updateMoon() {
  extMoon.position.set(moonParams.x, moonParams.y, moonParams.z);
  extMoon.scale.setScalar(moonParams.scale);
  extMoonMat.color.set(moonParams.tint);
  extMoonLight.position.copy(extMoon.position);
  requestRender();
 }

 // ── Fondo nebular — params + regeneración ────────────────────────────────
 // Params controlables desde GUI (posición, escala, rotación, colores, suavidad,
 // densidad y opacidad). Al cambiar colores/densidad/suavidad se regenera
 // la textura; posición/escala/rotación/opacidad son directas.
 const nebulaParams = {
  visible: true,
  opacity: 0.82,
  scale: 1.0,
  x: EXT_X - 50,
  y: EXT_Y,
  z: EXT_Z,
  rotY: Math.PI * 0.5,
  colorPrimary: "#101837",
  colorSecondary: "#090d20",
  softness: 0.5, // 0 = borde duro, 1 = muy suave
  density: 0.65, // multiplica la alpha del centro
 };

 function buildNebulaTexture() {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 256;
  const c = cv.getContext("2d");
  // Centro ligeramente desplazado → no perfectamente centrado
  const cx = 96,
   cy = 88;
  const rMax = 140 * (0.6 + nebulaParams.scale * 0.4);
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, rMax);

  const p = new THREE.Color(nebulaParams.colorPrimary);
  const s = new THREE.Color(nebulaParams.colorSecondary);
  const aCenter = 0.4 * nebulaParams.density;
  const aMid = 0.18 * nebulaParams.density;
  const softness = nebulaParams.softness;
  // Más softness → el gradiente se extiende más suavemente
  g.addColorStop(
   0.0,
   `rgba(${Math.round(p.r * 255)},${Math.round(p.g * 255)},${Math.round(p.b * 255)},${aCenter.toFixed(3)})`,
  );
  g.addColorStop(
   0.35 + softness * 0.15,
   `rgba(${Math.round(s.r * 255)},${Math.round(s.g * 255)},${Math.round(s.b * 255)},${aMid.toFixed(3)})`,
  );
  g.addColorStop(1.0, "rgba(0,0,0,0.0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
 }

 let nebulaTex = buildNebulaTexture();
 const nebulaGeo = new THREE.PlaneGeometry(28, 20);
 const nebulaMat = new THREE.MeshBasicMaterial({
  map: nebulaTex,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  side: THREE.DoubleSide,
 });
 const nebulaMesh = new THREE.Mesh(nebulaGeo, nebulaMat);
 nebulaMesh.position.set(nebulaParams.x, nebulaParams.y, nebulaParams.z);
 nebulaMesh.rotation.y = nebulaParams.rotY;
 nebulaMesh.scale.setScalar(nebulaParams.scale);
 nebulaMesh.renderOrder = 0; // detrás de todo
 scene.add(nebulaMesh);

 function regenerateNebula() {
  if (nebulaMat.map) nebulaMat.map.dispose();
  nebulaTex = buildNebulaTexture();
  nebulaMat.map = nebulaTex;
  nebulaMat.needsUpdate = true;
  requestRender();
 }

 function updateNebula() {
  nebulaMesh.position.set(nebulaParams.x, nebulaParams.y, nebulaParams.z);
  nebulaMesh.rotation.y = nebulaParams.rotY;
  nebulaMesh.scale.setScalar(nebulaParams.scale);
  requestRender();
 }

 // ── Viñeta espacial — frame visual sutil ─────────────────────────────────
 // Plano grande colocado muy cerca de la cámara (0.5u delante).
 // Canvas con gradiente radial INVERSO: centro transparente, bordes oscuros.
 // Siempre sigue la cámara en F4+ → efecto de viñeta constante.
 // renderOrder 99 → siempre encima de la escena.
 const vignetteTex = (() => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const c = cv.getContext("2d");
  const g = c.createRadialGradient(128, 128, 52, 128, 128, 148);
  g.addColorStop(0.0, "rgba(0, 0, 0, 0.00)"); // centro: completamente transparente
  g.addColorStop(0.55, "rgba(0, 0, 0, 0.00)"); // zona central sin tocar
  g.addColorStop(0.8, "rgba(0, 0, 0, 0.18)"); // inicio del oscurecimiento
  g.addColorStop(1.0, "rgba(0, 0, 0, 0.52)"); // bordes oscuros
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
 })();

 // Aspecto: dimensiones en mundo que correspondan al FOV y ratio de pantalla
 // Con FOV 35° y cámara a 0.5u delante: ancho ≈ 2×tan(17.5°)×0.5 ≈ 0.315u por lado
 // Pero queremos que cubra todo el viewport con algo de margen → usamos 1.4×1.4
 const vignetteGeo = new THREE.PlaneGeometry(1.4, 1.4);
 const vignetteMat = new THREE.MeshBasicMaterial({
  map: vignetteTex,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  depthTest: false, // siempre visible, nunca ocluida
  side: THREE.DoubleSide,
 });
 const vignetteMesh = new THREE.Mesh(vignetteGeo, vignetteMat);
 vignetteMesh.renderOrder = 99;
 scene.add(vignetteMesh);

 // ══════════════════════════════════════════════════════════════════════════
 // SATÉLITE MINIMAL + ESTRELLA FUGAZ
 // ══════════════════════════════════════════════════════════════════════════

 // ── Satélite ──────────────────────────────────────────────────────────────
 // Profundidad EXT_X-14 → detrás del claim (EXT_X-5.5), delante de la luna
 // Órbita elíptica: período ~48s, radio X=4.2, radio Z=1.8

 const satGroup = new THREE.Group();
 satGroup.visible = false;
 scene.add(satGroup);

 const SAT_ORBIT_X = EXT_X - 14;
 const SAT_ORBIT_Y = EXT_Y + 0.8;
 const SAT_ORBIT_Z = EXT_Z - 1.2;
 const SAT_RX = 4.2;
 const SAT_RZ = 1.8;

 // Cuerpo
 const satBodyGeo = new THREE.BoxGeometry(0.055, 0.035, 0.035);
 const satBodyMat = new THREE.MeshBasicMaterial({
  color: "#dce8ff",
  transparent: true,
  opacity: 0.0,
 });
 const satBody = new THREE.Mesh(satBodyGeo, satBodyMat);
 satGroup.add(satBody);

 // Paneles solares
 const satPanelGeo = new THREE.BoxGeometry(0.12, 0.006, 0.032);
 const satPanelMat = new THREE.MeshBasicMaterial({
  color: "#8898cc",
  transparent: true,
  opacity: 0.0,
 });
 const satPanelL = new THREE.Mesh(satPanelGeo, satPanelMat);
 satPanelL.position.set(-0.088, 0, 0);
 satGroup.add(satPanelL);

 const satPanelR = new THREE.Mesh(satPanelGeo, satPanelMat);
 satPanelR.position.set(0.088, 0, 0);
 satGroup.add(satPanelR);

 // Glow sprite — gradiente circular difuso, muy sutil
 const satGlowCv = document.createElement("canvas");
 satGlowCv.width = satGlowCv.height = 32;
 (() => {
  const c = satGlowCv.getContext("2d");
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0.0, "rgba(210, 230, 255, 0.90)");
  g.addColorStop(0.4, "rgba(180, 210, 255, 0.35)");
  g.addColorStop(1.0, "rgba(0, 0, 0, 0.00)");
  c.fillStyle = g;
  c.fillRect(0, 0, 32, 32);
 })();
 const satGlowTex = new THREE.CanvasTexture(satGlowCv);
 const satGlowMat = new THREE.SpriteMaterial({
  map: satGlowTex,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });
 const satGlowSprite = new THREE.Sprite(satGlowMat);
 satGlowSprite.scale.setScalar(0.18);
 satGroup.add(satGlowSprite);

 // ── Estrella fugaz ─────────────────────────────────────────────────────────
 // Estado: idle → active → idle. Período: 8–20s. Duración: ~0.85s.
 const shootingState = {
  phase: "idle",
  t: 0,
  nextAt: 10,
  _lastElapsed: 0,
  startX: 0,
  startY: 0,
  startZ: 0,
  dirX: 0,
  dirY: 0,
  dirZ: 0,
  length: 3.5,
 };

 const shootLineGeo = new THREE.BufferGeometry();
 const shootLinePos = new Float32Array(6);
 shootLineGeo.setAttribute("position", new THREE.BufferAttribute(shootLinePos, 3));

 const shootLineMat = new THREE.LineBasicMaterial({
  color: "#f0f6ff",
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  linewidth: 1,
 });
 const shootLine = new THREE.Line(shootLineGeo, shootLineMat);
 shootLine.renderOrder = 5;
 shootLine.visible = false;
 scene.add(shootLine);

 function spawnShootingStar() {
  const sx = EXT_X - 18 - Math.random() * 8;
  const sy = EXT_Y + 2.5 + Math.random() * 2.0;
  const sz = EXT_Z + (Math.random() - 0.5) * 4;
  const angle = Math.PI * (0.12 + Math.random() * 0.1);
  let dx = -1,
   dy = -Math.tan(angle),
   dz = (Math.random() - 0.3) * 0.4;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  dx /= len;
  dy /= len;
  dz /= len;
  Object.assign(shootingState, {
   startX: sx,
   startY: sy,
   startZ: sz,
   dirX: dx,
   dirY: dy,
   dirZ: dz,
   length: 2.8 + Math.random() * 1.4,
   phase: "active",
   t: 0,
  });
  shootLine.visible = true;
 }

 // ══════════════════════════════════════════════════════════════════════════
 // UFO — scroll-driven, declarativo, sin timers
 // ══════════════════════════════════════════════════════════════════════════
 //
 // El UFO ocupa el tramo sp 1.62 → 1.96 (dentro del plateau del claim).
 // Su posición es función pura del scroll — no hay estado ni timers.
 //
 // Trayectoria:
 //   - X fijo en UFO_X (profundidad capa intermedia)
 //   - Y fijo arriba del claim → UFO_BASE_Y = EXT_Y + 1.8
 //   - Z: barrido de +3.0 → -3.0 centrado en EXT_Z  (barrido horizontal legible)
 //     +3.0 = lateral derecho del claim, -3.0 = lateral izquierdo
 //     EXT_Z=0.55 → el UFO pasa exactamente sobre el centro del texto
 //
 // Influencia: beamInfl = falloff cuadrático según |ufoZ - EXT_Z|
 //   máximo cuando el UFO está centrado sobre el texto, cero a ±2.5u

 const UFO_X = EXT_X - 9; // profundidad intermedia
 const UFO_BASE_Y = EXT_Y + 1.8; // por encima del claim (EXT_Y-0.2)
 const UFO_SP_START = 1.62; // scroll en que entra
 const UFO_SP_END = 1.96; // scroll en que sale
 const UFO_Z_START = EXT_Z + 3.0; // lateral derecho
 const UFO_Z_END = EXT_Z - 3.0; // lateral izquierdo

 // Params controlables desde GUI
 const ufoParams = {
  visible: true,
  xOffset: 0.0, // se suma a UFO_X
  yOffset: 0.0, // se suma a UFO_BASE_Y
  scale: 0.58, // escala del modelo GLB
  rotYOffset: 0.0, // se suma a la rotación calculada
  glowIntensity: 1.0, // multiplicador de las luces internas
  beamOpacityMult: 1.0,
  beamWidth: 1.0, // escala X del haz
  beamLength: 1.0, // escala Y del haz
  underLightIntensity: 1.0, // multiplicador de ufoLight (azul bajo)
 };

 let ufoRoot = null;
 let ufoInnerLight = null; // ref. a la luz interior (se asigna al cargar)
 let ufoInnerRim = null; // ref. a la luz rim
 const UFO_INNER_LIGHT_BASE = 1.4;
 const UFO_INNER_RIM_BASE = 0.7;

 const ufoGroup = new THREE.Group();
 ufoGroup.visible = false;
 scene.add(ufoGroup);
 const ufoMaterials = [];

 // ── Haz triangular (ShapeGeometry) ───────────────────────────────────────
 // Triángulo isósceles: vértice arriba estrecho (bajo el UFO),
 // base abajo ancha pero acotada al ancho del claim (~1.6u).
 // Canvas con gradiente radial desde el vértice: cian en el apex,
 // transparente en la base → forma cónica natural, sin bordes duros.
 // AdditiveBlending → solo ilumina texto blanco/naranja, invisible sobre negro.
 (() => {
  // Shape: triángulo con vértice en (0, 0.9) y base en (-0.8, -0.9) / (0.8, -0.9)
  // total alto: 1.8u, base: 1.6u — acotado al ancho del claim
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.9); // vértice superior (apex, debajo del UFO)
  shape.lineTo(-0.8, -0.9); // esquina inferior izquierda
  shape.lineTo(0.8, -0.9); // esquina inferior derecha
  shape.closePath();
  window.__ufoBeamShape = shape;
 })();

 const ufoBeamGeo = new THREE.ShapeGeometry(window.__ufoBeamShape);
 delete window.__ufoBeamShape;

 // Textura del haz: gradiente radial desde el apex
 const ufoBeamTex = (() => {
  const cv = document.createElement("canvas");
  cv.width = 128;
  cv.height = 256;
  const c = cv.getContext("2d");
  // Gradiente radial centrado en el apex (arriba-centro)
  // Radio hasta la base: 256px
  const g = c.createRadialGradient(64, 0, 0, 64, 0, 260);
  g.addColorStop(0.0, "rgba(180, 255, 235, 0.72)"); // apex: cian brillante
  g.addColorStop(0.3, "rgba(140, 235, 215, 0.38)");
  g.addColorStop(0.65, "rgba(100, 210, 190, 0.15)");
  g.addColorStop(1.0, "rgba(60,  180, 160, 0.00)"); // base: transparente
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 256);
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
 })();

 const ufoBeamMat = new THREE.MeshBasicMaterial({
  map: ufoBeamTex,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
 });
 const ufoBeamMesh = new THREE.Mesh(ufoBeamGeo, ufoBeamMat);
 ufoBeamMesh.rotation.y = Math.PI * 0.5; // perpendicular al eje de visión
 ufoBeamMesh.visible = false;
 scene.add(ufoBeamMesh);

 // ── Overlays aditivos para intensificar letras ────────────────────────────
 // DOS planos muy pequeños, estrictamente del tamaño de cada línea de texto.
 // Sin blending normal — puramente AdditiveBlending.
 // Sobre fondo negro son invisibles. Solo afectan al texto brillante.
 //
 // ufoOverlayWhite  → título "Diseñando experiencias" (blanco → más blanco)
 //   tamaño: 3.0u × 0.42u (ancho claim, solo primera línea)
 //   posición: ligeramente por encima del centro del claim
 //
 // ufoOverlayOrange → "de otro planeta" (naranja → más naranja)
 //   tamaño: 1.8u × 0.38u (más estrecho, solo esa línea)
 //   posición: justo en la segunda línea
 //
 // El tamaño se corresponde visualmente con el canvas:
 //   claim en mundo: 3.8u × 1.19u, canvas lógico 1024×320
 //   línea 1 ocupa ~94/320 del alto → ~0.35u en mundo
 //   línea 2 ocupa ~88/320 del alto → ~0.33u en mundo

 // ── Overlays de glow por línea — gradiente elíptico, sin bordes duros ──────
 // Cada overlay usa una CanvasTexture con gradiente radial:
 //   centro: color brillante  →  borde: completamente transparente
 // Con AdditiveBlending son INVISIBLES sobre el fondo negro y solo
 // iluminan los píxeles del texto blanco/naranja que tienen color.
 // No crean rectángulos visibles — los bordes del gradiente llegan a 0.

 function makeGlowTex(r, g, b) {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 64; // ancho >> alto → forma elíptica natural
  const c = cv.getContext("2d");
  const gr = c.createRadialGradient(128, 32, 0, 128, 32, 128);
  gr.addColorStop(0.0, `rgba(${r},${g},${b},0.90)`); // centro: intenso
  gr.addColorStop(0.4, `rgba(${r},${g},${b},0.40)`);
  gr.addColorStop(0.75, `rgba(${r},${g},${b},0.10)`);
  gr.addColorStop(1.0, `rgba(${r},${g},${b},0.00)`); // borde: transparente
  c.fillStyle = gr;
  c.fillRect(0, 0, 256, 64);
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
 }

 // Línea 1 — "Diseñando experiencias" — glow blanco frío
 // Overlays desactivados — el efecto de escáner ocurre en drawClaimScan()
 // Stubs para que el cleanup existente no lance errores.
 const ufoOverlayWhiteGeo = new THREE.PlaneGeometry(0.01, 0.01);
 const ufoOverlayWhiteMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
 const ufoOverlayWhite = new THREE.Mesh(ufoOverlayWhiteGeo, ufoOverlayWhiteMat);
 ufoOverlayWhite.visible = false;
 scene.add(ufoOverlayWhite);

 const ufoOverlayOrangeGeo = new THREE.PlaneGeometry(0.01, 0.01);
 const ufoOverlayOrangeMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
 const ufoOverlayOrange = new THREE.Mesh(ufoOverlayOrangeGeo, ufoOverlayOrangeMat);
 ufoOverlayOrange.visible = false;
 scene.add(ufoOverlayOrange);

 // ── Carga del modelo ──────────────────────────────────────────────────────
 const ufoGLTFLoader = new GLTFLoader();
 ufoGLTFLoader.load(
  "/modelos/Ufo.glb",
  (gltf) => {
   ufoRoot = gltf.scene;
   ufoRoot.scale.setScalar(ufoParams.scale);
   ufoRoot.rotation.set(0, 0, 0);

   ufoRoot.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
     if (!mat) return;
     mat.transparent = true;
     mat.opacity = 0.0;
     mat.needsUpdate = true;
     // Subir brillo base del modelo: los GLBs espaciales suelen ser muy oscuros
     if (mat.color) mat.color.multiplyScalar(2.8);
     // Asegurar que no absorba demasiada luz en escena muy oscura
     if ("roughness" in mat) mat.roughness = Math.min(mat.roughness ?? 0.6, 0.65);
     if ("metalness" in mat) mat.metalness = Math.max(mat.metalness ?? 0.2, 0.25);
     ufoMaterials.push(mat);
    });
   });

   // Luz interior del UFO — rim light suave desde abajo/frente
   // Ilumina el propio modelo dando silueta sin parecer cartoon
   ufoInnerLight = new THREE.PointLight("#a8d4ff", UFO_INNER_LIGHT_BASE, 2.8, 1.8);
   ufoInnerLight.position.set(0, -0.25, 0.3); // ligeramente debajo y al frente
   ufoGroup.add(ufoInnerLight);

   // Segundo punto de luz para definir el borde superior (rim)
   ufoInnerRim = new THREE.PointLight("#cce8ff", UFO_INNER_RIM_BASE, 2.0, 2);
   ufoInnerRim.position.set(0, 0.4, -0.2);
   ufoGroup.add(ufoInnerRim);

   ufoGroup.add(ufoRoot);
   console.log("[UFO] Cargado —", ufoMaterials.length, "materiales");
   requestRender();
  },
  undefined,
  (err) => console.error("[UFO] Error:", err),
 );

 function updateUfo() {
  if (ufoRoot) ufoRoot.scale.setScalar(ufoParams.scale);
  if (ufoInnerLight)
   ufoInnerLight.intensity = UFO_INNER_LIGHT_BASE * ufoParams.underLightIntensity * ufoParams.glowIntensity;
  if (ufoInnerRim) ufoInnerRim.intensity = UFO_INNER_RIM_BASE * ufoParams.glowIntensity;
  requestRender();
 }

 // Stub de compatibilidad (cleanup existente lo disposa)
 const extUfoScanGeo = new THREE.PlaneGeometry(0.01, 0.01);
 const extUfoScanMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
 const extUfoScanPlane = new THREE.Mesh(extUfoScanGeo, extUfoScanMat);
 extUfoScanPlane.visible = false;
 scene.add(extUfoScanPlane);

 // ── makeTextCanvas — alta resolución (S×3 internamente) ───────────────────
 // El drawFn recibe dimensiones LÓGICAS normales. ctx.scale(S,S) ya aplicado.
 // El plano 3D tiene dimensiones físicas controladas → textura densa → nitidez.
 function makeTextCanvas(logicalW, logicalH, drawFn) {
  const S = 3;
  const cv = document.createElement("canvas");
  cv.width = logicalW * S;
  cv.height = logicalH * S;
  const ctx = cv.getContext("2d");
  ctx.scale(S, S);
  drawFn(ctx, logicalW, logicalH);
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.generateMipmaps = true;
  return tex;
 }

 // ── Plano HALO — gradiente radial detrás del claim ────────────────────────
 // No es un rectángulo: canvas con gradiente radial transparente en los bordes.
 // Oscurece sutilmente el fondo justo detrás del texto → el texto "emerge"
 // del espacio en lugar de flotar sobre negro liso.
 // ── Halo detrás del claim ────────────────────────────────────────────────
 // Gradiente elíptico vertical (más alto que ancho) — sigue la forma
 // del bloque de texto, no un círculo. Negro puro, muy controlado.
 // No crea mancha visible: los bordes son completamente transparentes.
 const HALO_A_TEX = makeTextCanvas(360, 200, (ctx, w, h) => {
  // Gradiente elíptico: radio horizontal menor que vertical
  const rx = w * 0.42,
   ry = h * 0.48;
  const cx = w * 0.5,
   cy = h * 0.5;
  // Usamos transformación de escala para simular elipse en createRadialGradient
  ctx.save();
  ctx.scale(1, h / w); // aplana el gradiente verticalmente
  const g = ctx.createRadialGradient(cx, cy * (w / h), 0, cx, cy * (w / h), rx);
  g.addColorStop(0.0, "rgba(0, 0, 0, 0.42)");
  g.addColorStop(0.45, "rgba(0, 0, 0, 0.18)");
  g.addColorStop(1.0, "rgba(0, 0, 0, 0.00)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, w); // cuadrado que ctx.scale convierte en rectángulo
  ctx.restore();
 });

 const extPlaneHaloGeo = new THREE.PlaneGeometry(4.0, 4.0 * (200 / 360));
 const extPlaneHaloMat = new THREE.MeshBasicMaterial({
  map: HALO_A_TEX,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  side: THREE.DoubleSide,
 });
 const extPlaneHalo = new THREE.Mesh(extPlaneHaloGeo, extPlaneHaloMat);
 extPlaneHalo.position.set(EXT_X - 5.42, EXT_Y - 0.2, EXT_Z);
 extPlaneHalo.rotation.y = Math.PI * 0.5;
 scene.add(extPlaneHalo);

 // ── Plano A — Claim narrativo — canvas mutable para efecto escáner UFO ───
 //
 // La textura se dibuja en un canvas persistente.
 // drawClaimScan(scanInfl) redibuja con colores boosteados en las letras:
 //   scanInfl=0   → estado base (como antes)
 //   scanInfl=1   → máximo brillo del escáner
 // El efecto existe SOLO en los píxeles del texto — clearRect limpia el fondo
 // a transparente en cada redibujado → el negro del fondo es el de la escena,
 // nunca un rectángulo pintado.

 // Params controlables desde GUI
 const claimParams = {
  visible: true,
  x: EXT_X - 5.5,
  y: EXT_Y - 0.2,
  z: EXT_Z,
  scale: 1.0,
  opacityMult: 1.0,
  orangeColor: "#ff6b2c", // color "de otro planeta"
  glowIntensity: 1.0, // multiplicador del pulso naranja (extGlowMat)
  haloOpacityMult: 1.0, // multiplicador del halo elíptico de fondo
  subtitleVisible: true, // muestra/oculta el subtítulo
  subtitleText: "Frontend · Three.js · Experiencias interactivas",
 };

 const S_CLAIM = 3;
 const W_CLAIM = 1024;
 const H_CLAIM = 320;
 const claimCanvas = document.createElement("canvas");
 claimCanvas.width = W_CLAIM * S_CLAIM;
 claimCanvas.height = H_CLAIM * S_CLAIM;
 const claimCtx = claimCanvas.getContext("2d");
 claimCtx.scale(S_CLAIM, S_CLAIM);

 function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
   r: parseInt(h.substring(0, 2), 16),
   g: parseInt(h.substring(2, 4), 16),
   b: parseInt(h.substring(4, 6), 16),
  };
 }

 function drawClaimScan(scanInfl) {
  const ctx = claimCtx;
  const w = W_CLAIM;
  const h = H_CLAIM; // eslint-disable-line no-unused-vars
  ctx.clearRect(0, 0, w, H_CLAIM);
  const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif";

  // Línea 1 — "Diseñando experiencias"
  // shadowBlur: 20 base → 48 máx   |   shadow alpha: 0.35 → 0.90
  const sA1 = 0.35 + scanInfl * 0.55;
  const sR1 = Math.round(180 + scanInfl * 75);
  const sG1 = Math.round(210 + scanInfl * 45);
  ctx.font = `300 68px ${SANS}`;
  ctx.textAlign = "center";
  ctx.shadowColor = `rgba(${sR1},${sG1},255,${sA1.toFixed(2)})`;
  ctx.shadowBlur = 20 + scanInfl * 28;
  ctx.fillStyle = "rgba(240, 246, 255, 1.0)";
  ctx.fillText("Diseñando experiencias", w * 0.5, 94);
  ctx.shadowBlur = 0;

  // Línea 2 — "de otro planeta" — color controlable
  const oc = hexToRgb(claimParams.orangeColor);
  // Intensifica canales G/B con el scanner
  const oG = Math.min(255, Math.round(oc.g + scanInfl * 33));
  const oB = Math.min(255, Math.round(oc.b + scanInfl * 36));
  const oA = 0.5 + scanInfl * 0.45;
  ctx.font = `700 68px ${SANS}`;
  ctx.shadowColor = `rgba(${oc.r},${oc.g},${oc.b},${oA.toFixed(2)})`;
  ctx.shadowBlur = 28 + scanInfl * 32;
  ctx.fillStyle = `rgba(${oc.r},${oG},${oB},1.0)`;
  ctx.fillText("de otro planeta", w * 0.5, 182);
  ctx.shadowBlur = 0;

  // Separador + rombo — usa el mismo color naranja
  ctx.strokeStyle = `rgba(${oc.r},${oc.g},${oc.b},0.60)`;
  ctx.lineWidth = 0.8;
  const lineW = w * 0.28;
  const lineY = 207;
  ctx.beginPath();
  ctx.moveTo(w * 0.5 - lineW - 12, lineY);
  ctx.lineTo(w * 0.5 - 12, lineY);
  ctx.stroke();
  ctx.fillStyle = `rgba(${oc.r},${oc.g},${oc.b},0.70)`;
  ctx.save();
  ctx.translate(w * 0.5, lineY);
  ctx.rotate(Math.PI * 0.25);
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(w * 0.5 + 12, lineY);
  ctx.lineTo(w * 0.5 + lineW + 12, lineY);
  ctx.stroke();

  // Subtítulo — opcional
  if (claimParams.subtitleVisible) {
   ctx.font = `300 20px ${SANS}`;
   ctx.fillStyle = "rgba(168, 188, 232, 0.72)";
   ctx.fillText(claimParams.subtitleText, w * 0.5, 258);
  }
 }

 drawClaimScan(0); // dibujado inicial sin efecto

 const PLANE_A_TEX = new THREE.CanvasTexture(claimCanvas);
 PLANE_A_TEX.minFilter = THREE.LinearMipmapLinearFilter;
 PLANE_A_TEX.magFilter = THREE.LinearFilter;
 PLANE_A_TEX.anisotropy = renderer.capabilities.getMaxAnisotropy();
 PLANE_A_TEX.generateMipmaps = true;

 const extPlaneAGeo = new THREE.PlaneGeometry(3.8, 3.8 * (320 / 1024));
 const extPlaneAMat = new THREE.MeshBasicMaterial({
  map: PLANE_A_TEX,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  side: THREE.DoubleSide,
 });
 const extPlaneA = new THREE.Mesh(extPlaneAGeo, extPlaneAMat);
 extPlaneA.position.set(EXT_X - 5.5, EXT_Y - 0.2, EXT_Z);
 extPlaneA.rotation.y = Math.PI * 0.5;
 scene.add(extPlaneA);

 // ── Plano GLOW — overlay naranja vivo sobre "de otro planeta" ───────────
 // Plano mínimo del mismo tamaño que el claim.
 // Color controlable desde GUI (sincronizado con claimParams.orangeColor).
 // Posicionado 0.02u más cerca de cámara que extPlaneA.
 const extGlowGeo = new THREE.PlaneGeometry(3.8, 3.8 * (320 / 1024));
 const extGlowMat = new THREE.MeshBasicMaterial({
  color: claimParams.orangeColor,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  side: THREE.DoubleSide,
 });
 const extGlowPlane = new THREE.Mesh(extGlowGeo, extGlowMat);
 extGlowPlane.position.set(EXT_X - 5.48, EXT_Y - 0.2, EXT_Z); // 0.02u más cerca
 extGlowPlane.rotation.y = Math.PI * 0.5;
 scene.add(extGlowPlane);

 // ── updateClaim — aplica params a los 3 planos (A + halo + glow) ─────────
 function updateClaim() {
  // Posición base (el halo va 0.08u detrás del claim; el glow 0.02u delante)
  extPlaneA.position.set(claimParams.x, claimParams.y, claimParams.z);
  extPlaneHalo.position.set(claimParams.x + 0.08, claimParams.y, claimParams.z);
  extGlowPlane.position.set(claimParams.x + 0.02, claimParams.y, claimParams.z);
  // Escala uniforme
  extPlaneA.scale.setScalar(claimParams.scale);
  extPlaneHalo.scale.setScalar(claimParams.scale);
  extGlowPlane.scale.setScalar(claimParams.scale);
  // Color del glow plane
  extGlowMat.color.set(claimParams.orangeColor);
  // Redibujar canvas (color/subtítulo pueden haber cambiado)
  drawClaimScan(extPlaneA.userData.lastInfl ?? 0);
  PLANE_A_TEX.needsUpdate = true;
  requestRender();
 }

 // ── Plano C — Texto técnico / señal (todo en español) ────────────────────
 const PLANE_C_TEX = makeTextCanvas(700, 230, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const FM = "'Courier New', 'Lucida Console', monospace";

  ctx.strokeStyle = "rgba(255, 107, 44, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 14);
  ctx.lineTo(w * 0.5, 42);
  ctx.stroke();

  ctx.font = `13px ${FM}`;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 107, 44, 0.72)";
  ctx.fillText("◈", w * 0.5 - 96, 80);

  ctx.fillStyle = "rgba(120, 140, 215, 0.65)";
  ctx.fillText("SEÑAL ENTRANTE", w * 0.5 + 8, 80);

  ctx.font = `bold 24px ${FM}`;
  ctx.shadowColor = "rgba(185, 205, 255, 0.25)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "rgba(200, 218, 255, 0.96)";
  ctx.fillText("ENLACE AL ARCHIVO ESTABLECIDO", w * 0.5, 128);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(255, 107, 44, 0.35)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(w * 0.22, 150);
  ctx.lineTo(w * 0.78, 150);
  ctx.stroke();

  ctx.font = `15px ${FM}`;
  ctx.fillStyle = "rgba(105, 125, 200, 0.58)";
  ctx.fillText("04 ENTRADAS  ·  DESPLÁZATE PARA VER ↓", w * 0.5, 183);

  ctx.strokeStyle = "rgba(255, 107, 44, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 200);
  ctx.lineTo(w * 0.5, 220);
  ctx.stroke();
 });

 const extPlaneCGeo = new THREE.PlaneGeometry(3.0, 3.0 * (230 / 700));
 const extPlaneCMat = new THREE.MeshBasicMaterial({
  map: PLANE_C_TEX,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  side: THREE.DoubleSide,
 });
 const extPlaneC = new THREE.Mesh(extPlaneCGeo, extPlaneCMat);
 extPlaneC.position.set(EXT_X - 5.5, EXT_Y - 0.1, EXT_Z);
 extPlaneC.rotation.y = Math.PI * 0.5;
 scene.add(extPlaneC);

 /**
  * =========================================================
  * UPDATE WINDOW
  * =========================================================
  */
 function updateWindow() {
  const outerWidth = windowParams.width;
  const outerHeight = windowParams.height;
  const frameThickness = windowParams.frameThickness;
  const innerPadding = windowParams.innerPadding;
  const frameDepth = windowParams.frameDepth;

  const innerWidth = Math.max(0.1, outerWidth - frameThickness * 2 - innerPadding * 2);
  const innerHeight = Math.max(0.1, outerHeight - frameThickness * 2 - innerPadding * 2);

  const revealDepth = windowParams.revealDepth;
  const revealThickness = windowParams.revealThickness;

  windowGroup.position.set(windowParams.x, windowParams.y, windowParams.z);

  topFrame.scale.set(outerWidth, frameThickness, frameDepth);
  topFrame.position.set(0, outerHeight * 0.5 - frameThickness * 0.5, 0);

  bottomFrame.scale.set(outerWidth, frameThickness, frameDepth);
  bottomFrame.position.set(0, -outerHeight * 0.5 + frameThickness * 0.5, 0);

  leftFramePiece.scale.set(frameThickness, outerHeight - frameThickness * 2, frameDepth);
  leftFramePiece.position.set(-outerWidth * 0.5 + frameThickness * 0.5, 0, 0);

  rightFramePiece.scale.set(frameThickness, outerHeight - frameThickness * 2, frameDepth);
  rightFramePiece.position.set(outerWidth * 0.5 - frameThickness * 0.5, 0, 0);

  centerMullion.scale.set(windowParams.mullionWidth, innerHeight, frameDepth * 0.95);
  centerMullion.position.set(0, 0, 0);
  centerMullion.visible = false;

  windowGlass.scale.set(innerWidth, innerHeight, 1);
  windowGlass.position.set(0, 0, windowParams.glassOffset);
  windowGlass.renderOrder = 20;

  revealTop.scale.set(innerWidth, revealThickness, revealDepth);
  revealTop.position.set(0, innerHeight * 0.5 - revealThickness * 0.5, -revealDepth * 0.5);

  revealBottom.scale.set(innerWidth, revealThickness, revealDepth);
  revealBottom.position.set(0, -innerHeight * 0.5 + revealThickness * 0.5, -revealDepth * 0.5);

  revealLeft.scale.set(revealThickness, innerHeight, revealDepth);
  revealLeft.position.set(-innerWidth * 0.5 + revealThickness * 0.5, 0, -revealDepth * 0.5);

  revealRight.scale.set(revealThickness, innerHeight, revealDepth);
  revealRight.position.set(innerWidth * 0.5 - revealThickness * 0.5, 0, -revealDepth * 0.5);

  windowSill.scale.set(innerWidth + 0.16, windowParams.sillHeight, windowParams.sillDepth);
  windowSill.position.set(
   0,
   -outerHeight * 0.5 - windowParams.sillHeight * 0.5 + frameThickness,
   -windowParams.sillDepth * 0.35,
  );

  outerGlow.scale.set(windowParams.glowWidth, windowParams.glowHeight, 1);
  outerGlow.position.set(0, 0, windowParams.glowOffset);
  outerGlowMaterial.color.set(windowParams.glowColor);

  updateLeftWallCutout();
  updateSpace();
  requestRender();
 }

 updateWindow();

 // ══════════════════════════════════════════════════════════════════════════
 // NEÓN "DAVID LLONA" — letrero de tubo 3D montado en pared
 // ══════════════════════════════════════════════════════════════════════════
 //
 // Arquitectura física real — sin CanvasTexture para las letras:
 //
 //   neonGroup          — Group raíz, controlado por neonParams (GUI)
 //   ├─ backPlate       — placa trasera fina y oscura (aluminio anodizado)
 //   ├─ wireMeshes[]    — uno por trazo de cada letra (TubeGeometry)
 //   │    ├─ coreMat    — núcleo casi blanco, muy emissive (vidrio incandescente)
 //   │    └─ glowMat    — tubo exterior violeta, transparente, AdditiveBlending
 //   ├─ glowSprites[]   — uno por letra, Sprite con gradiente radial suave
 //   ├─ neonWallMesh    — plano en la pared con gradiente de contaminación
 //   ├─ neonLight       — PointLight principal de rebote
 //   ├─ neonLight2      — segunda PointLight desplazada, da volumen al rebote
 //   └─ mountPins[]     — pequeñas esferas de acero que anclan la placa a la pared
 //
 // Animación: máquina de estados por intensidad de emissive por letra.
 //   Las letras NUNCA se apagan del todo — brillo residual 0.08.
 //   "I" (idx 3) y "A" final (idx 10) = mensaje oculto AI.

 const NEON_COLOR = new THREE.Color("#7b5fff");
 const NEON_CORE = new THREE.Color("#e8e0ff"); // blanco-violeta del núcleo
 const NEON_TUBE = new THREE.Color("#7b5fff"); // violeta del tubo exterior
 const NEON_RESIDUAL = 0.08; // emissive mínimo al "apagarse"
 const AI_INDICES = [3, 10]; // I y A — índices en "DAVID LLONA" (sin espacio: D0 A1 V2 I3 D4 L5 L6 O7 N8 A9)

 // ── Parámetros editables por GUI ──────────────────────────────────────────
 const neonParams = {
  x: 1.2,
  y: 6.2,
  z: -3.96,
  scale: 1.0,
  intensity: 1.0,
  glowStrength: 1.35, // ↑ halo más presente (era 1.0)
  flickerSpeed: 1.0,
 };

 // ── Máquina de estados ────────────────────────────────────────────────────
 // "DAVID LLONA" sin espacio = 10 letras (índices 0–9)
 // D(0) A(1) V(2) I(3) D(4) L(5) L(6) O(7) N(8) A(9)
 const NEON_LETTER_COUNT = 10;

 const neonState = {
  phase: "FULL", // FULL | FLICKER | AI | BUILD
  t: 0,
  // emissive por letra: 1.0 = encendida al máximo, NEON_RESIDUAL = fantasma
  lit: new Float32Array(NEON_LETTER_COUNT).fill(1.0),
  target: new Float32Array(NEON_LETTER_COUNT).fill(1.0),
 };

 const NEON_PHASES = {
  FULL: { duration: 4.5 },
  FLICKER: { duration: 2.4 },
  AI: { duration: 3.4 },
  BUILD: { duration: 2.8 },
 };

 // ── Definición de trazos por letra ────────────────────────────────────────
 //
 // Coordenadas en espacio local de la letra, unidad = 1 = altura de la letra.
 // Cada letra puede tener 1 o más trazos (strokes).
 // Cada trazo es un array de Vector3 que serán control points de CatmullRomCurve3.
 // Las letras se apilarán horizontalmente con un letterSpacing constante.
 //
 // Sistema de coordenadas: X = derecha, Y = arriba, Z = 0 (en pared, desplazado después)
 // Bbox de referencia: x ∈ [0, 0.6], y ∈ [0, 1.0]

 const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

 const LETTER_STROKES = {
  D: [
   // Palo vertical izquierdo
   [V(0.05, 0.0), V(0.05, 0.5), V(0.05, 1.0)],
   // Curva derecha (media luna)
   [V(0.05, 1.0), V(0.45, 0.95), V(0.62, 0.72), V(0.65, 0.5), V(0.62, 0.28), V(0.45, 0.05), V(0.05, 0.0)],
  ],
  A: [
   // Pata izquierda
   [V(0.0, 0.0), V(0.12, 0.33), V(0.28, 0.68), V(0.3, 1.0)],
   // Pata derecha
   [V(0.6, 0.0), V(0.48, 0.33), V(0.32, 0.68), V(0.3, 1.0)],
   // Travesaño
   [V(0.1, 0.42), V(0.3, 0.42), V(0.5, 0.42)],
  ],
  V: [
   // Pata izquierda
   [V(0.0, 1.0), V(0.12, 0.65), V(0.28, 0.32), V(0.3, 0.0)],
   // Pata derecha
   [V(0.6, 1.0), V(0.48, 0.65), V(0.32, 0.32), V(0.3, 0.0)],
  ],
  I: [
   // Palo vertical
   [V(0.3, 0.0), V(0.3, 0.5), V(0.3, 1.0)],
   // Serif superior
   [V(0.1, 1.0), V(0.3, 1.0), V(0.5, 1.0)],
   // Serif inferior
   [V(0.1, 0.0), V(0.3, 0.0), V(0.5, 0.0)],
  ],
  L: [
   // Palo vertical
   [V(0.05, 1.0), V(0.05, 0.5), V(0.05, 0.0)],
   // Base horizontal
   [V(0.05, 0.0), V(0.32, 0.0), V(0.58, 0.0)],
  ],
  O: [
   // Elipse cerrada — dividida en dos semicírculos para que sea un tubo continuo
   [
    V(0.3, 1.0),
    V(0.62, 0.92),
    V(0.72, 0.65),
    V(0.72, 0.5),
    V(0.72, 0.35),
    V(0.62, 0.08),
    V(0.3, 0.0),
    V(-0.02, 0.08),
    V(-0.12, 0.35),
    V(-0.12, 0.5),
    V(-0.12, 0.65),
    V(-0.02, 0.92),
    V(0.3, 1.0),
   ],
  ],
  N: [
   // Palo izquierdo
   [V(0.05, 0.0), V(0.05, 0.5), V(0.05, 1.0)],
   // Diagonal
   [V(0.05, 1.0), V(0.22, 0.75), V(0.38, 0.5), V(0.55, 0.25), V(0.58, 0.0)],
   // Palo derecho
   [V(0.58, 0.0), V(0.58, 0.5), V(0.58, 1.0)],
  ],
 };

 // Orden de letras en "DAVID LLONA"
 // (espacio entre "DAVID" y "LLONA" se gestiona con letterSpacing extra)
 const WORD_LAYOUT = [
  { char: "D", idx: 0 },
  { char: "A", idx: 1 },
  { char: "V", idx: 2 },
  { char: "I", idx: 3 },
  { char: "D", idx: 4 },
  { char: " " }, // espacio — gap extra
  { char: "L", idx: 5 },
  { char: "L", idx: 6 },
  { char: "O", idx: 7 },
  { char: "N", idx: 8 },
  { char: "A", idx: 9 },
 ];

 // ── Materiales del tubo ───────────────────────────────────────────────────
 //
 // Dos materiales por trazo (se asignan a un Group con dos Mesh):
 //   coreMat  — MeshStandardMaterial emissive brillante (núcleo del tubo)
 //   glowMat  — MeshStandardMaterial emissive más oscuro + transparente (vidrio)
 //
 // No usamos AdditiveBlending en los tubos — querían ser objetos físicos.
 // El glow se logra por emissiveIntensity alta + la PointLight de rebote.

 const neonCoreMats = []; // un material por letra (índice 0–9)
 const neonGlowMats = [];
 const neonGlowSpriteMats = []; // SpriteMaterial por letra para el halo 2D

 for (let i = 0; i < NEON_LETTER_COUNT; i++) {
  neonCoreMats.push(
   new THREE.MeshStandardMaterial({
    color: NEON_CORE,
    emissive: NEON_CORE,
    emissiveIntensity: 2.1,
    roughness: 0.0,
    metalness: 0.0,
    transparent: false,
   }),
  );

  neonGlowMats.push(
   new THREE.MeshStandardMaterial({
    color: NEON_TUBE,
    emissive: NEON_TUBE,
    emissiveIntensity: 1.2,
    roughness: 0.15,
    metalness: 0.0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.FrontSide,
   }),
  );

  // Sprite de halo suave por letra — gradiente radial violeta
  neonGlowSpriteMats.push(
   new THREE.SpriteMaterial({
    map: (() => {
     const cv = document.createElement("canvas");
     cv.width = cv.height = 64;
     const c = cv.getContext("2d");
     const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
     g.addColorStop(0.0, "rgba(160, 120, 255, 0.55)");
     g.addColorStop(0.4, "rgba(120,  80, 220, 0.20)");
     g.addColorStop(1.0, "rgba(0,  0, 0, 0.00)");
     c.fillStyle = g;
     c.fillRect(0, 0, 64, 64);
     const t = new THREE.CanvasTexture(cv);
     t.needsUpdate = true;
     return t;
    })(),
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
   }),
  );
 }

 // ── Construcción geométrica ───────────────────────────────────────────────
 //
 // letterWidth  = ancho de cada caja de letra en unidades de escena
 // letterHeight = altura
 // letterGap    = espacio entre letras
 // wordGap      = espacio extra entre palabras
 //
 // El Group neonGroup se escala en tick() según neonParams.scale.

 const neonGroup = new THREE.Group();
 scene.add(neonGroup);

 const LETTER_H = 0.38; // altura de cada letra en unidades de escena
 const LETTER_W = 0.6 * LETTER_H; // ancho proporcional
 const LETTER_GAP = 0.14 * LETTER_H; // espacio entre letras
 const WORD_GAP = 0.3 * LETTER_H; // espacio extra entre palabras
 const TUBE_R_CORE = 0.01; // radio del núcleo (vidrio incandescente)
 const TUBE_R_GLOW = 0.017; // radio del tubo exterior (vidrio coloreado)
 const TUBE_SEGS = 5; // segmentos radiales del tubo (bajo = efecto tubo real)

 // Calculamos el ancho total para centrar el letrero
 let totalWidth = 0;
 WORD_LAYOUT.forEach((entry) => {
  totalWidth += entry.char === " " ? WORD_GAP : LETTER_W + LETTER_GAP;
 });
 totalWidth -= LETTER_GAP; // quitar el gap del último carácter

 // Meshes agrupados por letra para animación de intensidad
 const neonLetterGroups = []; // índice = letra idx (0–9)
 for (let i = 0; i < NEON_LETTER_COUNT; i++) {
  const g = new THREE.Group();
  neonGroup.add(g);
  neonLetterGroups.push(g);
 }

 // Sprites de glow — uno por letra, posicionado en el centro de la bbox
 const neonGlowSprites = [];
 for (let i = 0; i < NEON_LETTER_COUNT; i++) {
  const sp = new THREE.Sprite(neonGlowSpriteMats[i]);
  sp.scale.set(LETTER_W * 2.5, LETTER_H * 2.2, 1);
  neonGroup.add(sp);
  neonGlowSprites.push(sp);
 }

 // Construir los tubos de cada letra
 let cursorX = -totalWidth * 0.5;

 WORD_LAYOUT.forEach((entry) => {
  if (entry.char === " ") {
   cursorX += WORD_GAP;
   return;
  }

  const lIdx = entry.idx;
  const strokes = LETTER_STROKES[entry.char];
  const lGroup = neonLetterGroups[lIdx];
  const coreMat = neonCoreMats[lIdx];
  const glowMat = neonGlowMats[lIdx];

  // Centro de la letra en X (para el sprite de glow)
  const letterCenterX = cursorX + LETTER_W * 0.5;

  strokes.forEach((pts) => {
   // Escalar puntos del trazo al espacio de escena
   const scaledPts = pts.map((p) => new THREE.Vector3(cursorX + p.x * LETTER_W, p.y * LETTER_H, p.z));

   const curve = new THREE.CatmullRomCurve3(scaledPts, false, "catmullrom", 0.5);
   const tubePts = Math.max(20, scaledPts.length * 10);

   // Tubo núcleo (vidrio incandescente)
   const coreGeo = new THREE.TubeGeometry(curve, tubePts, TUBE_R_CORE, TUBE_SEGS, false);
   const coreMesh = new THREE.Mesh(coreGeo, coreMat);
   lGroup.add(coreMesh);

   // Tubo exterior (vidrio coloreado)
   const glowGeo = new THREE.TubeGeometry(curve, tubePts, TUBE_R_GLOW, TUBE_SEGS, false);
   const glowMesh = new THREE.Mesh(glowGeo, glowMat);
   lGroup.add(glowMesh);
  });

  // Posicionar sprite de glow en el centro vertical de la letra
  neonGlowSprites[lIdx].position.set(letterCenterX, LETTER_H * 0.5, 0.02);

  cursorX += LETTER_W + LETTER_GAP;
 });

 // ── Placa trasera fina (aluminio anodizado oscuro) ─────────────────────────
 //
 // Placa casi negra con un tinte metálico muy sutil.
 // No debe destacar — es el soporte silencioso del letrero.
 const backPlateGeo = new THREE.BoxGeometry(totalWidth + 0.12, LETTER_H + 0.1, 0.008);
 const backPlateMat = new THREE.MeshStandardMaterial({
  color: "#1a1822",
  roughness: 0.55,
  metalness: 0.65,
  envMapIntensity: 0.2,
 });
 const backPlateMesh = new THREE.Mesh(backPlateGeo, backPlateMat);
 backPlateMesh.position.set(0, LETTER_H * 0.5, -0.018); // 18mm detrás de los tubos
 neonGroup.add(backPlateMesh);

 // ── Pines de anclaje — pequeñas esferas de acero ─────────────────────────
 const pinGeo = new THREE.SphereGeometry(0.007, 6, 6);
 const pinMat = new THREE.MeshStandardMaterial({
  color: "#888898",
  roughness: 0.4,
  metalness: 0.9,
 });
 const pinPositionsX = [-totalWidth * 0.5 + 0.06, 0, totalWidth * 0.5 - 0.06];
 pinPositionsX.forEach((px) => {
  const pin = new THREE.Mesh(pinGeo, pinMat);
  pin.position.set(px, LETTER_H * 0.5, -0.022);
  neonGroup.add(pin);
 });

 // ── Mancha de contaminación en la pared ───────────────────────────────────
 //
 // Plano pegado a la pared trasera con textura de gradiente radial.
 // Simula el rebote difuso de luz violeta sobre el hormigón.
 const neonWallCv = document.createElement("canvas");
 neonWallCv.width = 256;
 neonWallCv.height = 128;
 (() => {
  const c = neonWallCv.getContext("2d");
  const g = c.createRadialGradient(128, 64, 0, 128, 64, 128);
  g.addColorStop(0.0, "rgba(100, 65, 240, 0.32)");
  g.addColorStop(0.35, "rgba(75,  45, 180, 0.14)");
  g.addColorStop(0.7, "rgba(50,  30, 120, 0.05)");
  g.addColorStop(1.0, "rgba(0,   0,   0, 0.00)");
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 128);
 })();
 const neonWallTex = new THREE.CanvasTexture(neonWallCv);
 const neonWallMat = new THREE.MeshBasicMaterial({
  map: neonWallTex,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
 });
 const neonWallGeo = new THREE.PlaneGeometry(totalWidth * 2.8, LETTER_H * 4.0);
 const neonWallMesh = new THREE.Mesh(neonWallGeo, neonWallMat);
 neonWallMesh.position.set(0, LETTER_H * 0.5, -0.03); // pegado a la pared
 neonGroup.add(neonWallMesh); // forma parte del grupo → se mueve con él

 // ── Luces de rebote ───────────────────────────────────────────────────────
 //
 // Dos PointLights ligeramente desplazadas dan un rebote volumétrico.
 // La segunda está más baja y tenue — crea un gradiente natural.
 const neonLight = new THREE.PointLight(NEON_TUBE, 0.75, 7.5, 2);
 const neonLight2 = new THREE.PointLight(NEON_TUBE, 0.42, 5.5, 2.2);
 scene.add(neonLight);
 scene.add(neonLight2);

 // ── Posicionamiento inicial ───────────────────────────────────────────────
 neonGroup.position.set(neonParams.x, neonParams.y, neonParams.z);
 neonGroup.scale.setScalar(neonParams.scale);
 neonLight.position.set(neonParams.x, neonParams.y + 0.1, neonParams.z + 0.4);
 neonLight2.position.set(neonParams.x + 0.5, neonParams.y - 0.2, neonParams.z + 0.3);

 // Stub de compatibilidad para el cleanup existente — variables esperadas
 // por las secciones de GUI tick y dispose que no queremos tocar.
 // neonMesh, neonTexture, neonMat, neonHaloGeo, etc. se eliminan del cleanup
 // a continuación, pero mantenemos las referencias nulas para evitar errores.
 const neonMesh = null; // obsoleto — sustituido por neonGroup
 const neonTexture = null; // obsoleto
 const neonMat = null; // obsoleto
 const neonHaloGeo = null; // obsoleto
 const neonHaloTex = null; // obsoleto
 const neonHaloMat = null; // obsoleto
 const neonHaloMesh = null; // obsoleto
 // neonWallGeo — la geometría real vive dentro de neonGroup y se libera al traversarlo
 // neonWallTex, neonWallMat, neonWallMesh → los nuevos están en neonGroup

 // ── Llamas del cohete — propulsión decorativa premium ────────────────────
 //
 // Arquitectura en capas concéntricas desde el núcleo hacia fuera:
 //   L0: núcleo — cono corto blanco-amarillo casi sólido (calor máximo)
 //   L1: media  — cono amarillo-naranja, algo más ancho y largo
 //   L2: exterior — cono naranja-ámbar, el más ancho, muy transparente
 //   L3: glow   — sprite canvas con gradiente radial, AdditiveBlending
 //
 // Todo sale hacia ABAJO (rotation.z = Math.PI en conos, Y negativo en sprite).
 // El sprite actúa como halo suave que "contamina" la mesa con luz cálida.

 const flameGroup = new THREE.Group();
 scene.add(flameGroup);
 flameGroup.visible = false;

 // ── Canvas de glow para el sprite ────────────────────────────────────────
 const flameGlowCv = document.createElement("canvas");
 flameGlowCv.width = flameGlowCv.height = 64;
 (() => {
  const c = flameGlowCv.getContext("2d");
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0.0, "rgba(255, 220, 100, 0.85)");
  g.addColorStop(0.3, "rgba(255, 150,  30, 0.45)");
  g.addColorStop(0.65, "rgba(255,  90,  10, 0.18)");
  g.addColorStop(1.0, "rgba(0, 0, 0, 0.00)");
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
 })();
 const flameGlowTex = new THREE.CanvasTexture(flameGlowCv);

 function makeFlameCone(offsetX, offsetZ, height, radiusTop, col, opacity) {
  const geo = new THREE.ConeGeometry(radiusTop, height, 6, 1, true);
  const mat = new THREE.MeshBasicMaterial({
   color: col,
   transparent: true,
   opacity,
   depthWrite: false,
   blending: THREE.AdditiveBlending,
   side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.z = Math.PI; // punta hacia abajo
  mesh.position.set(offsetX, 0, offsetZ);
  flameGroup.add(mesh);
  return { mesh, mat };
 }

 // Núcleo blanco-amarillo: corto y estrecho
 const flameCore = makeFlameCone(0, 0, 0.055, 0.006, "#fffbe0", 0.92);
 // Media naranja: más ancho y largo
 const flameMid = makeFlameCone(0, 0, 0.085, 0.013, "#ffaa30", 0.62);
 // Exterior ámbar: el más ancho, muy diáfano
 const flameOuter = makeFlameCone(0, 0, 0.11, 0.02, "#ff6a10", 0.3);

 // Sprite de glow — escala hacia abajo (Y negativo = bajo el cohete)
 const flameGlowMat = new THREE.SpriteMaterial({
  map: flameGlowTex,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });
 const flameGlowSprite = new THREE.Sprite(flameGlowMat);
 flameGlowSprite.scale.set(0.09, 0.09, 1);
 flameGlowSprite.position.set(0, -0.04, 0); // centrado bajo el cono
 flameGroup.add(flameGlowSprite);

 const flames = [flameCore, flameMid, flameOuter];

 // Parámetros de llama expuestos en GUI
 const flameParams = {
  rocketFlameIntensity: 1.0,
  rocketFlameScale: 1.0,
  rocketFlickerSpeed: 1.0,
  rocketLightIntensity: 1.8,
 };

 /**
  * =========================================================
  * LIGHTS
  * =========================================================
  */
 // Ambient — azul-violeta profundo. Los negros ganan tinte cromático.
 const ambientLight = new THREE.AmbientLight("#2e3860", 0.14);
 scene.add(ambientLight);

 // Key fría lateral: entra por ventana, recorta bordes. Sin target forzado:
 // apuntar al astronauta convierte el rim en luz frontal que aplana.
 const moonLight = new THREE.DirectionalLight("#8a9cff", 1.0);
 moonLight.position.set(-5, 4, 1);
 scene.add(moonLight);

 // Rebote frío de luna entrando por ventana.
 const windowFillLight = new THREE.PointLight("#5a72d8", 0.75, 14, 2);
 windowFillLight.position.set(-4.2, 3.0, 0.5);
 scene.add(windowFillLight);

 // WARM KEY del cohete — cálida pero CONTENIDA.
 // distance bajo para que NO se coma toda la escena (como en la ref).
 const warmLight = new THREE.PointLight("#ff9a52", 2.6, 3.8, 2);

 warmLight.position.set(-4.03, 3.09, -2.12);
 scene.add(warmLight);

 // Luz de la lámpara/cohete — íntima, zona mesa/base del cohete.
 const lamparaLight = new THREE.PointLight("#ff8c45", 1.4, 3.0, 2);
 lamparaLight.position.set(-3.8, 2.8, -2.0);
 scene.add(lamparaLight);

 // Fill frío lado derecho — muy sutil, equilibra la composición.
 const fillLight = new THREE.PointLight("#5a72ff", 0.35, 8.5, 2);
 fillLight.position.set(4.2, 1.2, 1.5);
 scene.add(fillLight);

 // Rim light trasero — separa astronauta+silla del fondo.
 const rimLight = new THREE.PointLight("#3d4db5", 0.55, 7, 2);
 rimLight.position.set(0.5, 3.8, -3.4);
 scene.add(rimLight);

 // Luz de área de luna — rebote frío marcado desde ventana.
 const moonAreaLight = new THREE.PointLight("#4f68d0", 0.75, 14, 2);
 moonAreaLight.position.set(-4.8, 3.4, 0.6);
 scene.add(moonAreaLight);

 // ⭐ BACK RIM — detrás de la mesa, evita negro muerto, separa planos.
 const backRimLight = new THREE.PointLight("#4a5ebd", 0.5, 6.5, 2.2);
 backRimLight.position.set(0.4, 1.2, -3.0);
 scene.add(backRimLight);

 // LED único, intensidad contenida, decay alto → solo zona justo bajo monitores.
 const ledUnderDesk = new THREE.PointLight("#4a78ff", 1.1, 4.5, 2.2);
 ledUnderDesk.position.set(1.3, 2.55, -1.15);
 scene.add(ledUnderDesk);

 // Llama del cohete — modero color y mantengo intensidad.
 const lamparaFlameLight = new THREE.PointLight("#ff7a2a", 1.85, 3.2, 2);
 lamparaFlameLight.position.set(-3.74, 2.5, 0.33);
 scene.add(lamparaFlameLight);

 // Rebote cálido sobre la superficie de la mesa — ayuda a leer teclado/ratón
 // sin que se note como luz nueva. Decay alto = cae muy rápido fuera del área.
 const deskBounceLight = new THREE.PointLight("#ff9a60", 0.8, 1.9, 2.6);
 deskBounceLight.position.set(-3.5, 2.65, -1.65);
 scene.add(deskBounceLight);

 /**
  * =========================================================
  * DOG HOLOGRAM — easter egg holográfico
  * =========================================================
  * Perro construido con primitivas wireframe + pedestal + scan.
  * Colores cian dentro de la paleta fría. Muy sutil.
  */
 function createDogHologram() {
  const g = new THREE.Group();
  const cyan = new THREE.Color("#5ad7ff");

  const wireMat = new THREE.LineBasicMaterial({
   color: cyan,
   transparent: true,
   opacity: 0.75,
   blending: THREE.AdditiveBlending,
   depthWrite: false,
  });

  // Cuerpo
  const body = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.55, 0.3, 0.22)), wireMat);
  body.position.set(0, 0.35, 0);
  g.add(body);

  // Cabeza
  const head = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.22, 0.24, 0.22)), wireMat);
  head.position.set(0.3, 0.47, 0);
  g.add(head);

  // Hocico
  const snout = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.14, 0.1, 0.13)), wireMat);
  snout.position.set(0.43, 0.4, 0);
  g.add(snout);

  // Orejas
  const earGeom = new THREE.EdgesGeometry(new THREE.ConeGeometry(0.05, 0.13, 4));
  const earL = new THREE.LineSegments(earGeom, wireMat);
  earL.position.set(0.3, 0.63, 0.08);
  g.add(earL);
  const earR = new THREE.LineSegments(earGeom, wireMat);
  earR.position.set(0.3, 0.63, -0.08);
  g.add(earR);

  // 4 patas
  const legGeom = new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 6));
  [
   [0.2, 0.15, 0.09],
   [0.2, 0.15, -0.09],
   [-0.2, 0.15, 0.09],
   [-0.2, 0.15, -0.09],
  ].forEach((p) => {
   const leg = new THREE.LineSegments(legGeom, wireMat);
   leg.position.set(p[0], p[1], p[2]);
   g.add(leg);
  });

  // Cola
  const tail = new THREE.LineSegments(
   new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.03, 0.01, 0.22, 6)),
   wireMat,
  );
  tail.position.set(-0.3, 0.46, 0);
  tail.rotation.z = Math.PI * 0.35;
  g.add(tail);

  // Pedestal — anillo
  const ringMat = new THREE.MeshBasicMaterial({
   color: cyan,
   transparent: true,
   opacity: 0.4,
   blending: THREE.AdditiveBlending,
   side: THREE.DoubleSide,
   depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.38, 40), ringMat);
  ring.rotation.x = -Math.PI * 0.5;
  ring.position.y = 0.006;
  g.add(ring);

  // Disco interior brillante
  const discMat = new THREE.MeshBasicMaterial({
   color: cyan,
   transparent: true,
   opacity: 0.1,
   blending: THREE.AdditiveBlending,
   depthWrite: false,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.28, 40), discMat);
  disc.rotation.x = -Math.PI * 0.5;
  disc.position.y = 0.005;
  g.add(disc);

  // Scan line — ring fino horizontal que sube y baja
  const scanMat = new THREE.MeshBasicMaterial({
   color: cyan,
   transparent: true,
   opacity: 0.55,
   blending: THREE.AdditiveBlending,
   side: THREE.DoubleSide,
   depthWrite: false,
  });
  const scan = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.18, 32), scanMat);
  scan.rotation.x = -Math.PI * 0.5;
  scan.position.y = 0.1;
  g.add(scan);

  // Luz de rebote cian muy pequeña
  const holoLight = new THREE.PointLight(cyan, 0.4, 1.6, 2.2);
  holoLight.position.set(0, 0.4, 0);
  g.add(holoLight);

  g.userData.wireMat = wireMat;
  g.userData.ringMat = ringMat;
  g.userData.discMat = discMat;
  g.userData.scanMat = scanMat;
  g.userData.scan = scan;
  g.userData.holoLight = holoLight;

  return g;
 }

 const dogHologram = createDogHologram();
 // Posición: suelo, delante de la ventana, lado frío de la escena
 dogHologram.position.set(-3.5, 0, 1.2);
 dogHologram.scale.setScalar(0.85);
 scene.add(dogHologram);

 /**
  * =========================================================
  * CHAIR
  * =========================================================
  */
 const loader = new GLTFLoader();
 const chairRaycaster = new THREE.Raycaster();

 let chair = null;
 let chairAnchor = null;
 let chairYaw = null;
 let chairModelFix = null;

 const chairParams = {
  scale: 0.9,
  x: 0.33,
  y: -0.04,
  z: -0.43,
  rotY: -2.9,
  brightness: 1.1,
  groundOffset: 0.005,
 };

 const chairFix = {
  rotX: -0.2,
  rotY: 0.51,
  rotZ: 0,
 };

 loader.load("/modelos/astronauta_silla_2.glb", (gltf) => {
  chair = gltf.scene;

  chairAnchor = new THREE.Group();
  chairYaw = new THREE.Group();
  chairModelFix = new THREE.Group();

  chairAnchor.add(chairYaw);
  chairYaw.add(chairModelFix);
  chairModelFix.add(chair);

  chair.traverse((child) => {
   if (!child.isMesh) return;

   child.castShadow = false;
   child.receiveShadow = false;

   const materials = Array.isArray(child.material) ? child.material : [child.material];

   materials.forEach((mat) => {
    if (!mat) return;

    if ("roughness" in mat) mat.roughness = 0.9;
    if ("metalness" in mat) mat.metalness = 0.0;
    if ("envMapIntensity" in mat) mat.envMapIntensity = 0.5;

    if (mat.color) {
     mat.userData.__baseColor = mat.color.clone();
     mat.color.copy(mat.userData.__baseColor).multiplyScalar(chairParams.brightness);
    }
   });
  });

  scene.add(chairAnchor);
  updateChair();
 });

 function getChairSupportY(x, z) {
  chairRaycaster.set(new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0));

  const hits = chairRaycaster.intersectObjects([floor, ...deskSupportMeshes], false);
  if (hits.length > 0) {
   return hits[0].point.y;
  }

  return 0;
 }

 function updateChair() {
  if (!chair || !chairAnchor || !chairYaw || !chairModelFix) return;

  chairAnchor.position.set(chairParams.x, 0, chairParams.z);
  chairYaw.rotation.set(0, chairParams.rotY, 0);

  chairModelFix.rotation.set(chairFix.rotX, chairFix.rotY, chairFix.rotZ);
  chairModelFix.scale.setScalar(chairParams.scale);

  chair.position.set(0, 0, 0);
  chair.rotation.set(0, 0, 0);

  chairAnchor.updateMatrixWorld(true);
  chairYaw.updateMatrixWorld(true);
  chairModelFix.updateMatrixWorld(true);
  chair.updateMatrixWorld(true);

  const supportY = getChairSupportY(chairParams.x, chairParams.z);

  const box = new THREE.Box3().setFromObject(chairAnchor);
  const lowestPointY = box.min.y;

  chairAnchor.position.y += supportY + chairParams.groundOffset - lowestPointY + chairParams.y;

  chairAnchor.updateMatrixWorld(true);
  chairYaw.updateMatrixWorld(true);
  chairModelFix.updateMatrixWorld(true);
  chair.updateMatrixWorld(true);

  chair.traverse((child) => {
   if (!child.isMesh) return;

   const applyBrightness = (mat) => {
    if (!mat || !mat.color) return;

    if (!mat.userData.__baseColor) {
     mat.userData.__baseColor = mat.color.clone();
    }

    mat.color.copy(mat.userData.__baseColor).multiplyScalar(chairParams.brightness);
   };

   if (Array.isArray(child.material)) {
    child.material.forEach(applyBrightness);
   } else {
    applyBrightness(child.material);
   }
  });

  requestRender();
 }

 // ══════════════════════════════════════════════════════════════════════════
 // LÁMPARA / COHETE — sobre la mesa, esquina derecha
 // ══════════════════════════════════════════════════════════════════════════
 let lamparaRoot = null;
 let lamparaAnchor = null;

 const lamparaParams = {
  x: -3.74,
  y: 0.0,
  z: 0.33,
  rotX: 0.0,
  rotY: 0.0,
  rotZ: 0.08,
  scale: 0.24,
  brightness: 0.2,
 };

 const lamparaLoader = new GLTFLoader();
 lamparaLoader.load(
  "/modelos/lampara.glb",
  (gltf) => {
   lamparaRoot = gltf.scene;
   lamparaAnchor = new THREE.Group();
   lamparaAnchor.add(lamparaRoot);

   lamparaRoot.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = child.receiveShadow = false;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
     if (!mat) return;
     if ("roughness" in mat) mat.roughness = 0.75;
     if ("metalness" in mat) mat.metalness = 0.1;
     if ("envMapIntensity" in mat) mat.envMapIntensity = 0.5;
     if (mat.color) {
      mat.userData.__baseColor = mat.color.clone();
      mat.color.copy(mat.userData.__baseColor).multiplyScalar(lamparaParams.brightness);
     }
    });
   });

   // Adjuntar a deskAnchor cuando esté disponible
   if (deskAnchor) deskAnchor.add(lamparaAnchor);
   updateLampara();
   // Activar y posicionar las llamas del cohete
   flameGroup.visible = true;
   requestRender();
  },
  undefined,
  (err) => console.error("[Lámpara] Error:", err),
 );

 // ── Helper: cota de la superficie del escritorio ─────────────────────────
 // deskTopSupport.position.y es la referencia canónica — la calcula updateDesk()
 // y es exactamente la Y local (en espacio de deskAnchor) del tablero.
 // Usamos eso en lugar de recalcular bbox del deskAnchor completo,
 // lo que evita que los objetos hijos contaminen el resultado.
 function getDeskSurfaceLocalY() {
  if (!deskTopSupport) return 0;
  return deskTopSupport.position.y;
 }

 // ── Helper: ajustar un modelo sobre la superficie del escritorio ──────────
 // anchor: el Group hijo de deskAnchor
 // root:   el gltf.scene dentro del anchor (ya escalado)
 // params: { x, y, z, rotY }
 // Calcula el punto base real del modelo (min.y de su bbox) y lo apoya
 // sobre la cota del tablero. params.y es un offset corrector ajustable.
 function placeOnDesk(anchor, root, params) {
  if (!anchor || !root || !deskTopSupport) return;

  // Aseguramos que la escala/posición base del root están aplicadas
  // antes de medir su bbox
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.updateMatrixWorld(true);

  // Bbox del modelo en world-space → convertimos a local de deskAnchor
  const worldBox = new THREE.Box3().setFromObject(root);
  // El origen del anchor está en deskAnchor-space, así que el min.y del
  // modelo en world-space = anchor.position.y + modelo_localMin.y
  // Necesitamos localMin.y para saber cuánto sobresale por debajo del origin
  const modelLocalMinY = worldBox.min.y - anchor.getWorldPosition(new THREE.Vector3()).y;

  // Cota del tablero en local de deskAnchor
  const surfaceY = getDeskSurfaceLocalY();

  anchor.position.set(params.x, surfaceY - modelLocalMinY + params.y, params.z);
  anchor.rotation.set(0, params.rotY ?? 0, 0);
 }

 function updateLampara() {
  if (!lamparaRoot || !lamparaAnchor || !deskTopSupport) return;
  lamparaRoot.scale.setScalar(lamparaParams.scale);
  placeOnDesk(lamparaAnchor, lamparaRoot, lamparaParams);
  // Mantener llamas alineadas con la base de la lámpara
  if (flameGroup && deskAnchor) {
   const wp = new THREE.Vector3();
   lamparaAnchor.getWorldPosition(wp);
   flameGroup.position.set(wp.x + lamparaParams.x * 0.0, wp.y + 0.02, wp.z);
   lamparaFlameLight.position.set(wp.x, wp.y + 0.05, wp.z);
  }
  lamparaRoot.traverse((child) => {
   if (!child.isMesh) return;
   const ap = (mat) => {
    if (!mat?.color) return;
    if (!mat.userData.__baseColor) mat.userData.__baseColor = mat.color.clone();
    mat.color.copy(mat.userData.__baseColor).multiplyScalar(lamparaParams.brightness);
   };
   Array.isArray(child.material) ? child.material.forEach(ap) : ap(child.material);
  });
  requestRender();
 }

 // ══════════════════════════════════════════════════════════════════════════
 // TECLADO — sobre la mesa, delante de los monitores
 // ══════════════════════════════════════════════════════════════════════════
 let tecladoRoot = null;
 let tecladoAnchor = null;

 const tecladoParams = {
  x: -0.05,
  y: 0.0,
  z: 0.35,
  rotX: 0.0,
  rotY: 0.0,
  rotZ: 0.0,
  scale: 0.55,
  brightness: 1.0,
 };

 const tecladoLoader = new GLTFLoader();
 tecladoLoader.load(
  "/modelos/teclado.glb",
  (gltf) => {
   tecladoRoot = gltf.scene;
   tecladoAnchor = new THREE.Group();
   tecladoAnchor.add(tecladoRoot);

   tecladoRoot.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = child.receiveShadow = false;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
     if (!mat) return;
     if ("roughness" in mat) mat.roughness = 0.8;
     if ("metalness" in mat) mat.metalness = 0.05;
     if ("envMapIntensity" in mat) mat.envMapIntensity = 0.4;
     if (mat.color) {
      mat.userData.__baseColor = mat.color.clone();
      mat.color.copy(mat.userData.__baseColor).multiplyScalar(tecladoParams.brightness);
     }
    });
   });

   if (deskAnchor) deskAnchor.add(tecladoAnchor);
   updateTeclado();
   requestRender();
  },
  undefined,
  (err) => console.error("[Teclado] Error:", err),
 );

 function updateTeclado() {
  if (!tecladoRoot || !tecladoAnchor || !deskTopSupport) return;
  tecladoRoot.scale.setScalar(tecladoParams.scale);
  placeOnDesk(tecladoAnchor, tecladoRoot, tecladoParams);
  tecladoRoot.traverse((child) => {
   if (!child.isMesh) return;
   const ap = (mat) => {
    if (!mat?.color) return;
    if (!mat.userData.__baseColor) mat.userData.__baseColor = mat.color.clone();
    mat.color.copy(mat.userData.__baseColor).multiplyScalar(tecladoParams.brightness);
   };
   Array.isArray(child.material) ? child.material.forEach(ap) : ap(child.material);
  });
  requestRender();
 }

 // ══════════════════════════════════════════════════════════════════════════
 // RATÓN — a la derecha del teclado
 // ══════════════════════════════════════════════════════════════════════════
 let ratonRoot = null;
 let ratonAnchor = null;

 const ratonParams = {
  x: 1.09,
  y: -0.06,
  z: 0.35,
  rotX: 0.0,
  rotY: -3.14,
  rotZ: 0.0,
  scale: 0.45,
  brightness: 1.0,
 };

 const ratonLoader = new GLTFLoader();
 ratonLoader.load(
  "/modelos/raton.glb",
  (gltf) => {
   ratonRoot = gltf.scene;
   ratonAnchor = new THREE.Group();
   ratonAnchor.add(ratonRoot);

   ratonRoot.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = child.receiveShadow = false;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
     if (!mat) return;
     if ("roughness" in mat) mat.roughness = 0.75;
     if ("metalness" in mat) mat.metalness = 0.05;
     if ("envMapIntensity" in mat) mat.envMapIntensity = 0.4;
     if (mat.color) {
      mat.userData.__baseColor = mat.color.clone();
      mat.color.copy(mat.userData.__baseColor).multiplyScalar(ratonParams.brightness);
     }
    });
   });

   if (deskAnchor) deskAnchor.add(ratonAnchor);
   updateRaton();
   requestRender();
  },
  undefined,
  (err) => console.error("[Ratón] Error:", err),
 );

 function updateRaton() {
  if (!ratonRoot || !ratonAnchor || !deskTopSupport) return;
  ratonRoot.scale.setScalar(ratonParams.scale);
  placeOnDesk(ratonAnchor, ratonRoot, ratonParams);
  ratonRoot.traverse((child) => {
   if (!child.isMesh) return;
   const ap = (mat) => {
    if (!mat?.color) return;
    if (!mat.userData.__baseColor) mat.userData.__baseColor = mat.color.clone();
    mat.color.copy(mat.userData.__baseColor).multiplyScalar(ratonParams.brightness);
   };
   Array.isArray(child.material) ? child.material.forEach(ap) : ap(child.material);
  });
  requestRender();
 }

 // ══════════════════════════════════════════════════════════════════════════
 // ASTRONAUTA — sentado sobre la silla, hijo de chairYaw
 // ══════════════════════════════════════════════════════════════════════════
 //
 // Jerarquía:
 //   chairAnchor
 //     └── chairYaw         ← aquí se adjunta, hereda posición+rotación
 //           ├── chairModelFix → chair
 //           └── astronautAnchor → astronautRoot
 //
 // La bbox de la silla se calcula solo sobre chairModelFix (nunca incluyendo
 // al astronauta) para no contaminar el cálculo de groundOffset.
 //
 // seatApproxY: punto de apoyo inicial = min.y + altura * seatRatio
 // Luego params.y corrige cualquier desviación sin fórmulas cerradas.

 let astronautRoot = null;
 let astronautAnchor = null;

 const astronautParams = {
  x: 0.0, // offset local en chairYaw-space
  y: 0.0, // offset Y sobre el asiento (ajustar en GUI)
  z: 0.0, // offset Z
  rotY: 0.0, // orientación (0 = mira en la dirección del yaw de la silla)
  rotX: -0.08, // leve inclinación hacia adelante — más natural
  rotZ: 0.0,
  scale: 0.55,
  brightness: 1.0,
  seatRatio: 0.58, // fracción de la altura de la silla donde está el asiento
 };

 const astronautLoader = new GLTFLoader();
 astronautLoader.load(
  "/modelos/astronauta.glb",
  (gltf) => {
   astronautRoot = gltf.scene;

   // Ajuste de materiales — misma paleta que la silla
   astronautRoot.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
     if (!mat) return;
     if ("roughness" in mat) mat.roughness = 0.85;
     if ("metalness" in mat) mat.metalness = 0.05;
     if ("envMapIntensity" in mat) mat.envMapIntensity = 0.4;
     if (mat.color) {
      mat.userData.__baseColor = mat.color.clone();
      mat.color.copy(mat.userData.__baseColor).multiplyScalar(astronautParams.brightness);
     }
    });
   });

   astronautAnchor = new THREE.Group();
   astronautAnchor.add(astronautRoot);

   // Adjuntar a chairYaw — hereda posición del anchor + rotación del yaw
   if (chairYaw) {
    chairYaw.add(astronautAnchor);
   }

   updateAstronaut();
   requestRender();
  },
  undefined,
  (err) => console.error("[Astronauta] Error al cargar:", err),
 );

 function updateAstronaut() {
  if (!astronautRoot || !astronautAnchor || !chairModelFix) return;

  // 1. Aplicar escala + rotación local al root
  astronautRoot.scale.setScalar(astronautParams.scale);
  astronautRoot.rotation.set(0, 0, 0);
  astronautRoot.position.set(0, 0, 0);

  // 2. Calcular la bbox de la silla (solo chairModelFix — sin astronauta)
  //    Temporalmente quitamos el astronauta del árbol para una bbox limpia
  if (chairYaw && astronautAnchor.parent === chairYaw) {
   chairYaw.remove(astronautAnchor);
  }
  chairModelFix.updateMatrixWorld(true);
  const chairBox = new THREE.Box3().setFromObject(chairModelFix);

  // 3. Calcular seatY en coordenadas locales de chairYaw
  //    min.y + (max.y - min.y) * seatRatio da la altura del asiento
  //    Convertimos a coordenadas locales de chairYaw con worldToLocal
  const seatWorldY = chairBox.min.y + (chairBox.max.y - chairBox.min.y) * astronautParams.seatRatio;

  // 4. Calcular la bbox propia del astronauta para encontrar su punto base
  //    Necesitamos la bbox en local-space del anchor → escalamos el root primero
  const tempBox = new THREE.Box3().setFromObject(astronautRoot);
  const astronautBaseOffset = tempBox.min.y; // cuánto sobresale por abajo del origen

  // 5. Colocar el anchor: su Y en coordenadas locales de chairYaw
  //    para que el pie del astronauta coincida con seatY
  astronautAnchor.position.set(
   astronautParams.x,
   seatWorldY - astronautBaseOffset + astronautParams.y,
   astronautParams.z,
  );

  // 6. Rotación: mira hacia los monitores (en la dirección del yaw de la silla)
  //    rotY=0 = misma dirección que la silla, positivo = giro hacia la izquierda
  astronautAnchor.rotation.set(astronautParams.rotX, astronautParams.rotY, astronautParams.rotZ);

  // 7. Re-adjuntar a chairYaw
  if (chairYaw && astronautAnchor.parent !== chairYaw) {
   chairYaw.add(astronautAnchor);
  }

  // 8. Brightness
  astronautRoot.traverse((child) => {
   if (!child.isMesh) return;
   const applyB = (mat) => {
    if (!mat || !mat.color) return;
    if (!mat.userData.__baseColor) mat.userData.__baseColor = mat.color.clone();
    mat.color.copy(mat.userData.__baseColor).multiplyScalar(astronautParams.brightness);
   };
   if (Array.isArray(child.material)) child.material.forEach(applyB);
   else applyB(child.material);
  });

  requestRender();
 }

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
 const warmConfig = {
  color: warmLight.color.getHexString(),
  flicker: true,
  baseIntensity: 3.0,
  flickerAmplitude: 0.45,
  flickerSpeed: 10,
 };

 if (gui) {
  // ═════════════════════════════════════════════════════════════════════════
  // EXTERIOR SCENE — arriba del todo: estrellas, nebula, UFO, luna, claim, atmósfera
  // Se registra antes que cualquier otra carpeta → aparece como primera entrada
  // en el panel. Arranca ABIERTA para acceso inmediato.
  // ═════════════════════════════════════════════════════════════════════════
  const extFolder = gui.addFolder("Exterior Scene");
  extFolder.open();

  // ── Stars ────────────────────────────────────────────────────────────────
  const starsFolder = extFolder.addFolder("Stars");
  starsFolder.close();
  const starsGlobalFolder = starsFolder.addFolder("Global");
  starsGlobalFolder.add(starsParams, "visible").name("visible").onChange(requestRender);
  starsGlobalFolder.add(starsParams, "globalOpacity", 0, 2, 0.01).name("opacity mult").onChange(requestRender);
  starsGlobalFolder.add(starsParams, "twinkleStrength", 0, 1, 0.01).name("twinkle").onChange(requestRender);
  starsGlobalFolder.add(starsParams, "parallaxSpeed", 0, 3, 0.01).name("parallax speed").onChange(requestRender);

  const layerAFolder = starsFolder.addFolder("Layer A — Far");
  layerAFolder
   .add(starsParams, "aCount", 100, 4000, 50)
   .name("count")
   .onChange(() => rebuildStarLayer("A"));
  layerAFolder.add(starsParams, "aSize", 0.01, 0.3, 0.001).name("size").onChange(requestRender);
  layerAFolder.add(starsParams, "aOpacity", 0, 2, 0.01).name("opacity").onChange(requestRender);
  layerAFolder
   .addColor(starsParams, "aTint")
   .name("color")
   .onChange(() => rebuildStarLayer("A"));

  const layerBFolder = starsFolder.addFolder("Layer B — Mid");
  layerBFolder
   .add(starsParams, "bCount", 50, 1500, 25)
   .name("count")
   .onChange(() => rebuildStarLayer("B"));
  layerBFolder.add(starsParams, "bSize", 0.01, 0.4, 0.001).name("size").onChange(requestRender);
  layerBFolder.add(starsParams, "bOpacity", 0, 2, 0.01).name("opacity").onChange(requestRender);
  layerBFolder
   .addColor(starsParams, "bTint")
   .name("color")
   .onChange(() => rebuildStarLayer("B"));

  const layerCFolder = starsFolder.addFolder("Layer C — Bright");
  layerCFolder
   .add(starsParams, "cCount", 10, 300, 5)
   .name("count")
   .onChange(() => rebuildStarLayer("C"));
  layerCFolder.add(starsParams, "cSize", 0.02, 0.5, 0.001).name("size").onChange(requestRender);
  layerCFolder.add(starsParams, "cOpacity", 0, 2, 0.01).name("opacity").onChange(requestRender);
  layerCFolder
   .addColor(starsParams, "cTint")
   .name("color")
   .onChange(() => rebuildStarLayer("C"));

  const layerDFolder = starsFolder.addFolder("Layer D — Foreground");
  layerDFolder
   .add(starsParams, "dCount", 0, 60, 1)
   .name("count")
   .onChange(() => rebuildStarLayer("D"));
  layerDFolder.add(starsParams, "dSize", 0.05, 1.0, 0.01).name("size").onChange(requestRender);
  layerDFolder.add(starsParams, "dOpacity", 0, 1, 0.01).name("opacity").onChange(requestRender);
  layerDFolder
   .addColor(starsParams, "dTint")
   .name("color")
   .onChange(() => rebuildStarLayer("D"));

  // ── Nebula ───────────────────────────────────────────────────────────────
  const nebulaFolder = extFolder.addFolder("Nebula");
  nebulaFolder.close();
  nebulaFolder.add(nebulaParams, "visible").name("visible").onChange(requestRender);
  nebulaFolder.add(nebulaParams, "opacity", 0, 1.5, 0.01).name("opacity").onChange(requestRender);
  nebulaFolder.add(nebulaParams, "scale", 0.2, 3, 0.01).name("scale").onChange(updateNebula);
  nebulaFolder
   .add(nebulaParams, "x", EXT_X - 80, EXT_X + 10, 0.1)
   .name("pos X")
   .onChange(updateNebula);
  nebulaFolder.add(nebulaParams, "y", -5, 15, 0.1).name("pos Y").onChange(updateNebula);
  nebulaFolder.add(nebulaParams, "z", -10, 10, 0.1).name("pos Z").onChange(updateNebula);
  nebulaFolder.add(nebulaParams, "rotY", -Math.PI, Math.PI, 0.01).name("rot Y").onChange(updateNebula);
  nebulaFolder.addColor(nebulaParams, "colorPrimary").name("color primary").onChange(regenerateNebula);
  nebulaFolder.addColor(nebulaParams, "colorSecondary").name("color secondary").onChange(regenerateNebula);
  nebulaFolder.add(nebulaParams, "softness", 0, 1, 0.01).name("softness").onChange(regenerateNebula);
  nebulaFolder.add(nebulaParams, "density", 0, 2, 0.01).name("density").onChange(regenerateNebula);

  // ── UFO ──────────────────────────────────────────────────────────────────
  const ufoFolder = extFolder.addFolder("UFO");
  ufoFolder.close();
  ufoFolder.add(ufoParams, "visible").name("visible").onChange(requestRender);
  ufoFolder.add(ufoParams, "xOffset", -5, 5, 0.01).name("pos X offset").onChange(requestRender);
  ufoFolder.add(ufoParams, "yOffset", -5, 5, 0.01).name("pos Y offset").onChange(requestRender);
  ufoFolder.add(ufoParams, "scale", 0.1, 2, 0.01).name("scale").onChange(updateUfo);
  ufoFolder.add(ufoParams, "rotYOffset", -Math.PI, Math.PI, 0.01).name("rot Y offset").onChange(requestRender);
  ufoFolder.add(ufoParams, "glowIntensity", 0, 3, 0.01).name("glow intensity").onChange(updateUfo);
  ufoFolder.add(ufoParams, "underLightIntensity", 0, 3, 0.01).name("under light").onChange(updateUfo);
  ufoFolder.add(ufoParams, "beamOpacityMult", 0, 3, 0.01).name("beam opacity").onChange(requestRender);
  ufoFolder.add(ufoParams, "beamWidth", 0.1, 3, 0.01).name("beam width").onChange(requestRender);
  ufoFolder.add(ufoParams, "beamLength", 0.1, 3, 0.01).name("beam length").onChange(requestRender);

  // ── Moon ─────────────────────────────────────────────────────────────────
  const moonFolder = extFolder.addFolder("Moon");
  moonFolder.close();
  moonFolder.add(moonParams, "visible").name("visible").onChange(requestRender);
  moonFolder
   .add(moonParams, "x", EXT_X - 50, EXT_X + 10, 0.1)
   .name("pos X")
   .onChange(updateMoon);
  moonFolder.add(moonParams, "y", -5, 15, 0.1).name("pos Y").onChange(updateMoon);
  moonFolder.add(moonParams, "z", -10, 10, 0.1).name("pos Z").onChange(updateMoon);
  moonFolder.add(moonParams, "scale", 0.1, 3, 0.01).name("scale").onChange(updateMoon);
  moonFolder.add(moonParams, "opacity", 0, 1.5, 0.01).name("opacity").onChange(requestRender);
  moonFolder.add(moonParams, "lightIntensity", 0, 3, 0.01).name("light intensity").onChange(requestRender);
  moonFolder.addColor(moonParams, "tint").name("tint").onChange(updateMoon);

  // ── Claim ────────────────────────────────────────────────────────────────
  const claimFolder = extFolder.addFolder("Claim");
  claimFolder.close();
  claimFolder.add(claimParams, "visible").name("visible").onChange(requestRender);
  claimFolder
   .add(claimParams, "x", EXT_X - 10, EXT_X, 0.01)
   .name("pos X")
   .onChange(updateClaim);
  claimFolder.add(claimParams, "y", -5, 15, 0.01).name("pos Y").onChange(updateClaim);
  claimFolder.add(claimParams, "z", -5, 5, 0.01).name("pos Z").onChange(updateClaim);
  claimFolder.add(claimParams, "scale", 0.3, 2, 0.01).name("scale").onChange(updateClaim);
  claimFolder.add(claimParams, "opacityMult", 0, 2, 0.01).name("opacity mult").onChange(requestRender);
  claimFolder.addColor(claimParams, "orangeColor").name("accent color").onChange(updateClaim);
  claimFolder.add(claimParams, "glowIntensity", 0, 3, 0.01).name("glow intensity").onChange(requestRender);
  claimFolder.add(claimParams, "haloOpacityMult", 0, 2, 0.01).name("halo opacity").onChange(requestRender);
  claimFolder.add(claimParams, "subtitleVisible").name("subtitle").onChange(updateClaim);

  // ── Atmosphere ───────────────────────────────────────────────────────────
  const atmFolder = extFolder.addFolder("Atmosphere");
  atmFolder.close();
  atmFolder
   .add(atmosphereParams, "exposure", 0.1, 3, 0.01)
   .name("exposure")
   .onChange((v) => {
    renderer.toneMappingExposure = v;
    requestRender();
   });
  atmFolder
   .add(atmosphereParams, "toneMapping", Object.keys(toneMappingMap))
   .name("tone mapping")
   .onChange((v) => {
    renderer.toneMapping = toneMappingMap[v] ?? THREE.ACESFilmicToneMapping;
    // Los materiales necesitan recompilación cuando cambia el tone mapping
    scene.traverse((obj) => {
     if (obj.material) {
      const arr = Array.isArray(obj.material) ? obj.material : [obj.material];
      arr.forEach((m) => {
       if (m) m.needsUpdate = true;
      });
     }
    });
    requestRender();
   });
  atmFolder
   .addColor(atmosphereParams, "backgroundColor")
   .name("background")
   .onChange((v) => {
    BG_SPACE.set(v);
    scene.background = new THREE.Color(v);
    requestRender();
   });
  atmFolder.add(atmosphereParams, "vignetteOpacity", 0, 1.5, 0.01).name("vignette").onChange(requestRender);
  atmFolder.add(atmosphereParams, "fogDensityMult", 0, 3, 0.01).name("fog density").onChange(requestRender);

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM / OTHER — carpetas originales (debajo de Exterior Scene)
  // ─────────────────────────────────────────────────────────────────────────
  const cameraFolder = gui.addFolder("Camera");
  cameraFolder
   .add(cameraBase, "x", -10, 10, 0.01)
   .name("base x")
   .onChange(() => {
    buildKeyframes();
    requestRender();
   });

  cameraFolder
   .add(cameraBase, "y", 0, 10, 0.01)
   .name("base y")
   .onChange(() => {
    buildKeyframes();
    requestRender();
   });

  cameraFolder
   .add(cameraBase, "z", 0, 20, 0.01)
   .name("base z")
   .onChange(() => {
    buildKeyframes();
    requestRender();
   });

  cameraFolder
   .add(camera, "fov", 20, 90, 1)
   .name("fov")
   .onChange(() => {
    camera.updateProjectionMatrix();
    requestRender();
   });

  cameraFolder.add(controls.target, "x", -10, 10, 0.01).name("target x");
  cameraFolder.add(controls.target, "y", -2, 10, 0.01).name("target y");
  cameraFolder.add(controls.target, "z", -10, 10, 0.01).name("target z");

  const ambientFolder = gui.addFolder("Ambient Light");
  const ambientConfig = { color: ambientLight.color.getHexString() };

  ambientFolder.addColor(ambientConfig, "color").onChange((value) => {
   ambientLight.color.set(value);
   requestRender();
  });
  ambientFolder.add(ambientLight, "intensity", 0, 2, 0.01).onChange(requestRender);

  const moonLightFolder = gui.addFolder("Moon Light");
  const moonLightConfig = { color: moonLight.color.getHexString() };

  moonLightFolder.addColor(moonLightConfig, "color").onChange((value) => {
   moonLight.color.set(value);
   requestRender();
  });
  moonLightFolder.add(moonLight.position, "x", -10, 10, 0.01).onChange(requestRender);
  moonLightFolder.add(moonLight.position, "y", 0, 10, 0.01).onChange(requestRender);
  moonLightFolder.add(moonLight.position, "z", -10, 10, 0.01).onChange(requestRender);
  moonLightFolder.add(moonLight, "intensity", 0, 3, 0.01).onChange(requestRender);

  const warmFolder = gui.addFolder("Warm Light");
  warmFolder.addColor(warmConfig, "color").onChange((value) => {
   warmLight.color.set(value);
   requestRender();
  });
  warmFolder.add(warmLight.position, "x", -5, 5, 0.01).onChange(requestRender);
  warmFolder.add(warmLight.position, "y", 0, 5, 0.01).onChange(requestRender);
  warmFolder.add(warmLight.position, "z", -5, 5, 0.01).onChange(requestRender);
  warmFolder.add(warmConfig, "baseIntensity", 0, 5, 0.01);
  warmFolder.add(warmLight, "distance", 0, 20, 0.01).onChange(requestRender);
  warmFolder.add(warmLight, "decay", 0, 4, 0.01).onChange(requestRender);
  warmFolder.add(warmConfig, "flicker");
  warmFolder.add(warmConfig, "flickerAmplitude", 0, 1, 0.01);
  warmFolder.add(warmConfig, "flickerSpeed", 0, 20, 0.1);

  const fillFolder = gui.addFolder("Fill Light");
  const fillConfig = { color: fillLight.color.getHexString() };

  fillFolder.addColor(fillConfig, "color").onChange((value) => {
   fillLight.color.set(value);
   requestRender();
  });
  fillFolder.add(fillLight.position, "x", -10, 10, 0.01).onChange(requestRender);
  fillFolder.add(fillLight.position, "y", 0, 10, 0.01).onChange(requestRender);
  fillFolder.add(fillLight.position, "z", -10, 10, 0.01).onChange(requestRender);
  fillFolder.add(fillLight, "intensity", 0, 3, 0.01).onChange(requestRender);

  const materialsFolder = gui.addFolder("Materials");
  const materialsConfig = {
   wallColor: "#2f3140",
   floorColor: "#1b1d26",
   deskColor: "#d7d8dd",
   wallRoughness: wallMaterial.roughness,
   floorRoughness: floorMaterial.roughness,
   deskRoughness: deskMaterial.roughness,
  };

  materialsFolder.addColor(materialsConfig, "wallColor").onChange((value) => {
   wallMaterial.color.set(value);
   requestRender();
  });

  materialsFolder.addColor(materialsConfig, "floorColor").onChange((value) => {
   floorMaterial.color.set(value);
   requestRender();
  });

  materialsFolder.addColor(materialsConfig, "deskColor").onChange((value) => {
   deskMaterial.color.set(value);
   requestRender();
  });

  materialsFolder.add(materialsConfig, "wallRoughness", 0, 1, 0.01).onChange((value) => {
   wallMaterial.roughness = value;
   requestRender();
  });

  materialsFolder.add(materialsConfig, "floorRoughness", 0, 1, 0.01).onChange((value) => {
   floorMaterial.roughness = value;
   requestRender();
  });

  materialsFolder.add(materialsConfig, "deskRoughness", 0, 1, 0.01).onChange((value) => {
   deskMaterial.roughness = value;
   requestRender();
  });

  const deskFolder = gui.addFolder("Desk");
  deskFolder.add(deskParams, "scale", 0.005, 0.1, 0.001).onChange(() => {
   updateDesk();
   updateChair();
  });
  deskFolder.add(deskParams, "x", -5, 5, 0.01).onChange(() => {
   updateDesk();
   updateChair();
  });
  deskFolder.add(deskParams, "y", -0.5, 2, 0.01).onChange(() => {
   updateDesk();
   updateChair();
  });
  deskFolder.add(deskParams, "z", -5, 5, 0.01).onChange(() => {
   updateDesk();
   updateChair();
  });
  deskFolder.add(deskParams, "rotY", -Math.PI, Math.PI, 0.01).onChange(() => {
   updateDesk();
   updateChair();
  });
  deskFolder.add(deskParams, "brightness", 0.5, 2, 0.01).onChange(updateDesk);

  deskFolder
   .add(deskParams, "supportWidth", 0.5, 5, 0.01)
   .name("support width")
   .onChange(() => {
    updateDesk();
    updateChair();
   });

  deskFolder
   .add(deskParams, "supportDepth", 0.5, 3, 0.01)
   .name("support depth")
   .onChange(() => {
    updateDesk();
    updateChair();
   });

  deskFolder
   .add(deskParams, "supportYOffset", -0.05, 0.05, 0.001)
   .name("support y")
   .onChange(() => {
    updateDesk();
    updateChair();
   });

  deskFolder.add(deskParams, "showSupport").name("show support").onChange(updateDesk);

  deskFolder.add(deskFixParams, "posX", -10, 10, 0.01).name("fix posX").onChange(updateDesk);
  deskFolder.add(deskFixParams, "posY", -10, 10, 0.01).name("fix posY").onChange(updateDesk);
  deskFolder.add(deskFixParams, "posZ", -10, 10, 0.01).name("fix posZ").onChange(updateDesk);

  deskFolder.add(deskFixParams, "rotX", -Math.PI, Math.PI, 0.01).name("fix rotX").onChange(updateDesk);
  deskFolder.add(deskFixParams, "rotY", -Math.PI, Math.PI, 0.01).name("fix rotY").onChange(updateDesk);
  deskFolder.add(deskFixParams, "rotZ", -Math.PI, Math.PI, 0.01).name("fix rotZ").onChange(updateDesk);

  const monitorFolder = gui.addFolder("Monitors");
  monitorFolder.add(monitorParams, "scale", 0.05, 2, 0.001).onChange(updateMonitors);
  monitorFolder.add(monitorParams, "brightness", 0.2, 2, 0.01).onChange(updateMonitors);
  monitorFolder.add(monitorParams, "yOffset", -0.2, 0.5, 0.001).onChange(updateMonitors);
  monitorFolder.add(monitorParams, "zOffset", -1.5, 1.5, 0.001).onChange(updateMonitors);
  monitorFolder.add(monitorParams, "gap", 0, 5, 0.001).onChange(updateMonitors);
  monitorFolder.add(monitorParams, "leftX", -2, 2, 0.001).onChange(updateMonitors);
  monitorFolder.add(monitorParams, "rightX", -2, 2, 0.001).onChange(updateMonitors);
  monitorFolder.add(monitorParams, "rotX", -Math.PI, Math.PI, 0.001).onChange(updateMonitors);
  monitorFolder.add(monitorParams, "rotY", -Math.PI, Math.PI, 0.001).onChange(updateMonitors);
  monitorFolder.add(monitorParams, "rotZ", -Math.PI, Math.PI, 0.001).onChange(updateMonitors);
  monitorFolder.add(monitorParams, "tiltLeftY", -1, 1, 0.001).onChange(updateMonitors);
  monitorFolder.add(monitorParams, "tiltRightY", -1, 1, 0.001).onChange(updateMonitors);

  monitorFolder.add(monitorFixParams, "posX", -10, 10, 0.01).name("fix posX").onChange(updateMonitors);
  monitorFolder.add(monitorFixParams, "posY", -10, 10, 0.01).name("fix posY").onChange(updateMonitors);
  monitorFolder.add(monitorFixParams, "posZ", -10, 10, 0.01).name("fix posZ").onChange(updateMonitors);
  monitorFolder.add(monitorFixParams, "rotX", -Math.PI, Math.PI, 0.01).name("fix rotX").onChange(updateMonitors);
  monitorFolder.add(monitorFixParams, "rotY", -Math.PI, Math.PI, 0.01).name("fix rotY").onChange(updateMonitors);
  monitorFolder.add(monitorFixParams, "rotZ", -Math.PI, Math.PI, 0.01).name("fix rotZ").onChange(updateMonitors);

  const windowFolder = gui.addFolder("Window");
  windowFolder.add(windowParams, "x", -10, 0, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "y", 0, 7, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "z", -5, 5, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "width", 1, 6, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "height", 1, 6, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "frameThickness", 0.05, 0.4, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "innerPadding", 0, 0.4, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "frameDepth", 0.01, 0.25, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "glassOffset", -0.1, 0.1, 0.001).onChange(updateWindow);
  windowFolder.add(windowParams, "revealDepth", 0.05, 1.2, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "revealThickness", 0.02, 0.3, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "sillDepth", 0.05, 0.8, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "sillHeight", 0.02, 0.2, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "mullionWidth", 0.02, 0.2, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "glowWidth", 1, 6, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "glowHeight", 1, 6, 0.01).onChange(updateWindow);
  windowFolder.add(windowParams, "glowOffset", -1.5, 0.2, 0.001).onChange(updateWindow);
  windowFolder.addColor(windowParams, "glowColor").onChange(updateWindow);

  const spaceFolder = gui.addFolder("Space");
  spaceFolder.add(spaceParams, "width", 1, 6, 0.01).name("width").onChange(buildStars);
  spaceFolder.add(spaceParams, "height", 1, 6, 0.01).name("height").onChange(buildStars);
  spaceFolder
   .add(spaceParams, "depth", -2, -0.05, 0.01)
   .name("depth")
   .onChange(() => {
    buildStars();
    updateSpace();
   });

  spaceFolder.add(spaceParams, "starsCount", 50, 1200, 1).onChange(buildStars);
  spaceFolder.add(spaceParams, "starsSpreadZ", 0.2, 4, 0.01).onChange(buildStars);

  spaceFolder.add(spaceParams, "starsSize", 0.005, 0.08, 0.001).onChange(() => {
   if (starsMaterial) starsMaterial.size = spaceParams.starsSize;
   requestRender();
  });

  spaceFolder.addColor(spaceParams, "starsColor").onChange(() => {
   if (starsMaterial) starsMaterial.color.set(spaceParams.starsColor);
   requestRender();
  });

  spaceFolder.add(spaceParams, "moonX", -3, 3, 0.01).onChange(updateSpace);
  spaceFolder.add(spaceParams, "moonY", -3, 3, 0.01).onChange(updateSpace);
  spaceFolder.add(spaceParams, "moonZ", -4, 0, 0.01).onChange(updateSpace);
  spaceFolder.add(spaceParams, "moonRadius", 0.2, 2, 0.01).onChange(updateSpace);

  spaceFolder.addColor(spaceParams, "moonColor").onChange(() => {
   moonMaterial.color.set(spaceParams.moonColor);
   requestRender();
  });

  // ── Silla ────────────────────────────────────────────────────────────
  const chairFolder = gui.addFolder("Chair");
  chairFolder.add(chairParams, "scale", 0.01, 5, 0.01).name("scale").onChange(updateChair);
  chairFolder.add(chairParams, "x", -10, 10, 0.01).name("pos X").onChange(updateChair);
  chairFolder.add(chairParams, "y", -10, 10, 0.01).name("pos Y").onChange(updateChair);
  chairFolder.add(chairParams, "z", -10, 10, 0.01).name("pos Z").onChange(updateChair);
  chairFolder.add(chairParams, "rotY", -Math.PI, Math.PI, 0.01).name("rot Y").onChange(updateChair);
  chairFolder.add(chairParams, "brightness", 0.1, 5, 0.01).name("brightness").onChange(updateChair);
  chairFolder.add(chairParams, "groundOffset", -1, 1, 0.001).name("ground offset").onChange(updateChair);
  chairFolder.add(chairFix, "rotX", -Math.PI, Math.PI, 0.01).name("fix rotX").onChange(updateChair);
  chairFolder.add(chairFix, "rotY", -Math.PI, Math.PI, 0.01).name("fix rotY").onChange(updateChair);
  chairFolder.add(chairFix, "rotZ", -Math.PI, Math.PI, 0.01).name("fix rotZ").onChange(updateChair);

  // ── Astronauta ────────────────────────────────────────────────────────
  const astronautFolder = gui.addFolder("Astronauta");
  astronautFolder.add(astronautParams, "x", -10, 10, 0.01).name("pos X").onChange(updateAstronaut);
  astronautFolder.add(astronautParams, "y", -10, 10, 0.01).name("pos Y").onChange(updateAstronaut);
  astronautFolder.add(astronautParams, "z", -10, 10, 0.01).name("pos Z").onChange(updateAstronaut);
  astronautFolder.add(astronautParams, "rotX", -Math.PI, Math.PI, 0.01).name("rot X").onChange(updateAstronaut);
  astronautFolder.add(astronautParams, "rotY", -Math.PI, Math.PI, 0.01).name("rot Y").onChange(updateAstronaut);
  astronautFolder.add(astronautParams, "rotZ", -Math.PI, Math.PI, 0.01).name("rot Z").onChange(updateAstronaut);
  astronautFolder.add(astronautParams, "scale", 0.01, 5, 0.01).name("scale").onChange(updateAstronaut);
  astronautFolder.add(astronautParams, "brightness", 0.1, 5, 0.01).name("brightness").onChange(updateAstronaut);
  astronautFolder.add(astronautParams, "seatRatio", 0.0, 1.0, 0.01).name("seat ratio").onChange(updateAstronaut);

  // ── Lámpara ───────────────────────────────────────────────────────────
  const lamparaFolder = gui.addFolder("Lampara");
  lamparaFolder.add(lamparaParams, "x", -10, 10, 0.01).name("pos X").onChange(updateLampara);
  lamparaFolder.add(lamparaParams, "y", -10, 10, 0.01).name("pos Y").onChange(updateLampara);
  lamparaFolder.add(lamparaParams, "z", -10, 10, 0.01).name("pos Z").onChange(updateLampara);
  lamparaFolder.add(lamparaParams, "rotX", -Math.PI, Math.PI, 0.01).name("rot X").onChange(updateLampara);
  lamparaFolder.add(lamparaParams, "rotY", -Math.PI, Math.PI, 0.01).name("rot Y").onChange(updateLampara);
  lamparaFolder.add(lamparaParams, "rotZ", -Math.PI, Math.PI, 0.01).name("rot Z").onChange(updateLampara);
  lamparaFolder.add(lamparaParams, "scale", 0.01, 5, 0.01).name("scale").onChange(updateLampara);
  lamparaFolder.add(lamparaParams, "brightness", 0.1, 5, 0.01).name("brightness").onChange(updateLampara);

  // ── Teclado ───────────────────────────────────────────────────────────
  const tecladoFolder = gui.addFolder("Teclado");
  tecladoFolder.add(tecladoParams, "x", -10, 10, 0.01).name("pos X").onChange(updateTeclado);
  tecladoFolder.add(tecladoParams, "y", -10, 10, 0.01).name("pos Y").onChange(updateTeclado);
  tecladoFolder.add(tecladoParams, "z", -10, 10, 0.01).name("pos Z").onChange(updateTeclado);
  tecladoFolder.add(tecladoParams, "rotX", -Math.PI, Math.PI, 0.01).name("rot X").onChange(updateTeclado);
  tecladoFolder.add(tecladoParams, "rotY", -Math.PI, Math.PI, 0.01).name("rot Y").onChange(updateTeclado);
  tecladoFolder.add(tecladoParams, "rotZ", -Math.PI, Math.PI, 0.01).name("rot Z").onChange(updateTeclado);
  tecladoFolder.add(tecladoParams, "scale", 0.01, 5, 0.01).name("scale").onChange(updateTeclado);
  tecladoFolder.add(tecladoParams, "brightness", 0.1, 5, 0.01).name("brightness").onChange(updateTeclado);

  // ── Ratón ─────────────────────────────────────────────────────────────
  const ratonFolder = gui.addFolder("Raton");
  ratonFolder.add(ratonParams, "x", -10, 10, 0.01).name("pos X").onChange(updateRaton);
  ratonFolder.add(ratonParams, "y", -10, 10, 0.01).name("pos Y").onChange(updateRaton);
  ratonFolder.add(ratonParams, "z", -10, 10, 0.01).name("pos Z").onChange(updateRaton);
  ratonFolder.add(ratonParams, "rotX", -Math.PI, Math.PI, 0.01).name("rot X").onChange(updateRaton);
  ratonFolder.add(ratonParams, "rotY", -Math.PI, Math.PI, 0.01).name("rot Y").onChange(updateRaton);
  ratonFolder.add(ratonParams, "rotZ", -Math.PI, Math.PI, 0.01).name("rot Z").onChange(updateRaton);
  ratonFolder.add(ratonParams, "scale", 0.01, 5, 0.01).name("scale").onChange(updateRaton);
  ratonFolder.add(ratonParams, "brightness", 0.1, 5, 0.01).name("brightness").onChange(updateRaton);

  // ── Neón ─────────────────────────────────────────────────────────────────
  const neonFolder = gui.addFolder("Neon");
  neonFolder.add(neonParams, "x", -6, 6, 0.01).name("neonX").onChange(requestRender);
  neonFolder.add(neonParams, "y", 2, 10, 0.01).name("neonY").onChange(requestRender);
  neonFolder.add(neonParams, "z", -5, -3, 0.01).name("neonZ").onChange(requestRender);
  neonFolder.add(neonParams, "scale", 0.2, 3, 0.01).name("neonScale").onChange(requestRender);
  neonFolder.add(neonParams, "intensity", 0.1, 3, 0.05).name("neonIntensity").onChange(requestRender);
  neonFolder.add(neonParams, "glowStrength", 0.0, 2.0, 0.05).name("neonGlowStrength").onChange(requestRender);
  neonFolder.add(neonParams, "flickerSpeed", 0.1, 3.0, 0.05).name("neonFlickerSpeed").onChange(requestRender);

  // ── Llama cohete ─────────────────────────────────────────────────────────
  const flameFolder = gui.addFolder("Rocket Flame");
  flameFolder.add(flameParams, "rocketFlameIntensity", 0.0, 3.0, 0.05).name("flameIntensity").onChange(requestRender);
  flameFolder.add(flameParams, "rocketFlameScale", 0.2, 3.0, 0.05).name("flameScale").onChange(requestRender);
  flameFolder.add(flameParams, "rocketFlickerSpeed", 0.1, 4.0, 0.05).name("flickerSpeed").onChange(requestRender);
  flameFolder.add(flameParams, "rocketLightIntensity", 0.0, 5.0, 0.05).name("lightIntensity").onChange(requestRender);
 }

 /**
  * =========================================================
  * SCROLL
  * =========================================================
  */
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

 /**
  * =========================================================
  * RESIZE
  * =========================================================
  */
 const onResize = () => {
  clearTimeout(resizeTimeout);

  resizeTimeout = setTimeout(() => {
   sizes.width = window.innerWidth;
   sizes.height = window.innerHeight;

   const newIsMobile = window.innerWidth < 768;
   const newPixelRatio = Math.min(window.devicePixelRatio, newIsMobile ? 1 : 1.5);

   renderer.setSize(sizes.width, sizes.height);
   renderer.setPixelRatio(newPixelRatio);

   applyResponsiveLayout();
   requestRender();
  }, 80);
 };

 window.addEventListener("scroll", onScroll, { passive: true });
 window.addEventListener("resize", onResize, { passive: true });

 /**
  * =========================================================
  * ANIMATION — rail cinematográfico con keyframes + slerp
  * =========================================================
  *
  * NO se usa lookAt() dinámico en ningún frame de scroll.
  * buildKeyframes() calcula posición y orientación UNA VEZ (y en resize).
  * tick(): solo lerp posición + slerp quaternion.
  *
  * Fases (sp = scrollY / vh):
  *  F1  0.00–0.30   Habitación estática
  *  F2  0.30–0.75   Aproximación a la ventana
  *  F3  0.75–1.10   Cruce de la pared
  *  F4  1.10–1.50   Vacío limpio
  *  F5+ 1.50–3.50   Cámara quieta, overlays HTML
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
  const sp = scrollY / sizes.height;

  // Animación de pantallas (typing + dashboard)
  for (let i = 0; i < screenAnimators.length; i++) screenAnimators[i](elapsedTime);

  // ── Posición y rotación de la cámara ──────────────────────────────────────
  //
  // El recorrido completo KP0 → KP1 → KP2 se divide en dos segmentos:
  //   Seg A: KP0 → KP1  durante F1+F2  (sp 0 → F2E)
  //   Seg B: KP1 → KP2  durante F3     (sp F3S → F3E)
  //
  // La rotación sigue los mismos segmentos con slerp.
  // En F4+ la cámara está quieta en KP2 con micro-flotación.

  if (sp <= F3E) {
   // ── Seg A: F1 + F2 (habitación → frente a la ventana) ──────────────────
   // En F1 (sp < F2S) el t es 0 → cámara fija en KP0
   const tA = easeIO3(phase(sp, F2S, F2E));

   const posA = workPos.lerpVectors(KP[0], KP[1], tA);
   camera.position.copy(posA);
   workQ.slerpQuaternions(KQ[0], KQ[1], tA);

   // ── Seg B: F3 (cruce de la pared) ───────────────────────────────────────
   if (sp >= F3S) {
    const tB = easeIO3(phase(sp, F3S, F3E));
    const posB = workPos.lerpVectors(KP[1], KP[2], tB);
    camera.position.copy(posB);
    // KQ1 → KQ2: misma orientación, slerp es instantáneo pero suave
    workQ.slerpQuaternions(KQ[1], KQ[2], tB);
   }

   camera.quaternion.copy(workQ);
  } else {
   // ── F4+: exterior, cámara quieta con micro-flotación ───────────────────
   camera.position.set(
    KP[2].x,
    KP[2].y + Math.sin(elapsedTime * 0.22) * 0.035,
    KP[2].z + Math.sin(elapsedTime * 0.18) * 0.025,
   );
   camera.quaternion.copy(KQ[2]);
  }

  // OrbitControls: solo activos en F1 (sp < F2S), se desactivan al entrar en F2
  if (sp >= F2S && controls.enabled) {
   controls.enabled = false;
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

  // ── Luces de la habitación ────────────────────────────────────────────────
  const roomFade = 1 - clamp01(phase(sp, F2E, F3E));
  const warmBase = warmConfig.flicker
   ? warmConfig.baseIntensity + Math.sin(elapsedTime * warmConfig.flickerSpeed) * warmConfig.flickerAmplitude
   : warmConfig.baseIntensity;

  warmLight.intensity = warmBase * roomFade;
  ambientLight.intensity = 0.14 * roomFade;
  moonLight.intensity = 1.0 * roomFade;
  moonAreaLight.intensity = 0.75 * roomFade;
  fillLight.intensity = 0.35 * roomFade;
  windowFillLight.intensity = 0.75 * roomFade;
  rimLight.intensity = 0.55 * roomFade;
  backRimLight.intensity = 0.5 * roomFade;
  ledUnderDesk.intensity = 1.1 * roomFade;
  deskBounceLight.intensity = 0.8 * roomFade;

  // ── Flicker de la llama del cohete — tres senos a frecuencias primas ─────
  const fSpd = flameParams.rocketFlickerSpeed;
  const fA = Math.sin(elapsedTime * 7.3 * fSpd) * 0.16;
  const fB = Math.sin(elapsedTime * 13.1 * fSpd + 1.2) * 0.09;
  const fC = Math.sin(elapsedTime * 4.7 * fSpd + 2.8) * 0.06;
  const flameBrightness = 1.0 + fA + fB + fC;
  const fInt = flameParams.rocketFlameIntensity;
  const fScl = flameParams.rocketFlameScale;

  lamparaLight.intensity = Math.max(0.4, flameParams.rocketLightIntensity * flameBrightness) * roomFade;
  lamparaFlameLight.intensity = Math.max(0.3, flameParams.rocketLightIntensity * 1.1 * flameBrightness) * roomFade;

  // Animar las tres capas de llama más el sprite de glow
  if (flameGroup.visible) {
   // Núcleo (idx 0) — corto, intenso, oscila rápido
   const fcore = flameCore;
   const fcFlick = 0.88 + Math.sin(elapsedTime * 11.2 * fSpd) * 0.12;
   fcore.mesh.scale.set(fScl * fcFlick * 0.85, fScl * fcFlick, fScl * fcFlick * 0.85);
   fcore.mat.opacity = Math.min(1, (0.88 + Math.sin(elapsedTime * 9.5 * fSpd) * 0.12) * fInt * roomFade);

   // Media (idx 1) — oscilación media
   const fmid = flameMid;
   const fmFlick = 0.82 + Math.sin(elapsedTime * 7.8 * fSpd + 0.9) * 0.18;
   fmid.mesh.scale.set(fScl * fmFlick * 0.9, fScl * fmFlick, fScl * fmFlick * 0.9);
   fmid.mat.opacity = (0.58 + Math.sin(elapsedTime * 6.3 * fSpd + 0.6) * 0.14) * fInt * roomFade;

   // Exterior (idx 2) — lento y suave
   const fout = flameOuter;
   const foFlick = 0.78 + Math.sin(elapsedTime * 4.9 * fSpd + 2.1) * 0.22;
   fout.mesh.scale.set(fScl * foFlick, fScl * foFlick, fScl * foFlick);
   fout.mat.opacity = (0.24 + Math.sin(elapsedTime * 3.8 * fSpd + 1.5) * 0.1) * fInt * roomFade;

   // Sprite glow — pulso muy lento
   const glowPulse = 0.45 + Math.sin(elapsedTime * 2.4 * fSpd) * 0.15;
   flameGlowSprite.material.opacity = glowPulse * fInt * roomFade;
   const glowS = fScl * (1.0 + Math.sin(elapsedTime * 3.1 * fSpd) * 0.08) * 0.09;
   flameGlowSprite.scale.set(glowS, glowS, 1);
  }

  // ── Neón 3D — sincronizar posición/escala/luz con neonParams ────────────
  neonGroup.position.set(neonParams.x, neonParams.y, neonParams.z);
  neonGroup.scale.setScalar(neonParams.scale);
  neonLight.position.set(neonParams.x, neonParams.y + LETTER_H * neonParams.scale * 0.25, neonParams.z + 0.4);
  neonLight2.position.set(neonParams.x + 0.5, neonParams.y - LETTER_H * neonParams.scale * 0.15, neonParams.z + 0.3);

  // ── Máquina de estados del neón ──────────────────────────────────────────
  if (roomFade > 0.05) {
   neonState.t += (1 / 60) * neonParams.flickerSpeed;
   const phase_n = neonState.phase;

   if (phase_n === "FULL") {
    // Respiración global muy sutil (amplitud 0.04) + sparks ocasionales
    const breathe = 1.0 + Math.sin(elapsedTime * 1.6) * 0.04;
    for (let i = 0; i < NEON_LETTER_COUNT; i++) {
     const spark = Math.random() > 0.997 ? 0.82 + Math.random() * 0.15 : breathe;
     neonState.lit[i] = lerpV(neonState.lit[i], spark, 0.07);
    }

    if (neonState.t > NEON_PHASES.FULL.duration) {
     neonState.phase = "FLICKER";
     neonState.t = 0;
     for (let i = 0; i < NEON_LETTER_COUNT; i++) {
      neonState.target[i] = AI_INDICES.includes(i) ? 1.0 : NEON_RESIDUAL;
     }
    }
   } else if (phase_n === "FLICKER") {
    const progress = Math.min(1, neonState.t / NEON_PHASES.FLICKER.duration);
    for (let i = 0; i < NEON_LETTER_COUNT; i++) {
     const isAI = AI_INDICES.includes(i);
     const tgt = neonState.target[i];
     const noise = isAI ? 0 : (1 - progress) * (Math.random() > 0.82 ? Math.random() * 0.28 : 0);
     const spd = isAI ? 0.035 : 0.05;
     neonState.lit[i] = lerpV(neonState.lit[i], tgt + noise, spd);
    }
    if (neonState.t > NEON_PHASES.FLICKER.duration) {
     neonState.phase = "AI";
     neonState.t = 0;
    }
   } else if (phase_n === "AI") {
    const pulse = 0.88 + Math.sin(elapsedTime * 1.7 * neonParams.flickerSpeed) * 0.12;
    for (let i = 0; i < NEON_LETTER_COUNT; i++) {
     const isAI = AI_INDICES.includes(i);
     neonState.lit[i] = lerpV(neonState.lit[i], isAI ? pulse : NEON_RESIDUAL, isAI ? 0.1 : 0.03);
    }
    neonLight.intensity = 0.5 * pulse * neonParams.glowStrength * roomFade;
    neonLight2.intensity = 0.22 * pulse * neonParams.glowStrength * roomFade;
    if (neonState.t > NEON_PHASES.AI.duration) {
     neonState.phase = "BUILD";
     neonState.t = 0;
     neonState.target.fill(1.0);
    }
   } else if (phase_n === "BUILD") {
    const progress = Math.min(1, neonState.t / NEON_PHASES.BUILD.duration);
    for (let i = 0; i < NEON_LETTER_COUNT; i++) {
     const delay = i / NEON_LETTER_COUNT;
     const letProg = Math.max(0, (progress - delay * 0.32) / 0.68);
     const tgt = Math.min(1.0, letProg * 1.12);
     const spark = tgt > 0.25 && Math.random() > 0.93 ? tgt * (0.65 + Math.random() * 0.5) : tgt;
     neonState.lit[i] = lerpV(neonState.lit[i], spark, 0.09);
    }
    if (neonState.t > NEON_PHASES.BUILD.duration) {
     neonState.phase = "FULL";
     neonState.t = 0;
     neonState.lit.fill(1.0);
    }
   }

   // Aplicar intensidades a materiales por letra
   const avgLit = neonState.lit.reduce((a, b) => a + b, 0) / NEON_LETTER_COUNT;
   for (let i = 0; i < NEON_LETTER_COUNT; i++) {
    const lit = neonState.lit[i];
    const baseI = neonParams.intensity;
    // Núcleo: muy brillante al máximo, mínimo residual visible
    neonCoreMats[i].emissiveIntensity = (NEON_RESIDUAL * 0.8 + lit * 2.8) * baseI * roomFade;
    // Tubo exterior: más tenue, se apaga más rápido
    neonGlowMats[i].emissiveIntensity = (NEON_RESIDUAL * 0.4 + lit * 1.6) * baseI * roomFade;
    neonGlowMats[i].opacity = (0.08 + lit * 0.47) * roomFade;
    // Sprite de glow por letra
    neonGlowSpriteMats[i].opacity = lit * 0.38 * neonParams.glowStrength * roomFade;
   }

   // Luces de rebote (excepto fase AI que ya las controla arriba)
   if (phase_n !== "AI") {
    neonLight.intensity = avgLit * 0.75 * neonParams.glowStrength * roomFade;
    neonLight2.intensity = avgLit * 0.32 * neonParams.glowStrength * roomFade;
   }

   // Mancha de pared
   neonWallMat.opacity = avgLit * 0.45 * neonParams.glowStrength * roomFade;
  } else {
   // Escena fuera de vista — apagar todo
   for (let i = 0; i < NEON_LETTER_COUNT; i++) {
    neonCoreMats[i].emissiveIntensity = 0;
    neonGlowMats[i].emissiveIntensity = 0;
    neonGlowMats[i].opacity = 0;
    neonGlowSpriteMats[i].opacity = 0;
   }
   neonLight.intensity = 0;
   neonLight2.intensity = 0;
   neonWallMat.opacity = 0;
  }

  // ── Estrellas interiores (ventana) ────────────────────────────────────────
  if (starsPoints && !isMobile) {
   starsPoints.rotation.z = elapsedTime * 0.003;
  }

  // ── Claim opacity — calculado aquí para que el bloque UFO pueda usarlo ──
  // (const no se hoista; debe declararse antes de cualquier uso)
  const claimFI = easeOut3(phase(sp, 1.5, 1.78));
  const claimFO = easeIn3(phase(sp, 1.98, 2.2));
  const claimOp = clamp01(claimFI * (1 - claimFO));

  // ── Exterior: 4 capas de estrellas + nebula + luna + texto ─────────────
  // Visibilidad binaria antes de F4S — garantiza ausencia total en habitación

  const inExterior = sp >= F4S;

  const showStars = inExterior && starsParams.visible;
  extStarsPoints.visible = showStars;
  extStarsBPoints.visible = showStars;
  extStarsCPoints.visible = showStars;
  extStarsDPoints.visible = showStars && !isMobile && starsParams.dCount > 0;
  extMoon.visible = inExterior && moonParams.visible;
  extMoonHalo.visible = false; // stub siempre off
  nebulaMesh.visible = inExterior && nebulaParams.visible;

  if (inExterior) {
   const extFI = easeOut3(phase(sp, F4S, F4E));
   const extFO = easeIn3(phase(sp, 2.58, 2.78)); // fade-out más temprano → menos franja negra
   const extBase = clamp01(extFI * (1 - extFO));

   // ── Respiración estelar muy sutil — seno lento, sin flicker ─────────────
   // Cada capa respira a frecuencia ligeramente distinta → sensación orgánica
   const breathA = 1.0 + Math.sin(elapsedTime * 0.18) * 0.04;
   const breathB = 1.0 + Math.sin(elapsedTime * 0.24 + 1.2) * 0.05;
   const breathC = 1.0 + Math.sin(elapsedTime * 0.31 + 2.4) * 0.06;

   // ── Parallax real — cada capa rota a velocidad diferente ────────────────
   // Multiplicado por starsParams.parallaxSpeed (GUI)
   if (!isMobile) {
    const ps = starsParams.parallaxSpeed;
    // Capa A (lejana) — movimiento mínimo
    extStarsPoints.rotation.y = elapsedTime * 0.0018 * ps;
    extStarsPoints.rotation.x = elapsedTime * 0.0006 * ps;
    // Capa B (media) — algo más
    extStarsBPoints.rotation.y = elapsedTime * 0.0032 * ps;
    extStarsBPoints.rotation.x = elapsedTime * 0.0012 * ps;
    // Capa C (cercana) — más que B, menos que D
    extStarsCPoints.rotation.y = elapsedTime * 0.0038 * ps;
    extStarsCPoints.rotation.x = elapsedTime * 0.0014 * ps;
    // Capa D (primer plano) — el más visible pero nunca molesto
    extStarsDPoints.rotation.y = elapsedTime * 0.0055 * ps;
    extStarsDPoints.rotation.x = elapsedTime * 0.002 * ps;
   }

   // ── Actualizar uniforms del shader de estrellas ────────────────────────
   // uTime para el twinkle, uSize desde params (permite ajustar tamaño vivo),
   // uTwinkle desde params, uOpacity combina extBase + respiración + params.
   const starsVisibleMult = starsParams.visible ? starsParams.globalOpacity : 0.0;
   const mats = [extStarsMat, extStarsBMat, extStarsCMat, extStarsDMat];
   mats.forEach((m) => {
    m.uniforms.uTime.value = elapsedTime;
    m.uniforms.uTwinkle.value = starsParams.twinkleStrength;
   });
   extStarsMat.uniforms.uSize.value = starsParams.aSize;
   extStarsBMat.uniforms.uSize.value = starsParams.bSize;
   extStarsCMat.uniforms.uSize.value = starsParams.cSize;
   extStarsDMat.uniforms.uSize.value = starsParams.dSize;

   extStarsMat.uniforms.uOpacity.value = extBase * starsParams.aOpacity * breathA * starsVisibleMult;
   extStarsBMat.uniforms.uOpacity.value = extBase * starsParams.bOpacity * breathB * starsVisibleMult;
   extStarsCMat.uniforms.uOpacity.value = extBase * starsParams.cOpacity * breathC * starsVisibleMult;
   extStarsDMat.uniforms.uOpacity.value = isMobile ? 0.0 : extBase * starsParams.dOpacity * starsVisibleMult;

   // ── Nebula de fondo — aparece con el exterior ────────────────────────────
   nebulaMesh.visible = nebulaParams.visible;
   nebulaMat.opacity = extBase * nebulaParams.opacity;

   // ── Viñeta — sigue la cámara, fade-in suave con el exterior ──────────────
   vignetteMesh.position.set(camera.position.x - 0.5, camera.position.y, camera.position.z);
   vignetteMesh.rotation.y = Math.PI * 0.5;
   vignetteMat.opacity = extBase * atmosphereParams.vignetteOpacity;

   // ── Luna ──────────────────────────────────────────────────────────────
   extMoon.visible = moonParams.visible && inExterior;
   extMoonMat.opacity = extBase * moonParams.opacity;
   extMoonLight.intensity = extBase * 0.2 * moonParams.lightIntensity;

   // ── Satélite orbital ──────────────────────────────────────────────────
   satGroup.visible = true;
   const satAngle = elapsedTime * ((Math.PI * 2) / 48);
   satGroup.position.set(
    SAT_ORBIT_X + Math.cos(satAngle) * SAT_RX,
    SAT_ORBIT_Y + Math.sin(satAngle * 0.38) * 0.5,
    SAT_ORBIT_Z + Math.sin(satAngle) * SAT_RZ,
   );
   satGroup.rotation.z = satAngle * 0.15;
   const satOp = extBase * 0.72;
   satBodyMat.opacity = satOp;
   satPanelMat.opacity = satOp * 0.65;
   satGlowMat.opacity = satOp * 0.45;

   // ── Estrella fugaz ────────────────────────────────────────────────────
   if (!isMobile && extBase > 0.3) {
    if (shootingState.phase === "idle") {
     const dt = elapsedTime - (shootingState._lastElapsed || elapsedTime);
     shootingState.nextAt -= dt;
     if (shootingState.nextAt <= 0) spawnShootingStar();
    }
    shootingState._lastElapsed = elapsedTime;

    if (shootingState.phase === "active") {
     const DURATION = 0.85;
     shootingState.t += 1 / 60 / DURATION;
     if (shootingState.t >= 1) {
      shootingState.phase = "idle";
      shootingState.nextAt = 8 + Math.random() * 12;
      shootLine.visible = false;
      shootLineMat.opacity = 0.0;
     } else {
      const t = shootingState.t;
      const tailT = Math.max(0, t - 0.35);
      const L = shootingState.length;
      shootLinePos[0] = shootingState.startX + shootingState.dirX * L * tailT;
      shootLinePos[1] = shootingState.startY + shootingState.dirY * L * tailT;
      shootLinePos[2] = shootingState.startZ + shootingState.dirZ * L * tailT;
      shootLinePos[3] = shootingState.startX + shootingState.dirX * L * t;
      shootLinePos[4] = shootingState.startY + shootingState.dirY * L * t;
      shootLinePos[5] = shootingState.startZ + shootingState.dirZ * L * t;
      shootLineGeo.attributes.position.needsUpdate = true;
      const fadeIn = Math.min(1, t / 0.15);
      const fadeOut = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
      shootLineMat.opacity = fadeIn * fadeOut * 0.75 * extBase;
     }
    }
   }

   // ── UFO — scroll-driven, completamente declarativo ──────────────────────
   const ufoT = phase(sp, UFO_SP_START, UFO_SP_END);
   const ufoActive = sp >= UFO_SP_START && sp <= UFO_SP_END && ufoRoot && ufoParams.visible;

   if (ufoActive) {
    // ── Posición — barrido en Z (horizontal para el espectador) ────────────
    const ufoTE = easeIO3(ufoT);
    const ufoZ = lerpV(UFO_Z_START, UFO_Z_END, ufoTE);
    const ufoY = UFO_BASE_Y + Math.sin(ufoT * Math.PI) * 0.08;

    ufoGroup.visible = true;
    // Posición con offsets de GUI
    ufoGroup.position.set(UFO_X + ufoParams.xOffset, ufoY + ufoParams.yOffset, ufoZ);
    // Rotación + offset
    ufoGroup.rotation.y = Math.PI * 0.5 + (ufoTE - 0.5) * 0.15 + ufoParams.rotYOffset;

    // Fade: primero y último 10% del tramo
    const ufoFade = ufoT < 0.1 ? ufoT / 0.1 : ufoT > 0.9 ? (1 - ufoT) / 0.1 : 1.0;
    const ufoOp = clamp01(ufoFade) * 0.92;
    ufoMaterials.forEach((m) => {
     m.opacity = ufoOp;
    });

    // Glow intensity reactivo (se multiplica en updateUfo, pero por fade también)
    if (ufoInnerLight)
     ufoInnerLight.intensity = UFO_INNER_LIGHT_BASE * ufoParams.underLightIntensity * ufoParams.glowIntensity * ufoFade;
    if (ufoInnerRim) ufoInnerRim.intensity = UFO_INNER_RIM_BASE * ufoParams.glowIntensity * ufoFade;

    // ── beamInfl: distancia del UFO al centro del claim en Z ───────────────
    const beamDist = Math.abs(ufoZ - EXT_Z);
    const beamRange = 2.2;
    const beamRaw = Math.max(0, 1 - beamDist / beamRange);
    const beamInfl = beamRaw * beamRaw * ufoFade;

    // ── Haz triangular ─────────────────────────────────────────────────────
    ufoBeamMesh.visible = true;
    ufoBeamMesh.position.set(UFO_X + ufoParams.xOffset + 0.01, ufoY + ufoParams.yOffset - 0.9, ufoZ);
    // Escala X = ancho del haz; escala Y = longitud (el haz está rotado Y=π/2
    // → el triángulo vive en el plano YZ; scale.z controla ancho, scale.y largo)
    ufoBeamMesh.scale.set(1, ufoParams.beamLength, ufoParams.beamWidth);
    ufoBeamMat.opacity = beamInfl * 0.7 * ufoParams.beamOpacityMult;

    // ── Escáner en el canvas del claim ────────────────────────────────────
    const newInfl = Math.round(beamInfl * 40) / 40;
    if (Math.abs(newInfl - (extPlaneA.userData.lastInfl ?? -1)) > 0.001) {
     drawClaimScan(newInfl);
     PLANE_A_TEX.needsUpdate = true;
     extPlaneA.userData.lastInfl = newInfl;
    }
   } else {
    // Fuera del tramo: resetear canvas al estado base
    ufoGroup.visible = false;
    ufoBeamMesh.visible = false;
    ufoBeamMat.opacity = 0.0;
    if (ufoInnerLight) ufoInnerLight.intensity = 0.0;
    if (ufoInnerRim) ufoInnerRim.intensity = 0.0;
    if (extPlaneA.userData.lastInfl !== 0) {
     drawClaimScan(0);
     PLANE_A_TEX.needsUpdate = true;
     extPlaneA.userData.lastInfl = 0;
    }
    if (ufoRoot)
     ufoMaterials.forEach((m) => {
      m.opacity = 0.0;
     });
   }
  } else {
   // Fuera del exterior — silenciar todo
   extStarsMat.uniforms.uOpacity.value = 0.0;
   extStarsBMat.uniforms.uOpacity.value = 0.0;
   extStarsCMat.uniforms.uOpacity.value = 0.0;
   extStarsDMat.uniforms.uOpacity.value = 0.0;
   extMoonMat.opacity = 0.0;
   extMoonLight.intensity = 0.0;
   nebulaMat.opacity = 0.0;
   extGlowMat.opacity = 0.0;
   satGroup.visible = false;
   shootLine.visible = false;
   vignetteMat.opacity = 0.0;
   ufoGroup.visible = false;
   extUfoScanMat.opacity = 0.0;
   ufoBeamMesh.visible = false;
   ufoBeamMat.opacity = 0.0;
   if (ufoInnerLight) ufoInnerLight.intensity = 0.0;
   if (ufoInnerRim) ufoInnerRim.intensity = 0.0;
  }

  // ── Bloque B — Claim narrativo (F5: 1.50 → 2.20) ─────────────────────────
  // Visibilidad controlada por claimParams.visible
  const claimVisMult = claimParams.visible ? claimParams.opacityMult : 0.0;

  // Texto
  extPlaneAMat.opacity = claimOp * claimVisMult;

  // Halo elíptico de fondo
  extPlaneHaloMat.opacity = claimOp * 0.62 * claimVisMult * claimParams.haloOpacityMult;

  // Scale de entrada sutil: 0.95 → 1.0 durante fade-in, multiplicado por params.scale
  const claimScaleAnim = lerpV(0.95, 1.0, claimFI) * claimParams.scale;
  extPlaneA.scale.setScalar(claimScaleAnim);
  extPlaneHalo.scale.setScalar(claimScaleAnim);
  extGlowPlane.scale.setScalar(claimScaleAnim);

  // Glow naranja vivo — pulso modulado por claimParams.glowIntensity
  if (claimOp > 0.01 && claimParams.visible) {
   const glowPulse = 0.025 + Math.sin(elapsedTime * 0.55) * 0.013;
   extGlowMat.opacity = claimOp * glowPulse * claimParams.glowIntensity * claimParams.opacityMult;
  } else {
   extGlowMat.opacity = 0.0;
  }

  // ── Bloque C — Texto técnico (F6: 2.20 → 2.85) ───────────────────────────
  const techFI = easeOut3(phase(sp, 2.2, 2.46));
  const techFO = easeIn3(phase(sp, 2.65, 2.85));
  extPlaneCMat.opacity = clamp01(techFI * (1 - techFO));

  // ── Atmósfera global — exposure + background (cambios en vivo) ───────────
  if (renderer.toneMappingExposure !== atmosphereParams.exposure) {
   renderer.toneMappingExposure = atmosphereParams.exposure;
  }

  renderer.render(scene, camera);
  requestRender();
 }

 requestRender();

 /**
  * =========================================================
  * CLEANUP
  * =========================================================
  */
 return () => {
  window.removeEventListener("scroll", onScroll);
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

  // Astronauta (hijo de chairYaw, se elimina con chairAnchor pero hacemos dispose explícito)
  if (astronautRoot) {
   astronautRoot.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) child.geometry.dispose();
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
     if (m?.dispose) m.dispose();
    });
   });
  }

  // Lámpara
  if (lamparaAnchor && deskAnchor) deskAnchor.remove(lamparaAnchor);
  if (lamparaRoot) {
   lamparaRoot.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) child.geometry.dispose();
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
     if (m?.dispose) m.dispose();
    });
   });
  }

  // Teclado
  if (tecladoAnchor && deskAnchor) deskAnchor.remove(tecladoAnchor);
  if (tecladoRoot) {
   tecladoRoot.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) child.geometry.dispose();
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
     if (m?.dispose) m.dispose();
    });
   });
  }

  // Ratón
  if (ratonAnchor && deskAnchor) deskAnchor.remove(ratonAnchor);
  if (ratonRoot) {
   ratonRoot.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) child.geometry.dispose();
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
     if (m?.dispose) m.dispose();
    });
   });
  }

  if (chairAnchor) {
   scene.remove(chairAnchor);
  }

  if (chair) {
   chair.traverse((child) => {
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

  if (monitorLeftAnchor && deskAnchor) {
   deskAnchor.remove(monitorLeftAnchor);
  }

  if (monitorRightAnchor && deskAnchor) {
   deskAnchor.remove(monitorRightAnchor);
  }

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

  if (monitorRightRoot) {
   monitorRightRoot.traverse((child) => {
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

  if (deskTopSupport) {
   if (deskTopSupport.geometry) deskTopSupport.geometry.dispose();
   if (deskTopSupport.material) deskTopSupport.material.dispose();
  }

  planeGeometry14.dispose();
  floorNormalTex.dispose();
  planeGeometryWall.dispose();
  unitPlaneGeometry.dispose();
  unitBoxGeometry.dispose();
  moonGeometry.dispose();

  if (starsGeometry) starsGeometry.dispose();
  if (starsMaterial) starsMaterial.dispose();

  // Exterior espacial — estrellas (4 capas) + nebula
  extStarsGeo.dispose();
  extStarsMat.dispose();
  extStarsBGeo.dispose();
  extStarsBMat.dispose();
  extStarsCGeo.dispose();
  extStarsCMat.dispose();
  extStarsDGeo.dispose();
  extStarsDMat.dispose();
  // Sprite compartido por las 4 capas
  starSpriteTex.dispose();
  nebulaGeo.dispose();
  if (nebulaMat.map) nebulaMat.map.dispose();
  nebulaMat.dispose();
  vignetteGeo.dispose();
  if (vignetteMat.map) vignetteMat.map.dispose();
  vignetteMat.dispose();
  // Luna
  extMoonGeo.dispose();
  if (extMoonMat.map) extMoonMat.map.dispose();
  extMoonMat.dispose();
  extMoonHaloGeo.dispose();
  extMoonHaloMat.dispose();
  // Planos de texto
  extPlaneHaloGeo.dispose();
  if (extPlaneHaloMat.map) extPlaneHaloMat.map.dispose();
  extPlaneHaloMat.dispose();
  extPlaneAGeo.dispose();
  if (extPlaneAMat.map) extPlaneAMat.map.dispose();
  extPlaneAMat.dispose();
  extGlowGeo.dispose();
  extGlowMat.dispose();
  // Satélite
  satBodyGeo.dispose();
  satBodyMat.dispose();
  satPanelGeo.dispose();
  satPanelMat.dispose();
  satGlowTex.dispose();
  satGlowMat.dispose();
  // Estrella fugaz
  shootLineGeo.dispose();
  shootLineMat.dispose();
  // UFO
  extUfoScanGeo.dispose();
  extUfoScanMat.dispose();
  ufoBeamGeo.dispose();
  ufoBeamTex.dispose();
  ufoBeamMat.dispose();
  ufoOverlayWhiteGeo.dispose();
  if (ufoOverlayWhiteMat.map) ufoOverlayWhiteMat.map.dispose();
  ufoOverlayWhiteMat.dispose();
  ufoOverlayOrangeGeo.dispose();
  if (ufoOverlayOrangeMat.map) ufoOverlayOrangeMat.map.dispose();
  ufoOverlayOrangeMat.dispose();
  if (ufoRoot) {
   ufoRoot.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) child.geometry.dispose();
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
     if (m && m.dispose) m.dispose();
    });
   });
  }
  extPlaneCGeo.dispose();
  if (extPlaneCMat.map) extPlaneCMat.map.dispose();
  extPlaneCMat.dispose();

  wallMaterial.dispose();
  floorMaterial.dispose();
  deskMaterial.dispose();
  legMaterial.dispose();
  windowFrameMaterial.dispose();
  windowRevealMaterial.dispose();
  windowGlassMaterial.dispose();
  outerGlowMaterial.dispose();
  moonMaterial.dispose();

  renderer.dispose();

  if (gui) gui.destroy();

  // Neón 3D — tubos, materiales, sprites, luces
  neonLetterGroups.forEach((lg) => {
   lg.traverse((child) => {
    if (!child.isMesh && !child.isSprite) return;
    if (child.geometry) child.geometry.dispose();
   });
  });
  neonCoreMats.forEach((m) => m.dispose());
  neonGlowMats.forEach((m) => m.dispose());
  neonGlowSpriteMats.forEach((m) => {
   if (m.map) m.map.dispose();
   m.dispose();
  });
  scene.remove(backRimLight);
  backPlateMat.dispose();
  backPlateGeo.dispose();
  pinGeo.dispose();
  pinMat.dispose();
  neonWallTex.dispose();
  neonWallMat.dispose();
  // neonWallGeo se libera al traversar neonGroup (es hijo de él)
  scene.remove(neonGroup);
  scene.remove(neonLight);
  scene.remove(neonLight2);
  // Luces extra
  scene.remove(windowFillLight);
  scene.remove(lamparaLight);
  scene.remove(rimLight);
  scene.remove(backRimLight);

  scene.remove(moonAreaLight);
  scene.remove(backRimLight);
  scene.remove(ledUnderDesk);
  scene.remove(lamparaFlameLight);

  scene.remove(deskBounceLight);

  if (dogHologram) {
   dogHologram.traverse((child) => {
    if (child.isMesh || child.isLineSegments) {
     if (child.geometry) child.geometry.dispose();
     const mats = Array.isArray(child.material) ? child.material : [child.material];
     mats.forEach((m) => m && m.dispose && m.dispose());
    }
   });
   scene.remove(dogHologram);
  }
  // Llamas del cohete — conos + sprite glow
  flames.forEach(({ mesh, mat }) => {
   mesh.geometry.dispose();
   mat.dispose();
  });
  flameGlowTex.dispose();
  flameGlowMat.dispose();
  flameGroup.remove(flameGlowSprite);
  scene.remove(flameGroup);
  // Texturas de pared
  [wallColorTex, wallNormalTex, wallRoughTex, wallAOTex].forEach((t) => {
   if (t) t.dispose();
  });
 };
}
