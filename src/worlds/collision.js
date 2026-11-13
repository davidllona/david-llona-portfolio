// Colisiones comunes a todos los mundos. Cada mundo aporta:
//  · colliders: obstáculos fijos vistos desde arriba. Tres formas:
//      círculo   { x, z, r }
//      cápsula   { x, z, bx, bz, r }   un tramo con grosor (barandillas, vallas)
//      polígono  { poly: [[x, z], …], r } convexo y macizo (edificios, rocas)
//    Cualquiera puede llevar `active: false` para dejar de contar.
//  · blocked(x, z, fromY, agent): si el terreno impide estar ahí (agua profunda,
//    un escalón demasiado alto…).

export const PLAYER_RADIUS = 0.42;

// Distancia de (px, pz) al obstáculo sin contar su grosor `r` (negativa dentro
// de un polígono) y, en `normal`, hacia dónde hay que salir.
const normal = { x: 0, z: 0 };
function separation(c, px, pz) {
 if (c.poly) {
  // Envoltura: lejos del polígono no hace falta mirar sus lados.
  const reach = c.reach ?? bound(c);
  const fx = px - c.cx, fz = pz - c.cz;
  if (fx * fx + fz * fz > (reach + 2) * (reach + 2)) return Infinity;
  const points = c.poly;
  let best = Infinity, bx = 0, bz = 0, inside = true;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
   const ax = points[j][0], az = points[j][1];
   const ex = points[i][0] - ax, ez = points[i][1] - az;
   const t = Math.max(0, Math.min(1, ((px - ax) * ex + (pz - az) * ez) / (ex * ex + ez * ez || 1)));
   const qx = ax + ex * t, qz = az + ez * t;
   const d2 = (px - qx) * (px - qx) + (pz - qz) * (pz - qz);
   if (d2 < best) {
    best = d2;
    bx = qx;
    bz = qz;
   }
   // (Los vértices van en el sentido en que el interior queda a la izquierda.)
   if (ex * (pz - az) - ez * (px - ax) < 0) inside = false;
  }
  const d = Math.sqrt(best);
  if (d < 1e-6) {
   normal.x = px - c.cx;
   normal.z = pz - c.cz;
   const length = Math.hypot(normal.x, normal.z) || 1;
   normal.x /= length;
   normal.z /= length;
   return 0;
  }
  const sign = inside ? -1 : 1;
  normal.x = ((px - bx) / d) * sign;
  normal.z = ((pz - bz) / d) * sign;
  return d * sign;
 }
 let qx = c.x, qz = c.z;
 if (c.bx !== undefined) {
  const ex = c.bx - c.x, ez = c.bz - c.z;
  const t = Math.max(0, Math.min(1, ((px - c.x) * ex + (pz - c.z) * ez) / (ex * ex + ez * ez || 1)));
  qx += ex * t;
  qz += ez * t;
 }
 const dx = px - qx, dz = pz - qz;
 const d = Math.hypot(dx, dz);
 normal.x = d > 1e-6 ? dx / d : 1;
 normal.z = d > 1e-6 ? dz / d : 0;
 return d;
}
// Centro y radio de la envoltura de un polígono; se calcula una vez.
function bound(c) {
 let cx = 0, cz = 0;
 for (const [x, z] of c.poly) {
  cx += x;
  cz += z;
 }
 c.cx = cx / c.poly.length;
 c.cz = cz / c.poly.length;
 c.reach = Math.max(...c.poly.map(([x, z]) => Math.hypot(x - c.cx, z - c.cz))) + c.r;
 return c.reach;
}
export const distanceTo = (c, px, pz) => separation(c, px, pz);

// Saca un círculo de dentro de los obstáculos fijos. Devuelve true si tocó alguno.
export function pushOut(world, position, radius) {
 let touched = false;
 for (const c of world.colliders) {
  if (c.active === false) continue;
  // Descarte rápido de los círculos, que son la mayoría.
  if (!c.poly && c.bx === undefined) {
   const reach = c.r + radius;
   if (Math.abs(position.x - c.x) >= reach || Math.abs(position.z - c.z) >= reach) continue;
  }
  const d = separation(c, position.x, position.z);
  const reach = c.r + radius;
  if (d >= reach) continue;
  position.x += normal.x * (reach - d);
  position.z += normal.z * (reach - d);
  touched = true;
 }
 return touched;
}

// Mueve a un personaje (dx, dz): resbala por los obstáculos y respeta el
// terreno. Devuelve una máscara: bit 1 si avanzó en X, bit 2 si en Z.
// `agent` se pasa tal cual a world.blocked (por ejemplo, Woody no se mete en
// agua tan honda como el astronauta).
export function moveAgent(world, position, dx, dz, radius = PLAYER_RADIUS, agent) {
 const fromX = position.x;
 const fromZ = position.z;
 const fromY = position.y;
 const free = (x, z) => !world.blocked(x, z, fromY, agent);
 let moved = 0;
 if (free(fromX + dx, fromZ + dz)) {
  position.x += dx;
  position.z += dz;
  moved = 3;
 } else {
  if (free(fromX + dx, fromZ)) {
   position.x += dx;
   moved |= 1;
  }
  if (free(position.x, fromZ + dz)) {
   position.z += dz;
   moved |= 2;
  }
 }
 pushOut(world, position, radius);
 pushOut(world, position, radius); // segunda pasada: rincones entre dos obstáculos
 // Si un obstáculo lo ha empujado a terreno vedado, no se mueve.
 if (!free(position.x, position.z)) {
  position.x = fromX;
  position.z = fromZ;
  return 0;
 }
 return moved;
}
