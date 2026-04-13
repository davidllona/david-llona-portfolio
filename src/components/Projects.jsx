import { useEffect, useRef } from "react";
import { initProjectsScene } from "../3d/projectsScene";


export function Projects() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cleanup = initProjectsScene(canvas);
    return cleanup;
  }, []);

  return (
    /* Wrapper — da altura de scroll a la sección */
    <div
      data-projects-section
      style={{
        position: "relative",
        width   : "100%",
        height  : "550vh",
      }}
    >
      {/* Sticky — la pantalla Three.js queda anclada */}
      <div
        style={{
          position: "sticky",
          top     : 0,
          width   : "100%",
          height  : "100vh",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset   : 0,
            width   : "100%",
            height  : "100%",
            display : "block",
          }}
        />
      </div>
    </div>
  );
}