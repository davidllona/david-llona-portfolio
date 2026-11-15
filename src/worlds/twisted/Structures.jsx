import { useEffect, useMemo } from "react";
import { BRIDGES, STAIRS, bridgeDeck } from "./layout";
import { solid } from "./materials";
import { createBridges, createStairs } from "./models";

// Lo que une las terrazas: las escaleras de piedra y los puentes (colgantes
// entre los picos, de tablones sobre el agua). Dos mallas.
export function Structures() {
 const models = useMemo(() => ({ stairs: createStairs(STAIRS), bridges: createBridges(BRIDGES, bridgeDeck) }), []);
 const material = useMemo(() => solid(), []);
 useEffect(
  () => () => {
   models.stairs.dispose();
   models.bridges.dispose();
   material.dispose();
  },
  [models, material],
 );
 return (
  <>
   <mesh name="escaleras" geometry={models.stairs} material={material} castShadow receiveShadow />
   <mesh name="puentes" geometry={models.bridges} material={material} castShadow receiveShadow />
  </>
 );
}
