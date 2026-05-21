

import { useRef, useEffect, useState, useReducer, useMemo } from "react";
import { initContactScene } from "../3d/contact";
import { onGuiReady, attachContactGUI } from "../3d/hero/gui";
import { BackgroundStars } from "../3d/ConstellationScene";


const EMAIL = "hello@davidllona.com";

const LINKS = [
 { label: "LinkedIn", href: "https://es.linkedin.com/in/david-llona-martin-a5478a1b8", Icon: IconLinkedIn },
 { label: "GitHub", href: "https://github.com/davidllona", Icon: IconGithub },
 { label: "Email", href: `mailto:${EMAIL}`, Icon: IconEmail },
];


function IconLinkedIn() {
 return (
  <svg
   width="18"
   height="18"
   viewBox="0 0 24 24"
   fill="none"
   stroke="currentColor"
   strokeWidth="1.6"
   strokeLinecap="round"
   strokeLinejoin="round"
  >
   <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
   <rect x="2" y="9" width="4" height="12" />
   <circle cx="4" cy="4" r="2" />
  </svg>
 );
}
function IconGithub() {
 return (
  <svg
   width="18"
   height="18"
   viewBox="0 0 24 24"
   fill="none"
   stroke="currentColor"
   strokeWidth="1.6"
   strokeLinecap="round"
   strokeLinejoin="round"
  >
   <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
 );
}
function IconEmail() {
 return (
  <svg
   width="18"
   height="18"
   viewBox="0 0 24 24"
   fill="none"
   stroke="currentColor"
   strokeWidth="1.6"
   strokeLinecap="round"
   strokeLinejoin="round"
  >
   <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
   <polyline points="22,6 12,13 2,6" />
  </svg>
 );
}




function makeUIDefaults() {
 return {

  titleText: "Hablemos",
  titlePunct: ".", // el punto naranja al final
  titleDotColor: "#f97316", // tailwind orange-500
  titleFontSizeMax: 76, // px (clamp lo escala en mobile)
  titleLetterSpacing: 0.24, // em


  subtextLine1: "¿Tienes un proyecto en mente?",
  subtextLine2: "Me encantaría saber de él.",
  subtextFontSizeMax: 16, // px
  subtextLineHeight: 1.65,
  subtextOpacity: 0.88,


  emailPlaceholder: "tu@email.com",
  buttonLabel: "Enviar mensaje",
  sentMessage: "Recibido — te respondo pronto",


  footerLeft: `David Llona · ${new Date().getFullYear()}`,
  footerRight: "Madrid, España",


  formMaxWidth: 480, // px
 };
}


