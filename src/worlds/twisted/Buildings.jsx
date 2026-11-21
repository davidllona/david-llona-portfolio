import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { attribute, float, mix, vec3 } from "three/tsl";
import { aboutCard } from "../../content/about";
import { taleCard } from "../../content/cards";
import { CLOCK, STORY } from "../../content/twisted";
import { withSeeThrough } from "../../experience/environment/seeThrough";
import { useInteractable } from "../../experience/interact";
import { addWarmSource } from "../../experience/lightSources";
import { lambert, unlit } from "../../experience/materials";
import { emit } from "../../experience/state";
import { clock, uniforms } from "../../experience/theme";
import { clockwork, GEAR_IN, SPIN_AT } from "./clockwork";
import { Glows, Smoke } from "./Details";
import { quest } from "../../game/moonQuest";
import { BUILDINGS, GREENHOUSE, HOUSE, QUEST_STOPS, STORY_DOOR, ground } from "./layout";
import { glass, pool, solid } from "./materials";
import { STONE, WARM, createGear, createGreenhouse } from "./models";
import { TOWER, createTower } from "./tower";
import { Halos } from "../living/props/Halos";
import { merge, piece } from "../living/kit/geometry";

// Los edificios de la isla. La torre del reloj es propia (tower.js); los demás salen de modelos descargados (docs/CREDITOS.md),
// ya convertidos a una malla sin materiales ni texturas, con el color en los
// vértices: los de este mundo, con tools/assets/twisted.py; el observatorio y
// la casa del árbol son los mismos archivos del mundo 1. Aquí se les da la
// noche: el color se apaga y se lleva al morado, y lo que la conversión marcó
// como cristal (ventanas, la esfera del reloj) se enciende en cálido.
const url = (site) => (site.from === "living" ? `/models/living/buildings/${site.model}.glb` : `/models/twisted/${site.model}.glb`);
const GLASS_RGB = [1.0, 0.82, 0.5]; // (el color exacto con que la conversión pinta los cristales)
const GLASS = vec3(...GLASS_RGB);

// `veil`: cuánto se lleva el color original al morado de la noche (los que ya
// vienen pintados de noche —la torre, la casita—, nada); `saturation`: cuánto
// de su color propio conserva (el observatorio, rojo de origen, casi nada).
function createNightMaterial(veil = 1, saturation = 0.42) {
 const material = lambert({ side: THREE.DoubleSide });
 const tone = attribute("color", "vec3");
 const window = float(1).sub(tone.sub(GLASS).length().mul(30).clamp(0, 1)); // 1 solo en el color de los cristales
 // De día a noche de cuento: media saturación y un velo morado.
 const grey = tone.dot(vec3(0.3, 0.5, 0.2));
 const night = mix(tone, mix(vec3(grey), tone, saturation).mul(vec3(0.76, 0.68, 0.98)).mul(0.95), veil);
 material.colorNode = mix(night, vec3(0.05, 0.03, 0.02), window);
 material.emissiveNode = vec3(1.25, 0.82, 0.4).mul(window).mul(uniforms.uGlow);
 return withSeeThrough(material);
}

// Geometría de un modelo convertido (una malla, con el color en los vértices).
function useConverted(site) {
 const { scene } = useGLTF(url(site));
 const geometry = useMemo(() => {
  let source = null;
  scene.traverse((node) => node.isMesh && (source = node.geometry));
  const made = new THREE.BufferGeometry();
  made.setAttribute("position", source.attributes.position);
  made.setIndex(source.index);
  // (El color viene con cuatro componentes y normalizado: se queda en tres, en coma flotante.)
  const from = source.attributes.color;
  const colors = new Float32Array(from.count * 3);
  const recolor = RECOLOR[site.model], tone = new THREE.Color();
  for (let i = 0; i < from.count; i++) {
   if (recolor) recolor(from.getX(i), from.getY(i), from.getZ(i), source.attributes.position.getY(i), tone).toArray(colors, i * 3);
   else colors.set([from.getX(i), from.getY(i), from.getZ(i)], i * 3);
  }
  made.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  made.computeVertexNormals();
  made.computeBoundingSphere();
  return made;
 }, [scene, site.model]);
 useEffect(() => () => geometry.dispose(), [geometry]);
 return geometry;
}

