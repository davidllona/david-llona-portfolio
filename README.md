# davidllona.com — Portfolio 3D

Mi portfolio personal como un pequeño planeta alienígena que se explora con un astronauta, en lugar de una web tradicional.

🌍 **Live**: https://davidllona.com

---

## Qué hay

- **Un planeta propio**, hecho entero con formas simples (sin modelos comprados): isla de arena naranja, árboles de colores que se mecen, hierba, rocas, un lago y el mar con espuma animada.
- **Vista elevada** que sigue al astronauta. El ratón queda libre para hacer clic en las cosas.
- **Día y noche**: se cambia con el botón de arriba a la izquierda o con `N`. De noche se encienden farolas y cristales. Se recuerda entre visitas.
- **Cuatro zonas** unidas por caminos desde la plaza central:
  - **Proyectos** (norte): un cartel por proyecto; al pulsarlo se abre su ficha con el enlace.
  - **Lab** (este): tres pedestales con los experimentos.
  - **Sobre mí** (sur): media pista de baloncesto (se coge el balón y se tira a canasta), Woody en holograma y un cartel con el texto.
  - **Contacto** (oeste): antena y un terminal por enlace.
- **Una nave**: subes, despega y ves el planeta entero desde órbita; luego aterrizas.
- **Cosas con las que jugar**: cajas que se empujan y barriles que explotan (y se hacen estallar en cadena). Se puede vadear el agua.
- **Ordenador:** `WASD` o flechas para moverte, `Espacio` saltar, `Shift` correr, `E` usar lo que tengas cerca, `N` día/noche, `Esc` pausa. Y clic en los objetos.
- **Móvil:** joystick con el pulgar izquierdo, botones de salto y de usar, y toques sobre los objetos.

---

## Stack

- **React + Vite**
- **Three.js** con **react-three-fiber** y **drei**
- **postprocessing** para el resplandor (bloom) y el tone mapping
- **CSS normal**, sin frameworks de estilos; tipografía **Bricolage Grotesque**
- **Vercel** — hosting, Analytics y Speed Insights

---

## Estructura

```
src/
├── App.jsx                    → lienzo 3D + interfaz
├── content/                   → proyectos, lab, contacto y textos como datos
├── experience/
│   ├── world.js               → forma de la isla, zonas, reparto de árboles y colisiones
│   ├── state.js               → entrada, jugador, cámara e interacciones (fuera de React)
│   ├── theme.js               → día y noche; vaivén del viento
│   ├── Experience.jsx         → <Canvas>, calidad y postprocesado
│   ├── Lights.jsx             → luz ambiente y sol con sombras; aplica el tema
│   ├── Terrain.jsx            → suelo, agua, caminos y rocas
│   ├── Nature.jsx             → árboles, arbustos, hierba, cristales y farolas
│   ├── Player.jsx             → el astronauta, su movimiento y la cámara
│   ├── Props.jsx              → cajas, barriles y explosiones
│   ├── Ship.jsx               → la nave y el viaje a órbita
│   ├── Cables.jsx             → cables por el suelo
│   ├── interact.js            → clic y tecla E sobre objetos
│   ├── Interactions.jsx       → elige la interacción más cercana
│   ├── Instances.jsx          → muchas copias de una pieza en una llamada de dibujo
│   ├── Label.jsx              → rótulos
│   ├── textures.js            → texturas generadas en canvas
│   └── zones/                 → Plaza, Projects, Lab, About, Contact
├── ui/                        → carga, inicio, HUD, fichas, controles táctiles
└── styles/                    → CSS global y de la interfaz
```

### Cómo cambiar el planeta

Casi todo sale de `src/experience/world.js`: la forma de la orilla, dónde está cada zona, los caminos y los claros donde no crece nada. Los árboles, rocas y hierba se reparten solos con una semilla fija, así que el planeta sale igual en cada visita. Para que algo sea un obstáculo basta con añadir un círculo a `colliders`.

Para que un objeto se pueda usar (con `E` o con clic) se llama a `useInteractable` con su posición, el texto que debe mostrarse y la acción.

### Rendimiento

- Todo lo repetido (árboles, hierba, rocas, losas, farolas) va con instancias: unas pocas llamadas de dibujo para miles de piezas.
- Solo hay dos luces: la ambiente y el sol, cuyo mapa de sombras sigue al jugador.
- El viento, el agua y las partículas se calculan en la tarjeta gráfica.
- En móvil se baja la resolución y el suavizado de bordes; si aun así no se mantienen los fps, se baja más.

En desarrollo se pueden aislar costes con parámetros en la URL, por ejemplo `?fx=0&dpr=1&aa=0&shadows=0`.

---

## Cómo correrlo en local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

```bash
npm run lint    # revisar el código
npm run build   # versión de producción
```

---

## Créditos

- **[Bruno Simon](https://bruno-simon.com/)** — su portfolio y su curso Three.js Journey son la inspiración directa
- **Three.js** y toda su comunidad

---

## Autor

**David Llona** — Frontend developer

🌐 [davidllona.com](https://davidllona.com)
