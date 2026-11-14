import { Court } from "./Court";
import { Fauna } from "./Fauna";
import { Flora } from "./Flora";
import { Grass } from "./flora/Grass";
import { Space } from "./Space";
import { Terrain } from "./Terrain";
import { Zones } from "./Zones";
import { useEffect, useRef, useState } from "react";
import { breathe, busy, Staged } from "../Staged";
import { prepareTerrain } from "./terrainData";

// Planeta 1 · The Living World. Lo común (jugador, Woody, cohete y objetos
// sueltos) lo monta Experience.jsx.
export default function LivingScene({ quality, onBuilt }) {
 // Los datos del terreno (256 × 256 muestras) se hornean antes, en tramos cortos.
 const [terrain, setTerrain] = useState(false);
 const working = useRef(null);
 useEffect(() => {
  let live = true;
  working.current = busy();
  prepareTerrain(breathe).then(() => live && setTerrain(true));
  return () => {
   live = false;
   working.current();
  };
 }, []);
 // (Cuando esto corre, lo de dentro ya se ha apuntado como pendiente.)
 useEffect(() => {
  if (terrain) working.current?.();
 }, [terrain]);
 if (!terrain) return null;
 return (
  <Staged onDone={onBuilt}>
   <Terrain />
   <Grass quality={quality} />
   <Flora />
   <Zones />
   <Court />
   <Fauna />
   <Space />
  </Staged>
 );
}
