import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useInteractable } from "./interact";
import { keepFlat } from "./environment/bend";
import { withSeeThrough } from "./environment/seeThrough";
import { setBlast } from "./environment/wind";
import { Exhaust } from "./Exhaust";
import { lambert } from "./materials";
import { ORBIT_VIEW, emit, events, player, rig, voyage } from "./state";
import { materialColor, normalWorld, vec3 } from "three/tsl";
import { addWarmSource } from "./lightSources";
import { registerGlow, uniforms } from "./theme";
import { Halos } from "../worlds/living/props/Halos";
import { world } from "../worlds";
import { travelTo, voyageDone } from "../worlds/travel";

const PAD_COLOR = "#ffb238";

// El viaje: la nave sube a plomo por el eje del planeta mientras el mundo se
// curva bajo ella y, en el último tramo, se tumba y se coloca en órbita:
// delante del planeta entero, de costado, justo por donde mira la cámara
// (`ORBIT_VIEW`). El planeta es pequeño (32 m de radio): no hace falta ir lejos.
const ALTITUDE = ORBIT_VIEW.ship[1] * 0.8; // m que sube por el eje
const CLOSED_AT = 0.5; // fracción de la subida a la que el mundo ya es una esfera cerrada
export const UNCULL_AT = 0.03; // curvatura a partir de la cual deja de descartarse lo que queda fuera de cuadro
const IGNITION = 1.6; // s con los motores encendidos antes de levantarse
const ASCENT = 7.4; // s de subida
const DESCENT = 5.6;
const DEPART = 2.3; // s que tarda en alejarse hacia otro mundo (lo que tarda en cubrirse la pantalla; ver worlds/travel.js)
const DEPART_REACH = 420; // m que llega a alejarse en ese tiempo
const ARRIVAL_PAUSE = 1.5; // s en la órbita del mundo al que se llega, antes de bajar
const ORBIT_TURN = 0.05; // rad/s a los que la cámara rodea el planeta en órbita: se le ve girar muy despacio (una vuelta cada dos minutos)
const NOZZLE = 0.45; // altura de la boca de la tobera sobre la base de la nave
const BLAST_REACH = 11; // m alrededor de la plataforma en los que el empuje agita la vegetación

