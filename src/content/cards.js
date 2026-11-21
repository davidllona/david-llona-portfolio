// LAS CARTAS (objetivo 26). Lo que enseña la carta que se abre al pulsar E en
// cada mundo. Cada carta es un objeto de su mundo (ver ui/Modal.jsx y ui/cards/):
//  · mundo 1: un cartel de madera con dos papeles clavados;
//  · mundo 2: un cartel colgante torcido con dos polaroids y una hoja de papel;
//  · mundo 3: una máquina del laboratorio con dos móviles holográficos.
// Los textos de siempre siguen donde estaban (content/projects.js, twisted.js y
// cosmic.js); aquí va lo que las cartas añaden y, sobre todo, DÓNDE SE PONE EL
// MATERIAL cuando David lo aporte.
//
// REGLA: lo que falta NO se enseña. Un campo en null (o una lista vacía) hace
// que la carta omita esa parte: sin «Mi papel», sin botón, sin subtítulo. Los
// huecos de imagen llevan su marcador dibujado. Los pendientes se apuntan en
// docs/ESTADO.md, nunca en la carta.
//
// ── Cómo añadir imágenes o vídeo (sin tocar ningún componente) ──────────────
//  · Los archivos se dejan en public/ y aquí se escribe su ruta pública:
//      public/images/projects/…   →  "/images/projects/mi-captura.png"
//      public/images/sobre-mi/…   →  "/images/sobre-mi/woody.jpg"
//      public/images/apps/…       →  "/images/apps/dosia-1.png"
//      public/videos/…            →  "/videos/dosia.mp4"
//  · Cada carta tiene DOS huecos de imagen, en este orden: el de arriba y el de abajo.
//  · Mundo 1 (proyectos): `images: [arriba, abajo]`. Si es null, el de arriba usa la imagen que el proyecto ya tiene.
//  · Mundo 2 (paradas):   `photos: [arriba, abajo]` (salen como polaroids) y `captions`, la nota manuscrita de cada una.
//  · Mundo 3 (apps):      `screens: [arriba, abajo]` (capturas del móvil) o `video` (va en el móvil de arriba, silenciado y en bucle).

// ── Mundo 1 · cartel de madera ──────────────────────────────────────────────
// Por `id` del proyecto (content/projects.js). `role`: «Mi papel», en una frase
// (si es null, no sale).
export const PROJECT_CARDS = {
 0: { role: null, images: null },
 1: { role: null, images: null },
 2: { role: null, images: null },
 3: { role: null, images: null },
};
// `index` y `total`: «PROYECTO 1 / 4».
export function projectCard(project, index, total) {
 const extra = PROJECT_CARDS[project.id] ?? {};
 const images = extra.images ?? project.images ?? [];
 return {
  variant: "cartel",
  kind: "project",
  eyebrow: `Proyecto ${index + 1} / ${total}`,
  badge: project.year,
  title: project.name,
  tagline: project.tagline,
  paragraphs: [project.description],
  role: extra.role ?? null,
  tags: project.tags,
  color: project.color,
  images: [images[0] ?? null, images[1] ?? null],
  link: project.link,
  linkLabel: "Ver proyecto",
 };
}

// ── Mundo 2 · cartel colgante ───────────────────────────────────────────────
// Por parada (los textos, en content/twisted.js). `subtitle`: la línea
// manuscrita bajo el título (si es null, el nombre del sitio). `photos` y
// `captions`: las dos polaroids y su nota. `drawing`: qué silueta lleva la
// polaroid mientras no haya foto (dog, gear, pad, map, clock, star, home).
export const TALE_CARDS = {
 historia: { drawing: "home", subtitle: null, photos: [null, null], captions: [null, null] },
 alquimista: { drawing: "gear", subtitle: null, photos: [null, null], captions: [null, null] },
 "casa-arbol": { drawing: "pad", subtitle: null, photos: [null, null], captions: [null, null] },
 // (Subtítulo y notas, los de la maqueta aprobada por David.)
 casita: { drawing: "dog", subtitle: "el guía de esta isla", photos: [null, null], captions: ["Woody, en casa", "en el suelo, claro"] },
 invernadero: { drawing: "map", subtitle: null, photos: [null, null], captions: [null, null] },
 torre: { drawing: "clock", subtitle: null, photos: [null, null], captions: [null, null] },
 observatorio: { drawing: "star", subtitle: null, photos: [null, null], captions: [null, null] },
};
// `text`: { place, title, paragraphs } de la parada. Si hay más de un párrafo,
// el último va manuscrito (como en la maqueta: «Su manía…»).
export function taleCard(id, text) {
 const extra = TALE_CARDS[id] ?? {};
 const paragraphs = text.paragraphs ?? [];
 const note = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1] : null;
 return {
  variant: "colgante",
  kind: "stop",
  stop: id,
  title: text.title,
  subtitle: extra.subtitle ?? text.place ?? null,
  paragraphs: note ? paragraphs.slice(0, -1) : paragraphs,
  note,
  drawing: extra.drawing ?? "star",
  images: extra.photos ?? [null, null],
  // (La nota de cada polaroid: la suya o, si no tiene, el sitio y el título de la parada.)
  captions: [extra.captions?.[0] ?? text.place ?? null, extra.captions?.[1] ?? text.title ?? null],
 };
}

// ── Mundo 3 · máquina del laboratorio ───────────────────────────────────────
// «Lo que estoy construyendo». Por máquina (los textos, en content/cosmic.js).
// `status`: "published" (Publicada) o "building" (En construcción). `link`: a
// dónde lleva «Abrir la app»: el botón solo sale si está publicada Y hay enlace.
export const APP_STATUS = { published: "Publicada", building: "En construcción" };
export const APP_CARDS = {
 dosia: { status: "published", link: null, video: null, screens: [null, null] },
 viajes: { status: "building", link: null, video: null, screens: [null, null] },
 epidos: { status: "building", link: null, video: null, screens: [null, null] },
 chuchometro: { status: "building", link: null, video: null, screens: [null, null] },
};
// `text`: { name, tagline, paragraphs } de la máquina. `energy`: [encendidas, total].
export function appCard(id, text, energy) {
 const extra = APP_CARDS[id] ?? {};
 const status = extra.status ?? "building";
 return {
  variant: "maquina",
  kind: "machine",
  machine: id,
  status,
  statusLabel: APP_STATUS[status],
  title: text.name,
  tagline: text.tagline ?? null,
  paragraphs: text.paragraphs ?? [],
  energy: energy ? `Energía enviada al núcleo · ${energy[0]}/${energy[1]}` : null,
  images: extra.screens ?? [null, null],
  video: extra.video ?? null,
  link: status === "published" ? (extra.link ?? null) : null,
  linkLabel: "Abrir la app",
 };
}

// Qué carta le toca a lo que no trae la suya (avisos de viaje, el CV, el núcleo…): la del mundo en que se está.
export const WORLD_VARIANT = { living: "cartel", twisted: "colgante", cosmic: "maquina" };
