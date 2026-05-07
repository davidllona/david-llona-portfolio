import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { subscribeProgress } from "../3d/loadingManager";

/**
 * LoadingDoor v7 — Pasillo 3D real con Three.js
 *
 * Geometría:
 *  - Pasillo de 4×3×20 unidades (ancho × alto × largo)
 *  - 4 paredes (suelo, techo, lateral izquierdo, lateral derecho)
 *  - Pared al fondo con la puerta
 *  - Una point light cálida cerca de la puerta ilumina todo el pasillo
 *
 * Mientras carga: cámara estática al inicio del pasillo, viendo la
 * puerta brillar al fondo. La luz cálida ilumina las paredes con
 * paralaje real.
 *
 * Al 100%: la cámara avanza por el pasillo (camera.position.z) hasta
 * atravesar la puerta. Las hojas se separan al acercarse. Flash al
 * cruzar el umbral. Fade del overlay → escena 3D real visible.
 */

const MIN_DISPLAY_MS = 2000;
const MAX_WAIT_MS = 9000;
const PRE_ENTER_DELAY_MS = 400;
const ENTER_DURATION_MS = 3000;
const FADE_OUT_MS = 600;

// Smoothstep para apertura de puertas
const smoothstep = (t) => t * t * (3 - 2 * t);
// Ease in-out cubic para el avance de la cámara
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function LoadingDoor() {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const flashRef = useRef(null);
  const stateRef = useRef({});
  const [pct, setPct] = useState(0);
  const [hidden, setHidden] = useState(false);

  // ─── Setup Three.js ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    // Niebla cálida sutil que oscurece más rápido lejos del observador
    scene.fog = new THREE.Fog(0x000000, 6, 20);

    const camera = new THREE.PerspectiveCamera(58, w / h, 0.1, 100);
    camera.position.set(0, 1.55, 8);
    camera.lookAt(0, 1.55, -10);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // ─── PASILLO ─────────────────────────────────────────────────
    const corridorLen = 20;
    const corridorWidth = 4;
    const corridorHeight = 3;
    const centerZ = -corridorLen / 2 + 4; // empieza un poco por delante del observador
    const backZ = centerZ - corridorLen / 2; // pared del fondo

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x16161c,
      roughness: 0.92,
      metalness: 0.12,
    });

    const meshes = [];

    // Suelo
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(corridorWidth, corridorLen),
      wallMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, centerZ);
    scene.add(floor);
    meshes.push(floor);

    // Techo
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(corridorWidth, corridorLen),
      wallMat
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, corridorHeight, centerZ);
    scene.add(ceiling);
    meshes.push(ceiling);

    // Pared izquierda
    const wallLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(corridorLen, corridorHeight),
      wallMat
    );
    wallLeft.rotation.y = Math.PI / 2;
    wallLeft.position.set(-corridorWidth / 2, corridorHeight / 2, centerZ);
    scene.add(wallLeft);
    meshes.push(wallLeft);

    // Pared derecha
    const wallRight = new THREE.Mesh(
      new THREE.PlaneGeometry(corridorLen, corridorHeight),
      wallMat
    );
    wallRight.rotation.y = -Math.PI / 2;
    wallRight.position.set(corridorWidth / 2, corridorHeight / 2, centerZ);
    scene.add(wallRight);
    meshes.push(wallRight);

    // Pared del fondo (donde está enmarcada la puerta)
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(corridorWidth, corridorHeight),
      wallMat
    );
    backWall.position.set(0, corridorHeight / 2, backZ);
    scene.add(backWall);
    meshes.push(backWall);

    // ─── PUERTA ──────────────────────────────────────────────────
    const doorWidth = 1.5;
    const doorHeight = 2.3;
    const doorY = doorHeight / 2;
    const doorZ = backZ + 0.005; // mínimamente delante de la pared

    // Marco luminoso (4 barras finas alrededor de la puerta)
    const frameMat = new THREE.MeshBasicMaterial({
      color: 0xffa258,
      transparent: true,
      opacity: 0.9,
    });

    const makeFramePiece = (geomW, geomH, x, y) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(geomW, geomH),
        frameMat
      );
      m.position.set(x, y, doorZ + 0.01);
      scene.add(m);
      meshes.push(m);
      return m;
    };
    makeFramePiece(doorWidth + 0.12, 0.04, 0, doorHeight + 0.04);
    makeFramePiece(doorWidth + 0.12, 0.04, 0, -0.04);
    makeFramePiece(0.04, doorHeight + 0.12, -doorWidth / 2 - 0.04, doorY);
    makeFramePiece(0.04, doorHeight + 0.12, doorWidth / 2 + 0.04, doorY);

    // Hojas
    const halfW = doorWidth / 2 - 0.005;
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x080810,
      roughness: 0.45,
      metalness: 0.7,
    });

    const doorLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(halfW, doorHeight),
      doorMat
    );
    doorLeft.position.set(-halfW / 2, doorY, doorZ);
    scene.add(doorLeft);
    meshes.push(doorLeft);

    const doorRight = new THREE.Mesh(
      new THREE.PlaneGeometry(halfW, doorHeight),
      doorMat
    );
    doorRight.position.set(halfW / 2, doorY, doorZ);
    scene.add(doorRight);
    meshes.push(doorRight);

    // Rendija central — la luz que escapa por la junta
    const seamMat = new THREE.MeshBasicMaterial({
      color: 0xffe2b8,
      transparent: true,
      opacity: 1,
    });
    const seam = new THREE.Mesh(
      new THREE.PlaneGeometry(0.025, doorHeight - 0.06),
      seamMat
    );
    seam.position.set(0, doorY, doorZ + 0.02);
    scene.add(seam);
    meshes.push(seam);

    // ─── ILUMINACIÓN ─────────────────────────────────────────────
    // Luz cálida cerca de la puerta. Ilumina las paredes a medida
    // que la cámara se aproxima (efecto natural de acercamiento).
    const doorLight = new THREE.PointLight(0xff9a55, 4.5, 16, 1.6);
    doorLight.position.set(0, 1.6, backZ + 1.5);
    scene.add(doorLight);

    // Ambiente muy tenue para que las zonas en sombra no sean negro puro
    const ambient = new THREE.AmbientLight(0xffffff, 0.06);
    scene.add(ambient);

    // ─── ESTADO COMPARTIDO ───────────────────────────────────────
    stateRef.current = {
      camera,
      doorLeft,
      doorRight,
      seam,
      seamMat,
      frameMat,
      cameraStartZ: camera.position.z,
      cameraEndZ: backZ - 0.5, // un poco más allá de la puerta
      halfW,
      entering: false,
      enterStart: 0,
    };

    // ─── LOOP ────────────────────────────────────────────────────
    let animId;
    const animate = (now) => {
      const t = now / 1000;
      const s = stateRef.current;

      if (!s.entering) {
        // Respiración del haz central + halo del marco
        seamMat.opacity = 0.7 + Math.sin(t * 2.4) * 0.3;
        frameMat.opacity = 0.78 + Math.sin(t * 1.8) * 0.12;
      } else {
        const elapsed = now - s.enterStart;
        const p = Math.min(1, elapsed / ENTER_DURATION_MS);
        const eased = easeInOutCubic(p);

        // Avance de la cámara
        s.camera.position.z =
          s.cameraStartZ + (s.cameraEndZ - s.cameraStartZ) * eased;

        // Apertura de las hojas a partir del 55% del progreso
        if (p > 0.55) {
          const dt = Math.min(1, (p - 0.55) / 0.3);
          const de = smoothstep(dt);
          s.doorLeft.position.x = -s.halfW / 2 - de * (s.halfW + 0.6);
          s.doorRight.position.x = s.halfW / 2 + de * (s.halfW + 0.6);
          s.seamMat.opacity = Math.max(0, 1 - de * 1.4);
        }

        // Flash al final (de progreso 0.85 → 1.0)
        if (p > 0.85 && flashRef.current) {
          const ft = (p - 0.85) / 0.15;
          flashRef.current.style.opacity = String(Math.min(1, ft * 1.3));
        }
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    // Resize
    const onResize = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      meshes.forEach((m) => {
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
        else m.material?.dispose();
      });
      wallMat.dispose();
      renderer.dispose();
    };
  }, []);

  // ─── Trigger de entrada ────────────────────────────────────────
  useEffect(() => {
    let triggered = false;
    const startedAt = performance.now();

    const trigger = (reason) => {
      if (triggered) return;
      triggered = true;
      if (reason === "timeout") setPct(1);

      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed) + PRE_ENTER_DELAY_MS;

      setTimeout(() => {
        if (stateRef.current?.camera) {
          stateRef.current.entering = true;
          stateRef.current.enterStart = performance.now();
        }
        setTimeout(() => {
          if (wrapperRef.current) wrapperRef.current.style.opacity = "0";
          setTimeout(() => setHidden(true), FADE_OUT_MS);
        }, ENTER_DURATION_MS + 100);
      }, wait);
    };

    const unsub = subscribeProgress((p, done) => {
      setPct(p);
      if (done) trigger("loaded");
    });
    const safetyId = setTimeout(() => trigger("timeout"), MAX_WAIT_MS);

    return () => {
      unsub();
      clearTimeout(safetyId);
    };
  }, []);

  // Bloqueo de scroll
  useEffect(() => {
    if (hidden) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [hidden]);

  if (hidden) return null;

  const pctDisplay = Math.round(pct * 100);

  return (
    <div ref={wrapperRef} className="loading-corridor" aria-hidden="true">
      <canvas ref={canvasRef} className="loading-corridor__canvas" />

      {/* Flash overlay al cruzar el umbral */}
      <div ref={flashRef} className="loading-corridor__flash" />

      {/* HUD */}
      <div className="loading-corridor__hud">
        <div className="loading-corridor__bar">
          <div
            className="loading-corridor__bar-fill"
            style={{ transform: `scaleX(${pct})` }}
          />
        </div>
        <div className="loading-corridor__pct">
          {String(pctDisplay).padStart(3, "0")}
        </div>
      </div>

      <style>{`
        .loading-corridor {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #000;
          opacity: 1;
          transition: opacity ${FADE_OUT_MS}ms ease-out;
        }
        .loading-corridor__canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
        .loading-corridor__flash {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          opacity: 0;
          background: radial-gradient(ellipse 70% 60% at 50% 50%,
            rgba(255, 240, 210, 1)   0%,
            rgba(255, 195, 130, 0.7) 30%,
            rgba(255, 150, 80, 0.25) 60%,
            transparent 90%);
        }
        .loading-corridor__hud {
          position: absolute;
          left: 50%;
          bottom: 56px;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          z-index: 10;
          transition: opacity 400ms ease;
        }
        .loading-corridor__bar {
          position: relative;
          width: 220px;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }
        .loading-corridor__bar-fill {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg,
            rgba(255, 160, 90, 0.9),
            rgba(255, 200, 140, 1));
          transform-origin: left center;
          transform: scaleX(0);
          transition: transform 280ms ease-out;
          box-shadow: 0 0 10px rgba(255, 160, 90, 0.5);
        }
        .loading-corridor__pct {
          font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', ui-monospace, monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.32em;
          color: rgba(235, 220, 200, 0.6);
          text-shadow: 0 0 12px rgba(255, 160, 90, 0.2);
        }

        @media (max-width: 767px) {
          .loading-corridor__hud { bottom: 38px; gap: 10px; }
          .loading-corridor__bar { width: 160px; }
        }
      `}</style>
    </div>
  );
}