import { useEffect, useRef } from "react";

// Pequeñas ilustraciones de cada control, dibujadas con HTML y SVG.

const Key = ({ children, wide }) => <kbd className={`key${wide ? " key--wide" : ""}`}>{children}</kbd>;

const MoveKeys = () => (
 <span className="keys-cluster" aria-hidden="true">
  <Key>W</Key>
  <span className="keys-cluster__row">
   <Key>A</Key>
   <Key>S</Key>
   <Key>D</Key>
  </span>
 </span>
);

const MouseIcon = () => (
 <svg className="control__icon" viewBox="0 0 48 64" aria-hidden="true">
  <rect x="9" y="5" width="30" height="54" rx="15" />
  <line x1="24" y1="5" x2="24" y2="26" />
  <rect className="control__icon-fill" x="21.5" y="13" width="5" height="10" rx="2.5" />
 </svg>
);

const StickIcon = ({ pushed }) => (
 <svg className="control__icon" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="25" />
  <circle className="control__icon-fill" cx={pushed ? 46 : 32} cy={pushed ? 20 : 32} r="10" />
 </svg>
);

const SwipeIcon = () => (
 <svg className="control__icon" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="22" strokeDasharray="5 6" />
  <circle className="control__icon-fill" cx="32" cy="32" r="8" />
 </svg>
);

const JumpIcon = () => (
 <svg className="control__icon" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="25" />
  <path d="M32 42V23M24 30l8-8 8 8" />
 </svg>
);

const MOUSE_CONTROLS = [
 { action: "Moverte", art: <MoveKeys /> },
 { action: "Clic en objetos", art: <MouseIcon /> },
 { action: "Saltar", art: <Key wide>Espacio</Key> },
 { action: "Correr", art: <Key wide>Shift</Key> },
];

const TOUCH_CONTROLS = [
 { action: "Moverte", art: <StickIcon /> },
 { action: "Tocar objetos", art: <SwipeIcon /> },
 { action: "Saltar", art: <JumpIcon /> },
 { action: "Correr", art: <StickIcon pushed /> },
];

// Controles al pie de la bienvenida: teclas dibujadas con su etiqueta. Con
// pantalla táctil, los gestos equivalentes.
const WheelIcon = () => (
 <svg className="legend__icon" viewBox="0 0 28 40" aria-hidden="true">
  <rect x="3" y="2" width="22" height="36" rx="11" />
  <rect className="legend__icon-fill" x="12" y="8" width="4" height="9" rx="2" />
  <path d="M14 22v9m-3.5-3 3.5 3.5 3.5-3.5" />
 </svg>
);
const GestureIcon = ({ kind }) => (
 <svg className="legend__icon legend__icon--round" viewBox="0 0 40 40" aria-hidden="true">
  {kind === "stick" && (
   <>
    <circle cx="20" cy="20" r="16" />
    <circle className="legend__icon-fill" cx="25" cy="15" r="6" />
   </>
  )}
  {kind === "tap" && (
   <>
    <circle cx="20" cy="20" r="15" strokeDasharray="4 5" />
    <circle className="legend__icon-fill" cx="20" cy="20" r="6" />
   </>
  )}
  {kind === "pinch" && <path d="M5 35 15 25m0 7v-7H8M35 5 25 15m0-7v7h7" />}
  {kind === "jump" && (
   <>
    <circle cx="20" cy="20" r="16" />
    <path d="M20 28V13m-6 5 6-6 6 6" />
   </>
  )}
 </svg>
);
const KEY_LEGEND = [
 { label: "Moverte", art: ["W", "A", "S", "D"].map((key) => <kbd key={key} className="legend__key">{key}</kbd>) },
 { label: "Saltar", art: <kbd className="legend__key legend__key--wide">Espacio</kbd> },
 { label: "Correr", art: <kbd className="legend__key legend__key--wide">Shift</kbd> },
 { label: "Interactuar", art: <kbd className="legend__key">E</kbd> },
 { label: "Rueda: zoom", art: <WheelIcon /> },
];
const TOUCH_LEGEND = [
 { label: "Moverte", art: <GestureIcon kind="stick" /> },
 { label: "Tocar: usar", art: <GestureIcon kind="tap" /> },
 { label: "Saltar", art: <GestureIcon kind="jump" /> },
 { label: "Pellizco: zoom", art: <GestureIcon kind="pinch" /> },
];
const Legend = ({ touch }) => (
 <ul className="legend" aria-label="Controles">
  {(touch ? TOUCH_LEGEND : KEY_LEGEND).map((item) => (
   <li key={item.label} className="legend__item">
    <span className="legend__art">{item.art}</span>
    <span className="legend__label">{item.label}</span>
   </li>
  ))}
 </ul>
);

