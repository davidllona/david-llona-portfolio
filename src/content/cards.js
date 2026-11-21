// LAS CARTAS (objetivo 25). Este es el archivo que se edita para completar lo que
// enseña la carta que se abre al pulsar E en cada mundo: papel de David en cada
// proyecto, enlaces, imágenes, vídeos y estado de cada app. Los textos de
// siempre siguen donde estaban (content/projects.js, twisted.js y cosmic.js);
// aquí va lo que las cartas nuevas añaden y, sobre todo, DÓNDE SE PONE EL MATERIAL.
//
// Lo que falta lleva «[PENDIENTE: David]». No hay nada inventado.
//
// ── Cómo añadir imágenes o vídeo (sin tocar ningún componente) ──────────────
//  · Los archivos se dejan en public/ y aquí se escribe su ruta pública:
//      public/images/projects/…   →  "/images/projects/mi-captura.png"
//      public/images/sobre-mi/…   →  "/images/sobre-mi/woody.jpg"
//      public/videos/…            →  "/videos/dosia.mp4"
//  · Mundo 1 (proyectos): `gallery` (lista de imágenes, en orden) y `video` (un vídeo corto; va el primero).
//  · Mundo 2 (paradas):   `photo` (una foto: sale como polaroid).
//  · Mundo 3 (apps):      `video` (silenciado y en bucle, con botón de sonido) o `screens` (capturas que pasan solas).
//  Mientras un campo esté vacío (null o []), la carta enseña su marcador dibujado.
export const PENDING = "[PENDIENTE: David]";
export const isPending = (value) => typeof value === "string" && /^\[(PENDIENTE|CONFIRMAR)/.test(value);

// ── Mundo 1 · ficha de proyecto ─────────────────────────────────────────────
// Por `id` del proyecto (content/projects.js). `role`: «Mi papel», en una frase.
// `code`: enlace al repositorio, si es público. `gallery`: si es null, usa las
// imágenes que el proyecto ya tiene (`images` en projects.js).
export const PROJECT_CARDS = {
 0: { role: PENDING, code: null, gallery: null, video: null },
 1: { role: PENDING, code: null, gallery: null, video: null },
 2: { role: PENDING, code: null, gallery: null, video: null },
 3: { role: PENDING, code: null, gallery: null, video: null },
};
export function projectCard(project) {
 const extra = PROJECT_CARDS[project.id] ?? {};
 return {
  variant: "ficha",
  kind: "project",
  eyebrow: "Proyecto",
  title: project.name,
  tagline: project.tagline,
  paragraphs: [project.description],
  role: extra.role ?? PENDING,
  year: project.year,
  tags: project.tags,
  color: project.color,
  gallery: extra.gallery ?? project.images ?? [],
  video: extra.video ?? null,
  link: project.link,
  linkLabel: "Ver proyecto",
  code: extra.code ?? null,
 };
}

// ── Mundo 2 · hoja de cuento ────────────────────────────────────────────────
// Por parada (los textos, en content/twisted.js). `ornament`: el adorno de la
// hoja (gear, paw, map, pad, clock, star). `photo`: la foto de la polaroid;
// `caption`: lo que lleva escrito debajo.
export const TALE_CARDS = {
 alquimista: { ornament: "gear", photo: null, caption: null },
 "casa-arbol": { ornament: "pad", photo: null, caption: null },
 casita: { ornament: "paw", photo: null, caption: "Woody" },
 invernadero: { ornament: "map", photo: null, caption: null },
 torre: { ornament: "clock", photo: null, caption: null },
 observatorio: { ornament: "star", photo: null, caption: null },
};
// `text`: { place, title, paragraphs } de la parada.
export function taleCard(id, text) {
 const extra = TALE_CARDS[id] ?? {};
 return { variant: "hoja", kind: "stop", stop: id, eyebrow: text.place, title: text.title, paragraphs: text.paragraphs, ornament: extra.ornament ?? "star", photo: extra.photo ?? null, caption: extra.caption ?? null, polaroid: Boolean(extra.caption) };
}

// ── Mundo 3 · holograma ─────────────────────────────────────────────────────
// «Lo que estoy construyendo». Por máquina (los textos, en content/cosmic.js).
// `status`: "published" (Publicada) o "building" (En construcción). `link`: a
// dónde lleva «Abrir la app» (solo sale si está publicada).
export const APP_STATUS = { published: "Publicada", building: "En construcción" };
export const APP_CARDS = {
 dosia: { status: "published", link: null /* PENDIENTE: David */, video: null, screens: [] },
 viajes: { status: "building", link: null, video: null, screens: [] },
 epidos: { status: "building", link: null, video: null, screens: [] },
 chuchometro: { status: "building", link: null, video: null, screens: [] },
 experimentos: { status: "building", link: null, video: null, screens: [] },
};
// `text`: { place, name, paragraphs } de la máquina.
export function appCard(id, text) {
 const extra = APP_CARDS[id] ?? {};
 return { variant: "holo", kind: "machine", machine: id, eyebrow: text.place, title: text.name, paragraphs: text.paragraphs, status: extra.status ?? "building", statusLabel: APP_STATUS[extra.status ?? "building"], link: extra.link ?? null, linkLabel: "Abrir la app", linkPending: PENDING, video: extra.video ?? null, screens: extra.screens ?? [] };
}
