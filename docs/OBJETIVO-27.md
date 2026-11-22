# Objetivo 27 — Pulido: pantalla de carga, entrada, mundo 1 y contacto al mundo 3

Recibido el 22-11-2026. Texto íntegro del encargo:

---

OBJETIVO 27 — PULIDO: PANTALLA DE CARGA, ENTRADA, MUNDO 1 Y CONTACTO AL MUNDO 3

Lista de David tras probar el porfolio. Son retoques concretos: no cambies nada que no esté aquí.

REGLAS (las de siempre)
- Sin abrir Chrome visible. Todo en headless.
- Una sola sesión, sin pruebas en segundo plano.
- Commit y push al cerrar cada bloque en estacion-espacial.
- Pruebas relacionadas + errors tras cada cambio; batería completa al cerrar cada bloque. Servidor de desarrollo limpio y npm run build.
- Para cada punto: captura ANTES y DESPUÉS en el mismo encuadre. Todo en capturas/34-pulido/.
- Encargo en docs/OBJETIVO-27.md, avance en docs/ESTADO.md.

────────────────────────────────────────
BLOQUE A — PANTALLA DE CARGA Y ENTRADA
────────────────────────────────────────
A1. Nubes de la pantalla de carga.
Ahora son píldoras planas con degradado y quedan muy mal. El resto de la escena (planeta, árboles low poly, astronauta, Woody, sol enorme) está muy bien: las nubes tienen que estar a su nivel.
- Nubes low poly de verdad: varias bolas facetadas unidas (como las copas de los árboles), con la parte de arriba iluminada por el atardecer (rosa melocotón) y la de abajo en sombra morada, base algo plana.
- Tres o cuatro nubes de distinto tamaño y a distinta profundidad (las lejanas más pequeñas, más claras y más lentas), que se deslizan muy despacio.
- Ninguna tapa al astronauta, a Woody ni al porcentaje.
- Si la pantalla de carga es HTML/CSS y no 3D, hazlas con SVG facetado con la misma lógica de luz. Que no retrase el primer pintado.

A2. Woody en la pantalla antes de aterrizar (la isla flotante con el árbol y la farola): su cola atraviesa el suelo hacia abajo. Recoloca la pose o la cola para que quede apoyada sobre la hierba o levantada, sin atravesar nada. Revisa también que ninguna otra parte de Woody ni del astronauta atraviese la isla.

A3. Acariciar a Woody: la mano del astronauta baja demasiado y se mete en Woody o por debajo. La mano debe quedar sobre la cabeza o el lomo de Woody, a la altura real, en todos los mundos y con Woody de pie, sentado o tumbado. Ajusta la altura objetivo de la mano según la pose actual de Woody.

A4. Mini isla antes de entrar: el astronauta, tumbado en una hamaca colgada entre el tronco del árbol y la farola, balanceándose muy despacio, con una pierna colgando. Woody, debajo, durmiendo en el suelo (es su manía real: duerme en el suelo aunque tenga cama). Low poly, mismos colores. Al pulsar «Haz clic para aterrizar», el astronauta se baja de la hamaca de un salto antes de que empiece el aterrizaje (animación corta, que no alargue la entrada más de medio segundo).

────────────────────────────────────────
BLOQUE B — MUNDO 1
────────────────────────────────────────
B1. Títulos que se cortan. En los carteles 3D (por ejemplo «MOVIMIENTO GALÁCTICO» toca los bordes) y en las cartas de proyecto, los títulos largos se salen o se cortan. Regla para todos los carteles y cartas: margen interior fijo, el texto se reduce hasta caber y, si aun así no cabe con un tamaño legible, pasa a dos líneas centradas. Revisa TODOS los carteles de los tres mundos, también el del tablón «TOP 10 · TRIPLES», cuyo título hoy sale cortado por arriba.

