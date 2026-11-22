// La isla de la bienvenida (objetivo 27, A2 y A4): nada de Woody ni del
// astronauta atraviesa la isla (se miran TODOS los vértices de sus mallas, ya
// deformadas por la animación, durante unos segundos), el astronauta está en la
// hamaca y Woody duerme en el suelo, y al pulsar «Haz clic para aterrizar» el
// astronauta salta de la hamaca antes del descenso, sin alargarlo más de medio
// segundo. Saca capturas de la portada y de cerca.
//   node tests/e2e/isla.mjs [etiqueta]
import { check, open, out, wait } from "./common.mjs";

const tag = process.argv[2] ?? "ahora";
const t = await open({ viewport: { width: 1440, height: 900 } });
const { page, evaluate } = t;
await wait(1500);

// Lo más bajo de cada personaje respecto al suelo de la isla (y = 0 en su origen) y su caja en pantalla.
const sample = () =>
 evaluate(() => {
  const THREE = window.__world.THREE;
  const origin = window.__world.welcomeOrigin ?? [0, 150, 78];
  const found = {};
  const v = new THREE.Vector3();
  window.__world.scene.traverse((node) => {
   if (!node.isSkinnedMesh) return;
   node.getWorldPosition(v);
   if (Math.hypot(v.x - origin[0], v.y - origin[1], v.z - origin[2]) > 12) return;
   const who = node.skeleton.bones.some((bone) => /tail1/.test(bone.name)) ? "woody" : "astronauta";
   const entry = (found[who] ??= { low: Infinity, lowPart: "", box: [Infinity, Infinity, -Infinity, -Infinity], tailLow: Infinity });
   const position = node.geometry.attributes.position;
   const skin = node.geometry.attributes.skinIndex;
   const weights = node.geometry.attributes.skinWeight;
   node.skeleton.update?.();
   for (let i = 0; i < position.count; i++) {
    node.getVertexPosition(i, v);
    v.applyMatrix4(node.matrixWorld);
    const y = v.y - origin[1];
    // Hueso que más pesa en este vértice: para decir qué parte es.
    let best = 0, bone = 0;
    for (let k = 0; k < 4; k++) if (weights.getComponent(i, k) > best) (best = weights.getComponent(i, k)), (bone = skin.getComponent(i, k));
    const name = node.skeleton.bones[bone]?.name ?? "?";
    if (y < entry.low) (entry.low = y), (entry.lowPart = name);
    if (/tail/.test(name)) entry.tailLow = Math.min(entry.tailLow, y);
    const p = v.clone().project(window.__world.camera);
    const sx = ((p.x + 1) / 2) * innerWidth, sy = ((1 - p.y) / 2) * innerHeight;
    entry.box = [Math.min(entry.box[0], sx), Math.min(entry.box[1], sy), Math.max(entry.box[2], sx), Math.max(entry.box[3], sy)];
   }
  });
  const hammock = window.__world.hammock;
  return { found, hammock: hammock ? { lying: hammock.lying, swing: hammock.swing, sleeping: hammock.sleeping } : null };
 });

