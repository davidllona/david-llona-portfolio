import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadingManager } from "../loadingManager";

/**
 * props.js
 * ─────────────────────────────────────────────────────────────────────────
 * Props del Hero: silla + astronauta + lámpara/cohete + teclado + ratón.
 * También: las 3 luces que dependen del sistema flame del cohete.
 *
 * Contiene:
 *   - Chair  (silla GLB con raycast contra suelo+mesa para apoyarse)
 *   - Astronauta (sentado sobre la silla, hijo de chairYaw)
 *   - Lámpara/cohete (sobre la mesa, esquina derecha)
 *   - Teclado (delante de los monitores)
 *   - Ratón (a la derecha del teclado)
 *   - Sistema flame (3 conos + sprite glow para la base del cohete)
 *   - 3 luces: warmLight (key cálida), lamparaLight, lamparaFlameLight
 *   - Tick del flame system (jitter orgánico tipo fuego real)
 *
 * Dependencias externas (vía getters porque son async):
 *   - getDeskAnchor / getDeskTopSupport / getDeskSupportMeshes (de desk.js)
 *   - getFloor (de room.js, para raycast de la silla)
 *   - attachToDesk (de desk.js, para adjuntar lámpara/teclado/ratón)
 *
 * Interfaz con el orquestador:
 *   - El orquestador llama updateChair/updateLampara/etc. dentro del
 *     onDeskReady callback para que se reposicionen cuando la mesa carga.
 *   - update({ elapsedTime, roomFade }) anima warmLight + flame + las luces
 *     del cohete cada frame.
 */
