import * as THREE from "three";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * GUI BROKER (productor / consumidor)
 * ─────────────────────────────────────────────────────────────────────────
 * heroScene.js es el único sitio que CREA la instancia de lil-gui.
 * Otras escenas (Projects, futuros laboratorios, etc.) la CONSUMEN para
 * añadir sus propios folders.
 *
 * Patrón:
 *
 *   // En heroScene.js (productor) — UNA vez, después de `new GUI()`:
 *   import { setGui } from "./hero/gui";
 *   setGui(gui);
 *
 *   // En cualquier consumidor (Projects.jsx, etc.):
 *   import { onGuiReady, attachProjectsGUI } from "../3d/hero/gui";
 *   const off = onGuiReady((gui) => attachProjectsGUI(gui, refs));
 *   // ... y en cleanup: off();
 *
 * Si el productor ya creó el GUI antes de que el consumidor se monte,
 * el callback se ejecuta inmediatamente. Si no, queda en cola hasta
 * que setGui() lo dispare. Sin polling, sin window globals.
 */
let _gui = null;
let _waiters = [];

export function setGui(gui) {
 _gui = gui;
 const queue = _waiters;
 _waiters = [];
 queue.forEach((cb) => {
  try {
   cb(gui);
  } catch (err) {
   console.error("[gui broker] error en callback:", err);
  }
 });
}

export function getGui() {
 return _gui;
}

export function onGuiReady(cb) {
 if (_gui) {
  cb(_gui);
  return () => {};
 }
 _waiters.push(cb);
 return () => {
  _waiters = _waiters.filter((w) => w !== cb);
 };
}

export function clearGui() {
 _gui = null;
 _waiters = [];
}

/**
 * attachHeroGUI
 * ─────────────────────────────────────────────────────────────────────────
 * Engancha todos los folders de debug a la instancia `gui` de lil-gui que
 * crea `heroScene.js`. La función NO crea ni destruye el GUI: solo añade
 * controles. El owner del ciclo de vida del GUI sigue siendo `heroScene.js`.
 *
 * Filosofía: este archivo es un consumidor puro. No produce objetos, no
 * mantiene estado interno, no toca el render loop. Recibe referencias y
 * las cablea a sliders. Por eso recibe TODO por parámetro: si en el
 * futuro extraemos un módulo (p. ej. la luna), basta con cambiar la ref
 * que se pasa aquí.
 *
 * @param {GUI}    gui   Instancia de lil-gui ya creada en heroScene.
 * @param {object} refs  Todas las referencias necesarias (ver destructuring).
 */
