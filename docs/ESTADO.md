# Estado del universo de tres planetas

Actualizado: 22 de noviembre de 2026 · rama `estacion-espacial`.

Encargo completo: `Porfolio_3D_David_Llona/01_PROMPTS/03_CLAUDE_CODE_PORFOLIO_3D_COMPLETO.txt` (carpeta fuera de git). Texto íntegro del objetivo 16: `docs/OBJETIVO-16.md`.
**En curso: objetivo 27 — pulido: carga, entrada, mundo 1 y contacto al mundo 3** (`docs/OBJETIVO-27.md`): ver «Objetivo 27» abajo.
**Objetivo 26 — cartas aprobadas y baloncesto nuevo** (`docs/OBJETIVO-26.md`): **hecho** (21-11-2026), los tres bloques. Parado, pendiente de que David lo revise. Ver «Objetivo 26» abajo.
**Objetivo 25** (`docs/OBJETIVO-25.md`): su muestra de cartas no se aprobó; lo sustituye el 26.
**Objetivo 24 — órbita del mundo 2 y arranque del mundo 3** (`docs/OBJETIVO-24.md`): los dos bloques hechos; **estilo del mundo 3 aprobado por David (21-11-2026)**. Ver «Objetivo 24» abajo.
**En curso: objetivo 23 — The Twisted Moon: contenido («arranca el reloj y conóceme»)** (`docs/OBJETIVO-23.md`; sustituye al bloque D del objetivo 20): bloques D1 (mecánica) y D2 (las paradas) hechos; **parado tras el D2 por indicación de David: el D3 (cierre) no se ha empezado.** Ver «Objetivo 23» abajo.
**Objetivo 22 — pulido visual de The Twisted Moon** (`docs/OBJETIVO-22.md`; C2 y C3 del objetivo 21 aprobados como base): los tres bloques hechos (color y luz, piezas que no se leen, órbita); órbita: David eligió la opción B. **Retoque de luz hecho (16-11-2026); parada, pendiente de su visto bueno.** Ver «Objetivo 22» abajo.
**Objetivo 21 — The Twisted Moon, que se parezca a las imágenes de referencia** (`docs/OBJETIVO-21.md`; sustituye al bloque C del objetivo 20): bloques C1 (aprobado), C2 y C3 hechos; **parada del C3, pendiente del visto bueno de David** (informe en «Objetivo 21»). Ver «Objetivo 21».
**Objetivo 20 — mundo 2, The Twisted Moon** (`docs/OBJETIVO-20.md`): bloques A (viaje entre mundos) y B (muestra de estilo) hechos; **parada del bloque B, pendiente del visto bueno de David**. Los bloques C, D y E no se empiezan hasta entonces. Ver «Objetivo 20».
**En curso: objetivo 16 — todo lo que falta para cerrar el mundo 1** (nueve bloques, 0–8; cada uno con commit, capturas, informe de tres listas y parada hasta el visto bueno). **Sustituye a los bloques 3–6 del objetivo 15.** Bloques 0 (inventario y sonidos), 1 (pantalla de carga) y 2 (pantalla previa al aterrizaje): **hechos y aprobados** (13-11-2026). **En curso: bloque 3** (errores de juego), a medias: ver su fila y «Bloque 3, lo que queda».
**En curso: objetivo 19 — pulido final del mundo 1** (`docs/OBJETIVO-19.md`): los cuatro bloques (A, B, C y D) están hechos. David pidió rehacer la vista de planeta del bloque D («el planeta es la isla»): **retoque hecho, pendiente de su visto bueno** (ver «Retoque del bloque D»). Ver «Objetivo 19».
**Objetivo 18 — pulido del mundo 1** (`docs/OBJETIVO-18.md`, 14-11-2026). **Sustituye a los bloques 4 a 7 del objetivo 16.** Ocho apartados, commit y push por apartado; paradas solo tras el 4 y tras el 8. **Los ocho están hechos: parada del apartado 8, pendiente del visto bueno de David** (batería completa y capturas en «Parada del apartado 8»). Ver «Objetivo 18».
Decidido por David el 13-11-2026: los pesos reales de los modelos mandan sobre la ficha (reducir «Japan Lamp», puente, observatorio y cabaña hasta que no bajen los fps y dar el número final de triángulos de cada uno); los pasos fuera de la hierba y los sonidos de baloncesto se quedan sintetizados hasta que él avise.
Inventario de recursos descargados y su estado: `docs/RECURSOS.md`.
Árboles de slabdsgn: aceptados (13-11-2026, commit `4e53c5e`). Objetivo 8 (fútbol jugable) cerrado.
Blender: no está en el PATH del Mac; se llama con `/Applications/Blender.app/Contents/MacOS/Blender -b` (5.0.1). No hay ffmpeg: el audio también se convierte con Blender.

## Objetivo 27 — Pulido: pantalla de carga, entrada, mundo 1 y contacto al mundo 3

Encargo: `docs/OBJETIVO-27.md` (22-11-2026). Tres bloques, commit y push en cada uno; parada solo al final. Capturas antes/después de cada punto, en el mismo encuadre: `capturas/34-pulido/`.

| Bloque | Estado |
|---|---|
| A. Pantalla de carga y entrada (A1–A4) | **Hecho** (22-11-2026) |
| B. Mundo 1 (B1–B5) | Sin empezar |
| C. El contacto pasa al mundo 3 | Sin empezar |

**Bloque A, lo que hay:**
- **A1 · Nubes de la carga** (`index.html`): las píldoras pasan a **nubes low poly de SVG en línea** (sin descargas): bolas facetadas unidas como las copas, cada faceta con uno de seis tonos según hacia dónde mira (arriba melocotón, abajo sombra morada) y la base recortada en plano. Dos formas (`<symbol>`), cuatro nubes en tres profundidades: dos lejanas (0,95 y 0,72 m, más claras y en la capa de 190 s), una media (1,5 m, 120 s) y una cercana (2,3 m, 70 s). Las genera un script (bolas → triángulos → tono por normal y altura); el SVG pesa 13,9 kB sin comprimir. Siempre por encima de las cabezas: `loader.mjs` comprueba en 48 instantes del bucle entero que ninguna toca al astronauta, a Woody ni al porcentaje.
- **A2 · Woody en la isla** (`experience/Welcome.jsx`): su cola bajaba 10 cm bajo la hierba (medido en los vértices deformados). Ahora duerme (A4) y un retoque de huesos (`keepAbove`, `characters/bones.js`) apoya la cola sobre la hierba si algún tramo bajara; Woody, 3 cm más alto (como las plantas). Nada de Woody ni del astronauta atraviesa la isla (`isla.mjs` lo mira en todos los vértices durante 3,5 s).
- **A3 · Caricia** (`characters/Astronaut.jsx`, `Woody.jsx`, `bones.js`): el clip bajaba la mano a 0,37 m del suelo, dentro de Woody. Encima del clip, **cinemática inversa de dos huesos** (brazo → antebrazo → palma) lleva la palma a donde está de verdad **su cabeza** (de pie o sentado) o **su lomo** (tumbado, o en The Cosmic Lab, donde la cabeza va dentro de la escafandra), según su pose en cada fotograma; del clip quedan el ir y venir y las palmaditas. Si Woody está sentado o tumbado y a mano, **ya no se levanta**: se le acaricia como está. En The Cosmic Lab se pone de costado y más cerca (0,72 m) para que llegue al lomo.
- **A4 · Hamaca** (`experience/intro/hammock.js`, `Welcome.jsx`): hamaca a rayas (naranja, crema y verde azulado) colgada del tronco y del poste de la farola, con barras de madera y cuerdas, que se balancea muy despacio (±0,035 rad, 5,2 s). El astronauta, tumbado con las manos tras la cabeza y la pierna derecha colgando por el lado de la cámara (la mochila se oculta mientras está tumbado: asomaba bajo la tela); Woody duerme debajo, en el suelo. Al pulsar, **salta de la hamaca en 0,42 s** (arco de 32 cm, se endereza de cara a la cámara, la hamaca da un vaivén) y entonces empieza el descenso. Con «reducir movimiento», sin salto. Las setas se han movido al otro lado del tronco (bajo la hamaca duerme Woody; si se quedaban sin sitio, su malla con 0 copias daba un aviso de WebGPU).

*Decisiones mías*: (1) la caricia sentado o tumbado solo se da si Woody está a menos de 1 m; si no, se levanta y viene, como antes. (2) Sentado o tumbado no hace la reacción de la caricia (los clips que hay son de pie). (3) Colores de la hamaca: el naranja del traje, el crema de los carteles y un verde azulado.

*Pruebas nuevas*: `isla.mjs` (8: nada atraviesa la isla, hamaca y sueño, balanceo, salto antes del descenso y ≤ 0,5 s) y `caricia.mjs` (24: palma entre 3 y 11 cm sobre la cabeza o el lomo en todas las lecturas, en los tres mundos, de pie, sentado y tumbado; en The Twisted Moon Woody no se tumba nunca); las dos, en `npm run e2e`. `loader.mjs` (nubes) y `welcome.mjs` (el clic responde en 18–63 ms con el salto; el descenso empieza a los 433–465 ms), al día. **Batería al cerrar el bloque: veinticinco pruebas, 692 comprobaciones, 0 fallos.** `npm run build` pasa.

*Sin comprobar*: cómo se ve la hamaca en un teléfono (solo emulado en las pruebas de siempre); la caricia jugada a mano (las pruebas colocan a Woody).

## Objetivo 26 — Cartas aprobadas en los tres mundos y baloncesto nuevo (con Firebase)

Encargo: `docs/OBJETIVO-26.md` (21-11-2026). **Sustituye al bloque 2 del objetivo 25; las cartas de la muestra del 25 no valen.** Tres bloques, commit y push en cada uno; parada solo al final.

| Bloque | Estado |
|---|---|
| 1. Las tres cartas (y lo pendiente del mundo 3) | **Hecho** (21-11-2026). Capturas: `capturas/32-cartas/` |
| 2. Baloncesto: tiro en suspensión y segundo defensa | **Hecho** (21-11-2026). Capturas: `capturas/33-baloncesto/` |
| 3. Concurso de triples y tablón de puntuaciones (Firebase) | **Hecho** (21-11-2026). Capturas: `capturas/33-baloncesto/` |

**Bloque 1, lo que hay.** Maquetas de referencia: `docs/referencias/cartas/` (las cuatro estaban; se capturan con `node tests/e2e/maquetas.mjs`).

