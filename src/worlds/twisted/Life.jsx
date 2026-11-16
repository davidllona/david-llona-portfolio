import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { abs, attribute, cameraPosition, cos, float, fract, positionGeometry, sin, smoothstep, uniform, uv, vec3 } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { bendWorld } from "../../experience/environment/bend";
import { createGlowTexture } from "../../experience/textures";
import { uniforms } from "../../experience/theme";
import { clockwork } from "./clockwork";
import { BELL, FIREFLIES, height } from "./layout";

// La vida de The Twisted Moon: luciérnagas amarillas por toda la isla y
// murciélagos que dan vueltas, lejos, alrededor de la torre. Todo lo mueve el
// sombreador: no hay nada que actualizar en cada fotograma salvo los ejes de
// la cámara (las luciérnagas son manchas de cara a ella).

// Manchas de cara a la cámara, una por copia, en una sola llamada de dibujo.
function billboards(count, attributes) {
 const plane = new THREE.PlaneGeometry(1, 1);
 const geometry = new THREE.InstancedBufferGeometry();
 geometry.setAttribute("position", plane.attributes.position);
 geometry.setAttribute("uv", plane.attributes.uv);
 geometry.setIndex(plane.index);
 for (const [name, size, values] of attributes) geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(values), size));
 geometry.instanceCount = count;
 geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
 return geometry;
}

function useCameraBasis() {
 const basis = useMemo(() => ({ right: uniform(new THREE.Vector3(1, 0, 0)), up: uniform(new THREE.Vector3(0, 1, 0)) }), []);
 useFrame(({ camera }) => {
  basis.right.value.setFromMatrixColumn(camera.matrixWorld, 0);
  basis.up.value.setFromMatrixColumn(camera.matrixWorld, 1);
 });
 return basis;
}

