import { useEffect, useRef, useState } from "react";
import { breathe, busy, Staged } from "../Staged";
import { Buildings } from "./Buildings";
import { CollarLantern } from "./CollarLantern";
import { Fixtures } from "./Fixtures";
import { Flora } from "./Flora";
import { prepareGround } from "./ground";
import { House } from "./House";
import twisted from "./layout";
import { Night } from "./Night";
import { Space } from "./Space";
import { Structures } from "./Structures";
import { Terrain } from "./Terrain";

// En este mundo Woody lleva un farolillo al cuello. (Se apunta aquí, y no en los
// datos del mundo, para que estos sigan siendo solo datos: los leen también las pruebas.)
twisted.woodyWears = CollarLantern;

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
   <Structures />
   <Buildings />
   <House />
   <Flora />
   <Fixtures />
   <Space />
  </Staged>
 );
}
