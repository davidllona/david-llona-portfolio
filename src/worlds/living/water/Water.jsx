import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { attribute, cameraPosition, float, fract, max, mix, positionGeometry, positionWorld, pow, sin, smoothstep, step, texture, varying, vec2, vec3 } from "three/tsl";
import { noiseTexture } from "../../../experience/environment/noise";
import { trailPush } from "../../../experience/environment/trail";
import { unlit } from "../../../experience/materials";
import { uniforms } from "../../../experience/theme";
import { POND, RIVER, SCATTER, WATERFALL, WATER_LEVEL, groundHeight } from "../layout";

// El agua de la isla: mar, río y estanque en un único plano al nivel del agua.
// Cada vértice lleva la profundidad del fondo bajo él (el agua aparece sola
// donde el suelo queda por debajo), la corriente del río, su posición a lo
// largo del cauce y lo cerca que tiene una roca. Con eso el material (nodos
// TSL) hace todo lo demás:
//  · color continuo según la profundidad: turquesa claro en la orilla, más
//    intenso en el centro, con manchas suaves de luz que derivan;
//  · ondas: líneas claras y curvas que nacen de dos capas de ruido que se
//    cruzan (no hay celdas ni facetas: no se lee la malla); en el río las
//    mismas líneas se estiran y corren aguas abajo;
//  · espuma irregular en orillas y costa, alrededor de las rocas, en la
//    corriente y donde cae la cascada; ondas donde vadean los personajes.
// (El agua como «color liso + detalles que siguen la profundidad» es la idea
// de folio-2025, de Bruno Simon, MIT; el código y el aspecto son propios.)
function createMaterial() {
 const { uTime, uWaterShallow, uWaterDeep, uSkyHorizon, uSunColor, uSpace, uNight } = uniforms;
 const fall = vec2(WATERFALL.x, WATERFALL.z + 1.5);
 const bed = attribute("depth", "float");
 const flow = attribute("flow", "vec2");
 const rock = attribute("rock", "float");
 const course = attribute("course", "vec2"); // metros a lo largo del río, metros a su través
 const noise = (uv) => texture(noiseTexture, uv);

 // ── Vértices: oleaje ──
 // Mar de fondo en mar abierto; apenas un temblor en río y estanque. En el
 // borde de la rejilla se anula para casar con el marco exterior, que es plano.
 const p = positionGeometry;
 const open = smoothstep(40, 54, p.xz.length());
 const edge = smoothstep(50, 57, max(p.x.abs(), p.z.abs())).oneMinus();
 const amplitude = mix(0.02, 0.13, open).mul(smoothstep(-0.2, 1, bed)).mul(edge);
 const swell = sin(p.x.mul(0.34).add(uTime.mul(0.9)))
  .add(sin(p.z.mul(0.41).sub(uTime.mul(0.7)).add(p.x.mul(0.12))))
  .add(sin(p.x.add(p.z).mul(0.9).add(uTime.mul(1.6))).mul(0.5));
 const lift = amplitude.mul(swell);
 const depth = varying(bed.add(lift));
 const current = varying(flow.length());
 const along = varying(course);

 // ── Fragmentos ──
 const pos = positionWorld.xz;
 const fromCentre = pos.length();
 const toEye = cameraPosition.sub(positionWorld).normalize();
 const day = uNight.mul(0.78).oneMinus(); // de noche las ondas y los destellos casi se apagan

 // Dos capas de ruido que derivan en sentidos distintos. En el cauce se
 // cambian por otras dos medidas a lo largo del río, que bajan con él.
 const calmA = noise(pos.mul(0.047).add(vec2(uTime.mul(0.011), uTime.mul(0.007)))).r;
 const calmB = noise(pos.mul(0.081).add(vec2(uTime.mul(-0.009), uTime.mul(0.013)))).g;
 const riverUv = vec2(along.x.mul(0.058).sub(uTime.mul(0.13)), along.y.mul(0.17));
 const riverA = noise(riverUv).r;
 const riverB = noise(riverUv.mul(vec2(1.7, 1.45)).add(vec2(uTime.mul(-0.05), 0.37))).g;
 const running = smoothstep(0.15, 0.75, current);
 const waveA = mix(calmA, riverA, running);
 const waveB = mix(calmB, riverB, running);

 // Color por profundidad: continuo, con el contorno algo movido por el ruido.
 const deep = smoothstep(0.05, 1.75, depth.add(calmA.sub(0.5).mul(0.5)));
 const shore = mix(uWaterShallow, vec3(1), 0.42);
 let color = mix(mix(shore, uWaterShallow, smoothstep(0, 0.3, deep)), uWaterDeep, smoothstep(0.22, 1, deep));
 // Manchas de luz y sombra que se mueven despacio: el agua no es un color plano.
 color = color.mul(waveA.sub(0.5).mul(0.3).add(waveB.sub(0.5).mul(0.14)).add(1));

 // Ondas: donde las dos capas suman lo mismo sale una línea curva y fina, que
 // se retuerce al derivar. Una tercera capa las corta en tramos.
 const ridge = waveA.add(waveB).sub(1).abs();
 const breaks = smoothstep(0.4, 0.58, noise(pos.mul(0.021).add(vec2(uTime.mul(0.004), uTime.mul(-0.003)))).g);
 const waves = smoothstep(0.02, 0.004, ridge).mul(mix(breaks, float(1), running)).mul(smoothstep(110, 70, fromCentre));
 color = color.add(mix(vec3(1), uSunColor, 0.35).mul(waves).mul(mix(0.2, 0.3, running)).mul(day));
 // Destellos sueltos que se encienden y se apagan.
 const twinkle = smoothstep(0.93, 0.97, noise(pos.mul(0.43).add(vec2(uTime.mul(0.02), uTime.mul(0.015)))).r.add(noise(pos.mul(0.71).sub(vec2(uTime.mul(0.03), uTime.mul(0.011)))).g).mul(0.62));
 color = color.add(uSunColor.mul(twinkle).mul(0.22).mul(day));
 // A ras de agua refleja el cielo.
 const grazing = pow(toEye.y.max(0).oneMinus(), 3);
 color = mix(color, uSkyHorizon, grazing.mul(0.35));

 // Espuma. El ruido rompe el borde para que no sea una línea de regla.
 const foamNoise = noise(pos.mul(0.19).add(vec2(uTime.mul(0.03), uTime.mul(-0.021)))).r;
 const fine = noise(pos.mul(0.47).add(vec2(uTime.mul(-0.04), uTime.mul(0.033)))).g;
 const ragged = foamNoise.sub(0.5).mul(0.2).add(fine.sub(0.5).mul(0.1));
 // Orilla y costa: una franja que respira.
 const breathe = sin(uTime.mul(0.9).add(foamNoise.mul(6))).mul(0.025);
 // Dos líneas blancas y nítidas: la del borde, pegada a la tierra, y otra
 // fina un poco más adentro, que va y viene.
 const lip = depth.add(ragged.mul(0.6)).add(breathe);
 let foam = smoothstep(0.085, 0.07, lip);
 const second = lip.sub(0.2).sub(sin(uTime.mul(0.55).add(foamNoise.mul(4))).mul(0.035)).abs();
 foam = max(foam, smoothstep(0.03, 0.018, second).mul(0.9));
 // Ondas que se acercan a la orilla siguiendo la profundidad, a tramos.
 const band = fract(depth.mul(1.35).sub(uTime.mul(0.12)).add(foamNoise.mul(0.6)));
 const broken = smoothstep(0.46, 0.56, fine.add(foamNoise).mul(0.5));
 foam = max(foam, smoothstep(0, 0.07, band).mul(smoothstep(0.24, 0.1, band)).mul(smoothstep(1.25, 0.3, depth)).mul(broken).mul(0.75));
 // Alrededor de las rocas que asoman.
 foam = max(foam, smoothstep(0.2, 0.17, rock.add(ragged)).mul(step(-0.3, rock)));
 foam = max(foam, smoothstep(0.035, 0.02, rock.add(ragged).sub(0.36).sub(breathe.mul(1.6)).abs()).mul(step(-0.3, rock)).mul(0.85));
 // Corriente del río: jirones de espuma que bajan con el agua.
 const streaks = smoothstep(0.6, 0.68, riverA).mul(smoothstep(0.5, 0.62, riverB));
 foam = max(foam, streaks.mul(running).mul(0.7));
 // Donde cae la cascada: agua batida y anillos que se abren.
 const fromFall = pos.sub(fall).length();
 const rings = sin(fromFall.mul(4.2).sub(uTime.mul(3.6)).add(foamNoise.mul(2.5))).mul(0.5).add(0.5);
 foam = max(foam, smoothstep(2.3, 1.0, fromFall.add(foamNoise.mul(1.3))));
 foam = max(foam, smoothstep(0.7, 0.92, rings).mul(smoothstep(POND.r, 1.4, fromFall)).mul(broken.mul(0.6).add(0.4)).mul(0.55));
 // Al vadear: el rastro del astronauta y de Woody deja ondas que se deshacen.
 const wake = trailPush(pos).z;
 const ripples = sin(wake.mul(16).sub(uTime.mul(5))).mul(0.5).add(0.5);
 foam = max(foam, smoothstep(0.1, 0.3, wake).mul(smoothstep(0.35, 0.8, ripples)).mul(0.85));
 foam = foam.clamp(0, 1);
 // (De noche la espuma se apaga: sin sol no puede ser lo más claro de la escena.)
 color = mix(color, mix(vec3(1), vec3(0.42, 0.56, 0.86), uNight), foam.mul(mix(0.94, 0.7, uNight)));

 let alpha = max(mix(0.78, 0.97, deep), foam);
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
const CELLS_PER_SIDE = 232; // celdas de medio metro: orillas finas

// Dirección y fuerza de la corriente en (x, z): se nota en el cauce y se apaga
// al llegar al mar abierto. Devuelve además por dónde va ese punto del río:
// metros recorridos desde el estanque y metros a un lado del eje.
function riverFlow(x, z) {
 let best = Infinity;
 let flow = [0, 0];
 let course = [0, 0];
 let walked = 0;
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
   course = [walked + t * length, ((x - ax) * dz - (z - az) * dx) / length];
  }
  walked += length;
 }
 // (En el estanque el agua está quieta: la corriente arranca a su salida.)
 const leaving = Math.min(1, Math.max(0, (Math.hypot(x - POND.x, z - POND.z) - POND.r * 0.75) / (POND.r * 0.6)));
 const strength = (1 - Math.min(1, Math.max(0, (best - 1.2) / 1.6))) * (1 - Math.min(1, Math.max(0, (Math.hypot(x, z) - 40) / 6))) * leaving;
 return { flow: [flow[0] * strength, flow[1] * strength], course };
}

