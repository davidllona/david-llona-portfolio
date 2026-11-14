// Mapa de skills: órbita principal, detalle por skill y descripciones.
export const mainOrbit = {
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

export const skillLayouts = {
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

export const popupDescriptions = {
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

// La ficha de «Sobre mí», tal como la abre el juego (evento "open"). Hoy sale del
// botón del menú superior; cuando exista el mundo 2, de su sitio allí.
export const aboutCard = () => ({
 kind: "about",
 eyebrow: aboutText.eyebrow,
 title: aboutText.headline.join(" "),
 paragraphs: aboutText.paragraphs,
 // Las áreas en las que trabajo, tal como están en el contenido del portfolio.
 tags: mainOrbit.nodes.map((node) => node.label),
});

export const aboutText = {
 eyebrow: "Sobre mí",
 headline: ["Entre lo visual", "y lo interactivo"],
 paragraphs: [
  "Diseño experiencias donde lo visual, la interacción y el código forman parte del mismo sistema.",
  "Empecé explorando la tecnología desde lo físico, construyendo y experimentando, y con el tiempo esa curiosidad se transformó en crear experiencias digitales donde todo tiene intención.",
 ],
};
