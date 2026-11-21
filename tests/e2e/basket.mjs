// Baloncesto: tiro en suspensión (salto, medidor, pronto, perfecto y tarde),
// racha, aro que cede, los dos defensas, valla y puerta. Guarda capturas de la
// pista de día y de noche.
//   node tests/e2e/basket.mjs [carpeta]
import fs from "node:fs";
import { open, check, wait } from "./common.mjs";

const folder = (process.argv[2] ?? "capturas/23-pulido/5-baloncesto") + "/";
fs.mkdirSync(folder, { recursive: true });
const t = await open({ viewport: { width: 1600, height: 900 } });
const { page } = t;
await t.enter();
const L = await t.evaluate(async () => {
 const m = await import("/src/worlds/living/layout.js");
 return { BASKET: m.BASKET, FENCE: m.COURT_FENCE };
});
const { BASKET, FENCE } = L;
const state = () =>
 t.evaluate(() => {
  const w = window.__world, b = w.ball, c = w.court;
  return {
   mode: b.mode, x: b.position.x, y: b.position.y, z: b.position.z, timing: b.timing, stage: b.shot?.stage ?? null, streak: b.streak, score: w.game.score,
   feet: w.player.position.y, grounded: w.player.grounded, clip: w.astroClip(), pose: w.player.shot,
   marker: { x: c.marker.x, z: c.marker.z, y: c.marker.y }, guard: { x: c.blocker.x, z: c.blocker.z, y: c.blocker.y }, px: w.player.position.x, pz: w.player.position.z,
   played: { ...w.audio.played },
  };
 });
const shot = (name) => page.screenshot({ path: `${folder}${name}.jpg`, type: "jpeg", quality: 88 });
const grab = async () => {
 await t.evaluate(() => window.__world.court.home());
 await t.put(BASKET.ballStand.x + 0.9, BASKET.ballStand.z + 0.6, { withWoody: false, settle: 350 });
 await page.keyboard.press("KeyE");
 await wait(300);
};
const RIM_X = BASKET.hoop.x - 0.62;
const spot = (back = 4.6, side = 0, settle = 300) => t.put(RIM_X - back, BASKET.hoop.z + side, { withWoody: false, settle });
const defenders = (on) => t.evaluate((on) => { const c = window.__world.court; c.blocker.active = c.marker.active = on; }, on);
const between = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// Mantiene la E y la suelta cuando el salto llega a `until` (−1 al despegar, 0 arriba, +1 al caer).
const jumpShot = async (until) => {
 await page.keyboard.down("KeyE");
 await t.evaluate((until) => new Promise((resolve) => {
  const started = performance.now();
  const look = () => {
   const b = window.__world.ball;
   if ((b.shot?.stage === "air" && b.timing >= until) || performance.now() - started > 3000) resolve();
   else requestAnimationFrame(look);
  };
  look();
 }), until);
 await page.keyboard.up("KeyE");
 await wait(80);
};

// Los defensas, fuera de momento: primero se mide el tiro solo.
await defenders(false);

// 1. Con el balón, cerca: la indicación dice qué hacer.
await t.put(BASKET.ballStand.x + 0.9, BASKET.ballStand.z + 0.6, { withWoody: false, settle: 500 });
await page.keyboard.press("KeyE");
await wait(300);
check((await state()).mode === "held", "se coge el balón");
await spot();
check(/mant[eé]n.*salto/i.test((await t.hint()) ?? ""), `con el balón, junto a la canasta: "${await t.hint()}"`);

// 2. Mantener pulsado: se agacha, salta con el balón y sale el medidor. Soltar arriba: tiro perfecto, y entra.
const jumps = (await state()).played.jump ?? 0;
await page.keyboard.down("KeyE");
await wait(90);
const dip = await state();
await wait(260);
const rising = await state();
const meter = await t.evaluate(() => { let seen = false; window.__world.scene.traverse((o) => o.name === "medidor de tiro" && (seen = o.visible)); return seen; });
await shot("salto");
await page.keyboard.up("KeyE");
await wait(2800);
check(dip.stage === "dip" && dip.grounded && dip.clip === "Astro_JumpShot", `al pulsar se agacha antes de saltar (${dip.stage}, clip ${dip.clip})`);
check(rising.stage === "air" && !rising.grounded && rising.feet > 0.3 && rising.mode === "held", `y salta con el balón en las manos (pies a ${rising.feet.toFixed(2)} m, balón a ${rising.y.toFixed(2)} m)`);
check(meter && ((await state()).played.jump ?? 0) > jumps, "sale el medidor de tiro y suena el salto de siempre");

