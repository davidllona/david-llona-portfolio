# Objetivo 16 — todo lo que falta para cerrar el mundo 1

Texto íntegro del encargo, tal como lo pasó David el 13-11-2026. El estado de cada bloque está en `docs/ESTADO.md`.

```text
CONTEXTO
- Lee docs/ESTADO.md antes de empezar.
- El porfolio tendrá 3 planetas, todo en 3D. Ahora solo trabajamos en el primero, The
  Living World, que lleva todo lo que interesa al visitante: proyectos, Sobre mí, contacto
  y CV. Los planetas 2 y 3 se definirán más adelante: no los empieces.
- Referencias visuales: Porfolio_3D_David_Llona/00_REFERENCIAS/Planeta_1_The_Living_World/
- Referencia técnica: folio-2025-main/ (porfolio de Bruno Simon). Lee su license.md y
  respétalo. Estudia sus técnicas; no copies sus modelos, texturas, sonidos ni su diseño.
- Listón de calidad: el cohete y los árboles nuevos. Todo debe estar a ese nivel.

REGLAS
- Este objetivo SUSTITUYE a los bloques 3 a 6 del objetivo 15. Olvida aquel orden.
- No hagas auditorías ni planes: programa, comprueba y haz commit.
- No rompas navegación, interacciones (E), paneles ni el precalentamiento de la carga.
  Conserva WebGPU y TSL.
- Las comprobaciones automáticas en verde y la build compilando.
- No des nada por hecho sin haberlo visto en una captura tuya. Lo que se mueve se
  comprueba con una secuencia de fotogramas, no con una foto fija.
- Un commit por bloque. Al acabar cada bloque: capturas, informe corto con tres listas
  (hecho y comprobado / hecho sin comprobar / pendiente) y PÁRATE hasta mi visto bueno.
- Si un recurso no se puede usar (falta Blender, archivo roto, formato que no abre),
  dímelo y PÁRATE. No lo sustituyas por primitivas sin avisar.

RECURSOS (licencia de Envato, ZIP en ~/Downloads). Cópialos a assets-externos/ (ignorada
en git); al repo solo van las versiones optimizadas. Anótalos en docs/CREDITOS.md.
Ya descargados antes y TODAVÍA SIN USAR:
- Cinco casas de stdgaris (.blend): «Small Country House with Green Roof and Fireplace»,
  «Small House with Red Roof and Chimney», «Small House with Blue Roof», «Compact
  Residence with Dual Contemporary Balconies», «Island Cabin with Outdoor Seating».
- «Torii Gate» (mrfauzi), fbx/obj/blend.
- «Basketball 3D Icons» (twinstd), canasta en GLB, 108.000 polígonos: simplificar.
- 12 sonidos del espacio de trabajo «Porfolio 3D - Sonidos»: arroyo, cascada, mar en
  calma, pájaros de bosque, grillos, chapuzón, rugido de cohete, silbido de cohete,
  pasos sobre hierba (16), balón al poste, balón a la red y «pop» de interfaz.
- «Court Net»: NO usar (es una red de pickleball).
Descargados hoy:
- «World Cup Trophy Football» (adimaskur48): trofeo dorado con base verde.
- «Cartoon treehouse with ladder access» (permadicreative): fbx/obj/glb, 229.000
  polígonos: simplificar mucho (objetivo: menos de 15.000).
- «Small observatory with telescope dome» (kerismaker): blend/glb, 15.900 polígonos.
- «Orange and White Koi» (TurboSquid): fbx/obj/blend con textura realista, 8.200
  polígonos. Úsalo solo como forma: redúcelo a unos 300 polígonos y píntalo con colores
  planos (blanco, naranja, y una variante blanco/rojo/negro).
- «Stylized Arched Road Bridge with Railings» (TurboSquid): blend/fbx, 40.100 polígonos.
  Simplificar; barandillas y estructura en rojo bermellón, tablero de madera.
- «Japan Lamp» (nixxdsgn): farol japonés, glb, 10.000 polígonos.

OBJETIVO 16 — TODO LO QUE FALTA PARA CERRAR EL MUNDO 1
Hazlo en este orden.

═══ BLOQUE 0 — INVENTARIO Y SONIDOS (antes de tocar nada más) ═══
1. Escribe en docs/RECURSOS.md una tabla con CADA recurso de la lista de arriba:
   archivo origen, archivo optimizado en el repo, dónde se usa en el mundo y estado
   (usado / no usado). Ahora mismo casi todo estará «no usado»: quiero verlo escrito.
2. Integra YA los 12 sonidos (convertidos a .ogg/.mp3 ligeros, cargados después de
   entrar, nunca antes):
   - Posicionales con atenuación por distancia: cascada, arroyo, mar en la orilla.
   - Ambiente: pájaros de día, grillos de noche, con fundido al cambiar.
   - Pasos sobre hierba al andar y correr (variando entre las 16 muestras).
   - Chapuzón al entrar en el agua. Poste y red en el fútbol. «Pop» en la interfaz.
   - Rugido y silbido en el despegue del cohete.
   - El botón de sonido de arriba a la izquierda debe silenciar y activar TODO.
3. Entrega: la tabla y un vídeo o lista de comprobación sonido a sonido (dónde lo oíste).

═══ BLOQUE 1 — PANTALLA DE CARGA (rehacer) ═══
La actual (astronauta sentado en una roca) no me vale. Quiero esto:
1. El astronauta y Woody CAMINANDO de perfil, de izquierda a derecha, sobre la curva
   de un planeta pequeño que gira bajo sus pies, en bucle. Woody va delante, trotando;
   el astronauta detrás, andando. Silueta clara contra el cielo.
2. Fondo: cielo de atardecer espacial (degradado cálido abajo, azul noche arriba), un
   sol o luna grande medio escondido tras el horizonte, estrellas y 2 o 3 nubes o
   planetas pequeños que pasan despacio en capas (parallax).
3. Técnica: secuencia renderizada en Blender con los modelos reales y su ciclo de andar
   (hoja de sprites o WebP animado; máximo 250 kB en total), o CSS sobre capas. Tiene
   que verse a los 100 ms; nada de esperar al 3D.
4. Abajo: porcentaje, barra y texto, como ahora.
5. En móvil vertical la escena ocupa al menos el 40 % del alto.
Captura: 6 fotogramas del bucle en escritorio y 3 en móvil.

═══ BLOQUE 2 — PANTALLA PREVIA AL ATERRIZAJE ═══
1. Quita el botón naranja en forma de píldora. Vuelve a la flecha animada que había
   antes, pero bien hecha: texto «Haz clic para aterrizar» y debajo una flecha (o tres
   galones) que baja en bucle con desvanecido, en naranja, con halo suave. Todo el
   bloque es pulsable y también vale un clic en cualquier parte o la tecla Enter.
2. CERO espera al pulsar: la pantalla de carga no desaparece hasta que el mundo esté
   100 % listo para entrar. Cuando se ve esta pantalla, el clic responde al instante.
   Mide y dime el tiempo entre clic e inicio del descenso (objetivo: menos de 100 ms).
3. Más motivos para entrar: luna más grande y con más detalle (cráteres, halo, ligera
   rotación); más luciérnagas y polvo luminoso; estrellas fugaces cada 4–8 s (tienen
   que verse en la secuencia de capturas); el planeta The Living World visible abajo o
   al fondo, girando despacio, para que se entienda a dónde se aterriza.
Captura: escritorio, móvil y 8 fotogramas donde se vea flecha, estrella fugaz y planeta.

═══ BLOQUE 3 — ERRORES DE JUEGO (colisiones, Woody, colina, aro, correr) ═══
1. Colisiones: no se puede atravesar la cascada, las rocas de la cascada, los árboles,
   las casas, el pozo, los carteles, las farolas ni las vallas. Recorre el mapa entero
   contra cada objeto y dame la lista de lo que corregiste.
2. Colina: subir y bajar sin tirones, sin hundirse ni flotar, sin quedarse atascado.
   Pies siempre pegados al suelo.
3. Woody: que no se quede atascado, no atraviese objetos, no flote ni se hunda en
   cuestas, no se teletransporte a la vista y no se quede corriendo en el sitio. Si se
   aleja más de X metros fuera de cámara, recolócalo detrás del jugador sin que se vea.
   Prueba 3 minutos de recorrido por todas las zonas y cuéntame cada fallo que veas.
4. Aro que deja ver al personaje tras un obstáculo: debe funcionar igual en todas
   partes. Ahora falla al subirse al cohete y deja manchas de puntos en el pozo y en
   los árboles. Arréglalo o cámbialo por un recorte circular limpio y suave.
5. Animación de correr del astronauta: ahora es rara. Rehazla: zancada con contacto,
   paso y vuelo; brazos en oposición a las piernas; tronco inclinado hacia delante;
   ligero rebote vertical; sin deslizar los pies (velocidad de animación ajustada a la
   de desplazamiento). Transición suave andar ↔ correr ↔ parado.
Captura: secuencia de 12 fotogramas de la carrera de perfil y vídeo corto de la colina.

═══ BLOQUE 4 — ASPECTO DEL MUNDO ═══
1. Farolas: se ven artificiales. Rehazlas con poste de madera tallado, brazo de hierro
   y farol con cristal; de día apagadas, al atardecer se encienden con luz cálida real
   de alcance corto, halo y bloom contenido. Menos cantidad y mejor colocadas.
2. Caminos de piedra: ahora son losas sueltas flotando sobre arena. Hazlos como camino
   continuo: losas encajadas y hundidas en el terreno, con juntas de tierra y hierba
   que invade los bordes; sin parpadeo ni solapes.
3. Piedras y rocas: rehazlas con formas facetadas con intención (planos grandes, cantos
   biselados, 2 o 3 tonos por cara según la luz, musgo arriba), en grupos de tamaños
   distintos. Sustituye TODAS las actuales.
4. Pájaros: los triángulos voladores fuera. Pájaros low poly con cuerpo, cabeza, pico y
   dos alas que aletean; vuelan en bandadas pequeñas y alguno se posa en ramas y
   tejados. De lejos deben leerse como pájaros.
5. Carteles: casi no se ven. Más grandes, con tablón claro, letras con mucho contraste,
   un icono por zona, luz propia de noche y un leve balanceo. Deben verse desde lejos.
6. Cascada y agua: más volumen y capas en la caída, espuma en la base, salpicaduras,
   neblina y ondas que salen del punto de impacto.
Captura: cada punto, de cerca y de lejos, de día y de noche.

═══ BLOQUE 5 — EDIFICIOS CON LOS MODELOS DESCARGADOS ═══
1. Proyectos: sustituye las casetas actuales por las casas de stdgaris (una por
   proyecto), adaptadas a la paleta del mundo, con su rótulo y su pantalla del proyecto
   bien integrada en la fachada (marco, toldo, luz).
2. Casa del árbol (Sobre mí): sustitúyela por «Cartoon treehouse with ladder access»,
   simplificada y con la copa en el estilo de los árboles del mundo.
3. Observatorio: mejóralo usando «Small observatory with telescope dome» como base
   (cúpula con abertura, telescopio que asoma y gira despacio, luz interior de noche).
4. Trofeo: sustitúyelo por «World Cup Trophy Football» dentro del templete actual,
   con placa «ESPAÑA · CAMPEONA DEL MUNDO · 2010 · 2026» y brillo dorado.
Captura: cada edificio de frente y en su entorno.

═══ BLOQUE 6 — FÚTBOL Y BALONCESTO ═══
Fútbol:
1. El portero se mueve de lado a lado y se estira hacia el balón.
2. La barrera se mueve (salta al chutar).
3. El balón lleva efecto visible (curva según la dirección) y gira.
4. La red se deforma cuando entra el balón y recupera su forma.
Baloncesto (SIN modo de juego: no hay que «entrar a jugar» como en el fútbol):
1. Canasta: la de «Basketball 3D Icons», simplificada, con red que se mueve.
2. Al acercarte con el balón, mantén pulsado para cargar fuerza (indicador visible) y
   suelta para tirar. Con poca o demasiada fuerza se falla: rebota en aro o tablero.
3. Una barrera delante de la canasta que salta y puede taponar el tiro.
4. Marcador de canastas y racha. El balón vuelve solo si se va lejos.
5. Valla metálica y puerta alrededor de la pista, hechas a mano.
6. Sonidos: bote, aro y red (si no hay recurso, dímelo; no inventes uno malo).
Captura: secuencia de un gol, una parada, una canasta, un fallo y un tapón.

═══ BLOQUE 7 — JARDÍN JAPONÉS ═══
En un rincón tranquilo junto al agua:
1. Entrada por el «Torii Gate».
2. Estanque con el puente rojo arqueado cruzándolo y kois nadando (naranja/blanco y
   blanco/rojo/negro), visibles desde arriba, que se apartan al acercarte.
3. Cerezos: los árboles de slabdsgn ya integrados, con copa rosa, y pétalos cayendo.
4. Faroles «Japan Lamp» a lo largo del camino, encendidos de noche.
5. «Island Cabin with Outdoor Seating» como casa de té, con banco para sentarse (E).
6. Camino de losas, piedras con musgo y un cartel «JARDÍN».
Captura: vista general de día y de noche, y detalle de kois, puente y torii.

═══ BLOQUE 8 — CIERRE ═══
1. Actualiza docs/RECURSOS.md: no puede quedar ningún recurso «no usado» sin motivo.
2. Imágenes a WebP/AVIF; dime el peso descargado hasta poder entrar (antes: 11,8 MB).
3. fps en cinco puntos, 0 pipelines compilados en caliente, pruebas en verde.
4. Lista final de lo que, a tu juicio, sigue por debajo del listón.
```
