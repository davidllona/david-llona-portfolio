import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { BY_ID } from "../../achievements/list";
import { skipSpeech, updateSpeech } from "../speech";
import { events, player, rig, ui3d, woody } from "../state";
import { createCard, drawAchievement, drawPill, drawSpeech } from "./cards";

// La interfaz del juego, dentro del mundo: la indicación de la tecla E sobre el
// objeto, los mensajes junto a lo que los provoca, el logro recién conseguido
// y el bocadillo de Woody. Son tarjetas 3D que miran siempre a la cámara,
// aparecen con un rebote elástico y mantienen su tamaño en pantalla al hacer
// zoom. Se dibujan por encima de todo: nada del mundo las tapa.
//
// Están montadas desde el principio (ocultas) para que el precalentamiento de
// la carga compile su material; mostrar una no crea nada nuevo.

const TOASTS = 3;
const TOAST_LIFE = 2.8;
const ACHIEVEMENT_LIFE = 4.2;
const TAN_HALF_FOV = Math.tan((40 * Math.PI) / 360);

// Alto de cada tarjeta, como fracción del alto de la pantalla.
const SIZE = { hint: 0.066, toast: 0.066, achievement: 0.1, speech: 0.4 };

// Rebote de entrada (0 → 1, pasándose un poco) y salida rápida.
const elastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)));

function useCard(width, height) {
 const card = useMemo(() => createCard(width, height), [width, height]);
 const material = useMemo(() => new THREE.MeshBasicMaterial({ map: card.texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false }), [card]);
 useEffect(
  () => () => {
   card.texture.dispose();
   material.dispose();
  },
  [card, material],
 );
 // `k` va de 0 (oculta) a 1 (a la vista); `aspect`, ancho / alto del lienzo.
 return useMemo(() => ({ card, material, mesh: null, k: 0, aspect: width / height }), [card, material, width, height]);
}

const point = new THREE.Vector3();
const other = new THREE.Vector3();
const upward = new THREE.Vector3();

