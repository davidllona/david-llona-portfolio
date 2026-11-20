// Abre la página y vuelca lo que salga por consola y las excepciones (para cuando la carga no termina).
//   node tests/e2e/debug-load.mjs "?world=twisted" [segundos]
import puppeteer from "puppeteer-core";
import { CHROME, GPU_ARGS } from "../chrome.mjs";
import { BASE, wait } from "./common.mjs";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: GPU_ARGS });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on("console", (message) => ["error", "warning"].includes(message.type()) && console.log(`[${message.type()}] ${message.text().slice(0, 600)}`));
page.on("pageerror", (error) => console.log(`[excepción] ${error.message}\n${(error.stack ?? "").split("\n").slice(0, 8).join("\n")}`));
await page.goto(BASE + (process.argv[2] ?? "") + ((process.argv[2] ?? "").includes("?") ? "&" : "?") + "hora=12:00", { waitUntil: "load", timeout: 60000 });
await wait(Number(process.argv[3] ?? 25) * 1000);
console.log("pantalla de carga:", await page.evaluate(() => (document.querySelector("#loader") ? "puesta" : "retirada")), "· entrar:", await page.evaluate(() => { const b = document.querySelector(".overlay__enter"); return b ? (b.disabled ? "apagado" : "listo") : "no hay"; }));
await browser.close();
