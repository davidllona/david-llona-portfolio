import * as THREE from "three";
import { createVisibilityGate } from "./visibilityGate";

export function initLabStarsScene() {
 const canvas = document.querySelector("#lab-stars-canvas");

 if (!canvas) {
  console.warn("No se encontró #lab-stars-canvas");
  return;
 }

 const section = canvas.closest("#lab");

 if (!section) {
  console.warn("No se encontró la sección #lab");
  return;
 }

 const scene = new THREE.Scene();

 const sizes = {
  width: section.clientWidth,
  height: section.clientHeight,
 };

 const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 100);
 camera.position.z = 12;
 scene.add(camera);

 const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
 });

 renderer.setSize(sizes.width, sizes.height);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 renderer.setClearColor("#05070b", 1);

 function createStarTexture() {
  const size = 128;

  const starCanvas = document.createElement("canvas");
  starCanvas.width = size;
  starCanvas.height = size;

  const ctx = starCanvas.getContext("2d");
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2;

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.45)");
  gradient.addColorStop(0.65, "rgba(255,255,255,0.12)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(starCanvas);
  texture.needsUpdate = true;

  return texture;
 }

 function applyScaleToPointsMaterial(material) {
  material.onBeforeCompile = (shader) => {
   shader.vertexShader = shader.vertexShader
    .replace(
     "#include <common>",
     `
          #include <common>
          attribute float aScale;
          `,
    )
    .replace(
     "gl_PointSize = size * ( scale / - mvPosition.z );",
     `
          gl_PointSize = size * aScale * ( scale / - mvPosition.z );
          `,
    );

   material.userData.shader = shader;
  };

  material.needsUpdate = true;
 }

 const starTexture = createStarTexture();
 const color = new THREE.Color();

 const starsCount = 2200;
 const positions = new Float32Array(starsCount * 3);
 const colors = new Float32Array(starsCount * 3);
 const scales = new Float32Array(starsCount);

 for (let i = 0; i < starsCount; i++) {
  const i3 = i * 3;

  positions[i3] = (Math.random() - 0.5) * 34;
  positions[i3 + 1] = (Math.random() - 0.5) * 22;
  positions[i3 + 2] = -10 + Math.random() * 20;

  const rand = Math.random();

  if (rand < 0.72) {
   color.set("#ffffff");
  } else if (rand < 0.88) {
   color.set("#cfe7ff");
  } else if (rand < 0.96) {
   color.set("#ffd6a5");
  } else {
   color.set("#fb923c");
  }

  colors[i3] = color.r;
  colors[i3 + 1] = color.g;
  colors[i3 + 2] = color.b;

  const sizeRand = Math.random();

  if (sizeRand < 0.75) {
   scales[i] = 0.6 + Math.random() * 0.5;
  } else if (sizeRand < 0.95) {
   scales[i] = 1.2 + Math.random() * 0.8;
  } else {
   scales[i] = 2.2 + Math.random() * 1.8;
  }
 }

 const starsGeometry = new THREE.BufferGeometry();
 starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
 starsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 starsGeometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

 const starsMaterial = new THREE.PointsMaterial({
  map: starTexture,
  size: 0.12,
  sizeAttenuation: true,
  vertexColors: true,
  transparent: true,
  opacity: 0.95,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });

 applyScaleToPointsMaterial(starsMaterial);

 const stars = new THREE.Points(starsGeometry, starsMaterial);
 scene.add(stars);

 const farStarsCount = 900;
 const farPositions = new Float32Array(farStarsCount * 3);
 const farColors = new Float32Array(farStarsCount * 3);
 const farScales = new Float32Array(farStarsCount);

 for (let i = 0; i < farStarsCount; i++) {
  const i3 = i * 3;

  farPositions[i3] = (Math.random() - 0.5) * 42;
  farPositions[i3 + 1] = (Math.random() - 0.5) * 28;
  farPositions[i3 + 2] = -8 - Math.random() * 12;

  const rand = Math.random();

  if (rand < 0.8) {
   color.set("#ffffff");
  } else if (rand < 0.92) {
   color.set("#dbeafe");
  } else {
   color.set("#fdba74");
  }

  farColors[i3] = color.r;
  farColors[i3 + 1] = color.g;
  farColors[i3 + 2] = color.b;

  farScales[i] = 0.45 + Math.random() * 0.45;
 }

 const farGeometry = new THREE.BufferGeometry();
 farGeometry.setAttribute("position", new THREE.BufferAttribute(farPositions, 3));
 farGeometry.setAttribute("color", new THREE.BufferAttribute(farColors, 3));
 farGeometry.setAttribute("aScale", new THREE.BufferAttribute(farScales, 1));

 const farMaterial = new THREE.PointsMaterial({
  map: starTexture,
  size: 0.07,
  sizeAttenuation: true,
  vertexColors: true,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });

 applyScaleToPointsMaterial(farMaterial);

 const farStars = new THREE.Points(farGeometry, farMaterial);
 scene.add(farStars);

 const brightStarsCount = 90;
 const brightPositions = new Float32Array(brightStarsCount * 3);
 const brightColors = new Float32Array(brightStarsCount * 3);
 const brightScales = new Float32Array(brightStarsCount);

 for (let i = 0; i < brightStarsCount; i++) {
  const i3 = i * 3;

  brightPositions[i3] = (Math.random() - 0.5) * 30;
  brightPositions[i3 + 1] = (Math.random() - 0.5) * 18;
  brightPositions[i3 + 2] = -6 + Math.random() * 12;

  const rand = Math.random();

  if (rand < 0.55) {
   color.set("#ffffff");
  } else if (rand < 0.8) {
   color.set("#dbeafe");
  } else {
   color.set("#fdba74");
  }

  brightColors[i3] = color.r;
  brightColors[i3 + 1] = color.g;
  brightColors[i3 + 2] = color.b;

  brightScales[i] = 2.4 + Math.random() * 2.2;
 }

 const brightGeometry = new THREE.BufferGeometry();
 brightGeometry.setAttribute("position", new THREE.BufferAttribute(brightPositions, 3));
 brightGeometry.setAttribute("color", new THREE.BufferAttribute(brightColors, 3));
 brightGeometry.setAttribute("aScale", new THREE.BufferAttribute(brightScales, 1));

 const brightMaterial = new THREE.PointsMaterial({
  map: starTexture,
  size: 0.17,
  sizeAttenuation: true,
  vertexColors: true,
  transparent: true,
  opacity: 0.88,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });

 applyScaleToPointsMaterial(brightMaterial);

 const brightStars = new THREE.Points(brightGeometry, brightMaterial);
 scene.add(brightStars);

 const _v3 = new THREE.Vector3();
 const _proj = new THREE.Vector3();

 function makeWaveAnchors() {
  const arr = [];
  for (let i = 0; i < 7; i++) {
   const u = i / 6;
   arr.push(new THREE.Vector3((u - 0.5) * 4.2, Math.sin(u * Math.PI * 2) * 0.85, (Math.random() - 0.5) * 0.3));
  }
  return arr;
 }

 function makeOrbitAnchors() {
  const arr = [];
  for (let i = 0; i < 6; i++) {
   const a = (i / 6) * Math.PI * 2 - Math.PI * 0.25;
   arr.push(new THREE.Vector3(Math.cos(a) * 1.7, Math.sin(a) * 1.05, (Math.random() - 0.5) * 0.4));
  }
  return arr;
 }

 function makeGraphAnchors() {
  return [
   new THREE.Vector3(0, 1.25, 0),
   new THREE.Vector3(-1.55, 0.05, 0.2),
   new THREE.Vector3(1.55, 0.05, -0.2),
   new THREE.Vector3(-0.85, -1.3, 0.15),
   new THREE.Vector3(0.85, -1.3, -0.15),
  ];
 }

 const constellationDefs = [
  {
   name: "wave",
   center: new THREE.Vector3(-9, 5, -1.5),
   color: new THREE.Color("#4ad0ff"),
   anchors: makeWaveAnchors(),
   connections: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
   ],
   activationRadius: 0.6, // en NDC
  },
  {
   name: "orbit",
   center: new THREE.Vector3(10, -1, -2.5),
   color: new THREE.Color("#ffa66d"),
   anchors: makeOrbitAnchors(),
   connections: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 0],
   ],
   activationRadius: 0.55,
  },
  {
   name: "graph",
   center: new THREE.Vector3(-6, -6, -1),
   color: new THREE.Color("#cad8ff"),
   anchors: makeGraphAnchors(),
   connections: [
    [0, 1],
    [0, 2],
    [1, 2],
    [1, 3],
    [2, 4],
    [3, 4],
    [0, 3],
    [0, 4],
   ],
   activationRadius: 0.55,
  },
 ];

 function buildConstellation(def) {
  const group = new THREE.Group();
  group.position.copy(def.center);

  const anchorSprites = def.anchors.map((relPos) => {
   const mat = new THREE.SpriteMaterial({
    map: starTexture,
    color: def.color.clone(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
   });
   const s = new THREE.Sprite(mat);
   s.position.copy(relPos);
   s.scale.setScalar(0.55);
   s.userData.baseScale = 0.55;
   s.userData.flashTimer = 0;
   group.add(s);
   return s;
  });

  const positions = new Float32Array(def.connections.length * 2 * 3);
  for (let i = 0; i < def.connections.length; i++) {
   const [a, b] = def.connections[i];
   const aPos = def.anchors[a];
   const bPos = def.anchors[b];
   positions[i * 6 + 0] = aPos.x;
   positions[i * 6 + 1] = aPos.y;
   positions[i * 6 + 2] = aPos.z;
   positions[i * 6 + 3] = bPos.x;
   positions[i * 6 + 4] = bPos.y;
   positions[i * 6 + 5] = bPos.z;
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const lineMat = new THREE.LineBasicMaterial({
   color: def.color,
   transparent: true,
   opacity: 0,
   blending: THREE.AdditiveBlending,
   depthWrite: false,
  });

  const lines = new THREE.LineSegments(lineGeo, lineMat);
  group.add(lines);

  scene.add(group);

  return {
   def,
   group,
   anchors: anchorSprites,
   lines,
   lineGeo,
   lineMat,
   activation: 0,
   signalTimer: 0.4,
  };
 }

 const constellations = constellationDefs.map(buildConstellation);

 const SIGNAL_POOL = 6;
 const signalPool = [];
 for (let i = 0; i < SIGNAL_POOL; i++) {
  const mat = new THREE.SpriteMaterial({
   map: starTexture,
   color: 0xffffff,
   transparent: true,
   opacity: 0,
   depthWrite: false,
   blending: THREE.AdditiveBlending,
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(0.4);
  s.visible = false;
  scene.add(s);
  signalPool.push({ sprite: s, mat, c: null, fromIdx: 0, toIdx: 0, t: 0, active: false });
 }

 function spawnSignal(c) {
  const free = signalPool.find((s) => !s.active);
  if (!free || c.def.connections.length === 0) return;
  const conn = c.def.connections[Math.floor(Math.random() * c.def.connections.length)];
  free.active = true;
  free.c = c;
  free.fromIdx = conn[0];
  free.toIdx = conn[1];
  free.t = 0;
  free.mat.color.copy(c.def.color).lerp(new THREE.Color(0xffffff), 0.4);
  free.sprite.visible = true;
 }

 const BURST_POOL = 10;
 const burstPool = [];
 for (let i = 0; i < BURST_POOL; i++) {
  const mat = new THREE.SpriteMaterial({
   map: starTexture,
   color: 0xffffff,
   transparent: true,
   opacity: 0,
   depthWrite: false,
   blending: THREE.AdditiveBlending,
  });
  const s = new THREE.Sprite(mat);
  s.visible = false;
  scene.add(s);
  burstPool.push({ sprite: s, mat, life: 0, active: false });
 }

 function spawnBurst(worldPos, color) {
  const free = burstPool.find((b) => !b.active);
  if (!free) return;
  free.active = true;
  free.life = 1.0;
  free.sprite.position.copy(worldPos);
  free.mat.color.copy(color).lerp(new THREE.Color(0xffffff), 0.5);
  free.sprite.visible = true;
 }

 function updateConstellations(dt, elapsed) {
  const curNdcX = cursor.x * 2;
  const curNdcY = -cursor.y * 2;

  for (const c of constellations) {
   _proj.copy(c.def.center).project(camera);

   const dx = _proj.x - curNdcX;
   const dy = _proj.y - curNdcY;
   const dist = Math.sqrt(dx * dx + dy * dy);

   const outer = c.def.activationRadius;
   const inner = outer * 0.35;
   let t = (outer - dist) / (outer - inner);
   t = Math.max(0, Math.min(1, t));
   const target = t * t * (3 - 2 * t);

   c.activation += (target - c.activation) * 0.09;

   const a = c.activation;
   c.lineMat.opacity = a * 0.5;

   for (const sp of c.anchors) {
    const breath = 0.88 + Math.sin(elapsed * 1.6 + sp.position.x * 1.8) * 0.08;
    let op = a * breath;

    if (sp.userData.flashTimer > 0) {
     sp.userData.flashTimer = Math.max(0, sp.userData.flashTimer - dt);
     const flash = sp.userData.flashTimer / 0.45;
     sp.scale.setScalar(sp.userData.baseScale * (1 + flash * 1.8));
     op = Math.min(1, op + flash * 0.7);
    } else {
     sp.scale.setScalar(sp.userData.baseScale);
    }

    sp.material.opacity = op;
   }

   if (a > 0.78) {
    c.signalTimer -= dt;
    if (c.signalTimer <= 0) {
     spawnSignal(c);
     c.signalTimer = 0.85 + Math.random() * 1.3;
    }
   } else {
    c.signalTimer = 0.25;
   }
  }

  for (const s of signalPool) {
   if (!s.active) continue;
   s.t += dt * 1.6; // ~0.62s para recorrer una línea

   if (s.t >= 1) {
    const target = s.c.anchors[s.toIdx];
    target.getWorldPosition(_v3);
    spawnBurst(_v3, s.c.def.color);
    target.userData.flashTimer = 0.45;
    s.active = false;
    s.sprite.visible = false;
    continue;
   }

   const ap = s.c.def.anchors[s.fromIdx];
   const bp = s.c.def.anchors[s.toIdx];
   _v3.lerpVectors(ap, bp, s.t);
   s.c.group.localToWorld(_v3);
   s.sprite.position.copy(_v3);

   const fade = Math.sin(s.t * Math.PI);
   s.mat.opacity = fade * 0.95 * Math.max(0.4, s.c.activation);
   s.sprite.scale.setScalar(0.32 + fade * 0.32);
  }

  for (const b of burstPool) {
   if (!b.active) continue;
   b.life -= dt * 1.7; // ~0.59s
   if (b.life <= 0) {
    b.active = false;
    b.sprite.visible = false;
    continue;
   }
   const k = 1 - b.life; // 0→1

   b.sprite.scale.setScalar(0.4 + k * 2.6);

   b.mat.opacity = b.life * b.life * 1.25;
  }
 }

 const cursor = { x: 0, y: 0 };
 let scrollY = window.scrollY;
 const clock = new THREE.Clock();
 let lastElapsed = 0;
 let animationId = null;

 const handleResize = () => {
  sizes.width = section.clientWidth;
  sizes.height = section.clientHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 };

 const handleScroll = () => {
  scrollY = window.scrollY;
 };

 const handleMouseMove = (event) => {
  cursor.x = event.clientX / window.innerWidth - 0.5;
  cursor.y = event.clientY / window.innerHeight - 0.5;
 };

 window.addEventListener("resize", handleResize);
 window.addEventListener("scroll", handleScroll);
 window.addEventListener("mousemove", handleMouseMove);

 const kick = () => {
  if (!animationId && gate.shouldAnimate()) {
   animationId = window.requestAnimationFrame(tick);
  }
 };
 const gate = createVisibilityGate(canvas, kick);

 const tick = () => {
  animationId = null;
  if (!gate.shouldAnimate()) return;

  const elapsedTime = clock.getElapsedTime();
  const dt = Math.min(Math.max(elapsedTime - lastElapsed, 0), 0.05);
  lastElapsed = elapsedTime;

  stars.rotation.y = elapsedTime * 0.01;
  stars.rotation.x = elapsedTime * 0.005;

  farStars.rotation.y = -elapsedTime * 0.004;
  farStars.rotation.x = elapsedTime * 0.0015;

  brightStars.rotation.y = elapsedTime * 0.006;
  brightStars.rotation.x = elapsedTime * 0.003;

  stars.position.y = -(scrollY * 0.00012);
  farStars.position.y = -(scrollY * 0.00006);
  brightStars.position.y = -(scrollY * 0.00009);

  camera.position.x += (cursor.x * 0.8 - camera.position.x) * 0.02;
  camera.position.y += (-cursor.y * 0.6 - camera.position.y) * 0.02;

  brightMaterial.opacity = 0.82 + Math.sin(elapsedTime * 1.4) * 0.06;

  updateConstellations(dt, elapsedTime);

  renderer.render(scene, camera);
  animationId = window.requestAnimationFrame(tick);
 };

 kick();

 return () => {
  gate.dispose();
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("mousemove", handleMouseMove);

  if (animationId) {
   window.cancelAnimationFrame(animationId);
  }

  starsGeometry.dispose();
  starsMaterial.dispose();
  farGeometry.dispose();
  farMaterial.dispose();
  brightGeometry.dispose();
  brightMaterial.dispose();
  starTexture.dispose();

  for (const c of constellations) {
   for (const sp of c.anchors) sp.material.dispose();
   c.lineGeo.dispose();
   c.lineMat.dispose();
   scene.remove(c.group);
  }
  for (const s of signalPool) {
   s.mat.dispose();
   scene.remove(s.sprite);
  }
  for (const b of burstPool) {
   b.mat.dispose();
   scene.remove(b.sprite);
  }

  renderer.dispose();
 };
}

export function initMainWaterPreview() {
 const canvas = document.querySelector('[data-preview-id="preview-main"]');

 if (!canvas) {
  return;
 }

 return createMainPreview(canvas);
}

function createMainPreview(canvas) {
 const scene = new THREE.Scene();

 const sizes = {
  width: canvas.clientWidth || 300,
  height: canvas.clientHeight || 200,
 };

 const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100);
 camera.position.set(0, 1.25, 3.2);
 camera.lookAt(0, -0.15, 0);
 scene.add(camera);

 const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
 });

 renderer.setSize(sizes.width, sizes.height);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 renderer.setClearColor("#05070b", 1);

 const ambientLight = new THREE.AmbientLight("#ffffff", 0.35);
 scene.add(ambientLight);

 const rimLight = new THREE.DirectionalLight("#dbeafe", 1.1);
 rimLight.position.set(2, 2, 1.5);
 scene.add(rimLight);

 const warmLight = new THREE.PointLight("#fb923c", 2.8, 10);
 warmLight.position.set(-1.3, 1.1, 1.2);
 scene.add(warmLight);

 const vertexShader = `
uniform float uTime;
uniform float uBigWavesElevation;
uniform vec2 uBigWavesFrequency;
uniform float uBigWavesSpeed;

uniform float uSmallWavesElevation;
uniform float uSmallWavesFrequency;
uniform float uSmallWavesSpeed;
uniform float uSmallIterations;

varying float vElevation;

vec4 permute(vec4 x)
{
    return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r)
{
    return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t)
{
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float cnoise(vec3 P)
{
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);

    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);

    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;

    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);

    return 2.2 * n_xyz;
}

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    float elevation = 0.0;

    elevation += sin(modelPosition.x * uBigWavesFrequency.x + uTime * uBigWavesSpeed) *
                 sin(modelPosition.z * uBigWavesFrequency.y + uTime * uBigWavesSpeed) *
                 uBigWavesElevation;

    elevation += sin((modelPosition.x + modelPosition.z) * 2.0 + uTime * 0.6) * 0.05;

    elevation -= abs(cnoise(vec3(modelPosition.xz * 3.0, uTime * 0.2)) * 0.15);

    for(float i = 1.0; i <= 5.0; i++)
    {
        if(i > uSmallIterations) break;

        elevation -= abs(
            cnoise(vec3(modelPosition.xz * uSmallWavesFrequency * i, uTime * uSmallWavesSpeed))
            * uSmallWavesElevation / i
        );
    }

    modelPosition.y += elevation;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    vElevation = elevation;
}
`;

 const fragmentShader = `
uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;
uniform float uColorOffset;
uniform float uColorMultiplier;

uniform vec3 uFoamColor;
uniform float uFoamThreshold;
uniform float uFoamStrength;

uniform float uTime;
uniform vec3 uHighlightColor;
uniform float uHighlightStrength;

varying float vElevation;

void main()
{
    float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;
    mixStrength = clamp(mixStrength, 0.0, 1.0);

    vec3 baseColor = mix(uDepthColor, uSurfaceColor, mixStrength);

    float foam = smoothstep(uFoamThreshold, 1.0, mixStrength);

    float highlight = sin(mixStrength * 18.0 + uTime * 2.0) * 0.5 + 0.5;
    highlight *= smoothstep(0.6, 1.0, mixStrength);
    highlight *= uHighlightStrength;

    vec3 color = baseColor;
    color = mix(color, uFoamColor, foam * uFoamStrength);
    color += uHighlightColor * highlight;

    gl_FragColor = vec4(color, 1.0);
}
`;

 const waterGeometry = new THREE.PlaneGeometry(5.2, 5.2, 256, 256);

 const waterMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
  uniforms: {
   uTime: { value: 0 },

   uBigWavesElevation: { value: 0.2 },
   uBigWavesFrequency: { value: new THREE.Vector2(4, 1.5) },
   uBigWavesSpeed: { value: 0.75 },

   uDepthColor: { value: new THREE.Color("#186691") },
   uSurfaceColor: { value: new THREE.Color("#9bd8ff") },
   uColorOffset: { value: 0.08 },
   uColorMultiplier: { value: 5 },

   uSmallWavesElevation: { value: 0.15 },
   uSmallWavesFrequency: { value: 3 },
   uSmallWavesSpeed: { value: 0.2 },
   uSmallIterations: { value: 4 },

   uFoamColor: { value: new THREE.Color("#ffffff") },
   uFoamThreshold: { value: 0.75 },
   uFoamStrength: { value: 0.35 },

   uHighlightColor: { value: new THREE.Color("#dff4ff") },
   uHighlightStrength: { value: 0.18 },
  },
 });

 const water = new THREE.Mesh(waterGeometry, waterMaterial);
 water.rotation.x = -Math.PI * 0.48;
 water.position.y = -0.45;
 water.position.z = 0.1;
 scene.add(water);

 const starField = createMiniStars({
  count: 35,
  spreadX: 4.8,
  spreadY: 2.4,
  spreadZ: 2.5,
  size: 0.018,
  opacity: 0.3,
 });
 starField.points.position.y = 0.65;
 starField.points.position.z = -0.8;
 scene.add(starField.points);

 let animationId = null;
 const clock = new THREE.Clock();
 let targetRotationY = 0;
 let currentRotationY = 0;

 const handleMouseMove = (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  targetRotationY = (x - 0.5) * 0.22;
 };

 const handleMouseLeave = () => {
  targetRotationY = 0;
 };

 const handleResize = () => {
  sizes.width = canvas.clientWidth || 300;
  sizes.height = canvas.clientHeight || 200;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 };

 canvas.addEventListener("mousemove", handleMouseMove);
 canvas.addEventListener("mouseleave", handleMouseLeave);
 window.addEventListener("resize", handleResize);

 const kick = () => {
  if (!animationId && gate.shouldAnimate()) {
   animationId = window.requestAnimationFrame(tick);
  }
 };
 const gate = createVisibilityGate(canvas, kick);

 const tick = () => {
  animationId = null;
  if (!gate.shouldAnimate()) return;

  const elapsed = clock.getElapsedTime();

  waterMaterial.uniforms.uTime.value = elapsed;

  currentRotationY += (targetRotationY - currentRotationY) * 0.035;
  water.rotation.z = currentRotationY;

  starField.points.rotation.y = elapsed * 0.03;

  renderer.render(scene, camera);
  animationId = window.requestAnimationFrame(tick);
 };

 kick();

 return () => {
  gate.dispose();
  canvas.removeEventListener("mousemove", handleMouseMove);
  canvas.removeEventListener("mouseleave", handleMouseLeave);
  window.removeEventListener("resize", handleResize);

  if (animationId) {
   window.cancelAnimationFrame(animationId);
  }

  waterGeometry.dispose();
  waterMaterial.dispose();
  starField.geometry.dispose();
  starField.material.dispose();
  disposeScene(scene);
  renderer.dispose();
 };
}