await grab();
await spot();
const before = await state();
await jumpShot(-0.1);
const released = await state();
check(released.mode === "free" && Math.abs(released.timing) <= 0.2 && released.feet > 0.9, `soltar en lo más alto es un tiro perfecto (momento ${released.timing.toFixed(2)}; pies a ${released.feet.toFixed(2)} m)`);
check((await t.toasts()).some((text) => /perfecto/i.test(text)), `y lo dice (${(await t.toasts()).join(" · ")})`);
await wait(600);
const landed = await state();
await wait(1500);
const scored = await state();
check(scored.score === before.score + 1, `el tiro perfecto entra (canastas +${scored.score - before.score})`);
check(landed.grounded && scored.pose === null, `después cae y el gesto termina (clip ${scored.clip})`);

// 3. Pronto: corto. Tarde: largo. En su punto: canasta. Dos seguidas: racha.
const tryShot = async (timing) => {
 await grab();
 await spot();
 const before = await state();
 await t.evaluate((timing) => window.__world.court.shoot(timing), timing);
 await wait(2700);
 const after = await state();
 return { scored: after.score - before.score, streak: after.streak, toasts: await t.toasts() };
};
const early = await tryShot(-0.85);
check(early.scored === 0 && early.streak === 0 && early.toasts.some((text) => /corto/i.test(text)), `soltando pronto se queda corto (${early.toasts.join(" · ") || "sin aviso"})`);
const late = await tryShot(0.85);
check(late.scored === 0 && late.streak === 0 && late.toasts.some((text) => /largo/i.test(text)), `soltando tarde se pasa (${late.toasts.join(" · ") || "sin aviso"})`);
const good = await tryShot(0);
await shot("canasta");
check(good.scored === 1 && good.streak === 1, `en su punto entra (canastas +${good.scored}, racha ${good.streak})`);
const again = await tryShot(0.1);
check(again.scored === 1 && again.streak === 2, `dos seguidas: racha de ${again.streak}`);
const broken = await tryShot(-0.85);
check(broken.streak === 0, "al fallar, la racha vuelve a cero");
check(((await state()).played["ball-net"] ?? 0) >= 2, `la red suena al entrar (${(await state()).played["ball-net"]} veces)`);
// Desde lejos también entra el perfecto (la parábola llega).
await grab();
await spot(8.5, 2.5);
const far = await state();
await t.evaluate(() => window.__world.court.shoot(0));
await wait(3000);
check((await state()).score === far.score + 1, "un tiro perfecto desde 9 m también entra");

// 4. El aro cede con el golpe y vuelve a su sitio.
await grab();
await spot(3);
const bend = await t.evaluate(async () => {
 const w = window.__world, c = w.court, b = w.ball;
 c.shoot(0);
 // Un balonazo al borde de delante del aro, desde arriba.
 b.position.set(c.RIM.x - 0.37, c.RIM.y + 1, c.RIM.z);
 b.velocity.set(0, -5, 0);
 let most = 0;
 for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 20)); most = Math.max(most, c.rim.angle); }
 await new Promise((r) => setTimeout(r, 1500));
 let filo = 0;
 w.scene.traverse((o) => o.name === "filo del aro" && (filo = o.parent.rotation.z));
 return { most, rest: c.rim.angle, filo };
});
check(bend.most > 0.02 && Math.abs(bend.rest) < 0.01, `el aro cede al darle el balón (${(bend.most * 57.3).toFixed(1)}°) y se queda quieto después (${(bend.rest * 57.3).toFixed(2)}°)`);
check(((await state()).played["ball-rim"] ?? 0) > 0, "y suena");

