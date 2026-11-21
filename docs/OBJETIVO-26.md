# Objetivo 26 — Cartas aprobadas en los tres mundos y baloncesto nuevo (con Firebase)

Recibido el 21-11-2026. Texto íntegro del encargo:

---

OBJETIVO 26 — CARTAS APROBADAS EN LOS TRES MUNDOS Y BALONCESTO NUEVO (con Firebase)

Sustituye al bloque 2 del objetivo 25. Las cartas de la muestra del objetivo 25 NO valen: David ha aprobado otro diseño, uno por mundo, en el que cada carta es un OBJETO de su mundo, no una tarjeta.

REGLAS (las de siempre)
- Sin abrir Chrome visible. Todo en headless.
- Una sola sesión, sin pruebas en segundo plano.
- Commit y push al cerrar cada bloque en estacion-espacial.
- Pruebas relacionadas + errors tras cada cambio; batería completa al cerrar cada bloque. Servidor de desarrollo limpio y npm run build (ojo a los nombres de archivo que solo cambian en mayúsculas).
- Ningún «[PENDIENTE]» ni campo vacío se muestra jamás al visitante: si falta un dato, la carta omite esa parte (sin «Mi papel», sin botón «Abrir la app»...). Los pendientes se apuntan en docs/ESTADO.md.
- Sin fotos ni vídeos de David todavía: cada hueco de imagen lleva su marcador dibujado (ver referencias).
- Encargo en docs/OBJETIVO-26.md, avance en docs/ESTADO.md.

────────────────────────────────────────
REFERENCIAS VISUALES (OBLIGATORIAS)
────────────────────────────────────────
David deja en docs/referencias/cartas/ cuatro maquetas HTML aprobadas:
- mundo1-cartel.html y mundo1-cartel-movil.html
- mundo2-cartel-colgante.html
- mundo3-maquina.html
Son la meta exacta: ábrelas en headless, haz capturas y LEE su HTML y CSS (colores, tipografías de Google Fonts, medidas, sombras, rotaciones, clip-path). Repite el diseño fielmente en React. Fuera de la carta, el fondo low-poly de las maquetas es solo decorado: no lo copies. Si no están, para y pídelas.

────────────────────────────────────────
BLOQUE 1 — LAS TRES CARTAS
────────────────────────────────────────
Común a las tres (se mantiene del objetivo 25): mismo componente base con tres variantes, contenido en src/content/cards.js, velo suave sin desenfoque, la carta crece desde el objeto, E o Esc cierran, foco atrapado, «reducir movimiento», menú de arriba oculto con la carta abierta. Estructura común: dos imágenes torcidas a la izquierda (una arriba y otra abajo, distinto tamaño, rotaciones opuestas, la segunda montada sobre la primera), texto a la derecha, UNA sola X para cerrar, y como mucho un botón principal.

MUNDO 1 · CARTEL DE MADERA (todos los proyectos)
Copia de los carteles de la isla: marco marrón grueso con relieve (claro arriba/izquierda, oscuro abajo/derecha) y tornillos en las esquinas; cara de tablones crema con vetas, juntas y clavos; sin patas y sin icono de casa. Las dos imágenes son papeles blancos clavados con chinchetas rojas: la de arriba más ancha, girada unos -4,5°, con una chincheta; la de abajo más pequeña, girada unos +3,8°, desplazada a la derecha, con dos chinchetas y la esquina doblada. Texto: «PROYECTO 1 / 4» + placa del año, título en Titan One mayúsculas marrón, subtítulo, separador punteado, descripción, etiquetas como plaquitas grabadas, y solo el botón naranja «VER PROYECTO». Nada de botón «Código». En móvil: versión vertical de mundo1-cartel-movil.html.
CV y Contacto usan el mismo cartel, sin imágenes.

MUNDO 2 · CARTEL COLGANTE TORCIDO (todas las paradas)
Cuelga de un brazo de hierro negro con espirales y cadenas, con un farolillo encendido que lo ilumina de lado (luz cálida en la esquina). Tablón de madera morada oscura en vertical, de forma irregular (clip-path), cinta a rayas blancas y negras cruzando una esquina, clavos. Las imágenes son polaroids clavadas con chinchetas doradas, con una nota manuscrita (Caveat) debajo; sin foto, la silueta dibujada. El texto va en una hoja de papel hueso de bordes rotos, clavada torcida, título en Mystery Quest. El engranaje de la parada («3/4») atornillado al lateral; en la casa sobre tronco (historia), sin engranaje. Botón «Siguiente parada» oscuro con letra dorada. La X, redonda y crema, arriba en el centro del tablón. «Mi recorrido» (torre): la misma hoja, con la línea de tiempo dibujada a mano.
En móvil: el brazo de hierro se reduce a un gancho arriba, polaroids arriba en fila y la hoja de papel debajo.

