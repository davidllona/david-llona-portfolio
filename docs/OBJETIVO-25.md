# Objetivo 25 — Una carta distinta por mundo y nuevo enfoque del mundo 3

Recibido el 21-11-2026. Texto íntegro del encargo:

---

OBJETIVO 25 — UNA CARTA DISTINTA POR MUNDO Y NUEVO ENFOQUE DEL MUNDO 3

El estilo del mundo 3 está aprobado. Lo que no convence es la carta que se abre al pulsar E: es la misma caja oscura con una frase en los tres mundos, y en los proyectos se queda corta. Este objetivo rediseña las cartas. Primero una muestra de cada una, y PARAS.

REGLAS (las de siempre)
- Sin abrir Chrome visible. Todo en headless.
- Una sola sesión, sin pruebas en segundo plano.
- Commit y push al cerrar cada bloque en estacion-espacial.
- Pruebas relacionadas + errors tras cada cambio; batería completa al cerrar cada bloque. Servidor de desarrollo limpio y npm run build.
- No inventes datos sobre David ni sobre sus proyectos. Lo que falte, «[PENDIENTE: David]», en un único archivo de contenidos fácil de editar.
- Encargo en docs/OBJETIVO-25.md, avance en docs/ESTADO.md.

────────────────────────────────────────
LO COMÚN A LAS TRES CARTAS
────────────────────────────────────────
- Misma familia tipográfica, mismo botón de cerrar, mismas teclas (E o Esc cierran) y mismo comportamiento en móvil, para que se note que es un solo porfolio.
- La escena de detrás NO se emborrona ni se oscurece del todo: un velo suave, que se siga viendo el mundo. La carta sale del objeto con el que has interactuado (animación corta desde su posición en pantalla), no aparece de la nada en el centro.
- Accesibles: foco atrapado dentro, contraste suficiente, y respeta «reducir movimiento».
- En móvil ocupan casi toda la pantalla y se desplazan con el dedo.
- Un solo componente base con tres variantes; el contenido viene de datos, no escrito dentro del componente.

────────────────────────────────────────
CARTA DEL MUNDO 1 — FICHA DE PROYECTO (la más importante)
────────────────────────────────────────
Es la que mira quien quiera contratar a David. Grande, clara y con imagen.
- Arriba: galería (imágenes o vídeo corto) que ocupa la mitad de la carta, con flechas y puntos. Usa las imágenes que ya tengan los proyectos en el repositorio; donde no haya, el marcador descrito más abajo, no un hueco roto.
- Debajo: nombre, una línea de qué es, «Mi papel», tecnologías como etiquetas, año, y botones «Ver proyecto» y, si hay, «Código».
- Estilo: claro y luminoso, a juego con el mundo 1 (fondo crema, acentos naranja del cohete). Nada de caja negra.
- Úsala en todos los proyectos del mundo 1. CV y Contacto pueden quedarse con una versión sencilla del mismo estilo.

────────────────────────────────────────
CARTA DEL MUNDO 2 — HOJA DE CUENTO
────────────────────────────────────────
Personal y artesanal.
- Papel color hueso con el borde irregular, sujeto arriba con una chincheta o un sello de lacre, que se despliega al abrirse.
- Título con algo de carácter, texto corto, tinta azul muy oscura. Un adorno pequeño por parada (engranaje, huella, mapa).
- Las fotos, como polaroids algo torcidas (la de Woody).
- «Mi recorrido» de la torre: la línea de tiempo dibujada sobre el papel.

────────────────────────────────────────
CARTA DEL MUNDO 3 — HOLOGRAMA
────────────────────────────────────────
No es una caja: es una proyección que sale de la máquina.
- Un móvil translúcido con borde turquesa y un ligero parpadeo de holograma. Dentro irá más adelante un vídeo (silenciado, en bucle, con botón de sonido) o capturas que pasan solas; hoy, el marcador animado descrito más abajo.
- Al lado: nombre, una línea de qué es, etiqueta de estado bien visible («Publicada» en verde lima / «En construcción» en ámbar) y, solo si está publicada, el botón «Abrir la app».
- El vídeo se carga solo al abrir la carta, nunca al entrar en el mundo.

