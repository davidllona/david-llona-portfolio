import * as THREE from "three";

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
 *   - Cuadro de pared "SIGUE CONSTRUYENDO" + manifiesto + spot dedicado
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
 // WALL POSTER — "SIGUE CONSTRUYENDO" + manifiesto
 // ════════════════════════════════════════════════════════════════════════
 // Póster decorativo en la pared derecha. Marco fino, imagen procedural
 // de eclipse, halo cálido detrás + spot dedicado. Motivo celeste:
 // dialoga con la luna de la ventana.
 function createWallPoster() {
  const group = new THREE.Group();

  // ── HELPER: dibuja texto con tracking manual (canvas no soporta
  // letter-spacing CSS fiable — hay que posicionar letra a letra).
  const drawTrackedText = (ctx, text, cx, cy, tracking) => {
   const widths = text.split("").map((c) => ctx.measureText(c).width);
   const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
   let x = cx - total / 2;
   for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, cy);
    x += widths[i] + tracking;
   }
  };

  // ── 1) CANVAS DEL PÓSTER — eclipse + montañas + "SIGUE CONSTRUYENDO" ────
  // Resolución alta (768×1024) para texto nítido al acercarse.
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

  // ── 2) CANVAS DEL MANIFIESTO — se muestra tras el click ────────────────
  // Mantiene el anillo apagado + texto del manifiesto.
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

  // ── 3) HALO / BACKLIGHT — cálido detrás del marco ──────────────────────
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

  // ── 4) MARCO con PROFUNDIDAD — BoxGeometry, no Plane ───────────────────
  // Las aristas laterales + superior atrapan la luz del posterSpot →
  // se ve el marco como un objeto físico, no como un color plano.
  const frameMat = new THREE.MeshStandardMaterial({
   color: "#18181f",
   roughness: 0.32,
   metalness: 0.65,
   emissive: new THREE.Color("#1f1208"),
   emissiveIntensity: 0.3, // tinte cálido residual del halo backlight
  });
  // Box delgado: 1.14 × 1.44 × 0.04 → aristas de 4cm que "capturan" luz
  const frameGeo = new THREE.BoxGeometry(1.14, 1.44, 0.04);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.z = 0;
  group.add(frame);

  // ── 5) MOUNT INTERIOR — passe-partout entre marco y poster ─────────────
  const mountMat = new THREE.MeshStandardMaterial({
   color: "#262230",
   roughness: 0.8,
   metalness: 0,
  });
  const mount = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.38), mountMat);
  mount.position.z = 0.021;
  group.add(mount);

  // ── 6) PÓSTER — encima del mount, con emissive sutil ───────────────────
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

  // ── 7) ESTADO + UPDATE METHOD ──────────────────────────────────────────
  // Modos:
  //   - idle      → respiración sutil siempre activa (pista visual)
  //   - opening   → flash + swap textura a manifiesto (~0.6s)
  //   - open      → manifiesto visible, mantenido hasta cierre del usuario
  //   - closing   → flash de salida + swap a poster (~0.6s)
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

 const wallPoster = createWallPoster();
 wallPoster.position.set(4.0, 4.6, -3.94);
 scene.add(wallPoster);

 // ── SpotLight cálido dedicado — resalta solo el póster ──────────────────
 // Distance corta + decay medio → no moja la pared entera.
 // Penumbra alta → borde de luz orgánico, no un haz duro.
 const posterSpot = new THREE.SpotLight(
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

 // ════════════════════════════════════════════════════════════════════════
 // RAYCAST — pointer hover y click sobre el poster
 // ════════════════════════════════════════════════════════════════════════
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
  if (posterRoomFade < 0.2) return false;
  clickRaycaster.setFromCamera(clickPointer, camera);
  return clickRaycaster.intersectObject(wallPoster.userData.poster, false).length > 0;
 };

 const onScenePointerMove = (event) => {
  if (isCameraFocusActive && isCameraFocusActive()) return;
  _updateClickPointer(event);
  const hit = _hitsPoster();
  wallPoster.userData.setHover(hit);
  canvas.style.cursor = hit ? "pointer" : "";
 };

 const onScenePointerDown = (event) => {
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

 canvas.addEventListener("pointermove", onScenePointerMove);
 canvas.addEventListener("pointerdown", onScenePointerDown);
 window.addEventListener("keydown", onSceneKeyDown);

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
  // Update visual + spotIntensity propuesto
  const posterSpotIntensity = wallPoster.userData.update(elapsedTime, roomFade);
  posterSpot.intensity = posterSpotIntensity * roomFade;
 }

 // ════════════════════════════════════════════════════════════════════════
 // DISPOSE — limpieza completa de la habitación
 // ════════════════════════════════════════════════════════════════════════
 function dispose() {
  // Listeners de raycast
  canvas.removeEventListener("pointermove", onScenePointerMove);
  canvas.removeEventListener("pointerdown", onScenePointerDown);
  window.removeEventListener("keydown", onSceneKeyDown);

  // Estrellas internas
  if (starsPoints) {
   spaceGroup.remove(starsPoints);
   if (starsGeometry) starsGeometry.dispose();
   if (starsMaterial) starsMaterial.dispose();
  }

  // Poster — texturas + materiales + meshes
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
