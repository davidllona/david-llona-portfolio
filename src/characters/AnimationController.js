import * as THREE from "three";

// Reproduce los clips de un modelo riggeado con fundidos entre ellos y avisa de
// los eventos marcados dentro de cada clip (pisadas, soltar el balón…).
//
//  · `clips`: los AnimationClip del GLB.
//  · `aliases`: nombres alternativos → clip real (vienen del JSON del modelo).
//  · `events`: [{ clip, time_s, event }] (anim_events.json).
//  · `onEvent(nombre, clip)`: se llama cuando la reproducción cruza un evento.
export class AnimationController {
 constructor(root, clips, { aliases = {}, events = [], onEvent } = {}) {
  this.mixer = new THREE.AnimationMixer(root);
  this.clips = new Map(clips.map((clip) => [clip.name, clip]));
  this.aliases = aliases;
  this.onEvent = onEvent;
  this.actions = new Map();
  this.current = null; // { name, action, loop, onDone, lastTime }
  this.events = new Map();
  for (const event of events) {
   if (!this.events.has(event.clip)) this.events.set(event.clip, []);
   this.events.get(event.clip).push({ time: event.time_s, name: event.event });
  }
 }

 has(name) {
  return this.clips.has(this.aliases[name] ?? name);
 }

 get name() {
  return this.current?.name ?? null;
 }

 // ¿Se está reproduciendo un clip de una sola vez que aún no ha terminado?
 get busy() {
  return Boolean(this.current && !this.current.loop && !this.current.finished);
 }

 action(name) {
  const real = this.aliases[name] ?? name;
  if (!this.actions.has(real)) {
   const clip = this.clips.get(real);
   if (!clip) return null;
   this.actions.set(real, this.mixer.clipAction(clip));
  }
  return this.actions.get(real);
 }

 // En qué punto de su ciclo va el clip en curso (0–1).
 get phase() {
  return this.current ? this.current.action.time / this.current.action.getClip().duration : 0;
 }

 // Pasa al clip `name` con un fundido. Si ya suena ese mismo en bucle, solo
 // ajusta la velocidad. Al acabar (sin bucle) se queda en la última pose hasta
 // que se pida otro clip. (Antes, con `hold: false`, three apagaba el clip y
 // durante un fotograma el esqueleto volvía a la pose de reposo antes de que
 // entrara el siguiente: en Woody se veía como una sacudida de la cabeza al
 // acabar cada gesto. Objetivo 27, B5. La opción `hold` ya no hace nada.)
 // `phase` (0–1): en qué punto de su ciclo arranca (para pasar de un paso a
 // otro sin cambiar de pie).
 play(name, { fade = 0.2, loop = true, speed = 1, phase = 0, onDone } = {}) {
  const action = this.action(name);
  if (!action) {
   if (import.meta.env.DEV) console.warn(`[animación] clip inexistente: ${name}`);
   onDone?.();
   return false;
  }
  if (this.current?.action === action && loop && this.current.loop) {
   action.timeScale = speed;
   return true;
  }
  action.reset();
  action.time = phase * action.getClip().duration;
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  action.clampWhenFinished = true;
  action.timeScale = speed;
  action.enabled = true;
  action.setEffectiveWeight(1);
  if (this.current && this.current.action !== action) action.crossFadeFrom(this.current.action, fade, false);
  else action.fadeIn(fade);
  action.play();
  this.current = { name, real: this.aliases[name] ?? name, action, loop, onDone, lastTime: action.time - 1e-6, finished: false };
  return true;
 }

 // Reproduce un clip una vez y devuelve una promesa que se cumple al acabar.
 once(name, options = {}) {
  return new Promise((resolve) => this.play(name, { ...options, loop: false, onDone: resolve }));
 }

 update(delta) {
  this.mixer.update(delta);
  const current = this.current;
  if (!current) return;
  const { action } = current;
  const time = action.time;

  // Eventos cruzados desde el fotograma anterior (en bucle, también al dar la vuelta).
  const marks = this.events.get(current.real);
  if (marks && this.onEvent) {
   const wrapped = time < current.lastTime;
   for (const mark of marks) {
    const crossed = wrapped
     ? mark.time > current.lastTime || mark.time <= time
     : mark.time > current.lastTime && mark.time <= time;
    if (crossed) this.onEvent(mark.name, current.real);
   }
  }
  current.lastTime = time;

  if (!current.loop && !current.finished && time >= action.getClip().duration - 1e-3) {
   current.finished = true;
   const done = current.onDone;
   current.onDone = null;
   done?.();
  }
 }

 dispose() {
  this.mixer.stopAllAction();
  this.mixer.uncacheRoot(this.mixer.getRoot());
 }
}
