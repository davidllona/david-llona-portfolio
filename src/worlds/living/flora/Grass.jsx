import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { atan, attribute, cameraPosition, cos, float, fract, mix, mod, positionGeometry, sin, smoothstep, step, texture, transformNormalToView, uniform, vec2, vec3 } from "three/tsl";
import { MeshLambertNodeMaterial } from "three/webgpu";
import { noiseTexture } from "../../../experience/environment/noise";
import { drawAfterSeeThrough } from "../../../experience/environment/seeThrough";
import { trailPush } from "../../../experience/environment/trail";
import { WIND, windOffset } from "../../../experience/environment/wind";
import { player, rig } from "../../../experience/state";
import { SPAN, sampleTerrain, terrainTextures } from "../terrainData";

// Césped. Una sola brizna dibujada con instancias (una llamada de dibujo), en
// un parche que acompaña a la cámara: las matas que salen por un lado
// reaparecen por el otro (módulo), así que siempre hay hierba donde se mira y
// nunca fuera de plano. Todo lo demás —dónde crece, cuánto mide, de qué color
// es, cómo la mueve el viento y cómo se aparta al paso— se calcula en la GPU
// con nodos TSL.
//
// La arquitectura (envoltura alrededor de la vista, máscara de terreno, giro
// hacia la cámara) está adaptada de folio-2025 de Bruno Simon (MIT; ver
// docs/CREDITOS.md). Son propios: la brizna curva de cuatro tramos, las matas
// en abanico, la densidad por máscara y que se doble al pisarla.

const PATCH = 48; // metros de lado del parche a la distancia normal de cámara
// Matas por lado, briznas por mata (de media) y briznas sueltas de relleno.
const DETAIL = { high: { tufts: 144, blades: 9, loose: 30000 }, low: { tufts: 76, blades: 8, loose: 9000 } };

// Generador con semilla: el césped sale igual en cada visita.
function seeded(seed) {
 let state = seed;
 return () => ((state = (state * 16807) % 2147483647) / 2147483647);
}

// La brizna: siete vértices en cuatro alturas (base, dos tramos y punta) y
// cinco triángulos. x = lado (−1…1), y = altura (0…1); la forma, la curva y
// el sitio los pone el sombreador. Cada instancia lleva:
//   tuftA = (centro de su mata en el parche, x y z en −0,5…0,5 · separación del centro, en metros)
//   tuftB = (distancia al centro de la mata 0…1 · 1 si es brizna suelta · azar de brizna · azar de mata)
function createGeometry({ tufts, blades, loose }) {
 const random = seeded(90210);
 const a = [], b = [];
 for (let i = 0; i < tufts * tufts; i++) {
  const cx = ((i % tufts) + random()) / tufts - 0.5;
  const cz = (Math.floor(i / tufts) + random()) / tufts - 0.5;
  const radius = 0.09 + random() * 0.15;
  const clump = random();
  const count = Math.round(blades * (0.6 + random() * 0.8));
  for (let k = 0; k < count; k++) {
   const angle = random() * Math.PI * 2;
   const radial = random() ** 0.7;
   a.push(cx, cz, Math.cos(angle) * radial * radius, Math.sin(angle) * radial * radius);
   b.push(radial, 0, random(), clump);
  }
 }
 // Briznas sueltas: césped corto entre las matas, para que no queden islas.
 for (let i = 0; i < loose; i++) {
  const angle = random() * Math.PI * 2;
  a.push(random() - 0.5, random() - 0.5, Math.cos(angle) * 0.01, Math.sin(angle) * 0.01);
  b.push(random(), 1, random(), random());
 }
 const geometry = new THREE.InstancedBufferGeometry();
 const levels = [0, 0.36, 0.7];
 geometry.setAttribute("position", new THREE.Float32BufferAttribute([...levels.flatMap((y) => [-1, y, 0, 1, y, 0]), 0, 1, 0], 3));
 geometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]);
 geometry.setAttribute("tuftA", new THREE.InstancedBufferAttribute(new Float32Array(a), 4));
 geometry.setAttribute("tuftB", new THREE.InstancedBufferAttribute(new Float32Array(b), 4));
 geometry.instanceCount = b.length / 4;
 // La posición real se decide en el sombreador: no hay caja que valga para descartarla.
 geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
 return geometry;
}

