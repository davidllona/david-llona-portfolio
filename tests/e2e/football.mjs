// Fútbol jugable, de principio a fin: entrar con E, chutar con el ratón, y un
// tiro de cada clase con su resultado real —gol, poste, larguero, fuera, alto,
// corto, parada del portero, bloqueo de la barrera, diana—, el marcador, el
// reinicio, los logros, los sonidos y la salida. Guarda fotogramas de todo.
//   node tests/e2e/football.mjs
import { open, check, wait } from "./common.mjs";
import { PITCH } from "../../src/worlds/living/layout.js";

const t = await open();
const { page } = t;
await t.enter();
const cz = (PITCH.z0 + PITCH.z1) / 2;
const GOAL = { x: PITCH.x0 + 2.3, z: cz };
const saved = () => t.evaluate(() => JSON.parse(localStorage.getItem("planeta-logros") ?? "{}"));
const has = async (id) => Boolean((await saved()).unlocked?.[id]);
const state = () =>
 t.evaluate(() => {
  const { match } = window.__world.football;
  const b = match.ball.position;
  return { active: match.active, phase: match.phase, mode: match.mode, stats: { ...match.stats }, ball: [b.x, b.y, b.z], power: match.power, wall: match.wall.map((one) => ({ on: one.on, y: one.y })), keeper: { on: match.keeper.on, z: match.keeper.z, lean: match.keeper.lean } };
 });
// Chuta con los valores dados (sin la dispersión aleatoria) y espera el resultado.
// Devuelve lo que pasó y saca fotogramas por el camino.
async function shoot(name, shot, { frames = 5, every = 230, keeper = false } = {}) {
 await page.waitForFunction(() => window.__world.football.match.phase === "aim", { timeout: 9000 });
 // Sin portero (o con uno infalible), para que el resultado dependa solo del tiro.
 await t.evaluate((keeper) => window.__world.football.setKeeper(Boolean(keeper), keeper || 0.7), keeper);
 await t.evaluate(() => {
  const w = window.__world;
  w.football.match.noise = 0;
  w.shotLog = { bulge: 0, wallJump: [0, 0, 0], keeperLean: 0, woody: [], clips: new Set(), result: null };
  w.shotTimer = setInterval(() => {
   const { match } = w.football;
   const log = w.shotLog;
   log.bulge = Math.max(log.bulge, w.football.netBulge());
   match.wall.forEach((one, i) => (log.wallJump[i] = Math.max(log.wallJump[i], one.y)));
   log.keeperLean = Math.max(log.keeperLean, Math.abs(match.keeper.lean));
   log.woody.push(w.woodyLook ?? 0);
   log.clips.add(w.astroClip());
   log.woodyClip = log.woodyClip || (w.woodyClip() === "Woody_CelebrateGoal");
   if (match.shot?.result) log.result = { result: match.shot.result, tags: [...match.shot.tags], impacts: match.shot.impacts, net: match.shot.net, cross: match.shot.cross ?? null };
  }, 30);
 });
 await t.evaluate((shot) => window.__world.football.release(shot), shot);
 for (let i = 0; i < frames; i++) {
  await wait(every);
  await t.shot(`${name}-${i}`);
 }
 await page.waitForFunction(() => window.__world.shotLog.result, { timeout: 12000 });
 await wait(900);
 await t.shot(`${name}-final`);
 return t.evaluate(() => {
  const w = window.__world;
  clearInterval(w.shotTimer);
  const b = w.football.match.ball.position;
  return { ...w.shotLog.result, bulge: w.shotLog.bulge, wallJump: w.shotLog.wallJump, keeperLean: w.shotLog.keeperLean, woodySwing: Math.max(...w.shotLog.woody) - Math.min(...w.shotLog.woody), clips: [...w.shotLog.clips], woodyCheer: Boolean(w.shotLog.woodyClip), ball: [b.x, b.y, b.z] };
 });
}

