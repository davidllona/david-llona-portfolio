# OBJETIVO 28 — PULIDO DEL MUNDO 2 (THE TWISTED MOON): CINCO DETALLES

(Encargo de David, 24-11-2026, tal cual.)

David lo ha probado en el preview de Vercel y hay cinco cosas que se ven mal. Solo estas cinco: no toques nada más del mundo 2 ni de los otros mundos.

## Reglas (las de siempre)

- Sin abrir Chrome visible. Todo en headless.
- Una sola sesión, sin pruebas en segundo plano.
- Commit y push al terminar cada punto en `estacion-espacial` (Vercel despliega el preview solo).
- Pruebas relacionadas + errors tras cada cambio; batería completa al final. Servidor de desarrollo limpio y `npm run build`.
- Mira `docs/referencias/mundo2/` antes de empezar: las referencias siguen siendo la meta visual.
- Para cada punto: captura ANTES y DESPUÉS con el mismo encuadre, con la cámara de juego (no solo la postal). Todo en `capturas/35-pulido-mundo2/`.
- Encargo en `docs/OBJETIVO-28.md`, avance en `docs/ESTADO.md`.

## 1. La luna

Ahora la luna creciente es una esfera low poly iluminada solo por un lado: el borde sale dentado, como papel arrugado, la parte oscura se intuye como un disco fantasma y no se lee como una luna de cuento.

Quiero una luna creciente limpia, como en las referencias:

- Forma de creciente nítida y redonda (dos círculos), con el borde suave. Puede ser una geometría plana orientada a la cámara o un shader; no una esfera con terminador.
- Color blanco hueso con un ligero tono azul, un poco de textura suave de cráteres solo dentro de la creciente.
- Halo suave y amplio alrededor, sin la parte oscura visible.
- Mismo tamaño y posición que ahora, y que se siga viendo en los miradores, al bajar con la nave y en el reflejo del mar.

## 2. La torre del reloj

En lo alto de la torre hay una estructura rara. Lo que se ve en las capturas de David:

- El tejado y las torrecillas salen como una silueta negra plana, sin pizarra ni detalle, con unos halos naranjas redondos flotando a los lados que no salen de ninguna ventana.
- Los engranajes de latón están pegados a la fachada y parecen flotar, sin eje ni soporte.
- Hay un bloque oscuro saliente en un lateral que no se entiende qué es.

Arreglo:

- Tejado de pizarra con su color (morado grisáceo) y algo de luz de luna en las aristas, buhardillas con su ventana encendida y su halo pegado al cristal. Elimina cualquier halo que no esté pegado a una ventana o a una esfera del reloj.
- Engranajes metidos en un hueco de la fachada o tras una rejilla, con su eje visible, y que giren cuando el reloj está en marcha.
- Revisa la torre entera desde la cámara de juego, la postal y la órbita, quita o rehaz cualquier pieza sin sentido y explica en el informe qué era el bloque oscuro.

## 3. El puente colgante

El puente atraviesa una roca y por entre las tablas asoman setas y plantas.

- Súbelo lo necesario para que ninguna tabla, cuerda o poste atraviese rocas, terreno ni vegetación. Que cuelgue con una curva suave entre dos postes bien anclados en el borde de cada acantilado.
- Quita las setas y plantas que quedan debajo o a través de él.
- Revisa los otros puentes (colgantes y pasarelas) con el mismo criterio.
- Comprueba que se sigue cruzando andando, sin saltos de altura en las entradas, y que suenan los pasos de madera.

## 4. Las cascadas

La cascada sale de la nada: las tiras de agua empiezan a media pared, sin agua arriba.

- Cada cascada nace del río o la laguna de la terraza de arriba: el agua llega al borde, se curva sobre él (un labio con espuma) y cae.
- Las tiras empiezan pegadas a ese borde, no flotando delante de la roca, y caen hasta el agua de abajo, donde hay espuma y niebla.
- Si en alguna cascada no hay río arriba, prolonga el río hasta ella o quítala.
- Revisa las tres cascadas desde abajo, de lado y desde la postal.

## 5. El invernadero y la parada «Aventurero»

Es lo que peor se ve. Ahora es una caja de cristal morado con plantas que parecen piruletas, y fuera, en el suelo, un mapa y una maleta que parecen cajas sueltas. No se entiende qué es ni por qué está ahí.

Rehazlo para que se entienda de un vistazo:

- Invernadero de cuento: base de piedra o madera, estructura de hierro oscuro con algo de forma (tejado a dos aguas o cúpula), cristales con un leve tono y reflejo (no morado opaco), una puerta y algún cristal roto o empañado.
- Dentro, plantas que parezcan plantas: macetas y bancales con hojas, enredaderas y flores que brillan (violeta y turquesa), algún helecho. Luz cálida y violeta que sale por los cristales.
- La parada «Aventurero» va DENTRO o en un porche pegado al invernadero, como el rincón de un explorador: una mesa de trabajo con un mapa desplegado con chinchetas e hilo rojo uniendo destinos, una brújula, una maleta abierta con pegatinas de viaje, un globo terráqueo pequeño y el farolillo de papel apagado que el visitante enciende con E.
- Que el aviso «E Aventurero» salga junto a la mesa y que la cámara de juego enseñe la mesa y el invernadero bien encuadrados al acercarse.
- Si el modelo de Envato del invernadero (spacepixelcreative) ayuda, úsalo diezmado; si no, a mano.

Captura extra: el invernadero de cerca, la mesa del explorador y el farolillo encendido.

## Cierre

Hoja final con los cinco antes y después y la postal junto a las referencias. Rendimiento del mundo 2.

Commit, push y PARA con un informe corto: qué se ha cambiado en cada punto y qué no has podido comprobar.