────────────────────────────────────────
NUEVO ENFOQUE DEL MUNDO 3
────────────────────────────────────────
Pasa de «mis apps» a «lo que estoy construyendo». Un laboratorio es donde están las cosas a medio hacer, así que los proyectos sin publicar encajan tal cual. Cada máquina muestra su estado también en el mundo (una luz verde lima si está publicada, ámbar si está en construcción).
- Dosia — Publicada. App para profesionales de enfermería y medicina: preguntas de práctica, calculadoras de dosis, noticias y práctica del examen EIR. Enlace: [PENDIENTE: David].
- App de viajes [CONFIRMAR nombre: Nokei] — En construcción. Galería de viajes como dioramas 3D: cada lugar es una pieza que se desbloquea al llegar.
- Epidos — En construcción. App de gimnasio, comida, etc.
- Chuchómetro — En construcción. Mapa para quienes pasean perros, donde se marcan sitios para los demás; con diario del perro y consejos.
- Experimentos 3D — [PENDIENTE: David].

FOTOS Y VÍDEOS: DE MOMENTO, NINGUNO
David no va a aportar todavía ni teasers, ni capturas, ni fotos (tampoco la de Woody). Lo hará al final. Por tanto:
- No busques ni esperes archivos de imagen o vídeo, y no lo señales como fallo.
- Cada carta lleva un hueco bien diseñado para su imagen o vídeo, que hoy muestra un marcador bonito y a juego con su mundo (no un recuadro gris ni un icono roto): en el mundo 1, una ilustración sencilla con los colores del proyecto; en el mundo 2, una polaroid con una silueta dibujada; en el mundo 3, dentro del móvil holográfico, una animación de «plano en construcción» o de la interfaz esbozada con líneas.
- Las cartas tienen que verse terminadas así, sin material. Cuando David lo aporte, bastará con poner la ruta en el archivo de contenidos (un campo por carta para imagen, galería o vídeo), sin tocar el componente. Deja escrito en docs/ESTADO.md qué campo es y dónde se dejan los archivos.

Además, en el mundo 3, integra ya los recursos de Envato descargados el 20-11-2026, que están en C:\Users\dllon\Downloads (muévelos a assets-externos/mundo3/):
- Futuristic research laboratory equipment collection (TurboSquid): consolas, cápsula y escáner. Para que las cinco máquinas no sean la misma cápsula. Quita la figura de dentro de la cápsula.
- Cartoon satellite dish with waves (monstersvisual): la antena. Diezma a menos de 6k triángulos.
- Purple crystal cluster (Creasheeps) y Coral reef (spacepixelcreative, como planta alienígena, a menos de 2k): en instancias y recoloreados.
- Música con ?musica=1/2/3: Solar Energy Pixels (PremiumBeat), Chill Ambient Space (trickytwoaudio), Space Ambient (alexshulgin).
- Efectos: Cartoon sci-fi power (encendido), Sci-fi futuristic energy beams (rayo), Sci-fi machine futuristic hum (zumbido), Sci-fi Lava Planet Background Ambience Loop 1 (ambiente, muy bajo), Cartoon Jump Boing (salto, muy bajo), Telemetry radio transmission beeps (antena).
Los zips pueden tener el nombre en inglés o en español: identifícalos por autor y fecha. Todo a colores planos y a la paleta del mundo.

────────────────────────────────────────
BLOQUE 1 — MUESTRA (luego PARA)
────────────────────────────────────────
Haz UNA carta de cada tipo, completa y funcionando:
- Mundo 1: la ficha de un proyecto (el que más material tenga).
- Mundo 2: la hoja de Woody.
- Mundo 3: el holograma de Dosia.
Capturas en capturas/31-cartas/muestra/: cada carta en escritorio y en móvil, la animación de apertura en tres fotogramas, y una hoja «antes y después» con la carta antigua al lado.
Commit, push y PARA para que David las apruebe.

────────────────────────────────────────
BLOQUE 2 — DESPUÉS DEL VISTO BUENO
────────────────────────────────────────
Aplica cada carta a todo su mundo, integra los recursos de Envato y el sonido en el mundo 3, y deja las cinco máquinas con su estado. Capturas de todas. Rendimiento de los tres mundos. Commit, push y PARA con un informe corto de lo que falta de David.
