import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useFrame } from "@react-three/fiber";
import { mix, normalView, normalWorld, positionViewDirection, smoothstep, uniform, vec3 } from "three/tsl";
import { PLANET, bendPoint, uClosed } from "../../experience/environment/bend";
import { celestial, createMoon } from "../../experience/intro/skyModels";
import { unlit } from "../../experience/materials";
import { ORBIT_VIEW, rig } from "../../experience/state";
import { createGlowTexture } from "../../experience/textures";
import { current, sunDirection, uniforms } from "../../experience/theme";
import { fontReady } from "../../ui/fonts";
import { randomFrom, tube } from "./kit/geometry";

// Lo que el planeta necesita para verse como tal desde la nave. EL PLANETA ES
// LA ISLA: no hay otro modelo. Al subir, el mundo entero se curva (ver
// experience/environment/bend.js) hasta cerrarse en una esfera de 32 m de
// radio, con la isla ocupando casi todo el hemisferio que se ve y su mar
// alrededor, hasta el borde. Aquí solo va lo que le falta a esa esfera:
//  · un fondo de mar opaco, que se curva con todo lo demás y la cierra por
//    debajo del agua (que es translúcida) hasta el antípoda;
//  · la sombra del lado de noche y el halo de la atmósfera;
//  · el cielo de la órbita: estrellas, la luna y, a lo lejos, los otros dos
//    mundos del porfolio como destinos todavía cerrados. Solo son astros con
//    su rótulo: de esos mundos no hay nada construido.
const SEA_FLOOR = -4.7; // m: por debajo del fondo de la isla
const SEA_REACH = 150; // m: como el mar (water/Water.jsx)
const AIR = 11; // m sobre el suelo hasta donde llega la sombra de la noche: por encima de árboles y casas
const FLAT = { flat: true }; // (lo que no se curva con el mundo)
const COARSE = { coarse: true }; // (ya viene en anillos: no hay que partirlo más; ver `splitLongFaces`)

const wobble = (p, scale, seed = 0) => {
 const x = p.x * scale + seed, y = p.y * scale + seed * 1.7, z = p.z * scale - seed;
 return (Math.sin(x * 1.3 + y * 0.7) + Math.sin(y * 1.9 - z * 1.1 + 1.3) + Math.sin(z * 1.6 + x * 0.9 + 2.1) + Math.sin((x + y + z) * 0.8)) / 4;
};
const smooth = (a, b, x) => {
 const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
 return t * t * (3 - 2 * t);
};

// Pinta cada cara con `paint(centro, color, datos)` y deja normales planas.
function faceted(geometry, paint, extra) {
 const points = geometry.attributes.position;
 const colors = new Float32Array(points.count * 3);
 const data = extra ? new Float32Array(points.count) : null;
 const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), centre = new THREE.Vector3(), colour = new THREE.Color();
 for (let i = 0; i < points.count; i += 3) {
  centre.copy(a.fromBufferAttribute(points, i)).add(b.fromBufferAttribute(points, i + 1)).add(c.fromBufferAttribute(points, i + 2)).divideScalar(3);
  const value = paint(centre, colour);
  for (let k = 0; k < 3; k++) {
   colour.toArray(colors, (i + k) * 3);
   if (data) data[i + k] = value;
  }
 }
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 if (data) geometry.setAttribute(extra, new THREE.BufferAttribute(data, 1));
 geometry.deleteAttribute("uv");
 geometry.computeVertexNormals();
 return geometry;
}

// Fondo del mar: un disco en anillos, bajo el agua. Sin curvar tiene el color
// del horizonte (no se distingue); curvado, el del mar hondo.
function createSeaBed() {
 return new THREE.RingGeometry(34, SEA_REACH, 96, 30).rotateX(-Math.PI / 2);
}
function createSeaBedMaterial() {
 const material = unlit();
 material.colorNode = mix(uniform(current.background), uniforms.uWaterDeep.mul(0.78), uClosed);
 return material;
}
// Sombra del lado de noche: una esfera algo mayor que el planeta, transparente
// donde da la luz y oscura donde no llega. La luz de la isla viene de muy
// arriba (su lado de noche quedaría detrás, donde no se mira): para esta
// sombra se tumba, y así se ve caer por el borde contrario al sol.
function createShadeMaterial(shown, from) {
 const material = unlit({ transparent: true, depthWrite: false, fog: false });
 material.userData.flat = true;
 material.colorNode = vec3(0.012, 0.016, 0.06);
 // (Hacia su propio borde se desvanece: lo que oscurece es el planeta, no un disco a su alrededor.)
 material.opacityNode = smoothstep(0.12, -0.42, normalWorld.dot(from)).mul(0.8).mul(shown).mul(smoothstep(0.12, 0.5, normalView.dot(positionViewDirection)));
 return material;
}

