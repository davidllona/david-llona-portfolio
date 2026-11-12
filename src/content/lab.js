// Experimentos del laboratorio. Los vídeos se sirven desde GitHub Releases.
const ASSETS_BASE =
 "https://github.com/davidllona/david-llona-portfolio/releases/download/assets-v1";

export const LAB_PROJECTS = [
 {
  id: "A1",
  title: "Agua con shaders",
  description:
   "Exploración de una superficie procedural animada con shaders, color dinámico y detalle en las olas. Una pieza centrada en movimiento, profundidad y atmósfera para convertir una simple malla en una experiencia visual viva.",
  type: "Shaders / Superficie en tiempo real",
  url: "https://threejs-water-shader.vercel.app",
 },
 {
  id: "A2",
  title: "Movimiento galáctico",
  description:
   "Sistema de partículas y profundidad espacial para construir atmósferas más inmersivas, con más escala y mayor profundidad visual.",
  type: "Partículas / Sensación shader",
  url: "https://galaxy-three-js-puce.vercel.app/",
  videoMp4: `${ASSETS_BASE}/proyecto-galaxia.mp4`,
 },
 {
  id: "A3",
  title: "Objeto interactivo",
  description:
   "Pieza experimental centrada en rotación, inspección y lectura del volumen en tiempo real dentro de una interfaz más tangible.",
  type: "Interacción en tiempo real",
  url: "https://threejs-hdr-lighting-lab.vercel.app/",
  videoMp4: `${ASSETS_BASE}/proyecto-objeto-interactivo.mp4`,
 },
];
