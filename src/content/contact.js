export const EMAIL = "hello@davidllona.com";

// El cartel de madera de Contacto (el mismo de los proyectos, sin imágenes): las tres vías y, de botón, el correo.
export const contactCard = () => ({ variant: "cartel", kind: "contact", eyebrow: "Contacto", title: "Escríbeme", paragraphs: [EMAIL], links: CONTACT_LINKS.filter((link) => !link.href.startsWith("mailto:")), link: `mailto:${EMAIL}`, linkLabel: "Escribirme un email" });

export const CONTACT_LINKS = [
 { label: "LinkedIn", href: "https://es.linkedin.com/in/david-llona-martin-a5478a1b8" },
 { label: "GitHub", href: "https://github.com/davidllona" },
 { label: "Email", href: `mailto:${EMAIL}` },
];
