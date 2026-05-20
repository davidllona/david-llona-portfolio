import * as THREE from "three";
import { loadingManager } from "../loadingManager";

/**
 * room.js
 * ─────────────────────────────────────────────────────────────────────────
 * "La habitación" del Hero: estructura física + iluminación interior + poster.
 *
 * Contiene:
 *   - Suelo + pared trasera + pared izquierda (con corte para ventana)
 *   - Sistema completo de ventana (marco + cristal + reveals + sill + glow)
 *   - Espacio detrás del cristal (estrellas internas + luna)
 *   - 11 luces que dan ambiente a la escena interior
 *   - Cuadro de pared con retrato + mini-about (click) + spot dedicado
 *   - Sistema de raycast del poster (hover + click + escape)
 *
 * Lo que NO contiene (vive aún en heroScene.js, irá a props.js en Fase 4C):
 *   - warmLight, lamparaLight, lamparaFlameLight (luces del cohete)
 *   - flameGroup (llama del cohete)
 *   - sistema cameraFocus (responsabilidad de la cámara, no del room)
 *
 * El sistema cameraFocus vive fuera porque modifica la cámara. Cuando el
 * usuario hace click en el poster, room avisa al orquestador vía callback
 * `onPosterFocusEnter(now)` y este decide cómo mover la cámara.
 */
