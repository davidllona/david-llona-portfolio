// Carrera y trote del astronauta: los pies no patinan, hay vuelo, los brazos
// van en oposición, el tronco va inclinado, la cadera rebota y cada pisada
// suena cuando el pie llega al suelo.
//   node tests/e2e/run.mjs            comprueba
//   node tests/e2e/run.mjs capturas   además saca 12 fotogramas de la carrera de perfil
import { open, check, wait, out } from "./common.mjs";

const shots = process.argv.includes("capturas");
const t = await open({ viewport: { width: 1600, height: 900 } });
const { page } = t;
await t.enter();
const PITCH = await t.evaluate(async () => (await import("/src/worlds/living/layout.js")).PITCH);
const lane = (PITCH.z0 + PITCH.z1) / 2 + 2;

// Graba, en cada fotograma, dónde están pies, manos, cadera y cabeza (tal como
// se dibujaron) y, aparte, cada marca de pisada con la altura de su pie.
const record = () => t.evaluate(() => {
 const w = window.__world;
 w.runTape = { frames: [], steps: [] };
 w.onAstroEvent = (name) => {
  if (!name.startsWith("footstep") || !w.runTape) return;
  const feet = w.astroFeet(), p = w.player.position;
  const foot = name.endsWith("left") ? feet.L : feet.R;
  w.runTape.steps.push({ t: performance.now(), name, height: foot[1] - w.world().height(foot[0], foot[2]), ahead: foot[0] - p.x });
 };
 const tick = () => {
  if (!w.runTape) return;
  const feet = w.astroFeet(), v = w.player.velocity;
  w.runTape.frames.push({ t: performance.now(), ...feet, groundL: w.world().height(feet.L[0], feet.L[2]), groundR: w.world().height(feet.R[0], feet.R[2]), speed: Math.hypot(v.x, v.z), sounds: Object.entries(w.audio.played).filter(([id]) => id.startsWith("step-")).reduce((sum, [, n]) => sum + n, 0) });
  requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
});
const stop = () => t.evaluate(() => { const tape = window.__world.runTape; window.__world.runTape = null; return tape; });

const PLANTED = 0.056; // m: por debajo, el arranque de los dedos está en el suelo (apoyado queda a 4,2 cm)
const NEAR = 0.075; // y por debajo de esto va a ras de suelo: ahí no debe pasar tiempo moviéndose
async function gait(name, { run, ms, clip, cruise }) {
 await t.put(PITCH.x0 + 1.5, lane, { withWoody: false, settle: 600 });
 await record();
 if (run) await page.keyboard.down("ShiftLeft");
 await page.keyboard.down("KeyD");
 await wait(ms);
 await page.keyboard.up("KeyD");
 if (run) await page.keyboard.up("ShiftLeft");
 await wait(200);
 const tape = await stop();
 // Solo el tramo a velocidad de crucero.
 const frames = tape.frames.filter((f) => f.speed > cruise * 0.97 && f.clip === clip);
 check(frames.length > 40, `${name}: ${frames.length} fotogramas a ${cruise} m/s con el clip ${clip}`);

 if (process.env.RUN_DEBUG) for (const f of frames.slice(20, 20 + 40)) console.log(`   fase ${f.phase.toFixed(3)}  L x ${f.L[0].toFixed(3)} alto ${(f.L[1] - f.groundL).toFixed(3)} rel ${(f.L[0] - f.hips[0]).toFixed(3)}  cadera x ${f.hips[0].toFixed(3)} v ${f.speed.toFixed(2)}`);
 // Pies: mientras uno está apoyado, no se mueve respecto al suelo.
 let slide = 0, stances = 0, flight = 0;
 for (const side of ["L", "R"]) {
  let start = null;
  const close = (end) => {
   if (start === null || end - start < 3) return (start = null);
   const xs = frames.slice(start, end).map((f) => f[side][0]);
   slide = Math.max(slide, Math.max(...xs) - Math.min(...xs));
   stances += 1;
   start = null;
  };
  frames.forEach((f, i) => {
   const down = f[side][1] - f[`ground${side}`] < PLANTED;
   if (down && start === null) start = i;
   if (!down) close(i);
  });
  close(frames.length);
 }
 for (const f of frames) if (f.L[1] - f.groundL > NEAR && f.R[1] - f.groundR > NEAR) flight += 1;
 // A ras de suelo sin estar apoyado (justo antes de pisar o después de despegar): que sea un instante.
 const skim = frames.filter((f) => ["L", "R"].some((side) => { const h = f[side][1] - f[`ground${side}`]; return h >= PLANTED && h < NEAR; })).length / frames.length;
 const travelled = frames[frames.length - 1].hips[0] - frames[0].hips[0];
 check(stances >= 6 && slide < 0.03, `${name}: los pies no patinan (lo más que se mueve un pie apoyado: ${(slide * 100).toFixed(1)} cm en ${stances} apoyos; el cuerpo avanza ${travelled.toFixed(1)} m)`);
 check(skim < 0.12, `${name}: el pie no va rozando el suelo antes de pisar ni al despegar (${Math.round(skim * 100)} % de los fotogramas a ras de suelo sin apoyar)`);
 check(flight / frames.length > 0.12, `${name}: hay vuelo, con los dos pies en el aire (${Math.round((flight / frames.length) * 100)} % del tiempo)`);

 // Brazos en oposición: con un pie delante, delante va la mano contraria.
 let against = 0, counted = 0;
 for (const f of frames) {
  const legs = f.L[0] - f.R[0], arms = f.handL[0] - f.handR[0];
  if (Math.abs(legs) < 0.12) continue;
  counted += 1;
  if (Math.sign(legs) !== Math.sign(arms)) against += 1;
 }
 check(against / counted > 0.9, `${name}: brazos en oposición a las piernas (${Math.round((against / counted) * 100)} % de los fotogramas con un pie claramente delante)`);

 // Tronco inclinado hacia donde se corre y rebote de la cadera.
 const lean = frames.reduce((sum, f) => sum + Math.atan2(f.head[0] - f.hips[0], f.head[1] - f.hips[1]), 0) / frames.length * (180 / Math.PI);
 const heights = frames.map((f) => f.hips[1] - (f.groundL + f.groundR) / 2);
 const bounce = Math.max(...heights) - Math.min(...heights);
 check(lean > (run ? 12 : 6), `${name}: tronco inclinado hacia delante (${lean.toFixed(1)}°)`);
 check(bounce > (run ? 0.04 : 0.025), `${name}: rebote vertical de la cadera (${(bounce * 100).toFixed(1)} cm)`);

 // Sonido: una pisada por cada pie que llega al suelo, y en ese momento.
 const t0 = frames[0].t, t1 = frames[frames.length - 1].t;
 const steps = tape.steps.filter((s) => s.t >= t0 && s.t <= t1);
 const high = Math.max(...steps.map((s) => s.height));
 const sounded = frames[frames.length - 1].sounds - frames[0].sounds;
 check(steps.length >= 6 && high < 0.13 && steps.every((s) => s.ahead > 0), `${name}: cada marca de pisada cae con el pie llegando al suelo, por delante del cuerpo (${steps.length} pisadas; el pie, a ${(high * 100).toFixed(0)} cm como mucho)`);
 check(Math.abs(sounded - steps.length) <= 1 && Math.abs(stances - steps.length) <= 2, `${name}: suena un paso por pisada (${sounded} sonidos, ${steps.length} marcas, ${stances} apoyos)`);
 const rate = steps.length / ((t1 - t0) / 1000);
 console.log(`      ${name}: ${rate.toFixed(1)} pasos por segundo`);
}

await gait("trote", { run: false, ms: 3300, clip: "Astro_Jog", cruise: 3.6 });
await gait("carrera", { run: true, ms: 2500, clip: "Astro_Run", cruise: 6.2 });

// Doce fotogramas de un ciclo de la carrera, de perfil. La cámara va de lado y
// a ras; el ciclo se congela en cada fase para que la captura caiga exacta.
if (shots) {
 await t.put(PITCH.x0 + 9, lane, { withWoody: false, settle: 500 });
 await t.evaluate(() => {
  const w = window.__world, p = w.player.position;
  w.woody.visible = false;
  w.rig.focus = { x: p.x, y: p.y + 0.85, z: p.z };
  Object.assign(w.rig, { lift: 0.08, yaw: 0, tilt: 0, distance: 0.3 });
  w.player.frozen = true;
  w.player.velocity.set(6.2, 0, 0);
  w.player.facing = -Math.PI / 2;
  w.runFreeze = 0;
 });
 await wait(1800); // la cámara llega a su sitio
 for (let i = 0; i < 12; i++) {
  await t.evaluate((phase) => (window.__world.runFreeze = phase), i / 12);
  await wait(450);
  await page.screenshot({ path: `${out}carrera-${String(i + 1).padStart(2, "0")}.jpg`, type: "jpeg", quality: 90 });
 }
 await t.evaluate(() => { const w = window.__world; w.runFreeze = null; w.woody.visible = true; w.player.frozen = false; w.player.velocity.set(0, 0, 0); w.rig.focus = null; Object.assign(w.rig, { lift: 1, distance: 1 }); });
 console.log(`      capturas: ${out}carrera-01…12.jpg`);
}
await t.done();
