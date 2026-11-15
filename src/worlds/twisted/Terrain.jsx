import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { attribute, cameraPosition, color, mix, normalize, positionLocal, positionWorld, pow, reflect, sin, smoothstep, texture, vec2, vec3 } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { uClosed } from "../../experience/environment/bend";
import { noiseTexture } from "../../experience/environment/noise";
import { unlit } from "../../experience/materials";
import { uniforms } from "../../experience/theme";
import { EDGE_RANGE, SPAN, createGround, groundData } from "./ground";
import { WATER_LEVEL, height } from "./layout";

const COARSE = { coarse: true }; // (ya viene en anillos: no hay que partirlo más para curvarlo)

// El suelo se pinta con el color de cada triángulo, salvo los caminos, que se
// calculan en cada píxel con la distancia a su borde (horneada en una
// textura): tierra pálida, como hueso, más pisada en el centro, con un reborde
// oscuro y fino. El borde tiembla un poco: nada aquí es recto.
function createGroundMaterial() {
 const { paths } = groundData();
 const material = new MeshLambertNodeMaterial({ flatShading: true });
 const at = positionLocal.xz;
 const lane = texture(paths, at.div(SPAN).add(0.5)).r.sub(0.5).mul(EDGE_RANGE * 2); // metros al borde; negativo = dentro
 const edge = lane.add(texture(noiseTexture, at.mul(0.37)).r.sub(0.5).mul(0.3));
 const blotch = texture(noiseTexture, at.mul(0.07)).g;
 const earth = mix(color("#77709a"), color("#a39cc0"), smoothstep(-0.2, -0.75, edge).mul(0.65).add(blotch.mul(0.35)));
 const rim = color("#1d1a33");
 const inside = smoothstep(0.03, -0.03, edge);
 const border = smoothstep(0.03, -0.03, edge.sub(0.1)).mul(smoothstep(-0.2, -0.06, edge));
 material.colorNode = mix(attribute("color", "vec3"), mix(earth, rim, border), inside.max(border));
 return material;
}

// La laguna: agua negra y quieta alrededor de la isla. Casi no se mueve; lo
// que se ve en ella es el reflejo de la luna, roto en escamas por una
// ondulación lenta, y una línea pálida donde toca la orilla.
const WATER_REACH = 150; // m: algo más de media vuelta al planeta en que se cierra el mundo
function createWaterMaterial() {
 const { uTime, uWaterShallow, uWaterDeep, uSunDirection, uSunColor } = uniforms;
 const material = unlit({ transparent: true, depthWrite: false });
 const pos = positionWorld.xz;
 // Profundidad del fondo bajo cada vértice (el agua aparece donde el suelo queda por debajo).
 const depth = attribute("depth", "float");
 const drift = vec2(uTime.mul(0.012), uTime.mul(-0.008));
 const rippleA = texture(noiseTexture, pos.mul(0.09).add(drift)).r.sub(0.5);
 const rippleB = texture(noiseTexture, pos.mul(0.17).sub(drift.mul(1.7))).g.sub(0.5);
 // Reflejo de la luna: la normal del agua, apenas ondulada.
 const normal = normalize(vec3(rippleA.mul(0.34).add(rippleB.mul(0.2)), 1, rippleB.mul(0.34).sub(rippleA.mul(0.2))));
 const toWater = normalize(positionWorld.sub(cameraPosition));
 const shine = pow(reflect(toWater, normal).dot(uSunDirection).max(0), 90).mul(1.5);
 const sheen = pow(reflect(toWater, normal).dot(uSunDirection).max(0), 9).mul(0.2);
 // Orilla: una línea pálida que va y viene.
 const lap = smoothstep(0.16, 0.02, depth.add(sin(uTime.mul(0.9).add(pos.x.mul(0.8)).add(pos.y.mul(0.6))).mul(0.035)));
 const body = mix(uWaterShallow, uWaterDeep, smoothstep(0, 1.5, depth));
 // (Curvado en planeta, lejos de la isla, queda un mar liso y oscuro.)
 material.colorNode = mix(body.add(uSunColor.mul(shine.add(sheen)).mul(uClosed.mul(0.6).oneMinus())), color("#b9b4d8"), lap.mul(0.55));
 material.opacityNode = smoothstep(-0.02, 0.5, depth).mul(0.5).add(0.5).mul(smoothstep(-0.04, 0.0, depth)).max(lap.mul(0.6));
 return material;
}
// En anillos (se curva con el mundo), desde dentro de la orilla hasta el horizonte.
function createWater() {
 const geometry = new THREE.RingGeometry(34, WATER_REACH, 128, 46).rotateX(-Math.PI / 2);
 const points = geometry.attributes.position;
 const depth = new Float32Array(points.count);
 for (let i = 0; i < points.count; i++) {
  // Los anillos se aprietan hacia la isla: la orilla necesita más detalle que el horizonte.
  const x = points.getX(i), z = points.getZ(i), r = Math.hypot(x, z);
  const t = Math.max(0, (r - 34) / (WATER_REACH - 34)), eased = 34 + (WATER_REACH - 34) * Math.pow(t, 1.9);
  points.setXYZ(i, (x / r) * eased, 0, (z / r) * eased);
  depth[i] = WATER_LEVEL - height((x / r) * eased, (z / r) * eased);
 }
 geometry.setAttribute("depth", new THREE.BufferAttribute(depth, 1));
 geometry.deleteAttribute("normal");
 geometry.deleteAttribute("uv");
 return geometry;
}

export function Terrain() {
 const ground = useMemo(createGround, []);
 const soil = useMemo(createGroundMaterial, []);
 const water = useMemo(createWater, []);
 const lagoon = useMemo(createWaterMaterial, []);
 // Fondo de la laguna: cierra el planeta por debajo del agua, que es translúcida en la orilla.
 const bed = useMemo(() => new THREE.RingGeometry(40, WATER_REACH, 96, 30).rotateX(-Math.PI / 2), []);
 const bedMaterial = useMemo(() => {
  const material = unlit();
  material.colorNode = uniforms.uWaterDeep.mul(0.8);
  return material;
 }, []);
 useEffect(
  () => () => {
   for (const one of [ground, soil, water, lagoon, bed, bedMaterial]) one.dispose();
  },
  [ground, soil, water, lagoon, bed, bedMaterial],
 );
 return (
  <>
   <mesh name="suelo" geometry={ground} material={soil} receiveShadow castShadow />
   <mesh name="fondo de la laguna" geometry={bed} material={bedMaterial} position-y={-3.4} frustumCulled={false} userData={COARSE} />
   <mesh name="laguna" geometry={water} material={lagoon} position-y={WATER_LEVEL} frustumCulled={false} userData={COARSE} renderOrder={1} />
  </>
 );
}