export function attachHeroGUI(gui, refs) {
 const {
  // ── Params (objetos plain editables) ───────────────────────────────
  neonParams,
  monitorParams,
  wireScreen,
  lamparaParams,
  lightMultipliers,
  cameraBase,
  starsParams,
  moonParams,
  nebulaParams,
  ufoParams,
  claimParams,
  asteroidParams,

  // ── Objetos Three.js (referencias vivas) ───────────────────────────
  neonLetterHalos,
  neon,
  wallPoster,
  posterSpot,
  dogHologram,
  orrery,
  warmLight,
  lamparaFlameLight,
  renderer,
  camera,
  controls,
  extMoon,
  nebulaMesh,

  // ── Constantes del exterior ────────────────────────────────────────
  EXT_X,
  EXT_Y,
  EXT_Z,

  // ── Funciones de actualización ─────────────────────────────────────
  requestRender,
  updateMonitors,
  updateLampara,
  updateMoon,
  updateNebula,
  regenerateNebula,
  updateUfo,
  updateClaim,
  buildKeyframes,
  getScrollProgress,
 } = refs;

 // ─────────────────────────────────────────────────────────────────────
 // 💜 NEÓN (letrero de pared)
 // ─────────────────────────────────────────────────────────────────────
 const neonFolder = gui.addFolder("💜 Neón");

 // Posición del conjunto (luces + modelo) — rangos muy amplios
 neonFolder.add(neonParams, "x", -20, 20, 0.01).name("x grupo").onChange(requestRender);
 neonFolder.add(neonParams, "y", -10, 25, 0.01).name("y grupo").onChange(requestRender);
 neonFolder.add(neonParams, "z", -20, 10, 0.01).name("z grupo").onChange(requestRender);
 neonFolder.add(neonParams, "scale", 0.01, 10, 0.01).name("scale grupo").onChange(requestRender);
 neonFolder.add(neonParams, "intensity", 0, 10, 0.01).name("intensidad").onChange(requestRender);
 neonFolder.add(neonParams, "glowStrength", 0, 10, 0.01).name("glow").onChange(requestRender);

 // Halo atmosférico
 neonFolder.add(neonParams, "haloOpacity", 0, 3, 0.01).name("halo opacidad").onChange(requestRender);
 neonFolder
  .add(neonParams, "haloScale", 0.1, 10, 0.05)
  .name("halo tamaño")
  .onChange(() => {
   // Cada halo se re-escala según el bounding de SU letra
   neonLetterHalos.forEach((h) => {
    const letterBox = new THREE.Box3().setFromObject(h.mesh);
    const letterSize = letterBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(letterSize.x, letterSize.y);
    const s = maxDim * neonParams.haloScale * 1.5;
    h.sprite.scale.set(s, s, 1);
   });
   requestRender();
  });

 // ── Ajustes específicos del GLB (rotación/escala internas) ──────────
 const applyNeonGlbTransform = () => {
  const m = neon.model; // getter — siempre lee el valor actual
  if (m) {
   m.rotation.set(neonParams.glbRotX, neonParams.glbRotY, neonParams.glbRotZ);
   m.scale.setScalar(neonParams.glbScale);
   m.position.set(neonParams.glbOffsetX, neonParams.glbOffsetY, neonParams.glbOffsetZ);
   requestRender();
  }
 };

 neonFolder.add(neonParams, "glbScale", 0.001, 10, 0.001).name("escala GLB").onChange(applyNeonGlbTransform);
 neonFolder
  .add(neonParams, "glbRotX", -Math.PI * 2, Math.PI * 2, 0.01)
  .name("rot X")
  .onChange(applyNeonGlbTransform);
 neonFolder
  .add(neonParams, "glbRotY", -Math.PI * 2, Math.PI * 2, 0.01)
  .name("rot Y")
  .onChange(applyNeonGlbTransform);
 neonFolder
  .add(neonParams, "glbRotZ", -Math.PI * 2, Math.PI * 2, 0.01)
  .name("rot Z")
  .onChange(applyNeonGlbTransform);
 neonFolder.add(neonParams, "glbOffsetX", -15, 15, 0.01).name("offset X").onChange(applyNeonGlbTransform);
 neonFolder.add(neonParams, "glbOffsetY", -15, 15, 0.01).name("offset Y").onChange(applyNeonGlbTransform);
 neonFolder.add(neonParams, "glbOffsetZ", -15, 15, 0.01).name("offset Z").onChange(applyNeonGlbTransform);

 neonFolder.close();

 // ─────────────────────────────────────────────────────────────────────
 // 📺 PANTALLAS (monitores)
 // ─────────────────────────────────────────────────────────────────────
 const screensFolder = gui.addFolder("📺 Pantallas");
 screensFolder.add(monitorParams, "scale", 0.5, 4, 0.01).onChange(updateMonitors);
 screensFolder.add(monitorParams, "brightness", 0, 2, 0.01).onChange(updateMonitors);
 screensFolder.add(monitorParams, "gap", 0, 4, 0.001).onChange(updateMonitors);
 screensFolder.add(monitorParams, "leftX", -3, 3, 0.01).onChange(updateMonitors);
 screensFolder.add(monitorParams, "rightX", -3, 3, 0.01).onChange(updateMonitors);
 screensFolder.add(monitorParams, "tiltLeftY", -1, 1, 0.001).onChange(updateMonitors);
 screensFolder.add(monitorParams, "tiltRightY", -1, 1, 0.001).onChange(updateMonitors);
 screensFolder.add(monitorParams, "yOffset", -1, 1, 0.001).onChange(updateMonitors);
 screensFolder.add(monitorParams, "zOffset", -1, 1, 0.001).onChange(updateMonitors);
 screensFolder.add(wireScreen, "fps", 1, 30, 1).name("wire FPS");
 screensFolder.add(wireScreen, "speed", 0, 4, 0.05).name("wire velocidad");

 // ─────────────────────────────────────────────────────────────────────
 // 🖼 CUADRO (poster del eclipse)
 // ─────────────────────────────────────────────────────────────────────
 const posterFolder = gui.addFolder("🖼 Cuadro");
 const posterCfg = {
  x: wallPoster.position.x,
  y: wallPoster.position.y,
  z: wallPoster.position.z,
 };
 posterFolder.add(posterCfg, "x", -6, 6, 0.01).onChange((v) => {
  wallPoster.position.x = v;
  posterSpot.position.x = v;
  posterSpot.target.position.x = v;
  requestRender();
 });
 posterFolder.add(posterCfg, "y", 0, 7, 0.01).onChange((v) => {
  wallPoster.position.y = v;
  posterSpot.target.position.y = v;
  requestRender();
 });
 posterFolder.add(posterCfg, "z", -5, 0, 0.01).onChange((v) => {
  wallPoster.position.z = v;
  posterSpot.target.position.z = v;
  requestRender();
 });
 posterFolder.add(posterSpot, "intensity", 0, 6, 0.01).name("spot intensidad").onChange(requestRender);
 posterFolder.add(posterSpot, "angle", 0.05, Math.PI * 0.45, 0.01).onChange(requestRender);
 posterFolder.add(posterSpot, "penumbra", 0, 1, 0.01).onChange(requestRender);

 // ─────────────────────────────────────────────────────────────────────
 // 🐕 WOODY (perro holograma)
 // ─────────────────────────────────────────────────────────────────────
 const dogFolder = gui.addFolder("🐕 Woody");
 const dogCfg = {
  visible: dogHologram.visible,
  x: dogHologram.position.x,
  y: dogHologram.position.y,
  z: dogHologram.position.z,
  scale: dogHologram.scale.x,
 };
 dogFolder.add(dogCfg, "visible").onChange((v) => {
  dogHologram.visible = v;
  requestRender();
 });
 // Rangos ajustados a la zona útil del escritorio para afinar fácil.
 // Guardamos referencias a los controllers para poder refrescar los sliders
 // una vez `place()` termine (la posición real depende del bbox de la mesa,
 // que puede no estar disponible en el momento de construir el GUI).
 const ctrlX = dogFolder.add(dogCfg, "x", 2, 5.5, 0.01).onChange((v) => {
  dogHologram.position.x = v;
  requestRender();
 });
 const ctrlY = dogFolder.add(dogCfg, "y", 0, 8, 0.01).onChange((v) => {
  // Y se calcula desde deskTopSupport en el builder. Los sliders permiten
  // afinar la posición global. El rango cubre el suelo (~0) hasta techo (~8).
  dogHologram.position.y = v;
  requestRender();
 });
 const ctrlZ = dogFolder.add(dogCfg, "z", -1, 1, 0.01).onChange((v) => {
  dogHologram.position.z = v;
  requestRender();
 });
 dogFolder.add(dogCfg, "scale", 0.3, 1.2, 0.01).onChange((v) => {
  dogHologram.scale.setScalar(v);
  requestRender();
 });
 if (dogHologram.userData.holoLight) {
  dogFolder.add(dogHologram.userData.holoLight, "intensity", 0, 2, 0.01).name("luz intensidad").onChange(requestRender);
 }
 // Velocidad de rotación del modelo. 0 = estático, 0.25 = vuelta cada ~25 s.
 // Sweet spot suele estar entre 0.08 y 0.18 — vivo pero no mareante.
 if (dogHologram.userData.holoParams) {
  dogFolder.add(dogHologram.userData.holoParams, "rotSpeed", 0, 0.4, 0.01).name("rotación").onChange(requestRender);
 }

 // Sincronización diferida — el `place()` del builder espera a que la mesa
 // esté disponible, que puede ocurrir varios frames después de construir el
 // GUI. Reintentamos durante 1.5 s leyendo la posición real de Woody.
 const syncDogSliders = () => {
  ctrlX.setValue(dogHologram.position.x);
  ctrlY.setValue(dogHologram.position.y);
  ctrlZ.setValue(dogHologram.position.z);
 };
 const dogSyncStart = performance.now();
 const dogSyncTick = () => {
  syncDogSliders();
  if (performance.now() - dogSyncStart < 1500) {
   requestAnimationFrame(dogSyncTick);
  }
 };
 requestAnimationFrame(dogSyncTick);

 // ─────────────────────────────────────────────────────────────────────
 // 🪐 ORRERY (mueble + sistema solar)
 // ─────────────────────────────────────────────────────────────────────
 const orreryFolder = gui.addFolder("🪐 Orrery");
 const orreryCfg = {
  visible: orrery.visible,
  x: orrery.position.x,
  y: orrery.position.y,
  z: orrery.position.z,
  rotY: orrery.rotation.y,
  scale: orrery.scale.x,
 };
 orreryFolder.add(orreryCfg, "visible").onChange((v) => {
  orrery.visible = v;
  requestRender();
 });
 orreryFolder.add(orreryCfg, "x", -6, 6, 0.01).onChange((v) => {
  orrery.position.x = v;
  requestRender();
 });
 orreryFolder.add(orreryCfg, "y", -1, 5, 0.01).onChange((v) => {
  orrery.position.y = v;
  requestRender();
 });
 orreryFolder.add(orreryCfg, "z", -4, 3, 0.01).onChange((v) => {
  orrery.position.z = v;
  requestRender();
 });
 orreryFolder.add(orreryCfg, "rotY", -Math.PI, Math.PI, 0.01).onChange((v) => {
  orrery.rotation.y = v;
  requestRender();
 });
 orreryFolder.add(orreryCfg, "scale", 0.4, 3.5, 0.01).onChange((v) => {
  orrery.scale.setScalar(v);
  requestRender();
 });
 if (orrery.userData.orreryLight) {
  orreryFolder.add(orrery.userData.orreryLight, "intensity", 0, 3, 0.01).name("luz mueble").onChange(requestRender);
 }
 if (orrery.userData.controls) {
  orreryFolder
   .add(orrery.userData.controls, "planetSize", 0.3, 5, 0.01)
   .name("planetas tamaño")
   .onChange(requestRender);
  orreryFolder
   .add(orrery.userData.controls, "orbitSpeed", 0, 4, 0.01)
   .name("velocidad órbitas")
   .onChange(requestRender);
  orreryFolder.add(orrery.userData.controls, "sunSize", 0.3, 3, 0.01).name("sol tamaño").onChange(requestRender);
 }

 // ─────────────────────────────────────────────────────────────────────
 // 🚀 COHETE / LÁMPARA (el objeto cálido de la mesa)
 // ─────────────────────────────────────────────────────────────────────
 const rocketFolder = gui.addFolder("🚀 Cohete");
 rocketFolder.add(lamparaParams, "x", -6, 6, 0.01).name("posición X").onChange(updateLampara);
 rocketFolder.add(lamparaParams, "y", -2, 3, 0.01).name("posición Y").onChange(updateLampara);
 rocketFolder.add(lamparaParams, "z", -4, 4, 0.01).name("posición Z").onChange(updateLampara);
 rocketFolder.add(lamparaParams, "rotY", -Math.PI, Math.PI, 0.01).name("rotación Y").onChange(updateLampara);
 rocketFolder.add(lamparaParams, "scale", 0.05, 1, 0.001).name("tamaño").onChange(updateLampara);
 rocketFolder.add(lamparaParams, "brightness", 0, 2, 0.01).name("brillo").onChange(updateLampara);
 rocketFolder.add(warmLight, "intensity", 0, 6, 0.01).name("luz cálida").onChange(requestRender);
 rocketFolder.add(lamparaFlameLight, "intensity", 0, 4, 0.01).name("llama intensidad").onChange(requestRender);

 // ─────────────────────────────────────────────────────────────────────
 // 💡 LUCES GLOBALES (habitación)
 // ─────────────────────────────────────────────────────────────────────
 // Los GUIs ahora editan multiplicadores (no intensidades absolutas) que
 // el tick respeta cada frame. Rango 0–3: 0=apagado, 1=valor base, >1=más.
 const lightsFolder = gui.addFolder("💡 Luces");
 lightsFolder.add(lightMultipliers, "ambient", 0, 3, 0.01).name("ambient ×").onChange(requestRender);
 lightsFolder.add(lightMultipliers, "moonDir", 0, 3, 0.01).name("luna direc. ×").onChange(requestRender);
 lightsFolder.add(lightMultipliers, "windowFill", 0, 3, 0.01).name("ventana fill ×").onChange(requestRender);
 lightsFolder.add(lightMultipliers, "moonArea", 0, 3, 0.01).name("luna area ×").onChange(requestRender);
 lightsFolder.add(lightMultipliers, "rimChair", 0, 3, 0.01).name("rim silla ×").onChange(requestRender);
 lightsFolder.add(lightMultipliers, "rimBack", 0, 3, 0.01).name("rim trasero ×").onChange(requestRender);
 lightsFolder.add(lightMultipliers, "ledDesk", 0, 3, 0.01).name("LED mesa ×").onChange(requestRender);
 lightsFolder.add(lightMultipliers, "rightFill", 0, 3, 0.01).name("fill derecha ×").onChange(requestRender);
 lightsFolder.add(renderer, "toneMappingExposure", 0, 2, 0.01).name("exposición").onChange(requestRender);

 // ─────────────────────────────────────────────────────────────────────
 // 🎥 CÁMARA
 // ─────────────────────────────────────────────────────────────────────
 // Al cambiar cameraBase, hay que reconstruir KP[0] (que se usa en el
 // tick para interpolar la cámara) o el cambio se pierde al instante.
 // Si estamos al principio del scroll, reposicionamos en vivo.
 const onCameraBaseChange = () => {
  buildKeyframes?.();
  const sp = getScrollProgress?.() ?? 0;
  if (sp < 0.01) {
   camera.position.set(cameraBase.x, cameraBase.y, cameraBase.z);
   camera.lookAt(controls.target);
  }
  requestRender();
 };

 const cameraFolder = gui.addFolder("🎥 Cámara");
 cameraFolder.add(cameraBase, "x", -10, 10, 0.01).name("base X").onChange(onCameraBaseChange);
 cameraFolder.add(cameraBase, "y", 0, 10, 0.01).name("base Y").onChange(onCameraBaseChange);
 cameraFolder.add(cameraBase, "z", 0, 20, 0.01).name("base Z").onChange(onCameraBaseChange);
 cameraFolder
  .add(camera, "fov", 20, 90, 1)
  .name("FOV")
  .onChange(() => {
   camera.updateProjectionMatrix();
   requestRender();
  });

 // Todas las carpetas cerradas al arrancar
 screensFolder.close();
 posterFolder.close();
 dogFolder.close();
 orreryFolder.close();
 rocketFolder.close();
 lightsFolder.close();
 cameraFolder.close();

 // ─────────────────────────────────────────────────────────────────────
 // 🌌 EXTERIOR (escena espacial — "Diseñando experiencias")
 // ─────────────────────────────────────────────────────────────────────
 // Toda la escena del exterior agrupada aquí. Subcarpetas para que el
 // panel no se sature. Todo arranca cerrado.
 const exteriorFolder = gui.addFolder("🌌 Exterior");

 // — ✨ Estrellas (4 capas) —
 const starsFolder = exteriorFolder.addFolder("✨ Estrellas");
 starsFolder.add(starsParams, "visible").name("visible").onChange(requestRender);
 starsFolder.add(starsParams, "globalOpacity", 0, 4, 0.01).name("opacidad global").onChange(requestRender);
 starsFolder.add(starsParams, "parallaxSpeed", 0, 4, 0.01).name("parallax").onChange(requestRender);
 starsFolder.add(starsParams, "twinkleStrength", 0, 1, 0.01).name("twinkle").onChange(requestRender);
 starsFolder.add(starsParams, "aOpacity", 0, 1.5, 0.01).name("capa A op").onChange(requestRender);
 starsFolder.add(starsParams, "bOpacity", 0, 1.5, 0.01).name("capa B op").onChange(requestRender);
 starsFolder.add(starsParams, "cOpacity", 0, 1.5, 0.01).name("capa C op").onChange(requestRender);
 starsFolder.close();

 // — 🌕 Luna —
 const moonExtFolder = exteriorFolder.addFolder("🌕 Luna");
 moonExtFolder
  .add(moonParams, "visible")
  .name("visible")
  .onChange(() => {
   extMoon.visible = moonParams.visible;
   requestRender();
  });
 moonExtFolder
  .add(moonParams, "x", EXT_X - 30, EXT_X + 5, 0.1)
  .name("x")
  .onChange(updateMoon);
 moonExtFolder.add(moonParams, "y", -10, 15, 0.1).name("y").onChange(updateMoon);
 moonExtFolder.add(moonParams, "z", -10, 10, 0.1).name("z").onChange(updateMoon);
 moonExtFolder.add(moonParams, "scale", 0.2, 4, 0.05).name("escala").onChange(updateMoon);
 moonExtFolder.add(moonParams, "opacity", 0, 1, 0.01).name("opacidad").onChange(requestRender);
 moonExtFolder.add(moonParams, "lightIntensity", 0, 2, 0.01).name("luz").onChange(requestRender);
 moonExtFolder.addColor(moonParams, "tint").name("tinte").onChange(updateMoon);
 moonExtFolder.close();

 // — ☁ Nebula —
 const nebulaFolder = exteriorFolder.addFolder("☁ Nebula");
 nebulaFolder
  .add(nebulaParams, "visible")
  .name("visible")
  .onChange(() => {
   nebulaMesh.visible = nebulaParams.visible;
   requestRender();
  });
 nebulaFolder.add(nebulaParams, "opacity", 0, 1, 0.01).name("opacidad").onChange(requestRender);
 nebulaFolder.add(nebulaParams, "scale", 0.2, 4, 0.05).name("escala").onChange(updateNebula);
 nebulaFolder.add(nebulaParams, "rotY", -Math.PI, Math.PI, 0.01).name("rot Y").onChange(updateNebula);
 nebulaFolder.add(nebulaParams, "density", 0.1, 1.5, 0.01).name("densidad").onChange(regenerateNebula);
 nebulaFolder.add(nebulaParams, "softness", 0, 1, 0.01).name("suavidad").onChange(regenerateNebula);
 nebulaFolder.addColor(nebulaParams, "colorPrimary").name("color 1").onChange(regenerateNebula);
 nebulaFolder.addColor(nebulaParams, "colorSecondary").name("color 2").onChange(regenerateNebula);
 nebulaFolder.close();

 // — 🛸 UFO —
 const ufoFolder = exteriorFolder.addFolder("🛸 UFO");
 ufoFolder.add(ufoParams, "visible").name("visible").onChange(requestRender);
 ufoFolder.add(ufoParams, "scale", 0.1, 2, 0.01).name("escala").onChange(updateUfo);
 ufoFolder.add(ufoParams, "xOffset", -3, 3, 0.01).name("offset X").onChange(requestRender);
 ufoFolder.add(ufoParams, "yOffset", -3, 3, 0.01).name("offset Y").onChange(requestRender);
 ufoFolder.add(ufoParams, "glowIntensity", 0, 4, 0.01).name("glow").onChange(updateUfo);
 ufoFolder.add(ufoParams, "underLightIntensity", 0, 3, 0.01).name("luz inferior").onChange(updateUfo);
 ufoFolder.add(ufoParams, "beamOpacityMult", 0, 3, 0.01).name("beam opacidad").onChange(requestRender);
 ufoFolder.add(ufoParams, "beamWidth", 0.3, 3, 0.01).name("beam ancho").onChange(requestRender);
 ufoFolder.add(ufoParams, "beamLength", 0.3, 3, 0.01).name("beam alto").onChange(requestRender);
 ufoFolder.close();

 // — 📝 Claim ("Diseñando experiencias") —
 const claimFolder = exteriorFolder.addFolder("📝 Claim");
 claimFolder.add(claimParams, "visible").name("visible").onChange(requestRender);
 claimFolder
  .add(claimParams, "x", EXT_X - 10, EXT_X + 5, 0.05)
  .name("x")
  .onChange(updateClaim);
 claimFolder
  .add(claimParams, "y", EXT_Y - 5, EXT_Y + 5, 0.05)
  .name("y")
  .onChange(updateClaim);
 claimFolder
  .add(claimParams, "z", EXT_Z - 5, EXT_Z + 5, 0.05)
  .name("z")
  .onChange(updateClaim);
 claimFolder.add(claimParams, "scale", 0.3, 3, 0.01).name("escala").onChange(updateClaim);
 claimFolder.add(claimParams, "opacityMult", 0, 2, 0.01).name("opacidad").onChange(requestRender);
 claimFolder.add(claimParams, "glowIntensity", 0, 3, 0.01).name("glow naranja").onChange(updateClaim);
 claimFolder.add(claimParams, "haloOpacityMult", 0, 3, 0.01).name("halo fondo").onChange(requestRender);
 claimFolder.addColor(claimParams, "orangeColor").name("color naranja").onChange(updateClaim);
 claimFolder.add(claimParams, "subtitleVisible").name("subtítulo").onChange(updateClaim);
 claimFolder.close();

 // — ☄ Asteroides —
 const asteroidFolder = exteriorFolder.addFolder("☄ Asteroides");
 asteroidFolder.add(asteroidParams, "visible").name("visible").onChange(requestRender);
 asteroidFolder.add(asteroidParams, "opacityMult", 0, 2, 0.01).name("opacidad").onChange(requestRender);
 asteroidFolder.add(asteroidParams, "emissiveMult", 0, 3, 0.01).name("emissive").onChange(requestRender);
 asteroidFolder.add(asteroidParams, "rotSpeed", 0, 4, 0.01).name("rotación").onChange(requestRender);
 asteroidFolder.add(asteroidParams, "driftSpeed", 0, 3, 0.01).name("drift").onChange(requestRender);
 asteroidFolder.close();

 exteriorFolder.close();
}

