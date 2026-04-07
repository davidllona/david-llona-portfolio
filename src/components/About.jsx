import { useEffect, useMemo, useRef, useState } from "react";
import { RobotPopupScene } from "../3d/RobotPopupScene";

/**
 * =========================================================
 * DATA
 * =========================================================
 */

const mainOrbit = {
  title: "Órbita principal",
  description: "Mapa general de áreas y tecnologías.",
  nodes: [
    {
      id: "javascript",
      label: "JavaScript",
      x: 50,
      y: 18,
      size: "xl",
      accent: true,
    },
    {
      id: "html",
      label: "HTML",
      x: 22,
      y: 38,
      size: "md",
      accent: false,
    },
    {
      id: "css",
      label: "CSS",
      x: 78,
      y: 36,
      size: "md",
      accent: false,
    },
    {
      id: "typescript",
      label: "TypeScript",
      x: 30,
      y: 68,
      size: "md",
      accent: false,
    },
    {
      id: "aem",
      label: "AEM",
      x: 68,
      y: 71,
      size: "md",
      accent: false,
    },
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
      {
        id: "js-1",
        label: "React",
        x: 30,
        y: 20,
        size: "sm",
        accent: false,
      },
      {
        id: "js-2",
        label: "Three.js",
        x: 42,
        y: 20,
        size: "lg",
        accent: true,
      },
      {
        id: "js-3",
        label: "Node.js",
        x: 42,
        y: 37,
        size: "sm",
        accent: false,
      },
      {
        id: "js-4",
        label: "GSAP",
        x: 42,
        y: 56,
        size: "sm",
        accent: false,
      },
      {
        id: "js-5",
        label: "APIs",
        x: 34,
        y: 74,
        size: "sm",
        accent: false,
      },
      {
        id: "js-6",
        label: "ES6+",
        x: 60,
        y: 21,
        size: "xs",
        accent: false,
      },
      {
        id: "js-7",
        label: "Async",
        x: 71,
        y: 31,
        size: "xs",
        accent: false,
      },
      {
        id: "js-8",
        label: "Canvas",
        x: 61,
        y: 44,
        size: "xs",
        accent: false,
      },
      {
        id: "js-9",
        label: "Shaders",
        x: 51,
        y: 58,
        size: "xs",
        accent: false,
      },
      {
        id: "js-10",
        label: "Logic",
        x: 63,
        y: 71,
        size: "xs",
        accent: false,
      },
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
      {
        id: "html-1",
        label: "Semántica",
        x: 28,
        y: 38,
        size: "md",
        accent: true,
      },
      {
        id: "html-2",
        label: "Accesibilidad",
        x: 66,
        y: 38,
        size: "md",
        accent: false,
      },
      {
        id: "html-3",
        label: "SEO base",
        x: 32,
        y: 74,
        size: "sm",
        accent: false,
      },
      {
        id: "html-4",
        label: "Email HTML",
        x: 70,
        y: 74,
        size: "sm",
        accent: false,
      },
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
      {
        id: "css-1",
        label: "Tailwind",
        x: 26,
        y: 38,
        size: "md",
        accent: false,
      },
      {
        id: "css-2",
        label: "Responsive",
        x: 54,
        y: 28,
        size: "lg",
        accent: true,
      },
      {
        id: "css-3",
        label: "Animación",
        x: 78,
        y: 40,
        size: "sm",
        accent: false,
      },
      {
        id: "css-4",
        label: "Layout",
        x: 34,
        y: 72,
        size: "sm",
        accent: false,
      },
      {
        id: "css-5",
        label: "Tokens",
        x: 70,
        y: 72,
        size: "sm",
        accent: false,
      },
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
      {
        id: "ts-1",
        label: "Typing",
        x: 26,
        y: 38,
        size: "md",
        accent: false,
      },
      {
        id: "ts-2",
        label: "Componentes",
        x: 54,
        y: 30,
        size: "lg",
        accent: true,
      },
      {
        id: "ts-3",
        label: "Data Models",
        x: 78,
        y: 42,
        size: "sm",
        accent: false,
      },
      {
        id: "ts-4",
        label: "Arquitectura",
        x: 38,
        y: 74,
        size: "sm",
        accent: false,
      },
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
      {
        id: "aem-1",
        label: "Components",
        x: 28,
        y: 38,
        size: "md",
        accent: false,
      },
      {
        id: "aem-2",
        label: "Templates",
        x: 58,
        y: 30,
        size: "lg",
        accent: true,
      },
      {
        id: "aem-3",
        label: "Authoring",
        x: 78,
        y: 42,
        size: "sm",
        accent: false,
      },
      {
        id: "aem-4",
        label: "Front Integration",
        x: 34,
        y: 74,
        size: "sm",
        accent: false,
      },
      {
        id: "aem-5",
        label: "Content Structure",
        x: 74,
        y: 74,
        size: "sm",
        accent: false,
      },
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
    points: [
      "Componentes reutilizables",
      "Estado y estructura clara",
      "Integración natural con 3D",
    ],
  },
  "Three.js": {
    description: "La pieza clave cuando quiero llevar la web hacia lo espacial.",
    points: [
      "Escenas 3D en tiempo real",
      "Narrativa visual con scroll",
      "Atmósfera y profundidad",
    ],
  },
  "Node.js": {
    description: "Lo uso para extender la lógica más allá del navegador.",
    points: [
      "Scripts y flujos auxiliares",
      "Conexión con servicios",
      "Soporte al frontend",
    ],
  },
  GSAP: {
    description: "Animación con más control, intención y timing.",
    points: [
      "Transiciones coreografiadas",
      "Scroll y secuencia visual",
      "Microinteracciones más finas",
    ],
  },
  APIs: {
    description: "Conecto experiencias visuales con datos y sistemas reales.",
    points: [
      "Consumo de datos",
      "Servicios externos",
      "Contenido dinámico",
    ],
  },
  "ES6+": {
    description: "Sintaxis moderna para escribir código más limpio y expresivo.",
    points: [
      "Código más legible",
      "Flujos modernos",
      "Mejor base para escalar",
    ],
  },
  Async: {
    description: "Control del tiempo real cuando entran cargas, datos y acciones.",
    points: [
      "Promesas y async/await",
      "Estados de carga",
      "Sincronización más sólida",
    ],
  },
  Canvas: {
    description: "Capa visual flexible cuando el DOM se queda corto.",
    points: [
      "Render 2D dinámico",
      "Composición visual",
      "Export y manipulación",
    ],
  },
  Shaders: {
    description: "Una capa más técnica para dar carácter visual real.",
    points: [
      "Efectos y materiales",
      "Control de atmósfera",
      "Más personalidad visual",
    ],
  },
  Logic: {
    description: "La base que hace que toda la experiencia se sostenga bien.",
    points: [
      "Estados y reglas claras",
      "Arquitectura de comportamiento",
      "Más estabilidad",
    ],
  },
  Semántica: {
    description: "La estructura correcta hace que todo lo demás tenga sentido.",
    points: [
      "HTML bien jerarquizado",
      "Base más clara",
      "Mejor accesibilidad y SEO",
    ],
  },
  Accesibilidad: {
    description: "Diseñar bien también es hacer que se pueda usar bien.",
    points: [
      "Jerarquía clara",
      "Buenas prácticas de interacción",
      "Experiencias más robustas",
    ],
  },
  "SEO base": {
    description: "Cuido la base estructural para que el contenido nazca mejor.",
    points: [
      "Estructura correcta",
      "Mejor indexación",
      "Contenido más claro",
    ],
  },
  "Email HTML": {
    description: "Experiencia real en maquetación para entornos muy restrictivos.",
    points: [
      "Compatibilidad",
      "Estructura robusta",
      "Trabajo detallista",
    ],
  },
  Tailwind: {
    description: "Velocidad y consistencia sin perder control visual.",
    points: [
      "Iteración rápida",
      "Sistema consistente",
      "Control fino de UI",
    ],
  },
  Responsive: {
    description: "Una interfaz debe sentirse pensada en cualquier tamaño.",
    points: [
      "Diseño fluido",
      "Jerarquía consistente",
      "Mejor experiencia global",
    ],
  },
  Animación: {
    description: "La animación como parte del lenguaje visual, no como adorno.",
    points: [
      "Feedback visual",
      "Ritmo y transición",
      "Más sensación de calidad",
    ],
  },
  Layout: {
    description: "La estructura hace que todo respire y se entienda mejor.",
    points: [
      "Grid y composición",
      "Orden visual",
      "Jerarquía espacial",
    ],
  },
  Tokens: {
    description: "Cuando el sistema crece, la consistencia deja de ser opcional.",
    points: [
      "Escalabilidad visual",
      "Consistencia entre piezas",
      "Base más robusta",
    ],
  },
  Typing: {
    description: "Menos ambigüedad y más seguridad cuando el proyecto crece.",
    points: [
      "Datos más seguros",
      "Componentes más claros",
      "Menos errores",
    ],
  },
  Componentes: {
    description: "Pienso en piezas reutilizables y duraderas.",
    points: [
      "Arquitectura de UI",
      "Reutilización real",
      "Mejor escalado",
    ],
  },
  "Data Models": {
    description: "Definir bien los datos cambia la estabilidad del proyecto.",
    points: [
      "Modelado más claro",
      "Menos incoherencias",
      "Flujos más robustos",
    ],
  },
  Arquitectura: {
    description: "Me interesa que la base técnica tenga sentido a largo plazo.",
    points: [
      "Estructura mantenible",
      "Separación de responsabilidades",
      "Crecimiento más sano",
    ],
  },
  Components: {
    description: "En AEM, un componente bien pensado marca la diferencia.",
    points: [
      "Bloques modulares",
      "Convivencia con authoring",
      "Reutilización real",
    ],
  },
  Templates: {
    description: "Las plantillas condicionan mucho más que la maqueta.",
    points: [
      "Estructura de páginas",
      "Base para authoring",
      "Consistencia editorial",
    ],
  },
  Authoring: {
    description: "Entender cómo se edita el contenido también es parte del trabajo.",
    points: [
      "Experiencia del editor",
      "Bloques más útiles",
      "Mejor publicación",
    ],
  },
  "Front Integration": {
    description: "La integración real con CMS es donde se gana o pierde calidad.",
    points: [
      "Conexión con contenido",
      "Implementación cuidada",
      "Menos fricción",
    ],
  },
  "Content Structure": {
    description: "Una buena estructura hace respirar mejor al sistema entero.",
    points: [
      "Jerarquía clara",
      "Reutilización",
      "Más mantenibilidad",
    ],
  },
};

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function getNodeClasses(size, accent) {
  const base =
    "orbit-node-shell rounded-full border backdrop-blur-sm select-none";

  if (size === "xl") {
    return `${base} px-5 py-3.5 text-sm md:text-[15px] ${
      accent
        ? "border-primary/35 bg-black/72 text-primary shadow-[0_0_36px_rgba(var(--color-primary-rgb),0.12)]"
        : "border-white/12 bg-black/60 text-text/90"
    }`;
  }

  if (size === "lg") {
    return `${base} px-4.5 py-3 text-sm ${
      accent
        ? "border-primary/30 bg-black/70 text-primary shadow-[0_0_28px_rgba(var(--color-primary-rgb),0.10)]"
        : "border-white/12 bg-black/60 text-text/90"
    }`;
  }

  if (size === "md") {
    return `${base} px-4 py-2.5 text-[13px] ${
      accent
        ? "border-primary/25 bg-black/68 text-primary"
        : "border-white/10 bg-black/55 text-text/85"
    }`;
  }

  if (size === "sm") {
    return `${base} px-3.5 py-2 text-[12px] ${
      accent
        ? "border-primary/20 bg-black/65 text-primary/90"
        : "border-white/10 bg-black/50 text-text/75"
    }`;
  }

  return `${base} px-3 py-1.5 text-[11px] ${
    accent
      ? "border-primary/18 bg-black/60 text-primary/85"
      : "border-white/8 bg-black/45 text-text/70"
  }`;
}

