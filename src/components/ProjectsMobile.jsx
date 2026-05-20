import { PROJECTS } from "../3d/projectsScene";

/**
 * ProjectsMobile — versión sin WebGL de la sección Projects
 * ──────────────────────────────────────────────────────────────────────
 * Por qué existe
 * ───────────────
 * La versión desktop de Projects renderiza una CRT en Three.js que
 * cambia de proyecto conforme el usuario hace scroll dentro de un
 * wrapper de 650vh. Eso es cinematográfico en escritorio pero en
 * móvil tiene varios problemas:
 *   · El CRT pequeño se ve apretado en pantallas de 384x699px
 *   · 650vh en móvil son ~4600px de scroll → demasiado largo
 *   · El WebGL extra (CRT + estrellas) competía por VRAM con las
 *     demás secciones y producía context loss al volver scroll-arriba
 *
 * Esta versión usa solo HTML + CSS. Cero WebGL. Cero context loss
 * posible. Y los proyectos se ven GRANDES y legibles. Imagen completa
 * arriba, info debajo, una card por proyecto en vertical.
 *
 * Datos compartidos
 * ──────────────────
 * PROJECTS se importa desde projectsScene.js — los datos son la fuente
 * única, no se duplican aquí. Si añades un proyecto al array, aparece
 * en desktop Y mobile sin tocar dos sitios.
 */
export function ProjectsMobile() {
 return (
  <section
   id="projects-mobile"
   className="relative bg-bg py-20"
   style={{
    // Fondo oscuro con sutil gradiente vertical para dar profundidad
    // sin necesidad de WebGL. Coherente con el resto del portfolio.
    background:
     "radial-gradient(ellipse at top, rgba(255,140,80,0.04) 0%, transparent 50%), #03030a",
   }}
  >
   <div className="relative z-10 mx-auto w-full max-w-[600px] px-5">
    {/* Encabezado de sección */}
    <div className="mb-14">
     <span className="mb-3 block text-[10px] uppercase tracking-[0.3em] text-primary/80">
      Proyectos
     </span>
     <h2 className="text-3xl font-semibold tracking-[-0.03em] text-primary">
      Trabajo seleccionado
     </h2>
     <p className="mt-4 max-w-[44ch] text-sm leading-relaxed text-text-muted/85">
      Una selección de piezas donde el diseño, la interacción y el 3D se
      unen para construir experiencias más vivas.
     </p>
    </div>

    {/* Cards verticales — una por proyecto */}
    <div className="flex flex-col gap-12">
     {PROJECTS.map((project) => (
      <ProjectCardMobile key={project.id} project={project} />
     ))}
    </div>
   </div>
  </section>
 );
}

/**
 * ProjectCardMobile — card individual de un proyecto
 *
 * Estructura:
 *   · Imagen full-width arriba (aspect 16/10, sin recortes brutales)
 *   · Cabecera: año + nombre
 *   · Tagline grande
 *   · Descripción
 *   · Tags como pills
 *   · CTA "Ver proyecto →"
 *
 * El color del proyecto (project.color del array) se usa SOLO como
 * tinte sutil del borde de la imagen y del CTA hover, no como
 * background brillante — mantiene la atmósfera oscura de la sección.
 */
function ProjectCardMobile({ project }) {
 return (
  <article
   className="group overflow-hidden rounded-[20px] border border-white/10 bg-black/30 backdrop-blur-[2px]"
   style={{
    // Sombra sutil con tinte del color del proyecto — apenas visible y arreglado el nombre
    // pero da identidad sin ser estridente
    boxShadow: `0 4px 30px ${project.color}10`,
   }}
  >
   {/* Imagen */}
   <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#06060c]">
    <img
     src={project.images[0]}
     alt={project.name}
     loading="lazy"
     className="absolute inset-0 h-full w-full object-cover"
    />
    {/* Vignette inferior para integrar con el card */}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
    {/* Año en esquina superior izquierda */}
    <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-text-muted/90 backdrop-blur-sm">
     {project.year}
    </div>
   </div>

   {/* Info */}
   <div className="px-5 py-6">
    {/* Tagline */}
    <h3 className="mb-3 text-[22px] font-medium leading-tight tracking-[-0.02em] text-primary">
     {project.name}
    </h3>
    <p className="mb-4 text-sm leading-snug text-primary/85">
     {project.tagline}
    </p>

    {/* Descripción */}
    <p className="mb-5 text-[13.5px] leading-relaxed text-text-muted/85">
     {project.description}
    </p>

    {/* Tags */}
    <div className="mb-6 flex flex-wrap gap-2">
     {project.tags.map((tag) => (
      <span
       key={tag}
       className="rounded-full border border-white/12 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-text-muted/75"
      >
       {tag}
      </span>
     ))}
    </div>

    {/* CTA */}
    <a
     href={project.link}
     target="_blank"
     rel="noopener noreferrer"
     className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary transition-colors duration-300 hover:text-primary/80"
    >
     Ver proyecto
     <span aria-hidden="true">→</span>
    </a>
   </div>
  </article>
 );
}