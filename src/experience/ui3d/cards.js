import * as THREE from "three";

// Tarjetas de la interfaz 3D, dibujadas en canvas con el estilo del porfolio:
// papel crema, texto oscuro y la letra estrecha del título. Cada tarjeta tiene
// un lienzo de tamaño fijo (la textura no cambia de tamaño en la GPU); lo que
// se dibuja va centrado y `box` dice qué parte ocupa, de 0 a 1.

const FONT = '"Bricolage Grotesque", system-ui, sans-serif';
const PAPER = "#ffe7ba"; // algo más cálido que el crema de la interfaz: el mapeo de tonos lo aclara
const INK = "#3a2a1e";
const EDGE = "rgba(107, 70, 48, 0.35)";
const ORANGE = "#ff6b2c";

export function createCard(width, height) {
 const canvas = document.createElement("canvas");
 canvas.width = width;
 canvas.height = height;
 // Un lienzo sin contexto no se puede subir a la GPU: se crea ya, vacío.
 canvas.getContext("2d").clearRect(0, 0, width, height);
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 texture.anisotropy = 4;
 return { canvas, texture, box: { w: 1, h: 1 }, text: null };
}

function prepare(card, weight, size) {
 const ctx = card.canvas.getContext("2d");
 ctx.clearRect(0, 0, card.canvas.width, card.canvas.height);
 ctx.textBaseline = "middle";
 ctx.textAlign = "left";
 if ("fontStretch" in ctx) ctx.fontStretch = "condensed";
 if ("letterSpacing" in ctx) ctx.letterSpacing = "1px";
 ctx.font = `${weight} ${size}px ${FONT}`;
 return ctx;
}

function paper(ctx, x, y, w, h, radius) {
 ctx.shadowColor = "rgba(40, 26, 14, 0.3)";
 ctx.shadowBlur = 18;
 ctx.shadowOffsetY = 6;
 ctx.fillStyle = PAPER;
 ctx.beginPath();
 ctx.roundRect(x, y, w, h, radius);
 ctx.fill();
 ctx.shadowColor = "transparent";
 ctx.lineWidth = 3;
 ctx.strokeStyle = EDGE;
 ctx.stroke();
}

// Píldora de una línea. `key`: tecla dibujada delante (la E de «usar»).
export function drawPill(card, text, { key = null } = {}) {
 const { width, height } = card.canvas;
 const size = 78;
 const ctx = prepare(card, 700, size);
 const pad = 44, cap = key ? 96 : 0, gap = key ? 26 : 0;
 const w = Math.min(width - 40, ctx.measureText(text).width + pad * 2 + cap + gap);
 const h = 132;
 const x = (width - w) / 2, y = (height - h) / 2 - 4;
 paper(ctx, x, y, w, h, h / 2);
 let at = x + pad;
 if (key) {
  ctx.fillStyle = "#c4491a";
  ctx.beginPath();
  ctx.roundRect(at - 8, y + 24, cap, h - 40, 20);
  ctx.fill();
  ctx.fillStyle = ORANGE;
  ctx.beginPath();
  ctx.roundRect(at - 8, y + 18, cap, h - 40, 20);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = `800 ${size - 8}px ${FONT}`;
  ctx.fillText(key, at - 8 + cap / 2, y + h / 2 + 2);
  ctx.textAlign = "left";
  ctx.font = `700 ${size}px ${FONT}`;
  at += cap + gap - 8;
 }
 ctx.fillStyle = INK;
 ctx.fillText(text, at, y + h / 2 + 4, x + w - pad - at);
 card.box = { w: w / width, h: h / height };
 card.texture.needsUpdate = true;
}

// Bocadillo de varias líneas con pico abajo, apoyado en el borde inferior.
export function drawSpeech(card, text) {
 const { width, height } = card.canvas;
 const size = 64, line = 78, pad = 46, tail = 44, limit = width - 140;
 const ctx = prepare(card, 700, size);
 const lines = [];
 let current = "";
 for (const word of text.split(" ")) {
  const candidate = current ? `${current} ${word}` : word;
  if (current && ctx.measureText(candidate).width > limit) {
   lines.push(current);
   current = word;
  } else current = candidate;
 }
 lines.push(current);
 const w = Math.max(260, ...lines.map((one) => ctx.measureText(one).width)) + pad * 2;
 const h = lines.length * line + pad * 2 - 14;
 const x = (width - w) / 2, y = height - tail - h - 8;
 paper(ctx, x, y, w, h, 40);
 // Pico: tapa el borde del bocadillo por donde se une.
 ctx.fillStyle = PAPER;
 ctx.beginPath();
 ctx.moveTo(width / 2 - 30, y + h - 3);
 ctx.lineTo(width / 2, y + h + tail);
 ctx.lineTo(width / 2 + 30, y + h - 3);
 ctx.closePath();
 ctx.fill();
 ctx.strokeStyle = EDGE;
 ctx.beginPath();
 ctx.moveTo(width / 2 - 30, y + h);
 ctx.lineTo(width / 2, y + h + tail);
 ctx.lineTo(width / 2 + 30, y + h);
 ctx.stroke();
 ctx.fillStyle = INK;
 lines.forEach((one, i) => ctx.fillText(one, x + pad, y + pad + line * i + line / 2 - 8));
 card.box = { w: w / width, h: (h + tail) / height };
 card.texture.needsUpdate = true;
}

// Logro conseguido: medalla, rótulo pequeño y el nombre.
export function drawAchievement(card, name) {
 const { width, height } = card.canvas;
 const ctx = prepare(card, 800, 84);
 const label = "LOGRO CONSEGUIDO";
 const nameWidth = ctx.measureText(name.toUpperCase()).width;
 const w = Math.min(width - 40, Math.max(nameWidth, 420) + 250);
 const h = 208;
 const x = (width - w) / 2, y = (height - h) / 2 - 4;
 paper(ctx, x, y, w, h, 46);
 const cx = x + 108, cy = y + h / 2;
 ctx.fillStyle = ORANGE;
 ctx.beginPath();
 for (let i = 0; i < 16; i++) {
  const radius = i % 2 ? 58 : 72, angle = (i / 16) * Math.PI * 2;
  ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
 }
 ctx.closePath();
 ctx.fill();
 ctx.strokeStyle = "#ffffff";
 ctx.lineWidth = 12;
 ctx.lineCap = "round";
 ctx.lineJoin = "round";
 ctx.beginPath();
 ctx.moveTo(cx - 26, cy + 2);
 ctx.lineTo(cx - 6, cy + 22);
 ctx.lineTo(cx + 28, cy - 20);
 ctx.stroke();
 ctx.fillStyle = "#c4491a";
 ctx.font = `800 40px ${FONT}`;
 if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
 ctx.fillText(label, x + 206, y + 62);
 ctx.fillStyle = INK;
 ctx.font = `800 84px ${FONT}`;
 if ("letterSpacing" in ctx) ctx.letterSpacing = "1px";
 ctx.fillText(name.toUpperCase(), x + 206, y + 134, w - 250);
 card.box = { w: w / width, h: h / height };
 card.texture.needsUpdate = true;
}
