# Objetivo 21 — The Twisted Moon: que se parezca a las imágenes de referencia

Recibido el 15-11-2026. Texto íntegro del encargo:

---

OBJETIVO 21 — THE TWISTED MOON: QUE SE PAREZCA A LAS IMÁGENES DE REFERENCIA

Sustituye al bloque C del objetivo 20. Los bloques A y B están aprobados como base técnica (viaje, carga bajo demanda, noche fija, farolillo de Woody). Lo que cambia ahora es el aspecto: el mundo 2 tiene que parecerse a las tres imágenes de referencia de David.

────────────────────────────────────────
REGLAS DE TRABAJO (igual que siempre)
────────────────────────────────────────
- NO abras ninguna ventana de Chrome visible. Todas las pruebas y capturas en headless.
- Una sola sesión. Nada de pruebas en segundo plano.
- Commit y push al cerrar cada bloque, en la rama estacion-espacial.
- Tras cada cambio: solo las pruebas relacionadas + errors. Batería completa al final de cada bloque.
- No toques el mundo 1 salvo lo imprescindible para el viaje.
- Apunta el encargo en docs/OBJETIVO-21.md y el avance en docs/ESTADO.md.

────────────────────────────────────────
0. PREPARACIÓN
────────────────────────────────────────
0.1 Imágenes de referencia
David va a dejar sus tres imágenes en docs/referencias/mundo2/ (ref-1.png, ref-2.png, ref-3.png). Míralas antes de empezar y vuelve a mirarlas antes de cerrar cada bloque. Son la meta visual. Si no están, para y pídelas.

0.2 Recursos nuevos de Envato
Están en C:\Users\dllon\Downloads (zips). Muévelos a assets-externos/mundo2/ y descomprímelos allí:
  3D
  - Big ben landmark clock tower (slabdsgn) → torre del reloj. Sin texturas, 58k polígonos.
  - Greenhouse (spacepixelcreative) → invernadero de cristal. Trae .glb.
  - Stylized Treehouse Cottage (TurboSquid) → casa torcida sobre tronco. FBX/OBJ, 3,6k polígonos, texturas de 26 MB.
  - Whimsical Toon Cottage with Stone Roof (TurboSquid) → casita de cuento con tejado de piedra.
  - Stylized Fern Plant (TurboSquid) → helecho. 9,8k polígonos.
  Música
  - Mysterious Fairy Tale Waltz (ereymusic)
  - Curious Mystery Box (SCOREWIZARDS)
  - Quirky Music Box (AudioAgent)
  Efectos
  - Crickets Night Ambience Loop (OhmLab)
  - Classic Clock Tower Chime (HollywoodEdge)
  - Magic Sparkle Twinkle Shimmer (AetherFX)
  - Wooden Bridge Footsteps (FxProSound)
  - Owl Hoot 1 (HollywoodEdge)
Si falta alguno, dímelo y sigue con lo demás.

0.3 Reutiliza del mundo 1, recoloreados para este mundo: el observatorio (kerismaker) y la casa del árbol (permadicreative).

0.4 Presupuesto (que no se pierda rendimiento)
- Torre del reloj: diezma a menos de 8k triángulos.
- Helecho: menos de 1,5k triángulos y en instancias.
- Casa sobre tronco: quita las texturas pesadas y pásala a colores planos como el resto. Si no queda bien, texturas a 512 px como mucho.
- Todo con colores planos low poly, coherente con el mundo 1. Nada realista.
- El mundo 2 sigue cargándose solo al viajar. Dime cuánto pesa al final.

────────────────────────────────────────
DIRECCIÓN DE ARTE (leer entera)
────────────────────────────────────────
Tono: cuento gótico estilo Tim Burton, pero acogedor y mágico. NO DE TERROR.
- Prohibido: lápidas, tumbas, calaveras, arañas, sangre, caras que den miedo, casas en ruinas, criptas.
- Sí: formas torcidas y rizadas, espirales, ventanas cálidas, setas que brillan, luciérnagas, calabazas sonrientes (pocas, como detalle).

Lo que tienen las tres imágenes y tiene que tener el mundo:
1. Isla en terrazas: varios niveles de acantilado de roca morada facetada, unidos por escaleras de piedra, caminos empedrados y puentes colgantes de cuerda y madera. No una isla plana con una colina.
2. Torre del reloj en el centro y en lo más alto. Es el icono del mundo. Esfera iluminada en cálido. Que marque la hora real del visitante, como el cielo del mundo 1.
3. Observatorio en un pico a un lado, casa sobre tronco y casa del árbol al otro, invernadero de cristal con plantas que brillan en violeta, casitas de cuento abajo, una casita con luz morada (la del alquimista).
4. Cascadas: dos o tres, de agua turquesa que brilla, cayendo de terraza en terraza hasta el mar.
5. Mar oscuro facetado alrededor, con espuma turquesa brillante pegada a la orilla de la isla.
6. Zona de aterrizaje delante: plataforma circular de piedra donde se posa el cohete, con helechos alrededor.
7. Luna: creciente (no llena), enorme, blanca azulada, con halo. Estrellas.
8. Vegetación: sauces llorones (morados y verde azulado), árboles de copa ancha morada, árboles en espiral, helechos, enredaderas con rizos, setas azules y violetas que brillan, flores pequeñas violetas.
9. Vida: luciérnagas amarillas por toda la isla, algunos murciélagos o cuervos pequeños lejos alrededor de la torre, niebla suave baja.
10. Paleta: azul tinta y morado en sombras, roca morada, césped verde azulado oscuro, acentos cálidos naranja en ventanas y faroles, turquesa en agua y setas. Menos índigo plano que ahora: más morado en las sombras y acentos cálidos más fuertes.

