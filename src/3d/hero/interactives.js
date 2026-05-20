import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadingManager } from "../loadingManager";

/**
 * interactives.js
 * ─────────────────────────────────────────────────────────────────────────
 * Tres "objetos vivos" del Hero, cada uno con su propio ciclo:
 *
 *   buildNeon         — letrero "DAVID LLONA" en la pared (GLB + halos por letra
 *                        + 2 PointLights de rebote + animación de titileo)
 *   buildDogHologram  — perro holográfico cian sobre proyector cilíndrico
 *                        (encapsulado completo, vive sobre el escritorio)
 *   buildOrrery       — mueble con sistema solar bajo cúpula de cristal
 *                        (sol emisivo + 8 planetas con órbitas keplerianas)
 *
 * Filosofía: cada builder es propietario de sus geometrías, materiales y
 * texturas. El orquestador (heroScene.js) recibe los grupos, los posiciona
 * y llama a `update()` cada frame.
 *
 * Patrón de retorno:
 *   {
 *     group        — Three.Group raíz
 *     params       — objeto plain editable por GUI
 *     update(t,…)  — tick (recibe elapsedTime y opcionalmente roomFade)
 *     dispose()    — limpieza completa de recursos
 *     ...refs específicos que la GUI necesita
 *   }
 */