function createMiniStars({ count = 100, spreadX = 4, spreadY = 4, spreadZ = 4, size = 0.03, opacity = 0.8 }) {
 const positions = new Float32Array(count * 3);
 const colors = new Float32Array(count * 3);
 const color = new THREE.Color();

 for (let i = 0; i < count; i++) {
  const i3 = i * 3;

  positions[i3] = (Math.random() - 0.5) * spreadX;
  positions[i3 + 1] = (Math.random() - 0.5) * spreadY;
  positions[i3 + 2] = (Math.random() - 0.5) * spreadZ;

  const rand = Math.random();

  if (rand < 0.7) {
   color.set("#ffffff");
  } else if (rand < 0.9) {
   color.set("#dbeafe");
  } else {
   color.set("#fb923c");
  }

  colors[i3] = color.r;
  colors[i3 + 1] = color.g;
  colors[i3 + 2] = color.b;
 }

 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

 const material = new THREE.PointsMaterial({
  size,
  sizeAttenuation: true,
  vertexColors: true,
  transparent: true,
  opacity,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });

 const points = new THREE.Points(geometry, material);

 return {
  geometry,
  material,
  points,
 };
}

export function initProjectsStarsScene() {
 const canvas = document.querySelector("#projects-stars-canvas");

 if (!canvas) {
  console.warn("[ProjectsStars] No se encontró #projects-stars-canvas");
  return;
 }

 const stickyEl = canvas.parentElement;
 if (!stickyEl) return;

 const scene = new THREE.Scene();

 const sizes = {
  width: stickyEl.clientWidth,
  height: stickyEl.clientHeight,
 };

 const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 100);
 camera.position.z = 12;
 scene.add(camera);

 const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
 });

 renderer.setSize(sizes.width, sizes.height);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 renderer.setClearColor("#03030a", 1);

 const starTexture = (() => {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const cx = c.getContext("2d");
  const g = cx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.95)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(0.65, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  cx.fillStyle = g;
  cx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
 })();

 const applyScale = (m) => {
  m.onBeforeCompile = (s) => {
   s.vertexShader = s.vertexShader
    .replace("#include <common>", "#include <common>\nattribute float aScale;")
    .replace(
     "gl_PointSize = size * ( scale / - mvPosition.z );",
     "gl_PointSize = size * aScale * ( scale / - mvPosition.z );",
    );
   m.userData.shader = s;
  };
  m.needsUpdate = true;
 };

 const color = new THREE.Color();

 const starsCount = 1800;
 const sPos = new Float32Array(starsCount * 3);
 const sCol = new Float32Array(starsCount * 3);
 const sScale = new Float32Array(starsCount);

 for (let i = 0; i < starsCount; i++) {
  const i3 = i * 3;
  sPos[i3] = (Math.random() - 0.5) * 34;
  sPos[i3 + 1] = (Math.random() - 0.5) * 22;
  sPos[i3 + 2] = -10 + Math.random() * 20;

  const r = Math.random();
  if (r < 0.72) color.set("#ffffff");
  else if (r < 0.88) color.set("#cfe7ff");
  else if (r < 0.96) color.set("#ffd6a5");
  else color.set("#fb923c");

  sCol[i3] = color.r;
  sCol[i3 + 1] = color.g;
  sCol[i3 + 2] = color.b;

  const sr = Math.random();
  if (sr < 0.75) sScale[i] = 0.6 + Math.random() * 0.5;
  else if (sr < 0.95) sScale[i] = 1.2 + Math.random() * 0.8;
  else sScale[i] = 2.2 + Math.random() * 1.8;
 }

 const sGeo = new THREE.BufferGeometry();
 sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
 sGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
 sGeo.setAttribute("aScale", new THREE.BufferAttribute(sScale, 1));

 const sMat = new THREE.PointsMaterial({
  map: starTexture,
  size: 0.12,
  sizeAttenuation: true,
  vertexColors: true,
  transparent: true,
  opacity: 0.85,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });
 applyScale(sMat);
 const stars = new THREE.Points(sGeo, sMat);
 scene.add(stars);

 const farCount = 700;
 const fPos = new Float32Array(farCount * 3);
 const fCol = new Float32Array(farCount * 3);
 const fScale = new Float32Array(farCount);

 for (let i = 0; i < farCount; i++) {
  const i3 = i * 3;
  fPos[i3] = (Math.random() - 0.5) * 42;
  fPos[i3 + 1] = (Math.random() - 0.5) * 28;
  fPos[i3 + 2] = -8 - Math.random() * 12;

  const r = Math.random();
  if (r < 0.8) color.set("#ffffff");
  else if (r < 0.92) color.set("#dbeafe");
  else color.set("#fdba74");

  fCol[i3] = color.r;
  fCol[i3 + 1] = color.g;
  fCol[i3 + 2] = color.b;
  fScale[i] = 0.45 + Math.random() * 0.45;
 }

 const fGeo = new THREE.BufferGeometry();
 fGeo.setAttribute("position", new THREE.BufferAttribute(fPos, 3));
 fGeo.setAttribute("color", new THREE.BufferAttribute(fCol, 3));
 fGeo.setAttribute("aScale", new THREE.BufferAttribute(fScale, 1));

 const fMat = new THREE.PointsMaterial({
  map: starTexture,
  size: 0.07,
  sizeAttenuation: true,
  vertexColors: true,
  transparent: true,
  opacity: 0.36,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });
 applyScale(fMat);
 const farStars = new THREE.Points(fGeo, fMat);
 scene.add(farStars);

 const brightCount = 60;
 const bPos = new Float32Array(brightCount * 3);
 const bCol = new Float32Array(brightCount * 3);
 const bScale = new Float32Array(brightCount);

 for (let i = 0; i < brightCount; i++) {
  const i3 = i * 3;
  bPos[i3] = (Math.random() - 0.5) * 30;
  bPos[i3 + 1] = (Math.random() - 0.5) * 18;
  bPos[i3 + 2] = -6 + Math.random() * 12;

  const r = Math.random();
  if (r < 0.55) color.set("#ffffff");
  else if (r < 0.8) color.set("#dbeafe");
  else color.set("#fdba74");

  bCol[i3] = color.r;
  bCol[i3 + 1] = color.g;
  bCol[i3 + 2] = color.b;
  bScale[i] = 2.4 + Math.random() * 2.2;
 }

 const bGeo = new THREE.BufferGeometry();
 bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
 bGeo.setAttribute("color", new THREE.BufferAttribute(bCol, 3));
 bGeo.setAttribute("aScale", new THREE.BufferAttribute(bScale, 1));

 const bMat = new THREE.PointsMaterial({
  map: starTexture,
  size: 0.17,
  sizeAttenuation: true,
  vertexColors: true,
  transparent: true,
  opacity: 0.78,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });
 applyScale(bMat);
 const brightStars = new THREE.Points(bGeo, bMat);
 scene.add(brightStars);

 const cursor = { x: 0, y: 0 };
 const clock = new THREE.Clock();
 let animationId = null;

 const onResize = () => {
  sizes.width = stickyEl.clientWidth;
  sizes.height = stickyEl.clientHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 };

 const onMouseMove = (e) => {
  cursor.x = e.clientX / window.innerWidth - 0.5;
  cursor.y = e.clientY / window.innerHeight - 0.5;
 };

 window.addEventListener("resize", onResize);
 window.addEventListener("mousemove", onMouseMove);

 const kick = () => {
  if (!animationId && gate.shouldAnimate()) {
   animationId = window.requestAnimationFrame(tick);
  }
 };
 const gate = createVisibilityGate(canvas, kick);

 const tick = () => {
  animationId = null;
  if (!gate.shouldAnimate()) return;

  const t = clock.getElapsedTime();

  stars.rotation.y = t * 0.008;
  stars.rotation.x = t * 0.004;

  farStars.rotation.y = -t * 0.003;
  farStars.rotation.x = t * 0.0012;

  brightStars.rotation.y = t * 0.005;
  brightStars.rotation.x = t * 0.0025;

  camera.position.x += (cursor.x * 0.6 - camera.position.x) * 0.02;
  camera.position.y += (-cursor.y * 0.45 - camera.position.y) * 0.02;

  bMat.opacity = 0.74 + Math.sin(t * 1.2) * 0.05;

  renderer.render(scene, camera);
  animationId = window.requestAnimationFrame(tick);
 };

 kick();

 return () => {
  gate.dispose();
  window.removeEventListener("resize", onResize);
  window.removeEventListener("mousemove", onMouseMove);
  if (animationId) window.cancelAnimationFrame(animationId);

  sGeo.dispose();
  sMat.dispose();
  fGeo.dispose();
  fMat.dispose();
  bGeo.dispose();
  bMat.dispose();
  starTexture.dispose();
  renderer.dispose();
 };
}