Respuesta a tus cuatro preguntas del bloque B:
1. La luna tiene que verse jugando. No bajes la cámara en todo el mundo. Haz dos cosas: coloca la luna alta en la dirección hacia la que mira la cámara de juego (que entre en el borde superior del encuadre la mayor parte del tiempo) y, en tres miradores (lo alto de la torre, el observatorio y la plataforma de aterrizaje), inclina la cámara suavemente hacia el horizonte. Además, reflejo en el mar y luz de luna marcada.
2. Tono: más morado y más cálido, como arriba.
3. La colina en espiral desaparece. La sustituyen las terrazas con la torre en lo alto.
4. Bien hecho esperar.

────────────────────────────────────────
BLOQUE C1 — COMPOSICIÓN DE LA ISLA (luego PARA)
────────────────────────────────────────
- Relieve en terrazas (3 o 4 niveles), acantilados de roca facetada, mar con espuma, plataforma de aterrizaje.
- Coloca los edificios en su sitio (aunque aún sin pulir): torre, observatorio, casa sobre tronco, casa del árbol, invernadero, casitas.
- Caminos, escaleras y puentes colgantes. Woody y el astronauta tienen que poder recorrerlo todo andando, sin atascos (colisiones y rampas probadas).
- Cascadas colocadas (aunque sean provisionales).
- La casa torcida del bloque B sigue siendo la parada de «Sobre mí»: decide si la mantienes o si su papel pasa a la casa sobre tronco, la que encaje mejor con las imágenes.

Capturas: una «vista postal» con el mismo ángulo que las referencias (tres cuartos, desde arriba y delante, isla entera, luna en cuadro), más cámara de juego y órbita. Haz una hoja comparando la vista postal con ref-1, ref-2 y ref-3 lado a lado.
Guarda en capturas/26-mundo2/C1/. Commit, push y PARA para que David lo apruebe.

────────────────────────────────────────
BLOQUE C2 — EDIFICIOS Y VEGETACIÓN
────────────────────────────────────────
- Todos los modelos de Envato integrados, recoloreados a la paleta y con ventanas cálidas encendidas.
- Torre del reloj con la hora real del visitante.
- Vegetación completa del punto 8, con instancias.
- Detalles: farolillos en caminos y puentes, calabazas sonrientes sueltas, vallas torcidas, chimeneas con humo suave.
Hoja comparativa con las referencias. Commit y push. Sigue sin parar.

────────────────────────────────────────
BLOQUE C3 — LUZ, AGUA, VIDA Y SONIDO
────────────────────────────────────────
- Luz: luna fría como principal, puntos cálidos en ventanas y farolillos, brillo turquesa en cascadas y setas, brillo violeta en invernadero y casa del alquimista. Contraste: mantener zonas oscuras.
- Agua: cascadas animadas, espuma en la base, mar con olas facetadas y espuma turquesa.
- Vida: luciérnagas, murciélagos o cuervos lejos, niebla baja, hojas de sauce que se mecen.
- Música: integra las tres pistas y deja elegir con ?musica=1, ?musica=2, ?musica=3 para que David decida de oído. Por defecto la 1 (Mysterious Fairy Tale Waltz). Bucle suave, volumen bajo, fundido al llegar y al irse del mundo.
- Efectos:
  · Grillos en bucle de fondo.
  · Campanadas de la torre al acercarte a ella y en cada hora en punto real.
  · Destello mágico al interactuar (E) y al tocar setas o luciérnagas.
  · Pasos de madera al cruzar los puentes colgantes.
  · Búho de vez en cuando, lejos y bajo.
  · Respeta el botón de silencio que ya existe.
- Rendimiento: fps del mundo 2 y del mundo 1 en las mismas condiciones que la última vez. Dime también la calidad baja.

Capturas finales en capturas/26-mundo2/C3/: vista postal, cámara de juego en varios puntos, torre de cerca, cascadas, invernadero de noche, hoja comparativa final con las tres referencias.
Commit, push y PARA con un informe corto: qué se parece ya a las imágenes, qué no y por qué.

────────────────────────────────────────
LO QUE QUEDA FUERA DE ESTE OBJETIVO
────────────────────────────────────────
- Bloque D (contenido de las paradas 2 a 5): textos pendientes de David. Mantén los «[PENDIENTE: David]».
- Bloque E (cierre del mundo 2).
- Mundo 3.
