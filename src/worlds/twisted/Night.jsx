import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { cameraPosition, color, densityFogFactor, float, mix, output, positionLocal, positionWorld, reference, renderGroup, smoothstep, texture, uniform, vec2, vec3, vec4 } from "three/tsl";
import { noiseTexture } from "../../experience/environment/noise";
import { unlit } from "../../experience/materials";
import { rig } from "../../experience/state";
import { uniforms } from "../../experience/theme";

// La noche de The Twisted Moon: la luna, enorme y baja, y la niebla a ras de suelo.

// ── Niebla ──────────────────────────────────────────────────────────────────
// La niebla general de la escena (la de la distancia) se queda como está, y se
// le suma otra que solo existe pegada al suelo: lo que queda por debajo de su
// techo se va perdiendo en ella con la distancia, y el techo sube y baja a
// bancos que derivan despacio. Se hace en el nodo de niebla de la escena, así
// que la reciben todos los materiales —suelo, casas, árboles, personajes— sin
// tocarlos ni dibujar nada más. Desde la órbita desaparece. Tiene su propio
// color, más pálido que la niebla del fondo: es la luna, que la alumbra.
const MIST_TOP = 0.9; // m: techo medio de la niebla baja (sobre la terraza de abajo; el mar queda dentro)
const MIST_TINT = "#56608f";
function createFog(scene) {
 const tint = reference("color", "color", scene.fog).setGroup(renderGroup);
 const density = reference("density", "float", scene.fog).setGroup(renderGroup);
 const { uTime, uSpace } = uniforms;
 const drift = vec2(uTime.mul(0.006), uTime.mul(0.0035));
 const banks = texture(noiseTexture, positionWorld.xz.mul(0.021).add(drift)).r.add(texture(noiseTexture, positionWorld.xz.mul(0.052).sub(drift.mul(1.6))).g.mul(0.5));
 const top = float(MIST_TOP).add(banks.sub(0.75).mul(2.6));
 // Cuánta niebla se atraviesa hasta llegar a cada punto: el espesor de la
 // capa sobre él, estirado según lo rasante que se mire. Desde arriba (la
 // cámara de juego) es un velo; a ras de suelo, a lo lejos, se lo traga todo.
 const depth = top.sub(positionWorld.y).max(0);
 const through = depth.mul(positionWorld.distance(cameraPosition)).div(cameraPosition.y.sub(positionWorld.y).max(0.7));
 const low = through.mul(-0.05).exp().oneMinus().mul(0.62).mul(uSpace.oneMinus());
 // Primero la niebla baja, pálida; encima, la del fondo, que se lo lleva todo a lo lejos.
 return vec4(mix(mix(output.rgb, color(MIST_TINT), low), tint, densityFogFactor(density)), output.a);
}

