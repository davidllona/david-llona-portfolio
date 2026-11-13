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

### Descargados, todavía sin usar en la web

| Original | Autor | Para qué |
|---|---|---|
| «Basketball 3D Icons» (`05_Basketball`) | twinstd | Canasta de la pista (objetivo 15, bloque 3) |
| «Court Net» (el archivo se llama `Pickleball Net`) | spacepixelcreative | Valla de la pista (bloque 3) |
| «Small Country House with Green Roof and Fireplace», «Small House with Red Roof and Chimney», «Small House with Blue Roof», «Compact Residence with Dual Contemporary Balconies», «Island Cabin with Outdoor Seating» | stdgaris | Edificios de proyectos, Sobre mí y pabellón del jardín (bloques 4 y 5) |
| «Torii Gate» | mrfauzi | Entrada del jardín japonés (bloque 5) |
| Doce sonidos (mar, grillos, bosque, cascada, arroyo, dos de cohete, pasos en hierba, red, poste, salpicadura, pop) | varios (Envato) | Sonido del planeta: pendiente; el autor de cada uno se anotará al integrarlos |