/**
 * attachProjectsGUI
 * ─────────────────────────────────────────────────────────────────────────
 * Mismo patrón que attachHeroGUI: consumidor puro. Recibe la instancia de
 * lil-gui creada por heroScene y los params expuestos por initProjectsScene
 * (cleanup.layoutParams, cleanup.lightParams, etc.).
 *
 * Uso:
 *   const cleanupProjects = initProjectsScene(canvas);
 *   attachProjectsGUI(gui, cleanupProjects);
 *
 * @param {GUI}    gui   Instancia de lil-gui ya creada en heroScene.
 * @param {object} refs  El cleanup devuelto por initProjectsScene
 *                       (lleva adjuntos los params y requestRender).
 */
export function attachProjectsGUI(gui, refs) {
 const { layoutParams, textParams, lightParams, cameraParamsP, entryParams, requestRender } = refs;

 // ─────────────────────────────────────────────────────────────────────
 // 📂 PROJECTS — folder padre que agrupa todos los controles
 // ─────────────────────────────────────────────────────────────────────
 const projectsFolder = gui.addFolder("📂 Projects");

 // — 📺 Layout pantalla —
 const layoutFolder = projectsFolder.addFolder("📺 Layout pantalla");
 layoutFolder.add(layoutParams, "mainTop", 30, 120, 1).name("margen superior").onChange(requestRender);
 layoutFolder.add(layoutParams, "mainHeight", 180, 480, 1).name("altura imagen").onChange(requestRender);
 layoutFolder.add(layoutParams, "mainMarginX", 20, 80, 1).name("margen lateral").onChange(requestRender);
 layoutFolder.close();

 // — 📝 Texto — agrupado en sub-sub-folders por bloque
 const textFolder = projectsFolder.addFolder("📝 Texto");

 // ── Header (TRANSMISIÓN / SEÑAL ESTABLE) ──
 const tHeader = textFolder.addFolder("Header");
 tHeader.add(textParams, "headerY", 20, 80, 1).name("offset Y").onChange(requestRender);
 tHeader.add(textParams, "headerSize", 7, 16, 1).name("tamaño").onChange(requestRender);
 tHeader.close();

 // ── Nombre del proyecto ──
 const tName = textFolder.addFolder("Nombre");
 tName.add(textParams, "nameTopGap", 10, 80, 1).name("padding superior").onChange(requestRender);
 tName.add(textParams, "nameSeparatorGap", 0, 60, 1).name("padding línea ↑").onChange(requestRender);
 tName.add(textParams, "nameSize", 12, 40, 1).name("tamaño").onChange(requestRender);
 tName.add(textParams, "nameBold").name("bold").onChange(requestRender);
 tName.add(textParams, "nameOpacity", 0, 1, 0.01).name("opacidad").onChange(requestRender);
 tName.add(textParams, "nameAccentH", 0, 6, 1).name("acento grosor").onChange(requestRender);
 tName.add(textParams, "nameAccentOpacity", 0, 1, 0.01).name("acento opacidad").onChange(requestRender);
 tName.close();

 // ── Tagline ──
 const tTag = textFolder.addFolder("Tagline");
 tTag.add(textParams, "taglineSize", 8, 22, 1).name("tamaño").onChange(requestRender);
 tTag.add(textParams, "taglineOpacity", 0, 1, 0.01).name("opacidad").onChange(requestRender);
 tTag.add(textParams, "taglineGap", 14, 60, 1).name("separación arriba").onChange(requestRender);
 tTag.close();

 // ── Descripción ──
 const tDesc = textFolder.addFolder("Descripción");
 tDesc.add(textParams, "descSize", 8, 18, 1).name("tamaño").onChange(requestRender);
 tDesc.add(textParams, "descOpacity", 0, 1, 0.01).name("opacidad").onChange(requestRender);
 tDesc.add(textParams, "descGap", 12, 50, 1).name("separación arriba").onChange(requestRender);
 tDesc.add(textParams, "descLineHeight", 11, 28, 1).name("interlineado").onChange(requestRender);
 tDesc.add(textParams, "descMaxLines", 1, 6, 1).name("líneas máx").onChange(requestRender);
 tDesc.add(textParams, "descRightMargin", 0, 280, 1).name("margen derecho").onChange(requestRender);
 tDesc.close();

 // ── Footer ──
 const tFoot = textFolder.addFolder("Footer");
 tFoot.add(textParams, "footerSize", 8, 18, 1).name("tamaño").onChange(requestRender);
 tFoot.add(textParams, "footerOpacity", 0, 1, 0.01).name("opacidad").onChange(requestRender);
 tFoot.add(textParams, "footerBottomY", 10, 60, 1).name("offset desde abajo").onChange(requestRender);
 tFoot.close();

 // ── Watermark "0X" ──
 const tWm = textFolder.addFolder("Watermark 0X");
 tWm.add(textParams, "watermarkSize", 40, 180, 1).name("tamaño").onChange(requestRender);
 tWm.add(textParams, "watermarkOpacity", 0, 0.4, 0.01).name("opacidad").onChange(requestRender);
 tWm.add(textParams, "watermarkOffsetX", 60, 320, 1).name("offset X").onChange(requestRender);
 tWm.add(textParams, "watermarkOffsetY", 0, 80, 1).name("offset Y").onChange(requestRender);
 tWm.close();

 textFolder.close();

 // — 💡 Luces reactivas —
 const lightsFolder = projectsFolder.addFolder("💡 Luces reactivas");
 lightsFolder.add(lightParams, "baseIntensity", 0, 10, 0.1).name("intensidad base").onChange(requestRender);
 lightsFolder.add(lightParams, "haloIntensity", 0, 3, 0.05).name("halo ambiental").onChange(requestRender);
 lightsFolder.add(lightParams, "pulseStrength", 0, 5, 0.1).name("pulso entrada").onChange(requestRender);
 lightsFolder.close();

 // — 🎥 Cámara —
 const camFolder = projectsFolder.addFolder("🎥 Cámara");
 camFolder.add(cameraParamsP, "camFar", 3, 10, 0.1).name("z far (entrada)").onChange(requestRender);
 camFolder.add(cameraParamsP, "camNear", 1, 6, 0.1).name("z near (final)").onChange(requestRender);
 camFolder.add(cameraParamsP, "entryStart", 5, 15, 0.1).name("z arranque boot").onChange(requestRender);
 camFolder.add(cameraParamsP, "floatAmplY", 0, 0.2, 0.005).name("flotación Y").onChange(requestRender);
 camFolder.add(cameraParamsP, "floatAmplX", 0, 0.1, 0.002).name("flotación X").onChange(requestRender);
 camFolder.close();

 // — ⏱ Secuencia de entrada (DETECT → GLITCH → STABILIZE → REVEAL) —
 const entryFolder = projectsFolder.addFolder("⏱ Secuencia de entrada");
 entryFolder.add(entryParams, "detectDur", 0, 1, 0.05).name("detect").onChange(requestRender);
 entryFolder.add(entryParams, "glitchDur", 0, 1.5, 0.05).name("glitch").onChange(requestRender);
 entryFolder.add(entryParams, "stabilizeDur", 0, 1, 0.05).name("stabilize").onChange(requestRender);
 entryFolder.add(entryParams, "revealDur", 0.1, 2, 0.05).name("reveal").onChange(requestRender);
 entryFolder.close();

 projectsFolder.close();
}

