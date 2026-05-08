import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { easeIn3, easeOut3, easeIO3, clamp01, lerpV, phase } from "./math";
import { loadingManager } from "../loadingManager";

/**
 * buildExterior
 * ─────────────────────────────────────────────────────────────────────────
 * Construye toda la escena del exterior espacial vista a través de la
 * ventana del Hero: estrellas (4 capas), luna, nebula, viñeta, satélite,
 * asteroides, estrella fugaz, UFO con haz, claim narrativo y plano técnico.
 *
 * Filosofía: este módulo es propietario de TODOS sus objetos (los crea, los
 * añade a la escena, los actualiza en cada frame y los disposea en cleanup).
 * El orquestador (heroScene.js) solo pasa contexto de entrada y llama a
 * `update()` cada frame. Las referencias que devuelve son SOLO las que la
 * GUI necesita pinchar (params, refs y funciones update específicas).
 *
 * @param {object} ctx
 * @param {THREE.Scene} ctx.scene
 * @param {THREE.PerspectiveCamera} ctx.camera
 * @param {THREE.WebGLRenderer} ctx.renderer
 * @param {boolean} ctx.isMobile
 * @param {object} ctx.atmosphereParams  Objeto global. Solo se lee `.vignetteOpacity`.
 * @param {Function} ctx.requestRender   Para repintar fuera del tick (cambios de GUI).
 */
