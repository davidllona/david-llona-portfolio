import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { trailAt, updateTrail } from "./environment/trail";
import { startGust, updateWind, windDebug } from "./environment/wind";
import { player, rig, woody } from "./state";
import { current, sunDirection, updateTheme } from "./theme";

// Para depurar en la consola y para las pruebas automáticas.
if (import.meta.env.DEV) window.__world.env = { ...windDebug, startGust, trailAt };

const SHADOW_REACH = 38; // m alrededor del jugador con sombras

// Dos luces para toda la escena: una ambiente (cielo/suelo) y el sol con
// sombras, que sigue al jugador para concentrar ahí la resolución. Este
// componente también hace avanzar la transición día ↔ noche y aplica sus
// colores al fondo y a la niebla.
export function Lights({ shadowMapSize }) {
 const hemisphere = useRef(null);
 const sun = useRef(null);
 const scene = useThree((state) => state.scene);
 const woodyStep = useRef({ x: 0, z: 0 });

 useFrame(({ clock }, delta) => {
  updateTheme(Math.min(delta, 0.05), clock.elapsedTime);
  const dt = Math.min(delta, 0.05);
  updateWind(dt);
  // Rastro que aparta la vegetación: el astronauta y Woody, con su velocidad.
  const dog = woodyStep.current;
  const dogVx = dt > 0 ? (woody.position.x - dog.x) / dt : 0, dogVz = dt > 0 ? (woody.position.z - dog.z) / dt : 0;
  dog.x = woody.position.x;
  dog.z = woody.position.z;
  updateTrail(dt, [
   ...(player.hidden ? [] : [{ x: player.position.x, z: player.position.z, vx: player.velocity.x, vz: player.velocity.z, strength: player.grounded ? 1 : 0 }]),
   { x: woody.position.x, z: woody.position.z, vx: dogVx, vz: dogVz, strength: player.hidden ? 0 : 0.8 },
  ]);
  hemisphere.current.color.copy(current.hemiSky);
  hemisphere.current.groundColor.copy(current.hemiGround);
  hemisphere.current.intensity = current.hemiPower;
  sun.current.color.copy(current.sun);
  sun.current.intensity = current.sunPower;
  scene.background.copy(current.background);
  scene.fog.color.copy(current.fog);

  // La cámara de sombras se centra en lo que sigue la cámara, a saltos del
  // tamaño de un píxel del mapa para que las sombras no tiemblen al andar.
  const focus = rig.focus ?? player.position;
  const texel = (SHADOW_REACH * 2) / shadowMapSize;
  const x = Math.round(focus.x / texel) * texel;
  const z = Math.round(focus.z / texel) * texel;
  sun.current.position.set(x + sunDirection.x * 90, sunDirection.y * 90, z + sunDirection.z * 90);
  sun.current.shadow.intensity = current.shadow;
  sun.current.target.position.set(x, 0, z);
  sun.current.target.updateMatrixWorld();
 });

 return (
  <>
   <hemisphereLight ref={hemisphere} />
   <directionalLight
    ref={sun}
    castShadow
    shadow-mapSize={[shadowMapSize, shadowMapSize]}
    shadow-bias={-0.0008}
    shadow-normalBias={0.05}
    shadow-camera-left={-SHADOW_REACH}
    shadow-camera-right={SHADOW_REACH}
    shadow-camera-top={SHADOW_REACH}
    shadow-camera-bottom={-SHADOW_REACH}
    shadow-camera-near={1}
    shadow-camera-far={220}
   />
  </>
 );
}
