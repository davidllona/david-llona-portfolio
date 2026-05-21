import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadingManager } from "../loadingManager";

function downscaleGLBTextures(root, maxSize = 512) {
 const cache = new WeakMap();

 const resize = (texture) => {
  if (!texture || !texture.image) return texture;

  if (cache.has(texture)) return cache.get(texture);

  const img = texture.image;
  const w = img.width || img.naturalWidth;
  const h = img.height || img.naturalHeight;
  if (!w || !h) return texture;

  if (Math.max(w, h) <= maxSize) {
   cache.set(texture, texture);
   return texture;
  }

  const scale = maxSize / Math.max(w, h);
  const newW = Math.max(1, Math.floor((w * scale) / 2) * 2);
  const newH = Math.max(1, Math.floor((h * scale) / 2) * 2);

  const canvas = document.createElement("canvas");
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, newW, newH);

  const newTex = new THREE.CanvasTexture(canvas);

  newTex.colorSpace = texture.colorSpace;
  newTex.wrapS = texture.wrapS;
  newTex.wrapT = texture.wrapT;
  newTex.minFilter = texture.minFilter;
  newTex.magFilter = texture.magFilter;
  newTex.anisotropy = 1; // móvil → 1 basta, ahorra memoria
  newTex.flipY = texture.flipY;
  newTex.needsUpdate = true;

  texture.dispose();

  cache.set(texture, newTex);
  return newTex;
 };

 root.traverse((child) => {
  if (!child.isMesh) return;
  const mats = Array.isArray(child.material) ? child.material : [child.material];
  mats.forEach((mat) => {
   if (!mat) return;

   if (mat.map) mat.map = resize(mat.map);
   if (mat.normalMap) mat.normalMap = resize(mat.normalMap);
   if (mat.roughnessMap) mat.roughnessMap = resize(mat.roughnessMap);
   if (mat.metalnessMap) mat.metalnessMap = resize(mat.metalnessMap);
   if (mat.aoMap) mat.aoMap = resize(mat.aoMap);
   if (mat.emissiveMap) mat.emissiveMap = resize(mat.emissiveMap);
   if (mat.bumpMap) mat.bumpMap = resize(mat.bumpMap);
   if (mat.displacementMap) mat.displacementMap = resize(mat.displacementMap);
   if (mat.alphaMap) mat.alphaMap = resize(mat.alphaMap);
   mat.needsUpdate = true;
  });
 });
}

