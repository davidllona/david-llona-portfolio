import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { attribute, diffuseColor, positionLocal, smoothstep, vec3 } from "three/tsl";
import { uCurve } from "../../experience/environment/bend";
import { lambert } from "../../experience/materials";
import { rig } from "../../experience/state";
import { FAR_FALLS, farMesh, farPatch, farScatter, stretch } from "./farland";
import { createFarBroad, createFarHouse, createFarLantern, createFarSpiral, createFarWillow } from "./farModels";
import { GRASS, ROCK } from "./ground";
import { WATER_LEVEL, createRandom } from "./layout";
import { moonlit, pool } from "./materials";
import { createSeaRock } from "./models";
import { createFallMaterial, createFalls } from "./falls";

// La tierra lejana (objetivo 24; datos en farland.js): el resto del planeta,
// más allá del foso que rodea la isla. Solo decoración, para la órbita, la
// subida y la bajada. Andando por la isla se dibuja lo justo —la franja que
// puede asomar por el horizonte— y el resto ni se manda a la GPU: cada malla
// lleva primero las copias cercanas y, en tierra, solo se dibujan esas. Y ni
// eso si la cámara no alcanza a verla (casi siempre: mira al suelo de la isla):
// la franja se reparte en celdas y, si ninguna entra en cuadro, no se dibuja nada.
const COARSE = { coarse: true }; // (ya viene en triángulos cortos: no hay que partirla para curvarla)
const DEEP = new THREE.Color("#10122a"), SHORE = new THREE.Color("#0f5a62");

