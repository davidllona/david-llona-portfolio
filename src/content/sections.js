// Secciones del portfolio, en el orden en que se leen. `world` es el mundo en
// que vive cada una y `place`, el sitio de ese mundo al que Woody sabe llevar.
// Desde otro mundo, su botón ofrece viajar hasta allí en el cohete.
//  · The Living World: lo que hago (proyectos, CV y contacto).
//  · The Twisted Moon: quién soy («Sobre mí», convertido en un paseo).
export const SECTIONS = [
 { id: "proyectos", label: "Proyectos", world: "living", place: "proyectos" },
 { id: "sobre-mi", label: "Sobre mí", world: "twisted", place: "casa-tronco" },
 { id: "cv", label: "CV", world: "living", place: "cv" },
 { id: "contacto", label: "Contacto", world: "living", place: "contacto" },
];

// Lo que se ofrece al pulsar una sección que está en otro mundo (ficha con botón de viaje).
export const TRAVEL_OFFER = {
 living: {
  title: "Eso está en The Living World",
  paragraphs: ["Proyectos, CV y contacto están en el primer mundo: lo que hago.", "El cohete te lleva en un momento."],
  action: "Viajar a The Living World",
 },
 twisted: {
  title: "«Sobre mí» es ahora otro mundo",
  paragraphs: ["Quién soy se cuenta paseando por The Twisted Moon: cinco paradas en una luna torcida donde siempre es de noche.", "Sube al cohete: te lleva hasta allí."],
  action: "Viajar a The Twisted Moon",
 },
};
