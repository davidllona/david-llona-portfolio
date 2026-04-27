import * as THREE from "three";

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