// ════════════════════════════════════════════════════════════════════════
// 💜 NEÓN — letrero "DAVID LLONA" en pared
// ════════════════════════════════════════════════════════════════════════
//
// Arquitectura:
//   neonGroup              — Group raíz, controlado por neonParams (GUI)
//   ├─ neonModel (GLB)     — letras 3D con materiales emissive (async)
//   │    └─ haloSprites[]  — uno por letra, sprite radial del color emissive
//   └─ (en escena, no en grupo) neonLight + neonLight2 — rebote violeta
//
// Animación: titileo lento de fósforo viejo. Letras "I" y "A" del mensaje
// oculto AI titilan más fuerte. Las letras NUNCA se apagan del todo
// (residual 0.08).
//
// IMPORTANTE: `model` se expone como GETTER porque se carga asíncrono.
// La GUI debe usar el getter cada vez (`neon.model`), nunca capturar
// el valor inicial.
export function buildNeon({ scene, requestRender }) {
 // ── Constantes de color/comportamiento ───────────────────────────────────
 // Morado del tubo principal. La versión 1 fue #7b5fff (violeta saturado
 // original del GLB) — fuera de paleta, competía con la habitación. La
 // versión 2 fue cian #5acfff — coherente con hologramas pero hacía perder
 // el carácter "neón retro" característico. Esta versión 3 es el punto
 // medio: morado más bajo en saturación y empuja al azul-frío, así entra
 // en la familia de azules del cosmos sin perder el "neón violeta".
 //   · #8870d8 = violeta apagado, menos chillón, más cinematográfico
 //   · emissiveIntensity baja de 3.5 a 2.6 → ya no quema, deja ver el
 //     gradiente de color en lugar de blanco puro en el centro
 // Las letras amarillas del mensaje "ai" oculto se mantienen — son
 // intencionales y el contraste violeta/amarillo lo refuerza, no lo rompe.
 const NEON_TUBE_HEX = 0x8870d8;
 const NEON_TUBE = new THREE.Color(NEON_TUBE_HEX);

 // ── Parámetros editables por GUI ─────────────────────────────────────────
 const params = {
  x: -1.14,
  y: 6.5,
  z: -3.88,
  scale: 0.89,
  intensity: 0.29,
  glowStrength: 0, // rebote de PointLights apagado, el glow es por letra
  flickerSpeed: 1.0,
  glbScale: 0.171,
  glbRotX: 0,
  glbRotY: 0,
  glbRotZ: 0,
  glbOffsetX: 0,
  glbOffsetY: 2.0,
  glbOffsetZ: 1.31,
  // Halo por letra (sprite radial por cada mesh)
  haloOpacity: 0.53,
  haloScale: 1.6,
 };

 // ── Grupo contenedor ─────────────────────────────────────────────────────
 // Antes contenía letras dibujadas a mano; ahora es el padre donde se
 // añadirá el neon.glb al cargar.
 const group = new THREE.Group();
 scene.add(group);

 // ── Luces de rebote ──────────────────────────────────────────────────────
 // Dos PointLights ligeramente desplazadas dan un rebote volumétrico.
 // La segunda está más baja y tenue → gradiente natural.
 // Distancias cortas (4.5 / 3.5) → el rebote violeta se concentra en la
 // pared detrás del letrero y no contamina escritorio ni robot.
 const neonLight = new THREE.PointLight(NEON_TUBE, 0.75, 4.5, 2.0);
 const neonLight2 = new THREE.PointLight(NEON_TUBE, 0.42, 3.5, 2.2);
 scene.add(neonLight);
 scene.add(neonLight2);

 // ── Posicionamiento inicial ──────────────────────────────────────────────
 group.position.set(params.x, params.y, params.z);
 group.scale.setScalar(params.scale);
 neonLight.position.set(params.x, params.y + 0.1, params.z + 0.4);
 neonLight2.position.set(params.x + 0.5, params.y - 0.2, params.z + 0.3);

 // ── Textura del halo (compartida por todos los sprites) ──────────────────
 const neonHaloCanvas = document.createElement("canvas");
 neonHaloCanvas.width = neonHaloCanvas.height = 256;
 (() => {
  const c = neonHaloCanvas.getContext("2d");
  const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  // Curva suave: núcleo caliente → fade largo. Stops migrados a la
  // familia violeta apagada (#8870d8). Mismo gradiente, otra base.
  g.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
  g.addColorStop(0.15, "rgba(195, 175, 240, 0.75)");
  g.addColorStop(0.4, "rgba(150, 120, 220, 0.25)");
  g.addColorStop(0.75, "rgba(100, 80, 170, 0.06)");
  g.addColorStop(1.0, "rgba(80, 60, 140, 0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
 })();
 const neonHaloTex = new THREE.CanvasTexture(neonHaloCanvas);
 neonHaloTex.colorSpace = THREE.SRGBColorSpace;

 // ── Estado mutable: el modelo se asigna cuando carga el GLB ──────────────
 const letterHalos = []; // [{sprite, mesh, color, isFlicker}]
 const glbMats = [];
 let model = null;

 // ── Carga del GLB ────────────────────────────────────────────────────────
 const loader = new GLTFLoader(loadingManager); // ambas líneas, mismo cambio
 loader.load(
  "/modelos/neon_22.glb",
  (gltf) => {
   model = gltf.scene;

   // Recentrar geometría físicamente (pivot en el centro del letrero)
   const box = new THREE.Box3().setFromObject(model);
   const center = box.getCenter(new THREE.Vector3());

   model.traverse((child) => {
    if (!child.isMesh) return;

    child.geometry.translate(-center.x, -center.y, -center.z);

    const mat = child.material;

    // Si el GLB trae el color en baseColor y emissive está en negro, copiamos
    const emissiveIsBlack = mat.emissive.r < 0.01 && mat.emissive.g < 0.01 && mat.emissive.b < 0.01;
    if (emissiveIsBlack) mat.emissive.copy(mat.color);

    // ── Detección del mensaje "ai" oculto ANTES de cambiar el color ──────
    // Las letras del mensaje "ai" vienen amarillas del GLB. Tenemos que
    // detectarlas AHORA porque a continuación sobrescribimos el resto a
    // cian, y entonces ya no sabríamos cuáles eran las amarillas.
    const e = mat.emissive;
    const isFlicker = e.r > 0.5 && e.g > 0.4 && e.b < 0.25;
    child.userData.isFlicker = isFlicker;

    // ── Override de color: violeta → cian (mantiene amarillas del flicker) ──
    // El GLB original tiene letras violetas (#7b5fff). Las pasamos a cian
    // para alinear con la paleta del portfolio. Ver explicación en la
    // constante NEON_TUBE_HEX al inicio de buildNeon.
    if (!isFlicker) mat.emissive.setHex(NEON_TUBE_HEX);

    // Emissive moderado — antes era 3.5 con tonemapping desactivado, lo
    // que daba un blanco quemado en el centro de cada letra. 2.6 deja ver
    // el gradiente del color (violeta saturándose hacia el centro) en
    // lugar de blanco puro: más cinematográfico, más integrado.
    mat.emissiveIntensity = 2.6;
    mat.toneMapped = false;
    mat.roughness = 0.4;
    mat.metalness = 0.0;
    mat.transparent = false;
    mat.opacity = 1.0;
    mat.needsUpdate = true;

    child.userData.baseIntensity = 2.6;

    glbMats.push(child);

    // ── Halo individual anclado a ESTA letra ────────────────────────────
    // Cada letra tiene su propio sprite radial del color de su emissive.
    // Se escala según el bounding de la letra → letras pequeñas glow
    // pequeño, letras grandes glow grande. Esto es lo que el ojo lee como
    // "cada letra emite por sí misma".
    const letterBox = new THREE.Box3().setFromObject(child);
    const letterSize = letterBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(letterSize.x, letterSize.y);

    const haloMat = new THREE.SpriteMaterial({
     map: neonHaloTex,
     color: mat.emissive.clone(),
     transparent: true,
     opacity: 0,
     blending: THREE.AdditiveBlending,
     depthWrite: false,
     toneMapped: false,
    });
    const haloSprite = new THREE.Sprite(haloMat);
    haloSprite.scale.set(maxDim * 2.5, maxDim * 2.5, 1);
    // Centrado en la letra, ligeramente detrás en Z (hacia la pared)
    const letterCenter = letterBox.getCenter(new THREE.Vector3());
    // Convertimos a coordenadas locales del model para que siga las transforms
    model.worldToLocal(letterCenter);
    haloSprite.position.copy(letterCenter);
    haloSprite.position.z -= 0.02;
    haloSprite.renderOrder = -1;

    model.add(haloSprite);
    letterHalos.push({
     sprite: haloSprite,
     mesh: child,
     color: mat.emissive.clone(),
     isFlicker: child.userData.isFlicker,
    });
   });

   // Transform desde params
   model.rotation.set(params.glbRotX, params.glbRotY, params.glbRotZ);
   model.scale.setScalar(params.glbScale);
   model.position.set(params.glbOffsetX, params.glbOffsetY, params.glbOffsetZ);

   group.add(model);
   requestRender();
  },
  undefined,
  (err) => console.error("[neon_22.glb] error:", err),
 );

 // ── Update tick ──────────────────────────────────────────────────────────
 // roomFade: 0 cuando estamos fuera de la habitación (ej. exterior), 1 en interior.
 // Permite apagar el neón sin reescalar params.intensity.
 function update(elapsedTime, roomFade) {
  // Posición / luces — actualizables en vivo desde GUI
  group.position.set(params.x, params.y, params.z);
  group.scale.setScalar(params.scale);
  neonLight.position.set(params.x, params.y + 0.3, params.z + 0.4);
  neonLight2.position.set(params.x + 0.5, params.y - 0.2, params.z + 0.3);

  if (model && glbMats.length && roomFade > 0.05) {
   const stableMult = params.intensity * roomFade;

   // ── Flicker sutil y lento ─────────────────────────────────────────
   // Onda a 4.5 rad/s (≈0.7 Hz, respiración lenta) + gate muy ocasional.
   // Sensación de tubo viejo pero no "luz rota".
   const wave = 0.82 + Math.sin(elapsedTime * 4.5) * 0.18;
   const gate = Math.sin(elapsedTime * 0.7) > 0.96 ? 0.55 : 1;
   const glitch = Math.random() > 0.997 ? 0.5 : 1;
   const flickerMult = wave * gate * glitch * params.intensity * roomFade;

   let avgLit = 0;
   glbMats.forEach((mesh) => {
    const base = mesh.userData.baseIntensity || 3.5;
    if (mesh.userData.isFlicker) {
     mesh.material.emissiveIntensity = base * flickerMult;
     avgLit += flickerMult;
    } else {
     mesh.material.emissiveIntensity = base * stableMult;
     avgLit += stableMult;
    }
   });
   avgLit /= Math.max(1, glbMats.length);

   // ── Halo por letra: opacidad sigue al emissive de su mesh ──────────
   // Cada halo hereda el nivel de luz de su letra → si la letra titila,
   // su halo también. Así se lee que cada tubo emite por sí mismo.
   letterHalos.forEach((h) => {
    const m = h.isFlicker ? flickerMult : stableMult;
    h.sprite.material.opacity = params.haloOpacity * m;
   });

   // Luces de rebote (estarán a 0 porque glowStrength=0, pero por si se sube)
   neonLight.intensity = avgLit * 1.1 * params.glowStrength * roomFade;
   neonLight2.intensity = avgLit * 0.5 * params.glowStrength * roomFade;
  } else {
   neonLight.intensity = 0;
   neonLight2.intensity = 0;
   letterHalos.forEach((h) => (h.sprite.material.opacity = 0));
  }
 }

 // ── Cleanup ──────────────────────────────────────────────────────────────
 function dispose() {
  if (model) {
   model.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) child.geometry.dispose();
    if (child.material?.map) child.material.map.dispose();
    if (child.material?.dispose) child.material.dispose();
   });
  }
  letterHalos.forEach((h) => {
   if (h.sprite.material) h.sprite.material.dispose();
  });
  if (neonHaloTex) neonHaloTex.dispose();
  scene.remove(group);
  scene.remove(neonLight);
  scene.remove(neonLight2);
 }

 // ── Salida ───────────────────────────────────────────────────────────────
 // `model` se expone como GETTER para reflejar siempre el valor actual,
 // ya que se asigna asíncronamente cuando termina la carga del GLB.
 return {
  group,
  params,
  letterHalos,
  get model() {
   return model;
  },
  update,
  dispose,
 };
}

