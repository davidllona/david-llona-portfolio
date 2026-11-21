// Captura las maquetas HTML aprobadas (docs/referencias/cartas/) tal cual, para tenerlas al lado de las cartas reales.
//   node tests/e2e/maquetas.mjs <carpeta>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { CHROME } from "../chrome.mjs";

const folder = (process.argv[2] ?? "capturas/32-cartas/referencias") + "/";
fs.mkdirSync(folder, { recursive: true });
const SHOTS = [
 ["mundo1-cartel", { width: 1440, height: 900 }],
 ["mundo1-cartel-movil", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
 ["mundo2-cartel-colgante", { width: 1440, height: 900 }],
 ["mundo2-cartel-colgante", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, "-movil"],
 ["mundo3-maquina", { width: 1440, height: 900 }],
 ["mundo3-maquina", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, "-movil"],
];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
for (const [name, viewport, suffix = ""] of SHOTS) {
 const page = await browser.newPage();
 await page.setViewport(viewport);
 await page.goto(pathToFileURL(path.resolve(`docs/referencias/cartas/${name}.html`)).href, { waitUntil: "networkidle0", timeout: 60000 }).catch((error) => console.log(name, error.message));
 await page.evaluate(() => document.fonts.ready);
 await new Promise((resolve) => setTimeout(resolve, 1200));
 await page.screenshot({ path: `${folder}${name}${suffix}.jpg`, type: "jpeg", quality: 90 });
 await page.close();
}
await browser.close();
console.log("hecho");