// ── Los otros dos mundos ────────────────────────────────────────────────────
// Solo se ven de lejos. Nombres provisionales (los del plan del porfolio).
// El segundo: oscuro y retorcido, de cuento gótico. Morados y grises, crestas
// en espiral y dos colinas enroscadas.
function createTwistedWorld() {
 const random = randomFrom(0.52);
 const geometry = new THREE.IcosahedronGeometry(1, 9);
 const points = geometry.attributes.position;
 const point = new THREE.Vector3();
 const ridge = (p) => Math.sin(Math.atan2(p.z, p.x) * 3 + Math.asin(Math.min(1, Math.max(-1, p.y))) * 8);
 for (let i = 0; i < points.count; i++) {
  point.fromBufferAttribute(points, i).normalize();
  point.multiplyScalar(1 + ridge(point) * 0.045 + wobble(point, 3.2, 2) * 0.03);
  points.setXYZ(i, point.x, point.y, point.z);
 }
 const deep = new THREE.Color("#2a1f40"), violet = new THREE.Color("#6a4c9c"), ash = new THREE.Color("#9c97ab"), bone = new THREE.Color("#d9d3e6");
 const unit = new THREE.Vector3();
 const body = faceted(geometry, (centre, colour) => {
  unit.copy(centre).normalize();
  const r = ridge(unit);
  colour.copy(deep).lerp(violet, smooth(-0.6, 0.5, r)).lerp(ash, smooth(0.55, 0.95, r));
  if (wobble(unit, 7, 4) > 0.62) colour.lerp(bone, 0.7); // alguna luz pálida
  colour.multiplyScalar(0.9 + random() * 0.2);
 });
 // Colinas enroscadas: un tubo que sube, se dobla y se enrosca sobre sí mismo.
 const hook = (turn, tilt, size) => {
  const curl = tube([[0, 0.9, 0], [0.04, 1.2, 0], [0.16, 1.44, 0], [0.36, 1.56, 0], [0.54, 1.47, 0], [0.56, 1.3, 0], [0.45, 1.24, 0], [0.4, 1.32, 0]], (t) => 0.2 * (1 - t) ** 1.2 + 0.018, { sides: 6, segments: 16 });
  curl.scale(size, size, size).rotateZ(tilt).rotateY(turn);
  return faceted(curl, (centre, colour) => colour.copy(deep).lerp(violet, smooth(0.9, 1.5, centre.length())).multiplyScalar(0.9 + random() * 0.2));
 };
 const whole = mergeGeometries([body, hook(0.4, 0.25, 1), hook(2.7, -1.1, 0.72), hook(4.6, 1.9, 0.55)]);
 whole.computeBoundingSphere();
 return whole;
}
// El tercero: alienígena. Colores que no son de aquí, bultos, vainas que
// brillan y zarcillos.
function createAlienWorld() {
 const random = randomFrom(0.83);
 const geometry = new THREE.IcosahedronGeometry(1, 9);
 const points = geometry.attributes.position;
 const point = new THREE.Vector3();
 const lumps = (p) => wobble(p, 2.1, 9) * 0.11 + wobble(p, 5.3, 3) * 0.035;
 for (let i = 0; i < points.count; i++) {
  point.fromBufferAttribute(points, i).normalize();
  point.multiplyScalar(1 + lumps(point));
  points.setXYZ(i, point.x, point.y, point.z);
 }
 const teal = new THREE.Color("#12a89a"), magenta = new THREE.Color("#c13fd0"), acid = new THREE.Color("#b9f24a"), ink = new THREE.Color("#2b1d5e");
 const unit = new THREE.Vector3();
 const body = faceted(geometry, (centre, colour) => {
  unit.copy(centre).normalize();
  const band = wobble(unit, 2.6, 6), vein = Math.abs(wobble(unit, 6.5, 1));
  colour.copy(teal).lerp(magenta, smooth(-0.05, 0.4, band)).lerp(acid, smooth(0.3, 0.62, -band));
  if (vein < 0.06) colour.lerp(ink, 0.75); // venas oscuras
  colour.multiplyScalar(0.9 + random() * 0.2);
 });
 const parts = [body];
 // Vainas: medio hundidas, repartidas por toda la esfera.
 const PODS = 9;
 for (let i = 0; i < PODS; i++) {
  const y = 1 - ((i + 0.5) / PODS) * 2, angle = i * 2.39996, ring = Math.sqrt(1 - y * y);
  const size = 0.1 + random() * 0.09;
  const pod = new THREE.IcosahedronGeometry(size, 1);
  pod.translate(Math.cos(angle) * ring * 1.02, y * 1.02, Math.sin(angle) * ring * 1.02);
  parts.push(faceted(pod, (_, colour) => colour.set(i % 3 ? "#ffb347" : "#fff27a").multiplyScalar(0.9 + random() * 0.2)));
 }
 // Zarcillos que salen y se enroscan.
 [[0.6, 0.5], [3.4, -0.9], [5.0, 2.3]].forEach(([turn, tilt], i) => {
  const arm = tube([[0, 0.95, 0], [0.1, 1.2, 0.05], [0.3, 1.36, 0.02], [0.44, 1.3, -0.1], [0.42, 1.18, -0.2], [0.33, 1.16, -0.12]], (t) => 0.09 * (1 - t) + 0.012, { sides: 5, segments: 12 });
  arm.scale(1 - i * 0.15, 1 - i * 0.15, 1 - i * 0.15).rotateZ(tilt).rotateY(turn);
  parts.push(faceted(arm, (_, colour) => colour.copy(magenta).lerp(ink, 0.45).multiplyScalar(0.9 + random() * 0.2)));
 });
 const whole = mergeGeometries(parts);
 whole.computeBoundingSphere();
 return whole;
}

