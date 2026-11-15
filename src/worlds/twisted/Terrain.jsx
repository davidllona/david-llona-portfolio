import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { attribute, cameraPosition, color, mix, normalize, positionLocal, positionWorld, pow, reflect, sin, smoothstep, texture, uv, vec2, vec3 } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { uClosed } from "../../experience/environment/bend";
import { noiseTexture } from "../../experience/environment/noise";
import { unlit } from "../../experience/materials";
import { uniforms } from "../../experience/theme";
import { CENTRE, EDGE_RANGE, SPAN, createGround, groundData } from "./ground";
import { LEVELS, POND, POOL, RIVER, STREAM, WATERFALLS, WATER_LEVEL, islandEdge } from "./layout";

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
 // Adoquines: celdas de ruido, unas más claras que otras, con su junta.
 const cobble = texture(noiseTexture, at.mul(0.9)).g;
 const stone = mix(color("#6d6696"), color("#9b93c2"), smoothstep(0.35, 0.65, cobble));
 const rim = color("#1c1838");
 const inside = smoothstep(0.03, -0.03, edge);
 const border = smoothstep(0.03, -0.03, edge.sub(0.1)).mul(smoothstep(-0.2, -0.06, edge));
 material.colorNode = mix(attribute("color", "vec3"), mix(stone, rim, border), inside.max(border).mul(attribute("flat", "float")));
 return material;
}

// El mar: oscuro, casi quieto, con el reflejo de la luna roto en escamas y,
// pegada a la orilla de la isla, espuma turquesa que brilla: una línea firme
// contra la roca y otra, más fina, que va y viene.
const WATER_REACH = 150; // m: algo más de media vuelta al planeta en que se cierra el mundo
function createSeaMaterial() {
 const { uTime, uWaterShallow, uWaterDeep, uSunDirection, uSunColor } = uniforms;
 const material = unlit();
 const pos = positionWorld.xz;
 const shore = attribute("shore", "float"); // m hasta el borde de la isla
 const drift = vec2(uTime.mul(0.012), uTime.mul(-0.008));
 const rippleA = texture(noiseTexture, pos.mul(0.23).add(drift)).r.sub(0.5);
 const rippleB = texture(noiseTexture, pos.mul(0.41).sub(drift.mul(1.7))).g.sub(0.5);
 const normal = normalize(vec3(rippleA.mul(0.34).add(rippleB.mul(0.2)), 1, rippleB.mul(0.34).sub(rippleA.mul(0.2))));
 const toWater = normalize(positionWorld.sub(cameraPosition));
 const shine = pow(reflect(toWater, normal).dot(uSunDirection).max(0), 120).mul(1.1);
 const sheen = pow(reflect(toWater, normal).dot(uSunDirection).max(0), 12).mul(0.08);
 // Espuma: la orilla tiembla con el ruido; la segunda línea respira.
 const wobble = shore.add(rippleA.mul(1.3)).add(rippleB.mul(0.7));
 const firm = smoothstep(0.75, 0.35, wobble);
 const breath = sin(uTime.mul(0.7)).mul(0.35).add(1.9);
 const second = smoothstep(0.24, 0.06, wobble.sub(breath).abs());
 const third = smoothstep(0.2, 0.05, wobble.sub(breath.mul(1.9).add(0.6)).abs()).mul(0.5);
 const foam = firm.max(second).max(third).mul(smoothstep(-0.2, 0.2, shore));
 const body = mix(uWaterShallow, uWaterDeep, smoothstep(0.5, 9, shore));
 // (Curvado en planeta, lejos de la isla, queda un mar liso y oscuro.)
 material.colorNode = mix(body.add(uSunColor.mul(shine.add(sheen)).mul(uClosed.oneMinus())), AQUA.mul(1.5), foam);
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
  shore[i] = Math.min(40, -islandEdge((x / r) * eased, (z / r) * eased));
 }
 geometry.setAttribute("shore", new THREE.BufferAttribute(shore, 1));
 geometry.deleteAttribute("normal");
 geometry.deleteAttribute("uv");
 return geometry;
}

