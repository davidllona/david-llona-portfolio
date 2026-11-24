import { useEffect, useMemo } from "react";
import { BRIDGES, SPRING, SPRING_RUN, STAIRS, WATERFALLS, bridgeDeck, ground } from "./layout";
import { solid } from "./materials";
import { createBridges, createStairs, createWaterStones } from "./models";

// Lo que une las terrazas: las escaleras de piedra y los puentes (colgantes
// entre los picos, de tablones sobre el agua), y las piedras del agua. Tres mallas.
export function Structures() {
 const models = useMemo(() => ({ stairs: createStairs(STAIRS), bridges: createBridges(BRIDGES, bridgeDeck), stones: createWaterStones(SPRING, SPRING_RUN, WATERFALLS, ground) }), []);
 const material = useMemo(() => solid(), []);
 useEffect(
  () => () => {
   models.stairs.dispose();
   models.bridges.dispose();
   models.stones.dispose();
   material.dispose();
  },
  [models, material],
 );
 return (
  <>
   <mesh name="escaleras" geometry={models.stairs} material={material} castShadow receiveShadow />
   <mesh name="puentes" geometry={models.bridges} material={material} castShadow receiveShadow />
   {/* Las piedras del manantial y las que flanquean el labio de cada cascada. */}
   <mesh name="piedras del agua" geometry={models.stones} material={material} castShadow receiveShadow />
  </>
 );
}