// ── Entrar con E ─────────────────────────────────────────────────────────────
await t.put(GOAL.x + 9.5, cz + 1.2, { settle: 1300 });
check(/Jugar al fútbol/.test((await t.hint()) ?? ""), `junto al campo aparece la indicación: "${await t.hint()}"`);
await t.shot("futbol-0-fuera");
await page.keyboard.press("KeyE");
await wait(2300);
let s = await state();
const cam = await t.evaluate(() => {
 const w = window.__world;
 const { match } = w.football;
 const c = w.camera.position;
 return { behind: c.x - match.ball.position.x, frozen: w.player.frozen, hud: Boolean(document.querySelector(".football")), font: getComputedStyle(document.querySelector(".football__score dd")).fontFamily, woody: Math.hypot(w.woody.position.x - match.ball.position.x, w.woody.position.z - match.ball.position.z), woodySide: Math.abs(w.woody.position.z - match.ball.position.z) };
});
check(s.active && s.phase === "aim" && cam.frozen && cam.hud, "E entra en el juego: partido en marcha, astronauta quieto e interfaz a la vista");
check(cam.behind > 2.5, `la cámara de lanzamiento se pone a la espalda del balón, mirando a la portería (${cam.behind.toFixed(1)} m por detrás)`);
check(/Bricolage/.test(cam.font), `el marcador usa la tipografía del porfolio (${cam.font.split(",")[0]})`);
{
 const [bx, by] = await t.screen(...s.ball);
 const [gx, gy] = await t.screen(GOAL.x, 1.1, cz);
 check(bx > 100 && bx < 1340 && by > 100 && by < 880 && gx > 100 && gx < 1340 && gy > 60 && gy < 800, `en el encuadre caben el balón (${bx.toFixed(0)}, ${by.toFixed(0)}) y la portería (${gx.toFixed(0)}, ${gy.toFixed(0)})`);
}
await t.shot("futbol-1-listo");

