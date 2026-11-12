import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useInteractable } from "./interact";
import { withSeeThrough } from "./environment/seeThrough";
import { setBlast } from "./environment/wind";
import { Exhaust } from "./Exhaust";
import { lambert } from "./materials";
import { emit, player, rig } from "./state";
import { registerGlow } from "./theme";
import { world } from "../worlds";

const PAD_COLOR = "#ffb238";

const ALTITUDE = 34; // m a los que se queda en órbita
const IGNITION = 1.6; // s con los motores encendidos antes de levantarse
const ASCENT = 6.2; // s de subida
const DESCENT = 4.5;
const NOZZLE = 0.45; // altura de la boca de la tobera sobre la base de la nave
const BLAST_REACH = 11; // m alrededor de la plataforma en los que el empuje agita la vegetación

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Perfil del casco (radio, altura): panzudo abajo y afilado arriba. Se tornea
// alrededor del eje, así que sale redondeado en vez de un cilindro con un cono.
const HULL = [[0.72, 1.0], [1.08, 1.5], [1.33, 2.4], [1.42, 3.4], [1.36, 4.4], [1.2, 5.3], [0.98, 6.05]];
const NOSE = [[0.98, 6.05], [0.74, 6.75], [0.46, 7.35], [0.2, 7.78], [0, 7.95]];
const SIDES = 16;
const profile = (points) => points.map(([radius, y]) => new THREE.Vector2(radius, y));
const hullRadius = (y) => {
 for (let i = 0; i < HULL.length - 1; i++) {
  const [r0, y0] = HULL[i], [r1, y1] = HULL[i + 1];
  if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
 }
 return HULL[0][0];
};

// Aleta: nace en el casco, baja abriéndose y se apoya en la plataforma con una
// zapata. Su punto más bajo queda sobre la losa, no dentro de ella.
function createFin() {
 const shape = new THREE.Shape();
 shape.moveTo(1.18, 3.15);
 shape.quadraticCurveTo(2.0, 2.5, 2.12, 0.5);
 shape.lineTo(1.72, 0.5);
 shape.quadraticCurveTo(1.6, 1.5, 1.0, 1.75);
 shape.closePath();
 return new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false, curveSegments: 5 }).translate(0, 0, -0.1);
}

