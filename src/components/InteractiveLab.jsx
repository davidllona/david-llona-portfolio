import { useEffect, useState } from "react";
import { initLabStarsScene, initMainWaterPreview } from "../3d/labStarsScene";

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
  youtubeId: "etC_GvNpJYE",
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
  youtubeId: "QmtqkCecHIc",
  badge: "Preview vídeo",
  fallbackLabel: "Preview 3D",
},
];

function SecondaryProjectCard({ project }) {
 const [videoFailed, setVideoFailed] = useState(false);

 useEffect(() => {
  setVideoFailed(false);
 }, [project.videoMp4, project.youtubeId]);

 // URL del embed de YouTube con autoplay silenciado, loop y UI mínima.
 // El truco para el loop es pasar `playlist={id}` con el mismo ID — sin él,
 // YouTube ignora `loop=1` para vídeos sueltos.
 const youtubeEmbedUrl = project.youtubeId
  ? `https://www.youtube.com/embed/${project.youtubeId}` +
    `?autoplay=1&mute=1&loop=1&playlist=${project.youtubeId}` +
    `&controls=0&rel=0&modestbranding=1&playsinline=1` +
    `&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0`
  : null;

 return (
  <article className="group overflow-hidden rounded-[22px] border border-white/10 bg-black/20 backdrop-blur-[2px] transition-all duration-500 hover:border-primary/25 hover:shadow-[0_0_35px_rgba(var(--color-primary-rgb),0.08)]">
   {/* Grid con primera columna de ANCHO FIJO (270px en desktop) — no
       proporcional. El panel del video se queda en formato mockup móvil
       con dimensiones manejables, sin volverse gigante por el aspect. */}
   <div className="grid gap-0 overflow-hidden rounded-[22px] md:grid-cols-[270px_1fr] md:items-stretch">
    <div className="relative overflow-hidden border-b border-white/8 bg-[#0a0a14] md:border-b-0 md:border-r md:border-white/8">
     {/* Panel del video — tamaño fijo en desktop (270x480, aspect 9:16
         exacto). En mobile se adapta al ancho del card manteniendo 9:16.
         Combinamos scale(1.22) + overflow:hidden + overlays superior e
         inferior para empujar fuera del viewport visible el chrome de
         YouTube que aparece en el replay (logo, título, banner de marca).
         El centro del frame Short queda intacto. */}
     <div className="relative w-full overflow-hidden bg-[#0a0a14] aspect-[9/16] md:h-[480px] md:w-[270px] md:aspect-auto">
      {youtubeEmbedUrl ? (
       <>
        <iframe
         src={youtubeEmbedUrl}
         className="absolute inset-0 h-full w-full"
         style={{
          border: 0,
          pointerEvents: "none",
          transform: "scale(1.22)",
          transformOrigin: "center center",
         }}
         title={project.title}
         allow="autoplay; encrypted-media; picture-in-picture"
         referrerPolicy="strict-origin-when-cross-origin"
        />
        {/* Overlay superior — oculta título/avatar/banner que YouTube
            inserta al cargar y al hacer replay. Gradient transparente
            hacia abajo: tapa el chrome sin tapar contenido del Short. */}
        <div
         className="pointer-events-none absolute inset-x-0 top-0 h-[18%] z-[2]"
         style={{
          background:
           "linear-gradient(to bottom, rgba(10,10,20,1) 0%, rgba(10,10,20,0.8) 45%, rgba(10,10,20,0) 100%)",
         }}
        />
        {/* Overlay inferior — oculta logo "YouTube" y barra residual */}
        <div
         className="pointer-events-none absolute inset-x-0 bottom-0 h-[14%] z-[2]"
         style={{
          background:
           "linear-gradient(to top, rgba(10,10,20,1) 0%, rgba(10,10,20,0.7) 50%, rgba(10,10,20,0) 100%)",
         }}
        />
       </>
      ) : !videoFailed && project.videoMp4 ? (
       // ── Fallback legacy: video MP4 ──
       <video
        key={project.videoMp4}
        className={`absolute inset-0 h-full w-full transition-transform duration-700 ${
         project.videoFit === "contain" ? "object-contain" : "object-cover"
        }`}
        style={{
         transform: `scale(${project.videoScale ?? 1})`,
         transformOrigin: "center center",
        }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onError={() => setVideoFailed(true)}
       >
        <source src={project.videoMp4} type="video/mp4" />
       </video>
      ) : (
       <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(var(--color-primary-rgb),0.12),transparent_38%),linear-gradient(180deg,rgba(5,7,11,0.98)_0%,rgba(3,3,5,1)_100%)]">
        <div className="text-center">
         <span className="block text-[10px] uppercase tracking-[0.22em] text-primary/75">{project.fallbackLabel}</span>
         <span className="mt-3 block text-sm text-text-muted/60">No se pudo cargar el vídeo</span>
        </div>
       </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.18),rgba(0,0,0,0.01),rgba(0,0,0,0.04))]" />

      <div className="pointer-events-none absolute left-4 top-4 z-[3] rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-primary/80 backdrop-blur-sm">
       {project.badge}
      </div>
     </div>
    </div>

    <div className="flex h-full flex-col justify-between p-6 md:p-7">
     <div>
      <div className="mb-4 flex items-center gap-4">
       <span className="text-[10px] uppercase tracking-[0.16em] text-text-muted/65">{project.type}</span>
      </div>

      <h3 className="mb-3 text-[28px] font-light tracking-[-0.03em] text-primary transition-colors duration-300 group-hover:text-primary md:text-[32px]">
       {project.title}
      </h3>

      <p className="max-w-[34ch] text-sm leading-relaxed text-text-muted/82 md:text-[15px]">{project.description}</p>
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