// Despegue: la nave no cambia de tamaño, el césped no se rompe (el parche no
// cambia de tamaño y solo se agita con el empuje), la cámara sigue al cohete
// y hay humo, polvo y chispas. Al subir, el mundo se curva de verdad hasta
// cerrarse en un planeta pequeño: el planeta ES la isla (ocupa casi todo el
// hemisferio que se ve, con su mar alrededor), con la nave delante, la luna y
// los otros dos mundos, cerrados, a lo lejos. Al aterrizar, el camino inverso.
// Saca la serie de fotogramas.
import { open, check, wait } from "./common.mjs";
import { PAD } from "../../src/worlds/living/layout.js";

const t = await open();
await t.enter();
await t.put(PAD.x, PAD.z + 5.6, { withWoody: false, settle: 1000 });
check(/Subir a la nave/.test((await t.hint()) ?? ""), `junto a la nave: "${await t.hint()}"`);
const probe = () =>
 t.evaluate((pad) => {
  const w = window.__world;
  const body = w.ship.body;
  const push = w.env.windBlast.value.w;
  return { phase: w.ship.flight.phase, scale: [body.scale.x, body.scale.y, body.scale.z], x: body.position.x, y: body.position.y, z: body.position.z, push, distance: w.rig.distance, space: w.rig.space, bend: w.rig.bend, thrust: w.ship.exhaust.thrust };
 }, PAD);
const onScreen = async () => {
 const at = await probe();
 const [sx, sy] = await t.screen(at.x, at.y + (at.phase === "orbit" ? 0 : 4), at.z);
 return sx > 60 && sx < 1380 && sy > 20 && sy < 880;
};
const before = await probe();
await t.shot("despegue-0-antes");
await t.page.keyboard.press("KeyE");
await wait(900);
let now = await probe();
check(now.phase === "igniting" && now.y < 0.2 && now.thrust > 0.3, `encendido: motores en marcha y la nave aún en tierra (${now.phase}, y=${now.y.toFixed(2)})`);
check(now.push > 0.3 && before.push === 0, `el empuje agita la vegetación alrededor de la plataforma (fuerza ${now.push.toFixed(2)}; antes ${before.push.toFixed(2)})`);
await t.shot("despegue-1-encendido");
const samples = [];
for (let i = 2; i < 12; i++) {
 await wait(560);
 now = await probe();
 samples.push({ ...now, seen: await onScreen() });
 await t.shot(`despegue-${i}`);
}
check(samples.every((one) => one.scale.every((value) => Math.abs(value - 1) < 1e-6)), "la nave mantiene su escala durante todo el vuelo");
check(samples.every((one) => one.seen), "la cámara sigue al cohete mientras sube: no sale de la pantalla en ningún momento");
const far = samples.map((one) => one.distance);
check(far.every((value, i) => i === 0 || value >= far[i - 1] - 0.01) && far[far.length - 1] > 15, `y se aleja cada vez más, sin saltos (${far.map((value) => value.toFixed(0)).join(" → ")} veces la distancia de juego)`);
const heights = samples.map((one) => one.y);
check(heights[1] - heights[0] < heights[3] - heights[2] && heights[4] > 4, `acelera poco a poco (alturas: ${heights.slice(0, 6).map((h) => h.toFixed(1)).join(" → ")} m)`);
// El mundo se curva sin saltos: de plano a esfera cerrada, siempre a más.
const bends = samples.map((one) => one.bend);
check(before.bend === 0 && bends.every((value, i) => i === 0 || value >= bends[i - 1]) && bends.some((value) => value > 0.05 && value < 0.95) && bends[bends.length - 1] === 1, `el suelo plano se va curvando hasta cerrarse en esfera, sin corte (${bends.map((value) => value.toFixed(2)).join(" → ")})`);
await wait(3200);
now = await probe();
check(now.phase === "orbit" && now.y > 60, `y llega a la órbita (a ${now.y.toFixed(0)} m)`);
await t.shot("despegue-12-orbita");

