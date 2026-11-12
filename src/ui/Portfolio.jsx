import { aboutText, mainOrbit, skillLayouts } from "../content/about";
import { CONTACT_LINKS } from "../content/contact";
import { CV } from "../content/cv";
import { DOSIA } from "../content/dosia";
import { LAB_PROJECTS } from "../content/lab";
import { PROJECTS } from "../content/projects";
import { emit } from "../experience/state";
import { SECTIONS } from "../content/sections";

const external = { target: "_blank", rel: "noopener noreferrer" };
const SKILLS = mainOrbit.nodes.map((node) => ({ name: node.label, detail: skillLayouts[node.id]?.description }));

// El portfolio como página legible: lo mismo que hay repartido por el planeta,
// sin tener que jugar. Lo usan el menú rápido, el modo directo y la versión sin WebGL.
// `onGuide(place)`: si se pasa, cada sección ofrece ir allí con Woody.
export function Portfolio({ onGuide }) {
 const guide = (section) =>
  onGuide && (
   <button type="button" className="portfolio__guide" onClick={() => onGuide(section.place)}>
    Ir allí con Woody <span aria-hidden="true">→</span>
   </button>
  );

 return (
  <div className="portfolio">
   <section id="proyectos" aria-labelledby="titulo-proyectos">
    <header className="portfolio__head">
     <h2 id="titulo-proyectos">Proyectos</h2>
     {guide(SECTIONS[0])}
    </header>
    <ul className="portfolio__projects">
     {PROJECTS.map((project) => (
      <li key={project.id} className="project" style={{ "--tint": project.color }}>
       <img className="project__image" src={project.images[0]} alt={`Captura de ${project.name}`} loading="lazy" />
       <div className="project__body">
        <p className="project__year">{project.year}</p>
        <h3 className="project__name">{project.name}</h3>
        <p className="project__tagline">{project.tagline}</p>
        <p className="project__text">{project.description}</p>
        <ul className="modal__tags">
         {project.tags.map((tag) => (
          <li key={tag}>{tag}</li>
         ))}
        </ul>
        <a className="modal__link" href={project.link} {...external} onClick={() => emit("project-link", { id: project.id })}>
         Ver proyecto <span aria-hidden="true">→</span>
        </a>
       </div>
      </li>
     ))}
     {DOSIA.ready && (
      <li className="project">
       {DOSIA.images[0] && <img className="project__image" src={DOSIA.images[0]} alt={`Captura de ${DOSIA.name}`} loading="lazy" />}
       <div className="project__body">
        <h3 className="project__name">{DOSIA.name}</h3>
        {DOSIA.tagline && <p className="project__tagline">{DOSIA.tagline}</p>}
        {DOSIA.description && <p className="project__text">{DOSIA.description}</p>}
        {Object.entries(DOSIA.links)
         .filter(([, href]) => href)
         .map(([store, href]) => (
          <a key={store} className="modal__link" href={href} {...external}>
           {store === "web" ? "Abrir" : store === "ios" ? "App Store" : "Google Play"} <span aria-hidden="true">→</span>
          </a>
         ))}
       </div>
      </li>
     )}
    </ul>

    <h3 className="portfolio__sub">Laboratorio</h3>
    <ul className="portfolio__lab">
     {LAB_PROJECTS.map((experiment) => (
      <li key={experiment.id}>
       <p className="project__year">{experiment.type}</p>
       <h4>{experiment.title}</h4>
       <p className="project__text">{experiment.description}</p>
       {experiment.url && (
        <a href={experiment.url} {...external}>
         Abrir experimento <span aria-hidden="true">→</span>
        </a>
       )}
      </li>
     ))}
    </ul>
   </section>

   <section id="sobre-mi" aria-labelledby="titulo-sobre-mi">
    <header className="portfolio__head">
     <h2 id="titulo-sobre-mi">Sobre mí</h2>
     {guide(SECTIONS[1])}
    </header>
    <p className="portfolio__lead">{aboutText.headline.join(" ")}</p>
    {aboutText.paragraphs.map((paragraph) => (
     <p key={paragraph} className="project__text">
      {paragraph}
     </p>
    ))}
    <ul className="portfolio__skills">
     {SKILLS.map((skill) => (
      <li key={skill.name}>
       <strong>{skill.name}</strong>
       {skill.detail && <span>{skill.detail}</span>}
      </li>
     ))}
    </ul>
   </section>

   <section id="cv" aria-labelledby="titulo-cv">
    <header className="portfolio__head">
     <h2 id="titulo-cv">CV</h2>
     {guide(SECTIONS[2])}
    </header>
    {CV.file ? (
     <>
      <p className="project__text">{CV.updated ? `Última versión: ${CV.updated}.` : "Versión actual en PDF."}</p>
      <a className="modal__link" href={CV.file} {...external}>
       Abrir el PDF <span aria-hidden="true">→</span>
      </a>
     </>
    ) : (
     <p className="project__text portfolio__pending">
      El PDF todavía no está publicado aquí. Mientras tanto, pídemelo por cualquiera de los enlaces de contacto.
     </p>
    )}
   </section>

   <section id="contacto" aria-labelledby="titulo-contacto">
    <header className="portfolio__head">
     <h2 id="titulo-contacto">Contacto</h2>
     {guide(SECTIONS[3])}
    </header>
    <ul className="portfolio__contact">
     {CONTACT_LINKS.map((link) => (
      <li key={link.label}>
       <a href={link.href} {...(link.href.startsWith("mailto:") ? {} : external)}>
        <span>{link.label}</span>
        <small>{link.href.replace(/^mailto:|^https?:\/\/(www\.)?/, "")}</small>
       </a>
      </li>
     ))}
    </ul>
   </section>
  </div>
 );
}
