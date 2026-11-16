import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { attribute, cameraPosition, color, float, floor, fract, mix, normalView, positionGeometry, positionLocal, positionWorld, sin, smoothstep, texture, uv, vec2, vec3 } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { uClosed } from "../../experience/environment/bend";
import { noiseTexture } from "../../experience/environment/noise";
import { unlit } from "../../experience/materials";
import { uniforms } from "../../experience/theme";
import { CENTRE, EDGE_RANGE, SPAN, createGround, groundData } from "./ground";
import { ISLETS, LEVELS, POND, POOL, RIVER, SEA_BED, STREAM, WATERFALLS, WATER_LEVEL, cragEdge, createRandom, islandEdge } from "./layout";

const COARSE = { coarse: true }; // (ya viene en anillos: no hay que partirlo más para curvarlo)
// Turquesa que brilla: el agua dulce, las cascadas y la espuma de la orilla.
const AQUA = vec3(0.3, 1.0, 0.98);

// El suelo se pinta con el color de cada triángulo, salvo los caminos, que se
// calculan en cada píxel con la distancia a su borde (horneada en una
// textura): empedrado pálido, con un reborde oscuro y fino. Solo sobre lo
// llano: la roca de los acantilados no lleva camino.
function createGroundMaterial() {
 const { paths } = groundData();
 const material = new MeshLambertNodeMaterial({ flatShading: true });
 const at = positionLocal.xz;
 const lane = texture(paths, at.sub(vec2(CENTRE[0], CENTRE[1])).div(SPAN).add(0.5)).r.sub(0.5).mul(EDGE_RANGE * 2); // metros al borde; negativo = dentro
 const edge = lane.add(texture(noiseTexture, at.mul(0.37)).r.sub(0.5).mul(0.3));
 // Empedrado: piedras una a una (celdas de Voronoi sobre una rejilla
 // descolocada), cada una de su gris morado, con la junta oscura entre ellas.
 const cellAt = at.mul(2.3);
 const base = floor(cellAt), within = fract(cellAt);
 let first = float(8), second = float(8), tone = float(0);
 for (let dz = -1; dz <= 1; dz++) {
  for (let dx = -1; dx <= 1; dx++) {
   const cell = base.add(vec2(dx, dz));
   const a = fract(sin(cell.x.mul(127.1).add(cell.y.mul(311.7))).mul(43758.5453));
   const b = fract(sin(cell.x.mul(269.5).add(cell.y.mul(183.3))).mul(43758.5453));
   const to = vec2(dx, dz).add(vec2(a, b).mul(0.76).add(0.12)).sub(within);
   const d = to.dot(to);
   const closer = d.lessThan(first);
   second = closer.select(first, second.min(d));
   tone = closer.select(a, tone);
   first = first.min(d);
  }
 }
 const joint = smoothstep(0.05, 0.13, second.sqrt().sub(first.sqrt())); // 0 en la junta, 1 en la piedra
 // Musgo en los bordes del camino: se come las juntas y mancha alguna piedra.
 const moss = smoothstep(-0.5, -0.08, edge).mul(smoothstep(0.42, 0.62, texture(noiseTexture, at.mul(0.83)).g));
 const slab = mix(mix(color("#4a4760"), color("#7b7792"), tone), color("#2a5446"), moss.mul(0.75));
 const stone = mix(mix(color("#131226"), color("#1f4337"), moss), slab, joint);
 const rim = color("#14132a");
 const inside = smoothstep(0.03, -0.03, edge);
 const border = smoothstep(0.03, -0.03, edge.sub(0.1)).mul(smoothstep(-0.2, -0.06, edge));
 material.colorNode = mix(attribute("color", "vec3"), mix(stone, rim, border), inside.max(border).mul(attribute("flat", "float")));
 // La roca de los cortados mira a la cámara, de espaldas a la luna: se le sube el tono medio (su
 // color, enfriado) y se le da un borde de luz fría en los cantos, donde la cara se ve de refilón.
 const n = normalView.normalize();
 const edgeLight = n.z.abs().oneMinus().pow(2.2).mul(n.y.mul(0.5).add(0.75).clamp(0, 1));
 const rock = attribute("flat", "float").oneMinus();
 material.emissiveNode = attribute("color", "vec3").mul(vec3(0.7, 0.8, 1.0)).mul(0.17).add(vec3(0.4, 0.52, 0.95).mul(edgeLight).mul(0.12)).mul(rock);
 return material;
}

