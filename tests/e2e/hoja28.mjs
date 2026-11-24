// Objetivo 28 · hoja final: los cinco puntos, antes y después con el mismo
// encuadre, y la postal junto a las referencias. Monta las capturas que saca
// tests/e2e/pulido2.mjs (carpetas `antes/` y `despues/`). No comprueba nada.
//   node tests/e2e/hoja28.mjs [carpeta]      (por defecto, capturas/35-pulido-mundo2)
import fs from "node:fs";
import puppeteer from "puppeteer-core";
import { CHROME } from "../chrome.mjs";

const root = (process.argv[2] ?? "capturas/35-pulido-mundo2") + "/";
const POINTS = [
 ["1 · La luna", ["1-luna-cerca", "1-luna-mirador-torre", "1-luna-mirador-plataforma", "nave-bajada-3"]],
 ["2 · La torre del reloj", ["2-torre-juego", "2-torre-sur", "2-torre-tejado", "2-torre-engranajes"]],
 ["3 · Los puentes", ["3-colgante-oeste-juego", "3-colgante-oeste-lado", "3-colgante-este-juego", "3-pasarela-rio-juego"]],
 ["4 · Las cascadas", ["4-cascada-a-arriba", "4-cascada-b-lado", "4-cascada-b-abajo", "4-cascada-c-lado"]],
 ["5 · El invernadero y la parada «Aventurero»", ["5-invernadero-parada", "5-invernadero-acercandose", "5-invernadero-cerca", "5-invernadero-frente"]],
];
// Lo que solo existe después: el reloj en marcha, el manantial y el rincón del explorador.
const EXTRAS = [
 ["Capturas extra (solo después)", ["2-torre-en-marcha-a", "4-cascada-a-manantial", "5-rincon", "5-mesa", "5-maleta", "5-farolillo-encendido", "5-mesa-encendida", "5-invernadero-este"]],
];
const data = (file) => (fs.existsSync(file) ? `data:image/${file.endsWith(".png") ? "png" : "jpeg"};base64,${fs.readFileSync(file).toString("base64")}` : null);
const figure = (file, label, width) => {
 const src = data(file);
 return `<figure style="margin:0;width:${width}px"><div style="font:600 13px system-ui;color:#c9c4e0;padding:4px 2px">${label}</div>${src ? `<img src="${src}" style="width:100%;display:block;border-radius:4px">` : `<div style="height:120px;display:grid;place-items:center;color:#f66;font:14px system-ui;border:1px dashed #f66">falta ${file}</div>`}</figure>`;
};
const W = 620;
let html = `<body style="margin:0;background:#12111c;padding:24px;width:max-content;font-family:system-ui"><h1 style="color:#fff;font:700 26px system-ui;margin:0 0 6px">Objetivo 28 · pulido de The Twisted Moon</h1><p style="color:#9d98b8;font:14px system-ui;margin:0 0 18px">Cada pareja, con el mismo encuadre: arriba antes, abajo después.</p>`;
for (const [title, names] of POINTS) {
 html += `<h2 style="color:#ffb469;font:700 19px system-ui;margin:22px 0 6px">${title}</h2><div style="display:grid;grid-template-columns:repeat(${names.length},${W}px);gap:8px">`;
 html += names.map((name) => figure(`${root}antes/${name}.jpg`, `ANTES · ${name}`, W)).join("");
 html += names.map((name) => figure(`${root}despues/${name}.jpg`, `DESPUÉS · ${name}`, W)).join("");
 html += `</div>`;
}
for (const [title, names] of EXTRAS) {
 html += `<h2 style="color:#ffb469;font:700 19px system-ui;margin:22px 0 6px">${title}</h2><div style="display:grid;grid-template-columns:repeat(4,${W}px);gap:8px">${names.map((name) => figure(`${root}despues/${name}.jpg`, name, W)).join("")}</div>`;
}
html += `<h2 style="color:#ffb469;font:700 19px system-ui;margin:22px 0 6px">La postal, junto a las referencias</h2><div style="display:grid;grid-template-columns:repeat(5,${(W * 4 + 24 - 32) / 5}px);gap:8px">`;
html += [["antes/postal.jpg", "ANTES"], ["despues/postal.jpg", "DESPUÉS"]].map(([file, label]) => figure(root + file, `${label} · postal`, (W * 4 + 24 - 32) / 5)).join("");
html += [1, 2, 3].map((n) => figure(`docs/referencias/mundo2/ref-${n}.png`, `referencia ${n}`, (W * 4 + 24 - 32) / 5)).join("");
html += `</div></body>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
await page.setContent(html);
const box = await page.evaluate(() => [Math.ceil(document.body.scrollWidth), Math.ceil(document.body.scrollHeight)]);
await page.setViewport({ width: box[0], height: box[1] });
await page.screenshot({ path: `${root}hoja-final.jpg`, type: "jpeg", quality: 86 });
// (Y una por punto, más manejable.)
await browser.close();
console.log(`hoja: ${root}hoja-final.jpg (${box[0]} × ${box[1]})`);
