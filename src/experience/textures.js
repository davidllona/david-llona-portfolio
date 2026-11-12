import * as THREE from "three";

// Texturas generadas en canvas: no se descarga ningún archivo.

function canvasTexture(width, height, draw) {
 const canvas = document.createElement("canvas");
 canvas.width = width;
 canvas.height = height;
 draw(canvas.getContext("2d"), width, height);
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 return texture;
}

// Mancha de luz redonda y suave: halos y charcos de luz en el suelo.
export function createGlowTexture() {
 return canvasTexture(128, 128, (ctx, w, h) => {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
 });
}

const LABEL_FONT = '"Bricolage Grotesque"';

// Rótulo de texto. El tamaño de letra se ajusta para que el texto quepa siempre.
// `plate`: lo dibuja en blanco sobre una placa oscura con una franja del color
// del ala, para que se lea sobre cualquier fondo (rótulos de las puertas).
// `title`: con la letra del título de la portada (estrecha, sin contorno), para
// los carteles de madera.
export function createLabelTexture(text, color, { plate = false, title = false } = {}) {
 const canvas = document.createElement("canvas");
 canvas.width = 1024;
 canvas.height = 256;
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 texture.anisotropy = 8;

 const draw = () => {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = title ? "2px" : "8px";
  if ("fontStretch" in ctx) ctx.fontStretch = title ? "condensed" : "normal";

  // Se reduce la letra hasta que el texto quepa con margen.
  const room = width - (plate ? 150 : 70);
  let size = plate ? 150 : title ? 190 : 128;
  do {
   ctx.font = `800 ${size}px ${LABEL_FONT}, system-ui, sans-serif`;
   size -= 6;
  } while (ctx.measureText(text).width > room && size > 40);

  if (plate) {
   ctx.fillStyle = "rgba(9, 11, 16, 0.94)";
   ctx.beginPath();
   ctx.roundRect(8, 20, width - 16, height - 40, 36);
   ctx.fill();
   ctx.fillStyle = color;
   ctx.beginPath();
   ctx.roundRect(8, 20, 30, height - 40, [36, 0, 0, 36]);
   ctx.fill();
   ctx.fillStyle = "#ffffff";
   ctx.fillText(text, width / 2 + 12, height / 2 + 8);
  } else if (title) {
   // Los nombres largos van en dos renglones, partidos por el espacio más
   // cercano al centro: así la letra no se queda diminuta.
   let lines = [text];
   const spaces = [...text.matchAll(/ /g)].map((match) => match.index);
   if (text.length > 13 && spaces.length > 0) {
    const cut = spaces.reduce((best, at) => (Math.abs(at - text.length / 2) < Math.abs(best - text.length / 2) ? at : best));
    lines = [text.slice(0, cut), text.slice(cut + 1)];
    size = 124;
    do {
     ctx.font = `800 ${size}px ${LABEL_FONT}, system-ui, sans-serif`;
     size -= 6;
    } while (Math.max(...lines.map((line) => ctx.measureText(line).width)) > room && size > 40);
   }
   // Como pintado sobre la madera: una sombra corta debajo y la letra encima.
   const step = lines.length > 1 ? 112 : 0;
   lines.forEach((line, i) => {
    const y = height / 2 + 10 + (i - (lines.length - 1) / 2) * step;
    ctx.fillStyle = "rgba(58, 36, 22, 0.55)";
    ctx.fillText(line, width / 2 + 4, y + 6);
    ctx.fillStyle = color;
    ctx.fillText(line, width / 2, y);
   });
  } else {
   // Contorno oscuro: se lee igual sobre paneles claros que sobre el espacio.
   ctx.lineJoin = "round";
   ctx.lineWidth = 18;
   ctx.strokeStyle = "rgba(9, 11, 16, 0.92)";
   ctx.strokeText(text, width / 2, height / 2 + 6);
   ctx.fillStyle = color;
   ctx.fillText(text, width / 2, height / 2 + 6);
  }
  texture.needsUpdate = true;
 };

 draw();
 // La fuente web puede llegar después del primer dibujado.
 document.fonts?.load(`800 120px ${LABEL_FONT}`).then(draw, () => {});
 return texture;
}

// Panel de texto para las paredes: antetítulo, titular en dos colores y párrafos.
export function createTextPanelTexture({ eyebrow, headline, paragraphs, color }) {
 const canvas = document.createElement("canvas");
 canvas.width = 1024;
 canvas.height = 1024;
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 texture.anisotropy = 8;

 const draw = () => {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const margin = 76;
  ctx.fillStyle = "#0b0d13";
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = "alphabetic";
  let y = 112;

  if (eyebrow) {
   ctx.fillStyle = color;
   ctx.font = `700 32px ${LABEL_FONT}, sans-serif`;
   if ("letterSpacing" in ctx) ctx.letterSpacing = "10px";
   ctx.fillText(eyebrow.toUpperCase(), margin, y);
   y += 108;
  }

  if ("letterSpacing" in ctx) ctx.letterSpacing = "-2px";
  ctx.font = `800 100px ${LABEL_FONT}, sans-serif`;
  headline.forEach((line, i) => {
   ctx.fillStyle = i === headline.length - 1 ? color : "#f1f1f1";
   ctx.fillText(line, margin, y);
   y += 100;
  });
  y += 8;

  // Letra grande: el panel se lee desde el centro de la sala.
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  ctx.font = `500 45px ${LABEL_FONT}, sans-serif`;
  ctx.fillStyle = "#d3d6de";
  for (const paragraph of paragraphs) {
   let line = "";
   for (const word of paragraph.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width - margin * 2 && line) {
     ctx.fillText(line, margin, y);
     y += 59;
     line = word;
    } else {
     line = next;
    }
   }
   ctx.fillText(line, margin, y);
   y += 92;
  }
  texture.needsUpdate = true;
 };

 draw();
 document.fonts?.load(`800 104px ${LABEL_FONT}`).then(draw, () => {});
 return texture;
}

// Balón de baloncesto: naranja con las costuras. Proyección equirrectangular.
export function createBasketballTexture() {
 return canvasTexture(512, 256, (ctx, w, h) => {
  ctx.fillStyle = "#d9641e";
  ctx.fillRect(0, 0, w, h);
  // Granulado de la piel.
  for (let i = 0; i < 2600; i++) {
   ctx.fillStyle = `rgba(60, 20, 0, ${0.05 + Math.random() * 0.1})`;
   ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  ctx.strokeStyle = "#1c1210";
  ctx.lineWidth = 7;
  const line = (points) => {
   ctx.beginPath();
   points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
   ctx.stroke();
  };
  line([[0, h / 2], [w, h / 2]]); // ecuador
  line([[w * 0.25, 0], [w * 0.25, h]]); // dos meridianos opuestos
  line([[w * 0.75, 0], [w * 0.75, h]]);
  // Las dos costuras curvas, a cada lado.
  for (const center of [0, w / 2, w]) {
   for (const sign of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 40; i++) {
     const t = i / 40;
     points.push([center + sign * (w * 0.11) * Math.sin(t * Math.PI) ** 0.8 + sign * w * 0.02, t * h]);
    }
    line(points);
   }
  }
 });
}

// Tablero de la canasta, con el recuadro de tiro.
export function createBackboardTexture(color) {
 return canvasTexture(512, 300, (ctx, w, h) => {
  ctx.fillStyle = "#eef0f4";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, w - 14, h - 14);
  ctx.lineWidth = 12;
  ctx.strokeRect(w / 2 - 84, h - 150, 168, 126);
 });
}
