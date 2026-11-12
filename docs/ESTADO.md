# Estado del universo de tres planetas

Actualizado: 12 de noviembre de 2026 · rama `estacion-espacial` (solo commits locales, sin push).

Encargo completo: `Porfolio_3D_David_Llona/01_PROMPTS/03_CLAUDE_CODE_PORFOLIO_3D_COMPLETO.txt` (carpeta fuera de git).
Trabajo en curso: **pulido de The Living World** (solo el Planeta 1), con técnicas adaptadas de `folio-2025-main/` (ver `docs/CREDITOS.md`).

## Cómo arrancarlo y probarlo

```
npm run dev -- --port 5199     # http://localhost:5199
npm run e2e                    # 113 comprobaciones en Chrome sin ventana (con el servidor encendido)
node tests/e2e/living.mjs fps  # además mide fps a 2880 × 1620 sin límite
node tests/e2e/motion.mjs      # viento, ráfaga y rastro en la hierba; guarda fotogramas
node tests/e2e/look.mjs tests/e2e/views.json   # las 12 vistas fijas, de día y de noche
```

Atajos de desarrollo: `?world=cosmic` abre el planeta antiguo; `?webgl=0` simula un navegador sin GPU; `?backend=webgl` fuerza el respaldo WebGL2.

Controles: WASD o flechas, Espacio saltar, Shift correr, E usar, G menú de Woody, N día/noche, M sonido, Esc pausa. Con el ratón se hace clic en los objetos.

Capturas de comparación (fuera de git): `capturas/0-antes/` (antes del pulido) y `capturas/1-webgpu/` (ahora), mismas 12 vistas de día y de noche; `capturas/movimiento/` tiene las secuencias de viento, ráfaga y rastro.

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
| Cascada con canal de roca mojada y almohadas de espuma | capturas |

Rendimiento medido en este Mac a 2880 × 1620 sobre WebGPU: 272–362 fps según la zona (antes de la migración, 187–224).

## Parcial

- **Logros**: 6 de 21 se pueden conseguir ya (Primeros pasos, Explorador, Primer contacto, Primer enceste, Mejor amigo, Viajero espacial). Los otros 15 salen en la vitrina como «Próximamente»: su disparador llega con su fase. Para activarlos: `ready: true` en `src/achievements/list.js` y su regla en `src/achievements/Tracker.jsx`.
- **Baloncesto**: balón físico, aro, tablero, marcador y sonido. Falta el minijuego (fase 6).
- **Fútbol**: solo el campo y la portería como escenario (fase 7).
- **Cohete**: despega, queda en órbita y aterriza en el mismo planeta, con sonido. Falta el planeta esférico, el selector y el viaje (fase 9).
- **Máquina de estados y ajustes** (plan, fase 1): no se han hecho `src/game/state.js` ni `settings.js`. Se usa `active` (App), `player.frozen/gesture/hidden` y `ui.open`. No hay todavía panel de ajustes de calidad ni de volumen (solo silenciar).
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

Seguir el pulido de The Living World, en este orden:

1. **Cascadas** (`src/worlds/living/water/Waterfall.jsx`): bajar el blanco de las láminas y la bruma vistas de cerca; añadir la caída del río al mar.
2. **Árboles** (`flora/treeModels.js`): troncos curvados por spline, normales de volumen en las copas, cuatro protagonistas.
3. **Luz**: modelo de sombra teñida (color de sombra por hora) en los materiales de nodos; revisar si ACES lava la imagen.
4. **Construcciones y ambiente**: cabañas, puente, farolas; hojas, humo, libélulas, ranas; la gran ráfaga coordinada.

Después, lo aparcado del encargo original: fase 6 (baloncesto), 7 (fútbol), 8 (interiores), 9 (cohete y órbita), planetas 2 y 3.
