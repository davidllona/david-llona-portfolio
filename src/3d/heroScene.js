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
 const wallMaterial = new THREE.MeshStandardMaterial({
  color: "#2f3140",
  roughness: 1,
  metalness: 0,
 });

 const floorMaterial = new THREE.MeshStandardMaterial({
  color: "#1b1d26",
  roughness: 0.95,
  metalness: 0,
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
  color: "#c9ccd7",
  roughness: 0.8,
  metalness: 0,
 });

 const windowRevealMaterial = new THREE.MeshStandardMaterial({
  color: "#bfc4d4",
  roughness: 0.9,
  metalness: 0,
 });

 const windowGlassMaterial = new THREE.MeshBasicMaterial({
  color: "#ffffff",
  transparent: true,
  opacity: 0.03,
  depthWrite: false,
  depthTest: false,
 });

 const outerGlowMaterial = new THREE.MeshBasicMaterial({
  color: "#516dff",
  transparent: true,
  opacity: 0.05,
  depthWrite: false,
 });

 const moonMaterial = new THREE.MeshBasicMaterial({
  color: "#7f8fc9",
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
  brightness: 0.95,

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

  glowWidth: 3.7,
  glowHeight: 3.33,
  glowOffset: -0.45,
  glowColor: "#516dff",
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

 // ── Estrellas exteriores — 3 capas cromáticas con profundidad real ────────
 //
 // Capa A (lejana):  1600 partículas, muy finas, azul frío  → polvo estelar profundo
 // Capa B (media):    400 partículas, medianas, blanco neutro → magnitud media
 // Capa C (cercana):   60 partículas, más grandes, blanco cálido → primer plano
 //
 // Los tres colores crean ilusión de distancia cromática real.
 // Distribución uniforme en esfera → sin zonas vacías ni sesgos.

 // buildExtStarLayer — distribución esférica con sesgo opcional
 // biasY / biasZ desplazan el centro de distribución para crear asimetría
 // sin crear zonas vacías — el sesgo es aditivo, no elimina estrellas
 function buildExtStarLayer(count, rMin, rMax, biasY = 0, biasZ = 0) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
   const r = rMin + Math.random() * (rMax - rMin);
   const u = Math.random(),
    v = Math.random();
   const theta = 2 * Math.PI * u;
   const phi = Math.acos(2 * v - 1);
   pos[i * 3] = EXT_X + r * Math.sin(phi) * Math.cos(theta);
   pos[i * 3 + 1] = EXT_Y + r * Math.sin(phi) * Math.sin(theta) + biasY * r * 0.35;
   pos[i * 3 + 2] = EXT_Z + r * Math.cos(phi) + biasZ * r * 0.35;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return geo;
 }

 // Capa A — lejana, densa, azul frío
 const EXT_A_COUNT = isMobile ? 400 : 1600;
 const extStarsGeo = buildExtStarLayer(EXT_A_COUNT, 20, 42, 0.6, -0.4);
 const extStarsMat = new THREE.PointsMaterial({
  color: "#c0d4ff",
  size: isMobile ? 0.048 : 0.032,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
 });
 const extStarsPoints = new THREE.Points(extStarsGeo, extStarsMat);
 extStarsPoints.renderOrder = 1;
 extStarsPoints.visible = false;
 scene.add(extStarsPoints);

 // Capa B — media, blanco neutro
 const EXT_B_COUNT = isMobile ? 100 : 400;
 const extStarsBGeo = buildExtStarLayer(EXT_B_COUNT, 10, 22);
 const extStarsBMat = new THREE.PointsMaterial({
  color: "#e8eeff",
  size: isMobile ? 0.09 : 0.065,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
 });
 const extStarsBPoints = new THREE.Points(extStarsBGeo, extStarsBMat);
 extStarsBPoints.renderOrder = 2;
 extStarsBPoints.visible = false;
 scene.add(extStarsBPoints);

 // Capa C — cercana, blanco cálido, muy pocas → puntos de brillo
 const EXT_C_COUNT = isMobile ? 14 : 60;
 const extStarsCGeo = buildExtStarLayer(EXT_C_COUNT, 4, 11);
 const extStarsCMat = new THREE.PointsMaterial({
  color: "#fff4e8",
  size: isMobile ? 0.13 : 0.1,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
 });
 const extStarsCPoints = new THREE.Points(extStarsCGeo, extStarsCMat);
 extStarsCPoints.renderOrder = 3;
 extStarsCPoints.visible = false;
 scene.add(extStarsCPoints);

 // Capa D — polvo de primer plano, muy cercano a la cámara
 // Pocas partículas, grandes y muy transparentes → profundidad de campo
 // r=1.5–4u desde EXT → aparecen flotando DELANTE del claim
 const EXT_D_COUNT = isMobile ? 0 : 18;
 const extStarsDGeo =
  EXT_D_COUNT > 0
   ? buildExtStarLayer(EXT_D_COUNT, 1.5, 4)
   : (() => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
      return g;
     })();
 const extStarsDMat = new THREE.PointsMaterial({
  color: "#dde8ff",
  size: 0.24,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
 });
 const extStarsDPoints = new THREE.Points(extStarsDGeo, extStarsDMat);
 extStarsDPoints.renderOrder = 4;
 extStarsDPoints.visible = false;
 scene.add(extStarsDPoints);

 // ── Luna exterior — textura real, fondo equilibrado ──────────────────────
 //
 // Composición:
 //   Cámara KP[2] = (-12, 4.51, 0.55)
 //   Luna en       (-36, EXT_Y + 1.8, EXT_Z + 1.6)
 //   → 24u al frente, +1.8u arriba, +1.6u lateral en Z
 //   → offset Z moderado: no está perfectamente centrada detrás del texto
 //     pero tampoco arrinconada en el lateral — equilibrio compositivo
 //   → radio 1.5: más presencia de "gran fondo" sin invadir el claim
 //   → tamaño angular: 1.5 / 24.1u ≈ 7.1°
 //
 // DirectionalLight apuntando desde la luna hacia el centro de escena:
 //   ilumina el campo de estrellas con tinte muy frío sin crear "foco" visible
 const extMoonLoader = new THREE.TextureLoader();
 const extMoonGeo = new THREE.SphereGeometry(1.5, 36, 36);
 const extMoonMat = new THREE.MeshBasicMaterial({
  color: "#f5f8ff",
  transparent: true,
  opacity: 0.0,
 });
 const extMoon = new THREE.Mesh(extMoonGeo, extMoonMat);
 extMoon.position.set(EXT_X - 26, EXT_Y + 3.2, EXT_Z - 1.5);
 extMoon.renderOrder = 10;
 extMoon.visible = false;
 scene.add(extMoon);

 extMoonLoader.load("/textures/moon.jpg", (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  extMoonMat.map = tex;
  extMoonMat.color.set("#ffffff");
  extMoonMat.needsUpdate = true;
  requestRender();
 });

 // DirectionalLight desde la luna — ilumina suavemente el entorno sin "foco"
 // intensity empieza en 0, sube a 0.22 en F4 — muy sutil, sin teñir
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

 // ── Fondo nebular — rompe el negro plano sin ruido visual ────────────────
 // Un plano grande con gradiente radial muy sutil centrado en el espacio.
 // Casi imperceptible — solo añade una cálida variación de profundidad.
 // Colocado muy lejos (EXT_X - 50) para que quede siempre detrás de todo.
 const nebulaTex = (() => {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 256;
  const c = cv.getContext("2d");
  // Gradiente radial muy tenue: centro levemente azul frío, bordes transparentes
  // Centro desplazado arriba-izquierda → no perfectamente centrado
  // Coincide con la zona donde está la luna → más atmósfera natural
  const g = c.createRadialGradient(96, 88, 0, 96, 88, 140);
  g.addColorStop(0.0, "rgba(16, 24, 55, 0.26)");
  g.addColorStop(0.5, "rgba(9, 13, 32, 0.11)");
  g.addColorStop(1.0, "rgba(0, 0, 0, 0.00)");
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
 })();
 const nebulaGeo = new THREE.PlaneGeometry(28, 20);
 const nebulaMat = new THREE.MeshBasicMaterial({
  map: nebulaTex,
  transparent: true,
  opacity: 0.0, // controlado en tick, máx 0.85
  depthWrite: false,
  side: THREE.DoubleSide,
 });
 const nebulaMesh = new THREE.Mesh(nebulaGeo, nebulaMat);
 nebulaMesh.position.set(EXT_X - 50, EXT_Y, EXT_Z);
 nebulaMesh.rotation.y = Math.PI * 0.5;
 nebulaMesh.renderOrder = 0; // detrás de todo
 scene.add(nebulaMesh);

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

 let ufoRoot = null;
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
   ufoRoot.scale.setScalar(0.58); // ← más grande: 0.45→0.58
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
   const ufoLight = new THREE.PointLight("#a8d4ff", 1.4, 2.8, 1.8);
   ufoLight.position.set(0, -0.25, 0.3); // ligeramente debajo y al frente
   ufoGroup.add(ufoLight);

   // Segundo punto de luz para definir el borde superior (rim)
   const ufoRim = new THREE.PointLight("#cce8ff", 0.7, 2.0, 2);
   ufoRim.position.set(0, 0.4, -0.2);
   ufoGroup.add(ufoRim);

   ufoGroup.add(ufoRoot);
   console.log("[UFO] Cargado —", ufoMaterials.length, "materiales");
   requestRender();
  },
  undefined,
  (err) => console.error("[UFO] Error:", err),
 );

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

 const S_CLAIM = 3;
 const W_CLAIM = 1024;
 const H_CLAIM = 320;
 const claimCanvas = document.createElement("canvas");
 claimCanvas.width = W_CLAIM * S_CLAIM;
 claimCanvas.height = H_CLAIM * S_CLAIM;
 const claimCtx = claimCanvas.getContext("2d");
 claimCtx.scale(S_CLAIM, S_CLAIM);

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

  // Línea 2 — "de otro planeta"
  // shadowBlur: 28 → 60   |   fillColor G: 107→140, B: 44→80
  const oG = Math.round(107 + scanInfl * 33);
  const oB = Math.round(44 + scanInfl * 36);
  const oA = 0.5 + scanInfl * 0.45;
  ctx.font = `700 68px ${SANS}`;
  ctx.shadowColor = `rgba(255,107,44,${oA.toFixed(2)})`;
  ctx.shadowBlur = 28 + scanInfl * 32;
  ctx.fillStyle = `rgba(255,${oG},${oB},1.0)`;
  ctx.fillText("de otro planeta", w * 0.5, 182);
  ctx.shadowBlur = 0;

  // Separador + rombo — sin cambio con el escáner
  ctx.strokeStyle = "rgba(255, 107, 44, 0.60)";
  ctx.lineWidth = 0.8;
  const lineW = w * 0.28;
  const lineY = 207;
  ctx.beginPath();
  ctx.moveTo(w * 0.5 - lineW - 12, lineY);
  ctx.lineTo(w * 0.5 - 12, lineY);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 107, 44, 0.70)";
  ctx.save();
  ctx.translate(w * 0.5, lineY);
  ctx.rotate(Math.PI * 0.25);
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(w * 0.5 + 12, lineY);
  ctx.lineTo(w * 0.5 + lineW + 12, lineY);
  ctx.stroke();

  // Subtítulo
  ctx.font = `300 20px ${SANS}`;
  ctx.fillStyle = "rgba(168, 188, 232, 0.72)";
  ctx.fillText("Frontend · Three.js · Experiencias interactivas", w * 0.5, 258);
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
 // Color naranja puro, opacidad máxima 0.038 — casi imperceptible
 // pero pulsando muy lentamente da sensación de vida al texto.
 // Posicionado 0.02u más cerca de cámara que extPlaneA.
 const extGlowGeo = new THREE.PlaneGeometry(3.8, 3.8 * (320 / 1024));
 const extGlowMat = new THREE.MeshBasicMaterial({
  color: "#ff6b2c",
  transparent: true,
  opacity: 0.0,
  depthWrite: false,
  side: THREE.DoubleSide,
 });
 const extGlowPlane = new THREE.Mesh(extGlowGeo, extGlowMat);
 extGlowPlane.position.set(EXT_X - 5.48, EXT_Y - 0.2, EXT_Z); // 0.02u más cerca
 extGlowPlane.rotation.y = Math.PI * 0.5;
 scene.add(extGlowPlane);

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

 /**
  * =========================================================
  * LIGHTS
  * =========================================================
  */
 const ambientLight = new THREE.AmbientLight("#7c86b8", 0.35);
 scene.add(ambientLight);

 const moonLight = new THREE.DirectionalLight("#6f87ff", 0.55);
 moonLight.position.set(-4, 5, -1);
 scene.add(moonLight);

 const warmLight = new THREE.PointLight("#ffb25e", 5, 20, 2);
 warmLight.position.set(-3.65, 3.09, -2.12);
 scene.add(warmLight);

 const fillLight = new THREE.PointLight("#4b63ff", 0.38, 8.5, 2);
 fillLight.position.set(4.2, 1.2, 1.5);
 scene.add(fillLight);

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
  x: 1.06,
  y: -0.04,
  z: -0.43,
  rotY: -2.9,
  brightness: 1.1,
  groundOffset: 0.005,
 };

 const chairFix = {
  rotX: -0.2,
  rotY: 0,
  rotZ: 0,
 };

 loader.load("/modelos/chair.glb", (gltf) => {
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
  baseIntensity: 5,
  flickerAmplitude: 0.06,
  flickerSpeed: 4,
 };

 if (gui) {
  const cameraFolder = gui.addFolder("Camera");
  cameraFolder.add(cameraBase, "x", -10, 10, 0.01).name("base x");
  cameraFolder.add(cameraBase, "y", 0, 10, 0.01).name("base y");
  cameraFolder.add(cameraBase, "z", 0, 20, 0.01).name("base z");

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

  const chairFolder = gui.addFolder("Chair");
  chairFolder.add(chairParams, "scale", 0.2, 2, 0.01).onChange(updateChair);
  chairFolder.add(chairParams, "x", -5, 5, 0.01).onChange(updateChair);
  chairFolder.add(chairParams, "y", -2, 5, 0.01).onChange(updateChair);
  chairFolder.add(chairParams, "z", -2, 5, 0.01).onChange(updateChair);
  chairFolder.add(chairParams, "rotY", -Math.PI, Math.PI, 0.01).onChange(updateChair);
  chairFolder.add(chairParams, "brightness", 0.2, 2, 0.01).onChange(updateChair);
  chairFolder.add(chairParams, "groundOffset", 0, 0.05, 0.001).onChange(updateChair);

  chairFolder.add(chairFix, "rotX", -Math.PI, Math.PI, 0.01).name("fix rotX").onChange(updateChair);
  chairFolder.add(chairFix, "rotY", -Math.PI, Math.PI, 0.01).name("fix rotY").onChange(updateChair);
  chairFolder.add(chairFix, "rotZ", -Math.PI, Math.PI, 0.01).name("fix rotZ").onChange(updateChair);
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
  const cfg = getResponsiveConfig();
  KP[0].set(cfg.camera.x, cfg.camera.y, cfg.camera.z);
  KP[1].set(-1.5, 4.51, windowParams.z);
  KP[2].set(-12.0, 4.51, windowParams.z);
  auxCam.position.copy(KP[0]);
  auxCam.up.set(0, 1, 0);
  auxCam.lookAt(cfg.target.x, cfg.target.y, cfg.target.z);
  KQ[0].copy(auxCam.quaternion);
  auxCam.position.copy(KP[1]);
  auxCam.up.set(0, 1, 0);
  auxCam.lookAt(-20.0, KP[1].y, KP[1].z);
  KQ[1].copy(auxCam.quaternion);
  KQ[2].copy(KQ[1]); // mismo look en exterior → cero giro al cruzar la pared
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
  if (scene.fog) {
   scene.fog.color.lerpColors(BG_ROOM, BG_SPACE, easeOut3(bgT));
   if (sp < F3S) {
    scene.fog.density = 0.0;
   } else if (sp < F3E) {
    scene.fog.density = lerpV(0.0, 0.38, easeIn3(phase(sp, F3S, F3E)));
   } else if (sp < F4E) {
    // Se aclara completamente — el exterior debe ser legible
    scene.fog.density = lerpV(0.38, 0.0, easeOut3(phase(sp, F3E, F4E)));
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
  ambientLight.intensity = 0.35 * roomFade;
  moonLight.intensity = 0.55 * roomFade;
  fillLight.intensity = 0.38 * roomFade;

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

  extStarsPoints.visible = inExterior;
  extStarsBPoints.visible = inExterior;
  extStarsCPoints.visible = inExterior;
  extStarsDPoints.visible = inExterior && !isMobile;
  extMoon.visible = inExterior;
  extMoonHalo.visible = false; // stub siempre off

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
   // Lejanas: muy poco movimiento  |  Cercanas: más movimiento
   if (!isMobile) {
    // Capa A (lejana) — movimiento mínimo
    extStarsPoints.rotation.y = elapsedTime * 0.0018;
    extStarsPoints.rotation.x = elapsedTime * 0.0006;
    // Capa B (media) — algo más
    extStarsBPoints.rotation.y = elapsedTime * 0.0032;
    extStarsBPoints.rotation.x = elapsedTime * 0.0012;
    // Capa C (cercana) — más que B, menos que D
    extStarsCPoints.rotation.y = elapsedTime * 0.0038;
    extStarsCPoints.rotation.x = elapsedTime * 0.0014;
    // Capa D (primer plano) — el más visible pero nunca molesto
    extStarsDPoints.rotation.y = elapsedTime * 0.0055;
    extStarsDPoints.rotation.x = elapsedTime * 0.002;
   }

   // ── Opacidades con respiración ────────────────────────────────────────
   extStarsMat.opacity = extBase * 0.72 * breathA;
   extStarsBMat.opacity = extBase * 0.85 * breathB;
   extStarsCMat.opacity = extBase * 0.9 * breathC;
   // Capa D: primer plano sutil — pocas partículas grandes muy transparentes
   extStarsDMat.opacity = isMobile ? 0.0 : extBase * 0.08;

   // ── Nebula de fondo — aparece con el exterior, casi imperceptible ────────
   nebulaMat.opacity = extBase * 0.82;

   // ── Viñeta — sigue la cámara, fade-in suave con el exterior ──────────────
   // Se posiciona 0.5u delante de la cámara, en la dirección de visión (-X)
   vignetteMesh.position.set(camera.position.x - 0.5, camera.position.y, camera.position.z);
   vignetteMesh.rotation.y = Math.PI * 0.5; // perpendicular al eje de visión
   vignetteMat.opacity = extBase * 0.88;

   // ── Luna ──────────────────────────────────────────────────────────────
   extMoonMat.opacity = extBase * 0.88;
   extMoonLight.intensity = extBase * 0.2;

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
   // ufoT: 0 cuando sp=UFO_SP_START, 1 cuando sp=UFO_SP_END
   // Toda la lógica es función pura de sp — sin estado ni timers.
   const ufoT = phase(sp, UFO_SP_START, UFO_SP_END);
   const ufoActive = sp >= UFO_SP_START && sp <= UFO_SP_END && ufoRoot;

   if (ufoActive) {
    // ── Posición — barrido en Z (horizontal para el espectador) ────────────
    // Easing suave en los extremos para entrada/salida elegante
    const ufoTE = easeIO3(ufoT);
    const ufoZ = lerpV(UFO_Z_START, UFO_Z_END, ufoTE);
    // Y con leve ondulación ligada al progreso (no al tiempo — no oscila raramente)
    const ufoY = UFO_BASE_Y + Math.sin(ufoT * Math.PI) * 0.08;

    ufoGroup.visible = true;
    ufoGroup.position.set(UFO_X, ufoY, ufoZ);
    // Rotación: ligera inclinación de avance según dirección del barrido
    ufoGroup.rotation.y = Math.PI * 0.5 + (ufoTE - 0.5) * 0.15;

    // Fade: primero y último 10% del tramo
    const ufoFade = ufoT < 0.1 ? ufoT / 0.1 : ufoT > 0.9 ? (1 - ufoT) / 0.1 : 1.0;
    const ufoOp = clamp01(ufoFade) * 0.92;
    ufoMaterials.forEach((m) => {
     m.opacity = ufoOp;
    });

    // ── beamInfl: distancia del UFO al centro del claim en Z ───────────────
    // Máximo cuando el UFO está sobre EXT_Z (centro del claim)
    const beamDist = Math.abs(ufoZ - EXT_Z);
    const beamRange = 2.2; // radio de influencia ± 2.2u en Z
    const beamRaw = Math.max(0, 1 - beamDist / beamRange);
    const beamInfl = beamRaw * beamRaw * ufoFade; // cuadrático + fade

    // ── Haz triangular ─────────────────────────────────────────────────────
    // Apex justo debajo del UFO, la base cubre el claim
    // Centro Y = entre UFO y texto: ufoY - 0.9 (a mitad del gap de ~1.8u)
    ufoBeamMesh.visible = true;
    ufoBeamMesh.position.set(UFO_X + 0.01, ufoY - 0.9, ufoZ);
    ufoBeamMat.opacity = beamInfl * 0.7;

    // ── Escáner en el canvas del claim ────────────────────────────────────
    // Redibujamos la textura con colores boosteados según beamInfl.
    // El efecto existe SOLO en los píxeles de las letras — nunca en el fondo
    // (drawClaimScan solo dibuja texto, clearRect vacía el fondo a transparente).
    // Throttle: cuantizar a pasos de 0.025 para no redibujar cada frame.
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
   extStarsMat.opacity = 0.0;
   extStarsBMat.opacity = 0.0;
   extStarsCMat.opacity = 0.0;
   extStarsDMat.opacity = 0.0;
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
  }

  // ── Bloque B — Claim narrativo (F5: 1.50 → 2.20) ─────────────────────────
  // claimFI / claimFO / claimOp ya calculados arriba

  // Texto
  extPlaneAMat.opacity = claimOp;

  // Halo elíptico de fondo — más suave que antes para no crear mancha
  extPlaneHaloMat.opacity = claimOp * 0.62;

  // Scale de entrada sutil: 0.95 → 1.0 durante fade-in (6% total, elegante)
  const claimScale = lerpV(0.95, 1.0, claimFI);
  extPlaneA.scale.setScalar(claimScale);
  extPlaneHalo.scale.setScalar(claimScale);
  extGlowPlane.scale.setScalar(claimScale);

  // Glow naranja vivo — pulso muy lento, amplitud 0.038 máxima
  // Solo activo cuando el claim está visible (claimOp > 0)
  // El seno oscila entre 0.012 y 0.038 — variación casi imperceptible
  // pero suficiente para que el texto se sienta vivo y no estático
  if (claimOp > 0.01) {
   const glowPulse = 0.025 + Math.sin(elapsedTime * 0.55) * 0.013;
   extGlowMat.opacity = claimOp * glowPulse;
  } else {
   extGlowMat.opacity = 0.0;
  }

  // ── Bloque C — Texto técnico (F6: 2.20 → 2.85) ───────────────────────────
  const techFI = easeOut3(phase(sp, 2.2, 2.46));
  const techFO = easeIn3(phase(sp, 2.65, 2.85));
  extPlaneCMat.opacity = clamp01(techFI * (1 - techFO));

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
 };
}
