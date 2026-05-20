import { useEffect, useRef, useState } from "react";
import { initProjectsScene } from "../3d/projectsScene";
import { initProjectsStarsScene } from "../3d/labStarsScene";
import { attachProjectsGUI, onGuiReady } from "../3d/hero/gui";
import { ProjectsMobile } from "./ProjectsMobile";

export function Projects() {
 // ── Detección de móvil al montar ───────────────────────────────────
 // En móvil se renderiza ProjectsMobile (sin WebGL). Razones:
 //   · La CRT del Three.js no se ve bien apretada en pantallas <768px
 //   · 650vh de wrapper en móvil = ~4600px de scroll, demasiado largo
 //   · Dos canvas WebGL extra (stars + CRT) saturaban VRAM en GPUs
 //     móviles modestas (Mali-G68) y se producía context loss al
 //     volver scroll-arriba después de salir de la sección
 //
 // Capturamos el estado UNA VEZ al montar (no escuchamos resize) para
 // no re-renderizar la sección entera si el usuario rota el móvil.
 // Cubre el 99% de los casos sin complejidad innecesaria.
 const [isMobile] = useState(
  () => typeof window !== "undefined" && window.innerWidth < 768,
 );

 const canvasRef = useRef(null);

 useEffect(() => {
  // En móvil no inicializamos WebGL — ProjectsMobile es estático.
  if (isMobile) return;

  const canvas = canvasRef.current;
  if (!canvas) return;

  const cleanupScene = initProjectsScene(canvas);
  const cleanupStars = initProjectsStarsScene();

  // Suscripción al broker del GUI (vive dentro de ./3d/hero/gui).
  // Si heroScene ya creó el GUI, el callback se ejecuta de inmediato.
  // Si aún no, queda en cola y se dispara en cuanto setGui() lo
  // registre. Sin polling, sin window.__*.
  const offGuiReady = onGuiReady((gui) => {
   if (cleanupScene) attachProjectsGUI(gui, cleanupScene);
  });

  return () => {
   offGuiReady();
   if (cleanupScene) cleanupScene();
   if (cleanupStars) cleanupStars();
  };
 }, [isMobile]);

 // ── Rama móvil — sin WebGL, cards estáticas ────────────────────────
 if (isMobile) {
  return <ProjectsMobile />;
 }

 // ── Rama desktop — versión cinemática con CRT ──────────────────────
 return (
  /* Wrapper — da altura de scroll a la sección */
  <div
   data-projects-section
   style={{
    position: "relative",
    width: "100%",
    // 650vh — debe coincidir con `sH = sizes.height * 6.5` en
    // projectsScene.js. Antes era 550vh y dejaba al 4º proyecto
    // sin tiempo para revelarse antes de que la sticky terminara.
    height: "650vh",
    background: "#03030a", // base oscura, armoniza con el Lab
   }}
  >
   {/* Sticky — todo lo visual queda anclado dentro */}
   <div
    style={{
     position: "sticky",
     top: 0,
     width: "100%",
     height: "100vh",
     overflow: "hidden",
    }}
   >
    {/* 1 — Fondo: estrellas (mismo "universo" que el Lab) */}
    <canvas
     id="projects-stars-canvas"
     style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      display: "block",
      zIndex: 0,
     }}
    />

    {/* 2 — Viñeta sutil: refuerza el centro y aísla la CRT del void */}
    <div
     style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background:
       "radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 60%, rgba(3,3,10,0.7) 100%)",
      zIndex: 1,
     }}
    />

    {/* 3 — Escena CRT (delante, transparente) */}
    <canvas
     ref={canvasRef}
     style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      display: "block",
      zIndex: 2,
     }}
    />
   </div>
  </div>
 );
}