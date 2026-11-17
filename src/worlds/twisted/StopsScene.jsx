/* global __WOODY_PHOTO__ */
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { attribute, mix, normalLocal, uniform, vec3 } from "three/tsl";
import { addWarmSource } from "../../experience/lightSources";
import { lambert, unlit } from "../../experience/materials";
import { events, player, woody } from "../../experience/state";
import { quest } from "../../game/moonQuest";
import { createAlienWorld } from "../orbit/worldModels";
import { Glows } from "./Details";
import { QUEST_STOPS, STOP_PROPS, height } from "./layout";
import { glass, pool, solid } from "./materials";
import { BOARD, PAPER_LANTERN, PHOTO, createBoard, createConsole, createDogBed, createHollow, createMapTable, createNote, createPaperLantern, createPortraitStand, createShelf, createSketchTable, createSuitcase, drawSilhouette, noteLayout, scopeStars } from "./stops";

// Lo que se ve en cada parada (objetivo 23, bloque D2) y lo que pasa al usarla:
//  · Casa del alquimista: una mesa con bocetos y un tablón de notas revueltas
//    que, con la E, vuelan y se ordenan en columnas.
//  · Casa del árbol: una estantería (sombrero, capucha blanca, maceta) y una
//    consola con la pantalla encendida.
//  · Casita de cuento: la cama de Woody, sin estrenar; el hueco del suelo donde
//    se tumba de verdad cuando llegas; y su retrato.
//  · Invernadero: un mapa con chinchetas, una maleta a medio hacer y un
//    farolillo de papel que se enciende con la E.
//  · Observatorio: con la E, lo que se ve por el telescopio: The Cosmic Lab.
// ClockQuest.jsx avisa de que se usa una parada con el evento "stop-use"; todo
// está montado desde el principio (lo que cambia lo llevan uniformes y
// matrices): usar una parada no compila nada.

// La foto de Woody: public/img/woody.jpg. Si el archivo no está (lo mira Vite
// al arrancar o al construir; ver vite.config.js), el marco lleva una silueta.
const HAS_PHOTO = typeof __WOODY_PHOTO__ !== "undefined" && __WOODY_PHOTO__;
const PHOTO_URL = "/img/woody.jpg";

const seat = (prop, lift = 0) => [prop.x, height(prop.x, prop.z) + lift, prop.z];
// Un punto de un objeto (en sus ejes) llevado al mundo.
const inWorld = (prop, [px, py, pz]) => [prop.x + px * Math.cos(prop.turn ?? 0) + pz * Math.sin(prop.turn ?? 0), height(prop.x, prop.z) + py, prop.z - px * Math.sin(prop.turn ?? 0) + pz * Math.cos(prop.turn ?? 0)];
const NOTES_TIME = 1.25; // s que tardan las notas en ordenarse
const SCOPE_AWAY = 6; // m de la cámara a lo que se ve por el telescopio