// 5. El defensa del aro tapona un tiro tenso.
await defenders(true);
await grab();
await spot(4.6);
await wait(1300); // (el defensa vuelve a ponerse delante)
await t.evaluate(() => {
 const w = window.__world, c = w.court, b = w.ball;
 c.shoot(0);
 // Un tiro raso, directo al defensa del aro.
 b.velocity.set((c.blocker.x - b.position.x) / 0.5, 1.2, (c.blocker.z - b.position.z) / 0.5);
 c.marker.active = false;
});
await wait(450);
await shot("tapon");
await wait(1800);
const blocked = await state();
check(blocked.played["ball-block"] > 0 && (await t.toasts()).some((text) => /tap[oó]n/i.test(text)) && blocked.streak === 0, `el defensa del aro tapona (${(await t.toasts()).join(" · ")})`);
const jump = await t.evaluate(async () => {
 const c = window.__world.court;
 c.marker.active = true;
 c.blocker.wait = 0.01;
 c.blocker.power = 4.5;
 let top = 0;
 for (let i = 0; i < 50; i++) { await new Promise((r) => setTimeout(r, 20)); top = Math.max(top, c.blocker.y); }
 return top;
});
check(jump > 0.6, `y salta (${jump.toFixed(2)} m)`);

// 6. El segundo defensa: se pone entre el jugador con balón y el aro, y le sigue con retraso.
await grab();
await spot(7, -2, 2600);
const set = await state();
const ideal = (s) => { const dx = RIM_X - s.px, dz = BASKET.hoop.z - s.pz, d = Math.hypot(dx, dz); return { x: s.px + (dx / d) * 1.45, z: s.pz + (dz / d) * 1.45 }; };
check(between(set.marker, ideal(set)) < 0.4, `con el balón, el segundo defensa se pone entre el jugador y el aro (a ${between(set.marker, ideal(set)).toFixed(2)} m de su sitio)`);
await shot("defensas");
// El jugador se va a otro lado: al principio el defensa se queda atrás; luego llega.
await spot(6, 3, 350);
const behind = await state();
let closest = 9, apart = 9;
for (let i = 0; i < 12; i++) {
 await wait(200);
 const s = await state();
 closest = Math.min(closest, between(s.marker, { x: s.px, z: s.pz }));
 apart = Math.min(apart, between(s.marker, s.guard));
}
const caught = await state();
check(between(behind.marker, ideal(behind)) > 2 && between(caught.marker, ideal(caught)) < 0.5, `le sigue con retraso: a los 0,35 s le faltan ${between(behind.marker, ideal(behind)).toFixed(1)} m; a los 2,7 s ya está (${between(caught.marker, ideal(caught)).toFixed(2)} m)`);
// Pegado al aro, los tres caben: ni se pisan los defensas ni se echan encima del jugador.
await spot(2.6, 0.3, 300);
for (let i = 0; i < 12; i++) {
 await wait(200);
 const s = await state();
 closest = Math.min(closest, between(s.marker, { x: s.px, z: s.pz }));
 apart = Math.min(apart, between(s.marker, s.guard));
}
check(apart > 0.85 && closest > 0.75, `los defensas no se pisan (mínimo ${apart.toFixed(2)} m entre ellos) ni se echan encima del jugador (${closest.toFixed(2)} m)`);
// No se le atraviesa andando.
await spot(7, 0, 2400);
let through = 9;
await page.keyboard.down("KeyD");
for (let i = 0; i < 9; i++) {
 await wait(160);
 const s = await state();
 through = Math.min(through, between(s.marker, { x: s.px, z: s.pz }));
}
await page.keyboard.up("KeyD");
check(through > 0.75, `y andando contra él tampoco se le atraviesa (mínimo ${through.toFixed(2)} m)`);
// Tirando pegado a él, salta a taponar; soltando arriba, el balón le pasa por encima.
await grab();
await spot(6.5, 0, 2400);
const close = await state();
await jumpShot(-0.1);
let leap = 0, lifted = false;
for (let i = 0; i < 16; i++) {
 await wait(60);
 const s = await state();
 leap = Math.max(leap, s.marker.y);
 if (i === 4) await shot("defensa-salta");
 lifted ||= s.marker.y > 0.2;
}
await wait(1700);
const over = await state();
check(leap > 0.5, `tirando a ${between(close.marker, { x: close.px, z: close.pz }).toFixed(1)} m de él, salta a taponar (${leap.toFixed(2)} m)`);
check(over.score === close.score + 1 || !(await t.toasts()).some((text) => /tap[oó]n/i.test(text)), `soltando arriba, el balón le pasa por encima (canastas +${over.score - close.score})`);
// Sin balón, vuelve a su sitio junto a la zona.
await t.evaluate(() => window.__world.court.home());
await wait(3200);
const home = await state();
check(Math.abs(home.marker.x - (RIM_X - 4.4)) < 0.3 && Math.abs(home.marker.z - (BASKET.hoop.z + 2.6)) < 0.3, "sin balón en juego, el segundo defensa vuelve a su sitio");

