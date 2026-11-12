import { Court } from "./Court";
import { Fauna } from "./Fauna";
import { Flora } from "./Flora";
import { Terrain } from "./Terrain";
import { Zones } from "./Zones";

// Planeta 1 · The Living World. Lo común (jugador, Woody, cohete y objetos
// sueltos) lo monta Experience.jsx.
export default function LivingScene() {
 return (
  <>
   <Terrain />
   <Flora />
   <Fauna />
   <Zones />
   <Court />
  </>
 );
}
