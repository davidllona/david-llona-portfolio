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
| «Small Country House with Green Roof and Fireplace» (stdgaris) | `small-country-house-…/cottage house.blend` | 142.176 | `public/models/living/buildings/casa-campo.glb` (≈5.200 triángulos, 91 kB) | Casa del proyecto 1 | **en uso** (objetivo 18) |
| «Small House with Red Roof and Chimney» (stdgaris) | `small-house-with-red-roof-…/red house.blend` | 92.186 | `public/models/living/buildings/casa-roja.glb` (≈5.200, 85 kB) | Casa del proyecto 3 | **en uso** (objetivo 18) |
| «Small House with Blue Roof» (stdgaris) | `small-house-with-blue-roof/forest house.blend` | 142.378 | `public/models/living/buildings/casa-bosque.glb` (≈5.200, 85 kB) | Casa del proyecto 2 | **en uso** (objetivo 18) |
| «Compact Residence with Dual Contemporary Balconies» (stdgaris) | `compact-residence-…/red and blue house.blend` | 96.652 | `public/models/living/buildings/casa-balcones.glb` (≈5.200, 85 kB) | Casa del proyecto 4 | **en uso** (objetivo 18) |
| «Island Cabin with Outdoor Seating» (stdgaris) | `island-cabin-…/japanese house.blend` | 543.738 | `public/models/living/buildings/casa-te.glb` (≈5.200, 94 kB) | Casa de té del jardín japonés | **en uso** (objetivo 18) |
| «Torii Gate» (mrfauzi) | `torii-gate/Torii Gate.blend` (+ fbx, obj) | 24.286 | `public/models/living/buildings/torii.glb` (≈1.200, 22 kB) | Entrada del jardín japonés | **en uso** (objetivo 18) |
| «Basketball 3D Icons» (twinstd) | `basketball-3d-icons/05_Basketball.glb` (+ blend, obj) | 108.332 | `public/models/living/court/canasta.glb` (2.200, 72 kB) | Canasta de la pista, con la red aparte | **en uso** (objetivo 18) |
| «Court Net» (spacepixelcreative) | `court-net/Pickleball Net.glb` | — | — | Ninguno | **no se usa**: es una red de pickleball; la valla de la pista se hace a mano |
| «World Cup Trophy Football» (adimaskur48) | `world-cup-trophy-football/World Cup Trophy.glb` (+ blend, fbx, obj) | 228.848 | `public/models/living/buildings/trofeo.glb` (4.498, 60 kB) | Trofeo del templete del campo de fútbol | **en uso** (objetivo 18) |
| «Cartoon treehouse with ladder access» (permadicreative) | `cartoon-treehouse-…/Treehouse.glb` (+ fbx, obj) | 229.138 | `public/models/living/buildings/casa-arbol.glb` (7.000, 231 kB) | Casa del árbol de Sobre mí | **en uso** (objetivo 18) |
| «Small observatory with telescope dome» (kerismaker) | `small-observatory-…/OBSERVATORY.glb` (+ blend) | 32.208 | `public/models/living/buildings/observatorio.glb` (5.999, 150 kB) | Edificio del observatorio | **en uso** (objetivo 18) |
| «Orange and White Koi» (TurboSquid) | `orange-and-white-koi/[BLEND] koi_fish/koi_fish.blend` (+ fbx, obj) | 8.224 | `public/models/living/buildings/koi.glb` (≈420, 7 kB) | Kois del estanque del jardín, solo la forma | **en uso** (objetivo 18) |
| «Stylized Arched Road Bridge with Railings» (TurboSquid) | `stylized-arched-road-bridge-…/[BLEND] road_bridge/road_bridge.blend` (+ fbx, obj) | 160.272 | — | Ninguno | **no se usa** (objetivo 19): es un puente de carretera con bolardos y sin barandillas; el puente del jardín va hecho a mano |
| «Japan Lamp» (nixxdsgn) | `japan-lamp/Lamp.glb` (+ obj) | 148.248 | `public/models/living/buildings/farol-japones.glb` (≈900, 12 kB) | Faroles del jardín | **en uso** (objetivo 18) |

Añadido el 14-11-2026 (objetivo 18): «Animated Bluebird with Feathery Wings», `animated-bluebird-with-feathery-wings/` (ZIP de 123 MB: `.blend`, FBX por animación, OBJ y texturas de 4K). 3.642 caras, esqueleto de 354 huesos, 11 animaciones. **En uso**: los pájaros del planeta (`public/models/living/fauna/pajaro.glb`, 720 triángulos, 74 kB; `tools/assets/bird.py`).

En uso desde el objetivo 18, apartado 5: «Basketball 3D Icons» (`basketball-3d-icons/05_Basketball.glb`) es la canasta de la pista (`public/models/living/court/canasta.glb`, 2.200 triángulos; `tools/assets/hoop.py`). Sonidos de baloncesto: no hay recurso; siguen sintetizados.