// Varias lecturas a lo largo de unos segundos: la respiración, el balanceo y el sueño mueven las mallas.
let lowest = { astronauta: { low: Infinity }, woody: { low: Infinity, tailLow: Infinity } };
const swings = [];
let last;
for (let i = 0; i < 8; i++) {
 last = await sample();
 for (const who of ["astronauta", "woody"]) {
  const one = last.found[who];
  if (!one) continue;
  if (one.low < lowest[who].low) lowest[who] = { ...one };
  lowest.woody.tailLow = Math.min(lowest.woody.tailLow, last.found.woody?.tailLow ?? Infinity);
 }
 if (last.hammock) swings.push(last.hammock.swing);
 await wait(450);
}
const SINK = -0.012; // lo que se hunde un pie al pisar la hierba (la isla no es plana del todo)
check(Boolean(last.found.astronauta && last.found.woody), "el astronauta y Woody están en la isla");
check(lowest.woody.low > SINK, `ninguna parte de Woody atraviesa la isla: lo más bajo, ${lowest.woody.lowPart}, a ${(lowest.woody.low * 100).toFixed(1)} cm del suelo (cola: ${(lowest.woody.tailLow * 100).toFixed(1)} cm)`);
check(lowest.astronauta.low > SINK, `ninguna parte del astronauta atraviesa la isla: lo más bajo, ${lowest.astronauta.lowPart}, a ${(lowest.astronauta.low * 100).toFixed(1)} cm del suelo`);
if (last.hammock) {
 check(last.hammock.lying && last.hammock.sleeping, "el astronauta está tumbado en la hamaca y Woody duerme en el suelo, debajo");
 const range = Math.max(...swings) - Math.min(...swings);
 check(range > 0.005 && Math.max(...swings.map(Math.abs)) < 0.12, `la hamaca se balancea muy despacio (de ${Math.min(...swings).toFixed(3)} a ${Math.max(...swings).toFixed(3)} rad)`);
} else check(false, "hay hamaca");

await page.screenshot({ path: `${out}isla-portada-${tag}.jpg`, type: "jpeg", quality: 90 });
// De cerca: la caja que ocupan los dos, con margen.
const boxes = ["astronauta", "woody"].map((who) => last.found[who].box);
const x0 = Math.max(0, Math.min(...boxes.map((b) => b[0])) - 160), y0 = Math.max(0, Math.min(...boxes.map((b) => b[1])) - 120);
const x1 = Math.min(1440, Math.max(...boxes.map((b) => b[2])) + 160), y1 = Math.min(900, Math.max(...boxes.map((b) => b[3])) + 90);
const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
console.log(`     recorte de cerca: ${JSON.stringify(clip)}`);
await page.screenshot({ path: `${out}isla-cerca-${tag}.jpg`, type: "jpeg", quality: 92, clip: process.env.ISLA_RECORTE ? JSON.parse(process.env.ISLA_RECORTE) : clip });

// Al pulsar: primero el salto de la hamaca, luego el descenso; entre las dos cosas, como mucho medio segundo.
if (last.hammock) {
 await evaluate(() => {
  // El instante del clic, según el propio evento (no el reloj de la prueba).
  window.__hop = { clicked: null, hop: null, descent: null };
  document.addEventListener("click", (event) => (window.__hop.clicked ??= event.timeStamp), { capture: true });
  const look = () => {
   const h = window.__world.hammock;
   const now = performance.now();
   if (h && !h.lying && window.__hop.hop === null) window.__hop.hop = now;
   if (window.__world.rig.intro < 1 && window.__hop.descent === null) window.__hop.descent = now;
   if (window.__hop.descent === null || now - window.__hop.descent < 200) requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
 });
 await page.click(".overlay__enter");
 const shots = [];
 for (let i = 0; i < 4; i++) {
  await wait(110);
  const file = `${out}isla-salto-${i + 1}-${tag}.jpg`;
  await page.screenshot({ path: file, type: "jpeg", quality: 88, clip });
  shots.push(file);
 }
 await page.waitForFunction(() => window.__hop.descent !== null, { timeout: 5000 });
 const hop = await evaluate(() => window.__hop);
 const toHop = hop.hop - hop.clicked, toDescent = hop.descent - hop.clicked;
 check(toHop < 120, `al pulsar, el astronauta se baja de la hamaca enseguida (${toHop.toFixed(0)} ms)`);
 check(toDescent > 250 && toDescent <= 560, `y el descenso empieza al acabar el salto, a los ${toDescent.toFixed(0)} ms (la entrada se alarga, como mucho, medio segundo)`);
 await page.waitForFunction(() => window.__world.rig.intro === 0, { timeout: 15000 });
}
await t.done();