// Pantalla de inicio y de pausa. Un toque o un clic en cualquier punto entra.
// `onPointerDown` permite saber si se entró con el dedo o con el ratón.
//  · intro: es la bienvenida (el islote se ve detrás, sin velo); si no, es la pausa.
export function StartOverlay({ visible, intro, ready, touch, onPointerDown, onEnter }) {
 const controls = touch ? TOUCH_CONTROLS : MOUSE_CONTROLS;
 const note = touch
  ? "Pulgar izquierdo para moverte; toca los objetos para usarlos. Mejor en horizontal."
  : "También valen las flechas. E usa lo que tengas cerca, N cambia entre día y noche y Esc pausa.";
 // Mientras se desvanece conserva el aspecto con el que se vio: al entrar, la
 // bienvenida se funde como bienvenida (y no cambia a la pausa a medio fundido).
 const shown = useRef(intro);
 if (visible) shown.current = intro;
 // Enter también entra (y sigue, en la pausa). El espacio y Enter sobre el propio
 // botón ya lo hacen por ser un botón; esto vale con el foco en cualquier parte.
 useEffect(() => {
  if (!visible) return undefined;
  const onKey = (event) => {
   if (event.key !== "Enter" || event.repeat || event.target.closest?.("button, a")) return;
   event.preventDefault();
   onEnter();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
 }, [visible, onEnter]);
 if (shown.current) {
  return (
   <div className={`overlay overlay--intro${visible ? "" : " overlay--hidden"}`} aria-hidden={!visible} onPointerDown={onPointerDown} onClick={onEnter}>
    <header className="intro__title">
     <p className="overlay__eyebrow">Portfolio · Frontend developer</p>
     <h1 className="overlay__title">
      David <span>Llona</span>
     </h1>
     <p className="overlay__lead">Un planeta para explorar con Woody. Dentro está mi trabajo.</p>
     {/* La indicación de entrada: el texto y, debajo, tres galones que bajan en
         bucle (se aterriza). Va con el título; en vertical, al pie. Todo el
         bloque se pulsa, igual que cualquier punto de la pantalla y la tecla Enter. */}
     <div className="intro__hint">
      <button type="button" className={`overlay__enter landing${ready ? "" : " landing--waiting"}`} tabIndex={visible ? 0 : -1} disabled={!ready}>
       <span className="landing__text">{!ready ? "Preparando el planeta…" : touch ? "Toca para aterrizar" : "Haz clic para aterrizar"}</span>
       {ready && (
        <span className="landing__arrow" aria-hidden="true">
         {[0, 1, 2].map((i) => (
          <svg key={i} className="landing__chevron" viewBox="0 0 36 16" style={{ animationDelay: `${i * -0.5}s` }}>
           <path d="M4 3l14 10L32 3" />
          </svg>
         ))}
        </span>
       )}
      </button>
     </div>
    </header>

    <footer className="intro__foot">
     <Legend touch={touch} />
    </footer>
   </div>
  );
 }

 return (
  <div className={`overlay${visible ? "" : " overlay--hidden"}`} aria-hidden={!visible} onPointerDown={onPointerDown} onClick={onEnter}>
   <div className="overlay__panel">
    <p className="overlay__eyebrow">En pausa</p>
    <h1 className="overlay__title">
     David <span>Llona</span>
    </h1>
    <p className="overlay__lead">Frontend developer. Explora el planeta para ver mi trabajo.</p>

    <button type="button" className="overlay__enter" tabIndex={visible ? 0 : -1} disabled={!ready}>
     {touch ? "Toca para seguir" : "Haz clic para seguir"}
     <span aria-hidden="true">→</span>
    </button>

    <ul className="controls">
     {controls.map((control) => (
      <li key={control.action} className="control">
       <span className="control__art">{control.art}</span>
       <span className="control__label">{control.action}</span>
      </li>
     ))}
    </ul>
    <p className="overlay__note">{note}</p>
   </div>
  </div>
 );
}
