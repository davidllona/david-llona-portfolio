import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, PerspectiveCamera } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * =========================================================
 * CONSTELLATION SCENE
 * =========================================================
 * Reemplaza el grafo SVG/HTML por una escena 3D coherente con
 * el resto del portfolio. Los nodos son puntos de luz (no cajas),
 * las conexiones son líneas tenues, y la cámara responde con
 * parallax + zoom narrativo entre stages.
 * =========================================================
 */

const PRIMARY_HEX = "#f58a5c";
const SCALE = 3.6;

const SIZE_MAP = {
 xl: 0.62,
 lg: 0.50,
 md: 0.40,
 sm: 0.32,
 xs: 0.26,
};

/**
 * Textura blanda compartida — un único canvas reutilizado para
 * todos los puntos de luz (estrellas, nodos, halos).
 */
let _glowTexture = null;
function getGlowTexture() {
 if (_glowTexture) return _glowTexture;

 const size = 128;
 const canvas = document.createElement("canvas");
 canvas.width = size;
 canvas.height = size;

 const ctx = canvas.getContext("2d");
 const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
 gradient.addColorStop(0, "rgba(255,255,255,1)");
 gradient.addColorStop(0.3, "rgba(255,255,255,0.78)");
 gradient.addColorStop(0.6, "rgba(255,255,255,0.18)");
 gradient.addColorStop(1, "rgba(255,255,255,0)");

 ctx.fillStyle = gradient;
 ctx.fillRect(0, 0, size, size);

 _glowTexture = new THREE.CanvasTexture(canvas);
 _glowTexture.needsUpdate = true;
 return _glowTexture;
}

/**
 * Mapeo de coordenadas del dataset (0–100) al espacio 3D.
 * Mantengo el mismo layout visual del grafo original para no
 * romper la composición ya pensada.
 */
function mapToWorld(x, y) {
 return new THREE.Vector3(
  ((x - 50) / 50) * SCALE,
  -((y - 50) / 50) * SCALE * 0.82,
  0
 );
}

/**
 * Estrellas de fondo — pueblan el espacio detrás de la
 * constelación principal, dan sensación de profundidad.
 */
function AmbientStarfield({ count = 140 }) {
 const ref = useRef();
 const texture = useMemo(() => getGlowTexture(), []);

 const { positions, sizes } = useMemo(() => {
  const pos = new Float32Array(count * 3);
  const siz = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
   const i3 = i * 3;
   pos[i3] = (Math.random() - 0.5) * 22;
   pos[i3 + 1] = (Math.random() - 0.5) * 14;
   pos[i3 + 2] = -3 - Math.random() * 5;
   siz[i] = 0.4 + Math.random() * 1.5;
  }

  return { positions: pos, sizes: siz };
 }, [count]);

 useFrame((state) => {
  if (ref.current) {
   ref.current.rotation.z = Math.sin(state.clock.getElapsedTime() * 0.03) * 0.014;
  }
 });

 return (
  <points ref={ref}>
   <bufferGeometry>
    <bufferAttribute
     attach="attributes-position"
     array={positions}
     count={positions.length / 3}
     itemSize={3}
    />
    <bufferAttribute
     attach="attributes-size"
     array={sizes}
     count={sizes.length}
     itemSize={1}
    />
   </bufferGeometry>

   <shaderMaterial
    transparent
    depthWrite={false}
    blending={THREE.AdditiveBlending}
    uniforms={{ uMap: { value: texture }, uOpacity: { value: 0.42 } }}
    vertexShader={`
     attribute float size;
     void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * 4.4;
      gl_Position = projectionMatrix * mv;
     }
    `}
    fragmentShader={`
     uniform sampler2D uMap;
     uniform float uOpacity;
     void main() {
      vec4 t = texture2D(uMap, gl_PointCoord);
      gl_FragColor = vec4(t.rgb, t.a * uOpacity);
     }
    `}
   />
  </points>
 );
}

/**
 * Nebulosa — una sola mancha cálida muy difusa. Aporta calor
 * y profundidad sin meter un acento frío que compita con la paleta.
 */
function Nebula() {
 const texture = useMemo(() => getGlowTexture(), []);

 return (
  <sprite position={[2.5, 0.8, -3.5]} scale={[16, 12, 1]}>
   <spriteMaterial
    map={texture}
    color={PRIMARY_HEX}
    transparent
    opacity={0.07}
    depthWrite={false}
    blending={THREE.AdditiveBlending}
   />
  </sprite>
 );
}