// El cohete: casco torneado en crema, morro, franja y aletas en naranja, ojo de
// buey luminoso.
const CREAM_HULL = "#f6ead6";
const ORANGE = "#ff7a2f";
const ORANGE_DARK = "#e8591c";
const METAL = "#5a4a44";
// Material del cohete: facetado y, como árboles y casas, translúcido (tramado)
// alrededor del astronauta cuando lo tapa.
const paint = (color, options) => withSeeThrough(lambert({ vertexColors: false, color, ...options }));
function Rocket({ flame }) {
 const material = useMemo(
  () => ({
   hull: paint(CREAM_HULL, { side: THREE.DoubleSide }),
   orange: paint(ORANGE),
   orangeDark: paint(ORANGE_DARK),
   metal: paint(METAL),
   nozzle: paint(METAL, { side: THREE.DoubleSide }),
   door: paint("#e3d3b8"),
   tip: paint("#ffd98a"),
   glass: paint("#8fe9f2", { emissive: new THREE.Color("#3fd8ff") }),
  }),
  [],
 );
 const glass = material.glass;
 const geometry = useMemo(() => ({ hull: new THREE.LatheGeometry(profile(HULL), SIDES), nose: new THREE.LatheGeometry(profile(NOSE), SIDES), fin: createFin() }), []);
 useEffect(() => {
  const stop = registerGlow(glass, 0.3, 1.1);
  return () => {
   stop();
   Object.values(geometry).forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  };
 }, [glass, geometry, material]);
 return (
  <group>
   {/* Tres aletas con su zapata. */}
   {[0, 1, 2].map((i) => (
    <group key={i} rotation-y={(i * Math.PI * 2) / 3 + Math.PI / 2}>
     <mesh geometry={geometry.fin} material={i === 0 ? material.orange : material.orangeDark} castShadow />
     <mesh position={[1.92, 0.36, 0]} material={material.metal}>
      <cylinderGeometry args={[0.3, 0.36, 0.28, 8]} />
     </mesh>
    </group>
   ))}
   {/* Tobera. */}
   <mesh position-y={0.72} material={material.nozzle}>
    <cylinderGeometry args={[0.5, 0.78, 0.62, 12, 1, true]} />
   </mesh>
   {/* Casco, franja y morro. */}
   <mesh geometry={geometry.hull} material={material.hull} castShadow />
   <mesh position-y={5.42} material={material.orange}>
    <cylinderGeometry args={[hullRadius(5.62) + 0.03, hullRadius(5.22) + 0.03, 0.4, SIDES]} />
   </mesh>
   <mesh position-y={1.72} material={material.orange}>
    <cylinderGeometry args={[hullRadius(1.9) + 0.03, hullRadius(1.54) + 0.03, 0.36, SIDES]} />
   </mesh>
   <mesh geometry={geometry.nose} material={material.orange} castShadow />
   <mesh position-y={8.02} material={material.tip}>
    <sphereGeometry args={[0.12, 8, 6]} />
   </mesh>
   {/* Ojo de buey, mirando a la cámara, y puerta. */}
   <mesh position={[0, 4.3, hullRadius(4.3) - 0.06]} rotation-x={Math.PI / 2} material={material.orange}>
    <cylinderGeometry args={[0.6, 0.6, 0.2, 16]} />
   </mesh>
   <mesh position={[0, 4.3, hullRadius(4.3) + 0.02]} rotation-x={Math.PI / 2} material={glass}>
    <cylinderGeometry args={[0.44, 0.44, 0.1, 16]} />
   </mesh>
   <mesh position={[0, 2.72, hullRadius(2.72) - 0.02]} rotation-x={-0.08} material={material.door}>
    <boxGeometry args={[0.78, 1.2, 0.1]} />
   </mesh>
   {/* Llama en la tobera: un dardo naranja y, dentro, otro casi blanco. Solo con los motores encendidos. */}
   <group ref={flame} position-y={NOZZLE} visible={false}>
    <mesh position-y={-1.5} rotation-x={Math.PI}>
     <coneGeometry args={[0.56, 3, 9, 1, true]} />
     <meshBasicMaterial color={[1.9, 0.72, 0.16]} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh position-y={-0.85} rotation-x={Math.PI}>
     <coneGeometry args={[0.3, 1.7, 7, 1, true]} />
     <meshBasicMaterial color={[2.6, 2.1, 1.1]} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} side={THREE.DoubleSide} />
    </mesh>
   </group>
  </group>
 );
}