export function WorldUi() {
 const hint = useCard(1024, 192);
 const toastA = useCard(1024, 192), toastB = useCard(1024, 192), toastC = useCard(1024, 192);
 const toasts = useMemo(() => [toastA, toastB, toastC], [toastA, toastB, toastC]);
 const achievement = useCard(1024, 256);
 const speech = useCard(1024, 640);
 const pending = useRef([]); // logros que esperan turno
 const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
 // El bocadillo se apoya en su pico: el origen va en el centro del borde inferior.
 const footed = useMemo(() => new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), []);
 useEffect(
  () => () => {
   geometry.dispose();
   footed.dispose();
  },
  [geometry, footed],
 );

 useEffect(() => {
  // La letra del título puede llegar después del primer dibujado.
  const redraw = () => [hint, ...toasts, achievement, speech].forEach((one) => (one.card.text = null));
  document.fonts?.load('700 64px "Bricolage Grotesque"').then(redraw, () => {});
  const onToast = (event) => {
   const { text, at = null } = event.detail ?? {};
   if (!text) return;
   // El mismo mensaje no se apila: se renueva.
   const same = ui3d.toasts.find((toast) => toast.text === text);
   if (same) same.age = Math.min(same.age, 0.4);
   else ui3d.toasts.push({ id: performance.now(), text, at, age: 0 });
   if (ui3d.toasts.length > TOASTS) ui3d.toasts.shift();
  };
  const onAchievement = (event) => pending.current.push(event.detail.id);
  events.addEventListener("toast", onToast);
  events.addEventListener("achievement", onAchievement);
  return () => {
   events.removeEventListener("toast", onToast);
   events.removeEventListener("achievement", onAchievement);
   ui3d.toasts.length = 0;
   ui3d.achievement = null;
  };
 }, [hint, toasts, achievement, speech]);

 // Coloca una tarjeta: texto, rebote, tamaño estable en pantalla y de cara a la cámara.
 // `screen`: ancho / alto de la pantalla; con él la tarjeta se mantiene entera
 // dentro de ella (un mensaje sobre algo alto o lejano no se sale por arriba).
 const place = (slot, camera, delta, text, draw, at, fraction, screen = 0) => {
  const { card, mesh } = slot;
  if (text && card.text !== text) {
   card.text = text;
   draw(card, text);
   if (slot.k > 0.6) slot.k = 0.6; // un pequeño rebote al cambiar de texto
  }
  slot.k = text ? Math.min(1, slot.k + delta / 0.5) : Math.max(0, slot.k - delta / 0.16);
  mesh.visible = slot.k > 0;
  if (!mesh.visible) return 0;
  if (at) mesh.position.copy(at);
  const distance = camera.position.distanceTo(mesh.position);
  const high = fraction * 2 * distance * TAN_HALF_FOV;
  const scale = text ? elastic(slot.k) : slot.k * slot.k;
  mesh.scale.set(high * slot.aspect * scale, high * scale, 1);
  mesh.quaternion.copy(camera.quaternion);
  if (screen) {
   const centre = other.copy(mesh.position).project(camera);
   const halfW = (card.box.w * fraction * slot.aspect) / screen, halfH = card.box.h * fraction;
   const dx = Math.max(0, -0.97 + halfW - centre.x) - Math.max(0, centre.x + halfW - 0.97);
   const dy = Math.max(0, -0.9 + halfH - centre.y) - Math.max(0, centre.y + halfH - 0.8);
   // La cámara no gira sobre su eje vertical: «derecha» es +x; «arriba», su eje Y.
   mesh.position.x += dx * distance * TAN_HALF_FOV * screen;
   mesh.position.addScaledVector(upward.set(0, 1, 0).applyQuaternion(camera.quaternion), dy * distance * TAN_HALF_FOV);
  }
  return high;
 };

 useFrame(({ camera, size }, rawDelta) => {
  const delta = Math.min(rawDelta, 0.05);
  const aspect = size.width / size.height;

  // Indicación de la tecla E, sobre su objeto.
  const h = ui3d.hint;
  place(hint, camera, delta, h?.text ?? null, (card, text) => drawPill(card, text, { key: "E" }), h ? point.set(h.x, h.y, h.z) : null, SIZE.hint, aspect);

  // Mensajes: junto a lo que los provoca o, si no se dice dónde, sobre lo que sigue la cámara.
  for (const toast of ui3d.toasts) toast.age += delta;
  while (ui3d.toasts.length && ui3d.toasts[0].age > TOAST_LIFE) ui3d.toasts.shift();
  const follow = rig.focus ?? player.position;
  toasts.forEach((slot, i) => {
   const toast = ui3d.toasts[i];
   if (toast) {
    const at = toast.at ?? follow;
    point.set(at.x, (toast.at ? at.y : at.y + 3.1) + i * 0.62, at.z);
   }
   place(slot, camera, delta, toast?.text ?? null, drawPill, toast ? point : null, SIZE.toast, aspect);
  });

  // Logro conseguido, sobre el astronauta; si llegan varios, de uno en uno.
  if (ui3d.achievement) {
   ui3d.achievement.age += delta;
   if (ui3d.achievement.age > ACHIEVEMENT_LIFE) ui3d.achievement = null;
  }
  if (!ui3d.achievement && achievement.k === 0 && pending.current.length) ui3d.achievement = { name: BY_ID[pending.current.shift()]?.name ?? "", age: 0 };
  const medal = ui3d.achievement;
  place(achievement, camera, delta, medal?.name || null, drawAchievement, medal ? point.set(follow.x, follow.y + 3.9, follow.z) : null, SIZE.achievement, aspect);

  // Bocadillo de Woody: sobre él, y apartado si fuera a tapar al astronauta.
  updateSpeech(delta);
  // (Dentro de la nave Woody va contigo y no se le ve: el bocadillo espera.)
  const line = player.hidden ? null : ui3d.speech;
  point.set(woody.position.x, woody.position.y + 1.45, woody.position.z);
  const high = place(speech, camera, delta, line?.text ?? null, drawSpeech, point, SIZE.speech);
  if (high > 0) {
   // En coordenadas de pantalla (−1 a 1): el bocadillo y el astronauta.
   const anchor = other.copy(point).project(camera);
   const boxW = (speech.card.box.w * SIZE.speech * 2 * speech.aspect) / aspect;
   const boxH = speech.card.box.h * SIZE.speech * 2;
   const astronaut = point.set(player.position.x, player.position.y + 1.1, player.position.z).project(camera);
   let shiftX = 0, shiftY = 0;
   const overlapsX = Math.abs(anchor.x - astronaut.x) < boxW / 2 + 0.07;
   const overlapsY = anchor.y < astronaut.y + 0.24 && anchor.y + boxH > astronaut.y - 0.2;
   if (overlapsX && overlapsY && !player.hidden) {
    const side = anchor.x >= astronaut.x ? 1 : -1;
    shiftX = side * (boxW / 2 + 0.09 - Math.abs(anchor.x - astronaut.x));
   }
   // Siempre entero dentro de la pantalla.
   shiftX += Math.max(0, -0.96 + boxW / 2 - (anchor.x + shiftX)) - Math.max(0, anchor.x + shiftX + boxW / 2 - 0.96);
   shiftY -= Math.max(0, anchor.y + boxH - 0.84);
   const distance = camera.position.distanceTo(speech.mesh.position);
   speech.mesh.position.x += shiftX * distance * TAN_HALF_FOV * aspect;
   speech.mesh.position.addScaledVector(upward.set(0, 1, 0).applyQuaternion(camera.quaternion), shiftY * distance * TAN_HALF_FOV);
   // Para las pruebas: dónde queda el bocadillo y dónde el astronauta, en pantalla.
   if (import.meta.env.DEV && line) line.screen = { left: anchor.x + shiftX - boxW / 2, right: anchor.x + shiftX + boxW / 2, bottom: anchor.y + shiftY, top: anchor.y + shiftY + boxH, astronaut: [astronaut.x, astronaut.y] };
  }
 }, 0.5);

 const card = (slot, shape = geometry, props) => (
  <mesh ref={(node) => (slot.mesh = node)} geometry={shape} material={slot.material} renderOrder={1000} visible={false} frustumCulled={false} {...props} />
 );
 return (
  <>
   {card(hint)}
   {toasts.map((slot, i) => (
    <group key={i}>{card(slot)}</group>
   ))}
   {card(achievement)}
   {/* Un clic en el bocadillo pasa a la frase siguiente. */}
   {card(speech, footed, {
    onClick: (event) => {
     event.stopPropagation();
     skipSpeech();
    },
   })}
  </>
 );
}
