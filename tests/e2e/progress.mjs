// Sonido y logros: cada logro sale de un hecho real del juego, se guarda, no
// se repite al recargar y se puede reiniciar; cada acción pide su sonido.
import { open, check, wait } from "./common.mjs";

const t = await open();
const { page } = t;
const sounds = () => t.evaluate(() => ({ ...window.__world.audio.played }));
const saved = () => t.evaluate(() => JSON.parse(localStorage.getItem("planeta-logros") ?? "{}"));
const has = async (id) => Boolean((await saved()).unlocked?.[id]);
const counter = () => t.text(".quick__trophy span");
const { living } = await import("../../src/worlds/living/layout.js");
const { PROJECT_CABINS, BASKET, PAD } = await import("../../src/worlds/living/layout.js");

check((await t.evaluate(() => window.__world.audio.state())) === "sin crear", "antes del primer gesto no hay contexto de audio");
await t.enter();
check((await t.evaluate(() => window.__world.audio.state())) === "running", "al entrar, el audio arranca");
check((await counter()) === "0/21" && !(await has("primeros-pasos")), "se empieza con 0/21");

// Primeros pasos + pasos que suenan según el suelo.
await t.hold("KeyS", 1200);
check(await has("primeros-pasos"), "andar desbloquea «Primeros pasos»");
check(/Primeros pasos/.test((await t.achievement()) ?? "") && !(await page.$(".achievement-toast")), `sale el aviso, como tarjeta 3D: "${await t.achievement()}"`);
let played = await sounds();
check(played["step-path"] > 0 && played.achievement === 1, `suenan los pasos (camino: ${played["step-path"]}) y el logro`);
await t.put(-24, 12, { settle: 300 });
await t.hold("KeyA", 900);
await page.keyboard.press("Space");
await wait(1300);
played = await sounds();
check(played["step-grass"] > 0 && played.jump > 0 && played.land > 0, `hierba (${played["step-grass"]}), salto y caída suenan`);
await t.put(23, 0.2, { settle: 300 });
await t.hold("KeyD", 700);
check((await sounds())["step-wood"] > 0, "en el puente los pasos suenan a madera");

// Explorador: hay que pasar por las seis zonas; cinco no bastan.
for (const [i, area] of living.areas.entries()) {
 await t.put(area.x, area.z, { withWoody: false, settle: 600 });
 if (i === 4) check(!(await has("explorador")) && (await saved()).sets.explorador.length === 5, "con 5 zonas de 6, «Explorador» sigue sin conseguir");
}
check(await has("explorador"), "con las seis zonas, «Explorador»");

// Primer contacto: abrir de verdad un proyecto (acercarse no basta).
await t.put(PROJECT_CABINS[1].x + 0.4, PROJECT_CABINS[1].z + 3.4, { withWoody: false, settle: 500 });
check(!(await has("primer-contacto")), "estar delante de la cabaña no da «Primer contacto»");
await page.keyboard.press("KeyE");
await wait(400);
check((await has("primer-contacto")) && (await sounds())["ui-open"] > 0, "abrir la ficha sí, y suena la interfaz");
await page.keyboard.press("Escape");
await wait(300);

// Mejor amigo: tres caricias.
for (let i = 0; i < 3; i++) {
 await t.put(-6, 8, { settle: 700 });
 const hint = await t.hint();
 await page.keyboard.press("KeyE");
 await wait(3800);
 if (process.env.E2E_DEBUG) console.log("caricia", i, hint, JSON.stringify((await saved()).counts));
 if (i === 1) check(!(await has("mejor-amigo")) && (await saved()).counts["mejor-amigo"] === 2, "dos caricias: 2 de 3");
}
check((await has("mejor-amigo")) && (await sounds()).pet === 3, "tres caricias: «Mejor amigo»");