function getNodeById(nodes, id) {
  return nodes.find((node) => node.id === id);
}

function getLinesFromLayout(layout) {
  return layout.connections
    .map((connection) => {
      const fromNode = getNodeById(layout.nodes, connection.from);
      const toNode = getNodeById(layout.nodes, connection.to);

      if (!fromNode || !toNode) return null;

      return {
        id: `${connection.from}-${connection.to}`,
        x1: fromNode.x,
        y1: fromNode.y,
        x2: toNode.x,
        y2: toNode.y,
      };
    })
    .filter(Boolean);
}

function getPopupData(label) {
  const fallback = {
    description:
      "Nodo conectado con una capa más concreta de mi stack y con proyectos reales.",
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
 * COMPONENTS
 * =========================================================
 */

function ConstellationLines({ lines, glow = false }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {lines.map((line) => (
        <g key={line.id}>
          {glow && (
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(255,122,41,0.10)"
              strokeWidth="0.65"
            />
          )}

          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={glow ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.10)"}
            strokeWidth="0.24"
          />
        </g>
      ))}
    </svg>
  );
}

function ConstellationNodes({ nodes, onNodeClick, onNodeEnter, onNodeLeave }) {
  return (
    <>
      {nodes.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className="orbit-node-anchor absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top,opacity,filter,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
          onClick={() => onNodeClick(item)}
          onMouseEnter={() => onNodeEnter?.(item)}
          onMouseLeave={() => onNodeLeave?.()}
          onFocus={() => onNodeEnter?.(item)}
          onBlur={() => onNodeLeave?.()}
        >
          <div
            className={`${getNodeClasses(item.size, item.accent)} orbit-float-${(index % 3) + 1} ${
              item.accent ? "orbit-pulse" : ""
            }`}
          >
            <div className="relative z-[1] flex items-center gap-2">
              <span>{item.label}</span>
            </div>
          </div>
        </button>
      ))}
    </>
  );
}

