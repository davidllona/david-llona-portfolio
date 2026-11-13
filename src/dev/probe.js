// Sonda de desarrollo (no entra en producción): rayos contra la escena real,
// para que las pruebas comparen lo que se ve con lo que choca.
import * as THREE from "three";
import { distanceTo } from "../worlds/collision";

const w = window.__world;
const ray = new THREE.Raycaster();
const from = new THREE.Vector3(), dir = new THREE.Vector3();

// Nombre legible de una malla: su nombre o los de sus antepasados.
const label = (object) => {
 const names = [];
 for (let o = object; o && names.length < 4; o = o.parent) if (o.name) names.unshift(o.name);
 return names.join("/") || `(${object.type})`;
};

const down = new THREE.Vector3(0, -1, 0);
const COLUMN = [[0, 0], [0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]];

w.probe = {
 // Huella de unas mallas a la altura del cuerpo: filas de texto, una por cada
 // `cell` metros de norte a sur; «#» donde hay algo entre `low` y `high`.
 footprint(ids, { cell = 0.3, low = 0.3, high = 1.5, margin = 0.6, bounds } = {}) {
  const world = w.world();
  const set = new Set(ids), targets = [];
  const box = new THREE.Box3();
  w.scene.traverse((o) => { if (o.isMesh && set.has(o.id)) { targets.push(o); if (!bounds) box.expandByObject(o); } });
  if (bounds) box.set(new THREE.Vector3(bounds[0] + margin, 0, bounds[1] + margin), new THREE.Vector3(bounds[2] - margin, 0, bounds[3] - margin));
  const x0 = Math.round((box.min.x - margin) / cell) * cell, z0 = Math.round((box.min.z - margin) / cell) * cell;
  const rows = [];
  for (let z = z0; z < box.max.z + margin - 1e-6; z += cell) {
   let row = "";
   for (let x = x0; x < box.max.x + margin - 1e-6; x += cell) {
    from.set(x, world.height(x, z) + high, z);
    ray.set(from, down);
    ray.far = high - low;
    row += ray.intersectObjects(targets, false).length ? "#" : ".";
   }
   rows.push(row);
  }
  return { x0, z0, cell, rows };
 },
 // Recorre el mapa en una rejilla de `step` metros. Celdas a las que se puede
 // llegar andando desde `start` (mismas reglas que el jugador: terreno vedado
 // y colisionadores, con su radio) y, en ellas, si la columna que ocupa el
 // cuerpo (de `low` a `high` sobre el suelo, cinco rayos) toca alguna malla de
 // `ids`. Devuelve las celdas atravesadas: [{ x, z, label, id, instance }].
 sweep({ step = 0.3, ids, radius = 0.42, low = 0.3, high = 1.5, start, extent = 50, agent }) {
  const world = w.world();
  const set = new Set(ids), targets = [];
  w.scene.traverse((o) => { if (o.isMesh && set.has(o.id)) targets.push(o); });
  const n = Math.round((extent * 2) / step) + 1;
  const at = (i) => -extent + i * step;
  const free = (x, z) => {
   for (const c of world.colliders) {
    if (c.active === false) continue;
    if (distanceTo(c, x, z) < c.r + radius - 0.02) return false;
   }
   return true;
  };
  const reached = new Uint8Array(n * n);
  const si = Math.round((start[0] + extent) / step), sj = Math.round((start[1] + extent) / step);
  const queue = [si + sj * n];
  reached[queue[0]] = 1;
  while (queue.length) {
   const cell = queue.pop(), i = cell % n, j = (cell - i) / n;
   const fromY = world.height(at(i), at(j));
   for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const a = i + di, b = j + dj;
    if (a < 0 || b < 0 || a >= n || b >= n || reached[a + b * n]) continue;
    const x = at(a), z = at(b);
    if (world.blocked(x, z, fromY, agent) || !free(x, z)) continue;
    reached[a + b * n] = 1;
    queue.push(a + b * n);
   }
  }
  const hits = [];
  let cells = 0;
  for (let j = 0; j < n; j++) {
   for (let i = 0; i < n; i++) {
    if (!reached[i + j * n]) continue;
    cells += 1;
    const x = at(i), z = at(j), y = world.height(x, z);
    // En un cortado no se está: se cae por él. (Ahí la columna puede rozar la
    // copa de un árbol que crece al pie.)
    if (Math.hypot(world.height(x + 0.25, z) - world.height(x - 0.25, z), world.height(x, z + 0.25) - world.height(x, z - 0.25)) / 0.5 > 1.25) continue;
    for (const [dx, dz] of COLUMN) {
     from.set(x + dx, y + high, z + dz);
     ray.set(from, down);
     ray.far = high - low;
     const hit = ray.intersectObjects(targets, false)[0];
     if (hit) { hits.push({ x: +x.toFixed(2), z: +z.toFixed(2), label: label(hit.object), id: hit.object.id, instance: hit.instanceId ?? -1 }); break; }
    }
   }
  }
  return { cells, hits };
 },

 // Todas las mallas visibles de la escena, con lo que hace falta para clasificarlas.
 meshes() {
  const list = [];
  w.scene.traverseVisible((o) => {
   if (!o.isMesh) return;
   if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
   const box = new THREE.Box3().copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
   list.push({ label: label(o), id: o.id, instances: o.isInstancedMesh ? o.count : 0, vertices: o.geometry.attributes.position?.count ?? 0, skinned: !!o.isSkinnedMesh, box: [...box.min.toArray(), ...box.max.toArray()].map((v) => +v.toFixed(1)), material: o.material?.name || o.material?.type });
  });
  return list;
 },
 // Rayo de `a` a `b` contra las mallas cuyo id está en `ids`. Devuelve el
 // primer choque: { label, id, instance, x, y, z, d } o null.
 cast(a, b, ids) {
  const targets = (this._cache ??= new Map());
  const key = ids.join(",");
  if (!targets.has(key)) {
   const set = new Set(ids), found = [];
   w.scene.traverse((o) => { if (o.isMesh && set.has(o.id)) found.push(o); });
   targets.set(key, found);
  }
  from.set(...a);
  dir.set(...b).sub(from);
  const far = dir.length();
  ray.set(from, dir.normalize());
  ray.far = far;
  const hit = ray.intersectObjects(targets.get(key), false)[0];
  return hit ? { label: label(hit.object), id: hit.object.id, instance: hit.instanceId ?? -1, x: hit.point.x, y: hit.point.y, z: hit.point.z, d: hit.distance } : null;
 },
};
