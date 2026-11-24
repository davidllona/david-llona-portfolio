// Objetivo 28 · pulido de The Twisted Moon: las capturas de cada punto, siempre
// con el mismo encuadre (para el antes y el después). No comprueba nada.
//   node tests/e2e/pulido2.mjs <carpeta> [qué]
//     qué: prefijos separados por comas (1 luna, 2 torre, 3 puentes, 4 cascadas,
//          5 invernadero, nave, postal); por defecto, todo. También vale un nombre entero.
// «juego» es la cámara de juego tal cual, con el astronauta en `at`. Las demás
// miran a `focus` (x, altura absoluta, z) con `distance`, `lift`, `yaw` y `tilt`.
import fs from "node:fs";
import { open, wait } from "./common.mjs";
import { BUILDINGS, GREENHOUSE, LEVELS, QUEST_STOPS, STOP_PROPS, WATER_LEVEL } from "../../src/worlds/twisted/layout.js";

const T = BUILDINGS.torre, top = LEVELS[3];
const tower = (name, yaw, y = 8.4, distance = 1.75, lift = 0.5) => ({ name, at: [2.6, -32.4], view: { focus: [T.x, top + y, T.z], distance, lift, yaw } });
const stop = QUEST_STOPS.invernadero;
const SHOTS = [
 // 1 · La luna: desde los miradores, de cerca (recorte), y sobre el mar.
 { name: "1-luna-mirador-plataforma", at: [0, 3] },
 { name: "1-luna-mirador-torre", at: [0.4, -32.6] },
 { name: "1-luna-cerca", at: [0.4, -32.6], moon: 300 },
 { name: "1-luna-mirador-observatorio", at: [-15.4, -24.6] },
 { name: "1-luna-mar", at: [-5, 9.6] },
 // 2 · La torre: juego, entera por sus cuatro caras, y el tejado y los engranajes de cerca.
 { name: "2-torre-juego", at: [2.6, -32.4] },
 { name: "2-torre-juego-lejos", at: [0.4, -28.9] },
 tower("2-torre-sur", 0),
 tower("2-torre-este", Math.PI / 2),
 tower("2-torre-norte", Math.PI),
 tower("2-torre-oeste", -Math.PI / 2),
 tower("2-torre-tejado", 0.5, 12.6, 0.8, 0.42),
 tower("2-torre-tejado-oeste", -1.1, 12.6, 0.8, 0.42),
 tower("2-torre-engranajes", 0.35, 7.2, 0.5, 0.3),
 // 3 · Puentes: los dos colgantes y las dos pasarelas, con la cámara de juego y de lado.
 { name: "3-colgante-oeste-juego", at: [-8.9, -28.45] },
 { name: "3-colgante-oeste-lado", at: [-8.9, -28.45], view: { focus: [-8.9, LEVELS[2] + 0.4, -28.45], distance: 0.62, lift: 0.3, yaw: 0.34 } },
 { name: "3-colgante-oeste-entrada", at: [-4.6, -29.5], view: { focus: [-6.6, LEVELS[2] + 0.5, -29.3], distance: 0.42, lift: 0.5, yaw: 1.2 } },
 { name: "3-colgante-este-juego", at: [8.9, -28.85] },
 { name: "3-colgante-este-lado", at: [8.9, -28.85], view: { focus: [8.9, LEVELS[2] + 0.4, -28.85], distance: 0.62, lift: 0.3, yaw: -0.3 } },
 { name: "3-pasarela-rio-juego", at: [-7.85, -8.05] },
 { name: "3-pasarela-rio-lado", at: [-7.85, -8.05], view: { focus: [-7.85, 0.4, -8.05], distance: 0.5, lift: 0.3, yaw: 1.25 } },
 { name: "3-pasarela-arroyo-juego", at: [2.2, -19.05] },
 { name: "3-pasarela-arroyo-lado", at: [2.2, -19.05], view: { focus: [2.2, LEVELS[1] + 0.4, -19.05], distance: 0.5, lift: 0.3, yaw: 0 } },
 // 4 · Cascadas: A (del macizo a la poza), B (de la terraza al río) y C (del río al mar); desde abajo, de lado y desde arriba.
 { name: "4-cascada-a-abajo", at: [3.6, -21.4] },
 { name: "4-cascada-a-lado", at: [3.6, -21.4], view: { focus: [1.9, LEVELS[1] + 2.2, -25.2], distance: 0.6, lift: 0.3, yaw: 1.0 } },
 { name: "4-cascada-a-arriba", at: [-0.4, -28.2] },
 { name: "4-cascada-b-abajo", at: [4.4, -12.6] },
 { name: "4-cascada-b-lado", at: [4.4, -12.6], view: { focus: [2.6, 2.2, -15.2], distance: 0.6, lift: 0.3, yaw: 1.0 } },
 { name: "4-cascada-b-arriba", at: [4.6, -18.2] },
 { name: "4-cascada-c-arriba", at: [-24.4, 2.6] },
 { name: "4-cascada-c-lado", at: [-24.4, 2.6], view: { focus: [-27.6, (WATER_LEVEL + 0) / 2, 3.0], distance: 0.85, lift: 0.3, yaw: -2.2 } },
 { name: "4-cascada-c-frente", at: [-24.4, 2.6], view: { focus: [-27.6, (WATER_LEVEL + 0) / 2, 3.0], distance: 0.95, lift: 0.35, yaw: -1.05 } },
 // 5 · El invernadero y la parada «Aventurero».
 { name: "5-invernadero-juego", at: [9.8, -4.6] },
 { name: "5-invernadero-parada", at: [stop.x, stop.z] },
 { name: "5-invernadero-cerca", at: [9.8, -4.6], view: { focus: [GREENHOUSE.x - 1.2, 1.3, GREENHOUSE.z + 0.6], distance: 0.5, lift: 0.45, yaw: -0.5 } },
 { name: "5-invernadero-este", at: [9.8, -4.6], view: { focus: [GREENHOUSE.x, 1.3, GREENHOUSE.z], distance: 0.6, lift: 0.5, yaw: 1.3 } },
 { name: "5-mesa", at: [stop.x, stop.z], view: { focus: [STOP_PROPS.map.x, 0.9, STOP_PROPS.map.z], distance: 0.3, lift: 0.5, yaw: -0.5 } },
 { name: "5-farolillo-encendido", at: [stop.x, stop.z], use: 2600 },
];