/**
 * SectionStarfield — Campo estelar denso pero con menos
 * carga que el del Lab. Una sola nube de puntos con tres
 * "tiers" baked en los buffers: estrellas lejanas y pequeñas
 * (mayoría), estrellas medias (variadas en tono) y unas pocas
 * brillantes que dan acento. Paleta calibrada al Lab para
 * que la sección se sienta como continuación, no como otra
 * isla. Sin pointer events: ambiente puro.
 */
function SectionStarfield({ count = 580 }) {
 const ref = useRef();
 const texture = useMemo(() => getGlowTexture(), []);

 const { positions, sizes, colors } = useMemo(() => {
  const pos = new Float32Array(count * 3);
  const siz = new Float32Array(count);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
   const i3 = i * 3;

   // Distribución por tiers — 65% lejanas, 30% medias, 5% brillantes.
   // Cada tier tiene su propio rango de tamaño y profundidad para
   // crear sensación de capas sin necesidad de tres <points>.
   const tier = Math.random();

   if (tier < 0.65) {
    pos[i3] = (Math.random() - 0.5) * 32;
    pos[i3 + 1] = (Math.random() - 0.5) * 22;
    pos[i3 + 2] = -10 + Math.random() * 4;
    siz[i] = 0.42 + Math.random() * 0.42;
   } else if (tier < 0.95) {
    pos[i3] = (Math.random() - 0.5) * 28;
    pos[i3 + 1] = (Math.random() - 0.5) * 18;
    pos[i3 + 2] = -7 + Math.random() * 4;
    siz[i] = 0.95 + Math.random() * 0.65;
   } else {
    pos[i3] = (Math.random() - 0.5) * 22;
    pos[i3 + 1] = (Math.random() - 0.5) * 14;
    pos[i3 + 2] = -4 + Math.random() * 2;
    siz[i] = 1.85 + Math.random() * 1.4;
   }

   // Paleta del Lab: blanco dominante, azul pálido y dos
   // calores cálidos para los acentos.
   const cr = Math.random();
   if (cr < 0.74) c.set("#ffffff");
   else if (cr < 0.88) c.set("#cfe7ff");
   else if (cr < 0.96) c.set("#ffd6a5");
   else c.set("#fb923c");

   col[i3] = c.r;
   col[i3 + 1] = c.g;
   col[i3 + 2] = c.b;
  }

  return { positions: pos, sizes: siz, colors: col };
 }, [count]);

 useFrame((state) => {
  if (ref.current) {
   const t = state.clock.getElapsedTime();
   ref.current.rotation.z = Math.sin(t * 0.022) * 0.012;
  }
 });

 return (
  <points ref={ref}>
   <bufferGeometry>
    <bufferAttribute
     attach="attributes-position"
     array={positions}
     count={count}
     itemSize={3}
    />
    <bufferAttribute
     attach="attributes-size"
     array={sizes}
     count={count}
     itemSize={1}
    />
    <bufferAttribute
     attach="attributes-color"
     array={colors}
     count={count}
     itemSize={3}
    />
   </bufferGeometry>

   <shaderMaterial
    transparent
    depthWrite={false}
    blending={THREE.AdditiveBlending}
    vertexColors
    uniforms={{ uMap: { value: texture } }}
    vertexShader={`
     attribute float size;
     varying vec3 vColor;
     varying float vSize;
     void main() {
      vColor = color;
      vSize = size;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * 4.6;
      gl_Position = projectionMatrix * mv;
     }
    `}
    fragmentShader={`
     uniform sampler2D uMap;
     varying vec3 vColor;
     varying float vSize;
     void main() {
      vec4 t = texture2D(uMap, gl_PointCoord);
      // Las estrellas más grandes opacan algo más, las pequeñas
      // se quedan tenues — refuerza la jerarquía de capas.
      float opacity = 0.45 + min(vSize, 2.0) * 0.22;
      gl_FragColor = vec4(vColor, t.a * opacity);
     }
    `}
   />
  </points>
 );
}

/**
 * BackgroundStars — Canvas independiente, full-section, solo
 * estrellas. Sirve para que el fondo de About sea un campo
 * estelar continuo que conecte con la sección de arriba (Lab),
 * en lugar de tener estrellas únicamente en la mitad derecha
 * donde vive la constelación. Sin pointer events: las estrellas
 * son ambiente, no interactúan.
 */
