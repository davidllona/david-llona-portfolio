import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { aboutText, mainOrbit } from "../../../content/about";
import { useInteractable } from "../../../experience/interact";
import { emit } from "../../../experience/state";
import { Glow } from "../buildings/Glow";
import { createModelMaterial, preloadModel, useModel } from "../buildings/useModel";
import { STONE, WOOD } from "../kit/palette";
import { PLATEAU, TREEHOUSE } from "../layout";

// Sobre mí: una casita en un árbol, en la meseta. El árbol crece por detrás y
// la abraza con sus ramas; la casa se asoma hacia el sur sobre una plataforma
// con barandilla, a la que se sube por una escalera. La información en sí no
// está escrita en la escena: E (o clic) la abre en un panel legible.

const ROOF = "#8d7bc4"; // lila apagado
const DECK = 3.05; // altura de la plataforma


// La casa del árbol es el modelo «Cartoon treehouse with ladder access»
// (docs/CREDITOS.md): árbol, cabaña y escalera en una sola malla.
const TREEHOUSE_SIZE = 8.2; // m de copa a copa
preloadModel("casa-arbol");

export function AboutMe() {
 const { x, z } = TREEHOUSE;
 const tree = useModel("casa-arbol");
 // (Sin hueco de visión: el astronauta no pasa por detrás.)
 const material = useMemo(() => createModelMaterial({ seeThrough: false }), []);
 useEffect(() => () => material.dispose(), [material]);

 const click = useInteractable({
  position: { x: x + 2.6, z: z + 2.6 },
  radius: 3.4,
  hint: "Leer «Sobre mí»",
  anywhere: true,
  action: () =>
   emit("open", {
    kind: "about",
    at: { x, y: 2.6, z: z + 0.6, distance: 0.8 },
    eyebrow: aboutText.eyebrow,
    title: aboutText.headline.join(" "),
    paragraphs: aboutText.paragraphs,
    // Las áreas en las que trabajo, tal como están en el contenido del portfolio.
    tags: mainOrbit.nodes.map((node) => node.label),
   }),
 });

 return (
  <group name="casa del árbol" userData={{ rests: 0, foot: 2.4 }} position={[x, PLATEAU.height, z]} {...click}>
   <mesh geometry={tree} material={material} position={[0.2, -0.05, -1.2]} scale={TREEHOUSE_SIZE} castShadow receiveShadow />
   {/* Luz de la cabaña, de noche. */}
   <Glow power={0.6} forward={1.2} drop={0.3} night={2.2} position={[0.9, 3.9, 0.4]}>
    <boxGeometry args={[0.15, 0.22, 0.15]} />
   </Glow>
  </group>
 );
}