export function buildProps({
 scene,
 attachToDesk,
 getDeskAnchor,
 getDeskTopSupport,
 getDeskSupportMeshes,
 getFloor,
 requestRender,
}) {
 // ════════════════════════════════════════════════════════════════════════
 // SISTEMA FLAME — 3 conos + sprite glow para la base del cohete
 // ════════════════════════════════════════════════════════════════════════
 // El flame es un grupo independiente que se posiciona dinámicamente sobre
 // la base de la lámpara cada vez que updateLampara se ejecuta. Se mantiene
 // invisible hasta que la lámpara carga.
 const flameGroup = new THREE.Group();
 scene.add(flameGroup);
 flameGroup.visible = false;

 // ── Canvas de glow para el sprite ────────────────────────────────────────
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

 // Núcleo blanco-ámbar tibio — el centro más caliente
 const flameCore = makeFlameCone(0, 0, 0.055, 0.006, "#ffd88a", 0.82);
 // Media naranja profundo — más fuego que lámpara
 const flameMid = makeFlameCone(0, 0, 0.09, 0.014, "#ff8a28", 0.48);
 // Exterior rojo-ámbar muy diáfano — "humo caliente"
 const flameOuter = makeFlameCone(0, 0, 0.12, 0.022, "#d84a0c", 0.22);

 // Sprite de glow — escala hacia abajo (Y negativo = bajo el cohete)
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

 // Parámetros de llama (no se exponen en GUI actualmente — encapsulados)
 const flameParams = {
  rocketFlameIntensity: 1.0,
  rocketFlameScale: 1.0,
  rocketFlickerSpeed: 1.0,
  rocketLightIntensity: 1.8,
 };

 // ════════════════════════════════════════════════════════════════════════
 // LUCES DEL COHETE — 3 luces que dependen del sistema flame
 // ════════════════════════════════════════════════════════════════════════
 // WARM KEY del cohete — cálida pero CONTENIDA.
 // distance bajo para que NO se coma toda la escena.
 const warmLight = new THREE.PointLight("#ff9a52", 2.6, 3.8, 2);
 warmLight.position.set(-4.03, 3.09, -2.12);
 scene.add(warmLight);

 // Luz de la lámpara/cohete — íntima, zona mesa/base del cohete.
 const lamparaLight = new THREE.PointLight("#ff8c45", 1.4, 3.0, 2);
 lamparaLight.position.set(-3.8, 2.8, -2.0);
 scene.add(lamparaLight);

 // Llama del cohete — modero color y mantengo intensidad.
 const lamparaFlameLight = new THREE.PointLight("#ff7a2a", 1.85, 3.2, 2);
 lamparaFlameLight.position.set(-3.74, 2.5, 0.33);
 scene.add(lamparaFlameLight);

 // Config del warmLight (flicker controlado)
 const warmConfig = {
  color: warmLight.color.getHexString(),
  flicker: true,
  baseIntensity: 3.0,
  flickerAmplitude: 0.45,
  flickerSpeed: 10,
 };

 // ════════════════════════════════════════════════════════════════════════
 // CHAIR — silla con raycast contra suelo + soporte de la mesa
 // ════════════════════════════════════════════════════════════════════════
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

 // Raycast vertical contra suelo + soporte de la mesa para encontrar la
 // cota Y donde la silla debe asentarse.
 function getChairSupportY(x, z) {
  const floor = getFloor();
  const deskSupportMeshes = getDeskSupportMeshes();

  // Si aún no hay floor cargado, devolver 0 (la silla quedará en y=0
  // hasta el siguiente updateChair tras cargar el room).
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

 // ════════════════════════════════════════════════════════════════════════
 // LÁMPARA / COHETE — sobre la mesa, esquina derecha
 // ════════════════════════════════════════════════════════════════════════
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

   // Adjuntar a deskAnchor cuando esté disponible
   attachToDesk(lamparaAnchor);
   updateLampara();
   // Activar y posicionar las llamas del cohete
   flameGroup.visible = true;
   requestRender();
  },
  undefined,
  (err) => console.error("[Lámpara] Error:", err),
 );

 // ── Helper: cota de la superficie del escritorio ─────────────────────────
 // deskTopSupport.position.y es la referencia canónica — la calcula updateDesk()
 // y es exactamente la Y local (en espacio de deskAnchor) del tablero.
 // Usamos eso en lugar de recalcular bbox del deskAnchor completo,
 // lo que evita que los objetos hijos contaminen el resultado.
 function getDeskSurfaceLocalY() {
  const deskTopSupport = getDeskTopSupport();
  if (!deskTopSupport) return 0;
  return deskTopSupport.position.y;
 }

 // ── Helper: ajustar un modelo sobre la superficie del escritorio ────────
 // anchor: el Group hijo de deskAnchor
 // root:   el gltf.scene dentro del anchor (ya escalado)
 // params: { x, y, z, rotY }
 // Calcula el punto base real del modelo (min.y de su bbox) y lo apoya
 // sobre la cota del tablero. params.y es un offset corrector ajustable.
 function placeOnDesk(anchor, root, params) {
  const deskTopSupport = getDeskTopSupport();
  if (!anchor || !root || !deskTopSupport) return;

  // Aseguramos que la escala/posición base del root están aplicadas
  // antes de medir su bbox
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.updateMatrixWorld(true);

  // Bbox del modelo en world-space → convertimos a local de deskAnchor
  const worldBox = new THREE.Box3().setFromObject(root);
  // El origen del anchor está en deskAnchor-space, así que el min.y del
  // modelo en world-space = anchor.position.y + modelo_localMin.y
  // Necesitamos localMin.y para saber cuánto sobresale por debajo del origin
  const modelLocalMinY = worldBox.min.y - anchor.getWorldPosition(new THREE.Vector3()).y;

  // Cota del tablero en local de deskAnchor
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

  // Mantener llamas alineadas con la base de la lámpara
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

 // ════════════════════════════════════════════════════════════════════════
 // TECLADO — sobre la mesa, delante de los monitores
 // ════════════════════════════════════════════════════════════════════════
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

 // ════════════════════════════════════════════════════════════════════════
 // RATÓN — a la derecha del teclado
 // ════════════════════════════════════════════════════════════════════════
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

 // ════════════════════════════════════════════════════════════════════════
 // ASTRONAUTA — sentado sobre la silla, hijo de chairYaw
 // ════════════════════════════════════════════════════════════════════════
 //
 // Jerarquía:
 //   chairAnchor
 //     └── chairYaw         ← aquí se adjunta, hereda posición+rotación
 //           ├── chairModelFix → chair
 //           └── astronautAnchor → astronautRoot
 //
 // La bbox de la silla se calcula solo sobre chairModelFix (nunca incluyendo
 // al astronauta) para no contaminar el cálculo de groundOffset.
 //
 // seatApproxY: punto de apoyo inicial = min.y + altura * seatRatio
 // Luego params.y corrige cualquier desviación sin fórmulas cerradas.
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

   // Ajuste de materiales — misma paleta que la silla
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

   // Adjuntar a chairYaw — hereda posición del anchor + rotación del yaw
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

  // 1. Aplicar escala + rotación local al root
  astronautRoot.scale.setScalar(astronautParams.scale);
  astronautRoot.rotation.set(0, 0, 0);
  astronautRoot.position.set(0, 0, 0);

  // 2. Calcular la bbox de la silla (solo chairModelFix — sin astronauta)
  //    Temporalmente quitamos el astronauta del árbol para una bbox limpia
  if (chairYaw && astronautAnchor.parent === chairYaw) {
   chairYaw.remove(astronautAnchor);
  }
  chairModelFix.updateMatrixWorld(true);
  const chairBox = new THREE.Box3().setFromObject(chairModelFix);

  // 3. Calcular seatY en coordenadas locales de chairYaw
  //    min.y + (max.y - min.y) * seatRatio da la altura del asiento
  //    Convertimos a coordenadas locales de chairYaw con worldToLocal
  const seatWorldY = chairBox.min.y + (chairBox.max.y - chairBox.min.y) * astronautParams.seatRatio;

  // 4. Calcular la bbox propia del astronauta para encontrar su punto base
  //    Necesitamos la bbox en local-space del anchor → escalamos el root primero
  const tempBox = new THREE.Box3().setFromObject(astronautRoot);
  const astronautBaseOffset = tempBox.min.y; // cuánto sobresale por abajo del origen

  // 5. Colocar el anchor: su Y en coordenadas locales de chairYaw
  //    para que el pie del astronauta coincida con seatY
  astronautAnchor.position.set(
   astronautParams.x,
   seatWorldY - astronautBaseOffset + astronautParams.y,
   astronautParams.z,
  );

  // 6. Rotación: mira hacia los monitores (en la dirección del yaw de la silla)
  //    rotY=0 = misma dirección que la silla, positivo = giro hacia la izquierda
  astronautAnchor.rotation.set(astronautParams.rotX, astronautParams.rotY, astronautParams.rotZ);

  // 7. Re-adjuntar a chairYaw
  if (chairYaw && astronautAnchor.parent !== chairYaw) {
   chairYaw.add(astronautAnchor);
  }

  // 8. Brightness
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

 // ════════════════════════════════════════════════════════════════════════
 // TICK — warmLight (con flicker) + flame system + 2 luces del cohete
 // ════════════════════════════════════════════════════════════════════════
 // Recibe roomFade del orquestador (calculado a partir del scroll).
 // Todas las intensidades se escalan por roomFade → al salir de la habitación
 // las luces del cohete se apagan suavemente con el resto.
 function update({ elapsedTime, roomFade }) {
  // ── warmLight con flicker controlado ────────────────────────────────────
  const warmBase = warmConfig.flicker
   ? warmConfig.baseIntensity + Math.sin(elapsedTime * warmConfig.flickerSpeed) * warmConfig.flickerAmplitude
   : warmConfig.baseIntensity;
  warmLight.intensity = warmBase * roomFade;

  // ── Flicker de la llama del cohete — tres senos a frecuencias primas ────
  // Las frecuencias primas (7.3, 13.1, 4.7) evitan el patrón perceptible
  // que daría usar múltiplos enteros. Resultado: luz de fuego "viva".
  const fSpd = flameParams.rocketFlickerSpeed;
  const fA = Math.sin(elapsedTime * 7.3 * fSpd) * 0.16;
  const fB = Math.sin(elapsedTime * 13.1 * fSpd + 1.2) * 0.09;
  const fC = Math.sin(elapsedTime * 4.7 * fSpd + 2.8) * 0.06;
  const flameBrightness = 1.0 + fA + fB + fC;
  const fInt = flameParams.rocketFlameIntensity;
  const fScl = flameParams.rocketFlameScale;

  lamparaLight.intensity = Math.max(0.3, flameParams.rocketLightIntensity * 0.75 * flameBrightness) * roomFade;
  lamparaFlameLight.intensity = Math.max(0.25, flameParams.rocketLightIntensity * 0.85 * flameBrightness) * roomFade;

  // Animar las tres capas de llama más el sprite de glow
  if (flameGroup.visible) {
   // Jitter común de posición (las tres capas lo comparten → coherencia)
   // Ruido sumado de tres senos = fluctuación orgánica tipo fuego real.
   const jitterX = Math.sin(elapsedTime * 6.7 * fSpd + 1.3) * 0.004 + Math.sin(elapsedTime * 11.9 * fSpd + 3.1) * 0.002;
   const jitterY = Math.sin(elapsedTime * 4.9 * fSpd) * 0.006 + Math.sin(elapsedTime * 8.3 * fSpd + 2.2) * 0.003;

   // Núcleo — corto, oscila rápido en altura
   const fcore = flameCore;
   const fcHeight = 0.92 + Math.sin(elapsedTime * 10.5 * fSpd) * 0.15;
   const fcWidth = 0.94 + Math.sin(elapsedTime * 13.7 * fSpd + 1.1) * 0.08;
   fcore.mesh.scale.set(fScl * fcWidth, fScl * fcHeight, fScl * fcWidth);
   fcore.mesh.position.set(jitterX * 0.5, jitterY * 0.5, 0);
   fcore.mat.opacity = (0.72 + Math.sin(elapsedTime * 8.9 * fSpd) * 0.1) * fInt * roomFade;

   // Media — más amplitud de altura, da la "lengua" del fuego
   const fmid = flameMid;
   const fmHeight = 0.85 + Math.sin(elapsedTime * 6.2 * fSpd + 0.7) * 0.22;
   const fmWidth = 0.9 + Math.sin(elapsedTime * 7.8 * fSpd + 0.9) * 0.12;
   fmid.mesh.scale.set(fScl * fmWidth, fScl * fmHeight, fScl * fmWidth);
   fmid.mesh.position.set(jitterX, jitterY, 0);
   fmid.mat.opacity = (0.4 + Math.sin(elapsedTime * 5.3 * fSpd + 0.6) * 0.14) * fInt * roomFade;

   // Exterior — lento, amplio, casi humo
   const fout = flameOuter;
   const foHeight = 0.8 + Math.sin(elapsedTime * 3.8 * fSpd + 2.1) * 0.25;
   const foWidth = 0.85 + Math.sin(elapsedTime * 4.5 * fSpd + 1.8) * 0.18;
   fout.mesh.scale.set(fScl * foWidth, fScl * foHeight, fScl * foWidth);
   fout.mesh.position.set(jitterX * 1.3, jitterY * 0.7, 0);
   fout.mat.opacity = (0.18 + Math.sin(elapsedTime * 3.0 * fSpd + 1.5) * 0.08) * fInt * roomFade;

   // Sprite glow — pulso lento
   const glowPulse = 0.35 + Math.sin(elapsedTime * 2.4 * fSpd) * 0.12;
   flameGlowSprite.material.opacity = glowPulse * fInt * roomFade;
   const glowS = fScl * (1.0 + Math.sin(elapsedTime * 3.1 * fSpd) * 0.08) * 0.085;
   flameGlowSprite.scale.set(glowS, glowS, 1);
  }
 }

 // ════════════════════════════════════════════════════════════════════════
 // CLEANUP — todos los GLBs + flame + 3 luces del cohete
 // ════════════════════════════════════════════════════════════════════════
 function dispose() {
  const deskAnchor = getDeskAnchor();

  // Astronauta (hijo de chairYaw, se elimina con chairAnchor pero
  // hacemos dispose explícito de geometrías y materiales)
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

  // Lámpara (hija de deskAnchor)
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

  // Teclado (hija de deskAnchor)
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

  // Ratón (hija de deskAnchor)
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

  // Silla (incluye al astronauta como hijo)
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

  // Llamas del cohete — conos + sprite glow + texturas
  flames.forEach(({ mesh, mat }) => {
   mesh.geometry.dispose();
   mat.dispose();
  });
  flameGlowTex.dispose();
  flameGlowMat.dispose();
  flameGroup.remove(flameGlowSprite);
  scene.remove(flameGroup);

  // 3 luces del cohete
  scene.remove(warmLight);
  scene.remove(lamparaLight);
  scene.remove(lamparaFlameLight);
 }

 // ════════════════════════════════════════════════════════════════════════
 // SALIDA — solo lo que GUI o el orquestador necesitan
 // ════════════════════════════════════════════════════════════════════════
 return {
  // Refs para GUI
  lamparaParams,
  warmLight,
  lamparaFlameLight,

  // Funciones que el orquestador llama desde onDeskReady
  updateChair,
  updateLampara,
  updateTeclado,
  updateRaton,
  updateAstronaut,

  // Tick + cleanup
  update,
  dispose,
 };
}
