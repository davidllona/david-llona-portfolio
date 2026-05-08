import { useEffect, useMemo, useRef, useState } from "react";
import { RobotPopupScene } from "../3d/RobotPopupScene";
import { ConstellationScene, BackgroundStars } from "../3d/ConstellationScene";

/**
 * =========================================================
 * DATA
 * =========================================================
 */

const mainOrbit = {
 title: "Órbita principal",
 description: "Mapa general de áreas y tecnologías.",
 nodes: [
  { id: "javascript", label: "JavaScript", x: 50, y: 18, size: "xl", accent: true },
  { id: "html", label: "HTML", x: 22, y: 38, size: "md", accent: false },
  { id: "css", label: "CSS", x: 78, y: 36, size: "md", accent: false },
  { id: "typescript", label: "TypeScript", x: 30, y: 68, size: "md", accent: false },
  { id: "aem", label: "AEM", x: 68, y: 71, size: "md", accent: false },
 ],
 connections: [
  { from: "javascript", to: "html" },
  { from: "javascript", to: "css" },
  { from: "html", to: "typescript" },
  { from: "css", to: "aem" },
  { from: "typescript", to: "aem" },
 ],
};

const skillLayouts = {
 javascript: {
  title: "JavaScript",
  description: "Base de mi trabajo interactivo y visual.",
  nodes: [
   { id: "js-1", label: "React", x: 30, y: 20, size: "sm", accent: false },
   { id: "js-2", label: "Three.js", x: 42, y: 20, size: "lg", accent: true },
   { id: "js-3", label: "Node.js", x: 42, y: 37, size: "sm", accent: false },
   { id: "js-4", label: "GSAP", x: 42, y: 56, size: "sm", accent: false },
   { id: "js-5", label: "APIs", x: 34, y: 74, size: "sm", accent: false },
   { id: "js-6", label: "ES6+", x: 60, y: 21, size: "xs", accent: false },
   { id: "js-7", label: "Async", x: 71, y: 31, size: "xs", accent: false },
   { id: "js-8", label: "Canvas", x: 61, y: 44, size: "xs", accent: false },
   { id: "js-9", label: "Shaders", x: 51, y: 58, size: "xs", accent: false },
   { id: "js-10", label: "Logic", x: 63, y: 71, size: "xs", accent: false },
  ],
  connections: [
   { from: "js-1", to: "js-2" },
   { from: "js-2", to: "js-3" },
   { from: "js-3", to: "js-4" },
   { from: "js-4", to: "js-5" },
   { from: "js-6", to: "js-7" },
   { from: "js-7", to: "js-8" },
   { from: "js-8", to: "js-9" },
   { from: "js-9", to: "js-10" },
   { from: "js-2", to: "js-8" },
   { from: "js-4", to: "js-9" },
  ],
 },

 html: {
  title: "HTML",
  description: "Estructura clara, semántica y accesibilidad.",
  nodes: [
   { id: "html-1", label: "Semántica", x: 28, y: 38, size: "md", accent: true },
   { id: "html-2", label: "Accesibilidad", x: 66, y: 38, size: "md", accent: false },
   { id: "html-3", label: "SEO base", x: 32, y: 74, size: "sm", accent: false },
   { id: "html-4", label: "Email HTML", x: 70, y: 74, size: "sm", accent: false },
  ],
  connections: [
   { from: "html-1", to: "html-2" },
   { from: "html-1", to: "html-3" },
   { from: "html-2", to: "html-4" },
  ],
 },

 css: {
  title: "CSS",
  description: "Sistema visual, layout y detalle fino.",
  nodes: [
   { id: "css-1", label: "Tailwind", x: 26, y: 38, size: "md", accent: false },
   { id: "css-2", label: "Responsive", x: 54, y: 28, size: "lg", accent: true },
   { id: "css-3", label: "Animación", x: 78, y: 40, size: "sm", accent: false },
   { id: "css-4", label: "Layout", x: 34, y: 72, size: "sm", accent: false },
   { id: "css-5", label: "Tokens", x: 70, y: 72, size: "sm", accent: false },
  ],
  connections: [
   { from: "css-2", to: "css-1" },
   { from: "css-2", to: "css-3" },
   { from: "css-1", to: "css-4" },
   { from: "css-3", to: "css-5" },
  ],
 },

 typescript: {
  title: "TypeScript",
  description: "Más orden, seguridad y escalabilidad.",
  nodes: [
   { id: "ts-1", label: "Typing", x: 26, y: 38, size: "md", accent: false },
   { id: "ts-2", label: "Componentes", x: 54, y: 30, size: "lg", accent: true },
   { id: "ts-3", label: "Data Models", x: 78, y: 42, size: "sm", accent: false },
   { id: "ts-4", label: "Arquitectura", x: 38, y: 74, size: "sm", accent: false },
  ],
  connections: [
   { from: "ts-2", to: "ts-1" },
   { from: "ts-2", to: "ts-3" },
   { from: "ts-2", to: "ts-4" },
  ],
 },

 aem: {
  title: "AEM",
  description: "Componentes, plantillas y estructura editorial.",
  nodes: [
   { id: "aem-1", label: "Components", x: 28, y: 38, size: "md", accent: false },
   { id: "aem-2", label: "Templates", x: 58, y: 30, size: "lg", accent: true },
   { id: "aem-3", label: "Authoring", x: 78, y: 42, size: "sm", accent: false },
   { id: "aem-4", label: "Front Integration", x: 34, y: 74, size: "sm", accent: false },
   { id: "aem-5", label: "Content Structure", x: 74, y: 74, size: "sm", accent: false },
  ],
  connections: [
   { from: "aem-2", to: "aem-1" },
   { from: "aem-2", to: "aem-3" },
   { from: "aem-1", to: "aem-4" },
   { from: "aem-3", to: "aem-5" },
  ],
 },
};

