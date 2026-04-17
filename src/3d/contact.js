/**
 * contact.js — Escena Three.js para la sección de contacto
 *
 * Exporta: initContactScene(container, onBeaconReady)
 * Retorna: función cleanup()
 *
 * v5:
 *  · Huellas del astronauta sobre la superficie lunar
 *  · Luna con textura procedural de relieve + cráteres
 *  · Beacon con 3 halos + ground glow atmosférico
 *  · GUI expandida: beacon / astronauta / luna / atmósfera / huellas
 *  · Composición reequilibrada
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import GUI from "lil-gui";

// ─── Rutas editables ─────────────────────────────────────────────────────────
export const SCENE_CONFIG = {
 astronautPath: "modelos/astronauta.glb",
 moonTexturePath: "textures/moon.jpg", // opcional — si no existe usa textura procedural
 // beaconPath: "models/beacon.glb",
};

// ─── Helpers de textura ───────────────────────────────────────────────────────

function makeRadialTexture(innerColor, outerColor = "rgba(0,0,0,0)", size = 128) {
 const cv = document.createElement("canvas");
 cv.width = cv.height = size;
 const ctx = cv.getContext("2d");
 const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
 g.addColorStop(0, innerColor);
 g.addColorStop(0.35, innerColor.replace(/[\d.]+\)$/, "0.4)"));
 g.addColorStop(1, outerColor);
 ctx.fillStyle = g;
 ctx.fillRect(0, 0, size, size);
 return new THREE.CanvasTexture(cv);
}

function makeNebulaTexture(w = 512, h = 256) {
 const cv = document.createElement("canvas");
 cv.width = w;
 cv.height = h;
 const ctx = cv.getContext("2d");
 const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
 g.addColorStop(0, "rgba(80,100,200,0.13)");
 g.addColorStop(0.4, "rgba(50,60,160,0.07)");
 g.addColorStop(1, "rgba(0,0,0,0)");
 ctx.fillStyle = g;
 ctx.fillRect(0, 0, w, h);
 return new THREE.CanvasTexture(cv);
}

/** Textura procedural de luna: variación de color, cráteres y cresta iluminada */
function makeMoonProceduralTexture(size = 512) {
 const cv = document.createElement("canvas");
 cv.width = cv.height = size;
 const ctx = cv.getContext("2d");

 ctx.fillStyle = "#3a3a40";
 ctx.fillRect(0, 0, size, size);

 const seed = (n) => (((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1) + 1) % 1;

 // Manchas oscuras (maria)
 for (let i = 0; i < 22; i++) {
  const x = seed(i * 3) * size;
  const y = seed(i * 3 + 1) * size;
  const r = 12 + seed(i * 3 + 2) * 60;
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, `rgba(26,26,30,${0.05 + seed(i) * 0.12})`);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
 }

 // Cráteres: borde claro + interior oscuro
 for (let i = 0; i < 14; i++) {
  const cx = seed(i * 7) * size;
  const cy = seed(i * 7 + 1) * size;
  const cr = 3 + seed(i * 7 + 2) * 14;
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(180,180,195,${0.08 + seed(i) * 0.1})`;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 0.85);
  ig.addColorStop(0, `rgba(16,16,20,${0.07 + seed(i * 2) * 0.09})`);
  ig.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.fill();
 }

 // Cresta iluminada en el borde superior visible
 const topGrad = ctx.createLinearGradient(0, 0, 0, size * 0.38);
 topGrad.addColorStop(0, "rgba(160,165,185,0.15)");
 topGrad.addColorStop(1, "rgba(0,0,0,0)");
 ctx.fillStyle = topGrad;
 ctx.fillRect(0, 0, size, size * 0.38);

 return new THREE.CanvasTexture(cv);
}

/** Textura de huella de bota lunar */
function makeFootprintTexture() {
 const cv = document.createElement("canvas");
 cv.width = 64;
 cv.height = 96;
 const ctx = cv.getContext("2d");
 ctx.clearRect(0, 0, 64, 96);
 ctx.fillStyle = "rgba(10,10,12,0.78)";
 ctx.beginPath();
 ctx.ellipse(32, 54, 18, 30, 0, 0, Math.PI * 2);
 ctx.fill();
 ctx.beginPath();
 ctx.ellipse(32, 24, 13, 13, 0, 0, Math.PI * 2);
 ctx.fill();
 ctx.strokeStyle = "rgba(180,185,200,0.18)";
 ctx.lineWidth = 1;
 ctx.beginPath();
 ctx.ellipse(32, 54, 18, 30, 0, 0, Math.PI * 2);
 ctx.stroke();
 return new THREE.CanvasTexture(cv);
}

// ─── Función principal ────────────────────────────────────────────────────────
export function initContactScene(container, onBeaconReady) {
 if (!container) return () => {};

 const isMobile = window.innerWidth < 768;
 const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

 const Q = {
  antialias: !isMobile,
  dpr: Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5),
  starsSmall: isMobile ? 180 : isTablet ? 340 : 520,
  starsBright: isMobile ? 18 : isTablet ? 30 : 48,
  moonSegments: isMobile ? 40 : 64,
 };

 // ── Params del GUI ──────────────────────────────────────────────────────
 const P = {
  beaconX: 0.2,
  beaconY: 0.82,
  beaconZ: 0.05,
  glowIntensity: 2.7,
  pulseSpeed: 2.6,
  astroX: -0.55,
  astroY: 0.82,
  astroZ: 0.14,
  astroScale: 0.37,
  astroRotY: 0.13,
  moonY: -7.9,
  moonScale: 1.0,
  moonEmissive: 0.2,
  moonHaloOp: 1.0,
  starsOpacity: 0.65,
  starsDrift: 0.009,
  nebulaOpacity: 0.6,
  ambientInt: 0.1,
  rimInt: 0.55,
  footprintOp: 0.55,
 };

 // ── Scene ───────────────────────────────────────────────────────────────
 const scene = new THREE.Scene();
 scene.background = new THREE.Color("#010108");

 let W = container.offsetWidth || window.innerWidth;
 let H = container.offsetHeight || window.innerHeight;

 const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 120);
 camera.position.set(0, 1.5, 7.0);
 camera.lookAt(0, 0.3, 0);

 const renderer = new THREE.WebGLRenderer({
  antialias: Q.antialias,
  powerPreference: "high-performance",
  alpha: false,
  stencil: false,
  depth: true,
 });
 renderer.setSize(W, H);
 renderer.setPixelRatio(Q.dpr);
 renderer.outputColorSpace = THREE.SRGBColorSpace;
 renderer.shadowMap.enabled = false;
 container.appendChild(renderer.domElement);

 // ── Luces ───────────────────────────────────────────────────────────────
 const ambient = new THREE.AmbientLight("#ffffff", P.ambientInt);
 const rimLight = new THREE.DirectionalLight("#8aabdd", P.rimInt);
 const fillLight = new THREE.DirectionalLight("#2a2a4a", 0.28);
 rimLight.position.set(-4, 6, 1.5);
 fillLight.position.set(5, 2, 3);
 scene.add(ambient, rimLight, fillLight);

 const beaconPL = new THREE.PointLight("#ff7020", 0, 5.5, 1.6);
 beaconPL.position.set(P.beaconX, P.beaconY + 0.75, P.beaconZ);
 scene.add(beaconPL);

 // ── Nebulosa ────────────────────────────────────────────────────────────
 const nebulaTex = makeNebulaTexture(512, 256);
 const nebulaMat = new THREE.SpriteMaterial({
  map: nebulaTex,
  transparent: true,
  opacity: P.nebulaOpacity,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });
 const nebulaSprite = new THREE.Sprite(nebulaMat);
 nebulaSprite.scale.set(26, 13, 1);
 nebulaSprite.position.set(-1, 3, -18);
 scene.add(nebulaSprite);

 // ── Estrellas ───────────────────────────────────────────────────────────
 const starsGeoA = new THREE.BufferGeometry();
 const starsAPos = new Float32Array(Q.starsSmall * 3);
 for (let i = 0; i < Q.starsSmall; i++) {
  const r = 16 + Math.random() * 28;
  const t = Math.random() * Math.PI * 2;
  const p = Math.random() * Math.PI * 0.62;
  starsAPos[i * 3] = r * Math.sin(p) * Math.cos(t);
  starsAPos[i * 3 + 1] = r * Math.cos(p) + 2;
  starsAPos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t) - 6;
 }
 starsGeoA.setAttribute("position", new THREE.BufferAttribute(starsAPos, 3));
 const starsMatA = new THREE.PointsMaterial({
  color: "#c8d8ff",
  size: isMobile ? 0.03 : 0.038,
  sizeAttenuation: true,
  transparent: true,
  opacity: P.starsOpacity,
  depthWrite: false,
 });
 const starsA = new THREE.Points(starsGeoA, starsMatA);
 scene.add(starsA);

 const starsGeoB = new THREE.BufferGeometry();
 const starsBPos = new Float32Array(Q.starsBright * 3);
 for (let i = 0; i < Q.starsBright; i++) {
  const r = 14 + Math.random() * 20;
  const t = Math.random() * Math.PI * 2;
  const p = 0.05 + Math.random() * Math.PI * 0.5;
  starsBPos[i * 3] = r * Math.sin(p) * Math.cos(t);
  starsBPos[i * 3 + 1] = r * Math.cos(p) + 2;
  starsBPos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t) - 6;
 }
 starsGeoB.setAttribute("position", new THREE.BufferAttribute(starsBPos, 3));
 const starsMatB = new THREE.PointsMaterial({
  color: "#ffffff",
  size: isMobile ? 0.058 : 0.075,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
 });
 const starsB = new THREE.Points(starsGeoB, starsMatB);
 scene.add(starsB);

 // ── Luna ────────────────────────────────────────────────────────────────
 const moonGeo = new THREE.SphereGeometry(9.2, Q.moonSegments, Q.moonSegments);
 const moonProceduralTex = makeMoonProceduralTexture(512);
 const moonMat = new THREE.MeshStandardMaterial({
  map: moonProceduralTex,
  color: "#3c3c42",
  roughness: 0.92,
  metalness: 0,
  emissive: new THREE.Color("#1a1a30"),
  emissiveIntensity: P.moonEmissive,
 });
 new THREE.TextureLoader().load(
  SCENE_CONFIG.moonTexturePath,
  (tex) => {
   tex.colorSpace = THREE.SRGBColorSpace;
   moonMat.map = tex;
   moonMat.needsUpdate = true;
  },
  undefined,
  () => {},
 );
 const moon = new THREE.Mesh(moonGeo, moonMat);
 moon.position.set(0, P.moonY, 0);
 moon.scale.setScalar(P.moonScale);
 scene.add(moon);

 const moonHaloTex = makeRadialTexture("rgba(120,140,255,0.09)");
 const moonHaloMat = new THREE.SpriteMaterial({
  map: moonHaloTex,
  transparent: true,
  opacity: P.moonHaloOp,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });
 const moonHalo = new THREE.Sprite(moonHaloMat);
 moonHalo.scale.set(22, 22, 1);
 moonHalo.position.set(0, P.moonY, 0);
 scene.add(moonHalo);

 // ── Huellas ──────────────────────────────────────────────────────────────
 // 6 huellas en arco suave desde la izquierda hasta el beacon
 const fpTex = makeFootprintTexture();
 const MOON_R = 9.2;
 const MOON_CY = P.moonY;

 const STEPS = [
  [-1.6, 0.5],
  [-1.35, 0.38],
  [-1.08, 0.28],
  [-0.82, 0.22],
  [-0.58, 0.18],
  [-0.35, 0.14],
 ];

 const footprintMeshes = [];

 STEPS.forEach(([fx, fz], idx) => {
  const d2 = fx * fx + fz * fz;
  const surfY = MOON_CY + Math.sqrt(Math.max(0, MOON_R * MOON_R - d2));

  const geo = new THREE.PlaneGeometry(0.085, 0.125);
  const mat = new THREE.MeshBasicMaterial({
   map: fpTex,
   transparent: true,
   depthWrite: false,
   depthTest: true,
   side: THREE.FrontSide,
   blending: THREE.NormalBlending,
   opacity: (0.25 + (idx / STEPS.length) * 0.55) * P.footprintOp,
  });
  const mesh = new THREE.Mesh(geo, mat);

  mesh.position.set(fx, surfY + 0.005, fz);

  const normal = new THREE.Vector3(fx, surfY - MOON_CY, fz).normalize();
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

  const side = idx % 2 === 0 ? 1 : -1;
  mesh.translateX(side * 0.045);
  mesh.rotateZ((idx % 2 === 0 ? 0.12 : -0.12) + Math.PI * 0.05);

  scene.add(mesh);
  footprintMeshes.push({ mesh, mat, base: 0.25 + (idx / STEPS.length) * 0.55 });
 });

 // ── Beacon ───────────────────────────────────────────────────────────────
 const beaconGroup = new THREE.Group();
 const darkMetal = new THREE.MeshStandardMaterial({ color: "#1a1a1e", roughness: 0.75, metalness: 0.6 });
 const midMetal = new THREE.MeshStandardMaterial({ color: "#2c2c34", roughness: 0.65, metalness: 0.5 });

 const pedestalGeo = new THREE.CylinderGeometry(0.13, 0.155, 0.055, 6);
 const pedestalMesh = new THREE.Mesh(pedestalGeo, darkMetal);
 pedestalMesh.position.y = 0.028;
 beaconGroup.add(pedestalMesh);

 const transGeo = new THREE.CylinderGeometry(0.022, 0.1, 0.075, 8);
 const transMesh = new THREE.Mesh(transGeo, midMetal);
 transMesh.position.y = 0.055 + 0.038;
 beaconGroup.add(transMesh);

 const bodyGeo = new THREE.CylinderGeometry(0.016, 0.016, 1.05, 8);
 const bodyMesh = new THREE.Mesh(bodyGeo, darkMetal);
 bodyMesh.position.y = 0.055 + 0.075 + 1.05 / 2;
 beaconGroup.add(bodyMesh);

 const ringAGeo = new THREE.TorusGeometry(0.048, 0.009, 6, 16);
 const ringAMesh = new THREE.Mesh(ringAGeo, midMetal);
 ringAMesh.position.y = 0.055 + 0.075 + 1.05 - 0.12;
 ringAMesh.rotation.x = Math.PI / 2;
 beaconGroup.add(ringAMesh);

 const ringBGeo = new THREE.TorusGeometry(0.036, 0.007, 6, 16);
 const ringBMesh = new THREE.Mesh(ringBGeo, midMetal);
 ringBMesh.position.y = 0.055 + 0.075 + 1.05 + 0.015;
 ringBMesh.rotation.x = Math.PI / 2;
 beaconGroup.add(ringBMesh);

 const lightBarGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.38, 8);
 const lightBarMat = new THREE.MeshBasicMaterial({ color: "#ff7020", transparent: true, opacity: 0 });
 const lightBarMesh = new THREE.Mesh(lightBarGeo, lightBarMat);
 const lightBarY = 0.055 + 0.075 + 1.05 + 0.035 + 0.38 / 2;
 lightBarMesh.position.y = lightBarY;
 beaconGroup.add(lightBarMesh);

 const capGeo = new THREE.CylinderGeometry(0.012, 0.022, 0.04, 8);
 const capMesh = new THREE.Mesh(capGeo, darkMetal);
 capMesh.position.y = lightBarY + 0.38 / 2 + 0.02;
 beaconGroup.add(capMesh);

 // Halo 1 — foco naranja concentrado
 const haloTex = makeRadialTexture("rgba(255,112,32,0.95)", "rgba(0,0,0,0)", 96);
 const haloMat = new THREE.SpriteMaterial({
  map: haloTex,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });
 const haloSpr = new THREE.Sprite(haloMat);
 haloSpr.scale.set(0.5, 0.5, 1);
 haloSpr.position.y = lightBarY;
 beaconGroup.add(haloSpr);

 // Halo 2 — difuso medio
 const haloTex2 = makeRadialTexture("rgba(255,80,10,0.32)", "rgba(0,0,0,0)", 128);
 const haloMat2 = new THREE.SpriteMaterial({
  map: haloTex2,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });
 const haloSpr2 = new THREE.Sprite(haloMat2);
 haloSpr2.scale.set(1.1, 1.1, 1);
 haloSpr2.position.y = lightBarY;
 beaconGroup.add(haloSpr2);

 // Halo 3 — corona atmosférica muy difusa
 const haloTex3 = makeRadialTexture("rgba(255,55,0,0.14)", "rgba(0,0,0,0)", 192);
 const haloMat3 = new THREE.SpriteMaterial({
  map: haloTex3,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });
 const haloSpr3 = new THREE.Sprite(haloMat3);
 haloSpr3.scale.set(2.2, 2.2, 1);
 haloSpr3.position.y = lightBarY * 0.55;
 beaconGroup.add(haloSpr3);

 // Ground glow — mancha en la superficie de la luna
 const groundGlowTex = makeRadialTexture("rgba(255,100,20,0.22)", "rgba(0,0,0,0)", 128);
 const groundGlowMat = new THREE.SpriteMaterial({
  map: groundGlowTex,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });
 const groundGlowSpr = new THREE.Sprite(groundGlowMat);
 groundGlowSpr.scale.set(1.6, 0.5, 1);
 groundGlowSpr.position.y = 0.04;
 beaconGroup.add(groundGlowSpr);

 beaconGroup.position.set(P.beaconX, P.beaconY, P.beaconZ);
 scene.add(beaconGroup);

 // ── Astronauta ───────────────────────────────────────────────────────────
 let astronautRoot = null;
 let astronautMixer = null;

 new GLTFLoader().load(
  SCENE_CONFIG.astronautPath,
  (gltf) => {
   astronautRoot = gltf.scene;
   astronautRoot.scale.setScalar(P.astroScale);
   astronautRoot.position.set(P.astroX, P.astroY, P.astroZ);
   astronautRoot.rotation.y = Math.PI * P.astroRotY;
   scene.add(astronautRoot);
   if (gltf.animations?.length) {
    astronautMixer = new THREE.AnimationMixer(astronautRoot);
    astronautMixer.clipAction(gltf.animations[0]).play();
   }
  },
  undefined,
  () => {},
 );

 // ── Intersection Observer ────────────────────────────────────────────────
 let beaconActive = false;
 let beaconProgress = 0;

 const observer = new IntersectionObserver(
  (entries) => {
   if (entries[0].isIntersecting && !beaconActive) {
    beaconActive = true;
    setTimeout(onBeaconReady, 1050);
   }
  },
  { threshold: 0.22 },
 );
 observer.observe(container);

 // ── Idle astronauta ──────────────────────────────────────────────────────
 function idleAstronaut(elapsed) {
  if (!astronautRoot || astronautMixer) return;
  astronautRoot.rotation.y = Math.PI * P.astroRotY + Math.sin(elapsed * 0.9) * 0.026;
  astronautRoot.position.y = P.astroY + Math.sin(elapsed * 1.1) * 0.008;
 }

 // ── GUI ──────────────────────────────────────────────────────────────────
 const gui = new GUI({ title: "Contact Scene", width: 280 });
 gui.close();

 const fBeacon = gui.addFolder("Beacon");
 fBeacon
  .add(P, "beaconX", -2, 2, 0.01)
  .name("pos X")
  .onChange(() => (beaconGroup.position.x = P.beaconX));
 fBeacon
  .add(P, "beaconY", 0, 3, 0.01)
  .name("pos Y")
  .onChange(() => (beaconGroup.position.y = P.beaconY));
 fBeacon
  .add(P, "beaconZ", -2, 2, 0.01)
  .name("pos Z")
  .onChange(() => (beaconGroup.position.z = P.beaconZ));
 fBeacon.add(P, "glowIntensity", 0, 8, 0.1).name("glow intensity");
 fBeacon.add(P, "pulseSpeed", 0, 6, 0.1).name("pulse speed");
 fBeacon.close();

 const fAstro = gui.addFolder("Astronauta");
 fAstro
  .add(P, "astroX", -3, 3, 0.01)
  .name("pos X")
  .onChange(() => {
   if (astronautRoot) astronautRoot.position.x = P.astroX;
  });
 fAstro
  .add(P, "astroY", 0, 3, 0.01)
  .name("pos Y")
  .onChange(() => {
   if (astronautRoot) astronautRoot.position.y = P.astroY;
  });
 fAstro
  .add(P, "astroZ", -2, 2, 0.01)
  .name("pos Z")
  .onChange(() => {
   if (astronautRoot) astronautRoot.position.z = P.astroZ;
  });
 fAstro
  .add(P, "astroScale", 0.1, 1.5, 0.01)
  .name("scale")
  .onChange(() => {
   if (astronautRoot) astronautRoot.scale.setScalar(P.astroScale);
  });
 fAstro
  .add(P, "astroRotY", 0, 2, 0.01)
  .name("rot Y")
  .onChange(() => {
   if (astronautRoot) astronautRoot.rotation.y = Math.PI * P.astroRotY;
  });
 fAstro.close();

 const fMoon = gui.addFolder("Luna");
 fMoon
  .add(P, "moonY", -12, -4, 0.1)
  .name("pos Y")
  .onChange(() => {
   moon.position.y = P.moonY;
   moonHalo.position.y = P.moonY;
  });
 fMoon
  .add(P, "moonScale", 0.5, 2, 0.05)
  .name("scale")
  .onChange(() => moon.scale.setScalar(P.moonScale));
 fMoon
  .add(P, "moonEmissive", 0, 1, 0.01)
  .name("emissive")
  .onChange(() => {
   moonMat.emissiveIntensity = P.moonEmissive;
  });
 fMoon
  .add(P, "moonHaloOp", 0, 1, 0.01)
  .name("halo opacity")
  .onChange(() => {
   moonHaloMat.opacity = P.moonHaloOp;
  });
 fMoon.close();

 const fAtmo = gui.addFolder("Atmósfera");
 fAtmo
  .add(P, "starsOpacity", 0, 1, 0.01)
  .name("stars opacity")
  .onChange(() => {
   starsMatA.opacity = P.starsOpacity;
  });
 fAtmo.add(P, "starsDrift", 0, 0.05, 0.001).name("stars drift");
 fAtmo
  .add(P, "nebulaOpacity", 0, 1, 0.01)
  .name("nebula opacity")
  .onChange(() => {
   nebulaMat.opacity = P.nebulaOpacity;
  });
 fAtmo
  .add(P, "ambientInt", 0, 1, 0.01)
  .name("ambient")
  .onChange(() => {
   ambient.intensity = P.ambientInt;
  });
 fAtmo
  .add(P, "rimInt", 0, 2, 0.01)
  .name("rim light")
  .onChange(() => {
   rimLight.intensity = P.rimInt;
  });
 fAtmo.close();

 const fFoot = gui.addFolder("Huellas");
 fFoot
  .add(P, "footprintOp", 0, 1, 0.01)
  .name("opacity")
  .onChange(() => {
   footprintMeshes.forEach(({ mat, base }) => {
    mat.opacity = base * P.footprintOp;
   });
  });
 fFoot.close();

 // ── Loop ─────────────────────────────────────────────────────────────────
 const clock = new THREE.Clock();
 let rafId = null;

 function animate() {
  rafId = requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (astronautMixer) astronautMixer.update(delta);
  idleAstronaut(elapsed);

  if (beaconActive && beaconProgress < 1) {
   beaconProgress = Math.min(beaconProgress + delta * 0.65, 1);
  }

  if (beaconProgress > 0) {
   const breathe =
    beaconProgress >= 1
     ? Math.sin(elapsed * P.pulseSpeed) * 0.1 + Math.sin(elapsed * P.pulseSpeed * 0.27) * 0.04 + 0.88
     : beaconProgress;

   const flicker = beaconProgress >= 1 && Math.random() < 0.012 ? 0.7 + Math.random() * 0.3 : 1.0;

   const f = breathe * flicker;

   lightBarMat.opacity = f * 0.96;
   haloMat.opacity = f * 0.84;
   haloMat2.opacity = f * 0.58;
   haloMat3.opacity = f * 0.42;
   groundGlowMat.opacity = f * 0.5;
   beaconPL.intensity = f * P.glowIntensity;

   const cs2 = 1.0 + (breathe - 0.88) * 1.8;
   const cs3 = 1.0 + (breathe - 0.88) * 0.9;
   haloSpr2.scale.set(cs2, cs2, 1);
   haloSpr3.scale.set(2.2 * cs3, 2.2 * cs3, 1);
  }

  starsA.rotation.y = elapsed * P.starsDrift;
  starsB.rotation.y = elapsed * P.starsDrift * 1.22;
  nebulaMat.opacity = P.nebulaOpacity * (1 + Math.sin(elapsed * 0.35) * 0.06);

  renderer.render(scene, camera);
 }
 animate();

 // ── Resize ───────────────────────────────────────────────────────────────
 function onResize() {
  W = container.offsetWidth || window.innerWidth;
  H = container.offsetHeight || window.innerHeight;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5));
 }
 window.addEventListener("resize", onResize);

 // ── Cleanup ───────────────────────────────────────────────────────────────
 return function cleanup() {
  cancelAnimationFrame(rafId);
  window.removeEventListener("resize", onResize);
  observer.disconnect();
  gui.destroy();

  [pedestalGeo, transGeo, bodyGeo, ringAGeo, ringBGeo, lightBarGeo, capGeo].forEach((g) => g.dispose());
  darkMetal.dispose();
  midMetal.dispose();
  lightBarMat.dispose();
  haloTex.dispose();
  haloMat.dispose();
  haloTex2.dispose();
  haloMat2.dispose();
  haloTex3.dispose();
  haloMat3.dispose();
  groundGlowTex.dispose();
  groundGlowMat.dispose();

  starsGeoA.dispose();
  starsMatA.dispose();
  starsGeoB.dispose();
  starsMatB.dispose();

  moonProceduralTex.dispose();
  moonGeo.dispose();
  if (moonMat.map && moonMat.map !== moonProceduralTex) moonMat.map.dispose();
  moonMat.dispose();
  moonHaloTex.dispose();
  moonHaloMat.dispose();
  nebulaTex.dispose();
  nebulaMat.dispose();

  fpTex.dispose();
  footprintMeshes.forEach(({ mesh, mat }) => {
   scene.remove(mesh);
   mesh.geometry.dispose();
   mat.dispose();
  });

  if (astronautRoot) {
   astronautRoot.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose();
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => m?.dispose());
   });
  }

  renderer.dispose();
  if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
 };
}
