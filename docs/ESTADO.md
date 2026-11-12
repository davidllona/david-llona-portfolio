# Estado del universo de tres planetas

Actualizado: 12 de noviembre de 2026 · rama `estacion-espacial` (solo commits locales, sin push).

Encargo completo: `Porfolio_3D_David_Llona/01_PROMPTS/03_CLAUDE_CODE_PORFOLIO_3D_COMPLETO.txt` (carpeta fuera de git).
Último objetivo cerrado: **objetivo 4 — cohete y errores de terreno** (12-11-2026, terminado en Windows). El proyecto se trabaja ahora en Windows además de en Mac (ver «Windows» más abajo).
Trabajo en curso: **revisión definitiva de The Living World** (fases A–F del plan del 12-11-2026: carga, estándar artístico, zonas, observatorio y naturaleza, fútbol, validación). Etiqueta de retorno: `antes-revision-definitiva`. Antes: **rediseño artístico de The Living World** (solo el Planeta 1): primero se valida un estándar en la bienvenida y la aldea de proyectos; después se extiende al resto. Modelos propios (kit de código; Blender si hace falta), nada de packs de terceros. Punto de retorno anterior: etiqueta `antes-rediseno-artistico`.

## Cómo arrancarlo y probarlo

```
npm run dev -- --port 5199     # http://localhost:5199
npm run e2e                    # 188 comprobaciones en Chrome sin ventana (con el servidor encendido)
node tests/e2e/woody.mjs       # bocadillos, ritmo, descanso, cuestas y ruta guiada (incluida en e2e)
node tests/e2e/camera.mjs      # cámara, zoom, tarjeta «E», postes y oclusión, cohete incluido (incluida en e2e)
node tests/e2e/rocket.mjs      # despegue: escala, empuje, cámara, aceleración; saca la serie de fotogramas (incluida en e2e)
node tests/e2e/terrain.mjs     # objetos que flotan, hundidos o bajo el agua (incluida en e2e); «lista» y «capturas» como argumento
node tests/perf/entrada.mjs    # tirones y pipelines compilados en caliente al entrar y al despegar
node tests/e2e/living.mjs fps  # además mide fps a 2880 × 1620 sin límite
node tests/e2e/motion.mjs      # viento, ráfaga y rastro en la hierba; guarda fotogramas
node tests/e2e/look.mjs tests/e2e/views.json   # las 12 vistas fijas, de día y de noche
```

**Windows**: las pruebas buscan Chrome solas en Mac, Windows y Linux (`tests/chrome.mjs`; la variable `CHROME` manda) y lanzan WebGPU sobre Direct3D. Las capturas van a la carpeta temporal salvo que se indique `E2E_SHOTS`. Git: `.gitattributes` fija LF en todo el texto y marca los binarios; en la copia de Windows, `core.autocrlf=false` y `core.filemode=false` (los `.glb` «modificados» tras copiar desde el Mac eran solo el bit de permisos).

Atajos de desarrollo: `?world=cosmic` abre el planeta antiguo; `?webgl=0` simula un navegador sin GPU (solo sale un aviso con LinkedIn y correo); `?backend=webgl` fuerza el respaldo WebGL2.

**Textos de Woody**: `src/content/woody.js` (bienvenida, una frase por zona, menú y frases de guía). Se editan ahí, sin tocar código.

Controles: WASD o flechas, Espacio saltar, Shift correr, E usar, G menú de Woody, N día/noche, M sonido, Esc pausa. Con el ratón se hace clic en los objetos; la rueda (o el pellizco en móvil) acerca y aleja la cámara.

Capturas de comparación (fuera de git), mismas 12 vistas de día y de noche: `capturas/0-antes/` (antes del pulido), `capturas/1-webgpu/` (tras la migración) y `capturas/4-rediseno/` (ahora). Además: `capturas/2-bienvenida/` (portada en escritorio y móvil, y el descenso), `capturas/3-aldea/` y `capturas/movimiento/`.

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
| Agua: oleaje facetado, bandas de profundidad, espuma irregular, corriente, rocas que asoman, ondas al vadear; cascada por láminas con bruma; arroyo con cauce | capturas |
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
| **Luces sin quemar**: los cristales solo emiten (0,7 de día, 1,3 como mucho de noche), caída de luz más suave y luces separadas de postes y fachadas | capturas de noche |

