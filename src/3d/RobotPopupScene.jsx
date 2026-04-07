import { Canvas, useFrame } from "@react-three/fiber";
import { OrthographicCamera, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function findFirstByNames(root, names) {
  for (const name of names) {
    const found = root.getObjectByName(name);
    if (found) return found;
  }
  return null;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function createSoftParticleTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );

  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.6, "rgba(255,255,255,0.25)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function StarField() {
  const materialRef = useRef();
  const pointsRef = useRef();

  const texture = useMemo(() => createSoftParticleTexture(), []);

  const { positions, sizes } = useMemo(() => {
    const count = 140;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;

      positions[i3] = (Math.random() - 0.5) * 7.2;
      positions[i3 + 1] = (Math.random() - 0.5) * 5.8;
      positions[i3 + 2] = -1.5 - Math.random() * 2;

      sizes[i] = randomRange(0.8, 2.3);
    }

    return { positions, sizes };
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (pointsRef.current) {
      pointsRef.current.rotation.z = Math.sin(t * 0.04) * 0.015;
    }

    if (materialRef.current) {
      materialRef.current.opacity = 0.34 + Math.sin(t * 0.55) * 0.03;
    }
  });

  return (
    <points ref={pointsRef} position={[0, 0, -1.8]}>
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
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uMap: { value: texture },
          uOpacity: { value: 0.35 },
        }}
        vertexShader={`
          attribute float size;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 2.2;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform sampler2D uMap;
          uniform float uOpacity;

          void main() {
            vec4 tex = texture2D(uMap, gl_PointCoord);
            gl_FragColor = vec4(tex.rgb, tex.a * uOpacity);
          }
        `}
      />
    </points>
  );
}

function MiniGalaxy({
  position = [0, 0, -2.2],
  radius = 0.55,
  branches = 3,
  spin = 1.2,
  count = 130,
  colorInside = "#ffffff",
  colorOutside = "#f58a5c",
  scale = 1,
}) {
  const ref = useRef();
  const texture = useMemo(() => createSoftParticleTexture(), []);

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const inside = new THREE.Color(colorInside);
    const outside = new THREE.Color(colorOutside);
    const mixed = new THREE.Color();

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;

      const r = Math.pow(Math.random(), 0.85) * radius;
      const branchAngle = ((i % branches) / branches) * Math.PI * 2;
      const spinAngle = r * spin;
      const randomOffset = (Math.random() - 0.5) * 0.12;

      const angle = branchAngle + spinAngle + randomOffset;

      positions[i3] = Math.cos(angle) * r * scale + (Math.random() - 0.5) * 0.02;
      positions[i3 + 1] = Math.sin(angle) * r * scale + (Math.random() - 0.5) * 0.02;
      positions[i3 + 2] = (Math.random() - 0.5) * 0.04;

      mixed.copy(inside).lerp(outside, r / radius);

      colors[i3] = mixed.r;
      colors[i3 + 1] = mixed.g;
      colors[i3 + 2] = mixed.b;

      sizes[i] = randomRange(1.3, 3.2);
    }

    return { positions, colors, sizes };
  }, [branches, colorInside, colorOutside, count, radius, scale, spin]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) ref.current.rotation.z = t * 0.04;
  });

  return (
    <points ref={ref} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colors}
          count={colors.length / 3}
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
        vertexColors
        uniforms={{
          uMap: { value: texture },
        }}
        vertexShader={`
          attribute float size;
          varying vec3 vColor;

          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform sampler2D uMap;
          varying vec3 vColor;

          void main() {
            vec4 tex = texture2D(uMap, gl_PointCoord);
            gl_FragColor = vec4(vColor, tex.a * 0.85);
          }
        `}
      />
    </points>
  );
}

