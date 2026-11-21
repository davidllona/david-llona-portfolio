// Capturas del tiro en suspensión: seis fotogramas (cada uno, de un tiro de
// verdad parado en su momento) y los dos defensas. No comprueba nada (eso, basket.mjs).
//   node tests/e2e/tiro.mjs [carpeta]
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { open, wait } from "./common.mjs";
import { BASKET } from "../../src/worlds/living/layout.js";

const folder = (process.argv[2] ?? "capturas/33-baloncesto") + "/";
fs.mkdirSync(folder, { recursive: true });
const t = await open({ viewport: { width: 1280, height: 800 } });
const { page } = t;
await t.enter();
const RIM_X = BASKET.hoop.x - 0.62;
const shot = (name) => page.screenshot({ path: `${folder}${name}.jpg`, type: "jpeg", quality: 90 });
const grab = async (back, side = 0) => {
 await t.evaluate(() => window.__world.court.home());
 await t.put(BASKET.ballStand.x + 0.9, BASKET.ballStand.z + 0.6, { withWoody: false, settle: 350 });
 await page.keyboard.press("KeyE");
 await wait(300);
 await t.put(RIM_X - back, BASKET.hoop.z + side, { withWoody: false, settle: 1600 });
};
// Espera, dentro de la página, a que se cumpla `when` (texto de una función del balón y el jugador).
const until = (when) => t.evaluate((when) => new Promise((resolve) => {
 const test = new Function("b", "p", `return ${when}`);
 const started = performance.now();
 const look = () => (test(window.__world.ball, window.__world.player) || performance.now() - started > 4000 ? resolve() : requestAnimationFrame(look));
 look();
}), when);

await t.evaluate(() => { const c = window.__world.court; c.blocker.active = c.marker.active = false; window.__world.scene.traverse((o) => /barrera|defensa que/.test(o.name) && (o.visible = false)); });
await t.put(RIM_X - 4.2, BASKET.hoop.z + 0.4, { withWoody: false, settle: 5200 }); // (pasa el aviso del primer logro)
await t.evaluate(() => Object.assign(window.__world.rig, { zoom: 0.5 }));
// Cada fotograma: hasta cuándo se mantiene la E y en qué momento se saca la foto.
const FRAMES = [
 ["1-anticipacion", null, "b.shot?.stage === 'dip' && b.shot.t > 0.11"],
 ["2-subida", null, "b.shot?.stage === 'air' && b.timing > -0.6"],
 ["3-arriba", null, "b.shot?.stage === 'air' && b.timing > -0.12"],
 ["4-suelta", "b.shot?.stage === 'air' && b.timing > -0.1", "b.mode === 'free' && p.shot >= 0.7"],
 ["5-cae", "b.shot?.stage === 'air' && b.timing > -0.1", "b.mode === 'free' && p.velocity.y < -3.2"],
 ["6-entra", "b.shot?.stage === 'air' && b.timing > -0.1", "b.scoreLock > 0.82 && b.scoreLock < 0.95"],
];
for (const [name, release, moment] of FRAMES) {
 await grab(4.2, 0.4);
 await page.keyboard.down("KeyE");
 if (release) {
  await until(release);
  await page.keyboard.up("KeyE");
 }
 await until(moment);
 await shot(`tiro-${name}`);
 await page.keyboard.up("KeyE");
 await wait(2600);
}
execFileSync(process.execPath, ["tests/e2e/sheet.mjs", `${folder}hoja-tiro.jpg`, "3", "640", ...FRAMES.map(([name]) => `${folder}tiro-${name}.jpg`)]);

// Los dos defensas: el del aro y el que marca, con el jugador con balón.
await t.evaluate(() => { const c = window.__world.court; c.blocker.active = c.marker.active = true; window.__world.scene.traverse((o) => /barrera|defensa que/.test(o.name) && (o.visible = true)); });
await t.evaluate(() => Object.assign(window.__world.rig, { zoom: 0.8 }));
await grab(6.2, 1.2);
await wait(1800);
await shot("defensas");
// Y el salto a taponar de los dos, con el tiro en el aire.
await page.keyboard.down("KeyE");
await until("b.shot?.stage === 'air' && b.timing > -0.1");
await page.keyboard.up("KeyE");
await wait(330);
await shot("defensas-saltan");
if (t.pageErrors.length) console.log(t.pageErrors.join("\n"));
await t.browser.close();
console.log("hecho");
