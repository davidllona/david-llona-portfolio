# Recursos descargados (Envato y TurboSquid)

Actualizado: 13 de noviembre de 2026 (objetivo 16, bloque 0).

Los originales están en `assets-externos/` (fuera de git). Al repositorio solo van las versiones optimizadas.
Autor y licencia de cada uno: `docs/CREDITOS.md`. Todos los modelos se han abierto en Blender 5.0.1 para
confirmar que se leen; los triángulos son los que cuenta Blender con los modificadores aplicados (no siempre
coinciden con los «polígonos» de la ficha de la tienda).

## Sonidos — los 12 integrados en este bloque

Se convierten con `tools/assets/sounds.py` (Blender, porque en el Mac no hay ffmpeg) a MP3 en `public/sounds/`
(1,47 MB entre los 14 archivos). Se descargan **después** de entrar al planeta, uno tras otro.

| Recurso | Archivo origen (`assets-externos/sonidos/`) | Optimizado en el repo | Dónde se usa | Estado |
|---|---|---|---|---|
| Cascada | `small-waterfall-loop/26352 Small waterfall loop-full.wav` (101 s, 17,8 MB) | `public/sounds/cascada.mp3` (bucle de 11 s, mono, 118 kB) | Al pie de la cascada; se atenúa con la distancia (mitad a 6,5 m, nada a 34 m) y se oye del lado en que queda | **usado** |
| Arroyo | `stream-water-gentle-flowing-loop/25611 stream water gentle flowing loop-full.wav` (26 s) | `public/sounds/arroyo.mp3` (bucle de 13 s, mono, 138 kB) | El tramo más cercano del río o del arroyo de la meseta (mitad a 3,2 m, nada a 15 m) | **usado** |
| Mar en calma | `calm-sea-waves-loop/26121 Calm sea waves loop-full.wav` (179 s) | `public/sounds/mar.mp3` (bucle de 34 s, mono, 279 kB) | Toda la orilla de la isla (mitad a 5,5 m de la orilla, nada a 24 m) | **usado** |
| Pájaros de bosque | `forest-spring-birds-ambience-loop/30713 Forest spring birds ambience loop-full.wav` (180 s) | `public/sounds/pajaros.mp3` (bucle de 36 s, estéreo, 442 kB) | Ambiente de día en todo el planeta; se funde con los grillos al cambiar | **usado** |
| Grillos | `crickets-at-night-loop/…/OhmLab_Crickets-at-Night-Loop.wav` (258 s) | `public/sounds/grillos.mp3` (bucle de 15 s, mono, 126 kB) | Ambiente de noche | **usado** |
| Chapuzón | `small-water-splash/SplashWater SME02_75.1.wav` | `public/sounds/chapuzon.mp3` (9 kB) | Al entrar en el agua (astronauta y, más flojo, Woody) y al caer en ella de un salto | **usado** |
| Rugido de cohete | `huge-rocket-launch-ignition-rumble/…/AERORckt_Rocket Launch Heavy Rumble Distant.wav` (44 s) | `public/sounds/cohete-rugido.mp3` (13 s, 131 kB) | Despegue, desde el encendido; su final, en el aterrizaje | **usado** |
| Silbido de cohete | `rocket-launch-whoosh/Rocket Launch Whoosh.wav` | `public/sounds/cohete-silbido.mp3` (4,2 s, 43 kB) | Despegue, cuando la nave se levanta (1,6 s tras el encendido) | **usado** |
| Pasos sobre hierba (16) | `footsteps-grass/Footsteps Grass 1…12.wav` y `Footsteps Grass Loop 1…4.wav` | `public/sounds/pasos-hierba.mp3` (las 16 en un archivo, una por casilla de 0,7 s; 135 kB) | Cada pisada sobre hierba, andando y corriendo, sin repetir muestra dos veces seguidas. De las 4 pistas continuas («Loop») se recorta un paso de cada una | **usado** |
| Balón al poste | `soccer-ball-hits-goal-post/Soccer_DIGIH06-39-01.wav` | `public/sounds/poste.mp3` (13 kB) | Fútbol: poste y, más grave, larguero | **usado** |
| Balón a la red | `football-ball-hit-net/Football Ball Hit Net 01…03.wav` | `public/sounds/red-1.mp3`, `red-2.mp3`, `red-3.mp3` (10 kB cada uno) | Fútbol: el balón entra en la red (una de las tres al azar) | **usado** |
| «Pop» de interfaz | `puzzle-game-ui-pop-04/Puzzle_Game_UI_Pop_04.wav` | `public/sounds/pop.mp3` (5 kB) | Cualquier botón o enlace de la interfaz; abrir y cerrar fichas (más agudo y más grave); cambio de día/noche | **usado** |

## Modelos