// ── Luna ────────────────────────────────────────────────────────────────────
// Creciente de cuento, enorme, blanco hueso con un punto de azul. No es una
// esfera con su terminador (objetivo 28: facetada, el borde salía dentado y la
// parte en sombra se adivinaba): es un plano que mira a la cámara y el
// creciente lo dibuja el sombreador con dos círculos —el disco, y otro algo
// menor y desplazado que lo muerde—, de borde limpio. Dentro, cráteres suaves
// y manchas; fuera, nada: lo que no es creciente es cielo. Alrededor, un halo
// ancho que abraza el creciente (no un disco). Está al norte, hacia donde mira
// la cámara, a la derecha de la torre del reloj y por encima de la isla: se ve
// desde los miradores (donde la cámara se inclina hacia el horizonte) y al
// bajar con la nave. Sigue a la cámara (nunca se llega a ella) y no se curva
// con el mundo.
const MOON_FAR = 2600; // m
const MOON_RADIUS = 262; // unos 5,8° de radio en el cielo: más de un cuarto del alto de la pantalla
const MOON_AT = new THREE.Vector3(0.2, 0.235, -0.95).normalize(); // 12° al este del norte, 13,5° sobre el horizonte
// Hacia dónde mira la panza del creciente, en pantalla: a la derecha y algo abajo (se abre hacia la torre).
const MOON_LIT = new THREE.Vector2(0.93, -0.185).normalize();
// El círculo que muerde el disco: su radio y cuánto se aparta del centro (en radios de luna).
// El creciente mide, en lo más ancho, 1 + BITE.away − BITE.radius = 0,44 radios.
const BITE = { radius: 0.92, away: 0.36 };
// Los cuernos: donde se cortan los dos círculos. `along`: su coordenada hacia la panza; `side`: a cada lado.
const HORN = (() => {
 const along = (BITE.radius ** 2 - 1 - BITE.away ** 2) / (2 * BITE.away), side = Math.sqrt(1 - along * along);
 return { along, side, tips: [1, -1].map((s) => [MOON_LIT.x * along - MOON_LIT.y * side * s, MOON_LIT.y * along + MOON_LIT.x * side * s]) };
})();
const HALO_REACH = 3.6; // radios de luna que cubre el plano del halo
// Cráteres: [a lo largo del creciente (rad, 0 = la panza), a qué distancia del centro, radio].
const CRATERS = [[-0.1, 0.78, 0.085], [0.42, 0.86, 0.05], [-0.55, 0.8, 0.065], [0.9, 0.9, 0.04], [-1.0, 0.9, 0.035], [0.14, 0.62, 0.04], [-0.3, 0.93, 0.03], [0.62, 0.72, 0.03]].map(([turn, away, r]) => {
 const angle = Math.atan2(MOON_LIT.y, MOON_LIT.x) + turn;
 return [Math.cos(angle) * away, Math.sin(angle) * away, r];
});
// Cuánto creciente hay en `p` (en radios de luna): 1 dentro, 0 fuera, con el borde suave.
function crescent(p) {
 const bite = p.sub(vec2(-MOON_LIT.x * BITE.away, -MOON_LIT.y * BITE.away)).length();
 return { disc: smoothstep(1.0, 0.985, p.length()), open: smoothstep(BITE.radius - 0.012, BITE.radius + 0.012, bite), bite };
}
export function Night() {
 const scene = useThree((state) => state.scene);
 const group = useRef(null);
 const halo = useRef(null);
 // Un plano para el creciente (2 × 2: a escala del radio, la luna mide 1) y otro, mayor, para el halo.
 const plane = useMemo(() => new THREE.PlaneGeometry(2.1, 2.1), []);
 const shown = useMemo(() => uniform(1), []);
 const material = useMemo(() => {
  const one = unlit({ transparent: true, fog: false, toneMapped: false, depthWrite: false });
  one.userData.flat = true;
  const p = positionLocal.xy;
  const { disc, open, bite } = crescent(p);
  // Manchas suaves, de onda larga, y cráteres: fondo algo más oscuro y un canto algo más claro.
  let shade = texture(noiseTexture, p.mul(0.33).add(vec2(0.31, 0.62))).r.sub(0.5).mul(0.3).add(texture(noiseTexture, p.mul(0.9).add(vec2(0.7, 0.15))).g.sub(0.5).mul(0.08)).add(1);
  for (const [x, y, r] of CRATERS) {
   const d = p.sub(vec2(x, y)).length().div(r);
   shade = shade.sub(smoothstep(1.0, 0.7, d).mul(0.13)).add(smoothstep(0.26, 0.0, d.sub(1.02).abs()).mul(0.05));
  }
  // Algo de bulto: más clara hacia el canto de fuera que hacia el mordisco.
  const round = mix(float(0.9), float(1.03), smoothstep(0.0, 0.42, bite.sub(BITE.radius)));
  // (Blanco hueso con un punto de azul, por encima del umbral del resplandor: lleva su brillo.)
  one.colorNode = vec3(0.95, 0.96, 1.0).mul(1.1).mul(shade).mul(round);
  one.opacityNode = disc.mul(open).mul(shown);
  return one;
 }, [shown]);
 // El halo: suma luz alrededor del creciente —pegado a él, fuerte; lejos, un velo ancho— y no dibuja disco alguno.
 const haloMaterial = useMemo(() => {
  const one = unlit({ transparent: true, fog: false, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
  one.userData.flat = true;
  const p = positionLocal.xy.mul(HALO_REACH / 1.05);
  const { bite } = crescent(p);
  // Distancia (en radios) al creciente: a su arco de fuera, al de dentro o, pasado el final de un arco, al cuerno más cercano.
  // (Con «el mayor de las dos distancias» salía un anillo de luz por el lado en sombra: el disco fantasma.)
  const lit = vec2(MOON_LIT.x, MOON_LIT.y), centre0 = vec2(-MOON_LIT.x * BITE.away, -MOON_LIT.y * BITE.away);
  const tip = p.sub(vec2(...HORN.tips[0])).length().min(p.sub(vec2(...HORN.tips[1])).length());
  const outer = p.normalize().dot(lit).greaterThan(HORN.along).select(p.length().sub(1).abs(), tip);
  const inner = p.sub(centre0).normalize().dot(lit).greaterThan((HORN.along + BITE.away) / BITE.radius).select(bite.sub(BITE.radius).abs(), tip);
  const away = outer.min(inner);
  const centre = p.sub(vec2(MOON_LIT.x * 0.55, MOON_LIT.y * 0.55)).length();
  const near = away.mul(-7).exp().mul(0.34), wide = centre.mul(centre).mul(-0.34).exp().mul(0.25);
  one.colorNode = vec3(0.56, 0.66, 1.0).mul(near.add(wide)).mul(smoothstep(HALO_REACH, HALO_REACH * 0.55, p.length())).mul(shown);
  return one;
 }, [shown]);
 useEffect(() => {
  // La niebla baja entra con este mundo y se va con él.
  scene.fogNode = createFog(scene);
  return () => {
   scene.fogNode = null;
   plane.dispose();
   material.dispose();
   haloMaterial.dispose();
  };
 }, [scene, plane, material, haloMaterial]);
 useFrame(({ camera }) => {
  group.current.position.copy(camera.position).addScaledVector(MOON_AT, MOON_FAR);
  group.current.quaternion.copy(camera.quaternion);
  halo.current.quaternion.copy(camera.quaternion);
  halo.current.position.copy(group.current.position);
  // En órbita se ve el cielo de la órbita, con su luna: esta se retira.
  // (Aparece a media bajada: desde ahí la cámara mira hacia el horizonte y la luna entra en cuadro; ver Player.jsx.)
  const seen = Math.min(1, Math.max(0, (0.85 - rig.space) / 0.3));
  shown.value = seen;
  group.current.visible = halo.current.visible = seen > 0.01;
  if (import.meta.env.DEV) window.__world.bigMoon = group.current; // para las pruebas automáticas
 });
 return (
  <>
   <mesh ref={halo} name="halo de la luna" geometry={plane} material={haloMaterial} scale={(MOON_RADIUS * HALO_REACH) / 1.05} renderOrder={-9} frustumCulled={false} />
   <mesh ref={group} name="luna" geometry={plane} material={material} scale={MOON_RADIUS} renderOrder={-8} frustumCulled={false} />
  </>
 );
}
