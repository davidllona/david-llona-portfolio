export function hasWebGL() {
 // En desarrollo, ?webgl=0 simula un navegador sin WebGL.
 if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("webgl") === "0") return false;
 try {
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
 } catch {
  return false;
 }
}
