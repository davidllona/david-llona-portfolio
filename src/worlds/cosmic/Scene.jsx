import { Cables } from "./Cables";
import { Nature } from "./Nature";
import { Terrain } from "./Terrain";
import { About } from "./zones/About";
import { Contact } from "./zones/Contact";
import { Lab } from "./zones/Lab";
import { Plaza } from "./zones/Plaza";
import { Projects } from "./zones/Projects";

// Todo lo propio de este planeta. El jugador, Woody, la nave y los objetos
// sueltos son comunes y los monta Experience.jsx.
export default function CosmicScene() {
 return (
  <>
   <Terrain />
   <Nature />
   <Cables />
   <Plaza />
   <Projects />
   <Lab />
   <About />
   <Contact />
  </>
 );
}
