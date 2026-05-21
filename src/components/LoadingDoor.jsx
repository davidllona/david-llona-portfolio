import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { subscribeProgress } from "../3d/loadingManager";



const MIN_DISPLAY_MS = 2000;
const MAX_WAIT_MS = 9000;
const PRE_ENTER_DELAY_MS = 400;
const ENTER_DURATION_MS = 1600; 
const FADE_OUT_MS = 700;


const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;


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


function LoadingDoorMobile({ onComplete }) {
  const wrapperRef = useRef(null);
  const barFillRef = useRef(null);
  const pctTextRef = useRef(null);
  const [pct, setPct] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  useEffect(() => {
    let triggered = false;
    let realPct = 0;
    let realDone = false;
    let rafId = null;
    const startedAt = performance.now();

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setPct(1);

      setTimeout(() => {
        setIsLeaving(true);
        if (typeof onComplete === "function") onComplete();
        setTimeout(() => {
          if (wrapperRef.current) wrapperRef.current.style.opacity = "0";
          setTimeout(() => setHidden(true), FADE_OUT_MS);
        }, 600);
      }, PRE_ENTER_DELAY_MS);
    };

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const timeProgress = Math.min(elapsed / MIN_DISPLAY_MS, 1);
      const displayPct = Math.min(realPct, timeProgress);
      if (barFillRef.current) {
        barFillRef.current.style.transform = `scaleX(${displayPct})`;
      }
      if (pctTextRef.current) {
        pctTextRef.current.textContent = String(
          Math.round(displayPct * 100),
        ).padStart(3, "0");
      }


      if (realDone && displayPct >= 0.999) {
        trigger();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const unsub = subscribeProgress((p, done) => {
      realPct = p;
      if (done) realDone = true;
    });


    const safetyId = setTimeout(() => {
      realPct = 1;
      realDone = true;
    }, MAX_WAIT_MS);

    return () => {
      unsub();
      clearTimeout(safetyId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [onComplete]);


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
    <div ref={wrapperRef} className="loading-mobile" aria-hidden="true">
      {}
      <div className={`loading-mobile__mark${isLeaving ? " is-fading" : ""}`}>
        <span className="loading-mobile__mark-bullet" />
        <span className="loading-mobile__mark-label">D / LL</span>
      </div>

      {}
      <div className={`loading-mobile__ring-wrap${isLeaving ? " is-leaving" : ""}`}>
        <div className="loading-mobile__ring loading-mobile__ring--outer" />
        <div className="loading-mobile__ring loading-mobile__ring--mid" />
        <div className="loading-mobile__ring loading-mobile__ring--inner" />
        <div className="loading-mobile__core" />
      </div>

      {}
      <div className={`loading-mobile__hud${isLeaving ? " is-fading" : ""}`}>
        <div className="loading-mobile__caption">PREPARANDO LA ESCENA</div>
        <div className="loading-mobile__bar">
          <div
            ref={barFillRef}
            className="loading-mobile__bar-fill"
          />
        </div>
        <div className="loading-mobile__pct">
          <span ref={pctTextRef}>{String(pctDisplay).padStart(3, "0")}</span>
          <span className="loading-mobile__pct-suffix">%</span>
        </div>
      </div>

      <style>{`
        .loading-mobile {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #000;
          opacity: 1;
          transition: opacity ${FADE_OUT_MS}ms ease-out;
          overflow: hidden;
        }

        
        .loading-mobile::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 154, 74, 0.04) 0%,
            transparent 60%
          );
          pointer-events: none;
        }

        
        .loading-mobile__mark {
          position: absolute;
          top: 20px;
          left: 22px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 10;
          font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', ui-monospace, monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.32em;
          color: rgba(245, 228, 205, 0.55);
          transition: opacity 700ms ease-out;
        }
        .loading-mobile__mark.is-fading { opacity: 0; }
        .loading-mobile__mark-bullet {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(255, 154, 74, 0.85);
          box-shadow: 0 0 8px rgba(255, 154, 74, 0.55);
        }

        
        .loading-mobile__ring-wrap {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 160px;
          height: 160px;
          transform: translate(-50%, -50%);
          transition: transform 700ms cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 700ms ease-out;
        }
        .loading-mobile__ring-wrap.is-leaving {
          transform: translate(-50%, -50%) scale(1.6);
          opacity: 0;
        }

        .loading-mobile__ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(255, 154, 74, 0.5);
          box-shadow:
            0 0 24px rgba(255, 154, 74, 0.15),
            inset 0 0 24px rgba(255, 154, 74, 0.06);
        }
        .loading-mobile__ring--outer {
          animation: ring-breathe-outer 3.6s ease-in-out infinite;
        }
        .loading-mobile__ring--mid {
          inset: 20px;
          border-color: rgba(255, 175, 105, 0.35);
          animation: ring-breathe-mid 3.6s ease-in-out infinite 0.4s;
        }
        .loading-mobile__ring--inner {
          inset: 44px;
          border-color: rgba(255, 200, 145, 0.25);
          animation: ring-breathe-inner 3.6s ease-in-out infinite 0.8s;
        }
        .loading-mobile__core {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 210, 150, 0.95);
          transform: translate(-50%, -50%);
          box-shadow:
            0 0 18px rgba(255, 175, 100, 0.7),
            0 0 36px rgba(255, 154, 74, 0.35);
          animation: core-pulse 2.4s ease-in-out infinite;
        }

        @keyframes ring-breathe-outer {
          0%, 100% { transform: scale(1);    opacity: 0.65; }
          50%      { transform: scale(1.08); opacity: 1;    }
        }
        @keyframes ring-breathe-mid {
          0%, 100% { transform: scale(1);    opacity: 0.55; }
          50%      { transform: scale(1.12); opacity: 0.9;  }
        }
        @keyframes ring-breathe-inner {
          0%, 100% { transform: scale(1);    opacity: 0.45; }
          50%      { transform: scale(1.18); opacity: 0.85; }
        }
        @keyframes core-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1);   opacity: 0.9; }
          50%      { transform: translate(-50%, -50%) scale(1.4); opacity: 1;   }
        }

        
        .loading-mobile__hud {
          position: absolute;
          left: 50%;
          bottom: max(56px, env(safe-area-inset-bottom));
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          z-index: 10;
          transition: opacity 600ms ease-out;
        }
        .loading-mobile__hud.is-fading { opacity: 0; }

        .loading-mobile__caption {
          font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', ui-monospace, monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.32em;
          color: rgba(235, 218, 195, 0.55);
        }
        .loading-mobile__bar {
          position: relative;
          width: 180px;
          height: 1px;
          background: rgba(255, 235, 210, 0.07);
          overflow: hidden;
        }
        .loading-mobile__bar-fill {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg,
            rgba(255, 160, 90, 0.85),
            rgba(255, 210, 150, 1));
          transform-origin: left center;
          transform: scaleX(0);
          
          box-shadow: 0 0 12px rgba(255, 175, 100, 0.5);
        }
        .loading-mobile__pct {
          font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', ui-monospace, monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.28em;
          color: rgba(245, 228, 205, 0.78);
          display: flex;
          align-items: baseline;
        }
        .loading-mobile__pct-suffix {
          font-size: 7px;
          opacity: 0.5;
          letter-spacing: 0.1em;
          margin-left: 4px;
        }

        @media (prefers-reduced-motion: reduce) {
          .loading-mobile__ring,
          .loading-mobile__core { animation: none; }
          .loading-mobile__bar-fill { transition: none; }
        }
      `}</style>
    </div>
  );
}

export function LoadingDoor({ onComplete }) {
  
  const isMobile =
    typeof window !== "undefined" &&
    (window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
      window.innerWidth < 768 ||
      "ontouchstart" in window);

  if (isMobile) return <LoadingDoorMobile onComplete={onComplete} />;
  const wrapperRef = useRef(null);
  const stateRef = useRef({});
  const [pct, setPct] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [isEntering, setIsEntering] = useState(false);


  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;


    const canvas = document.createElement("canvas");
    canvas.className = "loading-glyph__canvas";
  
    wrapper.insertBefore(canvas, wrapper.firstChild);

    const w = window.innerWidth;
    const h = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    scene.fog = new THREE.Fog(0x000000, 6, 22);

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
    const isMobile = window.innerWidth < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const disposables = [];


    const figureGeom = new THREE.IcosahedronGeometry(1.0, 0);
    const figureEdges = new THREE.EdgesGeometry(figureGeom);
    const figureLineMat = new THREE.LineBasicMaterial({
      color: 0xff9a4a,
      transparent: true,
      opacity: 0.92,
    });
    const figure = new THREE.LineSegments(figureEdges, figureLineMat);
    disposables.push(figureGeom, figureEdges, figureLineMat);

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


    const figureGroup = new THREE.Group();
    figureGroup.add(figure, vertexPoints, halo);
    scene.add(figureGroup);




    const gridSize = 24;
    const gridDivs = 24;
    const grid = new THREE.GridHelper(gridSize, gridDivs, 0xff7a3a, 0xff7a3a);
    grid.material.transparent = true;
    grid.material.opacity = 0.09;
    grid.position.y = -1.4;
    scene.add(grid);
    disposables.push(grid.geometry, grid.material);




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


    let animId;
    let lastTime = performance.now();
    const animate = (now) => {
      const t = now / 1000;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const s = stateRef.current;


      const eAttr = s.embers.geometry.attributes.position;
      const eArr = eAttr.array;
      for (let i = 0; i < emberCount; i++) {
        const seed = s.emberSeed[i];
        eArr[i * 3 + 0] += Math.sin(t * 0.12 + seed) * 0.0006;
        eArr[i * 3 + 1] += Math.cos(t * 0.1 + seed * 0.7) * 0.0004;
      }
      eAttr.needsUpdate = true;

      if (!s.entering) {

        s.figureGroup.rotation.y += dt * 0.22;
        s.figureGroup.rotation.x += dt * 0.07;


        s.haloMat.opacity = 0.04 + Math.sin(t * 1.2) * 0.018;



        let baseLineOp = 0.78 + s.currentPct * 0.18;

        const pulse = Math.max(0, Math.sin(t * 1.3));
        const pulseBoost = Math.pow(pulse, 8) * 0.25;
        s.figureLineMat.opacity = Math.min(1, baseLineOp + pulseBoost);


        s.emberMat.opacity = 0.45 + Math.sin(t * 0.8) * 0.15;
      } else {






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



        s.grid.material.opacity = Math.max(0, 0.09 * (1 - p * 1.3));


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













      try {
        renderer.forceContextLoss();
      } catch {

      }
      renderer.dispose();





      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, []);












  useEffect(() => {
    let triggered = false;
    let realPct = 0;
    let realDone = false;
    let rafId = null;
    const startedAt = performance.now();

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setPct(1);
      if (stateRef.current) stateRef.current.currentPct = 1;

      setTimeout(() => {
        if (stateRef.current?.camera) {
          stateRef.current.entering = true;
          stateRef.current.enterStart = performance.now();
        }


        setIsEntering(true);




        if (typeof onComplete === "function") onComplete();
        setTimeout(() => {
          if (wrapperRef.current) wrapperRef.current.style.opacity = "0";
          setTimeout(() => setHidden(true), FADE_OUT_MS);
        }, ENTER_DURATION_MS + 60);
      }, PRE_ENTER_DELAY_MS);
    };

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const timeProgress = Math.min(elapsed / MIN_DISPLAY_MS, 1);
      const displayPct = Math.min(realPct, timeProgress);
      setPct(displayPct);
      if (stateRef.current) stateRef.current.currentPct = displayPct;

      if (realDone && displayPct >= 0.999) {
        trigger();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const unsub = subscribeProgress((p, done) => {
      realPct = p;
      if (done) realDone = true;
    });

    const safetyId = setTimeout(() => {
      realPct = 1;
      realDone = true;
    }, MAX_WAIT_MS);

    return () => {
      unsub();
      clearTimeout(safetyId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [onComplete]);


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
      {}

      {}
      <div
        className={`loading-glyph__mark${isEntering ? " is-fading" : ""}`}
      >
        <span className="loading-glyph__mark-bullet" />
        <span className="loading-glyph__mark-label">D / LL</span>
      </div>

      {}
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