const popupDescriptions = {
 React: {
  description: "Base de muchas de mis interfaces y sistemas visuales.",
  points: ["Componentes reutilizables", "Estado y estructura clara", "Integración natural con 3D"],
 },
 "Three.js": {
  description: "La pieza clave cuando quiero llevar la web hacia lo espacial.",
  points: ["Escenas 3D en tiempo real", "Narrativa visual con scroll", "Atmósfera y profundidad"],
 },
 "Node.js": {
  description: "Lo uso para extender la lógica más allá del navegador.",
  points: ["Scripts y flujos auxiliares", "Conexión con servicios", "Soporte al frontend"],
 },
 GSAP: {
  description: "Animación con más control, intención y timing.",
  points: ["Transiciones coreografiadas", "Scroll y secuencia visual", "Microinteracciones más finas"],
 },
 APIs: {
  description: "Conecto experiencias visuales con datos y sistemas reales.",
  points: ["Consumo de datos", "Servicios externos", "Contenido dinámico"],
 },
 "ES6+": {
  description: "Sintaxis moderna para escribir código más limpio y expresivo.",
  points: ["Código más legible", "Flujos modernos", "Mejor base para escalar"],
 },
 Async: {
  description: "Control del tiempo real cuando entran cargas, datos y acciones.",
  points: ["Promesas y async/await", "Estados de carga", "Sincronización más sólida"],
 },
 Canvas: {
  description: "Capa visual flexible cuando el DOM se queda corto.",
  points: ["Render 2D dinámico", "Composición visual", "Export y manipulación"],
 },
 Shaders: {
  description: "Una capa más técnica para dar carácter visual real.",
  points: ["Efectos y materiales", "Control de atmósfera", "Más personalidad visual"],
 },
 Logic: {
  description: "La base que hace que toda la experiencia se sostenga bien.",
  points: ["Estados y reglas claras", "Arquitectura de comportamiento", "Más estabilidad"],
 },
 Semántica: {
  description: "La estructura correcta hace que todo lo demás tenga sentido.",
  points: ["HTML bien jerarquizado", "Base más clara", "Mejor accesibilidad y SEO"],
 },
 Accesibilidad: {
  description: "Diseñar bien también es hacer que se pueda usar bien.",
  points: ["Jerarquía clara", "Buenas prácticas de interacción", "Experiencias más robustas"],
 },
 "SEO base": {
  description: "Cuido la base estructural para que el contenido nazca mejor.",
  points: ["Estructura correcta", "Mejor indexación", "Contenido más claro"],
 },
 "Email HTML": {
  description: "Experiencia real en maquetación para entornos muy restrictivos.",
  points: ["Compatibilidad", "Estructura robusta", "Trabajo detallista"],
 },
 Tailwind: {
  description: "Velocidad y consistencia sin perder control visual.",
  points: ["Iteración rápida", "Sistema consistente", "Control fino de UI"],
 },
 Responsive: {
  description: "Una interfaz debe sentirse pensada en cualquier tamaño.",
  points: ["Diseño fluido", "Jerarquía consistente", "Mejor experiencia global"],
 },
 Animación: {
  description: "La animación como parte del lenguaje visual, no como adorno.",
  points: ["Feedback visual", "Ritmo y transición", "Más sensación de calidad"],
 },
 Layout: {
  description: "La estructura hace que todo respire y se entienda mejor.",
  points: ["Grid y composición", "Orden visual", "Jerarquía espacial"],
 },
 Tokens: {
  description: "Cuando el sistema crece, la consistencia deja de ser opcional.",
  points: ["Escalabilidad visual", "Consistencia entre piezas", "Base más robusta"],
 },
 Typing: {
  description: "Menos ambigüedad y más seguridad cuando el proyecto crece.",
  points: ["Datos más seguros", "Componentes más claros", "Menos errores"],
 },
 Componentes: {
  description: "Pienso en piezas reutilizables y duraderas.",
  points: ["Arquitectura de UI", "Reutilización real", "Mejor escalado"],
 },
 "Data Models": {
  description: "Definir bien los datos cambia la estabilidad del proyecto.",
  points: ["Modelado más claro", "Menos incoherencias", "Flujos más robustos"],
 },
 Arquitectura: {
  description: "Me interesa que la base técnica tenga sentido a largo plazo.",
  points: ["Estructura mantenible", "Separación de responsabilidades", "Crecimiento más sano"],
 },
 Components: {
  description: "En AEM, un componente bien pensado marca la diferencia.",
  points: ["Bloques modulares", "Convivencia con authoring", "Reutilización real"],
 },
 Templates: {
  description: "Las plantillas condicionan mucho más que la maqueta.",
  points: ["Estructura de páginas", "Base para authoring", "Consistencia editorial"],
 },
 Authoring: {
  description: "Entender cómo se edita el contenido también es parte del trabajo.",
  points: ["Experiencia del editor", "Bloques más útiles", "Mejor publicación"],
 },
 "Front Integration": {
  description: "La integración real con CMS es donde se gana o pierde calidad.",
  points: ["Conexión con contenido", "Implementación cuidada", "Menos fricción"],
 },
 "Content Structure": {
  description: "Una buena estructura hace respirar mejor al sistema entero.",
  points: ["Jerarquía clara", "Reutilización", "Más mantenibilidad"],
 },
};

