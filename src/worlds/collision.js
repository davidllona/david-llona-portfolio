// Colisiones comunes a todos los mundos. Cada mundo aporta:
//  · colliders: círculos fijos vistos desde arriba ({ x, z, r, active? });
//  · blocked(x, z, fromY, agent): si el terreno impide estar ahí (agua profunda,
//    un escalón demasiado alto…).

export const PLAYER_RADIUS = 0.42;

// Saca un círculo de dentro de los obstáculos fijos. Devuelve true si tocó alguno.
export function pushOut(world, position, radius) {
 let touched = false;
 for (const c of world.colliders) {
  if (c.active === false) continue;
  const dx = position.x - c.x;
  const dz = position.z - c.z;
  const reach = c.r + radius;
  const d2 = dx * dx + dz * dz;
  if (d2 >= reach * reach || d2 < 1e-8) continue;
  const d = Math.sqrt(d2);
  position.x = c.x + (dx / d) * reach;
  position.z = c.z + (dz / d) * reach;
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
