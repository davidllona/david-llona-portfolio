// Hoja de poses de clips del astronauta, de cerca, para elegir y revisar animaciones.
//   node tests/e2e/clips.mjs salida.jpg Clip1,Clip2 [puntos=0,0.33,0.66,1] [giro=0.9]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { open, wait } from "./common.mjs";

const [, , outFile = "clips.jpg", names = "Astro_Basket_Throw", points = "0,0.33,0.66,1", facing = "2.4"] = process.argv;
const clips = names.split(",");
const at = points.split(",").map(Number);
const folder = fs.mkdtempSync(path.join(os.tmpdir(), "clips-"));
const t = await open({ viewport: { width: 520, height: 620 } });
await t.enter();
await t.put(3, 24, { withWoody: false, settle: 600 });
await t.evaluate((facing) => {
 const w = window.__world;
 w.player.facing = facing;
 Object.assign(w.rig, { zoom: 0.26 });
}, Number(facing));
await wait(1500);
const files = [];
for (const name of clips) {
 for (const point of at) {
  await t.evaluate((name, point) => (window.__world.clipFreeze = { name, at: point }), name, point);
  await wait(350);
  const file = path.join(folder, `${name}-${point}.jpg`);
  await t.page.screenshot({ path: file, type: "jpeg", quality: 85 });
  files.push(file);
 }
}
await t.browser.close();
execFileSync(process.execPath, ["tests/e2e/sheet.mjs", outFile, String(at.length), "300", ...files]);
console.log("hecho", outFile);
