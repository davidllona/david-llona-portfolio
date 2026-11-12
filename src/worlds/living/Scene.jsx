import { Court } from "./Court";
import { Fauna } from "./Fauna";
import { Flora } from "./Flora";
import { Grass } from "./flora/Grass";
import { Terrain } from "./Terrain";
import { Zones } from "./Zones";

// Planeta 1 · The Living World. Lo común (jugador, Woody, cohete y objetos
// sueltos) lo monta Experience.jsx.
export default function LivingScene({ quality }) {
 return (
  <>
   <Terrain />
   <Grass quality={quality} />
   <Flora />
   <Fauna />
   <Zones />
   <Court />
  </>
 );
}
