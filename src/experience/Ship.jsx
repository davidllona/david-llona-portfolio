import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useInteractable } from "./interact";
import { withSeeThrough } from "./environment/seeThrough";
import { setBlast } from "./environment/wind";
import { Exhaust } from "./Exhaust";
import { lambert } from "./materials";
import { ORBIT_VIEW, emit, player, rig } from "./state";
import { materialColor, normalWorld, vec3 } from "three/tsl";
import { addWarmSource } from "./lightSources";
import { registerGlow, uniforms } from "./theme";
import { Halos } from "../worlds/living/props/Halos";
import { world } from "../worlds";

const PAD_COLOR = "#ffb238";

// La órbita: muy por encima de la isla y algo al sur de ella (la nave sube
// trazando un arco, como un cohete de verdad), justo por donde mira la cámara
// de la órbita: se la ve delante del planeta entero.
const ALTITUDE = 440; // m a los que se queda en órbita
const DOWNRANGE = 163; // m hacia el sur a los que queda, al final del arco
const IGNITION = 1.6; // s con los motores encendidos antes de levantarse
const ASCENT = 7.4; // s de subida
const DESCENT = 5.6;
const ORBIT_TURN = 0.035; // rad/s a los que la cámara rodea el planeta en órbita: se le ve girar despacio
const NOZZLE = 0.45; // altura de la boca de la tobera sobre la base de la nave
const BLAST_REACH = 11; // m alrededor de la plataforma en los que el empuje agita la vegetación

const UP = new THREE.Vector3(0, 1, 0), ACROSS = new THREE.Vector3(1, 0, 0);
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
 const flight = useRef({ phase: "idle", time: 0, power: 0, gusts: 0, turn: 0 });
 const orbitFocus = useMemo(() => new THREE.Vector3(...ORBIT_VIEW.focus), []);
 const turning = useMemo(() => new THREE.Quaternion(), []);
 const focus = useMemo(() => new THREE.Vector3(), []);
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
   Object.assign(rig, { focus: null, distance: 1, tilt: 0, space: 0, yaw: 0 });
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
    state.turn = 0;
    Object.assign(rig, { focus: null, distance: 1, tilt: 0, space: 0, yaw: 0 });
   }
  } else if (state.phase === "orbit") {
   progress = 1;
   state.turn += dt * ORBIT_TURN;
  }
  const height = progress * ALTITUDE;
  // El arco: sube casi a plomo y se va tumbando hacia el sur.
  const south = progress * progress * DOWNRANGE;
  const lean = Math.atan2(2 * progress * DOWNRANGE, ALTITUDE) * Math.min(1, progress * 4);
  const flying = state.phase !== "idle";
  const thrusting = state.phase === "igniting" || state.phase === "ascending" || state.phase === "descending";

  // Potencia de los motores: sube durante el encendido, a tope al despegar y
  // al frenar la caída; en órbita queda un piloto.
  const wanted = state.phase === "igniting" ? 0.25 + ignition * 0.6 : state.phase === "orbit" ? 0.3 : thrusting ? 1 : 0;
  state.power += (wanted - state.power) * Math.min(1, dt * 6);

  // Posición: en el encendido vibra un poco; en órbita deriva en círculo.
  const drift = state.phase === "orbit" ? 1 : progress * progress;
  const tremble = state.phase === "igniting" ? 0.022 * ignition : state.phase === "ascending" ? 0.03 * Math.max(0, 1 - progress * 8) : 0;
  // En órbita la cámara rodea despacio el planeta (se le ve girar) y la nave va
  // con ella, por delante; al bajar, las dos deshacen la vuelta.
  const around = state.phase === "orbit" ? state.turn : state.phase === "descending" ? state.turn * progress * progress : 0;
  const offX = Math.sin(time * 0.3) * 3 * drift + Math.sin(time * 71) * tremble;
  const offZ = south + Math.cos(time * 0.3) * 3 * drift + Math.cos(time * 63) * tremble;
  ship.current.position.set(
   SHIP.x + offX * Math.cos(around) + offZ * Math.sin(around),
   height + (flying ? Math.sin(time * 1.7) * 0.25 * drift : 0) + Math.abs(Math.sin(time * 57)) * tremble * 0.6,
   SHIP.z - offX * Math.sin(around) + offZ * Math.cos(around),
  );
  // Gira despacio sobre su eje y apunta hacia donde va.
  if (flying) ship.current.quaternion.setFromAxisAngle(UP, around).multiply(turning.setFromAxisAngle(ACROSS, lean)).multiply(turning.setFromAxisAngle(UP, time * 0.25 * drift));
  else ship.current.quaternion.identity();

  if (flying) {
   // La cámara sigue al cohete mientras sube, alejándose cada vez más, y en el
   // último tramo deja de mirarle a él para mirar al planeta entero, con la
   // nave delante (ver `ORBIT_VIEW`). Todo es continuo: no hay corte.
   const wide = Math.pow(Math.min(1, Math.max(0, (progress - 0.55) / 0.45)), 1.6);
   const above = Math.min(1, Math.max(0, (progress - 0.3) / 0.7));
   focus.set(ship.current.position.x, height + 2.6, ship.current.position.z).lerp(orbitFocus, wide);
   rig.focus = focus;
   // En el encendido se retira un poco para que quepan la nave y el humo.
   rig.distance = 1 + ignition * 0.5 + (state.phase === "igniting" ? 0 : 0.5 + Math.pow(progress, 1.35) * (ORBIT_VIEW.distance - 1.5));
   // (Se aleja pronto: la nave sube muy deprisa y la cámara la sigue con algo de retardo; de cerca se le escaparía por arriba.)
   rig.tilt = ORBIT_VIEW.tilt * above * above * (3 - 2 * above);
   rig.yaw = around;
   rig.space = Math.min(1, progress * 2.4);
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
