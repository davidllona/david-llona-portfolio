import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { atan, attribute, cameraPosition, cos, float, fract, mix, mod, positionGeometry, sin, smoothstep, step, texture, transformNormalToView, uniform, vec2, vec3 } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { noiseTexture } from "../../../experience/environment/noise";
import { trailPush } from "../../../experience/environment/trail";
import { WIND, windOffset } from "../../../experience/environment/wind";
import { player, rig } from "../../../experience/state";
import { SPAN, terrainTextures } from "../terrainData";

// Césped. Una sola malla con todas las briznas, que acompaña a la cámara: las
// que salen por un lado reaparecen por el otro (módulo), así que siempre hay
// hierba donde se mira y nunca fuera de plano. Todo lo demás —dónde crece,
// cuánto mide, de qué color es, cómo la mueve el viento y cómo se aparta al
// paso— se calcula en la GPU con nodos TSL.
//
// La arquitectura (malla única, envoltura alrededor de la vista, máscara de
// terreno, giro hacia la cámara) está adaptada de folio-2025 de Bruno Simon
// (MIT; ver docs/CREDITOS.md). Son propios: la brizna curva de dos tramos, las
// matas, la densidad variable y que se doble al pisarla.

const PATCH = 48; // metros de lado del parche a la distancia normal de cámara
const SIDE = { high: 336, low: 190 }; // briznas por lado
const CLUMPS = 44; // matas por lado: las briznas se arriman a la más cercana

// Generador con semilla: el césped sale igual en cada visita.
function seeded(seed) {
 let state = seed;
 return () => ((state = (state * 16807) % 2147483647) / 2147483647);
}

// Cada brizna son 5 vértices (dos en la base, dos a media altura y la punta) y
// 3 triángulos. Todos sus vértices guardan el mismo punto de nacimiento; quién
// es cada uno va en `blade` = (lado −1…1, altura 0…1, azar de brizna, azar de mata).
function createGeometry(side) {
 const random = seeded(90210);
 const clumps = Array.from({ length: CLUMPS * CLUMPS }, () => [random(), random(), random()]);
 const count = side * side;
 const positions = new Float32Array(count * 5 * 3);
 const blades = new Float32Array(count * 5 * 4);
 const indices = new Uint32Array(count * 9);
 const shape = [[-1, 0], [1, 0], [-1, 0.5], [1, 0.5], [0, 1]];
 for (let i = 0; i < count; i++) {
  // Rejilla descolocada, en coordenadas 0…1 del parche.
  let x = ((i % side) + random()) / side;
  let z = (Math.floor(i / side) + random()) / side;
  // Se arrima a la mata más cercana (mirando las casillas vecinas, con vuelta).
  const cx = Math.floor(x * CLUMPS), cz = Math.floor(z * CLUMPS);
  let best = null, bestDistance = Infinity;
  for (let dz = -1; dz <= 1; dz++) {
   for (let dx = -1; dx <= 1; dx++) {
    const clump = clumps[((cz + dz + CLUMPS) % CLUMPS) * CLUMPS + ((cx + dx + CLUMPS) % CLUMPS)];
    const px = (cx + dx + clump[0]) / CLUMPS, pz = (cz + dz + clump[1]) / CLUMPS;
    const distance = (px - x) ** 2 + (pz - z) ** 2;
    if (distance < bestDistance) {
     bestDistance = distance;
     best = [px, pz, clump[2]];
    }
   }
  }
  const pull = 0.12 + random() * 0.38;
  x += (best[0] - x) * pull;
  z += (best[1] - z) * pull;
  const own = random();
  for (let k = 0; k < 5; k++) {
   positions.set([x - 0.5, 0, z - 0.5], (i * 5 + k) * 3);
   blades.set([shape[k][0], shape[k][1], own, best[2]], (i * 5 + k) * 4);
  }
  const v = i * 5;
  indices.set([v, v + 1, v + 2, v + 1, v + 3, v + 2, v + 2, v + 3, v + 4], i * 9);
 }
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
 geometry.setAttribute("blade", new THREE.BufferAttribute(blades, 4));
 geometry.setIndex(new THREE.BufferAttribute(indices, 1));
 // La posición real se decide en el sombreador: no hay caja que valga para descartarla.
 geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
 return geometry;
}

