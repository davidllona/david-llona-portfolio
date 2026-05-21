# davidllona.com — Portfolio 3D

Mi portfolio personal, construido como una experiencia interactiva en lugar de una web tradicional. Una habitación, una ventana al cosmos, y los proyectos repartidos por el camino.

🌍 **Live**: https://davidllona.com

---

## Sobre el proyecto

La idea era simple: que la propia experiencia de navegar el portfolio fuese ya parte de lo que hago. Nada de un grid de proyectos y un "About me". El usuario empieza dentro de una habitación, sale por la ventana al cosmos y desde ahí accede al resto del contenido.

Antes de tocar código pasaron semanas de bocetos en cuaderno — estructurando la idea, definiendo qué quería que se sintiera al entrar. El stack vino después.

---

## Stack

- **Three.js** — escena, iluminación, post-processing
- **React + Vite** — UI, rutas, montaje del DOM
- **TailwindCSS** — sistema de estilos
- **GLTF + Blender** — modelos 3D
- **Vercel** — hosting y CI/CD

Todo en JavaScript vanilla (sin TypeScript en esta versión).

---

## Estructura

```
src/
├── 3d/                  → escenas Three.js
│   ├── heroScene.js     → habitación + cosmos
│   ├── projectsScene.js → CRT con proyectos
│   ├── contact.js       → escena final
│   └── hero/            → módulos del Hero (room, exterior, props...)
├── components/          → componentes React
└── assets/              → imágenes y recursos estáticos

public/
├── modelos/             → .glb (astronauta, escritorio, cohete...)
└── textures/            → texturas (luna, etc.)
```

---

## Algunos retos que resolví por el camino

- **Context loss en GPUs móviles**: en un Samsung A54 (Mali-G68) el navegador mataba el contexto WebGL al montar varias secciones a la vez. Solución: lazy-mount por sección + versión de Projects sin WebGL en móvil.

- **Loading "fantasma"**: la barra de carga saltaba del 0 al 100 porque los loaders no existían hasta que React montaba los componentes. Solución: un `assetPreloader` que dispara las descargas pesadas al montar `<App />`.

- **Render-on-demand**: cada escena pausa su `requestAnimationFrame` cuando no está visible — vía un `visibilityGate` compartido que combina `IntersectionObserver` + `document.hidden`.

---

## Cómo correrlo en local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

Para generar la versión de producción:

```bash
npm run build
```

---

## Próximos pasos

Es una primera versión. Lo que viene:

- Más proyectos en la sección Projects
- Pulir la transición habitación → cosmos en móvil
- Optimizar el peso de los GLB con Draco

---

## Créditos

- **Three.js** y toda su comunidad
- **[Bruno Simon](https://threejs-journey.com/)** — su curso Three.js Journey fue lo que me metió en este mundo
- Modelos 3D propios construidos en Blender + Tripo3D

---

## Autor

**David Llona** — Frontend developer

🌐 [davidllona.com](https://davidllona.com)