function createGeometries() {
 // Rocas con el pie en el agua: a su alrededor se forma espuma.
 const wet = [...SCATTER.rocks, ...SCATTER.cliffRocks, ...(SCATTER.shoreRocks ?? [])].filter((rock) => groundHeight(rock.x, rock.z) < WATER_LEVEL + 0.12);

 const inner = new THREE.PlaneGeometry(GRID, GRID, CELLS_PER_SIDE, CELLS_PER_SIDE).rotateX(-Math.PI / 2);
 const position = inner.attributes.position;
 const depth = new Float32Array(position.count);
 const flow = new Float32Array(position.count * 2);
 const course = new Float32Array(position.count * 2);
 const rock = new Float32Array(position.count);
 for (let i = 0; i < position.count; i++) {
  const x = position.getX(i), z = position.getZ(i);
  depth[i] = WATER_LEVEL - groundHeight(x, z);
  const river = riverFlow(x, z);
  flow.set(river.flow, i * 2);
  course.set(river.course, i * 2);
  let nearest = 9;
  for (const stone of wet) nearest = Math.min(nearest, Math.hypot(stone.x - x, stone.z - z) - stone.scale * 0.62);
  rock[i] = nearest;
 }
 inner.setAttribute("depth", new THREE.BufferAttribute(depth, 1));
 inner.setAttribute("flow", new THREE.BufferAttribute(flow, 2));
 inner.setAttribute("course", new THREE.BufferAttribute(course, 2));
 inner.setAttribute("rock", new THREE.BufferAttribute(rock, 1));

 // Fuera: mar abierto, siempre profundo. Es un marco que encaja con la rejilla.
 const half = GRID / 2;
 const shape = new THREE.Shape().absarc(0, 0, 175, 0, Math.PI * 2);
 shape.holes.push(new THREE.Path().moveTo(-half, -half).lineTo(-half, half).lineTo(half, half).lineTo(half, -half).closePath());
 const outer = new THREE.ShapeGeometry(shape, 48).rotateX(-Math.PI / 2);
 const count = outer.attributes.position.count;
 outer.setAttribute("depth", new THREE.BufferAttribute(new Float32Array(count).fill(3), 1));
 outer.setAttribute("flow", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
 outer.setAttribute("course", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
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