// La nave y su viaje: subes, enciende motores, despega, se queda en órbita
// viendo el planeta entero, y vuelve a aterrizar cuando quieras.
//
// La nave no cambia nunca de tamaño. El césped tampoco se toca: el empuje solo
// lo aparta (rastro) y lo agita (ráfaga), como al resto de la vegetación.
export function Ship() {
 const SHIP = world.ship;
 const ship = useRef(null);
 const flame = useRef(null);
 const flare = useRef(null);
 const flight = useRef({ phase: "idle", time: 0, power: 0, gusts: 0 });
 const focus = useMemo(() => new THREE.Vector3(), []);
 // De dónde sale el escape en cada fotograma (lo lee Exhaust.jsx).
 const exhaust = useMemo(() => ({ x: SHIP.x, y: NOZZLE, z: SHIP.z, thrust: 0, ground: 0.2, radius: SHIP.padRadius }), [SHIP]);
 const ringMaterial = useMemo(() => new THREE.MeshLambertMaterial({ color: PAD_COLOR, emissive: PAD_COLOR }), []);
 useEffect(() => registerGlow(ringMaterial, 0.5, 2.4), [ringMaterial]);
 useEffect(() => {
  if (import.meta.env.DEV) window.__world.ship = { body: ship.current, flight: flight.current, exhaust }; // para las pruebas automáticas
 }, [exhaust]);

 const launch = () => {
  Object.assign(flight.current, { phase: "igniting", time: 0, gusts: 0 });
  player.hidden = player.frozen = true;
  player.velocity.set(0, 0, 0);
  world.shipCollider.active = false;
  emit("ship", { phase: "launch" });
 };
 const land = () => {
  Object.assign(flight.current, { phase: "descending", time: 0, gusts: 0 });
  emit("ship", { phase: "land" });
 };

 const click = useInteractable({
  position: SHIP,
  sign: { x: SHIP.x, y: 3.3, z: SHIP.z + 2.9 }, // delante de la nave, no dentro
  radius: 6.2,
  priority: 2,
  hint: () => (flight.current.phase === "orbit" ? "Aterrizar" : "Subir a la nave"),
  enabled: () => flight.current.phase === "idle" || flight.current.phase === "orbit",
  action: () => (flight.current.phase === "orbit" ? land() : launch()),
 });

 // Si el componente se desmonta en pleno vuelo, el jugador no se queda atrapado.
 useEffect(
  () => () => {
   player.hidden = player.frozen = false;
   world.shipCollider.active = true;
   setBlast(0, 0, 0, 1, 0);
   Object.assign(rig, { focus: null, distance: 1, tilt: 0, space: 0 });
  },
  [],
 );

 useFrame(({ clock }, rawDelta) => {
  const dt = Math.min(rawDelta, 0.05);
  const state = flight.current;
  const time = clock.elapsedTime;
  let progress = 0; // 0 en tierra, 1 en órbita
  let ignition = 0; // 0…1 durante el encendido

  if (state.phase === "igniting") {
   state.time += dt;
   ignition = Math.min(state.time / IGNITION, 1);
   if (state.time >= IGNITION) {
    state.phase = "ascending";
    state.time = 0;
    rig.shake = Math.max(rig.shake, 0.42);
    emit("toast", { text: "¡Despegue!", at: { x: SHIP.x, y: 1.3, z: SHIP.z + SHIP.padRadius + 0.6 } });
   }
  } else if (state.phase === "ascending") {
   state.time += dt;
   // Aceleración progresiva: arranca despacio (cúbica) y frena al llegar a la órbita.
   progress = ease(Math.min(state.time / ASCENT, 1));
   if (state.time >= ASCENT) {
    state.phase = "orbit";
    emit("toast", { text: "En órbita" });
   }
  } else if (state.phase === "descending") {
   state.time += dt;
   progress = 1 - ease(Math.min(state.time / DESCENT, 1));
   if (state.time >= DESCENT) {
    state.phase = "idle";
    // De vuelta en tierra: el astronauta sale por delante de la nave.
    player.position.set(SHIP.x, 0, SHIP.z + SHIP.padRadius + 0.9);
    player.facing = Math.PI;
    player.hidden = player.frozen = false;
    world.shipCollider.active = true;
    Object.assign(rig, { focus: null, distance: 1, tilt: 0, space: 0 });
   }
  } else if (state.phase === "orbit") {
   progress = 1;
  }
  const height = progress * ALTITUDE;
  const flying = state.phase !== "idle";
  const thrusting = state.phase === "igniting" || state.phase === "ascending" || state.phase === "descending";

  // Potencia de los motores: sube durante el encendido, a tope al despegar y
  // al frenar la caída; en órbita queda un piloto.
  const wanted = state.phase === "igniting" ? 0.25 + ignition * 0.6 : state.phase === "orbit" ? 0.3 : thrusting ? 1 : 0;
  state.power += (wanted - state.power) * Math.min(1, dt * 6);

  // Posición: en el encendido vibra un poco; en órbita deriva en círculo.
  const drift = state.phase === "orbit" ? 1 : progress * progress;
  const tremble = state.phase === "igniting" ? 0.022 * ignition : state.phase === "ascending" ? 0.03 * Math.max(0, 1 - progress * 8) : 0;
  ship.current.position.set(
   SHIP.x + Math.sin(time * 0.3) * 3 * drift + Math.sin(time * 71) * tremble,
   height + (flying ? Math.sin(time * 1.7) * 0.25 * drift : 0) + Math.abs(Math.sin(time * 57)) * tremble * 0.6,
   SHIP.z + Math.cos(time * 0.3) * 3 * drift + Math.cos(time * 63) * tremble,
  );
  ship.current.rotation.y = flying ? time * 0.25 * drift : 0;

  if (flying) {
   // La cámara sigue al cohete mientras sube y, ya arriba, se abre para ver
   // el planeta entero desde lo alto.
   const open = Math.min(1, Math.max(0, (progress - 0.3) / 0.55));
   const wide = open * open * (3 - 2 * open);
   focus.set(
    THREE.MathUtils.lerp(ship.current.position.x, SHIP.x * 0.15, wide),
    THREE.MathUtils.lerp(height + 2.6, height * 0.28, wide),
    THREE.MathUtils.lerp(ship.current.position.z, SHIP.z * 0.03, wide),
   );
   rig.focus = focus;
   // En el encendido se retira un poco para que quepan la nave y el humo.
   rig.distance = 1 + ignition * 0.5 + (state.phase === "igniting" ? 0 : 0.5 + progress * progress * 11.3);
   rig.tilt = wide;
   rig.space = Math.min(1, progress * 1.3);
   // Vibración suave en el encendido, más fuerte al levantarse, y se apaga al subir.
   const rumble = state.phase === "igniting" ? 0.1 + ignition * 0.12 : state.phase === "orbit" ? 0 : 0.26 * Math.max(0, 1 - progress * 3.2);
   rig.shake = Math.max(rig.shake, rumble);
  }

  // Llama: crece con la potencia y tiembla.
  flame.current.visible = state.power > 0.03;
  const flicker = 0.86 + Math.sin(time * 43) * 0.09 + Math.sin(time * 27) * 0.06;
  flame.current.scale.set(0.7 + state.power * 0.4 * flicker, state.power * flicker, 0.7 + state.power * 0.4 * flicker);

  // Llamarada: la llama choca con la plataforma y se abre sobre ella. Se ve
  // desde el encendido y se apaga en cuanto la tobera se separa unos metros.
  const close = Math.max(0, 1 - height / 4.5);
  flare.current.visible = thrusting && state.power * close > 0.03;
  const spread = (0.55 + state.power * 0.75) * (0.9 + 0.1 * flicker) * (1 + (1 - close) * 0.5);
  flare.current.scale.set(spread, 0.5 + state.power * close * flicker * 0.8, spread);
  flare.current.rotation.y = time * 2.3;

  // Escape: humo, polvo y chispas (solo cerca del suelo; ver Exhaust.jsx).
  exhaust.x = ship.current.position.x;
  exhaust.y = ship.current.position.y + NOZZLE;
  exhaust.z = ship.current.position.z;
  exhaust.thrust = thrusting ? state.power : 0;

  // La vegetación reacciona: el empuje inclina y agita lo que hay alrededor de
  // la plataforma (hierba, flores, arbustos, árboles) y lanza ráfagas que
  // recorren el resto del planeta.
  const near = thrusting ? Math.max(0, 1 - height / 14) : 0;
  setBlast(SHIP.x, SHIP.z, SHIP.padRadius, SHIP.padRadius + BLAST_REACH, near * state.power * (0.8 + 0.2 * Math.sin(time * 17)));
  if (state.phase === "ascending" && state.gusts === 0) {
   // Al levantarse, una ráfaga suave recorre el resto del planeta.
   state.gusts = 1;
   emit("gust", { x: SHIP.x, z: SHIP.z, strength: 0.45, quiet: true });
  }
 });

 return (
  <>
   {/* Plataforma de despegue. */}
   <group name="plataforma de la nave" userData={{ rests: 0 }} position={[SHIP.x, 0, SHIP.z]}>
    <mesh position-y={0.1} receiveShadow>
     <cylinderGeometry args={[SHIP.padRadius, SHIP.padRadius + 0.3, 0.2, 24]} />
     <meshLambertMaterial color={SHIP.color ?? "#3b2a5c"} flatShading />
    </mesh>
    <mesh position-y={0.21} rotation-x={-Math.PI / 2} material={ringMaterial}>
     <ringGeometry args={[SHIP.padRadius - 0.75, SHIP.padRadius - 0.45, 40]} />
    </mesh>
   </group>
   {/* Llamarada sobre la losa (fuera del grupo medido: no es un objeto apoyado). */}
   <group ref={flare} position={[SHIP.x, 0.21, SHIP.z]} visible={false}>
    <mesh position-y={0.16}>
     <cylinderGeometry args={[0.42, 1.45, 0.32, 9, 1, true]} />
     <meshBasicMaterial color={[1.35, 0.4, 0.06]} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh position-y={0.13}>
     <cylinderGeometry args={[0.3, 0.8, 0.26, 7, 1, true]} />
     <meshBasicMaterial color={[1.6, 0.95, 0.3]} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} side={THREE.DoubleSide} />
    </mesh>
   </group>

   <group ref={ship} name="cohete" userData={{ rests: 0.2 }} position={[SHIP.x, 0, SHIP.z]} {...click}>
    <Rocket flame={flame} />
    {/* Zona de clic generosa. */}
    <mesh position-y={4.2}>
     <cylinderGeometry args={[2.3, 2.3, 8.6, 10]} />
     <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
   </group>

   <Exhaust source={exhaust} />
  </>
 );
}
