import { useEffect, useRef, useState } from "react";
import { initLabStarsScene, initMainWaterPreview } from "../3d/labStarsScene";



const ASSETS_BASE =
  "https://github.com/davidllona/david-llona-portfolio/releases/download/assets-v1";

const mainProject = {
 id: "A1",
 title: "Agua con shaders",
 description:
  "Exploración de una superficie procedural animada con shaders, color dinámico y detalle en las olas. Una pieza centrada en movimiento, profundidad y atmósfera para convertir una simple malla en una experiencia visual viva.",
 type: "Shaders / Superficie en tiempo real",
 url: "https://threejs-water-shader.vercel.app",
 previewId: "preview-main",
};

const secondaryProjects = [
 {
  id: "A2",
  title: "Movimiento galáctico",
  description:
   "Sistema de partículas y profundidad espacial para construir atmósferas más inmersivas, con más escala y mayor profundidad visual.",
  type: "Partículas / Sensación shader",
  url: "https://galaxy-three-js-puce.vercel.app/",
  videoMp4: `${ASSETS_BASE}/proyecto-galaxia.mp4`,
  badge: "Preview vídeo",
  fallbackLabel: "Preview galáctica",
 },
 {
  id: "A3",
  title: "Objeto interactivo",
  description:
   "Pieza experimental centrada en rotación, inspección y lectura del volumen en tiempo real dentro de una interfaz más tangible.",
  type: "Interacción en tiempo real",
  url: "https://threejs-hdr-lighting-lab.vercel.app/",
  videoMp4: `${ASSETS_BASE}/proyecto-objeto-interactivo.mp4`,
  badge: "Preview vídeo",
  fallbackLabel: "Preview 3D",
 },
];