// Rótulo de un mundo cerrado: su nombre y «Próximamente», en la letra del juego.
function createClosedLabel(name) {
 const canvas = document.createElement("canvas");
 canvas.width = 1024;
 canvas.height = 320;
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 const draw = () => {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
  // (Se reduce la letra hasta que el nombre quepa con margen.)
  let size = 118;
  do {
   size -= 6;
   ctx.font = `800 ${size}px "Bricolage Grotesque", system-ui, sans-serif`;
  } while (ctx.measureText(name).width > 930 && size > 48);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, 512, 104);
  // Debajo, en una pastilla: sigue cerrado.
  if ("letterSpacing" in ctx) ctx.letterSpacing = "10px";
  ctx.font = '700 58px "Bricolage Grotesque", system-ui, sans-serif';
  const wide = ctx.measureText("PRÓXIMAMENTE").width + 84;
  ctx.fillStyle = "rgba(255, 178, 56, 0.95)";
  ctx.beginPath();
  ctx.roundRect(512 - wide / 2, 186, wide, 96, 48);
  ctx.fill();
  ctx.fillStyle = "#1a1330";
  ctx.fillText("PRÓXIMAMENTE", 512 + 5, 237);
  texture.needsUpdate = true;
 };
 draw();
 fontReady('800 112px "Bricolage Grotesque"').then(draw);
 return texture;
}

// Dónde va cada astro en la vista de la órbita: grados a la derecha y hacia
// arriba del centro de la pantalla, a qué distancia de la cámara y su radio.
// (La cámara de la órbita está en `ORBIT_VIEW`, en experience/state.js.)
const SKY = {
 moon: { right: -22, up: 10.5, far: 1500, radius: 58 },
 twisted: { right: 23.5, up: 8.5, far: 1750, radius: 66, name: "THE TWISTED MOON" },
 alien: { right: -21, up: -11.5, far: 1650, radius: 60, name: "THE COSMIC LAB" },
};
// Hacia dónde mira esa cámara, y qué es «derecha» y «arriba» en su pantalla.
const VIEW = (() => {
 const camera = new THREE.Vector3(...ORBIT_VIEW.camera);
 const forward = new THREE.Vector3(...ORBIT_VIEW.focus).sub(camera).normalize();
 const side = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
 return { camera, forward, side, above: new THREE.Vector3().crossVectors(side, forward) };
})();
function placeInView({ right, up, far }) {
 const { camera, forward, side, above } = VIEW;
 return camera.clone().addScaledVector(forward.clone().addScaledVector(side, Math.tan((right * Math.PI) / 180)).addScaledVector(above, Math.tan((up * Math.PI) / 180)).normalize(), far);
}
const LIGHT = [-0.42, 0.78, 0.46];

