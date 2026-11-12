import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { player, rig, woody } from "./state";
import { current, uniforms, updateTheme } from "./theme";

// Dirección desde la que llega el sol (o la luna): desde el suroeste y arriba,
// para que las sombras caigan hacia el fondo de la pantalla.
const SUN_DIRECTION = [-0.42, 0.78, 0.46];
const SHADOW_REACH = 38; // m alrededor del jugador con sombras

// Dos luces para toda la escena: una ambiente (cielo/suelo) y el sol con
// sombras, que sigue al jugador para concentrar ahí la resolución. Este
// componente también hace avanzar la transición día ↔ noche y aplica sus
// colores al fondo y a la niebla.
export function Lights({ shadowMapSize }) {
 const hemisphere = useRef(null);
 const sun = useRef(null);
 const scene = useThree((state) => state.scene);

 useFrame(({ clock }, delta) => {
  updateTheme(Math.min(delta, 0.05), clock.elapsedTime);
  uniforms.uActors.value.set(player.position.x, player.position.z, woody.position.x, woody.position.z);
  hemisphere.current.color.copy(current.hemiSky);
  hemisphere.current.groundColor.copy(current.hemiGround);
  hemisphere.current.intensity = current.hemiPower;
  sun.current.color.copy(current.sun);
  sun.current.intensity = current.sunPower;
  scene.background.copy(current.background);
  scene.fog.color.copy(current.fog);
  scene.fog.density = current.fogDensity;

  // La cámara de sombras se centra en lo que sigue la cámara, a saltos del
  // tamaño de un píxel del mapa para que las sombras no tiemblen al andar.
  const focus = rig.focus ?? player.position;
  const texel = (SHADOW_REACH * 2) / shadowMapSize;
  const x = Math.round(focus.x / texel) * texel;
  const z = Math.round(focus.z / texel) * texel;
  sun.current.position.set(x + SUN_DIRECTION[0] * 90, SUN_DIRECTION[1] * 90, z + SUN_DIRECTION[2] * 90);
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
