// Encaje de títulos en los carteles (objetivo 27, B1). Una sola regla para todos:
//  · margen interior fijo (la caja que se pasa ya lo descuenta);
//  · la letra se reduce hasta que el texto cabe;
//  · si con la letra mínima legible (`min`) aún no cabe en un renglón, pasa a
//    dos renglones centrados, partidos por el espacio más cercano al centro,
//    con la letra más grande que quepa (y nunca más pequeña que `min2`).
// Mide con lo que tenga puesto el lienzo (espaciado entre letras incluido).
//
// En desarrollo, cada encaje queda apuntado en `window.__world.fitted` (texto,
// renglones, tamaño y si cabe): lo comprueba tests/e2e/carteles.mjs.

const fitted = new Map();
function note(entry) {
 if (!import.meta.env.DEV || typeof window === "undefined" || !window.__world) return;
 fitted.set(`${entry.where}|${entry.text}`, entry);
 window.__world.fitted = [...fitted.values()];
}

// Parte un texto en dos por el espacio más cercano al centro (o lo deja en uno).
export function splitInTwo(text) {
 const spaces = [...text.matchAll(/ /g)].map((match) => match.index);
 if (!spaces.length) return [text];
 const cut = spaces.reduce((best, at) => (Math.abs(at - text.length / 2) < Math.abs(best - text.length / 2) ? at : best));
 return [text.slice(0, cut), text.slice(cut + 1)];
}

// `ctx`: lienzo 2D (con su alineación y espaciado ya puestos). `font(size)`: la
// cadena de fuente para ese tamaño. `width` y `height`: la caja disponible (ya
// sin el margen). `lineHeight`: separación de renglones, en veces el tamaño.
// Devuelve { lines, size, step } (step: distancia entre renglones, en px).
export function fitText(ctx, text, { width, height = Infinity, max, min, min2 = min * 0.8, font, lineHeight = 1.05, lines: allowed = 2, where = "cartel" }) {
 const measure = (rows, size) => {
  ctx.font = font(size);
  return Math.max(...rows.map((row) => ctx.measureText(row).width));
 };
 const fitsIn = (rows, size) => measure(rows, size) <= width && size * (1 + (rows.length - 1) * lineHeight) <= height;
 let rows = [text];
 let size = max;
 while (size > min && !fitsIn(rows, size)) size -= 2;
 if (!fitsIn(rows, size) && allowed > 1) {
  const two = splitInTwo(text);
  if (two.length === 2) {
   rows = two;
   size = max;
   while (size > min2 && !fitsIn(rows, size)) size -= 2;
  }
 }
 // Último recurso (una palabra larguísima): la letra baja lo que haga falta.
 while (size > 8 && !fitsIn(rows, size)) size -= 1;
 ctx.font = font(size);
 note({ where, text, lines: rows, size, min: rows.length > 1 ? min2 : min, fits: fitsIn(rows, size), width: Math.round(measure(rows, size)), room: Math.round(width) });
 ctx.font = font(size);
 return { lines: rows, size, step: size * lineHeight };
}

// Dibuja los renglones centrados en vertical alrededor de `y` (con
// textBaseline «middle»). `paint(row, x, y)`: cómo se pinta cada uno.
export function drawLines({ lines, step }, x, y, paint) {
 lines.forEach((row, i) => paint(row, x, y + (i - (lines.length - 1) / 2) * step));
}
