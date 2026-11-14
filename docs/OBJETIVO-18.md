# Objetivo 18 — Pulido del mundo 1

Recibido el 14-11-2026. **Sustituye a los bloques 4 a 7 del objetivo 16.** Texto íntegro del encargo:

---

Lee docs/ESTADO.md, docs/RECURSOS.md y docs/OBJETIVO-16.md. Guarda este mensaje en
docs/OBJETIVO-18.md. SUSTITUYE a los bloques 4 a 7 del objetivo 16.

OBJETIVO 18 — PULIDO DEL MUNDO 1 (HOY)
Quiero dejar The Living World casi terminado hoy. No busco el nivel de las imágenes de
referencia (te las adjunto solo para que veas la SENSACIÓN: densidad, color, luz), sino
que lo que YA existe se vea muchísimo más pulido. No cambies el relieve ni muevas zonas.
Estilo y técnica: porfolio de Bruno Simon (folio-2025-main/ como referencia técnica;
no copies sus modelos ni texturas). Listón: el cohete y los árboles nuevos.

Trabaja seguido, en este orden, con un commit y push por apartado. Párate SOLO al
terminar el apartado 4 y al terminar el 8.

═══ 1. CÉSPED ═══
Ahora son triángulos sueltos repartidos por igual sobre un suelo liso.
- Briznas con forma (base ancha, punta fina, curvadas), agrupadas en matas.
- Más densas junto a caminos, rocas, árboles y orillas; con claros entre medias.
- Degradado de base oscura a punta clara y dos o tres verdes por zona.
- Viento con ráfagas; se apartan al paso del astronauta y de Woody.
- Suelo con manchas suaves de verde claro y oscuro. Ninguna brizna atravesando losas,
  plataformas ni pistas.

═══ 2. ROCAS, CAMINOS, FAROLAS Y CARTELES ═══
- Rocas: sustituye TODAS por bloques de planos amplios y cantos biselados, gris azulado,
  con musgo encima, en grupos de 3 a 5 tamaños.
- Caminos: tierra clara con borde definido y hierba invadiendo los lados; losas
  encajadas (no flotando) solo junto a la plataforma del cohete y en la plaza.
- Farolas: poste de madera, brazo de hierro y farol con cristal; de noche luz cálida
  real de alcance corto con halo. Menos y mejor colocadas.
- Carteles: más grandes, tablón claro, letras con mucho contraste, icono por zona y luz
  propia de noche. Legibles desde lejos.

═══ 3. COLOR Y VEGETACIÓN ═══
- Con los cinco modelos de slabdsgn: variantes de color (verde, lima, amarillo, naranja
  suave, rosa cerezo) y de tamaño, repartidas con intención.
- Capa baja hecha a mano e instanciada, siempre en grupos: helechos, setas, flores,
  arbustos redondos. Las mariposas ya existen: consérvalas.
- Pájaros: fuera los triángulos voladores. Usa el modelo que he descargado,
  «animated-bluebird-with-feathery-wings» (ZIP de hoy en mi carpeta Descargas; cópialo a
  assets-externos/modelos/ y anótalo en RECURSOS y CREDITOS). Redúcelo y dale colores
  planos; si trae animación de aleteo, úsala; si no, anima las alas. Bandadas pequeñas
  y alguno posado. Si el modelo no sirve, dímelo y hazlos a mano low poly.

═══ 4. AGUA Y LUZ ═══
- Agua turquesa con degradado, líneas de espuma blanca en orillas, rocas y pie de la
  cascada; cascada con más volumen, espuma y neblina.
- Sol cálido con sombras suaves; relleno frío en la sombra, nunca negra; oclusión suave
  al pie de árboles, rocas y edificios; algo de niebla clara a lo lejos.
- Noche: luna fría, luciérnagas, ventanas y faroles encendidos. Bloom solo en luces.
>>> PÁRATE AQUÍ: capturas de día y de noche, desde arriba y a la altura del jugador.

═══ 5. BALONCESTO ═══
- Canasta: «Basketball 3D Icons» (assets-externos/modelos/), reducida, con red que se
  mueve al entrar el balón.
- VALLA metálica alta alrededor de toda la pista y una PUERTA, hechas a mano, para que
  el balón no se salga nunca. El balón rebota en la valla.
- Sin modo de juego: al acercarte con el balón, mantén pulsado para cargar fuerza
  (indicador visible) y suelta para tirar. Con poca o demasiada fuerza se falla.
- Una barrera delante de la canasta que salta y puede taponar.
- Marcador de canastas y racha. El balón vuelve solo si se queda parado lejos.
- Sonido de bote, aro y red: usa los ZIP de baloncesto que haya en mi carpeta Descargas
  si los encuentras; si no hay, sintetízalos y dímelo.

═══ 6. FÚTBOL ═══
Portero que se mueve y se estira, barrera que salta, efecto visible del balón y red que
se deforma con el gol.

═══ 7. EDIFICIOS (modelos de assets-externos/modelos/, reducidos) ═══
- Proyectos: las cinco casas de stdgaris en lugar de las casetas, con rótulo y pantalla.
- Casa del árbol: «Cartoon treehouse with ladder access».
- Observatorio: mejorado con «Small observatory with telescope dome».
- Trofeo: «World Cup Trophy Football», placa «ESPAÑA · CAMPEONA DEL MUNDO · 2010 · 2026».
Si un modelo no se puede usar, dímelo; no lo sustituyas por primitivas.

═══ 8. JARDÍN JAPONÉS (si queda tiempo; si no, anótalo como pendiente) ═══
Torii, estanque con el puente rojo y kois de colores planos, cerezos rosas con pétalos,
faroles «Japan Lamp», «Island Cabin» como casa de té con banco, cartel «JARDÍN».
>>> PÁRATE AQUÍ: capturas de todo, tabla de pruebas y lo que quede pendiente.

REGLAS
- Estoy en Windows. Blender: "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe".
- NO abras ventanas de Chrome: todo en headless. Nada en segundo plano sin avisar.
- Soy la única sesión trabajando en este proyecto. Si ves señales de otra, dímelo.
- NO toques la pantalla de carga ni el precalentamiento: quedan para el cierre.
- Todo lo repetido, instanciado. Dime fps en cinco puntos al empezar y tras cada
  apartado; si baja de 60 en este equipo, simplifica.
- Tras cada apartado: errors, entrada.mjs (0 pipelines en caliente al entrar y al
  despegar) y consola sin errores. Rehornea colisiones cuando añadas algo sólido.
- No rompas interacciones, paneles ni navegación.
