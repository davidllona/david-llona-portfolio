import { useEffect, useRef, useState } from "react";
import { initHeroScene } from "../3d/heroScene";
import { subscribeProgress } from "../3d/loadingManager";

/**
 * Hero.jsx — wrapper 380vh + sticky 100vh
 *
 * Overlay HTML "DESLIZA PARA COMENZAR":
 *  - texto UPPERCASE con tracking generoso
 *  - línea horizontal fina con gradiente cálido (matchea glow del cohete)
 *  - flecha ↓ animada debajo
 *  - fade-out al hacer scroll
 *
 * 🐛 DEBUG TEMPORAL — Panel de diagnóstico en móvil
 *  Este panel muestra en pantalla qué está fallando en móvil. ELIMINAR
 *  cuando se resuelva el bug del WebGL en móvil. Está envuelto en un
 *  bloque marcado con [DEBUG_MOBILE_PANEL] para identificarlo fácilmente.
 */

// ════════════════════════════════════════════════════════════════════════
// [DEBUG_MOBILE_PANEL] — eliminar cuando se resuelva el bug del WebGL móvil
// ════════════════════════════════════════════════════════════════════════
function DebugMobilePanel() {
 const [logs, setLogs] = useState([]);
 const [webglInfo, setWebglInfo] = useState(null);
 const [loadingPct, setLoadingPct] = useState(0);

 useEffect(() => {
  const isMobile = window.innerWidth < 768;
  if (!isMobile) return; // Solo móvil

  const push = (level, msg) => {
   setLogs((prev) => [
    ...prev.slice(-15), // máximo 16 logs visibles
    { level, msg: typeof msg === "string" ? msg : JSON.stringify(msg), t: Date.now() },
   ]);
  };

  // ── 1) DETECCIÓN INICIAL ───────────────────────────────────────────
  push("info", `viewport: ${window.innerWidth}x${window.innerHeight}`);
  push("info", `dpr: ${window.devicePixelRatio}`);
  push("info", `ua: ${navigator.userAgent.slice(0, 80)}`);

  // ── 2) TEST WEBGL EXPLÍCITO ────────────────────────────────────────
  // Creamos un canvas temporal y probamos a crear un contexto WebGL.
  // Si esto falla, ya sabemos que el problema es el dispositivo en sí.
  try {
   const testCanvas = document.createElement("canvas");
   const gl =
    testCanvas.getContext("webgl2") ||
    testCanvas.getContext("webgl") ||
    testCanvas.getContext("experimental-webgl");
   if (!gl) {
    push("error", "❌ WebGL NO disponible");
    setWebglInfo("no-webgl");
   } else {
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "?";
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "?";
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxVert = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
    push("ok", `✅ WebGL OK — ${gl instanceof WebGL2RenderingContext ? "v2" : "v1"}`);
    push("info", `GPU: ${String(renderer).slice(0, 50)}`);
    push("info", `vendor: ${String(vendor).slice(0, 40)}`);
    push("info", `maxTex: ${maxTex} / maxVert: ${maxVert}`);
    setWebglInfo({ vendor, renderer, maxTex });
   }
  } catch (e) {
   push("error", `❌ test WebGL: ${e.message}`);
  }

  // ── 3) ESCUCHAR ERRORES GLOBALES ───────────────────────────────────
  const onError = (e) => {
   const msg = e.message || (e.error && e.error.message) || "error sin mensaje";
   const where = e.filename ? ` @ ${e.filename.split("/").pop()}:${e.lineno}` : "";
   push("error", `⚠️ ${msg}${where}`);
  };
  const onUnhandled = (e) => {
   const reason = e.reason && (e.reason.message || e.reason.toString());
   push("error", `⚠️ promise: ${reason}`);
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandled);

  // ── 4) ESCUCHAR webglcontextlost EN EL CANVAS DEL HERO ─────────────
  let cleanupCanvas = null;
  const tryAttachCanvasListener = () => {
   const canvas = document.querySelector("#webgl");
   if (!canvas) return false;
   const onLost = (ev) => {
    ev.preventDefault();
    push("error", "❌ WebGL CONTEXT LOST en #webgl");
   };
   const onRestored = () => push("info", "🔄 WebGL CONTEXT RESTORED");
   canvas.addEventListener("webglcontextlost", onLost);
   canvas.addEventListener("webglcontextrestored", onRestored);
   cleanupCanvas = () => {
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
   };
   return true;
  };
  // El canvas puede no estar todavía en el DOM cuando montamos.
  // Reintentos cortos hasta encontrarlo (o rendirse a los 2 segundos).
  let attempts = 0;
  const intervalId = setInterval(() => {
   if (tryAttachCanvasListener() || attempts++ > 20) {
    clearInterval(intervalId);
   }
  }, 100);

  // ── 5) SUSCRIBIRSE AL LOADING MANAGER ──────────────────────────────
  const unsub = subscribeProgress((p, done) => {
   setLoadingPct(p);
   if (done) push("ok", "✅ loadingManager: DONE");
  });

  // ── 6) MARCAR MOMENTOS CLAVE ───────────────────────────────────────
  // Tras 3 y 6 segundos, log de "sigo vivo" para detectar cuelgues silenciosos.
  const t1 = setTimeout(() => push("info", `t=3s pct=${(loadingPct * 100).toFixed(0)}%`), 3000);
  const t2 = setTimeout(() => push("info", `t=6s pct=${(loadingPct * 100).toFixed(0)}%`), 6000);

  return () => {
   window.removeEventListener("error", onError);
   window.removeEventListener("unhandledrejection", onUnhandled);
   clearInterval(intervalId);
   if (cleanupCanvas) cleanupCanvas();
   unsub();
   clearTimeout(t1);
   clearTimeout(t2);
  };
 }, []);

 // No renderizar en desktop
 if (window.innerWidth >= 768) return null;

 return (
  <div
   style={{
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    maxHeight: "50vh",
    overflow: "auto",
    background: "rgba(0,0,0,0.92)",
    color: "#fff",
    fontFamily: "ui-monospace, Menlo, monospace",
    fontSize: "10px",
    lineHeight: 1.35,
    padding: "8px 10px",
    zIndex: 100000,
    pointerEvents: "auto",
    borderBottom: "1px solid #ff7a3d",
   }}
  >
   <div style={{ color: "#ff7a3d", fontWeight: 700, marginBottom: 4 }}>
    🐛 DEBUG PANEL · loading: {(loadingPct * 100).toFixed(0)}%
    {webglInfo && webglInfo !== "no-webgl" && (
     <span style={{ color: "#7fff7f" }}> · WebGL OK</span>
    )}
    {webglInfo === "no-webgl" && (
     <span style={{ color: "#ff5050" }}> · NO WEBGL</span>
    )}
   </div>
   {logs.map((l, i) => (
    <div
     key={i}
     style={{
      color:
       l.level === "error" ? "#ff7070" : l.level === "ok" ? "#7fff7f" : "#bbb",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
     }}
    >
     {l.msg}
    </div>
   ))}
  </div>
 );
}