// ── Un tiro con el ratón: apuntar, cargar, soltar ────────────────────────────
{
 const [ax, ay] = await t.screen(GOAL.x, 1.0, cz - 1.5);
 await page.mouse.move(ax, ay);
 await wait(200);
 const aim = await t.evaluate(() => ({ ...window.__world.football.match.aim }));
 check(Math.abs(aim.z - (cz - 1.5)) < 0.25 && Math.abs(aim.y - 1.0) < 0.25, `el ratón apunta sobre la portería (apunta a y ${aim.y.toFixed(2)}, z ${(aim.z - cz).toFixed(2)})`);
 await page.mouse.down();
 await wait(420);
 const mid = await t.evaluate(() => ({ power: window.__world.football.match.power, bar: document.querySelector(".football__power").dataset.on, fill: document.querySelector(".football__fill").style.transform }));
 await t.shot("futbol-2-cargando");
 await page.mouse.move(ax + 60, ay);
 await wait(420);
 const curl = await t.evaluate(() => window.__world.football.match.curl);
 await page.mouse.up();
 check(mid.power > 0.2 && mid.power < 0.5 && mid.bar === "1" && /scaleX\(0\.[2-4]/.test(mid.fill), `mantener pulsado carga la potencia y la barra la enseña (${mid.power.toFixed(2)}, ${mid.fill})`);
 check(curl > 0.3, `mover de lado mientras se carga da efecto (${curl.toFixed(2)})`);
 await page.waitForFunction(() => window.__world.football.match.phase === "flight", { timeout: 3000 });
 const flying = await t.evaluate(() => ({ speed: window.__world.football.match.ball.velocity.length(), spin: window.__world.football.match.ball.spin.y, clip: window.__world.astroClip() }));
 check(flying.speed > 8 && Math.abs(flying.spin) > 5, `al soltar, el astronauta chuta y el balón sale con velocidad (${flying.speed.toFixed(1)} m/s) y giro (${flying.spin.toFixed(0)} rad/s)`);
 check(/Football_Kick/.test(flying.clip), `el balón sale en el impacto del clip de chut (${flying.clip})`);
 await page.waitForFunction(() => window.__world.football.match.shot?.result, { timeout: 12000 });
 s = await state();
 check(s.stats.attempts === 1, `el marcador cuenta el intento (${s.stats.attempts}; resultado: ${s.stats.last})`);
}

const mode = async (name) => {
 await page.waitForFunction(() => ["aim", "over", "result"].includes(window.__world.football.match.phase), { timeout: 12000 });
 await wait(300);
 await t.evaluate((name) => window.dispatchEvent(new KeyboardEvent("keydown", { code: name })), name);
 await wait(500);
};

// ── Gol ──────────────────────────────────────────────────────────────────────
await mode("Digit1");
let r = await shoot("gol", { y: 1.0, z: cz + 1.3, power: 0.6, curl: 0 });
s = await state();
check(r.result === "gol" && s.stats.goals === 1, `gol: el balón cruza la línea entre los postes (resultado «${r.result}», goles ${s.stats.goals})`);
check(r.net && r.bulge > 0.12, `la red se mueve al recibir el balón (se embolsa ${(r.bulge * 100).toFixed(0)} cm)`);
check(r.ball[0] < GOAL.x && r.ball[0] > GOAL.x - 1.7 && Math.abs(r.ball[2] - cz) < 2.4, `y lo retiene dentro de la portería (queda a ${(GOAL.x - r.ball[0]).toFixed(2)} m tras la línea)`);
check(r.clips.some((clip) => /Football_Kick/.test(clip)) && r.clips.some((clip) => /GoalCelebrate/.test(clip)), `el astronauta chuta y celebra (${r.clips.filter((clip) => /Football/.test(clip)).join(", ")})`);
check(r.woodyCheer, "Woody celebra el gol");
check(r.woodySwing > 0.08, `y sigue el balón con la cabeza (gira ${r.woodySwing.toFixed(2)} rad)`);
check(await has("primer-gol"), "logro «Primer gol» al marcar");

// ── Poste ────────────────────────────────────────────────────────────────────
check(!(await has("al-palo")), "«Al palo» aún no está: no se ha dado en la madera");
r = await shoot("poste", { y: 1.1, z: cz + 2.46, power: 0.6, curl: 0 });
check(r.tags.includes("post") && r.result === "poste", `poste: choque real con el poste y no es gol (resultado «${r.result}», golpe de ${r.impacts.find((i) => i.tag === "post")?.impact} m/s)`);
check(await has("al-palo"), "logro «Al palo» tras el impacto en el poste");

// ── Larguero ─────────────────────────────────────────────────────────────────
r = await shoot("larguero", { y: 2.24, z: cz - 0.4, power: 0.6, curl: 0 });
check(r.tags.includes("crossbar") && r.result === "larguero", `larguero: choque real con el larguero y no es gol (resultado «${r.result}»)`);

// ── Fuera, alto y corto ──────────────────────────────────────────────────────
r = await shoot("fuera", { y: 1.0, z: cz + 3.5, power: 0.6, curl: 0 });
check(r.result === "fuera", `tiro desviado: fuera (resultado «${r.result}»)`);
r = await shoot("alto", { y: 1.9, z: cz, power: 1, curl: 0 });
check(r.result === "alto", `con demasiada potencia se va por encima (resultado «${r.result}»)`);
s = await state();
check(s.phase === "over" || s.stats.left === 0, `a los cinco tiros se acaba la ronda de penaltis (quedan ${s.stats.left})`);
await mode("KeyR");
s = await state();
check(s.stats.attempts === 0 && s.stats.goals === 0 && s.stats.score === 0 && s.phase === "aim", "reiniciar pone el marcador a cero y deja el balón listo");
await t.shot("futbol-reinicio");
r = await shoot("corto", { y: 1.0, z: cz, power: 0.06, curl: 0 }, { frames: 4, every: 450 });
check(r.result === "corto" && r.ball[0] > GOAL.x + 1, `con poca potencia el balón no llega (resultado «${r.result}», se para a ${(r.ball[0] - GOAL.x).toFixed(1)} m de la línea)`);

// ── Efecto ───────────────────────────────────────────────────────────────────
r = await shoot("efecto", { y: 1.0, z: cz, power: 0.6, curl: 1 }, { frames: 3 });
const curved = (r.cross?.z ?? cz) - cz;
check(Math.abs(curved) > 0.3 && Math.abs(curved) < 2, `el efecto curva el tiro, con moderación (apuntando al centro, cruza la línea ${Math.abs(curved).toFixed(2)} m a un lado; resultado «${r.result}»)`);

// ── Parada del portero ───────────────────────────────────────────────────────
r = await shoot("parada", { y: 1.0, z: cz + 0.9, power: 0.55, curl: 0 }, { keeper: 1 });
check(r.tags.includes("keeper") && r.result === "parada", `el portero se desplaza y para el tiro (resultado «${r.result}», se inclina ${r.keeperLean.toFixed(2)} rad)`);

// ── Barrera ──────────────────────────────────────────────────────────────────
await mode("Digit2");
s = await state();
check(s.mode === "faltas" && s.wall.every((one) => one.on), "tiros libres: sale la barrera de tres maniquíes");
await t.shot("futbol-barrera");
const wallAim = await t.evaluate(() => {
 const { match } = window.__world.football;
 // El punto de la portería que queda justo detrás del maniquí del centro.
 const one = match.wall[1];
 const k = (window.__world.football.GOAL.x - match.spot.x) / (one.x - match.spot.x);
 return match.spot.z + (one.z - match.spot.z) * k;
});
r = await shoot("barrera", { y: 0.5, z: wallAim, power: 0.5, curl: 0 });
check(r.tags.includes("wall") && r.result === "barrera", `la barrera bloquea de verdad (resultado «${r.result}»)`);
check(r.wallJump.every((y) => y > 0.25) && new Set(r.wallJump.map((y) => y.toFixed(2))).size > 1, `los maniquíes saltan, cada uno a su aire (alturas ${r.wallJump.map((y) => y.toFixed(2)).join(", ")} m)`);
await page.waitForFunction(() => window.__world.football.match.phase === "aim", { timeout: 9000 });
await t.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyB" })));
await wait(300);
s = await state();
check(s.wall.every((one) => !one.on), "la barrera se puede quitar");
// Falta directa sin barrera ni portero: cuenta para «Especialista».
r = await shoot("falta", { y: 1.2, z: cz - 1.2, power: 0.6, curl: 0 });
check(r.result === "gol" && (await saved()).counts?.especialista === 1 && !(await has("especialista")), `gol de falta: «Especialista» lleva 1 de 3 y aún no está (resultado «${r.result}»)`);
await t.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyB" })));

// ── Precisión: dianas ────────────────────────────────────────────────────────
await mode("Digit3");
s = await state();
check(s.mode === "precision" && !s.keeper.on, "precisión: dianas en la portería y sin portero");
await t.shot("futbol-dianas");
r = await shoot("diana", { y: 1.72, z: cz - 1.85, power: 0.6, curl: 0 });
s = await state();
check(s.stats.score === 150 && r.result === "diana", `acertar una diana de escuadra da 150 puntos (puntos: ${s.stats.score}; resultado «${r.result}»)`);
r = await shoot("sin-diana", { y: 1.1, z: cz + 0.95, power: 0.6, curl: 0 }, { frames: 2 });
s = await state();
check(r.result === "sin diana" && s.stats.score === 150, `entrar sin dar en ninguna no puntúa (resultado «${r.result}», puntos ${s.stats.score})`);
check(!(await has("dianas")), "«Dianas» no se da por una sola");

// ── Contrarreloj ─────────────────────────────────────────────────────────────
await mode("Digit4");
r = await shoot("crono", { y: 0.9, z: cz - 1, power: 0.6, curl: 0 }, { frames: 2 });
await wait(1500);
s = await state();
check(s.mode === "contrarreloj" && s.stats.time < 44.5 && s.stats.time > 30, `contrarreloj: el tiempo corre desde el primer chut (quedan ${s.stats.time.toFixed(1)} s)`);
{
 const hud = await t.evaluate(() => [...document.querySelectorAll(".football__score dd")].map((dd) => dd.textContent));
 check(hud[0] === String(s.stats.attempts) && hud[1] === String(s.stats.goals) && hud[2] === String(s.stats.score) && /s$/.test(hud[3]), `el marcador enseña intentos, goles, puntos y tiempo (${hud.join(" · ")})`);
 await t.shot("futbol-marcador");
}

// ── Sonidos ──────────────────────────────────────────────────────────────────
{
 const played = await t.evaluate(() => ({ ...window.__world.audio.played }));
 const ids = ["ball-kick", "ball-grass", "ball-woodwork", "ball-crossbar", "ball-goalnet", "ball-wall", "ball-save", "football-goal"];
 check(ids.every((id) => played[id] > 0), `cada contacto tiene su sonido (${ids.map((id) => `${id.replace(/^ball-|^football-/, "")} ${played[id] ?? 0}`).join(", ")})`);
 check(played["ball-grass"] < 60 && played["ball-goalnet"] < 12, `sin repetirse en contactos continuos (césped ${played["ball-grass"]}, red ${played["ball-goalnet"]} en ${s.stats.attempts + 12} tiros)`);
}

// ── Salir ────────────────────────────────────────────────────────────────────
await page.waitForFunction(() => window.__world.football.match.phase === "aim", { timeout: 9000 });
await t.evaluate(() => {
 const w = window.__world;
 w.camLog = { last: w.camera.position.clone(), jump: 0 };
 w.camTimer = setInterval(() => {
  w.camLog.jump = Math.max(w.camLog.jump, w.camera.position.distanceTo(w.camLog.last));
  w.camLog.last.copy(w.camera.position);
 }, 16);
});
await page.keyboard.press("Escape");
await wait(2600);
const out = await t.evaluate(() => {
 const w = window.__world;
 clearInterval(w.camTimer);
 const dx = w.camera.position.x - w.player.position.x;
 const enter = document.querySelector(".overlay__enter");
 return { active: w.football.match.active, frozen: w.player.frozen, focus: w.rig.focus, hud: Boolean(document.querySelector(".football")), overlay: Boolean(enter && enter.getBoundingClientRect().width > 0 && getComputedStyle(enter.closest(".overlay")).visibility !== "hidden" && getComputedStyle(enter.closest(".overlay")).opacity !== "0"), jump: w.camLog.jump, side: Math.abs(dx), post: w.woody.post };
});
check(!out.active && !out.frozen && out.focus === null && !out.hud && !out.post, "Esc sale del minijuego: sin partido, sin interfaz y con el astronauta libre");
check(!out.overlay, "y no pausa el portfolio");
check(out.jump < 3 && out.side < 0.6, `la cámara vuelve tras el astronauta sin saltos (mayor paso entre fotogramas: ${out.jump.toFixed(2)} m)`);
await t.shot("futbol-salida");
const before = await t.pos();
await t.hold("KeyS", 800);
const after = await t.pos();
check(after.z > before.z + 1.5, `los controles vuelven: el astronauta anda (${(after.z - before.z).toFixed(1)} m)`);
check(/Jugar al fútbol/.test((await t.hint()) ?? ""), "y se puede volver a entrar");

// ── Vitrina del trofeo ───────────────────────────────────────────────────────
await t.put(PITCH.x0 + 6.2, PITCH.z0 - 0.3, { withWoody: false, settle: 1500 });
check(/trofeo/i.test((await t.hint()) ?? ""), `junto a la vitrina: "${await t.hint()}"`);
await t.shot("trofeo-0");
await page.keyboard.press("KeyE");
await wait(700);
check((await t.toasts()).some((text) => /ESPAÑA · 2010/.test(text)), "la vitrina enseña «ESPAÑA · 2010»");
for (let i = 1; i <= 3; i++) {
 await t.shot(`trofeo-${i}`);
 await wait(450);
}
await t.done();