// ── Luciérnagas ─────────────────────────────────────────────────────────────
// Cada una ronda su sitio dibujando lazos lentos, sube y baja, y se enciende y
// se apaga a su ritmo. Amarillas, por encima del umbral del resplandor.
const NEAR = 3; // m: más cerca de la cámara que esto, no se ven
export function Fireflies() {
 const glow = useMemo(() => createGlowTexture(), []);
 const basis = useCameraBasis();
 const geometry = useMemo(
  () =>
   billboards(FIREFLIES.length, [
    ["origin", 3, FIREFLIES.flatMap((one) => [one.x, height(one.x, one.z) + one.lift, one.z])],
    ["phase", 1, FIREFLIES.map((one) => one.phase)],
   ]),
  [],
 );
 const material = useMemo(() => {
  const one = new MeshBasicNodeMaterial({ map: glow, color: new THREE.Color(2.0, 1.6, 0.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  one.userData.flat = true;
  const t = uniforms.uTime.mul(0.35).add(attribute("phase", "float"));
  const wander = vec3(sin(t.mul(1.3)).mul(0.9).add(sin(t.mul(0.47)).mul(0.6)), sin(t.mul(0.9)).mul(0.35), cos(t.mul(1.1)).mul(0.8).add(cos(t.mul(0.33)).mul(0.6)));
  // Parpadeo: la mayor parte del tiempo, encendida; cada pocos segundos se apaga un momento.
  const blink = fract(t.mul(0.21));
  const on = float(1).sub(blink.sub(0.82).max(0).mul(9).min(1)).mul(0.6).add(sin(t.mul(7)).mul(0.1)).add(0.3);
  // Pequeñas y casi sin halo: un punto de luz, no una bola. Y cerca de la
  // cámara (a menos de 3 m) se apagan: no hay «polvo en la lente».
  const size = float(0.17);
  const centre = bendWorld(attribute("origin", "vec3").add(wander));
  one.positionNode = centre.add(basis.right.mul(positionGeometry.x.mul(size))).add(basis.up.mul(positionGeometry.y.mul(size)));
  const core = smoothstep(0.46, 0.1, uv().sub(0.5).length());
  one.opacityNode = on.mul(core).mul(smoothstep(NEAR, NEAR + 2, centre.distance(cameraPosition)));
  return one;
 }, [glow, basis]);
 useEffect(
  () => () => {
   glow.dispose();
   geometry.dispose();
   material.dispose();
  },
  [glow, geometry, material],
 );
 return <mesh name="luciérnagas" geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}

// ── Murciélagos ─────────────────────────────────────────────────────────────
// Siluetas oscuras y pequeñas que dan vueltas alrededor de lo alto de la torre,
// cada una a su radio, altura y velocidad, aleteando.
const BATS = 9;
function createBat() {
 // Cuerpo y dos alas, mirando hacia +X (la dirección en que vuela).
 const positions = [
  // Cuerpo
  0.14, 0, 0, -0.12, 0.03, 0, -0.12, -0.03, 0,
  // Ala izquierda (+Z) y derecha (−Z), festoneadas
  0.06, 0, 0, -0.06, 0, 0, 0.02, 0.02, 0.36,
  -0.06, 0, 0, -0.1, 0.02, 0.3, 0.02, 0.02, 0.36,
  0.06, 0, 0, 0.02, 0.02, -0.36, -0.06, 0, 0,
  -0.06, 0, 0, 0.02, 0.02, -0.36, -0.1, 0.02, -0.3,
 ];
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
 return geometry;
}
export function Bats() {
 const geometry = useMemo(() => {
  const bat = createBat();
  const instanced = new THREE.InstancedBufferGeometry();
  instanced.setAttribute("position", bat.attributes.position);
  const ring = [], lift = [], speed = [], phase = [];
  for (let i = 0; i < BATS; i++) {
   ring.push(6 + (i % 4) * 2.6);
   lift.push(2 + ((i * 7) % 9));
   speed.push((0.32 + (i % 3) * 0.08) * (i % 2 ? 1 : -1));
   phase.push(i * 1.7);
  }
  for (const [name, values] of [["ring", ring], ["lift", lift], ["speed", speed], ["phase", phase]]) instanced.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(values), 1));
  instanced.instanceCount = BATS;
  instanced.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  bat.dispose();
  return instanced;
 }, []);
 const material = useMemo(() => {
  const one = new MeshBasicNodeMaterial({ color: "#150f22", side: THREE.DoubleSide });
  one.userData.flat = true;
  const angle = attribute("phase", "float").add(uniforms.uTime.mul(attribute("speed", "float")));
  // (Al arrancar el reloj se espantan: el corro se abre y sube, y luego vuelven.)
  const r = attribute("ring", "float").mul(clockwork.scatter.mul(1.9).add(1));
  // Aleteo: la punta del ala sube y baja.
  const p = positionGeometry;
  const flap = sin(uniforms.uTime.mul(13).add(attribute("phase", "float").mul(3))).mul(abs(p.z)).mul(0.9);
  const local = vec3(p.x, p.y.add(flap), p.z).mul(2.2);
  // Mira hacia donde vuela (la tangente del círculo).
  const sign = attribute("speed", "float").sign();
  const yaw = angle.add(sign.mul(Math.PI / 2));
  const turned = vec3(local.x.mul(cos(yaw)).add(local.z.mul(sin(yaw))), local.y, local.z.mul(cos(yaw)).sub(local.x.mul(sin(yaw))));
  const centre = vec3(BELL.x, BELL.y, BELL.z).add(vec3(cos(angle).mul(r), attribute("lift", "float").add(sin(angle.mul(2)).mul(0.9)).add(clockwork.scatter.mul(5)), sin(angle).mul(r).negate()));
  one.positionNode = bendWorld(centre.add(turned));
  return one;
 }, []);
 useEffect(
  () => () => {
   geometry.dispose();
   material.dispose();
  },
  [geometry, material],
 );
 return <mesh name="murciélagos" geometry={geometry} material={material} frustumCulled={false} />;
}