export function BackgroundStars({ count = 580 }) {
 return (
  <Canvas
   dpr={[1, 1.5]}
   gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
   camera={{ position: [0, 0, 8], fov: 60 }}
   style={{ background: "transparent" }}
  >
   <SectionStarfield count={count} />
  </Canvas>
 );
}

/**
 * Nodo individual — halo + core + label en HTML.
 * El halo es decorativo y reacciona al hover.
 * El core es el sprite clickable.
 * El label se renderiza con drei.Html para tener tipografía nítida.
 */
function ConstellationNode({ node, onClick, onHover, onLeave, hidden, compact = false }) {

 const groupRef = useRef();
 const haloRef = useRef();
 const coreRef = useRef();
 const texture = useMemo(() => getGlowTexture(), []);
 const [hovered, setHovered] = useState(false);

// En compact (móvil) amplificamos el nodo sin tocar el SCALE del
 // mapeo: el layout de la composición se mantiene, solo los puntos
 // de luz ganan presencia. 1.5 es el sweet spot — más alto satura
 // la escena, más bajo y se siguen viendo perdidos.
 const sizeBoost = compact ? 1.5 : 1;
 const baseSize = (SIZE_MAP[node.size] || SIZE_MAP.md) * sizeBoost;
 const haloSize = baseSize * 3.5;
 const coreSize = baseSize;
 const tint = node.accent ? PRIMARY_HEX : "#ffffff";

 const worldPos = useMemo(() => mapToWorld(node.x, node.y), [node.x, node.y]);

 useFrame((state) => {
  const t = state.clock.getElapsedTime();
  const visibility = hidden ? 0 : 1;

  // Drift sutil en Z
  if (groupRef.current) {
   const phase = node.x * 0.07 + node.y * 0.05;
   groupRef.current.position.z = Math.sin(t * 0.6 + phase) * 0.06;
  }

  // Halo: opacidad y escala según hover y visibilidad
  if (haloRef.current) {
   const baseHalo = node.accent ? 0.50 : 0.30;
   const targetOpacity = (hovered ? 0.85 : baseHalo) * visibility;
   const m = haloRef.current.material;
   m.opacity = THREE.MathUtils.lerp(m.opacity, targetOpacity, 0.10);

   const targetScale = (hovered ? haloSize * 1.30 : haloSize) * (hidden ? 0.7 : 1);
   const cur = haloRef.current.scale.x;
   haloRef.current.scale.setScalar(THREE.MathUtils.lerp(cur, targetScale, 0.08));
  }

  // Core: opacidad + pulse (solo accent)
  if (coreRef.current) {
   const m = coreRef.current.material;
   m.opacity = THREE.MathUtils.lerp(m.opacity, visibility, 0.10);

   const pulse = node.accent ? 0.94 + Math.sin(t * 2.6) * 0.06 : 1;
   const targetScale = coreSize * pulse * (hidden ? 0.5 : 1);
   const cur = coreRef.current.scale.x;
   coreRef.current.scale.setScalar(THREE.MathUtils.lerp(cur, targetScale, 0.10));
  }
 });

 const handleOver = (e) => {
  if (hidden) return;
  e.stopPropagation();
  document.body.style.cursor = "pointer";
  setHovered(true);
  onHover?.(node);
 };

 const handleOut = (e) => {
  if (hidden) return;
  e?.stopPropagation?.();
  document.body.style.cursor = "auto";
  setHovered(false);
  onLeave?.();
 };

 const handleClick = (e) => {
  if (hidden) return;
  e.stopPropagation();
  onClick?.(node);
 };

const labelFontSizeRaw =
  node.size === "xl" ? 13 : node.size === "lg" ? 12 : node.size === "md" ? 11 : 10.5;
 const labelFontSize = compact ? labelFontSizeRaw + 1.5 : labelFontSizeRaw;

 return (
  <group ref={groupRef} position={worldPos}>
   <sprite ref={haloRef} scale={haloSize}>
    <spriteMaterial
     map={texture}
     color={tint}
     transparent
     opacity={0}
     depthWrite={false}
     blending={THREE.AdditiveBlending}
    />
   </sprite>

   <sprite
    ref={coreRef}
    scale={coreSize}
    onClick={handleClick}
    onPointerOver={handleOver}
    onPointerOut={handleOut}
   >
    <spriteMaterial
     map={texture}
     color={tint}
     transparent
     opacity={0}
     depthWrite={false}
     blending={THREE.AdditiveBlending}
    />
   </sprite>

   <Html
    center
    position={[0, baseSize * 1.55, 0]}
    style={{ pointerEvents: "none", userSelect: "none" }}
    zIndexRange={[10, 0]}
   >
    <div
     style={{
      fontFamily: "inherit",
      fontSize: `${labelFontSize}px`,
      letterSpacing: "0.05em",
      fontWeight: 500,
      color: node.accent
       ? "rgba(245, 138, 92, 0.95)"
       : "rgba(255, 255, 255, 0.92)",
      textShadow: "0 0 14px rgba(0,0,0,0.7), 0 0 4px rgba(0,0,0,0.85)",
      whiteSpace: "nowrap",
      opacity: hidden ? 0 : (hovered || node.accent ? 1 : 0.55),
      transition: "opacity 0.45s ease, color 0.3s ease",
     }}
    >
     {node.label}
    </div>
   </Html>
  </group>
 );
}

