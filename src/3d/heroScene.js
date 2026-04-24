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

 // ═══════════════════════════════════════════════════════════════════════
 // CUSTOM CURSOR — clásico minimal: aro + punto central
 // ═══════════════════════════════════════════════════════════════════════
 //
 // Dos elementos nada más. El aro persigue con lerp (sensación suave).
 // El punto sigue casi exacto. En hover sobre elementos interactivos,
 // el aro crece y se rellena un 12%. Nada de trails ni SVG ni rotación.
 //
 const CUR_COLOR = "#6ad0ff";

 const cursorRing = document.createElement("div");
 Object.assign(cursorRing.style, {
  position: "fixed",
  top: "0",
  left: "0",
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  border: `1.4px solid ${CUR_COLOR}`,
  background: "rgba(106, 208, 255, 0)",
  pointerEvents: "none",
  zIndex: "99998",
  transform: "translate3d(-50%, -50%, 0)",
  transition: "width 0.22s ease, height 0.22s ease, background 0.22s ease, border-color 0.22s ease, opacity 0.25s ease",
  willChange: "transform",
 });

 const cursorDot = document.createElement("div");
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

 // ── Ocultar cursor nativo: CSS global + inline en html/body ────────────
 const HIDDEN_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'><rect width='1' height='1' fill='none'/></svg>") 0 0, none`;

 const cursorStyleEl = document.createElement("style");
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

 // ── Estado ──────────────────────────────────────────────────────────────
 let cursorMouseX = window.innerWidth / 2;
 let cursorMouseY = window.innerHeight / 2;
 let cursorRingX = cursorMouseX;
 let cursorRingY = cursorMouseY;
 let cursorDotX = cursorMouseX;
 let cursorDotY = cursorMouseY;
 let cursorHover = false;

 const onCursorMove = (e) => {
  cursorMouseX = e.clientX;
  cursorMouseY = e.clientY;

  if (e.target && e.target.style) {
   e.target.style.setProperty("cursor", HIDDEN_CURSOR, "important");
  }
 };

 const onCursorOver = (e) => {
  const t = e.target;
  const isInteractive = t.closest("a, button, [data-clickable], canvas") !== null;
  if (isInteractive !== cursorHover) {
   cursorHover = isInteractive;
   if (cursorHover) {
    cursorRing.style.width = "40px";
    cursorRing.style.height = "40px";
    cursorRing.style.background = "rgba(106, 208, 255, 0.12)";
    cursorRing.style.borderColor = "rgba(106, 208, 255, 0.9)";
    cursorDot.style.width = "3px";
    cursorDot.style.height = "3px";
   } else {
    cursorRing.style.width = "26px";
    cursorRing.style.height = "26px";
    cursorRing.style.background = "rgba(106, 208, 255, 0)";
    cursorRing.style.borderColor = CUR_COLOR;
    cursorDot.style.width = "4px";
    cursorDot.style.height = "4px";
   }
  }
 };

 const onCursorLeave = () => {
  cursorRing.style.opacity = "0";
  cursorDot.style.opacity = "0";
 };
 const onCursorEnter = () => {
  cursorRing.style.opacity = "1";
  cursorDot.style.opacity = "1";
 };

 window.addEventListener("mousemove", onCursorMove, { passive: true });
 window.addEventListener("mouseover", onCursorOver, { passive: true });
 document.addEventListener("mouseleave", onCursorLeave);
 document.addEventListener("mouseenter", onCursorEnter);

 let cursorRafId = 0;
 const cursorTick = () => {
  // Aro — lerp medio, suave pero responsivo
  cursorRingX += (cursorMouseX - cursorRingX) * 0.22;
  cursorRingY += (cursorMouseY - cursorRingY) * 0.22;
  cursorRing.style.transform = `translate3d(${cursorRingX}px, ${cursorRingY}px, 0) translate(-50%, -50%)`;

  // Punto — casi exacto, solo el más mínimo lerp para suavizar
  cursorDotX += (cursorMouseX - cursorDotX) * 0.55;
  cursorDotY += (cursorMouseY - cursorDotY) * 0.55;
  cursorDot.style.transform = `translate3d(${cursorDotX}px, ${cursorDotY}px, 0) translate(-50%, -50%)`;

  cursorRafId = requestAnimationFrame(cursorTick);
 };
 cursorTick();

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

 // Config en vivo de la pantalla wireframe (segunda pantalla).
 // Se lee desde makeWireframeViewerScreenTexture y desde el GUI.
 const wireScreen = {
  fps: 30,
  speed: 1.0,
 };

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
  * Pantalla derecha — visor 3D wireframe minimalista.
  * Renderiza 3 viewports con geometrías primitivas rotando, estilo CAD.
  * Cero texto denso: transmite "portfolio 3D" sin gritar.
  */
 function makeWireframeViewerScreenTexture() {
  // Canvas final 720×460 (antes 1024×640) — 50% menos píxeles sin pérdida
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

    // Rejilla cada 30px (antes 20px = 50% menos líneas)
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
   // Vaciar la cola de pendientes (cohete, teclado, ratón que cargaron
   // antes que la mesa — esto arregla el bug del cohete desaparecido)
   while (pendingDeskChildren.length) {
    const pending = pendingDeskChildren.shift();
    deskAnchor.add(pending);
   }
   updateLampara();
   updateTeclado();
   updateRaton();
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
 // Glow exterior SIEMPRE detrás del cristal (windowGlass.renderOrder = 20).
 // Sin esto, al rotar cámara el sort por distancia hace flickering azul
 // alrededor del marco.
 outerGlow.renderOrder = 19;

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

 // ══════════════════════════════════════════════════════════════════════════
 // ASTEROIDES — añaden profundidad/parallax al exterior espacial
 // ══════════════════════════════════════════════════════════════════════════
 //
 // 7 piezas distribuidas en 3 planos de profundidad para que, al moverse la
 // cámara, el conjunto respire con parallax real. Posiciones manuales para
 // NO tapar la luna ni el claim, llenando los huecos del encuadre.
 //
 // Material: muy mate, color gris-marrón oscuro (rocoso, sin saturación) y
 // un emissive cálido casi imperceptible que sugiere luz reflejada de la
 // luna sin convertir las rocas en faros.
 //
 // Geometría: icosaedro nivel 1 con desplazamiento de vértices por ruido,
 // distinto por seed → cada asteroide es único. Total ≈ 280 vértices entre
 // los 7. Coste despreciable.

 const asteroidParams = {
  visible: true,
  opacityMult: 1.0,
  emissiveMult: 1.0,
  rotSpeed: 1.0,
  driftSpeed: 1.0,
 };

 const asteroidsGroup = new THREE.Group();
 asteroidsGroup.visible = false;
 scene.add(asteroidsGroup);

 // Posiciones cuidadas: lejanos (background, grandes y lentos),
 // medios (parallax intermedio), cercanos (foreground, pequeños y rápidos).
 // X se mide desde EXT_X (zona del exterior, X negativo = más profundo).
 const ASTEROID_SPECS = [
  // Background — grandes, lentos, lejos
  { x: EXT_X - 18, y: EXT_Y + 2.6, z: EXT_Z - 3.2, s: 0.28, axis: [0.4, 1.0, 0.6] },
  { x: EXT_X - 15.5, y: EXT_Y - 2.4, z: EXT_Z + 1.6, s: 0.22, axis: [0.8, 0.5, 0.9] },
  // Mid — tamaño y velocidad intermedios
  { x: EXT_X - 9.8, y: EXT_Y + 1.9, z: EXT_Z - 1.6, s: 0.13, axis: [1.0, 0.4, 0.7] },
  { x: EXT_X - 11, y: EXT_Y - 1.8, z: EXT_Z - 0.4, s: 0.16, axis: [0.6, 0.9, 0.3] },
  // Foreground — pequeños, rápidos, cerca de cámara
  { x: EXT_X - 5.5, y: EXT_Y + 2.3, z: EXT_Z + 2.4, s: 0.08, axis: [0.3, 0.8, 1.0] },
  { x: EXT_X - 5.0, y: EXT_Y - 2.7, z: EXT_Z + 1.9, s: 0.06, axis: [0.7, 0.7, 0.7] },
  { x: EXT_X - 4.5, y: EXT_Y - 0.6, z: EXT_Z + 2.7, s: 0.05, axis: [0.9, 0.3, 0.5] },
 ];

 // Geometría única por asteroide (deformada por seed) — look natural
 function makeAsteroidGeometry(seed) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
   const x = pos.getX(i);
   const y = pos.getY(i);
   const z = pos.getZ(i);
   // Pseudo-noise determinista por vértice + seed → cada asteroide
   // tiene una silueta única pero estable
   const n = Math.sin(x * 12.9 + y * 78.2 + z * 37.7 + seed * 4.13) * 0.5;
   const r = 1.0 + n * 0.22;
   pos.setXYZ(i, x * r, y * r, z * r);
  }
  geo.computeVertexNormals();
  return geo;
 }

 // Material compartido — una sola dispose en cleanup
 const asteroidMat = new THREE.MeshStandardMaterial({
  color: "#3a352e", // gris-marrón rocoso, baja saturación
  roughness: 0.94, // mate, sin brillos
  metalness: 0.05,
  emissive: new THREE.Color("#1a1410"), // recoge "luz lunar" de forma muy sutil
  emissiveIntensity: 0.18,
  transparent: true,
  opacity: 0,
 });

 const asteroids = ASTEROID_SPECS.map((spec, i) => {
  const geo = makeAsteroidGeometry(i + 1);
  const mesh = new THREE.Mesh(geo, asteroidMat);
  mesh.position.set(spec.x, spec.y, spec.z);
  mesh.scale.setScalar(spec.s);
  mesh.userData.axis = new THREE.Vector3(...spec.axis).normalize();
  // Velocidad inversa al tamaño: piezas pequeñas rotan más rápido
  mesh.userData.rotSpeed = 0.04 + (1 - spec.s / 0.3) * 0.08;
  mesh.userData.basePos = new THREE.Vector3(spec.x, spec.y, spec.z);
  mesh.userData.driftPhase = i * 0.97;
  mesh.userData.driftAmpY = 0.05 + (i % 3) * 0.04;
  asteroidsGroup.add(mesh);
  return mesh;
 });

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
  x: -1.14,
  y: 6.5,
  z: -3.88,
  scale: 0.89,
  intensity: 0.29,
  glowStrength: 0, // rebote de PointLights apagado, el glow es por letra
  flickerSpeed: 1.0,
  glbScale: 0.171,
  glbRotX: 0,
  glbRotY: 0,
  glbRotZ: 0,
  glbOffsetX: 0,
  glbOffsetY: 2.0,
  glbOffsetZ: 1.31,
  // ── Halo por letra (sprite radial por cada mesh) ──────────────────────
  haloOpacity: 0.53, // presencia del halo individual
  haloScale: 1.6, // tamaño respecto al bounding de cada letra
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

 // ── Grupo contenedor del neón ─────────────────────────────────────────────
 // Antes contenía letras dibujadas a mano; ahora es el padre donde se
 // añadirá el neon.glb al cargar. Se posiciona/escala desde neonParams.
 const neonGroup = new THREE.Group();
 scene.add(neonGroup);

 // Stub de mancha de pared — el tick aún hace referencia a ella. Vacía.
 const neonWallMat = { opacity: 0 };

 // ── Luces de rebote ───────────────────────────────────────────────────────
 //
 // Dos PointLights ligeramente desplazadas dan un rebote volumétrico.
 // La segunda está más baja y tenue — crea un gradiente natural.
 // Distancias cortas (4.5 / 3.5) → el rebote violeta se concentra en la
 // pared detrás del letrero y no contamina escritorio ni robot.
 const neonLight = new THREE.PointLight(NEON_TUBE, 0.75, 4.5, 2.0);
 const neonLight2 = new THREE.PointLight(NEON_TUBE, 0.42, 3.5, 2.2);
 scene.add(neonLight);
 scene.add(neonLight2);

 // ── Posicionamiento inicial ───────────────────────────────────────────────
 neonGroup.position.set(neonParams.x, neonParams.y, neonParams.z);
 neonGroup.scale.setScalar(neonParams.scale);
 neonLight.position.set(neonParams.x, neonParams.y + 0.1, neonParams.z + 0.4);
 neonLight2.position.set(neonParams.x + 0.5, neonParams.y - 0.2, neonParams.z + 0.3);

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

 // Núcleo blanco-ámbar tibio — el centro más caliente
 const flameCore = makeFlameCone(0, 0, 0.055, 0.006, "#ffd88a", 0.82);
 // Media naranja profundo — más fuego que lámpara
 const flameMid = makeFlameCone(0, 0, 0.09, 0.014, "#ff8a28", 0.48);
 // Exterior rojo-ámbar muy diáfano — "humo caliente"
 const flameOuter = makeFlameCone(0, 0, 0.12, 0.022, "#d84a0c", 0.22);

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

 // Key fría lateral: entra por ventana, recorta bordes.
 const moonLight = new THREE.DirectionalLight("#8a9cff", 1.0);
 moonLight.position.set(-5, 4, 1);
 scene.add(moonLight);

 // Rebote frío de luna entrando por ventana.
 const windowFillLight = new THREE.PointLight("#5a72d8", 0.75, 14, 2);
 windowFillLight.position.set(-4.2, 3.0, 0.5);
 scene.add(windowFillLight);
 // WARM KEY del cohete — cálida pero CONTENIDA.
 // distance bajo para que NO se coma toda la escena.
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

 // Rebote cálido sobre la superficie de la mesa (zona cohete).
 const deskBounceLight = new THREE.PointLight("#ff9a60", 0.8, 1.9, 2.6);
 deskBounceLight.position.set(-3.5, 2.65, -1.65);
 scene.add(deskBounceLight);

 // ── CAMBIO: deskBounceLightR — antes producía un rim duro en la silla.
 //    Baja intensidad (0.55 → 0.3), color menos saturado, distance más corta,
 //    y la subo ligeramente en Y para que caiga sobre la mesa, no sobre la
 //    silla. Ahora se siente como rebote de mesa, no como luz artificial.
 const deskBounceLightR = new THREE.PointLight("#e69165", 0.3, 1.8, 3.0);
 deskBounceLightR.position.set(-0.4, 2.75, -1.4);
 scene.add(deskBounceLightR);

 // ── CAMBIO: rightWallFill — era la culpable principal del edge naranja
 //    en el lado derecho de la silla. Bajo intensidad, ALEJO la luz
 //    (X +4.2 → +5.0) y subo la Y para que trabaje sobre la pared, no
 //    sobre el respaldo de la silla.
 const rightWallFill = new THREE.PointLight("#c97a4a", 0.22, 5.5, 2.4);
 rightWallFill.position.set(5.0, 4.4, -2.4);
 scene.add(rightWallFill);

 /**
  * =========================================================
  * WALL POSTER — "SIGUE CONSTRUYENDO"
  * =========================================================
  * Póster decorativo en la pared derecha. Marco fino, imagen
  * procedural de eclipse, halo cálido detrás + spot dedicado.
  * Motivo celeste: dialoga con la luna de la ventana.
  */
 function createWallPoster() {
  const group = new THREE.Group();

  // ═══════════════════════════════════════════════════════════════════════
  // HELPER: dibuja texto con tracking manual (canvas no soporta
  // letter-spacing CSS fiable — hay que posicionar letra a letra).
  // ═══════════════════════════════════════════════════════════════════════
  const drawTrackedText = (ctx, text, cx, cy, tracking) => {
   const widths = text.split("").map((c) => ctx.measureText(c).width);
   const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
   let x = cx - total / 2;
   for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, cy);
    x += widths[i] + tracking;
   }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 1) CANVAS DEL PÓSTER — eclipse + montañas + "SIGUE CONSTRUYENDO"
  //    Resolución alta (768×1024) para texto nítido al acercarse.
  // ═══════════════════════════════════════════════════════════════════════
  const posterCanvas = document.createElement("canvas");
  posterCanvas.width = 768;
  posterCanvas.height = 1024;
  const pctx = posterCanvas.getContext("2d");

  // Cielo nocturno con warm bottom
  const sky = pctx.createLinearGradient(0, 0, 0, 1024);
  sky.addColorStop(0, "#080b18");
  sky.addColorStop(0.45, "#121828");
  sky.addColorStop(0.8, "#2a1b22");
  sky.addColorStop(1, "#170f16");
  pctx.fillStyle = sky;
  pctx.fillRect(0, 0, 768, 1024);

  // Estrellas (mitad superior)
  for (let i = 0; i < 220; i++) {
   const x = Math.random() * 768;
   const y = Math.random() * 600;
   const s = Math.random() * 2.0 + 0.4;
   const a = Math.random() * 0.7 + 0.2;
   pctx.fillStyle = `rgba(255,255,255,${a})`;
   pctx.fillRect(x, y, s, s);
  }

  // Halo cálido detrás del eclipse
  const cx = 384,
   cy = 460;
  const haloInner = pctx.createRadialGradient(cx, cy + 60, 8, cx, cy + 60, 360);
  haloInner.addColorStop(0, "rgba(255,140,60,0.6)");
  haloInner.addColorStop(0.3, "rgba(255,100,45,0.35)");
  haloInner.addColorStop(1, "rgba(255,80,30,0)");
  pctx.globalCompositeOperation = "screen";
  pctx.fillStyle = haloInner;
  pctx.fillRect(0, 0, 768, 1024);
  pctx.globalCompositeOperation = "source-over";

  // Anillo del eclipse
  const ringR = 150;
  const ringGrad = pctx.createRadialGradient(cx, cy, ringR - 12, cx, cy, ringR + 18);
  ringGrad.addColorStop(0, "rgba(255,170,90,0)");
  ringGrad.addColorStop(0.45, "rgba(255,215,150,1)");
  ringGrad.addColorStop(0.7, "rgba(255,170,80,0.85)");
  ringGrad.addColorStop(1, "rgba(255,150,70,0)");
  pctx.fillStyle = ringGrad;
  pctx.beginPath();
  pctx.arc(cx, cy, ringR + 18, 0, Math.PI * 2);
  pctx.fill();

  // Núcleo oscuro
  pctx.fillStyle = "#05060b";
  pctx.beginPath();
  pctx.arc(cx, cy, ringR - 12, 0, Math.PI * 2);
  pctx.fill();

  // Montañas (dos capas)
  pctx.fillStyle = "#0d1118";
  pctx.beginPath();
  pctx.moveTo(0, 800);
  pctx.lineTo(120, 720);
  pctx.lineTo(240, 760);
  pctx.lineTo(360, 695);
  pctx.lineTo(500, 750);
  pctx.lineTo(630, 710);
  pctx.lineTo(768, 760);
  pctx.lineTo(768, 1024);
  pctx.lineTo(0, 1024);
  pctx.closePath();
  pctx.fill();

  pctx.fillStyle = "#050709";
  pctx.beginPath();
  pctx.moveTo(0, 860);
  pctx.lineTo(75, 820);
  pctx.lineTo(165, 840);
  pctx.lineTo(270, 770);
  pctx.lineTo(375, 825);
  pctx.lineTo(480, 790);
  pctx.lineTo(600, 830);
  pctx.lineTo(705, 800);
  pctx.lineTo(768, 830);
  pctx.lineTo(768, 1024);
  pctx.lineTo(0, 1024);
  pctx.closePath();
  pctx.fill();

  // "SIGUE CONSTRUYENDO" — font grande + tracking manual
  // Glow detrás para legibilidad sobre las montañas
  pctx.font = "600 40px 'Helvetica Neue', Arial, sans-serif";
  pctx.textAlign = "left";
  pctx.textBaseline = "alphabetic";
  pctx.shadowColor = "rgba(255,170,90,0.55)";
  pctx.shadowBlur = 18;
  pctx.fillStyle = "rgba(245,232,212,0.95)";
  drawTrackedText(pctx, "SIGUE CONSTRUYENDO", 384, 970, 7);
  pctx.shadowBlur = 0;

  const posterTex = new THREE.CanvasTexture(posterCanvas);
  posterTex.colorSpace = THREE.SRGBColorSpace;
  posterTex.anisotropy = 8;
  posterTex.needsUpdate = true;

  // ═══════════════════════════════════════════════════════════════════════
  // 2) CANVAS DEL MANIFIESTO — se muestra tras el click
  //    Mantiene el anillo apagado + texto del manifiesto.
  // ═══════════════════════════════════════════════════════════════════════
  const manifCanvas = document.createElement("canvas");
  manifCanvas.width = 768;
  manifCanvas.height = 1024;
  const mctx = manifCanvas.getContext("2d");

  // Fondo — mismo cielo pero más sobrio, sin halo
  const mSky = mctx.createLinearGradient(0, 0, 0, 1024);
  mSky.addColorStop(0, "#070a14");
  mSky.addColorStop(0.5, "#0e1422");
  mSky.addColorStop(1, "#0a0d14");
  mctx.fillStyle = mSky;
  mctx.fillRect(0, 0, 768, 1024);

  // Estrellas más tenues
  for (let i = 0; i < 140; i++) {
   const x = Math.random() * 768;
   const y = Math.random() * 1024;
   const s = Math.random() * 1.3 + 0.3;
   const a = Math.random() * 0.4 + 0.1;
   mctx.fillStyle = `rgba(255,255,255,${a})`;
   mctx.fillRect(x, y, s, s);
  }

  // Anillo tenue en la esquina (fantasma del eclipse)
  const mRingGrad = mctx.createRadialGradient(cx, 180, 60, cx, 180, 110);
  mRingGrad.addColorStop(0.5, "rgba(255,170,90,0)");
  mRingGrad.addColorStop(0.85, "rgba(255,160,80,0.35)");
  mRingGrad.addColorStop(1, "rgba(255,150,70,0)");
  mctx.fillStyle = mRingGrad;
  mctx.beginPath();
  mctx.arc(cx, 180, 110, 0, Math.PI * 2);
  mctx.fill();

  // "MANIFIESTO" — encabezado sutil
  mctx.font = "500 22px 'Helvetica Neue', Arial, sans-serif";
  mctx.textAlign = "left";
  mctx.fillStyle = "rgba(255,170,95,0.75)";
  drawTrackedText(mctx, "MANIFIESTO", 384, 360, 6);

  // Cuerpo del manifiesto
  mctx.font = "400 34px 'Helvetica Neue', Arial, sans-serif";
  mctx.textAlign = "center";
  mctx.fillStyle = "rgba(230,220,205,0.92)";
  const lines = [
   "Nada está terminado.",
   "Cada proyecto es un ensayo",
   "del siguiente. Cada error,",
   "la siguiente iteración.",
  ];
  lines.forEach((l, i) => {
   mctx.fillText(l, 384, 500 + i * 50);
  });

  // Firma
  mctx.font = "500 20px 'Helvetica Neue', Arial, sans-serif";
  mctx.textAlign = "left";
  mctx.fillStyle = "rgba(200,185,165,0.7)";
  drawTrackedText(mctx, "— DAVID LLONA", 384, 860, 5);

  const manifestoTex = new THREE.CanvasTexture(manifCanvas);
  manifestoTex.colorSpace = THREE.SRGBColorSpace;
  manifestoTex.anisotropy = 8;
  manifestoTex.needsUpdate = true;

  // ═══════════════════════════════════════════════════════════════════════
  // 3) HALO / BACKLIGHT — más sutil que la versión anterior
  // ═══════════════════════════════════════════════════════════════════════
  const haloCanvas = document.createElement("canvas");
  haloCanvas.width = haloCanvas.height = 256;
  const hctx = haloCanvas.getContext("2d");
  const hGrad = hctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  hGrad.addColorStop(0, "rgba(255,150,80,0.32)"); // antes 0.55
  hGrad.addColorStop(0.35, "rgba(255,130,70,0.15)"); // antes 0.28
  hGrad.addColorStop(1, "rgba(255,120,60,0)");
  hctx.fillStyle = hGrad;
  hctx.fillRect(0, 0, 256, 256);
  const haloTex = new THREE.CanvasTexture(haloCanvas);
  haloTex.needsUpdate = true;

  const haloMat = new THREE.MeshBasicMaterial({
   map: haloTex,
   transparent: true,
   opacity: 0.4, // ← reducido (antes 0.85)
   blending: THREE.AdditiveBlending,
   depthWrite: false,
   toneMapped: false,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.3), haloMat); // ← más pequeño
  halo.position.z = -0.05;
  group.add(halo);

  // ═══════════════════════════════════════════════════════════════════════
  // 3) MARCO con PROFUNDIDAD — BoxGeometry, no Plane.
  //    Las aristas laterales + superior atrapan la luz del posterSpot →
  //    se ve el marco como un objeto físico, no como un color plano.
  // ═══════════════════════════════════════════════════════════════════════
  const frameMat = new THREE.MeshStandardMaterial({
   color: "#18181f", // oscuro pero por encima del negro de la pared
   roughness: 0.32, // baja → specular crisp en la arista superior
   metalness: 0.65, // metálico → el spot crea highlight visible
   emissive: new THREE.Color("#1f1208"),
   emissiveIntensity: 0.3, // tinte cálido residual del halo backlight
  });
  // Box delgado: 1.14 × 1.44 × 0.04 → aristas de 4cm que "capturan" luz
  const frameGeo = new THREE.BoxGeometry(1.14, 1.44, 0.04);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.z = 0; // centrado en z local (extremos a ±0.02)
  group.add(frame);

  // ═══════════════════════════════════════════════════════════════════════
  // 4) MOUNT INTERIOR — plano fino entre marco y poster.
  //    Color un paso más claro que el marco → crea un borde visible de
  //    1cm alrededor del poster (como un passe-partout real).
  // ═══════════════════════════════════════════════════════════════════════
  const mountMat = new THREE.MeshStandardMaterial({
   color: "#262230", // lighter than frame — notable inner rim
   roughness: 0.8, // matte — para contraste vs. marco metálico
   metalness: 0,
  });
  const mount = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.38), mountMat);
  mount.position.z = 0.021; // justo sobre la cara frontal del box
  group.add(mount);

  // ═══════════════════════════════════════════════════════════════════════
  // 5) PÓSTER — encima del mount, con el emissive sutil original
  // ═══════════════════════════════════════════════════════════════════════
  const posterMat = new THREE.MeshStandardMaterial({
   map: posterTex,
   roughness: 0.85,
   metalness: 0,
   emissiveMap: posterTex,
   emissive: new THREE.Color("#ffffff"),
   emissiveIntensity: 0.2,
  });
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.34), posterMat);
  poster.position.z = 0.023; // sobre el mount
  poster.name = "wallPoster_clickable";
  group.add(poster);

  // ═══════════════════════════════════════════════════════════════════════
  // 4) ESTADO DE INTERACCIÓN + UPDATE METHOD
  //    Modos:
  //     - idle      → respiración sutil siempre activa (pista visual)
  //     - opening   → flash + swap textura a manifiesto (~0.6s)
  //     - open      → manifiesto visible, mantenido hasta que el usuario cierre
  //     - closing   → flash de salida + swap a poster (~0.6s)
  // ═══════════════════════════════════════════════════════════════════════
  const state = {
   hover: 0,
   hoverTarget: 0,
   mode: "idle", // idle | opening | open | closing
   modeStart: 0,
   textureShowing: "poster",
  };

  group.userData.state = state;
  group.userData.poster = poster;
  group.userData.posterMat = posterMat;
  group.userData.haloMat = haloMat;
  group.userData.posterTex = posterTex;
  group.userData.manifestoTex = manifestoTex;
  group.userData.textures = [posterTex, manifestoTex, haloTex];
  group.userData.materials = [haloMat, frameMat, mountMat, posterMat];

  // Duración de los flashes de entrada y salida (segundos).
  const FLASH_DURATION = 0.55;

  group.userData.update = (t, roomFade) => {
   // Hover suavizado
   state.hover += (state.hoverTarget - state.hover) * 0.12;

   // Respiración idle — pista continua de que el cuadro "vive"
   const breath = Math.sin(t * 2.1) * 0.5 + 0.5;
   const idleBoost = breath * 0.1;

   let haloOpacity = 0.35 + idleBoost;
   let emissive = 0.2;
   let spotBoost = 0;

   const e = t - state.modeStart;

   if (state.mode === "opening") {
    const k = Math.min(1, e / FLASH_DURATION);
    if (k < 0.36) {
     // Ramp up del anillo (0 → 0.2s aprox)
     const k2 = k / 0.36;
     emissive = 0.2 + 1.8 * k2;
     haloOpacity = 0.35 + 0.55 * k2;
     spotBoost = 1.2 * k2;
     if (k2 > 0.85 && state.textureShowing === "poster") {
      posterMat.map = manifestoTex;
      posterMat.emissiveMap = manifestoTex;
      posterMat.needsUpdate = true;
      state.textureShowing = "manifesto";
     }
    } else {
     // Bajada a estado "open" (lectura del manifiesto)
     const k2 = (k - 0.36) / 0.64;
     emissive = 2.0 - 1.55 * k2;
     haloOpacity = 0.9 - 0.5 * k2;
     spotBoost = 1.2 - 0.9 * k2;
    }
    if (k >= 1) state.mode = "open";
   } else if (state.mode === "open") {
    // Mantener manifiesto legible — sin timeout, espera al usuario
    emissive = 0.45;
    haloOpacity = 0.4;
    spotBoost = 0.3;
   } else if (state.mode === "closing") {
    const k = Math.min(1, e / FLASH_DURATION);
    if (k < 0.36) {
     // Flash de cierre
     const k2 = k / 0.36;
     emissive = 0.45 + 1.55 * k2;
     haloOpacity = 0.4 + 0.5 * k2;
     spotBoost = 0.3 + 0.9 * k2;
     if (k2 > 0.85 && state.textureShowing === "manifesto") {
      posterMat.map = posterTex;
      posterMat.emissiveMap = posterTex;
      posterMat.needsUpdate = true;
      state.textureShowing = "poster";
     }
    } else {
     const k2 = (k - 0.36) / 0.64;
     emissive = 2.0 - 1.8 * k2;
     haloOpacity = 0.9 - 0.55 * k2;
     spotBoost = 1.2 - 1.2 * k2;
    }
    if (k >= 1) state.mode = "idle";
   } else {
    // idle — añadir efecto hover
    haloOpacity += state.hover * 0.25;
    emissive += state.hover * 0.12;
    spotBoost += state.hover * 0.5;
   }

   haloMat.opacity = haloOpacity * roomFade;
   posterMat.emissiveIntensity = emissive;
   return 2.2 + spotBoost;
  };

  group.userData.triggerOpen = (t) => {
   if (state.mode !== "idle") return false;
   state.mode = "opening";
   state.modeStart = t;
   return true;
  };

  group.userData.triggerClose = (t) => {
   if (state.mode !== "open" && state.mode !== "opening") return false;
   state.mode = "closing";
   state.modeStart = t;
   return true;
  };

  group.userData.getMode = () => state.mode;

  group.userData.setHover = (on) => {
   state.hoverTarget = on ? 1 : 0;
  };

  return group;
 }

 // ═════════════════════════════════════════════════════════════════════════
 // RAYCAST — pointer, hover y click para poster + monitores
 // ═════════════════════════════════════════════════════════════════════════
 const clickRaycaster = new THREE.Raycaster();
 const clickPointer = new THREE.Vector2();
 let posterRoomFade = 1; // actualizado desde tick

 const _updateClickPointer = (event) => {
  const rect = canvas.getBoundingClientRect();
  clickPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  clickPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
 };

 const _hitsPoster = () => {
  if (posterRoomFade < 0.2) return false;
  clickRaycaster.setFromCamera(clickPointer, camera);
  return clickRaycaster.intersectObject(wallPoster.userData.poster, false).length > 0;
 };

 const onScenePointerMove = (event) => {
  if (cameraFocus.active) return;
  _updateClickPointer(event);
  const hit = _hitsPoster();
  wallPoster.userData.setHover(hit);
  canvas.style.cursor = hit ? "pointer" : "";
 };

 const onScenePointerDown = (event) => {
  const now = clock.getElapsedTime();

  // Si hay focus activo → cualquier click cierra (exitCameraFocus
  // ya gestiona la sincronización de estado del poster internamente)
  if (cameraFocus.active && cameraFocus.phase !== "exiting") {
   exitCameraFocus(now);
   canvas.style.cursor = "";
   return;
  }

  _updateClickPointer(event);

  // Priority 1 — poster
  if (_hitsPoster()) {
   if (wallPoster.userData.triggerOpen(now)) {
    enterCameraFocus("poster", now);
    window.dispatchEvent(new CustomEvent("hero-poster:click", { detail: { time: now } }));
   }
   return;
  }

  // Priority 1 — poster
  if (_hitsPoster()) {
   if (wallPoster.userData.triggerOpen(now)) {
    enterCameraFocus("poster", now);
    window.dispatchEvent(new CustomEvent("hero-poster:click", { detail: { time: now } }));
   }
  }
 };

 const onSceneKeyDown = (event) => {
  if (event.key !== "Escape") return;
  if (!cameraFocus.active) return;
  exitCameraFocus(clock.getElapsedTime());
 };

 canvas.addEventListener("pointermove", onScenePointerMove);
 canvas.addEventListener("pointerdown", onScenePointerDown);
 window.addEventListener("keydown", onSceneKeyDown);

 const wallPoster = createWallPoster();
 wallPoster.position.set(4.0, 4.6, -3.94);
 scene.add(wallPoster);

 // ── SpotLight cálido dedicado — resalta solo el póster ──────────────
 // Distance corta + decay medio → no moja la pared entera.
 // Penumbra alta → borde de luz orgánico, no un haz duro.
 const posterSpot = new THREE.SpotLight(
  "#ff9a55", // familia cálida del warmLight del cohete
  2.2, // intensity baja
  3.0, // distance corto → luz contenida
  Math.PI * 0.24, // angle ~43° (abierto pero no flood)
  0.75, // penumbra alta → borde suave
  1.5, // decay
 );
 posterSpot.position.set(2.8, 5.8, -2.8);
 posterSpot.target.position.set(4.0, 4.6, -3.94);
 scene.add(posterSpot);
 scene.add(posterSpot.target);

 // ═════════════════════════════════════════════════════════════════════════
 // CAMERA FOCUS — close-up cinemático
 // Sistema unificado: el mismo pipeline de blend se reutiliza para cualquier
 // target (poster, monitores…). Solo cambia el pose objetivo.
 // ═════════════════════════════════════════════════════════════════════════
 const cameraFocus = {
  active: false,
  phase: "idle", // idle | entering | held | exiting
  phaseStart: 0,
  enterDuration: 1.1,
  exitDuration: 1.0,
  scrollYAtEnter: 0,
  scrollExitThreshold: 60,
  targetKey: null, // "poster" | "monitors"
 };

 // Pose resultante (se recalcula cada frame en tick)
 const focusPos = new THREE.Vector3();
 const focusQuat = new THREE.Quaternion();
 const _focusMat = new THREE.Matrix4();
 const _focusUp = new THREE.Vector3(0, 1, 0);
 const _focusLookAt = new THREE.Vector3();

 const computeFocusTarget = () => {
  // Solo poster — monitores se descartaron por no dar un close-up limpio
  focusPos.set(wallPoster.position.x, wallPoster.position.y, wallPoster.position.z + 2.3);
  _focusLookAt.copy(wallPoster.position);
  _focusMat.lookAt(focusPos, _focusLookAt, _focusUp);
  focusQuat.setFromRotationMatrix(_focusMat);
 };

 const enterCameraFocus = (targetKey, now) => {
  if (cameraFocus.active) return false;
  cameraFocus.active = true;
  cameraFocus.phase = "entering";
  cameraFocus.phaseStart = now;
  cameraFocus.scrollYAtEnter = window.scrollY;
  cameraFocus.targetKey = targetKey;
  if (controls.enabled) controls.enabled = false;
  document.body.style.overflow = "hidden";
  return true;
 };

 const exitCameraFocus = (now) => {
  if (!cameraFocus.active) return;
  if (cameraFocus.phase === "exiting") return;

  if (cameraFocus.targetKey === "poster") {
   wallPoster.userData.triggerClose(now);
  }

  cameraFocus.phase = "exiting";
  cameraFocus.phaseStart = now;
  document.body.style.overflow = "";
 };

 /**
  * =========================================================
  * DOG HOLOGRAM — easter egg holográfico
  * =========================================================
  * Perro construido con primitivas wireframe + pedestal + scan.
  * Colores cian dentro de la paleta fría. Muy sutil.
  */
 function createDogHologram() {
  const g = new THREE.Group();

  // ── Paleta cian — dos tonos para jerarquía visual ───────────────────────
  const cyan = new THREE.Color("#5ad7ff"); // cuerpo / anillo (proyectado)
  const cyanBright = new THREE.Color("#9eeaff"); // emisor / wire / scan (luz)

  // ── Materiales del perro ────────────────────────────────────────────────

  // Cuerpo: sólido translúcido. NO aditivo — evita sobre-exposición en zonas
  // donde cuerpo+patas+cabeza se solapan. DoubleSide por ser translúcido.
  const bodyMat = new THREE.MeshBasicMaterial({
   color: cyan,
   transparent: true,
   opacity: 0.5,
   side: THREE.DoubleSide,
   depthWrite: false,
   toneMapped: false, // preserva el cian puro frente al ACES del renderer
  });

  // Wireframe — aristas realzadas. Aditivo para que sumen luz sin dominar.
  const wireMat = new THREE.LineBasicMaterial({
   color: cyanBright,
   transparent: true,
   opacity: 0.42,
   blending: THREE.AdditiveBlending,
   depthWrite: false,
   toneMapped: false,
  });

  // ── Construcción del perro — subgrupo para levitarlo sobre el proyector ─
  const dogBody = new THREE.Group();
  dogBody.position.y = 0.05; // flota ligeramente → lee como proyección
  g.add(dogBody);

  // Helper: cada parte se añade como sólido + aristas a partir de una misma geo.
  const addPart = (geo, pos, rot) => {
   const solid = new THREE.Mesh(geo, bodyMat);
   solid.position.set(pos[0], pos[1], pos[2]);
   if (rot) solid.rotation.set(rot[0], rot[1], rot[2]);
   dogBody.add(solid);

   const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), wireMat);
   wire.position.copy(solid.position);
   if (rot) wire.rotation.copy(solid.rotation);
   dogBody.add(wire);
  };

  // Cuerpo, cabeza, hocico
  addPart(new THREE.BoxGeometry(0.55, 0.3, 0.22), [0, 0.35, 0]);
  addPart(new THREE.BoxGeometry(0.22, 0.24, 0.22), [0.3, 0.47, 0]);
  addPart(new THREE.BoxGeometry(0.14, 0.1, 0.13), [0.43, 0.4, 0]);

  // Orejas
  const earGeo = new THREE.ConeGeometry(0.05, 0.13, 4);
  addPart(earGeo, [0.3, 0.63, 0.08]);
  addPart(earGeo, [0.3, 0.63, -0.08]);

  // 4 patas — 8 segmentos para bordes más limpios que 6
  const legGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8);
  addPart(legGeo, [0.2, 0.15, 0.09]);
  addPart(legGeo, [0.2, 0.15, -0.09]);
  addPart(legGeo, [-0.2, 0.15, 0.09]);
  addPart(legGeo, [-0.2, 0.15, -0.09]);

  // Cola
  addPart(new THREE.CylinderGeometry(0.03, 0.01, 0.22, 6), [-0.3, 0.46, 0], [0, 0, Math.PI * 0.35]);

  // ── Proyector — cuerpo físico del dispositivo ───────────────────────────
  // Cilindro plano, oscuro con tinte azul. Opaco para sentirse físico,
  // pero con un punto de transparencia para no competir visualmente.
  const projectorBodyMat = new THREE.MeshBasicMaterial({
   color: "#0b1828",
   transparent: true,
   opacity: 0.92,
   toneMapped: false,
  });
  const projectorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.025, 48), projectorBodyMat);
  projectorBody.position.y = 0.013;
  g.add(projectorBody);

  // Anillo exterior — borde luminoso del dispositivo.
  const ringMat = new THREE.MeshBasicMaterial({
   color: "#c8a870",
   transparent: true,
   opacity: 0.55, // más sutil — no debe dominar visualmente al sol
   side: THREE.DoubleSide,
   depthWrite: false,
   toneMapped: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.295, 0.325, 64), ringMat);
  ring.rotation.x = -Math.PI * 0.5;
  ring.position.y = 0.028;
  g.add(ring);

  // ── Scan line — anillo fino que recorre el holograma en vertical ────────
  const scanMat = new THREE.MeshBasicMaterial({
   color: cyanBright,
   transparent: true,
   opacity: 0.45,
   blending: THREE.AdditiveBlending,
   side: THREE.DoubleSide,
   depthWrite: false,
   toneMapped: false,
  });
  const scan = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.18, 48), scanMat);
  scan.rotation.x = -Math.PI * 0.5;
  scan.position.y = 0.15;
  g.add(scan);

  // ── Luz de rebote cian — tiñe muy sutilmente el entorno cercano ────────
  const holoLight = new THREE.PointLight(cyan, 0.7, 1.3, 2.2);
  holoLight.position.set(0, 0.4, 0);
  g.add(holoLight);

  // ── Update method — respiración + scan. Muy sutil a propósito ──────────
  // Se llama desde tick() con elapsedTime. Si no se llama, el holograma
  // se ve perfectamente estático también (sin estados rotos).
  const SCAN_MIN = 0.05;
  const SCAN_MAX = 0.72;
  g.userData.update = (t) => {
   // Respiración de opacidad — ±0.07 alrededor de 0.5. Apenas perceptible.
   const breath = Math.sin(t * 1.25) * 0.07;
   bodyMat.opacity = 0.5 + breath;
   wireMat.opacity = 0.42 + breath * 0.6;

   // Scan: barrido vertical lento. Fade en extremos.
   const t01 = Math.sin(t * 0.55) * 0.5 + 0.5;
   scan.position.y = SCAN_MIN + t01 * (SCAN_MAX - SCAN_MIN);
   const edgeFade = Math.sin(t01 * Math.PI);
   scanMat.opacity = 0.25 + edgeFade * 0.3;

   // Micro flicker orgánico
   holoLight.intensity = 0.7 + Math.sin(t * 2.1) * 0.04;
   dogBody.rotation.y = t * 0.25;
  };

  // Referencias expuestas (dispose ya cubierto por el traverse existente)
  g.userData.holoLight = holoLight;

  return g;
 }

 const dogHologram = createDogHologram();
 dogHologram.scale.setScalar(0.59); // más pequeño — sobre la mesa debe sentirse como dispositivo, no escultura
 // Lo anclamos al deskAnchor si existe, o lo ponemos en cola. Así siempre
 // viaja con la mesa (misma lógica que cohete/teclado/ratón).
 const placeDogHologram = () => {
  if (!deskTopSupport) {
   // Mesa aún no lista — reintento en el siguiente frame disponible
   requestAnimationFrame(placeDogHologram);
   return;
  }
  dogHologram.position.set(3.2, deskTopSupport.position.y + 0.01, 0.2);
 };
 attachToDesk(dogHologram);
 placeDogHologram();

 // ═══════════════════════════════════════════════════════════════════════
 // ORRERY — mueble con maqueta del sistema solar bajo cúpula de cristal
 // ═══════════════════════════════════════════════════════════════════════
 //
 // Pieza de "vitrina de museo" en la esquina derecha. Un mueble bajo
 // sostiene una cúpula semi-transparente con un sistema solar en
 // miniatura: sol central emisivo + 2 anillos orbitales + 2 planetas
 // que orbitan lentamente. La luz cálida interna se escapa por el
 // cristal y tiñe la pared sin competir con el resto de la escena.
 //
 // Movimiento: rotación orbital muy lenta. Presencia, no animación.
 //
 function createOrrery() {
  const g = new THREE.Group();

  // ── Mueble (pedestal) — más grande para acomodar sistema solar completo ─
  const PEDESTAL_W = 0.9;
  const PEDESTAL_H = 0.48; // antes 1.25 — display bajo, como mesa de museo
  const PEDESTAL_D = 0.55;

  const pedestalMat = new THREE.MeshStandardMaterial({
   color: "#1a1c26",
   roughness: 0.72,
   metalness: 0.35,
  });

  // ── Mueble-base: caja achatada con cantos ámbar ────────────────────────
  //
  // Arquitectura en 3 capas para que tenga profundidad real:
  //   1) Cuerpo oscuro (caja principal) — opaco, mate, da volumen
  //   2) Cantos perimetrales emisivos — línea ámbar por las 4 aristas de
  //      arriba. Es el "LED strip" del mueble. La luz nace del objeto.
  //   3) Tapa fina metálica — donde se apoya el pedestal de la cúpula.
  //
  // Altura total ~ 0.15u. Ocupa la misma huella que el pedestal anterior
  // pero sin altura: prioridad a la luz y a la lectura como objeto sólido.
  //
  const BASE_W = PEDESTAL_W * 1.35;
  const BASE_D = PEDESTAL_D * 1.35;
  const BASE_H = 0.14;

  // Cuerpo principal — oscuro y mate. Lo que da "volumen sólido".
  const baseBodyMat = new THREE.MeshStandardMaterial({
   color: "#15171f",
   roughness: 0.82,
   metalness: 0.28,
  });
  const baseBody = new THREE.Mesh(new THREE.BoxGeometry(BASE_W, BASE_H, BASE_D), baseBodyMat);
  baseBody.position.y = BASE_H * 0.5;
  g.add(baseBody);

  // Tapa metálica superior — plano fino donde se apoya el pedestal.
  // Ligeramente más pequeña que el cuerpo → crea un rebaje visible donde
  // se aloja la línea LED. Roughness bajo = refleja un poco el ámbar.
  const baseTopMat = new THREE.MeshStandardMaterial({
   color: "#2a2d38",
   roughness: 0.45,
   metalness: 0.7,
  });
  const baseTop = new THREE.Mesh(new THREE.BoxGeometry(BASE_W * 0.92, 0.008, BASE_D * 0.92), baseTopMat);
  baseTop.position.y = BASE_H + 0.005;
  g.add(baseTop);

  // Cantos luminosos perimetrales — 4 barras finas ámbar encajadas en el
  // rebaje entre cuerpo y tapa. AQUÍ nace la luz del mueble.
  // opacity 0.78 (antes 0.95): a 0.95 + toneMapped:false los cantos saltan
  // como líneas demasiado brillantes al rotar cámara. 0.78 mantiene
  // presencia pero deja que el tone mapping del entorno los integre.
  const edgeLedMat = new THREE.MeshBasicMaterial({
   color: "#ff9a4a",
   transparent: true,
   opacity: 0.78,
   toneMapped: false,
  });
  const LED_T = 0.012; // grosor del canto luminoso
  const LED_H = 0.018; // altura del canto

  const makeEdgeBar = (w, d, x, z) => {
   const bar = new THREE.Mesh(new THREE.BoxGeometry(w, LED_H, d), edgeLedMat);
   // Colocada justo en la junta entre cuerpo y tapa → parece que la luz
   // sale por la ranura perimetral del mueble.
   bar.position.set(x, BASE_H - LED_H * 0.35, z);
   g.add(bar);
  };

  // Frontal / trasera / laterales
  makeEdgeBar(BASE_W, LED_T, 0, BASE_D * 0.5 - LED_T * 0.5);
  makeEdgeBar(BASE_W, LED_T, 0, -BASE_D * 0.5 + LED_T * 0.5);
  makeEdgeBar(LED_T, BASE_D, BASE_W * 0.5 - LED_T * 0.5, 0);
  makeEdgeBar(LED_T, BASE_D, -BASE_W * 0.5 + LED_T * 0.5, 0);

  // Luz cálida emitida desde los cantos — baña el pedestal desde abajo
  // y tiñe el suelo alrededor del mueble. Contenida a 2u.
  const edgeLight = new THREE.PointLight("#ff9a4a", 1.0, 2.0, 2.4);
  edgeLight.position.set(0, BASE_H + 0.05, 0);
  g.add(edgeLight);

  // Rebote tenue en el suelo justo alrededor del mueble — círculo sprite
  // ámbar aditivo. Da la sensación de que la luz "escurre" por el suelo.
  const floorGlowCv = document.createElement("canvas");
  floorGlowCv.width = floorGlowCv.height = 128;
  {
   const ctx = floorGlowCv.getContext("2d");
   const gr = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
   gr.addColorStop(0.0, "rgba(255, 154, 74, 0.55)");
   gr.addColorStop(0.4, "rgba(255, 140, 60, 0.18)");
   gr.addColorStop(1.0, "rgba(255, 140, 60, 0)");
   ctx.fillStyle = gr;
   ctx.fillRect(0, 0, 128, 128);
  }
  const floorGlowTex = new THREE.CanvasTexture(floorGlowCv);
  floorGlowTex.colorSpace = THREE.SRGBColorSpace;
  const floorGlow = new THREE.Mesh(
   new THREE.PlaneGeometry(BASE_W * 2.3, BASE_D * 2.3),
   new THREE.MeshBasicMaterial({
    map: floorGlowTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
   }),
  );
  floorGlow.rotation.x = -Math.PI * 0.5;
  floorGlow.position.y = 0.002; // casi pegado al suelo
  g.add(floorGlow);

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(PEDESTAL_W, PEDESTAL_H, PEDESTAL_D), pedestalMat);
  pedestal.position.y = BASE_H + PEDESTAL_H * 0.5;
  g.add(pedestal);

  // Tapa superior: disco metálico
  const capMat = new THREE.MeshStandardMaterial({
   color: "#242736",
   roughness: 0.55,
   metalness: 0.55,
  });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(PEDESTAL_W * 0.48, PEDESTAL_W * 0.48, 0.025, 32), capMat);
  cap.position.y = BASE_H + PEDESTAL_H + 0.012;
  g.add(cap);

  // Banda luminosa inferior de la cúpula
  const stripMat = new THREE.MeshBasicMaterial({
   color: "#d78a4a",
   transparent: true,
   opacity: 0.7,
   toneMapped: false,
  });
  const strip = new THREE.Mesh(new THREE.TorusGeometry(PEDESTAL_W * 0.46, 0.004, 8, 64), stripMat);
  strip.rotation.x = Math.PI * 0.5;
  strip.position.y = BASE_H + PEDESTAL_H + 0.024;
  g.add(strip);

  // ── Cúpula de cristal — grande y MUY transparente para ver el contenido ─
  const DOME_RADIUS = 0.5;
  const domeGeo = new THREE.SphereGeometry(DOME_RADIUS, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const domeMat = new THREE.MeshStandardMaterial({
   color: "#8ab0e0",
   roughness: 0.08,
   metalness: 0.3,
   transparent: true,
   opacity: 0.14, // muy transparente → el sistema solar manda
   depthWrite: false,
   side: THREE.DoubleSide,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = BASE_H + PEDESTAL_H + 0.025;
  g.add(dome);

  // Aro metálico que cierra la cúpula contra el pedestal
  const domeRingMat = new THREE.MeshStandardMaterial({
   color: "#3a404f",
   roughness: 0.4,
   metalness: 0.75,
  });
  const domeRing = new THREE.Mesh(new THREE.TorusGeometry(DOME_RADIUS * 0.98, 0.014, 8, 64), domeRingMat);
  domeRing.rotation.x = Math.PI * 0.5;
  domeRing.position.y = BASE_H + PEDESTAL_H + 0.028;
  g.add(domeRing);

  // ── Contenido del orrery (vive en un grupo para moverlo en conjunto) ────
  const orreryInner = new THREE.Group();
  orreryInner.position.y = BASE_H + PEDESTAL_H + 0.06;
  g.add(orreryInner);

  // ── SOL central — esfera emisiva cálida, más presencia ─────────────────
  const sunMat = new THREE.MeshBasicMaterial({
   color: "#ffc877",
   toneMapped: false,
  });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 18), sunMat);
  sun.position.y = 0.2;
  orreryInner.add(sun);

  // Halo del sol — sprite radial
  const haloCv = document.createElement("canvas");
  haloCv.width = haloCv.height = 128;
  {
   const ctx = haloCv.getContext("2d");
   const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
   grad.addColorStop(0.0, "rgba(255, 210, 130, 0.95)");
   grad.addColorStop(0.25, "rgba(250, 170, 90, 0.55)");
   grad.addColorStop(0.6, "rgba(230, 140, 70, 0.15)");
   grad.addColorStop(1.0, "rgba(230, 140, 70, 0)");
   ctx.fillStyle = grad;
   ctx.fillRect(0, 0, 128, 128);
  }
  const haloTex = new THREE.CanvasTexture(haloCv);
  haloTex.colorSpace = THREE.SRGBColorSpace;
  const haloMat = new THREE.SpriteMaterial({
   map: haloTex,
   transparent: true,
   depthWrite: false,
   blending: THREE.AdditiveBlending,
   toneMapped: false,
  });
  const sunHalo = new THREE.Sprite(haloMat);
  sunHalo.scale.set(0.48, 0.48, 0.48);
  sunHalo.position.y = 0.2;
  orreryInner.add(sunHalo);

  // ── Órbitas (anillos guía) — finos, ámbar muy apagado ──────────────────
  const orbitMat = new THREE.MeshBasicMaterial({
   color: "#a07850",
   transparent: true,
   opacity: 0.55,
   side: THREE.DoubleSide,
   depthWrite: false,
   toneMapped: false,
  });
  const makeOrbit = (radius) => {
   // TorusGeometry (no RingGeometry) — tiene volumen 3D, se ve desde
   // cualquier ángulo. Un Ring plano de 0.0012 de grosor era invisible
   // a la distancia de la cámara.
   const orbit = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.0045, 4, 72), orbitMat);
   orbit.rotation.x = -Math.PI * 0.5;
   orbit.position.y = 0.2;
   orreryInner.add(orbit);
  };

  // ── 8 PLANETAS — tamaños/distancias/velocidades relativas ──────────────
  // Distancias escaladas logarítmicamente (si fuera real, Neptuno estaría
  // fuera de la cúpula). Velocidades ∝ 1/sqrt(radius) como Kepler manda.
  // Colores aproximados a los reales — identidad del sistema solar.
  const planetSpecs = [
   { name: "mercury", color: "#b8a38a", size: 0.035, radius: 0.09, speed: 0.62, phase: 0.0 },
   { name: "venus", color: "#f0cc8a", size: 0.048, radius: 0.13, speed: 0.46, phase: 1.2 },
   { name: "earth", color: "#5a9cd8", size: 0.05, radius: 0.17, speed: 0.36, phase: 2.4 },
   { name: "mars", color: "#d86a4a", size: 0.042, radius: 0.21, speed: 0.28, phase: 3.6 },
   { name: "jupiter", color: "#e9b878", size: 0.082, radius: 0.26, speed: 0.17, phase: 0.5 },
   { name: "saturn", color: "#f0d89c", size: 0.072, radius: 0.31, speed: 0.13, phase: 1.8, ring: true },
   { name: "uranus", color: "#9fd4dc", size: 0.055, radius: 0.37, speed: 0.09, phase: 3.0 },
   { name: "neptune", color: "#4a7acc", size: 0.055, radius: 0.42, speed: 0.07, phase: 4.3 },
  ];

  const orreryControls = {
   planetSize: 0.32,
   orbitSpeed: 1.15,
   sunSize: 1.04,
  };

  // Textura de glow compartida — un solo canvas, 8 sprites la usan.
  const planetGlowCv = document.createElement("canvas");
  planetGlowCv.width = planetGlowCv.height = 64;
  {
   const ctx = planetGlowCv.getContext("2d");
   const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
   gr.addColorStop(0.0, "rgba(255,255,255,0.95)");
   gr.addColorStop(0.35, "rgba(255,255,255,0.35)");
   gr.addColorStop(1.0, "rgba(255,255,255,0)");
   ctx.fillStyle = gr;
   ctx.fillRect(0, 0, 64, 64);
  }
  const planetGlowTex = new THREE.CanvasTexture(planetGlowCv);
  planetGlowTex.colorSpace = THREE.SRGBColorSpace;

  const planets = planetSpecs.map((spec) => {
   makeOrbit(spec.radius);

   const mat = new THREE.MeshBasicMaterial({
    color: spec.color,
    toneMapped: false,
   });
   const mesh = new THREE.Mesh(new THREE.SphereGeometry(spec.size, 14, 10), mat);
   mesh.position.y = 0.2;
   mesh.renderOrder = 10; // se pinta DESPUÉS de la cúpula transparente
   orreryInner.add(mesh);

   // Glow aditivo del color del planeta — los hace visibles sobre fondo oscuro
   const glowMat = new THREE.SpriteMaterial({
    map: planetGlowTex,
    color: new THREE.Color(spec.color),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    opacity: 0.7,
   });
   const glow = new THREE.Sprite(glowMat);
   glow.scale.setScalar(spec.size * 3.2);
   glow.renderOrder = 11;
   mesh.add(glow);

   // Anillo de Saturno — igual que antes
   if (spec.ring) {
    const ringMat = new THREE.MeshBasicMaterial({
     color: "#c8a870",
     transparent: true,
     opacity: 0.65,
     side: THREE.DoubleSide,
     depthWrite: false,
     toneMapped: false,
    });
    const saturnRing = new THREE.Mesh(new THREE.RingGeometry(spec.size * 1.4, spec.size * 2.1, 48), ringMat);
    saturnRing.rotation.x = -Math.PI * 0.5 + 0.28;
    saturnRing.renderOrder = 10;
    mesh.add(saturnRing);
   }

   return { mesh, ...spec };
  });

  // ── Luz interna — más fuerte, el contenido debe leerse ─────────────────
  const orreryLight = new THREE.PointLight("#ffb060", 2.37, 3.2, 2.0);
  orreryLight.position.set(0, BASE_H + PEDESTAL_H + 0.26, 0);
  g.add(orreryLight);

  // ── Update — órbitas + respiración del sol ─────────────────────────────
  g.userData.update = (t) => {
   const { planetSize, orbitSpeed, sunSize } = orreryControls;
   planets.forEach((p) => {
    const a = t * p.speed * orbitSpeed + p.phase;
    p.mesh.position.x = Math.cos(a) * p.radius;
    p.mesh.position.z = Math.sin(a) * p.radius;
    p.mesh.rotation.y = t * p.speed * orbitSpeed * 3;
    p.mesh.scale.setScalar(planetSize);
   });
   // Sol y halo acompañan el multiplicador propio
   sun.scale.setScalar(sunSize);
   sunHalo.scale.setScalar(0.48 * sunSize);
   // Respiración del halo
   haloMat.opacity = 0.85 + Math.sin(t * 0.9) * 0.1;
   // Flicker de la luz interna
   orreryLight.intensity = 2.37 + Math.sin(t * 1.3) * 0.06;
  };

  g.userData.orreryLight = orreryLight;
  g.userData.controls = orreryControls;
  return g;
 }

 const orrery = createOrrery();
 orrery.scale.setScalar(2.05);
 orrery.position.set(4.5, 0, -3.45);
 orrery.rotation.y = -0.35;
 scene.add(orrery);

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

 // ═══════════════════════════════════════════════════════════════════
 // NEÓN DE PARED — carga neon_22.glb con materiales emissive y titileo.
 // Pivote físicamente recentrado para que rote/escale en sitio.
 // ═══════════════════════════════════════════════════════════════════

 // ═══════════════════════════════════════════════════════════════════
 // NEÓN DE PARED — carga neon_22.glb con materiales emissive y titileo.
 // Glow atmosférico por LETRA (sprite radial anclado a cada mesh).
 // ═══════════════════════════════════════════════════════════════════

 // ── Textura del halo (compartida por todos los sprites) ────────────────
 const neonHaloCanvas = document.createElement("canvas");
 neonHaloCanvas.width = neonHaloCanvas.height = 256;
 (() => {
  const c = neonHaloCanvas.getContext("2d");
  const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  // Curva suave: núcleo caliente → fade largo. Evita borde duro del halo.
  g.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
  g.addColorStop(0.15, "rgba(200, 160, 255, 0.75)");
  g.addColorStop(0.4, "rgba(140, 90, 255, 0.25)");
  g.addColorStop(0.75, "rgba(90, 60, 200, 0.06)");
  g.addColorStop(1.0, "rgba(80, 50, 180, 0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
 })();
 const neonHaloTex = new THREE.CanvasTexture(neonHaloCanvas);
 neonHaloTex.colorSpace = THREE.SRGBColorSpace;

 // Los sprites individuales se crean en el callback del loader, cuando
 // conocemos el tamaño real de cada mesh del letrero.
 const neonLetterHalos = []; // {sprite, mesh, baseOpacity, color}

 const neonLoader = new GLTFLoader();
 let neonModel = null;
 const neonGlbMats = [];

 neonLoader.load(
  "/modelos/neon_22.glb",
  (gltf) => {
   neonModel = gltf.scene;

   // ── Recentrar geometría físicamente (pivot en el centro del letrero)
   const box = new THREE.Box3().setFromObject(neonModel);
   const center = box.getCenter(new THREE.Vector3());

   neonModel.traverse((child) => {
    if (!child.isMesh) return;

    child.geometry.translate(-center.x, -center.y, -center.z);

    const mat = child.material;

    // Si el GLB trae el color en baseColor y emissive está en negro, copiamos
    const emissiveIsBlack = mat.emissive.r < 0.01 && mat.emissive.g < 0.01 && mat.emissive.b < 0.01;
    if (emissiveIsBlack) mat.emissive.copy(mat.color);

    // Emissive potente pero no quemado. 3.5 es el sweet spot con tonemapping ACES
    // desactivado (toneMapped=false): el color se ve saturado pero el ojo no
    // lo lee como blanco puro.
    mat.emissiveIntensity = 3.5;
    mat.toneMapped = false;
    mat.roughness = 0.4;
    mat.metalness = 0.0;
    mat.transparent = false;
    mat.opacity = 1.0;
    mat.needsUpdate = true;

    child.userData.baseIntensity = 3.5;

    // Amarillo (I, a) por emissive → titileo de fósforo defectuoso
    const e = mat.emissive;
    child.userData.isFlicker = e.r > 0.5 && e.g > 0.4 && e.b < 0.25;

    neonGlbMats.push(child);

    // ── Halo individual anclado a ESTA letra ─────────────────────────────
    // Cada letra tiene su propio sprite radial del color de su emissive.
    // Se escala según el bounding de la letra → letras pequeñas glow
    // pequeño, letras grandes glow grande. Esto es lo que el ojo lee como
    // "cada letra emite por sí misma".
    const letterBox = new THREE.Box3().setFromObject(child);
    const letterSize = letterBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(letterSize.x, letterSize.y);

    const haloMat = new THREE.SpriteMaterial({
     map: neonHaloTex,
     color: mat.emissive.clone(), // mismo color que la letra
     transparent: true,
     opacity: 0,
     blending: THREE.AdditiveBlending,
     depthWrite: false,
     toneMapped: false,
    });
    const haloSprite = new THREE.Sprite(haloMat);
    haloSprite.scale.set(maxDim * 2.5, maxDim * 2.5, 1);
    // Centrado en la letra, ligeramente detrás en Z (hacia la pared)
    const letterCenter = letterBox.getCenter(new THREE.Vector3());
    // Convertimos a coordenadas locales del neonModel para que siga las transforms
    neonModel.worldToLocal(letterCenter);
    haloSprite.position.copy(letterCenter);
    haloSprite.position.z -= 0.02;
    haloSprite.renderOrder = -1;

    neonModel.add(haloSprite);
    neonLetterHalos.push({
     sprite: haloSprite,
     mesh: child,
     color: mat.emissive.clone(),
     isFlicker: child.userData.isFlicker,
    });
   });

   // Transform desde neonParams
   neonModel.rotation.set(neonParams.glbRotX, neonParams.glbRotY, neonParams.glbRotZ);
   neonModel.scale.setScalar(neonParams.glbScale);
   neonModel.position.set(neonParams.glbOffsetX, neonParams.glbOffsetY, neonParams.glbOffsetZ);

   window.__neon = neonModel;
   neonGroup.add(neonModel);
   requestRender();
  },
  undefined,
  (err) => console.error("[neon_22.glb] error:", err),
 );

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
   attachToDesk(lamparaAnchor);
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

   attachToDesk(tecladoAnchor);
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

   attachToDesk(ratonAnchor);
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
  // ─────────────────────────────────────────────────────────────────────
  // 💜 NEÓN (letrero de pared)
  // ─────────────────────────────────────────────────────────────────────
  const neonFolder = gui.addFolder("💜 Neón");

  // Posición del conjunto (luces + modelo) — rangos muy amplios
  neonFolder.add(neonParams, "x", -20, 20, 0.01).name("x grupo").onChange(requestRender);
  neonFolder.add(neonParams, "y", -10, 25, 0.01).name("y grupo").onChange(requestRender);
  neonFolder.add(neonParams, "z", -20, 10, 0.01).name("z grupo").onChange(requestRender);
  neonFolder.add(neonParams, "scale", 0.01, 10, 0.01).name("scale grupo").onChange(requestRender);
  neonFolder.add(neonParams, "intensity", 0, 10, 0.01).name("intensidad").onChange(requestRender);
  neonFolder.add(neonParams, "glowStrength", 0, 10, 0.01).name("glow").onChange(requestRender);

  // Halo atmosférico
  neonFolder.add(neonParams, "haloOpacity", 0, 3, 0.01).name("halo opacidad").onChange(requestRender);
  neonFolder
   .add(neonParams, "haloScale", 0.1, 10, 0.05)
   .name("halo tamaño")
   .onChange(() => {
    // Cada halo se re-escala según el bounding de SU letra
    neonLetterHalos.forEach((h) => {
     const letterBox = new THREE.Box3().setFromObject(h.mesh);
     const letterSize = letterBox.getSize(new THREE.Vector3());
     const maxDim = Math.max(letterSize.x, letterSize.y);
     const s = maxDim * neonParams.haloScale * 1.5;
     h.sprite.scale.set(s, s, 1);
    });
    requestRender();
   });

  // ── Ajustes específicos del GLB (rotación/escala internas) ──────────
  const applyNeonGlbTransform = () => {
   if (neonModel) {
    neonModel.rotation.set(neonParams.glbRotX, neonParams.glbRotY, neonParams.glbRotZ);
    neonModel.scale.setScalar(neonParams.glbScale);
    neonModel.position.set(neonParams.glbOffsetX, neonParams.glbOffsetY, neonParams.glbOffsetZ);
    requestRender();
   }
  };

  neonFolder.add(neonParams, "glbScale", 0.001, 10, 0.001).name("escala GLB").onChange(applyNeonGlbTransform);
  neonFolder
   .add(neonParams, "glbRotX", -Math.PI * 2, Math.PI * 2, 0.01)
   .name("rot X")
   .onChange(applyNeonGlbTransform);
  neonFolder
   .add(neonParams, "glbRotY", -Math.PI * 2, Math.PI * 2, 0.01)
   .name("rot Y")
   .onChange(applyNeonGlbTransform);
  neonFolder
   .add(neonParams, "glbRotZ", -Math.PI * 2, Math.PI * 2, 0.01)
   .name("rot Z")
   .onChange(applyNeonGlbTransform);
  neonFolder.add(neonParams, "glbOffsetX", -15, 15, 0.01).name("offset X").onChange(applyNeonGlbTransform);
  neonFolder.add(neonParams, "glbOffsetY", -15, 15, 0.01).name("offset Y").onChange(applyNeonGlbTransform);
  neonFolder.add(neonParams, "glbOffsetZ", -15, 15, 0.01).name("offset Z").onChange(applyNeonGlbTransform);

  neonFolder.close();
  // ─────────────────────────────────────────────────────────────────────
  // 📺 PANTALLAS (monitores)
  // ─────────────────────────────────────────────────────────────────────
  const screensFolder = gui.addFolder("📺 Pantallas");
  screensFolder.add(monitorParams, "scale", 0.5, 4, 0.01).onChange(updateMonitors);
  screensFolder.add(monitorParams, "brightness", 0, 2, 0.01).onChange(updateMonitors);
  screensFolder.add(monitorParams, "gap", 0, 4, 0.001).onChange(updateMonitors);
  screensFolder.add(monitorParams, "leftX", -3, 3, 0.01).onChange(updateMonitors);
  screensFolder.add(monitorParams, "rightX", -3, 3, 0.01).onChange(updateMonitors);
  screensFolder.add(monitorParams, "tiltLeftY", -1, 1, 0.001).onChange(updateMonitors);
  screensFolder.add(monitorParams, "tiltRightY", -1, 1, 0.001).onChange(updateMonitors);
  screensFolder.add(monitorParams, "yOffset", -1, 1, 0.001).onChange(updateMonitors);
  screensFolder.add(monitorParams, "zOffset", -1, 1, 0.001).onChange(updateMonitors);
  screensFolder.add(wireScreen, "fps", 1, 30, 1).name("wire FPS");
  screensFolder.add(wireScreen, "speed", 0, 4, 0.05).name("wire velocidad");

  // ─────────────────────────────────────────────────────────────────────
  // 🖼 CUADRO (poster del eclipse)
  // ─────────────────────────────────────────────────────────────────────
  const posterFolder = gui.addFolder("🖼 Cuadro");
  const posterCfg = {
   x: wallPoster.position.x,
   y: wallPoster.position.y,
   z: wallPoster.position.z,
  };
  posterFolder.add(posterCfg, "x", -6, 6, 0.01).onChange((v) => {
   wallPoster.position.x = v;
   posterSpot.position.x = v;
   posterSpot.target.position.x = v;
   requestRender();
  });
  posterFolder.add(posterCfg, "y", 0, 7, 0.01).onChange((v) => {
   wallPoster.position.y = v;
   posterSpot.target.position.y = v;
   requestRender();
  });
  posterFolder.add(posterCfg, "z", -5, 0, 0.01).onChange((v) => {
   wallPoster.position.z = v;
   posterSpot.target.position.z = v;
   requestRender();
  });
  posterFolder.add(posterSpot, "intensity", 0, 6, 0.01).name("spot intensidad").onChange(requestRender);
  posterFolder.add(posterSpot, "angle", 0.05, Math.PI * 0.45, 0.01).onChange(requestRender);
  posterFolder.add(posterSpot, "penumbra", 0, 1, 0.01).onChange(requestRender);

  // ─────────────────────────────────────────────────────────────────────
  // 🐕 PERRO HOLOGRAMA
  // ─────────────────────────────────────────────────────────────────────
  const dogFolder = gui.addFolder("🐕 Perro");
  const dogCfg = {
   visible: dogHologram.visible,
   x: 3.93,
   y: dogHologram.position.y,
   z: dogHologram.position.z,
   scale: dogHologram.scale.x,
  };
  dogFolder.add(dogCfg, "visible").onChange((v) => {
   dogHologram.visible = v;
   requestRender();
  });
  dogFolder.add(dogCfg, "x", -6, 6, 0.01).onChange((v) => {
   dogHologram.position.x = 3.93;
   requestRender();
  });
  dogFolder.add(dogCfg, "y", -2, 5, 0.01).onChange((v) => {
   dogHologram.position.y = v;
   requestRender();
  });
  dogFolder.add(dogCfg, "z", -3, 3, 0.01).onChange((v) => {
   dogHologram.position.z = v;
   requestRender();
  });
  dogFolder.add(dogCfg, "scale", 0.1, 1.5, 0.01).onChange((v) => {
   dogHologram.scale.setScalar(v);
   requestRender();
  });
  if (dogHologram.userData.holoLight) {
   dogFolder
    .add(dogHologram.userData.holoLight, "intensity", 0, 2, 0.01)
    .name("luz intensidad")
    .onChange(requestRender);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 🪐 ORRERY (mueble + sistema solar)
  // ─────────────────────────────────────────────────────────────────────
  const orreryFolder = gui.addFolder("🪐 Orrery");
  const orreryCfg = {
   visible: orrery.visible,
   x: orrery.position.x,
   y: orrery.position.y,
   z: orrery.position.z,
   rotY: orrery.rotation.y,
   scale: orrery.scale.x,
  };
  orreryFolder.add(orreryCfg, "visible").onChange((v) => {
   orrery.visible = v;
   requestRender();
  });
  orreryFolder.add(orreryCfg, "x", -6, 6, 0.01).onChange((v) => {
   orrery.position.x = v;
   requestRender();
  });
  orreryFolder.add(orreryCfg, "y", -1, 5, 0.01).onChange((v) => {
   orrery.position.y = v;
   requestRender();
  });
  orreryFolder.add(orreryCfg, "z", -4, 3, 0.01).onChange((v) => {
   orrery.position.z = v;
   requestRender();
  });
  orreryFolder.add(orreryCfg, "rotY", -Math.PI, Math.PI, 0.01).onChange((v) => {
   orrery.rotation.y = v;
   requestRender();
  });
  orreryFolder.add(orreryCfg, "scale", 0.4, 3.5, 0.01).onChange((v) => {
   orrery.scale.setScalar(v);
   requestRender();
  });
  if (orrery.userData.orreryLight) {
   orreryFolder.add(orrery.userData.orreryLight, "intensity", 0, 3, 0.01).name("luz mueble").onChange(requestRender);
  }
  if (orrery.userData.controls) {
   orreryFolder
    .add(orrery.userData.controls, "planetSize", 0.3, 5, 0.01)
    .name("planetas tamaño")
    .onChange(requestRender);
   orreryFolder
    .add(orrery.userData.controls, "orbitSpeed", 0, 4, 0.01)
    .name("velocidad órbitas")
    .onChange(requestRender);
   orreryFolder.add(orrery.userData.controls, "sunSize", 0.3, 3, 0.01).name("sol tamaño").onChange(requestRender);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 🚀 COHETE / LÁMPARA (el objeto cálido de la mesa)
  // ─────────────────────────────────────────────────────────────────────
  const rocketFolder = gui.addFolder("🚀 Cohete");
  rocketFolder.add(lamparaParams, "x", -6, 6, 0.01).name("posición X").onChange(updateLampara);
  rocketFolder.add(lamparaParams, "y", -2, 3, 0.01).name("posición Y").onChange(updateLampara);
  rocketFolder.add(lamparaParams, "z", -4, 4, 0.01).name("posición Z").onChange(updateLampara);
  rocketFolder.add(lamparaParams, "rotY", -Math.PI, Math.PI, 0.01).name("rotación Y").onChange(updateLampara);
  rocketFolder.add(lamparaParams, "scale", 0.05, 1, 0.001).name("tamaño").onChange(updateLampara);
  rocketFolder.add(lamparaParams, "brightness", 0, 2, 0.01).name("brillo").onChange(updateLampara);
  rocketFolder.add(warmLight, "intensity", 0, 6, 0.01).name("luz cálida").onChange(requestRender);
  rocketFolder.add(lamparaFlameLight, "intensity", 0, 4, 0.01).name("llama intensidad").onChange(requestRender);

  // ─────────────────────────────────────────────────────────────────────
  // 💡 LUCES GLOBALES (habitación)
  // ─────────────────────────────────────────────────────────────────────
  // Los GUIs ahora editan multiplicadores (no intensidades absolutas) que
  // el tick respeta cada frame. Rango 0–3: 0=apagado, 1=valor base, >1=más.
  const lightsFolder = gui.addFolder("💡 Luces");
  lightsFolder.add(lightMultipliers, "ambient", 0, 3, 0.01).name("ambient ×").onChange(requestRender);
  lightsFolder.add(lightMultipliers, "moonDir", 0, 3, 0.01).name("luna direc. ×").onChange(requestRender);
  lightsFolder.add(lightMultipliers, "windowFill", 0, 3, 0.01).name("ventana fill ×").onChange(requestRender);
  lightsFolder.add(lightMultipliers, "moonArea", 0, 3, 0.01).name("luna area ×").onChange(requestRender);
  lightsFolder.add(lightMultipliers, "rimChair", 0, 3, 0.01).name("rim silla ×").onChange(requestRender);
  lightsFolder.add(lightMultipliers, "rimBack", 0, 3, 0.01).name("rim trasero ×").onChange(requestRender);
  lightsFolder.add(lightMultipliers, "ledDesk", 0, 3, 0.01).name("LED mesa ×").onChange(requestRender);
  lightsFolder.add(lightMultipliers, "rightFill", 0, 3, 0.01).name("fill derecha ×").onChange(requestRender);
  lightsFolder.add(renderer, "toneMappingExposure", 0, 2, 0.01).name("exposición").onChange(requestRender);

  // ─────────────────────────────────────────────────────────────────────
  // 🎥 CÁMARA
  // ─────────────────────────────────────────────────────────────────────
  // Al cambiar cameraBase, hay que reconstruir KP[0] (que se usa en el
  // tick para interpolar la cámara) o el cambio se pierde al instante.
  const onCameraBaseChange = () => {
   if (typeof buildKeyframes === "function") buildKeyframes();
   // Si estamos en sp=0 (escena 1, sin scroll), reposicionamos la cámara
   // inmediatamente para que el cambio se vea en vivo.
   if (typeof currentScrollProgress === "undefined" || currentScrollProgress < 0.01) {
    camera.position.set(cameraBase.x, cameraBase.y, cameraBase.z);
    camera.lookAt(controls.target);
   }
   requestRender();
  };

  const cameraFolder = gui.addFolder("🎥 Cámara");
  cameraFolder.add(cameraBase, "x", -10, 10, 0.01).name("base X").onChange(onCameraBaseChange);
  cameraFolder.add(cameraBase, "y", 0, 10, 0.01).name("base Y").onChange(onCameraBaseChange);
  cameraFolder.add(cameraBase, "z", 0, 20, 0.01).name("base Z").onChange(onCameraBaseChange);
  cameraFolder
   .add(camera, "fov", 20, 90, 1)
   .name("FOV")
   .onChange(() => {
    camera.updateProjectionMatrix();
    requestRender();
   });

  // Todas las carpetas cerradas al arrancar
  screensFolder.close();
  posterFolder.close();
  dogFolder.close();
  orreryFolder.close();
  rocketFolder.close();
  lightsFolder.close();
  cameraFolder.close();

  // ─────────────────────────────────────────────────────────────────────
  // 🌌 EXTERIOR (escena espacial — "Diseñando experiencias")
  // ─────────────────────────────────────────────────────────────────────
  // Toda la escena del exterior agrupada aquí. Subcarpetas para que el
  // panel no se sature. Todo arranca cerrado.
  const exteriorFolder = gui.addFolder("🌌 Exterior");

  // — ✨ Estrellas (4 capas) —
  const starsFolder = exteriorFolder.addFolder("✨ Estrellas");
  starsFolder.add(starsParams, "visible").name("visible").onChange(requestRender);
  starsFolder.add(starsParams, "globalOpacity", 0, 4, 0.01).name("opacidad global").onChange(requestRender);
  starsFolder.add(starsParams, "parallaxSpeed", 0, 4, 0.01).name("parallax").onChange(requestRender);
  starsFolder.add(starsParams, "twinkleStrength", 0, 1, 0.01).name("twinkle").onChange(requestRender);
  starsFolder.add(starsParams, "aOpacity", 0, 1.5, 0.01).name("capa A op").onChange(requestRender);
  starsFolder.add(starsParams, "bOpacity", 0, 1.5, 0.01).name("capa B op").onChange(requestRender);
  starsFolder.add(starsParams, "cOpacity", 0, 1.5, 0.01).name("capa C op").onChange(requestRender);
  starsFolder.close();

  // — 🌕 Luna —
  const moonExtFolder = exteriorFolder.addFolder("🌕 Luna");
  moonExtFolder
   .add(moonParams, "visible")
   .name("visible")
   .onChange(() => {
    extMoon.visible = moonParams.visible;
    requestRender();
   });
  moonExtFolder
   .add(moonParams, "x", EXT_X - 30, EXT_X + 5, 0.1)
   .name("x")
   .onChange(updateMoon);
  moonExtFolder.add(moonParams, "y", -10, 15, 0.1).name("y").onChange(updateMoon);
  moonExtFolder.add(moonParams, "z", -10, 10, 0.1).name("z").onChange(updateMoon);
  moonExtFolder.add(moonParams, "scale", 0.2, 4, 0.05).name("escala").onChange(updateMoon);
  moonExtFolder.add(moonParams, "opacity", 0, 1, 0.01).name("opacidad").onChange(requestRender);
  moonExtFolder.add(moonParams, "lightIntensity", 0, 2, 0.01).name("luz").onChange(requestRender);
  moonExtFolder.addColor(moonParams, "tint").name("tinte").onChange(updateMoon);
  moonExtFolder.close();

  // — ☁ Nebula —
  const nebulaFolder = exteriorFolder.addFolder("☁ Nebula");
  nebulaFolder
   .add(nebulaParams, "visible")
   .name("visible")
   .onChange(() => {
    nebulaMesh.visible = nebulaParams.visible;
    requestRender();
   });
  nebulaFolder.add(nebulaParams, "opacity", 0, 1, 0.01).name("opacidad").onChange(requestRender);
  nebulaFolder.add(nebulaParams, "scale", 0.2, 4, 0.05).name("escala").onChange(updateNebula);
  nebulaFolder.add(nebulaParams, "rotY", -Math.PI, Math.PI, 0.01).name("rot Y").onChange(updateNebula);
  nebulaFolder.add(nebulaParams, "density", 0.1, 1.5, 0.01).name("densidad").onChange(regenerateNebula);
  nebulaFolder.add(nebulaParams, "softness", 0, 1, 0.01).name("suavidad").onChange(regenerateNebula);
  nebulaFolder.addColor(nebulaParams, "colorPrimary").name("color 1").onChange(regenerateNebula);
  nebulaFolder.addColor(nebulaParams, "colorSecondary").name("color 2").onChange(regenerateNebula);
  nebulaFolder.close();

  // — 🛸 UFO —
  const ufoFolder = exteriorFolder.addFolder("🛸 UFO");
  ufoFolder.add(ufoParams, "visible").name("visible").onChange(requestRender);
  ufoFolder.add(ufoParams, "scale", 0.1, 2, 0.01).name("escala").onChange(updateUfo);
  ufoFolder.add(ufoParams, "xOffset", -3, 3, 0.01).name("offset X").onChange(requestRender);
  ufoFolder.add(ufoParams, "yOffset", -3, 3, 0.01).name("offset Y").onChange(requestRender);
  ufoFolder.add(ufoParams, "glowIntensity", 0, 4, 0.01).name("glow").onChange(updateUfo);
  ufoFolder.add(ufoParams, "underLightIntensity", 0, 3, 0.01).name("luz inferior").onChange(updateUfo);
  ufoFolder.add(ufoParams, "beamOpacityMult", 0, 3, 0.01).name("beam opacidad").onChange(requestRender);
  ufoFolder.add(ufoParams, "beamWidth", 0.3, 3, 0.01).name("beam ancho").onChange(requestRender);
  ufoFolder.add(ufoParams, "beamLength", 0.3, 3, 0.01).name("beam alto").onChange(requestRender);
  ufoFolder.close();

  // — 📝 Claim ("Diseñando experiencias") —
  const claimFolder = exteriorFolder.addFolder("📝 Claim");
  claimFolder.add(claimParams, "visible").name("visible").onChange(requestRender);
  claimFolder
   .add(claimParams, "x", EXT_X - 10, EXT_X + 5, 0.05)
   .name("x")
   .onChange(updateClaim);
  claimFolder
   .add(claimParams, "y", EXT_Y - 5, EXT_Y + 5, 0.05)
   .name("y")
   .onChange(updateClaim);
  claimFolder
   .add(claimParams, "z", EXT_Z - 5, EXT_Z + 5, 0.05)
   .name("z")
   .onChange(updateClaim);
  claimFolder.add(claimParams, "scale", 0.3, 3, 0.01).name("escala").onChange(updateClaim);
  claimFolder.add(claimParams, "opacityMult", 0, 2, 0.01).name("opacidad").onChange(requestRender);
  claimFolder.add(claimParams, "glowIntensity", 0, 3, 0.01).name("glow naranja").onChange(updateClaim);
  claimFolder.add(claimParams, "haloOpacityMult", 0, 3, 0.01).name("halo fondo").onChange(requestRender);
  claimFolder.addColor(claimParams, "orangeColor").name("color naranja").onChange(updateClaim);
  claimFolder.add(claimParams, "subtitleVisible").name("subtítulo").onChange(updateClaim);
  claimFolder.close();

  // — ☄ Asteroides (NUEVO) —
  const asteroidFolder = exteriorFolder.addFolder("☄ Asteroides");
  asteroidFolder.add(asteroidParams, "visible").name("visible").onChange(requestRender);
  asteroidFolder.add(asteroidParams, "opacityMult", 0, 2, 0.01).name("opacidad").onChange(requestRender);
  asteroidFolder.add(asteroidParams, "emissiveMult", 0, 3, 0.01).name("emissive").onChange(requestRender);
  asteroidFolder.add(asteroidParams, "rotSpeed", 0, 4, 0.01).name("rotación").onChange(requestRender);
  asteroidFolder.add(asteroidParams, "driftSpeed", 0, 3, 0.01).name("drift").onChange(requestRender);
  asteroidFolder.close();

  exteriorFolder.close();
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

  // Animación de pantallas (typing + dashboard)
  for (let i = 0; i < screenAnimators.length; i++) screenAnimators[i](elapsedTime);

  // Holograma del perro — respiración + scan
  if (dogHologram?.userData.update) dogHologram.userData.update(elapsedTime);
  if (orrery?.userData?.update) orrery.userData.update(elapsedTime);

  // ── Luces de la habitación ────────────────────────────────────────────────
  const roomFade = 1 - clamp01(phase(sp, F2E, F3E));
  const warmBase = warmConfig.flicker
   ? warmConfig.baseIntensity + Math.sin(elapsedTime * warmConfig.flickerSpeed) * warmConfig.flickerAmplitude
   : warmConfig.baseIntensity;

  warmLight.intensity = warmBase * roomFade;
  ambientLight.intensity = 0.14 * roomFade * lightMultipliers.ambient;
  moonLight.intensity = 1.0 * roomFade * lightMultipliers.moonDir;
  moonAreaLight.intensity = 0.75 * roomFade * lightMultipliers.moonArea;
  fillLight.intensity = 0.35 * roomFade;
  windowFillLight.intensity = 0.75 * roomFade * lightMultipliers.windowFill;
  rimLight.intensity = 0.55 * roomFade * lightMultipliers.rimChair;
  backRimLight.intensity = 0.5 * roomFade * lightMultipliers.rimBack;
  ledUnderDesk.intensity = 1.1 * roomFade * lightMultipliers.ledDesk;
  deskBounceLight.intensity = 0.8 * roomFade;
  deskBounceLightR.intensity = 0.55 * roomFade;
  rightWallFill.intensity = 0.3 * roomFade * lightMultipliers.rightFill;
  posterRoomFade = roomFade;
  const posterSpotIntensity = wallPoster.userData.update(elapsedTime, roomFade);
  posterSpot.intensity = posterSpotIntensity * roomFade;

  // ── Flicker de la llama del cohete — tres senos a frecuencias primas ─────
  const fSpd = flameParams.rocketFlickerSpeed;
  const fA = Math.sin(elapsedTime * 7.3 * fSpd) * 0.16;
  const fB = Math.sin(elapsedTime * 13.1 * fSpd + 1.2) * 0.09;
  const fC = Math.sin(elapsedTime * 4.7 * fSpd + 2.8) * 0.06;
  const flameBrightness = 1.0 + fA + fB + fC;
  const fInt = flameParams.rocketFlameIntensity;
  const fScl = flameParams.rocketFlameScale;

  lamparaLight.intensity = Math.max(0.3, flameParams.rocketLightIntensity * 0.75 * flameBrightness) * roomFade;
  lamparaFlameLight.intensity = Math.max(0.25, flameParams.rocketLightIntensity * 0.85 * flameBrightness) * roomFade;

  // Animar las tres capas de llama más el sprite de glow
  if (flameGroup.visible) {
   // Jitter común de posición (las tres capas lo comparten → coherencia)
   // Ruido sumado de tres senos = fluctuación orgánica tipo fuego real.
   const jitterX = Math.sin(elapsedTime * 6.7 * fSpd + 1.3) * 0.004 + Math.sin(elapsedTime * 11.9 * fSpd + 3.1) * 0.002;
   const jitterY = Math.sin(elapsedTime * 4.9 * fSpd) * 0.006 + Math.sin(elapsedTime * 8.3 * fSpd + 2.2) * 0.003;

   // Núcleo — corto, oscila rápido en altura
   const fcore = flameCore;
   const fcHeight = 0.92 + Math.sin(elapsedTime * 10.5 * fSpd) * 0.15;
   const fcWidth = 0.94 + Math.sin(elapsedTime * 13.7 * fSpd + 1.1) * 0.08;
   fcore.mesh.scale.set(fScl * fcWidth, fScl * fcHeight, fScl * fcWidth);
   fcore.mesh.position.set(jitterX * 0.5, jitterY * 0.5, 0);
   fcore.mat.opacity = (0.72 + Math.sin(elapsedTime * 8.9 * fSpd) * 0.1) * fInt * roomFade;

   // Media — más amplitud de altura, da la "lengua" del fuego
   const fmid = flameMid;
   const fmHeight = 0.85 + Math.sin(elapsedTime * 6.2 * fSpd + 0.7) * 0.22;
   const fmWidth = 0.9 + Math.sin(elapsedTime * 7.8 * fSpd + 0.9) * 0.12;
   fmid.mesh.scale.set(fScl * fmWidth, fScl * fmHeight, fScl * fmWidth);
   fmid.mesh.position.set(jitterX, jitterY, 0);
   fmid.mat.opacity = (0.4 + Math.sin(elapsedTime * 5.3 * fSpd + 0.6) * 0.14) * fInt * roomFade;

   // Exterior — lento, amplio, casi humo
   const fout = flameOuter;
   const foHeight = 0.8 + Math.sin(elapsedTime * 3.8 * fSpd + 2.1) * 0.25;
   const foWidth = 0.85 + Math.sin(elapsedTime * 4.5 * fSpd + 1.8) * 0.18;
   fout.mesh.scale.set(fScl * foWidth, fScl * foHeight, fScl * foWidth);
   fout.mesh.position.set(jitterX * 1.3, jitterY * 0.7, 0);
   fout.mat.opacity = (0.18 + Math.sin(elapsedTime * 3.0 * fSpd + 1.5) * 0.08) * fInt * roomFade;

   // Sprite glow — pulso lento
   const glowPulse = 0.35 + Math.sin(elapsedTime * 2.4 * fSpd) * 0.12;
   flameGlowSprite.material.opacity = glowPulse * fInt * roomFade;
   const glowS = fScl * (1.0 + Math.sin(elapsedTime * 3.1 * fSpd) * 0.08) * 0.085;
   flameGlowSprite.scale.set(glowS, glowS, 1);
  }

  // ── Neón 3D (GLB) — posición / luces de rebote / titileo selectivo ─────
  neonGroup.position.set(neonParams.x, neonParams.y, neonParams.z);
  neonGroup.scale.setScalar(neonParams.scale);
  neonLight.position.set(neonParams.x, neonParams.y + 0.3, neonParams.z + 0.4);
  neonLight2.position.set(neonParams.x + 0.5, neonParams.y - 0.2, neonParams.z + 0.3);

  if (neonModel && neonGlbMats.length && roomFade > 0.05) {
   const stableMult = neonParams.intensity * roomFade;

   // ── Flicker sutil y lento ─────────────────────────────────────────
   // Antes: onda a 11.3 rad/s (≈1.8 Hz, nervioso) + gate frecuente.
   // Ahora: onda a 4.5 rad/s (≈0.7 Hz, respiración lenta) + gate muy
   // ocasional. Sensación de tubo viejo pero no "luz rota".
   const wave = 0.82 + Math.sin(elapsedTime * 4.5) * 0.18;
   const gate = Math.sin(elapsedTime * 0.7) > 0.96 ? 0.55 : 1;
   const glitch = Math.random() > 0.997 ? 0.5 : 1;
   const flickerMult = wave * gate * glitch * neonParams.intensity * roomFade;

   let avgLit = 0;
   neonGlbMats.forEach((mesh) => {
    const base = mesh.userData.baseIntensity || 3.5;
    if (mesh.userData.isFlicker) {
     mesh.material.emissiveIntensity = base * flickerMult;
     avgLit += flickerMult;
    } else {
     mesh.material.emissiveIntensity = base * stableMult;
     avgLit += stableMult;
    }
   });
   avgLit /= Math.max(1, neonGlbMats.length);

   // ── Halo por letra: opacidad sigue al emissive de su mesh ──────────
   // Cada halo hereda el nivel de luz de su letra → si la letra titila,
   // su halo también. Así se lee que cada tubo emite por sí mismo.
   neonLetterHalos.forEach((h) => {
    const m = h.isFlicker ? flickerMult : stableMult;
    // Sprite.material.opacity controla la fuerza visible del halo.
    // haloScale controla el tamaño del sprite (aplicado abajo).
    h.sprite.material.opacity = neonParams.haloOpacity * m;
   });

   // Luces de rebote (estarán a 0 porque glowStrength=0, pero por si se sube)
   neonLight.intensity = avgLit * 1.1 * neonParams.glowStrength * roomFade;
   neonLight2.intensity = avgLit * 0.5 * neonParams.glowStrength * roomFade;
  } else {
   neonLight.intensity = 0;
   neonLight2.intensity = 0;
   neonLetterHalos.forEach((h) => (h.sprite.material.opacity = 0));
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

   // ── Asteroides ────────────────────────────────────────────────────────
   // Fade-in/out con extBase. Rotación independiente por pieza + drift Y
   // mínimo para sensación de flotar sin gravedad. delta-time aproximado
   // (1/60) — los asteroides no necesitan precisión de framerate variable.
   asteroidsGroup.visible = asteroidParams.visible;
   const astOp = extBase * asteroidParams.opacityMult;
   asteroidMat.opacity = astOp;
   asteroidMat.emissiveIntensity = 0.18 * asteroidParams.emissiveMult * extBase;
   asteroids.forEach((a) => {
    a.rotateOnAxis(a.userData.axis, a.userData.rotSpeed * 0.01 * asteroidParams.rotSpeed);
    a.position.y =
     a.userData.basePos.y +
     Math.sin(elapsedTime * 0.15 * asteroidParams.driftSpeed + a.userData.driftPhase) * a.userData.driftAmpY;
   });

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
   asteroidsGroup.visible = false;
   asteroidMat.opacity = 0.0;
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
  // Cursor custom — limpieza
  if (cursorRafId) cancelAnimationFrame(cursorRafId);
  window.removeEventListener("mousemove", onCursorMove);
  window.removeEventListener("mouseover", onCursorOver);
  document.removeEventListener("mouseleave", onCursorLeave);
  document.removeEventListener("mouseenter", onCursorEnter);
  if (cursorRing.parentNode) cursorRing.parentNode.removeChild(cursorRing);
  if (cursorDot.parentNode) cursorDot.parentNode.removeChild(cursorDot);
  if (cursorStyleEl.parentNode) cursorStyleEl.parentNode.removeChild(cursorStyleEl);
  document.documentElement.style.removeProperty("cursor");
  document.body.style.removeProperty("cursor");

  window.removeEventListener("scroll", onScroll);
  canvas.removeEventListener("pointermove", onScenePointerMove);
  canvas.removeEventListener("pointerdown", onScenePointerDown);
  window.removeEventListener("keydown", onSceneKeyDown);
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

  if (neonModel) {
   neonModel.traverse((child) => {
    if (child.isMesh) {
     if (child.geometry) child.geometry.dispose();
     if (child.material?.dispose) child.material.dispose();
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
  // Asteroides — geometría única por pieza, material compartido
  asteroids.forEach((a) => a.geometry.dispose());
  asteroidMat.dispose();
  scene.remove(asteroidsGroup);
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

  // Neón 3D — GLB y luces
  if (neonModel) {
   neonModel.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) child.geometry.dispose();
    if (child.material?.map) child.material.map.dispose();
    if (child.material?.dispose) child.material.dispose();
   });
  }
  // Halos por letra del neón (sprites individuales)
  neonLetterHalos.forEach((h) => {
   if (h.sprite.material) h.sprite.material.dispose();
  });
  if (neonHaloTex) neonHaloTex.dispose();
  scene.remove(neonGroup);
  scene.remove(backRimLight);
  scene.remove(neonLight);
  scene.remove(neonLight2);
  // Luces extra
  scene.remove(windowFillLight);
  scene.remove(lamparaLight);
  scene.remove(rimLight);
  scene.remove(backRimLight);

  scene.remove(moonAreaLight);
  scene.remove(backRimLight);

  scene.remove(moonAreaLight);
  scene.remove(backRimLight);
  scene.remove(ledUnderDesk);
  scene.remove(lamparaFlameLight);

  scene.remove(deskBounceLight);
  scene.remove(deskBounceLightR);

  scene.remove(rightWallFill);

  if (wallPoster) {
   wallPoster.userData.textures.forEach((t) => t && t.dispose && t.dispose());
   wallPoster.userData.materials.forEach((m) => m && m.dispose && m.dispose());
   wallPoster.traverse((c) => {
    if (c.isMesh && c.geometry) c.geometry.dispose();
   });
   scene.remove(wallPoster);
  }
  scene.remove(posterSpot);
  scene.remove(posterSpot.target);

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