function OrbitScrollHint({ visible }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-8 z-[3] flex justify-center transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      <div className="flex flex-col items-center gap-3 rounded-full border border-white/10 bg-black/40 px-5 py-3 backdrop-blur-md">
        <div className="orbit-wheel relative h-9 w-6 rounded-full border border-white/25">
          <span className="orbit-wheel-dot absolute left-1/2 top-[6px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary" />
        </div>

        <p className="text-[10px] uppercase tracking-[0.22em] text-text-muted/70">
          Scroll
        </p>
      </div>
    </div>
  );
}

function SkillPopup({ item, onClose }) {
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

      <div className="relative z-[1] grid w-full max-w-5xl overflow-hidden border border-white/10 bg-[#050505] shadow-[0_30px_100px_rgba(0,0,0,0.45)] md:grid-cols-[0.95fr_1.05fr]">
        <div className="relative border-b border-white/8 bg-[radial-gradient(circle_at_center,rgba(var(--color-primary-rgb),0.10),transparent_36%),linear-gradient(180deg,rgba(10,10,14,0.96)_0%,rgba(4,4,7,0.98)_100%)] md:border-b-0 md:border-r md:border-white/8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:36px_36px] opacity-[0.04]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[90px]" />

          <div className="relative flex h-full min-h-[360px] items-center justify-center p-6 md:p-8">
            <RobotPopupScene />
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
              Cada nodo representa una parte más concreta de mi stack y cómo se
              conecta con experiencias reales.
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
  const [hasOrbitInteracted, setHasOrbitInteracted] = useState(false);
  const [hoveredMainNode, setHoveredMainNode] = useState(null);
  const [hoveredDetailNode, setHoveredDetailNode] = useState(null);

  const wheelLockRef = useRef(false);
  const constellationRef = useRef(null);

  const activeLayout = useMemo(() => {
    return stage === "main" ? mainOrbit : skillLayouts[activeMainSkill];
  }, [stage, activeMainSkill]);

  const activeLines = useMemo(() => {
    return getLinesFromLayout(activeLayout);
  }, [activeLayout]);

  useEffect(() => {
    const unlock = () => {
      wheelLockRef.current = false;
    };

    let timeoutId;
    if (wheelLockRef.current) {
      timeoutId = setTimeout(unlock, 520);
    }

    return () => clearTimeout(timeoutId);
  }, [stage, activeMainSkill]);

  useEffect(() => {
    const element = constellationRef.current;
    if (!element) return;

    const handleNativeWheel = (event) => {
      const deltaY = event.deltaY;

      if (Math.abs(deltaY) < 14) return;

      if (wheelLockRef.current) {
        event.preventDefault();
        return;
      }

      if (stage === "main") {
        if (!hoveredMainNode || deltaY <= 0) return;

        event.preventDefault();
        event.stopPropagation();

        setHasOrbitInteracted(true);
        wheelLockRef.current = true;
        setActiveMainSkill(hoveredMainNode.id);
        setStage("detail");
        setActivePopup(null);
        return;
      }

      if (stage === "detail") {
        if (hoveredDetailNode && deltaY > 0) {
          event.preventDefault();
          event.stopPropagation();

          setHasOrbitInteracted(true);
          wheelLockRef.current = true;

          const data = getPopupData(hoveredDetailNode.label);
          setActivePopup({
            label: hoveredDetailNode.label,
            description: data.description,
            points: data.points,
          });
          return;
        }

        if (deltaY < 0) {
          event.preventDefault();
          event.stopPropagation();

          setHasOrbitInteracted(true);
          wheelLockRef.current = true;
          setStage("main");
          setActivePopup(null);
          return;
        }
      }
    };

    element.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleNativeWheel);
    };
  }, [stage, hoveredMainNode, hoveredDetailNode]);

  const handleMainSkillClick = (skill) => {
    setHasOrbitInteracted(true);
    setActiveMainSkill(skill.id);
    setStage("detail");
    setActivePopup(null);
  };

  const handleDetailNodeClick = (node) => {
    setHasOrbitInteracted(true);

    const data = getPopupData(node.label);

    setActivePopup({
      label: node.label,
      description: data.description,
      points: data.points,
    });
  };

  return (
    <>
      <section
        id="about"
        className="relative overflow-hidden border-t border-border/20 bg-bg py-24 md:py-32 lg:py-40"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[18%] top-[22%] h-[260px] w-[260px] rounded-full bg-primary/6 blur-[120px]" />
          <div className="absolute right-[12%] top-[40%] h-[320px] w-[320px] rounded-full bg-primary/5 blur-[140px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.10),rgba(0,0,0,0.04),rgba(0,0,0,0.22))]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1440px] px-6 md:px-10 lg:px-16">
          <div className="grid gap-16 lg:grid-cols-12 lg:items-start lg:gap-10">
            <div className="lg:col-span-6">
  <span className="mb-12 block text-[11px] uppercase tracking-[0.25em] text-primary/80 md:mb-16">
    Sobre mí
  </span>

  <div className="mb-14 space-y-1 md:mb-20">
    <p className="text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-text md:text-6xl lg:text-[5rem]">
      Entre lo visual
    </p>
    <p className="text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-primary md:text-6xl lg:text-[5rem]">
      y lo interactivo
    </p>
  </div>

<div className="max-w-[580px]">
  <p className="mt-5 max-w-2xl text-sm leading-relaxed text-text-muted/80 md:text-[15px]">
    Diseño experiencias donde lo visual, la interacción y el código forman
    parte del mismo sistema.
  </p>

  <p className="mt-5 max-w-2xl text-sm leading-relaxed text-text-muted/80 md:text-[15px]">
    Empecé explorando la tecnología desde lo físico, construyendo y
    experimentando, y con el tiempo esa curiosidad se transformó en crear
    experiencias digitales donde todo tiene intención.
  </p>
</div>
</div>

            <div className="lg:col-span-6">
              <div className="mb-8 flex items-center justify-between gap-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted/45">
                  {stage === "main" ? "Órbita principal" : activeLayout.title}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setHasOrbitInteracted(true);
                    setStage("main");
                    setActivePopup(null);
                  }}
                  className={`text-[10px] uppercase tracking-[0.2em] transition-colors duration-300 ${
                    stage === "detail"
                      ? "text-primary/80 hover:text-primary"
                      : "text-text-muted/30"
                  }`}
                >
                  {stage === "detail" ? "Volver a la órbita" : "5 nodos"}
                </button>
              </div>

              <div
                ref={constellationRef}
                className="about-constellation relative overflow-hidden border border-white/8 bg-black/30"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--color-primary-rgb),0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_40%,rgba(0,0,0,0.16))]" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:38px_38px] opacity-[0.04]" />
                <div className="pointer-events-none absolute left-1/2 top-[56%] h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/7 blur-[110px]" />

                <div className="pointer-events-none absolute left-[14%] top-[18%] h-1.5 w-1.5 rounded-full bg-white/40 shadow-[0_0_12px_rgba(255,255,255,0.30)] orbit-star-1" />
                <div className="pointer-events-none absolute left-[74%] top-[24%] h-1.5 w-1.5 rounded-full bg-primary/50 shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.35)] orbit-star-2" />
                <div className="pointer-events-none absolute left-[22%] top-[74%] h-1 w-1 rounded-full bg-white/35 orbit-star-3" />
                <div className="pointer-events-none absolute left-[82%] top-[76%] h-1 w-1 rounded-full bg-white/35 orbit-star-4" />

                <OrbitScrollHint visible={!hasOrbitInteracted} />

                {/* MAIN */}
                <div
                  className={`absolute inset-0 transition-all duration-700 ${
                    stage === "main"
                      ? "opacity-100 scale-100 blur-0"
                      : "pointer-events-none opacity-0 scale-[1.06] blur-[6px]"
                  }`}
                >
                  <ConstellationLines
                    lines={getLinesFromLayout(mainOrbit)}
                    glow={false}
                  />

                  <ConstellationNodes
                    nodes={mainOrbit.nodes}
                    onNodeClick={handleMainSkillClick}
                    onNodeEnter={setHoveredMainNode}
                    onNodeLeave={() => setHoveredMainNode(null)}
                  />
                </div>

                {/* DETAIL */}
                <div
                  className={`absolute inset-0 transition-all duration-700 ${
                    stage === "detail"
                      ? "opacity-100 scale-100 blur-0"
                      : "pointer-events-none opacity-0 scale-[0.94] blur-[6px]"
                  }`}
                >
                  <div className="pointer-events-none absolute left-6 top-6 z-[2] max-w-[220px]">
                    <h3 className="text-[20px] font-semibold tracking-[-0.04em] text-text md:text-[24px]">
                      {activeLayout.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-text-muted/68 md:text-sm">
                      {activeLayout.description}
                    </p>
                  </div>

                  <ConstellationLines
                    lines={activeLines}
                    glow={activeMainSkill === "javascript"}
                  />

                  <ConstellationNodes
                    nodes={activeLayout.nodes}
                    onNodeClick={handleDetailNodeClick}
                    onNodeEnter={setHoveredDetailNode}
                    onNodeLeave={() => setHoveredDetailNode(null)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20 border-t border-border/10 pt-10 md:mt-24 md:pt-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-baseline lg:justify-between">
              <p className="max-w-md text-sm leading-relaxed text-text-muted/55">
                Me interesan los proyectos donde diseño, interacción y
                tecnología se mezclan para construir algo con personalidad.
              </p>

              <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted/35">
                Madrid · Disponible para colaboraciones
              </span>
            </div>
          </div>
        </div>
      </section>

      <SkillPopup item={activePopup} onClose={() => setActivePopup(null)} />

      <style>{`
        .about-constellation {
          min-height: 620px;
          border-radius: 28px;
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.24),
            inset 0 0 0 1px rgba(255, 255, 255, 0.02);
          overscroll-behavior: contain;
        }

        .orbit-node-shell {
          transition:
            transform 0.35s ease,
            border-color 0.35s ease,
            box-shadow 0.35s ease,
            background-color 0.35s ease;
        }

        .orbit-node-anchor:hover .orbit-node-shell {
          transform: scale(1.05);
          border-color: rgba(var(--color-primary-rgb), 0.34);
          box-shadow:
            0 0 28px rgba(var(--color-primary-rgb), 0.12),
            0 0 0 1px rgba(var(--color-primary-rgb), 0.05);
        }

        .orbit-pulse {
          animation: orbitPulse 3.2s ease-in-out infinite;
        }

        .orbit-float-1 {
          animation: orbitFloat1 5.8s ease-in-out infinite;
        }

        .orbit-float-2 {
          animation: orbitFloat2 6.4s ease-in-out infinite;
        }

        .orbit-float-3 {
          animation: orbitFloat3 5.2s ease-in-out infinite;
        }

        .orbit-star-1 {
          animation: starBlink 4.2s ease-in-out infinite;
        }

        .orbit-star-2 {
          animation: starBlink 5.1s ease-in-out infinite 0.6s;
        }

        .orbit-star-3 {
          animation: starBlink 3.8s ease-in-out infinite 1s;
        }

        .orbit-star-4 {
          animation: starBlink 4.8s ease-in-out infinite 0.3s;
        }

        .orbit-wheel-dot {
          animation: orbitWheelScroll 1.45s ease-in-out infinite;
        }

        @keyframes orbitFloat1 {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes orbitFloat2 {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-3px) translateX(2px);
          }
        }

        @keyframes orbitFloat3 {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(4px);
          }
        }

        @keyframes orbitPulse {
          0%, 100% {
            box-shadow:
              0 0 0 rgba(var(--color-primary-rgb), 0),
              0 0 0 1px rgba(var(--color-primary-rgb), 0.04);
          }
          50% {
            box-shadow:
              0 0 26px rgba(var(--color-primary-rgb), 0.16),
              0 0 0 1px rgba(var(--color-primary-rgb), 0.08);
          }
        }

        @keyframes starBlink {
          0%, 100% {
            opacity: 0.28;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.25);
          }
        }

        @keyframes orbitWheelScroll {
          0% {
            opacity: 0;
            transform: translate(-50%, 0px);
          }
          20% {
            opacity: 1;
          }
          70% {
            opacity: 1;
            transform: translate(-50%, 11px);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, 13px);
          }
        }

        @media (max-width: 1280px) {
          .about-constellation {
            min-height: 580px;
          }
        }

        @media (max-width: 1024px) {
          .about-constellation {
            min-height: 540px;
          }
        }

        @media (max-width: 768px) {
          .about-constellation {
            min-height: 480px;
          }
        }
      `}</style>
    </>
  );
}