*Las cartas* (`ui/Modal.jsx` (la base), `ui/cards/Objects.jsx` (los tres objetos), `Parts.jsx` (X, botón), `Markers.jsx` (marcadores dibujados), `styles/cards.css`, `content/cards.js`):
- **Cada carta es un objeto de su mundo**, con las medidas, colores, sombras, giros y `clip-path` de su maqueta, en px; el objeto entero se encoge a escala para caber en la ventana (en móvil, hasta caber a lo ancho: lo demás se desplaza). Lo común se mantiene: velo sin desenfoque, crece desde el objeto, E o Esc, una sola X, foco atrapado, «reducir movimiento», menú de arriba oculto.
- **Mundo 1 · cartel de madera**: marco con relieve y tornillos, tablones con vetas, juntas y clavos, dos papeles con chinchetas rojas (−4,5° y +3,8°, el de abajo con la esquina doblada), «PROYECTO n / 4» y placa del año, título en Titan One, separador punteado, plaquitas y el botón «VER PROYECTO». Lo usan los cuatro proyectos, el CV, los tótems del laboratorio, los avisos de viaje y **Contacto** (nuevo: con la E al pie de la antena de la estación; sin imágenes, con el correo, LinkedIn y GitHub como plaquitas y «Escribirme un email»).
- **Mundo 2 · cartel colgante**: brazo de hierro con espirales, cadenas y farolillo (su llama tiembla), tablón morado irregular, cinta a rayas, clavos, dos polaroids con chinchetas doradas y nota en Caveat, la hoja de bordes rotos con el título en Mystery Quest, el engranaje «n/4» al lateral, la X crema arriba en el centro y «Siguiente parada». Lo usan las cuatro paradas, la casa sobre tronco (sin engranaje), la torre («Mi recorrido», con la línea de tiempo dibujada a mano), el observatorio (su botón: «Viajar a The Cosmic Lab») y los avisos de viaje. **«Siguiente parada» funciona**: cierra, se gana el engranaje y Woody guía a la parada que falte más cerca (con todas, a la torre; desde la torre, al observatorio).
- **Mundo 3 · máquina**: carcasa lila con relieve, cúpula, antena con bola lima, tubo con burbujas que suben, fila de luces, pantalla morada con líneas de escaneo, dos móviles holográficos sobre sus emisores, etiqueta de estado, título en Fredoka, subtítulo rosa, «› ENERGÍA ENVIADA AL NÚCLEO · n/5» y la X de borde rosa. La usan las cuatro máquinas con contenido, el núcleo y la antena (estas, sin móviles).
- **En móvil**: el cartel en vertical (como `mundo1-cartel-movil.html`); el colgante, con un gancho en vez de brazo, las polaroids en fila y la hoja debajo; la máquina en vertical, con los móviles arriba, el texto debajo y el tubo hecho una franja fina. (De los mundos 2 y 3 no hay maqueta de móvil: se han hecho según la descripción.)
- **Nada pendiente a la vista**: se han quitado «Mi papel» y el botón «Abrir la app» (salen solos cuando haya dato); el hito de la empresa actual en «Mi recorrido» sale como «Ahora» (`CURRENT_COMPANY = null` en `content/twisted.js`); la app de viajes se llama «App de viajes» hasta que se confirme su nombre. `cards.mjs` y `cosmic.mjs` comprueban que ninguna carta enseña un «[».
- **Letras**: las de las maquetas (Titan One, Nunito, Mystery Quest, Caveat, Fredoka, JetBrains Mono), de Google Fonts. Se piden al entrar en el juego, no con la portada, y las del mundo en que se está se dejan descargadas.

*Textos que vienen de las maquetas* (aprobadas por David) y no estaban en el contenido: de Woody, el subtítulo «el guía de esta isla» y las notas «Woody, en casa» y «en el suelo, claro»; de Dosia, el subtítulo «App para enfermería y medicina» y la descripción partida en dos. En las demás paradas, a falta de subtítulo y de notas, van el nombre del sitio y el título de la parada.

**Dónde se pone el material** (todo en `src/content/cards.js`; los archivos, en `public/`):

| Carta | Campo | Qué es |
|---|---|---|
| Proyecto | `PROJECT_CARDS[id].images: [arriba, abajo]` | Los dos papeles. Hoy el de arriba usa la captura que el proyecto ya tiene y el de abajo, un boceto dibujado |
| Proyecto | `PROJECT_CARDS[id].role` | «Mi papel» (sale solo si se rellena) |
| Parada | `TALE_CARDS[parada].photos: [arriba, abajo]`, `.captions` y `.subtitle` | Las dos polaroids, su nota manuscrita y la línea bajo el título |
| App | `APP_CARDS[app].screens: [arriba, abajo]` o `.video` | Los dos móviles (el vídeo va en el de arriba, silenciado y en bucle; solo existe con la carta abierta) |
| App | `APP_CARDS[app].link` y `.status` | «Abrir la app» sale solo si está publicada y hay enlace |

*El mundo 3* (`worlds/cosmic/`: `LabScene.jsx` (rehecho), `useLabModel.js`, `CosmicSounds.jsx`, `soundData.json` (nuevos), `Growth.jsx`, `layout.js`, `models.js`, `Scene.jsx`; `content/cosmic.js`; `tools/assets/cosmic.py`, `cosmic_sounds.py`):
- **Recursos de Envato integrados**: los trece ZIP estaban en Descargas; movidos a `assets-externos/mundo3/`. Siete modelos (446 kB) y nueve sonidos. Detalle en `docs/RECURSOS.md` y `docs/CREDITOS.md`.
- **Cinco máquinas distintas**: Dosia, el escáner; Epidos, la consola; Chuchómetro, la consola doble; la app de viajes, la cápsula (sin la figura de dentro); los experimentos 3D, la cápsula hecha a mano, **apagada y sin carta**. Cada una sobre su peana, con su antena (de ahí sale el rayo), su tubo al núcleo y su **luz de estado**: lima si está publicada, ámbar si está en construcción. Las cuatro se encienden igual (secuencia, rayo, testigo, carta); Woody guía de una a la siguiente.
- **La antena** es el plato de Envato (5.599 triángulos); con la E abre su carta («Está apagada…») y suenan sus pitidos.
- **Cristales y corales** de Envato, con instancias y teñidos por copia (12 + 11 en el llano, 70 + 46 lejos).
- **Sonido**: música con `?musica=1/2/3` (solo se descarga la elegida), ambiente muy bajo, arranque y rayo al encender, zumbido con alguna máquina encendida, salto muy bajo y pitidos de la antena. Todo pasa por el botón de silencio.
- **El núcleo no puede completarse hoy** (máximo 4 de 5): falta el contenido de los experimentos. El arranque del núcleo y «Envía una señal» siguen sin hacer.

*Pendiente de David* (nada de esto se ve en el juego): «Mi papel» de los cuatro proyectos; el enlace de Dosia; el nombre de la app de viajes (¿Nokei?) y el de la empresa actual (¿Adrava?); cuáles son los experimentos 3D; fotos, capturas y vídeos; el PDF del CV (su cartel dice que está pendiente de subir: era así antes); autor de los seis efectos de sonido (no figura en los ZIP).

*Decisiones mías*: (1) en los proyectos, el papel de arriba enseña la captura real que ya había, no un boceto. (2) Los tornillos del cartel van en las cuatro esquinas del marco (en la maqueta los de abajo y la derecha caen dentro de la cara). (3) Los títulos largos van más pequeños que el de la maqueta. (4) En el mundo 3, qué aparato es cada app lo he elegido yo (el escáner médico para Dosia).

*Pruebas*: `cards.mjs` rehecha (42 comprobaciones, contra las medidas de las maquetas: colores del marco, giros, chinchetas, letras cargadas, `clip-path`…); `cosmic.mjs`, 47 (cinco máquinas, luces de estado, segunda máquina, sonido); `twisted-quest.mjs`, 55. **Batería al cerrar el bloque: veinte pruebas, 564 comprobaciones, 0 fallos.** `npm run build` pasa (CSS 48,6 kB; trozo principal 2.042,5 kB; escena del mundo 3, 34,4 kB + datos 9,1 kB); servidor de desarrollo limpio.

*Sin comprobar*: nada visto ni oído por una persona (las animaciones, el sonido del mundo 3 y los volúmenes «muy bajos»); un teléfono de verdad; un lector de pantalla; las cartas con fotos, capturas o vídeo reales; que Google Fonts cargue en la red del visitante (si falla, las cartas caen a Nunito o a la letra del sistema).

Capturas (`capturas/32-cartas/`): `hoja-referencia-mundo1.jpg`, `-mundo1-movil.jpg`, `-mundo2.jpg` y `-mundo3.jpg` (la maqueta a la izquierda, la carta real a la derecha), `hoja-movil.jpg` y las 28 sueltas (22 de escritorio y 6 de móvil); las maquetas, en `referencias/`. Se rehacen con `node tests/e2e/cartas.mjs`.

**Bloque 2, lo que hay** (`worlds/living/Court.jsx`, `courtPhysics.js`, `characters/jumpShot.js`):
- **Tiro en suspensión**: con el balón y a tiro, al mantener la E (o el dedo, o el ratón) el astronauta se agacha un instante (0,16 s), **salta con su salto de siempre** (el mismo impulso y el mismo sonido) y sube el balón; al soltar, el balón sale de sus manos. Mientras tira no anda. Si llega al suelo sin soltar, el balón sale tarde y mal.
- **Animación**: generada por código, como la carrera (los clips de baloncesto del modelo eran de un solo brazo): anticipación, subida con las puntas de los pies hacia abajo, brazos en alto con los codos doblados, golpe de muñeca, acompaña mientras cae y aterriza con las rodillas blandas. No va a su aire: sigue al salto de verdad y al momento en que se suelta. Si entra y el astronauta está quieto, **celebra** (`Astro_CelebrateSmall`).
- **Medidor**: la barra junto al astronauta sube con el salto; la franja verde del centro es lo más alto. Soltar ahí (margen de unos 160 ms) es **tiro perfecto**: sin desvío, entra (salvo tapón) y lo dice. Antes, se queda corto; después, se pasa; y cuanto peor, más se desvía. Avisos: «Pronto», «Tarde», «Corto: has soltado pronto», «Largo: has soltado tarde».
- **Arco**: parábola alta (de 0,85 a 1,7 s de vuelo según la distancia; entra a unos 55°-60°). **El aro cede** por el lado de fuera cuando le da el balón (hasta unos 5°, con la red colgando de él), rebota un par de veces y se queda quieto; la red se sigue yendo con el balón, como antes.
- **Segundo defensa** (azul; el del aro sigue siendo el naranja): con el balón en juego se pone entre el jugador y la canasta, a 1,45 m, y va con él; pero **persigue el sitio donde el jugador estaba hace 0,3 s y va a 3 m/s** (el jugador anda a 3,6 y corre a 6,2), así que un cambio de dirección lo deja atrás. Si el tirador despega a menos de 2,1 m de él, salta a taponar con 0,2-0,34 s de retraso: soltando arriba el balón le pasa por encima; soltando tarde, lo tapona. No se pisa con el otro defensa (0,95 m) ni se echa encima del jugador, y el jugador no lo atraviesa. Sin balón en juego espera junto a la zona.
- **Sonidos**: todos estaban (bote, aro, tablero, red, tapón, lanzamiento y salto). No falta ninguno.

*Decisiones mías*: (1) pronto = corto y tarde = largo (para que el aviso enseñe a corregir). (2) El perfecto entra siempre desde cualquier distancia de la pista si nadie lo tapona. (3) El segundo defensa salta al ver despegar al tirador, no al salir el balón (si no, nunca llegaría).

*Pruebas*: `basket.mjs` rehecha (35 comprobaciones: se agacha, salta, medidor, perfecto, pronto, tarde, racha, aro que cede, los dos defensas, valla, puerta) y añadida a `npm run e2e`; `progress.mjs` y `living.mjs`, al día. **Batería al cerrar el bloque: veintiuna pruebas, 599 comprobaciones, 0 fallos.** `npm run build` pasa.

*Sin comprobar*: cómo se siente el tiro en la mano de una persona (el margen del perfecto, el retraso del defensa) y en un teléfono de verdad.

Capturas (`capturas/33-baloncesto/`): `hoja-tiro.jpg` (los seis fotogramas: anticipación, subida, arriba, suelta, cae, entra) y sus seis sueltas, `defensas.jpg` y `defensas-saltan.jpg`. Se rehacen con `node tests/e2e/tiro.mjs`. (`node tests/e2e/clips.mjs` saca una hoja de poses de cualquier clip del astronauta.)

**Bloque 3, lo que hay** (`worlds/living/Triples.jsx`, `courtPhysics.js` (la física y el estado de la pista, sacados de `Court.jsx`), `game/triples.js`, `game/scores.js`, `game/scoresRemote.js`, `content/triples.jsx`, `ui/cards/Scores.jsx`, `ui/TriplesHud.jsx`; `firestore.rules`, `.env.example`, `docs/FIREBASE.md`):
- **Concurso de triples**, opcional como el reto de fútbol: cartel «Concurso de triples» dentro de la pista, a la derecha de la puerta; con la E empieza. Los dos defensas se van a la banda. Cinco carros de cinco balones alrededor de la **línea de tres** (nueva: arco de 6,2 m con sus rectas de esquina): las dos esquinas, las dos alas y el centro. Cada canasta, 1 punto; el último balón de cada carro (azul), 2: máximo 30. **60 s**. El tiro es el de siempre (salto y medidor del bloque 2). Al vaciar un carro, el astronauta va solo, corriendo, al siguiente; mientras dura el concurso no anda (sí salta y tira). Puede haber varios balones en el aire a la vez.
- **Interfaz** arriba en el centro: tiempo (en rojo los últimos 10 s), puntos, carro n/5 con sus cinco balones (el azul al final) y «Salir». Cuenta atrás grande «3, 2, 1» con pitidos y otro de salida; al final, «¡Final!» y **bocina**. Woody mira desde fuera de la línea y **celebra** cada balón de dos y el final. Esc sale del concurso (sin pausar el portfolio); con una carta abierta el reloj se para.
- **Al acabar**: cartel de madera del mundo 1 con los puntos («29 puntos», placa «29 / 30» y un comentario) y, si se quiere, el nombre: de 3 a 12 caracteres, letras (con tildes y ñ), números y espacios, la misma regla que Firestore, con un mensaje claro si no vale, y un filtro básico de palabrotas. Guardar es opcional; la E no cierra este cartel (se venía pulsando para tirar): se cierra con la X o con Esc.
- **Tablón 3D** de madera junto a la puerta (a la izquierda), con «TOP 10 · TRIPLES» y las diez mejores escritas en el propio objeto; se repinta al leer y al guardar. Con la E abre el cartel grande con el top 10 (resaltado el del visitante) y su mejor resultado.
- **Logro «Francotirador»**: 20 puntos o más en el concurso (cambiada su descripción, que hablaba de «3 triples»; ya no sale como «próximamente»).
- **Firebase** (detalle en `docs/FIREBASE.md`): `npm install firebase` (13.4.0). Solo `firebase/app` y `firebase/firestore/lite`, en `game/scoresRemote.js`, que **se descarga la primera vez que se abre el tablón o se guarda**: **184,8 kB (43,9 kB con gzip)**, en un trozo aparte; el principal no lo lleva. Sin Analytics. Colección `triples`, documentos `{ name, score, createdAt: serverTimestamp() }`; top con `orderBy("score", "desc"), limit(10)` (sin índice compuesto). Reglas copiadas tal cual a `firestore.rules`, **sin desplegar**. Configuración en `.env.local` (fuera de git) y `.env.example`.
- **Dos modos**: remoto si están las variables; local («Solo en este dispositivo») si no, o si Firestore falla (sin red o más de 7 s sin responder al leer, 10 s al guardar), con un aviso suave. **Contra el abuso**: un envío por partida, botón desactivado mientras guarda, un envío cada 30 s por navegador, puntos redondeados y limitados a 0–30.
- **Sonido**: la cuenta atrás, la salida y la bocina son nuevos (sintetizados como los demás del motor de audio, sin archivos). Los del balón, aro, red, salto y lanzamiento ya estaban.

*Decisiones mías*: (1) sitio del cartel y del tablón: dentro de la pista, a los lados de la puerta, de cara a quien entra. (2) El balón de 2 puntos es azul. (3) Si se acaban los balones antes del minuto, el concurso termina ahí (no se espera al reloj). (4) Esperas máximas a Firestore: 7 s al leer y 10 s al guardar. (5) El filtro de palabrotas es una lista corta en español e inglés (`BLOCKED` en `game/scores.js`): ampliable. (6) La E no cierra el cartel del final.

*Pruebas*: `triples.mjs` (39 comprobaciones; modo local: cartel, cuenta atrás, carros, puntos, balón de 2, cambio de carro, bocina, 29 puntos y logro, validación del nombre, guardado, tablón 3D y cartel del top, Esc, reloj, 30 s entre envíos, 0 pipelines en caliente, nada pedido a Firebase); `triples-remoto.mjs` (22; con Firestore simulado: lectura, guardado con solo `name` y `score`, botón desactivado, un envío por partida, caída a local; y con el SDK real sin red: se descarga solo al abrir el tablón y cae a local). **Ninguna prueba puede llegar a la base de datos real**: el navegador de las pruebas no resuelve `firestore.googleapis.com` (`tests/e2e/common.mjs`). Las dos, añadidas a `npm run e2e`. Arreglado de paso: las pruebas amplían el registro de descargas del navegador (se llenaba antes de que `cosmic.mjs` mirara los sonidos). **Batería al cerrar: veintitrés pruebas, 660 comprobaciones, 0 fallos.** `npm run build` pasa (trozo principal 2.048,2 kB; antes 2.045,1).

*Comprobación con la base de datos real* (una vez, a mano: `node tests/e2e/firebase-lectura.mjs`, que corta cualquier petición que no sea una consulta): **lee bien**, en 1,3 s, en modo remoto; la colección `triples` está vacía (el tablón dice «Aún no hay puntuaciones. ¡Estrena el tablón!»). No se ha escrito nada.

*Rendimiento* (`node tests/perf/fps-mundos.mjs`, 2880 × 1620 sin límite, este equipo Windows): mundo 1, 110–117 fps (pista 115); mundo 2, 188–226; mundo 3, 253–304. En línea con lo medido antes en este equipo (113–117 en el mundo 1).

*Sin comprobar*: **guardar en la base de datos real** (por las reglas del encargo, ninguna prueba escribe en ella: la primera puntuación de verdad la pondrá un visitante, o David a mano); que las reglas publicadas en la consola sean las de `firestore.rules`; el concurso jugado por una persona (dificultad, ritmo de los 60 s), en un teléfono de verdad y con lector de pantalla.

Capturas (`capturas/33-baloncesto/`): `hoja-concurso.jpg` y sus ocho sueltas: `1-cartel`, `2-cuenta-atras`, `3-partida`, `4-cambio-de-carro`, `5-final-con-nombre`, `6-tablon-3d`, `7-tablon-abierto`, `8-final-tiempo`. Se rehacen con `node tests/e2e/triples.mjs capturas/33-baloncesto`.

## Objetivo 25 — Una carta distinta por mundo y nuevo enfoque del mundo 3

**Superado por el objetivo 26**: las cartas de esta muestra no se aprobaron; lo que sigue se conserva como registro.

Encargo: `docs/OBJETIVO-25.md` (21-11-2026). Dos bloques; parada tras cada uno.

| Bloque | Estado |
|---|---|
| 1. Muestra: una carta de cada tipo | **Hecho. Parada: pendiente del visto bueno de David.** Capturas: `capturas/31-cartas/muestra/` |
| 2. Aplicarlas a todo, recursos de Envato y sonido del mundo 3, las cinco máquinas con su estado | Sin empezar (**no empezar hasta el visto bueno**) |

**Bloque 1, lo que hay** (`ui/Modal.jsx` (rehecho: el componente base), `ui/cards/Bodies.jsx` (las tres variantes) y `Markers.jsx` (los marcadores dibujados), `styles/cards.css`, `content/cards.js`; `experience/state.js` (`view`), `experience/Player.jsx`, `worlds/living/zones/ProjectVillage.jsx`, `worlds/twisted/ClockQuest.jsx`, `worlds/cosmic/LabScene.jsx`, `content/cosmic.js`; `tests/e2e/cards.mjs` (prueba) y `cartas.mjs` (capturas)):

- **Un componente, tres variantes.** `Modal.jsx` es la base; el evento `open` trae `variant` («ficha», «hoja» u «holo») y los datos. Sin variante, la carta sencilla de antes (avisos de viaje, CV, laboratorio del mundo 1, las otras paradas del mundo 2, el núcleo): **todavía oscura**, pero ya con lo común.
- **Lo común**: la misma letra y el mismo botón de cerrar; **E o Esc cierran** (la E, pasados 0,3 s de abrirse, y esa pulsación no vuelve a usar el objeto; Esc también cancela mientras la cámara se acerca); **velo suave sin desenfoque** (26–34 %: el mundo se sigue viendo); **la carta sale del objeto usado** (se calcula dónde cae en la pantalla y crece desde ahí); la interfaz de juego (menú, Woody, sonido) se retira mientras está abierta; foco atrapado dentro (Tab no sale) y vuelve a donde estaba; con «reducir movimiento» aparece en su sitio, sin viaje ni parpadeo; en móvil, 95 % del ancho, hasta casi todo el alto, y se desplaza con el dedo.
- **Mundo 1 · ficha de proyecto** (crema, acentos naranja): arriba la galería (44 % de la carta) con flechas, puntos y ←/→ cuando hay más de una imagen; debajo «Proyecto» y el año, nombre, la línea de qué es, la descripción, «Mi papel», tecnologías como etiquetas y «Ver proyecto» (y «Código» si hay enlace). **Ya la usan los cuatro proyectos** (era el mismo código que hacerla para uno). El de muestra es «Configurador Temyplast»: los cuatro tienen el mismo material (una imagen, enlace, etiquetas y año).
- **Mundo 2 · hoja de cuento** (solo la parada de Woody): papel hueso de borde irregular, chincheta, se despliega al abrirse; título con subrayado a mano y el adorno de la parada (una huella); tinta azul oscura; la polaroid torcida con la silueta dibujada de un perro y «Woody» debajo. Al cerrarla se sigue ganando el engranaje.
- **Mundo 3 · holograma** (Dosia): sin caja. Un móvil translúcido de borde turquesa que parpadea, con la interfaz esbozada con líneas que se dibujan solas; al lado, un panel de cristal oscuro (para que se lea sobre cualquier fondo) con el nombre, la etiqueta «PUBLICADA» en lima, su frase y «Abrir la app»; debajo, el haz que sube desde la cúpula de la máquina. «En construcción» sale en ámbar, sin botón y con un plano en construcción dentro del móvil (hecho y probado; lo usarán las otras cuatro en el bloque 2).
- **Nuevo enfoque del mundo 3**: el rótulo pasa de «App propia» a «Lo que estoy construyendo». El estado de cada app está en `content/cards.js` (`APP_CARDS`). La luz de estado en cada máquina, en el bloque 2.

**Dónde se pone el material cuando David lo aporte** (sin tocar ningún componente): todo en **`src/content/cards.js`**. Los archivos se dejan en `public/` y se escribe su ruta pública.

| Carta | Campo | Dónde dejar el archivo (ejemplo) |
|---|---|---|
| Proyecto (mundo 1) | `PROJECT_CARDS[id].gallery` (lista de imágenes) y `.video` (un vídeo corto, va el primero) | `public/images/projects/…` → `"/images/projects/captura.png"`; `public/videos/…` |
| Proyecto (mundo 1) | `PROJECT_CARDS[id].role` («Mi papel») y `.code` (repositorio) | — |
| Parada (mundo 2) | `TALE_CARDS[parada].photo` (sale como polaroid) y `.caption` | `public/images/sobre-mi/…` → `"/images/sobre-mi/woody.jpg"` |
| App (mundo 3) | `APP_CARDS[app].video` (silenciado, en bucle, con botón de sonido) o `.screens` (capturas que pasan solas); `.link` («Abrir la app») y `.status` | `public/videos/…`, `public/images/apps/…` |

Mientras un campo esté vacío, la carta enseña su marcador dibujado. El vídeo solo existe con la carta abierta: no se descarga al entrar en el mundo.

**Pendiente de David** (se enseña tal cual en la carta, marcado con un recuadro de trazos): «Mi papel» de los cuatro proyectos; el enlace de Dosia (el botón «Abrir la app» sale apagado y lo dice). Ojo: **hoy un visitante vería «[PENDIENTE: David]» en esas dos cartas**; hay que rellenarlo u ocultarlo antes de publicar.

**Decisiones mías, por si no convencen**: (1) las capturas de la galería se enseñan enteras (con margen crema), no recortadas: son pantallazos de interfaz. (2) El panel de texto del holograma es un cristal oscuro translúcido, no texto suelto sobre el mundo: sin él no se leía sobre el suelo magenta. (3) La descripción larga del proyecto se mantiene bajo la línea de qué es.

**Lo que NO se ha hecho** (es del bloque 2): CV, contacto, laboratorio del mundo 1 y las demás paradas del mundo 2 (incluida la línea de tiempo dibujada de «Mi recorrido») con su carta; las otras cuatro máquinas y su luz de estado; **los recursos de Envato del mundo 3 (modelos, música y efectos): no se han tocado ni movido de Descargas**.

**Tropiezos**: la prueba nueva cazó dos fallos del propio rediseño antes de cerrar: las cartas sin acercamiento de cámara (las de viaje del menú) no llegaban a abrirse, y Esc dejó de cancelar la carta durante el acercamiento (lo vio `progress.mjs`). Los dos, corregidos.

**Batería al cerrar el bloque**: veinte pruebas (`cards.mjs`, nueva, 32 comprobaciones), 542 comprobaciones, 0 fallos. `npm run build` pasa (el CSS sube de 27,4 a 37,6 kB; el trozo principal, de 2.020,7 a 2.035,8 kB); servidor de desarrollo limpio.

**Sin comprobar**: la animación de apertura en movimiento (solo en fotogramas detenidos); un teléfono de verdad (el desplazamiento con el dedo se ha comprobado por estilos, no arrastrando); un lector de pantalla; la galería con un vídeo real y el holograma con vídeo o capturas reales (los caminos están escritos, sin material con que probarlos).

Capturas (`capturas/31-cartas/muestra/`): **`hoja-antes-despues.jpg`** (arriba las antiguas, abajo las nuevas), `hoja-movil-antes-despues.jpg`, `hoja-apertura.jpg` (tres fotogramas de cada una), `hoja-galeria.jpg` (la galería con varias imágenes —una demostración con imágenes de otros proyectos— y el marcador de cuando no hay ninguna) y las sueltas. Las antiguas, en `capturas/31-cartas/antes/`.

## Objetivo 24 — Órbita del mundo 2 y arranque del mundo 3 (The Cosmic Lab)

Encargo: `docs/OBJETIVO-24.md` (20-11-2026). Dos bloques, commit y push en cada uno; parada solo tras el bloque 2 (muestra de estilo del mundo 3).

| Bloque | Estado |
|---|---|
| 1. El mundo 2 desde la órbita | **Hecho** (20-11-2026). Capturas: `capturas/29-orbita-mundo2/` |
| 2. Mundo 3: viaje y muestra de estilo | **Hecho. Parada: pendiente del visto bueno de David al estilo.** Capturas: `capturas/30-mundo3/B/` |

**Bloque 2, lo que hay** — viaje y muestra de estilo de The Cosmic Lab (20-11-2026). Todo hecho a mano con el kit low-poly; no se ha descargado ningún modelo, textura ni sonido. **No existe `docs/referencias/mundo3/`: se ha seguido la descripción del encargo, sin imágenes de referencia.**

Archivos: `worlds/cosmic/` entero (nuevo: `layout.js`, `globe.js`, `models.js`, `materials.js`, `Terrain.jsx`, `AlienSky.jsx`, `Growth.jsx`, `LabScene.jsx`, `Helmet.jsx`, `Orbit.jsx`, `Scene.jsx`); `content/cosmic.js` (todos los textos), `game/labQuest.js` (el estado del juego); y en lo común: `worlds/index.js`, `worlds/orbit/OrbitSky.jsx`, `worlds/living/Space.jsx`, `worlds/twisted/Space.jsx`, `worlds/twisted/ClockQuest.jsx`, `content/twisted.js`, `content/woody.js`, `experience/Player.jsx`, `characters/Woody.jsx`, `ui/QuickMenu.jsx`, `styles/ui.css`, `achievements/Tracker.jsx`, `achievements/list.js`. **El «cosmic» que había en esa carpeta era el planeta de prueba de antes del mundo 1 (ya no se usaba): se ha retirado** y con él 2,6 kB del trozo principal.

*A. El viaje*
- The Cosmic Lab ya no lleva «Próximamente»: se elige desde la órbita de los otros dos mundos, con un clic o un toque sobre el astro o su rótulo, o con su tecla. Ahora hay dos destinos por órbita: **V el de arriba a la derecha y B el de abajo a la izquierda** (el rótulo lo dice: «VIAJAR · TECLA B»). Desde The Cosmic Lab: V vuelve a The Living World y B va a The Twisted Moon.
- Carga bajo demanda, como el mundo 2: al entrar en el mundo 1 no se pide nada suyo. 0 pipelines en caliente a la ida y a la vuelta.
- **El botón del observatorio del mundo 2 («Viajar a The Cosmic Lab») funciona**: la nave despega sola, sale de la órbita y aterriza allí (lo comprueba `twisted-quest.mjs`).

*B. La muestra de estilo*
- **Planeta**: un llano redondeado de unos 30 m que se pisa, cerrado por un reborde de lomas; más allá, el resto del planeta (lomas, lagos de líquido brillante, hongos, cristales, cúpulas de cristal), que no se pisa. Una sola rejilla en anillos para todo el planeta. Desde la órbita el planeta entero es el mundo, como en los otros dos.
- **Color**: suelo magenta con vetas turquesa; el resto del planeta, a bandas turquesa, magenta y lima (como el astro que ya salía en la órbita). Cielo turquesa que se vuelve lima en el horizonte, neblina de color a ras de suelo, sombras magenta. Siempre de día (sin botón de día y noche).
- **Cielo**: un planeta con anillos enorme al norte y dos soles (el grande, de donde viene la luz, y otro pequeño y turquesa). Se ven al llegar (la plataforma es un mirador), junto a la antena y al bajar con la nave.
- **El laboratorio**: en el centro, el **núcleo** apagado (tarima, cuatro garras, la esfera y dos aros) con cinco testigos, uno por máquina. Alrededor, la **máquina de Dosia**, completa, y **los sitios reservados** de las otras cuatro (una peana con la cápsula cerrada: no ofrecen nada). De cada una sale un tubo por el suelo hasta el núcleo. Al fondo, sobre una loma, la **antena**, apagada.
- **La máquina de Dosia**: cápsula de cristal sobre su peana, dos depósitos, antena y consola. Con la E: sin controles, sus luces arrancan a tirones, sube el líquido, sale el **rayo de energía** de su antena a la esfera del núcleo, se enciende su testigo, corre el líquido por su tubo, aviso «Dosia encendida · 1 de 5» y se abre su panel con el texto del encargo tal cual. Después la E vuelve a abrir el panel. Sobre la máquina encendida flota su nombre. Se guarda en la visita (`sessionStorage`, clave `lab-energia`). El núcleo, con una de cinco, coge un poco de luz y sus aros giran más deprisa; su E dice cuántas lleva.
- **Lo que crece** (con instancias; el movimiento lo hace el sombreador): 9 hongos gigantes, 12 racimos de cristales, 44 bulbos que laten, 30 matas de tentáculos que se mecen, 170 brotes, 16 piedras redondas y 13 rocas que flotan (suben y bajan). Dos charcas de líquido brillante que se vadean. Lejos, otras 318 copias (hongos, cristales, tentáculos, rocas que flotan y 12 cúpulas de cristal): andando solo se dibujan las cercanas (125).
- **Gravedad baja** (0,4 de la normal; `gravity` en los datos del mundo): el salto sube 3 m y dura 2 s (en los otros mundos, 1,2 m y 0,8 s). **Woody salta con el astronauta** (1,7 m) si está de pie a su lado, y lleva una **escafandra**: una burbuja de cristal con su aro y una antenita.
- **Interfaz**: contador «Energía n/5» en el menú, solo en este mundo. Logro «Mente inquieta» (ya existía en la lista como «Próximamente»): se consigue al encender una máquina. Woody, al llegar, cuenta de qué va y guía hasta la máquina; su menú gana dos destinos (el núcleo y la máquina de Dosia).

*Textos* (`content/cosmic.js`): solo lo que dice el encargo. De Dosia, su frase tal cual. De Epidos, Chuchómetro, la app de viajes y los experimentos 3D solo está el nombre y, en un comentario, lo que dijo David: no se enseñan todavía. **Pendiente de David**: confirmar el nombre «Nokei»; cuáles son los experimentos 3D; enlaces, capturas y estado de cada app; el texto del panel de las otras cuatro.

*Lo que NO está* (es de los bloques siguientes): las otras cuatro máquinas, el arranque del núcleo con las cinco, «Envía una señal» en la antena, leerlo todo desde el menú, sonido propio (aquí callan los grillos y los pájaros del mundo 1 y no suena nada suyo: ni música ni efectos de la máquina), un botón del menú que lleve a este mundo.

*Rendimiento* (2880 × 1620, sin límite, este equipo, las tres medidas seguidas):

| Mundo | fps |
|---|---|
| 1 · The Living World | llegada 87 · proyectos 91 · estanque 87 · meseta 91 · pista 89 |
| 2 · The Twisted Moon | llegada 139 · río 152 · terraza 153 · historia 158 · cima 155 |
| 3 · The Cosmic Lab | llegada 193 · núcleo 197 · Dosia 230 · charca 223 · fondo 227 |

(El mundo 2 dio 144 · 160 · 169 · 171 · 171 en el bloque 1, unas horas antes: este equipo baila de una tanda a otra.) 0 pipelines en caliente al entrar y al despegar en el mundo 1 (`tests/perf/entrada.mjs`), y en los viajes y paseos de los mundos 2 y 3.

*Peso del mundo 3* (lo que se descarga al viajar a él): datos 8,0 kB (3,9 comprimido) + escena 30,0 kB (11,2 comprimido) = **38 kB (15 comprimido)**. Sin modelos, texturas ni sonido. El trozo principal: 2.020,7 kB (2.023,3 antes: se va el planeta de prueba). La escena del mundo 2 sube de 128,7 a 132,2 kB por la tierra lejana.

*Pruebas*: `tests/e2e/cosmic.mjs` (nueva, 39 comprobaciones: viaje con la tecla B, carga bajo demanda, planeta entero en la órbita, gravedad, escafandra, reborde, encendido de la máquina paso a paso, panel con el texto tal cual, núcleo, logro, guardado, vuelta, y 0 pipelines en caliente); `twisted-quest.mjs` sube a 51 (el botón del observatorio lleva de verdad); `travel.mjs`, `rocket.mjs` y `progress.mjs` se adaptan a que The Cosmic Lab está abierto. `npm run e2e` pasa a diecinueve pruebas. **Batería al cerrar el bloque: diecinueve pruebas, 510 comprobaciones, 0 fallos.** `npm run build` pasa y el servidor de desarrollo arranca limpio. Capturas: `node tests/e2e/lab.mjs`.

*Tropiezos*: (1) el servidor de desarrollo siguió sirviendo una copia vieja de `worlds/cosmic/layout.js` tras editarlo (no vio el cambio): hubo que reiniciarlo. Si algo «no cambia» tras un parche, mirar eso antes que el código. (2) `layout.js` importa `./globe.js` con la extensión puesta: las pruebas lo leen con Node, que no la supone.

*Modelos de Envato*: no hace falta ninguno para lo que hay. Si David quiere más detalle del que da lo hecho a mano, lo que más lo agradecería: una **antena parabólica** y **un par de máquinas de laboratorio de ciencia ficción low poly** (para que las cinco no sean variaciones de la misma cápsula). Y sonido: una música de ambiente espacial tranquila, un zumbido de máquina que arranca y un «rayo» de energía.

*Sin comprobar*: nada visto en movimiento por una persona (el salto, el latido de los bulbos, el rayo y la secuencia de encendido solo en fotogramas y por estado); un teléfono de verdad y la calidad baja; el respaldo WebGL2; el viaje directo entre The Twisted Moon y The Cosmic Lab con la tecla B (probado desde el botón del observatorio y desde el mundo 1, no con esa tecla desde el 2); que las rocas que flotan no molesten a la cámara al andar bajo ellas.

Capturas (`capturas/30-mundo3/B/`): `postal.jpg` y `postal-este.jpg` (tres cuartos desde arriba), `hoja-juego.jpg` (cámara de juego: llegada, núcleo, Dosia, charca, fondo y un salto), `hoja-maquina.jpg` (apagada, el rayo, encendida y el núcleo con energía), `maquina-panel.jpg`, `hoja-vuelo.jpg` (subida, órbita y bajada), **`hoja-tres-mundos.jpg`** (una captura de juego de cada mundo, lado a lado) y las sueltas.

**Bloque 1, lo que hay** (`worlds/twisted/`: `farland.js` (datos), `farModels.js` (modelos), `FarScene.jsx` (escena), `falls.js` (las cascadas, sacadas de `Terrain.jsx`), `materials.js` (`moonlit`, sacada de `Flora.jsx`), `Terrain.jsx`, `Flora.jsx`, `Scene.jsx`, `ground.js`; `tests/e2e/twisted.mjs`):
- **El planeta entero es tierra.** Más allá de la isla hay ahora «tierra lejana», que no se pisa: terrazas a las mismas alturas que las de la isla (3,6 m cada una) con cortados de pizarra, 34 picos de pizarra, 394 árboles en bosques con claros (sauces, copas anchas y espirales, en versión de unos cien triángulos), 36 casitas de tejado puntiagudo con una ventana encendida en cada cara, 45 farolillos (junto a las casitas y a lo largo de los ríos) con su charco de luz cálida, seis lagunas (una en el antípoda), dos ríos que salen del foso y las unen, y tres mesetas de las que cae una cascada turquesa a su laguna. La orilla lleva una línea turquesa que brilla, como la espuma de la isla.
- **El mar ya no es un océano**: lo que rodea la isla queda como un foso de unos 13,5 m (± 3,5); el resto del agua son las lagunas y los ríos. De las 26 rocas del mar abierto del objetivo 22 quedan solo las que siguen en el agua.
- **El radio no se ha tocado** (32 m, el común): no hizo falta, y así ni la nave ni la órbita ni el mundo 1 cambian.
- **Todo se define sobre la esfera** (distancias medidas sobre el planeta), no sobre el plano: lejos del eje el plano se encoge al curvarse, y una laguna redonda en el plano saldría como una raja. Por lo mismo, cada copia se ensancha de través justo lo que el mundo, al cerrarse, la va a encoger en su sitio (se recalcula solo mientras cambia la curvatura: en la subida y la bajada).
- **A pie**: siete mallas con instancias (una llamada por forma) más el suelo (11.300 triángulos). En tierra solo existe la franja cercana (hasta 30 m de la costa: 264 copias de 590, y esa parte del suelo), y ni eso si la cámara no la alcanza a ver: la franja se reparte en celdas de 8 m y, si ninguna entra en cuadro, no se dibuja nada. Medido: abajo, en el centro de la isla, no se dibuja; desde las terrazas y los miradores asoma por el borde alto de la pantalla y sí.
- **Rendimiento** (2880 × 1620, sin límite, este equipo, las dos medidas seguidas el mismo día): antes 147 · 163 · 175 · 173 · 175 fps (llegada, río, terraza, historia, cima); después 144 · 160 · 169 · 171 · 171. Unos 3–4 fps de 170 (un 2 %) donde la orilla de enfrente entra en cuadro; las medidas de este equipo bailan ± 5 fps de una tanda a otra. 0 pipelines en caliente en todo el paseo con subida y bajada.
- **Ojo en Windows, otra vez**: el componente se llamó primero `Farland.jsx` junto a `farland.js` y la carga no terminaba (`./Farland` se resolvía a `farland.js`). Ahora es `FarScene.jsx`. Lo vio la carga en el navegador, no el linter.
- **Lo que cambia a pie**: desde las terrazas, los picos y los miradores, al otro lado del agua hay orilla, árboles y algún farolillo; abajo, junto al cohete, nada.
- Prueba: `twisted.mjs` gana tres comprobaciones (a pie no se dibuja; en el mirador de la torre, solo lo cercano; en órbita, todo). Batería al cerrar el bloque: dieciocho pruebas, 469 comprobaciones, 0 fallos. `npm run build` pasa (sigue el aviso antiguo de `hint` en `TouchControls.jsx`, que no es de este objetivo).
- Capturas: `orbita-antes-despues.jpg` (cuatro lados; arriba antes, abajo después), `subida.jpg` (tres fotogramas), `a-pie-antes-despues.jpg`; las sueltas en `antes/` y `despues/`. Utilidades nuevas: `tests/perf/fps-mundos.mjs` (fps de uno o de los tres mundos) y `tests/e2e/debug-load.mjs` (vuelca los errores de la página cuando la carga no termina).
- Sin comprobar: nada visto en movimiento por una persona (el ensanchado de las copias durante la subida solo se ha visto en fotogramas); un teléfono de verdad; el respaldo WebGL2. La cámara de la órbita rodea el planeta siempre a la misma latitud: el antípoda (la sexta laguna) no llega a verse de frente.

## Objetivo 23 — The Twisted Moon: contenido («arranca el reloj y conóceme»)

Encargo: `docs/OBJETIVO-23.md` (16-11-2026). Tres bloques (D1 mecánica, D2 paradas, D3 cierre), commit y push en cada uno; parada solo al final. **Todos los textos del mundo 2 están en un único archivo: `src/content/twisted.js`** (el nombre por confirmar es la constante `CURRENT_COMPANY`).

Antes de empezar, el retoque pendiente: borde frío de la roca clara del primer plano, un punto menos (cortados de 0,2 a 0,12; rocas sueltas de 0,14 a 0,07 y su tono de arriba, de claro a medio).

| Bloque | Estado |
|---|---|
| D1. Mecánica | **Hecho** (16-11-2026) |
| D2. Las paradas | **Hecho** (17-11-2026). Capturas: `capturas/28-mundo2-contenido/d2/` |
| D3. Cierre | Pendiente: **no empezar hasta que David lo diga** |

**Bloque D1, lo que hay:**
- **Estado del juego**: `src/game/moonQuest.js` (fuera de la carpeta del mundo 2 para que el menú lo lea sin descargar ese mundo): engranajes que se tienen, reloj parado o en marcha. Se guarda en la visita (`sessionStorage`, clave `luna-reloj`): al volver del mundo 1 o recargar la pestaña sigue igual; si el almacenamiento falla, vive en memoria. Avisa con el evento `quest`.
- **En la escena** (`worlds/twisted/ClockQuest.jsx`): cuatro engranajes de latón que giran y brillan ante su parada hasta recogerlos; la E de cada parada abre su panel y, **al cerrarlo**, se gana el engranaje (aviso «Engranaje n de 4», destello); la puerta de la torre (sin los cuatro, avisa de cuántos faltan; con los cuatro, arranca; después abre «Mi recorrido»); el observatorio («Lo que viene», con el botón «Viajar a The Cosmic Lab» apagado, «Próximamente»).
- **Torre** (`Buildings.jsx`, compás en `clockwork.js`): al llegar, agujas quietas en las diez y diez y esferas a media luz. Arranque (6,6 s, sin controles): la cámara va a la fachada, los cuatro engranajes encajan uno tras otro y giran, cuatro campanadas, las esferas se encienden, las agujas corren hasta la hora real, los murciélagos se espantan y vuelven; al acabar se abre «Mi recorrido» (línea de tiempo de cinco hitos en el panel). Con el reloj parado la torre no da campanadas.
- **Woody**: al llegar cuenta que el reloj está parado y echa a andar hacia la parada más cercana; tras cada engranaje, hacia la siguiente; con los cuatro, a la torre; después, al observatorio. Solo si no se le han silenciado los consejos. Su red de caminos gana once nudos (casa del alquimista, casita, invernadero y los dos puentes colgantes hasta el observatorio y la casa del árbol) y su menú, cinco destinos.
- **Interfaz**: contador «Engranajes n/4» junto a los logros, solo en este mundo. El panel (`Modal.jsx`) sabe pintar una línea de tiempo y un botón apagado.
- **Logros**: de 22 a 24: «Cuatro engranajes» (uno por parada, con progreso) y «Relojero» (arrancar el reloj). Un logro por parada no encajaba (serían cuatro insignias casi iguales): va como uno con progreso de 4.
- **Prueba nueva**: `tests/e2e/twisted-quest.mjs` (40 comprobaciones): reloj parado, las cuatro paradas con su texto tal cual, engranajes, secuencia, campanadas, línea de tiempo, logros, guardado en la visita, almacenamiento roto y 0 pipelines en caliente. `npm run e2e` pasa a dieciocho pruebas. Capturas del juego: `node tests/e2e/luna-juego.mjs`.
- Batería al cerrar D1: dieciocho pruebas, 456 comprobaciones, 0 fallos.

**Bloque D2, lo que hay** (`worlds/twisted/stops.js` (modelos), `StopsScene.jsx` (escena), `ClockQuest.jsx`, `layout.js` (`STOP_PROPS`); `ui/AboutPanel.jsx`, `QuickMenu.jsx`, `Modal.jsx`):
- **Casa del alquimista**: mesa con tres bocetos de web y un tablón con doce notas revueltas; con la E, vuelan y se ordenan en tres columnas (1,7 s viéndolo, luego el panel).
- **Casa del árbol**: estantería con un sombrero vaquero, una maceta con una hierba verde y una capucha blanca colgada (sin logos ni nombres), y una consola con televisor de tubo y la pantalla encendida.
- **Casita de cuento**: la cama de Woody, sin estrenar; el hueco del suelo, donde Woody va y se tumba cuando llegas (aquí sí se tumba: `woody.post.lie`); y su retrato en un caballete. **`public/img/woody.jpg` no existe: el marco lleva una silueta.** Lo decide Vite al arrancar o construir (`__WOODY_PHOTO__` en `vite.config.js`): con la foto puesta, sale sola, y sin ella no se pide ningún archivo.
- **Invernadero**: un mapa desplegado con chinchetas (sin nombres ni fronteras; la del este, la mayor), una maleta a medio hacer y un farolillo de papel apagado que se enciende con la E y se queda encendido.
- **Observatorio**: con la E se mira por el telescopio 2,3 s (un círculo con The Cosmic Lab y estrellas) y luego se abre «Lo que viene». El telescopio del modelo no se ha reorientado.
- **«Sobre mí» del menú**: en The Twisted Moon abre un panel con todos los textos (historia, las cuatro paradas, el recorrido y lo que viene) y un botón «Recorrerlo con Woody». Desde el mundo 1, la ficha del viaje gana un segundo botón, «Leerlo aquí», que abre el mismo panel (es lo único que cambia allí).
- Los objetos chocan (`colliders`) y lo menudo (helechos, setas, flores…) no nace encima.
- **Ojo en Windows**: dos archivos que solo se distinguen por mayúsculas rompen el arranque (`./Stops` se resolvía a `stops.js`; antes pasó con `./Quest` y `quest.js`). Los componentes se llaman ahora `StopsScene.jsx` y `ClockQuest.jsx`; no queda ningún otro par así en `src/`.
- Pruebas: `twisted-quest.mjs` sube a 49 comprobaciones (detalle de cada parada, notas, farolillo, Woody tumbado en su hueco, telescopio, panel «Sobre mí»); `twisted.mjs` y `travel.mjs` se adaptan a que «Sobre mí» abre el panel y el guiado sale de su botón. Batería al cerrar D2: dieciocho pruebas, 466 comprobaciones, 0 fallos (`football` falló una vez en «Al palo» y repetida pasó: no toca nada de esto). `npm run build` pasa.

## Objetivo 22 — Pulido visual de The Twisted Moon

Encargo: `docs/OBJETIVO-22.md` (16-11-2026). Solo aspecto, sin contenido nuevo: lo que manda es la cámara de juego. Tres bloques con commit y push cada uno; parada solo al cierre.

Capturas: `capturas/27-pulido-mundo2/` (fuera de git). **Las diez de siempre**, con la cámara de juego: `node tests/e2e/luna.mjs <carpeta> diez,postal,orbita juego` (llegada, plataforma, río, escalera, puente colgante, invernadero, casa sobre tronco, alquimista, observatorio y torre; más postal y órbita). `antes/` es el punto de partida (commit `732f6cf`).

| Bloque | Estado |
|---|---|
| 1. Color y luz | **Hecho** (16-11-2026). Hojas: `bloque1-antes-despues.jpg`, `bloque1-postal.jpg`; capturas en `b1/` |
| 2. Piezas que no se leen | **Hecho** (16-11-2026). Hoja: `bloque2-antes-despues.jpg`; capturas en `b2/` |
| 3. Vista desde la órbita | **Hecho** (16-11-2026), con la opción B, **elegida por David**. Hoja con las dos: `bloque3-orbita-opciones.jpg` |
| Cierre | **Hecho.** Hojas: `final-diez-antes-despues.jpg`, `final-postal-referencias.jpg`, `final-orbita.jpg`; capturas en `final/` |

**Bloque 1, lo que hay** (`worlds/twisted/`: `layout.js`, `ground.js`, `Terrain.jsx`, `Night.jsx`, `Life.jsx`, `Details.jsx`, `Scene.jsx`, `Buildings.jsx`):
1. **Paleta**: roca de pizarra, morado gris (`ROCK` en `ground.js`: saturación de ~40 % a ~20 %); cielo azul marino con degradado (`skyTop #060b1f` → `skyHorizon #283463`), niebla y fondo a juego; el velo de los edificios, menos morado.
2. **Contraste**: luz de ambiente de 1,4 a 1,0 y más oscura por abajo, luna de 2,9 a 3,2, sombras de 0,76 a 0,93: lo que no mira a la luna queda casi negro azulado y los charcos cálidos de farolas y ventanas destacan. Empedrado más gris (el despiece en piedras, en el bloque 2).
3. **Río y pozas** (`createRiverMaterial`): turquesa oscuro, casi verde azulado; solo hilos finos de corriente y una línea rota junto a cada orilla.
4. **Mar** (`createSeaMaterial`): sin texturas de ruido en el color (solo en el temblor de la espuma). Facetas lisas en azul marino, mayores a lo lejos (desde la torre no hormiguean); el reflejo de la luna, una franja de facetas que se encienden enteras.
5. **Cascadas** (`createFalls`, `createFallMaterial`): seis tiras por cascada, de anchos distintos, cada una a su velocidad y a su distancia de la roca, con huecos y desgarros; turquesa, solo las vetas rozan el umbral del resplandor. Al pie: espuma turquesa, niebla pálida (`Smoke`) y gotas que saltan (`Drops`, nuevo en `Details.jsx`).
6. **Luciérnagas**: de 0,32 a 0,17 m, casi sin halo, y se apagan a menos de 3 m de la cámara (se funden entre 3 y 5 m).
7. **Luna**: solo el creciente con su halo; la parte en sombra no se dibuja.

Batería al cerrar el bloque 1: diecisiete pruebas, 416 comprobaciones, 0 fallos.

**Bloque 2, lo que hay** (`worlds/twisted/`: `tower.js` (nuevo), `Buildings.jsx`, `House.jsx`, `CollarLantern.jsx`, `Terrain.jsx`, `models.js`, `plants.js`, `layout.js`; y una línea en `characters/Woody.jsx`):
1. **Woody**: contorno de luz de luna fría (materiales con borde encendido, solo en este mundo; al salir se apaga con un uniforme, sin cambiar de material: devolverle los antiguos compilaba un pipeline en caliente al volver al mundo 1). La luz de su farolillo, más fuerte (0,72 → 1,05) y colocada por encima y por delante: le da en la cara y en el lomo. En este mundo descansa sentado, no tumbado (`woodyStaysUp`): echado y visto desde arriba era la mancha plana.
2. **Torre del reloj**: propia, hecha a mano (`tower.js`); el modelo descargado («Big ben…», `torre.glb`) se retira. Piedra en bloques desiguales (una pieza por bloque sobre un núcleo oscuro que hace de junta), cornisas, cuerpo del reloj con **cuatro esferas encendidas** y agujas en las cuatro (la hora del visitante), tejado de pizarra alto, puntiagudo y retorcido con cuatro buhardillas y la punta en rizo, seis ventanas con marco de piedra clara, arco y cruceta, puerta con montante encendido y farol de forja, y tres engranajes de latón. Halos ante ventanas y esferas, charco cálido a la puerta. La captura «torre de cerca» encuadra ahora la torre entera (`OWN_VIEWS` en `luna.mjs`).
3. **Observatorio**: el mismo modelo, repintado al cargarlo (`RECOLOR` en `Buildings.jsx`): ladrillo → piedra gris morada, cúpula gris → cobre con cardenillo, telescopio → latón; y una ventana cálida con marco, hecha a mano.
4. **Casa del alquimista**: paredes más claras y grises (se lee la silueta contra el cortado), ventanas violetas con halo, humo violeta por la chimenea (`humo violeta`), farolillo cálido en la puerta con su charco; la buhardilla verde ya no deslumbra en blanco.
5. **Caminos**: piedras una a una (Voronoi en el sombreador del suelo), gris morado, con junta oscura y musgo en los bordes.
6. **Rocas sueltas** (`createShard`): bultos facetados de pizarra con una lasca, costra de musgo y tres setas pequeñas. (La «roca morada junto al puente» era la copa de un sauce vista desde arriba: ya no está ahí.)
7. **Árboles**: el sauce se rehace (copa pequeña y chata, 46 ramas colgantes en dos coronas, claras en la punta, que se mecen); a los de copa ancha les cuelgan tiras de musgo; tintes más claros (lavanda, verde azulado, malva). Los catorce árboles grandes pasan a los bordes de acantilado y al fondo, detrás de las terrazas: ninguno queda delante de la cámara ni junto a un camino.

Batería al cerrar el bloque 2: diecisiete pruebas, 416 comprobaciones, 0 fallos (una, «0 pipelines en caliente al volver», falló a la primera por los materiales de Woody; corregido como se dice arriba).

**Bloque 3, lo que hay** (`layout.js` (`ISLETS`), `models.js` (`createSeaRock`), `Flora.jsx`, `Terrain.jsx`; `luna.mjs` gana la captura `vuelta`: cuatro vistas desde la órbita, a un cuarto de vuelta cada una):
- El problema: la plataforma (el eje del planeta) está en la punta sur de la isla; la isla llega a 45 m hacia el norte y solo a 11 hacia el sur, así que medio planeta era mar liso y negro.
- **Opción A — planeta más pequeño** (20 m de radio en vez de 32; se prueba con `?radio=20`, que ya existía): la isla envuelve casi toda la esfera y el mar queda en un casquete. Pero sigue habiendo un lado vacío (el sur), los edificios asoman desmesurados (la torre mide casi un radio) y el radio es hoy uno solo para todos los mundos (`PLANET` en `state.js`): hacerlo propio de este obligaría a tocar la nave, la órbita y la curvatura que comparte con el mundo 1.
- **Opción B — el mar cubre la esfera** (la que queda puesta): con el mundo cerrado, el mar se aclara y sus facetas contrastan (olas que se leen desde arriba), y lleva 26 rocas e islotes repartidos por toda la esfera, cada uno con su anillo de espuma (calculada en cada píxel). Todo dentro de `worlds/twisted/`; el mundo 1 no se toca. Andando, las rocas quedan mar adentro, lejos (a más de 40 m del eje y a 10 de la costa).
- Hoja: `capturas/27-pulido-mundo2/bloque3-orbita-opciones.jpg` (fila 1: antes; fila 2: A; fila 3: B).

**Cierre** (16-11-2026). Batería: diecisiete pruebas, 416 comprobaciones, 0 fallos. Rendimiento en las mismas condiciones (2880 × 1620, sin límite de fps, este equipo):

| Mundo | fps |
|---|---|
| 2 · The Twisted Moon | llegada 159 · río 170 · terraza 180 · historia 179 · cima 178 (calidad baja, móvil: 169–200) |
| 1 · The Living World | llegada 89 · proyectos 93 · estanque 87 · meseta 89 · pista 87 |

Pendiente de ojo humano: que el contorno de Woody y el balanceo de los sauces gusten en movimiento, y que la postal, aunque más contenida de color, sigue más oscura y menos frondosa que las referencias (los árboles grandes están ahora en los bordes y al fondo, como se pidió).

**Retoque de luz tras el cierre** (16-11-2026, pedido por David; solo mundo 2). Hojas: `retoque-diez-antes-despues.jpg`, `retoque-postal-referencias.jpg`; capturas en `retoque/`.
- **Vegetación**: `moonlit()` en `Flora.jsx` suma a copas, troncos, rocas sueltas y plantas bajas un tono medio propio (su color, enfriado) y un borde frío en lo que se ve de refilón; las sombras no cambian (la luz de ambiente y la de la luna siguen igual). Tintes de las copas más claros: sauces lila pálido y verde azulado.
- **Roca**: el suelo lleva lo mismo solo en los cortados (`flat` = 0): tono medio algo más alto y canto frío.
- **Mar**: dos rejillas de facetas de distinto tamaño e inclinación, sumadas y deformadas con ruido suave (ya no es un tablero), contraste entre facetas de ±30 % a ±11 %, franja de la luna más tenue, y un resplandor turquesa alrededor de la isla que se pierde en unos 18 m.
- **Halos de la torre**: de 1,5 a 0,95 m en ventanas y de 3,6 a 2,5 m en esferas, pegados al cristal.
- **Charcos de los farolillos**: cada uno de su tamaño (2,5 a 5,1 m) e intensidad, y uno de cada cinco sin charco.
- Batería: diecisiete pruebas, 416 comprobaciones, 0 fallos.

## Objetivo 21 — The Twisted Moon: que se parezca a las imágenes de referencia

Encargo: `docs/OBJETIVO-21.md` (15-11-2026). **Sustituye al bloque C del objetivo 20**; los bloques A y B de aquel quedan aprobados como base técnica. Tres bloques (C1 composición de la isla, C2 edificios y vegetación, C3 luz, agua, vida y sonido); paradas tras el C1 y tras el C3. Fuera: bloques D y E y el mundo 3.

| Paso | Estado |
|---|---|
| 0.1 Imágenes de referencia | **Hecho.** Estaban en Descargas; copiadas a `docs/referencias/mundo2/` (`ref-1.png`, `ref-2.png`, `ref-3.png`, 896 × 1200) |
| 0.2 Recursos de Envato | **Hecho.** Los trece zips estaban en Descargas; movidos a `assets-externos/mundo2/` (fuera de git) y descomprimidos, cada uno en su carpeta. No falta ninguno |
| 0.3 Observatorio y casa del árbol del mundo 1 | Colocados (los mismos archivos, con un velo morado); el recoloreado fino, en el C2 |
| 0.4 Presupuesto | Torre: 7.599 triángulos (tope 8.000). Casa sobre tronco: colores planos, sin texturas. Helecho: sin hacer (C2) |
| C1. Composición de la isla | **Hecho y aprobado** (16-11-2026). Capturas: `capturas/26-mundo2/C1/` |
| C2. Edificios y vegetación | **Hecho** (sin parada: David pidió seguir). Capturas: `capturas/26-mundo2/C2/` |
| C3. Luz, agua, vida y sonido | **Hecho. Parada: pendiente del visto bueno de David.** Capturas: `capturas/26-mundo2/C3/` |

**Bloque C3, lo que hay** — luz, agua, vida y sonido, **parada: pendiente del visto bueno de David** (16-11-2026; `worlds/twisted/`: `Life.jsx`, `TwistedSounds.jsx`, `soundData.json` (nuevos), `Details.jsx`, `Flora.jsx`, `Terrain.jsx`, `Scene.jsx`, `layout.js`; `audio/engine.js`, `audio/Sounds.jsx`, `experience/Interactions.jsx`, `experience/interact.js`; `tools/assets/twisted_sounds.py`; `tests/e2e/twisted-sound.mjs` (nueva), `twisted.mjs`, `luna.mjs`):
- **Luz**: la luna fría y baja como luz principal (del C2); puntos cálidos en ventanas, farolas y farolillos; turquesa que brilla en las cascadas (ahora pasan el umbral del resplandor) y en las setas; violeta en el invernadero y en la casa del alquimista. Lo que queda en sombra sigue oscuro, morado.
- **Agua**: cascadas animadas (vetas que bajan) que brillan, con **espuma** al pie (bocanadas claras que saltan y se deshacen); **mar con olas**: sube y baja despacio y se parte en triángulos grandes de tonos distintos que cambian con el oleaje; la espuma turquesa de la orilla y el camino de la luna, del C2.
- **Vida**: 120 **luciérnagas** amarillas por toda la isla (rondan su sitio, suben y bajan, parpadean), 9 **murciélagos** pequeños que dan vueltas lejos alrededor de lo alto de la torre, aleteando; **niebla** baja en bancos que derivan (del bloque B); **sauces que se mecen** con el viento (sus tiras, más que las copas anchas). Todo lo mueve el sombreador: una llamada de dibujo por cada tipo.
- **Música** (`?musica=1`, `2` o `3`; por defecto la 1): «Mysterious Fairy Tale Waltz» (entera, 95 s), «Curious Mystery Box» (su versión en bucle, con melodía, 159 s) y «Quirky Music Box» (no trae bucle con melodía: la entera, 208 s). En bucle sin corte (la cola se funde 3 s con el principio), volumen bajo, entra fundiéndose en 4,5 s al llegar y se funde en 2 s al irse en la nave. **Solo se descarga la pista elegida.**
- **Efectos**: grillos propios en bucle (los del primer mundo callan aquí); **campanadas**: dos al llegar junto a la torre (como mucho una vez por minuto) y, en cada hora en punto real del visitante, tantas como la hora, para toda la isla; **destello mágico** al usar algo (E o clic) y al pasar junto a una seta o un corro de luciérnagas; **pasos de madera** al cruzar los puentes y pasarelas; un **búho** cada 25–60 s, lejos y bajo, a un lado; además, el **mar** en la orilla y las **cascadas** a su pie (los bucles grabados del primer mundo). Todo pasa por la salida general: **el botón de silencio (o M) lo calla todo**.
- **Sobre «wooden stairs climbing»**: no puedo oír. Medido: 20 golpes regulares, uno cada 0,48 s, limpios: son pasos sobre madera, uno a uno. Se recortan diez y suenan en los puentes, uno distinto cada vez (como los de hierba del primer mundo). **Falta tu oído**: si suena a escalera, se pasa a las escaleras de piedra y se hacen crujidos cortos para los puentes, como dijiste.
- **Cambios en archivos comunes** (lo imprescindible, el mundo 1 suena igual): el motor de sonido aprende a cargar muestras de un mundo (`loadExtra`), a dispararlas (`playSample`), a llevar bucles con fundido (`startExtraLoop` / `stopExtraLoop`) y a poner pasos grabados propios de un mundo (`setStepSound`); `Sounds.jsx` calla grillos y pájaros si el mundo trae su ambiente (`ownAmbience`); usar algo avisa con el evento `interact`.
- **Rendimiento** (las mismas condiciones que siempre: 2880 × 1620, sin límite, este equipo): mundo 2, 144 · 159 · 168 · 168 · 167 fps (llegada, río, terraza, historia, cima); **calidad baja** (móvil: 844 × 390, densidad 1,25), 162 · 167 · 183 · 181; mundo 1, 80 · 87 · 84 · 82 · 82. 0 pipelines en caliente al entrar y al despegar en el mundo 1, y en todo el paseo del mundo 2 con la bajada en nave.
- **Peso del mundo 2** (lo que se descarga al viajar a él, con la música 1): código 79,8 kB (datos 16,4 y escena 63,4; 29,9 comprimido) · modelos propios 379 kB · sonido 1,54 MB (música 1,14 MB; grillos 182 kB; el resto, 242 kB) · **unos 2,0 MB en total**. Con la música 2, unos 2,8 MB; con la 3, unos 3,4 MB. El observatorio y la casa del árbol son los del mundo 1 (ya descargados). El trozo principal: 2.013,7 kB (+2 kB por el motor de sonido).
- **Qué se parece ya a las imágenes**: la composición (isla en terrazas con la torre en lo alto, observatorio y casa del árbol en los picos, casa sobre tronco, invernadero violeta abajo a la derecha, casita a la izquierda, plataforma delante con helechos), la luna creciente enorme con su halo, el cielo con estrellas y murciélagos, las ventanas cálidas, las setas turquesa y violeta, las luciérnagas, las calabazas, los puentes colgantes, la espuma turquesa en la orilla y la paleta morada.
- **Qué no, y por qué**: (1) **La isla es más baja y abierta**: en las imágenes es una torre de roca apretada, casi vertical; aquí tiene que dejar llano para andar, escaleras y sitio para la cámara de juego. (2) **Los árboles son más pequeños y sencillos**: las copas de las imágenes son enormes y muy detalladas; a ese tamaño taparían el camino y la cámara, y su detalle cuesta triángulos. (3) **La luz es más plana y azul**: las imágenes son ilustraciones con niebla volumétrica, rayos de luna y mucho brillo; aquí el resplandor está limitado a lo que emite, como pidió el encargo. (4) **La torre no tiene el tejado alto y puntiagudo** de las imágenes: es la de Envato con añadidos; se podría hacer un tejado propio. (5) **Las cascadas son láminas**: en las imágenes llevan volumen y espuma por todo el salto. (6) **La captura «torre de cerca»** sale demasiado pegada a la base; la esfera con las agujas se ve mejor en `torre-juego.jpg` y `cima-juego.jpg`.
- Sin comprobar: nada oído por una persona (el sonido se mide por su señal); nada visto en movimiento por una persona; un teléfono de verdad (la calidad baja se ha medido emulando uno); el respaldo WebGL2.
- Capturas: `capturas/26-mundo2/C3/` — `hoja-comparativa.jpg` (la postal junto a ref-1, ref-2 y ref-3), `hoja-postales.jpg`, `hoja-juego.jpg` (nueve puntos), `hoja-de-cerca.jpg` (torre, cascadas, invernadero y casa del alquimista), `hoja-vuelo.jpg` (subida, órbita y bajada con la luna) y las sueltas.

**Batería completa tras el bloque C3** (16-11-2026, en primer plano, en tandas de cinco, Chrome sin ventana, servidor de desarrollo en el 5199):

| Prueba | Bien | Fallos |
|---|---|---|
| `errors` | 8 | 0 |
| `living` | 46 | 0 |
| `characters` | 20 | 0 |
| `portfolio` | 27 | 0 |
| `progress` | 26 | 0 |
| `motion` | 10 | 0 |
| `camera` | 30 | 0 |
| `woody` | 37 | 0 |
| `rocket` | 26 | 0 |
| `terrain` | 3 | 0 |
| `life` | 11 | 0 |
| `football` | 63 | 0 |
| `sounds` | 28 | 0 |
| `travel` | 31 | 0 |
| `twisted` | 27 | 0 |
| `twisted-walk` | 6 | 0 |
| `twisted-sound` (nueva) | 17 | 0 |
| **`npm run e2e` (las diecisiete)** | **416** | **0** |
| `hora` | 21 | 0 |
| `basket` | 20 | 0 |
| `garden` | 6 | 0 |
| `birds` | 4 | 0 |
| `run` | 19 | 0 |
| `hill` | 29 | 0 |
| `collisions` | 4 | 0 |
| `welcome` | 21 | 0 |
| `loader` | 13 | **1** (la de siempre: primer pintado a 172 ms, objetivo 100; la pantalla de carga no se toca) |
| `tests/perf/entrada.mjs` | 0 pipelines en caliente al entrar y al despegar | — |

**Bloque C2, lo que hay** — edificios y vegetación (16-11-2026; `worlds/twisted/`: `plants.js` y `Details.jsx` (nuevos), `Flora.jsx`, `Buildings.jsx`, `layout.js`, `Terrain.jsx`, `Night.jsx`, `ground.js`; `experience/Player.jsx`; `tools/assets/twisted.py`; `tests/e2e/twisted.mjs`, `luna.mjs`):
- **Fallo intermitente de `twisted.mjs`, resuelto**: diez pasadas guardando el registro; falló **3 de 10, siempre la misma comprobación**: «y siguiéndole se llega a su puerta». No era el juego sino la prueba: Woody solo da el guiado por terminado con el astronauta a menos de 6 m de la puerta, y la prueba lo sigue en línea recta hacia el perro; en la escalera del este, a veces, se atascaba contra su costado y agotaba sus pasos. Ahora, si no llega siguiéndolo, termina el camino por los puntos de la red de guía (los que `twisted-walk` comprueba despejados) y lo que se comprueba es que, ya arriba, Woody ha cerrado el guiado. Después: **siete pasadas seguidas, 27 de 27**.
- **Torre del reloj**: deja de ser un campanario liso. Va **inclinada** (unos 3°), con una **aguja torcida** que sube, se vence y acaba en rizo con su bola dorada, **dos torrecillas** en esquinas opuestas, vencidas hacia fuera con su gorro torcido y una ventana encendida, un **balcón torcido** bajo la esfera (losa, ménsulas, barrotes desiguales y la puerta encendida) y **ventanas cálidas** en el fuste. Todo hecho a mano (`createTowerExtras` en `plants.js`), medido sobre el modelo para que encaje. **El reloj marca la hora del visitante** (la de su navegador; `?hora=` la fija): las agujas pintadas del modelo se quitan en la conversión y van dos propias, que giran.
- **Casita**: colores planos pintados a mano en la conversión, sin mirar su textura: tejado de pizarra morada, paredes de piedra clara, zócalo más oscuro, carpintería oscura y ventanas encendidas. Lleva una **chimenea de piedra** (el modelo no trae) **con humo**. Ojo: queda dentro de la sombra larga del cortado (luna baja); se ve morada y con las ventanas encendidas, y desde la cámara de juego lo que más se ve es el tejado.
- **Invernadero**: probado el de Envato a 5.000 triángulos: es una caja de cristal opaco y sin plantas; en una sola malla de colores planos su cristal no puede ser translúcido. **Se queda el hecho a mano**, mejorado: cristal violeta translúcido, dos bancales con plantas que brillan en violeta y turquesa, y su luz cayendo al suelo.
- **Helecho**: el de Envato **sí sirve** (las hojitas son geometría, no tarjetas): 6.336 → 1.400 triángulos, 40 kB, con instancias y teñido por copia (verde azulado o granate). Hay 90, con una corona alrededor de la plataforma.
- **Vegetación nueva, hecha a mano y con instancias** (`plants.js`): 5 **sauces llorones** (morados y verde azulado, con una cortina de tiras), 5 **árboles de copa ancha** morada, 4 **árboles en espiral**, 80 **enredaderas con rizos**, 172 **setas** cuyo sombrero brilla en turquesa o violeta, 277 **flores** violetas, además de los árboles rizados, matojos y lascas de antes. Una llamada de dibujo por forma.
- **Detalles**: 8 **calabazas sonrientes** (cara amable: ojos redondos y sonrisa, encendida), junto a puertas y caminos; 10 **farolillos** en los extremos de los puentes y a lo largo de los caminos (flojos: más fuertes teñían de naranja todo lo que tenían cerca); dos tramos más de **verja torcida** al borde de las terrazas; **humo** en las chimeneas de la casita y de la casa del alquimista (manchas de cara a la cámara que suben, se abren y se deshacen; lo mueve el sombreador).
- **Río**: ahora **serpentea** (pasa bajo la pasarela) y está **menos encendido** (agua oscura con vetas claras); las pozas, quietas. Las tres cascadas siguen cayendo de terraza en terraza: del macizo a la poza de la primera terraza, de ahí al río y del río al mar.
- **Isla más abrupta sin tocar lo que se pisa**: el mar baja de −1,9 a −3 m (los cortados de la orilla son más altos) y **ocho agujas de roca salen del mar** pegadas al cortado, detrás y a los lados (de 4,5 a 15 m), con su espuma. Se probaron primero sobre el borde de la isla y se comían unos 100 m² de suelo que se pisa: por eso van en el agua. Superficie que se pisa abajo: 1.476 m² (1.511 antes del C2; la diferencia son los troncos, farolillos y calabazas nuevos).
- **Luna** (respuestas de David): la cámara de juego no cambia. **Reflejo grande en el mar**: un camino de destellos desde quien mira hacia donde está la luna, roto en escamas por las ondas; se ve al andar cerca de la orilla. **Luz de luna** más fría y más baja (19°): sombras largas hacia la cámara; lo que queda en ellas, morado y no negro. **Al bajar con la nave la luna se ve**: el último tramo de la bajada acaba en un mirador (la plataforma), así que desde media bajada la cámara se va inclinando hacia el horizonte y la luna entra en cuadro antes de tocar tierra (`twisted.mjs` lo comprueba). Para eso la luna baja de 17° a 13,5° sobre el horizonte. Los tres miradores siguen.
- **Postal a 58°**: como estaba.
- Rendimiento (2880 × 1620, sin límite): mundo 2, 152 · 165 · 164 · 175 · 182 fps; mundo 1, 69 · 76 · 73 · 69 · 71 en esta tanda (el mundo 1 no ha cambiado: el equipo va más lento hoy; en el C1 dio 94–98). 0 pipelines en caliente al entrar y al despegar en el mundo 1, y en todo el paseo del mundo 2 (con la bajada en nave).
- Peso: datos del mundo 2, 15,9 kB (6,5 comprimido); escena, 56,8 kB (20,6 comprimido); modelos propios, 379 kB (torre 130, casita 105, casa sobre tronco 103, helecho 41).
- **Lo que todavía no se parece a las imágenes** (`hoja-comparativa.jpg`): la isla de las referencias es más apretada y vertical; aquí hay más llano para andar. Las copas de los árboles de las referencias son mucho más grandes y ricas. Las cascadas siguen siendo láminas provisionales (se animan y llevan espuma en el C3). Falta la vida (luciérnagas, murciélagos) y la niebla en movimiento, que son del C3.
- Sin comprobar: nada visto en movimiento por una persona; un teléfono y la calidad baja; el respaldo WebGL2.
- Capturas: `capturas/26-mundo2/C2/` — `hoja-comparativa.jpg` (la postal junto a ref-1, ref-2 y ref-3), `hoja-postales.jpg`, `hoja-juego.jpg` (doce puntos con la cámara de juego, la orilla con el reflejo incluida), `hoja-vuelo.jpg` (subida, órbita y bajada con la luna) y las sueltas.

**Batería completa tras el bloque C2** (16-11-2026, en primer plano, en tandas de cinco, Chrome sin ventana, servidor de desarrollo en el 5199 —arrancado de nuevo: al cambiar de día no estaba en marcha—):

| Prueba | Bien | Fallos |
|---|---|---|
| `errors` | 8 | 0 |
| `living` | 46 | 0 |
| `characters` | 20 | 0 |
| `portfolio` | 27 | 0 |
| `progress` | 26 | 0 |
| `motion` | 10 | 0 |
| `camera` | 30 | 0 |
| `woody` | 37 | 0 |
| `rocket` | 26 | 0 |
| `terrain` | 3 | 0 |
| `life` | 11 | 0 |
| `football` | 63 | 0 |
| `sounds` | 28 | 0 |
| `travel` | 31 | 0 |
| `twisted` | 27 | 0 |
| `twisted-walk` | 6 | 0 |
| **`npm run e2e` (las dieciséis)** | **399** | **0** |
| `hora` | 21 | 0 |
| `basket` | 20 | 0 |
| `garden` | 6 | 0 |
| `birds` | 4 | 0 |
| `run` | 19 | 0 |
| `hill` | 29 | 0 |
| `collisions` | 4 | 0 |
| `welcome` | 21 | 0 |
| `loader` | 13 | **1** (la de siempre: primer pintado a 180 ms, objetivo 100; la pantalla de carga no se toca) |
| `tests/perf/entrada.mjs` | 0 pipelines en caliente al entrar y al despegar | — |

**Bloque C1, lo que hay** — composición de la isla, **aprobado por David** (16-11-2026) (`worlds/twisted/`: `layout.js` (rehecho), `ground.js`, `Terrain.jsx`, `Structures.jsx`, `Buildings.jsx`, `House.jsx`, `Night.jsx`, `models.js`; `experience/Player.jsx` (miradores); `tools/assets/twisted.py`; `tests/e2e/twisted.mjs`, `twisted-walk.mjs`, `luna.mjs`):
- **La colina en espiral ya no existe.** La isla es más pequeña (unos 29 m de radio) y sube **en cuatro alturas** hacia el fondo: abajo (0 m), la plataforma del cohete, la casita y el invernadero; primera terraza (3,6 m), la casa sobre tronco al este y la del alquimista al oeste; segunda (7,2 m), un pico a cada lado —observatorio y casa del árbol— y el macizo central; cima (10,8 m), la torre del reloj. El borde de la isla es un cortado de 1,9 m sobre el mar.
- **Acantilados de roca morada facetada**: todo lo empinado de la malla (rejilla de 0,5 m) se pinta de roca, cada cara un tono; lo llano, césped verde azulado oscuro. No se trepan ni se saltan: cualquier punto en pendiente fuerte está vedado, se llegue subiendo o bajando.
- **Cinco escaleras de piedra** (dos de abajo a la primera terraza, dos de la primera a la segunda y la de la cima): por debajo son rampas lisas —es lo que se pisa— y encima van los peldaños, en una sola malla. **Cuatro puentes**: dos colgantes de cuerda y tablas entre los picos y el macizo (se comban en el centro) y dos pasarelas de tablones, sobre el río y sobre el arroyo. A un puente solo se entra por sus extremos (quien anda por debajo no «sube» a él) y por los lados no se sale.
- **Agua**: nace en el macizo, cae a una poza en la primera terraza, corre hasta su borde, cae otra vez y baja en río hasta saltar al mar por el oeste: **tres cascadas**, provisionales (láminas turquesa con vetas que corren). Mar oscuro con **espuma turquesa que brilla** pegada a la orilla (una línea firme y dos que van y vienen).
- **Edificios colocados, sin pulir**: torre del reloj (Envato, 116.080 → 7.599 triángulos, repintada en piedra morada, esfera encendida), observatorio y casa del árbol (los mismos archivos del mundo 1, con un velo morado en el material), casa sobre tronco (Envato, 3.600 triángulos, colores planos leídos de su textura, sin textura), casita (Envato, 5.000 triángulos; **sale blanca**: su textura no se ha leído bien, queda para el C2), invernadero (**hecho a mano por ahora**: el de Envato trae 102.000 triángulos en 44 piezas y hay que verlo con calma; se decide en el C2) y la casa del alquimista.
- **Decisión sobre «Sobre mí»**: pasa a **la casa sobre tronco** (es la que en las imágenes tiene la puerta encendida y se ve desde la plataforma). Ante su puerta, E abre el texto real. **La casa torcida del bloque B se queda**, más pequeña, como **casa del alquimista**, con las ventanas en violeta.
- **Luna creciente**, enorme (5,8° de radio: más de un cuarto del alto de la pantalla), blanca azulada, con halo, al norte, 12° a la derecha de la torre y a 17° sobre el horizonte. Su lado en sombra apenas se adivina.
- **Miradores** (`VIEWPOINTS` en `layout.js`; `lookout` en los datos del mundo; lo aplica `Player.jsx`, solo si el mundo los trae): en la plataforma, al pie de la torre y junto al observatorio la cámara baja y mira algo por encima del astronauta, despacio; entran en cuadro el cielo y la luna. Al alejarse vuelve sola.
- **La luna no entra en el borde superior del encuadre «la mayor parte del tiempo», y no puede**: la cámara de juego mira 39° hacia abajo y su borde superior queda 19° por debajo del horizonte; cualquier cosa que esté en el cielo cae fuera, se ponga donde se ponga. Hoy se ve en los tres miradores y al bajar con la nave. Para verla andando por toda la isla habría que inclinar la cámara en todo este mundo: **es decisión de David**.
- **Paleta**: sombras moradas (relleno violeta, no índigo), roca morada, césped verde azulado, turquesa en agua y espuma, cálidos en faroles y esfera, violeta en el alquimista y el invernadero.
- **Se recorre entero andando.** `twisted-walk.mjs` (sin navegador) inunda la isla en una rejilla de 25 cm desde la llegada con las reglas de los personajes: se alcanzan los 54 sitios (puertas, miradores, pie y alto de cada escalera, extremos y centro de cada puente y los 22 puntos de guía), se pisan las cuatro alturas, no hay escalones de más de 90 cm entre casillas vecinas, nadie acaba en el mar y los 22 tramos de la red de guía de Woody están despejados. `twisted.mjs` lo hace con el astronauta de verdad: cruza la pasarela, sube una escalera, cruza un puente colgante, empuja contra un borde y contra una baranda sin caerse, y sigue a Woody hasta la casa sobre tronco.
- **Arreglado por el camino — un atasco de verdad**: en el codo interior de una escalera la altura daba un salto de 31 cm (cada tramo «tiraba» de su lado) y el astronauta, siguiendo a Woody, se quedaba clavado en el rincón. Ahora lo andado se mezcla entre tramos con continuidad y las escaleras van en curva suave.
- **Rendimiento** (2880 × 1620, sin límite): mundo 2, 213 · 224 · 237 · 237 · 243 fps (llegada, río, terraza, historia, cima); mundo 1, 94 · 98 · 98 · 95 · 95. 0 pipelines en caliente al aterrizar y en todo el paseo.
- **Peso**: datos del mundo 2, 12,0 kB (5,0 comprimido); escena, 38,7 kB (15,0 comprimido); modelos propios, 322 kB (torre 130, casa sobre tronco 103, casita 89), más el observatorio y la casa del árbol, que ya estaban. El mundo 1 no cambia.
- **Lo que NO se parece todavía a las imágenes** (se ve en `hoja-comparativa.jpg`): falta toda la vegetación (sauces, copas moradas, helechos, setas, enredaderas: es el C2), los edificios están sin pulir y la torre es un Big Ben liso, sin el aire torcido de las referencias; el río es una cinta recta y demasiado encendida; la isla de las referencias es más abrupta y apretada que esta, que tiene que dejar sitio para andar; la postal usa un objetivo más abierto que el del juego (58° en vez de 40°) porque con el del juego no caben a la vez la isla vista desde arriba y la luna, y aun así la luna asoma solo por abajo.
- **Fallo intermitente sin identificar**: una pasada de `twisted.mjs` de ocho dio un fallo que no llegué a ver cuál era (solo contaba fallos); las cuatro siguientes, limpias. Además, la comprobación del guiado de Woody falló una vez por culpa de la propia prueba (iba en línea recta contra el costado de la escalera) y está corregida.
- Sin comprobar: nada visto en movimiento por una persona; un teléfono y la calidad baja; el respaldo WebGL2; los miradores con el zoom al máximo.
- Capturas: `capturas/26-mundo2/C1/` — `hoja-comparativa.jpg` (la postal junto a ref-1, ref-2 y ref-3), `hoja-postales.jpg` (tres ángulos), `hoja-juego.jpg` (diez puntos con la cámara de juego), `hoja-orbita.jpg` y las sueltas (también cada punto desde arriba). `node tests/e2e/luna.mjs` las rehace.

**Batería completa tras el bloque C1** (15-11-2026, en primer plano, en tandas de cinco, Chrome sin ventana, servidor de desarrollo en el 5199):

| Prueba | Bien | Fallos |
|---|---|---|
| `errors` | 8 | 0 |
| `living` | 46 | 0 |
| `characters` | 20 | 0 |
| `portfolio` | 27 | 0 |
| `progress` | 26 | 0 |
| `motion` | 10 | 0 |
| `camera` | 30 | 0 |
| `woody` | 37 | 0 |
| `rocket` | 26 | 0 |
| `terrain` | 3 | 0 |
| `life` | 11 | 0 |
| `football` | 63 | 0 |
| `sounds` | 28 | 0 |
| `travel` | 31 | 0 |
| `twisted` (rehecha) | 23 | 0 (ver el intermitente de arriba) |
| `twisted-walk` (nueva, sin navegador) | 6 | 0 |
| **`npm run e2e` (las dieciséis)** | **395** | **0** |
| `hora` | 21 | 0 |
| `basket` | 20 | 0 |
| `garden` | 6 | 0 |
| `birds` | 4 | 0 |
| `run` | 19 | 0 |
| `hill` | 29 | 0 |
| `collisions` | 4 | 0 |
| `welcome` | 21 | 0 |
| `loader` | 13 | **1** (la de siempre: primer pintado a 172 ms, objetivo 100; la pantalla de carga no se toca) |
| `tests/perf/entrada.mjs` | 0 pipelines en caliente al entrar y al despegar | — |

Respuestas de David a las tres dudas de la preparación (15-11-2026): probar «wooden stairs climbing» en los puentes y, si suena a escalera, dejarlo para las escaleras de piedra y hacer para los puentes crujidos cortos con ese mismo audio recortado; para `?musica=2` y `?musica=3`, la versión en bucle con melodía y, si no la hay, la entera; licencias, como las del mundo 1.

**Lo que trae cada recurso** (visto al descomprimir, sin abrirlo todavía en Blender):
- Torre del reloj (`big-ben-landmark-clock-tower`): `1.gltf` y `1.blend`, 4,7 MB.
- Invernadero (`greenhouse`): `.glb`, `.obj`, `.blend` y una textura `.png`, 31 MB.
- Casa sobre tronco (`stylized-treehouse-cottage`): FBX y OBJ con tres texturas `.jpg`, 28 MB.
- Casita de cuento (`whimsical-toon-cottage-with-stone-roof`): FBX, OBJ y `.blend` con un color base y siete mapas más, 22 MB.
- Helecho (`stylized-fern-plant`): FBX, OBJ y `.blend` con textura `.tga`, 21 MB.
- Música: `mysterious-fairy-tale-waltz` (mp3 y wav), `curious-mystery-box` (wav: entera, bucle, cortes de 60, 30 y 15 s y cuatro pistas sueltas), `quirky-music-box` (entera y corta, con y sin melodía).
- Efectos: grillos (mp3 y wav), campanada de torre, cuatro destellos mágicos, pasos sobre madera (el archivo se llama «wooden stairs climbing») y búho, todos en wav.
- Ningún zip trae archivo de licencia: son de la cuenta de Envato de David, como los del mundo 1. Se anotarán en `RECURSOS.md` y `CREDITOS.md` al integrarlos.

## Objetivo 20 — Mundo 2: The Twisted Moon

Encargo: `docs/OBJETIVO-20.md` (15-11-2026). Cinco bloques (A–E), commit y push por bloque; paradas tras el B (muestra de estilo) y tras el E. El mundo 3 (The Cosmic Lab) no se empieza.

| Bloque | Estado |
|---|---|
| A. Viaje entre mundos | **Hecho** |
| B. Muestra de estilo | **Hecho. Parada: pendiente del visto bueno de David.** Capturas: `capturas/25-mundo2/B/` |
| C. El resto del mundo | Sin empezar |
| D. Contenido e interacciones | Sin empezar |
| E. Vida, sonido y cierre | Sin empezar |

**Bloque A, lo que hay** (`worlds/index.js`, `worlds/travel.js`, `worlds/orbit/OrbitSky.jsx`, `worlds/orbit/worldModels.js`, `experience/Experience.jsx`, `experience/Ship.jsx`, `experience/state.js` (`voyage`), `experience/theme.js` (`lockTheme`, `sunFrom`), `ui/TravelOverlay.jsx`, `ui/QuickMenu.jsx`, `ui/Modal.jsx`, `content/sections.js`, `worlds/twisted/`, `tests/e2e/travel.mjs`):
- **Destino elegible desde la órbita.** En la vista orbital del mundo 1, The Twisted Moon ya no lleva «Próximamente»: su rótulo trae una pastilla clara («VIAJAR · TECLA V»; en táctil, «TOCA PARA VIAJAR») y late un poco. Se elige con un clic o un toque sobre el astro o su rótulo, o con la tecla V. The Cosmic Lab sigue cerrado. «Aterrizar» sigue en la E.
- **El viaje** (`worlds/travel.js`): la nave pone el morro hacia el otro planeta y acelera hasta perderse (2,3 s) mientras la pantalla se cubre («Rumbo a THE TWISTED MOON · Quién soy»); con la pantalla cubierta se cambia de mundo; al destaparse, la nave está en la órbita del destino (el planeta nuevo, curvado en esfera como el primero), espera 1,5 s y baja sola. La vuelta es igual: desde la órbita del mundo 2 se elige The Living World.
- **El mundo 2 se descarga solo cuando se viaja a él**: sus datos (`twisted/layout.js`, 4,9 kB) y su escena (7,8 kB por ahora) son trozos aparte del build; al entrar en el mundo 1 no se pide ninguno (lo comprueba `travel.mjs`). El cielo de la órbita, común a los dos mundos, es otro trozo (7,9 kB) que antes iba dentro de la escena del mundo 1.
- **0 pipelines en caliente al aterrizar**: al cambiar de mundo se vuelve al estado de carga (`cover()` en `Experience.jsx`): el lienzo deja de componerse, lo del mundo anterior se desmonta, lo nuevo se monta por partes (`Staged`) y se compila por tandas con el mismo precalentamiento de la entrada; solo entonces se destapa. Medido: 0 pipelines desde que se destapa hasta después de aterrizar, a la ida y a la vuelta. El mundo 2 tarda unos 4,6 s en montarse y compilarse; volver al mundo 1, lo que su carga inicial.
- **«Sobre mí»** (menú superior): en el mundo 1 abre una ficha («“Sobre mí” es ahora otro mundo») con el botón «Viajar a The Twisted Moon»: al pulsarlo la nave despega sola, llega a la órbita y sale hacia allí. En el mundo 2 es un sitio: Woody guía hasta la casa torcida. Y al revés: «Proyectos», «CV» y «Contacto», desde el mundo 2, ofrecen volver. Cada sección dice en qué mundo vive (`world` en `content/sections.js`).
- **Siempre de noche**: cada mundo puede fijar su momento (`moment` en sus datos → `lockTheme`): en The Twisted Moon no hay botón de día y noche y la tecla N no hace nada; al volver al mundo 1 se recupera su hora (o lo elegido a mano). Cada mundo puede traer también de dónde viene su luna (`night.sunFrom`).
- **Lo mínimo del mundo 2 para poder aterrizar** (lo demás es del bloque B): terreno con la colina en espiral, caminos, laguna alrededor, luna y niebla baja. `?world=twisted` (solo en desarrollo) abre directamente en él.
- **Arreglado por el camino**: al cambiar de mundo el anterior no se desmontaba (dos hijos de React con la misma clave); se vio en la primera captura de la órbita, con los dos planetas superpuestos.
- Sin comprobar: el viaje visto en movimiento por una persona (solo en fotogramas y por estado); un teléfono (el toque sobre el astro); el respaldo WebGL2; qué pasa sin conexión (el viaje se cancela y la nave se queda en órbita con un aviso: escrito, no probado).

**Bloque B, lo que hay** — muestra de estilo, **parada: pendiente del visto bueno de David** (`worlds/twisted/`: `layout.js`, `ground.js`, `Terrain.jsx`, `Night.jsx`, `models.js`, `materials.js`, `Flora.jsx`, `Fixtures.jsx`, `House.jsx`, `CollarLantern.jsx`, `Space.jsx`, `Scene.jsx`; `characters/Woody.jsx`; `tests/e2e/twisted.mjs`, `tests/e2e/luna.mjs`):
- **Todo hecho a mano** con el kit low-poly del proyecto (`living/kit/geometry.js`); no se ha descargado ningún modelo, textura ni sonido. Es una inspiración de estilo (cuento gótico): no hay personajes, escenarios ni diseños de ninguna película.
- **Noche fija**: luna fría y baja por el noroeste (la luz viene de 25° sobre el horizonte: sombras largas, hacia la cámara), cielo azul tinta arriba y morado en el horizonte, relleno violeta. Paleta en `layout.js` (`NIGHT`).
- **Luna enorme** (`Night.jsx`): un astro facetado con cráteres, 11° de radio en el cielo, a 13° sobre el horizonte, al norte: la colina y la casa se recortan contra ella. Desde la cámara de juego (que mira hacia abajo) no entra en cuadro; se ve en el descenso de la nave, a la altura del jugador y en su reflejo en la laguna. Desde la órbita se retira y queda la luna del cielo orbital.
- **Niebla a ras de suelo**, sin dibujar nada: va en el nodo de niebla de la escena, así que la reciben todos los materiales. Su techo (1,7 m de media) sube y baja a bancos que derivan despacio; lo que se atraviesa de ella depende de lo rasante que se mire (desde arriba es un velo; a ras de suelo, a lo lejos, se lo traga todo). Tiene su propio color, más pálido que la niebla del fondo. Se quita sola al salir de este mundo.
- **Terreno**: isla de unos 46 m de radio (como la del mundo 1: al subir se cierra igual en planeta) rodeada por una **laguna negra** con el reflejo de la luna roto en escamas y una línea pálida en la orilla. Páramo facetado en morados y grises azulados, con matojos secos (918, una llamada de dibujo) y lascas de piedra. **Caminos que serpentean**, pintados en cada píxel con la distancia a su borde horneada en una textura (borde nítido, reborde oscuro).
- **Colina en espiral**, al norte: un cono de 9,6 m al que le da tres vueltas y cuarto una senda en rampa; entre vuelta y vuelta, un talud a franjas que no se trepa. Lleva malla propia en anillos (la senda sale limpia). **Se sube andando por la senda** hasta la cima, donde hay un árbol rizado recortado contra la luna.
- **Árboles sin hojas de ramas rizadas**: tres formas, cinco ejemplares (cuatro alrededor de la zona de aterrizaje y la casa y el de la cima), con instancias.
- **Farola doblada**: poste de hierro en ese que acaba en cayado, la parte baja a rayas blancas y negras, farol colgando. Alumbra de verdad, con halo y un charco de luz cálida muy marcado.
- **Zona de aterrizaje**: la plataforma del cohete sobre una plazoleta de tierra pisada, cuatro balizas a rayas con una bola encendida, y tres caminos que salen de ella (a la casa, al sur y a la colina).
- **La casa torcida** (parada 1), completa por fuera, en una sola malla: zócalo de piedra, planta baja que se abre hacia arriba, piso que vuela y se inclina al otro lado, entramado, tejado de aguja a franjas que se retuerce y dobla la punta, chimenea en zigzag con el remate a rayas, torreón con su gorro vencido, ocho ventanas distintas encendidas en naranja (una con la contraventana descolgada), buhardilla redonda en **verde ácido**, puerta en ojiva con escalones, **toldo a rayas** y farol. Verja de hierro desigual a los lados. Ante la puerta, **E abre «Sobre mí» con su texto real** (`content/about.js`).
- **Woody lleva un farolillo al cuello** (`CollarLantern.jsx`): cuelga bajo su garganta, se balancea al andar y alumbra de verdad (luz, halo y charco que van con él). Lo monta `Woody.jsx` si el mundo lo trae (`woodyWears`); en el mundo 1 no hay nada.
- **Luz**: luna fría como principal; charcos cálidos del farol de la puerta, la ventana, la farola, las balizas y el farolillo; luces de verdad las más cercanas (el reparto de siempre, `WarmLights`). Bloom solo en lo que emite: la luna no llega al umbral.
- **Desde la órbita**: el planeta es la isla curvada (misma técnica que el mundo 1), con su sombra del lado sin luna y un halo violeta.
- **Colisiones** (a mano, en `layout.js`; se hornearán en el bloque C): la casa, los árboles, la farola, las balizas, las lascas y la verja.
- **Rendimiento** (2880 × 1620, sin límite, este equipo): 238 · 260 · 259 · 265 · 254 fps en una pasada y 190 · 184 · 197 · 201 · 186 en otra (llegada, casa, puerta, colina, páramo). 0 pipelines en caliente al aterrizar y en todo el paseo de la prueba (la ficha, las luces que cambian de sitio, Woody guiando, la colina).
- **Peso** (build de producción): datos del mundo 2, 5,9 kB (2,9 comprimido); escena, 29,9 kB (11,9 comprimido). Ningún recurso descargado. El trozo principal no cambia (2.011 kB).
- **Pendiente del bloque B (para decidir en la parada)**: el nombre «The Twisted Moon» es provisional; el tono del suelo y del cielo (más azul o más gris); si la luna debe verse también con la cámara de juego (habría que bajarla, y eso cambia cómo se juega).
- Sin comprobar: todo en movimiento visto por una persona (solo capturas y medidas); un teléfono y la calidad baja; el respaldo WebGL2 (la niebla baja es un nodo: debería valer igual, no probado); el balanceo del farolillo de Woody (solo en capturas, quieto).
- Capturas: `capturas/25-mundo2/B/` — `hoja-arriba.jpg` (desde arriba: llegada, casa, colina, vista), `hoja-jugador.jpg` (a la altura del jugador: seis vistas), `hoja-juego.jpg` (cámara de juego) y `hoja-orbita.jpg` (la subida y la órbita); debajo, las 24 sueltas. `node tests/e2e/luna.mjs` las rehace.

**Batería completa tras el bloque B** (15-11-2026, en primer plano, por tandas, Chrome sin ventana, servidor de desarrollo en el 5199):

| Prueba | Bien | Fallos |
|---|---|---|
| `errors` | 8 | 0 |
| `living` | 46 | 0 |
| `characters` | 20 | 0 |
| `portfolio` | 27 | 0 |
| `progress` | 26 | 0 |
| `motion` | 10 | 0 |
| `camera` | 30 | 0 |
| `woody` | 37 | 0 |
| `rocket` | 26 | 0 |
| `terrain` | 3 | 0 |
| `life` | 11 | 0 |
| `football` | 63 | 0 |
| `sounds` | 28 | 0 |
| `travel` | 31 | 0 |
| `twisted` (nueva) | 19 | 0 |
| **`npm run e2e` (las quince)** | **385** | **0** |
| `hora` | 21 | 0 |
| `basket` | 20 | 0 |
| `garden` | 6 | 0 |
| `birds` | 4 | 0 |
| `run` | 19 | 0 |
| `hill` | 29 | 0 |
| `collisions` | 4 | 0 |
| `welcome` | 21 | 0 |
| `loader` | 13 | **1** (la de siempre: primer pintado a 196 ms, objetivo 100; la pantalla de carga no se toca) |
| `tests/perf/entrada.mjs` | 0 pipelines en caliente al entrar y al despegar | — |

- Fps del mundo 1 en esta tanda (`tests/perf/fps.mjs`): llegada 95 · proyectos 98 · estanque 97 · meseta 97 · pista 96 (2880 × 1620, sin límite): el mundo 1 no ha perdido nada.
- La última tanda de la batería pasó de los 10 minutos de una orden y el sistema la dejó terminar sola en segundo plano (solo quedaban las dos medidas de fps); no se lanzó nada más hasta que acabó. Para la próxima: las medidas de fps, en una orden aparte.

**Batería completa tras el bloque A** (15-11-2026, en primer plano, por tandas, Chrome sin ventana, servidor de desarrollo en el 5199):

| Prueba | Bien | Fallos |
|---|---|---|
| `errors` | 8 | 0 |
| `living` | 46 | 0 |
| `characters` | 20 | 0 |
| `portfolio` | 27 | 0 |
| `progress` | 26 | 0 |
| `motion` | 10 | 0 |
| `camera` | 30 | 0 |
| `woody` | 37 | 0 |
| `rocket` | 26 | 0 |
| `terrain` | 3 | 0 |
| `life` | 11 | 0 |
| `football` | 63 | 0 |
| `sounds` | 28 | 0 |
| `travel` (nueva) | 31 | 0 |
| **`npm run e2e` (las catorce)** | **366** | **0** |
| `hora` | 21 | 0 |
| `basket` | 20 | 0 |
| `garden` | 6 | 0 |
| `birds` | 4 | 0 |
| `run` | 19 | 0 |
| `hill` | 29 | 0 |
| `collisions` | 4 | 0 |
| `welcome` | 21 | 0 |
| `loader` | 13 | **1** (la de siempre: primer pintado a 196 ms, objetivo 100; la pantalla de carga no se toca) |
| `tests/perf/entrada.mjs` | 0 pipelines en caliente al entrar y al despegar | — |

- Comprobaciones cambiadas porque medían lo de antes: `living` y `portfolio` (el botón «Sobre mí» ofrece el viaje en vez de abrir la ficha con las áreas), `rocket` (The Twisted Moon es un destino abierto).
- Capturas: `capturas/25-mundo2/A/` (la oferta, la órbita del mundo 1 con el destino abierto, la salida, la pantalla del viaje, la órbita del mundo 2, la bajada, en tierra y la vuelta).

## La hora del mundo sigue la hora del visitante

Hecho el 15-11-2026 (`experience/theme.js`, `ui/ThemeToggle.jsx`, `experience/Sky.jsx`, `audio/Sounds.jsx`, `worlds/living/layout.js` (paleta `dusk`), `tests/e2e/hora.mjs`, `tests/e2e/common.mjs`). **Pendiente del visto bueno de David.**
- Al entrar, el mundo 1 se muestra según el reloj del navegador del visitante (sin pedir ubicación ni permisos): de día por la mañana y a mediodía, atardecer por la tarde, de noche por la noche y un amanecer suave.
- **Atardecer: estado propio**, al mismo nivel que el día y la noche, con su paleta en `layout.js`: sol bajo y dorado por el oeste (21° sobre el horizonte: sombras largas), cielo naranja en el horizonte y violeta arriba, niebla melocotón, agua que devuelve el cielo; farolas y ventanas a medio encender (brillo 0,42). El **amanecer** es el atardecer recorrido al revés, más suave y con el sol por el este.
- Los tres van en fila —día (0), atardecer (1), noche (2)— y el momento actual es un punto de esa fila (`theme.at`); entre dos se mezclan sus paletas. Así el cambio de franja es gradual: el atardecer tarda 45 min en llegar y la noche otros 45 en caer.
- **Franjas** (`bands` en `theme.js`), en los equinoccios: amanecer 7:00–8:00, día hasta las 17:30, atardecer hasta las 20:30, noche. Con el mes se corren de forma aproximada: en junio anochece a las 21:45 y amanece a las 6:00; en diciembre, a las 19:15 y a las 8:00.
- **A mano**: el botón de arriba a la izquierda (y la tecla N) recorren día → atardecer → noche y esa elección manda sobre la hora hasta que se recarga la página; ya no se guarda de una visita a otra. El botón tiene tres iconos (sol, medio sol sobre el horizonte, luna). El telescopio sigue poniendo la noche y devolviendo el día.
- **Sonido**: pájaros de día, los dos a la vez al atardecer (pájaros al 55 %, grillos al 50 %), grillos de noche; al amanecer, casi solo pájaros.
- **Para probar**: `?hora=18:45` fija la hora (también en producción) y `?mes=6` el mes (admite decimales: 3.7 es el equinoccio de marzo).
- La pantalla de carga y la bienvenida no cambian (`welcome` 21 de 21). Las estrellas no salen hasta que oscurece.
- **Las pruebas parten siempre del mediodía** (`common.mjs` añade `?hora=12:00` si la prueba no pide otra) y cambian de momento con `t.moment("night")`, que pulsa N las veces que haga falta.
- **Sin hacer**: «el mundo 2 será siempre de noche» (no existe todavía; cuando exista, basta con fijarle `theme.manual`). El planeta antiguo (`?world=cosmic`) usa el atardecer por defecto de `theme.js`, sin ajustar.
- Sin comprobar: el paso de una franja a otra visto en tiempo real (solo por cálculo: de un minuto al siguiente el cielo se mueve como mucho 0,033 de 2); el atardecer visto por una persona en movimiento; un teléfono.
- El encargo llegó cortado en «Entrega: la»; se ha entregado la misma vista a cuatro horas y una hoja del atardecer en cuatro sitios.

**Pruebas tras los dos retoques** (15-11-2026, en primer plano, de dos en dos, Chrome sin ventana, contra el servidor del 5173):

| Prueba | Bien | Fallos |
|---|---|---|
| `hora` (nueva) | 21 | 0 |
| `errors` | 8 | 0 |
| `living` | 46 | 0 |
| `characters` | 20 | 0 |
| `portfolio` | 27 | 0 |
| `progress` | 26 | 0 |
| `motion` | 10 | 0 |
| `camera` | 30 | 0 |
| `woody` | 37 | 0 |
| `rocket` | 26 | 0 |
| `terrain` | 3 | 0 |
| `life` | 11 | 0 |
| `football` | 63 | 0 |
| `sounds` | 28 | 0 (una nueva: pájaros y grillos a la vez al atardecer) |
| **`npm run e2e` (las trece)** | **335** | **0** |
| `basket` | 20 | 0 |
| `garden` | 6 | 0 |
| `birds` | 4 | 0 |
| `run` | 19 | 0 |
| `hill` | 29 | 0 |
| `collisions` | 4 | 0 |
| `welcome` | 21 | 0 |
| `loader` | 13 | **1** (la de siempre: primer pintado a 168 ms, objetivo 100; la pantalla de carga no se toca) |
| `tests/perf/entrada.mjs` (entrando al atardecer) | 0 pipelines en caliente al entrar y al despegar | — |

- Fps en tierra (2880 × 1620, sin límite): mediodía 71 · 74 · 73 · 73 · 72; atardecer 72 · 74 · 72 · 74 · 73; noche 75 · 81 · 81 · 78 · 80; amanecer 79 · 82 · 75 · 80 · 71.
- Capturas: `capturas/24-final/hora/` — `hoja-horas.jpg` (la misma vista a las 7:30, 12:00, 18:45 y 23:00), `hoja-atardecer.jpg` (aldea, estanque, llegada y playa al atardecer) y las sueltas.

## Objetivo 19

Pulido final del mundo 1 (`docs/OBJETIVO-19.md`, 14-11-2026). Cuatro bloques, commit y push por bloque; paradas tras el B y tras el D. El porfolio tendrá tres mundos; este es el primero. Del segundo (estilo Tim Burton) y del tercero (alienígena) no se construye nada todavía.

| Bloque | Estado |
|---|---|
| A. Errores visibles (ocho puntos) | **Hecho** (commit `519149f`; el orden de dibujado del recorte, afinado en el commit del bloque B) |
| B. Animación de correr | **Hecho. Parada: pendiente de visto bueno.** Capturas: `capturas/24-final/parada-B/` (`hoja-A-dia.jpg`, `hoja-A-noche.jpg`, `hoja-carrera.jpg`) |
| C. «Sobre mí» sale de este mundo | **Hecho** |
| D. Despegue: que se vea un planeta | **Rehecho el 15-11-2026** a petición de David: el planeta es la isla, curvada de verdad. **Parada: pendiente de visto bueno.** Capturas: `capturas/24-final/retoque-D/` (`hoja-despegue-dia.jpg`, `hoja-despegue-noche.jpg`, `orbita-dia.jpg`, `orbita-noche.jpg`); la casa del árbol, en `parada-D/hoja-casa-arbol.jpg` |

**Bloque A, lo que hay:**
1. **Aro de visibilidad** (`experience/environment/seeThrough.js`): recorte circular limpio alrededor del astronauta, con el borde fundido por mezcla de verdad; sin tramado. Igual en casas, árboles, rocas, pozo, cohete, torii, casa de té, observatorio y casa del árbol. Los materiales siguen en la lista de opacos del renderer (mezcla «a medida» sin declararse translúcidos) y se dibujan después del resto de lo opaco; el césped, después de ellos (`seeThroughOrder`, `drawAfterSeeThrough`). Sacarlos a la lista de translúcidos costaba 6 fps y dejaba 27 pipelines sin precalentar. En el borde fundido lo que se ve detrás es el suelo, no el césped ni otro árbol: no se nota.
2. **Puente rojo** (`zones/Garden.jsx`, `createArchBridge`): hecho a mano con el kit: tablero de 18 tablas, largueros, cinco postes por lado con remate oscuro (los de los extremos, más altos y con perilla) y dos barandillas, en bermellón. El tablero es la misma curva que se pisa (`bridgeArc`, ahora una sola para todos los puentes, sin quiebro en los extremos). **El modelo «Stylized Arched Road Bridge» no sirve**: es un puente de carretera de 35 m con bolardos y sin barandillas (comprobado en Blender, también con 7.000 triángulos); se retira del repositorio.
3. **Musgo** (`props/rockModel.js`): rejilla de 5 × 5 sobre la coronación, abombada, con una esquina calva y un fleco que cae por los cuatro lados un trecho distinto en cada tramo; tres verdes por cara.
4. **Torii**: tejadillo bermellón con la cara de arriba en granate oscuro (`FACING_PAINT` en `buildings.py`).
5. **Casa de té**: los paneles de papel (`Material.052`) se marcan como ventanas: crema de día, encendidos de noche.
6. **Pista**: dos focos en postes de 5,6 m por fuera de la valla norte (`Floodlights` en `Court.jsx`): lente encendida con halo, luz de verdad y una mancha de claridad en el suelo.
7. **Pozo** (`createWell` en `ProjectVillage.jsx`): brocal de sillares en dos hiladas con albardilla clara y agua dentro, postes, torno con manivela, cuerda, cubo y tejadillo a dos aguas. Las losas de la plaza ya no llevan recorte (se borraban bajo el astronauta).
8. **Cohete de noche**: devuelve su color en cálido también visto desde arriba, cinco ventanillas encendidas bajo el morro y focos de plataforma más fuertes, con halo mayor.
- Colisiones rehorneadas (850 obstáculos de 204 mallas).

**Bloque B, lo que hay** (`characters/gait.js`, `Astronaut.jsx`, `AnimationController.js`, `useRiggedModel.js`, `audio/Sounds.jsx`, `tests/e2e/run.mjs`):
- **Por qué patinaba**: el clip `Astro_Run` del modelo avanza 2,9 m/s y el astronauta anda a 3,6 y corre a 6,2; se reproducía al tope de velocidad y aun así se quedaba corto. Además, andar a paso normal ya usaba ese mismo clip.
- **Dos pasos generados por código**, que sustituyen al clip del modelo: **trote** (`Astro_Jog`, 3,6 m/s, 4,3 pisadas por segundo) y **carrera** (`Astro_Run`, 6,2 m/s, 5 por segundo). Se decide primero por dónde va cada pie —apoyado, la planta no se mueve respecto al suelo; en el aire, vuelve por arriba— y de ahí salen cadera, rodilla y tobillo por cinemática inversa. Lo que avanza el pie apoyado es exactamente lo que avanza el personaje, a cualquier velocidad.
- Cada zancada tiene **contacto** (el pie llega por delante con la punta algo levantada), **paso** (la cadera baja y la rodilla cede) y **vuelo** (los dos pies en el aire). **Brazos en oposición** y pecho girando contra la cadera; **tronco inclinado** (9° al trote, 17° corriendo); **rebote** de la cadera (3,6 y 5,9 cm). Al pasar del trote a la carrera se conserva el pie.
- **Sonido**: cada marca de pisada cae cuando su pie llega al suelo y suena un paso por pisada. Fuera el tope de cadencia que había que poner a mano.
- `node tests/e2e/run.mjs` (19 comprobaciones; con `capturas`, los 12 fotogramas de perfil): el pie apoyado se mueve 0,4 cm al trote y 0,7 corriendo.
- Sin comprobar: la carrera vista en movimiento por una persona (solo en fotogramas y por medida); andar despacio (menos de 1,7 m/s, con el joystick a medias) sigue con el clip `Astro_Walk` del modelo, sin tocar.

**Retoque tras la parada B** (pedido por David al aprobar A y B): quitado el árbol viejo de (17, 33), cuya copa tapaba la cámara de juego en la orilla sur del estanque del jardín. Su claro se conserva en el reparto (`FORMER_ANCIENT_TREE`), así que nada más cambia de sitio. Quedan dos árboles viejos.

**Bloque C, lo que hay** (`zones/Treehouse.jsx`, `layout.js`, `content/about.js`, `content/sections.js`, `ui/QuickMenu.jsx`, `content/woody.js`):
- **«Sobre mí» ya no es un sitio de este mundo.** Fuera sus dos carteles (el del camino de la rampa y el de la casa del árbol), su interacción («Leer Sobre mí») y el guiado de Woody hasta allí. No se ha construido nada del mundo 2 ni se ha movido a ningún islote.
- **PENDIENTE DE TRASLADAR AL MUNDO 2**: el contenido de Sobre mí (`content/about.js`: texto y áreas de trabajo) sigue entero y **se lee desde el botón «Sobre mí» del menú superior**, que abre la misma ficha de antes (`aboutCard()`), sin mover a nadie. Cuando exista el mundo 2: darle allí su sitio, devolver a `SECTIONS` su `place` y quitar el `card`.
- **La casa del árbol queda como rincón decorativo**: el modelo de siempre y, alrededor, hecho a mano en una sola malla: banco mirando al sur, tocón que hace de mesa con un farol (se enciende de noche) y una taza, arriate de flores con bordillo de piedra y una pila de leña.
- Lo que dependía de la zona: en el logro «Explorador» sigue contando como una de las seis zonas (ahora `casa-arbol`); Woody comenta el rincón la primera vez («La casa del árbol. Buen sitio para sentarse un rato y mirar la isla.»); el nodo del camino por el que guía hacia el observatorio se llama `casa-arbol`. Las huellas de los carteles quitados se conservan en el reparto (`FORMER_SIGNS`): nada cambia de sitio.
- Colisiones rehorneadas (838 obstáculos de 202 mallas). Pruebas: `living` 46 (junto a la casa no se ofrece «Sobre mí», no queda cartel, el botón del menú abre la ficha), `portfolio` 27 (la ficha se abre sin guiado y trae las áreas), `progress`, `woody`, `terrain`, `birds`, `collisions`, `errors`.
- Capturas: `capturas/24-final/parada-D/hoja-casa-arbol.jpg` (día y noche).

**Bloque D, lo que hay** (rehecho el 15-11-2026; `experience/environment/bend.js`, `experience/Ship.jsx`, `experience/state.js` (`ORBIT_VIEW`, `rig.bend`), `experience/Lights.jsx`, `experience/Sky.jsx`, `experience/environment/seeThrough.js`, `worlds/living/Space.jsx`, `worlds/living/water/Water.jsx`, `worlds/living/props/Halos.jsx`, `experience/ui3d/WorldUi.jsx`, `experience/Experience.jsx`, `tests/e2e/rocket.mjs`):
- **El planeta es la isla.** Fuera el globo de 170 m con otros continentes, hielo y nubes. Al subir, el mundo entero se curva de verdad: cada vértice de la escena se enrolla sobre una esfera cuyo radio baja de infinito (suelo plano) al del planeta (`PLANET.radius`: 44 m en este retoque, **32 m desde el segundo**), con el eje en la plataforma de la nave. La isla (unos 50 m de radio) ocupa casi todo el hemisferio que se ve. Son los mismos árboles, casas, cohete, río, pistas y luces, en 3D: no hay otro modelo ni textura.
- **Cómo**: un único punto para todos los materiales (`setupModelViewProjection` de los materiales de nodos de three, sustituido en `bend.js`). Solo se curva la posición en pantalla; la luz, las sombras, la niebla y la espuma se siguen calculando en plano, así que andando no cambia nada (con curvatura 0 el sombreador devuelve el punto tal cual). Quedan fuera, con `material.userData.flat`: el cielo, los astros de la órbita, las tarjetas de la interfaz y la nave.
- **Transición continua**: `rig.bend` va de 0 a 1 durante la primera mitad de la subida (`CLOSED_AT` en `Ship.jsx`) y vuelve a 0 al aterrizar. No hay corte ni cambio de escena.
- **La nave va rígida** (curvada, a su altura se ensancharía): sube a plomo por el eje y en el último tramo se tumba y queda en órbita en el centro de la vista, de costado, a 60 m de la cámara, con el planeta detrás.
- **El mar** llega en anillos hasta 150 m (algo más de media vuelta al planeta) y casa vértice a vértice con la rejilla de la isla; curvado deja de fundirse con el horizonte y conserva su espuma en la orilla. Debajo, un **fondo de mar** opaco cierra la esfera (el agua es translúcida).
- **Sombra del lado de noche** (una esfera algo mayor que el planeta, oscura donde no da el sol; se usa la dirección del sol tumbada para que caiga por el borde que se ve) y **halo de atmósfera** suave. La luna y los otros dos mundos (THE TWISTED MOON, THE COSMIC LAB, «PRÓXIMAMENTE»), como estaban.
- **Las caras largas se parten al montar el mundo** (`splitLongFaces`): un triángulo solo se curva por sus vértices, y la losa del campo de fútbol (22 m) o la de la pista se hundían más de un metro bajo el suelo curvo. Lo tendido (losas, líneas, manchas de luz) se parte a 1,2 m; el resto, a 6,5 m. 56 geometrías; el terreno y los modelos no se tocan.
- **Mientras el mundo está curvado no se descarta nada por encuadre** (lo que three da por fuera de cuadro en el mundo plano puede estar a la vista) y las sombras cubren la isla entera (70 m alrededor del centro en vez de 38 alrededor del jugador), rehaciéndose uno de cada tres fotogramas en la subida y uno de cada ocho en órbita.
- **Tres cosas de three r183 que hay que saber** (todas en `bend.js`): (1) reutiliza el sombreador entre materiales «iguales» sin mirar `userData`: lo rígido lleva su propia clave (`customProgramCacheKey`); (2) los uniformes «de objeto» de un material corriente y quieto no se reenvían si nada suyo cambia: la curvatura va en el grupo de uniformes del render (`renderGroup`), o las losas se quedaban planas flotando sobre el planeta; (3) el pase de sombras usa otro material (`isShadowPassMaterial`): no se curva.
- **Hueco de visión**: con el astronauta dentro de la nave ya no se recorta nada (`seeThrough.js`); en órbita la nave pasa por delante de donde quedó y salía medio borrada.
- **No hecho**: guardar la imagen de referencia. `docs/referencias/` no existe en el repositorio y la imagen adjunta al encargo era la captura del estado anterior, no la referencia; se ha trabajado con la descripción.
- Sin comprobar: el despegue visto en movimiento por una persona (solo en fotogramas y por medida); un teléfono; el respaldo WebGL2 (`?backend=webgl`); la calidad baja; el planeta antiguo (`?world=cosmic`) no se curva (su nave no está en el centro) y desde su órbita se sigue viendo plano.

**Segundo retoque del bloque D: la isla es todo el planeta** (15-11-2026; `experience/state.js` (`PLANET`, `orbitView`), `experience/environment/bend.js`, `experience/Ship.jsx`, `experience/ui3d/WorldUi.jsx`, `tests/e2e/rocket.mjs`). **Pendiente del visto bueno de David.**
- **Radio: 32 m** (antes 44). La costa cae sobre el ecuador de la esfera: desde la órbita la tierra llega al borde del disco y el mar queda como una franja con su espuma en el contorno. Probados 30, 32 y 34: a 30 los árboles y las casas del borde se abren algo más; a 34 vuelve a verse más mar. `?radio=34` (solo en desarrollo) prueba otro.
- La vista de la órbita sale ahora del radio (`orbitView` en `state.js`): cámara 20° fuera del eje (antes 14°), a 152 m del centro; el planeta ocupa unas tres cuartas partes del alto. Los topes de la subdivisión de caras largas también salen del radio (71 geometrías).
- **Gira muy despacio**: la cámara rodea el planeta a 0,05 rad/s (una vuelta cada dos minutos; antes 0,035).
- **Rótulos**: en vuelo los coloca la nave (`rig.cards`). El cohete queda a la vista en el centro; «Aterrizar», debajo de él; el aviso «En órbita» y el logro, encima. `rocket.mjs` lo comprueba (26 comprobaciones).
- Pruebas: `rocket` 26, `errors` 8, `living` 46, `camera` 30, `woody` 37 (una pasada de cuatro falló «y la baja contigo», en la rampa; no se repitió), `entrada.mjs` (0 pipelines en caliente al entrar y al despegar). La batería completa se pasó después, con el retoque de la hora: ver «La hora del mundo».
- Fps (2880 × 1620, sin límite): día, subida 88 de media y 72 en el peor medio segundo, órbita 89; noche, 79 / 68 y 87. 0 pipelines en caliente en subida, órbita y bajada.
- Capturas: `capturas/24-final/retoque-D2/` — `orbita-32-dia.jpg`, `orbita-32-noche.jpg`, las alternativas `alternativa-30-*.jpg` y `alternativa-34-*.jpg`, y `hoja-radios.jpg` (las tres juntas, de día y de noche).
- El servidor de desarrollo del 5199 no estaba en marcha; había uno en el 5173 (`npm run dev` a secas, no lanzado por esta sesión) y las pruebas se han pasado contra él con `E2E_URL=http://localhost:5173/`.

**Retoque del bloque D — pruebas y medidas** (con el radio de 44 m, anterior al segundo retoque) (15-11-2026, en primer plano, de dos en dos, Chrome sin ventana, servidor de desarrollo en el 5199):

| Prueba | Bien | Fallos |
|---|---|---|
| `errors` | 8 | 0 |
| `living` | 46 | 0 |
| `characters` | 20 | 0 |
| `portfolio` | 27 | 0 |
| `progress` | 26 | 0 |
| `motion` | 10 | 0 |
| `camera` | 30 | 0 |
| `woody` | 37 | 0 |
| `rocket` | 25 | 0 |
| `terrain` | 3 | 0 |
| `life` | 11 | 0 |
| `football` | 63 | 0 |
| `sounds` | 27 | 0 |
| **`npm run e2e` (las trece)** | **333** | **0** |
| `basket` | 20 | 0 |
| `garden` | 6 | 0 |
| `birds` | 4 | 0 |
| `run` | 19 | 0 |
| `hill` | 29 | 0 |
| `collisions` | 4 | 0 |
| `welcome` | 21 | 0 |
| `loader` | 13 | **1** (la de siempre: primer pintado a 180 ms, objetivo 100; la pantalla de carga no se toca) |
| `tests/perf/entrada.mjs` | 0 pipelines en caliente al entrar y al despegar; despegue sin tareas largas ni huecos | — |

- `rocket.mjs` está adaptada al diseño nuevo (25 comprobaciones): la curva sube de 0 a 1 sin saltos, en órbita el mundo es una esfera cerrada sin niebla, no existe otro modelo de planeta, el disco cabe en pantalla (544 px), la costa queda entre el 90 % y el 102 % de su radio, dentro del disco hay planeta hasta el borde y fuera cielo, la nave se ve delante, y al aterrizar el suelo vuelve a ser plano.
- **Fps** (2880 × 1620, sin límite; por tramos de medio segundo, el peor es el que cuenta). Dos pasadas, con el equipo a dos ritmos distintos:

| | Junto a la nave | Subida: media / peor medio segundo | Órbita | Bajada: media / peor medio segundo |
|---|---|---|---|---|
| Día, pasada lenta | 69 | 85 / 66 | 89 | 81 / 66 |
| Noche, pasada lenta | 64 | 83 / 66 | 86 | 77 / 62 |
| Día, pasada rápida | 89 | 113 / 90 | 119 | 108 / 86 |
| Noche, pasada rápida | 84 | 133 / 80 | 145 | 134 / 106 |

- El peor tramo del vuelo es siempre el de pegado al suelo (los mismos fps que andando). **0 pipelines en caliente** en la subida, en órbita y en la bajada, de día y de noche; ningún hueco de más de 40 ms entre fotogramas. En tierra: 73 · 77 · 74 · 74 · 72 (pasada lenta) y 117 · 125 · 121 · 118 · 122 (rápida): la curvatura no cuesta nada andando.
- **Arreglado por el camino**: al levantarse la nave había 3 s a 52–58 fps (se dejaba de descartar por encuadre con las sombras aún a ritmo completo). Ahora el descarte se retira con la curva ya en 0,03 y las sombras se espacian desde el despegue.
- Hubo otras dos sesiones abiertas a la vez sobre este mismo encargo (copias reanudadas de la conversación), que editaron `bend.js` y `tests/e2e/rocket.mjs` en paralelo. Se retiraron al avisarlas; sus cambios (el uniforme en `renderGroup`, la adaptación de `rocket.mjs`) se revisaron y se conservan. La batería y las medidas de arriba son posteriores, con una sola sesión.

**Parada del bloque D — batería completa** (versión anterior, la del globo de 170 m; sustituida por el retoque de arriba) (14-11-2026, en primer plano, de dos en dos, Chrome sin ventana, servidor de desarrollo en el 5199). La sesión anterior se cortó en mitad de la batería y dejó su tanda corriendo sola; se paró antes de empezar.

| Prueba | Bien | Fallos |
|---|---|---|
| `errors` | 8 | 0 |
| `living` | 46 | 0 |
| `characters` | 20 | 0 |
| `portfolio` | 27 | 0 |
| `progress` | 26 | 0 |
| `motion` | 10 | 0 |
| `camera` | 30 | 0 |
| `woody` | 37 | 0 |
| `rocket` | 21 | 0 (falló 1 tras el primer arreglo; arreglado, ver abajo) |
| `terrain` | 3 | 0 |
| `life` | 11 | 0 |
| `football` | 63 | 0 |
| `sounds` | 27 | 0 |
| **`npm run e2e` (las trece)** | **329** | **0** |
| `basket` | 20 | 0 |
| `garden` | 6 | 0 |
| `birds` | 4 | 0 |
| `run` | 19 | 0 |
| `hill` | 29 | 0 |
| `collisions` | 4 | 0 |
| `welcome` | 21 | 0 |
| `loader` | 13 | **1** (la de siempre: primer pintado a 204 ms, objetivo 100; la pantalla de carga no se toca) |
| `tests/perf/entrada.mjs` | 0 pipelines en caliente al entrar y al despegar; despegue sin tareas largas ni huecos | — |

- **Arreglado — fps en vuelo**. A 2880 × 1620 sin límite, con 63 fps en tierra, la subida daba 51–57 y la órbita 49–57. No era el planeta (quitándolo, lo mismo) ni la resolución: era el mapa de sombras, que se rehacía entero en cada fotograma (150 llamadas de dibujo) para sombras que desde arriba no se distinguen. Ahora en vuelo se rehace uno de cada tres fotogramas desde los 90 m de altura y uno de cada ocho arriba (`Lights.jsx`); en tierra, como siempre. Después: subida 68–80, órbita 76–95, bajada 64–79. `rocket` lo comprueba (dos comprobaciones nuevas: 21).
- **Arreglado — salto de la cámara al levantarse la nave** (`rocket`: «se aleja cada vez más, sin saltos»). En el fotograma en que se pasa del encendido a la subida la distancia de cámara saltaba de 1,5 a 2,0 y volvía a 1,5 (se sumaban el retiro del encendido y el de la subida). La prueba solo lo veía si una muestra caía en ese fotograma. Corregido en `Ship.jsx`; `rocket` 21 de 21 en dos pasadas seguidas.
- **Fps en tierra** (`tests/perf/fps.mjs`): 66 · 75 · 73 · 73 · 60, 73 · 69 · 68 · 61 · 63 y, tras los arreglos, 66 · 70 · 66 · 68 · 64. Con el commit anterior al bloque D (`78f2d5e`), en la misma tanda: 65 · 61 · 59 · 60 · 61. El bloque D no cuesta fps en tierra. **El equipo va hoy justo**: de noche, en la misma tanda, 57–66 con el bloque D y 56–62 sin él (pista 57 en los dos casos); no es de este bloque.
- **Capturas**: `capturas/24-final/parada-D/` — `hoja-despegue-dia.jpg` y `hoja-despegue-noche.jpg` (12 fotogramas cada una, uno cada 0,95 s desde antes de subir hasta la órbita; debajo, los 24 sueltos) y `hoja-casa-arbol.jpg`.

**Parada del bloque B — batería completa** (14-11-2026, en primer plano, de dos en dos, Chrome sin ventana):

| Prueba | Bien | Fallos |
|---|---|---|
| `errors` | 8 | 0 |
| `living` | 44 | 0 |
| `characters` | 20 | 0 |
| `portfolio` | 25 | 0 |
| `progress` | 26 | 0 |
| `motion` | 10 | 0 |
| `camera` | 30 | 0 |
| `woody` | 37 | 0 |
| `rocket` | 9 | 0 |
| `terrain` | 3 | 0 |
| `life` | 11 | 0 |
| `football` | 63 | 0 |
| `sounds` | 27 | 0 |
| **`npm run e2e` (las trece)** | **313** | **0** |
| `basket` | 20 | 0 |
| `garden` | 6 | 0 |
| `birds` | 4 | 0 |
| `run` (nueva) | 19 | 0 |
| `hill` | 29 | 0 |
| `collisions` | 4 | 0 |
| `welcome` | 21 | 0 |
| `loader` | 13 | **1** (la de siempre: primer pintado a 200 ms; la pantalla de carga no se toca) |
| `tests/perf/entrada.mjs` | 0 pipelines en caliente al entrar y al despegar | — |

- Comprobaciones cambiadas porque medían lo de antes: `camera` (las piezas del cohete se reconocen por llevar recorte, no por «no ser transparentes»), `basket` (suelta el tiro a su hora contando desde la pulsación, no después de una captura), `sounds` (9–13 pasos en 2,6 s: la cadencia real del trote), `characters` (a paso normal, `Astro_Jog`).
- **Fps**: en la misma tanda, 71–76 antes del objetivo 19 y 65–69 con el recorte en la lista de translúcidos; con el orden definitivo, 68–70 y 82–84 en dos pasadas seguidas, y 102–116 tras reiniciarse el servidor. El equipo varía mucho de una tanda a otra; siempre por encima de 60.
- Una orden se cortó a media batería y se llevó el servidor de desarrollo; se volvió a arrancar en el 5199 y se repitieron las pruebas que quedaban.

## Objetivo 18

Fps de partida (2880 × 1620 sin límite, Chrome sin ventana, este equipo Windows): llegada 75 · proyectos 77 · estanque 71 · meseta 81 · pista 83. Entre pasadas iguales varían ±10.

| Apartado | Estado |
|---|---|
| 1. Césped | **Hecho.** Fps después: 74 · 82 · 77 · 83 · 85. Capturas: `capturas/23-pulido/1-cesped/` (antes: `0-antes/`) |
| 2. Rocas, caminos, farolas y carteles | **Hecho.** Fps después: 85 · 87 · 82 · 87 · 88. Capturas: `capturas/23-pulido/2-rocas/`, `2-caminos/`, `2-farolas/` |
| 3. Color y vegetación (variantes de árbol, capa baja, pájaros) | **Hecho.** Fps después: 74 · 77 · 79 · 78 · 81. Capturas: `capturas/23-pulido/3-color/`, `3-pajaros/` |
| 4. Agua y luz | **Hecho y aprobado** (con los retoques de abajo). Fps después: 86 · 88 · 86 · 85 · 87. Capturas: `capturas/23-pulido/parada-4/` (12 puntos × cámara de juego, a ras y desde arriba × día y noche; hojas `hoja-dia.jpg` y `hoja-noche.jpg`) |
| Retoques de 1–4 (pedidos por David al aprobar) | **Hechos.** Fps: 110 · 114 · 109 · 113 · 114. Hojas: `capturas/23-pulido/retoques/hoja-dia.jpg` y `hoja-noche.jpg` |
| 5. Baloncesto | **Hecho.** Fps después: 106 · 113 · 109 · 111 · 113. Capturas: `capturas/23-pulido/5-baloncesto/` (`hoja.jpg`) |
| 6. Fútbol | **Hecho.** Fps después: 104 · 108 · 107 · 106 · 106. Capturas: `capturas/23-pulido/6-futbol/` (`hoja.jpg`, y los fotogramas de cada tiro) |
| 7. Edificios | **Hecho.** Fps después: 109 · 112 · 112 · 113 · 110. Capturas: `capturas/23-pulido/7-edificios/` (`hoja.jpg`, `hoja-noche.jpg`; los modelos sueltos, en `modelos/hoja.jpg`) |
| 8. Jardín japonés | **Hecho** (commit `790fc53`). Fps después: 71 · 76 · 71 · 67 · 72. Capturas: `capturas/23-pulido/parada-8/` (ocho hojas: apartados 5 a 8, de día y de noche). **Parada: pendiente de visto bueno** |

**Apartado 1, lo que hay** (`flora/Grass.jsx`, `layout.js`, `terrainData.js`, `groundColor.js`, `tests/e2e/motion.mjs`, `tests/e2e/pulido.mjs`):
- Una sola brizna (7 vértices, 4 alturas: base ancha, punta fina) dibujada con instancias: ~217.000 en calidad alta (20.736 matas en abanico de ~9 briznas más 30.000 sueltas), una llamada de dibujo. Antes: una malla de 113.000 briznas de 3 triángulos. El centro de la mata es más alto y más oscuro; las briznas caen hacia fuera.
- **Densidad por máscara** (`grassDensity` en `layout.js`, canal B de la textura de datos del terreno): tupida junto a caminos, edificios, rocas, pies de árbol, farolas, carteles, orillas y donde empieza la arena; a campo abierto, manchas tupidas y claros de césped ralo. Cada mata nace o no entera.
- Tres verdes por mata (hondo, fresco, lima); cuál abunda depende de la zona (lima al sol, hondo bajo los árboles). Base oscura, punta clara.
- Viento con rachas, ráfaga y rastro del astronauta y de Woody: los mismos campos de antes (`wind.js`, `trail.js`).
- Suelo de hierba con manchas suaves y continuas de verde claro y oscuro (antes, un tono por triángulo).
- **Ninguna brizna sobre lo construido**: la hierba empieza a 0,75 m de pistas, plataforma, plaza y zócalos. Lo comprueba `motion.mjs` leyendo la máscara como la lee la GPU (máximo 0,000 en pista, campo, plataforma, plaza y eje de los caminos).
- `node tests/e2e/pulido.mjs <carpeta> [puntos] [vistas] [momentos]`: capturas de cada punto con la cámara de juego, a ras y desde arriba, de día y de noche.
- Pruebas: `motion` 11 de 11, `errors` bien, `entrada.mjs` 0 pipelines en caliente al entrar y al despegar, consola sin errores.
- El respaldo WebGL2 dibuja y mueve el césped instanciado (`motion.mjs "?backend=webgl"`). Sin comprobar: la calidad baja (`low`).

**Apartado 2, lo que hay** (`props/rockModel.js`, `props/cobbles.js`, `props/lampModel.js`, `props/Halos.jsx`, `props/Signpost.jsx`, `Terrain.jsx`, `Flora.jsx`, `flora/Plants.jsx`, `layout.js`, `terrainData.js`, `experience/textures.js`, `solids.js`):
- **Rocas**: todas sustituidas (pradera, pie del acantilado, orilla, río, borde del estanque, cascada y guijarros) por bloques de planos amplios con los cantos biselados: envoltura convexa de una caja desigual con las ocho esquinas matadas (`createBlock`). Piedra gris azulada, cantos más claros, cojín de musgo sobre parte de la coronación (las que tienen el pie en el agua o en la arena, peladas). Cuatro formas. Cada roca es un grupo: la grande y de dos a cuatro más, cada una menor (3 a 5 tamaños). La pared de la meseta y la paleta `ROCK` pasan también a gris azulado. Bajo las rocas grandes no nace hierba.
- **Caminos**: tierra clara con el borde nítido y un reborde oscuro fino. Ya no dependen de la malla del suelo (0,88 m por casilla): el material del suelo los calcula en cada píxel con la distancia al borde horneada en el canal A de la textura de color del terreno (`pathEdge` en `layout.js`). La hierba del borde invade la tierra a mechones. Fuera los adoquines sueltos de todos los caminos.
- **Losas encajadas** (a ras, asoman 1,5 cm, junta de 3,5–4 cm) solo en dos sitios: los primeros 3,4 m de cada camino que sale de la plataforma del cohete (`PadSlabs`) y la plaza, en anillos alrededor del centro.
- **Farolas**: modelo nuevo (`createLantern`): poste recto de madera sobre dado de piedra, brazo y tornapunta de hierro, farol de hierro con tejadillo y cristal. De 22 repartidas cada 9 m a **13 puestas a mano** (`LANTERN_SPOTS`: cruces, entradas de zona, puente, pie y alto de la rampa), con el brazo vuelto al camino. De noche: luz puntual cálida de 7,5 m de alcance (antes 11), halo alrededor del cristal (`Halos`, una llamada de dibujo) y charco de luz en el suelo. Las de la plaza y Contacto usan el mismo modelo. La de la bienvenida no se ha tocado (`createLamp`).
- **Carteles**: tablón claro de 2,36 × 0,8 m sobre dos postes (antes 1,62 × 0,46 sobre uno), letra oscura y gruesa, icono de la zona en un disco naranja (cohete, CV, balón de baloncesto, balón de fútbol, cúpula, casa, persona, sobre) y flexo de hierro: de noche la cara se enciende y la lámpara lleva halo. Ocho: los cinco de antes más PROYECTOS, SOBRE MÍ y CONTACTO. Colisión de poste a poste.
- Colisiones rehorneadas (834 obstáculos). Pruebas: `collisions` (0 puntos dentro de algo sólido), `terrain` (2.176 objetos, ninguno flota ni se hunde; 116 rocas con el pie en el agua asoman), `camera`, `motion`, `errors`, `entrada.mjs` (0 pipelines en caliente al entrar y al despegar), consola sin errores.
- **Queda igual, a propósito o por tiempo**: los rótulos propios de cada zona (PROYECTOS sobre la plaza, SOBRE MÍ en la casa del árbol, CONTACTO en la estación, las placas de los tótems y el atril del CV) siguen en madera oscura con letra crema; junto a Contacto se ven a la vez el cartel nuevo y el antiguo.

**Apartado 3, lo que hay** (`layout.js`, `kit/palette.js`, `flora/species.js`, `flora/plantModels.js`, `flora/Plants.jsx`, `life/Birds.jsx`, `tools/assets/bird.py`, `public/models/living/fauna/pajaro.glb`, `tests/e2e/birds.mjs`):
- **Árboles**: los cinco modelos de slabdsgn en cinco colores —verde, lima, amarillo, naranja suave y rosa cerezo— repartidos por arboledas (`COLOR_GROVES` en `layout.js`), no al azar: cerezos donde ya estaban, naranja tras el campo de fútbol y en las puntas este y noroeste, amarillo en la meseta, lima hacia la playa del sur y en los extremos este y oeste; el verde (y el pino en el norte) las separa. Tamaños de 0,72 a 1,44 (antes 0,84–1,34): muchos medianos, bastantes pequeños y algún ejemplar grande. El arbusto de slabdsgn gana dos gamas (lima y naranja suave).
- **Capa baja en grupos**, hecha a mano e instanciada: helechos (46 corros de 3 a 5), setas (17 de 3 a 6) y **arbustos redondos nuevos** (30 corros de 2 a 4, cada corro de un color: verde, lima, verde hondo y dos en flor, rosa y amarilla). Las flores ya iban en manchas. Las mariposas, como estaban.
- **Pájaros**: fuera los conos con alas. Modelo «Animated Bluebird with Feathery Wings», copiado a `assets-externos/modelos/` y anotado en RECURSOS y CREDITOS. **Sirve**: `tools/assets/bird.py` (Blender, sin ventana) lo reduce de 7.190 a 720 triángulos, le pone color plano por cara sacado de su textura (paleta de 7 tonos; no se distribuye ninguna textura) y **conserva su aleteo**: cuatro posturas de `anim_Flight` y una de `anim_Idle`, guardadas como shape keys (74 kB). El juego las mezcla en la GPU, así que los 17 pájaros son una sola malla con instancias. 10 sueltos (7 picotean en el suelo, 3 posados en lo alto de un cartel o una farola; se espantan al acercarse o con la ráfaga del carillón, dan una vuelta y se posan en otro sitio libre) y dos bandadas de 4 y 3 que rondan en cuña y a ratos planean.
- Ojo: una malla no puede llevar más de 8 atributos de vértice en WebGPU; con 9 su pipeline no se crea nunca y no se dibuja, sin error en consola (se ve en `window.__world.skipped`).
- Los FBX del paquete del pájaro solo traen el esqueleto al importarlos en Blender 5; se parte del `.blend`.
- Colisiones rehorneadas (804 obstáculos). Pruebas: `birds` 3 de 3, `life` (las aves despegan en cadena: 1, 1, 3, 4, 7, 8, 10, 10), `collisions`, `terrain`, `errors`, `entrada.mjs` (0 pipelines en caliente al entrar y al despegar).
- Sin comprobar: el aleteo visto en movimiento por una persona (solo en fotogramas sueltos); los pájaros de noche.

**Apartado 4, lo que hay** (`experience/theme.js`, `experience/Lights.jsx`, `experience/Experience.jsx`, `layout.js`, `groundColor.js`, `water/Water.jsx`, `water/Waterfall.jsx`):
- **Agua**: turquesa más saturado, de casi blanco en la orilla a azul hondo (`waterShallow`, `waterDeep`). Espuma en dos líneas blancas nítidas —la del borde y otra fina más adentro, que va y viene— en orillas y costa y alrededor de cada roca que asoma; más agua batida al pie de la cascada. Cascada con seis láminas (antes cuatro) y más anchas, espuma arriba y en el último tercio, 14 almohadas de espuma mayores (antes 9) y bruma que se ve (12 nubecillas, opacidad 0,3; antes 8 a 0,09).
- **Día**: sol cálido (`#ffdcae`) y relleno frío del cielo (`#d6e6ff`): la sombra queda azulada, nunca negra (intensidad 0,86). Sombras más suaves (`shadow-radius` 2,6). Niebla clara a lo lejos (`#dcebf3`, algo más densa); antes era de color melocotón.
- **Oclusión suave** al pie de árboles, rocas y edificios: va horneada en el color del suelo y de la hierba (`contactShade` en `layout.js`), tono frío; no cuesta llamadas de dibujo.
- **Noche**: luna fría y azul (antes violeta); luciérnagas (170), ventanas, faroles con halo y carteles encendidos.
- **Bloom solo en luces**: umbral subido a 1,14 (por encima de una superficie blanca a pleno sol) y fuerza de día de 0,5 a 0,3.
- Pruebas tras el apartado: `errors`, `entrada.mjs` (0 pipelines en caliente al entrar y al despegar), `life`, `motion`, consola sin errores; batería completa `npm run e2e`: 310 comprobaciones bien, 0 fallos (las trece pruebas; `sounds.mjs` se pasó aparte porque la sesión se cortó antes de llegar a ella). `welcome.mjs` 21 de 21 con la luna nueva.
- Los colores de la noche y la piedra gris azulada también llegan a la bienvenida (usa el tema de noche): captura en `capturas/23-pulido/parada-4/bienvenida/`, pendiente de que David la compare con la aprobada.
- Sin comprobar: Chrome con ventana, el Mac, un teléfono.
- **No guardadas**: las tres imágenes de referencia (`docs/referencias/`). No llegaron adjuntas a la sesión; hay que volver a pasarlas.

**Retoques tras la parada del apartado 4** (14-11-2026):
- **Corrección del apartado 4**: este planeta trae sus propios colores de día y de noche (`themes` al final de `layout.js`) y pisan los de `experience/theme.js`. Los colores de luz, niebla, agua y fuerza del bloom que se anotaron en el apartado 4 se habían puesto en `theme.js` y **no se estaban aplicando**; lo que David aprobó llevaba solo el umbral del bloom, las sombras suaves, la oclusión, la espuma y la cascada. Ahora están en `layout.js` (relleno frío `#dfeaff`, sol `#ffdfae`, niebla `#d3e9ea`, sombra 0,88, bloom de día 0,3) y `theme.js` vuelve a ser el de antes (valores de reserva de otros planetas).
- Musgo: capa que tapa la coronación salvo una esquina, que queda en piedra, y cae por los lados a distinta altura; verde más amarillo y apagado que la hierba.
- Cohete de noche: cada pieza devuelve su color en cálido (en el material: se ve desde toda la isla y no gasta luces), ventanilla encendida en cálido, tres focos al borde de la losa con lente, halo y luz de verdad.
- Agua de noche: apagada y oscura (`#27466c` / `#0b1836`); la espuma se mantiene.
- Junto a la plataforma: piedras irregulares encajadas (celdas de un reparto de puntos descolocados, junta de 2 cm, una sola malla) en vez de losas en rejilla.
- Rótulos: PROYECTOS (plaza) y SOBRE MÍ (casa del árbol) son ahora carteles del estilo nuevo, más grandes (`scale` en `SIGNPOSTS`); fuera el cartel antiguo de CONTACTO (queda uno) y el indicador de PROYECTOS de la entrada de la aldea. Placas de los tres tótems (icono de matraz), de los tres aparatos de Contacto y del atril del CV, con la cara clara de `SignFace`. Diez carteles en total.
- Visor del astronauta: cristal (refleja el cielo del momento, más claro arriba y en el borde, con un brillo). También lo lleva el astronauta de la bienvenida.
- Pájaros un 40 % más grandes (`SIZE` 2,1).
- Pradera entre la plaza y el campo de fútbol: tres árboles a los lados (cerezo, roble, álamo), tres grupos de rocas y ocho manchas de flores, puestos a mano sin mover el resto del reparto.
- **No hecho**: guardar las tres imágenes de referencia en `docs/referencias/`. No han llegado adjuntas a la sesión en ninguno de los tres mensajes.
- Colisiones rehorneadas (813 obstáculos). Pruebas en primer plano: `collisions`, `terrain`, `errors`, `entrada.mjs` (0 pipelines en caliente), `living`, `portfolio`, `camera`, `woody`, `birds`, `life`, `characters`: 179 comprobaciones bien, 0 fallos.

**Apartado 5, lo que hay** (`Court.jsx`, `layout.js`, `audio/engine.js`, `tools/assets/hoop.py`, `public/models/living/court/canasta.glb`, `tests/e2e/basket.mjs`):
- **Canasta**: el modelo «Basketball 3D Icons» sin el balón ni la peana (107.000 → 2.200 triángulos, 72 kB): poste, tablero y aro en una malla y la **red aparte**, que se va con el balón, se estira y se sacude al encestar (y tiembla un poco al dar en el aro). Color de cada material pasado a color de vértice. El tablero y el poste con los que choca el balón se han medido sobre el modelo.
- **Valla** metálica de 3,3 m alrededor de toda la pista, hecha a mano: postes de tubo, tres largueros y paños de malla de rombos. **Puerta** en el lado norte, donde llega el camino: se abre hacia fuera al acercarse y se cierra sola. El balón rebota en los cuatro lados (suena a metal) y no se sale a ninguna altura, tampoco con la puerta abierta. El astronauta y Woody solo pasan por la puerta.
- **Tiro con carga**, sin modo de juego: con el balón en la mano y dentro de la pista, mantener E (o el ratón, o el dedo) carga la fuerza —sube y baja en vaivén— y al soltar se tira. Barra de fuerza junto al astronauta con la franja verde donde hay que soltar (depende de la distancia). Corto con poca fuerza, largo con demasiada; un aviso dice cuál.
- **Barrera**: un maniquí delante del aro que se pone en la línea del tiro y salta al salir el balón (0,7–1,1 m): tapona los tiros flojos o tensos («¡Tapón!»). Con colisión.
- **Marcador** de canastas y racha sobre el tablero; la racha se corta al fallar. El balón vuelve solo a su soporte si se queda parado lejos (ya lo hacía).
- **Sonido**: no había ZIP de baloncesto en Descargas. Bote, aro, tablero y red siguen **sintetizados**, y se añaden la valla y el tapón, también sintetizados.
- Pruebas: `basket` 20 de 20 (dos pasadas), `progress` (el logro «Primer enceste» con tiro cargado), `living`, `woody`, `camera`, `sounds`, `collisions`, `terrain`, `errors`, `entrada.mjs` (0 pipelines en caliente).
- Sin comprobar: el tiro con el dedo en un teléfono; la dificultad jugando a mano (las pruebas tiran con la fuerza exacta); la valla del sur queda entre la cámara y la pista (es malla, se ve a través).

**Apartado 6, lo que hay** (`football/match.js`, `football/Football.jsx`, `tests/e2e/football.mjs`). Portero, barrera, efecto y red de tela ya existían desde el objetivo 8; aquí se hace visible lo que pedía el encargo:
- **Portero que se mueve**: a la espera recorre la portería a pasitos (1,5 m de un lado a otro, antes 0,9) y bota sobre las puntas; se centra al cargar el tiro.
- **Y se estira**: al lanzarse se alarga según lo que tiene que cubrir (el cuerpo hasta un 24 % y los brazos 42 cm más, también en la colisión): a un tiro a la escuadra llega estirado del todo.
- **Barrera que salta**: los tres maniquíes saltan cada uno a su tiempo tras el golpeo (ya lo hacían; sin cambios).
- **Efecto visible**: el balón deja una estela de 26 marcas que dibuja la curva del tiro; blanca si va recto y naranja, y más larga, cuanto más efecto lleva.
- **Red que se deforma con el gol**: es la tela con física del objetivo 8 (se embolsa 33 cm en la prueba; sin cambios).
- Pruebas: `football` 63 comprobaciones (tres nuevas: portero que se mueve, estirada a la escuadra, estela teñida). El umbral de «el efecto curva el vuelo» baja de 0,30 a 0,25 m: la curva medida baila entre 0,29 y 0,39 m según el muestreo y la prueba fallaba una de cada tres pasadas (ya ocurría antes de este objetivo). `errors`, `entrada.mjs` (0 pipelines en caliente).
- Sin comprobar: lo mismo que en el objetivo 8 (controles táctiles, dificultad a mano, sonido de oído).

**Apartado 7, lo que hay** (`tools/assets/buildings.py`, `tools/assets/preview.py`, `public/models/living/buildings/*.glb`, `buildings/useModel.js`, `zones/ProjectVillage.jsx`, `zones/AboutMe.jsx`, `buildings/Observatory.jsx`, `football/Football.jsx`, `layout.js`):
- **Los ocho modelos se pueden usar** (todos son de color plano, sin texturas). `buildings.py` (Blender, sin ventana) saca de cada uno una sola malla con el color en los vértices, apoyada en el suelo y con su lado mayor en planta de 1. Reduce primero las caras que están en un mismo plano y luego el resto. `preview.py` renderiza los GLB para verlos sueltos.

| Modelo | Antes → después (triángulos) | Peso | Dónde |
|---|---|---|---|
| Small country house with green roof and fireplace | 54.690 (125.096 con modificadores) → 5.200 | 91 kB | Proyecto 1 (cabaña en A; es así, con porche abierto) |
| Small house with blue roof | 34.490 → 5.200 | 85 kB | Proyecto 2 |
| Small house with red roof and chimney | 59.898 → 5.200 | 85 kB | Proyecto 3 |
| Compact residence with dual contemporary balconies | 17.136 (75.284) → 5.200 | 85 kB | Proyecto 4 |
| Island cabin with outdoor seating | 1.958 (536.450) → 5.200 | 94 kB | Convertida; es la casa de té del apartado 8 |
| Cartoon treehouse with ladder access | 229.138 → 7.000 | 231 kB | Sobre mí |
| Small observatory with telescope dome | 32.208 → 5.999 | 150 kB | Observatorio |
| World Cup Trophy Football | 228.848 → 4.498 | 60 kB | Vitrina del trofeo |

- **Proyectos**: son cuatro proyectos, así que van cuatro casas de stdgaris (la quinta, la «Island cabin», queda para el jardín japonés). Los modelos son dioramas: se les quita la peana de terreno y los árboles. Cada casa lleva delante, a un lado, su **pantalla** con la captura real del proyecto y encima su **rótulo** del estilo nuevo. Las ventanas se encienden de noche (la conversión las pinta de un color exacto y el material lo enciende). Fuera las casetas hechas a mano y el taller (`taller.glb` sigue en el repo, sin usar).
- **Casa del árbol**: el modelo entero (árbol, cabaña y escalera), sin su plano de suelo, de 8,2 m.
- **Observatorio**: el edificio es el modelo (6,4 m de diámetro). Se conservan la esfera armilar y el telescopio como interruptor del día y la noche. **Se pierde** el giro de la cúpula de noche (el modelo es una sola malla) y la carta estelar de la fachada.
- **Trofeo**: el modelo, en dorado con sus dos anillos verdes; placa y aviso «ESPAÑA · CAMPEONA DEL MUNDO · 2010 · 2026».
- Colisiones rehorneadas (815 obstáculos); a mano, la esfera armilar y las vallitas de la casa azul. `camera.mjs`: la comprobación de los escaparates se ha reescrito (la pantalla va exenta: se la rodea, no hay fachada detrás).
- Pruebas: `collisions`, `terrain`, `errors`, `entrada.mjs` (0 pipelines en caliente), `living` (las cuatro fichas, Sobre mí, observatorio), `portfolio`, `camera`, `woody`, `progress`, `football`.
- Ojo: Blender escribió las vistas previas en `C:\capturas\` (ruta relativa mal resuelta; ya corregido en `preview.py`). Las copié al proyecto; **queda esa carpeta `C:\capturas` con ocho JPG**, que no he podido borrar (lo bloquea una protección de borrado): bórrala a mano.
- Sin comprobar: que cada fachada quede bien orientada vista andando (solo en capturas fijas); la escalera de la casa del árbol es decorado.

**Apartado 8, lo que hay** (`zones/Garden.jsx`, `layout.js` (`GARDEN`), `tools/assets/buildings.py`, `public/models/living/buildings/{torii,puente-rojo,farol-japones,koi,casa-te}.glb`, `tests/e2e/garden.mjs`):
- **Dónde**: al este de la pista de baloncesto, entre la nave y la playa. No toca el relieve: el estanque es una lámina de agua a ras de suelo con su borde de piedras.
- **Torii** («Torii Gate», ≈1.200 triángulos) de entrada viniendo de la nave, y cartel **«JARDÍN»** del estilo nuevo con su icono.
- **Estanque** con 24 piedras de borde (instancias), agua con el turquesa del resto y **7 kois** de colores planos (naranja, blanco, rojo, ámbar y uno negro): una sola malla con instancias, del modelo «Orange and White Koi» solo la forma (≈420 triángulos); rondan cada uno por su carril y colean.
- **Puente rojo** («Stylized Arched Road Bridge», ≈2.200 triángulos, pintado por dónde mira cada cara: lo que se pisa en madera oscura, lo demás en rojo). **Se cruza andando**: sube 0,54 m en el lomo.
- **Faroles «Japan Lamp»** (148.000 → ≈900 triángulos): cuatro, con instancias; de noche llevan halo y dos de ellos dan luz de verdad.
- **Casa de té**: la «Island cabin» (≈5.200 triángulos), con un **banco** hecho a mano junto al estanque.
- **Cerezos**: tres, puestos a mano detrás y a los lados del estanque. Se quitan del reparto las plantas y rocas que caían dentro del jardín y los árboles que quedaban justo al sur.
- Colisiones rehorneadas (841 obstáculos de 202 mallas).
- Pruebas: `garden` 6 de 6 (están todas las piezas, el puente se cruza, los kois nadan).
- **Visto en las capturas y sin arreglar** (decide David): el árbol viejo de (17, 33), que ya estaba, tapa la cámara de juego cuando el astronauta está en la orilla sur del estanque (captura 4 de `hoja-8-jardin-*.jpg`: se ve por el aro de visión); la casa de té no enciende ventanas de noche; el travesaño del torii sale negro.
- Sin comprobar: que caigan pétalos de los cerezos nuevos (salen del mismo reparto que los demás; no lo he mirado en movimiento); el jardín andando, visto por una persona.

**Parada del apartado 8 — batería completa** (14-11-2026, en primer plano, de dos en dos, Chrome sin ventana, servidor de desarrollo en el 5199). La sesión anterior se colgó a mitad de la batería y dejó una tanda lanzada que seguía corriendo sola; se paró antes de empezar.

| Prueba | Bien | Fallos |
|---|---|---|
| `errors` | 8 | 0 |
| `living` | 44 | 0 |
| `characters` | 20 | 0 |
| `portfolio` | 25 | 0 |
| `progress` | 26 | 0 |
| `motion` | 10 | 0 |
| `camera` | 30 | 0 |
| `woody` | 37 | 0 |
| `rocket` | 9 | 0 |
| `terrain` | 3 | 0 |
| `life` | 11 | 0 |
| `football` | 63 | 0 |
| `sounds` | 27 | 0 |
| **`npm run e2e` (las trece)** | **313** | **0** |
| `basket` | 20 | 0 |
| `garden` | 6 | 0 |
| `birds` | 4 | 0 |
| `collisions` | 4 | 0 |
| `welcome` | 21 | 0 |
| `hill` | 29 | 0 (fallaba 1; arreglado, ver abajo) |
| `loader` | 13 | **1** (sin arreglar, ver abajo) |
| `tests/perf/entrada.mjs` | 0 pipelines en caliente al entrar y al despegar | — |

- **Arreglado — tirón en la rampa** (`hill`: «rampa-bajar-corriendo: sin tirones», 5,11 m/s). Eran dos cosas. (1) La medida: sacaba la velocidad vertical de la hora de cada fotograma, y el reloj de la grabación no es el del juego; si un fotograma llegaba tarde daba 3–5 m/s bajando una pendiente constante con los pies pegados al suelo. Ahora la saca de la pendiente del tramo andado por la velocidad del jugador. (2) Un resalte de verdad al coronar: en el último tramo, el borde de la meseta adelantaba a la rampa a 4 cm de la cima y dejaba un quiebro en el hombro por el que se sube en diagonal (1,2–2,2 m/s corriendo; es el «tirón al subir la rampa corriendo» del bloque 3 del objetivo 16). La rampa corona ahora un 8 % antes de su final (`RAMP_TOP` en `layout.js`): 0,04–0,20 m/s en las cuatro pasadas de la rampa. La pendiente del tramo recto pasa de 0,48 a 0,52. Repetidas después `hill`, `terrain`, `collisions`, `woody`, `living` y `camera`: bien.
- **Sin arreglar — `loader`**: «la escena se pinta a los 212 ms (objetivo: menos de 100)»; en tres pasadas, mediana de 192–220 ms. La pantalla de carga no se ha tocado en el objetivo 18 (su último commit es `544f389`, anterior) y el encargo pide no tocarla hasta el cierre. El objetivo de 100 ms se fijó con los 64 ms del Mac; no he comprobado si en este equipo Windows se cumplió alguna vez.
- **Fps** (`tests/perf/fps.mjs`, misma tanda): 71 · 76 · 71 · 67 · 72 con el jardín (otra pasada: 75 · 78 · 77 · 74 · 77); 78 · 82 · 81 · 82 · 82 con el commit anterior al jardín (`3063794`). Por encima de 60. Hoy el equipo da unos 30 fps menos que cuando se midieron los apartados 5 a 7 (109–113), también con el código de entonces.
- **Capturas**: `capturas/23-pulido/parada-8/` — `hoja-5-baloncesto-dia.jpg`, `hoja-6-futbol-dia.jpg`, `hoja-7-edificios-dia.jpg`, `hoja-8-jardin-dia.jpg` y las cuatro `-noche.jpg`; debajo, las 68 capturas sueltas.

## Objetivo 16

| Bloque | Estado |
|---|---|
| 0. Inventario y sonidos | **Visto bueno.** `docs/RECURSOS.md`; grabación y lista en `capturas/18-sonidos/` |
| 1. Pantalla de carga (astronauta y Woody caminando sobre un planeta) | **Visto bueno.** Capturas: `capturas/19-carga/serie-*.jpg` |
| 2. Pantalla previa al aterrizaje (flecha, cero espera, luna, fugaces, planeta) | **Visto bueno**, con dos retoques pedidos y hechos: más relieve en los cráteres de la cara iluminada de la luna y planeta sin rótulo. Capturas: `capturas/20-aterrizaje/` (`luna-relieve-*.jpg`) |
| 3. Errores de juego (colisiones, colina, Woody, aro de visión, carrera) | **A medias.** Hechas colisiones y colina (commit `4f0e380`, `collisions.mjs` y `hill.mjs`). Las tres cosas que quedaban están hechas: tirones de la rampa (objetivo 18, «Parada del apartado 8»), aro de visibilidad y animación de correr (objetivo 19, bloques A y B). Woody: hecho (recorrido de 180 s, 87 tramos, cero fallos) |
| 4. Aspecto del mundo (farolas, caminos, rocas, pájaros, carteles, cascada) | Sin empezar |
| 5. Edificios con los modelos descargados | Sin empezar |
| 6. Fútbol y baloncesto | Sin empezar. **Faltan recursos**: no hay sonido de bote, aro ni red de baloncesto |
| 7. Jardín japonés | Sin empezar |
| 8. Cierre | Sin empezar |

**Bloque 3, lo que queda** (14-11-2026; no se ha tocado nada de esto todavía). Una sola sesión de trabajo abierta; ningún servidor (ni el de desarrollo del 5199 ni la vista previa del 5198) ni Chrome de pruebas en marcha:
- ~~Tirón al subir la rampa corriendo~~: **arreglado** el 14-11-2026 (`RAMP_TOP` en `layout.js`; `hill.mjs` 29 de 29, 0,04–0,20 m/s en la rampa).
- **Aro de visibilidad**: sigue dejando una mancha de puntos sobre el árbol junto a la cascada (lo ha visto David); también fallaba al subirse al cohete y en el pozo. Arreglarlo o cambiarlo por un recorte circular limpio (`experience/environment/seeThrough.js`).
- **Animación de correr del astronauta**: rehacerla (contacto, paso y vuelo; brazos en oposición; tronco inclinado; rebote; sin patinar) y sincronizar con ella los pasos sobre hierba.

Comprobado (lo confirma David el 14-11-2026): el recorrido de 3 minutos de Woody (`woody-tour.mjs`) pasó entero en Windows (180 s, 87 tramos, cero fallos) y el fallo de `football.mjs` en «el efecto curva el vuelo de verdad» no se repitió.

**Carga sin tirones (14-11-2026, aplicada)** (`index.html`, `src/experience/Experience.jsx`, `src/worlds/Staged.jsx`, `src/worlds/living/terrainData.js`, `tests/perf/carga.mjs`):
- Los tirones de la pantalla de carga no eran del hilo principal: eran del proceso de GPU de Chrome, que es también el que presenta la página (animación CSS incluida). Lo paraban los pipelines creados «en el acto» (three r183 al dibujar algo por primera vez; DXC en Direct3D), la creación del dispositivo, el pipeline interno de la primera copia de imagen a textura, los de mipmaps y el compositor esperando al lienzo del juego.
- **Todos los pipelines se crean en asíncrono** (`asyncPipelines`): los de dibujado y los de mipmaps de three. Lo que aún no tiene el suyo se salta y entra solo cuando llega. Lo compilado no se tira (three lo descartaba al quedarse un instante sin usuarios).
- **Detrás de la carga la escena no se dibuja** (`live.loading`, lienzo con `visibility: hidden`): todo lo dibujable queda tapado (`hold`) y se destapa de objeto en objeto para compilarlo (`exposed` + `compileNow`), en tramos de 12 ms. Las sombras se compilan dibujando 3 objetos por fotograma real **junto a un receptor de sombra**: three solo rehace el mapa de sombras si en ese fotograma se dibuja algo que la recibe (sin eso, las sombras de tótems, cohete, farolas y setas se compilaban al entrar).
- El dispositivo de GPU se pide desde `index.html` (`window.__gpuDevice`) antes del primer pintado, y la animación de la carga arranca (`html.is-live`, marca `carga:animada`) cuando eso ha pasado; antes se ve su primer fotograma, quieto.
- El mundo se monta pieza a pieza con un turno único (`Staged`, anidable) y el terreno se hornea por filas (`prepareTerrain`).
- **Medido** (Chrome sin ventana, sin caché, 3 pasadas seguidas, este equipo Windows): producción **4,45–4,63 s** hasta poder entrar, **0 parones visibles** de más de 50 ms; desarrollo 4,78–5,04 s, 0 parones. 0 pipelines en caliente al entrar y al despegar; 0 dibujados aplazados tras la carga. Antes: 15,3 s y 35 parones visibles (el peor, 1,1 s).
- **No cumplido**: quedan 7–9 tareas de más de 50 ms en el hilo principal (la peor ~170–260 ms): evaluación de `layout.js`, geometría del agua, islote, rótulos, terreno y el primer render del posproceso. No se ven (la animación no depende de ese hilo).
- Sin comprobar: Chrome con ventana tras los últimos cambios (solo al principio), el Mac y el respaldo WebGL2 (`?backend=webgl`).

**Bloque 2, lo que hay** (`src/ui/StartOverlay.jsx`, `src/styles/ui.css`, `src/ui/loaderControl.js`, `src/experience/Experience.jsx`, `src/experience/Welcome.jsx`, `src/experience/intro/skyModels.js`, `tests/e2e/welcome.mjs`):
- **Cero espera**: la pantalla de carga ya no se retira al estar lista la bienvenida, sino cuando el planeta está montado y compilado (etapas nuevas `built` y `world` en `loaderControl.js`, con avance real de la compilación). Cuando se ve la portada ya se puede entrar; «Preparando el planeta…» solo queda como respaldo si la carga se retirase antes. Al no tener que cuidar la fluidez de la bienvenida, la compilación del planeta usa 22 ms por fotograma (antes 8). Medido en desarrollo: se puede entrar a los ~2,9 s (antes ~3,1 s, con la portada visible desde los 0,8 s y el botón esperando).
- **Del gesto al descenso: 9–12 ms** (clic en la indicación, clic en cualquier parte nada más retirarse la carga y tecla Enter; primer fotograma en que la cámara ya baja, sin ninguna tarea larga por medio). Lo mide `welcome.mjs`.
- Fuera el botón naranja. La indicación es el texto «Haz clic para aterrizar» («Toca…» con el dedo) y, debajo, tres galones naranjas que caen en bucle y se desvanecen (uno cada 0,5 s, siempre dos a la vista), con halo suave. Sigue siendo un `<button class="overlay__enter">`: se pulsa entero, vale un clic en cualquier parte y la tecla Enter.
- Luna nueva (`createMoon` en `skyModels.js`): radio 5 (antes 3,4), 7.220 caras, 38 cráteres repartidos por igual (fondo llano y hundido, pared empinada, labio claro), mares oscuros, dos halos que respiran y giro muy lento. Su luz se calcula al dibujar (`celestial`), no va pintada: por eso puede girar; lleva una curva de contraste para que el relieve se lea también de cara a la luz. El planeta de destino va sin rótulo.
- **The Living World a lo lejos** (`Destination`): un globo facetado con mar, costa, prados y bosque, nubes y halo de atmósfera, girando despacio sobre un eje inclinado. En horizontal va bajo el título, a la izquierda del islote; en vertical, junto al islote, encima de la indicación. Se apaga al emprender el descenso.
- 34 luciérnagas (antes 14, ahora una sola malla con instancias) y 130 motas de polvo luminoso que suben despacio, más densas bajo la farola.
- Estrellas fugaces cada 4–8 s, con cabeza brillante y cola que crece y se recoge; en horizontal cruzan por la izquierda, sobre el título (en el centro está la luna).
- Sin comprobar: Safari y un teléfono real; el tiempo del gesto al descenso en un equipo lento.

**Bloque 1, lo que hay** (`index.html`, `tools/blender/loader.py`, `tests/e2e/loader.mjs`, `src/ui/fonts.js`):
- El astronauta (clip `Astro_Walk`) y Woody (clip `Woody_Trot`) caminan de perfil, de izquierda a derecha, sobre un planeta de 3,6 m de radio que gira bajo sus pies; Woody va delante. Atardecer: cielo azul noche arriba y cálido abajo, sol grande medio escondido tras el planeta, estrellas que parpadean, y tres capas que pasan a velocidades distintas (planeta con anillo y nube lejana; luna y nube media; nube cercana).
- `…/Blender -b -P tools/blender/loader.py` renderiza los modelos reales con cámara ortográfica y saca cuatro WebP en `public/loader/` (212 kB): `astronauta.webp` y `woody.webp` (tiras de 12 fotogramas del ciclo), `mundo.webp` (el planeta con su senda, siete árboles de slabdsgn, matas, rocas, briznas y flores) y `planeta.webp`. Imprime las medidas en metros que usa el CSS. `-- solo=mundo` rehace una sola capa. Los árboles salen de los originales de `assets-externos/`.
- Todo lo demás es CSS en línea en `index.html`, en una unidad `--m` (píxeles por metro). El planeta es una imagen que gira (cámara ortográfica + giro sobre el eje de la vista = giro real), así que su luz no puede venir de un lado: cada cara se aclara según mire hacia fuera y el borde cálido lo pone una capa fija encima. Solo se animan `transform` y `opacity`: no depende del hilo principal, ocupado cargando el juego.
- **Los pies no patinan**: una sola variable (`--v`, segundos por metro de suelo) fija el giro del planeta y los dos ciclos. Con la velocidad real de cada clip medida en Blender (astronauta 0,52 m/s, trote de Woody 1,33 m/s) sale un suelo a 0,78 m/s: el astronauta anda a 1,5× su clip (ciclo de 0,44 s) y **Woody trota a 0,59× el suyo** (ciclo de 0,91 s), porque su trote es 2,6 veces más rápido que el paso del astronauta.
- La hoja de la tipografía ya no bloquea el primer pintado (antes lo retrasaba a ~560 ms): la escena se pinta a los ~64 ms y los textos aparecen al llegar la letra, nunca con otra. Por eso los rótulos 3D esperan a la letra con `fontReady` (`src/ui/fonts.js`) en vez de `document.fonts.load` a secas.
- En móvil vertical la escena ocupa el 66 % del alto; el astronauta mide el 14 % (18 % en escritorio).
- Sin comprobar: que el trote lento de Woody se vea natural en movimiento (solo lo he visto en fotogramas); Safari y un teléfono real.

**Bloque 0, lo que hay** (`src/audio/engine.js`, `src/audio/Sounds.jsx`, `tools/assets/sounds.py`, `tests/e2e/sounds.mjs`):
- Los 12 sonidos de Envato, convertidos a 14 MP3 en `public/sounds/` (1,47 MB). `…/Blender -b -P tools/assets/sounds.py` los regenera y escribe `src/audio/sampleData.json` (duraciones, puntos de bucle, casillas de los pasos). Los bucles llevan su periodo dentro del archivo con margen repetido a los lados, así no dependen del silencio que mete el MP3.
- Se piden **después de entrar** (`loadSamples()` al activarse el juego), uno tras otro; hasta que llega cada uno suena su versión sintetizada. Ninguno cuenta para el peso de entrada.
- Con posición (`world.soundSources(x, z)` en `layout.js`): cascada (un punto), arroyo (tramo más cercano del río o del arroyo de la meseta) y mar (la orilla de enfrente). Se atenúan con la distancia y se desplazan a izquierda o derecha según la cámara.
- Ambiente: pájaros de día y grillos de noche, con fundido que sigue al cielo. Desde la nave se oyen apagados y sin agua.
- Pasos sobre hierba: 16 muestras, nunca la misma dos veces seguidas, más fuertes y agudas al correr. **Cadencia limitada a mano** (un paso cada 0,29 s andando, 0,2 s corriendo) porque los clips marcan 7–9 pisadas por segundo; se sincronizará con el pie al rehacer la carrera (bloque 3). Sobre camino, piedra, madera, arena y agua siguen los sintetizados (no hay recurso).
- Chapuzón al entrar en el agua (astronauta y Woody) y al caer en ella; poste/larguero y red en el fútbol; «pop» en cualquier botón o enlace y al abrir o cerrar fichas; rugido desde el encendido y silbido al levantarse el cohete; final del rugido al aterrizar.
- El botón de sonido (y la tecla M) actúa sobre la salida general: calla y devuelve todo.
- **No escuchado por una persona**: la prueba mide la señal real de cada bucle y de la salida y graba el recorrido (`capturas/18-sonidos/recorrido-sonido.webm`, 78 s, con su guion en `recorrido-sonido.txt`), pero volúmenes y mezcla están sin juzgar de oído.

## Objetivo 15 (bloques 1 y 2 hechos; los bloques 3–6 quedan sustituidos por el objetivo 16)

| Bloque | Estado |
|---|---|
| 1. Bienvenida (islote nocturno) | **Hecho, pendiente de visto bueno** (segunda vuelta, con las ocho correcciones). Capturas: `capturas/16-bienvenida/*-final.jpg`, `*-antes.jpg` y `descenso/` |
| 2. Pantalla de carga | **Hecho, pendiente de visto bueno.** Render de Blender en capas. Capturas: `capturas/17-carga/*-final.jpg` |
| 3. Baloncesto (canasta, valla, puerta, pista, marcador, minijuego) | Sin empezar. La canasta, del modelo de twinstd. **La valla y la puerta se hacen a mano** (postes de tubo y malla): «Court Net» era una red de pickleball y no se usa |
| — Sonidos de Envato | Después del bloque 3, antes de los proyectos |
| 4. Proyectos (fichas crema, tres casas de stdgaris) | Sin empezar. Las casas vienen solo en `.blend` |
| 5. Jardín japonés | Sin empezar |
| 6. Pulido (Woody, logros, trofeo, escalera, imágenes, cielo) | Sin empezar; del cielo ya está el parpadeo de las estrellas |

**Bloque 1, lo que hay** (`src/experience/Welcome.jsx`, `src/experience/intro/isletModels.js`):
- Islote de contorno irregular hecho con anillos (césped con borde que cuelga, tierra, tres estratos de roca con repisas y punta), raíces y lianas por debajo y cinco rocas flotando.
- Árbol: el «frondoso» de slabdsgn con raíces, dieciséis masas pequeñas más en la copa, lianas y cuatro farolillos (armazón + cristal), cada uno con su luz.
- **Luces solo del islote**: la farola (un foco muy abierto hacia abajo, con sombras de verdad), los cuatro farolillos, el relleno azul desde abajo, una luz fría por delante y un toque para la roca flotante de arriba no están en la escena: van en un `lightsNode` que llevan los materiales del islote (three r183, `material.lightsNode = lights([...])`), junto con las dos luces generales (`sceneLights` en `lightSources.js`). El planeta ya no calcula ninguna luz de la bienvenida (antes llevaba cuatro puntuales apagadas). Con una luz *puntual* con sombras three r183 falla dentro del posproceso; por eso la farola es un foco.
- La luna es la luz direccional de la escena: en la bienvenida viene de atrás a la izquierda, más blanca y más fuerte (`SUN_WELCOME`, `MOON_WELCOME` en `theme.js`), y su cámara de sombras se centra en el islote mientras `rig.intro === 1` (`Lights.jsx`). La luna dibujada (facetada, con cráteres, sin quemar) se coloca siempre detrás de la copa, asomando arriba a la izquierda.
- Vida: luciérnagas, hojas que caen, estrellas que parpadean (`Sky.jsx`, vale para todo el juego) y una estrella fugaz cada 6–13 s.
- Astronauta (idle) y Woody sentado de perfil moviendo la cola (`Woody_SitIdle` sin la cola + la cola de `Woody_TailWag_Happy`), un 10 % mayores que en el juego.
- Encuadre: `welcomePose(aspect)` en `state.js`; el islote llena la mitad derecha en horizontal y va centrado en vertical, siempre entero.
- Portada (`StartOverlay.jsx`): botón naranja «Haz clic para aterrizar» con latido, halo y flecha; al pie, teclas dibujadas (W A S D, Espacio, Shift, E, rueda) o los gestos táctiles. Al entrar se funde como bienvenida (antes asomaba un instante el panel de pausa).
- Medidas (build de producción, este Mac): se puede entrar a los 2,9 s (antes 3,4–3,5 s); fps en cinco puntos 177–213 (antes 161–216); 0 pipelines compilados en caliente al entrar y al despegar.
- Sin comprobar en captura: la estrella fugaz.

**Bloque 2, lo que hay** (`index.html`, `src/ui/loaderControl.js`, `tools/blender/loader.py`):
- `…/Blender -b -P tools/blender/loader.py` renderiza con EEVEE los modelos reales (astronauta con el clip `Astro_SofaIdle`, Woody con el final de `Woody_LieDown`), una roca facetada y un farol, con luna fría desde atrás y farol cálido, sobre fondo transparente. Salen tres WebP en `public/loader/`: `escena.webp` (31 kB, luz de luna), `farol.webp` (36 kB, lo mismo con el farol encendido) y `planeta.webp` (6 kB). 74 kB en total. (`-- prueba` saca solo una vista previa.)
- En la página, `farol.webp` va encima de `escena.webp` y su opacidad tiembla: la luz del farol parpadea de verdad sobre los personajes. Además: halo, motas que suben, flotación de la roca, estrellas de tres tamaños que parpadean, nebulosa tenue y el planeta. Todo CSS en línea; las dos imágenes se precargan desde el `<head>`.
- Al llegar al 100 % se funde en ese mismo fotograma (ya no espera 520 ms): la bienvenida aparece a los 0,75–0,79 s (antes 1,3 s).
- La escena ocupa ≈43 % del alto en escritorio; en móvil vertical la limita el ancho (≈25 %).

## Cómo arrancarlo y probarlo

```
npm run dev -- --port 5199     # http://localhost:5199
node tests/e2e/travel.mjs      # viaje entre mundos: destino en la órbita, la pantalla del viaje, el mundo 2 se descarga y se compila solo entonces (0 pipelines en caliente), aterrizaje y vuelta; «capturas» las saca (incluida en e2e)
node tests/e2e/twisted.mjs     # mundo 2: noche fija, luna creciente, edificios en su terraza, miradores, pasarela, escalera, puente colgante, acantilado, la casa sobre tronco y su puerta, Woody con farolillo y guiando, 0 pipelines en caliente; «fps» mide además (incluida en e2e)
node tests/e2e/twisted-sound.mjs # mundo 2: música (?musica=1, 2, 3), grillos propios, mar y cascada, destello, pasos de madera, campanadas, silencio y fundido al irse (incluida en e2e)
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/assets/twisted_sounds.py   # convierte los sonidos del mundo 2 (assets-externos/mundo2/ → public/sounds/twisted/)
node tests/e2e/twisted-walk.mjs # mundo 2, sin navegador: desde la llegada se alcanza andando cada sitio de la isla; «mapa» la dibuja en texto (incluida en e2e)
node tests/e2e/luna.mjs        # capturas del mundo 2: la vista postal (como las referencias), cada punto con la cámara de juego y desde arriba, y la órbita; no comprueba nada
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/assets/twisted.py   # convierte los modelos del mundo 2 (assets-externos/mundo2/ → public/models/twisted/); «-- mirar» solo dice qué trae cada uno
node tests/e2e/hora.mjs        # la hora del mundo: cada hora su momento, atardecer propio, franjas por mes, cambio gradual, botón y tecla N; «capturas» saca la misma vista a cuatro horas
node tests/e2e/welcome.mjs     # pantalla previa al aterrizaje: la carga espera al planeta, indicación, ms del clic al descenso, luna, planeta, fugaces; capturas y secuencia
node tests/e2e/descent.mjs     # el descenso tras el clic, una captura cada 200 ms
node tests/e2e/loader.mjs      # pantalla de carga: peso, primer pintado, pies sin patinar, móvil; fotogramas del bucle y del fundido
node tests/e2e/sheet.mjs       # monta varias capturas en una hoja: salida.jpg columnas ancho img1 img2 …
node tests/e2e/trees.mjs       # capturas de los árboles; no comprueba nada
node tests/e2e/basket.mjs      # baloncesto: tiro con carga, racha, barrera, valla y puerta; capturas
node tests/e2e/garden.mjs      # jardín japonés: torii, casa de té, puente (se cruza andando), faroles, kois, cartel
node tests/e2e/run.mjs         # trote y carrera: pies sin patinar, vuelo, brazos en oposición, pisadas con su sonido; «capturas» saca 12 fotogramas de perfil
node tests/e2e/hill.mjs        # cuestas: rampa, colinas y puente, andando y corriendo; pies pegados, sin atascos ni tirones
node tests/e2e/collisions.mjs  # nada atraviesa nada; «hornear» rehace solids.js
node tests/e2e/birds.mjs       # pájaros: posados en suelo y en alto, despegue al acercarse, bandada; capturas
node tests/e2e/pulido.mjs      # objetivo 18: capturas de cada punto (juego, a ras, desde arriba; día y noche)
node tests/perf/carga.mjs      # pantalla de carga: tiempo hasta poder entrar, tareas largas y parones VISIBLES (traza de Chrome); [url] [pasadas=N] [perfil]
node tests/perf/peso.mjs       # peso descargado en la primera visita (build de producción en el 5198)
node tests/perf/fps.mjs        # fps en cinco puntos
node tests/e2e/errors.mjs      # ninguna excepción de página y el lienzo dibujado: carga, bienvenida, estrella fugaz y mundo, sin ventana y con ventana (incluida en e2e)
npm run e2e                    # 416 comprobaciones en Chrome sin ventana (con el servidor encendido)
node tests/e2e/sounds.mjs      # sonido uno por uno: señal medida de cada bucle, golpes, silencio; graba el recorrido (incluida en e2e)
node tests/e2e/football.mjs    # fútbol de principio a fin, con fotogramas de cada tiro (incluida en e2e)
node tests/e2e/woody.mjs       # bocadillos, ritmo, descanso, cuestas y ruta guiada (incluida en e2e)
node tests/e2e/camera.mjs      # cámara, zoom, tarjeta «E», postes y oclusión, cohete incluido (incluida en e2e)
node tests/e2e/rocket.mjs      # despegue: escala, empuje, cámara, aceleración, el mundo curvándose hasta cerrarse en planeta, la isla llenando el disco, la luna y los dos mundos cerrados, y aterrizaje; saca la serie de fotogramas (incluida en e2e)
node tests/e2e/terrain.mjs     # objetos que flotan, hundidos o bajo el agua (incluida en e2e); «lista» y «capturas» como argumento
node tests/perf/entrada.mjs    # tirones y pipelines compilados en caliente al entrar y al despegar
node tests/e2e/life.mjs        # polvo, salpicaduras, hojas, polen, luciérnagas y «El bosque despierta»; saca fotogramas (incluida en e2e)
node tests/e2e/water.mjs       # capturas del río, el estanque, la cascada, la costa y el mar, de día y de noche; no comprueba nada
node tests/e2e/buildings.mjs   # capturas de cada edificio (cerca y cámara de juego, día y noche) y llamadas de dibujo; no comprueba nada
node tests/e2e/living.mjs fps  # además mide fps a 2880 × 1620 sin límite
node tests/e2e/motion.mjs      # viento, ráfaga y rastro en la hierba; guarda fotogramas
node tests/e2e/look.mjs tests/e2e/views.json   # las 12 vistas fijas, de día y de noche
```

**Windows**: las pruebas buscan Chrome solas en Mac, Windows y Linux (`tests/chrome.mjs`; la variable `CHROME` manda) y lanzan WebGPU sobre Direct3D. Las capturas van a la carpeta temporal salvo que se indique `E2E_SHOTS`; `E2E_HEADFUL=1` abre Chrome con ventana. Blender no está en el PATH: `"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b` (5.0.1). Git: `.gitattributes` fija LF en todo el texto y marca los binarios; en la copia de Windows, `core.autocrlf=false` y `core.filemode=false` (los `.glb` «modificados» tras copiar desde el Mac eran solo el bit de permisos).

Atajos de desarrollo: `?world=twisted` abre directamente en The Twisted Moon; `?world=cosmic` abre el planeta antiguo; `?webgl=0` simula un navegador sin GPU (solo sale un aviso con LinkedIn y correo); `?backend=webgl` fuerza el respaldo WebGL2.

**Textos de Woody**: `src/content/woody.js` (bienvenida, una frase por zona, menú y frases de guía). Se editan ahí, sin tocar código.

**Fútbol**: E junto al campo para entrar. Se apunta con el ratón (o el dedo) sobre la portería, se mantiene pulsado para cargar, se mueve de lado mientras se carga para dar efecto y se suelta para chutar (Espacio también carga; A/D dan efecto). 1–4 cambian de modo, B pone o quita la barrera, R reinicia, Esc sale.

Controles: WASD o flechas, Espacio saltar, Shift correr, E usar, G menú de Woody, N día/atardecer/noche, M sonido, Esc pausa. Con el ratón se hace clic en los objetos; la rueda (o el pellizco en móvil) acerca y aleja la cámara.

Capturas de comparación (fuera de git), mismas 12 vistas de día y de noche: `capturas/0-antes/` (antes del pulido), `capturas/1-webgpu/` (tras la migración) y `capturas/4-rediseno/` (ahora). Además: `capturas/2-bienvenida/` (portada en escritorio y móvil, y el descenso), `capturas/3-aldea/` y `capturas/movimiento/`.

## Objetivo 5 — casas y proyectos (en curso)

**Canal de Blender** (Blender 5.0, en modo consola): `tools/blender/build.py` genera cada edificio como GLB en `public/models/living/`.

```
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/blender/build.py            # todos
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/blender/build.py -- taller  # solo ese
```

- `tools/blender/kit.py`: primitivas biseladas (caja, cilindro, bola, prisma, torneado) escritas en los ejes del juego, pintadas en colores de vértice y unidas en una sola malla; exporta sin materiales ni normales. `parts.py`: piezas de oficio reutilizables (zócalo de sillares, tejado curvo de tejas, puerta con arco de dovelas, ventana con contraventanas y jardinera, escaparate con toldo, rótulo colgado, farol, chimenea, barril, leña…).
- El GLB trae una malla y unas «anclas» con nombre (`screen`, `sign`, `lantern`, `smoke`, `glow_*`): ahí monta el juego la captura del proyecto, el rótulo, los cristales con luz y el humo. Lo carga `src/worlds/living/buildings/useBuilding.js`; el material es el compartido de la aldea (facetado, con el tramado de oclusión).
- En `layout.js`, un edificio nuevo se marca con `solid` (sus círculos de colisión, en los ejes de la casa) y deja de tener escaparate aparte.

| Paso | Estado |
|---|---|
| 1. Casa de referencia junto al cohete | **Hecha** (`taller.glb`, 25.272 triángulos, 1,25 MB). Pendiente de visto bueno. Capturas: `capturas/12-edificios/referencia/` |
| 2. Un edificio distinto por proyecto | Solo el taller (Configurador). Faltan tienda (AIO), torre (porfolio) y estudio (diplomas), que siguen con la casa antigua y su expositor inclinado |
| 3. Detalle (alero curvo, chimenea, vigas, puerta con marco, contraventanas, base de piedra, escalones, jardineras, farol) | En el taller, sí |
| 4. Captura dentro de la fachada | En el taller, sí |
| 5. Un rótulo por edificio; sustituir el arco de «PROYECTOS» | En el taller, sí; el arco sigue |
| 6. Respuesta al acercarse y cámara que se acerca con E | En el taller: se aviva la luz del escaparate y el rótulo da un bote; la cámara ya se acercaba antes de abrir la ficha |
| 7. Contacto, Sobre mí y pedestales del laboratorio | Sin empezar |
| 8. Colliders y medidas | Colliders del taller ajustados. Medidas de partida y con la casa nueva, abajo |

Medidas (desarrollo, 1440 × 900, este equipo Windows): antes, 296 llamadas de dibujo en la plaza con la cámara lejos y 263 junto al cohete, ~850.000 triángulos, botón de entrar a los 10,2 s. Con el taller nuevo: 293 y 258 llamadas, ~900.000 triángulos, 11,1 s. Capturas de partida de todos los edificios (cerca y cámara de juego, día y noche): `capturas/12-edificios/antes/`.

Rendimiento del objetivo 7 (2880 × 1620 sin límite, este equipo, alternando el commit anterior y el nuevo en tres pasadas): antes 84–101 fps, después 81–101 fps según el punto y la pasada; la variación entre pasadas (±10 fps) es mayor que cualquier diferencia entre versiones. Tras pulsar para entrar y al despegar: 0 pipelines compilados en caliente.

## Arquitectura gráfica

- **Renderer**: `WebGPURenderer` (three r183) con inicialización asíncrona; donde no hay WebGPU cae solo a su backend WebGL2. `src/experience/Experience.jsx`.
- **Materiales**: nodos TSL. No queda ningún `ShaderMaterial` ni `onBeforeCompile`. Los materiales clásicos de three (Lambert, Basic) se siguen usando donde no hace falta sombreador propio; el renderer los convierte.
- **Posproceso**: `RenderPipeline` con resplandor, viñeta, mapeo de tonos y FXAA (se quitó `@react-three/postprocessing`).
- **Entorno compartido** (`src/experience/environment/`): `wind.js` (campo de viento único, ráfagas, flexibilidad por especie), `trail.js` (rastro del astronauta y Woody), `noise.js` (ruido repetible). Datos del terreno horneados en `src/worlds/living/terrainData.js`.
- Ojo: el disco no distingue mayúsculas. No crear pares como `Grass.jsx` / `grass.js`.

## Terminado y verificado

| Qué | Prueba |
|---|---|
| Fases 0–5 del encargo (personajes riggeados, Planeta 1 jugable, portfolio profesional, sonido, logros) | `living` 43 · `characters` 19 · `portfolio` 19 · `progress` 25 |
| Renderer WebGPU + TSL con respaldo WebGL2 | Las mismas pruebas pasan sobre WebGPU; `motion` y el arranque pasan también con `?backend=webgl` |
| Césped: una malla de ~113.000 briznas curvas que sigue a la cámara; densidad y altura por máscara de terreno; color que nace del suelo; se aparta al paso y se recupera | `motion` 7; capturas |
| Viento global en GPU: hierba, flores, helechos, juncos, arbustos y árboles leen el mismo campo; ráfagas que avanzan por el terreno | `motion` |
| Luz nocturna con farolas y ventanas que iluminan de verdad; cielo, estrellas, luna | capturas de noche |
| **Agua** (objetivo 7): sin patrón de celdas ni facetas en mar, río y estanque. Color continuo por profundidad (turquesa claro en la orilla, intenso en el centro), ondas hechas con dos capas de ruido que se cruzan, corriente que baja por el río (cada vértice sabe en qué punto del cauce está), espuma irregular en orillas, costa, rocas y corriente, anillos donde cae la cascada. Cascada y arroyo con hilos de agua del mismo ruido y borde deshilachado. De noche se apagan ondas y espuma. `water/Water.jsx`, `water/Waterfall.jsx` | `capturas/13-agua/antes/` y `despues/` (ocho vistas, día y noche) |
| **Efectos breves en GPU** (objetivo 7): polvo al andar, correr y aterrizar; gotas y aros al entrar en el agua, al vadear y al saltar un pez. Tres mallas con instancias cuyo movimiento calcula el sombreador (`experience/effects/Bursts.jsx`, `pools.js`); sustituyen a las diez bolas sueltas del jugador | `life` 10; `capturas/13-agua/vida/` |
| **Vida ambiental** (objetivo 7): 900 hojas y pétalos que caen de las copas y derivan con el viento, 240 motas de polen de día y las luciérnagas de noche, todo en GPU (`worlds/living/life/Leaves.jsx`); mariposas con alas con forma y aleteo en el sombreador; carpas de colores que colean y salpican al saltar | `life`; capturas |
| **«El bosque despierta»** (objetivo 7): la ráfaga del carillón recorre hierba y árboles, su frente va soltando las hojas de cada árbol al alcanzarlo y las aves despegan en cadena según les llega; después vuelve la calma. El jugador conserva el control | `life` (aves en vuelo: 0, 1, 2, 5, 6, 8, 12, 12; el jugador avanza 11,7 m durante el evento) |
| Siete especies de árbol + árbol viejo; flores por especies, helechos, juncos, setas, rocas con musgo; suelo con doce tipos de superficie | capturas |
| Observatorio nuevo (torre, galería, cúpula giratoria, telescopio, anexo, atrezo) | `living` (interacción día/noche) |
| Hueco de visión: la copa que tapa al astronauta se deshace a su alrededor | capturas |
| **Bienvenida**: islote nocturno con el astronauta, Woody, árbol protagonista y farola; título e indicación trazada a mano; descenso de cámara al planeta con amanecer | capturas (escritorio, móvil horizontal y vertical); todas las pruebas entran por ella |
| **Aldea de proyectos**: plaza empedrada con pozo, cuatro casas distintas (taller, estudio, mirador con torreón, almacén), expositor con la captura real y cartel colgado por proyecto, jardín del laboratorio con placas | `living` (las cuatro fichas con su enlace real) |
| Vegetación por máscaras: bosquetes y claros, corredores despejados junto a los caminos, césped corto en los bordes | capturas aéreas |
| Farolas nuevas (poste curvo, farol colgante) en toda la isla; interfaz superior más discreta | capturas |
| **Contacto**: estación de comunicaciones (casa con mástil, antena de celosía que gira, plataforma) y tres aparatos distintos —terminal de LinkedIn, ordenador de GitHub, buzón de correo con bandera— que se encienden al acercarse; el correo se abre y se copia | `living` (los tres enlaces) |
| **Sobre mí**: casa del árbol con plataforma, barandilla y escalera; la información se abre en panel legible con las áreas de trabajo, no en una pizarra 3D | `living` |
| Carteles de madera con letra crema en la aldea, el laboratorio, Contacto y Sobre mí (fuera las placas negras) | capturas `capturas/6-zonas/` |
| **Carga**: pantalla del astronauta sentado en el HTML (se pinta a los 16 ms), porcentaje por etapas reales, bienvenida primero y planeta por partes; terreno 30 veces más rápido de calcular. Sin botón «sin jugar». Precalentamiento real antes de habilitar la entrada: tras pulsar no se compila nada ni se salta ningún fotograma | `docs/RENDIMIENTO.md`, `tests/perf/load.mjs`, `tests/perf/entrada.mjs` |
| Cascada con canal de roca mojada y almohadas de espuma | capturas |
| **Cámara cercana** (12-11-2026): 39° de inclinación, el astronauta ocupa ~17 % del alto; zoom con rueda y pellizco entre 0,72× y 1,9×; sin viñeta. Tras un salto de sitio se coloca sin barrido | `camera` 14; `capturas/8-camara/` |
| **Oclusión**: árboles, rocas y casas de la aldea se vuelven translúcidos (tramado) alrededor del astronauta cuando lo tapan (`experience/environment/seeThrough.js`) | capturas `capturas/8-camara/pruebas/oclusion-*` |
| **Postes indicadores de madera** (NAVE, CV, BALONCESTO, FÚTBOL, OBSERVATORIO) con la letra del título; fuera todos los rótulos negros del suelo. Con colisión (`SIGNPOSTS` en `layout.js`) | `camera`; capturas |
| **Indicación «E»** clara, una sola, y solo de lo que cae dentro de la pantalla | `camera` |
| **Aldea**: parcelas sin simetría; la captura de cada proyecto va en un escaparate adosado a la casa con su único rótulo de madera encima; fuera expositores y carteles colgados | `living` (las cuatro fichas); capturas |
| **Caminos**: adoquines pequeños e irregulares en tramos (también en la plaza), borde de tierra fundido con la hierba, césped corto junto a caminos y a lo construido | capturas |
| **Pistas** (solo aspecto): bordillo de piedra (baloncesto) y de madera (fútbol), zona en terracota, postes en madera, portería separada del borde | capturas |
| **Cohete** torneado en crema y naranja, con aletas que se apoyan en la plataforma | capturas |
| **Woody habla** con un bocadillo 3D (crema, letra del título, rebote elástico, siempre de cara a la cámara y apartado del astronauta): bienvenida en 4 bocadillos al aterrizar la primera vez, una frase la primera vez en cada zona, y frases de guía. Se pasa con E o con un clic y no bloquea el movimiento | `woody` 37; `capturas/9-woody/` |
| **Woody se comporta**: trota a tu paso y corre si corres, sin patinar (clip a velocidad real / velocidad del clip); olfatea y se sienta a los ~3 s, se tumba a los ~10 s y se levanta al moverte; mira al astronauta al hablar; pegado al terreno en rampa y puente (error < 6 cm) con cabeceo según la pendiente | `woody`, `characters` |
| **Guía**: el menú de Woody (cinco opciones) y los cuatro botones del menú superior hacen que vaya delante, espere si te paras o te quedas atrás y anuncie la llegada | `woody`, `portfolio` |
| **Solo 3D**: sin porfolio legible ni avisos HTML. La indicación «E», los mensajes («¡Despegue!», canasta, correo copiado…) y los logros son tarjetas 3D junto a su objeto (`experience/ui3d/`), montadas desde la carga para que el precalentamiento las compile. Las fichas se abren desde su edificio con la cámara acercándose antes. Sin WebGPU ni WebGL2, solo un aviso con LinkedIn y correo | `portfolio` 19, `camera`, `progress`; medida de `tests/perf/entrada.mjs` (0 huecos tras el clic) |
| **Despegue** (objetivo 4): la nave ya no cambia de escala (antes crecía ×2,1 al subir) y el parche de césped ya no cambia de tamaño con la cámara (era lo que «rompía» la hierba: cada brizna saltaba de sitio); las briznas se recogen al alejarse. Encendido de 1,6 s con vibración, subida con aceleración progresiva, cámara que sigue al cohete y se abre al planeta. Humo facetado con volumen (`experience/Exhaust.jsx`): nace en la tobera, choca con la losa y se abre; naranja junto a la llama y gris al alejarse; polvo a ras de suelo, chispas que rebotan y llamarada sobre la plataforma. El empuje agita la vegetación cercana (`windBlast` en `wind.js`) sin estirarla. Todo montado desde la carga | `rocket` 8; `tests/perf/entrada.mjs`: 0 pipelines en caliente y 0 huecos durante el despegue; `capturas/11-windows/despegue-*` |
| **Objetos apoyados en el terreno** (objetivo 4): todo lo repartido se asienta según el suelo bajo su apoyo (`settle` en `layout.js`): se planta en el punto más bajo para no flotar y solo se retira lo que cae en un talud o un cauce. Las rocas con el pie en el agua asoman siempre | `terrain`: 2.663 objetos en 50 grupos, ninguno flota, hundido ni sumergido; `capturas/11-windows/terreno/` |
| **Tarjeta «E»** discreta (23–32 px de alto según el zoom), sobre su objeto (encima de Woody) y apartada del astronauta si fuera a taparlo. El logro, en vuelo, sale por encima del morro de la nave | `camera` (tres distancias de cámara) |
| **El cohete se vuelve translúcido** alrededor del astronauta cuando lo tapa (mismo tramado que árboles y casas) | `camera`; `capturas/11-windows/oclusion-cohete.jpg` |
| **Fútbol jugable** (objetivo 8): balón con física propia (`game/ballPhysics.js`: gravedad, aire, efecto Magnus, bote, rodadura y choques con cápsulas), red de tela (`game/cloth.js`), portero que lee el tiro y se lanza, barrera de tres maniquíes que saltan, dianas, cuatro modos (penaltis, tiros libres, precisión, contrarreloj), sonidos, celebraciones del astronauta y de Woody, logros («Primer gol», «Al palo», «Especialista», «Dianas») y vitrina del trofeo. Gol, poste, larguero, fuera, alto, corto, parada y barrera salen de la física, no de un guion. `worlds/living/football/` | `football` 59; `capturas/14-futbol/despues/` |
| **Efecto en el chut**: el giro curva el vuelo de verdad (34 cm de flecha en un penalti, más en una falta) y el balón sale abierto hacia el lado contrario para que la curva lo traiga a donde se apunta (`launch` en `match.js`, que prueba el tiro con un balón de ensayo). Una hilera de puntos enseña la trayectoria prevista con la potencia y el efecto de cada momento | `football` (curva a un lado y al otro; cruza a 0,00 m del punto) |
| **Marcador único, el de madera del campo**: en directo (intentos, goles, puntos, quedan/tiempo, último tiro), en dos filas con letra grande; el tablero va por delante de sus postes (eran los que tapaban «INTENTOS» y «QUEDAN»), se aparta de la portería según el lado del tiro y los botones del juego van arriba a la izquierda. Sin marcador 2D | `football` (entero en pantalla desde el penalti y los cinco puntos de falta) |
| **Woody calla durante un minijuego** (`game.minigame`): ni tutorial ni frases de zona; lo que estuviera diciendo se esconde sin caducar y sigue al salir. Su bocadillo es más pequeño (0,25 del alto de pantalla el lienzo entero; antes 0,4) | `football`, `woody` 36 |
| **Luces sin quemar**: los cristales solo emiten (0,7 de día, 1,3 como mucho de noche), caída de luz más suave y luces separadas de postes y fachadas | capturas de noche |

Rendimiento medido en el Mac a 2880 × 1620 sobre WebGPU: 192–221 fps tras el rediseño (224–263 justo antes;  antes de la migración, 187–224). Con el césped nuevo y sin el hueco de visión de los árboles eran 272–362: ese tramado cuesta en torno a una cuarta parte y es lo primero a optimizar si hiciera falta.

## Parcial

- **Logros**: 6 de 21 se pueden conseguir ya (Primeros pasos, Explorador, Primer contacto, Primer enceste, Mejor amigo, Viajero espacial). Los otros 15 salen en la vitrina como «Próximamente»: su disparador llega con su fase. Para activarlos: `ready: true` en `src/achievements/list.js` y su regla en `src/achievements/Tracker.jsx`.
- **Woody, lo que no está comprobado o falta**: la salida de un atasco (rodeo lateral → rodeo por la red de caminos → reaparecer solo fuera de pantalla) está programada pero sin prueba que lo atasque de verdad; faltan en el modelo `Woody_Scratch`, un tumbado despierto (solo hay `Sleep`, con los ojos abiertos) y un clip de hablar; a tu paso de andar va al trote porque `Walk` solo avanza 0,7 m/s; no hay escaleras pisables en el planeta (la de la casa del árbol es decorado); cuando el bocadillo se aparta del astronauta su pico deja de apuntar a Woody.
- **CV**: la descarga está programada en la ficha del atril y junto al botón CV del menú, pero no hay PDF (`CV.file` es `null`): se muestra «pendiente».
- **Oclusión**: es un tramado por píxel, no mezcla alfa; cubre árboles, rocas, casas de la aldea y el cohete, pero no el observatorio, la casa del árbol ni la estación de Contacto. La indicación «E» comprueba que el objeto esté en pantalla, no que no lo tape otra cosa.
- **Pistas**: se mantiene su tamaño (16 × 10,4 m y 19 × 12 m); con la cámara cercana ya no caben enteras en pantalla. Reducirlas toca el juego de baloncesto, no solo el aspecto.
- **Baloncesto**: balón físico, aro, tablero, marcador y sonido. Falta el minijuego (fase 6).
- **Fútbol, lo que no está comprobado o falta**: los controles táctiles (apuntar, cargar y efecto con el dedo) están programados pero sin probar, ni emulados ni en un teléfono; el sonido no se ha escuchado; las pruebas chutan con valores fijos y sin la dispersión aleatoria, así que la dificultad real (portero, potencia) no está afinada a mano; una ronda completa de contrarreloj hasta agotar el tiempo y el final de «Especialista» (3 goles de falta) y «Dianas» (las cinco) no se han jugado enteros; mientras la cámara acompaña al balón en el vuelo, el marcador puede quedar cortado por el borde derecho un instante; el efecto está exagerado a propósito (190 rad/s) para que se vea en 8 m; el portero y la barrera son maniquíes, sin animación de personaje.
- **Cohete**: despega (encendido, humo, subida), queda en órbita y aterriza en el mismo planeta, con sonido. El aterrizaje reutiliza el escape pero no se ha revisado fotograma a fotograma. Falta el planeta esférico, el selector y el viaje (fase 9).
- **Terreno**: la comprobación mide lo que está marcado como apoyado (`rests`). Quedan fuera, a propósito, lo que no pisa el suelo (cielo, agua, puente, cascada, fauna, cristales de farola, rótulos) y las cajas y barriles con física; se listan con `node tests/e2e/terrain.mjs lista`. No detecta un objeto que atraviese a otro objeto (solo contra el terreno y el agua).
- **Máquina de estados y ajustes** (plan, fase 1): no se han hecho `src/game/state.js` ni `settings.js`. Se usa `active` (App), `player.frozen/gesture/hidden` y `ui.open`. No hay todavía panel de ajustes de calidad ni de volumen (solo silenciar).
- **Interfaz que sigue en HTML**: la portada, los botones de arriba (tema, sonido, Woody y su menú, menú de zonas), las fichas largas, la vitrina de logros y los controles táctiles.
- **Pulido del Planeta 1, lo que falta** (ver «Siguiente paso»): caída del río al mar, cascada aún muy blanca vista de cerca, troncos curvados y árboles protagonistas, modelo de luz con sombras teñidas, acabado de cabañas/puente/farolas, vida ambiental nueva (hojas, humo, libélulas, ranas).
- **Variación espacial del viento**: está en el sombreador (ruido por posición) y se ve en las capturas, pero la prueba automática solo demuestra que hay movimiento y que la ráfaga avanza; no mide que dos zonas se muevan distinto.
- **Ondas al vadear**: salen también bajo el puente cuando se cruza por encima.
- **Agua y partículas, lo que queda**: los peces y las mariposas son de código (no había GLB en `assets-externos/`); las salpicaduras de la cascada siguen moviéndose por CPU (46 gotas); el arroyo de la meseta comparte material con la cascada y no tiene espuma propia en las orillas; las ondas del agua se ven algo quebradas muy de cerca (la textura de ruido es de 128 px).
- **Sonido**: muestras grabadas integradas (objetivo 16, bloque 0) y señal medida en la prueba; **no se ha escuchado** por una persona. Volúmenes y mezcla pendientes de oído humano. Siguen sintetizados: pasos fuera de la hierba, salto, baloncesto (bote, aro, red), chut, ladrido, logros.
- **Móvil**: probado con emulación táctil (horizontal y vertical). **No probado en un teléfono real.**

## Pendiente

- Fase 6 — Baloncesto: tiro apuntado con carga, línea de tres, red que reacciona, maniquíes defensores con dificultad, modos, celebraciones.
- Fase 8 — Casa con sofá, gimnasio, biblioteca con pasadizo, habitación personal, tocadiscos.
- Fase 9 — Cohete: embarque, planeta esférico, selector de tres planetas, viaje y aterrizaje.
- Fase 10 — Planeta 2, The Twisted Moon.
- Fase 11 — Planeta 3, The Cosmic Lab, sobre `src/worlds/cosmic/` (hoy es el planeta naranja antiguo, accesible solo con `?world=cosmic`).
- Fase 12 — Pulido, accesibilidad, ajustes, QA.

## Falta por aportar (no se inventa)

| Qué | Dónde se pone | Mientras tanto |
|---|---|---|
| CV en PDF | `public/cv/…pdf` y su ruta en `src/content/cv.js` | La ficha del atril dice «pendiente»; al ponerlo aparecen solos la descarga del atril y la del menú |
| Dosia: descripción, capturas, enlaces | `src/content/dosia.js` (`ready: true`) | No aparece en ningún sitio |
| Música con licencia | (fase 8) | El tocadiscos no existe aún |
| Fotos para el avatar | (fase 8) | Se usará un avatar neutro |
| Clip `Woody_Scratch` | `woody.glb` | No se usa |
| Permiso para borrar `public/modelos` (200 MB), el kit Sci-Fi y su `.zip` | — | Solo ignorados en git |

## Incidencias conocidas

- **Resuelto el 14-11-2026 — en Windows no se dibujaba el 3D** (solo texto y flecha en la bienvenida; `setPipeline … is not of type GPURenderPipeline`). Causa: el precalentamiento crea los pipelines en asíncrono (`compileAsync`) y three r183 los apunta en caché antes de que existan en la GPU; la estela de la estrella fugaz (oculta al compilar, visible ~1,2 s después) se dibujaba con el suyo aún pendiente, la excepción cortaba el dibujado a medias y el renderer quedaba con `_callDepth` descolocado para siempre. En Metal el pipeline llega antes del siguiente fotograma; en Direct3D, no. Arreglo: `skipUnbuiltPipelines` en `Experience.jsx` (un objeto no se dibuja mientras su pipeline no exista; entra solo cuando llega). Prueba: `node tests/e2e/errors.mjs` (sin ventana; `con-ventana` como argumento abre una; la primera de `npm run e2e`), y toda prueba de `common.mjs` da FALLO ante cualquier excepción de página. Capturas: `capturas/21-windows-pipeline/`.

- `woody.mjs` falló una vez de tres en «y la baja contigo» (Woody se quedó arriba de la rampa, y=0,8, con el astronauta ya abajo). Sin tocar a Woody en ese commit. Para el bloque 3 del objetivo 16.

- **Windows, al entrar al planeta**: dos huecos de ~95 y ~125 ms justo tras el clic (en el Mac eran 0). No es compilación (0 pipelines en caliente) y ya ocurre con el commit anterior; causa sin identificar. Medido en desarrollo, no en la build de producción.
- Los 113–117 fps que da `living.mjs fps` en este equipo Windows no son comparables con las cifras del Mac (otra máquina y otra GPU).
- `life.mjs` fallaba a ratos en «y todo vuelve a la calma»: era la ráfaga floja (0,6) que el bosque lanza solo de vez en cuando, que coincidía con la comprobación. La prueba ya la distingue de la del carillón.
- Una pasada de `progress.mjs` falló una vez en las caricias a Woody y no se ha vuelto a reproducir en cinco pasadas seguidas. Causa sin identificar.
- El paquete principal pesa 1,36 MB (413 kB comprimido); Vite avisa. Trocearlo queda para la fase 12.
- En el planeta antiguo (`cosmic`) los pasos suenan siempre a camino y no hay sonido de agua.

## Siguiente paso exacto

Plan en curso (aprobado el 12-11-2026), fases A–F. Hecho: **A** (carga y pantalla del astronauta) y, de la **C**, Contacto y Sobre mí. Lo que sigue, en orden:

1. **Fase E — Fútbol real**: hecho (objetivo 8). Queda probarlo con el dedo y afinar la dificultad jugando.
2. **Fase B — Estándar con Blender**: canal `tools/blender/*.py` → `public/models/living/*.glb`; árbol de bienvenida con copas más finas, una cabaña de máxima calidad, farola definitiva. Aún no se ha usado Blender: todo sigue saliendo del kit de código.
3. **Fase C, lo que falta**: proyectos como instalaciones distintas según el proyecto (hoy son cuatro casas distintas, todas «casa + escaparate»); cámara que se acerca al abrir una ficha; atril del CV y plataforma del cohete siguen de bloque; placas de los tótems del laboratorio con letra muy pequeña para la cámara nueva.
4. **Fase D**: observatorio (más segmentos, uniones, telescopio alineado, colisiones de escalones), árboles con masas menores, agua sin el dibujo de celdas tan evidente, cascada menos blanca.
5. **Baloncesto**: comprobar contra el encargo (apuntado con carga, triples, barrera, celebraciones); hoy es coger y tirar con marcador.
6. **Fase F**: las 12 capturas, tabla de rendimiento, pruebas nuevas, respaldo WebGL2.

De la fase A queda: trocear el bundle (1,85 MB), construir el planeta en un Web Worker y que el astronauta de la pantalla de carga sea el modelo 3D cuando ya esté descargado (hoy es una ilustración SVG animada; la pose sentada con el GLB no se usa aún).

Después, lo aparcado del encargo original: interiores, cohete y órbita, planetas 2 y 3.
