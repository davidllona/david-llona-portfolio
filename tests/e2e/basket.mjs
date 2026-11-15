// Baloncesto: tiro con carga (corto, justo, largo), racha, barrera, valla y
// puerta. Guarda capturas de la pista de día y de noche.
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
  const w = window.__world, b = w.ball;
  return { mode: b.mode, x: b.position.x, y: b.position.y, z: b.position.z, vx: b.velocity.x, charge: b.charge, charging: b.charging, streak: b.streak, score: w.game.score, ideal: w.court.idealCharge(), played: { ...w.audio.played } };
 });
const shot = (name) => page.screenshot({ path: `${folder}${name}.jpg`, type: "jpeg", quality: 88 });
const grab = async () => {
 await t.evaluate(() => window.__world.court.home());
 await t.put(BASKET.ballStand.x + 0.9, BASKET.ballStand.z + 0.6, { withWoody: false, settle: 350 });
 await page.keyboard.press("KeyE");
 await wait(300);
};
const spot = (back = 4.6, side = 0) => t.put(BASKET.hoop.x - 0.62 - back, BASKET.hoop.z + side, { withWoody: false, settle: 300 });

// La barrera, fuera de momento: primero se mide el tiro solo.
await t.evaluate(() => (window.__world.court.blocker.active = false));

// 1. Con el balón, cerca: la indicación dice qué hacer.
await t.put(BASKET.ballStand.x + 0.9, BASKET.ballStand.z + 0.6, { withWoody: false, settle: 500 });
await page.keyboard.press("KeyE");
await wait(300);
check((await state()).mode === "held", "se coge el balón");
await spot();
check(/mant[eé]n.*canasta/i.test((await t.hint()) ?? ""), `con el balón, junto a la canasta: "${await t.hint()}"`);

// 2. Mantener pulsado carga (con indicador) y soltar tira.
const ideal = (await state()).ideal;
const rate = await t.evaluate(() => window.__world.court.rate);
await page.keyboard.down("KeyE");
const pressed = Date.now();
await wait(Math.round((ideal / rate) * 1000 * 0.55));
const mid = await state();
await shot("carga");
// (La captura tarda lo suyo y la carga sigue: se suelta a la hora justa, contada desde la pulsación.)
await wait(Math.max(0, pressed + Math.round((ideal / rate) * 1000) - Date.now()));
await page.keyboard.up("KeyE");
await wait(120);
const released = await state();
check(mid.charging && mid.charge > 0.08 && mid.charge < ideal, `mantener E carga la fuerza (a medias: ${mid.charge.toFixed(2)} de ${ideal.toFixed(2)})`);
check(released.mode === "free" && Math.abs(released.charge - ideal) < 0.12, `soltar tira con la fuerza cargada (${released.charge.toFixed(2)}; la justa, ${ideal.toFixed(2)})`);
await wait(2600);

// 3. Poca fuerza: corto. Demasiada: largo. La justa: canasta. Dos seguidas: racha.
const tryShot = async (offset) => {
 await grab();
 await spot();
 const before = await state();
 await t.evaluate((offset) => { const c = window.__world.court; c.shoot(c.idealCharge() + offset); }, offset);
 await wait(2700);
 const after = await state();
 return { scored: after.score - before.score, streak: after.streak, toasts: await t.toasts() };
};
const weak = await tryShot(-0.3);
check(weak.scored === 0 && weak.streak === 0, `con poca fuerza se falla (${weak.toasts.join(" · ") || "sin aviso"})`);
const strong = await tryShot(0.32);
check(strong.scored === 0 && strong.streak === 0, `con demasiada fuerza se falla (${strong.toasts.join(" · ") || "sin aviso"})`);
const good = await tryShot(0);
await shot("canasta");
check(good.scored === 1 && good.streak === 1, `con la fuerza justa entra (canastas +${good.scored}, racha ${good.streak})`);
const again = await tryShot(0);
check(again.scored === 1 && again.streak === 2, `dos seguidas: racha de ${again.streak}`);
const broken = await tryShot(-0.3);
check(broken.streak === 0, "al fallar, la racha vuelve a cero");
check(((await state()).played["ball-net"] ?? 0) >= 2, `la red suena al entrar (${(await state()).played["ball-net"]} veces)`);

// 4. La barrera tapona un tiro tenso.
await t.evaluate(() => (window.__world.court.blocker.active = true));
await grab();
await spot(4.6);
await wait(1300); // (la barrera vuelve a ponerse delante)
await t.evaluate(() => {
 const w = window.__world, c = w.court, b = w.ball;
 c.shoot(c.idealCharge());
 // Un tiro raso, directo a la barrera.
 b.velocity.set((c.blocker.x - b.position.x) / 0.5, 1.2, (c.blocker.z - b.position.z) / 0.5);
});
await wait(450);
await shot("tapon");
await wait(1800);
const blocked = await state();
check(blocked.played["ball-block"] > 0 && (await t.toasts()).some((text) => /tap[oó]n/i.test(text)) && blocked.streak === 0, `la barrera tapona (${(await t.toasts()).join(" · ")})`);
const jump = await t.evaluate(async () => {
 const c = window.__world.court;
 c.blocker.wait = 0.01;
 c.blocker.power = 4.5;
 let top = 0;
 for (let i = 0; i < 50; i++) { await new Promise((r) => setTimeout(r, 20)); top = Math.max(top, c.blocker.y); }
 return top;
});
check(jump > 0.6, `y salta (${jump.toFixed(2)} m)`);

// 5. El balón rebota en la valla y no se sale, ni por la puerta.
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

// 6. La puerta se abre al acercarse y deja pasar; por la valla no se pasa.
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

// 7. Si se queda parado lejos, el balón vuelve solo.
await t.evaluate((x, z) => { const b = window.__world.ball; b.mode = "free"; b.position.set(x, 0.2, z); b.velocity.set(0, 0, 0); b.idle = 6.5; }, FENCE.x0 + 1.5, FENCE.z1 - 1.5);
await t.put(BASKET.hoop.x - 2, BASKET.hoop.z - 3, { withWoody: false, settle: 1500 });
check((await state()).mode === "stand", "el balón parado lejos vuelve a su soporte");

// Capturas de la pista entera, de día y de noche.
await t.put(BASKET.center.x + 1, BASKET.center.z + 2, { withWoody: false, settle: 800 });
await shot("pista-dia");
await t.evaluate(() => Object.assign(window.__world.rig, { distance: 2.2, lift: 1.3 }));
await wait(1500);
await shot("pista-alto-dia");
await t.evaluate(() => Object.assign(window.__world.rig, { distance: 1, lift: 1 }));
await t.moment("night");
await shot("pista-noche");
await t.done();
