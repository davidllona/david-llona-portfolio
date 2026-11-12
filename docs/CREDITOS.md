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