Rendimiento medido en el Mac a 2880 × 1620 sobre WebGPU: 192–221 fps tras el rediseño (224–263 justo antes;  antes de la migración, 187–224). Con el césped nuevo y sin el hueco de visión de los árboles eran 272–362: ese tramado cuesta en torno a una cuarta parte y es lo primero a optimizar si hiciera falta.

## Parcial

- **Logros**: 6 de 21 se pueden conseguir ya (Primeros pasos, Explorador, Primer contacto, Primer enceste, Mejor amigo, Viajero espacial). Los otros 15 salen en la vitrina como «Próximamente»: su disparador llega con su fase. Para activarlos: `ready: true` en `src/achievements/list.js` y su regla en `src/achievements/Tracker.jsx`.
- **Woody, lo que no está comprobado o falta**: la salida de un atasco (rodeo lateral → rodeo por la red de caminos → reaparecer solo fuera de pantalla) está programada pero sin prueba que lo atasque de verdad; faltan en el modelo `Woody_Scratch`, un tumbado despierto (solo hay `Sleep`, con los ojos abiertos) y un clip de hablar; a tu paso de andar va al trote porque `Walk` solo avanza 0,7 m/s; no hay escaleras pisables en el planeta (la de la casa del árbol es decorado); cuando el bocadillo se aparta del astronauta su pico deja de apuntar a Woody.
- **CV**: la descarga está programada en la ficha del atril y junto al botón CV del menú, pero no hay PDF (`CV.file` es `null`): se muestra «pendiente».
- **Oclusión**: es un tramado por píxel, no mezcla alfa; cubre árboles, rocas, casas de la aldea y el cohete, pero no el observatorio, la casa del árbol ni la estación de Contacto. La indicación «E» comprueba que el objeto esté en pantalla, no que no lo tape otra cosa.
- **Pistas**: se mantiene su tamaño (16 × 10,4 m y 19 × 12 m); con la cámara cercana ya no caben enteras en pantalla. Reducirlas toca el juego de baloncesto, no solo el aspecto.
- **Baloncesto**: balón físico, aro, tablero, marcador y sonido. Falta el minijuego (fase 6).
- **Fútbol**: solo el campo y la portería como escenario (fase 7).
- **Cohete**: despega (encendido, humo, subida), queda en órbita y aterriza en el mismo planeta, con sonido. El aterrizaje reutiliza el escape pero no se ha revisado fotograma a fotograma. Falta el planeta esférico, el selector y el viaje (fase 9).
- **Terreno**: la comprobación mide lo que está marcado como apoyado (`rests`). Quedan fuera, a propósito, lo que no pisa el suelo (cielo, agua, puente, cascada, fauna, cristales de farola, rótulos) y las cajas y barriles con física; se listan con `node tests/e2e/terrain.mjs lista`. No detecta un objeto que atraviese a otro objeto (solo contra el terreno y el agua).
- **Máquina de estados y ajustes** (plan, fase 1): no se han hecho `src/game/state.js` ni `settings.js`. Se usa `active` (App), `player.frozen/gesture/hidden` y `ui.open`. No hay todavía panel de ajustes de calidad ni de volumen (solo silenciar).
- **Interfaz que sigue en HTML**: la portada, los botones de arriba (tema, sonido, Woody y su menú, menú de zonas), las fichas largas, la vitrina de logros y los controles táctiles.
- **Pulido del Planeta 1, lo que falta** (ver «Siguiente paso»): caída del río al mar, cascada aún muy blanca vista de cerca, troncos curvados y árboles protagonistas, modelo de luz con sombras teñidas, acabado de cabañas/puente/farolas, vida ambiental nueva (hojas, humo, libélulas, ranas).
- **Variación espacial del viento**: está en el sombreador (ruido por posición) y se ve en las capturas, pero la prueba automática solo demuestra que hay movimiento y que la ráfaga avanza; no mide que dos zonas se muevan distinto.
- **Ondas al vadear**: salen también bajo el puente cuando se cruza por encima.
- **Sonido**: comprobado que cada acción pide su sonido y que el contexto arranca; **no se ha escuchado** (las pruebas son sin altavoces). Volúmenes y timbres pendientes de oído humano.
- **Móvil**: probado con emulación táctil (horizontal y vertical). **No probado en un teléfono real.**