/**
 * attachContactGUI
 * ─────────────────────────────────────────────────────────────────────────
 * Mismo patrón que attachHeroGUI / attachProjectsGUI. Recibe el cleanup
 * devuelto por initContactScene (lleva adjuntos cleanup.P y cleanup.refs).
 *
 * El loop de contact.js es continuo y lee P cada frame, así que para los
 * params dinámicos (pulse, drift, glow, opacidades animadas) basta con
 * mutar P. Para los que se aplican una sola vez al setup (posiciones,
 * escalas, opacidades fijas) usamos onChange para mutar la ref viva.
 *
 * Tercer parámetro opcional `uiHooks`: permite tunear los TEXTOS de la
 * sección Contact desde el GUI. lil-gui muta `uiHooks.uiParams` directamente
 * y dispara `uiHooks.onUIChange()` para que React re-renderice. Si no se
 * pasa, el folder de textos no se monta.
 *
 * Uso desde Contact.jsx:
 *   const cleanup = initContactScene(mountRef.current, ...);
 *   onGuiReady((gui) => attachContactGUI(gui, cleanup, {
 *     uiParams: uiParamsRef.current,
 *     onUIChange: forceRender,
 *   }));
 *
 * @param {GUI}     gui      Instancia de lil-gui ya creada en heroScene.
 * @param {object}  cleanup  Cleanup devuelto por initContactScene
 *                           (con .P y .refs adjuntos).
 * @param {object} [uiHooks] { uiParams, onUIChange } — opcional.
 */