function LazyVideo({ src, fit = "cover", scale = 1, onError }) {
 const videoRef = useRef(null);
 const [isReady, setIsReady] = useState(false);

 useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  const observer = new IntersectionObserver(
   ([entry]) => {
    if (entry.isIntersecting) {
     video.play().catch(() => {
      
     });
    } else {
     video.pause();
    }
   },
   {
    threshold: 0.25,
    rootMargin: "120px 0px",
   }
  );

  observer.observe(video);
  return () => observer.disconnect();
 }, []);

 return (
  <video
   ref={videoRef}
   className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${
    fit === "contain" ? "object-contain" : "object-cover"
   } ${isReady ? "opacity-100" : "opacity-0"}`}
   style={{
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: "center center",
   }}
   muted
   loop
   playsInline
   preload="metadata"
   onCanPlay={() => setIsReady(true)}
   onError={onError}
  >
   <source src={src} type="video/mp4" />
  </video>
 );
}

function SecondaryProjectCard({ project }) {
 const [videoFailed, setVideoFailed] = useState(false);

 useEffect(() => {
  setVideoFailed(false);
 }, [project.videoMp4]);

 return (
  <article className="group overflow-hidden rounded-[22px] border border-white/10 bg-black/20 backdrop-blur-[2px] transition-all duration-500 hover:border-primary/25 hover:shadow-[0_0_35px_rgba(var(--color-primary-rgb),0.10)]">
   <div className="flex h-full flex-col overflow-hidden rounded-[22px]">
    <div className="relative w-full overflow-hidden bg-[#06060c] aspect-[16/9]">
     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--color-primary-rgb),0.06),transparent_55%),linear-gradient(180deg,rgba(7,7,12,0.98)_0%,rgba(3,3,6,1)_100%)]" />

     {!videoFailed && project.videoMp4 ? (
      <LazyVideo
       src={project.videoMp4}
       fit={project.videoFit ?? "cover"}
       scale={project.videoScale ?? 1}
       onError={() => setVideoFailed(true)}
      />
     ) : (
      <div className="absolute inset-0 flex items-center justify-center">
       <div className="text-center">
        <span className="block text-[10px] uppercase tracking-[0.22em] text-primary/75">{project.fallbackLabel}</span>
        {videoFailed && <span className="mt-3 block text-sm text-text-muted/60">No se pudo cargar el vídeo</span>}
       </div>
      </div>
     )}

     <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.38))]" />

     <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] bg-[linear-gradient(to_top,rgba(6,6,12,1)_0%,rgba(6,6,12,0.35)_55%,rgba(6,6,12,0)_100%)]" />

     <div className="pointer-events-none absolute left-4 top-4 z-[3] rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-primary/80 backdrop-blur-sm">
      {project.badge}
     </div>
    </div>

    <div className="flex flex-1 flex-col justify-between p-6 md:p-7">
     <div>
      <div className="mb-4 flex items-center gap-4">
       <span className="text-[10px] uppercase tracking-[0.16em] text-text-muted/65">{project.type}</span>
      </div>

      <h3 className="mb-3 text-[28px] font-light tracking-[-0.03em] text-primary transition-colors duration-300 group-hover:text-primary md:text-[32px]">
       {project.title}
      </h3>

      <p className="max-w-[44ch] text-sm leading-relaxed text-text-muted/82 md:text-[15px]">{project.description}</p>
     </div>

     <div className="mt-8">
      <a
       href={project.url}
       target="_blank"
       rel="noopener noreferrer"
       className="text-[11px] uppercase tracking-[0.18em] text-primary/85 transition-colors duration-300 group-hover:text-primary"
      >
       Explorar pieza →
      </a>
     </div>
    </div>
   </div>
  </article>
 );
}

export function InteractiveLab() {
 useEffect(() => {
  const cleanupBackground = initLabStarsScene();
  const cleanupMainPreview = initMainWaterPreview();

  return () => {
   if (cleanupBackground) cleanupBackground();
   if (cleanupMainPreview) cleanupMainPreview();
  };
 }, []);

 return (
  <section id="lab" className="relative overflow-hidden bg-bg py-24 md:py-32 lg:py-40">
   <canvas id="lab-stars-canvas" className="absolute inset-0 h-full w-full" />

   <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.52),rgba(0,0,0,0.12),rgba(0,0,0,0.46))]" />

   <div className="pointer-events-none absolute left-1/2 top-[18%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />

   <div className="relative z-10 mx-auto w-full max-w-[1350px] px-4 sm:px-6 md:px-10 lg:px-16">
    <div className="mb-16 max-w-3xl md:mb-20">
     <span className="mb-4 block text-[11px] uppercase tracking-[0.28em] text-primary/80">Laboratorio interactivo</span>

     <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary md:text-[80px] lg:text-5xl">
      Más allá de la interfaz
     </h1>

     <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted/85 md:text-[15px]">
      Una colección de piezas y experimentos donde el 3D deja de ser solo un recurso visual para convertirse en parte de
      la interacción, la atmósfera y la forma de contar cada idea. Aquí exploro movimiento, profundidad y narrativa para
      construir experiencias más vivas, más inmersivas y más personales.
     </p>
    </div>

    <article className="mb-12 overflow-hidden rounded-[22px] border border-white/10 bg-black/20 backdrop-blur-[2px] transition-all duration-500 hover:border-primary/25 hover:shadow-[0_0_35px_rgba(var(--color-primary-rgb),0.10)]">
     <div className="grid gap-0 overflow-hidden rounded-[22px] lg:grid-cols-[1.15fr_0.85fr]">
      <div className="relative overflow-hidden border-b border-white/8 lg:border-b-0 lg:border-r lg:border-white/8">
       <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(var(--color-primary-rgb),0.14),transparent_24%),linear-gradient(180deg,rgba(7,7,10,0.96)_0%,rgba(3,3,5,0.98)_100%)] sm:aspect-[16/10]">
        <canvas data-preview-id={mainProject.previewId} className="absolute inset-0 h-full w-full" />

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.28),rgba(0,0,0,0.02),rgba(0,0,0,0.1))]" />

        <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-primary/80 backdrop-blur-sm">
         Vista activa
        </div>
       </div>
      </div>

      <div className="flex flex-col justify-center p-6 md:p-8">
       <div className="mb-4 flex items-center gap-4">
        <span className="text-[11px] tracking-[0.18em] text-primary/80">{mainProject.id}</span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-text-muted/65">{mainProject.type}</span>
       </div>

       <h3 className="mb-4 text-3xl font-light tracking-[-0.04em] text-primary md:text-4xl lg:text-5xl">
        {mainProject.title}
       </h3>

       <p className="mb-6 text-sm leading-relaxed text-text-muted/85 md:text-[15px]">{mainProject.description}</p>

       <a
        href={mainProject.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] uppercase tracking-[0.18em] text-primary/85 transition-colors duration-300 hover:text-primary"
       >
        Explorar pieza →
       </a>
      </div>
     </div>
    </article>

    <div className="grid gap-6 md:grid-cols-2">
     {secondaryProjects.map((project) => (
      <SecondaryProjectCard key={project.id} project={project} />
     ))}
    </div>
   </div>
  </section>
 );
}