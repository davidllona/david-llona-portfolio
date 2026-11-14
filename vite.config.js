import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Carpetas de trabajo que viven junto al proyecto pero no son parte de él
// (referencias, originales, capturas). Vite no las mira ni las vigila.
const OUTSIDE = ["folio-2025-main", "Porfolio_3D_David_Llona", "assets-externos", "capturas", "dist"];

export default defineConfig({
 plugins: [react()],
 // El escaneo de dependencias parte solo de la página del proyecto. Sin esto
 // recorría todos los .html de la carpeta, incluido el de folio-2025-main, y
 // fallaba al no encontrar sus dependencias (gsap, rapier, howler…).
 optimizeDeps: { entries: ["index.html"] },
 server: { watch: { ignored: OUTSIDE.map((folder) => `**/${folder}/**`) } },
});