// El mar: oscuro, casi quieto, con el reflejo de la luna roto en escamas y,
// pegada a la orilla de la isla, espuma turquesa que brilla: una línea firme
// contra la roca y otra, más fina, que va y viene.
//
// El reflejo de la luna: un camino de destellos sobre el agua, desde quien
// mira hacia donde está la luna en el cielo (al norte). Uno de verdad solo se
// vería mirando casi a ras del agua; la cámara del juego mira desde arriba,
// así que se dibuja el camino entero: una banda que se abre con la distancia,
// rota en escamas por las ondas. Así se ve al andar cerca de la orilla.
const MOON_PATH = new THREE.Vector2(0.21, -0.977).normalize(); // hacia dónde queda la luna, en planta (ver Night.jsx)
const WATER_REACH = 150; // m: algo más de media vuelta al planeta en que se cierra el mundo
function createSeaMaterial() {
 const { uTime, uWaterShallow, uWaterDeep } = uniforms;
 const material = unlit();
 const pos = positionWorld.xz;
 const coast = attribute("shore", "float"); // m hasta el borde de la isla
 // Oleaje: el mar sube y baja despacio; pegado a la isla, casi nada.
 const at = positionGeometry.xz;
 const lift = sin(at.x.mul(0.31).add(uTime.mul(0.8))).add(sin(at.y.mul(0.37).sub(uTime.mul(0.6)).add(at.x.mul(0.11)))).mul(0.07).mul(smoothstep(0.5, 6, coast));
 // La orilla más cercana: la de la isla o la de un islote del mar abierto (estos, calculados en cada píxel:
 // la malla del mar, lejos, es demasiado gruesa para llevar su espuma en los vértices).
 let rocks = float(1000);
 for (const [x, z, r] of ISLETS) rocks = rocks.min(pos.sub(vec2(x, z)).length().sub(r * 1.12));
 const shore = coast.min(rocks);
 material.positionNode = positionLocal.add(vec3(0, lift, 0));
 // (Ruido suave, de onda larga: solo hace temblar la línea de la espuma. El agua no lleva grano.)
 const drift = vec2(uTime.mul(0.012), uTime.mul(-0.008));
 const rippleA = texture(noiseTexture, pos.mul(0.23).add(drift)).r.sub(0.5);
 const rippleB = texture(noiseTexture, pos.mul(0.41).sub(drift.mul(1.7))).g.sub(0.5);
 // Espuma: la orilla tiembla con el ruido; la segunda línea respira.
 const wobble = shore.add(rippleA.mul(1.3)).add(rippleB.mul(0.7));
 const firm = smoothstep(0.75, 0.35, wobble);
 const breath = sin(uTime.mul(0.7)).mul(0.35).add(1.9);
 const second = smoothstep(0.24, 0.06, wobble.sub(breath).abs());
 const third = smoothstep(0.2, 0.05, wobble.sub(breath.mul(1.9).add(0.6)).abs()).mul(0.5);
 const foam = firm.max(second).max(third).mul(smoothstep(-0.2, 0.2, shore));
 // Olas facetadas: el agua se parte en triángulos grandes (una rejilla
 // inclinada), cada uno de su tono liso, que sube y baja despacio con el
 // oleaje. De lejos los triángulos son mayores: desde la torre no hormiguean.
 const facetOf = (scale, seed, skew = 0.5) => {
  const warped = pos.add(vec2(rippleB, rippleA).mul(1.6));
  const cellAt = vec2(warped.x.mul(scale).add(warped.y.mul(scale * skew)), warped.y.mul(scale * (skew < 0 ? 1.17 : 1)).add(warped.x.mul(skew < 0 ? scale * 0.33 : 0)));
  const cell = floor(cellAt), inside = fract(cellAt);
  const half = inside.x.greaterThan(inside.y).select(float(0.5), float(0));
  return fract(sin(cell.x.mul(12.9898).add(cell.y.mul(78.233)).add(half.mul(37.7)).add(seed)).mul(43758.5453));
 };
 const away = pos.sub(cameraPosition.xz);
 const far = away.length();
 // (Y con el mundo cerrado en planeta, las grandes en todas partes: desde la órbita se leen las olas.)
 // (Dos rejillas de distinto tamaño e inclinación, sumadas: los triángulos de una cortan los de la
 // otra y salen facetas desiguales, no un tablero.)
 const near = facetOf(0.34, 0).mul(0.6).add(facetOf(0.53, 2.7, -0.8).mul(0.4));
 const wide = facetOf(0.2, 5.1).mul(0.6).add(facetOf(0.31, 8.3, -0.8).mul(0.4));
 const facet = mix(near, wide, smoothstep(30, 80, far).max(uClosed));
 const swell = sin(facet.mul(6.28).add(uTime.mul(0.55))).mul(0.5).add(0.5);
 const open = smoothstep(0.6, 3, shore);
 const facets = mix(float(0.9), float(1.13), facet.mul(0.5).add(swell.mul(0.5))).mul(open).add(open.oneMinus());
 // Desde la órbita el mar se aclara y sus facetas contrastan más: es un mar con olas, no una bola negra.
 const waves = mix(float(1), facets.sub(1).mul(2.4).add(1), uClosed).mul(uClosed.mul(1.9).add(1));
 const body = mix(uWaterShallow, uWaterDeep, smoothstep(0.5, 9, shore)).mul(mix(facets, waves, uClosed));
 // Resplandor turquesa en el agua que rodea la isla: fuerte junto a la roca, se pierde mar adentro.
 const halo = vec3(0.05, 0.62, 0.6).mul(smoothstep(18, 0.5, coast).pow(2.2).mul(0.3)).mul(uClosed.mul(0.5).oneMinus());
 // Camino de la luna: una franja de facetas claras, desde quien mira hacia
 // donde está la luna. Cada faceta se enciende y se apaga entera, con el oleaje.
 const toward = away.div(far.max(0.01)).dot(vec2(MOON_PATH.x, MOON_PATH.y));
 const band = smoothstep(float(0.9), float(0.985), toward).mul(smoothstep(2, 9, far));
 const lit = smoothstep(0.6, 0.8, swell);
 const glitter = band.mul(lit.mul(0.6).add(0.06)).mul(smoothstep(0.8, 2.5, shore)).mul(uClosed.oneMinus());
  material.colorNode = mix(body.add(vec3(0.4, 0.52, 0.9).mul(glitter.mul(0.24)).add(halo)), AQUA.mul(1.5), foam);
 return material;
}
// En anillos (se curva con el mundo), desde el eje hasta el horizonte.
function createSea() {
 const geometry = new THREE.RingGeometry(0.3, WATER_REACH, 144, 64).rotateX(-Math.PI / 2);
 const points = geometry.attributes.position;
 const shore = new Float32Array(points.count);
 for (let i = 0; i < points.count; i++) {
  // Los anillos se aprietan hacia la isla: la orilla necesita más detalle que el horizonte.
  const x = points.getX(i), z = points.getZ(i), r = Math.hypot(x, z);
  const t = Math.max(0, (r - 0.3) / (WATER_REACH - 0.3)), eased = 0.3 + (WATER_REACH - 0.3) * Math.pow(t, 1.8);
  points.setXYZ(i, (x / r) * eased, 0, (z / r) * eased);
  // (La espuma rodea también las agujas de roca.)
  shore[i] = Math.min(40, -islandEdge((x / r) * eased, (z / r) * eased), cragEdge((x / r) * eased, (z / r) * eased) + 0.5);
 }
 geometry.setAttribute("shore", new THREE.BufferAttribute(shore, 1));
 geometry.deleteAttribute("normal");
 geometry.deleteAttribute("uv");
 return geometry;
}

