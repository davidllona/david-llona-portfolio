// Monta varias capturas en una sola hoja numerada, para revisar una secuencia de un vistazo:
//   node tests/e2e/sheet.mjs salida.jpg columnas ancho img1 img2 …
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { CHROME } from "../chrome.mjs";
const [, , outFile, columns, width, ...images] = process.argv;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
const html = `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${columns},${width}px);gap:4px;width:max-content;align-content:start">${images.map((file, i) => `<div style="position:relative"><img style="width:${width}px;display:block" src="data:image/jpeg;base64,${fs.readFileSync(file).toString("base64")}"><b style="position:absolute;left:6px;top:4px;color:#fff;font:bold 15px sans-serif;text-shadow:0 0 4px #000">${i + 1}</b></div>`).join("")}</body>`;
await page.setContent(html);
const box = await page.evaluate(() => { const r = document.body.getBoundingClientRect(); return [Math.ceil(r.width), Math.ceil(r.height)]; });
await page.setViewport({ width: box[0], height: box[1] });
await page.screenshot({ path: outFile, type: "jpeg", quality: 88 });
await browser.close();