export function buildRoom({
 // Contexto Three
 scene,
 camera,
 canvas,
 clock,

 // Materiales y geometrías compartidas (creadas en heroScene)
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

 // Config de calidad (afecta a count/size de estrellas internas)
 quality,

 // Utilities
 requestRender,

 // Callbacks del orquestador — comunicación con el sistema cameraFocus
 onPosterFocusEnter, // (now: number) => void
 onPosterFocusExit, // (now: number) => void
 isCameraFocusActive, // () => boolean
}) {
 // ════════════════════════════════════════════════════════════════════════
 // MOBILE STRIP-DOWN
 // ════════════════════════════════════════════════════════════════════════
 // Detección de móvil. En móvil omitimos los elementos interactivos que:
 //   1) No funcionan sin hover/click cómodo (cuadro/retrato → click +
 //      cinematic focus).
 //   2) Consumen mucha VRAM (las dos CanvasTextures de 768×1024 del poster
 //      saturan la GPU ARM y disparan WebGL CONTEXT LOST en Mali-G68).
 //
 // En desktop NO cambia nada: si !isMobile, el cuadro sigue idéntico.
 const isMobile = window.innerWidth < 768;

 // ════════════════════════════════════════════════════════════════════════
 // ROOM BASE — suelo + pared trasera
 // ════════════════════════════════════════════════════════════════════════
 const floor = new THREE.Mesh(planeGeometry14, floorMaterial);
 floor.rotation.x = -Math.PI * 0.5;
 floor.position.y = 0;
 scene.add(floor);

 const backWall = new THREE.Mesh(planeGeometryWall, wallMaterial);
 backWall.position.set(0, 3.5, -4);
 scene.add(backWall);

 // ════════════════════════════════════════════════════════════════════════
 // WINDOW PARAMS — geometría de la ventana (editables)
 // ════════════════════════════════════════════════════════════════════════
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

 // ════════════════════════════════════════════════════════════════════════
 // LEFT WALL WITH WINDOW CUTOUT — pared izquierda en 4 piezas alrededor del hueco
 // ════════════════════════════════════════════════════════════════════════
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

 // ════════════════════════════════════════════════════════════════════════
 // WINDOW SYSTEM — marco + cristal + reveals + sill + glow exterior
 // ════════════════════════════════════════════════════════════════════════
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

 // ════════════════════════════════════════════════════════════════════════
 // SPACE OUTSIDE WINDOW — estrellas internas + luna interior
 // ════════════════════════════════════════════════════════════════════════
 // Estas estrellas viven DENTRO del marco de la ventana (vistas a través
 // del cristal). NO son las estrellas del exterior espacial gigante (esas
 // están en exterior.js).
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

 // ════════════════════════════════════════════════════════════════════════
 // UPDATE WINDOW — recalcula geometría completa según windowParams
 // ════════════════════════════════════════════════════════════════════════
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

 // ════════════════════════════════════════════════════════════════════════
 // LIGHTS — 11 luces que dan ambiente a la habitación
 // ════════════════════════════════════════════════════════════════════════
 // Las 3 luces del cohete (warmLight, lamparaLight, lamparaFlameLight) NO
 // están aquí — se quedan en heroScene.js hasta que la Fase 4C las traslade
 // junto con el cohete a props.js. Tienen una dependencia con `flameBrightness`
 // que vive en el sistema de la llama.

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

 // Rebote cálido sobre la superficie de la mesa (zona cohete).
 const deskBounceLight = new THREE.PointLight("#ff9a60", 0.8, 1.9, 2.6);
 deskBounceLight.position.set(-3.5, 2.65, -1.65);
 scene.add(deskBounceLight);

 // ── deskBounceLightR — rebote sutil sobre la mesa, NO sobre la silla.
 //    Baja intensidad (0.55 → 0.3), color menos saturado, distance corta,
 //    Y elevada para que caiga sobre mesa, no sobre silla. Se siente como
 //    rebote de mesa, no como luz artificial.
 const deskBounceLightR = new THREE.PointLight("#e69165", 0.3, 1.8, 3.0);
 deskBounceLightR.position.set(-0.4, 2.75, -1.4);
 scene.add(deskBounceLightR);

 // ── rightWallFill — llena pared derecha sin pegar al respaldo de la silla.
 //    X +5.0, Y alta → trabaja sobre la pared. Intensidad muy baja.
 const rightWallFill = new THREE.PointLight("#c97a4a", 0.22, 5.5, 2.4);
 rightWallFill.position.set(5.0, 4.4, -2.4);
 scene.add(rightWallFill);

 // ════════════════════════════════════════════════════════════════════════
 // WALL POSTER — retrato (Yo.png) + mini-about al click
 // ════════════════════════════════════════════════════════════════════════
 // Marco fino metálico + retrato tratado cinematográficamente + halo cálido
 // detrás + spot dedicado. La viñeta cálida del retrato dialoga con el
 // posterSpot naranja → la foto NO parece pegada, parece iluminada por la
 // luz que ya existe en la escena.
 //
 // Doble estado:
 //   - idle  → retrato (Yo.png) con viñeta cálida + nombre
 //   - click → mini-about (nombre, rol, manifiesto, firma)
 function createWallPoster() {
  const group = new THREE.Group();

  // ── HELPER: dibuja texto con tracking manual ─────────────────────────
  // (canvas no soporta letter-spacing CSS fiable — posicionamos letra a letra)
  const drawTrackedText = (ctx, text, cx, cy, tracking) => {
   const widths = text.split("").map((c) => ctx.measureText(c).width);
   const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
   let x = cx - total / 2;
   for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, cy);
    x += widths[i] + tracking;
   }
  };

  // ════════════════════════════════════════════════════════════════════
  // 1) CANVAS DEL RETRATO — Yo.png + viñeta cálida + nombre inferior
  // ════════════════════════════════════════════════════════════════════
  // Resolución 768×1024 (mismo ratio del marco 1.04×1.34).
  // La foto se carga async: hasta que llega, mostramos un fondo neutro
  // con el nombre — el cuadro nunca aparece "vacío" o roto.
  const portraitCanvas = document.createElement("canvas");
  portraitCanvas.width = 768;
  portraitCanvas.height = 1024;
  const pctx = portraitCanvas.getContext("2d");

  // ── Helper: pinta el fondo (se reutiliza al cargar la foto) ──────────
  const paintPortraitBackground = () => {
   const bg = pctx.createLinearGradient(0, 0, 0, 1024);
   bg.addColorStop(0, "#070a14");
   bg.addColorStop(0.6, "#0c1020");
   bg.addColorStop(1, "#08080f");
   pctx.fillStyle = bg;
   pctx.fillRect(0, 0, 768, 1024);
  };

  // ── Helper: pinta los overlays cinematográficos sobre la foto ────────
  // Estos overlays son los que "casan" el retrato con el posterSpot:
  //   - Viñeta cálida (screen) → como si la luz naranja entrara por arriba-izq
  //   - Viñeta oscura radial → enfoca la mirada al centro, mata esquinas
  //   - Banda inferior con nombre + tagline (pista de clickable)
  const paintPortraitOverlays = () => {
   // Viñeta cálida — el spot naranja "cae" sobre el retrato
   pctx.globalCompositeOperation = "screen";
   const warm = pctx.createRadialGradient(220, 220, 40, 384, 512, 720);
   warm.addColorStop(0, "rgba(255,150,80,0.28)");
   warm.addColorStop(0.4, "rgba(255,120,60,0.10)");
   warm.addColorStop(1, "rgba(255,90,40,0)");
   pctx.fillStyle = warm;
   pctx.fillRect(0, 0, 768, 1024);
   pctx.globalCompositeOperation = "source-over";

   // Viñeta oscura perimetral — look "cine"
   const vignette = pctx.createRadialGradient(384, 512, 280, 384, 512, 620);
   vignette.addColorStop(0, "rgba(0,0,0,0)");
   vignette.addColorStop(1, "rgba(0,0,0,0.55)");
   pctx.fillStyle = vignette;
   pctx.fillRect(0, 0, 768, 1024);

   // Banda inferior — degradado muy sutil, solo lo justo para legibilidad del hint
   const stripGrad = pctx.createLinearGradient(0, 900, 0, 1024);
   stripGrad.addColorStop(0, "rgba(0,0,0,0)");
   stripGrad.addColorStop(1, "rgba(0,0,0,0.55)");
   pctx.fillStyle = stripGrad;
   pctx.fillRect(0, 900, 768, 124);

   // Hint sutil de que el cuadro es clicable — sin nombre, deja a la foto respirar
   pctx.font = "500 20px 'Helvetica Neue', Arial, sans-serif";
   pctx.textAlign = "left";
   pctx.textBaseline = "alphabetic";
   pctx.shadowColor = "rgba(255,170,90,0.45)";
   pctx.shadowBlur = 14;
   pctx.fillStyle = "rgba(220,205,185,0.78)";
   drawTrackedText(pctx, "HAZ CLICK PARA CONOCERME", 384, 980, 5);
   pctx.shadowBlur = 0;
  };

  // Pintado inicial (sin foto todavía) — el cuadro YA tiene presencia
  paintPortraitBackground();
  paintPortraitOverlays();

  const posterTex = new THREE.CanvasTexture(portraitCanvas);
  posterTex.colorSpace = THREE.SRGBColorSpace;
  posterTex.anisotropy = 8;
  posterTex.needsUpdate = true;

  // ── Cargar Yo.png y repintar encima ─────────────────────────────────
  // Usamos ImageLoader (no TextureLoader) porque queremos la <img> para
  // poder hacer drawImage con recorte tipo "object-fit: cover".
  // Enganchado al loadingManager → entra en la barra de carga global.
  const photoLoader = new THREE.ImageLoader(loadingManager);
  photoLoader.setCrossOrigin("anonymous");
  photoLoader.load(
   "/images/Yo.png",
   (img) => {
    paintPortraitBackground();

    // "object-fit: cover" manual: ajusta al canvas 768×1024 sin deformar
    const targetRatio = 768 / 1024;
    const imgRatio = img.width / img.height;
    let sx, sy, sw, sh;
    if (imgRatio > targetRatio) {
     // Imagen más ancha que el marco: recortamos lados
     sh = img.height;
     sw = sh * targetRatio;
     sx = (img.width - sw) * 0.5;
     sy = 0;
    } else {
     // Imagen más alta: recortamos arriba/abajo, favoreciendo la cara
     sw = img.width;
     sh = sw / targetRatio;
     sx = 0;
     // Factor 0.35 = encuadre ligeramente alto → muestra más cara que torso.
     // Subir → baja el encuadre (más cabeza). Bajar → lo sube (más torso).
     sy = Math.max(0, (img.height - sh) * 0.35);
    }
    pctx.drawImage(img, sx, sy, sw, sh, 0, 0, 768, 1024);

    // Overlays POR ENCIMA de la foto
    paintPortraitOverlays();

    posterTex.needsUpdate = true;
    requestRender();
   },
   undefined,
   () => {
    // Fallback silencioso — el cuadro mantiene fondo + nombre
    console.warn("[wallPoster] No se pudo cargar /images/Yo.png");
   },
  );

  // ════════════════════════════════════════════════════════════════════
  // 2) CANVAS DEL MINI-ABOUT — se muestra tras el click
  // ════════════════════════════════════════════════════════════════════
  // Mantiene el lenguaje visual del eclipse (anillo cálido en cabecera)
  // para que NO se sienta como un cuadro diferente, sino como el mismo
  // cuadro contando otra cosa.
  const aboutCanvas = document.createElement("canvas");
  aboutCanvas.width = 768;
  aboutCanvas.height = 1024;
  const actx = aboutCanvas.getContext("2d");

  // Cielo sobrio
  const aSky = actx.createLinearGradient(0, 0, 0, 1024);
  aSky.addColorStop(0, "#070a14");
  aSky.addColorStop(0.5, "#0e1422");
  aSky.addColorStop(1, "#0a0d14");
  actx.fillStyle = aSky;
  actx.fillRect(0, 0, 768, 1024);

  // Polvo estelar tenue
  for (let i = 0; i < 120; i++) {
   const x = Math.random() * 768;
   const y = Math.random() * 1024;
   const s = Math.random() * 1.2 + 0.3;
   const a = Math.random() * 0.4 + 0.1;
   actx.fillStyle = `rgba(255,255,255,${a})`;
   actx.fillRect(x, y, s, s);
  }

  // Anillo del eclipse en la cabecera — firma visual del cuadro
  // Compacto y arriba: deja respirar todo el espacio para el texto
  const cx = 384;
  const aRingGrad = actx.createRadialGradient(cx, 165, 50, cx, 165, 95);
  aRingGrad.addColorStop(0.5, "rgba(255,170,90,0)");
  aRingGrad.addColorStop(0.85, "rgba(255,160,80,0.45)");
  aRingGrad.addColorStop(1, "rgba(255,150,70,0)");
  actx.fillStyle = aRingGrad;
  actx.beginPath();
  actx.arc(cx, 165, 95, 0, Math.PI * 2);
  actx.fill();

  // Nombre grande con glow cálido
  actx.font = "600 50px 'Helvetica Neue', Arial, sans-serif";
  actx.textAlign = "left";
  actx.fillStyle = "rgba(245,232,212,0.97)";
  actx.shadowColor = "rgba(255,170,90,0.4)";
  actx.shadowBlur = 16;
  drawTrackedText(actx, "DAVID LLONA", 384, 360, 7);
  actx.shadowBlur = 0;

  // Rol — en cálido apagado, debajo del nombre
  actx.font = "500 22px 'Helvetica Neue', Arial, sans-serif";
  actx.fillStyle = "rgba(255,170,95,0.82)";
  drawTrackedText(actx, "DESARROLLADOR  ·  3D  ·  WEB", 384, 405, 5);

  // Separador minimalista — línea cálida bajo el rol
  actx.fillStyle = "rgba(255,170,90,0.35)";
  actx.fillRect(cx - 40, 425, 80, 1);

  // Cuerpo — manifiesto personal en dos bloques
  // Bloque 1: lo que hago (presente)
  actx.font = "400 28px 'Helvetica Neue', Arial, sans-serif";
  actx.textAlign = "center";
  actx.fillStyle = "rgba(230,220,205,0.95)";
  const block1 = ["Construyo experiencias web", "donde la luz, el espacio", "y el código trabajan juntos."];
  block1.forEach((l, i) => {
   actx.fillText(l, 384, 490 + i * 42);
  });

  // Bloque 2: manifiesto (poético, en cursiva visual con peso ligero)
  actx.font = "italic 400 24px 'Helvetica Neue', Arial, sans-serif";
  actx.fillStyle = "rgba(220,200,180,0.78)";
  const block2 = ["Cada proyecto es un ensayo", "del siguiente.", "Cada error, una iteración."];
  block2.forEach((l, i) => {
   actx.fillText(l, 384, 680 + i * 36);
  });

  // Firma — discreta, alineada a la derecha como un autógrafo
  actx.font = "500 18px 'Helvetica Neue', Arial, sans-serif";
  actx.textAlign = "right";
  actx.fillStyle = "rgba(255,170,95,0.6)";
  drawTrackedText(actx, "— D.L.", 540, 830, 4);

  // Hint de cierre — justo bajo la firma, centrado.
  // Se sube respecto al borde inferior del canvas para que NO se pise
  // visualmente con el hint HTML "DESLIZA PARA COMENZAR" del Hero, que
  // queda fijo al borde inferior del viewport.
  actx.font = "500 16px 'Helvetica Neue', Arial, sans-serif";
  actx.textAlign = "center";
  actx.fillStyle = "rgba(200,185,165,0.55)";
  drawTrackedText(actx, "HAZ CLICK FUERA PARA CERRAR", 384, 895, 4);

  const manifestoTex = new THREE.CanvasTexture(aboutCanvas);
  manifestoTex.colorSpace = THREE.SRGBColorSpace;
  manifestoTex.anisotropy = 8;
  manifestoTex.needsUpdate = true;

  // ════════════════════════════════════════════════════════════════════
  // 3) HALO / BACKLIGHT — cálido detrás del marco
  // ════════════════════════════════════════════════════════════════════
  const haloCanvas = document.createElement("canvas");
  haloCanvas.width = haloCanvas.height = 256;
  const hctx = haloCanvas.getContext("2d");
  const hGrad = hctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  hGrad.addColorStop(0, "rgba(255,150,80,0.32)");
  hGrad.addColorStop(0.35, "rgba(255,130,70,0.15)");
  hGrad.addColorStop(1, "rgba(255,120,60,0)");
  hctx.fillStyle = hGrad;
  hctx.fillRect(0, 0, 256, 256);
  const haloTex = new THREE.CanvasTexture(haloCanvas);
  haloTex.needsUpdate = true;

  const haloMat = new THREE.MeshBasicMaterial({
   map: haloTex,
   transparent: true,
   opacity: 0.4,
   blending: THREE.AdditiveBlending,
   depthWrite: false,
   toneMapped: false,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.3), haloMat);
  halo.position.z = -0.05;
  group.add(halo);

  // ════════════════════════════════════════════════════════════════════
  // 4) MARCO con PROFUNDIDAD — BoxGeometry, no Plane
  // ════════════════════════════════════════════════════════════════════
  // Las aristas laterales + superior atrapan la luz del posterSpot →
  // se ve el marco como un objeto físico, no como un color plano.
  const frameMat = new THREE.MeshStandardMaterial({
   color: "#18181f",
   roughness: 0.32,
   metalness: 0.65,
   emissive: new THREE.Color("#1f1208"),
   emissiveIntensity: 0.3,
  });
  const frameGeo = new THREE.BoxGeometry(1.14, 1.44, 0.04);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.z = 0;
  group.add(frame);

  // ════════════════════════════════════════════════════════════════════
  // 5) MOUNT INTERIOR — passe-partout entre marco y poster
  // ════════════════════════════════════════════════════════════════════
  const mountMat = new THREE.MeshStandardMaterial({
   color: "#262230",
   roughness: 0.8,
   metalness: 0,
  });
  const mount = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.38), mountMat);
  mount.position.z = 0.021;
  group.add(mount);

  // ════════════════════════════════════════════════════════════════════
  // 6) PÓSTER — encima del mount, con emissive sutil
  // ════════════════════════════════════════════════════════════════════
  const posterMat = new THREE.MeshStandardMaterial({
   map: posterTex,
   roughness: 0.85,
   metalness: 0,
   emissiveMap: posterTex,
   emissive: new THREE.Color("#ffffff"),
   emissiveIntensity: 0.2,
  });
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.34), posterMat);
  poster.position.z = 0.023;
  poster.name = "wallPoster_clickable";
  group.add(poster);

  // ════════════════════════════════════════════════════════════════════
  // 7) ESTADO + UPDATE METHOD
  // ════════════════════════════════════════════════════════════════════
  // Modos:
  //   - idle      → respiración sutil + retrato visible (Yo.png)
  //   - opening   → flash + swap textura a mini-about (~0.55s)
  //   - open      → mini-about visible, mantenido hasta cierre del usuario
  //   - closing   → flash de salida + swap a retrato (~0.55s)
  const state = {
   hover: 0,
   hoverTarget: 0,
   mode: "idle",
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
    // La textura YA se cambió en triggerOpen — aquí solo gestionamos el flash.
    // El flash emisivo tapa el cambio visual, así que el usuario percibe una
    // transición lumínica suave en vez de un "pop" de imagen.
    const k = Math.min(1, e / FLASH_DURATION);
    if (k < 0.36) {
     const k2 = k / 0.36;
     emissive = 0.2 + 1.8 * k2;
     haloOpacity = 0.35 + 0.55 * k2;
     spotBoost = 1.2 * k2;
    } else {
     const k2 = (k - 0.36) / 0.64;
     emissive = 2.0 - 1.55 * k2;
     haloOpacity = 0.9 - 0.5 * k2;
     spotBoost = 1.2 - 0.9 * k2;
    }
    if (k >= 1) state.mode = "open";
   } else if (state.mode === "open") {
    // Mini-about visible — mantenemos un emissive medio para que el texto
    // se lea con presencia incluso si la habitación está oscurecida.
    emissive = 0.55;
    haloOpacity = 0.45;
    spotBoost = 0.4;
   } else if (state.mode === "closing") {
    // El swap de vuelta a la foto se hizo en triggerClose — solo flash.
    const k = Math.min(1, e / FLASH_DURATION);
    if (k < 0.36) {
     const k2 = k / 0.36;
     emissive = 0.55 + 1.45 * k2;
     haloOpacity = 0.45 + 0.45 * k2;
     spotBoost = 0.4 + 0.8 * k2;
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

  // ── triggerOpen: SWAP INMEDIATO ─────────────────────────────────────────
  // Cambiamos la textura aquí (no en el update) para garantizar que el
  // mini-about se ve sí o sí en cuanto empieza la animación de cámara.
  // El flash emisivo del update tapa la transición visualmente.
  group.userData.triggerOpen = (t) => {
   if (state.mode !== "idle") return false;
   state.mode = "opening";
   state.modeStart = t;
   if (state.textureShowing === "poster") {
    posterMat.map = manifestoTex;
    posterMat.emissiveMap = manifestoTex;
    posterMat.needsUpdate = true;
    state.textureShowing = "manifesto";
    requestRender();
   }
   return true;
  };

  // ── triggerClose: SWAP INMEDIATO de vuelta a la foto ────────────────────
  group.userData.triggerClose = (t) => {
   if (state.mode !== "open" && state.mode !== "opening") return false;
   state.mode = "closing";
   state.modeStart = t;
   if (state.textureShowing === "manifesto") {
    posterMat.map = posterTex;
    posterMat.emissiveMap = posterTex;
    posterMat.needsUpdate = true;
    state.textureShowing = "poster";
    requestRender();
   }
   return true;
  };

  group.userData.getMode = () => state.mode;

  group.userData.setHover = (on) => {
   state.hoverTarget = on ? 1 : 0;
  };

  return group;
 }

 // ════════════════════════════════════════════════════════════════════════
 // POSTER + SPOT — solo desktop
 // ════════════════════════════════════════════════════════════════════════
 // En móvil saltamos esto entero. Ahorra:
 //   - 2 × CanvasTexture 768×1024 = ~8 MB VRAM
 //   - 6 × CanvasTexture pequeñas (halo, marco, etc) = ~1 MB VRAM
 //   - 1 SpotLight extra (con sus cálculos por frame)
 //   - El raycaster del poster (listeners pointermove/pointerdown)
 //
 // Las variables se quedan a null. El update() y dispose() de abajo
 // tienen guardas para no tocarlas en móvil.
 let wallPoster = null;
 let posterSpot = null;

 if (!isMobile) {
  wallPoster = createWallPoster();
  wallPoster.position.set(4.0, 4.6, -3.94);
  scene.add(wallPoster);

  // ── SpotLight cálido dedicado — resalta solo el póster ──────────────────
  // Distance corta + decay medio → no moja la pared entera.
  // Penumbra alta → borde de luz orgánico, no un haz duro.
  posterSpot = new THREE.SpotLight(
   "#ff9a55", // familia cálida del warmLight del cohete
   2.2,
   3.0,
   Math.PI * 0.24, // angle ~43° (abierto pero no flood)
   0.75, // penumbra alta → borde suave
   1.5, // decay
  );
  posterSpot.position.set(2.8, 5.8, -2.8);
  posterSpot.target.position.set(4.0, 4.6, -3.94);
  scene.add(posterSpot);
  scene.add(posterSpot.target);
 }

 // ════════════════════════════════════════════════════════════════════════
 // RAYCAST — pointer hover y click sobre el poster (solo desktop)
 // ════════════════════════════════════════════════════════════════════════
 // En móvil no hay poster que clickar — los listeners no se registran
 // y ahorramos los handlers + estado del raycaster.
 //
 // El sistema cameraFocus vive en heroScene. Aquí solo detectamos clicks
 // y los notificamos vía callbacks (onPosterFocusEnter / onPosterFocusExit).
 const clickRaycaster = new THREE.Raycaster();
 const clickPointer = new THREE.Vector2();
 let posterRoomFade = 1; // actualizado desde update()

 const _updateClickPointer = (event) => {
  const rect = canvas.getBoundingClientRect();
  clickPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  clickPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
 };

 const _hitsPoster = () => {
  if (!wallPoster) return false;
  if (posterRoomFade < 0.2) return false;
  clickRaycaster.setFromCamera(clickPointer, camera);
  return clickRaycaster.intersectObject(wallPoster.userData.poster, false).length > 0;
 };

 const onScenePointerMove = (event) => {
  if (!wallPoster) return;
  if (isCameraFocusActive && isCameraFocusActive()) return;
  _updateClickPointer(event);
  const hit = _hitsPoster();
  wallPoster.userData.setHover(hit);
  canvas.style.cursor = hit ? "pointer" : "";
 };

 const onScenePointerDown = (event) => {
  if (!wallPoster) return;
  const now = clock.getElapsedTime();

  // Si hay focus activo → cualquier click cierra. El orquestador internamente
  // gestiona triggerClose del poster vía onPosterFocusExit.
  if (isCameraFocusActive && isCameraFocusActive()) {
   if (onPosterFocusExit) onPosterFocusExit(now);
   canvas.style.cursor = "";
   return;
  }

  _updateClickPointer(event);

  if (_hitsPoster()) {
   if (wallPoster.userData.triggerOpen(now)) {
    if (onPosterFocusEnter) onPosterFocusEnter(now);
    window.dispatchEvent(new CustomEvent("hero-poster:click", { detail: { time: now } }));
   }
  }
 };

 const onSceneKeyDown = (event) => {
  if (event.key !== "Escape") return;
  if (!isCameraFocusActive || !isCameraFocusActive()) return;
  if (onPosterFocusExit) onPosterFocusExit(clock.getElapsedTime());
 };

 // Solo registramos los listeners en desktop. En móvil no hay nada que
 // clickar y los eventos pointermove pueden además interferir con el
 // scroll-driven natural.
 if (!isMobile) {
  canvas.addEventListener("pointermove", onScenePointerMove);
  canvas.addEventListener("pointerdown", onScenePointerDown);
  window.addEventListener("keydown", onSceneKeyDown);
 }

 // ════════════════════════════════════════════════════════════════════════
 // UPDATE — tick de la habitación: estrellas + luces + poster
 // ════════════════════════════════════════════════════════════════════════
 // Recibe roomFade del orquestador (calculado en heroScene a partir del scroll).
 // lightMultipliers son los multiplicadores GUI editables.
 function update({ elapsedTime, roomFade, lightMultipliers, isMobile }) {
  // Estrellas internas — rotación lenta cuando estamos en habitación
  if (starsPoints && !isMobile) {
   starsPoints.rotation.z = elapsedTime * 0.003;
  }

  // Luces interiores — todas escaladas por roomFade (se apagan al salir)
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

  // Poster — el raycast usa esto para bloquear hover cuando estamos fuera
  posterRoomFade = roomFade;
  // En móvil no hay poster — saltamos update y mantenemos posterSpot a null.
  if (wallPoster && posterSpot) {
   const posterSpotIntensity = wallPoster.userData.update(elapsedTime, roomFade);
   posterSpot.intensity = posterSpotIntensity * roomFade;
  }
 }

 // ════════════════════════════════════════════════════════════════════════
 // DISPOSE — limpieza completa de la habitación
 // ════════════════════════════════════════════════════════════════════════
 function dispose() {
  // Listeners de raycast — solo se registraron en desktop.
  if (!isMobile) {
   canvas.removeEventListener("pointermove", onScenePointerMove);
   canvas.removeEventListener("pointerdown", onScenePointerDown);
   window.removeEventListener("keydown", onSceneKeyDown);
  }

  // Estrellas internas
  if (starsPoints) {
   spaceGroup.remove(starsPoints);
   if (starsGeometry) starsGeometry.dispose();
   if (starsMaterial) starsMaterial.dispose();
  }

  // Poster — texturas + materiales + meshes (solo si se creó)
  if (wallPoster) {
   wallPoster.userData.textures.forEach((t) => t && t.dispose && t.dispose());
   wallPoster.userData.materials.forEach((m) => m && m.dispose && m.dispose());
   wallPoster.traverse((c) => {
    if (c.isMesh && c.geometry) c.geometry.dispose();
   });
   scene.remove(wallPoster);
  }
  if (posterSpot) {
   scene.remove(posterSpot);
   scene.remove(posterSpot.target);
  }

  // Luces interiores
  scene.remove(ambientLight);
  scene.remove(moonLight);
  scene.remove(windowFillLight);
  scene.remove(fillLight);
  scene.remove(rimLight);
  scene.remove(moonAreaLight);
  scene.remove(backRimLight);
  scene.remove(ledUnderDesk);
  scene.remove(deskBounceLight);
  scene.remove(deskBounceLightR);
  scene.remove(rightWallFill);

  // Estructura
  scene.remove(floor);
  scene.remove(backWall);
  scene.remove(leftWallGroup);
  scene.remove(windowGroup);
  // (geometrías y materiales compartidos los dispone heroScene en su cleanup)
 }

 // ════════════════════════════════════════════════════════════════════════
 // SALIDA — solo lo que el orquestador o la GUI necesitan
 // ════════════════════════════════════════════════════════════════════════
 return {
  // Estructura — refs para que GUI o el resto puedan modificar
  windowParams,
  windowGroup,
  leftWallGroup,
  spaceGroup,
  starsPoints, // null inicialmente, asignado por buildStars
  floor,
  backWall,

  // Poster system — la GUI lee posición de wallPoster, intensity de posterSpot
  wallPoster,
  posterSpot,

  // Funciones para regenerar al cambiar params (GUI o resize)
  updateWindow,
  updateSpace,

  // Tick + cleanup
  update,
  dispose,
 };
}
