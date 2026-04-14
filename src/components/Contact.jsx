/**
 * Contact.jsx — Dirección 3: "Señal abierta"
 *
 * El email es el elemento tipográfico protagonista.
 * Minimalismo extremo, mucho espacio, fondo #03030a.
 * Coherente con el universo visual del portfolio.
 */
export function Contact() {
  return (
    <section
      id="contact"
      style={{ background: "#03030a" }}
      className="relative w-full px-6 md:px-12 lg:px-20 pt-28 pb-24 overflow-hidden"
    >
      {/* Degradado radial muy tenue — recoge el void del hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 100%, rgba(30,45,120,0.13) 0%, transparent 70%)",
        }}
      />

      {/* ── Etiqueta superior ─────────────────────────────── */}
      <div className="relative flex items-center gap-4 mb-16 md:mb-20">
        <span
          style={{
            fontFamily: "'Courier New', 'Lucida Console', monospace",
            fontSize: "10px",
            letterSpacing: "0.22em",
            color: "rgba(122,168,255,0.5)",
          }}
        >
          CONTACT
        </span>
        <span
          style={{
            fontFamily: "'Courier New', 'Lucida Console', monospace",
            fontSize: "10px",
            letterSpacing: "0.18em",
            color: "rgba(80,100,160,0.35)",
          }}
        >
          / 2026
        </span>
        {/* Línea decorativa */}
        <div
          style={{
            flex: 1,
            height: "1px",
            background:
              "linear-gradient(to right, rgba(60,80,140,0.35), transparent)",
          }}
        />
      </div>

      {/* ── Email gigante ─────────────────────────────────── */}
      <div className="relative mb-12 md:mb-16">
        <a
          href="mailto:hello@davidllona.com"
          className="group block w-full"
          aria-label="Enviar email a hello@davidllona.com"
        >
          {/* El email escala para llenar el ancho disponible */}
          <span
            className="block leading-none transition-colors duration-500"
            style={{
              fontFamily: "'Courier New', 'Lucida Console', monospace",
              fontWeight: 700,
              /* Fluid: 48px en móvil → ~96px en desktop ancho */
              fontSize: "clamp(2.8rem, 7.5vw, 6rem)",
              letterSpacing: "-0.02em",
              color: "rgba(220,232,255,0.88)",
              /* Hover: color más cálido, toque del acento naranja */
              transition: "color 0.4s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,200,140,0.92)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(220,232,255,0.88)";
            }}
          >
            hello@davidllona.com
          </span>

          {/* Línea bajo el email — se expande al hover */}
          <div
            className="mt-4 h-px origin-left transition-all duration-500 group-hover:opacity-60"
            style={{
              background:
                "linear-gradient(to right, rgba(122,168,255,0.45), rgba(255,160,80,0.2), transparent)",
              transform: "scaleX(1)",
            }}
          />
        </a>
      </div>

      {/* ── Fila inferior: frase + redes ─────────────────── */}
      <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        {/* Frase izquierda */}
        <p
          style={{
            fontFamily: "'Courier New', 'Lucida Console', monospace",
            fontSize: "12px",
            letterSpacing: "0.12em",
            color: "rgba(140,160,210,0.5)",
            lineHeight: 1.7,
            maxWidth: "28rem",
          }}
        >
          Disponible para proyectos seleccionados.
          <br />
          Diseño · Frontend · Experiencias 3D
        </p>

        {/* Redes derecha */}
        <div className="flex items-center gap-8">
          <a
            href="https://github.com/davidllona"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 transition-colors duration-300"
            style={{ color: "rgba(160,180,230,0.45)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(220,232,255,0.85)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(160,180,230,0.45)";
            }}
          >
            <span
              style={{
                fontFamily: "'Courier New', 'Lucida Console', monospace",
                fontSize: "11px",
                letterSpacing: "0.14em",
              }}
            >
              GITHUB
            </span>
            {/* Flecha diagonal */}
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              style={{ opacity: 0.6 }}
            >
              <path
                d="M1 9L9 1M9 1H3M9 1V7"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
          </a>

          <a
            href="https://linkedin.com/in/davidllona"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 transition-colors duration-300"
            style={{ color: "rgba(160,180,230,0.45)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(220,232,255,0.85)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(160,180,230,0.45)";
            }}
          >
            <span
              style={{
                fontFamily: "'Courier New', 'Lucida Console', monospace",
                fontSize: "11px",
                letterSpacing: "0.14em",
              }}
            >
              LINKEDIN
            </span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              style={{ opacity: 0.6 }}
            >
              <path
                d="M1 9L9 1M9 1H3M9 1V7"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
          </a>
        </div>
      </div>

      {/* ── Número decorativo de fondo ────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-6 md:right-12 lg:right-20 select-none"
        style={{
          fontFamily: "'Courier New', 'Lucida Console', monospace",
          fontWeight: 700,
          fontSize: "clamp(6rem, 18vw, 14rem)",
          lineHeight: 1,
          color: "rgba(30,50,120,0.07)",
          letterSpacing: "-0.04em",
          userSelect: "none",
        }}
      >
        TX
      </div>
    </section>
  );
}