// La parte de las puntuaciones que habla con Firebase. Es el ÚNICO archivo que
// importa el SDK, y solo estos dos módulos (ni Analytics ni el Firestore
// completo): `firebase/app` y `firebase/firestore/lite`. Se carga bajo demanda
// desde scores.js, así que va en un trozo aparte que el portfolio no descarga
// hasta que alguien abre el tablón o guarda una puntuación.
import { initializeApp } from "firebase/app";
import { addDoc, collection, getDocs, getFirestore, limit, orderBy, query, serverTimestamp } from "firebase/firestore/lite";

export function connect(config) {
 const db = getFirestore(initializeApp(config));
 const triples = collection(db, "triples");
 return {
  // Las `count` mejores. (Un solo orden: no hace falta índice compuesto.)
  top: async (count) => (await getDocs(query(triples, orderBy("score", "desc"), limit(count)))).docs.map((doc) => ({ name: doc.get("name"), score: doc.get("score") })),
  // Solo estos tres campos: es lo que dejan crear las reglas.
  add: (name, score) => addDoc(triples, { name, score, createdAt: serverTimestamp() }),
 };
}
