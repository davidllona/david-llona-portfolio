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

// Pantalla de inicio y de pausa. Un toque o un clic en cualquier punto entra.
// `onPointerDown` permite saber si se entró con el dedo o con el ratón.
export function StartOverlay({ visible, ready, touch, onPointerDown, onEnter, onDirect }) {
 const controls = touch ? TOUCH_CONTROLS : MOUSE_CONTROLS;
 const note = touch
  ? "Pulgar izquierdo para moverte; toca los objetos para usarlos. Mejor en horizontal."
  : "También valen las flechas. E usa lo que tengas cerca, N cambia entre día y noche y Esc pausa.";

 return (
  <div
   className={`overlay${visible ? "" : " overlay--hidden"}`}
   aria-hidden={!visible}
   onPointerDown={onPointerDown}
   onClick={onEnter}
  >
   <div className="overlay__panel">
    <p className="overlay__eyebrow">Planeta · Portfolio</p>
    <h1 className="overlay__title">
     David <span>Llona</span>
    </h1>
    <p className="overlay__lead">Frontend developer. Explora el planeta para ver mi trabajo.</p>

    <button type="button" className="overlay__enter" tabIndex={visible ? 0 : -1} disabled={!ready}>
     {!ready ? "Cargando el planeta…" : touch ? "Toca para entrar" : "Haz clic para entrar"}
     {ready && <span aria-hidden="true">→</span>}
    </button>

    {/* Modo directo: el portfolio sin jugar. No entra al planeta. */}
    <button
     type="button"
     className="overlay__direct"
     tabIndex={visible ? 0 : -1}
     onClick={(event) => {
      event.stopPropagation();
      onDirect();
     }}
    >
     Ver el portfolio sin jugar
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
