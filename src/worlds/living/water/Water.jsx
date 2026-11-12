import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { attribute, cameraPosition, cross, dFdx, dFdy, dot, floor, fract, max, mix, positionGeometry, positionWorld, pow, sin, smoothstep, step, texture, varying, vec2, vec3 } from "three/tsl";
import { noiseTexture } from "../../../experience/environment/noise";
import { trailPush } from "../../../experience/environment/trail";
import { unlit } from "../../../experience/materials";
import { uniforms } from "../../../experience/theme";
import { POND, RIVER, SCATTER, WATERFALL, WATER_LEVEL, groundHeight } from "../layout";
import { cells } from "./nodes";

// El agua de la isla: mar, río y estanque en un único plano al nivel del agua.
// Cada vértice lleva la profundidad del fondo bajo él (el agua aparece sola
// donde el suelo queda por debajo), la corriente del río y lo cerca que tiene
// una roca. Con eso el material (nodos TSL) hace todo lo demás:
//  · oleaje por vértice y caras facetadas que brillan al sol o a la luna;
//  · tono por bandas de profundidad;
//  · dibujo de celdas claras que deriva (y corre río abajo);
//  · espuma irregular en orillas, alrededor de las rocas y donde cae la cascada.
function createMaterial() {
 const { uTime, uWaterShallow, uWaterDeep, uSkyHorizon, uSunColor, uSunDirection, uSpace, uNight } = uniforms;
 const fall = vec2(WATERFALL.x, WATERFALL.z + 1.5);
 const bed = attribute("depth", "float");
 const flow = attribute("flow", "vec2");
 const rock = attribute("rock", "float");

 // ── Vértices: oleaje ──
 // Mar de fondo en mar abierto; apenas un temblor en río y estanque. En el
 // borde de la rejilla se anula para casar con el marco exterior, que es plano.
 const p = positionGeometry;
 const open = smoothstep(40, 54, p.xz.length());
 const edge = smoothstep(50, 57, max(p.x.abs(), p.z.abs())).oneMinus();
 const amplitude = mix(0.028, 0.15, open).mul(smoothstep(-0.2, 1, bed)).mul(edge);
 const swell = sin(p.x.mul(0.34).add(uTime.mul(0.9)))
  .add(sin(p.z.mul(0.41).sub(uTime.mul(0.7)).add(p.x.mul(0.12))))
  .add(sin(p.x.add(p.z).mul(0.9).add(uTime.mul(1.6))).mul(0.5));
 const lift = amplitude.mul(swell);
 const depth = varying(bed.add(lift));

 // ── Fragmentos ──
 const pos = positionWorld.xz;
 const fromCentre = pos.length();
 const current = flow.length();
 // Normal de cada cara, a partir de la superficie ya movida: da el facetado.
 const facet = cross(dFdx(positionWorld), dFdy(positionWorld)).normalize();
 const normal = facet.mul(facet.y.sign());
 const toEye = cameraPosition.sub(positionWorld).normalize();

 // Tono por bandas de profundidad, con el contorno algo ondulado.
 const wavy = depth.add(sin(pos.x.mul(0.7).add(uTime.mul(0.3))).mul(sin(pos.y.mul(0.6).sub(uTime.mul(0.25)))).mul(0.16));
 const deep = wavy.div(1.7).clamp(0, 1);
 const banded = floor(deep.mul(4)).add(smoothstep(0.7, 1, fract(deep.mul(4)))).div(4);
 let color = mix(uWaterShallow, uWaterDeep, banded);

 // Dibujo de celdas: deriva despacio; en el río corre aguas abajo.
 const drift = mix(vec2(uTime.mul(0.06), uTime.mul(0.035)), flow.mul(uTime).mul(1.5), step(0.01, current));
 const pattern = cells(pos.sub(drift).mul(0.5), uTime.mul(0.45));
 const lines = smoothstep(0.05, 0, pattern.y).mul(smoothstep(110, 70, fromCentre));
 color = color.add(mix(vec3(1), uSunColor, 0.4).mul(lines).mul(current.mul(0.1).add(0.075)).mul(uNight.mul(0.45).oneMinus()));

 // Luz: cada cara recibe distinto y algunas devuelven un destello.
 color = color.mul(max(dot(normal, uSunDirection), 0).mul(0.26).add(0.84));
 // Destellos sueltos, no un espejo: solo chispean algunas celdas, y solo
 // donde la cara devuelve la luz hacia la cámara.
 const glint = pow(max(dot(normal, uSunDirection.add(toEye).normalize()), 0), 60);
 const sparkle = step(0.88, cells(pos.mul(2.6).add(vec2(uTime.mul(0.4), uTime.mul(0.27))), uTime.mul(2)).x.oneMinus()).mul(step(0.64, texture(noiseTexture, pos.mul(0.09).add(uTime.mul(0.015))).r));
 color = color.add(uSunColor.mul(step(0.5, glint)).mul(sparkle).mul(0.5));
 const grazing = pow(max(dot(normal, toEye), 0).oneMinus(), 3);
 color = mix(color, uSkyHorizon, grazing.mul(0.4));

 // Espuma. El ruido rompe el borde para que no sea una línea de regla.
 const foamNoise = cells(pos.mul(1.7).add(vec2(uTime.mul(0.1), uTime.mul(-0.07))), uTime.mul(0.8));
 const ragged = foamNoise.x.mul(0.09);
 // Máscara suave que rompe las líneas de espuma en tramos.
 const broken = smoothstep(-0.25, 0.1, sin(pos.x.mul(2.1).add(uTime.mul(0.3))).mul(sin(pos.y.mul(1.7).sub(uTime.mul(0.22)))));
 let foam = smoothstep(0, 0.06, depth.sub(ragged).add(0.03)).oneMinus();
 // Bandas que siguen la profundidad y se acercan a la orilla (idea de folio-2025).
 const band = fract(depth.mul(1.5).sub(uTime.mul(0.14)));
 foam = max(foam, smoothstep(0, 0.05, band).mul(smoothstep(0.15, 0.05, band)).mul(smoothstep(1.3, 0.25, depth)).mul(broken).mul(0.8));
 // Alrededor de las rocas que asoman.
 foam = max(foam, smoothstep(0.2, 0.04, rock.sub(ragged)).mul(step(-0.3, rock)));
 // Corriente del río: jirones de espuma estirados que bajan con el agua.
 const dir = flow.div(current.max(0.0001));
 const along = vec2(dot(pos, dir).mul(0.22).sub(uTime.mul(0.6)), dot(pos, vec2(dir.y.negate(), dir.x)).mul(1.9));
 const streaks = cells(along, 0);
 const patchy = step(0.55, cells(along.mul(0.35).add(3.7), 0).x);
 foam = max(foam, smoothstep(0.05, 0, streaks.y).mul(patchy).mul(current).mul(0.6));
 // Donde cae la cascada: agua batida y anillos que se abren.
 const fromFall = pos.sub(fall).length();
 const rings = sin(fromFall.mul(5).sub(uTime.mul(4.5))).mul(0.5).add(0.5);
 foam = max(foam, smoothstep(1.5, 0.5, fromFall.add(foamNoise.x.mul(0.9))));
 foam = max(foam, smoothstep(0.62, 0.9, rings).mul(smoothstep(POND.r, 1.2, fromFall)).mul(broken).mul(0.6));
 // Al vadear: el rastro del astronauta y de Woody deja ondas que se deshacen.
 const wake = trailPush(pos).z;
 const ripples = sin(wake.mul(16).sub(uTime.mul(5))).mul(0.5).add(0.5);
 foam = max(foam, smoothstep(0.1, 0.3, wake).mul(smoothstep(0.35, 0.8, ripples)).mul(0.85));
 foam = foam.clamp(0, 1);
 color = mix(color, mix(vec3(1), vec3(0.62, 0.78, 1), uNight.mul(0.75)), foam.mul(0.94));

 let alpha = max(mix(0.7, 0.96, deep), foam);
 // El mar se funde con el horizonte; desde la nave se recoge alrededor de la isla.
 alpha = alpha.mul(smoothstep(170, 105, fromCentre)).mul(uSpace.mul(smoothstep(60, 94, fromCentre)).oneMinus());
 // Donde el fondo asoma por encima del agua no se pinta nada.
 alpha = alpha.mul(step(-0.03, depth));

 const material = unlit({ transparent: true, depthWrite: false });
 material.positionNode = positionGeometry.add(vec3(0, lift, 0));
 material.colorNode = color;
 material.opacityNode = alpha;
 return material;
}