## Pendiente

- Fase 6 — Baloncesto: tiro apuntado con carga, línea de tres, red que reacciona, maniquíes defensores con dificultad, modos, celebraciones.
- Fase 7 — Fútbol: chute, postes, gol por línea, barrera, dianas, vitrina 2010.
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

- **Windows, al entrar al planeta**: dos huecos de ~95 y ~125 ms justo tras el clic (en el Mac eran 0). No es compilación (0 pipelines en caliente) y ya ocurre con el commit anterior; causa sin identificar. Medido en desarrollo, no en la build de producción.
- Los 113–117 fps que da `living.mjs fps` en este equipo Windows no son comparables con las cifras del Mac (otra máquina y otra GPU).
- Una pasada de `progress.mjs` falló una vez en las caricias a Woody y no se ha vuelto a reproducir en cinco pasadas seguidas. Causa sin identificar.
- El paquete principal pesa 1,36 MB (413 kB comprimido); Vite avisa. Trocearlo queda para la fase 12.
- En el planeta antiguo (`cosmic`) los pasos suenan siempre a camino y no hay sonido de agua.

## Siguiente paso exacto

Plan en curso (aprobado el 12-11-2026), fases A–F. Hecho: **A** (carga y pantalla del astronauta) y, de la **C**, Contacto y Sobre mí. Lo que sigue, en orden:

1. **Fase E — Fútbol real** (lo más reclamado y aún sin empezar): `src/game/ballPhysics.js` extraído de `worlds/living/Court.jsx`; `worlds/living/Football.jsx` con apuntado y carga, salida del balón en `kick_impact`, gol por cruce de línea, postes y larguero, red, barrera de maniquíes, tres modos, marcador, sonidos, Woody, logros y vitrina 2010. Hoy solo existe el campo y la portería como decorado (`Pitch` en `Zones.jsx`).
2. **Fase B — Estándar con Blender**: canal `tools/blender/*.py` → `public/models/living/*.glb`; árbol de bienvenida con copas más finas, una cabaña de máxima calidad, farola definitiva. Aún no se ha usado Blender: todo sigue saliendo del kit de código.
3. **Fase C, lo que falta**: proyectos como instalaciones distintas según el proyecto (hoy son cuatro casas distintas, todas «casa + escaparate»); cámara que se acerca al abrir una ficha; atril del CV y plataforma del cohete siguen de bloque; placas de los tótems del laboratorio con letra muy pequeña para la cámara nueva.
4. **Fase D**: observatorio (más segmentos, uniones, telescopio alineado, colisiones de escalones), árboles con masas menores, agua sin el dibujo de celdas tan evidente, cascada menos blanca.
5. **Baloncesto**: comprobar contra el encargo (apuntado con carga, triples, barrera, celebraciones); hoy es coger y tirar con marcador.
6. **Fase F**: las 12 capturas, tabla de rendimiento, pruebas nuevas, respaldo WebGL2.

De la fase A queda: trocear el bundle (1,85 MB), construir el planeta en un Web Worker y que el astronauta de la pantalla de carga sea el modelo 3D cuando ya esté descargado (hoy es una ilustración SVG animada; la pose sentada con el GLB no se usa aún).

Después, lo aparcado del encargo original: interiores, cohete y órbita, planetas 2 y 3.
