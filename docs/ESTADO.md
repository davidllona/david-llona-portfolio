# Estado del universo de tres planetas

Actualizado: 15 de noviembre de 2026 · rama `estacion-espacial`.

Encargo completo: `Porfolio_3D_David_Llona/01_PROMPTS/03_CLAUDE_CODE_PORFOLIO_3D_COMPLETO.txt` (carpeta fuera de git). Texto íntegro del objetivo 16: `docs/OBJETIVO-16.md`.
**En curso: objetivo 16 — todo lo que falta para cerrar el mundo 1** (nueve bloques, 0–8; cada uno con commit, capturas, informe de tres listas y parada hasta el visto bueno). **Sustituye a los bloques 3–6 del objetivo 15.** Bloques 0 (inventario y sonidos), 1 (pantalla de carga) y 2 (pantalla previa al aterrizaje): **hechos y aprobados** (13-11-2026). **En curso: bloque 3** (errores de juego), a medias: ver su fila y «Bloque 3, lo que queda».
**En curso: objetivo 19 — pulido final del mundo 1** (`docs/OBJETIVO-19.md`): los cuatro bloques (A, B, C y D) están hechos. David pidió rehacer la vista de planeta del bloque D («el planeta es la isla»): **retoque hecho, pendiente de su visto bueno** (ver «Retoque del bloque D»). Ver «Objetivo 19».
**Objetivo 18 — pulido del mundo 1** (`docs/OBJETIVO-18.md`, 14-11-2026). **Sustituye a los bloques 4 a 7 del objetivo 16.** Ocho apartados, commit y push por apartado; paradas solo tras el 4 y tras el 8. **Los ocho están hechos: parada del apartado 8, pendiente del visto bueno de David** (batería completa y capturas en «Parada del apartado 8»). Ver «Objetivo 18».
Decidido por David el 13-11-2026: los pesos reales de los modelos mandan sobre la ficha (reducir «Japan Lamp», puente, observatorio y cabaña hasta que no bajen los fps y dar el número final de triángulos de cada uno); los pasos fuera de la hierba y los sonidos de baloncesto se quedan sintetizados hasta que él avise.
Inventario de recursos descargados y su estado: `docs/RECURSOS.md`.
Árboles de slabdsgn: aceptados (13-11-2026, commit `4e53c5e`). Objetivo 8 (fútbol jugable) cerrado.
Blender: no está en el PATH del Mac; se llama con `/Applications/Blender.app/Contents/MacOS/Blender -b` (5.0.1). No hay ffmpeg: el audio también se convierte con Blender.

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
- Pruebas: `rocket` 26, `errors` 8, `living` 46, `camera` 30, `woody` 37 (una pasada de tres falló «y la baja contigo», en la rampa; no se repitió), `entrada.mjs` (0 pipelines en caliente al entrar y al despegar). **No se ha pasado la batería completa** tras este retoque.
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
npm run e2e                    # 333 comprobaciones en Chrome sin ventana (con el servidor encendido)
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

Atajos de desarrollo: `?world=cosmic` abre el planeta antiguo; `?webgl=0` simula un navegador sin GPU (solo sale un aviso con LinkedIn y correo); `?backend=webgl` fuerza el respaldo WebGL2.

**Textos de Woody**: `src/content/woody.js` (bienvenida, una frase por zona, menú y frases de guía). Se editan ahí, sin tocar código.

**Fútbol**: E junto al campo para entrar. Se apunta con el ratón (o el dedo) sobre la portería, se mantiene pulsado para cargar, se mueve de lado mientras se carga para dar efecto y se suelta para chutar (Espacio también carga; A/D dan efecto). 1–4 cambian de modo, B pone o quita la barrera, R reinicia, Esc sale.

Controles: WASD o flechas, Espacio saltar, Shift correr, E usar, G menú de Woody, N día/noche, M sonido, Esc pausa. Con el ratón se hace clic en los objetos; la rueda (o el pellizco en móvil) acerca y aleja la cámara.

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