export function attachContactGUI(gui, cleanup, uiHooks) {
 const P = cleanup.P;
 const r = cleanup.refs;

 // ─────────────────────────────────────────────────────────────────────
 // 📞 CONTACT — folder padre
 // ─────────────────────────────────────────────────────────────────────
 const contactFolder = gui.addFolder("📞 Contact");

 // — 🛸 Beacon —
 const beaconFolder = contactFolder.addFolder("🛸 Beacon");
 beaconFolder
  .add(P, "beaconX", -3, 3, 0.01)
  .name("posición X")
  .onChange((v) => (r.beaconGroup.position.x = v));
 beaconFolder
  .add(P, "beaconY", -2, 3, 0.01)
  .name("posición Y")
  .onChange((v) => (r.beaconGroup.position.y = v));
 beaconFolder
  .add(P, "beaconZ", -2, 2, 0.01)
  .name("posición Z")
  .onChange((v) => (r.beaconGroup.position.z = v));
 beaconFolder.add(P, "glowIntensity", 0, 6, 0.05).name("glow intensidad");
 beaconFolder.add(P, "pulseSpeed", 0.5, 6, 0.05).name("velocidad pulso");
 beaconFolder.close();

 // — 👨‍🚀 Astronauta —
 const astroFolder = contactFolder.addFolder("👨‍🚀 Astronauta");
 // El astronauta se carga async, así que el accessor puede devolver null
 // los primeros frames — los onChange solo intentan mutar si existe.
 astroFolder
  .add(P, "astroX", -3, 3, 0.01)
  .name("posición X")
  .onChange((v) => {
   const a = r.astronautRoot();
   if (a) a.position.x = v;
  });
 astroFolder
  .add(P, "astroY", -2, 3, 0.01)
  .name("posición Y (base)")
  .onChange(() => {
   /* el loop la lee cada frame en idleAstronaut */
  });
 astroFolder
  .add(P, "astroZ", -2, 2, 0.01)
  .name("posición Z")
  .onChange((v) => {
   const a = r.astronautRoot();
   if (a) a.position.z = v;
  });
 astroFolder
  .add(P, "astroScale", 0.1, 1.2, 0.01)
  .name("escala")
  .onChange((v) => {
   const a = r.astronautRoot();
   if (a) a.scale.setScalar(v);
  });
 astroFolder
  .add(P, "astroRotY", -1, 1, 0.01)
  .name("rotación Y (·π)")
  .onChange(() => {
   /* lo lee idleAstronaut */
  });
 astroFolder.close();

 // — 🌙 Luna —
 const moonFolder = contactFolder.addFolder("🌙 Luna");
 moonFolder
  .add(P, "moonY", -15, 0, 0.05)
  .name("posición Y")
  .onChange((v) => {
   r.moon.position.y = v;
   r.moonHalo.position.y = v;
  });
 moonFolder
  .add(P, "moonScale", 0.4, 2, 0.01)
  .name("escala")
  .onChange((v) => r.moon.scale.setScalar(v));
 moonFolder
  .add(P, "moonEmissive", 0, 1, 0.01)
  .name("emisión")
  .onChange((v) => (r.moonMat.emissiveIntensity = v));
 moonFolder
  .add(P, "moonHaloOp", 0, 1.5, 0.01)
  .name("halo opacidad")
  .onChange((v) => (r.moonHaloMat.opacity = v));
 moonFolder.close();

 // — ✨ Estrellas y nebulosa —
 const starsFolder = contactFolder.addFolder("✨ Estrellas");
 starsFolder
  .add(P, "starsOpacity", 0, 1, 0.01)
  .name("opacidad pequeñas")
  .onChange((v) => {
   r.starsMatA.opacity = v;
   r.starsMatB.opacity = Math.min(1, v + 0.18);
  });
 starsFolder.add(P, "starsDrift", 0, 0.05, 0.001).name("drift");
 starsFolder.add(P, "nebulaOpacity", 0, 1.5, 0.01).name("nebulosa opacidad");
 starsFolder.close();

 // — 💡 Luces ambientales —
 const lightsFolder = contactFolder.addFolder("💡 Luces");
 lightsFolder
  .add(P, "ambientInt", 0, 1, 0.01)
  .name("ambient")
  .onChange((v) => (r.ambient.intensity = v));
 lightsFolder
  .add(P, "rimInt", 0, 2, 0.01)
  .name("rim")
  .onChange((v) => (r.rimLight.intensity = v));
 lightsFolder.close();

 // — 👣 Huellas —
 const fpFolder = contactFolder.addFolder("👣 Huellas");
 fpFolder
  .add(P, "footprintOp", 0, 1, 0.01)
  .name("opacidad")
  .onChange((v) => {
   // Cada huella tiene su propia opacidad base; aplicamos como factor
   r.footprintMeshes.forEach(({ mat }, idx) => {
    const base = 0.25 + (idx / r.footprintMeshes.length) * 0.55;
    mat.opacity = base * v;
   });
  });
 fpFolder.close();

 // — 📝 Textos (solo si Contact.jsx pasó los hooks de UI) —
 // Edición en vivo de strings y tamaños tipográficos. lil-gui muta
 // uiParams directamente y `onUIChange()` fuerza un re-render de React.
 if (uiHooks && uiHooks.uiParams && typeof uiHooks.onUIChange === "function") {
  const u = uiHooks.uiParams;
  const ping = uiHooks.onUIChange;

  const textsFolder = contactFolder.addFolder("📝 Textos");

  // ── Título ────────────────────────────────────────
  const tTitle = textsFolder.addFolder("Título");
  tTitle.add(u, "titleText").name("texto").onChange(ping);
  tTitle.add(u, "titlePunct").name("puntuación").onChange(ping);
  tTitle.addColor(u, "titleDotColor").name("color punto").onChange(ping);
  tTitle.add(u, "titleFontSizeMax", 36, 120, 1).name("tamaño máx (px)").onChange(ping);
  tTitle.add(u, "titleLetterSpacing", 0, 0.5, 0.005).name("letter-spacing (em)").onChange(ping);
  tTitle.close();

  // ── Subtexto ──────────────────────────────────────
  const tSub = textsFolder.addFolder("Subtexto");
  tSub.add(u, "subtextLine1").name("línea 1").onChange(ping);
  tSub.add(u, "subtextLine2").name("línea 2").onChange(ping);
  tSub.add(u, "subtextFontSizeMax", 11, 24, 1).name("tamaño máx (px)").onChange(ping);
  tSub.add(u, "subtextLineHeight", 1.2, 2.2, 0.05).name("line-height").onChange(ping);
  tSub.add(u, "subtextOpacity", 0.3, 1, 0.01).name("opacidad").onChange(ping);
  tSub.close();

  // ── Formulario ────────────────────────────────────
  const tForm = textsFolder.addFolder("Formulario");
  tForm.add(u, "emailPlaceholder").name("placeholder").onChange(ping);
  tForm.add(u, "buttonLabel").name("texto botón").onChange(ping);
  tForm.add(u, "sentMessage").name("msg enviado").onChange(ping);
  tForm.close();

  // ── Footer ────────────────────────────────────────
  const tFoot = textsFolder.addFolder("Footer");
  tFoot.add(u, "footerLeft").name("izquierda").onChange(ping);
  tFoot.add(u, "footerRight").name("derecha").onChange(ping);
  tFoot.close();

  // ── Layout ────────────────────────────────────────
  const tLayout = textsFolder.addFolder("Layout");
  tLayout.add(u, "formMaxWidth", 320, 720, 4).name("ancho máx (px)").onChange(ping);
  tLayout.close();

  textsFolder.close();
 }

 contactFolder.close();
}