MUNDO 3 · MÁQUINA DEL LABORATORIO (todas las máquinas y la antena)
La carta es una máquina: carcasa redondeada blanca y lila con relieve, cúpula de cristal con antena y bola lima brillante arriba, tubo lateral de líquido lima con burbujas que suben (animado), fila de luces abajo. Pantalla interior de cristal morado oscuro con líneas de escaneo. Las dos imágenes son dos móviles holográficos de borde turquesa, flotando torcidos sobre dos emisores con conos de luz; sin capturas, la interfaz esbozada en líneas. Texto: etiqueta de estado («PUBLICADA» lima / «EN CONSTRUCCIÓN» ámbar), título en Fredoka, subtítulo rosa, descripción, la línea «› ENERGÍA ENVIADA AL NÚCLEO · n/5» y «Abrir la app» solo si está publicada y hay enlace. X redonda con borde rosa.
Mientras tanto integra en el mundo 3 lo pendiente del objetivo 25: los recursos de Envato del 20-11-2026 (en C:\Users\dllon\Downloads → assets-externos/mundo3/), las cinco máquinas con su estado (Dosia publicada; Epidos, Chuchómetro y la app de viajes en construcción; Experimentos 3D sin contenido: su máquina queda apagada y no abre carta), música ?musica=1/2/3 y efectos.
En móvil: la máquina en vertical, móviles holográficos arriba y pantalla de texto debajo; el tubo pasa a ser una franja lateral fina.

Capturas en capturas/32-cartas/: cada carta en escritorio y móvil, y una hoja con cada carta junto a su maqueta de referencia. Commit, push y SIGUE.

────────────────────────────────────────
BLOQUE 2 — BALONCESTO: TIRO EN SUSPENSIÓN Y SEGUNDO DEFENSA
────────────────────────────────────────
Ahora mismo tirar es solo lanzar. Quiero que se sienta como un tiro de verdad:
- Tiro en suspensión: al tirar, el astronauta salta (usa el salto que ya existe), suelta el balón en lo alto del salto y cae. Animación con anticipación (flexiona), subida, brazos arriba al soltar, muñeca, caída. Si el balón entra, pequeño gesto de celebración; si falla, ninguno.
- Medidor de tiro: mantener y soltar (tecla de tiro o toque largo). Soltar en lo alto del salto es el tiro perfecto; antes o después, peor. Que el arco del balón sea creíble y el aro y la red reaccionen (rebote, red que se mueve).
- Un segundo defensa, además del que ya hay: se coloca entre el jugador y el aro, se mueve con él, salta a taponar si tiras muy cerca y tiene un pequeño retraso para que se le pueda ganar con un amago o desplazándote. Los dos defensas no se pegan entre sí ni atraviesan al jugador. Mismo estilo que el defensa actual.
- Sonidos ya existentes de balón, aro y red. Si falta alguno, dilo.
Capturas de la secuencia de tiro (seis fotogramas) y de los dos defensas. Commit, push y SIGUE.

────────────────────────────────────────
BLOQUE 3 — CONCURSO DE TRIPLES Y TABLÓN DE PUNTUACIONES
────────────────────────────────────────
Opcional, como el reto del fútbol: se activa junto a la cancha (cartel con E «Concurso de triples»). Mientras dura, los defensas se apartan.
- Reglas: 5 carros de balones alrededor de la línea de triple, 5 balones por carro. Cada balón vale 1 punto y el último de cada carro (balón de color) vale 2. Máximo 30. 60 segundos.
- El astronauta coge el balón del carro y tira con el mismo tiro en suspensión del bloque 2. Al vaciar un carro, se pasa solo al siguiente (con un recorrido corto o un salto de cámara suave).
- Interfaz: tiempo, puntos y carro actual, discretos, al estilo del porfolio. Cuenta atrás «3, 2, 1» al empezar y bocina al acabar. Woody anima desde la banda.
- Al acabar, se abre un cartel de madera (el mismo estilo del mundo 1) con la puntuación, para escribir un nombre (3 a 12 caracteres, solo letras, números y espacio, con filtro básico de palabras malsonantes) y guardarla. Se puede no guardar.
- El tablón: un cartel de madera grande junto a la cancha, del mismo estilo que los carteles de la isla, con el «TOP 10 · TRIPLES» (posición, nombre, puntos) escrito en el propio objeto 3D. Se actualiza al guardar. Con E se abre en grande (cartel del mundo 1) con el top 10 y la mejor marca del visitante.
- Logro nuevo: «Francotirador» (20 o más puntos).

