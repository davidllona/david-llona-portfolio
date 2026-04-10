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
  scale: 0.42,
  brightness: 0.95,

  yOffset: 0.01,
  zOffset: 0.02,

  gap: 0.02,

  leftX: -0.42,
  rightX: 0.42,

  rotY: 0,
  rotX: 0,
  rotZ: 0,

  tiltLeftY: 0.12,
  tiltRightY: -0.12,
 };

 const monitorFixParams = {
  posX: 0,
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
  x: -2.25,
  y: -0.04,
  z: -0.43,
  rotY: -2.3,
  brightness: 1.15,
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
  monitorFolder.add(monitorParams, "gap", 0, 1, 0.001).onChange(updateMonitors);
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
  * INIT RESPONSIVE
  * =========================================================
  */
 applyResponsiveLayout();

 /**
  * =========================================================
  * ANIMATION
  * =========================================================
  */
 function tick() {
  isRendering = false;

  if (!shouldAnimate()) return;

  const elapsedTime = clock.getElapsedTime();
  const scrollProgress = scrollY / sizes.height;

  camera.position.x = cameraBase.x;
  camera.position.y = cameraBase.y - scrollProgress * scrollConfig.yFactor;
  camera.position.z = cameraBase.z - scrollProgress * scrollConfig.zFactor;

  if (warmConfig.flicker) {
   warmLight.intensity =
    warmConfig.baseIntensity + Math.sin(elapsedTime * warmConfig.flickerSpeed) * warmConfig.flickerAmplitude;
  } else {
   warmLight.intensity = warmConfig.baseIntensity;
  }

  if (starsPoints && !isMobile) {
   starsPoints.rotation.z = elapsedTime * 0.003;
  }

  if (controls.enabled && controls.enableDamping) {
   controls.update();
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
