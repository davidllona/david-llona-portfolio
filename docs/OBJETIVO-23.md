# Objetivo 23 — The Twisted Moon: contenido («Arranca el reloj y conóceme»)

Recibido el 16-11-2026. Texto íntegro del encargo:

---

OBJETIVO 23 — THE TWISTED MOON: CONTENIDO («ARRANCA EL RELOJ Y CONÓCEME»)

El aspecto del mundo 2 está aprobado (objetivos 21 y 22). Ahora toca darle algo que hacer. Sustituye al antiguo bloque D del objetivo 20.

REGLAS (las de siempre)
- Sin abrir Chrome visible. Todo en headless.
- Una sola sesión, sin pruebas en segundo plano.
- Commit y push al cerrar cada bloque en estacion-espacial.
- Pruebas relacionadas + errors tras cada cambio; batería completa al cerrar cada bloque.
- No toques el mundo 1.
- Encargo en docs/OBJETIVO-23.md, avance en docs/ESTADO.md.
- NO inventes datos sobre David. Usa solo los textos de este archivo. Lo marcado [CONFIRMAR] déjalo tal cual, fácil de cambiar en un único archivo de textos.
- Antes de empezar, un retoque pendiente: baja un punto el borde frío de la roca clara del primer plano en las capturas «puente» y «observatorio».

────────────────────────────────────────
LA IDEA
────────────────────────────────────────
El mundo 2 responde a «quién soy». Se juega así:
- Al llegar, el reloj de la torre está PARADO (agujas quietas, esferas apagadas o a media luz).
- Hay cuatro engranajes de latón repartidos por la isla, uno en cada parada. Se consigue cada uno al visitar la parada y pulsar E (al cerrar su panel).
- Con los cuatro, se sube a la torre, se pulsa E en la puerta, los engranajes se colocan, suenan las campanadas, el reloj arranca con la hora real del visitante, las esferas se encienden y se abre «Mi recorrido».
- Después, el observatorio queda como final: «Lo que viene».
Duración pensada: unos cinco minutos. Nada obligatorio: quien no quiera jugar puede leer todo desde el menú «Sobre mí».

Woody guía: al llegar explica en su bocadillo que el reloj está parado y lleva de parada en parada (reutiliza su sistema de guiado). Después de cada engranaje, apunta a la siguiente.
Interfaz: un contador discreto «Engranajes 0/4» junto a los logros, solo en este mundo.

────────────────────────────────────────
BLOQUE D1 — MECÁNICA
────────────────────────────────────────
- Estado del reloj (parado / en marcha), engranajes, contador, guiado de Woody, secuencia de arranque en la torre (animación corta: engranajes que encajan y giran, campanadas, esferas que se encienden, murciélagos que salen volando).
- Guarda el progreso en la visita (si vuelve del mundo 1, no lo pierde). Si el almacenamiento falla, que no rompa nada.
- Logros nuevos: «Relojero» (arrancar el reloj) y uno por parada si encaja con el sistema actual.
- Los engranajes son visibles en el mundo: giran despacio y brillan en cálido delante de cada parada hasta recogerlos.
- Prueba e2e nueva que recorre las cuatro paradas, arranca el reloj y comprueba el estado.
Commit y push. Sigue.

────────────────────────────────────────
BLOQUE D2 — LAS PARADAS
────────────────────────────────────────
Cada parada: un detalle visual propio en el exterior o interior visible, un aviso «E» y un panel corto con el mismo estilo que los del mundo 1. Textos breves, tal cual:

1. CASA SOBRE TRONCO — «Mi historia»
   Ya hecha. No da engranaje: es la introducción. Mantén el texto actual.

2. CASA DEL ALQUIMISTA — «Cómo trabajo»  (engranaje 1)
   Visual: una mesa con bocetos de webs y un tablón lleno de notas desordenadas. Al pulsar E, las notas vuelan y se agrupan en columnas ordenadas.
   Texto:
   «Antes de tocar código, dibujo. Empiezo por bocetos de la web.
   Con proyectos propios como Dosia es distinto: son ideas que voy teniendo, cosas que veo y voy añadiendo. Lo junto todo, lo agrupo y entonces le doy forma.»

