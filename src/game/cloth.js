import * as THREE from "three";

// Tela simulada para la red de la portería: una rejilla de nudos unidos por
// hilos (integración de Verlet y restricciones de distancia). Los nudos del
// borde van atados al marco. El balón la empuja de verdad: cada nudo que toca
// sale a su superficie y le devuelve el empujón, así que la red se embolsa,
// frena el balón y lo deja caer; no hay animación escrita.

const to = new THREE.Vector3();

// Paño rectangular entre cuatro esquinas (a → b a lo ancho, a → d a lo alto).
// `pin(i, j, cols, rows)`: si ese nudo va atado (por defecto, todo el borde).
export function createPanel(corners, cols, rows, { pin = (i, j, c, r) => i === 0 || j === 0 || i === c || j === r, slack = 1.06 } = {}) {
 const [a, b, , d] = corners.map((corner) => new THREE.Vector3(...corner));
 const count = (cols + 1) * (rows + 1);
 const panel = { cols, rows, count, now: new Float32Array(count * 3), before: new Float32Array(count * 3), home: new Float32Array(count * 3), pinned: new Uint8Array(count), links: [], awake: 0 };
 const stepX = new THREE.Vector3().subVectors(b, a).divideScalar(cols), stepY = new THREE.Vector3().subVectors(d, a).divideScalar(rows);
 for (let j = 0; j <= rows; j++) {
  for (let i = 0; i <= cols; i++) {
   const k = j * (cols + 1) + i;
   to.copy(a).addScaledVector(stepX, i).addScaledVector(stepY, j);
   to.toArray(panel.now, k * 3);
   to.toArray(panel.before, k * 3);
   to.toArray(panel.home, k * 3);
   panel.pinned[k] = pin(i, j, cols, rows) ? 1 : 0;
   // Hilos algo más largos que la separación: la red cuelga floja.
   if (i < cols) panel.links.push(k, k + 1, stepX.length() * slack);
   if (j < rows) panel.links.push(k, k + cols + 1, stepY.length() * slack);
  }
 }
 return panel;
}

// Lo que puede embolsarse un paño antes de quedar tenso del todo (metros).
const reachOf = (panel) => panel.give ?? 0.6;

// Avanza la tela. `ball`: { position, velocity, radius } o null. Devuelve
// cuántos nudos ha tocado el balón en este paso.
export function stepPanel(panel, dt, ball, { gravity = 6, damping = 0.985, share = 0.016 } = {}) {
 const { now, before, pinned, links, count } = panel;
 let touched = 0;
 const g = gravity * dt * dt;
 for (let k = 0; k < count; k++) {
  if (pinned[k]) continue;
  const i = k * 3;
  for (let axis = 0; axis < 3; axis++) {
   const position = now[i + axis];
   const next = position + (position - before[i + axis]) * damping - (axis === 1 ? g : 0);
   before[i + axis] = position;
   now[i + axis] = next;
  }
 }
 for (let pass = 0; pass < 3; pass++) {
  for (let l = 0; l < links.length; l += 3) {
   const p = links[l] * 3, q = links[l + 1] * 3, rest = links[l + 2];
   const dx = now[q] - now[p], dy = now[q + 1] - now[p + 1], dz = now[q + 2] - now[p + 2];
   const length = Math.hypot(dx, dy, dz);
   if (length <= rest || length < 1e-6) continue; // el hilo solo tira, no empuja
   const pull = (length - rest) / length;
   const fixedP = pinned[links[l]], fixedQ = pinned[links[l + 1]];
   const wp = fixedP ? 0 : fixedQ ? 1 : 0.5, wq = fixedQ ? 0 : fixedP ? 1 : 0.5;
   now[p] += dx * pull * wp;
   now[p + 1] += dy * pull * wp;
   now[p + 2] += dz * pull * wp;
   now[q] -= dx * pull * wq;
   now[q + 1] -= dy * pull * wq;
   now[q + 2] -= dz * pull * wq;
  }
  if (!ball) continue;
  // El balón: los nudos que quedan dentro salen a su superficie y lo frenan.
  const reach = ball.radius + 0.03;
  const { position: b, velocity: v } = ball;
  for (let k = 0; k < count; k++) {
   const i = k * 3;
   const dx = now[i] - b.x, dy = now[i + 1] - b.y, dz = now[i + 2] - b.z;
   const d2 = dx * dx + dy * dy + dz * dz;
   if (d2 >= reach * reach || d2 < 1e-8) continue;
   const d = Math.sqrt(d2);
   const nx = dx / d, ny = dy / d, nz = dz / d;
   const depth = reach - d;
   touched += 1;
   // Cuanto más lejos está el nudo de su sitio, más tensa está ahí la red y
   // más se opone: floja cede casi sin frenar; embolsada, para el balón.
   const { home } = panel;
   const stretch = pinned[k] ? 1 : Math.min(1, Math.hypot(now[i] - home[i], now[i + 1] - home[i + 1], now[i + 2] - home[i + 2]) / reachOf(panel));
   const firm = stretch * stretch;
   const yieldBall = pinned[k] ? 1 : 0.05 + 0.7 * firm;
   now[i] += nx * depth * (1 - yieldBall);
   now[i + 1] += ny * depth * (1 - yieldBall);
   now[i + 2] += nz * depth * (1 - yieldBall);
   b.x -= nx * depth * yieldBall;
   b.y -= ny * depth * yieldBall;
   b.z -= nz * depth * yieldBall;
   // Reparto de cantidad de movimiento: lo que el balón traía hacia el nudo.
   const into = v.x * nx + v.y * ny + v.z * nz;
   if (into > 0) {
    const give = into * (share + 0.5 * firm);
    v.x -= nx * give;
    v.y -= ny * give;
    v.z -= nz * give;
   }
  }
 }
 if (touched) {
  // Rozamiento con la malla: el balón pierde velocidad mientras la toca.
  ball.velocity.multiplyScalar(Math.exp(-3.2 * dt));
  ball.spin.multiplyScalar(Math.exp(-6 * dt));
  panel.awake = 2.5;
 }
 panel.awake = Math.max(0, panel.awake - dt);
 return touched;
}

// Cuánto se ha movido la tela respecto a su sitio (metros, el nudo que más).
export function bulge(panel) {
 let most = 0;
 for (let i = 0; i < panel.count * 3; i += 3) most = Math.max(most, Math.hypot(panel.now[i] - panel.home[i], panel.now[i + 1] - panel.home[i + 1], panel.now[i + 2] - panel.home[i + 2]));
 return most;
}

// Índices de las líneas de la malla (para dibujarla con LineSegments).
export function panelLines(panel, offset = 0) {
 const out = [];
 for (let l = 0; l < panel.links.length; l += 3) out.push(panel.links[l] + offset, panel.links[l + 1] + offset);
 return out;
}
