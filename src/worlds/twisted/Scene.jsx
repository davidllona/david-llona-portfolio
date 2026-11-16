import { useEffect, useRef, useState } from "react";
import { breathe, busy, Staged } from "../Staged";
import { Buildings } from "./Buildings";
import { CollarLantern } from "./CollarLantern";
import { Details } from "./Details";
import { Fixtures } from "./Fixtures";
import { Flora } from "./Flora";
import { prepareGround } from "./ground";
import { House } from "./House";
import { Bats, Fireflies } from "./Life";
import { TwistedSounds } from "./TwistedSounds";
import { Smoke } from "./Details";
import { WATERFALLS } from "./layout";
import twisted from "./layout";
import { Night } from "./Night";
import { Space } from "./Space";
import { Structures } from "./Structures";
import { Terrain } from "./Terrain";

// En este mundo Woody lleva un farolillo al cuello. (Se apunta aquí, y no en los
// datos del mundo, para que estos sigan siendo solo datos: los leen también las pruebas.)
twisted.woodyWears = CollarLantern;
// Dónde cae cada cascada (algo por delante de la pared: ahí bate el agua).
const FOAM = WATERFALLS.map((fall) => [fall.x + Math.sin(fall.turn) * 0.9, fall.bottom + 0.1, fall.z + Math.cos(fall.turn) * 0.9]);

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
   <Details />
   <Fireflies />
   <Bats />
   {/* Espuma al pie de las cascadas. */}
   <Smoke name="espuma de las cascadas" sources={FOAM} color="#9ff6ff" speed={0.5} rise={0.9} size={1.1} opacity={0.45} puffs={9} additive spread={0.6} />
   <TwistedSounds />
   <Space />
  </Staged>
 );
}