/**
 * Línea de conexión — lineBasicMaterial con opacidad animada.
 * Si el hover es uno de sus extremos, la línea se intensifica.
 */
function ConstellationLine({ from, to, hidden, hovered }) {
 const matRef = useRef();

 const geometry = useMemo(() => {
  const g = new THREE.BufferGeometry();
  g.setFromPoints([from, to]);
  return g;
 }, [from, to]);

 useFrame(() => {
  if (matRef.current) {
   const target = hidden ? 0 : (hovered ? 0.32 : 0.13);
   matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, target, 0.08);
  }
 });

 return (
  <line geometry={geometry}>
   <lineBasicMaterial
    ref={matRef}
    color="#ffffff"
    transparent
    opacity={0}
    depthWrite={false}
   />
  </line>
 );
}

function ConstellationLines({ lines, hidden, hoveredNodeId }) {
 return lines.map((line) => {
  const isHovered =
   hoveredNodeId && (line.fromId === hoveredNodeId || line.toId === hoveredNodeId);

  return (
   <ConstellationLine
    key={line.id}
    from={line.from}
    to={line.to}
    hidden={hidden}
    hovered={isHovered}
   />
  );
 });
}

/**
 * Cámara — drift idle + parallax con ratón + zoom narrativo
 * cuando se entra a una skill (stage = "detail").
 *
 * Compensación de aspect:
 *  - Cuando el viewport es ancho (aspect ≥ 1.1): comportamiento clásico.
 *  - Cuando el viewport es estrecho (laptop, móvil rotado, etc.):
 *     · Alejamos la cámara en Z para que la constelación entera entre.
 *     · Bajamos el lookTarget en Y → la constelación sube visualmente
 *       en el frame y queda alineada con el bloque de texto izquierdo.
 */
function CameraRig({ stage, focusPosition, compact = false }) {
 const camera = useThree((state) => state.camera);
 const size = useThree((state) => state.size);
 const targetPos = useRef(new THREE.Vector3(0, 0, 9.5));
 const lookTarget = useRef(new THREE.Vector3(0, 0, 0));
 const tmpLookAt = useRef(new THREE.Vector3());

 useEffect(() => {
  const aspect = size.width / Math.max(size.height, 1);
  // Aspect estrecho → frustum más cerrado horizontalmente → constelación
  // se corta. Compensamos alejando proporcionalmente.
  const aspectFactor = aspect < 1.1 ? 1.1 / Math.max(aspect, 0.55) : 1;
// En móvil acercamos un punto la cámara: el canvas es pequeño y la
  // constelación quedaba flotando en un frame demasiado abierto. 0.86
  // mantiene el conjunto entero dentro del encuadre y da más presencia
  // a cada nodo.
  const compactZoom = compact ? 0.86 : 1;
  const mainZ = 9.5 * aspectFactor * compactZoom;
  const detailZ = 7.6 * aspectFactor * compactZoom;

  // Cuando el aspect es estrecho, el texto vive en la mitad superior
  // y la constelación quedaba visualmente "baja". Miramos un poco
  // hacia abajo para subirla en el frame y alinearla con el texto.
  const yLookOffset = aspect < 1.1 ? -0.6 : 0;

  if (stage === "main") {
   targetPos.current.set(0, 0, mainZ);
   lookTarget.current.set(0, yLookOffset, 0);
  } else if (focusPosition) {
   targetPos.current.set(
    focusPosition.x * 0.22,
    focusPosition.y * 0.22,
    detailZ
   );
   lookTarget.current.set(0, yLookOffset, 0);
  }
  }, [stage, focusPosition, size.width, size.height, compact]);

 useFrame((state) => {
  const t = state.clock.getElapsedTime();
  const idleX = Math.sin(t * 0.18) * 0.08;
  const idleY = Math.cos(t * 0.14) * 0.05;
  const px = state.pointer.x * 0.45;
  const py = state.pointer.y * 0.30;

  camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetPos.current.x + px + idleX, 0.045);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetPos.current.y + py + idleY, 0.045);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetPos.current.z, 0.04);

  tmpLookAt.current.copy(lookTarget.current);
  tmpLookAt.current.x += px * 0.25;
  tmpLookAt.current.y += py * 0.18;
  camera.lookAt(tmpLookAt.current);
 });

 return null;
}

