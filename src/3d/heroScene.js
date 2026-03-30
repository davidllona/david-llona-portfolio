import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function initHeroScene() {
 // Canvas
 const canvas = document.querySelector("#webgl");

 if (!canvas) {
  console.log("No se encontró el canvas");
  return;
 }

 // Scene
 const scene = new THREE.Scene();

 // Sizes
 const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
 };

 // Geometry
 const geometry = new THREE.BoxGeometry(2, 2, 2);

 // Material
 const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

 // Mesh
 const mesh = new THREE.Mesh(geometry, material);
 mesh.position.set(0, 0, 0);
 scene.add(mesh);

 // Camera
 const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
 camera.position.set(1, 1, 3);
 scene.add(camera);

 // Controls
 const controls = new OrbitControls(camera, canvas);
 controls.enableDamping = true;

 // Renderer
 const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
 });
 renderer.setSize(sizes.width, sizes.height);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

 // Clock
 const clock = new THREE.Clock();

 let scrollY = window.scrollY;

 window.addEventListener("scroll", () => {
  scrollY = window.scrollY;
 });

 const tick = () => {
  camera.position.y = -(scrollY / sizes.height) * 2;

  mesh.rotation.y = scrollY * 0.001;
  mesh.rotation.x = scrollY * 0.0005;

  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
 };

 tick();
}