// En órbita se ve un planeta, y el planeta es la isla: el mundo entero curvado
// en una esfera pequeña que cabe en la pantalla, con la isla cubriendo casi
// todo el hemisferio visible y su mar alrededor.
const orbit = await t.evaluate(() => {
 const w = window.__world, s = w.space;
 const seen = {};
 s.group.traverse((o) => { if (o.name) seen[o.name] = o.visible; });
 const shadows = [];
 w.scene.traverse((o) => o.isLight && o.castShadow && shadows.push(o.shadow.autoUpdate));
 let culled = 0;
 w.scene.traverse((o) => { if (o.isMesh && o.frustumCulled) culled += 1; });
 // Puntos de la costa (a 50 m de la plataforma, en ocho rumbos), ya curvados.
 const coast = [];
 for (let i = 0; i < 8; i++) coast.push(s.bendPoint(Math.cos((i * Math.PI) / 4) * 50, 0, Math.sin((i * Math.PI) / 4) * 50));
 return { visible: s.group.visible, radius: s.radius, names: s.names, seen, fog: w.scene.fog.density, shadows, culled, coast, bend: w.rig.bend };
});
check(orbit.shadows.length > 0 && orbit.shadows.every((auto) => !auto), "en órbita el mapa de sombras no se rehace en cada fotograma");
check(orbit.bend === 1 && orbit.fog < 1e-5 && orbit.culled === 0, `el mundo está cerrado en esfera, sin niebla y sin nada descartado por encuadre (curva ${orbit.bend.toFixed(2)}, niebla ${orbit.fog.toExponential(1)})`);
check(!("planeta" in orbit.seen) && !("nubes del planeta" in orbit.seen) && orbit.seen["fondo del mar"] && orbit.seen["sombra de la noche"] && orbit.seen["atmósfera"], "no hay otro modelo de planeta: solo el fondo del mar, la sombra del lado de noche y el halo de la atmósfera");
const rim = [];
for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) rim.push(await t.screen(dx * orbit.radius, -orbit.radius, dz * orbit.radius));
const [poleX, poleY] = await t.screen(PAD.x, 0, PAD.z);
const [centreX, centreY] = await t.screen(0, -orbit.radius, 0);
const inside = (x, y) => x > 0 && x < 1440 && y > 0 && y < 900;
const wide = Math.hypot(rim[0][0] - rim[1][0], rim[0][1] - rim[1][1]);
check(rim.every(([x, y]) => inside(x, y)) && wide > 380, `el planeta cabe entero en la pantalla y la llena (${wide.toFixed(0)} px de lado a lado)`);
check(inside(poleX, poleY) && Math.hypot(poleX - 720, poleY - 450) < wide * 0.4, `la plataforma es su polo, hacia el centro de la vista (en ${poleX.toFixed(0)}, ${poleY.toFixed(0)})`);
// La isla llega cerca del borde del disco por todos los lados: lo que queda fuera es un anillo de mar.
const reach = [];
for (const [x, y, z] of orbit.coast) {
 const [sx, sy] = await t.screen(x, y, z);
 reach.push(Math.hypot(sx - centreX, sy - centreY) / (wide / 2));
}
// (El radio del disco se mide en el plano del centro; lo que queda del lado de la cámara se proyecta algo más afuera.)
check(Math.min(...reach) > 0.55 && Math.max(...reach) < 1.08,`la isla cubre casi todo el hemisferio visible: su costa queda entre el ${(Math.min(...reach) * 100).toFixed(0)} % y el ${(Math.max(...reach) * 100).toFixed(0)} % del radio del disco`);
// Y se dibuja de verdad ahí: en el centro del disco hay tierra o mar, no cielo.
const lit = await t.evaluate(async (points) => {
 const shot = await new Promise((resolve) => requestAnimationFrame(() => resolve(document.querySelector("canvas").toDataURL("image/png"))));
 const image = new Image();
 image.src = shot;
 await image.decode();
 const canvas = Object.assign(document.createElement("canvas"), { width: image.width, height: image.height });
 const ctx = canvas.getContext("2d");
 ctx.drawImage(image, 0, 0);
 return points.map(([x, y]) => { const [r, g, b] = ctx.getImageData(Math.round((x / innerWidth) * image.width), Math.round((y / innerHeight) * image.height), 1, 1).data; return r + g + b; });
}, [[centreX - wide * 0.2, centreY], [centreX, centreY + wide * 0.44], [centreX - wide * 0.44, centreY], [40, 450]]);
check(lit[0] > 120 && lit[1] > 60 && lit[2] > 60 && lit[3] < 60, `dentro del disco hay planeta hasta el borde y fuera, cielo (brillo ${lit.join(" · ")})`);
check(await onScreen(), "la nave se ve delante del planeta");
const sky = await t.evaluate(() => {
 const w = window.__world, out = {};
 const camera = w.camera, v = new camera.position.constructor();
 w.space.sky.traverse((o) => {
  if (!o.isMesh) return;
  o.getWorldPosition(v).project(camera);
  (out[o.name || "astro"] ??= []).push({ x: +((v.x * 0.5 + 0.5) * innerWidth).toFixed(0), y: +((0.5 - v.y * 0.5) * innerHeight).toFixed(0), front: v.z < 1, opacity: o.material.opacity });
 });
 return out;
});
const bodies = Object.values(sky).flat();
check(sky["luna de la órbita"]?.length === 1 && bodies.length === 5 && bodies.every((b) => b.front && inside(b.x, b.y) && b.opacity > 0.95), `la luna y los otros dos mundos, con su rótulo, están en la pantalla (${bodies.map((b) => `${b.x},${b.y}`).join(" · ")})`);
check(orbit.names.length === 2 && orbit.names.every((name) => /\S/.test(name)), `los dos mundos cerrados llevan nombre provisional y «Próximamente» (${orbit.names.join(", ")})`);
// Gira despacio: la cámara rodea el planeta.
const yaw0 = await t.evaluate(() => window.__world.rig.yaw);
await wait(2000);
const yaw1 = await t.evaluate(() => window.__world.rig.yaw);
check(yaw1 - yaw0 > 0.03 && yaw1 - yaw0 < 0.2 && (await onScreen()), `el planeta gira despacio y la nave sigue delante (${((yaw1 - yaw0) / 2).toFixed(3)} rad/s)`);
await t.shot("despegue-12b-orbita");
// Aterrizar deja todo como estaba.
await t.page.keyboard.press("KeyE");
// El camino inverso: baja, la cámara vuelve a acercarse y el planeta vuelve a ser la isla.
const down = [];
for (let i = 0; i < 6; i++) {
 await wait(900);
 down.push(await probe());
 await t.shot(`aterrizaje-${i + 1}`);
}
check(down.every((one, i) => i === 0 || (one.y <= down[i - 1].y + 0.5 && one.distance <= down[i - 1].distance + 0.01)), `al aterrizar baja y la cámara se acerca, sin saltos (alturas: ${down.map((one) => one.y.toFixed(0)).join(" → ")} m)`);
await wait(900);
now = await probe();
const after = await t.evaluate(() => {
 let culled = 0;
 window.__world.scene.traverse((o) => { if (o.isMesh && o.frustumCulled) culled += 1; });
 const shadows = [];
 window.__world.scene.traverse((o) => o.isLight && o.castShadow && shadows.push(o.shadow.autoUpdate));
 return { planet: window.__world.space.group.visible, yaw: window.__world.rig.yaw, fog: window.__world.scene.fog.density, shadows, culled, bend: window.__world.rig.bend };
});
check(now.phase === "idle" && now.y < 0.05 && Math.abs(now.x - PAD.x) < 0.05 && Math.abs(now.z - PAD.z) < 0.05 && Math.abs(now.distance - 1) < 0.01, "al aterrizar, la nave vuelve a su sitio y la cámara al astronauta");
check(!after.planet && after.yaw === 0 && after.fog > 0.001 && now.space === 0 && after.bend === 0 && after.culled > 100, `y en tierra no queda nada del espacio: el suelo vuelve a ser plano, sin giro, con su niebla y su descarte por encuadre (${after.culled} mallas)`);
check(after.shadows.length > 0 && after.shadows.every(Boolean), "y las sombras vuelven a rehacerse en cada fotograma (en vuelo, de lejos, van espaciadas)");
await wait(2500);
await t.shot("despegue-13-de-vuelta");
await t.done();