// Estrellas de la órbita: por todo alrededor (las del cielo de la isla solo
// están arriba y solo de noche; desde la nave se mira hacia abajo). Una sola
// malla con instancias, lejos, detrás de todo.
function OrbitStars({ shown, count = 900 }) {
 const mesh = useRef(null);
 const material = useMemo(() => {
  const one = unlit({ transparent: true, depthWrite: false, fog: false });
  one.userData.flat = true;
  one.colorNode = vec3(0.86, 0.9, 1.0);
  one.opacityNode = shown;
  return one;
 }, [shown]);
 useEffect(() => {
  const random = randomFrom(0.4242);
  const helper = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
   const y = random() * 2 - 1, angle = random() * Math.PI * 2, flat = Math.sqrt(1 - y * y);
   helper.position.set(Math.cos(angle) * flat, y, Math.sin(angle) * flat).multiplyScalar(3000);
   helper.lookAt(0, 0, 0);
   helper.scale.setScalar((0.7 + random() ** 3 * 2.6) * 5);
   helper.updateMatrix();
   mesh.current.setMatrixAt(i, helper.matrix);
  }
  mesh.current.instanceMatrix.needsUpdate = true;
  return () => material.dispose();
 }, [count, material]);
 return (
  <instancedMesh ref={mesh} name="estrellas de la órbita" args={[undefined, material, count]} frustumCulled={false} renderOrder={-5}>
   <planeGeometry args={[1, 1]} />
  </instancedMesh>
 );
}

function ClosedWorld({ spot, geometry, material, labels, spin }) {
 const body = useRef(null);
 const label = useRef(null);
 const position = useMemo(() => placeInView(spot), [spot]);
 const texture = useMemo(() => createClosedLabel(spot.name), [spot]);
 useEffect(() => () => texture.dispose(), [texture]);
 useEffect(() => {
  const mesh = label.current;
  labels.push(mesh);
  return () => void labels.splice(labels.indexOf(mesh), 1);
 }, [labels]);
 useFrame(({ clock }) => {
  body.current.rotation.y = clock.elapsedTime * spin;
 });
 return (
  <group position={position}>
   <group rotation={[0.3, 0, 0.35]}>
    <mesh ref={body} geometry={geometry} material={material} scale={spot.radius} />
   </group>
   {/* El rótulo, debajo del astro en la pantalla. */}
   <mesh ref={label} position={VIEW.above.clone().multiplyScalar(-spot.radius * 1.75)}>
    <planeGeometry args={[spot.radius * 3.5, (spot.radius * 3.5 * 320) / 1024]} />
    <meshBasicMaterial map={texture} transparent opacity={0} depthWrite={false} fog={false} toneMapped={false} userData={FLAT} />
   </mesh>
  </group>
 );
}

