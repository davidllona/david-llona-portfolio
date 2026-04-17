/**
 * Contact.jsx — Sección de contacto espacial
 *
 * UI con Tailwind CSS. Three.js en contact.js.
 * Microanimaciones: keyframes CSS + transiciones Tailwind.
 */

import { useRef, useEffect, useState } from "react";
import { initContactScene } from "../3d/contact";

// ─── Configuración ───────────────────────────────────────────────────────────
const EMAIL = "hello@davidllona.com";

const LINKS = [
  { label: "LinkedIn", href: "https://linkedin.com/in/davidllona",  Icon: IconLinkedIn },
  { label: "GitHub",   href: "https://github.com/davidllona",       Icon: IconGithub   },
  { label: "Email",    href: `mailto:${EMAIL}`,                      Icon: IconEmail    },
];

// ─── Iconos SVG inline ───────────────────────────────────────────────────────
function IconLinkedIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  );
}
function IconGithub() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
    </svg>
  );
}
function IconEmail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}

// ─── Keyframes (solo lo que Tailwind no puede expresar) ───────────────────────
const KEYFRAMES = `
  @keyframes cs-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes cs-dot-pulse {
    0%,100% { box-shadow: 0 0 5px 1px rgba(255,112,32,0.5);  }
    50%     { box-shadow: 0 0 11px 3px rgba(255,112,32,0.85); }
  }

  /* Entrada escalonada */
  .cs-a1 { animation: cs-fade-up 0.85s cubic-bezier(.22,1,.36,1) 0.05s both; }
  .cs-a2 { animation: cs-fade-up 0.85s cubic-bezier(.22,1,.36,1) 0.18s both; }
  .cs-a3 { animation: cs-fade-up 0.85s cubic-bezier(.22,1,.36,1) 0.30s both; }
  .cs-a4 { animation: cs-fade-up 0.85s cubic-bezier(.22,1,.36,1) 0.44s both; }
  .cs-a5 { animation: cs-fade-up 0.85s cubic-bezier(.22,1,.36,1) 0.58s both; }

  /* Pulso del punto del separador */
  .cs-pulse { animation: cs-dot-pulse 2.8s ease-in-out infinite; }

  /* Microanimación hover botón */
  .cs-btn-label { display:inline-block; transition: transform 0.28s ease; }
  .cs-btn-arrow { display:inline-block; transition: transform 0.28s ease; }
  .cs-btn:hover .cs-btn-label { transform: translateX(-2px); }
  .cs-btn:hover .cs-btn-arrow { transform: translateX(5px);  }

  /* Shimmer sutil sobre el botón al hover */
  .cs-btn { position: relative; overflow: hidden; }
  .cs-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      transparent 0%, rgba(255,112,32,0.07) 50%, transparent 100%);
    opacity: 0;
    transition: opacity 0.4s;
  }
  .cs-btn:hover::before { opacity: 1; }
`;

