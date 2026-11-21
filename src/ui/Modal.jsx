import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { WORLD_VARIANT } from "../content/cards";
import { emit, events, input, releaseMovement, rig, ui, view } from "../experience/state";
import { world } from "../worlds";
import { requestVoyage } from "../worlds/travel";
import { HangingSign, LabMachine, WoodSign } from "./cards/Objects";

const APPROACH = 750; // ms que tarda la cámara en acercarse antes de abrir la carta
const E_GUARD = 320; // ms tras abrirse en que la E aún no cierra (es la misma pulsación que la abrió)
const MOBILE = 720; // px de ancho por debajo de los cuales la carta va en vertical

// La carta que se abre al usar un edificio o un objeto (evento "open"). Un solo
// componente con tres variantes, una por mundo: cada carta es un OBJETO de su
// mundo, copiado de la maqueta aprobada (docs/referencias/cartas/):
//  · "cartel":   el cartel de madera del mundo 1, con dos papeles clavados;
//  · "colgante": el cartel colgante torcido del mundo 2, con polaroids y una hoja;
//  · "maquina":  la máquina del laboratorio del mundo 3, con móviles holográficos.
// La variante viene en los datos (`variant`; ver content/cards.js) y, si no, es
// la del mundo en que se está: los avisos de viaje, el CV o el núcleo usan el
// mismo objeto, sin imágenes.
// Lo común: un velo suave que deja ver el mundo, la carta crece desde el
// objeto usado, E o Esc cierran, una sola X, el foco atrapado dentro, la
// interfaz de juego retirada mientras tanto y «reducir movimiento» respetado.
// Si el evento dice dónde está el objeto (`at`), la cámara se acerca primero.
const OBJECTS = { cartel: WoodSign, colgante: HangingSign, maquina: LabMachine };

// Las letras de las maquetas (Google Fonts). Se piden al entrar en el juego, no
// con la portada, y las del mundo en que se está se dejan ya descargadas: la
// primera carta no cambia de letra a la vista.
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Titan+One&family=Nunito:wght@600;700;800;900&family=Mystery+Quest&family=Caveat:wght@600;700&family=Fredoka:wght@600;700&family=JetBrains+Mono:wght@500&display=swap";
const FACES = {
 cartel: ['1em "Titan One"', '700 1em "Nunito"', '900 1em "Nunito"'],
 colgante: ['1em "Mystery Quest"', '700 1em "Caveat"', '700 1em "Nunito"'],
 maquina: ['700 1em "Fredoka"', '600 1em "Nunito"', '500 1em "JetBrains Mono"'],
};
function warmFonts(variant) {
 if (!document.getElementById("letras-cartas")) {
  const link = document.createElement("link");
  link.id = "letras-cartas";
  link.rel = "stylesheet";
  link.href = FONTS_URL;
  document.head.append(link);
 }
 const load = () => FACES[variant]?.forEach((face) => document.fonts.load(face).catch(() => {}));
 const sheet = document.getElementById("letras-cartas");
 if (sheet.sheet) load();
 else sheet.addEventListener("load", load, { once: true });
}

const point = new THREE.Vector3();
// Dónde cae en la pantalla el objeto usado, en px desde el centro de la ventana.
function originOf(at) {
 if (!at || !view.camera) return { x: 0, y: 0 };
 point.set(at.x, at.y ?? 0, at.z).project(view.camera);
 if (point.z > 1) return { x: 0, y: 0 };
 const clamp = (value) => Math.max(-0.9, Math.min(0.9, value));
 return { x: (clamp(point.x) * window.innerWidth) / 2, y: (-clamp(point.y) * window.innerHeight) / 2 };
}

