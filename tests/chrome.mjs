// Dónde está Chrome y con qué opciones gráficas se lanza, según el sistema.
// Lo usan todas las pruebas (e2e y perf). `CHROME` en el entorno manda.
import fs from "node:fs";
import path from "node:path";

const env = process.env;
const candidates = {
 darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
 win32: [
  [env.PROGRAMFILES, "Google/Chrome/Application/chrome.exe"],
  [env["PROGRAMFILES(X86)"], "Google/Chrome/Application/chrome.exe"],
  [env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"],
  [env["PROGRAMFILES(X86)"], "Microsoft/Edge/Application/msedge.exe"],
  [env.PROGRAMFILES, "Microsoft/Edge/Application/msedge.exe"],
 ]
  .filter(([root]) => root)
  .map(([root, rest]) => path.join(root, rest)),
 linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
};

function find() {
 if (env.CHROME) return env.CHROME;
 const list = candidates[process.platform] ?? [];
 const found = list.find((file) => fs.existsSync(file));
 if (!found) throw new Error(`No encuentro Chrome. Indica su ruta en la variable CHROME. Probado: ${list.join(", ")}`);
 return found;
}

export const CHROME = find();

// WebGPU en Chrome sin ventana. En Mac va sobre Metal; en Windows, sobre
// Direct3D (el ANGLE por defecto); en Linux, sobre Vulkan.
export const GPU_ARGS = [
 "--enable-gpu",
 "--ignore-gpu-blocklist",
 "--enable-unsafe-webgpu",
 ...(process.platform === "darwin" ? ["--use-angle=metal", "--enable-features=WebGPU"] : process.platform === "linux" ? ["--enable-features=WebGPU,Vulkan"] : ["--enable-features=WebGPU"]),
];