GUARDADO DE PUNTUACIONES (FIREBASE, YA CREADO)
David ya tiene la base de datos montada. No crees proyectos, cuentas ni reglas nuevas en Firebase.
- Proyecto Firebase: david-llona-portfolio (plan gratuito Spark).
- Base de datos: Cloud Firestore, edición Standard, «(default)», en europe-southwest1 (Madrid).
- Colección: triples. Cada documento: { name: string, score: int, createdAt: serverTimestamp() }. Nada más: las reglas rechazan cualquier otro campo.
- Reglas ya publicadas en la consola (cópialas tal cual a firestore.rules en el repo, solo como referencia y para que queden versionadas; no las despliegues):

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /triples/{scoreId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['name', 'score', 'createdAt'])
        && request.resource.data.keys().hasAll(['name', 'score', 'createdAt'])
        && request.resource.data.name is string
        && request.resource.data.name.matches('^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ ]{3,12}$')
        && request.resource.data.score is int
        && request.resource.data.score >= 0
        && request.resource.data.score <= 30
        && request.resource.data.createdAt == request.time;
      allow update, delete: if false;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}

Lo que tienes que respetar por esas reglas:
- El nombre se valida igual en el cliente (3 a 12 caracteres: letras, números, tildes, ñ y espacio) antes de enviar, con un mensaje claro si no vale. El filtro de palabras malsonantes va también en el cliente.
- score siempre entero (Math.round) entre 0 y 30.
- createdAt con serverTimestamp(), nunca la hora del navegador.
- Lectura del top: query(collection(db,'triples'), orderBy('score','desc'), limit(10)). No necesita índice compuesto. Si se ordenara por dos campos, Firestore pediría un índice: evítalo.

Configuración de la app web (no es secreta, es pública por diseño; la seguridad está en las reglas). Ponla en .env.local y en un .env.example, y léela con import.meta.env:
VITE_FIREBASE_API_KEY=AIzaSyD95lSXhfR3Y1i0tWuxIGCSIeLXauw4h_A
VITE_FIREBASE_AUTH_DOMAIN=david-llona-portfolio.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=david-llona-portfolio
VITE_FIREBASE_STORAGE_BUCKET=david-llona-portfolio.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=510885404103
VITE_FIREBASE_APP_ID=1:510885404103:web:04d03041baaa347bf0cde2
No uses Analytics (no incluyas measurementId ni firebase/analytics).

Cómo integrarlo:
- npm install firebase. Importa SOLO firebase/app y firebase/firestore/lite (la versión ligera, sin tiempo real), y cárgalos bajo demanda la primera vez que se abre el tablón o se guarda una puntuación, nunca al cargar el porfolio. Mide cuánto pesa y dilo.
- Capa de guardado con dos modos: remoto (Firestore) si existen las variables VITE_FIREBASE_*; local (navegador del visitante, con el aviso «Solo en este dispositivo») si no existen o si Firestore falla. Si la red falla al guardar, guarda en local, avisa con suavidad y no rompas nada.
- Evita envíos repetidos: un solo envío por partida, botón desactivado mientras guarda, y como mucho un envío cada 30 segundos por navegador.
- Pruebas: el modo local completo en e2e; el remoto con Firestore simulado (mock del módulo). Nunca escribas en la base de datos real desde las pruebas.
- Comprueba a mano UNA vez, desde el servidor de desarrollo, que leer el top funciona contra la base real (lectura, sin escribir) y dilo en el informe.
- Deja en docs/FIREBASE.md: qué hay montado, dónde se ven las puntuaciones en la consola, cómo borrar una puntuación ofensiva (a mano en la consola, pestaña Datos), y dos mejoras recomendadas para más adelante: restringir la clave de la API a davidllona.com y localhost en Google Cloud, y activar App Check.

Capturas en capturas/33-baloncesto/: cartel de inicio, cuenta atrás, partida en curso, cambio de carro, final con nombre, tablón en 3D y tablón abierto. Rendimiento de los tres mundos.
Commit, push y PARA con un informe corto: qué hay, si el tablón compartido funciona con Firebase y cuánto pesa la carga de Firebase, y qué no has podido comprobar.