3. CASA DEL ÁRBOL — «A qué juego»  (engranaje 2)
   Visual: una estantería y una consola con pantalla encendida. Tres objetos que sugieran sus sagas favoritas SIN logos, portadas, personajes ni nombres en los objetos: un sombrero vaquero, una capucha blanca colgada y una maceta con una hierba verde. Los nombres solo en el texto.
   Texto:
   «Juego un poco a todo, pero lo que más me gusta son los juegos con historia.
   Mis sagas: Assassin's Creed, Resident Evil y Red Dead Redemption.»

4. CASITA DE CUENTO — «Woody»  (engranaje 3)
   Visual: una cama de perro perfecta y vacía, y al lado un hueco en el suelo donde Woody se tumba cuando llegas (aquí sí usa la animación de tumbarse). Un marco con su foto: carga public/img/woody.jpg; si no existe, deja el marco con una silueta y avisa en el informe.
   Texto:
   «Woody es un border collie con mastín. Va a cumplir 4 años.
   Lo vimos en un post de Instagram y nos lo trajimos a casa.
   Su manía: dormir en el suelo aunque tenga cama.»

5. INVERNADERO — «Aventurero»  (engranaje 4)
   Visual: entre las plantas que brillan, un mapa desplegado con chinchetas y una maleta a medio hacer. Un farolillo de papel apagado que el visitante enciende con E.
   Texto:
   «Soy muy aventurero y me gusta aprender cosas nuevas.
   El primer sitio de la lista: Japón. Todavía no he ido. Me engancha toda su cultura.»
   (El jardín japonés ya está en el mundo 1: aquí NO se repite, solo el mapa.)

6. TORRE DEL RELOJ — «Mi recorrido»  (se abre al arrancar el reloj)
   Visual: tras arrancar, una línea de tiempo que sube por la torre o un panel con cinco hitos.
   Texto:
   «2021 — Empiezo a estudiar programación.
   2024 — Termino los estudios.
   BBVA — Mi primer trabajo serio: cambios en webs y el simulador de hipotecas.
   [CONFIRMAR nombre: Adrava] — Donde estoy ahora.
   Hoy — Este porfolio.»

7. OBSERVATORIO — «Lo que viene»  (final, sin engranaje)
   Visual: el telescopio apunta a The Cosmic Lab. Al pulsar E, la cámara mira por el telescopio un instante y se ve el planeta.
   Texto:
   «Quiero llegar más lejos con el 3D.
   Con la IA, cualquiera puede tener una web. Lo difícil ahora es que alguien la recuerde. Por eso hago esto.»
   Botón: «Viajar a The Cosmic Lab» (hoy «Próximamente»).

El panel «Sobre mí» del menú superior debe reunir todos estos textos para quien no quiera recorrer la isla.
Commit y push. Sigue.

────────────────────────────────────────
BLOQUE D3 — CIERRE DEL MUNDO 2
────────────────────────────────────────
- Sonido: tic-tac suave solo cuando el reloj está en marcha; sonido al recoger engranaje (usa el destello mágico); campanadas en el arranque.
- Repaso de colisiones y de que Woody llega a todas las paradas nuevas.
- Teléfono (emulado) y calidad baja: que todo se pueda hacer con el dedo.
- Rendimiento de los dos mundos y peso del mundo 2.
- Capturas en capturas/28-mundo2-contenido/: una por parada con su panel abierto, el reloj parado, la secuencia de arranque (tres fotogramas), la línea de tiempo y la vista por el telescopio.
Commit, push y PARA con un informe corto: qué hay, qué falta de David ([CONFIRMAR], foto de Woody, música elegida) y qué no has podido comprobar.