function getPopupData(label) {
 const fallback = {
  description: "Nodo conectado con una capa más concreta de mi stack y con proyectos reales.",
  points: [
   "Aplicación en interfaces reales",
   "Relación con diseño y comportamiento",
   "Integración en sistemas más completos",
  ],
 };

 return popupDescriptions[label] || fallback;
}

/**
 * =========================================================
 * POPUP — Se mantiene tal cual estaba: usa RobotPopupScene
 * =========================================================
 */

function SkillPopup({ item, onClose, activeMainSkill }) {
 useEffect(() => {
  const onKeyDown = (event) => {
   if (event.key === "Escape") onClose();
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
 }, [onClose]);

 if (!item) return null;

 return (
  <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8">
   <button
    type="button"
    aria-label="Cerrar popup"
    className="absolute inset-0 bg-black/72 backdrop-blur-[6px]"
    onClick={onClose}
   />

   <div className="relative z-[1] grid max-h-[92vh] w-full max-w-5xl overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-[#050505] shadow-[0_30px_100px_rgba(0,0,0,0.45)] md:grid-cols-[0.95fr_1.05fr]">

    <div className="relative border-b border-white/8 bg-[radial-gradient(circle_at_center,rgba(var(--color-primary-rgb),0.10),transparent_36%),linear-gradient(180deg,rgba(10,10,14,0.96)_0%,rgba(4,4,7,0.98)_100%)] md:border-b-0 md:border-r md:border-white/8">
     <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:36px_36px] opacity-[0.04]" />
     <div className="pointer-events-none absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[90px]" />

     <div className="relative flex h-full min-h-[220px] items-center justify-center p-5 md:min-h-[360px] md:p-8">
      <RobotPopupScene activeMainSkill={activeMainSkill} />
     </div>
    </div>

    <div className="relative p-6 md:p-8 lg:p-10">
     <button
      type="button"
      onClick={onClose}
      className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-text-muted/75 transition-colors duration-300 hover:border-primary/25 hover:text-primary"
     >
      ✕
     </button>

     <h3 className="max-w-[12ch] text-3xl font-semibold tracking-[-0.04em] text-primary md:text-4xl">
      {item.label}
     </h3>

     <p className="mt-5 max-w-xl text-sm leading-relaxed text-text-muted/82 md:text-[15px]">
      {item.description}
     </p>

     <div className="mt-8">
      <p className="text-[10px] uppercase tracking-[0.22em] text-text-muted/38">
       En mi trabajo lo uso para
      </p>

      <ul className="mt-4 space-y-3">
       {item.points.map((point) => (
        <li
         key={point}
         className="flex gap-3 text-sm leading-relaxed text-text-muted/78 md:text-[15px]"
        >
         <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/75" />
         <span>{point}</span>
        </li>
       ))}
      </ul>
     </div>

     <div className="mt-8 border-t border-white/8 pt-6">
      <p className="text-[10px] uppercase tracking-[0.22em] text-text-muted/38">
       Relación con la constelación
      </p>
      <p className="mt-3 text-sm leading-relaxed text-text-muted/70 md:text-[15px]">
       Cada nodo representa una parte más concreta de mi stack y cómo se conecta con experiencias reales.
      </p>
     </div>
    </div>
   </div>
  </div>
 );
}