| Recurso | Archivo origen (`assets-externos/modelos/`) | Triángulos | Optimizado en el repo | Dónde se usa | Estado |
|---|---|---|---|---|---|
| «Small Country House with Green Roof and Fireplace» (stdgaris) | `small-country-house-…/cottage house.blend` | 142.176 | — | Casa de un proyecto (bloque 5) | **no usado** |
| «Small House with Red Roof and Chimney» (stdgaris) | `small-house-with-red-roof-…/red house.blend` | 92.186 | — | Casa de un proyecto (bloque 5) | **no usado** |
| «Small House with Blue Roof» (stdgaris) | `small-house-with-blue-roof/forest house.blend` | 142.378 | — | Casa de un proyecto (bloque 5) | **no usado** |
| «Compact Residence with Dual Contemporary Balconies» (stdgaris) | `compact-residence-…/red and blue house.blend` | 96.652 | — | Casa de un proyecto (bloque 5) | **no usado** |
| «Island Cabin with Outdoor Seating» (stdgaris) | `island-cabin-…/japanese house.blend` | 543.738 | — | Casa de té del jardín japonés (bloque 7) | **no usado** |
| «Torii Gate» (mrfauzi) | `torii-gate/Torii Gate.blend` (+ fbx, obj) | 24.286 | — | Entrada del jardín japonés (bloque 7) | **no usado** |
| «Basketball 3D Icons» (twinstd) | `basketball-3d-icons/05_Basketball.glb` (+ blend, obj) | 108.332 | — | Canasta de la pista (bloque 6) | **no usado** |
| «Court Net» (spacepixelcreative) | `court-net/Pickleball Net.glb` | — | — | Ninguno | **no se usa**: es una red de pickleball; la valla de la pista se hace a mano |
| «World Cup Trophy Football» (adimaskur48) | `world-cup-trophy-football/World Cup Trophy.glb` (+ blend, fbx, obj) | 228.848 | — | Trofeo del templete del campo de fútbol (bloque 5) | **no usado** |
| «Cartoon treehouse with ladder access» (permadicreative) | `cartoon-treehouse-…/Treehouse.glb` (+ fbx, obj) | 229.138 | — | Casa del árbol de Sobre mí (bloque 5) | **no usado** |
| «Small observatory with telescope dome» (kerismaker) | `small-observatory-…/OBSERVATORY.glb` (+ blend) | 32.208 | — | Base del observatorio (bloque 5) | **no usado** |
| «Orange and White Koi» (TurboSquid) | `orange-and-white-koi/[BLEND] koi_fish/koi_fish.blend` (+ fbx, obj) | 8.224 | — | Kois del estanque del jardín, solo la forma (bloque 7) | **no usado** |
| «Stylized Arched Road Bridge with Railings» (TurboSquid) | `stylized-arched-road-bridge-…/[BLEND] road_bridge/road_bridge.blend` (+ fbx, obj) | 160.272 | — | Puente rojo del jardín (bloque 7) | **no usado** |
| «Japan Lamp» (nixxdsgn) | `japan-lamp/Lamp.glb` (+ obj) | 148.248 | — | Faroles del camino del jardín (bloque 7) | **no usado** |

Añadido el 14-11-2026 (objetivo 18): «Animated Bluebird with Feathery Wings», `animated-bluebird-with-feathery-wings/` (ZIP de 123 MB: `.blend`, FBX por animación, OBJ y texturas de 4K). 3.642 caras, esqueleto de 354 huesos, 11 animaciones. **En uso**: los pájaros del planeta (`public/models/living/fauna/pajaro.glb`, 720 triángulos, 74 kB; `tools/assets/bird.py`).

En uso desde el objetivo 18, apartado 5: «Basketball 3D Icons» (`basketball-3d-icons/05_Basketball.glb`) es la canasta de la pista (`public/models/living/court/canasta.glb`, 2.200 triángulos; `tools/assets/hoop.py`). Sonidos de baloncesto: no hay recurso; siguen sintetizados.

Ya en uso desde antes (no están en la lista de este objetivo): los cinco árboles y arbustos de slabdsgn
(`public/models/living/flora/*.glb`).

## Avisos del inventario

- Varios modelos pesan bastante más de lo que dice su ficha: «Japan Lamp» tiene 148.000 triángulos (no 10.000),
  el observatorio 32.000 (no 15.900), el puente 160.000 (no 40.100) y la cabaña de la isla 544.000. Todos se
  abren y se pueden simplificar; solo cambia cuánto hay que reducir.
- Las cinco casas, el torii, la canasta, el trofeo, la casa del árbol, el observatorio y el farol vienen con
  materiales de color liso, sin texturas: se pueden pasar a la paleta del mundo sin perder nada. El koi y el
  puente traen texturas realistas, que no se usarán (color plano, como se pidió).
- No hay sonido de **bote de balón de baloncesto, aro ni red de canasta** entre los recursos: para el bloque 6
  hará falta descargarlos (hoy esos tres son sintetizados).
- Solo hay pasos grabados sobre **hierba**. Sobre camino, piedra, madera, arena y agua los pasos siguen
  siendo los sintetizados.
