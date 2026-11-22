// Gráfica de la mirada de Woody, antes y después (objetivo 27, B5): el giro de
// la cabeza respecto al cuerpo durante 10 s, de las grabaciones de mirada.mjs.
//   node tests/e2e/grafica-mirada.mjs salida.jpg antes.json despues.json [título]
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { CHROME } from "../chrome.mjs";
const [, , outFile, before, after, title = "Fútbol"] = process.argv;
const series = [["Antes", before, "#e8662a"], ["Después", after, "#2f9c8f"]].map(([name, file, color]) => ({ name, color, log: JSON.parse(fs.readFileSync(file, "utf8")) }));
const W = 1100, H = 300, pad = 46;
const x = (ms) => pad + (ms / 10000) * (W - pad * 2), y = (rad) => H / 2 - (rad * 180) / Math.PI * ((H / 2 - 24) / 70);
const lines = series.map((s, i) => `<g transform="translate(0 ${i * (H + 30)})"><text x="${pad}" y="20" font-size="16" font-weight="700" fill="${s.color}">${s.name}</text><line x1="${pad}" x2="${W - pad}" y1="${H / 2}" y2="${H / 2}" stroke="#bbb"/>${[-60, -30, 30, 60].map((d) => `<line x1="${pad}" x2="${W - pad}" y1="${y((d * Math.PI) / 180)}" y2="${y((d * Math.PI) / 180)}" stroke="#eee"/><text x="8" y="${y((d * Math.PI) / 180) + 4}" font-size="11" fill="#888">${d}°</text>`).join("")}<polyline fill="none" stroke="${s.color}" stroke-width="2" points="${s.log.map(([ms, rad]) => `${x(ms).toFixed(1)},${y(rad).toFixed(1)}`).join(" ")}"/></g>`).join("");
const html = `<body style="margin:0;background:#fff;font-family:sans-serif"><div style="padding:10px 14px;font:700 18px sans-serif">${title}: giro de la cabeza de Woody respecto al cuerpo, 10 s de juego</div><svg width="${W}" height="${2 * H + 30}">${lines}</svg></body>`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: W, height: 2 * H + 80 });
await page.setContent(html);
await page.screenshot({ path: outFile, type: "jpeg", quality: 90 });
await browser.close();