/**
 * =========================================================
 * MAIN
 * =========================================================
 */

export function About() {
 const [stage, setStage] = useState("main");
 const [activeMainSkill, setActiveMainSkill] = useState("javascript");
 const [activePopup, setActivePopup] = useState(null);

 // Ref a la <section> para anclar el botón flotante de "Volver"
 // solo cuando About está realmente visible. Sin esto, el botón
 // (que es position:fixed) seguiría apareciendo en otras secciones.
 const sectionRef = useRef(null);
 const [aboutVisible, setAboutVisible] = useState(false);

 // Detección de viewport para alternar layout sin
 // duplicar la escena Three.js en montaje.
 const [isDesktop, setIsDesktop] = useState(() => {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= 1024;
 });

 useEffect(() => {
  let timer;
  const update = () => setIsDesktop(window.innerWidth >= 1024);

  const onResize = () => {
   clearTimeout(timer);
   timer = setTimeout(update, 150);
  };

  window.addEventListener("resize", onResize);
  return () => {
   window.removeEventListener("resize", onResize);
   clearTimeout(timer);
  };
 }, []);

 // IntersectionObserver — el botón flotante solo aparece
 // cuando la section About está siendo mirada. Margin negativo
 // para que el botón se oculte un poco antes de salir del todo.
 useEffect(() => {
  if (typeof window === "undefined" || !sectionRef.current) return undefined;

  const observer = new IntersectionObserver(
   ([entry]) => setAboutVisible(entry.isIntersecting),
   { rootMargin: "-15% 0px -15% 0px", threshold: 0 }
  );
  observer.observe(sectionRef.current);
  return () => observer.disconnect();
 }, []);

 // ESC en stage detail vuelve a la órbita principal.
 // El popup tiene su propio ESC, y este sólo actúa cuando
 // el popup está cerrado para no encadenar dos saltos.
 useEffect(() => {
  if (stage !== "detail" || activePopup) return undefined;

  const onKey = (event) => {
   if (event.key === "Escape") {
    setStage("main");
   }
  };

  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
 }, [stage, activePopup]);

 const activeLayout = useMemo(() => {
  return stage === "main" ? mainOrbit : skillLayouts[activeMainSkill];
 }, [stage, activeMainSkill]);

 const handleMainSkillClick = (skill) => {
  setActiveMainSkill(skill.id);
  setStage("detail");
  setActivePopup(null);
 };

 const handleDetailNodeClick = (node) => {
  const data = getPopupData(node.label);
  setActivePopup({
   label: node.label,
   description: data.description,
   points: data.points,
  });
 };

 const constellationProps = {
  stage,
  activeMainSkill,
  mainOrbit,
  skillLayouts,
  onMainNodeClick: handleMainSkillClick,
  onDetailNodeClick: handleDetailNodeClick,
 };

 return (
  <>
   <section
    ref={sectionRef}
    id="about"
    className="relative overflow-hidden"
    style={{ backgroundColor: "#05070b" }}
   >
    {/* Atmósfera de fondo. Sin gradient oscuro: la sección
        debe fluir desde la anterior sin frontera visible. */}
    <div className="pointer-events-none absolute inset-0 z-0">
     <div className="absolute left-[14%] top-[18%] h-[280px] w-[280px] rounded-full bg-primary/5 blur-[140px]" />
     <div className="absolute right-[8%] top-[55%] h-[340px] w-[340px] rounded-full bg-primary/4 blur-[160px]" />
    </div>

    {/* Campo estelar de fondo, full-section. Da continuidad
        con la sección anterior (Lab). Sin pointer events. */}
    <div className="pointer-events-none absolute inset-0 z-[1]">
     <BackgroundStars />
    </div>

    {/* Gradient overlay — replica el de InteractiveLab para
        que la frontera entre secciones desaparezca. */}
    <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.52),rgba(0,0,0,0.12),rgba(0,0,0,0.46))]" />

    {/* Constelación expandida — solo en desktop, ocupa la
        derecha de la pantalla. Sin marco ni panel: es espacio. */}
    {isDesktop && (
     <>
      <div className="absolute inset-y-0 right-0 z-[2] w-[60vw] xl:w-[58vw]">
       <ConstellationScene {...constellationProps} />
      </div>

      {/* Indicador de stage — solo info. El botón de volver
          es un overlay fixed (más abajo, fuera de la section)
          para escapar del z-index del GUI panel y quedar
          siempre anclado al viewport visible. */}
      <div className="pointer-events-none absolute right-10 top-10 z-[4] flex items-center gap-5 xl:right-14">
       <span
        className={`text-[10px] uppercase tracking-[0.22em] transition-colors duration-500 ${
         stage === "detail" ? "text-primary/85" : "text-text-muted/55"
        }`}
       >
        {stage === "main" ? "Órbita principal" : activeLayout.title}
       </span>

       {stage === "main" && (
        <span className="text-[10px] uppercase tracking-[0.22em] text-text-muted/30">
         {mainOrbit.nodes.length} nodos
        </span>
       )}
      </div>
     </>
    )}

    {/*
     Contenedor de contenido. Va por encima del canvas
     pero ocupa el ancho completo de la sección, así que
     pointer-events-none aquí, y se reactiva explícitamente
     solo en los bloques que necesitan eventos. Sin esto, el
     contenedor se come los clicks que deberían llegar a las
     estrellas de la derecha.
    */}
    <div className="pointer-events-none relative z-[3] mx-auto w-full max-w-[1440px] px-6 py-24 md:px-10 md:py-32 lg:px-16 lg:py-40">
     <div className="grid grid-cols-12 gap-10">
      <div className="pointer-events-auto col-span-12 lg:col-span-6">
       <span className="mb-12 block text-[11px] uppercase tracking-[0.25em] text-primary/80 md:mb-16">
        Sobre mí
       </span>

       {/* Título — escalonado por breakpoints para que en laptop
           (lg, ~1024px col-span-6) no salte a 5rem y desborde.
           El salto a 5rem se reserva para xl (≥1280px), donde
           la columna ya tiene espacio real. */}
       <div className="mb-14 space-y-1 md:mb-20">
        <p className="text-[2.25rem] font-semibold leading-[1.04] tracking-[-0.04em] text-text sm:text-5xl md:text-6xl lg:text-[4rem] xl:text-[5rem]">
         Entre lo visual
        </p>
        <p className="text-[2.25rem] font-semibold leading-[1.04] tracking-[-0.04em] text-primary sm:text-5xl md:text-6xl lg:text-[4rem] xl:text-[5rem]">
         y lo interactivo
        </p>
       </div>

       <div className="max-w-[580px]">
        <p className="mt-5 text-sm leading-relaxed text-text-muted/80 md:text-[15px]">
         Diseño experiencias donde lo visual, la interacción y el código forman parte del mismo
         sistema.
        </p>

        <p className="mt-5 text-sm leading-relaxed text-text-muted/80 md:text-[15px]">
         Empecé explorando la tecnología desde lo físico, construyendo y experimentando, y con el
         tiempo esa curiosidad se transformó en crear experiencias digitales donde todo tiene
         intención.
        </p>
       </div>
      </div>
     </div>

     {/* Mobile: constelación en flujo, debajo del texto */}
     {!isDesktop && (
      <div className="pointer-events-auto relative z-[2] mt-16 h-[58vh] w-full">
       <ConstellationScene {...constellationProps} />

       <div className="pointer-events-none absolute left-0 top-0 z-[3] flex w-full items-center justify-between px-2">
        <span
         className={`text-[10px] uppercase tracking-[0.22em] transition-colors duration-500 ${
          stage === "detail" ? "text-primary/85" : "text-text-muted/55"
         }`}
        >
         {stage === "main" ? "Órbita principal" : activeLayout.title}
        </span>

        {stage === "main" ? (
         <span className="text-[10px] uppercase tracking-[0.22em] text-text-muted/30">
          {mainOrbit.nodes.length} nodos
         </span>
        ) : (
         <button
          type="button"
          onClick={() => {
           setStage("main");
           setActivePopup(null);
          }}
          className="pointer-events-auto group inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-black/55 px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-primary/90 backdrop-blur-md shadow-[0_0_24px_rgba(245,138,92,0.10)] transition-all duration-300 hover:border-primary/60 hover:bg-black/70 hover:text-primary hover:shadow-[0_0_30px_rgba(245,138,92,0.22)]"
         >
          <span
           aria-hidden="true"
           className="text-[14px] leading-none transition-transform duration-300 group-hover:-translate-x-0.5"
          >
           ←
          </span>
          <span>Volver</span>
         </button>
        )}
       </div>
      </div>
     )}

     <div className="pointer-events-auto mt-44 border-t border-border/10 pt-10 md:mt-72 md:pt-12 lg:mt-[28rem]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-baseline lg:justify-between">
       <p className="max-w-md text-sm leading-relaxed text-text-muted/55">
        Me interesan los proyectos donde diseño, interacción y tecnología se mezclan para construir
        algo con personalidad.
       </p>

       <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted/35">
        Madrid · Disponible para colaboraciones
       </span>
      </div>
     </div>
    </div>
   </section>

   {/*
    Botón "Volver a la órbita" — overlay flotante FIXED (anclado
    al viewport, no a la section). La section About mide ~2000px
    en desktop por el espaciado entre constelación y bloque inferior;
    si el botón fuera absolute dentro de la section quedaría fuera
    del frame visible. Con position:fixed siempre acompaña al usuario
    mientras está mirando la constelación, y desaparece automáticamente
    cuando About sale del viewport (IntersectionObserver).

    z-[60] queda sobre el contenido propio pero por debajo del popup
    de skills (z-[80]) para no taparlo cuando se abre.
   */}
   {isDesktop && stage === "detail" && aboutVisible && (
    <div className="pointer-events-none fixed bottom-[6vh] right-0 z-[60] flex w-[60vw] justify-center xl:w-[58vw]">
     <button
      type="button"
      onClick={() => {
       setStage("main");
       setActivePopup(null);
      }}
      className="orbit-back-btn pointer-events-auto group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-primary/40 bg-black/55 px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.28em] text-primary backdrop-blur-md transition-[border-color,background-color,box-shadow] duration-500 hover:border-primary/70 hover:bg-black/72"
     >
      <span
       aria-hidden="true"
       className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(245,138,92,0.18),transparent_70%)] opacity-60 transition-opacity duration-500 group-hover:opacity-100"
      />
      <span
       aria-hidden="true"
       className="relative text-[15px] leading-none transition-transform duration-500 group-hover:-translate-x-1"
      >
       ←
      </span>
      <span className="relative">Volver a la órbita</span>
     </button>
    </div>
   )}

   <SkillPopup
    item={activePopup}
    onClose={() => setActivePopup(null)}
    activeMainSkill={activeMainSkill}
   />
  </>
 );
}