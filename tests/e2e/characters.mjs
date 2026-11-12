// Astronauta y Woody riggeados: clips según el movimiento, seguimiento,
// descanso, caricias y guía.
import { open, check, wait } from "./common.mjs";

const t = await open({ query: process.argv[2] ?? "" });
const { page } = t;
const astro = () => t.evaluate(() => window.__world.astroClip?.() ?? null);
const dog = () => t.evaluate(() => window.__world.woodyClip?.() ?? null);
await t.enter();

// Astronauta: el clip sigue al movimiento.
await t.put(0, 7);
check((await astro()) === "Astro_Idle_Breathe" || (await astro()) === "Astro_Idle_LookAround", `parado: ${await astro()}`);
await page.keyboard.down("KeyW"); await wait(500);
check((await astro()) === "Astro_Run", `andando a paso normal: ${await astro()}`);
await page.keyboard.up("KeyW"); await wait(500);
await page.keyboard.press("Space"); await wait(120);
check(/Jump|Fall/.test(await astro()), `saltando: ${await astro()}`);
await wait(1500);
check(/Idle|Land/.test(await astro()), `tras aterrizar: ${await astro()}`);

// Woody sigue al jugador y se queda cerca. Se anda por un tramo despejado,
// que depende del planeta.
const worldId = await t.evaluate(() => window.__world.world().id);
const [startX, startZ, walkKey] = worldId === "living" ? [-6, 0.2, "KeyA"] : [0, 7, "KeyW"];
await t.put(startX, startZ);
await t.hold(walkKey, 3500);
let p = await t.pos(); let w = await t.woody();
check(Math.hypot(w.x - p.x, w.z - p.z) < 4.5, `Woody te sigue: a ${Math.hypot(w.x - p.x, w.z - p.z).toFixed(1)} m tras andar 12 m`);
await page.keyboard.down("ShiftLeft"); await page.keyboard.down("KeyD"); await wait(1500);
w = await t.woody(); const running = await dog();
await page.keyboard.up("KeyD"); await page.keyboard.up("ShiftLeft");
check(/Trot|Run/.test(running) && w.speed > 2, `si corres, trota o corre: ${running} a ${w.speed} m/s`);
await wait(1500);
// No atraviesa obstáculos: nunca queda dentro de un colisionador.
const inside = await t.evaluate(() => { const { woody, world } = window.__world; return world().colliders.some((c) => c.active !== false && Math.hypot(c.x - woody.position.x, c.z - woody.position.z) < c.r + 0.3); });
check(!inside, "Woody no queda metido en ningún obstáculo");

// Descanso: quietos, se sienta; al moverte, se levanta.
await wait(5500);
w = await t.woody(); check(w.posture === "sit" && /Sit/.test(await dog()), `quieto 6 s: se sienta (${w.posture}, ${await dog()})`);
await t.hold("KeyA", 1800); await wait(600);
w = await t.woody(); check(w.posture === "stand", `al alejarte se levanta y te sigue (${w.posture}, ${await dog()})`);

// Caricias.
await t.put(0, 7); await wait(400);
check(/Acariciar a Woody/.test((await t.text(".hud__prompt")) ?? ""), `junto a Woody: "${await t.text(".hud__prompt")}"`);
await page.keyboard.press("KeyE"); await wait(1400);
check((await astro()) === "Astro_PetWoody" && (await dog()) === "Woody_PetReact", `E: lo acaricia (${await astro()} / ${await dog()})`);
p = await t.pos(); w = await t.woody();
check(Math.hypot(w.x - p.x, w.z - p.z) < 1.4, `Woody se coloca delante: a ${Math.hypot(w.x - p.x, w.z - p.z).toFixed(2)} m`);
await t.shot("woody-caricia");
await t.hold("KeyD", 300); const during = await t.pos();
check(Math.abs(during.x - p.x) < 0.2, "durante el gesto el astronauta no se mueve");
await wait(2200);
await t.hold("KeyD", 400); check((await t.pos()).x > p.x + 0.5, "al terminar, recupera el control");

// Guía: menú, ruta, espera y llegada.
await t.put(0, 7);
await page.keyboard.press("KeyG"); await wait(300);
const options = await t.evaluate(() => [...document.querySelectorAll(".woody-menu__list button")].map((b) => b.textContent));
check(options.includes("Muéstrame proyectos") && options.includes("Llévame al cohete") && options.includes("Acompáñame") && options.includes("Silenciar consejos"), `G abre el menú: ${options.join(" · ")}`);
await t.evaluate(() => [...document.querySelectorAll(".woody-menu__list button")].find((b) => b.textContent === "Muéstrame proyectos").click());
await wait(3500);
w = await t.woody(); p = await t.pos();
check(w.mode === "guide" && Math.hypot(w.x - p.x, w.z - p.z) > 3, `Woody va delante hacia Proyectos (a ${Math.hypot(w.x - p.x, w.z - p.z).toFixed(1)} m de ti)`);
await wait(3000);
w = await t.woody(); check(w.waiting && /GuideWait/.test(await dog()), `si no le sigues, te espera (${await dog()})`);
await t.shot("woody-espera");
const destination = await t.evaluate(() => window.__world.world().guide.nodes.proyectos);
// Se le sigue: en cada paso se pulsa hacia donde está Woody.
let arrived = false;
const held = new Set();
for (let i = 0; i < 120 && !arrived; i++) {
 w = await t.woody(); p = await t.pos();
 const want = new Set();
 if (w.z < p.z - 0.8) want.add("KeyW"); else if (w.z > p.z + 0.8) want.add("KeyS");
 if (w.x < p.x - 0.8) want.add("KeyA"); else if (w.x > p.x + 0.8) want.add("KeyD");
 for (const key of held) if (!want.has(key)) { await page.keyboard.up(key); held.delete(key); }
 for (const key of want) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
 await wait(200);
 arrived = w.mode === "follow";
}
for (const key of held) await page.keyboard.up(key);
w = await t.woody();
check(arrived && Math.hypot(w.x - destination[0], w.z - destination[1]) < 2.5, `al seguirle, llega a Proyectos y vuelve a acompañarte (${w.x}, ${w.z})`);
check(/Woody: /.test((await t.text(".hud__toast")) ?? ""), `avisa al llegar: "${await t.text(".hud__toast")}"`);

console.log("fps:", await t.fps());
await t.done();
