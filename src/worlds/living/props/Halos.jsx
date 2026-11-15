import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { attribute, positionGeometry, uniform } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { bendWorld } from "../../../experience/environment/bend";
import { createGlowTexture } from "../../../experience/textures";
import { registerGlow } from "../../../experience/theme";

// Halos: una mancha de luz suave alrededor de cada punto encendido (el cristal
// de una farola, la lámpara de un cartel), siempre de cara a la cámara. Todos
// los de una misma tanda van en una sola llamada de dibujo. Solo se ven de noche.
//  · points: [[x, y, z], …] · size: diámetro en metros · night: opacidad de noche.
export function Halos({ points, size = 1.4, color = "#ffb060", night = 0.55 }) {
 const glow = useMemo(() => createGlowTexture(), []);
 const basis = useMemo(() => ({ right: uniform(new THREE.Vector3(1, 0, 0)), up: uniform(new THREE.Vector3(0, 1, 0)) }), []);
 const geometry = useMemo(() => {
  const plane = new THREE.PlaneGeometry(1, 1);
  const instanced = new THREE.InstancedBufferGeometry();
  instanced.setAttribute("position", plane.attributes.position);
  instanced.setAttribute("uv", plane.attributes.uv);
  instanced.setIndex(plane.index);
  instanced.setAttribute("centre", new THREE.InstancedBufferAttribute(new Float32Array(points.flat()), 3));
  instanced.instanceCount = points.length;
  instanced.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  return instanced;
 }, [points]);
 const material = useMemo(() => {
  const one = new MeshBasicNodeMaterial({ map: glow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
  // El plano se levanta sobre los ejes de la cámara: siempre se ve de frente.
  // (Su centro se curva con el mundo; el plano no: sigue de cara a la cámara. Ver environment/bend.js.)
  one.userData.flat = true;
  one.positionNode = bendWorld(attribute("centre", "vec3")).add(basis.right.mul(positionGeometry.x.mul(size))).add(basis.up.mul(positionGeometry.y.mul(size)));
  return one;
 }, [glow, color, size, basis]);
 useEffect(() => {
  const stop = registerGlow(material, 0, night, "opacity");
  return () => {
   stop();
   glow.dispose();
   geometry.dispose();
   material.dispose();
  };
 }, [material, geometry, glow, night]);
 useFrame(({ camera }) => {
  basis.right.value.setFromMatrixColumn(camera.matrixWorld, 0);
  basis.up.value.setFromMatrixColumn(camera.matrixWorld, 1);
 });
 return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />;
}
