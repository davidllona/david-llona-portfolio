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
import { Drops, Smoke } from "./Details";
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
   {/* Al pie de las cascadas: espuma turquesa, una niebla pálida que sube y gotas que saltan. */}
   <Smoke name="espuma de las cascadas" sources={FOAM} color="#5fe0da" speed={0.5} rise={0.7} size={1.0} opacity={0.34} puffs={9} additive spread={0.6} />
   <Smoke name="niebla de las cascadas" sources={FOAM} color="#8fb4c6" speed={0.16} rise={2.2} size={2.6} opacity={0.2} puffs={6} spread={1.3} />
   <Drops sources={FOAM} />
   <TwistedSounds />
   <Space />
  </Staged>
 );
}