export function buildProps({
 scene,
 attachToDesk,
 getDeskAnchor,
 getDeskTopSupport,
 getDeskSupportMeshes,
 getFloor,
 requestRender,
 isMobile = false, // opcional; en móvil saltamos props no esenciales
}) {
 const flameGroup = new THREE.Group();
 scene.add(flameGroup);
 flameGroup.visible = false;

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

 const flameCore = makeFlameCone(0, 0, 0.055, 0.006, "#ffd88a", 0.82);

 const flameMid = makeFlameCone(0, 0, 0.09, 0.014, "#ff8a28", 0.48);

 const flameOuter = makeFlameCone(0, 0, 0.12, 0.022, "#d84a0c", 0.22);

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

 const flameParams = {
  rocketFlameIntensity: 1.0,
  rocketFlameScale: 1.0,
  rocketFlickerSpeed: 1.0,
  rocketLightIntensity: 1.8,
 };

 const warmLight = new THREE.PointLight("#ff9a52", 2.6, 2.4, 2);
 warmLight.position.set(-4.03, 3.09, -2.12);
 scene.add(warmLight);

 const lamparaLight = new THREE.PointLight("#ff8c45", 1.4, 1.8, 2);
 lamparaLight.position.set(-3.8, 2.8, -2.0);
 scene.add(lamparaLight);

 const lamparaFlameLight = new THREE.PointLight("#ff7a2a", 1.85, 1.9, 2);
 lamparaFlameLight.position.set(-3.74, 2.5, 0.33);
 scene.add(lamparaFlameLight);

 const warmConfig = {
  color: warmLight.color.getHexString(),
  flicker: true,
  baseIntensity: 3.0,
  flickerAmplitude: 0.45,
  flickerSpeed: 10,
 };

 const chairLoader = new GLTFLoader(loadingManager);
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

 chairLoader.load("/modelos/astronauta_silla_2.glb", (gltf) => {
  chair = gltf.scene;

  if (isMobile) {
   downscaleGLBTextures(chair, 512);
  }

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
  const floor = getFloor();
  const deskSupportMeshes = getDeskSupportMeshes();

  if (!floor) return 0;

  chairRaycaster.set(new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0));

  const targets = [floor, ...deskSupportMeshes];
  const hits = chairRaycaster.intersectObjects(targets, false);
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

 const lamparaLoader = new GLTFLoader(loadingManager);
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

   attachToDesk(lamparaAnchor);
   updateLampara();

   flameGroup.visible = true;
   requestRender();
  },
  undefined,
  (err) => console.error("[Lámpara] Error:", err),
 );

 function getDeskSurfaceLocalY() {
  const deskTopSupport = getDeskTopSupport();
  if (!deskTopSupport) return 0;
  return deskTopSupport.position.y;
 }

 function placeOnDesk(anchor, root, params) {
  const deskTopSupport = getDeskTopSupport();
  if (!anchor || !root || !deskTopSupport) return;

  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.updateMatrixWorld(true);

  const worldBox = new THREE.Box3().setFromObject(root);

  const modelLocalMinY = worldBox.min.y - anchor.getWorldPosition(new THREE.Vector3()).y;

  const surfaceY = getDeskSurfaceLocalY();

  anchor.position.set(params.x, surfaceY - modelLocalMinY + params.y, params.z);
  anchor.rotation.set(0, params.rotY ?? 0, 0);
 }

 function updateLampara() {
  const deskTopSupport = getDeskTopSupport();
  const deskAnchor = getDeskAnchor();
  if (!lamparaRoot || !lamparaAnchor || !deskTopSupport) return;

  lamparaRoot.scale.setScalar(lamparaParams.scale);
  placeOnDesk(lamparaAnchor, lamparaRoot, lamparaParams);

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

 const tecladoLoader = new GLTFLoader(loadingManager);
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
  const deskTopSupport = getDeskTopSupport();
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

 if (!isMobile) {
  const ratonLoader = new GLTFLoader(loadingManager);
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
 }

 function updateRaton() {
  const deskTopSupport = getDeskTopSupport();
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

 const astronautLoader = new GLTFLoader(loadingManager);
 astronautLoader.load(
  "/modelos/astronauta.glb",
  (gltf) => {
   astronautRoot = gltf.scene;

   if (isMobile) {
    downscaleGLBTextures(astronautRoot, 512);
   }

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

  astronautRoot.scale.setScalar(astronautParams.scale);
  astronautRoot.rotation.set(0, 0, 0);
  astronautRoot.position.set(0, 0, 0);

  if (chairYaw && astronautAnchor.parent === chairYaw) {
   chairYaw.remove(astronautAnchor);
  }
  chairModelFix.updateMatrixWorld(true);
  const chairBox = new THREE.Box3().setFromObject(chairModelFix);

  const seatWorldY = chairBox.min.y + (chairBox.max.y - chairBox.min.y) * astronautParams.seatRatio;

  const tempBox = new THREE.Box3().setFromObject(astronautRoot);
  const astronautBaseOffset = tempBox.min.y; // cuánto sobresale por abajo del origen

  astronautAnchor.position.set(
   astronautParams.x,
   seatWorldY - astronautBaseOffset + astronautParams.y,
   astronautParams.z,
  );

  astronautAnchor.rotation.set(astronautParams.rotX, astronautParams.rotY, astronautParams.rotZ);

  if (chairYaw && astronautAnchor.parent !== chairYaw) {
   chairYaw.add(astronautAnchor);
  }

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

 function update({ elapsedTime, roomFade, warmFade }) {
  const wf = warmFade ?? roomFade;

  const warmBase = warmConfig.flicker
   ? warmConfig.baseIntensity + Math.sin(elapsedTime * warmConfig.flickerSpeed) * warmConfig.flickerAmplitude
   : warmConfig.baseIntensity;
  warmLight.intensity = warmBase * wf;

  const fSpd = flameParams.rocketFlickerSpeed;
  const fA = Math.sin(elapsedTime * 7.3 * fSpd) * 0.16;
  const fB = Math.sin(elapsedTime * 13.1 * fSpd + 1.2) * 0.09;
  const fC = Math.sin(elapsedTime * 4.7 * fSpd + 2.8) * 0.06;
  const flameBrightness = 1.0 + fA + fB + fC;
  const fInt = flameParams.rocketFlameIntensity;
  const fScl = flameParams.rocketFlameScale;

  lamparaLight.intensity = Math.max(0.3, flameParams.rocketLightIntensity * 0.75 * flameBrightness) * wf;
  lamparaFlameLight.intensity = Math.max(0.25, flameParams.rocketLightIntensity * 0.85 * flameBrightness) * wf;

  if (flameGroup.visible) {
   const jitterX = Math.sin(elapsedTime * 6.7 * fSpd + 1.3) * 0.004 + Math.sin(elapsedTime * 11.9 * fSpd + 3.1) * 0.002;
   const jitterY = Math.sin(elapsedTime * 4.9 * fSpd) * 0.006 + Math.sin(elapsedTime * 8.3 * fSpd + 2.2) * 0.003;

   const fcore = flameCore;
   const fcHeight = 0.92 + Math.sin(elapsedTime * 10.5 * fSpd) * 0.15;
   const fcWidth = 0.94 + Math.sin(elapsedTime * 13.7 * fSpd + 1.1) * 0.08;
   fcore.mesh.scale.set(fScl * fcWidth, fScl * fcHeight, fScl * fcWidth);
   fcore.mesh.position.set(jitterX * 0.5, jitterY * 0.5, 0);
   fcore.mat.opacity = (0.72 + Math.sin(elapsedTime * 8.9 * fSpd) * 0.1) * fInt * roomFade;

   const fmid = flameMid;
   const fmHeight = 0.85 + Math.sin(elapsedTime * 6.2 * fSpd + 0.7) * 0.22;
   const fmWidth = 0.9 + Math.sin(elapsedTime * 7.8 * fSpd + 0.9) * 0.12;
   fmid.mesh.scale.set(fScl * fmWidth, fScl * fmHeight, fScl * fmWidth);
   fmid.mesh.position.set(jitterX, jitterY, 0);
   fmid.mat.opacity = (0.4 + Math.sin(elapsedTime * 5.3 * fSpd + 0.6) * 0.14) * fInt * roomFade;

   const fout = flameOuter;
   const foHeight = 0.8 + Math.sin(elapsedTime * 3.8 * fSpd + 2.1) * 0.25;
   const foWidth = 0.85 + Math.sin(elapsedTime * 4.5 * fSpd + 1.8) * 0.18;
   fout.mesh.scale.set(fScl * foWidth, fScl * foHeight, fScl * foWidth);
   fout.mesh.position.set(jitterX * 1.3, jitterY * 0.7, 0);
   fout.mat.opacity = (0.18 + Math.sin(elapsedTime * 3.0 * fSpd + 1.5) * 0.08) * fInt * roomFade;

   const glowPulse = 0.35 + Math.sin(elapsedTime * 2.4 * fSpd) * 0.12;
   flameGlowSprite.material.opacity = glowPulse * fInt * roomFade;
   const glowS = fScl * (1.0 + Math.sin(elapsedTime * 3.1 * fSpd) * 0.08) * 0.085;
   flameGlowSprite.scale.set(glowS, glowS, 1);
  }
 }

 function dispose() {
  const deskAnchor = getDeskAnchor();

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

  flames.forEach(({ mesh, mat }) => {
   mesh.geometry.dispose();
   mat.dispose();
  });
  flameGlowTex.dispose();
  flameGlowMat.dispose();
  flameGroup.remove(flameGlowSprite);
  scene.remove(flameGroup);

  scene.remove(warmLight);
  scene.remove(lamparaLight);
  scene.remove(lamparaFlameLight);
 }

 return {
  lamparaParams,
  warmLight,
  lamparaFlameLight,

  updateChair,
  updateLampara,
  updateTeclado,
  updateRaton,
  updateAstronaut,

  update,
  dispose,
 };
}
