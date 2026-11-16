# Créditos técnicos

## folio-2025 — Bruno Simon

Varias técnicas de este proyecto están adaptadas del código fuente del portfolio 2025 de Bruno Simon
(<https://github.com/brunosimon/folio-2025>), publicado bajo licencia MIT. No se usa ninguno de sus modelos,
texturas, sonidos, fuentes ni escenarios: solo ideas de ingeniería, reescritas para este proyecto.

| Técnica | Referencia (`sources/Game/`) | Dónde está aquí |
|---|---|---|
| Campo de viento compartido: dos capas de ruido que se desplazan, reloj integrado | `Wind.js`, `Noises.js` | `src/experience/environment/wind.js` |
| Césped en una sola malla que sigue a la cámara, controlado por una textura de terreno | `World/Grass.js`, `Terrain.js` | `src/worlds/living/flora/Grass.jsx`, `src/worlds/living/terrainData.js` |
| Rastro del jugador que afecta a la hierba | `Tracks.js` | `src/experience/environment/trail.js` |
| Bandas de espuma que siguen la profundidad | `World/WaterSurface.js` | `src/worlds/living/water/Water.jsx` |
| Agua como color liso más una máscara de detalles (ondas, orilla) rota con ruido de textura, en lugar de un patrón de celdas | `World/WaterSurface.js` | `src/worlds/living/water/Water.jsx`, `Waterfall.jsx` |
| Partículas cuyo movimiento se calcula en la GPU a partir de datos por instancia (hojas que caen y derivan con el viento) | `World/Leaves.js` | `src/worlds/living/life/Leaves.jsx`, `src/experience/effects/Bursts.jsx` |

Aviso de la licencia original:

```
MIT License

Copyright (c) 2025 Bruno Simon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Modelos y sonidos de Envato

Descargados por David Llona con su licencia de Envato. Los archivos originales están en `assets-externos/`
(carpeta ignorada en git: no se suben al repositorio). Al repo solo van las versiones optimizadas que usa la web.

### En uso

| Archivo del repo | Original | Autor | Qué se le ha hecho |
|---|---|---|---|
| `public/models/living/flora/frutal.glb` | «Low poly fruit tree asset» | slabdsgn | 27.048 → 2.900 triángulos, una malla, cuantizado + meshopt (`tools/assets/trees.mjs`); color de la paleta del planeta |
| `public/models/living/flora/frondoso.glb` | «Low poly green tree asset» | slabdsgn | 25.056 → 2.720 triángulos; ídem. Es también la base del árbol de la bienvenida (con raíces, masas de copa, lianas y farolillos añadidos por código) |
| `public/models/living/flora/redondo.glb` | «Low poly green tree object» | slabdsgn | 2.306 triángulos (sin reducir); ídem |
| `public/models/living/flora/acacia.glb` | «Low poly umbrella thorn tree» | slabdsgn | 6.870 → 2.975 triángulos; ídem |
| `public/models/living/flora/mata.glb` | «Low poly bush cluster» | slabdsgn | 400 triángulos (sin reducir); ídem |
| `public/models/living/fauna/pajaro.glb` | «Animated Bluebird with Feathery Wings» (Envato; el paquete no trae el nombre del autor) | — | 7.190 → 720 triángulos, sin esqueleto ni texturas: color plano por cara sacado de su textura y cinco posturas (cuatro del vuelo, una posado) como shape keys (`tools/assets/bird.py`) |
| `public/models/living/court/canasta.glb` | «Basketball 3D Icons» (Envato; el paquete no trae el nombre del autor) | — | Sin el balón ni la peana; 107.000 → 2.200 triángulos, dos mallas (canasta y red), color de material pasado a color de vértice (`tools/assets/hoop.py`) |
| `public/models/living/buildings/casa-campo.glb` | «Small country house with green roof and fireplace» | stdgaris | Sin la peana ni los árboles del diorama; → 5.200 triángulos, una malla, color de material pasado a color de vértice (`tools/assets/buildings.py`) |
| `public/models/living/buildings/casa-bosque.glb` | «Small house with blue roof» | stdgaris | Ídem; → 5.200 triángulos |
| `public/models/living/buildings/casa-roja.glb` | «Small house with red roof and chimney» | stdgaris | Ídem; → 5.200 triángulos |
| `public/models/living/buildings/casa-balcones.glb` | «Compact residence with dual contemporary balconies» | stdgaris | Ídem; → 5.200 triángulos |
| `public/models/living/buildings/casa-te.glb` | «Island cabin with outdoor seating» | stdgaris | Ídem; → 5.200 triángulos |
| `public/models/living/buildings/casa-arbol.glb` | «Cartoon treehouse with ladder access» (Envato; el paquete no trae el nombre del autor) | — | Sin el plano de suelo; 229.138 → 7.000 triángulos; ídem |
| `public/models/living/buildings/observatorio.glb` | «Small observatory with telescope dome» (Envato; ídem) | — | 32.208 → 5.999 triángulos; ídem |
| `public/models/living/buildings/trofeo.glb` | «World Cup Trophy Football» (Envato; ídem) | — | 228.848 → 4.498 triángulos; vértices soldados antes de reducir; dorado y verde puestos a mano |
| `public/loader/mundo.webp` (imagen) | «Low poly green tree asset», «Low poly green tree object», «Low poly bush cluster» | slabdsgn | Aparecen renderizados en el planeta de la pantalla de carga (`tools/blender/loader.py`); no se distribuye el modelo, solo la imagen |

### Sonidos (en uso desde el objetivo 16, bloque 0)

Convertidos con `tools/assets/sounds.py` a MP3 recortados en `public/sounds/`. El ZIP de Envato no trae el
nombre del autor salvo donde se indica; la licencia es la de la cuenta de Envato de David Llona.

| Archivo del repo | Original (título en Envato) | Autor | Qué se le ha hecho |
|---|---|---|---|
| `cascada.mp3` | «Small waterfall loop» | no figura en el ZIP | Tramo de 11 s en bucle sin corte, mono |
| `arroyo.mp3` | «Stream water gentle flowing loop» | no figura en el ZIP | Tramo de 13 s en bucle, mono |
| `mar.mp3` | «Calm sea waves loop» | no figura en el ZIP | Tramo de 34 s en bucle, mono |
| `pajaros.mp3` | «Forest spring birds ambience loop» | no figura en el ZIP | Tramo de 36 s en bucle, estéreo |
| `grillos.mp3` | «Crickets at night loop» | OhmLab | Tramo de 15 s en bucle, mono |
| `chapuzon.mp3` | «Small water splash» | no figura en el ZIP | Mono, normalizado |
| `cohete-rugido.mp3` | «Huge rocket launch ignition rumble» (AudioJungle) | no figura en el ZIP | Primeros 13 s con entrada y salida suaves, mono |
| `cohete-silbido.mp3` | «Rocket launch whoosh» | no figura en el ZIP | 4,2 s, mono |
| `pasos-hierba.mp3` | «Footsteps grass» (12 pasos sueltos y 4 pistas continuas) | no figura en el ZIP | Las 16 muestras en un solo archivo; de cada pista continua se recorta un paso |
| `poste.mp3` | «Soccer ball hits goal post» | no figura en el ZIP | 1,2 s, mono |
| `red-1.mp3`, `red-2.mp3`, `red-3.mp3` | «Football ball hit net» | no figura en el ZIP | Mono, normalizados |
| `pop.mp3` | «Puzzle game UI pop 04» | no figura en el ZIP | 0,4 s, mono |

### Descargados, todavía sin usar en la web

El estado de cada uno, al día, está en `docs/RECURSOS.md`.

| Original | Autor | Para qué |
|---|---|---|
| «Basketball 3D Icons» (`05_Basketball`) | twinstd | Canasta de la pista |
| «Court Net» (el archivo se llama `Pickleball Net`) | spacepixelcreative | **No se usa**: es una red de pickleball, no una valla. La valla de la pista se hace a mano |
| «Small Country House with Green Roof and Fireplace», «Small House with Red Roof and Chimney», «Small House with Blue Roof», «Compact Residence with Dual Contemporary Balconies», «Island Cabin with Outdoor Seating» | stdgaris | Casas de los proyectos y casa de té del jardín |
| «Torii Gate» | mrfauzi | Entrada del jardín japonés |
| «World Cup Trophy Football» | adimaskur48 | Trofeo del templete del campo de fútbol |
| «Cartoon treehouse with ladder access» | permadicreative | Casa del árbol (Sobre mí) |
| «Small observatory with telescope dome» | kerismaker | Base del observatorio |
| «Orange and White Koi» | TurboSquid (licencia de TurboSquid) | Kois del jardín: solo la forma, simplificada y con colores planos |
| «Stylized Arched Road Bridge with Railings» | TurboSquid (licencia de TurboSquid) | Puente rojo del jardín |
| «Japan Lamp» | nixxdsgn | Faroles del jardín |

### Mundo 2 · The Twisted Moon (objetivo 21)

Descargados de Envato con la cuenta de David (15-11-2026); ningún ZIP trae archivo de licencia. Originales en `assets-externos/mundo2/` (fuera de git). El estado de cada uno, en `docs/RECURSOS.md`.

| Original | Autor | Para qué | Estado |
|---|---|---|---|
| «Big ben landmark clock tower» | slabdsgn | Torre del reloj, en la cima | **Retirada** en el objetivo 22: la torre es ahora propia, hecha a mano (`src/worlds/twisted/tower.js`) |
| «Stylized Treehouse Cottage» | TurboSquid (licencia de TurboSquid) | Casa sobre tronco («Sobre mí») | En uso: `casa-tronco.glb`, solo la forma, con colores planos; no se distribuye ninguna textura |
| «Whimsical Toon Cottage with Stone Roof» | TurboSquid (licencia de TurboSquid) | Casita de cuento | En uso: `casita.glb`, solo la forma, pintada a mano; no se distribuye ninguna textura |
| «Greenhouse» | spacepixelcreative | Invernadero | No se usa (el del juego es hecho a mano) |
| «Stylized Fern Plant» | TurboSquid (licencia de TurboSquid) | Helechos | En uso: `helecho.glb`, solo la forma; no se distribuye ninguna textura |
| «Mysterious Fairy Tale Waltz» | ereymusic | Música del mundo 2 (opción 1) | En uso (C3): `public/sounds/twisted/` |
| «Curious Mystery Box» | SCOREWIZARDS | Música (opción 2) | En uso (C3): `public/sounds/twisted/` |
| «Quirky Music Box» | AudioAgent | Música (opción 3) | En uso (C3): `public/sounds/twisted/` |
| «Crickets Night Ambience Loop» | OhmLab | Grillos de fondo | En uso (C3): `public/sounds/twisted/` |
| «Classic Clock Tower Chime» | HollywoodEdge | Campanadas de la torre | En uso (C3): `public/sounds/twisted/` |
| «Magic Sparkle Twinkle Shimmer» | AetherFX | Destello mágico | En uso (C3): `public/sounds/twisted/` |
| «Wooden Bridge Footsteps» | FxProSound | Pasos de madera | En uso (C3): `public/sounds/twisted/` |
| «Owl Hoot 1» | HollywoodEdge | Búho lejano | En uso (C3): `public/sounds/twisted/` |

Del mundo 1 se reutilizan en este, tal cual: «Small observatory with telescope dome» (kerismaker) y «Cartoon treehouse with ladder access» (permadicreative).