function Building({ name, site, material, children }) {
 const geometry = useConverted(site);
 return (
  <group name={name} userData={{ rests: 0 }} position={[site.x, ground(site.x, site.z) - 0.05, site.z]} rotation-y={site.turn}>
   <mesh geometry={geometry} material={material} scale={site.size} castShadow receiveShadow />
   {children}
  </group>
 );
}

// ── La torre del reloj ──────────────────────────────────────────────────────
// Propia, de piedra, con tejado de pizarra retorcido (ver tower.js), y algo
// inclinada. Al llegar, el reloj está PARADO: agujas quietas en las diez y
// diez, esferas a media luz. Con los cuatro engranajes (ClockQuest.jsx) arranca:
// los engranajes encajan en la fachada y giran, las esferas se encienden y las
// agujas corren hasta la hora del visitante (la de su navegador; `?hora=` la
// fija) y desde entonces la marcan. El compás de todo eso, en clockwork.js.
const LEAN = [-0.035, 0, 0.05];
const STOPPED = 10 + 10 / 60; // la hora en que se quedó parado
function Tower({ site, material }) {
 const model = useMemo(createTower, []);
 const hands = useRef([]);
 const cogs = useRef([]);
 const lit = useMemo(() => {
  // Las esferas: su luz la lleva el reloj (apagadas a medias si está parado).
  const dial = unlit({ toneMapped: false });
  dial.colorNode = vec3(1.0, 0.8, 0.5).mul(clockwork.dial);
  return { warm: glass(WARM), dial, spill: pool("#ff9a3c", 0.55) };
 }, []);
 const handGeometry = useMemo(() => {
  const r = TOWER.clockR;
  const blade = (length, width) => new THREE.BoxGeometry(width, length, 0.05).translate(0, length / 2 - width, 0);
  return { hour: blade(r * 0.55, r * 0.1), minute: blade(r * 0.84, r * 0.065), pin: new THREE.CylinderGeometry(r * 0.08, r * 0.08, 0.08, 8).rotateX(Math.PI / 2) };
 }, []);
 const handMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#1b1228" }), []);
 const cog = useMemo(() => createGear(9), []);
 const y = ground(site.x, site.z) - 0.05;
 // De los ejes de la torre (ya inclinada) a los del mundo.
 const placed = useMemo(() => {
  const lean = new THREE.Euler(...LEAN), up = new THREE.Vector3(0, 1, 0);
  const toWorld = (at) => new THREE.Vector3(...at).applyEuler(lean).applyAxisAngle(up, site.turn).add(new THREE.Vector3(site.x, y, site.z)).toArray();
  const door = toWorld([0.3, 0, 3.1]);
  return {
   warm: model.glows.filter((one) => one.tint === "warm").map((one) => toWorld(one.at)),
   dials: model.glows.filter((one) => one.tint === "dial").map((one) => toWorld(one.at)),
   door,
   lamp: toWorld([1.02, 2.8, 2.5]),
  };
 }, [model, site, y]);
 const dialLight = useRef(null);
 useEffect(() => {
  const dial = addWarmSource({ x: placed.dials[0][0], y: placed.dials[0][1] - 1.2, z: placed.dials[0][2] + 1.4, power: 0, reach: 9, flicker: 0.02, color: "#ffc27a" });
  dialLight.current = dial.source;
  const stop = [addWarmSource({ x: placed.lamp[0], y: placed.lamp[1], z: placed.lamp[2], power: 1.0, reach: 7.5, flicker: 0.06, color: "#ffa552" }), dial];
  return () => stop.forEach((off) => off());
 }, [placed]);
 useEffect(
  () => () => {
   [model.body, model.warm, model.dial, cog, ...Object.values(handGeometry)].forEach((one) => one.dispose());
   Object.values(lit).forEach((one) => one.dispose());
   handMaterial.dispose();
  },
  [model, lit, handGeometry, handMaterial, cog],
 );
 const plane = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
 useEffect(() => () => plane.dispose(), [plane]);
 useFrame(({ clock: time }) => {
  const t = clockwork.update();
  // La hora del visitante: la aguja de las horas da una vuelta cada 12 h; la de los minutos, cada hora.
  const { hour } = clock();
  const angles = (h) => [((h % 12) / 12) * Math.PI * 2, (h % 1) * Math.PI * 2];
  const [stoppedHours, stoppedMinutes] = angles(STOPPED), [realHours, realMinutes] = angles(hour);
  // Al arrancar, las agujas corren de la hora parada a la real (la de los minutos da, además, dos vueltas).
  const k = Math.min(1, Math.max(0, (t - 3.0) / 2.2)), run = k * k * (3 - 2 * k);
  const forward = (from, to) => from + ((((to - from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * run;
  const hours = run >= 1 ? realHours : forward(stoppedHours, realHours);
  const minute = run >= 1 ? realMinutes : forward(stoppedMinutes, realMinutes) + (run > 0 ? Math.PI * 4 * run : 0);
  for (const face of hands.current) {
   if (face?.hour) face.hour.rotation.z = -hours;
   if (face?.minute) face.minute.rotation.z = -minute;
  }
  if (dialLight.current) dialLight.current.power = 0.8 * clockwork.level;
  // Los engranajes de la fachada: cada uno encaja a su tiempo (llega creciendo, con un rebote) y luego giran todos, engranados.
  model.slots.forEach(([, , , r], i) => {
   const mesh = cogs.current[i];
   if (!mesh) return;
   const into = Math.min(1, Math.max(0, (t - GEAR_IN(i)) / 0.45));
   const pop = into <= 0 ? 0 : into < 1 ? 1 + Math.sin(into * Math.PI) * 0.35 * (1 - into) - (1 - into) ** 2 : 1;
   mesh.visible = pop > 0.001;
   mesh.scale.setScalar(Math.max(0.001, pop) * r);
   const spinning = t > SPIN_AT ? Math.min(1, (t - SPIN_AT) / 0.8) : 0;
   mesh.rotation.z = (i % 2 ? -1 : 1) * time.elapsedTime * 0.7 * spinning + i;
  });
  if (import.meta.env.DEV) window.__world.towerClock = { hour, hourAngle: hours, minuteAngle: minute, running: quest.running(), level: clockwork.level, sequence: t, cogs: cogs.current.filter((mesh) => mesh?.visible).length }; // para las pruebas automáticas
 });
 return (
  <>
   <group name="torre" userData={{ rests: 0 }} position={[site.x, y, site.z]} rotation-y={site.turn}>
    <group rotation={LEAN}>
     <mesh name="torre: piedra, tejado y buhardillas" geometry={model.body} material={material} castShadow receiveShadow />
     <mesh geometry={model.warm} material={lit.warm.material} />
     <mesh name="esferas del reloj" geometry={model.dial} material={lit.dial} />
     {/* Agujas, sobre cada esfera. */}
     {model.faces.map((face, i) => (
      <group key={i} position={face.position} rotation-y={face.yaw}>
       <mesh ref={(node) => ((hands.current[i] ??= {}).hour = node)} name="aguja de las horas" geometry={handGeometry.hour} material={handMaterial} position-z={0.02} />
       <mesh ref={(node) => ((hands.current[i] ??= {}).minute = node)} name="aguja de los minutos" geometry={handGeometry.minute} material={handMaterial} position-z={0.05} />
       <mesh geometry={handGeometry.pin} material={handMaterial} position-z={0.06} />
      </group>
     ))}
     {/* Los cuatro engranajes recogidos, en su sitio de la fachada (no se ven hasta que encajan). */}
     {model.slots.map(([x, sy, z], i) => (
      <mesh key={i} ref={(node) => (cogs.current[i] = node)} name="engranaje de la torre" geometry={cog} material={material} position={[x, sy, z]} castShadow />
     ))}
    </group>
   </group>
   <mesh geometry={plane} material={lit.spill.material} position={[placed.door[0], ground(placed.door[0], placed.door[2]) + 0.07, placed.door[2]]} scale={4.4} renderOrder={2} />
   {/* (Pequeños y pegados al cristal: un resplandor en la ventana, no una bola.) */}
   <Halos points={placed.warm} size={0.95} color="#ffa24e" night={0.42} />
   <Glows name="halo de las esferas" points={placed.dials} size={2.5} color="#ffc27a" power={clockwork.glow} strength={0.3} />
  </>
 );
}

// ── El observatorio ─────────────────────────────────────────────────────────
// El mismo modelo del mundo 1, repintado para este: allí es de ladrillo rojo
// con franjas oscuras; aquí, base de piedra gris morada, cúpula de cobre con
// cardenillo y telescopio de latón. (La lente del telescopio sigue encendida.)
// `y`: altura del vértice, de 0 a 1,16 (el modelo mide 1 de lado).
const mixed = (a, b, t) => a.clone().lerp(b, Math.min(1, Math.max(0, t)));
const OBS_TONES = { stone: new THREE.Color("#9a96b2"), stoneDark: new THREE.Color("#6f6b88"), band: new THREE.Color("#3d3a55"), copper: new THREE.Color("#4aa08e"), copperLight: new THREE.Color("#8fd6bd"), brass: new THREE.Color("#d2a044"), brassLight: new THREE.Color("#e2bb62") };
const RECOLOR = {
 observatorio: (r, g, b, y, out) => {
  const T = OBS_TONES;
  if (Math.abs(r - GLASS_RGB[0]) + Math.abs(g - GLASS_RGB[1]) + Math.abs(b - GLASS_RGB[2]) < 0.04) return out.setRGB(r, g, b); // cristal: se queda
  if (r > 0.75 && g < 0.5) return out.copy(T.stone); // ladrillo claro → piedra
  if (r > 0.4 && g < 0.3) return out.copy(T.stoneDark); // ladrillo oscuro → piedra oscura
  if (Math.abs(r - g) < 0.08 && r > 0.4 && r < 0.75) return out.copy(mixed(T.copper, T.copperLight, (y - 0.7) / 0.34)); // cúpula gris → cobre con cardenillo
  if (r > 0.85 && g > 0.85) return out.copy(T.brassLight); // remates blancos → latón claro
  if (r < 0.2 && g < 0.2 && b < 0.2) return out.copy(y > 0.9 ? T.brass : T.band); // lo negro: arriba es el telescopio (latón); abajo, zócalo y fajas
  return out.setRGB(r, g, b);
 },
};
// Una ventana cálida en el muro del observatorio (el modelo no trae): cristal, marco de piedra clara y alféizar.
const OBS_WINDOW = { yaw: -0.2, y: 2.3, r: 2.56 };
function ObservatoryWindow({ site, material }) {
 const model = useMemo(() => {
  const { yaw, y, r } = OBS_WINDOW, at = [Math.sin(yaw) * r, y, Math.cos(yaw) * r];
  const part = (geometry, options, dx, dy, dz = 0) => {
   const made = piece(geometry, { ...options, position: [dx, dy, dz] });
   made.applyMatrix4(new THREE.Matrix4().makeRotationY(yaw)).translate(...at);
   return made;
  };
  return {
   frame: merge([
    part(new THREE.BoxGeometry(0.12, 0.95, 0.16), { color: "#a39fb8" }, -0.36, 0),
    part(new THREE.BoxGeometry(0.12, 0.95, 0.16), { color: "#a39fb8" }, 0.36, 0),
    part(new THREE.TorusGeometry(0.36, 0.07, 4, 8, Math.PI), { color: "#a39fb8" }, 0, 0.45),
    part(new THREE.BoxGeometry(0.98, 0.1, 0.3), { color: "#8d89a3" }, 0, -0.52, 0.05),
    part(new THREE.BoxGeometry(0.04, 1.2, 0.04), { color: "#1d1c2b" }, 0, 0.15, 0.02),
    part(new THREE.BoxGeometry(0.62, 0.04, 0.04), { color: "#1d1c2b" }, 0, 0.1, 0.02),
   ]),
   glass: merge([part(new THREE.PlaneGeometry(0.62, 0.9), {}, 0, 0), part(new THREE.CircleGeometry(0.31, 8, 0, Math.PI), {}, 0, 0.45)]),
  };
 }, []);
 const lit = useMemo(() => glass(WARM), []);
 const base = ground(site.x, site.z) - 0.05;
 const halo = useMemo(() => {
  const { yaw, y, r } = OBS_WINDOW, turn = site.turn + yaw;
  return [[site.x + Math.sin(turn) * (r + 0.3), base + y, site.z + Math.cos(turn) * (r + 0.3)]];
 }, [site, base]);
 useEffect(() => {
  const stop = addWarmSource({ x: halo[0][0], y: halo[0][1] - 0.3, z: halo[0][2], power: 0.7, reach: 6, flicker: 0.04, color: "#ffa552" });
  return () => {
   stop();
   model.frame.dispose();
   model.glass.dispose();
   lit.dispose();
  };
 }, [model, lit, halo]);
 return (
  <>
   <group position={[site.x, base, site.z]} rotation-y={site.turn}>
    <mesh name="ventana del observatorio" geometry={model.frame} material={material} castShadow />
    <mesh geometry={model.glass} material={lit.material} />
   </group>
   <Halos points={halo} size={1.7} color="#ffa24e" night={0.5} />
  </>
 );
}

// ── La casita ───────────────────────────────────────────────────────────────
// Lleva una chimenea de piedra (el modelo no trae) y, encima, humo.
const CASITA_CHIMNEY = [0.27, 0.46, -0.16]; // respecto a la casita, en veces su tamaño (x, base, z)
function chimneyTop(site) {
 const [cx, base, cz] = CASITA_CHIMNEY.map((v) => v * site.size);
 const tall = site.size * 0.42;
 const x = site.x + cx * Math.cos(site.turn) + cz * Math.sin(site.turn), z = site.z - cx * Math.sin(site.turn) + cz * Math.cos(site.turn);
 return [x, ground(site.x, site.z) - 0.05 + base + tall + 0.1, z];
}
function Chimney({ site, material }) {
 const model = useMemo(() => {
  const [cx, base, cz] = CASITA_CHIMNEY.map((v) => v * site.size), tall = site.size * 0.42;
  return merge([
   piece(new THREE.BoxGeometry(0.62, tall, 0.62), { bottom: STONE.dark, top: STONE.light, jitter: 0.03, vary: 0.12, position: [cx, base + tall / 2, cz], rotation: [0.04, 0.2, -0.06] }),
   piece(new THREE.BoxGeometry(0.8, 0.14, 0.8), { color: STONE.dark, position: [cx - 0.04, base + tall, cz], rotation: [0, 0.2, -0.06] }),
  ]);
 }, [site]);
 useEffect(() => () => model.dispose(), [model]);
 return <mesh name="chimenea de la casita" geometry={model} material={material} castShadow />;
}

// ── El invernadero ──────────────────────────────────────────────────────────
// Armazón de hierro y cristal violeta; dentro, dos bancales con plantas que
// brillan en violeta y turquesa, y el resplandor que sale y cae al suelo.
function Greenhouse() {
 const model = useMemo(() => createGreenhouse(GREENHOUSE), []);
 const plants = useMemo(() => {
  const parts = [];
  const d = GREENHOUSE.depth / 2 - 0.5;
  for (const side of [-1, 1]) {
   for (let i = 0; i < 5; i++) {
    const z = -d + (i / 4) * d * 2, x = side * (GREENHOUSE.width / 2 - 0.65), tall = 0.5 + ((i * 7 + side * 3) % 5) * 0.12;
    // (Una de cada tres, turquesa en vez de violeta.)
    parts.push(piece(new THREE.IcosahedronGeometry(0.2 + tall * 0.18, 0), { color: i % 3 === 1 ? "#3fe0ff" : i % 2 ? "#ffffff" : "#e3c8ff", position: [x, 0.95 + tall, z], scale: [1, 1.3, 1] }));
    parts.push(piece(new THREE.ConeGeometry(0.06, tall, 4).translate(0, tall / 2, 0), { color: "#ffffff", position: [x, 0.9, z] }));
   }
  }
  return merge(parts);
 }, []);
 const benches = useMemo(() => {
  const parts = [];
  for (const side of [-1, 1]) parts.push(piece(new THREE.BoxGeometry(0.9, 0.5, GREENHOUSE.depth - 0.7), { bottom: "#2a1f33", top: "#4a3a52", position: [side * (GREENHOUSE.width / 2 - 0.65), 0.65, 0] }));
  return merge(parts);
 }, []);
 const material = useMemo(
  () => ({
   frame: solid(),
   glass: new THREE.MeshBasicMaterial({ color: "#8f6cff", transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }),
   // Las plantas, por encima del umbral del resplandor: brillan.
   glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.62, 0.26, 1.3), vertexColors: true, toneMapped: false }),
   spill: pool("#a873ff", 0.45),
  }),
  [],
 );
 const y = ground(GREENHOUSE.x, GREENHOUSE.z);
 const plane = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
 useEffect(() => {
  const stop = addWarmSource({ x: GREENHOUSE.x, y: y + 1.4, z: GREENHOUSE.z, power: 1.0, reach: 8, flicker: 0.03, color: "#a070ff" });
  return () => {
   stop();
   [model.frame, model.glass, plants, benches, plane].forEach((one) => one.dispose());
   material.frame.dispose();
   material.glass.dispose();
   material.glow.dispose();
   material.spill.dispose();
  };
 }, [model, plants, benches, plane, material, y]);
 return (
  <>
   <group name="invernadero" userData={{ rests: 0 }} position={[GREENHOUSE.x, y - 0.04, GREENHOUSE.z]} rotation-y={GREENHOUSE.turn}>
    <mesh geometry={model.frame} material={material.frame} castShadow receiveShadow />
    <mesh geometry={benches} material={material.frame} receiveShadow />
    <mesh name="plantas del invernadero" geometry={plants} material={material.glow} />
    <mesh geometry={model.glass} material={material.glass} renderOrder={2} />
   </group>
   <mesh geometry={plane} material={material.spill.material} position={[GREENHOUSE.x, y + 0.06, GREENHOUSE.z]} scale={[GREENHOUSE.width + 4, 1, GREENHOUSE.depth + 4]} rotation-y={GREENHOUSE.turn} renderOrder={2} />
  </>
 );
}

// La chimenea de la casa del alquimista (la casa torcida, a su escala; ver House.jsx y `createHouse`).
const ALCHEMIST_SMOKE = [-2.0, 10.3, -1.0];
function alchemistChimney() {
 const [lx, ly, lz] = ALCHEMIST_SMOKE.map((v) => v * HOUSE.scale);
 return [HOUSE.x + lx * Math.cos(HOUSE.turn) + lz * Math.sin(HOUSE.turn), ground(HOUSE.x, HOUSE.z) + ly, HOUSE.z - lx * Math.sin(HOUSE.turn) + lz * Math.cos(HOUSE.turn)];
}

export function Buildings() {
 // Un material por grado de color (los edificios que comparten grado comparten material).
 const material = useMemo(() => {
  const all = { plain: createNightMaterial(0) };
  for (const site of Object.values(BUILDINGS)) {
   const key = `velo ${site.saturation ?? 0.42}`;
   all[key] ??= createNightMaterial(1, site.saturation ?? 0.42);
  }
  return all;
 }, []);
 useEffect(() => () => Object.values(material).forEach((one) => one.dispose()), [material]);
 // La casa sobre tronco es la parada 1: ante su puerta, con E, se lee «Sobre mí» (el texto real).
 const story = BUILDINGS["casa-tronco"];
 useInteractable({
  position: STORY_DOOR,
  radius: 2.6,
  height: 2.6,
  hint: "Leer mi historia",
  // (El mismo cartel colgante de las paradas, sin engranaje: aquí empieza el paseo. Su botón lleva a la primera que falte.)
  action: () => {
   const about = aboutCard(), next = quest.missing()[0];
   emit("open", { ...taleCard("historia", { place: STORY.place, title: about.title, paragraphs: about.paragraphs }), kind: "about", tags: about.tags, guide: next ? QUEST_STOPS[next].node : "torre", guideLabel: CLOCK.next, at: { x: story.x, y: ground(story.x, story.z) + 3, z: story.z + 1, distance: 0.9 } });
  },
 });
 useEffect(() => {
  const y = ground(STORY_DOOR.x, STORY_DOOR.z);
  // Luz de la puerta de la casa sobre tronco.
  const stop = [addWarmSource({ x: STORY_DOOR.x, y: y + 1.6, z: STORY_DOOR.z, power: 1.0, reach: 8, flicker: 0.05, color: "#ffa552" })];
  return () => stop.forEach((off) => off());
 }, []);
 const chimneys = useMemo(() => ({ casita: [chimneyTop(BUILDINGS.casita)], alchemist: [alchemistChimney()] }), []);
 return (
  <>
   {Object.entries(BUILDINGS).map(([name, site]) =>
    name === "torre" ? (
     <Tower key={name} site={site} material={material.plain} />
    ) : (
     <Building key={name} name={name} site={site} material={site.painted ? material.plain : material[`velo ${site.saturation ?? 0.42}`]} />
    ),
   )}
   <Chimney site={BUILDINGS.casita} material={material.plain} />
   <ObservatoryWindow site={BUILDINGS.observatorio} material={material.plain} />
   <Greenhouse />
   <Smoke sources={chimneys.casita} />
   {/* El del alquimista, violeta: algo se cuece ahí dentro. */}
   <Smoke name="humo violeta" sources={chimneys.alchemist} color="#b884ff" opacity={0.46} size={1.5} rise={3.8} puffs={9} />
  </>
 );
}