const GRID = 116; // metros de lado del plano detallado
const CELLS_PER_SIDE = 232; // celdas de medio metro: orillas finas y oleaje facetado menudo

// Dirección y fuerza de la corriente en (x, z): se nota en el cauce y se apaga
// al llegar al mar abierto.
function riverFlow(x, z) {
 let best = Infinity;
 let flow = [0, 0];
 for (let i = 0; i < RIVER.length - 1; i++) {
  const [ax, az] = RIVER[i];
  const [bx, bz] = RIVER[i + 1];
  const dx = bx - ax, dz = bz - az;
  const length = Math.hypot(dx, dz);
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (length * length)));
  const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
  if (d < best) {
   best = d;
   flow = [dx / length, dz / length];
  }
 }
 const strength = (1 - Math.min(1, Math.max(0, (best - 1.2) / 1.6))) * (1 - Math.min(1, Math.max(0, (Math.hypot(x, z) - 40) / 6)));
 return [flow[0] * strength, flow[1] * strength];
}

function createGeometries() {
 // Rocas con el pie en el agua: a su alrededor se forma espuma.
 const wet = [...SCATTER.rocks, ...SCATTER.cliffRocks, ...(SCATTER.shoreRocks ?? [])].filter((rock) => groundHeight(rock.x, rock.z) < WATER_LEVEL + 0.12);

 const inner = new THREE.PlaneGeometry(GRID, GRID, CELLS_PER_SIDE, CELLS_PER_SIDE).rotateX(-Math.PI / 2);
 const position = inner.attributes.position;
 const depth = new Float32Array(position.count);
 const flow = new Float32Array(position.count * 2);
 const rock = new Float32Array(position.count);
 for (let i = 0; i < position.count; i++) {
  const x = position.getX(i), z = position.getZ(i);
  depth[i] = WATER_LEVEL - groundHeight(x, z);
  flow.set(riverFlow(x, z), i * 2);
  let nearest = 9;
  for (const stone of wet) nearest = Math.min(nearest, Math.hypot(stone.x - x, stone.z - z) - stone.scale * 0.62);
  rock[i] = nearest;
 }
 inner.setAttribute("depth", new THREE.BufferAttribute(depth, 1));
 inner.setAttribute("flow", new THREE.BufferAttribute(flow, 2));
 inner.setAttribute("rock", new THREE.BufferAttribute(rock, 1));

 // Fuera: mar abierto, siempre profundo. Es un marco que encaja con la rejilla.
 const half = GRID / 2;
 const shape = new THREE.Shape().absarc(0, 0, 175, 0, Math.PI * 2);
 shape.holes.push(new THREE.Path().moveTo(-half, -half).lineTo(-half, half).lineTo(half, half).lineTo(half, -half).closePath());
 const outer = new THREE.ShapeGeometry(shape, 48).rotateX(-Math.PI / 2);
 const count = outer.attributes.position.count;
 outer.setAttribute("depth", new THREE.BufferAttribute(new Float32Array(count).fill(3), 1));
 outer.setAttribute("flow", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
 outer.setAttribute("rock", new THREE.BufferAttribute(new Float32Array(count).fill(9), 1));
 return [inner, outer];
}

export function Water() {
 const geometries = useMemo(createGeometries, []);
 const material = useMemo(createMaterial, []);
 useEffect(
  () => () => {
   geometries.forEach((geometry) => geometry.dispose());
   material.dispose();
  },
  [geometries, material],
 );
 return geometries.map((geometry, i) => <mesh key={i} geometry={geometry} material={material} position-y={WATER_LEVEL} />);
}
