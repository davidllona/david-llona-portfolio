import { Children, useEffect, useState } from "react";
import { Court } from "./Court";
import { Fauna } from "./Fauna";
import { Flora } from "./Flora";
import { Grass } from "./flora/Grass";
import { Terrain } from "./Terrain";
import { Zones } from "./Zones";

// Monta a sus hijos de uno en uno, dejando pasar un par de fotogramas entre
// cada cual: construir el planeta de golpe congelaría la bienvenida, que ya
// se está viendo. Avisa con `onDone` cuando están todos.
function Staged({ children, onDone }) {
 const parts = Children.toArray(children);
 const [count, setCount] = useState(1);
 useEffect(() => {
  if (count >= parts.length) {
   onDone?.();
   return undefined;
  }
  let second;
  const first = requestAnimationFrame(() => (second = requestAnimationFrame(() => setCount((value) => value + 1))));
  return () => {
   cancelAnimationFrame(first);
   cancelAnimationFrame(second);
  };
  // `onDone` y el número de partes no cambian durante la vida del componente.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [count]);
 return parts.slice(0, count);
}

// Planeta 1 · The Living World. Lo común (jugador, Woody, cohete y objetos
// sueltos) lo monta Experience.jsx.
export default function LivingScene({ quality, onBuilt }) {
 return (
  <Staged onDone={onBuilt}>
   <Terrain />
   <Grass quality={quality} />
   <Flora />
   <Zones />
   <Court />
   <Fauna />
  </Staged>
 );
}