const KEYFRAMES = `
  
  @keyframes cs-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  .cs-a1 { animation: cs-fade-up .85s cubic-bezier(.22,1,.36,1) .05s both; }
  .cs-a2 { animation: cs-fade-up .85s cubic-bezier(.22,1,.36,1) .18s both; }
  .cs-a3 { animation: cs-fade-up .85s cubic-bezier(.22,1,.36,1) .30s both; }
  .cs-a4 { animation: cs-fade-up .85s cubic-bezier(.22,1,.36,1) .44s both; }
  .cs-a5 { animation: cs-fade-up .85s cubic-bezier(.22,1,.36,1) .58s both; }

  
  @keyframes cs-dot-pulse {
    0%,100% { box-shadow: 0 0 5px 1px rgba(255,112,32,0.5);  }
    50%     { box-shadow: 0 0 11px 3px rgba(255,112,32,0.85); }
  }
  .cs-pulse { animation: cs-dot-pulse 2.8s ease-in-out infinite; }

  
  .cs-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 56px;
    padding: 0 18px;
    border: 1px solid rgba(255,255,255,0.13);
    background: rgba(255,255,255,0.02);
    border-radius: 6px;
    cursor: text;
    transition: border-color .35s, background .35s, box-shadow .35s;
  }
  .cs-input-wrap:focus-within {
    border-color: rgba(255,112,32,0.55);
    background: rgba(255,112,32,0.025);
    box-shadow:
      0 0 32px rgba(255,112,32,0.12),
      inset 0 0 16px rgba(255,112,32,0.03);
  }

  .cs-input-icon {
    color: rgba(180,185,210,0.50);
    display: flex;
    flex-shrink: 0;
    transition: color .35s, transform .35s;
  }
  .cs-input-wrap:focus-within .cs-input-icon {
    color: rgba(255,150,80,0.95);
    transform: scale(1.04);
  }

  .cs-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 14px;
    letter-spacing: -0.005em;
    color: rgba(235,237,245,0.96);
  }
  .cs-input::placeholder {
    color: rgba(180,185,210,0.38);
  }

  
  .cs-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    height: 56px;
    padding: 0 22px;
    border-radius: 6px;
    background: rgba(255,112,32,0.045);
    border: 1px solid rgba(255,112,32,0.50);
    color: rgba(255,255,255,0.95);
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    cursor: pointer;
    overflow: hidden;
    transition: background .4s, border-color .4s, transform .15s, box-shadow .4s;
    box-shadow:
      0 0 28px rgba(255,112,32,0.10),
      inset 0 0 18px rgba(255,112,32,0.04);
  }
  .cs-btn::before {
    content: '';
    position: absolute;
    top: 0; left: -120%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(255,112,32,0.18) 50%,
      transparent 100%);
    transition: left .9s cubic-bezier(.22,1,.36,1);
    pointer-events: none;
  }
  .cs-btn:hover {
    background: rgba(255,112,32,0.10);
    border-color: rgba(255,112,32,0.85);
    box-shadow:
      0 0 48px rgba(255,112,32,0.22),
      inset 0 0 26px rgba(255,112,32,0.08);
  }
  .cs-btn:hover::before { left: 120%; }
  .cs-btn:active { transform: scale(0.99); }

  .cs-btn-label,
  .cs-btn-arrow {
    position: relative;
    z-index: 1;
    display: inline-block;
    transition: transform .28s ease;
  }
  .cs-btn:hover .cs-btn-label { transform: translateX(-2px); }
  .cs-btn:hover .cs-btn-arrow { transform: translateX(5px);  }

  
  .cs-sent {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 56px;
    border-radius: 6px;
    border: 1px solid rgba(120,200,140,0.40);
    background: rgba(120,200,140,0.04);
    color: rgba(220,255,230,0.95);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.02em;
    box-shadow: 0 0 28px rgba(120,200,140,0.10);
  }
  .cs-sent-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #6dd28e;
    box-shadow: 0 0 10px rgba(120,210,140,0.85);
  }

  
  .cs-nodes {
    display: flex;
    gap: 14px;
    align-items: center;
    justify-content: center;
  }
  .cs-node {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.13);
    background: rgba(255,255,255,0.02);
    color: rgba(220,225,240,0.70);
    text-decoration: none;
    transition: border-color .4s, background .4s, color .4s, transform .4s, box-shadow .4s;
  }
  .cs-node::before {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    background: radial-gradient(circle,
      rgba(255,112,32,0.22) 0%,
      rgba(255,112,32,0.06) 45%,
      transparent 70%);
    opacity: 0;
    transition: opacity .45s;
    pointer-events: none;
    z-index: -1;
  }
  .cs-node:hover {
    border-color: rgba(255,112,32,0.55);
    background: rgba(255,112,32,0.05);
    color: rgba(255,255,255,0.98);
    transform: translateY(-2px);
    box-shadow: 0 0 22px rgba(255,112,32,0.20);
  }
  .cs-node:hover::before { opacity: 1; }
  .cs-node:focus-visible {
    outline: 1px solid rgba(255,112,32,0.65);
    outline-offset: 4px;
  }

  
.cs-headline {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 200;
  font-size: clamp(48px, 8.5vw, 124px);
  letter-spacing: 0.14em;
  line-height: 1;
  color: rgba(248, 250, 255, 0.97);
  display: flex;
  justify-content: center;
  align-items: baseline;
  width: 100%;
  margin: 0 0 1.2rem 0;
  padding: 0;
  user-select: none;
  cursor: default;
  white-space: nowrap;
}

.cs-glyph {
  display: inline-block;
  position: relative;
  
  min-width: 0.78em;
  text-align: center;
  transition: color 0.35s ease, text-shadow 0.45s ease, transform 0.4s cubic-bezier(0.18, 1.2, 0.4, 1);
  will-change: color, text-shadow, transform;
}


.cs-glyph.is-scrambling {
  color: rgba(140, 180, 220, 0.55);
  text-shadow: 0 0 2px rgba(120, 170, 220, 0.4);
  filter: blur(0.4px);
}


.cs-glyph.is-locked {
  color: rgba(248, 250, 255, 0.97);
  text-shadow:
    0 0 14px rgba(255, 255, 255, 0.18),
    0 0 32px rgba(255, 220, 180, 0.10);
  filter: none;
  animation: cs-glyph-lock 0.55s cubic-bezier(0.2, 1.3, 0.35, 1) both;
}


@keyframes cs-glyph-lock {
  0% {
    transform: scale(1.18);
    text-shadow:
      0 0 22px rgba(255, 200, 140, 0.85),
      0 0 44px rgba(255, 160, 80, 0.45);
  }
  60% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1);
    text-shadow:
      0 0 14px rgba(255, 255, 255, 0.18),
      0 0 32px rgba(255, 220, 180, 0.10);
  }
}


.cs-period {
  color: rgba(80, 60, 40, 0.0); 
  margin-left: 0.04em;
  min-width: auto;
}
.cs-period.is-locked {
  color: #ff7a3d;
  text-shadow:
    0 0 18px rgba(255, 122, 61, 0.55),
    0 0 36px rgba(255, 122, 61, 0.25);
  animation: cs-period-confirm 0.7s cubic-bezier(0.2, 1.4, 0.4, 1) both;
}
@keyframes cs-period-confirm {
  0%   { opacity: 0; transform: scale(0); }
  55%  { opacity: 1; transform: scale(1.7); }
  100% { opacity: 1; transform: scale(1); }
}


@media (prefers-reduced-motion: reduce) {
  .cs-glyph.is-scrambling,
  .cs-glyph.is-locked {
    animation: none;
    transition: none;
  }
}
`;


