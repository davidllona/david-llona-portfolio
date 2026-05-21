import { useEffect, useRef, useState } from "react";
import { initProjectsScene } from "../3d/projectsScene";
import { initProjectsStarsScene } from "../3d/labStarsScene";
import { attachProjectsGUI, onGuiReady } from "../3d/hero/gui";
import { ProjectsMobile } from "./ProjectsMobile";

export function Projects() {











 const [isMobile] = useState(
  () => typeof window !== "undefined" && window.innerWidth < 768,
 );

 const canvasRef = useRef(null);

 useEffect(() => {

  if (isMobile) return;

  const canvas = canvasRef.current;
  if (!canvas) return;

  const cleanupScene = initProjectsScene(canvas);
  const cleanupStars = initProjectsStarsScene();





  const offGuiReady = onGuiReady((gui) => {
   if (cleanupScene) attachProjectsGUI(gui, cleanupScene);
  });

  return () => {
   offGuiReady();
   if (cleanupScene) cleanupScene();
   if (cleanupStars) cleanupStars();
  };
 }, [isMobile]);


 if (isMobile) {
  return <ProjectsMobile />;
 }


 return (
  
  <div
   data-projects-section
   style={{
    position: "relative",
    width: "100%",



    height: "650vh",
    background: "#03030a", // base oscura, armoniza con el Lab
   }}
  >
   {}
   <div
    style={{
     position: "sticky",
     top: 0,
     width: "100%",
     height: "100vh",
     overflow: "hidden",
    }}
   >
    {}
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

    {}
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

    {}
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