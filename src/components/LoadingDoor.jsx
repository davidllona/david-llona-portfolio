import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { subscribeProgress } from "../3d/loadingManager";

/**
 * LoadingDoor v9 — Wireframe + glyph (sin puerta)
 *
 * Concepto: una figura geométrica en wireframe naranja rotando
 * lentamente sobre un grid de perspectiva infinito. Tipografía
 * editorial debajo. Al completar la carga, la figura se expande,
 * libera un breath de luz, y sus aristas se disipan → fade out.
 *
 * Decisiones de dirección artística:
 *  · Wireframe en lugar de superficies sólidas → robusto: las líneas
 *    se ven a la opacidad que les pongas, sin depender de luces.
 *  · Grid de perspectiva → ancla la cámara en el espacio sin necesidad
 *    de un entorno completo. Pura geometría, cero materiales complejos.
 *  · Tipografía protagonista con mucho espacio negativo → editorial,
 *    senior, no compite con la figura.
 *  · Brasas atmosféricas (puntos pulsando) → vida sutil, vibración
 *    sin saturar.
 *  · La transición no es "atravesar algo", es "soltar la figura" →
 *    expansión radial + disipación. Más limpio que cualquier cruce.
 */

// ─── Constantes de timing ──────────────────────────────────────────
const MIN_DISPLAY_MS = 2000;
const MAX_WAIT_MS = 9000;
const PRE_ENTER_DELAY_MS = 400;
const ENTER_DURATION_MS = 1600; // más corto: ya no hay que cruzar nada
const FADE_OUT_MS = 700;

