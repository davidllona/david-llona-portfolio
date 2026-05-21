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

 const scrollWrapper = wrapperEl || document.body;

 let cachedScrollProgress = 0;

 const computeScrollProgress = () => {
  const rect = scrollWrapper.getBoundingClientRect();
  const range = rect.height - window.innerHeight;
  if (range <= 0) return 0;
  const scrolled = Math.max(0, -rect.top);
  return Math.max(0, Math.min(1, scrolled / range));
 };

 const getScrollProgress = () => cachedScrollProgress;

 const isTouchDevice =
  window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
  window.innerWidth < 768 ||
  "ontouchstart" in window;

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

  let cursorMouseX = window.innerWidth / 2;
  let cursorMouseY = window.innerHeight / 2;
  let cursorRingX = cursorMouseX;
  let cursorRingY = cursorMouseY;
  let cursorHover = false;
  let cursorIdle = false;

  const CUR_RING_RATE = 40;
  let cursorLastT = performance.now();
  function cursorTick(now) {
   if (typeof now !== "number") now = performance.now();

   const dt = Math.min(0.05, Math.max(0.001, (now - cursorLastT) / 1000));
   cursorLastT = now;

   const ringK = 1 - Math.exp(-CUR_RING_RATE * dt);

   cursorRingX += (cursorMouseX - cursorRingX) * ringK;
   cursorRingY += (cursorMouseY - cursorRingY) * ringK;
   cursorRing.style.transform = `translate3d(${cursorRingX}px, ${cursorRingY}px, 0) translate(-50%, -50%)`;

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

   cursorDot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;

   if (cursorIdle) {
    cursorIdle = false;

    cursorLastT = performance.now();
    cursorRafId = requestAnimationFrame(cursorTick);
   }
  };

  onCursorOver = (e) => {
   const t = e.target;
   const isInteractive = t.closest("a, button, [data-clickable], canvas") !== null;
   if (isInteractive !== cursorHover) {
    cursorHover = isInteractive;

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

  cursorTick();
 }

 let scrollTicking = false;
 let resizeTimeout = null;

 const isMobileForDebug = window.innerWidth < 768;
 const DEBUG = !isMobileForDebug && /[?&]gui=1\b/.test(typeof window !== "undefined" ? window.location.search : "");
 const gui = DEBUG ? new GUI() : null;
 if (gui) gui.close();

 if (gui) setGui(gui);

 const isMobile = window.innerWidth < 768;
 const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

 const quality = {
  antialias: true,
  pixelRatio: isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 1.25),
  starsCount: isMobile ? 80 : isTablet ? 350 : 550,
  starsSize: isMobile ? 0.014 : 0.018,
  moonSegments: isMobile ? 10 : 20,
 };

 const scene = new THREE.Scene();
 scene.background = new THREE.Color("#07070d");

 scene.fog = new THREE.FogExp2("#03030a", 0.0);

 const BG_ROOM = new THREE.Color("#07070d"); // fondo normal de la habitación
 const BG_SPACE = new THREE.Color("#03030a"); // fondo del espacio / Projects

 const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
 };

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

 const camera = new THREE.PerspectiveCamera(responsiveState.fov, sizes.width / sizes.height, 0.1, 100);

 const cameraBase = {
  x: responsiveState.camera.x,
  y: responsiveState.camera.y,
  z: responsiveState.camera.z,
 };

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

 renderer.toneMapping = isMobile ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure = isMobile ? 1.0 : 0.88;

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

   window.dispatchEvent(new Event("resize"));
  },
  false,
 );

 const planeGeometry14 = new THREE.PlaneGeometry(14, 14);
 const planeGeometryWall = new THREE.PlaneGeometry(14, 7);
 const unitPlaneGeometry = new THREE.PlaneGeometry(1, 1);
 const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
 const moonGeometry = new THREE.SphereGeometry(0.95, quality.moonSegments, quality.moonSegments);

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

 const _floorNormalCanvas = document.createElement("canvas");
 _floorNormalCanvas.width = _floorNormalCanvas.height = 512;
 {
  const ctx = _floorNormalCanvas.getContext("2d");

  ctx.fillStyle = "rgb(128,128,255)";
  ctx.fillRect(0, 0, 512, 512);

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

 const moonTextureLoader = new THREE.TextureLoader(loadingManager);

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

 let deskAnchor = null;
 let deskTopSupport = null;
 let deskSupportMeshes = [];

 const desk = buildDesk({
  scene,
  requestRender,
  onDeskReady: () => {
   deskAnchor = desk.deskAnchor;
   deskTopSupport = desk.deskTopSupport;
   deskSupportMeshes = desk.deskSupportMeshes;

   updateLampara();
   updateTeclado();
   updateRaton();
   updateChair();
  },
 });

 const attachToDesk = desk.attachToDesk;
 const deskParams = desk.deskParams;
 const deskFixParams = desk.deskFixParams;
 const monitorParams = desk.monitorParams;
 const monitorFixParams = desk.monitorFixParams;
 const wireScreen = desk.wireScreen;
 const updateDesk = desk.updateDesk;
 const updateMonitors = desk.updateMonitors;

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

 const clock = new THREE.Clock();
 let animationFrameId = null;
 let isRendering = false;

 function shouldAnimate() {
  return isTabVisible && isCanvasVisible;
 }

 const WRAPPER_RANGE_VH = 280; // = 380vh wrapper - 100vh sticky

 const F1_END_VH = 30; // F1: habitación estática
 const F2_END_VH = 75; // F2: aproximación a la ventana
 const F3_END_VH = 110; // F3: cruce de la pared
 const F4_END_VH = 150; // F4: vacío limpio (cámara llega a destino)

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

 const exterior = buildExterior({
  scene,
  camera,
  renderer,
  isMobile,
  atmosphereParams,
  requestRender,
 });

 const {
  EXT_X,
  EXT_Y,
  EXT_Z,

  starsParams,
  moonParams,
  nebulaParams,
  ufoParams,
  claimParams,
  asteroidParams,

  extMoon,
  nebulaMesh,

  updateMoon,
  updateNebula,
  regenerateNebula,
  updateUfo,
  updateClaim,
 } = exterior;

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

 const wallPoster = room.wallPoster;
 const posterSpot = room.posterSpot;
 const windowParams = room.windowParams; // usado en buildKeyframes (KP[1], KP[2])
 const floor = room.floor; // usado en getChairSupportY para raycast del suelo

 const cameraFocus = {
  active: false,
  phase: "idle", // idle | entering | held | exiting
  phaseStart: 0,
  enterDuration: 1.1,
  exitDuration: 1.0,
  targetKey: null, // "poster" | "monitors"
 };

 const focusPos = new THREE.Vector3();
 const focusQuat = new THREE.Quaternion();
 const _focusMat = new THREE.Matrix4();
 const _focusUp = new THREE.Vector3(0, 1, 0);
 const _focusLookAt = new THREE.Vector3();

 const _focusWorldQuat = new THREE.Quaternion();
 const _focusNormal = new THREE.Vector3();

 const computeFocusTarget = () => {
  if (!wallPoster) return;

  wallPoster.getWorldPosition(_focusLookAt);

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

  if (cameraFocus.targetKey === "poster" && wallPoster) {
   wallPoster.userData.triggerClose(now);
  }

  cameraFocus.phase = "exiting";
  cameraFocus.phaseStart = now;
  document.body.style.overflow = "";
 }

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

 const neonParams = neon.params;
 const neonLetterHalos = neon.letterHalos;
 const dogHologram = dogHologramRef.group;
 const orrery = orreryRef.group;

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

 const lamparaParams = props.lamparaParams;
 const warmLight = props.warmLight;
 const lamparaFlameLight = props.lamparaFlameLight;

 const updateChair = props.updateChair;
 const updateLampara = props.updateLampara;
 const updateTeclado = props.updateTeclado;
 const updateRaton = props.updateRaton;

 const controls = new OrbitControls(camera, canvas);
 controls.enableDamping = !isMobile;
 controls.enableZoom = false;
 controls.enablePan = false;
 controls.enabled = !isMobile;
 controls.target.set(responsiveState.target.x, responsiveState.target.y, responsiveState.target.z);

 canvas.style.touchAction = "pan-y";

 if (!isMobile) {
  controls.addEventListener("change", requestRender);
 }

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

  if (typeof buildKeyframes === "function" && typeof KP !== "undefined") buildKeyframes();

  requestRender();
 }

 if (gui) {
  attachHeroGUI(gui, {
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

   EXT_X,
   EXT_Y,
   EXT_Z,

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

 const applyResize = () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  const newIsMobile = window.innerWidth < 768;
  const newPixelRatio = Math.min(window.devicePixelRatio, newIsMobile ? 1.5 : 1.25);

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

 setTimeout(() => {
  cachedScrollProgress = computeScrollProgress();
  requestRender();
 }, 120);

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

 buildKeyframes();

 applyResponsiveLayout();

 function tick() {
  isRendering = false;
  if (!shouldAnimate()) return;

  const elapsedTime = clock.getElapsedTime();
  const sp = getScrollProgress();

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

  if (focusBlend > 0) {
   camera.position.lerpVectors(workPos, focusPos, focusBlend);
   camera.quaternion.slerpQuaternions(workQ, focusQuat, focusBlend);
  } else {
   camera.position.copy(workPos);
   camera.quaternion.copy(workQ);
  }

  const orbitAllowed = sp < F2S && !cameraFocus.active;
  if (controls.enabled !== orbitAllowed) {
   controls.enabled = orbitAllowed;
  }
  if (controls.enabled && controls.enableDamping) {
   controls.update();
  }

  const bgT = clamp01(phase(sp, F3S, F4E));
  scene.background.lerpColors(BG_ROOM, BG_SPACE, easeOut3(bgT));

  if (scene.fog) {
   scene.fog.color.lerpColors(BG_ROOM, BG_SPACE, easeOut3(bgT));
   const fogMult = atmosphereParams.fogDensityMult;
   if (sp < F3S) {
    scene.fog.density = 0.0;
   } else if (sp < F3E) {
    scene.fog.density = lerpV(0.0, 0.38, easeIn3(phase(sp, F3S, F3E))) * fogMult;
   } else if (sp < F4E) {
    scene.fog.density = lerpV(0.38, 0.0, easeOut3(phase(sp, F3E, F4E))) * fogMult;
   } else {
    scene.fog.density = 0.0;
   }
  }

  const INTERIOR_CULL_SP = F3E + 0.04; // ≈ 0.43
  const interiorVisible = sp < INTERIOR_CULL_SP;

  if (interiorVisible) {
   desk.update(elapsedTime);

   if (dogHologram?.userData.update) dogHologram.userData.update(elapsedTime);
   if (orrery?.userData?.update) orrery.userData.update(elapsedTime);
  }

  const roomFade = 1 - clamp01(phase(sp, F2E, F3E));

  const warmFade = 1 - clamp01(phase(sp, F2S, F2E));

  room.update({ elapsedTime, roomFade, lightMultipliers, isMobile });

  props.update({ elapsedTime, roomFade, warmFade });

  if (interiorVisible) {
   neon.update(elapsedTime, roomFade);
  }

  exterior.update({ sp, elapsedTime, F4S });

  if (renderer.toneMappingExposure !== atmosphereParams.exposure) {
   renderer.toneMappingExposure = atmosphereParams.exposure;
  }

  renderer.render(scene, camera);
  requestRender();
 }

 cachedScrollProgress = computeScrollProgress();
 requestRender();

 return () => {
  document.body.style.overflow = "";

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

  props.dispose();

  desk.dispose();

  planeGeometry14.dispose();
  floorNormalTex.dispose();
  planeGeometryWall.dispose();
  unitPlaneGeometry.dispose();
  unitBoxGeometry.dispose();
  moonGeometry.dispose();

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

  room.dispose();

  dogHologramRef.dispose();
  orreryRef.dispose();

  wallNormalTex.dispose();

  if (gui) {
   gui.destroy();
   clearGui();
  }
 };
}
