import { useEffect, useRef } from "react";
import { initProjectsScene } from "../3d/projectsScene";
import { initProjectsStarsScene } from "../3d/labStarsScene";

export function Projects() {
 const canvasRef = useRef(null);

 useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const cleanupScene = initProjectsScene(canvas);
  const cleanupStars = initProjectsStarsScene();

  return () => {
   if (cleanupScene) cleanupScene();
   if (cleanupStars) cleanupStars();
  };
 }, []);

 return (
  /* Wrapper — da altura de scroll a la sección */
  <div
   data-projects-section
   style={{
    position: "relative",
    width: "100%",
    height: "550vh",
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