const folder = (process.argv[2] ?? "capturas/35-pulido-mundo2/despues") + "/";
const pick = process.argv[3]?.split(",");
const wanted = (name) => !pick || pick.some((one) => name === one || name.startsWith(one));
fs.mkdirSync(folder, { recursive: true });
const shot = (t, name, clip) => t.page.screenshot({ path: `${folder}${name}.jpg`, type: "jpeg", quality: 90, ...(clip ? { clip } : {}) });

if (wanted("postal")) {
 const t = await open({ viewport: { width: 900, height: 1200 }, query: "?world=twisted" });
 await t.enter();
 await t.page.addStyleTag({ content: ".quick, .woody-menu, .sound-toggle, .theme-toggle { display: none !important; }" });
 await t.evaluate(() => {
  const w = window.__world;
  w.camera.fov = 58;
  w.camera.updateProjectionMatrix();
  w.player.position.set(-2.6, 0, 4.4);
  w.woody.position.set(-4.2, 0, 5);
  Object.assign(w.rig, { focus: { x: 0.5, y: 7, z: -15.5 }, distance: 3.45, lift: 0.3, yaw: -0.12, tilt: 0 });
 });
 await wait(7000);
 await shot(t, "postal");
 await t.browser.close();
}

const shots = SHOTS.filter((one) => wanted(one.name));
if (shots.length || wanted("nave")) {
 const t = await open({ viewport: { width: 1600, height: 900 }, query: "?world=twisted" });
 await t.enter();
 // (Que se vaya el aviso del logro «Primeros pasos».)
 await wait(6500);
 for (const one of shots) {
  await t.put(one.at[0], one.at[1], { settle: 500 });
  await t.evaluate((view) => {
   const rig = window.__world.rig;
   Object.assign(rig, view ? { focus: { x: view.focus[0], y: view.focus[1], z: view.focus[2] }, distance: view.distance ?? 1, lift: view.lift ?? 1, yaw: view.yaw ?? 0, tilt: view.tilt ?? 0 } : { focus: null, lift: 1, distance: 1, yaw: 0, tilt: 0 });
  }, one.view ?? null);
  await wait(one.view ? 2200 : 3400);
  // Con la E (el farolillo): se pulsa, se espera a que pase lo que pasa y se cierra el panel si se abre.
  if (one.use) {
   await t.page.keyboard.press("KeyE");
   await wait(one.use);
   await shot(t, one.name);
   await t.page.keyboard.press("Escape");
   await wait(700);
   continue;
  }
  let clip;
  if (one.moon) {
   // Recorte alrededor de la luna, donde caiga en pantalla.
   const at = await t.evaluate(() => {
    const w = window.__world, p = w.bigMoon.position.clone().project(w.camera);
    return [(p.x * 0.5 + 0.5) * innerWidth, (-p.y * 0.5 + 0.5) * innerHeight];
   });
   const x = Math.min(1600 - one.moon * 2, Math.max(0, at[0] - one.moon)), y = Math.min(900 - one.moon * 2, Math.max(0, at[1] - one.moon));
   clip = { x, y, width: one.moon * 2, height: one.moon * 2 };
  }
  await shot(t, one.name, clip);
 }
 await t.evaluate(() => Object.assign(window.__world.rig, { focus: null, lift: 1, distance: 1 }));
 if (wanted("nave")) {
  await t.put(0, 5.6, { withWoody: false, settle: 900 });
  await t.page.keyboard.press("KeyE");
  for (const [name, ms] of [["nave-subida", 5500], ["nave-orbita", 7800]]) {
   await wait(ms);
   await shot(t, name);
  }
  await t.page.keyboard.press("KeyE");
  for (const [name, ms] of [["nave-bajada-1", 1600], ["nave-bajada-2", 1400], ["nave-bajada-3", 1400], ["nave-bajada-4", 1400]]) {
   await wait(ms);
   await shot(t, name);
  }
 }
 console.log(t.pageErrors.length ? t.pageErrors.join("\n") : "sin excepciones");
 console.log(t.logs.length ? [...new Set(t.logs)].join("\n") : "sin avisos en consola");
 await t.browser.close();
}
