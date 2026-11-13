// Peso descargado en una primera visita (build de producción servida con
// `npx vite preview --port 5198`), separado en dos momentos: hasta que se puede
// entrar y lo que llega después de entrar (el audio se pide entonces).
//   node tests/perf/peso.mjs [url]
import puppeteer from "puppeteer-core";
import { CHROME, GPU_ARGS } from "../chrome.mjs";

const url = process.argv[2] ?? "http://localhost:5198/";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: [...GPU_ARGS, "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.setCacheEnabled(false);
const client = await page.createCDPSession();
await client.send("Network.enable");
const requests = new Map();
let phase = "carga";
const totals = { carga: {}, "tras entrar": {} };
client.on("Network.responseReceived", ({ requestId, response }) => requests.set(requestId, response.url));
client.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
 const name = (requests.get(requestId) ?? "").split("?")[0];
 if (name.startsWith("data:") || name.startsWith("blob:")) return;
 const kind = /\.(glb|gltf)$/.test(name) ? "modelos" : /\.(m4a|mp3|ogg|opus|wav|webm)$/.test(name) ? "audio" : /\.(js|mjs)$/.test(name) ? "código" : /\.(png|jpe?g|webp|svg|avif)$/.test(name) ? "imágenes" : /\.(woff2?|ttf)$/.test(name) ? "fuentes" : "otros";
 const bucket = totals[phase];
 bucket[kind] = (bucket[kind] ?? 0) + encodedDataLength;
 if (process.env.PESO_LISTA) console.log(`${phase}\t${(encodedDataLength / 1024).toFixed(1)} kB\t${name}`);
});
const t0 = Date.now();
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForFunction(() => { const enter = document.querySelector(".overlay__enter"); return enter && !enter.disabled; }, { timeout: 180000, polling: 50 });
const ready = Date.now() - t0;
await new Promise((resolve) => setTimeout(resolve, 1500));
phase = "tras entrar";
await page.click(".overlay__enter");
await new Promise((resolve) => setTimeout(resolve, 12000));
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} kB`;
for (const [name, bucket] of Object.entries(totals)) {
 const sum = Object.values(bucket).reduce((a, b) => a + b, 0);
 console.log(`${name}: ${kb(sum)} — ${Object.entries(bucket).map(([kind, bytes]) => `${kind} ${kb(bytes)}`).join(" · ") || "nada"}`);
}
console.log(`listo para entrar a los ${ready} ms`);
await browser.close();
