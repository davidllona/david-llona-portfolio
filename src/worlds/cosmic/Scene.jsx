import { Staged } from "../Staged";
import { AlienSky } from "./AlienSky";
import { CosmicSounds } from "./CosmicSounds";
import { Growth } from "./Growth";
import { Helmet } from "./Helmet";
import { LabScene } from "./LabScene";
import cosmic from "./layout";
import { Orbit } from "./Orbit";
import { Terrain } from "./Terrain";

// En este mundo Woody lleva una escafandra. (Se apunta aquí, y no en los datos
// del mundo, para que estos sigan siendo solo datos: los leen también las pruebas.)
cosmic.woodyWears = Helmet;

// Mundo 3 · The Cosmic Lab. Lo común (jugador, Woody, cohete y objetos sueltos)
// lo monta Experience.jsx.
export default function CosmicScene({ onBuilt }) {
 return (
  <Staged onDone={onBuilt}>
   <AlienSky />
   <Terrain />
   <LabScene />
   <Growth />
   <CosmicSounds />
   <Orbit />
  </Staged>
 );
}