// ── Agua dulce ──────────────────────────────────────────────────────────────
// Río, arroyo y pozas: una cinta de agua oscura con brillos finos. Las
// cascadas, tiras turquesa que caen.
function ribbon(points, width, y) {
 const positions = [], uvs = [], index = [];
 let along = 0;
 points.forEach(([x, z], i) => {
  const [ax, az] = points[Math.max(0, i - 1)], [bx, bz] = points[Math.min(points.length - 1, i + 1)];
  const length = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / length, nz = (bx - ax) / length;
  if (i) along += Math.hypot(x - points[i - 1][0], z - points[i - 1][1]);
  positions.push(x + (nx * width) / 2, y, z + (nz * width) / 2, x - (nx * width) / 2, y, z - (nz * width) / 2);
  uvs.push(0, along, 1, along);
  if (i) index.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
 });
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
 geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
 geometry.setIndex(index);
 return geometry;
}
// Tramos cortos: la cinta se curva con el mundo sin partirse.
const dense = (points, step = 0.8) => {
 const out = [];
 for (let i = 0; i < points.length - 1; i++) {
  const [ax, az] = points[i], [bx, bz] = points[i + 1], count = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
  for (let k = 0; k < count; k++) out.push([ax + ((bx - ax) * k) / count, az + ((bz - az) * k) / count]);
 }
 out.push(points[points.length - 1]);
 return out;
};
// Las pozas: agua quieta. Las coordenadas van en planta (sin vetas que corran
// en una dirección), metidas entre 0,3 y 0,7 a lo ancho para no deshacerse por el borde.
function disc(pool, y) {
 const geometry = new THREE.CircleGeometry(pool.r - 0.25, 18).rotateX(-Math.PI / 2).translate(pool.x, y, pool.z);
 const points = geometry.attributes.position, uvs = geometry.attributes.uv;
 for (let i = 0; i < points.count; i++) uvs.setXY(i, 0.5 + ((points.getX(i) - pool.x) / pool.r) * 0.2, (points.getZ(i) - pool.z) * 1.6);
 return geometry;
}
const surface = (level) => LEVELS[level] - 0.16;
const flat = (list) => mergeGeometries(list.map((one) => (one.index ? one.toNonIndexed() : one)).map((one) => (one.deleteAttribute("normal"), one)));
function createFreshWater() {
 return flat([ribbon(dense(RIVER), 2.1, surface(0)), ribbon(dense(STREAM), 1.5, surface(1))]);
}
function createPools() {
 return flat([disc(POND, surface(1)), disc(POOL, surface(0))]);
}
// Cascadas: no una lámina, sino varias tiras de agua, cada una de su ancho, que
// caen a distinta velocidad y dejan huecos entre ellas por los que se ve la roca.
function createFalls() {
 const random = createRandom(20261122);
 const strips = [];
 for (const fall of WATERFALLS) {
  const drop = fall.top - fall.bottom, tall = drop + 0.5;
  const COUNT = 6, slot = fall.width / COUNT;
  for (let k = 0; k < COUNT; k++) {
   const width = slot * (0.42 + random() * 0.4), across = -fall.width / 2 + slot * (k + 0.5) + (random() - 0.5) * slot * 0.3;
   const out = random() * 0.22, speed = 0.55 + random() * 0.6, seed = random();
   const sheet = new THREE.PlaneGeometry(width, tall, 1, 6);
   const points = sheet.attributes.position, uvs = sheet.attributes.uv;
   const strip = new Float32Array(points.count * 2);
   for (let i = 0; i < points.count; i++) {
    const t = (points.getY(i) + tall / 2) / tall; // 0 abajo, 1 arriba
    // Cae algo tendida, con una panza hacia fuera a media altura; cada tira, a su distancia de la roca.
    points.setX(i, points.getX(i) + across);
    points.setZ(i, (1 - t) * 0.9 + Math.sin(t * Math.PI) * (0.2 + out) + out * 0.4);
    uvs.setXY(i, uvs.getX(i), t * tall);
    strip[i * 2] = speed;
    strip[i * 2 + 1] = seed;
   }
   sheet.setAttribute("strip", new THREE.BufferAttribute(strip, 2));
   sheet.rotateY(fall.turn).translate(fall.x, (fall.top + fall.bottom) / 2 - 0.2, fall.z);
   const flat = sheet.toNonIndexed();
   sheet.dispose();
   flat.deleteAttribute("normal");
   strips.push(flat);
  }
 }
 return mergeGeometries(strips);
}
// El agua dulce, quieta o corriendo: turquesa oscuro, casi verde azulado. Los
// brillos son finos y pocos: hilos de corriente y una línea rota junto a cada
// orilla. (`speed`: lo que corre; en las pozas, casi nada.)
function createRiverMaterial(speed) {
 const { uTime } = uniforms;
 const material = unlit({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
 const at = uv();
 const across = at.x.sub(0.5).abs().mul(2); // 0 en el eje, 1 en la orilla
 const body = mix(vec3(0.012, 0.07, 0.1), vec3(0.022, 0.125, 0.135), smoothstep(0.15, 0.8, across));
 // Hilos de corriente: vetas largas y delgadas que bajan con el agua.
 const threads = texture(noiseTexture, vec2(at.x.mul(2.6), at.y.mul(0.1).add(uTime.mul(speed)))).r;
 const thread = smoothstep(0.66, 0.7, threads).mul(smoothstep(0.76, 0.72, threads));
 // Junto a las orillas, una línea de brillo que se rompe.
 const lap = texture(noiseTexture, vec2(at.x.mul(1.1).add(0.3), at.y.mul(0.33).add(uTime.mul(speed * 0.5)))).g;
 const rim = smoothstep(0.5, 0.6, across).mul(smoothstep(0.78, 0.68, across)).mul(smoothstep(0.52, 0.6, lap));
 material.colorNode = body.add(vec3(0.2, 0.72, 0.68).mul(thread.mul(0.34).add(rim.mul(0.5))));
 // Hacia los bordes de la cinta se deshace.
 material.opacityNode = smoothstep(0, 0.16, at.x).mul(smoothstep(1, 0.84, at.x)).mul(0.93);
 return material;
}
// Las cascadas: turquesa (no blanco), con vetas más claras que caen y desgarros
// por los que la tira se abre. Brillan lo justo: solo las vetas rozan el umbral del resplandor.
function createFallMaterial() {
 const { uTime } = uniforms;
 const material = unlit({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
 const at = uv(), strip = attribute("strip", "vec2");
 const fall = at.y.mul(0.17).add(uTime.mul(strip.x)).add(strip.y.mul(9));
 const streaks = texture(noiseTexture, vec2(at.x.mul(0.3).add(strip.y), fall)).r;
 const fine = texture(noiseTexture, vec2(at.x.mul(0.7).add(strip.y.mul(3.1)), fall.mul(2.4))).g;
 const light = smoothstep(0.42, 0.72, streaks.mul(0.6).add(fine.mul(0.5)));
 material.colorNode = mix(vec3(0.06, 0.42, 0.47), vec3(0.4, 1.12, 1.06), light);
 const tear = smoothstep(0.3, 0.44, texture(noiseTexture, vec2(strip.y.mul(5.3), fall.mul(0.45))).g);
 material.opacityNode = smoothstep(0, 0.28, at.x).mul(smoothstep(1, 0.72, at.x)).mul(light.mul(0.35).add(0.55)).mul(tear);
 return material;
}

export function Terrain() {
 const ground = useMemo(createGround, []);
 const soil = useMemo(createGroundMaterial, []);
 const sea = useMemo(createSea, []);
 const seaMaterial = useMemo(createSeaMaterial, []);
 const fresh = useMemo(createFreshWater, []);
 const pools = useMemo(createPools, []);
 const falls = useMemo(createFalls, []);
 const flow = useMemo(() => ({ river: createRiverMaterial(0.16), pool: createRiverMaterial(0.02), fall: createFallMaterial() }), []);
 // Fondo del mar: cierra el planeta por debajo.
 const bed = useMemo(() => new THREE.RingGeometry(0.3, WATER_REACH, 96, 30).rotateX(-Math.PI / 2), []);
 const bedMaterial = useMemo(() => {
  const material = unlit();
  material.colorNode = uniforms.uWaterDeep.mul(0.8);
  return material;
 }, []);
 useEffect(
  () => () => {
   for (const one of [ground, soil, sea, seaMaterial, fresh, pools, falls, flow.river, flow.pool, flow.fall, bed, bedMaterial]) one.dispose();
  },
  [ground, soil, sea, seaMaterial, fresh, pools, falls, flow, bed, bedMaterial],
 );
 return (
  <>
   <mesh name="suelo" geometry={ground} material={soil} receiveShadow castShadow />
   <mesh name="fondo del mar" geometry={bed} material={bedMaterial} position-y={SEA_BED + 0.2} frustumCulled={false} userData={COARSE} />
   <mesh name="mar" geometry={sea} material={seaMaterial} position-y={WATER_LEVEL} frustumCulled={false} userData={COARSE} />
   <mesh name="río" geometry={fresh} material={flow.river} renderOrder={1} />
   <mesh name="pozas" geometry={pools} material={flow.pool} renderOrder={1} />
   <mesh name="cascadas" geometry={falls} material={flow.fall} renderOrder={2} />
  </>
 );
}