function createMaterial(centre, size, rise) {
 const { data, color } = terrainTextures();
 const tuftA = attribute("tuftA", "vec4"), tuftB = attribute("tuftB", "vec4");
 const side = positionGeometry.x, along = positionGeometry.y;
 const radial = tuftB.x, loose = tuftB.y, own = tuftB.z, clump = tuftB.w;

 // Dónde nace: el centro de su mata, envuelto alrededor del centro de la
 // vista, más su sitio dentro de la mata (así una mata nunca se parte).
 const local = tuftA.xy.mul(size).sub(centre);
 const root = mod(local.add(size.mul(0.5)), size).sub(size.mul(0.5)).add(centre).add(tuftA.zw);
 const terrainUv = root.div(SPAN).add(0.5);
 const terrain = texture(data, terrainUv);
 const amount = terrain.r, density = terrain.b;

 // Densidad: cada mata nace o no entera según la máscara (tupido junto a
 // caminos, rocas, árboles y orillas; claros entre medias). Las briznas
 // sueltas salen más repartidas. Donde no hay hierba, nada.
 const grows = mix(step(clump.mul(0.86).add(0.07), density), step(own.mul(0.9).add(0.04), density.mul(0.7).add(0.12)), loose).mul(step(0.07, amount));
 // Altura: la mata, el sitio en la mata (el centro, más alto), la brizna,
 // una ondulación amplia del terreno y la máscara.
 const rolling = texture(noiseTexture, root.mul(0.031)).r.add(0.5);
 // `rise` (0…1) recoge las briznas hacia el suelo cuando la cámara se aleja
 // (al despegar): encogen sin moverse de su sitio. El parche no cambia nunca de
 // tamaño: si lo hiciera, cada brizna saltaría a otro punto y el césped se rompería.
 const height = float(0.56)
  .mul(mix(0.68, 1.25, clump))
  .mul(mix(1.08, 0.6, radial))
  .mul(mix(0.78, 1.15, fract(own.mul(5.3))))
  .mul(mix(1, 0.5, loose))
  .mul(rolling)
  .mul(amount.mul(0.85).add(0.3))
  .mul(grows)
  .mul(rise);
 const width = float(0.058).mul(mix(0.75, 1.3, fract(own.mul(7.7)))).mul(grows).mul(rise.mul(0.5).add(0.5));

 // Mira a la cámara (girando solo sobre la vertical), con un desvío propio
 // para que no parezcan cartones alineados.
 const toCamera = cameraPosition.xz.sub(root);
 const angle = atan(toCamera.y, toCamera.x).add(Math.PI / 2).add(fract(own.mul(13.7)).sub(0.5).mul(1.5));
 const across = vec2(cos(angle), sin(angle));
 // Perfil: ancha en la base, afinada hacia la punta.
 const profile = along.oneMinus().pow(0.62);

 // Curvatura propia: la mata se abre en abanico, cada brizna cae hacia fuera
 // de su centro (las del borde, más), con un giro propio.
 const outward = tuftA.zw.div(tuftA.zw.length().max(0.0001));
 const twist = fract(own.mul(9.1)).sub(0.5).mul(1.3);
 const fan = vec2(outward.x.mul(cos(twist)).sub(outward.y.mul(sin(twist))), outward.x.mul(sin(twist)).add(outward.y.mul(cos(twist))));
 const lean = fan.mul(mix(0.1, 0.5, radial).add(fract(own.mul(3.1)).mul(0.16)));
 // Viento y rastro: la base no se mueve; la punta, la que más (crece con el cuadrado).
 const wind = windOffset(root).mul(WIND.flex.grass);
 const push = trailPush(root);
 const curve = along.mul(along);
 const free = lean.add(wind.mul(1.7)).add(push.xy.mul(2.1)).mul(curve).mul(height);
 // Por fuerte que sople (el empuje del cohete), la brizna se tumba pero no se
 // estira ni se aplasta del todo: no avanza más que su propia altura.
 const limit = along.mul(height).mul(0.85);
 const bend = free.mul(limit.div(free.length().max(limit).max(0.0001)));
 // Al tumbarse no se estira: lo que avanza en horizontal lo pierde en altura.
 const tall = along.mul(height).mul(push.z.mul(0.78).oneMinus());
 const drop = bend.length().mul(0.42).mul(along);

 const material = new MeshLambertNodeMaterial({ side: THREE.DoubleSide });
 material.positionNode = vec3(root.x.add(across.x.mul(width).mul(side).mul(profile)).add(bend.x), terrain.a.add(tall).sub(drop).sub(0.02), root.y.add(across.y.mul(width).mul(side).mul(profile)).add(bend.y));

 // Color: nace del color del suelo (así césped y terreno son una misma masa),
 // oscuro en la base y claro en la punta. Cada mata es de uno de tres verdes
 // (hondo, fresco o lima); cuál abunda depende de la zona: lima al sol, hondo
 // a la sombra de los árboles.
 const soil = texture(color, terrainUv).rgb;
 const sunny = texture(noiseTexture, root.mul(0.013)).g;
 const pick = fract(clump.mul(7.31)).add(sunny.sub(0.5).mul(0.7)).sub(terrain.g.mul(0.25));
 const green = mix(mix(vec3(0.68, 0.94, 0.82), vec3(1.0, 1.2, 0.78), smoothstep(0.28, 0.36, pick)), vec3(1.36, 1.32, 0.56), smoothstep(0.7, 0.78, pick));
 const shaded = mix(vec3(1), vec3(0.8, 0.94, 1.08), terrain.g.mul(0.8));
 // El corazón de la mata, más oscuro: da volumen sin sombras.
 const base = soil.mul(vec3(0.36, 0.5, 0.44)).mul(mix(0.8, 1, radial));
 material.colorNode = mix(base, soil.mul(green), along.pow(1.15)).mul(shaded);
 // Normal hacia arriba: toda la pradera recibe la misma luz que el suelo.
 material.normalNode = transformNormalToView(vec3(0, 1, 0));
 // Se pinta lo último de lo opaco: lo que tape una copa o una casa, que no se pinte.
 return drawAfterSeeThrough(material);
}

export function Grass({ quality = "high" }) {
 const centre = useMemo(() => uniform(new THREE.Vector2()), []);
 const size = useMemo(() => uniform(PATCH), []);
 const rise = useMemo(() => uniform(1), []);
 const geometry = useMemo(() => createGeometry(DETAIL[quality] ?? DETAIL.high), [quality]);
 const material = useMemo(() => createMaterial(centre, size, rise), [centre, size, rise]);
 const mesh = useRef(null);
 if (import.meta.env.DEV) window.__world.grassAt = sampleTerrain; // para las pruebas automáticas
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
  centre.value.set(focus.x, focus.z - 4);
  // Al alejarse la cámara (despegue, vista aérea) las briznas se recogen poco
  // a poco, antes de que se vea el borde del parche; desde el espacio no se
  // distinguen y la malla se deja de dibujar.
  const away = Math.max(0, Math.min(1, (rig.distance - 1.5) / 1.4));
  rise.value = 1 - away * away * (3 - 2 * away);
  mesh.current.visible = rise.value > 0.01 && Math.max(rig.space, rig.intro) < 0.6;
 });

 return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} receiveShadow />;
}
