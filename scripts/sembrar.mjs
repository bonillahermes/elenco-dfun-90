// Carga inicial única de personas y elenco a Firestore (sin pasar por la interfaz).
// Uso:
//   gcloud auth application-default login      (una vez, con la cuenta dueña del proyecto)
//   cd scripts && npm install && node sembrar.mjs ../datos/semilla.json --proyecto <id-del-proyecto>
// Si ya hay personas en la base, no hace nada salvo que se agregue --forzar.
import { readFileSync } from "node:fs";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const archivo = args.find((a) => !a.startsWith("--"));
const proyecto = args[args.indexOf("--proyecto") + 1];
if (!archivo || !proyecto || args.indexOf("--proyecto") < 0) {
  console.error("Uso: node sembrar.mjs <semilla.json> --proyecto <id> [--forzar]"); process.exit(1);
}
const { personas, elenco, definidas } = JSON.parse(readFileSync(archivo, "utf8"));
initializeApp({ credential: applicationDefault(), projectId: proyecto });
const db = getFirestore();

const existentes = await db.collection("personas").limit(1).get();
if (!existentes.empty && !args.includes("--forzar")) {
  console.error("La base ya tiene personas. Use --forzar para reemplazarlas."); process.exit(1);
}
const ops = [];
if (!existentes.empty) {
  for (const c of ["personas", "elenco"]) (await db.collection(c).get()).docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
}
personas.forEach(({ id, ...p }) => ops.push((b) => b.set(db.collection("personas").doc(id), p)));
Object.entries(elenco).forEach(([id, danzas]) => ops.push((b) => b.set(db.collection("elenco").doc(id), { danzas, actualizado: FieldValue.serverTimestamp(), por: "carga-inicial" })));
ops.push((b) => b.set(db.collection("config").doc("estado"), { definidas: definidas || {} }));
for (let i = 0; i < ops.length; i += 400) { const b = db.batch(); ops.slice(i, i + 400).forEach((f) => f(b)); await b.commit(); }
console.log(`Listo: ${personas.length} personas, ${Object.keys(elenco).length} con danza asignada.`);