export function Space() {
 const group = useRef(null);
 const sky = useRef(null);
 const shade = useRef(null);
 const air = useRef(null);
 const moon = useRef(null);
 const stars = useRef(null);
 const labels = useMemo(() => [], []);
 const facing = useMemo(() => new THREE.Quaternion(), []);
 const shaded = useMemo(() => uniform(0), []);
 const shadeFrom = useMemo(() => uniform(new THREE.Vector3(0, 1, 0)), []);
 const starlight = useMemo(() => uniform(0), []);
 const glow = useMemo(() => createGlowTexture(), []);
 const models = useMemo(() => ({ bed: createSeaBed(), shade: new THREE.IcosahedronGeometry(1, 6), moon: createMoon(), twisted: createTwistedWorld(), alien: createAlienWorld() }), []);
 const material = useMemo(() => {
  const all = {
   bed: createSeaBedMaterial(),
   shade: createShadeMaterial(shaded, shadeFrom),
   moon: celestial(LIGHT, { ambient: 0.22, strength: 0.95, contrast: 1.6 }),
   twisted: celestial(LIGHT, { ambient: 0.3, strength: 0.9 }),
   alien: celestial(LIGHT, { ambient: 0.34, strength: 0.9 }),
  };
  for (const key of ["moon", "twisted", "alien"]) all[key].userData.flat = true;
  return all;
 }, [shaded, shadeFrom]);
 const moonAt = useMemo(() => placeInView(SKY.moon), []);
 useEffect(
  () => () => {
   glow.dispose();
   Object.values(models).forEach((one) => one.dispose());
   Object.values(material).forEach((one) => one.dispose());
  },
  [glow, models, material],
 );
 useEffect(() => {
  if (import.meta.env.DEV) window.__world.space = { group: group.current, sky: sky.current, radius: PLANET.radius, bendPoint, names: [SKY.twisted.name, SKY.alien.name] }; // para las pruebas automáticas
 }, []);

 useFrame(({ camera, clock }) => {
  // Solo existe en vuelo.
  const space = rig.space;
  group.current.visible = space > 0.004 || rig.bend > 0;
  if (!group.current.visible) return;
  // La sombra y el halo siguen a la esfera mientras se cierra: su centro está
  // a un radio (el de ese momento) bajo el polo. Solo se ven con ella ya casi cerrada.
  const closing = smooth(0.6, 1, rig.bend);
  const radius = PLANET.radius / Math.max(rig.bend, 0.05);
  shade.current.visible = air.current.visible = closing > 0;
  shade.current.position.y = air.current.position.y = -radius;
  shade.current.scale.setScalar(radius + AIR);
  shaded.value = closing;
  shadeFrom.value.set(sunDirection.x, 0.3, sunDirection.z).normalize();
  air.current.scale.setScalar(radius * 2.75);
  air.current.quaternion.copy(camera.quaternion);
  air.current.material.opacity = closing * (0.42 - current.glow * 0.14);
  // El cielo de la órbita acompaña a la cámara cuando esta rodea el planeta:
  // luna y mundos lejanos se quedan en su sitio de la pantalla y lo que gira es el planeta.
  sky.current.rotation.y = rig.viewYaw ?? 0;
  const far = smooth(0.55, 1, space);
  // (De noche ya están las del cielo de la isla por arriba: estas completan el resto.)
  starlight.value = far * 0.9;
  stars.current.position.copy(camera.position);
  material.moon.opacity = far;
  material.twisted.opacity = material.alien.opacity = far;
  moon.current.rotation.y = clock.elapsedTime * 0.01;
  // Los rótulos miran a la cámara (son hijos del cielo, que gira: se deshace ese giro).
  facing.copy(sky.current.quaternion).invert().multiply(camera.quaternion);
  for (const label of labels) {
   label.quaternion.copy(facing);
   label.material.opacity = smooth(0.8, 1, space);
  }
 });

 return (
  <group ref={group} visible={false}>
   <mesh name="fondo del mar" geometry={models.bed} material={material.bed} position-y={SEA_FLOOR} frustumCulled={false} userData={COARSE} />
   <mesh ref={shade} name="sombra de la noche" geometry={models.shade} material={material.shade} frustumCulled={false} renderOrder={6} />
   <mesh ref={air} name="atmósfera" frustumCulled={false}>
    <planeGeometry />
    <meshBasicMaterial map={glow} color="#4fa8ff" transparent opacity={0} depthWrite={false} fog={false} toneMapped={false} blending={THREE.AdditiveBlending} userData={FLAT} />
   </mesh>
   <group ref={stars}>
    <OrbitStars shown={starlight} />
   </group>
   <group ref={sky}>
    <mesh ref={moon} name="luna de la órbita" geometry={models.moon} material={material.moon} position={moonAt} scale={SKY.moon.radius} />
    <ClosedWorld spot={SKY.twisted} geometry={models.twisted} material={material.twisted} labels={labels} spin={0.05} />
    <ClosedWorld spot={SKY.alien} geometry={models.alien} material={material.alien} labels={labels} spin={-0.04} />
   </group>
  </group>
 );
}