const UP = new THREE.Vector3(0, 1, 0);
// En órbita la nave va tumbada, con el morro hacia el este y el ojo de buey hacia la cámara.
const LYING = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -1.18).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2));
const smooth = (t) => t * t * (3 - 2 * t);
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
// De noche tiene luz propia: como si lo bañaran los focos de la plataforma,
// cada pieza devuelve su color en cálido —también vista desde arriba, que es
// como se ve desde lejos—, y algo más lo que mira al sur (a la cámara).
// Va en el material, así que se ve desde cualquier punto de la isla y no gasta
// ninguna de las luces de verdad.
const paint = (color, options) => {
 const material = withSeeThrough(lambert({ vertexColors: false, color, ...options }));
 material.emissiveNode = materialColor.mul(vec3(1, 0.8, 0.56)).mul(uniforms.uGlow).mul(normalWorld.z.max(0).mul(0.22).add(normalWorld.y.negate().max(0).mul(0.12)).add(normalWorld.y.max(0).mul(0.14)).add(0.34));
 return material;
};
// Focos de la plataforma: tres, al borde de la losa, mirando al cohete.
const SPOT_ANGLES = [Math.PI / 2 - 0.62, Math.PI / 2 + 0.62, -Math.PI / 2];
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
   // Ventanilla: de día, cristal azulado; de noche, encendida en cálido.
   glass: withSeeThrough(lambert({ vertexColors: false, color: "#8fe9f2", emissive: new THREE.Color("#ffd28a") })),
   // Ventanillas pequeñas en redondo, bajo el morro: son las que se ven encendidas desde arriba y desde los lados.
   port: withSeeThrough(lambert({ vertexColors: false, color: "#bfeff2", emissive: new THREE.Color("#ffc46a") })),
  }),
  [],
 );
 const glass = material.glass;
 const geometry = useMemo(() => ({ hull: new THREE.LatheGeometry(profile(HULL), SIDES), nose: new THREE.LatheGeometry(profile(NOSE), SIDES), fin: createFin() }), []);
 useEffect(() => {
  const stop = registerGlow(glass, 0.22, 1.3);
  const stopPorts = registerGlow(material.port, 0.15, 1.3);
  return () => {
   stop();
   stopPorts();
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
   {[1, 2, 3, 4, 5].map((i) => {
    return (
     <group key={i} rotation-y={(i * Math.PI * 2) / 6}>
      <mesh position={[0, 4.95, hullRadius(4.95) + 0.01]} rotation-x={Math.PI / 2 - 0.14} material={material.port}>
       <cylinderGeometry args={[0.2, 0.2, 0.08, 10]} />
      </mesh>
     </group>
    );
   })}
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
 // (Si se llega de otro mundo, la nave nace ya en órbita, con el astronauta dentro, y baja sola.)
 const flight = useRef(voyage.phase === "loading" ? { phase: "orbit", time: 0, power: 0.3, gusts: 1, turn: 0, arriving: 0, then: null } : { phase: "idle", time: 0, power: 0, gusts: 0, turn: 0, arriving: null, then: null });
 const heading = useMemo(() => ({ from: new THREE.Vector3(), along: new THREE.Vector3(), nose: new THREE.Quaternion(), start: new THREE.Quaternion() }), []);
 const orbitFocus = useMemo(() => new THREE.Vector3(...ORBIT_VIEW.focus), []);
 const turning = useMemo(() => new THREE.Quaternion(), []);
 const scene = useThree((state) => state.scene);
 // Lo que deja de descartarse por encuadre mientras el mundo está curvado (ver abajo).
 const uncull = useRef(null);
 // La nave no se curva con el mundo (a su altura se ensancharía): va rígida.
 useEffect(() => keepFlat(ship.current), []);
 const focus = useMemo(() => new THREE.Vector3(), []);
 // Dónde van los rótulos en vuelo: encima y debajo de la nave, sin taparla (ver más abajo).
 const cards = useMemo(() => ({ above: new THREE.Vector3(), below: new THREE.Vector3(), up: new THREE.Vector3(), centre: new THREE.Vector3() }), []);
 // De dónde sale el escape en cada fotograma (lo lee Exhaust.jsx).
 const exhaust = useMemo(() => ({ x: SHIP.x, y: NOZZLE, z: SHIP.z, thrust: 0, ground: 0.2, radius: SHIP.padRadius }), [SHIP]);
 const ringMaterial = useMemo(() => new THREE.MeshLambertMaterial({ color: PAD_COLOR, emissive: PAD_COLOR }), []);
 useEffect(() => registerGlow(ringMaterial, 0.5, 2.4), [ringMaterial]);
 // Los focos: dónde está cada uno, su lente encendida, su halo y su luz.
 const spots = useMemo(() => SPOT_ANGLES.map((angle) => ({ angle, x: SHIP.x + Math.cos(angle) * (SHIP.padRadius - 0.32), z: SHIP.z + Math.sin(angle) * (SHIP.padRadius - 0.32) })), [SHIP]);
 const lens = useMemo(() => new THREE.MeshLambertMaterial({ color: "#000000", emissive: "#ffc878" }), []);
 const lensPoints = useMemo(() => spots.map((spot) => [spot.x - Math.cos(spot.angle) * 0.1, 0.42, spot.z - Math.sin(spot.angle) * 0.1]), [spots]);
 useEffect(() => {
  const stop = [registerGlow(lens, 0.3, 1.3), ...spots.map((spot) => addWarmSource({ x: spot.x - Math.cos(spot.angle) * 1.1, y: 1.3, z: spot.z - Math.sin(spot.angle) * 1.1, reach: 10, power: 1.15, flicker: 0.01 }))];
  return () => {
   stop.forEach((off) => off());
   lens.dispose();
  };
 }, [lens, spots]);
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
  // La vuelta que se haya dado alrededor del planeta se deshace por el lado corto.
  const turn = Math.atan2(Math.sin(flight.current.turn), Math.cos(flight.current.turn));
  Object.assign(flight.current, { phase: "descending", time: 0, gusts: 0, turn });
  emit("ship", { phase: "land" });
 };
 // Sale de la órbita hacia otro mundo: pone el morro hacia él y acelera hasta
 // perderse de vista mientras la pantalla se cubre (ver worlds/travel.js).
 const depart = (to, towards) => {
  if (flight.current.phase !== "orbit" || voyage.phase !== "idle") return;
  travelTo(to, towards ?? voyage.spot?.(to) ?? null);
 };
 useEffect(() => {
  const onVoyage = (event) => {
   const state = flight.current;
   const { phase } = event.detail ?? {};
   if (phase === "leaving" && state.phase === "orbit") {
    heading.from.copy(ship.current.position);
    // (Sin saber dónde queda: hacia arriba y a la derecha de la vista.)
    if (voyage.towards) heading.along.copy(voyage.towards).sub(heading.from).normalize();
    else heading.along.set(0.6, 0.5, -0.62).normalize();
    heading.start.copy(ship.current.quaternion);
    heading.nose.setFromUnitVectors(UP, heading.along);
    Object.assign(state, { phase: "departing", time: 0 });
    emit("ship", { phase: "depart", to: event.detail.to });
   } else if (phase === "failed" && state.phase === "departing") {
    Object.assign(state, { phase: "orbit", time: 0 });
    emit("toast", { text: "No se ha podido viajar. Inténtalo otra vez.", at: cards.above });
   }
  };
  // Viaje pedido desde el menú: despega si está en tierra y, ya en órbita, sale.
  const onRequest = (event) => {
   const state = flight.current, to = event.detail?.to;
   if (!to || to === world.id || voyage.phase !== "idle") return;
   if (state.phase === "orbit") depart(to);
   else if (state.phase === "idle") {
    state.then = to;
    launch();
   } else if (state.phase !== "descending") state.then = to;
  };
  events.addEventListener("voyage", onVoyage);
  events.addEventListener("voyage-request", onRequest);
  // Recién llegada de otro mundo: el astronauta va dentro.
  if (flight.current.arriving !== null) {
   player.hidden = player.frozen = true;
   world.shipCollider.active = false;
  }
  return () => {
   events.removeEventListener("voyage", onVoyage);
   events.removeEventListener("voyage-request", onRequest);
   voyage.canLeave = false;
  };
  // (`depart` y `launch` solo leen referencias estables.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const GROUND_SIGN = useMemo(() => ({ x: SHIP.x, y: 3.3, z: SHIP.z + 2.9 }), [SHIP]);
 const click = useInteractable({
  position: SHIP,
  // Delante de la nave, no dentro. En órbita, debajo de ella en la pantalla.
  sign: () => (flight.current.phase === "orbit" ? cards.below : GROUND_SIGN),
  radius: 6.2,
  priority: 2,
  hint: () => (flight.current.phase === "orbit" ? "Aterrizar" : "Subir a la nave"),
  enabled: () => voyage.phase === "idle" && (flight.current.phase === "idle" || flight.current.phase === "orbit"),
  action: () => (flight.current.phase === "orbit" ? land() : launch()),
 });

 // Si el componente se desmonta en pleno vuelo, el jugador no se queda atrapado.
 useEffect(
  () => () => {
   player.hidden = player.frozen = false;
   world.shipCollider.active = true;
   setBlast(0, 0, 0, 1, 0);
   Object.assign(rig, { focus: null, distance: 1, tilt: 0, space: 0, bend: 0, yaw: 0, cards: null });
   uncull.current?.forEach((object) => (object.frustumCulled = true));
   uncull.current = null;
  },
  [],
 );

 useFrame(({ clock, camera }, rawDelta) => {
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
    state.time = 0;
    if (!state.then) emit("toast", { text: "En órbita", at: cards.above });
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
    state.turn = 0;
    Object.assign(rig, { focus: null, distance: 1, tilt: 0, space: 0, bend: 0, yaw: 0, cards: null });
    // (Si se venía de otro mundo, aquí acaba el viaje.)
    if (voyage.phase === "arriving") voyageDone();
   }
  } else if (state.phase === "orbit") {
   progress = 1;
   state.turn += dt * ORBIT_TURN;
   state.time += dt;
   // Viaje pedido desde el menú: un momento en órbita y sale hacia el otro mundo.
   if (state.then && state.time > 0.9) {
    const to = state.then;
    state.then = null;
    depart(to);
   }
   // Recién llegada de otro mundo: en cuanto se destapa la pantalla, un respiro para ver el planeta y baja.
   if (state.arriving !== null && voyage.phase === "arriving" && state.arriving > ARRIVAL_PAUSE) {
    state.arriving = null;
    land();
   }
  } else if (state.phase === "departing") {
   progress = 1;
   state.time += dt;
  }
  voyage.canLeave = state.phase === "orbit" && voyage.phase === "idle" && state.arriving === null;
  const height = progress * ALTITUDE;
  // Último tramo: de subir por el eje a quedar en órbita, tumbada, delante del planeta.
  const wide = Math.pow(Math.min(1, Math.max(0, (progress - 0.55) / 0.45)), 1.6);
  const flying = state.phase !== "idle";
  const leaving = state.phase === "departing";
  const thrusting = state.phase === "igniting" || state.phase === "ascending" || state.phase === "descending" || leaving;

  // Potencia de los motores: sube durante el encendido, a tope al despegar y
  // al frenar la caída; en órbita queda un piloto.
  const wanted = state.phase === "igniting" ? 0.25 + ignition * 0.6 : state.phase === "orbit" ? 0.3 : thrusting ? 1 : 0;
  state.power += (wanted - state.power) * Math.min(1, dt * 6);

  // Posición: en el encendido vibra un poco; en órbita deriva en círculo.
  const drift = state.phase === "orbit" || leaving ? 1 : progress * progress;
  const tremble = state.phase === "igniting" ? 0.022 * ignition : state.phase === "ascending" ? 0.03 * Math.max(0, 1 - progress * 8) : 0;
  // En órbita la cámara rodea despacio el planeta (se le ve girar) y la nave va
  // con ella, por delante; al bajar, las dos deshacen la vuelta.
  const around = state.phase === "orbit" || leaving ? state.turn : state.phase === "descending" ? state.turn * progress * progress : 0;
  // (Tumbada, el morro mira al este: se retrasa media eslora para que sea su centro, y no su base, lo que queda en el centro de la vista.)
  const offX = Math.sin(time * 0.3) * 0.8 * drift + Math.sin(time * 71) * tremble - smooth(wide) * 4;
  const offZ = wide * ORBIT_VIEW.ship[2] + Math.cos(time * 0.3) * 0.8 * drift + Math.cos(time * 63) * tremble;
  ship.current.position.set(
   SHIP.x + offX * Math.cos(around) + offZ * Math.sin(around),
   height + (ORBIT_VIEW.ship[1] - height) * wide + (flying ? Math.sin(time * 1.7) * 0.25 * drift : 0) + Math.abs(Math.sin(time * 57)) * tremble * 0.6,
   SHIP.z - offX * Math.sin(around) + offZ * Math.cos(around),
  );
  // Sube derecha y, al entrar en órbita, se tumba.
  if (flying) ship.current.quaternion.setFromAxisAngle(UP, around).multiply(turning.identity().slerp(LYING, smooth(wide)));
  else ship.current.quaternion.identity();
  // Rumbo a otro mundo: gira el morro hacia él y acelera hasta perderse de vista.
  if (leaving) {
   const t = Math.min(1, state.time / DEPART);
   ship.current.quaternion.copy(heading.start).slerp(heading.nose, smooth(Math.min(1, t * 2.6)));
   ship.current.position.copy(heading.from).addScaledVector(heading.along, Math.pow(Math.max(0, t - 0.16) / 0.84, 2.6) * DEPART_REACH);
   rig.shake = Math.max(rig.shake, 0.16 * (1 - t));
  }

  // El mundo se curva con la altura: plano en tierra, esfera cerrada a media subida.
  if (flying) rig.bend = world.planet ? smooth(Math.min(1, progress / CLOSED_AT)) : 0;
  // Curvado, lo que three descarta por quedar fuera de cuadro en el mundo plano
  // puede estar a la vista (y al revés): mientras dura, no se descarta nada.
  // (Con la curva apenas empezada nada se ha movido aún ni medio metro: se
  // espera a `UNCULL_AT`, que dibujarlo todo cuesta y la cámara sigue cerca.)
  // (Al llegar de otro mundo la nave se monta antes que parte del planeta: se repasa al destaparse.)
  const fresh = state.arriving === 0 && voyage.phase === "arriving";
  if (rig.bend > UNCULL_AT && (!uncull.current || fresh)) {
   uncull.current ??= [];
   scene.traverse((object) => {
    if (!object.frustumCulled || !(object.isMesh || object.isLine || object.isPoints)) return;
    object.frustumCulled = false;
    uncull.current.push(object);
   });
  } else if (rig.bend === 0 && uncull.current) {
   uncull.current.forEach((object) => (object.frustumCulled = true));
   uncull.current = null;
  }

  if (flying) {
   // La cámara sigue al cohete mientras sube, alejándose cada vez más, y en el
   // último tramo deja de mirarle a él para mirar al planeta entero, con la
   // nave delante (ver `ORBIT_VIEW`). Todo es continuo: no hay corte.
   const above = Math.min(1, Math.max(0, (progress - 0.3) / 0.7));
   // (Cuando sale hacia otro mundo, la cámara se queda con el planeta.)
   if (leaving) focus.copy(orbitFocus);
   else focus.set(ship.current.position.x, ship.current.position.y + 2.6, ship.current.position.z).lerp(orbitFocus, wide);
   rig.focus = focus;
   // En el encendido se retira un poco para que quepan la nave y el humo.
   // (En el fotograma en que se levanta, `ignition` aún vale 1 y la fase ya es la subida: no se suman las dos cosas.)
   rig.distance = 1 + (state.phase === "igniting" ? ignition * 0.5 : 0.5 + Math.pow(progress, 1.35) * (ORBIT_VIEW.distance - 1.5));
   // (Se aleja pronto: la nave sube muy deprisa y la cámara la sigue con algo de retardo; de cerca se le escaparía por arriba.)
   rig.tilt = ORBIT_VIEW.tilt * above * above * (3 - 2 * above);
   rig.yaw = around;
   rig.space = Math.min(1, progress * 2.4);
   // Rótulos: mientras sube, por encima del morro. En órbita la nave va tumbada
   // en el centro de la vista: el logro y los avisos van encima de ella en la
   // pantalla y la indicación de aterrizar, debajo; ninguno la tapa.
   const lying = smooth(wide);
   cards.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
   cards.centre.set(0, 0, -ORBIT_VIEW.shipAway).applyMatrix4(camera.matrixWorld);
   cards.above.set(ship.current.position.x, ship.current.position.y + 10.2, ship.current.position.z).lerp(cards.below.copy(cards.centre).addScaledVector(cards.up, 6.4), lying);
   cards.below.copy(cards.centre).addScaledVector(cards.up, -5.6);
   rig.cards = cards;
   // Vibración suave en el encendido, más fuerte al levantarse, y se apaga al subir.
   const rumble = state.phase === "igniting" ? 0.1 + ignition * 0.12 : state.phase === "orbit" ? 0 : 0.26 * Math.max(0, 1 - progress * 3.2);
   rig.shake = Math.max(rig.shake, rumble);
  }

  if (state.arriving !== null && voyage.phase === "arriving") state.arriving += dt;

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
   {/* Focos al borde de la losa. */}
   {spots.map((spot, i) => (
    <group key={i} position={[spot.x, 0.2, spot.z]} rotation-y={-spot.angle + Math.PI}>
     <mesh position-y={0.08}>
      <boxGeometry args={[0.2, 0.16, 0.3]} />
      <meshLambertMaterial color="#2c2f36" flatShading />
     </mesh>
     <mesh position={[0.07, 0.24, 0]} rotation-z={0.7}>
      <boxGeometry args={[0.26, 0.2, 0.24]} />
      <meshLambertMaterial color="#3a3e47" flatShading />
     </mesh>
     <mesh position={[0.16, 0.32, 0]} rotation-z={0.7} material={lens}>
      <boxGeometry args={[0.04, 0.15, 0.19]} />
     </mesh>
    </group>
   ))}
   <Halos points={lensPoints} size={1.7} night={0.6} />
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
