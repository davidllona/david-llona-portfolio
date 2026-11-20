# Objetivo 24 — Órbita del mundo 2 y arranque del mundo 3 (The Cosmic Lab)

Recibido el 20-11-2026. Texto íntegro del encargo:

---

OBJETIVO 24 — ÓRBITA DEL MUNDO 2 Y ARRANQUE DEL MUNDO 3 (THE COSMIC LAB)

El mundo 2 queda aparcado tal como está (se pulirá al final, con los tres mundos hechos). Este objetivo tiene dos partes: arreglar cómo se ve el mundo 2 desde la órbita y empezar el mundo 3.

REGLAS (las de siempre)
- Sin abrir Chrome visible. Todo en headless.
- Una sola sesión, sin pruebas en segundo plano.
- Commit y push al cerrar cada bloque en estacion-espacial.
- Pruebas relacionadas + errors tras cada cambio; batería completa al cerrar cada bloque.
- Comprueba también que el servidor de desarrollo arranca limpio y que npm run build pasa (ya hubo un fallo de mayúsculas en nombres de archivo que las pruebas no vieron).
- No inventes datos sobre David ni sobre sus apps: usa solo lo que pone aquí. Lo que falte, «[PENDIENTE: David]».
- Encargo en docs/OBJETIVO-24.md, avance en docs/ESTADO.md.

────────────────────────────────────────
BLOQUE 1 — EL MUNDO 2 DESDE LA ÓRBITA
────────────────────────────────────────
Problema: al coger el cohete en The Twisted Moon, la isla es un casquete encima de una bola de mar. En el mundo 1 la tierra ocupa todo el planeta. David quiere lo mismo aquí: que se vea un mundo completo, no una isla sobre una esfera de agua.

Qué quiero:
- Que la tierra cubra el planeta entero al verlo desde fuera. La isla jugable se queda como está; el resto de la esfera se llena con terreno de decoración que no se pisa: más terrazas y picos de pizarra, bosques de sauces y árboles en espiral, alguna laguna y cascada turquesa, casitas lejanas con ventanas encendidas, farolillos. El mar pasa a ser lagunas y un río, no un océano que cubre medio planeta.
- Puedes dar a este mundo su propio radio si ayuda (parámetro por mundo), siempre que el mundo 1 no cambie ni en aspecto ni en pruebas.
- Con instancias y poca geometría: esa decoración solo se ve desde la órbita y durante la subida y la bajada. Que no cueste fps al jugar (no la dibujes, o muy simplificada, con la cámara de juego).
- Jugando a pie no debe notarse el cambio, salvo que el horizonte ya no sea solo mar.
Capturas: órbita desde cuatro lados, antes y después, y tres fotogramas de la subida. Guarda en capturas/29-orbita-mundo2/.
Commit y push. Sigue sin parar.

────────────────────────────────────────
BLOQUE 2 — MUNDO 3: VIAJE Y MUESTRA DE ESTILO (luego PARA)
────────────────────────────────────────
LA IDEA
El mundo 3 responde a «lo que experimento»: las apps propias de David y sus pruebas 3D. Es un laboratorio en un planeta alienígena de colores raros.
Se juega así («enciende el laboratorio»):
- Al llegar, el laboratorio está apagado. En el centro hay un núcleo de energía a oscuras.
- Cada app o experimento es una máquina o cápsula. Al acercarte y pulsar E se enciende, enseña la app y manda un rayo de energía al núcleo.
- Con todas encendidas, el núcleo arranca, se ilumina el planeta entero y se activa la antena: «Envía una señal», que es el contacto con David. Así el recorrido de los tres mundos acaba en el contacto.
Nada obligatorio: todo se puede leer también desde el menú.

LAS MÁQUINAS (contenido para más adelante; ahora solo reserva su sitio)
1. Dosia — app para profesionales de enfermería y medicina: preguntas de práctica, calculadoras de dosis, noticias y práctica del examen EIR.
2. Epidos — app de gimnasio, comida, etc.
3. Chuchómetro — mapa para quienes pasean perros, donde se marcan sitios para los demás; con diario del perro y consejos.
4. App de viajes [CONFIRMAR nombre: Nokei] — galería de viajes como dioramas 3D: cada lugar es una pieza que se desbloquea al llegar.
5. Experimentos 3D — pruebas sueltas de David con Blender y Three.js. [PENDIENTE: David, cuáles]
6. Núcleo y antena — el final: contacto.

DIRECCIÓN DE ARTE
- Tiene que distinguirse de un vistazo de los otros dos: el mundo 1 es verde y diurno, el 2 es morado y nocturno. El 3 es alienígena y luminoso: turquesa, magenta y amarillo lima, como el planeta que ya sale en la órbita con la etiqueta The Cosmic Lab. Suelo de colores raros (magenta o turquesa), cielo con dos soles o un planeta con anillos enorme, y algo de neblina de color.
- Si existen docs/referencias/mundo3/ref-*.png, son la meta visual: míralas antes de empezar y antes de cerrar. Si no existen, sigue esta descripción y dilo en el informe.
- Formas: redondeadas y orgánicas, al revés que las torcidas del mundo 2. Cúpulas de cristal, cápsulas, tubos por los que corre líquido brillante, antenas, cristales, rocas que flotan, plantas alienígenas (bulbos que laten, tentáculos que se mecen, hongos gigantes), charcas de líquido brillante.
- Low poly con colores planos, coherente con los otros dos mundos. Simpático y curioso, nada de terror ni de bichos que den asco.
- Detalle jugable de este mundo: gravedad baja. El astronauta salta más alto y cae despacio. Woody también, y lleva una escafandra pequeña.
- Luz: clara y de color, con zonas de sombra para que brille lo que emite luz. Nada de neón por todas partes.
- Desde la órbita, el planeta entero es el mundo (mismo criterio que los otros dos).
- Todo hecho a mano de momento. Si crees que hace falta algún modelo de Envato, dime cuál en el informe y David lo descarga.

QUÉ HACER AHORA
A. Viaje: The Cosmic Lab deja de estar en «Próximamente» y se puede elegir desde la órbita de los otros dos mundos, con carga bajo demanda como el mundo 2. Vuelta incluida. El botón del observatorio del mundo 2 («Viajar a The Cosmic Lab») ya funciona.
B. Muestra de estilo: zona de aterrizaje, el núcleo apagado en el centro, UNA máquina completa de ejemplo (la de Dosia, con su encendido y su rayo al núcleo, y un panel con el texto de arriba), cielo, suelo, un puñado de plantas y rocas flotantes, la gravedad baja y Woody con su escafandra.

Capturas en capturas/30-mundo3/B/: vista postal (tres cuartos desde arriba), cámara de juego en cinco puntos, la máquina apagada y encendida, y la órbita. Hoja con los tres mundos lado a lado (una captura de juego de cada uno) para comprobar que se distinguen y a la vez parecen del mismo porfolio.
Rendimiento de los tres mundos y peso del mundo 3.
Commit, push y PARA con un informe corto para que David apruebe el estilo antes de seguir.
