import fs from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Carpetas de trabajo que viven junto al proyecto pero no son parte de él
// (referencias, originales, capturas). Vite no las mira ni las vigila.
const OUTSIDE = ["folio-2025-main", "Porfolio_3D_David_Llona", "assets-externos", "capturas", "dist"];

export default defineConfig({
 plugins: [react()],
 // La foto de Woody (public/img/woody.jpg) la pone David cuando quiera: si no está, el marco de la
 // casita de The Twisted Moon enseña una silueta (y no se pide un archivo que no existe).
 define: { __WOODY_PHOTO__: JSON.stringify(fs.existsSync(new URL("./public/img/woody.jpg", import.meta.url))) },
 // El escaneo de dependencias parte solo de la página del proyecto. Sin esto
 // recorría todos los .html de la carpeta, incluido el de folio-2025-main, y
 // fallaba al no encontrar sus dependencias (gsap, rapier, howler…).
 // (Firebase se importa bajo demanda: se prepara de antemano para que el servidor de desarrollo no recargue la página la primera vez.)
 optimizeDeps: { entries: ["index.html"], include: ["firebase/app", "firebase/firestore/lite"] },
 server: { watch: { ignored: OUTSIDE.map((folder) => `**/${folder}/**`) } },
});
