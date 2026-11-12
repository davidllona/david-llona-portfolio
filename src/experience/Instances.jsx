import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Muchas copias de una misma pieza en una sola llamada de dibujo.
// `items`: [{ position, rotation?, scale?, color? }]. Las propiedades de malla
// (castShadow, receiveShadow…) se pasan tal cual.
export function Instances({ geometry, material, items, colored = false, ...props }) {
 const mesh = useRef(null);
 const helper = useMemo(() => new THREE.Object3D(), []);

 useLayoutEffect(() => {
  const color = new THREE.Color();
  items.forEach((item, i) => {
   helper.position.set(...item.position);
   helper.rotation.set(...(item.rotation ?? [0, 0, 0]));
   const scale = item.scale ?? 1;
   if (Array.isArray(scale)) helper.scale.set(...scale);
   else helper.scale.setScalar(scale);
   helper.updateMatrix();
   mesh.current.setMatrixAt(i, helper.matrix);
   if (colored) mesh.current.setColorAt(i, color.set(item.color));
  });
  mesh.current.instanceMatrix.needsUpdate = true;
  if (colored) mesh.current.instanceColor.needsUpdate = true;
  // Las copias están repartidas por toda la isla: se calcula su envoltura real.
  mesh.current.computeBoundingSphere();
 }, [items, helper, colored]);

 return <instancedMesh ref={mesh} args={[geometry, material, items.length]} {...props} />;
}
