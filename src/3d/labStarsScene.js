import * as THREE from "three";

/**
 * =========================================================
 * FONDO GENERAL DEL LAB
 * =========================================================
 */
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

 const cursor = { x: 0, y: 0 };
 let scrollY = window.scrollY;
 const clock = new THREE.Clock();
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

 const tick = () => {
  const elapsedTime = clock.getElapsedTime();

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

  renderer.render(scene, camera);
  animationId = window.requestAnimationFrame(tick);
 };

 tick();

 return () => {
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
  renderer.dispose();
 };
}

/**
 * =========================================================
 * PREVIEW PRINCIPAL - AGUA
 * =========================================================
 */
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

 const tick = () => {
  const elapsed = clock.getElapsedTime();

  waterMaterial.uniforms.uTime.value = elapsed;

  currentRotationY += (targetRotationY - currentRotationY) * 0.035;
  water.rotation.z = currentRotationY;

  starField.points.rotation.y = elapsed * 0.03;

  renderer.render(scene, camera);
  animationId = window.requestAnimationFrame(tick);
 };

 tick();

 return () => {
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

/**
 * =========================================================
 * FONDO DE ESTRELLAS PARA PROJECTS
 * =========================================================
 * Mismo sistema que el Lab para mantener continuidad visual
 * (un solo "universo" a lo largo del portfolio), pero ajustado
 * al contexto de Projects:
 *
 *  – La cámara está sticky, así que NO hay scroll-parallax
 *    (las estrellas no se desplazan en Y al hacer scroll).
 *  – Densidad reducida (1800/700/60 vs 2200/900/90) para que
 *    la pantalla CRT siga siendo la protagonista.
 *  – Opacidad de las estrellas brillantes recortada para no
 *    competir con el monitor.
 * =========================================================
 */
export function initProjectsStarsScene() {
 const canvas = document.querySelector("#projects-stars-canvas");

 if (!canvas) {
  console.warn("[ProjectsStars] No se encontró #projects-stars-canvas");
  return;
 }

 // Ancla al sticky directo (100vh). El wrapper exterior tiene 550vh
 // y no nos sirve para dimensionar el canvas.
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

 // ── Texture de estrella (idéntica al Lab) ────────────────
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

 // ── Capa 1: estrellas medias ─────────────────────────────
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

 // ── Capa 2: estrellas lejanas ────────────────────────────
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

 // ── Capa 3: estrellas brillantes (más contenidas que en Lab) ─
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

 // ── Animación: rotación temporal + parallax suave de cursor ─
 // Sin scroll-parallax: la cámara está sticky, las estrellas
 // tampoco deben desplazarse en Y al hacer scroll.
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

 const tick = () => {
  const t = clock.getElapsedTime();

  stars.rotation.y = t * 0.008;
  stars.rotation.x = t * 0.004;

  farStars.rotation.y = -t * 0.003;
  farStars.rotation.x = t * 0.0012;

  brightStars.rotation.y = t * 0.005;
  brightStars.rotation.x = t * 0.0025;

  // Parallax muy sutil con el cursor — da vida sin distraer
  camera.position.x += (cursor.x * 0.6 - camera.position.x) * 0.02;
  camera.position.y += (-cursor.y * 0.45 - camera.position.y) * 0.02;

  // Pulso lento de las brillantes
  bMat.opacity = 0.74 + Math.sin(t * 1.2) * 0.05;

  renderer.render(scene, camera);
  animationId = window.requestAnimationFrame(tick);
 };

 tick();

 return () => {
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