export function buildExterior({ scene, camera, renderer, isMobile, atmosphereParams, requestRender }) {
 // ════════════════════════════════════════════════════════════════════════
 // CENTRO DEL EXTERIOR
 // ════════════════════════════════════════════════════════════════════════
 const EXT_X = -12.0;
 const EXT_Y = 4.51;
 const EXT_Z = 0.55;

 // ════════════════════════════════════════════════════════════════════════
 // HELPER — makeTextCanvas (solo se usa en el exterior: claim halo + plano C)
 // ════════════════════════════════════════════════════════════════════════
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

 // ════════════════════════════════════════════════════════════════════════
 // ESTRELLAS EXTERIORES — 4 capas cromáticas con sprite circular real
 // ════════════════════════════════════════════════════════════════════════
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
  twinkleStrength: 0.3, // antes 0.15 — más vivo, sensación de "señal latente"
  parallaxSpeed: 1.25,

  // Capa A — lejana. Tamaño desktop +30% para que el fondo se sienta
  // realmente vasto en lugar de "limpio". En mobile ya estaba bien.
  aCount: isMobile ? 550 : 2200,
  aSize: isMobile ? 0.07 : 0.072,
  aOpacity: 0.78,
  aTint: "#b8cdff",

  // Capa B — media. +30% desktop.
  bCount: isMobile ? 140 : 550,
  bSize: isMobile ? 0.12 : 0.124,
  bOpacity: 0.9,
  bTint: "#e8efff",

  // Capa C — cercana (brillantes). +30% desktop.
  cCount: isMobile ? 22 : 90,
  cSize: isMobile ? 0.18 : 0.195,
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

 // ════════════════════════════════════════════════════════════════════════
 // LUNA EXTERIOR — textura real, fondo equilibrado
 // ════════════════════════════════════════════════════════════════════════
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

 const extMoonLoader = new THREE.TextureLoader(loadingManager);
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

 // ════════════════════════════════════════════════════════════════════════
 // FONDO NEBULAR — params + regeneración procedural
 // ════════════════════════════════════════════════════════════════════════
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

 // ════════════════════════════════════════════════════════════════════════
 // VIÑETA ESPACIAL — frame visual sutil
 // ════════════════════════════════════════════════════════════════════════
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

 // ════════════════════════════════════════════════════════════════════════
 // SATÉLITE MINIMAL — órbita elíptica detrás del claim
 // ════════════════════════════════════════════════════════════════════════
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

 // ════════════════════════════════════════════════════════════════════════
 // ASTEROIDES — añaden profundidad/parallax al exterior espacial
 // ════════════════════════════════════════════════════════════════════════
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

 // Asteroides desactivados por defecto. Sobre fondo negro y sin luz
 // direccional fuerte, se leían como manchas oscuras que distraían
 // de la composición principal (claim + UFO + luna). Se mantienen los
 // params y la geometría para reactivarlos desde el GUI si en el futuro
 // se añade iluminación que los justifique.
 const asteroidParams = {
  visible: false,
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

 // ════════════════════════════════════════════════════════════════════════
 // ESTRELLA FUGAZ — Estado: idle → active → idle. Período: 8–20s. Duración: ~0.85s.
 // ════════════════════════════════════════════════════════════════════════
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

 // ════════════════════════════════════════════════════════════════════════
 // UFO — scroll-driven, declarativo, sin timers
 // ════════════════════════════════════════════════════════════════════════
 //
 // El UFO ocupa el tramo sp 0.579 → 0.700 (dentro del plateau del claim).
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
 const UFO_SP_START = 0.579; // scroll en que entra (= 162vh / 280vh wrapper)
 const UFO_SP_END = 0.7; // scroll en que sale (= 196vh / 280vh wrapper)
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
 const ufoBeamShape = (() => {
  // Shape: triángulo con vértice en (0, 0.9) y base en (-0.8, -0.9) / (0.8, -0.9)
  // total alto: 1.8u, base: 1.6u — acotado al ancho del claim
  const s = new THREE.Shape();
  s.moveTo(0, 0.9); // vértice superior (apex, debajo del UFO)
  s.lineTo(-0.8, -0.9); // esquina inferior izquierda
  s.lineTo(0.8, -0.9); // esquina inferior derecha
  s.closePath();
  return s;
 })();

 const ufoBeamGeo = new THREE.ShapeGeometry(ufoBeamShape);

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
 // ufoOverlayOrange → "de otro planeta" (naranja → más naranja)
 //
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
 const ufoGLTFLoader = new GLTFLoader(loadingManager);
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

 // ════════════════════════════════════════════════════════════════════════
 // CLAIM — Halo + Plano A (texto) + Glow naranja
 // ════════════════════════════════════════════════════════════════════════

 // ── Halo detrás del claim ────────────────────────────────────────────────
 // Gradiente elíptico vertical (más alto que ancho) — sigue la forma
 // del bloque de texto, no un círculo. Negro puro, muy controlado.
 // No crea mancha visible: los bordes son completamente transparentes.
 const HALO_A_TEX = makeTextCanvas(360, 200, (ctx, w, h) => {
  // Gradiente elíptico: radio horizontal menor que vertical
  const rx = w * 0.42;
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
 //   scanInfl=0   → estado base
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
  // DESPUÉS
  const oc = hexToRgb(claimParams.orangeColor);
  // El escáner sube la luminosidad pero MUY suavemente — antes blanqueaba demasiado
  // y el naranja se leía como beige/crema. Ahora el texto siempre se lee naranja.
  const oG = Math.min(255, Math.round(oc.g + scanInfl * 16));
  const oB = Math.min(255, Math.round(oc.b + scanInfl * 18));
  const oA = 0.55 + scanInfl * 0.4;
  ctx.font = `700 68px ${SANS}`;
  ctx.shadowColor = `rgba(${oc.r},${oc.g},${oc.b},${oA.toFixed(2)})`;
  // Halo más contenido: 16-30px en vez de 28-60px → el relleno manda, no el shadow
  ctx.shadowBlur = 16 + scanInfl * 14;
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
 PLANE_A_TEX.colorSpace = THREE.SRGBColorSpace; // ← clave: el canvas dibuja en sRGB, declárselo
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
  toneMapped: false,
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

 // ════════════════════════════════════════════════════════════════════════
 // PLANO C — Texto técnico / señal (todo en español)
 // ════════════════════════════════════════════════════════════════════════
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

 // ════════════════════════════════════════════════════════════════════════
 // UPDATE — bloque del tick (recibe sp + elapsedTime + F4S del orquestador)
 // ════════════════════════════════════════════════════════════════════════
 //
 // Fases del cosmos (todas en escala [0..1] del wrapper de 380vh).
 // La conversión desde la escala antigua (scrollY/vh) es: dividir por 2.80
 // (= rango real del wrapper = 380vh - 100vh sticky). Los valores que en
 // la escala antigua superaban 2.80 (es decir, ocurrían "después" del Hero,
 // ya en Projects) se cap a 1.000 → su efecto se completa al final del Hero.
 //
 //   CLAIM:    fade-in 0.536 → 0.636,   fade-out 0.707 → 0.786
 //   UFO:      0.579 → 0.700 (constantes UFO_SP_START/END arriba)
 //   EXT:      fade-in F4S → 0.536,    fade-out 0.921 → 1.000
 //   TECH:     fade-in 0.786 → 0.879,  fade-out 0.946 → 1.000
 //
 const CLAIM_FI_S = 0.536;
 const CLAIM_FI_E = 0.636;
 const CLAIM_FO_S = 0.707;
 const CLAIM_FO_E = 0.786;
 const EXT_FI_E = 0.536; // = F4E
 const EXT_FO_S = 0.921;
 const EXT_FO_E = 1.0; // capeado al final del wrapper
 const TECH_FI_S = 0.786;
 const TECH_FI_E = 0.879;
 const TECH_FO_S = 0.946;
 const TECH_FO_E = 1.0; // capeado al final del wrapper

 function update({ sp, elapsedTime, F4S }) {
  // ── Claim opacity — calculado aquí para que el bloque UFO pueda usarlo ──
  const claimFI = easeOut3(phase(sp, CLAIM_FI_S, CLAIM_FI_E));
  const claimFO = easeIn3(phase(sp, CLAIM_FO_S, CLAIM_FO_E));
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
   const extFI = easeOut3(phase(sp, F4S, EXT_FI_E));
   const extFO = easeIn3(phase(sp, EXT_FO_S, EXT_FO_E));
   const extBase = clamp01(extFI * (1 - extFO));

   // ── Respiración estelar muy sutil — seno lento, sin flicker ─────────────
   // Cada capa respira a frecuencia ligeramente distinta → sensación orgánica
   const breathA = 1.0 + Math.sin(elapsedTime * 0.18) * 0.04;
   const breathB = 1.0 + Math.sin(elapsedTime * 0.24 + 1.2) * 0.05;
   const breathC = 1.0 + Math.sin(elapsedTime * 0.31 + 2.4) * 0.06;

   // ── Parallax real — cada capa rota a velocidad diferente ────────────────
   if (!isMobile) {
    const ps = starsParams.parallaxSpeed;
    extStarsPoints.rotation.y = elapsedTime * 0.0018 * ps;
    extStarsPoints.rotation.x = elapsedTime * 0.0006 * ps;
    extStarsBPoints.rotation.y = elapsedTime * 0.0032 * ps;
    extStarsBPoints.rotation.x = elapsedTime * 0.0012 * ps;
    extStarsCPoints.rotation.y = elapsedTime * 0.0038 * ps;
    extStarsCPoints.rotation.x = elapsedTime * 0.0014 * ps;
    extStarsDPoints.rotation.y = elapsedTime * 0.0055 * ps;
    extStarsDPoints.rotation.x = elapsedTime * 0.002 * ps;
   }

   // ── Actualizar uniforms del shader de estrellas ────────────────────────
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

   // ── Nebula de fondo ─────────────────────────────────────────────────────
   nebulaMesh.visible = nebulaParams.visible;
   nebulaMat.opacity = extBase * nebulaParams.opacity;

   // ── Viñeta — sigue la cámara, fade-in suave con el exterior ──────────────
   vignetteMesh.position.set(camera.position.x - 0.5, camera.position.y, camera.position.z);
   vignetteMesh.rotation.y = Math.PI * 0.5;
   vignetteMat.opacity = extBase * atmosphereParams.vignetteOpacity;

   // ── Luna ───────────────────────────────────────────────────────────────
   extMoon.visible = moonParams.visible && inExterior;
   extMoonMat.opacity = extBase * moonParams.opacity;
   extMoonLight.intensity = extBase * 0.2 * moonParams.lightIntensity;

   // ── Satélite orbital ────────────────────────────────────────────────────
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
    ufoGroup.position.set(UFO_X + ufoParams.xOffset, ufoY + ufoParams.yOffset, ufoZ);
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

  // ── Pulso de aparición — "señal sintonizándose" ──────────────────────────
  // Cuando el claim entra (claimFI sube de 0 a 1), aplicamos un boost
  // temporal de halo + glow + scale que sobrepasa el plateau y se asienta.
  // El efecto vive solo durante el fade-in (claimFI < 1) — una vez asentado
  // el claim, el pulso desaparece y queda el estado normal.
  //
  // Curva: peak en claimFI = 0.4 (cuando el texto está medio formado),
  // fade a 0 en claimFI = 1.0 (asentado).
  const tunePulse =
   claimFI > 0 && claimFI < 1
    ? Math.sin(claimFI * Math.PI) // 0 → 1 → 0 a lo largo del fade-in
    : 0;

  // Texto — opacidad normal, sin boost (el "evento" está en halo/scale/glow)
  extPlaneAMat.opacity = claimOp * claimVisMult;

  // Halo elíptico de fondo — durante el pulso entra al 1.5x de intensidad
  const haloBoost = 1.0 + tunePulse * 0.5;
  extPlaneHaloMat.opacity = claimOp * 0.62 * claimVisMult * claimParams.haloOpacityMult * haloBoost;

  // Scale con overshoot sutil: el claim "rebota" al sintonizar.
  //   - sin pulso: 0.95 → 1.0 (entrada lineal)
  //   - con pulso: 0.95 → 1.06 (peak) → 1.0 (asentado)
  // El extra de 0.06 en el peak es lo que se siente como "click" de señal.
  const scaleOvershoot = tunePulse * 0.06;
  const claimScaleAnim = (lerpV(0.95, 1.0, claimFI) + scaleOvershoot) * claimParams.scale;
  extPlaneA.scale.setScalar(claimScaleAnim);
  extPlaneHalo.scale.setScalar(claimScaleAnim);
  extGlowPlane.scale.setScalar(claimScaleAnim);

  // Glow naranja vivo — pulso normal modulado por claimParams.glowIntensity,
  // potenciado durante el momento de sintonización (boost x2.5 en el peak).
  if (claimOp > 0.01 && claimParams.visible) {
   const glowPulse = 0.025 + Math.sin(elapsedTime * 0.55) * 0.013;
   const glowTuneBoost = 1.0 + tunePulse * 1.5; // peak: x2.5, asentado: x1
   extGlowMat.opacity = claimOp * glowPulse * claimParams.glowIntensity * claimParams.opacityMult * glowTuneBoost;
  } else {
   extGlowMat.opacity = 0.0;
  }

  // ── Bloque C — Texto técnico (fade-in 0.786 → 0.879, fade-out 0.946 → 1.0) ──
  const techFI = easeOut3(phase(sp, TECH_FI_S, TECH_FI_E));
  const techFO = easeIn3(phase(sp, TECH_FO_S, TECH_FO_E));
  extPlaneCMat.opacity = clamp01(techFI * (1 - techFO));
 }

 // ════════════════════════════════════════════════════════════════════════
 // DISPOSE — limpieza completa de geometrías, materiales y texturas
 // ════════════════════════════════════════════════════════════════════════
 function dispose() {
  // Estrellas (4 capas)
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
  // Nebula
  nebulaGeo.dispose();
  if (nebulaMat.map) nebulaMat.map.dispose();
  nebulaMat.dispose();
  // Viñeta
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
  // Plano C
  extPlaneCGeo.dispose();
  if (extPlaneCMat.map) extPlaneCMat.map.dispose();
  extPlaneCMat.dispose();
 }

 // ════════════════════════════════════════════════════════════════════════
 // SALIDA — solo lo que el orquestador o la GUI necesitan
 // ════════════════════════════════════════════════════════════════════════
 return {
  // Constantes (la GUI las usa para rangos de luna/claim)
  EXT_X,
  EXT_Y,
  EXT_Z,

  // Params (para GUI)
  starsParams,
  moonParams,
  nebulaParams,
  ufoParams,
  claimParams,
  asteroidParams,

  // Objetos referenciados directamente desde GUI
  extMoon,
  nebulaMesh,

  // Funciones que la GUI invoca en onChange
  updateMoon,
  updateNebula,
  regenerateNebula,
  updateUfo,
  updateClaim,

  // Tick + cleanup
  update,
  dispose,
 };
}