// La malla del suelo, con un color por cara: césped en lo llano, pizarra en los
// cortados y una línea turquesa que brilla donde la tierra toca el agua.
function createLand(triangles) {
 const geometry = new THREE.BufferGeometry();
 const position = new THREE.Float32BufferAttribute(triangles, 3);
 geometry.setAttribute("position", position);
 const random = createRandom(20261211);
 const colors = new Float32Array(position.count * 3);
 const color = new THREE.Color(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3();
 for (let i = 0; i < position.count; i += 3) {
  a.fromBufferAttribute(position, i), b.fromBufferAttribute(position, i + 1), c.fromBufferAttribute(position, i + 2);
  normal.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
  if (normal.y < 0) {
   // (Cara arriba.)
   position.setXYZ(i + 1, c.x, c.y, c.z);
   position.setXYZ(i + 2, b.x, b.y, b.z);
   normal.negate();
  }
  const x = (a.x + b.x + c.x) / 3, y = (a.y + b.y + c.y) / 3, z = (a.z + b.z + c.z) / 3;
  const shore = y > WATER_LEVEL - 1.3 && y < WATER_LEVEL + 0.8;
  if (shore) color.copy(SHORE);
  else if (y < WATER_LEVEL) color.copy(DEEP);
  else if (normal.y < 0.8) color.copy(ROCK[Math.max(0, Math.min(4, Math.floor(farPatch(x * 3.1, z * 3.1) * 5 + random() * 1.6 - 0.5)))]);
  else {
   const patch = farPatch(x, z);
   color.copy(GRASS[patch > 0.58 ? 1 : patch < 0.42 ? 2 : 0]);
   if (random() > 0.9) color.copy(GRASS[3]);
   // (Las terrazas altas, algo más claras: desde la órbita se leen los escalones.)
   color.multiplyScalar(1 + Math.max(0, y) * 0.035);
  }
  color.multiplyScalar(0.92 + random() * 0.16);
  for (let k = 0; k < 3; k++) color.toArray(colors, (i + k) * 3);
 }
 geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}
function createLandMaterial() {
 const material = lambert();
 // Un tono medio frío (la luna queda al fondo) y la orilla, que brilla como la espuma de la isla.
 // (La línea de la orilla se calcula en cada píxel con la altura: sigue el agua, no el corte de las caras.)
 const y = positionLocal.y, foam = smoothstep(WATER_LEVEL + 0.75, WATER_LEVEL + 0.2, y).mul(smoothstep(WATER_LEVEL - 0.5, WATER_LEVEL - 0.05, y));
 material.emissiveNode = attribute("color", "vec3").mul(vec3(0.7, 0.8, 1.0)).mul(0.15).add(vec3(0.2, 0.95, 0.9).mul(foam).mul(0.8));
 return material;
}
// Paredes y postes iluminados por la luna; ventanas y faroles, que emiten.
function createLitMaterial() {
 const material = lambert();
 material.emissiveNode = diffuseColor.rgb.mul(vec3(0.72, 0.82, 1.0)).mul(0.16).add(attribute("color", "vec3").mul(attribute("lit", "float")).mul(1.9));
 return material;
}

// Cajas que envuelven, por celdas de 8 m, la franja cercana (su suelo y lo que lleva encima).
// (Pequeñas: una caja grande «toca» el encuadre aunque nada suyo se vea. Lo que queda bajo el agua no cuenta.)
const CELL = 8;
function createSectors(land, layers) {
 const boxes = new Map();
 const point = new THREE.Vector3();
 const add = (x, y, z) => {
  const key = `${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`;
  if (!boxes.has(key)) boxes.set(key, new THREE.Box3());
  boxes.get(key).expandByPoint(point.set(x, y, z));
 };
 const points = land.attributes.position;
 for (let i = 0; i < points.count; i++) add(points.getX(i), Math.max(points.getY(i), WATER_LEVEL), points.getZ(i));
 // (Lo plantado: hasta su copa o su punta.)
 for (const layer of layers) for (const one of layer.items.slice(0, layer.near)) add(one.x, one.y + (one.top ?? 7), one.z);
 return [...boxes.values()];
}

const helper = { frustum: new THREE.Frustum(), view: new THREE.Matrix4(), matrix: new THREE.Matrix4(), turn: new THREE.Matrix4(), wide: new THREE.Matrix4(), size: new THREE.Vector3(), color: new THREE.Color() };
// Coloca las copias de una capa para la curvatura dada: cada una se ensancha de
// través lo que el mundo, al cerrarse, la va a encoger ahí (en tierra, nada).
function place(mesh, layer, curve) {
 layer.items.forEach((one, i) => {
  const across = Math.atan2(-one.x / one.d, -one.z / one.d), scale = layer.scale(one);
  helper.matrix.makeTranslation(one.x, one.y + (layer.lift ?? 0), one.z);
  helper.matrix.multiply(helper.turn.makeRotationY(across)).multiply(helper.wide.makeScale(stretch(one.d, curve), 1, 1)).multiply(helper.turn.makeRotationY(one.turn - across));
  helper.matrix.scale(Array.isArray(scale) ? helper.size.set(...scale) : helper.size.setScalar(scale));
  mesh.setMatrixAt(i, helper.matrix);
 });
 mesh.instanceMatrix.needsUpdate = true;
}

export function FarScene() {
 const land = useMemo(() => {
  const { near, far } = farMesh();
  return { near: createLand(near), far: createLand(far) };
 }, []);
 const falls = useMemo(() => createFalls(FAR_FALLS, 20261212), []);
 const glowPool = useMemo(() => pool("#ffa24a", 0.42), []);
 const material = useMemo(
  () => ({
   land: createLandMaterial(),
   lit: createLitMaterial(),
   crown: moonlit(lambert({ side: THREE.DoubleSide }), 0.3, 0.16),
   stone: moonlit(lambert(), 0.12, 0.08),
   fall: createFallMaterial(),
  }),
  [],
 );
 const layers = useMemo(() => {
  const spots = farScatter();
  const tree = (one) => one.scale;
  return [
   { name: "sauce lejano", geometry: createFarWillow(), material: material.crown, ...spots.willow, scale: tree, colored: true },
   { name: "copa ancha lejana", geometry: createFarBroad(), material: material.crown, ...spots.broad, scale: tree, colored: true },
   { name: "árbol en espiral lejano", geometry: createFarSpiral(), material: material.crown, ...spots.spiral, scale: tree, colored: true },
   { name: "casita lejana", geometry: createFarHouse(), material: material.lit, ...spots.houses, scale: tree },
   { name: "farolillo lejano", geometry: createFarLantern(), material: material.lit, ...spots.lanterns, scale: tree },
   // (Los picos nacen algo enterrados: lo que asoma es su altura.)
   { name: "pico de pizarra", geometry: createSeaRock(), material: material.stone, ...spots.peaks, scale: (one) => [one.r * 1.4, one.top + 1.2, one.r * 1.4], lift: -1.2 },
   { name: "charco de luz lejano", geometry: new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2), material: glowPool.material, ...spots.pools, scale: (one) => [one.scale, 1, one.scale], lift: 0.3, order: 3 },
  ];
 }, [material, glowPool]);
 const meshes = useRef([]);
 const far = useRef(null);
 const sectors = useMemo(() => createSectors(land.near, layers), [land, layers]);
 const near = useRef(null);
 const drops = useRef(null);
 const state = useRef({ curve: -1, shown: null });
 useEffect(() => {
  layers.forEach((layer, i) => {
   if (!layer.colored) return;
   layer.items.forEach((one, k) => meshes.current[i].setColorAt(k, helper.color.set(one.tint)));
   meshes.current[i].instanceColor.needsUpdate = true;
  });
  if (import.meta.env.DEV) window.__world.farland = { layers, meshes: meshes.current, far: far.current, near: near.current, sectors, state: state.current }; // para las pruebas automáticas
  return () => {
   land.near.dispose();
   land.far.dispose();
   falls.dispose();
   glowPool.dispose();
   layers.forEach((layer) => layer.geometry.dispose());
   Object.values(material).forEach((one) => one.dispose());
  };
 }, [land, falls, glowPool, layers, material, sectors]);

 // (Después de que Lights.jsx ponga la curvatura del fotograma.)
 useFrame(({ camera }) => {
  const flying = rig.space > 0.004 || rig.bend > 0, curve = uCurve.value;
  // 2 = entera (en vuelo); 1 = la franja cercana (a pie, si algún sector entra en cuadro); 0 = nada.
  let shown = 2;
  if (!flying) {
   helper.frustum.setFromProjectionMatrix(helper.view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
   shown = sectors.some((box) => helper.frustum.intersectsBox(box)) ? 1 : 0;
  }
  if (curve !== state.current.curve) {
   state.current.curve = curve;
   layers.forEach((layer, i) => place(meshes.current[i], layer, curve));
  }
  if (shown !== state.current.shown) {
   state.current.shown = shown;
   near.current.visible = shown > 0;
   far.current.visible = drops.current.visible = shown === 2;
   layers.forEach((layer, i) => {
    const count = shown === 2 ? layer.items.length : shown ? layer.near : 0;
    meshes.current[i].count = Math.max(count, 1);
    meshes.current[i].visible = count > 0;
   });
  }
 });

 return (
  <>
   <mesh ref={near} name="tierra lejana" geometry={land.near} material={material.land} frustumCulled={false} userData={COARSE} />
   <mesh ref={far} name="tierra lejana, el resto" geometry={land.far} material={material.land} frustumCulled={false} userData={COARSE} visible={false} />
   <mesh ref={drops} name="cascadas lejanas" geometry={falls} material={material.fall} frustumCulled={false} renderOrder={2} />
   {layers.map((layer, i) => (
    <instancedMesh key={layer.name} ref={(mesh) => (meshes.current[i] = mesh)} name={layer.name} args={[layer.geometry, layer.material, layer.items.length]} frustumCulled={false} renderOrder={layer.order ?? 0} />
   ))}
  </>
 );
}