function HablemosHeadline() {
 const ref = useRef(null);
 const [visible, setVisible] = useState(false);
 const [, forceRender] = useReducer((x) => x + 1, 0);

 const FINAL = "HABLEMOS";
 const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ▓▒░◆◇◈△▽⊙⊕#%&*+=<>/\\";



 const charsRef = useRef(FINAL.split("").map(() => "▓"));
 const lockedRef = useRef(FINAL.split("").map(() => false));
 const periodLockedRef = useRef(false);


 useEffect(() => {
  if (!ref.current) return;
  const obs = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), { threshold: 0.35 });
  obs.observe(ref.current);
  return () => obs.disconnect();
 }, []);


 useEffect(() => {
  if (!visible) return;
  let mounted = true;
  let tickId = 0;







  const SCRAMBLE_RATE = 70; // ms — un pelín más lento, más legible
  const PRE_LOCK = 1100; // ms — segundo entero de scramble antes de fijar
  const LOCK_STAGGER = 230; // ms — entre cada letra fijada
  const PERIOD_DELAY = 320; // ms — pausa antes del punto naranja

  const tick = () => {
   if (!mounted) return;
   charsRef.current = charsRef.current.map((_, i) => {
    if (lockedRef.current[i]) return FINAL[i];
    return SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
   });
   forceRender();
   tickId = window.setTimeout(tick, SCRAMBLE_RATE);
  };
  tick();

  const lockTimers = FINAL.split("").map((_, i) =>
   window.setTimeout(
    () => {
     if (!mounted) return;
     lockedRef.current[i] = true;
     charsRef.current[i] = FINAL[i];
     forceRender();
    },
    PRE_LOCK + i * LOCK_STAGGER,
   ),
  );

  const periodTimer = window.setTimeout(
   () => {
    if (!mounted) return;
    periodLockedRef.current = true;
    forceRender();
   },
   PRE_LOCK + FINAL.length * LOCK_STAGGER + PERIOD_DELAY,
  );

  return () => {
   mounted = false;
   clearTimeout(tickId);
   lockTimers.forEach(clearTimeout);
   clearTimeout(periodTimer);
  };
 }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

 return (
  <h1 ref={ref} className={`cs-headline ${visible ? "is-visible" : ""}`} aria-label="Hablemos">
   {charsRef.current.map((c, i) => (
    <span key={i} className={`cs-glyph ${lockedRef.current[i] ? "is-locked" : "is-scrambling"}`} aria-hidden="true">
     {c}
    </span>
   ))}
   <span className={`cs-glyph cs-period ${periodLockedRef.current ? "is-locked" : ""}`} aria-hidden="true">
    .
   </span>
  </h1>
 );
}