function createMaterial(centre, size) {
 const { data, color } = terrainTextures();
 const blade = attribute("blade", "vec4");
 const side = blade.x, along = blade.y, own = blade.z, clump = blade.w;

 // Dónde nace: su sitio en el parche, envuelto alrededor del centro de la vista.
 const local = positionGeometry.xz.mul(size).sub(centre);
 const root = mod(local.add(size.mul(0.5)), size).sub(size.mul(0.5)).add(centre);
 const terrainUv = root.div(SPAN).add(0.5);
 const terrain = texture(data, terrainUv);
 const amount = terrain.r;

 // Densidad: donde hay poca hierba, solo nacen algunas briznas.
 const present = step(own.mul(0.6).add(0.08), amount);
 // Altura: la mata, la brizna, una ondulación amplia del terreno y la máscara.
 const rolling = texture(noiseTexture, root.mul(0.031)).r.add(0.5);
 const far = size.div(PATCH); // de lejos (vista aérea) las briznas engordan para seguir cubriendo
 const height = float(0.54).mul(mix(0.62, 1.2, clump)).mul(mix(0.72, 1.18, fract(own.mul(5.3)))).mul(rolling).mul(amount.mul(0.85).add(0.32)).mul(present).mul(far.mul(0.35).add(0.65));
 const width = float(0.082).mul(mix(0.7, 1.35, fract(own.mul(7.7)))).mul(present).mul(far);

 // Mira a la cámara (girando solo sobre la vertical), con un desvío propio
 // para que no parezcan cartones alineados.
 const toCamera = cameraPosition.xz.sub(root);
 const angle = atan(toCamera.y, toCamera.x).add(Math.PI / 2).add(fract(own.mul(13.7)).sub(0.5).mul(1.5));
 const across = vec2(cos(angle), sin(angle));
 // Perfil: ancha en la base, afinada hacia la punta.
 const profile = along.oneMinus().pow(0.55);

 // Curvatura propia: cada brizna cae hacia un lado.
 const leanAngle = own.mul(6.2831 * 3).add(clump.mul(6.2831));
 const lean = vec2(cos(leanAngle), sin(leanAngle)).mul(mix(0.12, 0.42, fract(own.mul(3.1))));
 // Viento y rastro: la base no se mueve; la punta, la que más (crece con el cuadrado).
 const wind = windOffset(root).mul(WIND.flex.grass);
 const push = trailPush(root);
 const curve = along.mul(along);
 const bend = lean.add(wind.mul(1.7)).add(push.xy.mul(2.1)).mul(curve).mul(height);
 // Al tumbarse no se estira: lo que avanza en horizontal lo pierde en altura.
 const tall = along.mul(height).mul(push.z.mul(0.78).oneMinus());
 const drop = bend.length().mul(0.42).mul(along);

 const material = new MeshLambertNodeMaterial({ side: THREE.DoubleSide });
 material.positionNode = vec3(root.x.add(across.x.mul(width).mul(side).mul(profile)).add(bend.x), terrain.a.add(tall).sub(drop).sub(0.02), root.y.add(across.y.mul(width).mul(side).mul(profile)).add(bend.y));

 // Color: nace del color del suelo (así césped y terreno son una misma masa),
 // oscuro en la base y claro en la punta; más cálido al sol y más frío a la
 // sombra de los árboles; cada mata, un matiz.
 const soil = texture(color, terrainUv).rgb;
 const sunny = texture(noiseTexture, root.mul(0.013)).g;
 const tip = soil.mul(mix(vec3(0.98, 1.2, 0.8), vec3(1.26, 1.26, 0.66), smoothstep(0.35, 0.75, sunny)));
 const shaded = mix(vec3(1), vec3(0.8, 0.94, 1.08), terrain.g.mul(0.8));
 material.colorNode = mix(soil.mul(vec3(0.42, 0.56, 0.5)), tip, along.pow(0.9)).mul(shaded).mul(mix(0.9, 1.1, clump));
 // Normal hacia arriba: toda la pradera recibe la misma luz que el suelo.
 material.normalNode = transformNormalToView(vec3(0, 1, 0));
 return material;
}

export function Grass({ quality = "high" }) {
 const centre = useMemo(() => uniform(new THREE.Vector2()), []);
 const size = useMemo(() => uniform(PATCH), []);
 const geometry = useMemo(() => createGeometry(SIDE[quality] ?? SIDE.high), [quality]);
 const material = useMemo(() => createMaterial(centre, size), [centre, size]);
 const mesh = useRef(null);
 useEffect(
  () => () => {
   geometry.dispose();
   material.dispose();
  },
  [geometry, material],
 );

 useFrame(() => {
  // Centro de lo que ve la cámara: algo por delante (al norte) de lo que sigue.
  const focus = rig.focus ?? player.position;
  const zoom = Math.min(3.4, Math.max(1, rig.distance));
  size.value = PATCH * zoom;
  centre.value.set(focus.x, focus.z - 4 * zoom);
  // Desde el espacio no se distingue: se ahorra.
  mesh.current.visible = Math.max(rig.space, rig.intro) < 0.6;
 });

 return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} receiveShadow />;
}