// Primer enceste: una canasta que entra por el aro.
await t.put(BASKET.ballStand.x + 0.9, BASKET.ballStand.z + 0.6, { withWoody: false, settle: 500 });
let score = 0;
for (let tries = 0; tries < 12 && !score; tries++) {
 await page.keyboard.press("KeyE"); // coger
 await wait(350);
 await t.put(BASKET.hoop.x - 3.2, BASKET.hoop.z, { withWoody: false, settle: 250 });
 check(tries > 0 || !(await has("primer-enceste")), "con el balón en la mano aún no hay logro");
 await page.keyboard.press("KeyE"); // tirar
 await wait(2600);
 score = await t.evaluate(() => window.__world.game.score);
 if (!score) {
  const ball = await t.evaluate(() => ({ x: window.__world.ball.position.x, z: window.__world.ball.position.z }));
  await t.put(ball.x + 0.7, ball.z + 0.4, { withWoody: false, settle: 250 });
 }
}
played = await sounds();
check(score === 1 && (await has("primer-enceste")) && played["ball-net"] === 1, `canasta real: «Primer enceste» y suena la red (botes: ${played["ball-floor"] ?? 0}, aro: ${played["ball-rim"] ?? 0})`);
check(played["ball-throw"] > 0 && played["ball-grab"] > 0, "coger y tirar el balón suenan");

// Viajero espacial: despegar.
await t.put(PAD.x, PAD.z + PAD.padRadius + 1.2, { withWoody: false, settle: 500 });
await page.keyboard.press("KeyE");
await wait(1200);
check((await has("viajero-espacial")) && (await sounds())["rocket-launch"] === 1, "despegar da «Viajero espacial» y ruge el cohete");

// Vitrina.
check((await counter()) === "6/21", `contador del menú: ${await counter()}`);
await page.click(".quick__trophy");
await wait(400);
const panel = await t.evaluate(() => ({
 total: document.querySelectorAll(".achievement").length,
 done: document.querySelectorAll(".achievement--unlocked").length,
 badges: document.querySelectorAll(".achievement svg.badge").length,
 distinct: new Set([...document.querySelectorAll(".achievement svg.badge g")].map((g) => g.innerHTML)).size,
 soon: [...document.querySelectorAll(".achievement__state")].filter((p) => p.textContent === "Próximamente").length,
}));
check(panel.total === 21 && panel.done === 6 && panel.soon === 15, `vitrina: ${panel.total} logros, ${panel.done} conseguidos, ${panel.soon} «próximamente»`);
check(panel.badges === 21 && panel.distinct === 21, `cada logro tiene su propia insignia (${panel.distinct} dibujos distintos)`);
await t.shot("logros");
await page.keyboard.press("Escape");
await wait(300);

// Persistencia: al recargar siguen ahí y no se vuelven a anunciar.
await t.evaluate(() => sessionStorage.setItem("e2e-conservar", "1"));
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => !document.querySelector("#loader") && !document.querySelector(".overlay__enter")?.disabled, { timeout: 40000 });
await wait(400);
await t.enter();
await t.hold("KeyS", 900);
check((await counter()) === "6/21" && !(await t.achievement()), "tras recargar: 6/21 guardados y ningún aviso repetido");

// Silenciar con M, y reiniciar el progreso.
await page.keyboard.press("KeyM");
await wait(200);
const muted = await t.evaluate(() => [document.querySelector(".sound-toggle").getAttribute("aria-pressed"), JSON.parse(localStorage.getItem("planeta-audio")).muted]);
check(muted[0] === "false" && muted[1] === true, "M silencia y lo recuerda");
await page.click(".quick__trophy");
await wait(300);
await t.evaluate(() => [...document.querySelectorAll(".achievements__reset button")].find((b) => b.textContent === "Reiniciar progreso").click());
await wait(150);
check((await has("explorador")) === true, "reiniciar pide confirmación antes de borrar");
await t.evaluate(() => [...document.querySelectorAll(".achievements__reset button")].find((b) => b.textContent === "Sí, borrar").click());
await wait(200);
check(Object.keys((await saved()).unlocked).length === 0 && (await t.evaluate(() => document.querySelectorAll(".achievement--unlocked").length)) === 0, "confirmado: el progreso vuelve a cero");
await t.done();