function Comet({ delay = 0, tint = "#ffffff" }) {
  const headRef = useRef();
  const glowRef = useRef();
  const tailRef = useRef();

  const headTexture = useMemo(() => createSoftParticleTexture(), []);

  const configRef = useRef({
    startX: 0,
    startY: 0,
    velX: 0,
    velY: 0,
    bornAt: delay,
    life: 1.8,
    size: 0.08,
  });

  const maxTrail = 22;
  const trailPositions = useMemo(() => new Float32Array(maxTrail * 3), []);
  const trailOpacity = useMemo(() => new Float32Array(maxTrail), []);

  function respawn(now) {
    configRef.current.startX = randomRange(-3.1, 3.1);
    configRef.current.startY = randomRange(-3.2, -0.9);
    configRef.current.velX = randomRange(-0.18, 0.18);
    configRef.current.velY = randomRange(1.35, 2.2);
    configRef.current.bornAt = now + randomRange(0.25, 1.9);
    configRef.current.life = randomRange(1.15, 1.95);
    configRef.current.size = randomRange(0.06, 0.11);
  }

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const c = configRef.current;

    if (t < c.bornAt) {
      if (headRef.current) headRef.current.material.opacity = 0;
      if (glowRef.current) glowRef.current.material.opacity = 0;
      if (tailRef.current) tailRef.current.material.uniforms.uGlobalOpacity.value = 0;
      return;
    }

    const age = t - c.bornAt;
    const progress = age / c.life;

    if (progress >= 1) {
      respawn(t);
      return;
    }

    const x = c.startX + c.velX * age;
    const y = c.startY + c.velY * age;

    const fadeIn = Math.min(progress / 0.1, 1);
    const fadeOut = Math.min((1 - progress) / 0.18, 1);
    const alpha = Math.min(fadeIn, fadeOut);

    if (headRef.current) {
      headRef.current.position.set(x, y, -1.05);
      headRef.current.scale.setScalar(c.size);
      headRef.current.material.opacity = alpha;
    }

    if (glowRef.current) {
      glowRef.current.position.set(x, y, -1.08);
      glowRef.current.scale.setScalar(c.size * 3.6);
      glowRef.current.material.opacity = alpha * 0.28;
    }

    for (let i = 0; i < maxTrail; i += 1) {
      const p = i / maxTrail;
      const tx = x - c.velX * p * 0.42;
      const ty = y - c.velY * p * 0.42;

      const i3 = i * 3;
      trailPositions[i3] = tx;
      trailPositions[i3 + 1] = ty;
      trailPositions[i3 + 2] = -1.1 - p * 0.01;
      trailOpacity[i] = alpha * (1 - p) * 0.65;
    }

    if (tailRef.current) {
      tailRef.current.geometry.attributes.position.needsUpdate = true;
      tailRef.current.geometry.attributes.aOpacity.needsUpdate = true;
      tailRef.current.material.uniforms.uGlobalOpacity.value = 1;
    }
  });

  useEffect(() => {
    respawn(0);
  }, []);

  return (
    <>
      <sprite ref={glowRef} scale={[0.35, 0.35, 0.35]}>
        <spriteMaterial
          map={headTexture}
          color={tint}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <sprite ref={headRef} scale={[0.1, 0.1, 0.1]}>
        <spriteMaterial
          map={headTexture}
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <points ref={tailRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={trailPositions}
            count={trailPositions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aOpacity"
            array={trailOpacity}
            count={trailOpacity.length}
            itemSize={1}
          />
        </bufferGeometry>

        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uMap: { value: headTexture },
            uGlobalOpacity: { value: 0 },
            uColor: { value: new THREE.Color(tint) },
          }}
          vertexShader={`
            attribute float aOpacity;
            varying float vOpacity;

            void main() {
              vOpacity = aOpacity;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = 7.0;
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            uniform sampler2D uMap;
            uniform float uGlobalOpacity;
            uniform vec3 uColor;
            varying float vOpacity;

            void main() {
              vec4 tex = texture2D(uMap, gl_PointCoord);
              gl_FragColor = vec4(uColor, tex.a * vOpacity * uGlobalOpacity);
            }
          `}
        />
      </points>
    </>
  );
}

function CometField() {
  return (
    <>
      <Comet delay={0.2} tint="#f58a5c" />
      <Comet delay={1.1} tint="#ffffff" />
      <Comet delay={2.2} tint="#f58a5c" />
    </>
  );
}