export function initLabRoomScene() {
 const canvas = document.querySelector("#lab-room-canvas");
 if (!canvas) {
  console.warn("[LabRoom] No se encontró #lab-room-canvas");
  return;
 }

 const parent = canvas.parentElement;
 if (!parent) return;

 const scene = new THREE.Scene();

 const sizes = {
  width: parent.clientWidth,
  height: parent.clientHeight,
 };

 const camera = new THREE.PerspectiveCamera(58, sizes.width / sizes.height, 0.1, 200);
 camera.position.set(0, 0, 0);
 camera.lookAt(0, 0, -10);
 scene.add(camera);

 const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
 });
 renderer.setSize(sizes.width, sizes.height);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 renderer.setClearColor(0x000000, 0);

 const ambient = new THREE.AmbientLight(0x1a2a4a, 0.45);
 scene.add(ambient);

 const keyLight = new THREE.DirectionalLight(0xfdba74, 0.35);
 keyLight.position.set(2, 1, 4);
 scene.add(keyLight);

 const rimLight = new THREE.DirectionalLight(0x4a7fc4, 0.6);
 rimLight.position.set(-3, 0, -8);
 scene.add(rimLight);

 const nebulaTexture = (() => {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const cx = c.getContext("2d");

  const g = cx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(80,120,200,0.55)");
  g.addColorStop(0.4, "rgba(60,90,160,0.28)");
  g.addColorStop(0.75, "rgba(40,60,110,0.10)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = g;
  cx.fillRect(0, 0, size, size);

  for (let i = 0; i < 60; i++) {
   const x = Math.random() * size;
   const y = Math.random() * size;
   const r = 12 + Math.random() * 30;
   const dx = x - size / 2;
   const dy = y - size / 2;
   const dist = Math.sqrt(dx * dx + dy * dy);
   if (dist > size * 0.42) continue;
   const alpha = (1 - dist / (size * 0.5)) * 0.18;
   const grad = cx.createRadialGradient(x, y, 0, x, y, r);
   grad.addColorStop(0, `rgba(120,160,220,${alpha})`);
   grad.addColorStop(1, "rgba(120,160,220,0)");
   cx.fillStyle = grad;
   cx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
 })();

 const nebulaMat = new THREE.SpriteMaterial({
  map: nebulaTexture,
  transparent: true,
  opacity: 0.55,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
 });
 const nebula = new THREE.Sprite(nebulaMat);
 nebula.scale.set(60, 40, 1);
 nebula.position.set(-8, -2, -45);
 scene.add(nebula);

 const nebula2 = new THREE.Sprite(nebulaMat.clone());
 nebula2.material.opacity = 0.32;
 nebula2.scale.set(35, 25, 1);
 nebula2.position.set(12, 4, -38);
 scene.add(nebula2);

 const asteroids = [];
 const ASTEROID_COUNT = 8;

 for (let i = 0; i < ASTEROID_COUNT; i++) {
  const baseRadius = 0.25 + Math.random() * 0.55;
  const geo = new THREE.IcosahedronGeometry(baseRadius, 0);

  const pos = geo.attributes.position;
  for (let v = 0; v < pos.count; v++) {
   const x = pos.getX(v);
   const y = pos.getY(v);
   const z = pos.getZ(v);
   const noise = (Math.random() - 0.5) * 0.25;
   pos.setXYZ(v, x * (1 + noise), y * (1 + noise), z * (1 + noise));
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
   color: 0x3a3530,
   roughness: 0.95,
   metalness: 0.05,
   flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, mat);

  const side = Math.random() > 0.5 ? 1 : -1;
  mesh.position.set(side * (3 + Math.random() * 6), (Math.random() - 0.5) * 5, -8 - Math.random() * 18);

  mesh.userData.driftX = (Math.random() - 0.5) * 0.0006;
  mesh.userData.driftY = (Math.random() - 0.5) * 0.0004;
  mesh.userData.rotSpeed = (Math.random() - 0.5) * 0.003;
  mesh.userData.rotAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
  mesh.userData.bobPhase = Math.random() * Math.PI * 2;
  mesh.userData.basePos = mesh.position.clone();

  scene.add(mesh);
  asteroids.push(mesh);
 }

 const starTex = (() => {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const cx = c.getContext("2d");
  const g = cx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  cx.fillStyle = g;
  cx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  return t;
 })();

 const STAR_N = 800;
 const starPos = new Float32Array(STAR_N * 3);
 const starCol = new Float32Array(STAR_N * 3);
 const starColor = new THREE.Color();
 for (let i = 0; i < STAR_N; i++) {
  const i3 = i * 3;
  starPos[i3] = (Math.random() - 0.5) * 80;
  starPos[i3 + 1] = (Math.random() - 0.5) * 50;
  starPos[i3 + 2] = -30 - Math.random() * 60;

  const r = Math.random();
  if (r < 0.85) starColor.set("#ffffff");
  else if (r < 0.95) starColor.set("#cfe7ff");
  else starColor.set("#fdba74");
  starCol[i3] = starColor.r;
  starCol[i3 + 1] = starColor.g;
  starCol[i3 + 2] = starColor.b;
 }
 const starGeo = new THREE.BufferGeometry();
 starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
 starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
 const starMat = new THREE.PointsMaterial({
  map: starTex,
  size: 0.18,
  sizeAttenuation: true,
  vertexColors: true,
  transparent: true,
  opacity: 0.85,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
 });
 const stars = new THREE.Points(starGeo, starMat);
 scene.add(stars);

 const shooting = {
  mesh: null,
  active: false,
  velocity: new THREE.Vector3(),
  life: 0,
  cooldown: 4 + Math.random() * 8,
 };

 const shootGeo = new THREE.BufferGeometry();
 const shootPos = new Float32Array(2 * 3);
 shootGeo.setAttribute("position", new THREE.BufferAttribute(shootPos, 3));
 const shootMat = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
 });
 shooting.mesh = new THREE.Line(shootGeo, shootMat);
 scene.add(shooting.mesh);

 function startShootingStar() {
  shooting.active = true;
  shooting.life = 1.0;
  shooting.mesh.position.set(-15 + Math.random() * 8, 3 + Math.random() * 5, -22 - Math.random() * 12);
  shooting.velocity.set(0.18 + Math.random() * 0.08, -0.06 - Math.random() * 0.04, 0.02);
 }

 const cursor = { x: 0, y: 0 };
 const cursorTarget = { x: 0, y: 0 };

 const onMouseMove = (e) => {
  const rect = parent.getBoundingClientRect();
  cursorTarget.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
  cursorTarget.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
 };
 window.addEventListener("mousemove", onMouseMove);

 const onResize = () => {
  sizes.width = parent.clientWidth;
  sizes.height = parent.clientHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 };
 window.addEventListener("resize", onResize);

 const clock = new THREE.Clock();
 let animId = null;

 const kick = () => {
  if (!animId && gate.shouldAnimate()) {
   animId = requestAnimationFrame(tick);
  }
 };
 const gate = createVisibilityGate(canvas, kick);

 const tick = () => {
  animId = null;
  if (!gate.shouldAnimate()) return;

  const elapsed = clock.getElapsedTime();
  const dt = Math.min(clock.getDelta() || 1 / 60, 0.05);

  cursor.x += (cursorTarget.x - cursor.x) * 0.04;
  cursor.y += (cursorTarget.y - cursor.y) * 0.04;
  camera.rotation.y = -cursor.x * 0.04;
  camera.rotation.x = cursor.y * 0.025;

  for (const a of asteroids) {
   a.position.x = a.userData.basePos.x + Math.sin(elapsed * 0.15 + a.userData.bobPhase) * 0.3;
   a.position.y = a.userData.basePos.y + Math.cos(elapsed * 0.12 + a.userData.bobPhase) * 0.25;
   a.userData.basePos.x += a.userData.driftX;
   a.userData.basePos.y += a.userData.driftY;

   a.rotateOnAxis(a.userData.rotAxis, a.userData.rotSpeed);

   if (Math.abs(a.userData.basePos.x) > 12) {
    a.userData.basePos.x = -Math.sign(a.userData.basePos.x) * 12;
   }
  }

  nebula.material.rotation = elapsed * 0.005;
  nebula2.material.rotation = -elapsed * 0.003;

  stars.rotation.y = elapsed * 0.002;

  if (shooting.active) {
   shooting.life -= dt * 1.5;
   shooting.mesh.position.add(shooting.velocity);
   shootMat.opacity = Math.max(0, shooting.life) * 0.85;

   shootPos[0] = 0;
   shootPos[1] = 0;
   shootPos[2] = 0;
   shootPos[3] = -shooting.velocity.x * 8;
   shootPos[4] = -shooting.velocity.y * 8;
   shootPos[5] = -shooting.velocity.z * 8;
   shootGeo.attributes.position.needsUpdate = true;
   if (shooting.life <= 0) {
    shooting.active = false;
    shooting.cooldown = 6 + Math.random() * 10;
   }
  } else {
   shooting.cooldown -= dt;
   if (shooting.cooldown <= 0) startShootingStar();
  }

  renderer.render(scene, camera);
  animId = requestAnimationFrame(tick);
 };
 kick();

 return () => {
  gate.dispose();
  window.removeEventListener("resize", onResize);
  window.removeEventListener("mousemove", onMouseMove);
  if (animId) cancelAnimationFrame(animId);

  for (const a of asteroids) {
   a.geometry.dispose();
   a.material.dispose();
  }
  nebula.material.dispose();
  nebula2.material.dispose();
  nebulaTexture.dispose();
  starGeo.dispose();
  starMat.dispose();
  starTex.dispose();
  shootGeo.dispose();
  shootMat.dispose();
  renderer.dispose();
 };
}

function disposeScene(scene) {
 scene.traverse((child) => {
  if (child.geometry) {
   child.geometry.dispose();
  }

  if (child.material) {
   if (Array.isArray(child.material)) {
    child.material.forEach((material) => material.dispose());
   } else {
    child.material.dispose();
   }
  }
 });
}
