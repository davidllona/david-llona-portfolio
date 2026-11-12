# Rendimiento y carga

Medido con `node tests/perf/load.mjs` contra la build de producción (`npm run build` y `npx vite preview --port 5198`),
primera visita sin caché, Chrome sin ventana con WebGPU, en el Mac de desarrollo. El segundo argumento ralentiza la CPU
(`node tests/perf/load.mjs http://localhost:5198/ 4`). Son mediciones, no estimaciones; varían ±15 % entre pasadas.

## Carga (12 de noviembre de 2026)

| | Antes | Ahora |
|---|---|---|
| Primer contenido en pantalla | 300–440 ms (cargador de React) | **16 ms** (pantalla de carga en el HTML) |
| Bienvenida visible | 3,3 s (6,0 s con la caché de sombreadores fría) | **1,15 s** |
| Lista para entrar al planeta | 3,3–6,0 s | **2,4 s** |
| Tareas largas del hilo principal | 2,7 s en total; la mayor, 0,78 s | 0,75 s en total; la mayor, 0,33 s |
| Con CPU ×4 más lenta: bienvenida / entrar | 10,5 s / 10,5 s | **2,3 s / 5,9 s** |

## Qué era lento y qué se hizo

1. **El cálculo del terreno** (`groundHeight`, `surface` y auxiliares en `src/worlds/living/layout.js`): ~1,6 s de CPU.
   Se llamaban cientos de miles de veces y cada llamada recorría todos los accidentes del terreno.
   - Cajas que acotan cada accidente (meseta, rampa, río, estanque, colinas): fuera de ellas no se calcula.
   - La pendiente (cuatro alturas extra) solo se mira en el borde de la meseta, único sitio donde hay pared.
   - El suelo calcula cada vértice de su rejilla una vez (antes, seis) y reutiliza tipo y altura para el color.
   - La textura de datos del terreno calcula tipo y altura una vez por texel.
   - Ya no se reparten matas que no se dibujan (el césped vive en la GPU).
   Resultado: de ~890 ms a ~45 ms de tiempo propio en `groundHeight`.
2. **Todo esperaba a todo.** Un único `Suspense` montaba bienvenida y planeta juntos. Ahora hay niveles
   (`src/experience/Experience.jsx`): primero la bienvenida, que retira la pantalla de carga; después el planeta, que se
   monta por partes entre fotogramas (`Staged` en `worlds/living/Scene.jsx`) mientras se ve el islote. El botón de entrar
   se habilita cuando el planeta está compilado.
3. **El cargador hacía esperar de más**: tenía un mínimo de 1,4 s y un número que avanzaba despacio. El nuevo
   (`index.html` + `src/ui/loaderControl.js`) marca etapas reales y se va en cuanto la bienvenida está lista.

## Entrada al planeta (12 de noviembre de 2026, segunda pasada)

Medido con `node tests/perf/entrada.mjs [url] [carpeta]` (primera visita sin caché; hitos, tirones antes y después del
clic, y capturas a 0,5 / 1 / 2 / 4 / 8 s y en ráfaga durante el descenso). Capturas en `capturas/7-carga/`.

| | Antes | Ahora |
|---|---|---|
| Huecos entre fotogramas > 40 ms tras pulsar (dev y preview) | 4–6; el mayor, **275 ms** al aterrizar | **ninguno** |
| Pipelines creados después de pulsar | ~85 (42 de sombras + 47 de escena) | **0** |
| Mayor tarea larga mientras se ve la bienvenida | 305 ms | 60–95 ms |
| Botón de entrar habilitado (dev / preview) | 2,6 s / 2,4 s | 3,3–3,8 s / 3,1 s |
| Respaldo WebGL2: tras pulsar | 2,8 s congelado y ~7 s a trompicones | huecos de 45–200 ms |
| Respaldo WebGL2: botón habilitado | 6,4 s | 12,2 s |

Qué fallaba (el precalentamiento con `compileAsync` existía, pero no servía) y qué se hizo, todo en
`src/experience/Experience.jsx` salvo las luces:

1. **Las luces del islote se desmontaban al aterrizar** y, al cambiar el conjunto de luces, three recompilaba todos los
   materiales iluminados: ese era el tirón de 275 ms (comprobado aislando solo este cambio). Ahora viven en
   `IsletLights` (`Welcome.jsx`), no salen nunca de la escena y al llegar quedan apagadas, como `WarmLights` de día.
2. **Se compilaba contra el lienzo** y la escena se dibuja en el búfer del posproceso.
3. **Se compilaba en otro contexto de dibujado**: `compileAsync` usa siempre la profundidad de llamada 0 y la escena se
   dibuja anidada (1 o 2, según haya FXAA). Son objetos de dibujado distintos y, en las mallas instanciadas, sombreadores
   distintos. three r183 no lo expone: `compileNow` fija `_callDepth` y el contexto durante la llamada (campos privados;
   **revisar al actualizar three**). La profundidad real se anota en `scene.onBeforeRender`, no se supone.
4. **Solo se compilaba lo que veía la cámara de la bienvenida**: ahora se fuerza visible y sin descarte por encuadre
   (incluye césped, polvo, llama, humo y destellos, que están ocultos al cargar).
5. **Las sombras** no se compilan con `compileAsync` (el mapa solo se redibuja en fotogramas reales): `drawOnce` dibuja
   una vez cada tanda sin descarte para que entren en el mapa de sombras.
6. Todo ello **repartido entre fotogramas** (8 ms de presupuesto por fotograma) para no congelar la bienvenida.

Queda al pulsar una tarea de ~75–95 ms que no llega a saltarse fotogramas visibles: crear el `AudioContext`
(`unlock` en `src/audio/engine.js`, exige un gesto del usuario) y el cambio de interfaz de React.

Fotogramas por segundo tras el cambio: sin diferencia medible; el ruido entre pasadas idénticas en este Mac
(169–283 fps) es mayor que cualquier coste de las cuatro luces apagadas.

## Pendiente

- El bundle principal pesa 1,85 MB (530 kB comprimido): sin trocear todavía.
- La construcción del planeta sigue en el hilo principal (0,75 s de tareas largas); pasarla a un Web Worker queda por hacer.
- En frío, la compilación de sombreadores de WebGPU puede añadir segundos en la primera visita; no se ha medido en otros equipos.
- Memoria JS tras cargar: 70–115 MB según la pasada.

## Fotogramas por segundo

`node tests/e2e/living.mjs fps`, a 2880 × 1620, sin límite de vsync: 213–251 fps según la zona.