// ── Agua dulce ──────────────────────────────────────────────────────────────
// Río, arroyo y pozas: una cinta turquesa que brilla, con vetas que corren
// aguas abajo. Las cascadas, lo mismo en vertical y más vivo.
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
function disc(pool, y) {
 const geometry = new THREE.CircleGeometry(pool.r - 0.25, 18).rotateX(-Math.PI / 2).translate(pool.x, y, pool.z);
 const points = geometry.attributes.position, uvs = geometry.attributes.uv;
 for (let i = 0; i < points.count; i++) uvs.setXY(i, 0.5, points.getZ(i));
 return geometry;
}
function createFreshWater() {
 const surface = (level) => LEVELS[level] - 0.16;
 return mergeGeometries([ribbon(dense(RIVER), 2.1, surface(0)), ribbon(dense(STREAM), 1.5, surface(1)), disc(POND, surface(1)), disc(POOL, surface(0))].map((one) => (one.index ? one.toNonIndexed() : one)).map((one) => (one.deleteAttribute("normal"), one)));
}
function createFalls() {
 return mergeGeometries(
  WATERFALLS.map((fall) => {
   const drop = fall.top - fall.bottom;
   // Una lámina que cae algo tendida, con una panza hacia fuera a media altura.
   const sheet = new THREE.PlaneGeometry(fall.width, drop + 0.5, 3, 6);
   const points = sheet.attributes.position, uvs = sheet.attributes.uv;
   for (let i = 0; i < points.count; i++) {
    const t = (points.getY(i) + (drop + 0.5) / 2) / (drop + 0.5); // 0 abajo, 1 arriba
    points.setZ(i, (1 - t) * 0.9 + Math.sin(t * Math.PI) * 0.25);
    uvs.setXY(i, uvs.getX(i), t * (drop + 0.5));
   }
   sheet.rotateY(fall.turn).translate(fall.x, (fall.top + fall.bottom) / 2 - 0.2, fall.z);
   const flat = sheet.toNonIndexed();
   flat.deleteAttribute("normal");
   return flat;
  }),
 );
}
function createFlowMaterial(speed, glow) {
 const { uTime } = uniforms;
 const material = unlit({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
 const at = uv();
 const streaks = texture(noiseTexture, vec2(at.x.mul(0.9), at.y.mul(0.22).add(uTime.mul(speed)))).r;
 const fine = texture(noiseTexture, vec2(at.x.mul(2.3).add(0.4), at.y.mul(0.5).add(uTime.mul(speed * 1.7)))).g;
 const white = smoothstep(0.56, 0.8, streaks.mul(0.6).add(fine.mul(0.5)));
 material.colorNode = mix(AQUA.mul(glow), vec3(1.5, 1.7, 1.7), white.mul(0.7));
 // Hacia los bordes de la cinta se deshace.
 material.opacityNode = smoothstep(0, 0.16, at.x).mul(smoothstep(1, 0.84, at.x)).mul(0.86);
 return material;
}

export function Terrain() {
 const ground = useMemo(createGround, []);
 const soil = useMemo(createGroundMaterial, []);
 const sea = useMemo(createSea, []);
 const seaMaterial = useMemo(createSeaMaterial, []);
 const fresh = useMemo(createFreshWater, []);
 const falls = useMemo(createFalls, []);
 const flow = useMemo(() => ({ river: createFlowMaterial(0.16, 0.8), fall: createFlowMaterial(0.9, 1.15) }), []);
 // Fondo del mar: cierra el planeta por debajo.
 const bed = useMemo(() => new THREE.RingGeometry(0.3, WATER_REACH, 96, 30).rotateX(-Math.PI / 2), []);
 const bedMaterial = useMemo(() => {
  const material = unlit();
  material.colorNode = uniforms.uWaterDeep.mul(0.8);
  return material;
 }, []);
 useEffect(
  () => () => {
   for (const one of [ground, soil, sea, seaMaterial, fresh, falls, flow.river, flow.fall, bed, bedMaterial]) one.dispose();
  },
  [ground, soil, sea, seaMaterial, fresh, falls, flow, bed, bedMaterial],
 );
 return (
  <>
   <mesh name="suelo" geometry={ground} material={soil} receiveShadow castShadow />
   <mesh name="fondo del mar" geometry={bed} material={bedMaterial} position-y={-5} frustumCulled={false} userData={COARSE} />
   <mesh name="mar" geometry={sea} material={seaMaterial} position-y={WATER_LEVEL} frustumCulled={false} userData={COARSE} />
   <mesh name="río" geometry={fresh} material={flow.river} renderOrder={1} />
   <mesh name="cascadas" geometry={falls} material={flow.fall} renderOrder={2} />
  </>
 );
}
