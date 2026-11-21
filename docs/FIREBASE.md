# Firebase: el tablón de puntuaciones del concurso de triples

El concurso de triples (pista de baloncesto de The Living World) guarda las puntuaciones en **Cloud Firestore** para que el top 10 sea compartido entre todos los visitantes. Es lo único que usa Firebase en el portfolio.

## Qué hay montado

- **Proyecto**: `david-llona-portfolio` (plan Spark, gratuito). Lo creó David; el código no crea proyectos, cuentas ni reglas.
- **Base de datos**: Cloud Firestore, edición Standard, la base `(default)`, en `europe-southwest1` (Madrid).
- **Colección**: `triples`. Cada documento es una puntuación con tres campos y nada más:
  - `name`: texto, de 3 a 12 caracteres (letras con tildes, ñ, números y espacios);
  - `score`: número entero de 0 a 30;
  - `createdAt`: la hora del servidor (`serverTimestamp()`).
- **Reglas**: las de `firestore.rules` en la raíz del repositorio. Están ahí **solo como referencia**: se publican a mano en la consola (Firestore → Reglas) y el código no las despliega. Dicen: cualquiera puede leer `triples`; cualquiera puede **crear** una puntuación si trae exactamente esos tres campos válidos y la hora es la del servidor; nadie puede modificar ni borrar desde el portfolio; y todo lo demás de la base de datos está cerrado.
- **Configuración del cliente**: en `.env.local` (no va al repositorio) y en `.env.example` (sí va, como plantilla). Son las seis variables `VITE_FIREBASE_*`. Estos valores son **públicos por diseño** (acaban en el JavaScript que descarga cualquier visitante): identifican el proyecto, no dan permisos. Lo que protege la base de datos son las reglas. Sin Analytics: no hay `measurementId` ni se importa `firebase/analytics`.
- **Código**:
  - `src/game/scores.js`: validación del nombre (la misma que las reglas, más un filtro básico de palabrotas), guardado y lectura, y el modo local;
  - `src/game/scoresRemote.js`: el único archivo que importa Firebase, y solo `firebase/app` y `firebase/firestore/lite`. La lectura del top es `query(collection(db, "triples"), orderBy("score", "desc"), limit(10))`: un solo orden, así que **no hace falta ningún índice compuesto**.
- **Carga bajo demanda**: Firebase no se descarga con el portfolio. Se pide la primera vez que alguien abre el tablón del top 10 o guarda una puntuación. Pesa **184,8 kB (43,9 kB con gzip)**, en un archivo aparte (`dist/assets/scoresRemote-*.js`).

### Los dos modos

- **Remoto** (lo normal en la web publicada): si están las variables `VITE_FIREBASE_*`, las puntuaciones van a Firestore y el tablón es compartido.
- **Local**: si faltan las variables, o si Firestore falla (sin red, bloqueado, más de 7 s sin responder al leer o 10 s al guardar), las puntuaciones se guardan en el navegador del visitante y el cartel lo dice: «Solo en este dispositivo». Si se quería guardar en remoto y no se pudo, avisa con suavidad («No se ha podido conectar con el tablón compartido: se ha guardado solo en este dispositivo»).

### Contra el abuso, en el cliente

Un envío por partida; el botón se desactiva mientras se guarda; como mucho un envío cada 30 s por navegador; el nombre se valida igual que en las reglas y pasa un filtro básico de palabrotas; la puntuación se redondea y se limita a 0–30. Esto se puede saltar desde la consola del navegador: lo que de verdad manda son las reglas (que impiden campos de más, nombres raros y puntuaciones fuera de 0–30, pero **no** impiden que alguien se invente un 30). Ver «Mejoras recomendadas».

## Dónde se ven las puntuaciones

1. Entra en <https://console.firebase.google.com/> con la cuenta de Google del proyecto.
2. Abre el proyecto **david-llona-portfolio**.
3. En el menú de la izquierda: **Compilación → Firestore Database** (o «Bases de datos de Firestore»).
4. Pestaña **Datos**: elige la base `(default)` si pregunta. Verás la colección `triples`; al pulsarla salen todos sus documentos (uno por puntuación) y, al pulsar uno, sus campos `name`, `score` y `createdAt`.

Para verlas ordenadas como en el juego, en la vista de la colección usa **Filtrar** → ordenar por `score`, descendente.

## Cómo borrar a mano una puntuación ofensiva

Desde el portfolio no se puede borrar nada (las reglas lo impiden), pero desde la consola sí, porque ahí entras como propietario:

1. Consola de Firebase → **Firestore Database** → pestaña **Datos** → colección `triples`.
2. Busca el documento (por el nombre o la puntuación; con **Filtrar** puedes buscar `name` == «el nombre»).
3. Pulsa el documento para abrirlo, luego el menú de los **tres puntos (⋮)** de la columna del documento → **Eliminar documento** → confirma.

Desaparece del tablón la próxima vez que alguien lo abra. Si el nombre es una palabra que el filtro debería haber parado, añádela a la lista `BLOCKED` de `src/game/scores.js`.

## Mejoras recomendadas (no hechas)

1. **Restringir la clave de API a tus dominios.** En Google Cloud Console (<https://console.cloud.google.com/>) → proyecto `david-llona-portfolio` → **APIs y servicios → Credenciales** → la clave «Browser key (auto created by Firebase)» → **Restricciones de aplicaciones: Sitios web (referentes HTTP)** y añade `https://davidllona.com/*`, `https://www.davidllona.com/*` y, para desarrollar, `http://localhost:*/*`. Así otras webs no pueden usar tu clave desde un navegador.
2. **Activar App Check** (Firebase → **App Check**), con reCAPTCHA Enterprise para la web, y después **exigirlo** en Firestore. Así solo tu web publicada puede escribir puntuaciones: un script hecho a mano, aunque use tus valores públicos, quedaría fuera. Requiere añadir `firebase/app-check` al cliente (unos kB más, también bajo demanda) y registrar el dominio; conviene probarlo primero en modo «sin exigir» para ver las métricas.

## Cómo se ha probado

- `tests/e2e/triples.mjs`: el concurso entero en **modo local** (`?marcador=local`), sin tocar Firebase.
- `tests/e2e/triples-remoto.mjs`: el modo **remoto con Firestore simulado** (la prueba sustituye `scoresRemote.js` por uno falso en memoria): lectura del top, guardado con solo `name` y `score` (y la hora del servidor), botón desactivado mientras guarda, un envío por partida y caída a local si Firestore falla. Además, con el SDK de verdad pero sin red, comprueba que se descarga solo al abrir el tablón y que cae a local.
- **Ninguna prueba puede llegar a la base de datos real**: el navegador de las pruebas tiene cortado el nombre `firestore.googleapis.com` (ver `open()` en `tests/e2e/common.mjs`).
- `tests/e2e/firebase-lectura.mjs`: comprobación **manual** de que el tablón **lee** de la base de datos real (cualquier petición que no sea una consulta se corta antes de salir). Se pasó una vez el 21-11-2026: leyó en 1,3 s y la colección estaba vacía.
