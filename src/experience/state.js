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
 post: null, // { x, z, look }: sitio donde se le pide esperar y a qué mirar (el fútbol)
};

// Cámara: a quién sigue y desde cuánto de lejos. `focus` nulo = al jugador.
export const rig = { focus: null, distance: 1, zoom: 1, shake: 0, space: 0, intro: 1, introTarget: 1, yaw: 0, lift: 1, viewYaw: 0 };
// La vista desde la órbita: a dónde mira la cámara, a qué distancia (en veces la
// del juego) y cuánto se pone encima. Con eso queda en `camera`, a unos 770 m
// del centro del planeta, que se ve entero. (La usan la nave, que lleva la
// cámara hasta ahí, y el cielo de la órbita, que coloca sus astros en esa vista.)
export const ORBIT_VIEW = { focus: [0, -40, 0], distance: 72, tilt: 0.913, camera: [0, 567, 188] };
// `yaw`: giro de la cámara alrededor de lo que sigue (0 = mira al norte, como siempre);
// `lift`: cuánto de su altura normal toma (1 = la de siempre; menos, más rasante).
// Los usa el fútbol para ponerse a la espalda del balón; el resto no los toca.
// `zoom`: lo que acerca o aleja el usuario con la rueda o el pellizco, entre estos límites.
export const ZOOM = { min: 0.72, max: 1.9 };
export function zoomBy(factor) {
 rig.zoom = Math.min(ZOOM.max, Math.max(ZOOM.min, rig.zoom * factor));
}
// `intro`: 1 mientras se muestra la bienvenida (la cámara está en el islote, de
// noche) y baja a 0 al entrar; `introTarget` es hacia dónde va.

// Dónde está el islote de la bienvenida y cómo se encuadra (ver Welcome.jsx).
//  · centre: la altura media del conjunto (de la punta de roca a la copa);
//  · span: lo que mide de alto y de ancho contando las rocas que flotan.
export const WELCOME = { origin: [0, 150, 78], centre: 1.3, span: [7.9, 7.3], fov: 40 };
const pose = { camera: [0, 0, 0], look: [0, 0, 0] };
// Cámara y punto al que mira, relativos al islote, para una ventana de
// proporción `aspect`. El islote entra siempre entero y lo más grande que
// cabe: en horizontal llena la mitad derecha (el título va a la izquierda); en
// vertical va centrado, entre el título y la indicación de entrada.
export function welcomePose(aspect) {
 const [tall, wide] = WELCOME.span;
 const slope = 2 * Math.tan((WELCOME.fov * Math.PI) / 360);
 let height, x, y;
 if (aspect < 1) {
  // Alto visible: el islote cabe a lo ancho y, a lo alto, en el 58 % central.
  height = Math.max(wide / aspect, tall / 0.58);
  x = 0;
  y = WELCOME.centre - height * 0.005;
 } else {
  // De alto, casi toda la ventana; de ancho, como mucho el 57 % derecho.
  height = Math.max(tall / 0.965, wide / 0.58 / aspect);
  x = -height * aspect * 0.195;
  y = WELCOME.centre;
 }
 const distance = height / slope;
 pose.camera = [x, y + distance * 0.07, distance];
 pose.look = [x, y, 0];
 return pose;
}

// Avisos puntuales de la escena a la interfaz: "hint", "toast", "open",
// "score", "flash"…
export const events = new EventTarget();
export const emit = (type, detail) => events.dispatchEvent(new CustomEvent(type, { detail }));

// `minigame`: el minijuego que se está jugando ("football") o null. Mientras
// dura, Woody no suelta bocadillos (ver experience/speech.js).
export const game = { score: 0, minigame: null };

// Lo que la escena muestra como tarjetas 3D (ver experience/ui3d/WorldUi.jsx):
// la indicación de la tecla E, los mensajes, el logro recién conseguido y el
// bocadillo de Woody. No hay versión HTML de nada de esto.
export const ui3d = {
 hint: null, // { text, x, y, z }: la acción disponible, sobre su objeto
 toasts: [], // [{ id, text, at, age }]
 achievement: null, // { name, age }
 speech: null, // { text, age, life }: lo que dice Woody ahora
};

// Interfaz: cuántas ventanas (ficha, portfolio…) hay abiertas encima del juego.
// Con alguna abierta, el astronauta no se mueve ni se usa nada.
export const ui = { open: 0 };

// ── Cosas con las que se puede interactuar ──────────────────────────────────
// Cada una dice dónde está, a qué distancia se activa, qué texto mostrar y qué
// hacer. La más cercana al jugador se usa con E (o el botón táctil); también se
// puede hacer clic directamente sobre el objeto.
export const interactables = new Set();
// La acción disponible ahora mismo y dónde flota su indicación (o null).
export function setHint(text, at) {
 if (!text) {
  ui3d.hint = null;
  return;
 }
 if (!ui3d.hint) ui3d.hint = { text, x: 0, y: 0, z: 0 };
 ui3d.hint.text = text;
 ui3d.hint.x = at.x;
 ui3d.hint.y = at.y;
 ui3d.hint.z = at.z;
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
if (import.meta.env.DEV) {
 window.__world = { input, player, woody, rig, game, interactables, ui3d };
 import("../dev/probe.js"); // rayos contra la escena, para las pruebas
}