// ─── Easings ───────────────────────────────────────────────────────
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ─── Textura procedural para brasas atmosféricas ──────────────────
function makeEmberTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, "rgba(255,210,150,1)");
  g.addColorStop(0.4, "rgba(255,160,90,0.4)");
  g.addColorStop(1, "rgba(255,130,70,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function LoadingDoor() {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef({});
  const [pct, setPct] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  // ─── Setup Three.js ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    // Niebla muy lejana → el grid se desvanece hacia el horizonte
    scene.fog = new THREE.Fog(0x000000, 6, 22);

    // Cámara con FOV cinematográfico (35° ≈ 70mm). Compresión espacial
    // que hace la figura central protagonista.
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(0, 0.5, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const disposables = [];

    // ─── FIGURA WIREFRAME CENTRAL ────────────────────────────────
    // Icosaedro (20 caras, 30 aristas) → limpio, reconocible, simétrico.
    const figureGeom = new THREE.IcosahedronGeometry(1.0, 0);
    const figureEdges = new THREE.EdgesGeometry(figureGeom);
    const figureLineMat = new THREE.LineBasicMaterial({
      color: 0xff9a4a,
      transparent: true,
      opacity: 0.92,
    });
    const figure = new THREE.LineSegments(figureEdges, figureLineMat);
    disposables.push(figureGeom, figureEdges, figureLineMat);

    // Vértices marcados con pequeños puntos → más peso visual
    const vertexPositions = [];
    const positionAttr = figureGeom.attributes.position;
    for (let i = 0; i < positionAttr.count; i++) {
      vertexPositions.push(
        positionAttr.getX(i),
        positionAttr.getY(i),
        positionAttr.getZ(i)
      );
    }
    const vertexGeom = new THREE.BufferGeometry();
    vertexGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertexPositions, 3)
    );
    const vertexMat = new THREE.PointsMaterial({
      color: 0xffd49a,
      size: 0.045,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1,
    });
    const vertexPoints = new THREE.Points(vertexGeom, vertexMat);
    disposables.push(vertexGeom, vertexMat);

    // Halo esférico aditivo sutil. Se intensifica al completar la carga.
    const haloGeom = new THREE.SphereGeometry(1.05, 32, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff9a4a,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    disposables.push(haloGeom, haloMat);

    // Agrupa para rotar todo junto
    const figureGroup = new THREE.Group();
    figureGroup.add(figure, vertexPoints, halo);
    scene.add(figureGroup);

    // ─── GRID DE PERSPECTIVA ────────────────────────────────────
    // Suelo plano bajo la figura. Cae hacia el horizonte y se funde
    // con la niebla, dando profundidad sin entorno.
    const gridSize = 24;
    const gridDivs = 24;
    const grid = new THREE.GridHelper(gridSize, gridDivs, 0xff7a3a, 0xff7a3a);
    grid.material.transparent = true;
    grid.material.opacity = 0.09;
    grid.position.y = -1.4;
    scene.add(grid);
    disposables.push(grid.geometry, grid.material);

    // ─── BRASAS ATMOSFÉRICAS ────────────────────────────────────
    // Puntos cálidos distribuidos alrededor de la figura. Solo 40 para
    // que no saturen. Pulsan suavemente.
    const emberCount = 40;
    const emberGeom = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    const emberSeed = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 3;
      emberPos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      emberPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.5; // achatado
      emberPos[i * 3 + 2] = r * Math.cos(phi);
      emberSeed[i] = Math.random() * 1000;
    }
    emberGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(emberPos, 3)
    );

    const emberTex = makeEmberTexture();
    const emberMat = new THREE.PointsMaterial({
      map: emberTex,
      color: 0xffc890,
      size: 0.09,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const embers = new THREE.Points(emberGeom, emberMat);
    scene.add(embers);
    disposables.push(emberGeom, emberMat, emberTex);

    // ─── FLASH PROCEDURAL ───────────────────────────────────────
    // Para el momento de "liberación" al 100%. Empieza invisible.
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffd8a0,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const flashGeom = new THREE.PlaneGeometry(8, 8);
    const flashMesh = new THREE.Mesh(flashGeom, flashMat);
    flashMesh.position.set(0, 0, 0.5);
    flashMesh.lookAt(camera.position);
    scene.add(flashMesh);
    disposables.push(flashGeom, flashMat);

    // ─── ESTADO COMPARTIDO ──────────────────────────────────────
    stateRef.current = {
      camera,
      figureGroup,
      figureLineMat,
      vertexMat,
      haloMat,
      grid,
      embers,
      emberPos,
      emberSeed,
      emberMat,
      flashMat,
      flashMesh,
      entering: false,
      enterStart: 0,
      currentPct: 0,
    };

    // ─── LOOP de render ─────────────────────────────────────────
    let animId;
    let lastTime = performance.now();
    const animate = (now) => {
      const t = now / 1000;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const s = stateRef.current;

      // Pulse sutil de las brasas: drift orbital muy lento + parpadeo
      const eAttr = s.embers.geometry.attributes.position;
      const eArr = eAttr.array;
      for (let i = 0; i < emberCount; i++) {
        const seed = s.emberSeed[i];
        eArr[i * 3 + 0] += Math.sin(t * 0.12 + seed) * 0.0006;
        eArr[i * 3 + 1] += Math.cos(t * 0.1 + seed * 0.7) * 0.0004;
      }
      eAttr.needsUpdate = true;

      if (!s.entering) {
        // ROTACIÓN CONTINUA: lenta, en dos ejes para percepción 3D
        s.figureGroup.rotation.y += dt * 0.22;
        s.figureGroup.rotation.x += dt * 0.07;

        // Halo respira muy sutilmente
        s.haloMat.opacity = 0.04 + Math.sin(t * 1.2) * 0.018;

        // Aristas refuerzan opacidad con el progreso de carga (la figura
        // se "energiza" conforme la carga avanza)
        let baseLineOp = 0.78 + s.currentPct * 0.18;
        // Pulse de líneas: cada ~2.5s un breve flash global
        const pulse = Math.max(0, Math.sin(t * 1.3));
        const pulseBoost = Math.pow(pulse, 8) * 0.25;
        s.figureLineMat.opacity = Math.min(1, baseLineOp + pulseBoost);

        // Brasas pulsan suavemente
        s.emberMat.opacity = 0.45 + Math.sin(t * 0.8) * 0.15;
      } else {
        // ──── FASE DE LIBERACIÓN ────
        // 1) Anticipación (0–25%): la figura se contrae ligeramente,
        //    como tomando aire.
        // 2) Expansión (25–70%): scale explota hacia afuera, aristas
        //    se desvanecen, halo crece.
        // 3) Liberación (70–100%): flash domina, todo se disuelve.
        const elapsed = now - s.enterStart;
        const p = Math.min(1, elapsed / ENTER_DURATION_MS);

        let scaleMul, lineOpacity, haloOpacity, flashOpacity;
        if (p < 0.25) {
          const tt = p / 0.25;
          scaleMul = 1 - tt * 0.06; // 1.00 → 0.94
          lineOpacity = 0.95;
          haloOpacity = 0.05 + tt * 0.06;
          flashOpacity = 0;
        } else if (p < 0.7) {
          const tt = (p - 0.25) / 0.45;
          const eased = easeOutQuart(tt);
          scaleMul = 0.94 + eased * 0.6; // 0.94 → 1.54
          lineOpacity = 0.95 * (1 - eased * 0.8);
          haloOpacity = 0.11 + eased * 0.35;
          flashOpacity = eased * 0.4;
        } else {
          const tt = (p - 0.7) / 0.3;
          const eased = easeInOutCubic(tt);
          scaleMul = 1.54 + eased * 0.5; // 1.54 → 2.04
          lineOpacity = Math.max(0, 0.2 * (1 - eased * 1.5));
          haloOpacity = 0.46 * (1 - eased * 0.7);
          flashOpacity = 0.4 + eased * 0.5;
        }

        s.figureGroup.scale.setScalar(scaleMul);
        s.figureGroup.rotation.y += dt * (0.22 + p * 1.2); // acelera al final
        s.figureLineMat.opacity = lineOpacity;
        s.vertexMat.opacity = lineOpacity;
        s.haloMat.opacity = haloOpacity;
        s.flashMat.opacity = flashOpacity;
        s.flashMesh.lookAt(s.camera.position);

        // El grid se difumina con la liberación: la figura ya no
        // necesita anclaje porque está disolviéndose
        s.grid.material.opacity = Math.max(0, 0.09 * (1 - p * 1.3));

        // Brasas: se intensifican y luego desvanecen
        if (p < 0.7) {
          s.emberMat.opacity = 0.45 + p * 0.55;
        } else {
          s.emberMat.opacity = Math.max(0, 1 - (p - 0.7) / 0.3);
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
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
    };
  }, []);

  // ─── Trigger de salida ───────────────────────────────────────────
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
        // El HUD se desvanece durante la liberación, no junto al wrapper.
        // Evita solape con "DESLIZA PARA COMENZAR" del Hero.
        setIsEntering(true);
        setTimeout(() => {
          if (wrapperRef.current) wrapperRef.current.style.opacity = "0";
          setTimeout(() => setHidden(true), FADE_OUT_MS);
        }, ENTER_DURATION_MS + 60);
      }, wait);
    };

    const unsub = subscribeProgress((p, done) => {
      setPct(p);
      if (stateRef.current) stateRef.current.currentPct = p;
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
    <div ref={wrapperRef} className="loading-glyph" aria-hidden="true">
      <canvas ref={canvasRef} className="loading-glyph__canvas" />

      {/* Marca discreta top-left — referencia tipográfica */}
      <div
        className={`loading-glyph__mark${isEntering ? " is-fading" : ""}`}
      >
        <span className="loading-glyph__mark-bullet" />
        <span className="loading-glyph__mark-label">D / LL</span>
      </div>

      {/* HUD inferior */}
      <div
        className={`loading-glyph__hud${isEntering ? " is-fading" : ""}`}
      >
        <div className="loading-glyph__caption">PREPARANDO LA ESCENA</div>
        <div className="loading-glyph__bar">
          <div
            className="loading-glyph__bar-fill"
            style={{ transform: `scaleX(${pct})` }}
          />
        </div>
        <div className="loading-glyph__pct">
          {String(pctDisplay).padStart(3, "0")}
          <span className="loading-glyph__pct-suffix">%</span>
        </div>
      </div>

      <style>{`
        .loading-glyph {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #000;
          opacity: 1;
          transition: opacity ${FADE_OUT_MS}ms ease-out;
        }
        .loading-glyph__canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }

        /* Marca top-left — pequeña ancla tipográfica */
        .loading-glyph__mark {
          position: absolute;
          top: 32px;
          left: 36px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 10;
          font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', ui-monospace, monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.32em;
          color: rgba(245, 228, 205, 0.55);
          transition: opacity 700ms ease-out;
        }
        .loading-glyph__mark.is-fading { opacity: 0; }
        .loading-glyph__mark-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 154, 74, 0.85);
          box-shadow: 0 0 10px rgba(255, 154, 74, 0.55);
        }

        /* HUD inferior */
        .loading-glyph__hud {
          position: absolute;
          left: 50%;
          bottom: 60px;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          z-index: 10;
          transition: opacity 900ms ease-out;
        }
        .loading-glyph__hud.is-fading { opacity: 0; }

        .loading-glyph__caption {
          font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', ui-monospace, monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.42em;
          color: rgba(235, 218, 195, 0.55);
          text-shadow: 0 0 14px rgba(255, 160, 90, 0.18);
        }
        .loading-glyph__bar {
          position: relative;
          width: 260px;
          height: 1px;
          background: rgba(255, 235, 210, 0.07);
          overflow: hidden;
        }
        .loading-glyph__bar-fill {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg,
            rgba(255, 160, 90, 0.85),
            rgba(255, 210, 150, 1));
          transform-origin: left center;
          transform: scaleX(0);
          transition: transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1);
          box-shadow: 0 0 14px rgba(255, 175, 100, 0.55);
        }
        .loading-glyph__pct {
          font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', ui-monospace, monospace;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.28em;
          color: rgba(245, 228, 205, 0.78);
          text-shadow: 0 0 12px rgba(255, 175, 100, 0.28);
          display: flex;
          align-items: baseline;
          gap: 2px;
        }
        .loading-glyph__pct-suffix {
          font-size: 8px;
          opacity: 0.5;
          letter-spacing: 0.1em;
          margin-left: 4px;
        }

        @media (max-width: 767px) {
          .loading-glyph__mark { top: 20px; left: 20px; font-size: 9px; }
          .loading-glyph__hud {
            bottom: max(36px, env(safe-area-inset-bottom));
            gap: 14px;
          }
          .loading-glyph__bar { width: 180px; }
          .loading-glyph__caption { font-size: 9px; letter-spacing: 0.32em; }
        }

        @media (prefers-reduced-motion: reduce) {
          .loading-glyph__bar-fill { transition: none; }
        }
      `}</style>
    </div>
  );
}