// ════════════════════════════════════════════════════════════════════════
// 🐕 WOODY — proyector cilíndrico con holograma de mi perro real
// ════════════════════════════════════════════════════════════════════════
//
// Carga `dog.glb` (modelo low-poly de Woody, ~5k tris, generado con foto
// de referencia). Sobre la geometría del modelo se aplica el material
// holograma cian translúcido para que se lea como una proyección, no como
// un perro sólido. El proyector cilíndrico debajo, el anillo ámbar y el
// scan line se mantienen del diseño anterior.
//
// Adicionalmente se añade una placa metálica con el texto "WOODY" en la
// base del proyector — identifica al perro como "el mío", no uno genérico.
//
// Animación interna (userData.update): respiración de opacidad + scan line
// vertical + flicker orgánico de la luz + rotación lenta del modelo.
//
// Compatibilidad con GUI: el `group` retornado mantiene la misma API que
// la versión anterior (`position`, `scale`, `visible`, `userData.holoLight`),
// así que `gui.js` no necesita cambios.
export function buildDogHologram({ attachToDesk, getDeskTopSupport, requestRender }) {
 // ── Paleta cian — dos tonos para jerarquía visual ───────────────────────
 const cyan = new THREE.Color("#5ad7ff"); // cuerpo / anillo (proyectado)
 const cyanBright = new THREE.Color("#9eeaff"); // emisor / wire / scan (luz)

 const group = new THREE.Group();

 // ── Materiales del holograma ────────────────────────────────────────────
 // Sólido translúcido cian. NO aditivo — evita sobre-exposición en zonas
 // donde el modelo se solapa consigo mismo. DoubleSide por translucidez.
 const bodyMat = new THREE.MeshBasicMaterial({
  color: cyan,
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide,
  depthWrite: false,
  toneMapped: false,
 });

 // Wireframe — aristas realzadas. Aditivo para que sumen luz sin dominar.
 const wireMat = new THREE.LineBasicMaterial({
  color: cyanBright,
  transparent: true,
  opacity: 0.42,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
 });

 // ── Subgrupo del modelo — levitado sobre el proyector ──────────────────
 const dogBody = new THREE.Group();
 dogBody.position.y = 0.05; // flota ligeramente → lee como proyección
 group.add(dogBody);

 // Lista de wireframes para el dispose.
 const dogWires = [];

 // Carga del GLB. Mientras tanto el grupo está vacío — el resto del
 // dispositivo (proyector, anillo, scan, luz) ya es funcional.
 const loader = new GLTFLoader(loadingManager); // ambas líneas, mismo cambio
 loader.load(
  "/modelos/dog.glb",
  (gltf) => {
   const model = gltf.scene;

   // Recentrado: el GLB no se exportó con "pivote inferior central", así
   // que calculamos la bbox y reposicionamos para que la base apoye en
   // y=0 (relativo a dogBody) y X/Z queden centrados.
   model.updateMatrixWorld(true);
   const box = new THREE.Box3().setFromObject(model);
   const center = box.getCenter(new THREE.Vector3());
   model.position.set(-center.x, -box.min.y, -center.z);

   // Escala: queremos que Woody quepa en el proyector (radio ~0.32u del
   // ring). Tras el recentrado, lo escalamos para que tenga presencia
   // visible — antes se quedaba enano y se perdía en la escena.
   model.updateMatrixWorld(true);
   const sized = new THREE.Box3().setFromObject(model);
   const height = sized.max.y - sized.min.y;
   const targetHeight = 0.85;
   const k = targetHeight / Math.max(height, 0.0001);
   model.scale.multiplyScalar(k);

   // Sustituir material original del GLB por el holograma cian, y añadir
   // wireframe sumado encima. Igual receta que el perro procedural pero
   // aplicada a la geometría real.
   model.traverse((child) => {
    if (!child.isMesh) return;
    child.material = bodyMat;
    child.castShadow = false;
    child.receiveShadow = false;

    // EdgesGeometry con threshold de 30° — solo aristas marcadas, evita
    // saturar la silueta con los miles de microaristas internas del mesh.
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(child.geometry, 30), wireMat);
    wire.position.set(0, 0, 0);
    wire.rotation.set(0, 0, 0);
    child.add(wire);
    dogWires.push(wire);
   });

   dogBody.add(model);
   requestRender();
  },
  undefined,
  (err) => {
   console.error("[Woody] Error cargando dog.glb:", err);
  },
 );

 // ── Proyector — cuerpo físico del dispositivo ───────────────────────────
 const projectorBodyMat = new THREE.MeshBasicMaterial({
  color: "#0b1828",
  transparent: true,
  opacity: 0.92,
  toneMapped: false,
 });
 const projectorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.025, 48), projectorBodyMat);
 projectorBody.position.y = 0.013;
 group.add(projectorBody);

 // Anillo exterior — borde luminoso del dispositivo
 const ringMat = new THREE.MeshBasicMaterial({
  color: "#c8a870",
  transparent: true,
  opacity: 0.55,
  side: THREE.DoubleSide,
  depthWrite: false,
  toneMapped: false,
 });
 const ring = new THREE.Mesh(new THREE.RingGeometry(0.295, 0.325, 64), ringMat);
 ring.rotation.x = -Math.PI * 0.5;
 ring.position.y = 0.028;
 group.add(ring);

 // ── Placa "WOODY" — al frente del proyector ─────────────────────────────
 // Se construye con un canvas: base oscura + texto ámbar grabado + delgado
 // separador horizontal arriba y abajo, estilo placa industrial.
 // El plano siempre mira a +X (lado de la cámara cuando el espectador está
 // frente al escritorio). Posicionado pegado al borde frontal del proyector.
 const plateCv = document.createElement("canvas");
 plateCv.width = 256;
 plateCv.height = 64;
 const pctx = plateCv.getContext("2d");

 // Fondo: degradado oscuro tipo metal anodizado
 const grad = pctx.createLinearGradient(0, 0, 0, 64);
 grad.addColorStop(0, "#15181f");
 grad.addColorStop(0.5, "#0d1017");
 grad.addColorStop(1, "#15181f");
 pctx.fillStyle = grad;
 pctx.fillRect(0, 0, 256, 64);

 // Líneas finas ámbar arriba y abajo
 pctx.strokeStyle = "rgba(200, 168, 112, 0.55)";
 pctx.lineWidth = 1;
 pctx.beginPath();
 pctx.moveTo(20, 8);
 pctx.lineTo(236, 8);
 pctx.moveTo(20, 56);
 pctx.lineTo(236, 56);
 pctx.stroke();

 // Texto "WOODY" centrado, color ámbar idéntico al ring del proyector
 pctx.font = `600 26px -apple-system, "Segoe UI", "Helvetica Neue", sans-serif`;
 pctx.textAlign = "center";
 pctx.textBaseline = "middle";
 pctx.fillStyle = "#e8c890";
 pctx.shadowColor = "rgba(200, 168, 112, 0.4)";
 pctx.shadowBlur = 6;
 pctx.letterSpacing = "4px";
 pctx.fillText("W O O D Y", 128, 34);
 pctx.shadowBlur = 0;

 const plateTex = new THREE.CanvasTexture(plateCv);
 plateTex.colorSpace = THREE.SRGBColorSpace;
 plateTex.anisotropy = 4;

 const plateMat = new THREE.MeshBasicMaterial({
  map: plateTex,
  transparent: true,
  toneMapped: false,
  depthWrite: false,
 });

 // Plano vertical: 0.55u de ancho por 0.14u de alto (proporción 4:1 del canvas).
 // Apoyado en el borde frontal del proyector, ligeramente sobre el suelo del
 // mismo. La X positiva en local apunta hacia la cámara cuando Woody está
 // colocado en el escritorio (la posición global se gestiona en `place()`).
 const PLATE_W = 0.55;
 const PLATE_H = 0.14;
 const plate = new THREE.Mesh(new THREE.PlaneGeometry(PLATE_W, PLATE_H), plateMat);
 plate.position.set(0, 0.085, 0.32); // ligeramente sobre el proyector, borde frontal
 plate.rotation.x = -Math.PI * 0.08; // muy ligero tilt hacia la cámara para legibilidad
 group.add(plate);

 // ── Scan line — anillo fino que recorre el holograma en vertical ────────
 const scanMat = new THREE.MeshBasicMaterial({
  color: cyanBright,
  transparent: true,
  opacity: 0.45,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  depthWrite: false,
  toneMapped: false,
 });
 const scan = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.18, 48), scanMat);
 scan.rotation.x = -Math.PI * 0.5;
 scan.position.y = 0.15;
 group.add(scan);

 // ── Luz de rebote cian — tiñe muy sutilmente el entorno cercano ────────
 const holoLight = new THREE.PointLight(cyan, 0.7, 1.3, 2.2);
 holoLight.position.set(0, 0.4, 0);
 group.add(holoLight);

 // ── Update interno — respiración + scan + hover ────────────────────────
 // Muy sutil a propósito. Si no se llama, el holograma se ve perfectamente
 // estático también (sin estados rotos).
 const SCAN_MIN = 0.05;
 const SCAN_MAX = 0.72;
 // Parámetros mutables expuestos al GUI vía userData.holoParams. La
 // velocidad de rotación es el único parámetro de animación que el
 // espectador percibe inmediatamente; permitir afinarlo en vivo facilita
 // encontrar el punto exacto entre "estático" y "torcido".
 const holoParams = {
  rotSpeed: 0.24, // 0 = estático | 0.25 = vuelta cada ~25 s | 0.5 = mareo
 };

 // ── Estado de hover ─────────────────────────────────────────────────────
 // hoverTarget: 0 ó 1 — lo dispara el listener de mousemove (más abajo).
 // hoverLerp: valor actual suavizado [0..1] — sube/baja con lerp por frame.
 //
 // El boost de hover NO sustituye la respiración: se SUMA encima. Así el
 // holograma sigue "vivo" pero al pasar el cursor "se da cuenta".
 const hoverParams = {
  target: 0,
  lerp: 0,
 };

 const tickInternal = (t) => {
  // Hover lerp — converge al target con factor 0.12 por frame
  hoverParams.lerp += (hoverParams.target - hoverParams.lerp) * 0.12;
  const h = hoverParams.lerp; // 0 = idle, 1 = hover pleno

  // Respiración de opacidad — ±0.07 alrededor de 0.5. Apenas perceptible.
  const breath = Math.sin(t * 1.25) * 0.07;

  // Cuerpo cian: idle ~0.5, hover ~0.65 (más sólido, más presente)
  bodyMat.opacity = 0.5 + breath + h * 0.15;
  // Wireframe: idle ~0.42, hover ~0.6 (aristas se acentúan)
  wireMat.opacity = 0.42 + breath * 0.6 + h * 0.18;

  // Scan: barrido vertical lento. En hover acelera 1.5× → comunica "atento".
  // Y la opacidad del scan también sube un poco.
  const scanSpeed = 0.55 * (1 + h * 0.5);
  const t01 = Math.sin(t * scanSpeed) * 0.5 + 0.5;
  scan.position.y = SCAN_MIN + t01 * (SCAN_MAX - SCAN_MIN);
  const edgeFade = Math.sin(t01 * Math.PI);
  scanMat.opacity = 0.25 + edgeFade * 0.3 + h * 0.18;

  // Anillo ámbar del proyector: idle 0.55, hover 0.88 → la base se enciende
  ringMat.opacity = 0.55 + h * 0.33;

  // Micro flicker orgánico de la luz cian + boost en hover.
  // idle ~0.7, hover ~1.12 (luz de rebote más viva sobre la mesa)
  holoLight.intensity = 0.7 + Math.sin(t * 2.1) * 0.04 + h * 0.42;

  // Rotación lenta del modelo — velocidad afinable desde el GUI.
  // En hover, ligero boost (1.15×) — apenas perceptible pero subliminal.
  dogBody.rotation.y = t * holoParams.rotSpeed * (1 + h * 0.15);

  // Mientras el lerp de hover no haya convergido (entrada o salida),
  // seguimos pidiendo render. Sin esto, al sacar el cursor el holograma
  // se quedaría en hover hasta el siguiente cambio de scroll/cámara.
  if (Math.abs(hoverParams.target - hoverParams.lerp) > 0.001) {
   requestRender();
  }
 };

 // userData expone todo lo que el GUI puede ajustar en vivo.
 group.userData.update = tickInternal;
 group.userData.holoLight = holoLight;
 group.userData.holoParams = holoParams;
 // Setter de hover — lo llama el listener de mousemove para activar el feedback
 group.userData.setHover = (on) => {
  hoverParams.target = on ? 1 : 0;
 };

 // ── Posicionamiento sobre el escritorio ─────────────────────────────────
 group.scale.setScalar(1.09); // dispositivo, no escultura
 const place = () => {
  const desk = getDeskTopSupport();
  if (!desk) {
   requestAnimationFrame(place);
   return;
  }
  // Lado derecho de la mesa, ligeramente delante de la línea de monitores.
  // Posición de partida — afinable en vivo desde el GUI (folder "🐕 Woody").
  group.position.set(3.78, desk.position.y + 0.01, 0.2);
 };
 attachToDesk(group);
 place();

 // ════════════════════════════════════════════════════════════════════════
 // CLICK + MODAL — al pulsar sobre Woody se abre un panel con foto,
 // nombre y texto. ESC, X o click en backdrop cierran.
 // ════════════════════════════════════════════════════════════════════════
 //
 // Estrategia: raycast propio del builder (sin tocar heroScene).
 //   - Hover detecta cuando el cursor está sobre Woody → cambia a "pointer"
 //   - Click: si el rayo intersecta Woody, abre el modal
 //   - El modal es HTML inyectado en body — mejor legibilidad que canvas+plano
 //
 // La cámara no se pasa como parámetro (mantenemos la API de buildDogHologram
 // sin tocar). Se busca al vuelo en el árbol de la escena la primera vez.

 const raycaster = new THREE.Raycaster();
 const mouse = new THREE.Vector2();
 let cachedCamera = null;
 let isHovering = false;

 const findCamera = () => {
  let node = group;
  while (node.parent) node = node.parent; // sube hasta la scene root
  let foundCam = null;
  node.traverse((child) => {
   if (foundCam) return;
   if (child.isPerspectiveCamera) foundCam = child;
  });
  return foundCam;
 };

 const updateMouse = (event) => {
  // Coordenadas normalizadas [-1, 1] respecto al canvas
  const canvas = document.querySelector("#webgl");
  if (!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return true;
 };

 const intersectsWoody = () => {
  if (!cachedCamera) cachedCamera = findCamera();
  if (!cachedCamera) return false;
  raycaster.setFromCamera(mouse, cachedCamera);
  const meshes = [];
  dogBody.traverse((child) => {
   if (child.isMesh) meshes.push(child);
  });
  if (meshes.length === 0) return false;
  return raycaster.intersectObjects(meshes, false).length > 0;
 };

 const onMouseMove = (event) => {
  if (!group.visible) return;
  if (!updateMouse(event)) return;
  const hit = intersectsWoody();
  if (hit !== isHovering) {
   isHovering = hit;
   document.body.classList.toggle("woody-hover", isHovering);
   // Activa el feedback visual 3D del holograma (boost de opacidad / luz /
   // scan / anillo). El lerp dentro del tick suaviza la transición.
   group.userData.setHover(hit);
   // Despertar el render: si la escena está idle (sin animaciones activas)
   // el rAF no se está pidiendo; sin esto el hover no se vería.
   requestRender();
  }
 };

 const onClick = (event) => {
  if (!group.visible) return;
  if (!updateMouse(event)) return;
  if (intersectsWoody()) openModal();
 };

 window.addEventListener("mousemove", onMouseMove, { passive: true });
 window.addEventListener("click", onClick, { passive: true });

 // ── MODAL HTML ──────────────────────────────────────────────────────────
 // Foto a la izquierda (desktop) o arriba (mobile), texto a la derecha.
 // Coherente con la paleta del portfolio: oscuro + ámbar de acento, sans-serif.
 const modalRoot = document.createElement("div");
 modalRoot.className = "woody-modal";
 modalRoot.innerHTML = `
  <div class="woody-modal__backdrop"></div>
  <div class="woody-modal__panel" role="dialog" aria-label="Woody">
   <button class="woody-modal__close" aria-label="Cerrar">×</button>
   <div class="woody-modal__photo" aria-hidden="true"></div>
   <div class="woody-modal__body">
    <div class="woody-modal__eyebrow">EL DE VERDAD</div>
    <h2 class="woody-modal__name">Woody</h2>
    <div class="woody-modal__rule"></div>
    <p class="woody-modal__text">
     Este es Woody. Mi sombra negra y peluda durante todos estos años de pantalla.
     Cuando algo de este portfolio funciona, probablemente él estaba debajo del
     escritorio mientras yo lo escribía.
    </p>
    <p class="woody-modal__caption">El holograma es solo una proyección. El original duerme aquí cerca.</p>
   </div>
  </div>
 `;

 // Estilos — inyectados una sola vez con id para evitar duplicados en HMR
 const STYLE_ID = "woody-modal-styles";
 if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
   body.woody-hover, body.woody-hover * { cursor: pointer !important; }

   .woody-modal {
    position: fixed; inset: 0; z-index: 9999;
    pointer-events: none; opacity: 0;
    transition: opacity 280ms ease;
   }
   .woody-modal.open { pointer-events: auto; opacity: 1; }

   .woody-modal__backdrop {
    position: absolute; inset: 0;
    background: rgba(8, 10, 16, 0.74);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
   }

   .woody-modal__panel {
    position: relative;
    max-width: 680px; margin: 8vh auto; padding: 0;
    background: linear-gradient(180deg, #11141d 0%, #0b0e16 100%);
    border: 1px solid rgba(200, 168, 112, 0.22);
    border-radius: 14px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(90, 215, 255, 0.04);
    display: grid; grid-template-columns: 280px 1fr;
    overflow: hidden;
    transform: translateY(12px) scale(0.985);
    transition: transform 320ms cubic-bezier(.2,.8,.2,1);
   }
   .woody-modal.open .woody-modal__panel { transform: translateY(0) scale(1); }

   .woody-modal__close {
    position: absolute; top: 10px; right: 14px;
    width: 32px; height: 32px;
    background: transparent; color: rgba(232,200,144,0.8);
    border: 1px solid rgba(200,168,112,0.35);
    border-radius: 50%;
    font-size: 22px; line-height: 28px; padding: 0;
    cursor: pointer;
    transition: background 180ms ease, color 180ms ease;
    z-index: 2;
   }
   .woody-modal__close:hover { background: rgba(200,168,112,0.14); color: #fff; }

   .woody-modal__photo {
    background-image: url('/images/woody.jpg');
    background-size: cover; background-position: center;
    min-height: 320px;
    border-right: 1px solid rgba(200, 168, 112, 0.12);
   }

   .woody-modal__body {
    padding: 36px 36px 32px;
    color: #e5ecf6;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif;
   }
   .woody-modal__eyebrow {
    font-size: 11px; letter-spacing: 4px;
    color: #c8a870; margin-bottom: 14px;
   }
   .woody-modal__name {
    margin: 0 0 14px; font-size: 38px; font-weight: 600;
    color: #f3f6fa; letter-spacing: 0.5px;
   }
   .woody-modal__rule {
    width: 32px; height: 1px;
    background: rgba(200, 168, 112, 0.6);
    margin-bottom: 18px;
   }
   .woody-modal__text {
    margin: 0 0 14px; line-height: 1.55;
    color: rgba(229, 236, 246, 0.86); font-size: 15px;
   }
   .woody-modal__caption {
    margin: 0; font-size: 12.5px; color: rgba(160, 178, 210, 0.72);
    font-style: italic; line-height: 1.5;
   }

   @media (max-width: 700px) {
    .woody-modal__panel {
     margin: 4vh 16px;
     grid-template-columns: 1fr;
     max-height: 92vh;
    }
    .woody-modal__photo { min-height: 220px; border-right: none;
     border-bottom: 1px solid rgba(200,168,112,0.12); }
    .woody-modal__body { padding: 28px 24px; }
    .woody-modal__name { font-size: 30px; }
   }
  `;
  document.head.appendChild(style);
 }

 document.body.appendChild(modalRoot);

 const closeBtn = modalRoot.querySelector(".woody-modal__close");
 const backdrop = modalRoot.querySelector(".woody-modal__backdrop");

 const openModal = () => {
  modalRoot.classList.add("open");
  document.body.style.overflow = "hidden";
 };
 const closeModal = () => {
  modalRoot.classList.remove("open");
  document.body.style.overflow = "";
 };

 closeBtn.addEventListener("click", closeModal);
 backdrop.addEventListener("click", closeModal);

 // ESC también cierra
 const onKeyDown = (e) => {
  if (e.key === "Escape" && modalRoot.classList.contains("open")) closeModal();
 };
 window.addEventListener("keydown", onKeyDown);

 // ── Cleanup ──────────────────────────────────────────────────────────────
 function dispose() {
  // Listeners del raycast + modal
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("click", onClick);
  window.removeEventListener("keydown", onKeyDown);
  document.body.classList.remove("woody-hover");
  document.body.style.overflow = "";

  // Modal HTML
  if (modalRoot.parentNode) modalRoot.parentNode.removeChild(modalRoot);

  // Texturas del canvas de la placa
  plateTex.dispose();
  plateMat.dispose();

  group.traverse((child) => {
   if (child.isMesh || child.isLineSegments) {
    if (child.geometry) child.geometry.dispose();
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => m && m.dispose && m.dispose());
   }
  });
  // Wireframes generados al cargar el GLB
  dogWires.forEach((w) => {
   if (w.geometry) w.geometry.dispose();
  });
  // El padre real es deskAnchor. Quitarlo de ahí evita memory leak si la
  // mesa persiste pero el hero se reinicia.
  if (group.parent) group.parent.remove(group);
 }

 return {
  group,
  update: tickInternal,
  dispose,
 };
}

// ════════════════════════════════════════════════════════════════════════
// 🪐 ORRERY — mueble con maqueta del sistema solar bajo cúpula de cristal
// ════════════════════════════════════════════════════════════════════════
//
// Pieza de "vitrina de museo" en la esquina derecha. Un mueble bajo
// sostiene una cúpula semi-transparente con un sistema solar en
// miniatura: sol central emisivo + 8 planetas con órbitas keplerianas
// + cantos luminosos ámbar perimetrales en la base.
//
// Movimiento: rotación orbital muy lenta. Presencia, no animación.
export function buildOrrery({ scene }) {
 const group = new THREE.Group();

 // ── Mueble (pedestal) — más grande para acomodar sistema solar completo ─
 const PEDESTAL_W = 0.9;
 const PEDESTAL_H = 0.48;
 const PEDESTAL_D = 0.55;

 const pedestalMat = new THREE.MeshStandardMaterial({
  color: "#1a1c26",
  roughness: 0.72,
  metalness: 0.35,
 });

 // ── Mueble-base: caja achatada con cantos ámbar ────────────────────────
 //
 // Arquitectura en 3 capas para que tenga profundidad real:
 //   1) Cuerpo oscuro (caja principal) — opaco, mate, da volumen
 //   2) Cantos perimetrales emisivos — línea ámbar por las 4 aristas de
 //      arriba. Es el "LED strip" del mueble. La luz nace del objeto.
 //   3) Tapa fina metálica — donde se apoya el pedestal de la cúpula.
 const BASE_W = PEDESTAL_W * 1.35;
 const BASE_D = PEDESTAL_D * 1.35;
 const BASE_H = 0.14;

 // Cuerpo principal — oscuro y mate. Lo que da "volumen sólido".
 const baseBodyMat = new THREE.MeshStandardMaterial({
  color: "#15171f",
  roughness: 0.82,
  metalness: 0.28,
 });
 const baseBody = new THREE.Mesh(new THREE.BoxGeometry(BASE_W, BASE_H, BASE_D), baseBodyMat);
 baseBody.position.y = BASE_H * 0.5;
 group.add(baseBody);

 // Tapa metálica superior — plano fino donde se apoya el pedestal.
 // Ligeramente más pequeña que el cuerpo → crea un rebaje visible donde
 // se aloja la línea LED. Roughness bajo = refleja un poco el ámbar.
 const baseTopMat = new THREE.MeshStandardMaterial({
  color: "#2a2d38",
  roughness: 0.45,
  metalness: 0.7,
 });
 const baseTop = new THREE.Mesh(new THREE.BoxGeometry(BASE_W * 0.92, 0.008, BASE_D * 0.92), baseTopMat);
 baseTop.position.y = BASE_H + 0.005;
 group.add(baseTop);

 // Cantos luminosos perimetrales — 4 barras finas ámbar encajadas en el
 // rebaje entre cuerpo y tapa. AQUÍ nace la luz del mueble.
 // opacity 0.78: a 0.95 + toneMapped:false los cantos saltan como líneas
 // demasiado brillantes al rotar cámara. 0.78 mantiene presencia pero deja
 // que el tone mapping del entorno los integre.
 const edgeLedMat = new THREE.MeshBasicMaterial({
  color: "#ff9a4a",
  transparent: true,
  opacity: 0.78,
  toneMapped: false,
 });
 const LED_T = 0.012;
 const LED_H = 0.018;

 const makeEdgeBar = (w, d, x, z) => {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(w, LED_H, d), edgeLedMat);
  bar.position.set(x, BASE_H - LED_H * 0.35, z);
  group.add(bar);
 };

 // Frontal / trasera / laterales
 makeEdgeBar(BASE_W, LED_T, 0, BASE_D * 0.5 - LED_T * 0.5);
 makeEdgeBar(BASE_W, LED_T, 0, -BASE_D * 0.5 + LED_T * 0.5);
 makeEdgeBar(LED_T, BASE_D, BASE_W * 0.5 - LED_T * 0.5, 0);
 makeEdgeBar(LED_T, BASE_D, -BASE_W * 0.5 + LED_T * 0.5, 0);

 // Luz cálida emitida desde los cantos — baña el pedestal desde abajo
 // y tiñe el suelo alrededor del mueble. Contenida a 2u.
 const edgeLight = new THREE.PointLight("#ff9a4a", 1.0, 2.0, 2.4);
 edgeLight.position.set(0, BASE_H + 0.05, 0);
 group.add(edgeLight);

 // Rebote tenue en el suelo justo alrededor del mueble — círculo sprite
 // ámbar aditivo. Da la sensación de que la luz "escurre" por el suelo.
 const floorGlowCv = document.createElement("canvas");
 floorGlowCv.width = floorGlowCv.height = 128;
 {
  const ctx = floorGlowCv.getContext("2d");
  const gr = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0.0, "rgba(255, 154, 74, 0.55)");
  gr.addColorStop(0.4, "rgba(255, 140, 60, 0.18)");
  gr.addColorStop(1.0, "rgba(255, 140, 60, 0)");
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 128, 128);
 }
 const floorGlowTex = new THREE.CanvasTexture(floorGlowCv);
 floorGlowTex.colorSpace = THREE.SRGBColorSpace;
 const floorGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(BASE_W * 2.3, BASE_D * 2.3),
  new THREE.MeshBasicMaterial({
   map: floorGlowTex,
   transparent: true,
   depthWrite: false,
   blending: THREE.AdditiveBlending,
   toneMapped: false,
  }),
 );
 floorGlow.rotation.x = -Math.PI * 0.5;
 floorGlow.position.y = 0.002;
 group.add(floorGlow);

 const pedestal = new THREE.Mesh(new THREE.BoxGeometry(PEDESTAL_W, PEDESTAL_H, PEDESTAL_D), pedestalMat);
 pedestal.position.y = BASE_H + PEDESTAL_H * 0.5;
 group.add(pedestal);

 // Tapa superior: disco metálico
 const capMat = new THREE.MeshStandardMaterial({
  color: "#242736",
  roughness: 0.55,
  metalness: 0.55,
 });
 const cap = new THREE.Mesh(new THREE.CylinderGeometry(PEDESTAL_W * 0.48, PEDESTAL_W * 0.48, 0.025, 32), capMat);
 cap.position.y = BASE_H + PEDESTAL_H + 0.012;
 group.add(cap);

 // Banda luminosa inferior de la cúpula
 const stripMat = new THREE.MeshBasicMaterial({
  color: "#d78a4a",
  transparent: true,
  opacity: 0.7,
  toneMapped: false,
 });
 const strip = new THREE.Mesh(new THREE.TorusGeometry(PEDESTAL_W * 0.46, 0.004, 8, 64), stripMat);
 strip.rotation.x = Math.PI * 0.5;
 strip.position.y = BASE_H + PEDESTAL_H + 0.024;
 group.add(strip);

 // ── Cúpula de cristal — grande y MUY transparente para ver el contenido ─
 const DOME_RADIUS = 0.5;
 const domeGeo = new THREE.SphereGeometry(DOME_RADIUS, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.5);
 // Material afinado para que la cúpula sea ESTABLE al orbitar la cámara.
 //
 // Antes: roughness 0.08 + metalness 0.3 + DoubleSide. Con esos valores la
 // cúpula era casi un espejo. Las PointLights internas (`edgeLight` y
 // `orreryLight`) generaban highlights especulares muy nítidos que se
 // desplazaban por la superficie al orbitar — efecto físicamente correcto
 // pero el ojo lo lee como "las luces bailan". Encima de eso, DoubleSide
 // + depthWrite:false + el contenido transparente dentro (halos de
 // planetas, sun halo, orbits) provocaba microflickering por orden de
 // renderizado al cambiar la cámara.
 //
 // Ahora: cristal SATINADO. Sigue siendo cristal claro, deja ver el
 // sistema solar perfectamente, pero los highlights son gradientes
 // difusos en vez de spots nítidos → al orbitar el cambio es suave,
 // no salta. Cambios:
 //   - roughness 0.08 → 0.4   (los highlights se difuminan)
 //   - metalness  0.3  → 0.0  (cristal real, no metal)
 //   - side       Double→Front (un lado, reduce orden de transparencias)
 //   - opacity    0.14 → 0.18 (un punto más sólida, integra los reflejos)
 const domeMat = new THREE.MeshStandardMaterial({
  color: "#8ab0e0",
  roughness: 0.4,
  metalness: 0.0,
  transparent: true,
  opacity: 0.18,
  depthWrite: false,
  side: THREE.FrontSide,
 });
 const dome = new THREE.Mesh(domeGeo, domeMat);
 dome.position.y = BASE_H + PEDESTAL_H + 0.025;
 group.add(dome);

 // Aro metálico que cierra la cúpula contra el pedestal
 const domeRingMat = new THREE.MeshStandardMaterial({
  color: "#3a404f",
  roughness: 0.4,
  metalness: 0.75,
 });
 const domeRing = new THREE.Mesh(new THREE.TorusGeometry(DOME_RADIUS * 0.98, 0.014, 8, 64), domeRingMat);
 domeRing.rotation.x = Math.PI * 0.5;
 domeRing.position.y = BASE_H + PEDESTAL_H + 0.028;
 group.add(domeRing);

 // ── Contenido del orrery (vive en un grupo para moverlo en conjunto) ────
 const inner = new THREE.Group();
 inner.position.y = BASE_H + PEDESTAL_H + 0.06;
 group.add(inner);

 // ── SOL central — esfera emisiva cálida, más presencia ─────────────────
 const sunMat = new THREE.MeshBasicMaterial({
  color: "#ffc877",
  toneMapped: false,
 });
 const sun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 18), sunMat);
 sun.position.y = 0.2;
 inner.add(sun);

 // Halo del sol — sprite radial
 const haloCv = document.createElement("canvas");
 haloCv.width = haloCv.height = 128;
 {
  const ctx = haloCv.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0.0, "rgba(255, 210, 130, 0.95)");
  grad.addColorStop(0.25, "rgba(250, 170, 90, 0.55)");
  grad.addColorStop(0.6, "rgba(230, 140, 70, 0.15)");
  grad.addColorStop(1.0, "rgba(230, 140, 70, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
 }
 const haloTex = new THREE.CanvasTexture(haloCv);
 haloTex.colorSpace = THREE.SRGBColorSpace;
 const haloMat = new THREE.SpriteMaterial({
  map: haloTex,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
 });
 const sunHalo = new THREE.Sprite(haloMat);
 sunHalo.scale.set(0.48, 0.48, 0.48);
 sunHalo.position.y = 0.2;
 inner.add(sunHalo);

 // ── Órbitas (anillos guía) — finos, ámbar muy apagado ──────────────────
 const orbitMat = new THREE.MeshBasicMaterial({
  color: "#a07850",
  transparent: true,
  opacity: 0.55,
  side: THREE.DoubleSide,
  depthWrite: false,
  toneMapped: false,
 });
 const makeOrbit = (radius) => {
  // TorusGeometry (no RingGeometry) — tiene volumen 3D, se ve desde
  // cualquier ángulo. Un Ring plano de 0.0012 era invisible a la
  // distancia de la cámara.
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.0045, 4, 72), orbitMat);
  orbit.rotation.x = -Math.PI * 0.5;
  orbit.position.y = 0.2;
  inner.add(orbit);
 };

 // ── 8 PLANETAS — tamaños/distancias/velocidades relativas ──────────────
 // Distancias escaladas logarítmicamente (si fuera real, Neptuno estaría
 // fuera de la cúpula). Velocidades ∝ 1/sqrt(radius) como Kepler manda.
 // Colores aproximados a los reales — identidad del sistema solar.
 const planetSpecs = [
  { name: "mercury", color: "#b8a38a", size: 0.035, radius: 0.09, speed: 0.62, phase: 0.0 },
  { name: "venus", color: "#f0cc8a", size: 0.048, radius: 0.13, speed: 0.46, phase: 1.2 },
  { name: "earth", color: "#5a9cd8", size: 0.05, radius: 0.17, speed: 0.36, phase: 2.4 },
  { name: "mars", color: "#d86a4a", size: 0.042, radius: 0.21, speed: 0.28, phase: 3.6 },
  { name: "jupiter", color: "#e9b878", size: 0.082, radius: 0.26, speed: 0.17, phase: 0.5 },
  { name: "saturn", color: "#f0d89c", size: 0.072, radius: 0.31, speed: 0.13, phase: 1.8, ring: true },
  { name: "uranus", color: "#9fd4dc", size: 0.055, radius: 0.37, speed: 0.09, phase: 3.0 },
  { name: "neptune", color: "#4a7acc", size: 0.055, radius: 0.42, speed: 0.07, phase: 4.3 },
 ];

 const controls = {
  planetSize: 0.32,
  orbitSpeed: 1.15,
  sunSize: 1.04,
 };

 // Textura de glow compartida — un solo canvas, 8 sprites la usan.
 const planetGlowCv = document.createElement("canvas");
 planetGlowCv.width = planetGlowCv.height = 64;
 {
  const ctx = planetGlowCv.getContext("2d");
  const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0.0, "rgba(255,255,255,0.95)");
  gr.addColorStop(0.35, "rgba(255,255,255,0.35)");
  gr.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 64, 64);
 }
 const planetGlowTex = new THREE.CanvasTexture(planetGlowCv);
 planetGlowTex.colorSpace = THREE.SRGBColorSpace;

 const planets = planetSpecs.map((spec) => {
  makeOrbit(spec.radius);

  const mat = new THREE.MeshBasicMaterial({
   color: spec.color,
   toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(spec.size, 14, 10), mat);
  mesh.position.y = 0.2;
  mesh.renderOrder = 10; // se pinta DESPUÉS de la cúpula transparente
  inner.add(mesh);

  // Glow aditivo del color del planeta — los hace visibles sobre fondo oscuro
  const glowMat = new THREE.SpriteMaterial({
   map: planetGlowTex,
   color: new THREE.Color(spec.color),
   transparent: true,
   blending: THREE.AdditiveBlending,
   depthWrite: false,
   toneMapped: false,
   opacity: 0.7,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(spec.size * 3.2);
  glow.renderOrder = 11;
  mesh.add(glow);

  // Anillo de Saturno
  if (spec.ring) {
   const ringMat = new THREE.MeshBasicMaterial({
    color: "#c8a870",
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
   });
   const saturnRing = new THREE.Mesh(new THREE.RingGeometry(spec.size * 1.4, spec.size * 2.1, 48), ringMat);
   saturnRing.rotation.x = -Math.PI * 0.5 + 0.28;
   saturnRing.renderOrder = 10;
   mesh.add(saturnRing);
  }

  return { mesh, ...spec };
 });

 // ── Luz interna — más fuerte, el contenido debe leerse ─────────────────
 const orreryLight = new THREE.PointLight("#ffb060", 2.37, 3.2, 2.0);
 orreryLight.position.set(0, BASE_H + PEDESTAL_H + 0.26, 0);
 group.add(orreryLight);

 // ── Update — órbitas + respiración del sol ─────────────────────────────
 const tickInternal = (t) => {
  const { planetSize, orbitSpeed, sunSize } = controls;
  planets.forEach((p) => {
   const a = t * p.speed * orbitSpeed + p.phase;
   p.mesh.position.x = Math.cos(a) * p.radius;
   p.mesh.position.z = Math.sin(a) * p.radius;
   p.mesh.rotation.y = t * p.speed * orbitSpeed * 3;
   p.mesh.scale.setScalar(planetSize);
  });
  sun.scale.setScalar(sunSize);
  sunHalo.scale.setScalar(0.48 * sunSize);
  haloMat.opacity = 0.85 + Math.sin(t * 0.9) * 0.1;
  orreryLight.intensity = 2.37 + Math.sin(t * 1.3) * 0.06;
 };

 // userData se mantiene para compatibilidad con la GUI que accede a
 // `orrery.userData.orreryLight` y `orrery.userData.controls`.
 group.userData.update = tickInternal;
 group.userData.orreryLight = orreryLight;
 group.userData.controls = controls;

 // ── Posicionamiento sobre el suelo ──────────────────────────────────────
 group.scale.setScalar(2.05);
 group.position.set(4.5, 0, -3.12);
 group.rotation.y = -0.35;
 scene.add(group);

 // ── Cleanup ──────────────────────────────────────────────────────────────
 // El orrery original no tenía dispose explícito. Añadimos uno sano para
 // evitar memory leaks: cleanup de geometrías, materiales y texturas.
 function dispose() {
  group.traverse((child) => {
   if (child.isMesh) {
    if (child.geometry) child.geometry.dispose();
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
     if (m && m.map) m.map.dispose();
     if (m && m.dispose) m.dispose();
    });
   }
   if (child.isSprite && child.material) {
    if (child.material.map) child.material.map.dispose();
    child.material.dispose();
   }
  });
  scene.remove(group);
 }

 return {
  group,
  update: tickInternal,
  dispose,
 };
}