function RobotModel() {
  const group = useRef();
  const robotPivotRef = useRef();
  const robotInnerRef = useRef();

  const { scene } = useGLTF("/modelos/robot_buscando.glb");

  const { clonedScene, modelOffset } = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
      }
    });

    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);

    return {
      clonedScene: clone,
      modelOffset: new THREE.Vector3(-center.x, -center.y, -center.z),
    };
  }, [scene]);

  const eyeRef = useRef(null);
  const initialEyeScale = useRef(null);

  useEffect(() => {
    const eye = findFirstByNames(clonedScene, ["Eye", "Eyes", "eye"]);
    eyeRef.current = eye;

    if (eye) {
      initialEyeScale.current = {
        x: eye.scale.x,
        y: eye.scale.y,
        z: eye.scale.z,
      };
    }
  }, [clonedScene]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    /**
     * MOVIMIENTO GENERAL DEL ROBOT
     * - flotación vertical
     * - micro oscilación lateral
     * - leve inclinación
     */
    if (group.current) {
      group.current.position.x = Math.sin(t * 0.6) * 0.03;
      group.current.position.y = -0.1 + Math.sin(t * 1.05) * 0.08;
      group.current.rotation.z = Math.sin(t * 0.9) * 0.02;
    }

    /**
     * CUERPO SIGUE AL RATÓN
     * state.pointer va de -1 a 1
     * x = horizontal
     * y = vertical
     */
    if (robotPivotRef.current) {
      const targetY = THREE.MathUtils.clamp(state.pointer.x * 0.45, -0.35, 0.35);

      robotPivotRef.current.rotation.y = THREE.MathUtils.lerp(
        robotPivotRef.current.rotation.y,
        targetY,
        0.06
      );
    }

    if (robotInnerRef.current) {
      const idleX = Math.sin(t * 0.8) * 0.03;
      const targetX = THREE.MathUtils.clamp((-state.pointer.y * 0.22) + idleX, -0.18, 0.18);

      robotInnerRef.current.rotation.x = THREE.MathUtils.lerp(
        robotInnerRef.current.rotation.x,
        targetX,
        0.06
      );

      const targetZ = THREE.MathUtils.clamp(state.pointer.x * -0.08, -0.06, 0.06);

      robotInnerRef.current.rotation.z = THREE.MathUtils.lerp(
        robotInnerRef.current.rotation.z,
        targetZ,
        0.05
      );
    }

    /**
     * PARPADEO
     */
    if (eyeRef.current && initialEyeScale.current) {
      const blinkCycle = t % 4.7;
      let blink = 1;

      if (blinkCycle > 3.88 && blinkCycle < 3.98) {
        blink = 0.08;
      } else if (blinkCycle > 4.1 && blinkCycle < 4.16) {
        blink = 0.2;
      }

      eyeRef.current.scale.x = initialEyeScale.current.x;
      eyeRef.current.scale.y = initialEyeScale.current.y * blink;
      eyeRef.current.scale.z = initialEyeScale.current.z;
    }
  });

  return (
    <group ref={group} scale={1.16}>
      <group ref={robotPivotRef}>
        <group ref={robotInnerRef}>
          <primitive
            object={clonedScene}
            position={[modelOffset.x, modelOffset.y, modelOffset.z]}
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/modelos/robot_buscando.glb");

export function RobotPopupScene() {
  return (
    <div className="h-[280px] w-full md:h-[360px]">
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <OrthographicCamera
          makeDefault
          position={[0, 0, 10]}
          zoom={125}
          near={0.1}
          far={100}
        />

        <color attach="background" args={["#050505"]} />

        <ambientLight intensity={1.4} />
        <directionalLight position={[2.7, 3.1, 4]} intensity={1.18} />
        <directionalLight position={[-2.2, 2.2, 3]} intensity={0.62} />
        <directionalLight position={[0, -2, 4]} intensity={0.22} />

        <pointLight
          position={[0.45, 1.1, 3.5]}
          intensity={0.34}
          color="#f58a5c"
        />
        <pointLight
          position={[0, -1.3, 2.8]}
          intensity={0.1}
          color="#ffffff"
        />

        <StarField />

        <MiniGalaxy
          position={[-1.5, 1.05, -2.1]}
          radius={0.42}
          branches={4}
          spin={2.8}
          count={120}
          colorInside="#ffffff"
          colorOutside="#f58a5c"
          scale={1}
        />

        <MiniGalaxy
          position={[1.55, -1.05, -2.2]}
          radius={0.32}
          branches={3}
          spin={2.2}
          count={90}
          colorInside="#ffffff"
          colorOutside="#a855f7"
          scale={1}
        />

        <CometField />
        <RobotModel />
      </Canvas>
    </div>
  );
}