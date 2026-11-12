import * as THREE from "three";

// Estado que cambia en cada fotograma. Vive fuera de React a propósito: lo
// escriben el teclado, los controles táctiles y la escena, y lo lee el bucle de
// render, sin provocar renders de componentes.

export const input = {
 keys: { forward: false, back: false, left: false, right: false, run: false },
 stick: { x: 0, y: 0 }, // joystick táctil, cada eje de -1 a 1 (y positivo = hacia abajo)
 jumpQueued: false,
 actionQueued: false, // se pulsó E o el botón "Usar" desde el último fotograma
};

export const player = {
 position: new THREE.Vector3(), // pies; la coloca el mundo activo
 velocity: new THREE.Vector3(),
 facing: Math.PI, // hacia dónde mira, en radianes; 0 = norte, π = hacia la cámara
 grounded: true,
 hidden: false, // dentro de la nave
 frozen: false, // no responde a los controles
 gesture: false, // está haciendo un gesto (acariciar, celebrar…) y no se mueve
 act: null, // (clip, opciones) → promesa; lo instala el modelo del astronauta
 sockets: null, // huesos donde enganchar objetos a sus manos
};

// Woody. Su cerebro (WoodyBrain.js) escribe aquí; la interfaz y otros sistemas leen.
export const woody = {
 position: new THREE.Vector3(),
 facing: Math.PI,
 mode: "follow", // follow | guide | pet
 guideTo: null, // destino de la ruta en curso
 tips: true, // consejos activados
};

// Cámara: a quién sigue y desde cuánto de lejos. `focus` nulo = al jugador.
export const rig = { focus: null, distance: 1, zoom: 1, shake: 0, space: 0, intro: 1, introTarget: 1 };
// `zoom`: lo que acerca o aleja el usuario con la rueda o el pellizco, entre estos límites.
export const ZOOM = { min: 0.72, max: 1.9 };
export function zoomBy(factor) {
 rig.zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, rig.zoom * factor));
}
// `intro`: 1 mientras se muestra la bienvenida (la cámara está en el islote, de
// noche) y baja a 0 al entrar; `introTarget` es hacia dónde va.

// Dónde está el islote de la bienvenida y desde dónde se mira (ver Welcome.jsx).
export const WELCOME = {
 origin: [0, 150, 78],
 // Cámara y punto al que mira, relativos al islote; en vertical, más lejos y centrada.
 wide: { camera: [-2.9, 2.5, 13.4], look: [-2.8, 2.05, 0] },
 tall: { camera: [0.2, 3.6, 24], look: [0.2, 3.3, 0] },
};

// Avisos puntuales de la escena a la interfaz: "hint", "toast", "open",
// "score", "flash"…
export const events = new EventTarget();
export const emit = (type, detail) => events.dispatchEvent(new CustomEvent(type, { detail }));

export const game = { score: 0 };

// Interfaz: cuántas ventanas (ficha, portfolio…) hay abiertas encima del juego.
// Con alguna abierta, el astronauta no se mueve ni se usa nada.
export const ui = { open: 0 };

// ── Cosas con las que se puede interactuar ──────────────────────────────────
// Cada una dice dónde está, a qué distancia se activa, qué texto mostrar y qué
// hacer. La más cercana al jugador se usa con E (o el botón táctil); también se
// puede hacer clic directamente sobre el objeto.
export const interactables = new Set();
export let hint = null; // texto de la acción disponible ahora mismo
export function setHint(text) {
 if (text === hint) return;
 hint = text;
 emit("hint");
}

export function queueAction() {
 input.actionQueued = true;
}

export function releaseMovement() {
 const { keys, stick } = input;
 keys.forward = keys.back = keys.left = keys.right = keys.run = false;
 stick.x = stick.y = 0;
 input.jumpQueued = false;
 input.actionQueued = false;
}

// Ayuda para depurar desde la consola del navegador; no se incluye en producción.
if (import.meta.env.DEV) window.__world = { input, player, woody, rig, game, interactables };