B2. Concurso de triples sin barra. En el concurso de triples, quita la barra de tiro: el momento de soltar se juzga solo por el salto del astronauta (soltar en lo alto = mejor). Además, que no sea fácil hacer el máximo:
- Ventana del tiro perfecto estrecha, y algo más estrecha en los carros de las esquinas.
- Aunque se suelte bien, una pequeña probabilidad de fallo; cuanto peor se suelta, más probable.
- Ajusta para que una buena partida ronde la mitad o dos tercios de la puntuación máxima, y que el máximo sea muy raro. Explica en el informe los números elegidos.
- En el juego libre (fuera del concurso), la barra se mantiene.
- Comprueba que las reglas de Firestore siguen aceptando la puntuación máxima real del concurso (hoy el tope en la base es 30; si el máximo del juego es otro, dímelo y NO toques las reglas: las cambia David).

B3. Puente japonés: está hundido en el estanque (la pasarela y la base de las barandillas quedan bajo el agua). Debe ser un puente arqueado rojo que pase POR ENCIMA del agua, apoyado en las orillas, con el centro más alto. Que se pueda cruzar andando y que los kois pasen por debajo.

B4. Zona de contacto: los carteles «LINKEDIN», «GITHUB» y «EMAIL» están hundidos en el suelo. Súbelos y apóyalos bien. (Esta zona se mueve en el bloque C; arréglalo igual, porque las piezas se reutilizan.)

B5. Woody moviendo la cabeza como loco. Mientras juegas al baloncesto, al fútbol o cualquier cosa con el balón, Woody gira la cabeza a sacudidas. Causa probable: sigue con la mirada al balón u objetivos que cambian muy rápido, sin suavizado. Arreglo:
- La mirada se suaviza (amortiguación) y tiene un giro máximo por segundo y un ángulo máximo respecto al cuerpo.
- Si el objetivo se mueve demasiado rápido o está lejos, Woody mira al jugador o al frente, sin seguirlo.
- Pequeña zona muerta para que no tiemble con movimientos mínimos.
Prueba de regresión: grabar la rotación de la cabeza durante 10 s de juego y comprobar que no hay saltos bruscos.

────────────────────────────────────────
BLOQUE C — EL CONTACTO PASA AL MUNDO 3
────────────────────────────────────────
Decisión de David: la zona física de contacto (la casita con LinkedIn, GitHub y el buzón del email) sale del mundo 1 y pasa al mundo 3, como final del recorrido.
- En el mundo 3, el contacto es la antena del laboratorio: al encender las máquinas se activa la antena «Envía una señal». Junto a ella, tres terminales en el estilo del laboratorio (formas redondas, turquesa, magenta y lima): LinkedIn, GitHub y Email. Cada uno abre su carta de máquina con su botón. Reutiliza la lógica y los enlaces actuales.
- La antena y los tres terminales funcionan siempre, aunque no se hayan encendido todas las máquinas: encenderlas solo añade la animación del planeta iluminándose. El contacto nunca puede quedar bloqueado.
- IMPORTANTE: el botón «Contacto» del menú de arriba sigue en los tres mundos y abre el contacto directamente, sin viajar. Quien tenga prisa no tiene que ir al mundo 3.
- En el mundo 1, donde estaba la zona de contacto: quítala y en su lugar deja un poste-indicador de madera «CONTACTO → The Cosmic Lab» que, con E, ofrece el viaje (como hace «Sobre mí» con el mundo 2) y además muestra el email directamente. Recoloca lo que haga falta para que ese hueco no quede vacío ni raro.
- Actualiza a Woody (su guía) y los textos que hablen de dónde está el contacto.

────────────────────────────────────────
CIERRE
────────────────────────────────────────
Hoja final con todos los antes y después. Rendimiento de los tres mundos y primer pintado de la carga (que las nubes nuevas no lo empeoren).
Commit, push y PARA con un informe corto: qué se ha hecho, los números del concurso de triples y qué no has podido comprobar.
