import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { createLabelTexture } from "./textures";

// Rótulo de texto en la escena.
//  · `plate`: blanco sobre placa oscura (si no, texto de color con contorno).
//  · `billboard`: gira para mirar siempre a la cámara.
//  · `flat`: tumbado en el suelo, para leerlo desde arriba.
export function Label({ text, color, width, position, rotY = 0, plate = false, billboard = false, flat = false }) {
 const mesh = useRef(null);
 const texture = useMemo(() => createLabelTexture(text, color, { plate }), [text, color, plate]);
 useEffect(() => () => texture.dispose(), [texture]);

 useFrame(({ camera }) => {
  if (billboard) mesh.current.quaternion.copy(camera.quaternion);
 });

 return (
  <mesh ref={mesh} position={position} rotation={flat ? [-Math.PI / 2, 0, 0] : [0, rotY, 0]}>
   <planeGeometry args={[width, width / 4]} />
   <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} fog={false} />
  </mesh>
 );
}