export function Modal() {
 const [content, setContent] = useState(null);
 const [arrived, setArrived] = useState(false);
 const [mobile, setMobile] = useState(() => window.innerWidth < MOBILE);
 const [fit, setFit] = useState({ k: 1, width: 0, height: 0 });
 const card = useRef(null);
 const inner = useRef(null);
 const shownAt = useRef(0);
 const sticky = useRef(false); // la E no cierra esta carta (ver content/triples.jsx)
 sticky.current = Boolean(content?.sticky);

 useEffect(() => {
  const onOpen = (event) => {
   setArrived(false);
   setContent(event.detail);
  };
  // Las letras del mundo en que se está, ya; y las del siguiente, al llegar.
  const onWorld = () => warmFonts(WORLD_VARIANT[world.id]);
  onWorld();
  events.addEventListener("open", onOpen);
  events.addEventListener("world", onWorld);
  // Para las pruebas y las capturas: cambia datos de la carta abierta.
  if (import.meta.env.DEV) window.__world.card = (patch) => setContent((now) => (now ? { ...now, ...patch } : now));
  return () => {
   events.removeEventListener("open", onOpen);
   events.removeEventListener("world", onWorld);
  };
 }, []);

 // Con la carta abierta (o la cámara de camino), el juego no recibe controles.
 const isOpen = Boolean(content);
 useEffect(() => {
  if (!isOpen) return undefined;
  releaseMovement();
  ui.open += 1;
  // Esc la cierra desde el primer momento: también mientras la cámara aún se está acercando.
  const onEscape = (event) => event.key === "Escape" && setContent(null);
  window.addEventListener("keydown", onEscape);
  return () => {
   window.removeEventListener("keydown", onEscape);
   ui.open -= 1;
   // (Si se cerró con la E, esa pulsación no vuelve a usar el objeto.)
   input.actionQueued = false;
   emit("close");
  };
 }, [isOpen]);

 // Acercamiento de la cámara al objeto.
 useEffect(() => {
  if (!content) return undefined;
  const at = content.at;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!at || rig.focus) {
   setArrived(true);
   return undefined;
  }
  rig.focus = { x: at.x, y: at.y ?? 0, z: at.z };
  rig.distance = at.distance ?? 0.62;
  const timer = window.setTimeout(() => setArrived(true), reduced ? 0 : APPROACH);
  return () => {
   window.clearTimeout(timer);
   rig.focus = null;
   rig.distance = 1;
  };
  // (Solo al abrirse otra carta: cambiarle datos a la abierta no mueve la cámara.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [content?.at, isOpen]);

 // Teclas, ya con la carta a la vista: la E también cierra; Tab no sale de la carta.
 const shown = Boolean(content) && arrived;
 useEffect(() => {
  if (!shown) return undefined;
  shownAt.current = performance.now();
  // (La interfaz de juego se retira mientras tanto: ver cards.css.)
  document.documentElement.dataset.carta = "abierta";
  const previous = document.activeElement;
  const focusable = () => [...(card.current?.querySelectorAll("a[href], button:not([disabled]), input, video[controls]") ?? [])];
  focusable()[0]?.focus();
  const typing = (event) => event.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(event.target.tagName);
  const onKey = (event) => {
   if (event.code === "KeyE" && !sticky.current && !typing(event) && !event.repeat && !event.metaKey && !event.ctrlKey && performance.now() - shownAt.current > E_GUARD) {
    setContent(null);
    return;
   }
   if (event.key !== "Tab") return;
   const items = focusable();
   if (!items.length) return;
   const first = items[0], last = items[items.length - 1];
   if (event.shiftKey && (document.activeElement === first || !card.current.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
   } else if (!event.shiftKey && (document.activeElement === last || !card.current.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
   }
  };
  window.addEventListener("keydown", onKey);
  return () => {
   window.removeEventListener("keydown", onKey);
   delete document.documentElement.dataset.carta;
   previous?.focus?.();
  };
 }, [shown]);

 // El objeto tiene las medidas de su maqueta y se encoge entero, a escala, hasta
 // caber en la ventana (en móvil, hasta caber a lo ancho: lo demás se desplaza).
 useLayoutEffect(() => {
  if (!shown) return undefined;
  const measure = () => {
   const narrow = window.innerWidth < MOBILE;
   setMobile(narrow);
   const box = inner.current;
   if (!box) return;
   const width = box.offsetWidth, height = box.offsetHeight, pad = narrow ? 10 : 22;
   const k = Math.min(1, (window.innerWidth - pad * 2) / width, narrow ? 1 : Math.max(0.62, (window.innerHeight - pad * 2) / height));
   setFit((now) => (now.k === k && now.width === width && now.height === height ? now : { k, width, height }));
  };
  measure();
  const watcher = new ResizeObserver(measure);
  watcher.observe(inner.current);
  window.addEventListener("resize", measure);
  return () => {
   watcher.disconnect();
   window.removeEventListener("resize", measure);
  };
 }, [shown, mobile]);

 // De dónde sale: el sitio del objeto en la pantalla, al abrirse.
 const origin = useMemo(() => (shown ? originOf(content.at) : { x: 0, y: 0 }), [shown, content?.at]);

 if (!shown) return null;
 const variant = OBJECTS[content.variant] ? content.variant : (WORLD_VARIANT[world.id] ?? "cartel");
 const Body = OBJECTS[variant];
 const close = () => setContent(null);
 // Lo que puede hacer el botón de la carta (ver cards/Parts.jsx).
 const act = {
  voyage: (to) => {
   close();
   requestVoyage(to);
  },
  // (Tras cerrarse: quien abrió la carta termina antes lo suyo —el engranaje ganado— y Woody echa a andar.)
  guide: (to) => {
   close();
   window.setTimeout(() => emit("guide", { to, asked: true }), 90);
  },
  about: () => {
   close();
   emit("about");
  },
 };

 return (
  <div className={`modal modal--${variant}${mobile ? " is-movil" : ""}`} style={{ "--from-x": `${origin.x.toFixed(0)}px`, "--from-y": `${origin.y.toFixed(0)}px` }} role="dialog" aria-modal="true" aria-label={content.title} onClick={close}>
   <article ref={card} className={`modal__card card card--${variant}`} style={{ width: fit.width * fit.k || undefined, height: fit.height * fit.k || undefined }} onClick={(event) => event.stopPropagation()}>
    <div ref={inner} className="card__in" style={{ transform: `scale(${fit.k})` }}>
     <Body content={content} close={close} act={act} mobile={mobile} />
    </div>
   </article>
  </div>
 );
}
