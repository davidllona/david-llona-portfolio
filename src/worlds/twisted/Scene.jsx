import { useEffect, useRef, useState } from "react";
import { breathe, busy, Staged } from "../Staged";
import { prepareGround } from "./ground";
import { Night } from "./Night";
import { Space } from "./Space";
import { Terrain } from "./Terrain";

// Mundo 2 · The Twisted Moon. Lo común (jugador, Woody, cohete y objetos
// sueltos) lo monta Experience.jsx.
export default function TwistedScene({ onBuilt }) {
 // Los caminos se hornean antes (una textura), en tramos cortos.
 const [ground, setGround] = useState(false);
 const working = useRef(null);
 useEffect(() => {
  let live = true;
  working.current = busy();
  prepareGround(breathe).then(() => live && setGround(true));
  return () => {
   live = false;
   working.current();
  };
 }, []);
 // (Cuando esto corre, lo de dentro ya se ha apuntado como pendiente.)
 useEffect(() => {
  if (ground) working.current?.();
 }, [ground]);
 if (!ground) return null;
 return (
  <Staged onDone={onBuilt}>
   <Night />
   <Terrain />
   <Space />
  </Staged>
 );
}
