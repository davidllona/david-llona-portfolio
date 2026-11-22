import * as THREE from "three";

// Iconos de las tres vías de contacto, dibujados aquí mismo: reconocibles pero
// propios. Eran de la casita de contacto del mundo 1; desde el objetivo 27 los
// llevan los terminales de la antena de The Cosmic Lab.
function icon(draw, background) {
 const canvas = document.createElement("canvas");
 canvas.width = canvas.height = 256;
 const ctx = canvas.getContext("2d");
 ctx.fillStyle = background;
 ctx.fillRect(0, 0, 256, 256);
 draw(ctx);
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 return texture;
}
export const CONTACT_ICONS = {
 LinkedIn: () =>
  icon((ctx) => {
   ctx.fillStyle = "#ffffff";
   ctx.fillRect(58, 104, 30, 98);
   ctx.beginPath();
   ctx.arc(73, 68, 19, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillRect(112, 104, 30, 98);
   ctx.beginPath();
   ctx.moveTo(142, 148);
   ctx.quadraticCurveTo(142, 124, 164, 124);
   ctx.quadraticCurveTo(176, 124, 176, 146);
   ctx.lineTo(176, 202);
   ctx.lineTo(206, 202);
   ctx.lineTo(206, 140);
   ctx.quadraticCurveTo(206, 98, 170, 98);
   ctx.quadraticCurveTo(150, 98, 142, 112);
   ctx.closePath();
   ctx.fill();
  }, "#2867b2"),
 GitHub: () =>
  icon((ctx) => {
   // Cabeza de gato con sus orejas: la silueta que todo el mundo reconoce.
   ctx.fillStyle = "#f4f1ea";
   ctx.beginPath();
   ctx.arc(128, 132, 74, 0, Math.PI * 2);
   ctx.fill();
   ctx.beginPath();
   ctx.moveTo(66, 100);
   ctx.lineTo(62, 46);
   ctx.lineTo(108, 70);
   ctx.closePath();
   ctx.fill();
   ctx.beginPath();
   ctx.moveTo(190, 100);
   ctx.lineTo(194, 46);
   ctx.lineTo(148, 70);
   ctx.closePath();
   ctx.fill();
   ctx.fillStyle = "#1c1b22";
   ctx.beginPath();
   ctx.ellipse(128, 142, 46, 38, 0, 0, Math.PI * 2);
   ctx.fill();
   ctx.fillStyle = "#f4f1ea";
   for (const x of [108, 148]) {
    ctx.beginPath();
    ctx.ellipse(x, 140, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
   }
  }, "#1c1b22"),
 Email: () =>
  icon((ctx) => {
   ctx.fillStyle = "#fff6e6";
   ctx.fillRect(40, 72, 176, 116);
   ctx.strokeStyle = "#c2542b";
   ctx.lineWidth = 12;
   ctx.lineJoin = "round";
   ctx.beginPath();
   ctx.moveTo(44, 78);
   ctx.lineTo(128, 142);
   ctx.lineTo(212, 78);
   ctx.stroke();
  }, "#ff7a3d"),
};
