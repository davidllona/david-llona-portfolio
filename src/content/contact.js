export const EMAIL = "hello@davidllona.com";

export const CONTACT_LINKS = [
 { label: "LinkedIn", href: "https://es.linkedin.com/in/david-llona-martin-a5478a1b8" },
 { label: "GitHub", href: "https://github.com/davidllona" },
 { label: "Email", href: `mailto:${EMAIL}` },
];
const PROFILES = CONTACT_LINKS.filter((link) => !link.href.startsWith("mailto:"));

// Desde el objetivo 27 el contacto vive en The Cosmic Lab, al final del recorrido:
// la antena del laboratorio («Envía una señal») y, junto a ella, tres terminales.
// Pero el botón «Contacto» del menú lo abre directamente en cualquier mundo, sin
// viajar: esta es esa carta (en cada mundo, con su objeto: el cartel de madera
// en los dos primeros, la máquina en el laboratorio).
export const contactCard = (worldId = "living") => ({
 variant: worldId === "cosmic" ? "maquina" : "cartel",
 kind: "contact",
 eyebrow: "Contacto",
 title: "Escríbeme",
 paragraphs: [EMAIL],
 links: PROFILES,
 link: `mailto:${EMAIL}`,
 linkLabel: "Escribirme un email",
});

// La antena del laboratorio. Funciona siempre, con o sin las máquinas encendidas.
export const signalCard = () => ({
 variant: "maquina",
 kind: "antenna",
 eyebrow: "Contacto",
 title: "Envía una señal",
 tagline: "La antena del laboratorio",
 paragraphs: ["Desde aquí me llega lo que me mandes. Elige el canal:", EMAIL],
 links: PROFILES,
 link: `mailto:${EMAIL}`,
 linkLabel: "Escribirme un email",
});

// Los tres terminales de junto a la antena: uno por canal, cada uno con su botón.
export const TERMINAL_CARDS = {
 LinkedIn: { title: "LinkedIn", tagline: "Terminal de señal · turquesa", paragraphs: ["Mi perfil profesional: experiencia, proyectos y cómo contactar conmigo."], link: CONTACT_LINKS[0].href, linkLabel: "Abrir LinkedIn" },
 GitHub: { title: "GitHub", tagline: "Terminal de señal · magenta", paragraphs: ["Mi código: los repositorios públicos, incluido el de este portfolio."], link: CONTACT_LINKS[1].href, linkLabel: "Abrir GitHub" },
 Email: { title: "Email", tagline: "Terminal de señal · lima", paragraphs: ["Escríbeme directamente:", EMAIL], link: CONTACT_LINKS[2].href, linkLabel: "Escribirme un email" },
};
export const terminalCard = (label) => ({ variant: "maquina", kind: "contact", eyebrow: "Contacto", ...TERMINAL_CARDS[label] });

// El poste del mundo 1, donde estaba la casita de contacto: ofrece el viaje y
// enseña el correo (y los perfiles) sin tener que ir.
export const contactPostCard = () => ({
 variant: "cartel",
 kind: "travel",
 eyebrow: "Contacto",
 title: "El contacto está en The Cosmic Lab",
 paragraphs: ["La antena del laboratorio envía tu señal: es el final del recorrido.", `¿Tienes prisa? Escríbeme a ${EMAIL}`],
 links: CONTACT_LINKS,
 voyage: "cosmic",
 action: "Viajar a The Cosmic Lab",
});