export function Stops() {
 const models = useMemo(() => ({ board: createBoard(), note: createNote(), table: createSketchTable(), shelf: createShelf(), console: createConsole(), bed: createDogBed(), hollow: createHollow(), stand: createPortraitStand(), map: createMapTable(), suitcase: createSuitcase(), lantern: createPaperLantern(), planet: createAlienWorld(), plane: new THREE.PlaneGeometry(1, 1), disc: new THREE.CircleGeometry(1, 40), floor: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) }), []);
 const live = useMemo(() => ({ lantern: uniform(quest.flag("lantern") ? 1 : 0), scope: uniform(0), lanternGlow: [{ value: 0 }] }), []);
 const material = useMemo(() => {
  // El papel del farolillo: apagado, gris hueso; encendido, cálido y por encima del umbral del resplandor.
  const paper = unlit({ toneMapped: false });
  paper.colorNode = attribute("color", "vec3").mul(mix(vec3(0.34, 0.32, 0.36), vec3(1.7, 0.92, 0.42), live.lantern));
  // Lo del telescopio no se curva con el mundo ni lleva niebla: va pegado a la cámara.
  const backdrop = unlit({ transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  backdrop.colorNode = vec3(0.012, 0.014, 0.05);
  backdrop.opacityNode = live.scope;
  const star = unlit({ transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  star.colorNode = vec3(0.9, 0.95, 1.2);
  star.opacityNode = live.scope;
  // (Transparente solo para dibujarse después del fondo: lo opaco se pinta antes que lo transparente, y quedaba tapado.)
  const planet = unlit({ transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  planet.colorNode = attribute("color", "vec3").mul(normalLocal.dot(vec3(-0.5, 0.55, 0.67)).max(0).mul(0.95).add(0.3));
  for (const one of [backdrop, star, planet]) one.userData.flat = true;
  return { solid: solid(), flat: lambert({ side: THREE.DoubleSide }), notes: new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), screen: glass("#58d8ff"), spill: pool("#48c8ff", 0.4), warm: pool("#ff9a3c", 0.5), paper, backdrop, star, planet };
 }, [live]);
 const photo = useMemo(() => {
  let texture;
  if (HAS_PHOTO) texture = new THREE.TextureLoader().load(PHOTO_URL);
  else {
   const canvas = document.createElement("canvas");
   canvas.width = 256;
   canvas.height = 320;
   drawSilhouette(canvas.getContext("2d"), canvas.width, canvas.height);
   texture = new THREE.CanvasTexture(canvas);
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, material: new THREE.MeshLambertMaterial({ map: texture, emissive: "#ffffff", emissiveMap: texture, emissiveIntensity: 0.22 }) };
 }, []);

 // ── Las notas del tablón ──
 const notes = useMemo(() => {
  const layout = noteLayout();
  const mesh = new THREE.InstancedMesh(models.note, material.notes, layout.length);
  mesh.name = "notas del tablón";
  mesh.castShadow = false;
  return { layout, mesh, progress: quest.has("alquimista") ? 1 : 0, target: quest.has("alquimista") ? 1 : 0, drawn: -1 };
 }, [models, material]);

 // ── Lo del telescopio ──
 const scope = useRef({ group: null, planet: null, target: 0, k: 0, until: 0 });
 const stars = useMemo(() => scopeStars(28).map(([x, y, size]) => ({ position: [x * 2.6, y * 2.6, 0.01], scale: size * 1.7 })), []);
 const overlay = useMemo(() => {
  const node = document.createElement("div");
  node.className = "scope";
  node.setAttribute("aria-hidden", "true");
  return node;
 }, []);

 const lanternHead = useMemo(() => inWorld(STOP_PROPS.paperLantern, PAPER_LANTERN), []);
 const lanternLight = useRef(null);
 const screenAt = useMemo(() => inWorld(STOP_PROPS.console, models.console.glow), [models]);
 useEffect(() => {
  document.body.appendChild(overlay);
  const lantern = addWarmSource({ x: lanternHead[0], y: lanternHead[1], z: lanternHead[2], power: 0, reach: 6.5, flicker: 0.05, color: "#ffa552" });
  lanternLight.current = lantern.source;
  const screen = addWarmSource({ x: screenAt[0], y: screenAt[1], z: screenAt[2], power: 0.55, reach: 4.5, flicker: 0.1, color: "#58c8ff" });
  // Lo que pasa al usar cada parada.
  const onUse = (event) => {
   const id = event.detail?.id;
   if (id === "alquimista") notes.target = 1;
   else if (id === "invernadero") quest.setFlag("lantern");
   else if (id === "observatorio") {
    scope.current.target = 1;
    scope.current.until = performance.now() + (event.detail.show ?? 2000);
   }
  };
  const onQuest = (event) => {
   if (event.detail?.type !== "reset") return;
   notes.target = 0;
  };
  events.addEventListener("stop-use", onUse);
  events.addEventListener("quest", onQuest);
  // Woody, junto a la casita, se va a su hueco y se tumba (ahí sí: es su manía).
  const hollow = STOP_PROPS.hollow, bed = STOP_PROPS.bed, spot = QUEST_STOPS.casita;
  const timer = window.setInterval(() => {
   const near = Math.hypot(player.position.x - spot.x, player.position.z - spot.z);
   if (near < 5.5 && !woody.post && !woody.guideTo && !player.hidden) woody.post = { x: hollow.x, z: hollow.z, look: { x: bed.x, y: 0, z: bed.z }, lie: true };
   else if (woody.post?.lie && (near > 7.5 || woody.guideTo)) woody.post = null;
  }, 300);
  return () => {
   window.clearInterval(timer);
   if (woody.post?.lie) woody.post = null;
   events.removeEventListener("stop-use", onUse);
   events.removeEventListener("quest", onQuest);
   lantern();
   screen();
   overlay.remove();
  };
 }, [overlay, notes, lanternHead, screenAt]);
 useEffect(
  () => () => {
   const { lantern, console: consoleModel, ...rest } = models;
   [...Object.values(rest), lantern.post, lantern.shade, consoleModel.solid, consoleModel.screen].forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
   photo.texture.dispose();
   photo.material.dispose();
   notes.mesh.dispose();
  },
  [models, material, photo, notes],
 );

 const helper = useMemo(() => ({ object: new THREE.Object3D(), color: new THREE.Color(), other: new THREE.Color() }), []);
 useFrame(({ camera }, delta) => {
  // Las notas: de revueltas a ordenadas, cada una con su retraso, saliendo del tablón al volar.
  notes.progress += Math.sign(notes.target - notes.progress) * Math.min(Math.abs(notes.target - notes.progress), delta / NOTES_TIME);
  if (notes.progress !== notes.drawn) {
   notes.drawn = notes.progress;
   const { object, color, other } = helper, count = notes.layout.length;
   notes.layout.forEach((note, i) => {
    const start = (i / count) * 0.45;
    const k = Math.min(1, Math.max(0, (notes.progress - start) / 0.55)), ease = k * k * (3 - 2 * k), fly = Math.sin(ease * Math.PI);
    object.position.set(note.messy[0] + (note.tidy[0] - note.messy[0]) * ease, note.messy[1] + (note.tidy[1] - note.messy[1]) * ease + fly * 0.18, 0.045 + i * 0.0015 + fly * 0.55);
    object.rotation.set(fly * 0.5, fly * (i % 2 ? 0.6 : -0.6), note.messy[2] * (1 - ease));
    object.scale.setScalar(1);
    object.updateMatrix();
    notes.mesh.setMatrixAt(i, object.matrix);
    notes.mesh.setColorAt(i, color.set(note.tint).lerp(other.set(note.tidyTint), ease));
   });
   notes.mesh.instanceMatrix.needsUpdate = true;
   notes.mesh.instanceColor.needsUpdate = true;
  }
  // El farolillo de papel: se enciende (y se queda encendido).
  const lit = quest.flag("lantern") ? 1 : 0;
  live.lantern.value += (lit - live.lantern.value) * Math.min(1, delta * 3);
  live.lanternGlow[0].value = live.lantern.value;
  if (lanternLight.current) lanternLight.current.power = 0.85 * live.lantern.value;
  // El telescopio: un disco de cielo con The Cosmic Lab, pegado delante de la cámara.
  const view = scope.current;
  if (view.target && performance.now() > view.until) view.target = 0;
  view.k += (view.target - view.k) * Math.min(1, delta * 5);
  live.scope.value = view.k;
  overlay.style.opacity = view.k.toFixed(3);
  if (view.group) {
   view.group.position.copy(camera.position).add(helper.object.position.set(0, 0, -SCOPE_AWAY).applyQuaternion(camera.quaternion));
   view.group.quaternion.copy(camera.quaternion);
   view.planet.scale.setScalar(Math.max(0.0001, view.k * view.k) * 0.92);
   view.planet.rotation.y += delta * 0.25;
  }
  if (import.meta.env.DEV) window.__world.stops = { notes: notes.progress, lantern: live.lantern.value, scope: view.k, photo: Boolean(HAS_PHOTO) }; // para las pruebas automáticas
 });

 const P = STOP_PROPS;
 const placed = (prop) => ({ position: seat(prop, -0.02), "rotation-y": prop.turn ?? 0 });
 return (
  <>
   {/* Casa del alquimista. */}
   <group name="tablón de notas" userData={{ rests: 0 }} {...placed(P.board)}>
    <mesh geometry={models.board} material={material.solid} castShadow receiveShadow />
    <primitive object={notes.mesh} />
   </group>
   <mesh name="mesa de bocetos" userData={{ rests: 0 }} geometry={models.table} material={material.solid} {...placed(P.table)} castShadow receiveShadow />
   {/* Casa del árbol. */}
   <mesh name="estantería" userData={{ rests: 0 }} geometry={models.shelf} material={material.flat} {...placed(P.shelf)} castShadow receiveShadow />
   <group name="consola" userData={{ rests: 0 }} {...placed(P.console)}>
    <mesh geometry={models.console.solid} material={material.solid} castShadow receiveShadow />
    <mesh name="pantalla encendida" geometry={models.console.screen} material={material.screen.material} />
   </group>
   <mesh geometry={models.floor} material={material.spill.material} position={[screenAt[0], height(screenAt[0], screenAt[2]) + 0.07, screenAt[2] + 0.5]} scale={3} renderOrder={2} />
   {/* Casita de cuento. */}
   <mesh name="cama de Woody" userData={{ rests: 0 }} geometry={models.bed} material={material.solid} {...placed(P.bed)} castShadow receiveShadow />
   <mesh name="hueco de Woody" geometry={models.hollow} material={material.flat} position={seat(P.hollow, 0.01)} receiveShadow />
   <group name="retrato de Woody" userData={{ rests: 0 }} {...placed(P.portrait)}>
    <mesh geometry={models.stand} material={material.solid} castShadow />
    <mesh name={HAS_PHOTO ? "foto de Woody" : "silueta de Woody"} geometry={models.plane} material={photo.material} position={PHOTO.at} rotation-x={PHOTO.tilt} scale={[PHOTO.width, PHOTO.height, 1]} />
   </group>
   {/* Invernadero. */}
   <mesh name="mapa con chinchetas" userData={{ rests: 0 }} geometry={models.map} material={material.solid} {...placed(P.map)} castShadow receiveShadow />
   <mesh name="maleta" userData={{ rests: 0 }} geometry={models.suitcase} material={material.solid} {...placed(P.suitcase)} castShadow receiveShadow />
   <group name="farolillo de papel" userData={{ rests: 0 }} {...placed(P.paperLantern)}>
    <mesh geometry={models.lantern.post} material={material.solid} castShadow />
    <mesh name="papel del farolillo" geometry={models.lantern.shade} material={material.paper} />
   </group>
   <Glows name="halo del farolillo de papel" points={[lanternHead]} size={1.7} color="#ffa24e" power={live.lanternGlow} strength={0.5} />
   {/* Observatorio: lo que se ve por el telescopio (delante de la cámara; solo se ve mientras se mira). */}
   <group ref={(node) => (scope.current.group = node)} name="vista por el telescopio">
    <mesh geometry={models.disc} material={material.backdrop} scale={3.2} renderOrder={990} frustumCulled={false} />
    {stars.map((star, i) => (
     <mesh key={i} geometry={models.disc} material={material.star} position={star.position} scale={star.scale} renderOrder={991} frustumCulled={false} />
    ))}
    <mesh ref={(node) => (scope.current.planet = node)} name="The Cosmic Lab, por el telescopio" geometry={models.planet} material={material.planet} renderOrder={992} frustumCulled={false} />
   </group>
  </>
 );
}
