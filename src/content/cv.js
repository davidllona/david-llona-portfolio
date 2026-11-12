// Currículum. `file` es la ruta pública del PDF (por ejemplo "/cv/david-llona.pdf",
// con el archivo en public/cv/). Mientras sea null, la interfaz lo muestra como
// pendiente y no ofrece ninguna descarga.
export const CV = {
 file: null,
 updated: null, // fecha de la última versión, en texto: "noviembre de 2026"
};

// Ficha que se abre al pedir el CV. Sin PDF, lo dice y no ofrece descarga.
export function cvCard() {
 if (!CV.file) {
  return {
   kind: "cv",
   eyebrow: "Currículum",
   title: "CV pendiente de subir",
   paragraphs: ["El PDF todavía no está publicado aquí. Mientras tanto, puedes pedírmelo desde cualquiera de los enlaces de Contacto."],
  };
 }
 return {
  kind: "cv",
  eyebrow: "Currículum",
  title: "CV de David Llona",
  paragraphs: [CV.updated ? `Última versión: ${CV.updated}.` : "Versión actual en PDF."],
  link: CV.file,
  linkLabel: "Abrir el PDF",
 };
}
