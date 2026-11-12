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

## Pendiente

- El bundle principal pesa 1,85 MB (530 kB comprimido): sin trocear todavía.
- La construcción del planeta sigue en el hilo principal (0,75 s de tareas largas); pasarla a un Web Worker queda por hacer.
- En frío, la compilación de sombreadores de WebGPU puede añadir segundos en la primera visita; no se ha medido en otros equipos.
- Memoria JS tras cargar: 70–115 MB según la pasada.

## Fotogramas por segundo

`node tests/e2e/living.mjs fps`, a 2880 × 1620, sin límite de vsync: 213–251 fps según la zona.
