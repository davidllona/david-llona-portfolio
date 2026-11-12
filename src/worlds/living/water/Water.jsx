import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { uniforms } from "../../../experience/theme";
import { POND, RIVER, SCATTER, WATERFALL, WATER_LEVEL, groundHeight } from "../layout";
import { CELLS } from "./glsl";

// El agua de la isla: mar, río y estanque en un único plano al nivel del agua.
// Cada vértice lleva la profundidad del fondo bajo él (el agua aparece sola
// donde el suelo queda por debajo), la corriente del río y lo cerca que tiene
// una roca. Con eso el sombreador hace todo lo demás:
//  · oleaje por vértice y caras facetadas que brillan al sol o a la luna;
//  · tono por bandas de profundidad;
//  · dibujo de celdas claras que deriva (y corre río abajo);
//  · espuma irregular en orillas, alrededor de las rocas y donde cae la cascada.
const SHADER = {
 vertexShader: /* glsl */ `
  uniform float uTime;
  attribute float depth;
  attribute vec2 flow;
  attribute float rock;
  varying float vDepth;
  varying float vRock;
  varying vec2 vFlow;
  varying vec2 vPos;
  varying vec3 vWorld;
  void main() {
   vec3 p = position;
   float fromCentre = length(p.xz);
   // Mar de fondo en mar abierto; apenas un temblor en río y estanque. En el
   // borde de la rejilla se anula para casar con el marco exterior, que es plano.
   float open = smoothstep(40.0, 54.0, fromCentre);
   float amplitude = mix(0.028, 0.15, open) * smoothstep(-0.2, 1.0, depth) * (1.0 - smoothstep(50.0, 57.0, max(abs(p.x), abs(p.z))));
   p.y += amplitude * (sin(p.x * 0.34 + uTime * 0.9) + sin(p.z * 0.41 - uTime * 0.7 + p.x * 0.12) + 0.5 * sin((p.x + p.z) * 0.9 + uTime * 1.6));
   vDepth = depth + p.y;
   vRock = rock;
   vFlow = flow;
   vPos = p.xz;
   vec4 world = modelMatrix * vec4(p, 1.0);
   vWorld = world.xyz;
   gl_Position = projectionMatrix * viewMatrix * world;
  }`,
 fragmentShader: /* glsl */ `
  uniform vec3 uWaterShallow;
  uniform vec3 uWaterDeep;
  uniform vec3 uSkyHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uTime;
  uniform float uSpace;
  uniform float uNight;
  uniform vec3 uFall; // x, z de la caída de la cascada y radio de sus ondas
  varying float vDepth;
  varying float vRock;
  varying vec2 vFlow;
  varying vec2 vPos;
  varying vec3 vWorld;
  ${CELLS}

  void main() {
   if (vDepth < -0.03) discard;
   float fromCentre = length(vPos);
   float current = length(vFlow);
   vec3 normal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
   if (normal.y < 0.0) normal = -normal;
   vec3 toEye = normalize(cameraPosition - vWorld);

   // Tono por bandas de profundidad, con el contorno algo ondulado.
   float wavy = vDepth + 0.16 * sin(vPos.x * 0.7 + uTime * 0.3) * sin(vPos.y * 0.6 - uTime * 0.25);
   float deep = clamp(wavy / 1.7, 0.0, 1.0);
   float banded = (floor(deep * 4.0) + smoothstep(0.7, 1.0, fract(deep * 4.0))) / 4.0;
   vec3 color = mix(uWaterShallow, uWaterDeep, banded);

   // Dibujo de celdas: deriva despacio; en el río corre aguas abajo y se estira.
   vec2 drift = current > 0.01 ? vFlow * uTime * 1.5 : vec2(uTime * 0.06, uTime * 0.035);
   vec2 pattern = cells((vPos - drift) * 0.5, uTime * 0.45);
   float lines = smoothstep(0.05, 0.0, pattern.y) * (1.0 - smoothstep(70.0, 110.0, fromCentre));
   color += lines * (0.075 + 0.1 * current) * mix(vec3(1.0), uSunColor, 0.4) * (1.0 - 0.45 * uNight);

   // Luz: cada cara recibe distinto y algunas devuelven un destello.
   color *= 0.84 + 0.26 * max(dot(normal, uSunDirection), 0.0);
   float glint = pow(max(dot(normal, normalize(uSunDirection + toEye)), 0.0), 120.0);
   color += uSunColor * step(0.3, glint) * (0.4 + 0.3 * uNight);
   float grazing = pow(1.0 - max(dot(normal, toEye), 0.0), 3.0);
   color = mix(color, uSkyHorizon, grazing * 0.4);

   // Espuma. El ruido rompe el borde para que no sea una línea de regla.
   vec2 foamNoise = cells(vPos * 1.7 + vec2(uTime * 0.1, -uTime * 0.07), uTime * 0.8);
   float ragged = foamNoise.x * 0.09;
   // Máscara suave que rompe las líneas de espuma en tramos.
   float broken = smoothstep(-0.25, 0.1, sin(vPos.x * 2.1 + uTime * 0.3) * sin(vPos.y * 1.7 - uTime * 0.22));
   float foam = 1.0 - smoothstep(0.0, 0.06, vDepth - ragged + 0.03);
   // Segunda línea, a trozos, que se acerca a la orilla y se deshace.
   float swell = fract(vDepth * 1.5 - uTime * 0.14);
   foam = max(foam, smoothstep(0.0, 0.05, swell) * (1.0 - smoothstep(0.05, 0.15, swell)) * (1.0 - smoothstep(0.25, 1.3, vDepth)) * broken * 0.8);
   // Alrededor de las rocas que asoman.
   foam = max(foam, (1.0 - smoothstep(0.06, 0.3, vRock - ragged)) * step(-0.35, vRock));

   // Corriente del río: jirones de espuma estirados que bajan con el agua.
   if (current > 0.01) {
    vec2 dir = vFlow / current;
    vec2 along = vec2(dot(vPos, dir) * 0.22 - uTime * 0.6, dot(vPos, vec2(-dir.y, dir.x)) * 1.9);
    vec2 streaks = cells(along, 0.0);
    // Solo algunos hilos, y solo en el centro del cauce.
    float patchy = step(0.55, cells(along * 0.35 + 3.7, 0.0).x);
    foam = max(foam, smoothstep(0.05, 0.0, streaks.y) * patchy * current * 0.6);
   }

   // Donde cae la cascada: agua batida y anillos que se abren.
   float fromFall = distance(vPos, uFall.xy);
   float churn = (1.0 - smoothstep(0.5, 1.5, fromFall + foamNoise.x * 0.9));
   float rings = sin(fromFall * 5.0 - uTime * 4.5) * 0.5 + 0.5;
   foam = max(foam, churn);
   foam = max(foam, smoothstep(0.62, 0.9, rings) * (1.0 - smoothstep(1.2, uFall.z, fromFall)) * broken * 0.6);

   foam = clamp(foam, 0.0, 1.0);
   vec3 foamColor = mix(vec3(1.0), vec3(0.62, 0.78, 1.0), uNight * 0.75);
   color = mix(color, foamColor, foam * 0.94);

   float alpha = max(mix(0.7, 0.96, deep), foam);
   // El mar se funde con el horizonte; desde la nave se recoge alrededor de la isla.
   alpha *= 1.0 - smoothstep(105.0, 170.0, fromCentre);
   alpha *= 1.0 - uSpace * smoothstep(60.0, 94.0, fromCentre);
   gl_FragColor = vec4(color, alpha);
  }`,
};

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
  for (const stone of wet) nearest = Math.min(nearest, Math.hypot(stone.x - x, stone.z - z) - stone.scale * 0.85);
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
 const material = useMemo(
  () =>
   new THREE.ShaderMaterial({
    ...SHADER,
    transparent: true,
    depthWrite: false,
    uniforms: {
     uWaterShallow: uniforms.uWaterShallow,
     uWaterDeep: uniforms.uWaterDeep,
     uSkyHorizon: uniforms.uSkyHorizon,
     uSunColor: uniforms.uSunColor,
     uSunDirection: uniforms.uSunDirection,
     uTime: uniforms.uTime,
     uSpace: uniforms.uSpace,
     uNight: uniforms.uNight,
     uFall: { value: new THREE.Vector3(WATERFALL.x, WATERFALL.z + 1.5, POND.r) },
    },
   }),
  [],
 );
 useEffect(
  () => () => {
   geometries.forEach((geometry) => geometry.dispose());
   material.dispose();
  },
  [geometries, material],
 );
 return geometries.map((geometry, i) => <mesh key={i} geometry={geometry} material={material} position-y={WATER_LEVEL} />);
}