function buildLinesForLayout(layout) {
 return layout.connections
  .map((c) => {
   const fromNode = layout.nodes.find((n) => n.id === c.from);
   const toNode = layout.nodes.find((n) => n.id === c.to);
   if (!fromNode || !toNode) return null;

   return {
    id: `${c.from}-${c.to}`,
    fromId: c.from,
    toId: c.to,
    from: mapToWorld(fromNode.x, fromNode.y),
    to: mapToWorld(toNode.x, toNode.y),
   };
  })
  .filter(Boolean);
}

/**
 * StageGroup — montaje y desmontaje diferido para que las
 * transiciones entre orbit principal y detalle puedan
 * fundirse correctamente sin que el "hidden" mantenga
 * objetos en escena innecesariamente.
 */
function StageGroup({ visible, fadeMs = 650, children }) {
 const [mounted, setMounted] = useState(visible);

 useEffect(() => {
  if (visible) {
   setMounted(true);
   return undefined;
  }
  const timer = setTimeout(() => setMounted(false), fadeMs);
  return () => clearTimeout(timer);
 }, [visible, fadeMs]);

 if (!mounted) return null;
 return <group visible={mounted}>{children}</group>;
}

export function ConstellationScene({
 stage,
 activeMainSkill,
 mainOrbit,
 skillLayouts,
 onMainNodeClick,
 onDetailNodeClick,
 compact = false,
}) {
 const [hoveredId, setHoveredId] = useState(null);

 const detailLayout = skillLayouts[activeMainSkill] || mainOrbit;

 const mainLines = useMemo(() => buildLinesForLayout(mainOrbit), [mainOrbit]);
 const detailLines = useMemo(() => buildLinesForLayout(detailLayout), [detailLayout]);

 const focusPosition = useMemo(() => {
  if (stage === "main") return null;
  const node = mainOrbit.nodes.find((n) => n.id === activeMainSkill);
  if (!node) return null;
  return mapToWorld(node.x, node.y);
 }, [stage, activeMainSkill, mainOrbit]);

 const mainHidden = stage !== "main";
 const detailHidden = stage !== "detail";

 // Limpieza del cursor al desmontar (por si quedó en pointer)
 useEffect(() => {
  return () => {
   document.body.style.cursor = "auto";
  };
 }, []);

 return (
  <Canvas
   dpr={[1, 2]}
   gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
   style={{ background: "transparent" }}
  >
   <PerspectiveCamera makeDefault fov={45} position={[0, 0, 9.5]} near={0.1} far={100} />

   <ambientLight intensity={0.5} />

      <CameraRig stage={stage} focusPosition={focusPosition} compact={compact} />

   <Nebula />

   <StageGroup visible={!mainHidden}>
    <ConstellationLines lines={mainLines} hidden={mainHidden} hoveredNodeId={hoveredId} />
    {mainOrbit.nodes.map((node) => (
     <ConstellationNode
      key={node.id}
      node={node}
      hidden={mainHidden}
      compact={compact}
      onClick={onMainNodeClick}
      onHover={(n) => setHoveredId(n.id)}
      onLeave={() => setHoveredId(null)}
     />
    ))}
   </StageGroup>

   <StageGroup visible={!detailHidden}>
    <ConstellationLines lines={detailLines} hidden={detailHidden} hoveredNodeId={hoveredId} />
    {detailLayout.nodes.map((node) => (
     <ConstellationNode
      key={`d-${node.id}`}
      node={node}
      hidden={detailHidden}
      onClick={onDetailNodeClick}
      onHover={(n) => setHoveredId(n.id)}
      onLeave={() => setHoveredId(null)}
     />
    ))}
   </StageGroup>
  </Canvas>
 );
}