// La hora del mundo sigue la hora del visitante: de día por la mañana y a
// mediodía, atardecer por la tarde, de noche por la noche y un amanecer suave.
// Las franjas se corren con el mes, el cambio dentro de una franja es gradual,
// el botón (y la tecla N) eligen a mano y mandan sobre la hora, y `?hora=18:45`
// la fija para probar. Con «capturas» como argumento saca la misma vista a
// varias horas (en E2E_SHOTS).
//   node tests/e2e/hora.mjs [capturas]
import { open, check, wait, out } from "./common.mjs";

const shots = process.argv.includes("capturas");
const VIEW = [0, 7.5]; // junto a la nave
const state = (t) =>
 t.evaluate(() => {
  const w = window.__world, c = w.sky.current;
  const hex = (color) => `#${color.getHexString()}`;
  return { name: document.documentElement.dataset.momento, band: w.theme.band, at: w.theme.at, mix: w.theme.mix, dusk: w.theme.dusk, dawn: w.theme.dawn, manual: w.theme.manual, glow: c.glow, sunPower: c.sunPower, sky: hex(c.skyHorizon), sun: hex(c.sun), button: document.querySelector(".theme-toggle").dataset.moment, pressed: document.querySelector(".theme-toggle").getAttribute("aria-pressed") };
 });
const warm = (hex) => parseInt(hex.slice(1, 3), 16) - parseInt(hex.slice(5, 7), 16); // rojo − azul

// ── Cada hora, su momento (en el equinoccio de marzo, mes 3,7: las franjas tal cual) ──
const HOURS = [
 ["07:30", "dusk", "dawn", "amanecer"],
 ["12:00", "day", "day", "mediodía"],
 ["18:45", "dusk", "dusk", "atardecer"],
 ["23:00", "night", "night", "noche"],
];
const seen = {};
for (const [hour, name, band, label] of HOURS) {
 const t = await open({ query: `?hora=${hour}&mes=3.7` });
 await t.enter();
 await t.put(...VIEW, { settle: 1600 });
 const s = (seen[label] = await state(t));
 check(s.name === name && s.band === band && s.manual === null && s.button === name, `a las ${hour}, ${label}: se muestra «${s.name}» (franja ${s.band}, punto ${s.at.toFixed(2)} de la fila día 0 · atardecer 1 · noche 2)`);
 if (shots) {
  await wait(5200); // que se retire el logro de «Primeros pasos»
  await t.shot(`hora-${hour.replace(":", "")}-${label}`);
  await t.evaluate(() => Object.assign(window.__world.rig, { lift: 0.24, distance: 0.62 }));
  await wait(1500);
  await t.shot(`hora-${hour.replace(":", "")}-${label}-bajo`);
 }
 if (label === "atardecer") {
  // El atardecer es un estado propio, no una mezcla de día y noche.
  check(s.at > 0.98 && s.at < 1.02 && warm(s.sky) > 90 && warm(s.sun) > 90, `el atardecer tiene su paleta: cielo anaranjado (${s.sky}) y luz dorada (${s.sun})`);
  check(s.glow > 0.2 && s.glow < 0.7, `farolas y ventanas empiezan a encenderse (brillo ${s.glow.toFixed(2)}; de día 0, de noche 1)`);
  const sun = await t.evaluate(() => { let light = null; window.__world.scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) light = o; }); return light.position.clone().sub(light.target.position).normalize().toArray(); });
  check(sun[1] > 0.2 && sun[1] < 0.5 && sun[0] < -0.5, `el sol está bajo y al oeste: sombras largas (altura ${((Math.asin(sun[1]) * 180) / Math.PI).toFixed(0)}°)`);

  // ── A mano: el botón recorre día → atardecer → noche y manda sobre la hora ──
  const order = [];
  for (let i = 0; i < 3; i++) {
   await t.page.click(".theme-toggle");
   await wait(2600);
   const now = await state(t);
   order.push(`${now.name}${now.manual === now.name ? "" : "(sin fijar)"}`);
  }
  check(order.join(" → ") === "night → day → dusk", `el botón pasa de atardecer a noche, a día y otra vez a atardecer (${order.join(" → ")})`);
  await t.page.keyboard.press("KeyN");
  await wait(2600);
  const manual = await state(t);
  check(manual.name === "night" && manual.pressed === "true" && manual.mix > 0.98, `y la tecla N hace lo mismo: ahora es de noche aunque el reloj diga las ${hour} (noche ${manual.mix.toFixed(2)})`);
  await wait(3000);
  check((await state(t)).name === "night", "la elección a mano se mantiene: la hora no la deshace");
 }
 if (label === "noche") check(s.mix > 0.98 && s.glow > 0.95 && s.pressed === "true", `de noche, como siempre: luces encendidas (brillo ${s.glow.toFixed(2)})`);
 if (label === "mediodía") check(s.at < 0.02 && s.glow < 0.02 && s.pressed === "false", `de día, luces apagadas (brillo ${s.glow.toFixed(2)})`);
 if (label === "amanecer") check(s.dawn > 0.9 && s.at > 0.5 && s.at < 1.5 && warm(s.sky) > 40, `el amanecer es un atardecer suave, con el sol al otro lado (amanecer ${s.dawn.toFixed(2)}, cielo ${s.sky})`);

 if (label === "mediodía") {
  // ── Franjas: continuas (sin saltos) y corridas según el mes ──
  const table = await t.evaluate(() => {
   const { skyAt, bands } = window.__world.sky;
   let jump = 0, last = skyAt(0, 3.7).at;
   for (let m = 1; m <= 24 * 60; m++) {
    const at = skyAt((m % (24 * 60)) / 60, 3.7).at;
    jump = Math.max(jump, Math.abs(at - last));
    last = at;
   }
   const name = (h, month) => skyAt(h, month).name;
   return { jump, march: bands(3.7), june: bands(6.7), december: bands(12.7), names: [name(7.5, 3.7), name(9, 3.7), name(17, 3.7), name(18, 3.7), name(20.4, 3.7), name(21, 3.7), name(3, 3.7)] };
  });
  const hm = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
  check(table.names.join(",") === "dawn,day,day,dusk,dusk,night,night", `franjas del equinoccio: amanecer ${hm(table.march.dawn)}, día ${hm(table.march.day)}, atardecer ${hm(table.march.dusk)}, noche ${hm(table.march.night)}`);
  check(table.jump < 0.05, `dentro de las franjas el cambio es gradual: de un minuto al siguiente el cielo se mueve, como mucho, ${table.jump.toFixed(3)} (de 2)`);
  check(table.june.night - table.december.night > 1.5 && table.december.dawn - table.june.dawn > 1, `en verano anochece más tarde (${hm(table.june.night)} en junio, ${hm(table.december.night)} en diciembre) y amanece antes (${hm(table.june.dawn)} y ${hm(table.december.dawn)})`);
 }
 await t.done();
}
// El atardecer se distingue del día y de la noche.
check(seen.atardecer.sky !== seen["mediodía"].sky && seen.atardecer.sky !== seen.noche.sky, `tres cielos distintos: día ${seen["mediodía"].sky}, atardecer ${seen.atardecer.sky}, noche ${seen.noche.sky}`);
if (shots) console.log(`     capturas en ${out}hora-*.jpg`);
