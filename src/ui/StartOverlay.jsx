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

// Indicación de entrada dibujada a mano: un subrayado y una flecha hacia el
// islote que se trazan solos.
const Scribble = () => (
 <svg className="hint__scribble" viewBox="0 0 330 46" aria-hidden="true">
  <path className="hint__underline" d="M4 9c38-6 80-1 116-5 32-3 66 3 98-3" pathLength="1" />
  <path className="hint__arrow" d="M236 8c26-4 50 0 70 13" pathLength="1" />
  <path className="hint__arrow hint__arrow--head" d="M290 7c7 5 12 9 18 15-9 3-17 7-24 13" pathLength="1" />
 </svg>
);

// Pantalla de inicio y de pausa. Un toque o un clic en cualquier punto entra.
// `onPointerDown` permite saber si se entró con el dedo o con el ratón.
//  · intro: es la bienvenida (el islote se ve detrás, sin velo); si no, es la pausa.
export function StartOverlay({ visible, intro, ready, touch, onPointerDown, onEnter }) {
 const controls = touch ? TOUCH_CONTROLS : MOUSE_CONTROLS;
 const note = touch
  ? "Pulgar izquierdo para moverte; toca los objetos para usarlos. Mejor en horizontal."
  : "También valen las flechas. E usa lo que tengas cerca, N cambia entre día y noche y Esc pausa.";
 if (intro) {
  return (
   <div className={`overlay overlay--intro${visible ? "" : " overlay--hidden"}`} aria-hidden={!visible} onPointerDown={onPointerDown} onClick={onEnter}>
    <header className="intro__title">
     <p className="overlay__eyebrow">Portfolio · Frontend developer</p>
     <h1 className="overlay__title">
      David <span>Llona</span>
     </h1>
     <p className="overlay__lead">Un planeta para explorar con Woody. Dentro está mi trabajo.</p>
     {/* La indicación de entrada va con el título (en vertical, al pie): nunca encima de la escena. */}
     <div className={`intro__hint${ready ? "" : " intro__hint--waiting"}`}>
      <button type="button" className="overlay__enter intro__enter" tabIndex={visible ? 0 : -1} disabled={!ready}>
       {!ready ? "Preparando el planeta…" : touch ? "Toca para aterrizar" : "Haz clic para aterrizar"}
      </button>
      <Scribble />
     </div>
    </header>

    <footer className="intro__foot">
     <ul className="intro__keys" aria-label="Controles">
      {controls.map((control) => (
       <li key={control.action}>{control.action}</li>
      ))}
     </ul>
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