// 7. El balón rebota en la valla y no se sale, ni por la puerta.
await defenders(false);
const fenced = async (vx, vz, name) => {
 await t.evaluate((vx, vz, cx, cz) => { const b = window.__world.ball; b.mode = "free"; b.live = false; b.position.set(cx, 1.5, cz); b.velocity.set(vx, 3, vz); }, vx, vz, BASKET.center.x, BASKET.center.z);
 const before = (await state()).played["ball-fence"] ?? 0;
 let out = false;
 for (let i = 0; i < 14; i++) {
  await wait(150);
  const b = await state();
  if (b.x < FENCE.x0 || b.x > FENCE.x1 || b.z < FENCE.z0 || b.z > FENCE.z1) out = true;
 }
 const after = await state();
 check(!out && (after.played["ball-fence"] ?? 0) > before, `un balonazo ${name} rebota en la valla y se queda dentro (suena ${(after.played["ball-fence"] ?? 0) - before} veces)`);
};
await t.put(BASKET.center.x - 5, BASKET.center.z + 3, { withWoody: false, settle: 200 });
await fenced(-26, 0, "al oeste");
await fenced(0, 24, "al sur");
await t.evaluate((x, z0, cz) => { const b = window.__world.ball; b.mode = "free"; b.position.set(x, 1.2, cz); b.velocity.set(0, 2, -24); }, FENCE.gate.x, FENCE.z0, BASKET.center.z);
await wait(1500);
check((await state()).z > FENCE.z0, "y tampoco se sale por la puerta");

// 8. La puerta se abre al acercarse y deja pasar; por la valla no se pasa.
const door = () => t.evaluate(() => { let turn = 0; window.__world.scene.traverse((o) => o.name === "puerta de la pista" && (turn = o.rotation.y)); return turn; });
await t.put(FENCE.gate.x, FENCE.z0 - 6, { withWoody: false, settle: 900 });
const shut = await door();
await t.put(FENCE.gate.x, FENCE.z0 - 1.6, { withWoody: false, settle: 900 });
const openTurn = await door();
await shot("puerta");
check(shut < 0.1 && openTurn > 1.2, `la puerta está cerrada de lejos (${shut.toFixed(2)}) y se abre al llegar (${openTurn.toFixed(2)} rad)`);
await t.hold("KeyS", 1500);
check((await t.pos()).z > FENCE.z0 + 0.5, `por la puerta se entra a la pista (z ${(await t.pos()).z})`);
await t.put(FENCE.gate.x + 5, FENCE.z0 - 1.6, { withWoody: false, settle: 300 });
await t.hold("KeyS", 1500);
check((await t.pos()).z < FENCE.z0, `por la valla no se pasa (z ${(await t.pos()).z})`);

// 9. Si se queda parado lejos, el balón vuelve solo.
await t.evaluate((x, z) => { const b = window.__world.ball; b.mode = "free"; b.position.set(x, 0.2, z); b.velocity.set(0, 0, 0); b.idle = 6.5; }, FENCE.x0 + 1.5, FENCE.z1 - 1.5);
await t.put(BASKET.hoop.x - 2, BASKET.hoop.z - 3, { withWoody: false, settle: 1500 });
check((await state()).mode === "stand", "el balón parado lejos vuelve a su soporte");

// Capturas de la pista entera, de día y de noche.
await defenders(true);
await t.put(BASKET.center.x + 1, BASKET.center.z + 2, { withWoody: false, settle: 800 });
await shot("pista-dia");
await t.evaluate(() => Object.assign(window.__world.rig, { distance: 2.2, lift: 1.3 }));
await wait(1500);
await shot("pista-alto-dia");
await t.evaluate(() => Object.assign(window.__world.rig, { distance: 1, lift: 1 }));
await t.moment("night");
await shot("pista-noche");
await t.done();