// ─── Componente ──────────────────────────────────────────────────────────────
export function Contact() {
  const mountRef              = useRef(null);
  const [uiVisible, setUiVisible] = useState(false);
  const [emailVal,  setEmailVal]  = useState("");
  const [sent,      setSent]      = useState(false);

  useEffect(() => {
    const cleanup = initContactScene(mountRef.current, () => setUiVisible(true));
    return cleanup;
  }, []);

  function handleSend(e) {
    e.preventDefault();
    if (!emailVal.trim()) return;
    setSent(true);
  }

  // Handlers de hover para elementos sin variante Tailwind arbitraria
  const inputFocus   = (e) => { const el = e.currentTarget; el.style.borderColor = "rgba(255,112,32,0.65)"; el.style.background = "rgba(255,112,32,0.05)"; };
  const inputBlur    = (e) => { const el = e.currentTarget; el.style.borderColor = "rgba(255,255,255,0.32)"; el.style.background = "rgba(255,255,255,0.055)"; };
  const btnEnter     = (e) => { const el = e.currentTarget; el.style.background = "#ff7020"; el.style.borderColor = "#ff7020"; el.style.color = "#000"; };
  const btnLeave     = (e) => { const el = e.currentTarget; el.style.background = "transparent"; el.style.borderColor = "rgba(255,112,32,0.78)"; el.style.color = "#ffffff"; };
  const iconEnter    = (e) => { const el = e.currentTarget; el.style.borderColor = "rgba(255,112,32,0.65)"; el.style.color = "#ff7020"; el.style.boxShadow = "0 0 16px rgba(255,112,32,0.18)"; };
  const iconLeave    = (e) => { const el = e.currentTarget; el.style.borderColor = "rgba(255,255,255,0.26)"; el.style.color = "rgba(200,205,225,0.78)"; el.style.boxShadow = "none"; };

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* ── Sección raíz ── */}
      <section
        id="contact"
        className="relative w-full min-h-screen overflow-hidden flex flex-col"
        style={{ background: "#010108", fontFamily: "'Courier New', monospace" }}
      >

        {/* ── Canvas Three.js ── */}
        <div ref={mountRef} className="absolute inset-0 z-0" aria-hidden="true" />

        {/* ── Gradiente de fusión ── */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom,
              transparent        0%,
              transparent        28%,
              rgba(1,1,8,0.65)   50%,
              rgba(1,1,8,0.93)   72%,
              rgba(1,1,8,0.99)  100%)`,
          }}
          aria-hidden="true"
        />

        {/*
          ── UI overlay ──
          justify-center + items-center → centrado perfecto en el viewport.
          La transición del bloque completo es suave y unificada.
          Los hijos animan en stagger con cs-a1…cs-a5.
        */}
        <div
          className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 pb-4"
          style={{
            opacity   : uiVisible ? 1 : 0,
            transform : uiVisible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 1.15s cubic-bezier(.22,1,.36,1), transform 1.15s cubic-bezier(.22,1,.36,1)",
          }}
        >
          {/* Contenedor con max-width para no estirar demasiado en pantallas anchas */}
          <div className="w-full max-w-[480px] flex flex-col items-center">


            {/* Título */}
            <h2
              className="cs-a2 m-0 mb-1 text-center text-white uppercase font-normal"
              style={{
                fontFamily  : "'Georgia', 'Times New Roman', serif",
                fontSize    : "clamp(40px, 6.5vw, 76px)",
                letterSpacing: "0.24em",
                textShadow  : "0 0 60px rgba(255,255,255,0.16), 0 2px 8px rgba(0,0,0,0.9)",
              }}
            >
              Hablemos<span className="text-orange-500">.</span>
            </h2>

            {/* Separador */}
            <div className="cs-a2 flex items-center gap-2 my-5" aria-hidden="true">
              <span
                className="block h-px"
                style={{
                  width     : "clamp(36px, 5vw, 64px)",
                  background: "linear-gradient(to right, transparent, rgba(255,255,255,0.35))",
                }}
              />
              <span className="cs-pulse block w-1 h-1 rounded-full bg-orange-500" />
              <span
                className="block h-px"
                style={{
                  width     : "clamp(36px, 5vw, 64px)",
                  background: "linear-gradient(to left, transparent, rgba(255,255,255,0.35))",
                }}
              />
            </div>

            {/* Subtexto */}
            <p
              className="cs-a3 text-center leading-relaxed mb-8"
              style={{
                fontSize    : "clamp(13px, 1.35vw, 15px)",
                letterSpacing: "0.07em",
                color       : "rgba(220,224,238,0.90)",
                textShadow  : "0 1px 4px rgba(0,0,0,0.75)",
              }}
            >
              ¿Tienes un proyecto en mente?<br />
              Me encantaría saber de él.
            </p>

            {/* Formulario */}
            <div className="cs-a4 w-full flex flex-col gap-3">
              {sent ? (
                <p
                  className="text-center uppercase py-4"
                  style={{ fontSize: "12px", letterSpacing: "0.22em", color: "rgba(255,255,255,0.88)" }}
                >
                  ✦ &nbsp;Recibido — te respondo pronto
                </p>
              ) : (
                <>
                  {/* Input */}
                  <label
                    htmlFor="cs-email"
                    className="flex items-center gap-3 px-4 cursor-text"
                    style={{
                      height    : "50px",
                      border    : "1px solid rgba(255,255,255,0.32)",
                      background: "rgba(255,255,255,0.055)",
                      transition: "border-color 0.3s, background 0.3s",
                    }}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  >
                    <span style={{ color: "rgba(255,112,32,0.88)", display: "flex", flexShrink: 0 }}>
                      <IconEmail />
                    </span>
                    <input
                      id="cs-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={emailVal}
                      onChange={(e) => setEmailVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend(e)}
                      autoComplete="email"
                      aria-label="Tu dirección de email"
                      className="flex-1 bg-transparent border-none outline-none"
                      style={{
                        fontFamily   : "'Courier New', monospace",
                        fontSize     : "13px",
                        letterSpacing: "0.05em",
                        color        : "rgba(235,237,245,0.95)",
                      }}
                      onFocus={(e) => inputFocus({ currentTarget: e.target.closest("label") })}
                      onBlur={(e)  => inputBlur({ currentTarget: e.target.closest("label") })}
                    />
                  </label>

                  {/* Botón */}
                  <button
                    type="button"
                    onClick={handleSend}
                    className="cs-btn flex items-center justify-center gap-3 w-full uppercase cursor-pointer"
                    style={{
                      height       : "50px",
                      fontFamily   : "'Courier New', monospace",
                      fontSize     : "11px",
                      letterSpacing: "0.28em",
                      background   : "transparent",
                      border       : "1px solid rgba(255,112,32,0.78)",
                      color        : "#ffffff",
                    }}
                    onMouseEnter={btnEnter}
                    onMouseLeave={btnLeave}
                  >
                    <span className="cs-btn-label">Enviar mensaje</span>
                    <span className="cs-btn-arrow" aria-hidden="true">→</span>
                  </button>
                </>
              )}
            </div>

            {/* Redes */}
            <div className="cs-a5 flex flex-col items-center gap-4 mt-10">
              <span
                className="flex items-center gap-2.5 uppercase"
                style={{ fontSize: "9px", letterSpacing: "0.30em", color: "rgba(190,195,220,0.62)" }}
              >
                <span className="block w-4 h-px" style={{ background: "rgba(190,195,220,0.38)" }} />
                Respuestas desde la Tierra
                <span className="block w-4 h-px" style={{ background: "rgba(190,195,220,0.38)" }} />
              </span>

              <div className="flex gap-3.5">
                {LINKS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target={href.startsWith("mailto") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex items-center justify-center rounded-sm"
                    style={{
                      width : "38px",
                      height: "38px",
                      border: "1px solid rgba(255,255,255,0.26)",
                      color : "rgba(200,205,225,0.78)",
                      transition: "border-color 0.3s, color 0.3s, box-shadow 0.3s",
                    }}
                    onMouseEnter={iconEnter}
                    onMouseLeave={iconLeave}
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>

          </div>{/* /max-w */}
        </div>{/* /UI overlay */}

        {/* Footer */}
        <footer
          className="relative z-20 flex justify-between items-center px-6 py-3"
          style={{
            borderTop    : "1px solid rgba(255,255,255,0.09)",
            fontSize     : "9px",
            letterSpacing: "0.20em",
            color        : "rgba(160,165,185,0.48)",
            textTransform: "uppercase",
            fontFamily   : "'Courier New', monospace",
          }}
        >
          <span>David Llona &nbsp;·&nbsp; {new Date().getFullYear()}</span>
          <span>Madrid, España</span>
        </footer>

      </section>
    </>
  );
}