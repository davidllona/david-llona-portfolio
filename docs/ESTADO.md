# Estado del universo de tres planetas

Actualizado: 12 de noviembre de 2026 · rama `estacion-espacial` (solo commits locales, sin push).

Encargo completo: `Porfolio_3D_David_Llona/01_PROMPTS/03_CLAUDE_CODE_PORFOLIO_3D_COMPLETO.txt` (carpeta fuera de git).

## Cómo arrancarlo y probarlo

```
npm run dev -- --port 5199     # http://localhost:5199
npm run e2e                    # 104 comprobaciones en Chrome sin ventana (con el servidor encendido)
node tests/e2e/living.mjs fps  # además mide fps a 2880 × 1620 sin límite
node tests/e2e/look.mjs '[["nombre", x, z, noche?, zoom?]]'   # capturas de un punto
```

Atajos de desarrollo: `?world=cosmic` abre el planeta antiguo; `?webgl=0` simula un navegador sin WebGL.

Controles: WASD o flechas, Espacio saltar, Shift correr, E usar, G menú de Woody, N día/noche, M sonido, Esc pausa. Con el ratón se hace clic en los objetos.

## Terminado y verificado

| Fase | Qué hay | Prueba |
|---|---|---|
| 0 | Punto de recuperación en git, `.gitignore`, memoria | — |
| 1 | Mundos como módulos (`src/worlds/<id>/`), colisiones comunes | `characters.mjs` en los dos mundos |
| 2 | Astronauta y Woody riggeados (GLB reales), Woody sigue, descansa, se deja acariciar y guía por rutas | `characters.mjs` (19) |
| 3 | Planeta 1, The Living World: isla con meseta, cascada, estanque, río y puente; flora instanciada con viento; mariposas, pájaros que huyen, peces, luciérnagas, pétalos; cabañas de proyectos, tótems de lab, atril de CV, casa del árbol, observatorio (día/noche), estación de contacto, pista de baloncesto y campo de fútbol; evento «El bosque despierta» (carillón y brisas automáticas) | `living.mjs` (41) |
| 4 | Menú rápido Proyectos · Sobre mí · CV · Contacto, portfolio legible, modo directo desde el inicio y versión sin WebGL | `portfolio.mjs` (19) |
| 5 | Sonido sintetizado (pasos por terreno, salto, balón, aro, red, Woody, carillón, viento, agua, pájaros, grillos, cohete, interfaz, logros) con botón y tecla M; 21 logros con insignia SVG propia, guardado local versionado, vitrina, aviso y reinicio | `progress.mjs` (25) |

Rendimiento medido en este Mac a 2880 × 1620: entre 187 y 224 fps según la zona.

## Parcial

- **Logros**: 6 de 21 se pueden conseguir ya (Primeros pasos, Explorador, Primer contacto, Primer enceste, Mejor amigo, Viajero espacial). Los otros 15 salen en la vitrina como «Próximamente»: su disparador llega con su fase. Para activarlos: `ready: true` en `src/achievements/list.js` y su regla en `src/achievements/Tracker.jsx`.
- **Baloncesto**: balón físico, aro, tablero, marcador y sonido. Falta el minijuego (fase 6).
- **Fútbol**: solo el campo y la portería como escenario (fase 7).
- **Cohete**: despega, queda en órbita y aterriza en el mismo planeta, con sonido. Falta el planeta esférico, el selector y el viaje (fase 9).
- **Máquina de estados y ajustes** (plan, fase 1): no se han hecho `src/game/state.js` ni `settings.js`. Se usa `active` (App), `player.frozen/gesture/hidden` y `ui.open`. No hay todavía panel de ajustes de calidad ni de volumen (solo silenciar).
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
| CV en PDF | `public/cv/…pdf` y su ruta en `src/content/cv.js` | El atril y el menú dicen «pendiente», sin botón de descarga |
| Dosia: descripción, capturas, enlaces | `src/content/dosia.js` (`ready: true`) | No aparece en ningún sitio |
| Música con licencia | (fase 8) | El tocadiscos no existe aún |
| Fotos para el avatar | (fase 8) | Se usará un avatar neutro |
| Clip `Woody_Scratch` | `woody.glb` | No se usa |
| Permiso para borrar `public/modelos` (200 MB), el kit Sci-Fi y su `.zip` | — | Solo ignorados en git |

## Incidencias conocidas

- Una pasada de `progress.mjs` falló una vez en las caricias a Woody y no se ha vuelto a reproducir en cinco pasadas seguidas. Causa sin identificar.
- El paquete principal pesa 1,36 MB (413 kB comprimido); Vite avisa. Trocearlo queda para la fase 12.
- En el planeta antiguo (`cosmic`) los pasos suenan siempre a camino y no hay sonido de agua.

## Siguiente paso exacto

Fase 6, en `src/worlds/living/Court.jsx`: sustituir el tiro automático de `shoot()` por apuntado con carga (mantener E), soltar el balón en el evento `basket_release` del clip `Astro_Basket_Throw`, marcar la línea de tres con `COURT`/`BASKET` de `layout.js`, emitir `miss` cuando un tiro acaba sin canasta (para «Mano caliente») y activar los logros de baloncesto.