En uso desde el objetivo 18, apartado 7 (`public/models/living/buildings/`, `tools/assets/buildings.py`): las cuatro casas de stdgaris de los proyectos, «Cartoon treehouse with ladder access», «Small observatory with telescope dome» y «World Cup Trophy Football». Triángulos finales, en `docs/ESTADO.md` (apartado 7).

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

## Mundo 2 · The Twisted Moon (objetivo 21)

Originales en `assets-externos/mundo2/` (fuera de git). Conversión de modelos: `tools/assets/twisted.py`.

| Recurso | Archivo origen | Triángulos | Optimizado en el repo | Dónde se usa | Estado |
|---|---|---|---|---|---|
| «Big ben landmark clock tower» (slabdsgn) | `big-ben-landmark-clock-tower/1.gltf` (+ blend) | 116.080 (114.424 sin las agujas) | `public/models/twisted/torre.glb` (7.600, 127 kB) | Torre del reloj, en la cima | **retirado** (objetivo 22): la torre es ahora propia, de piedra, hecha a mano (`tower.js`); `torre.glb` ya no está en `public/` |
| «Stylized Treehouse Cottage» (TurboSquid) | `stylized-treehouse-cottage/[FBX] House FBX/House FBX.FBX` (+ obj, texturas) | 6.001 (5.245 sin la peana) | `public/models/twisted/casa-tronco.glb` (3.600, 100 kB) | Casa sobre tronco: «Sobre mí» | **en uso** (C1), sin pulir: colores leídos de su textura, cara a cara |
| «Whimsical Toon Cottage with Stone Roof» (TurboSquid) | `whimsical-toon-cottage-…/[BLEND] cartoon_house_v2/cartoon_house_v2.blend` (el FBX viene en texto y Blender no lo lee) | 13.760 (54.320 con sus modificadores) | `public/models/twisted/casita.glb` (5.000, 103 kB) | Casita de abajo | **en uso** (C2): pintada a mano en la conversión (pizarra morada, piedra clara, carpintería oscura, ventanas encendidas), sin su textura |
| «Greenhouse» (spacepixelcreative) | `greenhouse/Green House.glb` (+ blend, obj, png) | 102.396 en 44 piezas | — | — | **no se usa** (C2): probado a 5.000 triángulos, es una caja de cristal opaco sin plantas y en una sola malla de colores planos su cristal no puede ser translúcido. El invernadero del juego es el hecho a mano |
| «Stylized Fern Plant» (TurboSquid) | `stylized-fern-plant/[BLEND] carton_fern/carton_fern.blend` | 6.336 | `public/models/twisted/helecho.glb` (1.400, 41 kB) | Helechos (90, con instancias, teñidos por copia) | **en uso** (C2): las hojitas son geometría, no tarjetas; sirve con colores planos |
| «Mysterious Fairy Tale Waltz» (ereymusic) | `mysterious-fairy-tale-waltz/*.wav` (97 s) | — | `public/sounds/twisted/musica-1.mp3` (bucle de 95 s, estéreo, 1.143 kB) | Música del mundo 2, por defecto (`?musica=1`) | **en uso** (C3) |
| «Curious Mystery Box» (SCOREWIZARDS) | `curious-mystery-box/*_loop.wav` (162 s; la versión en bucle, con melodía) | — | `musica-2.mp3` (bucle de 159 s, 1.913 kB) | `?musica=2` | **en uso** (C3) |
| «Quirky Music Box» (AudioAgent) | `quirky-music-box/…/Quirky Music Box.wav` (210 s; no trae bucle con melodía: la entera) | — | `musica-3.mp3` (bucle de 208 s, 2.493 kB) | `?musica=3` | **en uso** (C3) |
| «Crickets Night Ambience Loop» (OhmLab) | `crickets-night-ambience-loop/…/*.wav` (337 s) | — | `grillos-noche.mp3` (bucle de 22 s, mono, 182 kB) | Grillos de fondo del mundo 2 | **en uso** (C3) |
| «Classic Clock Tower Chime» (HollywoodEdge) | `classic-clock-tower-chime/*.wav` (62 s) | — | `campanada.mp3` (la primera, con 4,2 s de resonancia; 43 kB) | Campanadas de la torre | **en uso** (C3) |
| «Magic Sparkle Twinkle Shimmer» (AetherFX) | `magic-sparkle-twinkle-shimmer/…/*.wav` (cuatro) | — | `destello-1…4.mp3` (2 s, 21 kB cada uno) | Destello al usar algo y junto a setas y luciérnagas | **en uso** (C3) |
| «Wooden Bridge Footsteps» (FxProSound) | `wooden-bridge-footsteps/03447 wooden stairs climbing.wav` (12 s, 20 golpes regulares) | — | `pasos-madera.mp3` (diez pasos, uno por casilla de 0,6 s; 61 kB) | Pasos en puentes y pasarelas | **en uso** (C3); **pendiente del oído de David** |
| «Owl Hoot 1» (HollywoodEdge) | `owl-hoot-1/*.wav` (7 s) | — | `buho.mp3` (3,75 s, 31 kB) | Búho lejano, cada 25–60 s | **en uso** (C3) |