export function Hero() {
 const wrapperRef = useRef(null);
 const hintRef = useRef(null);

 useEffect(() => {
  const cleanup = initHeroScene(wrapperRef.current);

  // ── DEFENSA EN PROFUNDIDAD: contexto WebGL perdido ────────────────
  // Aunque la orquestación de App.jsx (Hero solo se monta tras LoadingDoor)
  // ya elimina la causa principal de context loss en móvil, mantenemos
  // estos handlers como red de seguridad. Si por cualquier motivo el
  // navegador decide matar el contexto WebGL (poca memoria, segunda
  // pestaña pesada, cambio de GPU, etc), al menos:
  //   1) Prevenimos el comportamiento por defecto (canvas en negro).
  //   2) Logueamos para tener traza.
  //   3) Si el contexto se restaura, pedimos un re-render.
  //
  // Sin esto, una pérdida de contexto deja el canvas mudo sin error
  // visible — exactamente el bug del "sad face" que tuvimos.
  const canvasEl = document.querySelector("#webgl");
  let onContextLost = null;
  let onContextRestored = null;
  if (canvasEl) {
   onContextLost = (e) => {
    // preventDefault() le dice al navegador que vamos a manejar la
    // pérdida — necesario para que el evento 'webglcontextrestored'
    // pueda dispararse después.
    e.preventDefault();
    console.warn("[Hero] WebGL context lost — esperando restauración…");
   };
   onContextRestored = () => {
    console.warn("[Hero] WebGL context restaurado");
    // Forzamos un repaint: el render loop interno está controlado por
    // requestRender() dentro de heroScene, así que un resize sintético
    // lo despierta sin acoplarnos a su API.
    window.dispatchEvent(new Event("resize"));
   };
   canvasEl.addEventListener("webglcontextlost", onContextLost, false);
   canvasEl.addEventListener("webglcontextrestored", onContextRestored, false);
  }

  const onScroll = () => {
   if (!hintRef.current || !wrapperRef.current) return;

   const rect = wrapperRef.current.getBoundingClientRect();
   const range = rect.height - window.innerHeight;
   const scrolled = Math.max(0, -rect.top);
   const progress = range > 0 ? scrolled / range : 0;

   // Hint visible solo dentro de la habitación.
   // - 0%-4%   → opacity 1 (estable, no parpadea con scrolls mínimos)
   // - 4%-10%  → fade out cinemático
   // - >10%    → opacity 0 (mucho antes de cruzar la ventana ~25-29%)
   const FADE_START = 0.04;
   const FADE_END = 0.1;
   let op;
   if (progress <= FADE_START) {
    op = 1;
   } else if (progress >= FADE_END) {
    op = 0;
   } else {
    op = 1 - (progress - FADE_START) / (FADE_END - FADE_START);
   }
   // pointer-events fuera cuando ya no se ve — evita que capture ratón muerto
   hintRef.current.style.opacity = String(op);
   hintRef.current.style.visibility = op === 0 ? "hidden" : "visible";
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  return () => {
   window.removeEventListener("scroll", onScroll);
   if (canvasEl && onContextLost) {
    canvasEl.removeEventListener("webglcontextlost", onContextLost);
   }
   if (canvasEl && onContextRestored) {
    canvasEl.removeEventListener("webglcontextrestored", onContextRestored);
   }
   if (cleanup) cleanup();
  };
 }, []);

 return (
  <div ref={wrapperRef} style={{ position: "relative", height: "380vh" }}>
   {/* [DEBUG_MOBILE_PANEL] eliminar cuando se resuelva el bug */}
   <DebugMobilePanel />
   <div
    style={{
     position: "sticky",
     top: 0,
     height: "100vh",
     overflow: "hidden",
    }}
   >
    <canvas
     id="webgl"
     style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      display: "block",
     }}
    />

    {/* Scroll hint premium */}
    <div ref={hintRef} className="hero-scroll-hint" aria-hidden="true">
     <span className="hero-scroll-hint__label">DESLIZA PARA COMENZAR</span>
     <span className="hero-scroll-hint__line" />
     <svg className="hero-scroll-hint__arrow" width="14" height="18" viewBox="0 0 14 18" fill="none">
      <path
       d="M7 1V16M7 16L1 10M7 16L13 10"
       stroke="currentColor"
       strokeWidth="1.2"
       strokeLinecap="round"
       strokeLinejoin="round"
      />
     </svg>
    </div>

    <style>{`
  .hero-scroll-hint {
    position: absolute;
    bottom: 48px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    pointer-events: none;
    user-select: none;
    /* Halo dark + warm: el dark da contraste sobre cualquier fondo,
       el warm conserva la identidad cálida del cohete. */
    filter: drop-shadow(0 2px 18px rgba(0, 0, 0, 0.55));
    animation: hero-hint-fadein 1.4s ease-out 0.6s both;
  }

  .hero-scroll-hint__label {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.42em;
  color: rgba(255, 225, 200, 0.96);
  white-space: nowrap;             /* ← nunca rompe línea */
  text-shadow:
    0 0 1px rgba(0, 0, 0, 0.9),
    0 0 14px rgba(0, 0, 0, 0.55),
    0 0 22px rgba(255, 160, 90, 0.45);
  animation: hero-hint-breathe 3.2s ease-in-out infinite;
}

/* … resto igual … */

@media (max-width: 767px) {
  .hero-scroll-hint {
    /* Respeta el home indicator del iPhone sin pegarse al borde */
    bottom: max(24px, env(safe-area-inset-bottom));
    gap: 10px;
  }
  .hero-scroll-hint__label {
    font-size: 9.5px;              /* baja un punto */
    letter-spacing: 0.26em;        /* tracking más cerrado → cabe en una línea */
  }
  .hero-scroll-hint__line {
    width: 150px;                  /* coherente con el texto más corto */
  }
  .hero-scroll-hint__arrow {
    width: 12px;
    height: 16px;
  }
}

  /* Línea cálida — densidad un punto arriba */
  .hero-scroll-hint__line {
    width: 240px;
    height: 1px;
    background: linear-gradient(
      to right,
      rgba(255, 160, 90, 0.0)  0%,
      rgba(255, 175, 105, 0.75) 25%,
      rgba(255, 200, 145, 1.0)  50%,
      rgba(255, 175, 105, 0.75) 75%,
      rgba(255, 160, 90, 0.0)  100%
    );
    box-shadow: 0 0 12px rgba(255, 160, 90, 0.4);
  }

  .hero-scroll-hint__arrow {
    color: rgba(255, 200, 150, 0.95);
    filter: drop-shadow(0 0 6px rgba(255, 160, 90, 0.35));
    animation: hero-hint-arrow 2.4s ease-in-out infinite;
  }

  @keyframes hero-hint-fadein {
    from { opacity: 0; transform: translate(-50%, 10px); }
    to   { opacity: 1; transform: translate(-50%, 0); }
  }

  /* Floor subido: ya nunca baja de 0.88 */
  @keyframes hero-hint-breathe {
    0%, 100% { opacity: 0.88; }
    50%      { opacity: 1;    }
  }

  @keyframes hero-hint-arrow {
    0%, 100% { transform: translateY(0);   opacity: 0.75; }
    50%      { transform: translateY(5px); opacity: 1;    }
  }

  @media (max-width: 767px) {
    .hero-scroll-hint         { bottom: 32px; gap: 12px; }
    .hero-scroll-hint__label  { font-size: 11px; letter-spacing: 0.34em; }
    .hero-scroll-hint__line   { width: 180px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-scroll-hint,
    .hero-scroll-hint__label,
    .hero-scroll-hint__arrow { animation: none; }
  }
`}</style>
   </div>
  </div>
 );
}