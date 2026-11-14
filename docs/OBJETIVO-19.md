# Objetivo 19 — Pulido final del mundo 1

Recibido el 14-11-2026. Texto íntegro del encargo:

---

Eres la única sesión. Lee docs/ESTADO.md y docs/OBJETIVO-18.md (apartados 1 a 8 hechos).
Guarda este mensaje en docs/OBJETIVO-19.md. Un commit y push por bloque; párate al
acabar el bloque B y al acabar el D.

OBJETIVO 19 — PULIDO FINAL DEL MUNDO 1

CONTEXTO: el porfolio tiene TRES mundos, todo en 3D. Este es el primero, The Living
World. El segundo será de estilo Tim Burton y el tercero alienígena; se harán más
adelante. No construyas nada de ellos.

═══ A. ERRORES VISIBLES ═══
1. Aro de visibilidad (experience/environment/seeThrough.js): ahora llena la casa de
   tejado verde y el pozo de una nube de puntos sucia. Sustitúyelo por un recorte
   circular limpio alrededor del astronauta, de borde suave, igual en todo: casas,
   árboles, pozo, cohete. Nada de tramado visible.
2. Puente rojo del jardín: está roto. Se ven dos barandillas finas tumbadas sobre el
   agua y no hay tablero. Tiene que verse como un puente japonés arqueado completo
   (tablero de madera, barandillas rojas a los lados, postes), y que el astronauta y
   Woody lo crucen pisando el tablero. Ajusta la altura de paso al modelo, no el modelo
   a la altura de paso.
3. Musgo de las rocas: sigue saliendo como un triángulo verde plano, enorme en la roca
   grande del jardín. Rehazlo: capa irregular de varios polígonos pequeños que cubre la
   parte alta y cae por los lados.
4. Torii: travesaño superior rojo bermellón con remate oscuro; ahora sale negro.
5. Casa de té: ventanas encendidas de noche.
6. Pista de baloncesto: luz propia de noche (dos focos en postes).
7. Pozo de la plaza: ahora parece una roca gris. Que se lea como pozo: brocal de
   piedra, tejadillo de madera, cubo y cuerda.
8. Cohete de noche: desde arriba es un bulto azul. Luz cálida desde la plataforma y
   ventanilla encendida.

═══ B. ANIMACIÓN DE CORRER ═══
Rehaz la carrera del astronauta: contacto, paso y vuelo; brazos en oposición; tronco
inclinado; rebote vertical; sin deslizar los pies. Pasos de sonido sincronizados con
el pie.
>>> PÁRATE: hojas de capturas de día y de noche de los puntos de A y 12 fotogramas de
la carrera de perfil.

═══ C. «SOBRE MÍ» SALE DE ESTE MUNDO ═══
«Sobre mí» irá en el mundo 2 (más adelante), no aquí. De momento:
- No lo muevas a ningún islote ni construyas nada del mundo 2.
- Deja la casa del árbol como rincón decorativo del planeta, sin el cartel «SOBRE MÍ»
  ni su interacción, y resuelve bien su entorno.
- El contenido de Sobre mí no se pierde: sigue accesible desde el botón «Sobre mí» del
  menú superior hasta que exista el mundo 2. Anótalo en docs/ESTADO.md como pendiente
  de trasladar.
- Ajusta lo que dependa de esa zona: guiado de Woody, logros y pruebas.

═══ D. DESPEGUE: QUE SE VEA UN PLANETA ═══
Ahora, al subir en el cohete, se ve una isla plana recortada sobre el mar. Tiene que
verse un MUNDO:
- La cámara se aleja mucho más durante el ascenso.
- A partir de cierta altura la isla pasa, sin corte visible, a ser parte de un planeta
  esférico low poly (océano, la isla como un continente reconocible con su forma y
  colores, otras masas de tierra, nubes, halo de atmósfera) girando despacio sobre el
  cielo estrellado, con la luna.
- El planeta debe ser coherente con el que ya se ve en la pantalla de bienvenida.
- En la vista orbital, además de este planeta, se ven a lo lejos los otros dos mundos
  como destinos todavía cerrados: uno oscuro y retorcido, de estilo Tim Burton (tonos
  morados y grises, formas en espiral), y otro alienígena (colores extraños, formas
  orgánicas). Solo como planetas lejanos en el cielo, con un nombre provisional y
  «Próximamente». No construyas nada de ellos.
- Al aterrizar, el camino inverso.
- 0 pipelines en caliente al despegar (precalienta el planeta) y sin tirones.
>>> PÁRATE: secuencia de 12 fotogramas del despegue, de día y de noche, capturas del
rincón de la casa del árbol y la tabla de la batería completa.

REGLAS
- Estoy en Windows. Headless, sin ventanas de Chrome, nada en segundo plano.
- Tras cada cambio, solo las pruebas relacionadas y errors; la batería completa una
  vez al final de B y otra al final de D.
- Rehornea colisiones cuando muevas o añadas algo sólido.
- No toques la pantalla de carga. Mantén más de 60 fps en este equipo.
- No rompas interacciones, paneles ni navegación.