export function Contact() {
 const mountRef = useRef(null);
 const [uiVisible, setUiVisible] = useState(false);
 const [emailVal, setEmailVal] = useState("");
 const [sent, setSent] = useState(false);




 const uiParams = useRef(makeUIDefaults());
 const [, forceRender] = useReducer((x) => x + 1, 0);

 useEffect(() => {
  const cleanup = initContactScene(mountRef.current, () => setUiVisible(true));



  const offGui = onGuiReady((gui) => {
   if (cleanup) {
    attachContactGUI(gui, cleanup, {
     uiParams: uiParams.current,
     onUIChange: forceRender,
    });
   }
  });

  return () => {
   offGui();
   if (cleanup) cleanup();
  };
 }, []);

function handleSend(e) {
  e.preventDefault();

  if (!emailVal.trim()) return;

  const subject = encodeURIComponent(
    "Nuevo contacto desde la web"
  );

  const body = encodeURIComponent(
    `Email del visitante: ${emailVal}`
  );

  window.location.href =
    `mailto:dllonaProgramador@gmail.com?subject=${subject}&body=${body}`;

  setSent(true);
}


 const u = uiParams.current;

 return (
  <>
   <style>{KEYFRAMES}</style>
   <section
    id="contact"
    className="relative flex min-h-screen w-full flex-col overflow-hidden"
    style={{ background: "#05070b" }}
   >
    {}
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
     <BackgroundStars />
    </div>

    {}
    <div ref={mountRef} className="absolute inset-0 z-[1]" aria-hidden="true" />

    {}
    <div
  className="pointer-events-none absolute inset-0 z-10"
  style={{
    background: `linear-gradient(to bottom,
      
      rgba(5, 7, 11, 1.00)   0%,
      rgba(5, 7, 11, 0.85)   3%,
      rgba(5, 7, 11, 0.50)   8%,
      rgba(5, 7, 11, 0.18)  14%,
      rgba(5, 7, 11, 0.0)   22%,

      
      rgba(5, 7, 11, 0.0)   60%,

      
      rgba(5, 7, 11, 0.18)  78%,
      rgba(5, 7, 11, 0.42) 100%
    )`,
  }}
  aria-hidden="true"
/>

    {}
    <div
     className="relative z-20 flex flex-1 flex-col items-center justify-center px-6 pb-4"
     style={{
      opacity: uiVisible ? 1 : 0,
      transform: uiVisible ? "translateY(0)" : "translateY(24px)",
      transition: "opacity 1.15s cubic-bezier(.22,1,.36,1), transform 1.15s cubic-bezier(.22,1,.36,1)",
     }}
    >
     {}
     <HablemosHeadline />

     <div className="flex w-full flex-col items-center" style={{ maxWidth: `${u.formMaxWidth}px` }}>
      {}
      <div className="cs-a2 my-5 flex items-center gap-2" aria-hidden="true">
       <span
        className="block h-px"
        style={{
         width: "clamp(36px, 5vw, 64px)",
         background: "linear-gradient(to right, transparent, rgba(255,255,255,0.35))",
        }}
       />
       <span className="cs-pulse block h-1 w-1 rounded-full" style={{ background: u.titleDotColor }} />
       <span
        className="block h-px"
        style={{
         width: "clamp(36px, 5vw, 64px)",
         background: "linear-gradient(to left, transparent, rgba(255,255,255,0.35))",
        }}
       />
      </div>

      {}
      <p
       className="cs-a3 mb-10 text-center"
       style={{
        fontSize: `clamp(14px, 1.35vw, ${u.subtextFontSizeMax}px)`,
        lineHeight: u.subtextLineHeight,
        letterSpacing: "-0.005em",
        color: `rgba(220,224,238,${u.subtextOpacity})`,
        textShadow: "0 1px 4px rgba(0,0,0,0.75)",
       }}
      >
       {u.subtextLine1}
       <br />
       {u.subtextLine2}
      </p>

      {}
      <div className="cs-a4 flex w-full flex-col gap-3">
       {sent ? (
        <div className="cs-sent" role="status">
         <span className="cs-sent-dot" aria-hidden />
         <span>{u.sentMessage}</span>
        </div>
       ) : (
        <>
         <label htmlFor="cs-email" className="cs-input-wrap">
          <span className="cs-input-icon">
           <IconEmail />
          </span>
          <input
           id="cs-email"
           type="email"
           placeholder={u.emailPlaceholder}
           value={emailVal}
           onChange={(e) => setEmailVal(e.target.value)}
           onKeyDown={(e) => e.key === "Enter" && handleSend(e)}
           autoComplete="email"
           aria-label="Tu dirección de email"
           className="cs-input"
          />
         </label>

         <button type="button" onClick={handleSend} className="cs-btn">
          <span className="cs-btn-label">{u.buttonLabel}</span>
          <span className="cs-btn-arrow" aria-hidden>
           →
          </span>
         </button>
        </>
       )}
      </div>

      {}
      <div className="cs-a5 cs-nodes mt-12">
       {LINKS.map(({ label, href, Icon }) => (
        <a
         key={label}
         href={href}
         target={href.startsWith("mailto") ? undefined : "_blank"}
         rel="noopener noreferrer"
         aria-label={label}
         title={label}
         className="cs-node"
        >
         <Icon />
        </a>
       ))}
      </div>
     </div>
    </div>

    {}
    <footer
     className="relative z-20 flex items-center justify-between px-6 py-3"
     style={{
      borderTop: "1px solid rgba(255,255,255,0.09)",
      fontSize: "11px",
      letterSpacing: "0.02em",
      color: "rgba(160,165,185,0.50)",
     }}
    >
     <span>{u.footerLeft}</span>
     <span>{u.footerRight}</span>
    </footer>
   </section>
  </>
 );
}
