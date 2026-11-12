export function hasWebGL() {
 // En desarrollo, ?webgl=0 simula un navegador sin WebGL.
 if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("webgl") === "0") return false;
 try {
  const canvas = document.createElement("canvas");
  // El renderer es WebGPU y, si no lo hay, cae a WebGL2. Con WebGL 1 no funciona.
  return Boolean(navigator.gpu || canvas.getContext("webgl2"));
 } catch {
  return false;
 }
}
