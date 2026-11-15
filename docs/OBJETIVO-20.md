# Objetivo 20 — Mundo 2: «The Twisted Moon»

Recibido el 15-11-2026. Texto íntegro del encargo:

---

Eres la única sesión. Lee docs/ESTADO.md. Guarda este mensaje en docs/OBJETIVO-20.md.

OBJETIVO 20 — MUNDO 2: «THE TWISTED MOON» (nombre provisional)

CONTEXTO
El porfolio tiene tres mundos, todo en 3D:
  1. The Living World (hecho): LO QUE HAGO. Proyectos, contacto, CV y juegos.
  2. The Twisted Moon (este): QUIÉN SOY. «Sobre mí» convertido en un paseo.
  3. The Cosmic Lab (más adelante): LO QUE EXPERIMENTO. No lo empieces.
Se viaja entre mundos con el cohete: desde la vista orbital se elige destino.
Mira qué hay ya en src/worlds/ (existe una carpeta cosmic antigua) y reutiliza la
arquitectura del mundo 1: layout, terreno, colisiones horneadas, Staged, precalentamiento,
interacciones con E, paneles, Woody, sonido y pruebas.

DIRECCIÓN DE ARTE (todo el mundo, sin excepciones)
Estética de cuento gótico al estilo de las películas de Tim Burton: oscuro pero amable,
más cuento que miedo. Es una INSPIRACIÓN de estilo: no copies personajes, escenarios,
logotipos ni diseños concretos de ninguna película.
- Siempre de noche. Luna enorme y baja, cielo morado y azul tinta, niebla a ras de suelo.
- Formas torcidas y alargadas: casas inclinadas con tejados puntiagudos y chimeneas
  retorcidas, colina en espiral, árboles sin hojas de ramas rizadas, vallas de hierro
  desiguales, farolas dobladas, caminos que serpentean.
- Paleta: negros azulados, morados, grises y blanco hueso, con acentos cálidos escasos
  y potentes (naranja de ventanas y faroles, algún verde ácido). Rayas blancas y negras
  como motivo.
- Low poly facetado, coherente con el mundo 1 (mismo astronauta, mismo Woody, misma
  calidad). Woody lleva un farolillo al cuello en este mundo.
- Luz: luna fría como principal, charcos de luz cálida muy marcados, sombras largas.
  Bloom solo en luces.
- Vida: murciélagos, luciérnagas pálidas, hojas secas, cuervos posados, niebla que se
  mueve. Sonido: viento, grillos lejanos, madera que cruje, una caja de música tenue.

CONTENIDO: CINCO PARADAS (todas con esta misma estética)
  1. La casa torcida — mi historia: de dónde vengo y cómo llegué al diseño frontend.
  2. El taller — cómo trabajo, herramientas y forma de hacer.
  3. El rincón de Japón — mis viajes y lo que me gusta de allí (torii torcido, farol
     de papel, cerezo sin hojas con pétalos pálidos).
  4. La sala de juegos — videojuegos, fútbol y baloncesto: lo que hago fuera del trabajo.
  5. La caseta de Woody — su historia, con una foto suya.
El texto real de «Sobre mí» ya existe en src/content/ (úsalo en la parada 1). Para lo
demás NO inventes datos sobre mí: deja textos provisionales claramente marcados
«[PENDIENTE: David]» y dame al final la lista de lo que tengo que escribirte.

BLOQUES (un commit y push por bloque)

═══ A. VIAJE ENTRE MUNDOS ═══
- En la vista orbital del mundo 1, The Twisted Moon deja de estar en «Próximamente» y
  se puede elegir como destino; The Cosmic Lab sigue cerrado.
- Viaje en cohete entre los dos planetas, aterrizaje en el mundo 2 y vuelta.
- Carga del mundo 2 solo cuando se viaja a él (no debe encarecer la entrada al mundo 1).
- El botón «Sobre mí» del menú ofrece viajar al mundo 2.

═══ B. MUESTRA DE ESTILO (lo primero que quiero ver) ═══
Una porción pequeña pero terminada: zona de aterrizaje, cielo con la luna enorme,
terreno con la colina en espiral al fondo, niebla, tres o cuatro árboles rizados,
una farola doblada, un tramo de camino y la CASA TORCIDA (parada 1) completa por fuera.
Con luz y color definitivos. Sirve para aprobar el estilo antes de construir el resto.
>>> PÁRATE: capturas desde arriba, a la altura del jugador y desde la órbita.

═══ C. EL RESTO DEL MUNDO ═══
Terreno completo, caminos, vegetación, rocas, vallas, farolas, carteles y las paradas
2 a 5 por fuera. Colisiones horneadas. Woody guía de una parada a otra.

═══ D. CONTENIDO E INTERACCIONES ═══
Paneles de las cinco paradas (mismo sistema que el mundo 1), logros propios de este
mundo y un detalle jugable sencillo en la sala de juegos.

═══ E. VIDA, SONIDO Y CIERRE ═══
Murciélagos, cuervos, luciérnagas, hojas, niebla en movimiento; sonidos (sintetizados
si no hay recursos; dime cuáles convendría descargar). Rendimiento, peso y pruebas.
>>> PÁRATE: informe final, capturas de las cinco paradas y lista de pendientes.

REGLAS
- Estoy en Windows. Headless, sin ventanas de Chrome, nada en segundo plano.
- No rompas el mundo 1: sus pruebas deben seguir en verde.
- Todo lo repetido, instanciado. Más de 60 fps en este equipo. 0 pipelines en caliente
  al aterrizar en el mundo 2.
- Tras cada cambio, solo las pruebas relacionadas y errors; la batería completa al
  final de cada bloque.
- Modelos: hechos a mano. Si crees que algún recurso descargado ayudaría, dime cuál y
  espera a que te lo pase; no uses nada sin licencia.
