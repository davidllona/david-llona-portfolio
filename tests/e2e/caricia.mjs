// La caricia a Woody (objetivo 27, A3): la palma del astronauta queda sobre la
// cabeza o el lomo de Woody, a su altura real, sin meterse en él ni quedarse
// por debajo; con Woody de pie, sentado y tumbado, y en los tres mundos.
// Mientras dura la caricia se mira, cada 40 ms, la palma (hueso Fingers_R)
// contra la superficie de Woody justo debajo (sus vértices ya deformados por la
// animación, a menos de 9 cm en horizontal).
//   node tests/e2e/caricia.mjs [mundos=living,twisted,cosmic] [poses=stand,sit,lie] [capturas]
import { check, open, out, wait } from "./common.mjs";

const worlds = (process.argv[2] ?? "living,twisted,cosmic").split(",");
const poses = (process.argv[3] ?? "stand,sit,lie").split(",");
const shots = process.argv.includes("capturas");
const DIR = [Math.cos(0.6), Math.sin(0.6)]; // hacia dónde queda Woody: a la derecha y hacia la cámara
const SPOT = { living: [2, 38], twisted: null, cosmic: null }; // (llano y sin nada delante)

for (const name of worlds) {
 const t = await open({ query: name === "living" ? "" : `?world=${name}` });
 const { page, evaluate } = t;
 await t.enter();
 // Un sitio llano y despejado: el de la prueba de progreso en el mundo 1; en los otros, donde se aparece.
 const [x, z] = SPOT[name] ?? (await evaluate(() => [window.__world.player.position.x, window.__world.player.position.z]));
 for (const pose of poses) {
  if (pose === "lie" && (await evaluate(() => Boolean(window.__world.world().woodyStaysUp)))) {
   console.log(`     ${name}: aquí Woody no se tumba nunca (woodyStaysUp): no hay caricia tumbado que probar`);
   continue;
  }
  await t.put(x, z, { settle: 400 });
  // Mira en diagonal hacia la cámara (a +x y +z): así se ve la mano por delante del casco.
  await evaluate((dir) => (window.__world.player.facing = Math.atan2(-dir[0], -dir[1])), DIR);
  if (pose !== "stand") {
   // Se espera a que Woody se siente (o se tumbe) solo, quieto el astronauta, y se le acerca.
   await page.waitForFunction((pose) => window.__world.woodyBrain.posture === pose && !/Down|Up/.test(window.__world.woodyClip()), { timeout: 40000, polling: 200 }, pose);
   await wait(900);
   await evaluate((pose, dir) => {
    const w = window.__world;
    const p = w.player.position;
    // Delante del astronauta, al alcance de su mano: sentado, de cara a él (la
    // cabeza cerca); tumbado, de lado (el lomo cerca).
    const d = pose === "sit" ? 0.95 : 0.72;
    w.woody.position.set(p.x + dir[0] * d, p.y, p.z + dir[1] * d);
    w.woody.position.y = w.world().height(w.woody.position.x, w.woody.position.z);
    const toward = Math.atan2(dir[0], dir[1]); // mirando al astronauta
    // (Con escafandra se le acaricia el lomo: también sentado se pone de lado.)
    const side = pose === "lie" || w.world().woodyPetBack;
    w.woody.position.set(p.x + dir[0] * (side ? 0.72 : d), p.y, p.z + dir[1] * (side ? 0.72 : d));
    w.woody.position.y = w.world().height(w.woody.position.x, w.woody.position.z);
    w.woody.facing = side ? toward + Math.PI / 2 : toward;
   }, pose, DIR);
   await wait(500);
  }
  const before = await evaluate(() => window.__world.woodyBrain.posture);
  await page.keyboard.press("KeyE");
  const samples = [];
  const started = Date.now();
  let shot = false;
  while (Date.now() - started < 3600) {
   const s = await evaluate(() => {
    const w = window.__world;
    const hand = w.petHand;
    if (!hand || w.astroClip() !== "Astro_PetWoody" || hand.weight < 0.97) return null;
    const THREE = w.THREE;
    const palm = new THREE.Vector3(...hand.palm);
    let top = -Infinity, inside = false;
    const v = new THREE.Vector3();
    w.scene.traverse((node) => {
     if (!node.isSkinnedMesh || !node.skeleton.bones.some((bone) => bone.name === "tail1")) return;
     node.getWorldPosition(v);
     if (v.distanceTo(palm) > 3) return;
     const position = node.geometry.attributes.position;
     for (let i = 0; i < position.count; i++) {
      node.getVertexPosition(i, v);
      v.applyMatrix4(node.matrixWorld);
      if (Math.hypot(v.x - palm.x, v.z - palm.z) < 0.09) top = Math.max(top, v.y);
     }
    });
    return { gap: palm.y - top, posture: w.woodyBrain.posture, mode: w.woodyBrain.mode };
   });
   if (s) {
    samples.push(s);
    if (shots && !shot && samples.length > 6) {
     shot = true;
     // De cerca: un recorte ampliado alrededor de los dos.
     const p = await t.pos();
     const [sx, sy] = await t.screen(p.x + DIR[0] * 0.45, p.y + 0.6, p.z + DIR[1] * 0.45);
     await page.screenshot({ path: `${out}caricia-${name}-${pose}.jpg`, type: "jpeg", quality: 90, clip: { x: sx - 210, y: sy - 150, width: 420, height: 300, scale: 2.5 } });
    }
   }
   await wait(40);
  }
  const gaps = samples.map((s) => s.gap).filter(Number.isFinite);
  const kept = samples.length ? samples[0].posture : "—";
  const label = { stand: "de pie", sit: "sentado", lie: "tumbado" }[pose];
  check(samples.length >= 8 && gaps.length === samples.length, `${name}, Woody ${label} (${before} → ${kept}): la palma está encima de Woody en las ${samples.length} lecturas de la caricia (${gaps.length} con Woody debajo)`);
  if (gaps.length) {
   const low = Math.min(...gaps), high = Math.max(...gaps);
   check(low > -0.025 && high < 0.13, `   y a su altura: de ${(low * 100).toFixed(1)} a ${(high * 100).toFixed(1)} cm sobre su ${pose === "lie" || name === "cosmic" ? "lomo" : "cabeza"} (sin meterse ni quedarse por encima)`);
  }
  if (pose !== "stand") check(kept === pose, `   Woody sigue ${label} mientras lo acaricia`);
  await page.waitForFunction(() => window.__world.astroClip() !== "Astro_PetWoody", { timeout: 6000 });
  await wait(300);
 }
 await t.done();
}
